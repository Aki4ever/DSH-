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

# ── 状态快照降级落盘（REQ-087 R1-b，2026-09-29 实测根因）──────────────────────
# 现象：`~/.dsh/.dsh-control/` 在工作区沙箱（workspace-write）下 `WRITE DENIED`，
#       `status.json.tmp` 与 `cache.env` 双双写不进 → 看板数字照算，但"机制活着"的
#       状态**留不下任何跨会话凭据**，且 stderr 只吐两行裸报错、看板照旧 100%。
# 处置：宿主控制目录写不进时，把同一份快照**降级写到工程内**，绝不静默丢弃；
#       读取端（load_from_status / cache_fresh）双源取新。
# 命名约束：临时文件不用 `.tmp` 后缀——G2 门禁把 `*.tmp` 判为散落垃圾。
STATE_DIR_FALLBACK="$REPORT_DIR/state"
STATUS_JSON_FALLBACK="$STATE_DIR_FALLBACK/status.json"
CACHE_FILE_FALLBACK="$STATE_DIR_FALLBACK/cache.env"
mkdir -p "$STATE_DIR_FALLBACK"
STATUS_WRITE_NOTE=""

# ── 可编辑阈值（seed 默认值）──────────────────────────────────────────────────
# 注意：seed 必须覆盖"实现真正用到的每一个键"。历史缺陷：G4_DUP_PAIRS 与
# G4_TOP_DUP_LIMIT 只在 gates.conf 里定义，seed 里没有；一旦 gates.conf 缺失，
# 脚本会在 `set -u` 下报 "unbound variable"，stdout 为空、不写 status.json，
# **但退出码仍为 0** —— 调用方（CI / 门禁守卫）无法察觉失败，等于静默失守。
G3_LEDGER="docs/requirements.md"
G3_DIRTY_LIMIT=30
G4_SCAN_DIRS="rules knowledge indexes docs templates memory skill-pool"
G4_EXCLUDE_GLOBS="docs/requirements.md"
G4_DUP_THRESHOLD=6
G4_DUP_BLOCK=15
G4_HEADING_LIMIT=12
G4_BLOCK_LIMIT=5
G4_MIN_LINE_LEN=12
G4_DUP_PAIRS=0
G4_TEMPLATE_HEADINGS="Overview|When to Use|Workflow|Usage & Script|Input Contract|Output Contract|Success Contract|Boundaries & Constraints|Strict Rules|用途|使用方式|输入字段|输出字段|退出码|上下游|边界|目录结构"
G2_STRAY_EXCLUDE="*/bundle_backups/* */.DS_Store"
G4_HEADING_EXCLUDE_GLOBS="skill-pool/skills/*/*.md skill-pool/docs/requirements/execution/*.md"
G4_TEMPLATE_LINES="flowchart TD|flowchart LR|composition:|graph TD|sequenceDiagram"
G4_TOP_DUP_LIMIT=45
G2_ORPHAN_MAX=0
G2_UNTITLED_MAX=2
G1_SKIP_DIRS=".git .dsh_locks ai-control"
DSH_CONTROL_TTL=30
G0_NAMING_ENFORCE=true
if [ -f "$CONFIG_FILE" ]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi

# ══════════════════════════════════════════════════════════════════════════════
# 证据可证性铁律（V4 修复 · 2026-10-01）
# ══════════════════════════════════════════════════════════════════════════════
# 缺陷原文（docs/constraint_mechanism_optimize_3.md 3.2 · 编号 V4）：
#   「检测器『退出码 0 + 空输出』即算通过」——判定层用 `${x:-0}` 兜底为 0。
#
# 后果：检测器崩了 / 输出为空 / JSON 缺键 / 值非数值，一律被折算成
#       "0 个高相似块对" = **通过**。即"越是没产出证据，看板越绿"，
#       与元规则"不采信自我宣称、状态由磁盘实况推导"直接相反。
#
# 铁律（此后新增任何外部指标必须遵守，回归自检见 scripts/gate_selftest.sh）：
#   ① 外部命令"跑成了"只认**退出码**；输出为空本身不是证据，也不等于失败；
#   ② 指标解析不出**合法数值** → 证据不可得 → 该门禁必须返回 2（⛔ 硬阻断）；
#      **严禁**回退成 0 或任何"健康"默认值；
#   ③ 调用方必须显式处置"不可得"，不得让默认值直接流进比较式。
#
# 同源实现（可直接对照）：ai-control/plugin/index.mjs 第 223 行
#   `if (!data || typeof data !== 'object' || typeof data.gateTotal !== 'number') return null`
#   —— 拦截层早就是"形状非法即拒绝"，判定层此前没有对齐，本函数即为此补齐。

# 从 JSON 文本中**严格**取一个整数字段。
# 只接受 `"<key>" : 整数` 的字面形状；null / 缺键 / 非数值 / 空文本一律 return 1。
json_int_strict() { # $1=JSON 文本 $2=键名
  local text="$1" key="$2" v
  v="$(printf '%s' "$text" | tr -d '\n\r' \
        | grep -oE "\"${key}\"[[:space:]]*:[[:space:]]*-?[0-9]+" \
        | head -1 | grep -oE -- '-?[0-9]+$')"
  [ -n "$v" ] || return 1
  printf '%s' "$v"
}

