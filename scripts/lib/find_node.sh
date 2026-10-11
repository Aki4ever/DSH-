#!/usr/bin/env bash
# ==============================================================================
# Node 运行时定位（单一权威实现）— scripts/lib/find_node.sh
# ==============================================================================
# 为什么单独抽出来（REQ-087 R1 实测根因）：
#   判定脚本用裸 `node` 时，一旦 PATH 里没有 node（DSH 宿主进程、沙箱 bash、
#   被别的脚本 spawn 的场景都很常见），判定就**静默降级**：
#     `audit_execution.sh` 实测因此把本该 80/100 的审计误报成 **36/100**；
#     `control_gates.sh` 实测因此打印 `node: command not found` 后继续算分。
#   判定器依赖外部 PATH = 假阴性来源，属"看着在跑、其实没跑"的一类。
#
# 用法（在 set -u 下安全）：
#   . "$SCRIPT_DIR/lib/find_node.sh"
#   NODE_BIN="$(find_node || true)"
#   [ -n "$NODE_BIN" ] && "$NODE_BIN" script.mjs --check
#
# 解析优先级：DSH_NODE_BIN（显式覆盖）→ DSH 桌面自带 → PATH → 常见安装位置 → nvm 最新版
# 找不到时**不输出任何东西**并返回 1，由调用方如实判"运行时缺失"，不得当作通过。
# ==============================================================================

find_node() {
  # ① DSH 自带的运行时（按版本目录 glob，不写死版本号）
  local g
  for g in "${DSH_HOME:-$HOME/.dsh}"/dsh-runtimes/*/dependencies/node/bin/node; do
    [ -x "$g" ] && { printf '%s' "$g"; return 0; }
  done
  local cands=(
    "${DSH_NODE_BIN:-}"
    "/Volumes/DSH Desktop/DSH Desktop.app/Contents/Resources/runtime/node"
    "$(command -v node 2>/dev/null || true)"
    "/opt/homebrew/bin/node"
    "/usr/local/bin/node"
    "$HOME/.nvm/versions/node/$(ls -1 "$HOME/.nvm/versions/node" 2>/dev/null | tail -1)/bin/node"
  )
  local c
  for c in "${cands[@]}"; do
    [ -n "$c" ] && [ -x "$c" ] && { printf '%s' "$c"; return 0; }
  done
  return 1
}
