#!/usr/bin/env bash
# ==============================================================================
# 脚本名称：check_task_naming.sh
# 功能描述：检查「当前会话」的任务命名是否符合规范，供看板常显与流程判定使用
# 使用方式：./scripts/check_task_naming.sh          # 人类可读输出
#           ./scripts/check_task_naming.sh --exit   # 不合规时以退出码 1 结束
# 规范唯一权威源：knowledge/common/task_naming_spec.md
# ==============================================================================
# 背景：任务的命名是"说得出"的约束，需要"查得到"的判据才算真约束。
# 本脚本把「当前会话标题是否合规」变成一条可执行的命令，
# 使看板能常显命名状态，也让流程的 S05 首动命名门禁从口号变成判据。
# ==============================================================================

set -uo pipefail

EXIT_MODE=0
[[ "${1:-}" == "--exit" ]] && EXIT_MODE=1

SESSION_ID="${DSH_SESSION_ID:-}"
if [[ -z "$SESSION_ID" ]]; then
  echo "⚠️  未检测到 DSH_SESSION_ID，无法判定当前任务命名"
  exit 0
fi

HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
STORE="$HOME_DIR/storages/session_projcache.json"
if [[ ! -f "$STORE" ]]; then
  echo "⚠️  找不到会话存储，无法判定当前任务命名"
  exit 0
fi

# 找 Node 运行时（与 control_gates.sh 同策略：DSH 自带 → PATH → 常见位置）
find_node() {
  if [[ -n "${DSH_NODE_BIN:-}" && -x "${DSH_NODE_BIN}" ]]; then echo "${DSH_NODE_BIN}"; return; fi
  if [[ -x "/Volumes/DSH Desktop/DSH Desktop.app/Contents/Resources/runtime/node" ]]; then
    echo "/Volumes/DSH Desktop/DSH Desktop.app/Contents/Resources/runtime/node"; return
  fi
  for c in "$(command -v node 2>/dev/null)" /opt/homebrew/bin/node /usr/local/bin/node; do
    [[ -n "$c" && -x "$c" ]] && { echo "$c"; return; }
  done
}
NODE_BIN="$(find_node)"

# 用 Node 做真正的 JSON 解析取标题。
# 踩坑记录：曾用 perl 按文本定位 title，但该存储里 title 字段位于 sessionId **之前**，
# 正向查找会取到**下一个会话**的标题（静默取错值，比报错更危险），故改为结构化解析。
TITLE=""
if [[ -n "$NODE_BIN" ]]; then
  TITLE="$(
    STORE="$STORE" SID="$SESSION_ID" "$NODE_BIN" -e '
      const fs = require("node:fs")
      try {
        const d = JSON.parse(fs.readFileSync(process.env.STORE, "utf8"))
        const v = d?.tables?.sessions?.[process.env.SID]?.rows?.title?.val
        if (typeof v === "string") process.stdout.write(v)
      } catch {}
    ' 2>/dev/null
  )"
fi

if [[ -z "$TITLE" ]]; then
  echo "⚠️  当前会话尚无标题记录"
  [[ "$EXIT_MODE" == 1 ]] && exit 1
  exit 0
fi

# 逐条校验（与 rename_session.sh / 命名规范 R1~R7 同口径，支持中文语义化分类与难度分）
REASON=""
if [[ ! "$TITLE" =~ ^\[(新需|调研|优规|修漏|重构|巡检|测验|[RFDSOQ])[0-9]{3}\]\[[0-9]{1,3}分?\][[:space:]]+.+$ ]]; then
  REASON="格式不符合「[分类编号][难度分] 概述」（如 [新需008][90] 管控机制优化）"
else
  CODE="$(printf '%s' "$TITLE" | sed -E 's/^\[([^]]+)\].*/\1/')"
  SCORE="$(printf '%s' "$TITLE" | sed -E 's/^\[[^]]+\]\[([^]]+)\].*/\1/')"
  SUMMARY="$(printf '%s' "$TITLE" | sed -E 's/^\[[^]]+\]\[[^]]+\][[:space:]]+//')"
  SCORE_NUM="${SCORE%分}"
  if (( 10#$SCORE_NUM < 1 || 10#$SCORE_NUM > 100 )); then
    REASON="难度分 ${SCORE} 越界（须 1~100）"
  else
    HAN="$(printf '%s' "$SUMMARY" | perl -CSD -ne 'my $c = () = $_ =~ /\p{Han}/g; print $c' 2>/dev/null)"
    [[ "$HAN" =~ ^[0-9]+$ ]] || HAN=0
    if (( HAN < 1 )); then REASON="任务概述不含汉字"
    elif (( HAN > 8 )); then REASON="任务概述 ${HAN} 字，超 8 字上限"
    fi
  fi
fi

if [[ -z "$REASON" ]]; then
  echo "✅ 任务命名合规：${TITLE}"
  exit 0
fi

echo "⚠️  任务命名不合规：${TITLE}"
echo "    原因：${REASON}"
echo "    修正：./scripts/name_me.sh \"[新需008][90] 管控机制优化\""
echo "    规范：knowledge/common/task_naming_spec.md"
[[ "$EXIT_MODE" == 1 ]] && exit 1
exit 0