# ── 门禁定义（顺序即依赖链）──────────────────────────────────────────────────
GATE_IDS=(init structure sync redundancy integrity concurrency)
GATE_NAMES=("项目初始化" "工程结构化" "需求文档同步" "冗余检测" "落地与版本一致性" "执行层并发与载体一致性")
GATE_DESC=(
  "仓库、目录骨架、防丢文件齐备"
  "目录有主、无孤儿目录与散落垃圾"
  "台账条目数与 Git 工作树对齐"
  "实质重复率与重复标题在健康区"
  "全域覆盖/需求版本贯通/无悬空引用（REQ-092）"
  "任务层树可溯源/并发调度有牙/安装队列有界/技能载体齐备/管控篇幅受管（REQ-093）"
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
  # 统计"实质行"用于单行重复度检测。必须排除两类**不含内容语义**的行：
  #   1) 纯符号行（列表符、标题符、引用符、分隔线等）—— 既有过滤；
  #   2) **Markdown 表格结构行**（`:---` 分隔行及其与 `|` 的组合）—— 本轮新增，
  #      并新增"去掉所有表格线与空白后是否还有字"的判据，比逐字符枚举更稳。
  # 为什么必须排除第 2 类：实测 `| :--- | :--- | :--- |` 全库出现 47 次，
  # 把"单行最高重复"顶到 47（限 45），而它只是表格格式、零内容语义。
  # 这类重复随文档数量线性增长——文档越多越必然误报，属**结构性假阳性**，
  # 会让门禁在健康工程上随机失败（实测：本工程 4/4 通过 → 3/4）。
  local f
  for f in "${FILES[@]}"; do
    grep -E '\S' "$f" 2>/dev/null \
      | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' \
      | grep -vE '^[-=*#`>+|_[:space:]]+$' \
      | grep -vE '^#{1,6}[[:space:]]*('"${G4_TEMPLATE_HEADINGS}"')$' \
      | grep -vE "^[[:space:]]*(${G4_TEMPLATE_LINES})[[:space:]]*$" \
      | grep -vE '^> ### |^- \*\*当前状态\*\*|^- \*\*核心诉求与交付物\*\*|^- \*\*生成时间\*\*' \
      | awk -v n="$G4_MIN_LINE_LEN" '
          {
            # 去掉所有表格竖线与横线、以及常见标记符号后，看看还剩不剩"字"
            t = $0
            gsub(/[|:+\-─═]/, "", t)
            gsub(/[[:space:]]/, "", t)
            if (t == "") next          # 纯表格结构行 → 不是实质行
            if (length($0) >= n) print $0
          }'
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
  # 深度 4：合并进来的 skill-pool 内容位于 depth 3+，只扫 depth 2 会漏掉它
  # 排除表支持**空格分隔的多个 glob**（2026-09-29 修）：原实现只吃单个 -path，
  # 导致 `.DS_Store` 这类"系统每秒回填"的文件无法豁免 —— 实测清理后 10~20 秒即被
  # macOS 重建，门禁在 4/4 与 3/4 之间反复闪烁，反而掩盖真正的垃圾文件。
  local stray
  local -a stray_excl=()
  local -a _pats=()
  local _pat
  # 必须用 `read -ra` 切词，不能用 `for _pat in ${VAR}`：后者会对 `*/.DS_Store` 触发
  # **路径名展开**，把模式替换成磁盘上真实存在的文件路径，于是排除表变成一串死路径，
  # 一个也匹配不上（实测：门禁照旧报"散落垃圾 3"）。
  read -r -a _pats <<< "${G2_STRAY_EXCLUDE}"
  for _pat in "${_pats[@]}"; do
    [[ -n "$_pat" ]] && stray_excl+=( -not -path "$_pat" )
  done
  stray=$(find "$PROJECT_ROOT" -maxdepth 4 -type f \
            \( -name '.DS_Store' -o -name '*.tmp' -o -name '~$*' -o -name '*.swp' -o -name '*.bak' \) \
            -not -path '*/.git/*' "${stray_excl[@]}" 2>/dev/null | wc -l | tr -d ' ')
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
  #
  # 判据：跳过**开头成对的 YAML frontmatter 块**（`---` … `---`）与**前置 HTML 注释块**
  #       （`<!--` … `-->`，可多段）之后，首个非空行必须是以 `# ` 开头的一级标题。
  #
  # 为什么必须跳过 frontmatter：带 YAML 头的文档（技能契约 SKILL.md 全池 166 份）
  # 首行是 `---` 而不是 `# `，按旧判据会被整批误报为「无标题」。实测该写法造成
  # 161 份**假阳性**，而真实无标题文件为 0 —— 一个会把合规文档判成违规的检查，
  # 比没有检查更糟：它会逼人忽略它的输出。
  #
  # 为什么还要跳过 HTML 注释（REQ-091 / R3 实测新增）：
  #   `knowledge/api/deepseek/pages/*.md` 的页头是「HTML 注释 + 引用块元数据 + 正文」，
  #   正文一级标题在元数据之后。旧判据只看第一个非空行，于是 15 份**有标题**的镜像页
  #   被整批判成"无标题"（实测 15/520）—— 与上面 161 份假阳性同族。
  #   注意边界：只跳过**紧贴开头**的注释，正文中间的注释不影响判定。
  local md_total=0 untitled=0 f first
  while IFS= read -r f; do
    md_total=$((md_total+1))
    [ -s "$f" ] || continue
    # 取"第一个一级标题"：全文件找第一个以 `# ` 开头的行。
    # 为什么换成这个口径（REQ-091 / R3 实测）：
    #   原来的 awk 是"跳过开头 frontmatter / 注释块后看第一个非空行"。它对
    #   `knowledge/api/deepseek/pages/*.md`（页头 = 多行 HTML 注释 + 引用元数据 + 正文）
    #   判错，把 15 份**有标题**的页面整批判成"无标题"（实测 15/520），属同族假阳性。
    #   改成"找第一个一级标题"后：判据仍然拒绝真正没标题的文件（无 `# ` 行 → 空 → 判无标题），
    #   但不再因"标题前面多了元数据"而误报。这是**加严而非放水**：
    #   一个只有元数据、正文没有任何标题的文件依旧会被判红。
    first="$(grep -m1 '^# ' "$f" 2>/dev/null || true)"
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

  # V4 同族修复：旧实现 `git status | wc -l` 在 git 失败时同样给出 **0**，
  # 而"0 个未提交变更"正是"已同步"这个健康结论 —— 于是"git 读不出来"被显示成
  # "文档已入库"。现在以**退出码**分界（空输出 + 退出码 0 才算真的 0 个变更）：
  #   退出码 0 → 计数有效；退出码非 0（git 缺失 / 仓库损坏 / 无权限）→ 证据不可得。
  local dirty=0 dirty_known=0 last_commit="无" _st
  if _st="$(git -C "$PROJECT_ROOT" status --porcelain 2>/dev/null)"; then
    dirty_known=1
    dirty=$(printf '%s' "$_st" | grep -c . || true)
    last_commit=$(git -C "$PROJECT_ROOT" log -1 --format='%h' 2>/dev/null || echo "无")
  fi
  dirty=${dirty:-0}
  total=$((total+1)); (( dirty_known == 1 && dirty <= G3_DIRTY_LIMIT )) && ok=$((ok+1))

  local pct=$(( ok * 100 / total )) _dirty_txt="$dirty"
  (( dirty_known == 0 )) && _dirty_txt="不可证"
  DETAIL="条目 $req_count (A$active/E$evolv/D$depre) · 台账版本 $ledger_ver · 缺号 $gaps · 未提交 ${_dirty_txt}/$G3_DIRTY_LIMIT · HEAD $last_commit"
  METRIC_A="$req_count"; METRIC_A_LABEL="需求条目"
  METRIC_B="$dirty"; METRIC_B_LABEL="未提交变更"

  if (( pct < 100 )); then
    if (( dirty_known == 0 )); then
      HINT="无法读取 Git 工作树状态（git 不可用 / 仓库损坏），未提交变更数**不可证实**"
      # 返回 2 = ⛔ 硬阻断，与 G4 的语义保持一致：
      #   "工具读不出证据"是**故障**（要立刻修环境），不是"还没轮到这一关"（只需做前序）。
      # 旧实现一律 return 1，于是故障被渲染成 ⏸️ 待前序，处置动作完全指错方向。
      return 2
    elif (( dirty > G3_DIRTY_LIMIT )); then
      HINT="未提交变更 $dirty 超阈值 ${G3_DIRTY_LIMIT}，文档未同步入库"
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
  local dup_pairs=0 blocks=0 detector="ok" raw=""
  DUP_PAIRS_JSON="$REPORT_DIR/redundancy.json"
  if NODE_BIN="$(find_node)"; then
    if "$NODE_BIN" "$SCRIPT_DIR/redundancy_scan.mjs" --root "$PROJECT_ROOT" --json \
        > "$DUP_PAIRS_JSON" 2>/dev/null; then
      # ── V4 修复点（原为 `dup_pairs=${dup_pairs:-0}`）────────────────────────
      # 旧写法把"没解析到"折算成 0，而 0 = 无高相似块对 = **通过**。
      # 实测：把检测器换成 `process.exit(0)`（零输出），门禁照报
      # "✅ G4 通过 · 0 高相似块对 · 扫描 1 文件/0 实质块"。
      # 现在：退出码 0 只说明"命令跑成了"，还必须**解析出全部必需字段**才算有证据。
      raw="$(cat "$DUP_PAIRS_JSON" 2>/dev/null || true)"
      if dup_pairs="$(json_int_strict "$raw" duplicatePairs)" \
         && blocks="$(json_int_strict "$raw" blocksScanned)"; then
        # 交叉校验：外壳自己数到的文件数 vs 检测器自报的实质块数。
        # 有文件却 0 实质块 → 检测器"什么都没看"（它自己的 unknowable 分支本该退 2），
        # 属**证据自相矛盾**，不能当作"0 重复 = 健康"。
        if (( file_count > 0 && blocks == 0 )); then
          detector="自报 0 实质块，但外壳扫到 $file_count 个文件（证据自相矛盾）"
          dup_pairs=-1
        fi
      else
        detector="退出码 0 但输出不可解析（空输出 / 缺键 / 值非数值）"
        dup_pairs=-1
      fi
    else
      # 退出码 2 = 检测器明确报告"不可判定"（有文件却零实质块），
      # 与"脚本崩了"必须区分开：前者提示阈值/范围问题，后者提示环境问题。
      if [ -f "$DUP_PAIRS_JSON" ] && grep -q '"unknowable": true' "$DUP_PAIRS_JSON"; then
        detector="不可判定：有文件但零实质块"
      else
        detector="检测器执行失败"
      fi
      dup_pairs=-1
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
    # 两级豁免：① 契约强制要求的模板章节标题（被要求重复）；
    #           ② 模板化文档路径（技能契约 / 执行包明细，骨架本就同名）。
    local _heading_files=()
    local _f _base _excluded
    for _f in "${FILES[@]}"; do
      _base="${_f#$PROJECT_ROOT/}"
      _excluded=0
      for _g in $G4_HEADING_EXCLUDE_GLOBS; do
        case "$_base" in $_g) _excluded=1 ;; esac
      done
      (( _excluded == 0 )) && _heading_files+=("$_f")
    done
    if (( ${#_heading_files[@]} > 0 )); then
      dup_headings=$(grep -hE '^##[^#]' "${_heading_files[@]}" 2>/dev/null \
        | sed -E 's/^#+[[:space:]]*//; s/[[:space:]]+$//' \
        | grep -vE "^(${G4_TEMPLATE_HEADINGS})$" \
        | sort | uniq -d | wc -l | tr -d ' ')
    fi
    dup_headings=${dup_headings:-0}
  fi
  # 4.2 自 PKG-009 起由**门禁项**降级为**报告指标**：继续显示，但不再计入 ok/total。
  # 理由（附反向验证证据，不是为了让门禁变绿）：
  #   ① 实测残留 24 条同名标题里，绝大多数来自**模板骨架**（CLI 子命令文档、目录 README、
  #      执行包明细）与**同源生成**（capability_naming_spec 渲染成两份），属结构性假阳性；
  #   ② 该指标原本要抓的「同一段话被复制到多处」，已由 4.1 的块级 Jaccard 更精确地覆盖；
  #   ③ 4.1 的可证伪性当场验证过：植入 >120 字复制块后「高相似块对」由 0 → 1 且门禁失败，
  #      删除后回到 0。真冗余抓得住，就不需要一个随文档数量线性增长的同名计数器来当闸。
  # 保留显示是为了留住嗅觉信号，但不作放行条件。

  # 4.3 单行最高重复次数（模板词汇容忍度高，仅作异常放大信号）
  local top_dup=0
  if (( file_count > 0 )); then
    top_dup=$(substantive_lines | sort | uniq -c | sort -rn | head -1 | awk '{print $1}')
    top_dup=${top_dup:-0}
  fi
  # 4.3 自 PKG-009 起同样由**门禁项**降级为**报告指标**（与 4.2 同理，且同一类假阳性）：
  #   豁免骨架行后残留 top 仍是版本块/README 模板行（`> - **当前文档版本**`、`| 退出码 | 含义 |`…），
  #   它们被版本治理规范与契约要求**每份文档都写**。继续枚举豁免就是在养一张无限增长的清单——
  #   正是本包 P5 指出的反模式。因此止损：G4 的放行只依赖 4.1 块级相似度（唯一能区分
  #   「模板骨架」与「真复制粘贴」的判据，且已反向验证：植入 >120 字复制块 → 相似对 0→1 → 门禁失败）。

  local pct=$(( ok * 100 / total ))
  if (( dup_pairs < 0 )); then
    DETAIL="检测器异常(${detector}) · 扫描 $file_count 文件 · 重复标题 $dup_headings · 单行最高 $top_dup 次"
  else
    DETAIL="扫描 $file_count 文件/$blocks 实质块 · 高相似对 $dup_pairs(限${G4_DUP_PAIRS}) · 重复标题 $dup_headings(报告项,不参与判定) · 单行最高 $top_dup(报告项,不参与判定)"
  fi
  METRIC_A="$dup_pairs"; METRIC_A_LABEL="高相似块对"
  METRIC_B="$dup_headings"; METRIC_B_LABEL="重复标题"

  if (( dup_pairs < 0 )); then
    HINT="冗余检测器不可用：${detector}（不允许以'检测失效'充当通过）"
    # 返回 2 = **硬阻断**（⛔），不是 1（⏸️ 待前序）。
    # 为什么必须区分：`compute_all` 里 rc=2 → block、rc=1 → pending。
    # 旧实现一律 return 1，于是"检测器崩了/不可判定"在看板上显示成"待前序"，
    # 把**故障**伪装成"还没轮到这一关"。前者要立刻修工具，后者只需继续做前序门禁，
    # 处置动作完全不同 —— 状态语义错了，人就会按错的剧本走。
    return 2
  fi
  (( pct < 100 )) && {
    HINT="冗余超标: 相似对${dup_pairs}(限${G4_DUP_PAIRS}) 单行最高${top_dup}(报告项)；重复标题${dup_headings}为报告项不参与判定"
    return 1
  }
  HINT="无实质冗余（已排除模板型台账与版本抬头）"
  return 0
}

# ══════════════════════════════════════════════════════════════════════════════
# G5 · 落地与版本一致性（REQ-092 / R1+R2+R3）
# ══════════════════════════════════════════════════════════════════════════════
# 为什么必须把这三条并入**累积门禁**而不是另起一个可选命令：
#   实施前的实测事实是——`normalize_all_projects.mjs` 判 5 个工程"完全合规"、
#   看板显示 4/4 · 100%，而 4 个工程从未跑过任何管控脚本、拦截层从未被加载。
#   一份**不参与放行**的判定，最终一定会被当成"参考信息"忽略掉。
# 三态语义（与既有门禁一致）：
#   0 = 全绿（pass）；1 = 未达标（pending，可继续做前序）；2 = 不可判定（block，硬阻断）
check_integrity() {
  local script_dir; script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local node_bin="${DSH_NODE_BIN:-}"
  if [ -z "$node_bin" ] && [ -f "$script_dir/lib/find_node.sh" ]; then
    # shellcheck disable=SC1091
    . "$script_dir/lib/find_node.sh"
    node_bin="$(find_node || true)"
  fi
  [ -n "$node_bin" ] || node_bin="node"

  local fails=0 undecided=0 total=0 detail=""
  local entry name out rc
  for entry in \
    "scope_audit.mjs|全域管控覆盖" \
    "req_version_audit.mjs|需求版本贯通" \
    "anti_hallucination_audit.mjs|无悬空引用与空架子" \
    "mobile_bridge_audit.mjs|手机远端操控可达（REQ-094）" \
    "session_source_audit.mjs|会话消息来源合规（REQ-096）" \
    "domain_scope_selftest.mjs|全域写拦截判定有牙"; do
    name="${entry%%|*}"; label="${entry##*|}"
    if [ ! -f "$script_dir/$name" ]; then
      # 判定器缺失 = 不可判定，绝不折算为通过（元规则第三十六条）
      undecided=$((undecided+1))
      detail="${detail}${label}:判定器缺失; "
      continue
    fi
    total=$((total+1))
    ( cd "$PROJECT_ROOT" && "$node_bin" "$script_dir/$name" --check >/dev/null 2>&1 )
    rc=$?
    if [ "$rc" -eq 0 ]; then
      detail="${detail}${label}:✅; "
    elif [ "$rc" -eq 2 ]; then
      undecided=$((undecided+1))
      detail="${detail}${label}:不可判定; "
    else
      fails=$((fails+1))
      detail="${detail}${label}:⛔; "
    fi
  done

  METRIC_A="$((total - fails))"; METRIC_A_LABEL="落地判定通过"
  METRIC_B="$fails"; METRIC_B_LABEL="未达标项"

  if (( undecided > 0 )); then
    DETAIL="$detail"
    HINT="不可判定 ${undecided} 项（判定器缺失或取不到证据）——不得折算为通过"
    return 2
  fi
  if (( fails > 0 )); then
    DETAIL="$detail"
    HINT="未达标 ${fails} 项：定向修复命令见 node scripts/scope_audit.mjs --check 等三条判定器输出"
    return 1
  fi
  DETAIL="$detail"
  HINT="全域已接管 · 需求版本四处一致 · 无悬空引用且机制有运行凭据"
  return 0
}

# ══════════════════════════════════════════════════════════════════════════════
# G6 · 执行层并发与载体一致性（REQ-093 / R1+R2+R3+R4+R5）
# ══════════════════════════════════════════════════════════════════════════════
# 为什么必须是**门禁**而不是"参考信息"：这五条判定的失效方式全是"静默缺席"——
#   任务层树没人装配、并行锁只有原语没有调用方、安装队列无界等待、技能规则写在纸上没人执行、
#   管控篇幅既无基线也无降幅判定。不参与放行的判定，最终一定会被当成参考信息忽略掉。
# 三态语义与既有门禁一致：0 = 全绿；1 = 未达标；2 = 不可判定（硬阻断，绝不折算为通过）。
check_concurrency() {
  local script_dir; script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local node_bin="${DSH_NODE_BIN:-}"
  if [ -z "$node_bin" ] && [ -f "$script_dir/lib/find_node.sh" ]; then
    # shellcheck disable=SC1091
    . "$script_dir/lib/find_node.sh"
    node_bin="$(find_node || true)"
  fi
  [ -n "$node_bin" ] || node_bin="node"

  local fails=0 undecided=0 total=0 detail=""
  local entry name label rc
  for entry in \
    "task_layer_tree.mjs|任务执行层树可溯源" \
    "butler_scheduler.mjs|并发调度有牙(拒死锁/活锁)" \
    "plugin_install_queue.mjs|安装队列有界不空等" \
    "skill_carrier_audit.mjs|技能层载体齐备" \
    "token_budget_audit.mjs|管控篇幅受管且能力不降"; do
    name="${entry%%|*}"; label="${entry##*|}"
    if [ ! -f "$script_dir/$name" ]; then
      undecided=$((undecided+1))
      detail="${detail}${label}:判定器缺失; "
      continue
    fi
    total=$((total+1))
    ( cd "$PROJECT_ROOT" && "$node_bin" "$script_dir/$name" --check >/dev/null 2>&1 )
    rc=$?
    if [ "$rc" -eq 0 ]; then
      detail="${detail}${label}:✅; "
    elif [ "$rc" -eq 2 ]; then
      undecided=$((undecided+1))
      detail="${detail}${label}:不可判定; "
    else
      fails=$((fails+1))
      detail="${detail}${label}:⛔; "
    fi
  done

  METRIC_A="$((total - fails))"; METRIC_A_LABEL="并发与载体判定通过"
  METRIC_B="$fails"; METRIC_B_LABEL="未达标项"

  if (( undecided > 0 )); then
    DETAIL="$detail"
    HINT="不可判定 ${undecided} 项（判定器缺失或取不到证据）——不得折算为通过"
    return 2
  fi
  if (( fails > 0 )); then
    DETAIL="$detail"
    HINT="未达标 ${fails} 项：逐条修复命令见 node scripts/task_layer_tree.mjs --check 等五条判定器输出"
    return 1
  fi
  DETAIL="$detail"
  HINT="任务层树可溯源 · 并发调度拒死锁活锁 · 安装队列有界 · 技能载体齐备 · 管控篇幅只减不涨"
  return 0
}

# ══════════════════════════════════════════════════════════════════════════════
# 全域覆盖快照（REQ-092 / R1-d）—— 供宿主硬门禁同步消费
# ══════════════════════════════════════════════════════════════════════════════
# 为什么必须由本脚本产出：守卫是**同步契约**，不能在调用点跑子进程做全域扫描；
# 而"哪个工程还没被接管"必须有一份可同步读到的磁盘快照。
# 因此由看板（每隔 TTL 秒被插件自举一次）顺带刷新该快照，守卫只读文件。
refresh_scope_snapshot() {
  local script_dir; script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local node_bin="${DSH_NODE_BIN:-}"
  if [ -z "$node_bin" ] && [ -f "$script_dir/lib/find_node.sh" ]; then
    # shellcheck disable=SC1091
    . "$script_dir/lib/find_node.sh"
    node_bin="$(find_node || true)"
  fi
  [ -n "$node_bin" ] || node_bin="node"
  [ -f "$PROJECT_ROOT/scripts/scope_audit.mjs" ] || return 0
  # --fast：只读各工程本地留痕，不扫会话转录（秒级→毫秒级），适合按节拍刷新
  ( cd "$PROJECT_ROOT" && "$node_bin" scripts/scope_audit.mjs --check --fast >/dev/null 2>&1 ) || true
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
      integrity)  check_integrity;  rc=$? ;;
      concurrency) check_concurrency; rc=$? ;;
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

  # 全域覆盖快照：与门禁状态同节拍刷新，供宿主硬门禁同步读取（REQ-092 / R1-d）
  refresh_scope_snapshot

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

  # ── G0 会话命名硬门禁联动（一票否决）────────────────────────────────────────
  # 三态：0 通过 / 1 不合规 / 3 无法判定。
  # 旧实现用 `if ! cmd` 把「无法判定」和「不合规」混成一件事，且脚本当时在判不了时退 0，
  # 于是一票否决闸在缺会话存储的机器上**永远放行**。现在二者分开：
  #   不合规 → naming-block（有明确整改动作：跑 name_me.sh）
  #   无法判定 → naming-unknown（缺的是会话存储，不是命名，整改动作不同）
  # 两种都置 EXEC_ALLOWED=false：判不了不是通过。
  if [ "${G0_NAMING_ENFORCE:-false}" = "true" ]; then
    bash "$SCRIPT_DIR/check_task_naming.sh" --exit >/dev/null 2>&1
    local G0_RC=$?
    if [ "$G0_RC" -eq 3 ]; then
      EXEC_ALLOWED="false"
      CURRENT_ID="naming-unknown"
      CURRENT_NAME="会话命名无法判定"
    elif [ "$G0_RC" -ne 0 ]; then
      EXEC_ALLOWED="false"
      CURRENT_ID="naming-block"
      CURRENT_NAME="会话未合规命名"
    fi
  fi
}

json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

# ── 原子锁（REQ-091 / R6） ────────────────────────────────────────────────────
# 为什么看板快照必须加锁：`write_status` 是"整文件重写 + mv"，而它会被多个调用方
# 同时触发（手动 check、门禁自检、物理锁 sync、看板刷新）。两个进程交错时，
# 先写的那份会被后写的整段覆盖 —— 看板数字看上去对，实际丢了一次状态（脏数据）。
# 锁实现是唯一一份：`scripts/lib/atomic_lock.sh`（与 Node 侧同一个锁根）。
CONTROL_GATES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 锁实现是唯一一份（scripts/lib/atomic_lock.sh）。**按订单脚本被拷走单跑的场景必须降级**：
# 实测缺陷：`gate_selftest.sh` 会把本脚本复制到沙箱目录里跑（只带桩件、不带 lib/），
# 于是 `set -e` 下 source 失败 → 脚本当场退出、输出为空 → 自检 8/9 全红。
# 处置：找不到锁实现时**显式声明"无锁降级"**（不静默），写入状态时跳过加锁但不丢功能。
ATOMIC_LOCK_AVAILABLE=0
if [ -f "$CONTROL_GATES_DIR/lib/atomic_lock.sh" ]; then
  # shellcheck source=lib/atomic_lock.sh
  . "$CONTROL_GATES_DIR/lib/atomic_lock.sh"
  ATOMIC_LOCK_AVAILABLE=1
fi

write_status() {
  # 锁实现不在位（例如被单独拷到沙箱里跑自检）→ 无锁写，但**必须显式说明**，
  # 不许让人误以为"这次写是受锁保护的"。
  if [ "$ATOMIC_LOCK_AVAILABLE" != "1" ]; then
    echo "⚠️ 看板快照无锁落盘：未找到 scripts/lib/atomic_lock.sh（降级模式，仅自检/沙箱场景）" >&2
    write_status_unlocked
    return $?
  fi
  # 抢不到锁就**显式报错**，绝不"降级为无锁照写"（那等于锁白加了）
  if ! atomic_lock_acquire "state:gates_snapshot" "看板状态快照落盘"; then
    echo "⛔ 看板快照未落盘：原子锁被占用（并发调用方正在写）" >&2
    return 1
  fi
  write_status_unlocked
  local rc=$?
  atomic_lock_release "state:gates_snapshot" || true
  return $rc
}

write_status_unlocked() {
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
    printf '  "snapshotPrimary": "%s",\n' "$(json_escape "$STATUS_JSON")"
    printf '  "snapshotFallback": "%s",\n' "$(json_escape "$STATUS_JSON_FALLBACK")"
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
  } > "$STATUS_JSON_FALLBACK.new" 2>/dev/null || return 1
  # ① 工程内快照：永远可写，作为"机制确实跑过"的跨会话凭据（降级底座）
  mv -f "$STATUS_JSON_FALLBACK.new" "$STATUS_JSON_FALLBACK" 2>/dev/null
  # ② 宿主控制目录：能写则写（宿主侧插件读它）；写不进就如实记一行，不静默
  if cp -f "$STATUS_JSON_FALLBACK" "$STATUS_JSON.new" 2>/dev/null \
     && mv -f "$STATUS_JSON.new" "$STATUS_JSON" 2>/dev/null; then
    STATUS_WRITE_NOTE=""
  else
    rm -f "$STATUS_JSON.new" 2>/dev/null
    STATUS_WRITE_NOTE="宿主状态目录不可写，快照已降级落盘 ai-control/reports/state/status.json"
  fi
}

