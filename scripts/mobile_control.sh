#!/usr/bin/env bash
# ==============================================================================
# 脚本名称：mobile_control.sh（REQ-094 · 手机操控 DSH 的日常入口）
# 功能描述：薄壳。只做"找 node + 转发"，不复制任何判定/代理逻辑
#           （代理与鉴权的唯一权威源是 scripts/mobile_bridge.mjs 与 scripts/lib/mobile_bridge_core.mjs）。
# ==============================================================================
# 为什么要薄壳：工程里已有实测教训——把同一套逻辑抄成两份，改一份必漏一份。
# 这里连"默认端口""PIN 生成"都不重写，全部下沉到 .mjs。
#
# 用法（在仓库根目录）：
#   ./scripts/mobile_control.sh start     # 启动网桥并打印手机链接（PIN 已带在链接里）
#   ./scripts/mobile_control.sh url       # 只看手机链接与 PIN
#   ./scripts/mobile_control.sh status    # 看运行状态与会话统计
#   ./scripts/mobile_control.sh doctor    # 体检（密钥/宿主/网段/端口）
#   ./scripts/mobile_control.sh stop      # 停止网桥
#   ./scripts/mobile_control.sh serve     # 前台运行（调试用，Ctrl-C 退出）
# 退出码：转发 .mjs 的真实退出码
# ==============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

NODE_BIN="${DSH_NODE_BIN:-}"
if [ -z "$NODE_BIN" ] && [ -f "$SCRIPT_DIR/lib/find_node.sh" ]; then
  # shellcheck disable=SC1091
  . "$SCRIPT_DIR/lib/find_node.sh"
  NODE_BIN="$(find_node || true)"
fi
[ -n "$NODE_BIN" ] || NODE_BIN="node"

if ! command -v "$NODE_BIN" >/dev/null 2>&1 && [ ! -x "$NODE_BIN" ]; then
  echo "❌ 找不到 node 运行时（可用 DSH_NODE_BIN=<路径> 指定）" >&2
  exit 2
fi

exec "$NODE_BIN" "$ROOT/scripts/mobile_bridge.mjs" "$@"
