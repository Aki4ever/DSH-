#!/usr/bin/env bash
# ==============================================================================
# 脚本名称：check_task_naming.sh
# 功能描述：检查「当前会话」的任务命名是否符合规范，供看板常显与流程判定使用
# 使用方式：./scripts/check_task_naming.sh          # 人类可读输出
#           ./scripts/check_task_naming.sh --exit   # 不合规时以退出码 1 结束
#
# 退出码语义（三态，PKG-009 / REQ-GCM-GAPFIX-041 修订）：
#   0  判定为合规
#   1  判定为不合规
#   3  **无法判定**（缺 DSH_SESSION_ID 或找不到会话存储）
#
# 为什么必须区分 3 与 0：本脚本是 GCM 唯一一票否决闸的判据入口。
# 旧实现在「找不到会话存储」时 `exit 0`，等于**判不了就放行** —— 最强的闸没有牙。
# 现在无法判定一律退 3，由 control_gates.sh 记为 pending（而非 pass）。
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
  [[ "$EXIT_MODE" == 1 ]] && exit 3
  exit 0
fi

HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
STORE="$HOME_DIR/storages/session_projcache.json"

# 会话存储布局会演进：早期是单个 session_projcache.json，现在是按名分片的
# storages/session_projcache*/sessions/<sid>.json（例如 session_projcache_archive_manager_v2）。
# 只认其中一种写法，就会在布局变化后集体「找不到会话存储」而静默放行。
PER_SESSION_FILE=""
for candidate in "$HOME_DIR"/storages/session_projcache*/sessions/"${SESSION_ID}.json"; do
  [ -f "$candidate" ] && PER_SESSION_FILE="$candidate" && break
done
if [ -z "$PER_SESSION_FILE" ]; then
  for candidate in "$HOME_DIR"/storages/session_projcache/sessions/"${SESSION_ID}.json"; do
    [ -f "$candidate" ] && PER_SESSION_FILE="$candidate" && break
  done
fi

# 第三种布局（新版宿主）：harness/sessions/<编码后的工作区>/<sid>/session.v3.jsonl.zstd
# 该文件是**多帧** zstd 压缩的 JSONL；会话标题落在 `session/title` 事件的 data.title。
# 实测：只认前两种布局时，本机所有会话都判「找不到存储」——不是没命名，是入口没查对。
SESSION_ZSTD=""
if [ -z "$PER_SESSION_FILE" ] && [ ! -f "$STORE" ]; then
  for candidate in "$HOME_DIR"/sessions/*/"${SESSION_ID}"/session.v3.jsonl.zstd; do
    [ -f "$candidate" ] && SESSION_ZSTD="$candidate" && break
  done
fi

if [[ ! -f "$STORE" && -z "$PER_SESSION_FILE" && -z "$SESSION_ZSTD" ]]; then
  # 三种布局都查不到 —— 这时才真的是「这个会话没有任何落盘记录」。
  echo "❌ 会话尚未命名：已定位 ${SESSION_ID}，但查不到其命名记录（请运行 ./scripts/name_me.sh \"[分类][难度] 概述\"）"
  [[ "$EXIT_MODE" == 1 ]] && exit 1
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

# 用 Node 做真正的 JSON 解析取标题（支持单文件 session_projcache.json 与拆分目录 sessions/<sid>.json）
TITLE=""
if [[ -n "$NODE_BIN" ]]; then
  TITLE="$(
    STORE="$STORE" PER_FILE="$PER_SESSION_FILE" SESSION_ZSTD="$SESSION_ZSTD" SID="$SESSION_ID" "$NODE_BIN" -e '
      const fs = require("node:fs")
      const zlib = require("node:zlib")
      // 多帧 zstd：zstdDecompressSync 只解第一帧，必须按魔数扫描逐帧解。
      function readZstdJsonl(path) {
        const input = fs.readFileSync(path)
        let off = 0, text = ""
        const MAGIC = [0x28, 0xB5, 0x2F, 0xFD]
        while (off < input.length) {
          try { text += zlib.zstdDecompressSync(input.subarray(off)).toString("utf8") }
          catch (err) { break }
          let next = -1
          for (let i = off + 4; i < input.length - 3; i++) {
            if (input[i] === MAGIC[0] && input[i+1] === MAGIC[1] && input[i+2] === MAGIC[2] && input[i+3] === MAGIC[3]) { next = i; break }
          }
          if (next < 0) break
          off = next
        }
        return text.split("\n").filter(Boolean)
      }
      try {
        if (process.env.SESSION_ZSTD && fs.existsSync(process.env.SESSION_ZSTD)) {
          let latest = ""
          for (const line of readZstdJsonl(process.env.SESSION_ZSTD)) {
            let evt
            try { evt = JSON.parse(line) } catch (err) { continue }
            if (evt && evt.type === "session/title" && evt.data && typeof evt.data.title === "string") {
              latest = evt.data.title        // 取最后一次标题事件：它是当前生效标题
            }
          }
          if (latest) { process.stdout.write(latest); process.exit(0) }
        }
        if (fs.existsSync(process.env.PER_FILE)) {
          const d = JSON.parse(fs.readFileSync(process.env.PER_FILE, "utf8"))
          const v = d?.record?.rows?.title?.val
          if (typeof v === "string") { process.stdout.write(v); process.exit(0); }
        }
        if (fs.existsSync(process.env.STORE)) {
          const d = JSON.parse(fs.readFileSync(process.env.STORE, "utf8"))
          const v = d?.tables?.sessions?.[process.env.SID]?.rows?.title?.val
          if (typeof v === "string") process.stdout.write(v)
        }
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
#
# 实测坑（2026-09-29 修）：原正则写作 `\[[0-9]{1,3}分?\]`，靠多字节量词「分?」表达"分字可选"。
# 在空 locale 下，`?` 会被挂到「分」的第二个字节上，模式实际退化为"**必须有**分"——
# 于是 `[新需013][75] 用量常显与修复` 这种**完全合规**的标题被判不合规，而 `[75分]` 反而通过。
# 修法：先用纯字符串运算把可选的「分」剥掉，再跑只含 ASCII 的正则，彻底不依赖多字节量词。
NORM_TITLE="$TITLE"
if [[ "$NORM_TITLE" == *"分]"* ]]; then
  NORM_TITLE="${NORM_TITLE//分]/]}"
fi
REASON=""
if [[ ! "$NORM_TITLE" =~ ^\[(新需|调研|优规|修漏|重构|巡检|测验|[RFDSOQ])[0-9]{3}\]\[[0-9]{1,3}\][[:space:]]+.+$ ]]; then
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