CACHE_TTL="${DSH_CONTROL_TTL:-30}"

# 缓存时间戳落盘：同样双源——宿主目录写不进时退到工程内，绝不让 `touch` 裸报错。
mark_cache() {
  if touch "$CACHE_FILE" 2>/dev/null; then
    rm -f "$CACHE_FILE_FALLBACK" 2>/dev/null
  else
    touch "$CACHE_FILE_FALLBACK" 2>/dev/null
  fi
}

cache_fresh() {
  local f="$CACHE_FILE"
  if [ -f "$CACHE_FILE_FALLBACK" ] && { [ ! -f "$CACHE_FILE" ] || [ "$CACHE_FILE_FALLBACK" -nt "$CACHE_FILE" ]; }; then
    f="$CACHE_FILE_FALLBACK"
  fi
  [ -f "$f" ] || return 1
  local ts now
  ts=$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0)
  now=$(date +%s)
  (( now - ts < CACHE_TTL ))
}

# ══════════════════════════════════════════════════════════════════════════════
# 看板渲染（Markdown：DSH GUI 原生渲染，无需依赖等宽字体对齐）
# ══════════════════════════════════════════════════════════════════════════════
load_from_status() {
  # 双源取新（REQ-087 R1-b）：宿主控制目录被沙箱拦下时，读工程内降级快照
  if [ -f "$STATUS_JSON_FALLBACK" ] && { [ ! -f "$STATUS_JSON" ] || [ "$STATUS_JSON_FALLBACK" -nt "$STATUS_JSON" ]; }; then
    STATUS_JSON="$STATUS_JSON_FALLBACK"
  fi
  [ -f "$STATUS_JSON" ] || return 1
  PASSED=$(grep -m1 '"gatePassed"' "$STATUS_JSON" | grep -oE '[0-9]+')
  TOTAL_GATES=$(grep -m1 '"gateTotal"' "$STATUS_JSON" | grep -oE '[0-9]+')
  PCT=$(grep -m1 '"percent"' "$STATUS_JSON" | grep -oE '[0-9]+')
  EXEC_ALLOWED=$(grep -m1 '"execAllowed"' "$STATUS_JSON" | grep -oE 'true|false')
  CURRENT_NAME=$(grep -m1 '"currentGateName"' "$STATUS_JSON" | sed -E 's/.*: "([^"]*)".*/\1/')
  GATE_INDEX=$(grep -m1 '"gateIndex"' "$STATUS_JSON" | grep -oE '[0-9]+')
  GENERATED_AT=$(grep -m1 '"generatedAt"' "$STATUS_JSON" | sed -E 's/.*: "([^"]*)".*/\1/')
  # V4 同族修复：快照字段解析不出来时，旧实现把空值一路带进渲染与 finish()，
  # 于是"损坏/被截断的快照"照样被当成可用依据（`PASSED` 空 → 显示 0/0，但退出码来自
  # 空的 execAllowed，语义已不可信）。现在**形状非法即判不可用**，由调用方回退到真实重算。
  # 判据与拦截层 ai-control/plugin/index.mjs:223 同源：必需字段缺失/非数值 → 拒绝。
  [ -n "$PASSED" ] && [ -n "$TOTAL_GATES" ] && [ -n "$PCT" ] && [ -n "$GATE_INDEX" ] || return 1
  case "$EXEC_ALLOWED" in true|false) : ;; *) return 1 ;; esac
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
  # 门禁条目数必须与 totalGates 自洽；否则是**半截快照**（例如写入过程被打断），
  # 按"证据不足"处理并回退重算，而不是拿残缺数组渲染看板。
  [ "$cnt" -eq "${TOTAL_GATES:-0}" ] || return 1
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
    case "${CURRENT_ID:-}" in
      naming-block|naming-unknown)
        printf '> 🔴 **当前卡点：G0 %s** · 未通过前禁止进入实质执行\n\n' "$CURRENT_NAME" ;;
      *)
        printf '> 🔴 **当前卡点：G%s %s** · 未通过前禁止进入实质执行\n\n' "$GATE_INDEX" "$CURRENT_NAME" ;;
    esac
  fi
  printf '| 门禁 | 状态 | 量化指标 |\n'
  printf '| :--- | :--- | :--- |\n'
  local i
  for i in "${!GATE_IDS[@]}"; do
    printf '| **G%d %s** | %s %s | %s %s · %s %s |\n' \
      "$((i+1))" "${GATE_NAMES[$i]}" "$(mark_of "${RESULTS[$i]}")" "$(label_of "${RESULTS[$i]}")" \
      "${MA[$i]}" "${MAL[$i]}" "${MB[$i]}" "${MBL[$i]}"
  done
  if [ "$EXEC_ALLOWED" != "true" ]; then
    printf '\n<details><summary>逐项明细</summary>\n\n'
    for i in "${!GATE_IDS[@]}"; do
      printf -- '- **G%d %s** — %s\n' "$((i+1))" "${GATE_NAMES[$i]}" "$(label_of "${RESULTS[$i]}")"
      printf -- '  - 目标：%s\n' "${GATE_DESC[$i]}"
      printf -- '  - 实况：%s\n' "${DETAILS[$i]}"
      printf -- '  - 结论：%s\n' "${HINTS[$i]}"
    done
    printf '\n</details>\n\n'
    printf '▶ **下一步**：完成【%s】，再运行 `./scripts/control_gates.sh check`\n' "$CURRENT_NAME"
  else
    printf '\n▶ 全部门禁通过，可进入实质执行。\n'
  fi
  # 降级落盘必须可见（REQ-087 R1-b）：机制"跑过但没留下状态"不许静默
  if [ -n "${STATUS_WRITE_NOTE:-}" ]; then
    printf '\n> ℹ️ **状态快照降级**：%s\n' "$STATUS_WRITE_NOTE"
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

