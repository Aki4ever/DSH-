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

DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
# ── profile 解析（2026-09-29 修 F3）────────────────────────────────────────────
# 原实现把 profile 硬编码成 `profiles/web/`。实测本机 `~/.dsh/profiles/` 下**只有 desktop**，
# `profiles/web/` 目录根本不存在 —— 于是 install 直接"找不到 profile 配置"、
# verify 永远报"条目缺失"，这个自证工具本身失去判定力（机制没坏，是工具查错了地方）。
# 现在按「显式环境变量 → 磁盘上真实存在的 profile 目录」解析，并把结果打印出来，绝不猜。
resolve_profile_dir() {
  if [ -n "${DSH_PROFILE_DIR:-}" ] && [ -d "$DSH_PROFILE_DIR" ]; then printf '%s' "$DSH_PROFILE_DIR"; return 0; fi
  if [ -n "${DSH_PROFILE:-}" ] && [ -d "$DSH_HOME_DIR/profiles/${DSH_PROFILE}" ]; then
    printf '%s' "$DSH_HOME_DIR/profiles/${DSH_PROFILE}"; return 0
  fi
  local d
  for d in "$DSH_HOME_DIR"/profiles/*/; do
    [ -f "${d}cordis.patch.yml" ] && { printf '%s' "${d%/}"; return 0; }
  done
  return 1
}
PROFILE_DIR="$(resolve_profile_dir || true)"
PROFILE_RESOLVED=1
if [ -z "$PROFILE_DIR" ]; then
  PROFILE_DIR="$DSH_HOME_DIR/profiles/web"   # 兼容旧布局：不崩，但下面会明确报"目录不存在"
  PROFILE_RESOLVED=0
fi
PATCH_FILE="$PROFILE_DIR/cordis.patch.yml"
STATUS_FILE="$DSH_HOME_DIR/.dsh-control/plugin-status.txt"
ENTRY_ID="ai-execution-control"
LOADER_ABS="$ROOT/ai-control/plugin/loader.mjs"

ACTION="${1:-verify}"

# file:// URL 需要把空格与中文百分号编码，否则 YAML 里的 name 指向不存在的路径
url_encode_path() {
  node -e 'const p=process.argv[1];process.stdout.write("file://"+p.split("/").map(s=>encodeURIComponent(s)).join("/"))' "$1"
}

has_entry() { [ -f "$PATCH_FILE" ] && grep -q "id: $ENTRY_ID" "$PATCH_FILE"; }

# 宿主激活证据有两个来源，任一成立即算激活：
#   1) 追加式台账 host-activation.log（只记 isHost=true 事件，测试进程覆盖不掉）——首选；
#   2) 覆盖式 plugin-status.txt 里的 isHost=true —— 兼容旧记录。
# 为什么必须两源：plugin-status.txt 会被任何一次 apply 覆盖。实测 2026-09-28：
# 自检脚本在默认 stateDir 里 apply 一次，就把宿主真实激活记录覆盖成 isHost=false，
# 于是 verify 在机制明明活着时误报"未激活"。凭据必须是不被无关进程抹掉的那种。
# 脚本自身版本: v1.1.0
ACTIVATION_LOG="$DSH_HOME_DIR/.dsh-control/host-activation.log"
host_activated() {
  if [ -f "$ACTIVATION_LOG" ] && grep -q 'HOST ' "$ACTIVATION_LOG"; then return 0; fi
  [ -f "$STATUS_FILE" ] && grep -q '^isHost=true' "$STATUS_FILE"
}

# 取最近一次宿主激活记录（供展示）
host_evidence() {
  if [ -f "$ACTIVATION_LOG" ]; then
    tail -1 "$ACTIVATION_LOG" | sed 's/^/宿主激活台账: /'
  else
    grep -m1 '插件已激活' "$STATUS_FILE" 2>/dev/null || true
  fi
}

case "$ACTION" in
  verify)
    echo "🔎 管控拦截层宿主注册核查"
    echo "-----------------------------------------"
    echo "DSH 家目录: $DSH_HOME_DIR"
    if [ "$PROFILE_RESOLVED" -eq 1 ]; then
      echo "目标 profile: $PROFILE_DIR（已解析）"
    else
      echo "目标 profile: $PROFILE_DIR ⛔ 目录不存在（DSH_HOME 下未找到任何含 cordis.patch.yml 的 profile）"
    fi
    echo "注册文件: $PATCH_FILE"
    local_ok=0
    if has_entry; then echo "条目存在: ✅ id=$ENTRY_ID"; local_ok=1; else echo "条目存在: ⛔ 缺失"; fi
    echo "加载器路径: $LOADER_ABS"
    [ -f "$LOADER_ABS" ] && echo "加载器文件: ✅ 存在" || { echo "加载器文件: ⛔ 不存在"; local_ok=0; }
    if host_activated; then
      echo "宿主激活: ✅ 有宿主激活凭据（$(host_evidence)）"
      host_ok=1
    else
      echo "宿主激活: ⛔ 无宿主激活凭据（host-activation.log 与 plugin-status.txt 均无 isHost=true）"
      echo "          提示：条目写入后需重载 profile 才会激活；未激活前所有硬门禁都不生效。"
      # 关键：这里**不能**把 local_ok 归零。载体是否存在与宿主是否已激活是两件事；
      # 混在一个变量里会让"已注册但还没重载"被判成"载体坏了"（实测踩过：
      # verify 在载体完好的情况下退 1，调用方只能一律报警）。
      host_ok=0
    fi
    echo "-----------------------------------------"
    # 三态语义（2026-09-28 修正）：
    #   0 = 已注册 且 有宿主运行时激活凭据（唯一可宣称"机制在运行"的状态）；
    #   1 = 载体坏了（条目缺失或加载器文件不存在）——真正的故障；
    #   2 = 已注册，但宿主尚未落运行时凭据（未重载 / 刚清空回填凭据）。
    # 为什么把 2 单独拆出来：把"还没跑起来"与"装坏了"混成同一个失败码，
    # 调用方就无法区分"该重启"与"该修配置"，只能一律报警。
    # 同时修一个真实缺陷：旧写法 `[ … ] && exit 0 || exit 1` 在本脚本里
    # 实测恒定返回 0（未激活时 verify 也报成功），使这个自证工具本身失去判定力。
    if [ "$local_ok" -ne 1 ]; then exit 1; fi
    if [ "$host_ok" -eq 1 ]; then exit 0; fi
    exit 2
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
