#!/usr/bin/env bash
# ==============================================================================
# 脚本名称：audit_execution.sh
# 角色归属：管控审计智能体 (Control Auditor)
# 功能描述：对当前任务的执行流程与合规性进行机器审计，输出 0~100 分量化打分与审计卡片
# 使用方式：./scripts/audit_execution.sh          # 输出 Markdown 交付卡片
#           ./scripts/audit_execution.sh --json   # 输出 JSON 数据
#           ./scripts/audit_execution.sh --exit   # 低于 80 分退出码为 1
# ==============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Node 运行时解析（REQ-087 R1 修复）：原先用裸 `node`，PATH 里没有时判定静默降级，
# 实测把本应 80/100 的审计误报成 36/100。统一走单一权威实现。
. "$SCRIPT_DIR/lib/find_node.sh"
NODE_BIN="$(find_node || true)"

JSON_MODE=0
EXIT_MODE=0

for arg in "$@"; do
  case "$arg" in
    --json) JSON_MODE=1 ;;
    --exit) EXIT_MODE=1 ;;
  esac
done

SCORE=100
DEDUCTIONS=()
CHECKS=()

# ── 维度 1：会话命名合规性 (20分) ──────────────────────────────────────────
# 为什么要有独立的 NAMING_PASS 布尔量：旧实现把"命名是否得分"写成 `SCORE -ge 75`
# 这种总分启发式，一旦别的维度扣分就会把命名判成未完成（**用总分反推单项**，
# 是典型的错误归因）。判定必须逐维度独立，才谈得上可回溯。
NAMING_PASS=0
NAMING_OUT="$(bash "$SCRIPT_DIR/check_task_naming.sh" 2>&1 || true)"
if bash "$SCRIPT_DIR/check_task_naming.sh" --exit >/dev/null 2>&1; then
  NAMING_PASS=1
  CHECKS+=("✅ 会话首动命名合规：已通过 R1~R7 校验 (+20)")
else
  SCORE=$((SCORE - 20))
  DEDUCTIONS+=("❌ 会话未完成合规命名或格式错误 (-20)")
  CHECKS+=("❌ 会话命名未通过：$NAMING_OUT (-20)")
fi

# ── 维度 2：开工门禁与底座健康度 (16分) ────────────────────────────────────
GATES_PASS=0
if [ -f "$ROOT/ai-control/config/gates.conf" ]; then
  if bash "$SCRIPT_DIR/control_gates.sh" check >/dev/null 2>&1; then
    GATES_PASS=1
    CHECKS+=("✅ 管控门禁全绿：G0~G4 全部通过 (+16)")
  fi
fi

if [ "$GATES_PASS" -eq 0 ]; then
  SCORE=$((SCORE - 16))
  DEDUCTIONS+=("❌ 管控门禁未全通过或未运行确认 (-16)")
  CHECKS+=("❌ 管控门禁异常：底层门禁存在卡点 (-16)")
fi

# ── 维度 3：冗余双检扫描 (12分) ────────────────────────────────────────────
REDUNDANCY_PASS=0
if [ -n "$NODE_BIN" ] && [ -f "$SCRIPT_DIR/redundancy_scan.mjs" ]; then
  if "$NODE_BIN" "$SCRIPT_DIR/redundancy_scan.mjs" --root "$ROOT" >/dev/null 2>&1; then
    REDUNDANCY_PASS=1
    CHECKS+=("✅ 冗余检测通过：高相似重复块对为 0 (+12)")
  fi
fi

if [ "$REDUNDANCY_PASS" -eq 0 ]; then
  SCORE=$((SCORE - 12))
  DEDUCTIONS+=("❌ 冗余检测未通过或存在实质重复代码/文档 (-12)")
  CHECKS+=("❌ 冗余检测异常 (-12)")
fi

# ── 维度 4：冲突双检扫描 (12分) ────────────────────────────────────────────
CONFLICT_PASS=0
if [ -n "$NODE_BIN" ] && [ -f "$SCRIPT_DIR/conflict_scan.mjs" ]; then
  if "$NODE_BIN" "$SCRIPT_DIR/conflict_scan.mjs" --root "$ROOT" >/dev/null 2>&1; then
    CONFLICT_PASS=1
    CHECKS+=("✅ 冲突排查通过：无事实矛盾、版本撕裂与死链 (+12)")
  fi
fi