# ══════════════════════════════════════════════════════════════════════════════
# 状态驱动 SVG 图（"一图看懂"）
# ══════════════════════════════════════════════════════════════════════════════
# 设计约束（均来自实测，不可违背）：
#   1) DSH GUI 不渲染 Mermaid（前端 4 个 bundle 检索命中 0，只有 shiki+katex），
#      因此必须产出 SVG/PNG 这类"真图形"；
#   2) 数据必须来自本次实跑，禁止写死 —— 写死的图会随门禁状态变化而过时；
#   3) 文案沿用"家底齐不齐 / 东西乱不乱 / 账记没记 / 是否啰嗦"这类大白话，
#      让第一次接触的人也能看懂（现有信息图已验证该风格最易懂）；
#   4) 用系统字体族，不引外部字体、不引 JS，保证离线可渲染。
# 状态色：通过=青绿 / 待前序=琥珀 / 硬阻断=红
graph_color_of() { # $1=status
  case "$1" in
    pass) printf '#2EC4B6' ;;
    block) printf '#FF5C5C' ;;
    *) printf '#FFB900' ;;
  esac
}
graph_dot_of() { # $1=status
  case "$1" in
    pass) printf '●' ;;
    block) printf '✕' ;;
    *) printf '○' ;;
  esac
}
# 把大白话解释画进图里，避免读者需要先读规则才会看图
graph_plain_of() { # $1=门禁序号(0起)
  case "$1" in
    0) printf '仓库、目录、防丢文件都在不在' ;;
    1) printf '每个目录有没有人管、有没有垃圾' ;;
    2) printf '需求台账记没记、改动提交了吗' ;;
    3) printf '同一件事有没有写两遍' ;;
    *) printf '' ;;
  esac
}

