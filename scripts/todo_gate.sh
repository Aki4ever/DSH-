#!/usr/bin/env bash
# ==============================================================================
# 待办常显判定入口 (scripts/todo_gate.sh)
# ==============================================================================
# 角色：把「S07 待办常显」从一句 Markdown 愿望，降为**可判定、可阻断、可审计**的
#       物理事实。判定依据只有磁盘证据文件，绝不采信模型自述。
#
# 用法：
#   ./scripts/todo_gate.sh status            # 人读状态（看板/排查）
#   ./scripts/todo_gate.sh check             # 机器判定：合规退出 0，不合规退出 1
#   ./scripts/todo_gate.sh json              # 输出证据 JSON（审计脚本消费）
#   ./scripts/todo_gate.sh record '<json>'   # 落盘一次证据（供补录与测试）
#   ./scripts/todo_gate.sh selftest          # 判定逻辑三态自检（临时目录内跑，不动真实证据）
#
# 证据路径：$DSH_HOME/.dsh-control/todos/<会话ID>.json
# 退出码：0 合规；1 不合规；2 用法错误
#
# 薄封装说明：真正的判定逻辑在 scripts/lib/todo_tracker.mjs（纯函数、可单测），
#             CLI 在 scripts/lib/todo_gate_cli.mjs。本脚本只负责转交与自检沙箱。
# ==============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACTION="${1:-status}"
ARG2="${2:-}"

# Node 运行时解析（REQ-087 R1 修复）：裸 `node` 在 PATH 缺失时会让判定静默降级
# （实测 audit_execution 误报 36/100、todo_gate 直接 command not found）。
. "$SCRIPT_DIR/lib/find_node.sh"
NODE_BIN="$(find_node || true)"
if [ -z "$NODE_BIN" ]; then echo "❌ 找不到 Node 运行时（可设 DSH_NODE_BIN 指定）" >&2; exit 2; fi

if [ "$ACTION" = "selftest" ]; then
  # 自检必须隔离：绝不污染真实会话证据
  TMPHOME="$(mktemp -d)"
  trap 'rm -rf "$TMPHOME"' EXIT
  DSH_TODO_SELFTEST_HOME="$TMPHOME" "$NODE_BIN" "$SCRIPT_DIR/lib/todo_gate_cli.mjs" selftest
  exit $?
fi

"$NODE_BIN" "$SCRIPT_DIR/lib/todo_gate_cli.mjs" "$ACTION" "$ARG2"
exit $?
