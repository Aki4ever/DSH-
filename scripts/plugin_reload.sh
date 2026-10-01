#!/usr/bin/env bash
# ==============================================================================
# 客户端插件热重载触发器  plugin_reload.sh
# ==============================================================================
# 解决的问题（2026-10-02 实测，把"每次改插件都要重启 App"这件事彻底去掉）：
#   之前每次改客户端插件，都要人手动重启整个应用才生效 —— 重启会中断所有会话，
#   本机并发会话还会被一起杀掉。实测发现这**根本不必要**：
#
#   官方 `@deepseek-ai/dsh-client-hmr` 的行为（应用内自带文档原文）：
#     · "普通插件的启停**无需刷新页面或重启 Host** 即可生效"；
#     · "入口的 mtime、ctime 和大小共同标识 revision"；
#     · 宿主提供 `/plugins/events`，浏览器半侧收到 `rebuilt` 帧后**逐个替换**运行中的插件。
#
#   即：**改完 bundle 只要让它的 mtime 变一下**，宿主就会推送 rebuilt，
#   浏览器当场把该插件换成新代码（React 状态会重置，会话与连接不受影响）。
#
# 本脚本把这件事变成一条可判定命令，并且**真的等回执**：
#   不是"我 touch 了就完事"，而是订阅 `/plugins/events`、确认收到了点名该插件的 `rebuilt` 帧
#   （帧 revision 必须与 touch 前不同），才判成功；等不到就如实判失败。
#
# 用法：
#   bash scripts/plugin_reload.sh reload dsh-plugin-restart   # 触发并等待 rebuilt 回执
#   bash scripts/plugin_reload.sh list                        # 列出当前图里各插件与 revision
#   bash scripts/plugin_reload.sh watch 5                     # 只盯 5 秒的帧，不做任何改动
#
# 退出码：0 已确认热替换 / 1 未收到回执（宿主未挂载 HMR 或页面未连接）/ 2 用法或环境错误
# ==============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MODE="${1:-list}"

DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
PROFILE="${DSH_PROFILE:-desktop}"
PROFILE_NM="${DSH_HOME_DIR}/profiles/${PROFILE}/node_modules"

# 事件流地址：优先用环境变量，否则按宿主端口反查（与 scripts/lib/host_pid.mjs 同一口径）
PORT="${DSH_PORT:-19387}"
EVENTS_URL="${DSH_PLUGIN_EVENTS_URL:-http://127.0.0.1:${PORT}/plugins/events}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "⛔ 缺少命令：$1" >&2; exit 2; }; }
need curl

# 抓一帧图（graph）并打印指定插件的 revision；找不到插件返回空
graph_rev_of() {
  local pkg="$1"
  curl -sN --max-time 3 "$EVENTS_URL" 2>/dev/null | python3 -c "
import sys, re, json
pkg = sys.argv[1]
data = sys.stdin.read()
m = re.search(r'data: (\{\"type\":\"graph\".*\})', data)
if not m:
    raise SystemExit(1)
g = json.loads(m.group(1))['graph']
for e in g['entries']:
    if e['id'] == pkg:
        print(e['rev'])
        break
" "$pkg" 2>/dev/null
}

case "$MODE" in
  list)
    # 先取回整段输出再交给 python：**不要**让 curl 的退出码污染判定。
    # 实测坑：脚本设了 pipefail，而 SSE 靠 --max-time 收尾必然退 28（超时），
    # 于是 `curl | python3` 的管道退出码变成 28 → 判定命令被记成失败，而图其实已经拿到了。
    raw="$(curl -sN --max-time 3 "$EVENTS_URL" 2>/dev/null || true)"
    printf '%s' "$raw" | python3 -c "
import sys, re, json
data = sys.stdin.read()
m = re.search(r'data: (\{\"type\":\"graph\".*\})', data)
if not m:
    print('⛔ 取不到插件图（宿主未挂载 /plugins/events？）'); raise SystemExit(1)
g = json.loads(m.group(1))['graph']
print(f\"插件图 rev={g['rev']} · 条目 {len(g['entries'])} 个\")
for e in g['entries']:
    if e['id'].startswith('dsh-plugin') or e['id'].startswith('dshmarket'):
        print(f\"  {e['id']}  rev={e['rev']}\")
"
    ;;
  watch)
    SECS="${2:-5}"
    echo "👀 盯 ${SECS} 秒事件流（不做任何改动）：$EVENTS_URL"
    raw="$(curl -sN --max-time "$SECS" "$EVENTS_URL" 2>/dev/null || true)"
    printf '%s' "$raw" | grep -o '"type":"[a-z]*"' | sort | uniq -c
    ;;
  reload)
    PKG="${2:-}"
    [ -n "$PKG" ] || { echo "用法：plugin_reload.sh reload <包名>" >&2; exit 2; }
    BUNDLE="$PROFILE_NM/$PKG/lib/client.js"
    [ -f "$BUNDLE" ] || { echo "⛔ 找不到插件产物：$BUNDLE" >&2; exit 2; }

    before="$(graph_rev_of "$PKG")"
    if [ -z "$before" ]; then
      echo "⛔ 插件图里没有 $PKG —— 它没被装配进 profile 的 bundles，热重载无从谈起" >&2
      echo "   处置：bash scripts/plugin_sync.sh install（装配后仍需重载一次宿主才进图）" >&2
      exit 1
    fi
    echo "触发前：$PKG rev=$before"

    # 同时开始捕获事件流，再 touch —— 顺序很重要：先订阅再触发，否则会漏帧
    cap="$(mktemp)"
    ( curl -sN --max-time 8 "$EVENTS_URL" > "$cap" 2>/dev/null & )
    sleep 1
    touch "$BUNDLE"
    echo "已触发重建标记（touch）：$BUNDLE"
    sleep 4

    # 判定只认"收到了点名该插件的 rebuilt 帧，且修订号与触发前不同"
    line="$(grep -o "{\"type\":\"rebuilt\",\"id\":\"$PKG\",\"rev\":\"[^\"]*\"" "$cap" | head -1)"
    if [ -n "$line" ]; then
      newrev="$(printf '%s' "$line" | sed 's/.*"rev":"\([^"]*\)".*/\1/')"
      if [ "$newrev" != "$before" ]; then
        echo "✅ 已确认热替换：$PKG rev $before → $newrev"
        echo "   浏览器侧已就地换掉该插件（无需刷新、无需重启；该插件的 React 状态会重置）。"
        rm -f "$cap"
        exit 0
      fi
      echo "⚠️ 收到 rebuilt 帧但修订号没变（$newrev）—— 无法证明已替换" >&2
    else
      echo "⛔ 未收到 $PKG 的 rebuilt 帧 —— 宿主未推送或页面未连接" >&2
      echo "   处置：确认宿主在跑（node scripts/lib/host_pid.mjs），或退回重启应用（node scripts/app_restart.mjs --delay 30）" >&2
    fi
    rm -f "$cap"
    exit 1
    ;;
  *)
    echo "用法：plugin_reload.sh <list|watch 秒数|reload 包名>" >&2
    exit 2
    ;;
esac