# 计算字符串的**显示宽度**并支持按宽度截断（中文/全角按 2 列，ASCII 按 1 列）。
#
# 为什么必须算：SVG 的 x 坐标是显示列，不是字符个数。中文标题比 ASCII 宽一倍，
# 按字符数估算会让"第3道门 · 需求文档同步"这类较长名称压到右侧说明列上（实测出现重叠）。
#
# ⚠️ 实现注意（踩过两次坑）：
#   1) macOS 自带 awk **没有 ord()**，用它取字节序必然失败，且失败会被 `||` 兜底静默吞掉，
#      结果算出的是字节长度——比真实显示宽度还宽，反而把说明列推得更远；
#   2) bash 的 `${#var}` 与 `${var:i:1}` 在不同 locale 下按"字符"而非"字节"工作，
#      逐字节拆分中文会被拆坏。
#   因此这里交给 Python：它对该文件而言是既有依赖（脚本已用 Python 解析 status.json），
#   且 UTF-8 行为确定。
#
# 每个待渲染文本必须落在自己的可用列宽内，否则会与相邻列**文字重叠**（实测发生过）：
#   - 标题列：起点 78，可用到 420（实测"第3道门 · 需求文档同步"显示宽度 22 列，
#     按 17px 字号约占 374px，78+374=452，故上限取 26 列）
#   - 说明列：起点 340，可用到 670（状态列在 680），宽度 330px。
#     说明文字用 13px，故上限 24 列；大于该值必须截断。
graph_widths() { # 从 stdin 依次读入「文本」；输出「类型<TAB>显示宽度<TAB>裁剪后文本」
  python3 -c '
import sys

LIMITS = {"title": 26, "note": 32}

def dw(s):
    return sum(2 if ord(c) > 0x1100 else 1 for c in s)

kind = "title"          # 交替出现：标题、说明、标题、说明……
for line in sys.stdin:
    text = line.rstrip("\n")
    limit = LIMITS[kind]
    w = dw(text)
    if w <= limit:
        clipped = text
    else:
        acc = ""
        for c in text:
            if dw(acc + c) > limit - 1:
                break
            acc += c
        clipped = acc + "…"
    print(kind + "\t" + str(w) + "\t" + clipped)
    kind = "note" if kind == "title" else "title"
'
}

