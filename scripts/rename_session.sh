#!/usr/bin/env bash
# ==============================================================================
# 脚本名称：rename_session.sh
# 功能描述：通过 DSH 后台 HTTP RPC 接口，为当前会话重命名并锁定侧边栏标题
# 使用方式：./scripts/rename_session.sh "新标题" [sessionId] [webUrl]
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Node 运行时解析（REQ-087 R1 修复）：裸 `node` 在 PATH 缺失时会让判定静默降级。
. "$SCRIPT_DIR/lib/find_node.sh"
NODE_BIN="$(find_node || true)"

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
# 实测坑（2026-09-29 修）：原写法 `grep -qE '^[0-9]{1,3}分?$'` 在 BSD grep + 空 locale 下，
# 因为模式里含多字节字符「分」，整个 ERE 退化成匹配不到任何输入 —— 表现是 [5]、[90] 这类
# **纯数字难度分被误判为非法**，而 [90分] 反而通过。故改为纯 ASCII 校验：
# 先剥掉可选的「分」后缀，再用只含 ASCII 的 bash 正则判定，彻底绕开多字节歧义。
SCORE_NUM="${SCORE%分}"
if [[ ! "$SCORE_NUM" =~ ^[0-9]{1,3}$ ]]; then
  echo "❌ 命名不合规：难度分必须是 1~100 的整数（如 [90] 或 [90分]）。" >&2
  echo "   收到： [${SCORE}]" >&2; exit 1
fi
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

# 1. 尝试从 Electron SQLite Cookies 中提取宿主 Web 鉴权凭据
# 实测坑（2026-09-29 修）：原实现只认旧的 `~/Library/Application Support/dsh-desktop/Cookies`，
# 而当前宿主（DeepSeek Harness）的 Electron userData 目录是
# `~/Library/Application Support/@deepseek-ai/dsh-desktop`。查错目录的后果是：
# sqlite3 读到一个**过期令牌** → RPC 返回 unauthorized → 脚本仍然打印"本地存储双写落盘完成"，
# 于是标题**从未真正改过**，而执行者以为改成功了。故改为多候选目录逐个尝试，取第一个拿到凭据的。
CNAME=""
CVAL=""
COOKIES_CANDIDATES=(
  "${DSH_ELECTRON_USERDATA:-}/Cookies"
  "$HOME/Library/Application Support/@deepseek-ai/dsh-desktop/Cookies"
  "$HOME/Library/Application Support/dsh-desktop/Cookies"
  "$HOME/Library/Application Support/com.yeagoo.dsh-desktop/Cookies"
)
if command -v sqlite3 >/dev/null 2>&1; then
  for CAND in "${COOKIES_CANDIDATES[@]}"; do
    [[ -n "$CAND" && -f "$CAND" ]] || continue
    RAW_COOKIE=$(sqlite3 "$CAND" "SELECT name, value FROM cookies WHERE name LIKE 'dsh-auth-%' ORDER BY creation_utc DESC LIMIT 1;" 2>/dev/null || true)
    if [[ -n "$RAW_COOKIE" ]]; then
      CNAME=$(printf '%s' "$RAW_COOKIE" | cut -d'|' -f1)
      CVAL=$(printf '%s' "$RAW_COOKIE" | cut -d'|' -f2)
      COOKIES_DB_USED="$CAND"
      break
    fi
  done
fi

# 2. 构造正确的 RPC 请求体 (规范契约：session/rename，含 args.request 封装)
PAYLOAD=$(cat <<EOF
{
  "type": "client-request",
  "rpcId": "${RPC_ID}",
  "method": "session/rename",
  "payload": {
    "args": {
      "request": {
        "sessionId": "${SESSION_ID}",
        "title": "${TITLE}"
      }
    }
  }
}
EOF
)

RPC_OK=0
if [[ -n "$CNAME" && -n "$CVAL" ]]; then
  RESPONSE=$(curl -s -X POST "${WEB_URL}/api/session/rename" \
    -H "Content-Type: application/json" \
    -H "Cookie: ${CNAME}=${CVAL}" \
    -d "${PAYLOAD}" || true)
  if echo "$RESPONSE" | grep -q '"ok":true'; then
    RPC_OK=1
    echo "✅ [前端任务栏]：RPC 广播成功，标题已在前端任务栏肉眼可见即时更新"
    echo "   · 凭据来源：${COOKIES_DB_USED:-未知}"
  fi
