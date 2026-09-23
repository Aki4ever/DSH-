#!/usr/bin/env bash
# ==============================================================================
# 脚本名称：name_me.sh
# 功能描述：**立刻**给"当前会话"改名——开工第一动作，一条命令，任何目录可用
# ==============================================================================
# 为什么要单独做这个脚本：
#   命名规范、校验脚本、批量工具都已齐备，但"每次发起任务立刻改当前任务名"
#   缺一个**动作足够短、任何目录都能敲**的入口。步骤一长，执行者（模型）就容易漏。
#   本脚本把"解析会话身份 + 解析宿主地址 + 校验 + 改名 + 回读确认"压成一条命令。
#
# 用法：
#   name_me.sh "[R012][60分] 任务简要概述"   # 用你起的合规标题改名
#   name_me.sh --auto                        # 让机器按规范生成标题（分类看 cwd，概述取首条消息）
#   name_me.sh --check                       # 只看当前名称是否合规，不改
#
# 退出码：0 成功；1 失败（含标题不合规）
# ==============================================================================
set -euo pipefail

# 解析脚本所在目录，保证从任意工作目录调用都能找到依赖
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MODE="set"
TITLE=""
case "${1:-}" in
  --auto)  MODE="auto" ;;
  --check) MODE="check" ;;
  "")      MODE="auto" ;;   # 不传参数时默认自动生成，降低使用门槛
  *)       TITLE="${1}" ;;
esac

# ── 1. 解析会话身份 ──────────────────────────────────────────────────────────
SID="${DSH_SESSION_ID:-}"
if [[ -z "$SID" ]]; then
  echo "❌ 未检测到 DSH_SESSION_ID：本脚本必须在 DSH 会话内运行。" >&2
  exit 1
fi

# ── 2. 解析宿主 Web 地址 ─────────────────────────────────────────────────────
# 不能只信 DSH_WEB_URL：该变量在宿主机进程内是缺失的。工具环境里通常有，
# 但没有时要用端口反查兜底，否则会静默打到错端口（历史缺陷：默认值是写死的旧端口）。
WEB="${DSH_WEB_URL:-}"
if [[ -z "$WEB" ]]; then
  WEB="$(node -e '
    import(process.argv[1]).then(async (m) => {
      const u = await m.resolveHostWebUrl()
      process.stdout.write(u ?? "")
    }).catch(() => {})
  ' "$ROOT/scripts/lib/auto_naming.mjs" 2>/dev/null || true)"
fi
if [[ -z "$WEB" ]]; then
  echo "❌ 解析不出宿主 Web 地址（DSH_WEB_URL 未设置且端口反查失败）。" >&2
  exit 1
fi

# ── 3. 执行 ──────────────────────────────────────────────────────────────────
case "$MODE" in
  check)
    exec "$ROOT/scripts/check_task_naming.sh"
    ;;
  auto)
    # 复用看门狗：它内部就是"生成合规标题并改名"，且已幂等（合规时不动）
    exec node "$ROOT/scripts/naming_watchdog.mjs" --apply --sid "$SID"
    ;;
  set)
    # 交给既有脚本做 R1~R7 硬校验，避免两处实现走样
    "$ROOT/scripts/rename_session.sh" "$TITLE" "$SID" "$WEB"
    ;;
esac