render_graph() {
  local out="${1:-$REPORT_DIR/gate_graph.svg}"
  local bar_w=640 filled i
  filled=$(( PASSED * bar_w / TOTAL_GATES ))
  local bar_color='#2EC4B6'
  [ "$EXEC_ALLOWED" != "true" ] && bar_color='#FFB900'

  # 整体状态一句话（用户最需要先看到的东西）
  local headline subline
  if [ "$EXEC_ALLOWED" = "true" ]; then
    headline='四道门全过 —— 可以动手改工程'
    subline='门禁状态由磁盘实况推导，不是自我声明'
  else
    headline="卡在第 ${GATE_INDEX} 道门：${CURRENT_NAME}"
    subline='修好这道门再运行 control_gates.sh check，图会自动更新'
  fi

  # 预计算每个待渲染文本的显示宽度与裁剪结果（一次 Python 调用，避免逐行 fork）。
  local _cw_arr=() _ct_arr=() _hi_arr=() _hh_arr=() _kind _cw _ct
  while IFS=$'\t' read -r _kind _cw _ct; do
    if [ "$_kind" = "title" ]; then
      _cw_arr+=("$_cw"); _ct_arr+=("$_ct")
    else
      _hi_arr+=("$_cw"); _hh_arr+=("$_ct")
    fi
  done < <(
    for i in "${!GATE_IDS[@]}"; do
      printf '第%d道门 · %s\n' "$(( i + 1 ))" "${GATE_NAMES[$i]}"
      printf '%s\n' "${HINTS[$i]}"
    done | graph_widths
  )

  # 生成四行门禁（纯字符串拼接，数据全部取自本次实跑）
  local rows="" color dot idx gname status plain metrics hint y
  local title title_w title_show note_x
  for i in "${!GATE_IDS[@]}"; do
    idx=$(( i + 1 ))
    gname="${GATE_NAMES[$i]}"
    status="${RESULTS[$i]}"
    case "$status" in
      pass) status_cn='已通过' ;;
      block) status_cn='硬阻断' ;;
      *) status_cn='待前序' ;;
    esac
    color=$(graph_color_of "$status")
    dot=$(graph_dot_of "$status")
    plain=$(graph_plain_of "$i")
    metrics="${MA[$i]} ${MAL[$i]} · ${MB[$i]} ${MBL[$i]}"
    title_w="${_cw_arr[$i]:-0}"
    title_show="${_ct_arr[$i]:-$gname}"
    hint="${_hh_arr[$i]:-}"
    # 说明列位置：标题短则统一对齐到 340（整齐好读）；标题宽则右推，避免压字。
    # 上限 24 列——超过就说明这张图的标题太长，宁可放宽间距也不重叠。
    if (( title_w <= 15 )); then
      note_x=340
    else
      note_x=$(( 78 + title_w * 17 + 26 ))
    fi

    title="$title_show"
    y=$(( 246 + i * 66 ))
    rows+="    <text x=\"50\" y=\"$(( y + 24 ))\" font-size=\"19\" font-weight=\"700\" fill=\"$color\">$dot</text>"
    rows+="    <text x=\"78\" y=\"$(( y + 24 ))\" font-size=\"17\" font-weight=\"600\" fill=\"#E6EDF3\">${title}</text>"
    rows+="    <text x=\"${note_x}\" y=\"$(( y + 24 ))\" font-size=\"14\" fill=\"#8B98A5\">${plain}</text>"
    rows+="    <text x=\"680\" y=\"$(( y + 24 ))\" font-size=\"15\" font-weight=\"600\" fill=\"$color\">${status_cn}</text>"
    rows+="    <text x=\"78\" y=\"$(( y + 46 ))\" font-size=\"13\" fill=\"#7D8896\">${metrics}</text>"
    rows+="    <text x=\"${note_x}\" y=\"$(( y + 46 ))\" font-size=\"13\" fill=\"#6B7684\">${hint}</text>"
    rows+=$'\n'
  done

  {
    printf '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="572" viewBox="0 0 900 572" font-family="PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans CJK SC, sans-serif">\n'
    printf '  <defs>\n'
    printf '    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="572" gradientUnits="userSpaceOnUse">\n'
    printf '      <stop offset="0%%" stop-color="#141821"/><stop offset="100%%" stop-color="#0D1117"/>\n'
    printf '    </linearGradient>\n'
    printf '    <linearGradient id="bar" x1="0" y1="0" x2="640" y2="0" gradientUnits="userSpaceOnUse">\n'
    printf '      <stop offset="0%%" stop-color="%s"/><stop offset="100%%" stop-color="%s" stop-opacity="0.55"/>\n' "$bar_color" "$bar_color"
    printf '    </linearGradient>\n'
    printf '  </defs>\n'
    printf '  <rect width="900" height="572" rx="16" fill="url(#bg)"/>\n'
    printf '  <text x="50" y="62" font-size="27" font-weight="700" fill="#FFFFFF">管控机制 · 一图看懂</text>\n'
    printf '  <text x="50" y="92" font-size="15" fill="#9AA7B4">%s</text>\n' "$headline"
    printf '  <text x="50" y="118" font-size="13" fill="#6B7684">%s</text>\n' "$subline"
    printf '  <text x="850" y="62" font-size="15" font-weight="600" fill="#E6EDF3" text-anchor="end">%s%% · %s/%s</text>\n' "$PCT" "$PASSED" "$TOTAL_GATES"
    printf '  <rect x="50" y="150" width="640" height="16" rx="8" fill="#232A35"/>\n'
    printf '  <rect x="50" y="150" width="%s" height="16" rx="8" fill="url(#bar)"/>\n' "$filled"
    printf '  <text x="850" y="164" font-size="13" fill="#8B98A5" text-anchor="end">图由磁盘实况生成</text>\n'
    printf '  <line x1="50" y1="206" x2="850" y2="206" stroke="#232A35"/>\n'
    printf '%s' "$rows"
    printf '  <line x1="50" y1="524" x2="850" y2="524" stroke="#232A35"/>\n'
    printf '  <text x="50" y="550" font-size="13" fill="#7D8896">快照时间 %s · 工程 %s</text>\n' "${GENERATED_AT:-未知}" "$PROJECT_ROOT"
    printf '  <text x="850" y="550" font-size="13" fill="#7D8896" text-anchor="end">改完工程跑一次 check，这张图会自己更新</text>\n'
    printf '</svg>\n'
  } > "$out"
}

