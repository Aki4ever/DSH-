#!/usr/bin/env bash
set -uo pipefail

# ==============================================================================
# AI 执行流程管控 · 门禁内核 (AI Execution Control — Gate Kernel)
# ==============================================================================
# 定位：本脚本是"流程管控"的唯一状态源（真相源）。
#      所有进度都由磁盘实况推导，绝不采信模型自述，因此跨会话不会漂移。
#
# 四大基础必要性门禁（累积语义，必须按序全部通过方可进入实质执行）：
#   G1 项目初始化    仓库/骨架/防丢文件齐备
#   G2 工程结构化    目录有主、无孤儿目录、无散落垃圾
#   G3 需求文档同步  台账条目数、版本号与 Git 工作树对齐
#   G4 冗余检测      实质内容重复率与重复标题在健康区
#
# 用法：
#   ./scripts/control_gates.sh check              # 计算并输出看板（写 status.json）
#   ./scripts/control_gates.sh card               # 仅输出看板（自缓存，秒回）
#   ./scripts/control_gates.sh json               # 仅输出 status.json
#   ./scripts/control_gates.sh advance <门禁ID>   # 显式推进（须真实通过）
#   ./scripts/control_gates.sh reset              # 清空缓存强制重算
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/ai-control/config/gates.conf"
DSH_ROOT="${DSH_HOME:-$HOME/.dsh}"
STATE_DIR="${DSH_CONTROL_HOME:-$DSH_ROOT/.dsh-control}"
STATUS_JSON="$STATE_DIR/status.json"
CACHE_FILE="$STATE_DIR/cache.env"
REPORT_DIR="$PROJECT_ROOT/ai-control/reports"
mkdir -p "$STATE_DIR" "$REPORT_DIR"

# ── 可编辑阈值（seed 默认值）──────────────────────────────────────────────────
G3_LEDGER="docs/requirements.md"
G3_DIRTY_LIMIT=30
G4_SCAN_DIRS="rules knowledge indexes docs templates memory"
G4_EXCLUDE_GLOBS="docs/requirements.md"
G4_DUP_THRESHOLD=6
G4_DUP_BLOCK=15
G4_HEADING_LIMIT=12
G4_BLOCK_LIMIT=5
G4_MIN_LINE_LEN=12
G2_ORPHAN_MAX=0
G2_UNTITLED_MAX=2
G1_SKIP_DIRS=".git .dsh_locks ai-control"
if [ -f "$CONFIG_FILE" ]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi

# ── 门禁定义（顺序即依赖链）──────────────────────────────────────────────────
GATE_IDS=(init structure sync redundancy)
GATE_NAMES=("项目初始化" "工程结构化" "需求文档同步" "冗余检测")
GATE_DESC=(
  "仓库、目录骨架、防丢文件齐备"
  "目录有主、无孤儿目录与散落垃圾"
  "台账条目数与 Git 工作树对齐"
  "实质重复率与重复标题在健康区"
)

# ── 颜色（仅 TTY 且未禁用时启用）─────────────────────────────────────────────
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_OK=$'\033[32m'; C_WARN=$'\033[33m'; C_BAD=$'\033[31m'; C_DIM=$'\033[2m'; C_RST=$'\033[0m'
else
  C_OK=""; C_WARN=""; C_BAD=""; C_DIM=""; C_RST=""
fi

