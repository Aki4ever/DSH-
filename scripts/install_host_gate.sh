#!/usr/bin/env bash
# ==============================================================================
# 管控拦截层 · 宿主注册脚本 (scripts/install_host_gate.sh)
# ==============================================================================
# 为什么需要它（2026-09-28 实测根因）：
#   本工程把「待办常显」「硬门禁」「常显看板」「自动命名」写在规则里当硬要求，
#   但这些能力的**唯一执行者是 ai-control/plugin 这个宿主机插件**。
#   实测：DSH 的 profiles/web/cordis.patch.yml 里从来没有它的注册条目，
#   plugin-status.txt 的 isHost=false（最后一次激活来自自检脚本）。
#   结论：规则在，机制不在——所有"必须"都只是 Markdown 里的一句话。
#
# 本脚本把"注册"变成一条幂等、可验证、可回滚的动作：
#   install  幂等写入注册条目（已存在则只报告，不重复写）
#   verify   机器判定：条目是否存在 + 宿主是否真的激活过它（isHost=true）
#   uninstall 移除该条目（回滚）
#
# 用法：
#   ./scripts/install_host_gate.sh verify        # 只查，退出码 1 表示未生效
#   ./scripts/install_host_gate.sh install       # 补写条目（写前自动备份）
#   ./scripts/install_host_gate.sh uninstall     # 回滚条目
#
# 生效条件：DSH 需重新加载 profile（重启 App 或触发 HMR）；本脚本只保证"条目在位"，
#           **不谎称已生效**——生效与否一律以 verify 的 isHost 与条目双证据为准。
# ==============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DSH_HOME_DIR="${DSH_HOME:-$HOME/Library/Application Support/dsh-desktop/harness}"
PATCH_FILE="$DSH_HOME_DIR/profiles/web/cordis.patch.yml"
STATUS_FILE="$DSH_HOME_DIR/.dsh-control/plugin-status.txt"
ENTRY_ID="ai-execution-control"
LOADER_ABS="$ROOT/ai-control/plugin/loader.mjs"

ACTION="${1:-verify}"

# file:// URL 需要把空格与中文百分号编码，否则 YAML 里的 name 指向不存在的路径
url_encode_path() {
  node -e 'const p=process.argv[1];process.stdout.write("file://"+p.split("/").map(s=>encodeURIComponent(s)).join("/"))' "$1"
}

has_entry() { [ -f "$PATCH_FILE" ] && grep -q "id: $ENTRY_ID" "$PATCH_FILE"; }

# 判定宿主是否**真的**激活过插件：isHost=true 才作数（自检脚本调用会写 isHost=false）
host_activated() {
  [ -f "$STATUS_FILE" ] && grep -q '^isHost=true' "$STATUS_FILE"
}

case "$ACTION" in
  verify)
    echo "🔎 管控拦截层宿主注册核查"
    echo "-----------------------------------------"
    echo "注册文件: $PATCH_FILE"
    local_ok=0
    if has_entry; then echo "条目存在: ✅ id=$ENTRY_ID"; local_ok=1; else echo "条目存在: ⛔ 缺失"; fi
    echo "加载器路径: $LOADER_ABS"
    [ -f "$LOADER_ABS" ] && echo "加载器文件: ✅ 存在" || { echo "加载器文件: ⛔ 不存在"; local_ok=0; }
    if host_activated; then
      echo "宿主激活: ✅ isHost=true（$(grep -m1 '插件已激活' "$STATUS_FILE" || true)）"
    else
      echo "宿主激活: ⛔ 未激活（plugin-status.txt 无 isHost=true）"
      echo "          提示：条目写入后需重载 profile 才会激活；未激活前所有硬门禁都不生效。"
      local_ok=0
    fi
    echo "-----------------------------------------"
    # 仅"条目在位 + 加载器存在"只能证明已注册；宿主未激活时整体判未生效。
    # 这样调用方不会把"我写了配置"误读成"机制在运行"。
    [ "$local_ok" -eq 1 ] && exit 0 || exit 1
    ;;
  install)
    if [ ! -f "$PATCH_FILE" ]; then echo "❌ 找不到 profile 配置：$PATCH_FILE"; exit 2; fi
    if has_entry; then echo "ℹ️ 条目已存在，无需重复写入（幂等）"; exit 0; fi
    cp "$PATCH_FILE" "$PATCH_FILE.bak-$(date +%Y%m%d-%H%M%S)-install-gate"
    URL="$(url_encode_path "$LOADER_ABS")"
    cat >> "$PATCH_FILE" <<EOF

# ── AI 执行流程管控 · 拦截层（由 scripts/install_host_gate.sh 写入）────────────
# 为什么必须在这里插一行：本插件是宿主运行时的硬门禁与过程可见性来源。
# 没有它，"待办常显/硬门禁/常显看板/自动命名"在物理上都不存在（只有文档写着）。
# 走 loader.mjs 而非 index.mjs：加载失败降级为空插件，避免管控故障拖垮桌面端。
- insert:
    - id: $ENTRY_ID
      name: "$URL"
EOF
    echo "✅ 注册条目已写入：$PATCH_FILE"
    echo "▶ 下一步：重载 profile（重启 DSH 或触发 HMR）后运行：./scripts/install_host_gate.sh verify"
    ;;
  uninstall)
    if ! has_entry; then echo "ℹ️ 条目不存在，无需回滚"; exit 0; fi
    cp "$PATCH_FILE" "$PATCH_FILE.bak-$(date +%Y%m%d-%H%M%S)-uninstall-gate"
    # 只删本条目的插入块：从注释行到 name 行，避免误伤其它插件配置
    node -e '
const fs=require("node:fs")
const file=process.argv[1], id=process.argv[2]
const lines=fs.readFileSync(file,"utf8").split("\n")
const out=[]; let skipping=false
for (const line of lines) {
  if (/^- insert:/.test(line)) { skipping=false }
  if (/id:\s*["\x27]?/.test(line) && line.includes(id)) { skipping=true; continue }
  if (skipping) { if (/^\s*- id:/.test(line)) { skipping=false } else { continue } }
  out.push(line)
}
fs.writeFileSync(file,out.join("\n").replace(/\n{3,}/g,"\n\n"),"utf8")
' "$PATCH_FILE" "$ENTRY_ID"
    echo "✅ 注册条目已移除（备份已留存）"
    ;;
  *)
    echo "用法：$0 {verify|install|uninstall}"; exit 2
    ;;
esac