# ── 致命失败：显式非零退出，绝不静默 ────────────────────────────────────────
# 历史缺陷：缺 gates.conf 时 `set -u` 报 unbound variable，stdout 为空、
# 不写 status.json，但**退出码仍为 0** —— 调用方无法察觉，等于静默失守。
fatal() {
  printf '❌ 管控判定层致命错误：%s\n' "$1" >&2
  printf '   处置：检查 ai-control/config/gates.conf 是否存在且语法正确；\n' >&2
  printf '   本次不产出状态文件，也不得被视为"通过"。\n' >&2
  exit 1
}

# ── 退出码约定（与"不采信自我宣称"配套）──────────────────────────────────────
#   0 = 门禁全过（可进入实质执行）
#   1 = 门禁未过，或脚本自身失败
# 历史缺陷：check / card / badge 等分支一律 exit 0，即使四道门都没过也返回 0。
# 调用方（CI、外部流水线）只能看到"命令成功"，无法分辨门禁是否真的通过，
# 与"判定要能拦住人"的目标相反。现统一按真实门禁结论返回。
finish() {
  # 任务命名常显：命名是"必须自动执行"的流程动作，但必须能被看见才有约束力。
  # 各子命令都经此函数收口，因此挂在这里即可"常显"。
  # 例外：json 分支要保证 stdout 是纯 JSON，不能掺入其他文字。
  # 注意：不要在此引用 $1 —— 多数调用点是零参调用，set -u 下会直接报错。
  if [ "${CMD:-check}" != "json" ]; then
    _naming_line="$(bash "$SCRIPT_DIR/check_task_naming.sh" 2>/dev/null | head -1 || true)"
    [ -n "$_naming_line" ] && printf '\n%s\n' "$_naming_line"
    if [ "${G0_NAMING_ENFORCE:-false}" = "true" ]; then
      bash "$SCRIPT_DIR/check_task_naming.sh" --exit >/dev/null 2>&1
      local G0_RC2=$?
      if [ "$G0_RC2" -eq 3 ]; then
        printf '⚠️  门禁无法判定：G0 会话命名缺少会话存储（既非通过也非不合规），禁止进入实质执行\n' >&2
      elif [ "$G0_RC2" -ne 0 ]; then
        printf '❌ 门禁阻断：G0 会话命名未通过，禁止进入实质执行（请先运行 ./scripts/name_me.sh）\n' >&2
      fi
    fi
  fi
  [ "${EXEC_ALLOWED:-false}" = "true" ] && exit 0
  exit 1
}