# 剥离 ANSI 后按"显示宽度"补空格（CJK/emoji 按 2 列粗估）
pad_to() { # $1=text(可含ANSI) $2=目标列宽
  local raw w pad cjk
  raw="$(printf '%s' "$1" | sed -E $'s/\033\\[[0-9;]*m//g')"
  w=${#raw}
  cjk=$(printf '%s' "$raw" | grep -oE '[一-鿿ぁ-ヿ！-｠　-〿＀-￯]' 2>/dev/null | wc -l | tr -d ' ')
  w=$(( w + cjk ))
  cjk=$(printf '%s' "$raw" | grep -oE '🎛|✅|⛔|⏸|🟢|🟡|🔴|📊|🧹' 2>/dev/null | wc -l | tr -d ' ')
  w=$(( w + cjk ))
  pad=$(( $2 - w ))
  (( pad < 0 )) && pad=0
  printf '%s%*s' "$1" "$pad" ''
}

progress_bar() { # $1=done $2=total $3=width
  local done="$1" total="$2" width="${3:-20}" filled=0 i out=""
  (( total <= 0 )) && total=1
  filled=$(( done * width / total ))
  for ((i=0; i<width; i++)); do
    if (( i < filled )); then out+="█"; else out+="░"; fi
  done
  printf '%s' "$out"
}

# 收集受扫 Markdown（应用排除表）
collect_files() {
  local d f base g skip
  FILES=()
  for d in $G4_SCAN_DIRS; do
    [ -d "$PROJECT_ROOT/$d" ] || continue
    while IFS= read -r f; do
      base="${f#"$PROJECT_ROOT"/}"
      skip=0
      for g in $G4_EXCLUDE_GLOBS; do
        case "$base" in $g) skip=1 ;; esac
      done
      (( skip == 0 )) && FILES+=("$f")
    done < <(find "$PROJECT_ROOT/$d" -name '*.md' 2>/dev/null | sort)
  done
}