fi

# 3. 双层保障：将标题同步原子落盘至本地会话存储与缓存
HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
PER_SESSION_FILE="$HOME_DIR/storages/session_projcache/sessions/${SESSION_ID}.json"
STORE_FILE="$HOME_DIR/storages/session_projcache.json"

if [ -n "${NODE_BIN:-}" ]; then
  "$NODE_BIN" -e "
    const fs = require('fs');
    const path = require('path');
    const sid = '${SESSION_ID}';
    const title = process.argv[1];
    const pfile = '${PER_SESSION_FILE}';
    const sfile = '${STORE_FILE}';
    let saved = false;
    try {
      if (fs.existsSync(pfile)) {
        const d = JSON.parse(fs.readFileSync(pfile, 'utf8'));
        if (d && d.record && d.record.rows) {
          d.record.rows.title = d.record.rows.title || {};
          d.record.rows.title.val = title;
          d.record.rows.title.ver = (d.record.rows.title.ver || 1) + 1;
          fs.writeFileSync(pfile, JSON.stringify(d, null, 2), 'utf8');
          saved = true;
        }
      } else {
        const pdir = path.dirname(pfile);
        fs.mkdirSync(pdir, { recursive: true });
        const initData = {
          table: 'sessions',
          record: {
            rows: {
              title: { val: title, ver: 1 }
            }
          }
        };
        fs.writeFileSync(pfile, JSON.stringify(initData, null, 2), 'utf8');
        saved = true;
      }
      if (fs.existsSync(sfile)) {
        const d = JSON.parse(fs.readFileSync(sfile, 'utf8'));
        if (d && d.tables && d.tables.sessions) {
          d.tables.sessions[sid] = d.tables.sessions[sid] || { rows: {} };
          d.tables.sessions[sid].rows = d.tables.sessions[sid].rows || {};
          d.tables.sessions[sid].rows.title = d.tables.sessions[sid].rows.title || {};
          d.tables.sessions[sid].rows.title.val = title;
          d.tables.sessions[sid].rows.title.ver = (d.tables.sessions[sid].rows.title.ver || 1) + 1;
          fs.writeFileSync(sfile, JSON.stringify(d, null, 2), 'utf8');
          saved = true;
        }
      }
      if (saved) console.log('✅ [权威存储]：本地存储双写落盘完成');
    } catch (e) {
      console.error('⚠️ 本地落盘告警:', e.message);
    }
  " "$TITLE"
fi

if [[ "$RPC_OK" -eq 1 ]]; then
  echo "🎉 改名全链路闭环达成: ${TITLE}"
  exit 0
else
  # 实测结论（2026-09-29）：本地 projcache 不是权威存储 —— 宿主会用它内存里的标题把它覆盖回去，
  # 所以"本地落盘成功"不等于"改名成功"。旧实现此时仍然 exit 0，等于向调用方谎报成功；
  # 现在改为明确报错并非零退出，符合"不采信自我宣称"的口径。
  echo "❌ 改名未生效：宿主 RPC 未返回 ok:true，本地存储的写入会被宿主覆盖，标题实际未变更。" >&2
  if [[ -z "$CNAME" || -z "$CVAL" ]]; then
    echo "   原因：未找到宿主鉴权凭据。已尝试的候选目录：" >&2
    for CAND in "${COOKIES_CANDIDATES[@]}"; do [[ -n "$CAND" ]] && echo "     - $CAND" >&2; done
    echo "   可设置 DSH_ELECTRON_USERDATA 指向 Electron userData 目录后重试。" >&2
  else
    echo "   原因：凭据来源 ${COOKIES_DB_USED:-未知} 可能已过期；可重开宿主或改用前端手工改名。" >&2
  fi
  echo "   目标标题： ${TITLE}" >&2
  exit 1
fi
