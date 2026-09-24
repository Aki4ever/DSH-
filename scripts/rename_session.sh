#!/usr/bin/env bash
# ==============================================================================
# 脚本名称：rename_session.sh
# 功能描述：通过 DSH 后台 HTTP RPC 接口，为当前会话重命名并锁定侧边栏标题
# 使用方式：./scripts/rename_session.sh "新标题" [sessionId] [webUrl]
# ==============================================================================

set -euo pipefail

TITLE="${1:-}"
SESSION_ID="${2:-${DSH_SESSION_ID:-}}"
WEB_URL="${3:-${DSH_WEB_URL:-http://127.0.0.1:50447}}"

if [[ -z "$TITLE" ]]; then
  echo "❌ 错误: 必须提供会话标题参数。示例: $0 '[R003][70分] 任务简要概述'" >&2
  exit 1
fi

if [[ -z "$SESSION_ID" ]]; then
  echo "❌ 错误: 未检测到 DSH_SESSION_ID 环境变量，也未手动指定会话 ID。" >&2
  exit 1
fi

# ==============================================================================
# 格式硬校验：逐条执行命名规范 R1~R7
# 规范唯一权威源：knowledge/common/task_naming_spec.md
# 不合规直接拒绝并打印正确示例，杜绝"人肉记忆走样"。
# ==============================================================================
TITLE="${TITLE//$'\n'/ }"

# R7 首尾空白
if [[ "$TITLE" != "$(printf '%s' "$TITLE" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')" ]]; then
  echo "❌ 命名不合规：标题首尾不得有空白字符。" >&2; exit 1
fi

# R7 组件间多余空格
if printf '%s' "$TITLE" | grep -qE '\]\s+\[|\][[:space:]]{2,}'; then
  echo "❌ 命名不合规：组件之间不得有多余空格。正确写法：[R048][50分] 管控机制双优化" >&2
  exit 1
fi

# R1 三段式结构与拼装顺序
if ! printf '%s' "$TITLE" | grep -qE '^\[[^]]+\]\[[^]]+\][[:space:]]+[^][]+$'; then
  echo "❌ 命名不合规：必须三段式「[分类编号][难度分] 概述」，顺序不可调换、不可缺段。" >&2
  echo "   正确示例： [R048][50分] 管控机制双优化" >&2; exit 1
fi

CODE="$(printf '%s' "$TITLE" | sed -E 's/^\[([^]]+)\].*/\1/')"
SCORE="$(printf '%s' "$TITLE" | sed -E 's/^\[[^]]+\]\[([^]]+)\].*/\1/')"
SUMMARY="$(printf '%s' "$TITLE" | sed -E 's/^\[[^]]+\]\[[^]]+\][[:space:]]+//')"

# R2/R3 分类编号：支持中文语义分类（新需/调研/优规/修漏/重构/巡检/测验）或单字母 + 三位数字
if ! printf '%s' "$CODE" | grep -qE '^((新需|调研|优规|修漏|重构|巡检|测验)|[RFDSOQ])[0-9]{3}$'; then
  echo "❌ 命名不合规：分类编号必须「中文分类/单字母+三位数字」（如 [新需008] 或 [R048]）。" >&2
  echo "   收到： [${CODE}]" >&2; exit 1
fi

# R4 难度分：1~100 整数，可带或不带"分"字
if ! printf '%s' "$SCORE" | grep -qE '^[0-9]{1,3}分?$'; then
  echo "❌ 命名不合规：难度分必须是 1~100 的整数（如 [90] 或 [90分]）。" >&2
  echo "   收到： [${SCORE}]" >&2; exit 1
fi
SCORE_NUM="${SCORE%分}"
# 用 10# 前缀强制十进制，避免 "008" 被 bash 当成八进制字面量解析而报错
if (( 10#$SCORE_NUM < 1 || 10#$SCORE_NUM > 100 )); then
  echo "❌ 命名不合规：难度分必须在 1~100 之间，收到 [${SCORE}]。" >&2; exit 1
fi

# R6 概述非空且不含方括号
if [[ -z "$SUMMARY" ]]; then
  echo "❌ 命名不合规：任务概述不得为空。" >&2; exit 1
fi
if printf '%s' "$SUMMARY" | grep -qE '[][\r]'; then
  echo "❌ 命名不合规：任务概述不得包含方括号。" >&2; exit 1
fi

# R5 概述汉字数 ≤ 8（数字、字母、标点不计入）
# 注意：必须用 perl 做真实 Unicode 计数。实测 `wc -m` 在本脚本的命令替换环境中
#       会退化为按字节计数（LC_ALL 传递不可靠），导致差值为负、误判"不含汉字"。
if command -v perl >/dev/null 2>&1; then
  HAN_COUNT="$(printf '%s' "$SUMMARY" | perl -CSD -ne 'my $c = () = $_ =~ /\p{Han}/g; print $c' 2>/dev/null || echo "")"
fi
if [[ ! "${HAN_COUNT:-}" =~ ^[0-9]+$ ]]; then
  echo "❌ 命名校验无法完成：需要 perl 以进行 Unicode 汉字计数，请先确保 perl 可用。" >&2
  exit 1
fi
if [[ "$HAN_COUNT" == "0" ]]; then
  echo "❌ 命名不合规：任务概述必须包含汉字。" >&2; exit 1
fi
if (( HAN_COUNT > 8 )); then
  echo "❌ 命名不合规：任务概述汉字数为 ${HAN_COUNT}，超过 8 字上限。" >&2
  echo "   收到： ${SUMMARY}" >&2
  echo "   正确示例： [R048][50分] 管控机制双优化（7 字）" >&2; exit 1
fi

RPC_ID="rename-$(date +%s%N 2>/dev/null || date +%s)"

PAYLOAD=$(cat <<EOF
{
  "type": "client-request",
  "rpcId": "${RPC_ID}",
  "method": "session.rename",
  "payload": {
    "sessionId": "${SESSION_ID}",
    "title": "${TITLE}"
  }
}
EOF
)

RESPONSE=$(curl -s -X POST "${WEB_URL}/api/session.rename" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}")

if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "✅ 成功重命名会话为: ${TITLE}"
  exit 0
else
  echo "❌ 重命名失败，服务器响应: ${RESPONSE}" >&2
  exit 1
fi