# 提取实质内容行：去空白、剔纯符号/围栏、限定最小长度
substantive_lines() {
  local f
  for f in "${FILES[@]}"; do
    grep -E '\S' "$f" 2>/dev/null \
      | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' \
      | grep -vE '^[-=*#`>+|_[:space:]]+$' \
      | awk -v n="$G4_MIN_LINE_LEN" 'length($0)>=n'
  done
}

# ══════════════════════════════════════════════════════════════════════════════
# G1 · 项目初始化
# ══════════════════════════════════════════════════════════════════════════════
check_init() {
  local missing=() total=0 present=0 req
  local required=(
    ".git" "README.md" ".gitignore" ".gitattributes"
    "rules" "docs" "indexes" "knowledge" "memory" "templates" "scripts"
  )
  for req in "${required[@]}"; do
    total=$((total+1))
    if [ -e "$PROJECT_ROOT/$req" ]; then present=$((present+1)); else missing+=("$req"); fi
  done

  local dirs=0 withmarker=0 d b s skip missing_marker=()
  for d in "$PROJECT_ROOT"/*/; do
    [ -d "$d" ] || continue
    b="$(basename "$d")"
    skip=0
    for s in $G1_SKIP_DIRS; do [ "$b" = "$s" ] && skip=1; done
    (( skip == 1 )) && continue
    dirs=$((dirs+1))
    if [ -e "$d/.gitkeep" ] || [ -e "$d/README.md" ]; then
      withmarker=$((withmarker+1))
    else
      missing_marker+=("$b")
    fi
  done

  local pct=0 cover=0
  (( total > 0 )) && pct=$(( present * 100 / total ))
  (( dirs > 0 )) && cover=$(( withmarker * 100 / dirs ))

  DETAIL="骨架 $present/$total ($pct%) · 防丢覆盖 $withmarker/$dirs ($cover%)"
  METRIC_A="$present/$total"; METRIC_A_LABEL="骨架齐备"
  METRIC_B="$withmarker/$dirs"; METRIC_B_LABEL="防丢覆盖"

  (( pct < 100 )) && { HINT="缺失: ${missing[*]}"; return 1; }
  (( cover < 100 )) && { HINT="缺防丢标记: ${missing_marker[*]}"; return 1; }
  HINT="骨架与防丢文件齐备"
  return 0
}

# ══════════════════════════════════════════════════════════════════════════════
# G2 · 工程结构化
# ══════════════════════════════════════════════════════════════════════════════
check_structure() {
  local total=0 ok=0 detail_parts=()

  # 2.1 目录有主
  local d b s skip subdirs=$((0)) dirs=0 covered=0 orphans=()
  for d in "$PROJECT_ROOT"/*/; do
    [ -d "$d" ] || continue
    b="$(basename "$d")"
    skip=0
    for s in $G1_SKIP_DIRS; do [ "$b" = "$s" ] && skip=1; done
    (( skip == 1 )) && continue
    dirs=$((dirs+1))
    if [ -e "$d/README.md" ] || [ -e "$d/.gitkeep" ]; then
      covered=$((covered+1))
    else
      orphans+=("$b")
    fi
  done
  total=$((total+1)); (( covered == dirs )) && ok=$((ok+1))
  detail_parts+=("目录有主 $covered/$dirs")

  # 2.2 无散落垃圾文件
  local stray
  stray=$(find "$PROJECT_ROOT" -maxdepth 2 -type f \
            \( -name '.DS_Store' -o -name '*.tmp' -o -name '~$*' -o -name '*.swp' -o -name '*.bak' \) \
            -not -path '*/.git/*' 2>/dev/null | wc -l | tr -d ' ')
  total=$((total+1)); (( stray <= G2_ORPHAN_MAX )) && ok=$((ok+1))
  detail_parts+=("散落垃圾 $stray")

  # 2.3 无重复嵌套层级（rules/rules 这类）
  local nested=0 nd nb pb
  while IFS= read -r nd; do
    nb="$(basename "$nd")"; pb="$(basename "$(dirname "$nd")")"
    [ "$nb" = "$pb" ] && nested=$((nested+1))
  done < <(find "$PROJECT_ROOT" -mindepth 2 -maxdepth 3 -type d -not -path '*/.git/*' 2>/dev/null)
  total=$((total+1)); (( nested == 0 )) && ok=$((ok+1))
  detail_parts+=("重复层级 $nested")

  # 2.4 必备标准子目录
  local sdirs=("rules/system" "rules/workflow" "rules/coding" "rules/security")
  local sd hit=0
  for sd in "${sdirs[@]}"; do [ -d "$PROJECT_ROOT/$sd" ] && hit=$((hit+1)); done
  total=$((total+1)); (( hit == ${#sdirs[@]} )) && ok=$((ok+1))
  detail_parts+=("标准子目录 $hit/${#sdirs[@]}")

  # 2.5 无标题文件（空文件豁免）——真实检查，非恒真
  local md_total=0 untitled=0 f first
  while IFS= read -r f; do
    md_total=$((md_total+1))
    [ -s "$f" ] || continue
    first="$(grep -m1 -E '\S' "$f" 2>/dev/null || true)"
    case "$first" in
      '# '*) : ;;
      *) untitled=$((untitled+1)) ;;
    esac
  done < <(find "$PROJECT_ROOT" -name '*.md' -not -path '*/.git/*' 2>/dev/null)
  total=$((total+1)); (( untitled <= G2_UNTITLED_MAX )) && ok=$((ok+1))
  detail_parts+=("无标题 $untitled/$md_total")

  local pct=$(( ok * 100 / total ))
  DETAIL="$(IFS=' · '; echo "${detail_parts[*]}")"
  METRIC_A="$ok/$total"; METRIC_A_LABEL="合规项"
  METRIC_B="${#orphans[@]}"; METRIC_B_LABEL="孤儿目录"

  if (( pct < 100 )); then
    HINT="待修: 孤儿目录[${orphans[*]:-无}] 垃圾文件${stray} 重复层级${nested} 无标题${untitled}"
    return 1
  fi
  HINT="结构合规、无孤儿目录与散落垃圾"
  return 0
}

# ══════════════════════════════════════════════════════════════════════════════
# G3 · 需求文档同步
# ══════════════════════════════════════════════════════════════════════════════
check_sync() {
  local ledger="$PROJECT_ROOT/$G3_LEDGER"
  local total=0 ok=0

  total=$((total+1)); [ -f "$ledger" ] && ok=$((ok+1))

  # 注意：grep -c 可能返回 "008" 这类带前导零的值，bash 会误判为八进制，
  # 因此统一用 10# 强制十进制解析。
  local req_count=0 active=0 evolv=0 depre=0
  if [ -f "$ledger" ]; then
    req_count=$(( 10#$(grep -cE '^### REQ-[0-9]+' "$ledger" 2>/dev/null | tr -d ' ') ))
    active=$((  10#$(grep -c '\[ACTIVE\]' "$ledger" 2>/dev/null | tr -d ' ') ))
    evolv=$((   10#$(grep -c '\[EVOLVING\]' "$ledger" 2>/dev/null | tr -d ' ') ))
    depre=$((   10#$(grep -c '\[DEPRECATED\]' "$ledger" 2>/dev/null | tr -d ' ') ))
  fi
  total=$((total+1)); (( req_count > 0 )) && ok=$((ok+1))

  local ledger_ver="unknown"
  [ -f "$ledger" ] && ledger_ver=$(grep -m1 -oE 'v[0-9]+\.[0-9]+\.[0-9]+' "$ledger" 2>/dev/null || echo "unknown")
  total=$((total+1)); [ "$ledger_ver" != "unknown" ] && ok=$((ok+1))

  # 需求编号连续性（缺号 = 台账被手工删改）
  local gaps=0 nums expect=1 n ni
  if (( req_count > 0 )) && [ -f "$ledger" ]; then
    nums=$(grep -oE '^### REQ-[0-9]+' "$ledger" | grep -oE '[0-9]+' | sort -n)
    for n in $nums; do
      ni=$(( 10#$n ))          # "008" 必须按十进制解析
      (( ni != expect )) && gaps=$((gaps+1))
      expect=$((ni+1))
    done
  fi
  total=$((total+1)); (( gaps == 0 )) && ok=$((ok+1))

  local dirty=0 last_commit="无"
  if [ -d "$PROJECT_ROOT/.git" ]; then
    dirty=$(git -C "$PROJECT_ROOT" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    last_commit=$(git -C "$PROJECT_ROOT" log -1 --format='%h' 2>/dev/null || echo "无")
  fi
  dirty=${dirty:-0}
  total=$((total+1)); (( dirty <= G3_DIRTY_LIMIT )) && ok=$((ok+1))

  local pct=$(( ok * 100 / total ))
  DETAIL="条目 $req_count (A$active/E$evolv/D$depre) · 台账版本 $ledger_ver · 缺号 $gaps · 未提交 $dirty/$G3_DIRTY_LIMIT · HEAD $last_commit"
  METRIC_A="$req_count"; METRIC_A_LABEL="需求条目"
  METRIC_B="$dirty"; METRIC_B_LABEL="未提交变更"

  if (( pct < 100 )); then
    if (( dirty > G3_DIRTY_LIMIT )); then
      HINT="未提交变更 $dirty 超阈值 $G3_DIRTY_LIMIT，文档未同步入库"
    elif (( gaps > 0 )); then
      HINT="需求编号存在 $gaps 处缺号"
    else
      HINT="台账未对齐"
    fi
    return 1
  fi
  HINT="台账与工作树已对齐"
  return 0
}

# ══════════════════════════════════════════════════════════════════════════════
# G4 · 冗余检测
# ══════════════════════════════════════════════════════════════════════════════
# 定位 Node 运行时：优先用 DSH 自带，其次系统 PATH，最后常见安装位置。
find_node() {
  local cands=(
    "${DSH_NODE_BIN:-}"
    "/Volumes/DSH Desktop/DSH Desktop.app/Contents/Resources/runtime/node"
    "$(command -v node 2>/dev/null || true)"
    "/usr/local/bin/node"
    "/opt/homebrew/bin/node"
    "$HOME/.nvm/versions/node/$(ls -1 "$HOME/.nvm/versions/node" 2>/dev/null | tail -1)/bin/node"
  )
  local c
  for c in "${cands[@]}"; do
    [ -n "$c" ] && [ -x "$c" ] && { printf '%s' "$c"; return 0; }
  done
  return 1
}

check_redundancy() {
  collect_files
  local file_count=${#FILES[@]}
  local total=0 ok=0

  total=$((total+1)); (( file_count > 0 )) && ok=$((ok+1))

  # 4.1 真冗余：块级归一化 + 词级 Jaccard 相似度（由 Node 检测器完成）
  local dup_pairs=0 blocks=0 detector="ok"
  DUP_PAIRS_JSON="$REPORT_DIR/redundancy.json"
  if NODE_BIN="$(find_node)"; then
    if "$NODE_BIN" "$SCRIPT_DIR/redundancy_scan.mjs" --root "$PROJECT_ROOT" --json \
        > "$DUP_PAIRS_JSON" 2>/dev/null; then
      dup_pairs=$(grep -m1 '"duplicatePairs"' "$DUP_PAIRS_JSON" | grep -oE '[0-9]+')
      blocks=$(grep -m1 '"blocksScanned"' "$DUP_PAIRS_JSON" | grep -oE '[0-9]+')
      dup_pairs=${dup_pairs:-0}; blocks=${blocks:-0}
    else
      detector="检测器执行失败"; dup_pairs=-1
    fi
  else
    detector="未找到 Node 运行时"; dup_pairs=-1
  fi
  if (( dup_pairs < 0 )); then
    total=$((total+1))   # 无法检测时不计通过，避免"检测失效=通过"的危险默认
  else
    total=$((total+1)); (( dup_pairs <= G4_DUP_PAIRS )) && ok=$((ok+1))
  fi

  # 4.2 跨文件重复标题
  local dup_headings=0
  if (( file_count > 0 )); then
    dup_headings=$(grep -hE '^##[^#]' "${FILES[@]}" 2>/dev/null \
      | sed -E 's/^#+[[:space:]]*//; s/[[:space:]]+$//' \
      | sort | uniq -d | wc -l | tr -d ' ')
    dup_headings=${dup_headings:-0}
  fi
  total=$((total+1)); (( dup_headings <= G4_HEADING_LIMIT )) && ok=$((ok+1))

  # 4.3 单行最高重复次数（模板词汇容忍度高，仅作异常放大信号）
  local top_dup=0
  if (( file_count > 0 )); then
    top_dup=$(substantive_lines | sort | uniq -c | sort -rn | head -1 | awk '{print $1}')
    top_dup=${top_dup:-0}
  fi
  total=$((total+1)); (( top_dup <= G4_TOP_DUP_LIMIT )) && ok=$((ok+1))

  local pct=$(( ok * 100 / total ))
  if (( dup_pairs < 0 )); then
    DETAIL="检测器异常(${detector}) · 扫描 $file_count 文件 · 重复标题 $dup_headings · 单行最高 $top_dup 次"
  else
    DETAIL="扫描 $file_count 文件/$blocks 实质块 · 高相似对 $dup_pairs(限${G4_DUP_PAIRS}) · 重复标题 $dup_headings(限${G4_HEADING_LIMIT}) · 单行最高 $top_dup(限${G4_TOP_DUP_LIMIT})"
  fi
  METRIC_A="$dup_pairs"; METRIC_A_LABEL="高相似块对"
  METRIC_B="$dup_headings"; METRIC_B_LABEL="重复标题"

  if (( dup_pairs < 0 )); then
    HINT="冗余检测器不可用：${detector}（不允许以'检测失效'充当通过）"
    return 1
  fi
  (( pct < 100 )) && {
    HINT="冗余超标: 相似对${dup_pairs}(限${G4_DUP_PAIRS}) 重复标题${dup_headings}(限${G4_HEADING_LIMIT}) 单行最高${top_dup}(限${G4_TOP_DUP_LIMIT})"
    return 1
  }
  HINT="无实质冗余（已排除模板型台账与版本抬头）"
  return 0
}

# ══════════════════════════════════════════════════════════════════════════════
# 主流程
# ══════════════════════════════════════════════════════════════════════════════
compute_all() {
  RESULTS=(); DETAILS=(); HINTS=(); MA=(); MAL=(); MB=(); MBL=()
  local i rc
  for i in "${!GATE_IDS[@]}"; do
    DETAIL=""; HINT=""; METRIC_A="0"; METRIC_A_LABEL="-"; METRIC_B="0"; METRIC_B_LABEL="-"
    case "${GATE_IDS[$i]}" in
      init)       check_init;       rc=$? ;;
      structure)  check_structure;  rc=$? ;;
      sync)       check_sync;       rc=$? ;;
      redundancy) check_redundancy; rc=$? ;;
      *) rc=1 ;;
    esac
    case "$rc" in
      0) RESULTS+=("pass") ;;
      2) RESULTS+=("block") ;;
      *) RESULTS+=("pending") ;;
    esac
    DETAILS+=("$DETAIL"); HINTS+=("$HINT")
    MA+=("$METRIC_A"); MAL+=("$METRIC_A_LABEL"); MB+=("$METRIC_B"); MBL+=("$METRIC_B_LABEL")
  done

  FIRST_BLOCK=-1
  for i in "${!RESULTS[@]}"; do
    if [ "${RESULTS[$i]}" != "pass" ]; then FIRST_BLOCK=$i; break; fi
  done

  PASSED=0
  for r in "${RESULTS[@]}"; do [ "$r" = "pass" ] && PASSED=$((PASSED+1)); done
  TOTAL_GATES=${#GATE_IDS[@]}
  PCT=$(( PASSED * 100 / TOTAL_GATES ))

  if (( FIRST_BLOCK >= 0 )); then
    CURRENT_ID="${GATE_IDS[$FIRST_BLOCK]}"
    CURRENT_NAME="${GATE_NAMES[$FIRST_BLOCK]}"
    GATE_INDEX=$((FIRST_BLOCK+1))
    EXEC_ALLOWED="false"
  else
    CURRENT_ID="all-clear"; CURRENT_NAME="全部通过"
    GATE_INDEX=$TOTAL_GATES
    EXEC_ALLOWED="true"
  fi
}

json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

write_status() {
  local i now
  now="$(date '+%Y-%m-%d %H:%M:%S')"
  {
    printf '{\n'
    printf '  "version": 1,\n'
    printf '  "generatedAt": "%s",\n' "$now"
    printf '  "projectRoot": "%s",\n' "$(json_escape "$PROJECT_ROOT")"
    printf '  "gatePassed": %s,\n' "$PASSED"
    printf '  "gateTotal": %s,\n' "$TOTAL_GATES"
    printf '  "percent": %s,\n' "$PCT"
    printf '  "execAllowed": %s,\n' "$EXEC_ALLOWED"
    printf '  "currentGate": "%s",\n' "$CURRENT_ID"
    printf '  "currentGateName": "%s",\n' "$CURRENT_NAME"
    printf '  "gateIndex": %s,\n' "$GATE_INDEX"
    printf '  "gates": [\n'
    for i in "${!GATE_IDS[@]}"; do
      printf '    { "id": "%s", "name": "%s", "status": "%s", "detail": "%s", "hint": "%s", "metricA": "%s", "metricALabel": "%s", "metricB": "%s", "metricBLabel": "%s" }%s\n' \
        "${GATE_IDS[$i]}" "${GATE_NAMES[$i]}" "${RESULTS[$i]}" \
        "$(json_escape "${DETAILS[$i]}")" "$(json_escape "${HINTS[$i]}")" \
        "$(json_escape "${MA[$i]}")" "$(json_escape "${MAL[$i]}")" \
        "$(json_escape "${MB[$i]}")" "$(json_escape "${MBL[$i]}")" \
        "$( (( i < TOTAL_GATES-1 )) && printf ',' )"
    done
    printf '  ]\n}\n'
  } > "$STATUS_JSON.tmp" 2>/dev/null && mv -f "$STATUS_JSON.tmp" "$STATUS_JSON"
}

CACHE_TTL="${DSH_CONTROL_TTL:-30}"
cache_fresh() {
  [ -f "$CACHE_FILE" ] || return 1
  local ts now
  ts=$(stat -f %m "$CACHE_FILE" 2>/dev/null || stat -c %Y "$CACHE_FILE" 2>/dev/null || echo 0)
  now=$(date +%s)
  (( now - ts < CACHE_TTL ))
}

# ══════════════════════════════════════════════════════════════════════════════
# 看板渲染（Markdown：DSH GUI 原生渲染，无需依赖等宽字体对齐）
# ══════════════════════════════════════════════════════════════════════════════
load_from_status() {
  [ -f "$STATUS_JSON" ] || return 1
  PASSED=$(grep -m1 '"gatePassed"' "$STATUS_JSON" | grep -oE '[0-9]+')
  TOTAL_GATES=$(grep -m1 '"gateTotal"' "$STATUS_JSON" | grep -oE '[0-9]+')
  PCT=$(grep -m1 '"percent"' "$STATUS_JSON" | grep -oE '[0-9]+')
  EXEC_ALLOWED=$(grep -m1 '"execAllowed"' "$STATUS_JSON" | grep -oE 'true|false')
  CURRENT_NAME=$(grep -m1 '"currentGateName"' "$STATUS_JSON" | sed -E 's/.*: "([^"]*)".*/\1/')
  GATE_INDEX=$(grep -m1 '"gateIndex"' "$STATUS_JSON" | grep -oE '[0-9]+')
  GENERATED_AT=$(grep -m1 '"generatedAt"' "$STATUS_JSON" | sed -E 's/.*: "([^"]*)".*/\1/')
  pass_at=$(( GATE_INDEX - 1 ))
  RESULTS=(); DETAILS=(); HINTS=(); MA=(); MAL=(); MB=(); MBL=()
  local l cnt=0 raws
  while IFS= read -r l; do
    # 保留各门禁的"真实独立状态"（pass/pending/block），不因累积语义而篡改；
    # 累积只体现在 execAllowed 与 currentGate 上。
    raws=$(printf '%s' "$l" | sed -E 's/.*"status": "([^"]*)".*/\1/')
    RESULTS+=("$raws")
    DETAILS+=("$(printf '%s' "$l" | sed -E 's/.*"detail": "([^"]*)".*/\1/')")
    HINTS+=("$(printf '%s' "$l" | sed -E 's/.*"hint": "([^"]*)".*/\1/')")
    MA+=("$(printf '%s' "$l" | sed -E 's/.*"metricA": "([^"]*)".*/\1/')")
    MAL+=("$(printf '%s' "$l" | sed -E 's/.*"metricALabel": "([^"]*)".*/\1/')")
    MB+=("$(printf '%s' "$l" | sed -E 's/.*"metricB": "([^"]*)".*/\1/')")
    MBL+=("$(printf '%s' "$l" | sed -E 's/.*"metricBLabel": "([^"]*)".*/\1/')")
    cnt=$((cnt+1))
  done < <(grep -E '^    \{ "id"' "$STATUS_JSON")
  [ "$cnt" -gt 0 ] || return 1
  return 0
}

mark_of() {
  case "$1" in
    pass) printf '✅' ;;
    block) printf '⛔' ;;
    *) printf '⏸️' ;;
  esac
}
label_of() {
  case "$1" in
    pass) printf '通过' ;;
    block) printf '硬阻断' ;;
    *) printf '待前序' ;;
  esac
}

render_card() {
  local bar; bar=$(progress_bar "$PASSED" "$TOTAL_GATES" 20)
  printf '## 🎛️ AI 流程管控看板\n\n'
  printf '**`%s`  %s%%  ·  %s/%s 门禁通过**\n\n' "$bar" "$PCT" "$PASSED" "$TOTAL_GATES"
  if [ "$EXEC_ALLOWED" = "true" ]; then
    printf '> 🟢 **全部门禁通过** · 可进入实质执行\n\n'
  else
    printf '> 🔴 **当前卡点：G%s %s** · 未通过前禁止进入实质执行\n\n' "$GATE_INDEX" "$CURRENT_NAME"
  fi
  printf '| 门禁 | 状态 | 量化指标 |\n'
  printf '| :--- | :--- | :--- |\n'
  local i
  for i in "${!GATE_IDS[@]}"; do
    printf '| **G%d %s** | %s %s | %s %s · %s %s |\n' \
      "$((i+1))" "${GATE_NAMES[$i]}" "$(mark_of "${RESULTS[$i]}")" "$(label_of "${RESULTS[$i]}")" \
      "${MA[$i]}" "${MAL[$i]}" "${MB[$i]}" "${MBL[$i]}"
  done
  printf '\n<details><summary>逐项明细</summary>\n\n'
  for i in "${!GATE_IDS[@]}"; do
    printf -- '- **G%d %s** — %s\n' "$((i+1))" "${GATE_NAMES[$i]}" "$(label_of "${RESULTS[$i]}")"
    printf -- '  - 目标：%s\n' "${GATE_DESC[$i]}"
    printf -- '  - 实况：%s\n' "${DETAILS[$i]}"
    printf -- '  - 结论：%s\n' "${HINTS[$i]}"
  done
  printf '\n</details>\n\n'
  if [ "$EXEC_ALLOWED" != "true" ]; then
    printf '▶ **下一步**：完成【%s】，再运行 `./scripts/control_gates.sh check`\n' "$CURRENT_NAME"
  else
    printf '▶ 全部门禁通过，可进入实质执行。\n'
  fi
}

# 供 agent 每轮引用的极简一行（省 token，但保持常显）
render_badge() {
  local bar; bar=$(progress_bar "$PASSED" "$TOTAL_GATES" 10)
  local marks="" i
  for i in "${!GATE_IDS[@]}"; do marks+="$(mark_of "${RESULTS[$i]}")"; done
  printf '🎛️ 管控 %s %s%% (%s/%s) %s | 卡点:%s\n' \
    "$bar" "$PCT" "$PASSED" "$TOTAL_GATES" "$marks" "$CURRENT_NAME"
}

case "${1:-check}" in
  reset)
    rm -f "$CACHE_FILE" "$STATUS_JSON"
    echo "🧹 已清空管控进度缓存，下次 check 将强制重算。"
    exit 0
    ;;
  advance)
    TARGET="${2:-}"
    if [ -z "$TARGET" ]; then echo "❌ 用法: $0 advance <init|structure|sync|redundancy>"; exit 1; fi
    compute_all
    for i in "${!GATE_IDS[@]}"; do
      if [ "${GATE_IDS[$i]}" = "$TARGET" ]; then
        if [ "${RESULTS[$i]}" = "pass" ]; then
          write_status; touch "$CACHE_FILE"
          echo "✅ 门禁【${GATE_NAMES[$i]}】已真实通过，允许记账推进。"
          exit 0
        else
          echo "⛔ 拒绝推进：门禁【${GATE_NAMES[$i]}】实况为 ${RESULTS[$i]}，未达标不允许记账。"
          echo "   ${HINTS[$i]}"
          exit 1
        fi
      fi
    done
    echo "❌ 未知门禁 ID: $TARGET"; exit 1
    ;;
  card)
    if cache_fresh && load_from_status; then
      render_card
      exit 0
    fi
    compute_all; write_status; touch "$CACHE_FILE"; render_card
    exit 0
    ;;
  badge)
    if cache_fresh && load_from_status; then render_badge; exit 0; fi
    compute_all; write_status; touch "$CACHE_FILE"; render_badge
    exit 0
    ;;
  json)
    if [ -f "$STATUS_JSON" ]; then cat "$STATUS_JSON"; else compute_all; write_status; cat "$STATUS_JSON"; fi
    exit 0
    ;;
  check|*)
    compute_all; write_status; touch "$CACHE_FILE"; render_card
    {
      echo "# AI 流程管控快照"
      echo
      echo "- 生成时间：$(date '+%Y-%m-%d %H:%M:%S')"
      echo "- 项目根：\`$PROJECT_ROOT\`"
      echo "- 门禁进度：**$PASSED/$TOTAL_GATES（$PCT%）**"
      echo "- 可执行：$EXEC_ALLOWED"
      echo "- 当前卡点：$CURRENT_NAME"
      echo
      local i
      for i in "${!GATE_IDS[@]}"; do
        echo "## G$((i+1)) ${GATE_NAMES[$i]} — ${RESULTS[$i]}"
        echo "- 目标：${GATE_DESC[$i]}"
        echo "- 指标：${MA[$i]} ${MAL[$i]} / ${MB[$i]} ${MBL[$i]}"
        echo "- 明细：${DETAILS[$i]}"
        echo "- 结论：${HINTS[$i]}"
        echo
      done
    } > "$REPORT_DIR/latest_status.md" 2>/dev/null
    rm -f "$REPORT_DIR/.substantive.tmp"
    exit 0
    ;;
esac