if [ "$CONFLICT_PASS" -eq 0 ]; then
  SCORE=$((SCORE - 12))
  DEDUCTIONS+=("❌ 冲突检测未通过或存在事实矛盾 (-12)")
  CHECKS+=("❌ 冲突检测异常 (-12)")
fi

# ── 维度 5：存量校准与漏登记检测 (12分) ──────────────────────────────────
LEGACY_PASS=0
if [ -n "$NODE_BIN" ] && [ -f "$SCRIPT_DIR/legacy_align_scan.mjs" ]; then
  if "$NODE_BIN" "$SCRIPT_DIR/legacy_align_scan.mjs" --root "$ROOT" >/dev/null 2>&1; then
    LEGACY_PASS=1
    CHECKS+=("✅ 存量校准通过：遇碰即对齐清单清零 (+12)")
  fi
fi

if [ "$LEGACY_PASS" -eq 0 ]; then
  SCORE=$((SCORE - 12))
  DEDUCTIONS+=("❌ 存量校准未通过或存在遗留待对齐项 (-12)")
  CHECKS+=("❌ 存量校准异常 (-12)")
fi

# ── 维度 6：台账与版本双向强同步 (8分) ────────────────────────────────────
CURRENT_VERSION=$(grep -m1 '当前系统实施总版本' "$ROOT/docs/requirements.md" 2>/dev/null | grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+' || echo "最新")
SYNC_PASS=0
if [ -n "$NODE_BIN" ] && [ -f "$SCRIPT_DIR/sync_control_requirements.mjs" ]; then
  if "$NODE_BIN" "$SCRIPT_DIR/sync_control_requirements.mjs" >/dev/null 2>&1; then
    SYNC_PASS=1
    CHECKS+=("✅ 台账同步通过：全局台账与管控台账原子同步 (+8)")
  fi
fi

if [ "$SYNC_PASS" -eq 0 ]; then
  SCORE=$((SCORE - 8))
  DEDUCTIONS+=("❌ 台账未同步或版本号不一致 (-8)")
  CHECKS+=("❌ 台账同步异常 (-8)")
fi

# ── 维度 7：S07 待办常显硬门禁 (12分) ──────────────────────────────────────
# 为什么新增这一维：`task_execution_flow.md` 把"任务必须常显在输入框上方"列为防线 3，
# 但此前**全库没有任何客观判定**——六个维度全是文件与文档层面的检查，
# 没有一条能回答"这次执行到底有没有挂任务列表"。没有判定手段的口号不会被执行。
# 判据只有磁盘证据（scripts/lib/todo_tracker.mjs 落盘），绝不采信自述。
TODO_PASS=0
TODO_LINE="未运行判定"
if [ -f "$SCRIPT_DIR/todo_gate.sh" ]; then
  TODO_LINE="$(bash "$SCRIPT_DIR/todo_gate.sh" check 2>&1 | head -1 || true)"
  if bash "$SCRIPT_DIR/todo_gate.sh" check >/dev/null 2>&1; then
    TODO_PASS=1
    CHECKS+=("✅ 待办常显合规：本会话已挂载任务列表且存在进行中项 (+12)")
  fi
fi

if [ "$TODO_PASS" -eq 0 ]; then
  SCORE=$((SCORE - 12))
  DEDUCTIONS+=("❌ 未挂载任务列表或列表中没有进行中项 (-12)")
  CHECKS+=("❌ 待办常显未通过：${TODO_LINE} (-12)")
fi

# ── 维度 8：输出精简与文末五联装结构 (8分) ─────────────────────────────────
# 度量来源：拦截层订阅 `session/event` 得到的回复体量报告
# （scripts/lib/output_compactness.mjs → $DSH_HOME/.dsh-control/compact/<会话ID>.json）。
# 客观量只有两个：正文字符数与文末五联装标头是否齐备。
# 为什么"未采集"也要扣分：把缺失统一记为通过，等于给机制开了一个永久免检口。
# 代价是**本回合首次答复之前**这一维必扣 8 分——这是刻意的取舍：
# 宁可让分数诚实偏低，也不让"度量没跑起来"看起来像"输出很规范"。
COMPACT_PASS=0
COMPACT_LINE="未采集到回复度量报告"
COMPACT_JSON="null"

# ── 维度 8 前置：度量报告「离插件化」(REQ-089 R1-c，2026-10-01) ─────────────
# 为什么要有这一步：本维的度量报告原先**只有拦截层插件会写**，而拦截层至今未注册进宿主
# （install_host_gate.sh verify 报「条目存在 ⛔ 缺失」）→ 报告目录从未生成 →
# 本维**结构性恒扣 8 分**，与输出质量无关，是一条永远不可能通过的判定。
# 现改由 scripts/output_audit.mjs 从**宿主会话转录**取「最近一轮已完结的助手正文」，
# 用与插件完全同一套度量实现算分。取不到证据时该脚本退 2，本维照旧扣分——
# **绝不用"检测失效"充当通过**，只是把"没通电"换成"真读转录"。
COMPACT_SID="$(printf '%s' "${DSH_SESSION_ID:-global_session}" | tr -c 'a-zA-Z0-9_-' '_')"
COMPACT_FILE="${DSH_HOME:-$HOME/.dsh}/.dsh-control/compact/${COMPACT_SID}.json"
if [ -n "$NODE_BIN" ] && [ ! -f "$COMPACT_FILE" ]; then
  "$NODE_BIN" "$SCRIPT_DIR/output_audit.mjs" --refresh >/dev/null 2>&1 || true
fi

if [ -n "$NODE_BIN" ]; then
  COMPACT_OUT="$("$NODE_BIN" -e '
const { readFileSync, existsSync } = require("node:fs")
const { join } = require("node:path")
const home = process.env.DSH_HOME || join(process.env.HOME || "", ".dsh")
const sid = String(process.env.DSH_SESSION_ID || "global_session").replace(/[^a-zA-Z0-9_-]/g, "_")
const file = join(home, ".dsh-control", "compact", sid + ".json")
if (!existsSync(file)) { console.log(JSON.stringify({ ok:false, reason:"missing" })); process.exit(0) }
try {
  const r = JSON.parse(readFileSync(file, "utf8"))
  const age = Date.now() - Date.parse(r.measuredAt || 0)
  console.log(JSON.stringify({ ok: !!r.pass, stale: age > 600000, chars: r.chars, lines: r.lines, maxChars: r.maxChars, maxLines: r.maxLines, tailOk: r.tailOk, missingTail: r.missingTail || [] }))
} catch (e) { console.log(JSON.stringify({ ok:false, reason:"parse" })) }
' 2>/dev/null || echo '{"ok":false,"reason":"node_error"}')"
  COMPACT_JSON="$COMPACT_OUT"
  if echo "$COMPACT_OUT" | grep -q '"ok":true'; then
    COMPACT_PASS=1
    CHECKS+=("✅ 输出精简合规：体量与文末五联装结构均达标 (+8)")
  else
    COMPACT_LINE="$(echo "$COMPACT_OUT" | "$NODE_BIN" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const r=JSON.parse(s);process.stdout.write(r.reason==="missing"?"尚无回复度量报告（本会话首次答复前必然如此）":`${r.chars} 字/${r.lines} 行（限 ${r.maxChars}/${r.maxLines}）· 缺失标头 ${(r.missingTail||[]).join("/")||"无"}`)}catch{process.stdout.write("度量报告不可解析")}})')"
  fi
fi

if [ "$COMPACT_PASS" -eq 0 ]; then
  SCORE=$((SCORE - 8))
  DEDUCTIONS+=("❌ 输出精简未达标或未采集度量 (-8)")
  CHECKS+=("❌ 输出精简未通过：${COMPACT_LINE} (-8)")
fi

# 边界守卫：分数不低于 0
if (( SCORE < 0 )); then SCORE=0; fi

# 评级确定
RATING="🏆 完美履约"
GRADE="A+"
if (( SCORE == 100 )); then
  RATING="🏆 完美履约 (Perfect)"
  GRADE="A+"
elif (( SCORE >= 85 )); then
  RATING="🟢 合规达标 (Pass)"
  GRADE="A"
elif (( SCORE >= 60 )); then
  RATING="🟡 存在瑕疵 (Warning)"
  GRADE="B"
else
  RATING="🔴 违规驳回 (Rejected)"
  GRADE="F"
fi

if [ "$JSON_MODE" -eq 1 ]; then
  printf '{\n'
  printf '  "auditor": "Control Auditor",\n'
  printf '  "score": %d,\n' "$SCORE"
  printf '  "grade": "%s",\n' "$GRADE"
  printf '  "rating": "%s",\n' "$RATING"
  printf '  "namingPass": %s,\n' "$([ "$NAMING_PASS" -eq 1 ] && echo true || echo false)"
  printf '  "gatesPass": %s,\n' "$([ "$GATES_PASS" -eq 1 ] && echo true || echo false)"
  printf '  "redundancyPass": %s,\n' "$([ "$REDUNDANCY_PASS" -eq 1 ] && echo true || echo false)"
  printf '  "conflictPass": %s,\n' "$([ "$CONFLICT_PASS" -eq 1 ] && echo true || echo false)"
  printf '  "legacyPass": %s,\n' "$([ "$LEGACY_PASS" -eq 1 ] && echo true || echo false)"
  printf '  "syncPass": %s,\n' "$([ "$SYNC_PASS" -eq 1 ] && echo true || echo false)"
  printf '  "todoPass": %s,\n' "$([ "$TODO_PASS" -eq 1 ] && echo true || echo false)"
  printf '  "compactPass": %s,\n' "$([ "$COMPACT_PASS" -eq 1 ] && echo true || echo false)"
  printf '  "compact": %s\n' "$COMPACT_JSON"
  printf '}\n'
  exit 0
fi

# 输出标准【执行效果】卡片
echo "### 🌟 【执行效果】（管控审计智能体 Control Auditor 签发）"
echo ""
echo "- **审计智能体**：\`管控审计智能体 (Control Auditor)\`"
echo "- **综合执行评分**：**\`${SCORE} / 100 分\`** · **${RATING}** [${GRADE}]"
echo "- **执行合规度判定**：$([ "$SCORE" -ge 85 ] && echo "🟢 **准予归卷结项**" || echo "🔴 **整改阻断，禁止结项**")"
echo ""
echo "| 审计项 | 权重 | 实测事实与裁决 | 状态 |"
echo "| :--- | :---: | :--- | :---: |"
echo "| **1. 首动命名** | 20分 | $([ "$NAMING_PASS" -eq 1 ] && echo "完成首发改名，标题符合三段式规范" || echo "未执行合规改名") | $([ "$NAMING_PASS" -eq 1 ] && echo "✅ 满分" || echo "❌ 扣分") |"
echo "| **2. 开工门禁** | 16分 | $([ $GATES_PASS -eq 1 ] && echo "G0~G4 全部门禁 100% 绿灯通过" || echo "门禁存在未通过项") | $([ $GATES_PASS -eq 1 ] && echo "✅ 满分" || echo "❌ 扣分") |"
echo "| **3. 冗余扫描** | 12分 | $([ $REDUNDANCY_PASS -eq 1 ] && echo "无实质高相似代码/文档重复" || echo "存在高相似冗余块") | $([ $REDUNDANCY_PASS -eq 1 ] && echo "✅ 满分" || echo "❌ 扣分") |"
echo "| **4. 冲突排查** | 12分 | $([ $CONFLICT_PASS -eq 1 ] && echo "无事实矛盾与死链残留" || echo "存在事实冲突或死链") | $([ $CONFLICT_PASS -eq 1 ] && echo "✅ 满分" || echo "❌ 扣分") |"
echo "| **5. 存量校准** | 12分 | $([ $LEGACY_PASS -eq 1 ] && echo "遇碰即对齐清单清零" || echo "存在遗留存量待对齐项") | $([ $LEGACY_PASS -eq 1 ] && echo "✅ 满分" || echo "❌ 扣分") |"
echo "| **6. 台账同步** | 8分 | $([ $SYNC_PASS -eq 1 ] && echo "主台账与管控台账原子同步 ${CURRENT_VERSION}" || echo "台账或版本号撕裂") | $([ $SYNC_PASS -eq 1 ] && echo "✅ 满分" || echo "❌ 扣分") |"
echo "| **7. 待办常显** | 12分 | ${TODO_LINE} | $([ "$TODO_PASS" -eq 1 ] && echo "✅ 满分" || echo "❌ 扣分") |"
echo "| **8. 输出精简** | 8分 | ${COMPACT_LINE} | $([ "$COMPACT_PASS" -eq 1 ] && echo "✅ 满分" || echo "❌ 扣分") |"

if [ ${#DEDUCTIONS[@]} -gt 0 ]; then
  echo ""
  echo "⚠️ **扣分清单**："
  for item in "${DEDUCTIONS[@]}"; do
    echo "- ${item}"
  done
fi

if [ "$EXIT_MODE" -eq 1 ] && [ "$SCORE" -lt 85 ]; then
  exit 1
fi

exit 0