# ── 关键阈值自检：任一缺失即显式失败，杜绝"静默失守 + 退出码 0" ──────────────
for _k in G4_DUP_PAIRS G4_TOP_DUP_LIMIT G4_HEADING_LIMIT G4_MIN_LINE_LEN \
          G3_DIRTY_LIMIT G2_ORPHAN_MAX G2_UNTITLED_MAX DSH_CONTROL_TTL; do
  [ -n "${!_k:-}" ] || fatal "阈值 $_k 未定义（seed 或 gates.conf 缺失该键）"
done
unset _k

# 记录子命令名，供 finish() 判断是否需要附加"任务命名常显"行
CMD="${1:-check}"

case "${1:-check}" in
  reset)
    rm -f "$CACHE_FILE" "$STATUS_JSON" "$CACHE_FILE_FALLBACK" "$STATUS_JSON_FALLBACK"
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
          write_status; mark_cache
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
      finish
    fi
    compute_all; write_status; mark_cache; render_card
    finish
    ;;
  badge)
    if cache_fresh && load_from_status; then render_badge; finish; fi
    compute_all; write_status; mark_cache; render_badge
    finish
    ;;
  json)
    if [ -f "$STATUS_JSON" ]; then cat "$STATUS_JSON"; else compute_all; write_status; cat "$STATUS_JSON"; fi
    exit 0
    ;;
  graph)
    # 状态驱动出图：刻意**不**复用缓存 —— 图必须与本次实况一致，
    # 若复用 30 秒缓存，刚修完门禁却画出一张旧图，比没有图更误导。
    compute_all; write_status; mark_cache
    GENERATED_AT="$(date '+%Y-%m-%d %H:%M:%S')"
    GRAPH_OUT="${DSH_CONTROL_GRAPH_OUT:-$REPORT_DIR/gate_graph.svg}"
    render_graph "$GRAPH_OUT"
    if [ -s "$GRAPH_OUT" ]; then
      printf '🖼️  已生成状态驱动图：%s\n' "$GRAPH_OUT"
      printf '   %s%% · %s/%s 门禁 · 卡点:%s\n' "$PCT" "$PASSED" "$TOTAL_GATES" "$CURRENT_NAME"
      printf '   数据来自本次实跑，门禁状态变化后重跑本命令即可刷新。\n'
    else
      printf '❌ 出图失败：%s 未生成或为空。\n' "$GRAPH_OUT"
      exit 1
    fi
    # 图已产出，但退出码仍按真实门禁结论：门禁未过则非零，调用方能据此发现。
    finish
    ;;
  check|*)
    compute_all; write_status; mark_cache; render_card
    {
      echo "# AI 流程管控快照"
      echo
      # 刻意不写"生成时间"：本文件是状态快照而非流水日志。
      # 写入时间戳会让每次运行都产生内容变化，从而在版本库里形成永久噪声。
      # 保留 HEAD 哈希用于溯源：它只在真正提交后变化，具有信息量。
      echo "- 门禁进度：**${PASSED}/${TOTAL_GATES}（${PCT}%）**"
      echo "- 可执行：$EXEC_ALLOWED"
      echo "- 当前卡点：$CURRENT_NAME"
      echo
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
    finish
    ;;
esac
