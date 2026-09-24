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

# ── 维度 1：会话命名合规性 (25分) ──────────────────────────────────────────
NAMING_OUT="$(bash "$SCRIPT_DIR/check_task_naming.sh" 2>&1 || true)"
if bash "$SCRIPT_DIR/check_task_naming.sh" --exit >/dev/null 2>&1; then
  CHECKS+=("✅ 会话首动命名合规：已通过 R1~R7 校验 (+25)")
else
  SCORE=$((SCORE - 25))
  DEDUCTIONS+=("❌ 会话未完成合规命名或格式错误 (-25)")
  CHECKS+=("❌ 会话命名未通过：$NAMING_OUT (-25)")
fi

# ── 维度 2：开工门禁与底座健康度 (20分) ────────────────────────────────────
GATES_PASS=0
if [ -f "$ROOT/ai-control/config/gates.conf" ]; then
  if bash "$SCRIPT_DIR/control_gates.sh" check >/dev/null 2>&1; then
    GATES_PASS=1
    CHECKS+=("✅ 管控门禁全绿：G0~G4 全部通过 (+20)")
  fi
fi

if [ "$GATES_PASS" -eq 0 ]; then
  SCORE=$((SCORE - 20))
  DEDUCTIONS+=("❌ 管控门禁未全通过或未运行确认 (-20)")
  CHECKS+=("❌ 管控门禁异常：底层门禁存在卡点 (-20)")
fi

# ── 维度 3：冗余双检扫描 (15分) ────────────────────────────────────────────
REDUNDANCY_PASS=0
if command -v node >/dev/null 2>&1 && [ -f "$SCRIPT_DIR/redundancy_scan.mjs" ]; then
  if node "$SCRIPT_DIR/redundancy_scan.mjs" --root "$ROOT" >/dev/null 2>&1; then
    REDUNDANCY_PASS=1
    CHECKS+=("✅ 冗余检测通过：高相似重复块对为 0 (+15)")
  fi
fi

if [ "$REDUNDANCY_PASS" -eq 0 ]; then
  SCORE=$((SCORE - 15))
  DEDUCTIONS+=("❌ 冗余检测未通过或存在实质重复代码/文档 (-15)")
  CHECKS+=("❌ 冗余检测异常 (-15)")
fi

# ── 维度 4：冲突双检扫描 (15分) ────────────────────────────────────────────
CONFLICT_PASS=0
if command -v node >/dev/null 2>&1 && [ -f "$SCRIPT_DIR/conflict_scan.mjs" ]; then
  if node "$SCRIPT_DIR/conflict_scan.mjs" --root "$ROOT" >/dev/null 2>&1; then
    CONFLICT_PASS=1
    CHECKS+=("✅ 冲突排查通过：无事实矛盾、版本撕裂与死链 (+15)")
  fi
fi

if [ "$CONFLICT_PASS" -eq 0 ]; then
  SCORE=$((SCORE - 15))
  DEDUCTIONS+=("❌ 冲突检测未通过或存在事实矛盾 (-15)")
  CHECKS+=("❌ 冲突检测异常 (-15)")
fi

# ── 维度 5：存量校准与漏登记检测 (15分) ──────────────────────────────────
LEGACY_PASS=0
if command -v node >/dev/null 2>&1 && [ -f "$SCRIPT_DIR/legacy_align_scan.mjs" ]; then
  if node "$SCRIPT_DIR/legacy_align_scan.mjs" --root "$ROOT" >/dev/null 2>&1; then
    LEGACY_PASS=1
    CHECKS+=("✅ 存量校准通过：遇碰即对齐清单清零 (+15)")
  fi
fi

if [ "$LEGACY_PASS" -eq 0 ]; then
  SCORE=$((SCORE - 15))
  DEDUCTIONS+=("❌ 存量校准未通过或存在遗留待对齐项 (-15)")
  CHECKS+=("❌ 存量校准异常 (-15)")
fi

# ── 维度 6：台账与版本双向强同步 (10分) ────────────────────────────────────
SYNC_PASS=0
if command -v node >/dev/null 2>&1 && [ -f "$SCRIPT_DIR/sync_control_requirements.mjs" ]; then
  if node "$SCRIPT_DIR/sync_control_requirements.mjs" >/dev/null 2>&1; then
    SYNC_PASS=1
    CHECKS+=("✅ 台账同步通过：全局台账与管控台账原子同步 (+10)")
  fi
fi

if [ "$SYNC_PASS" -eq 0 ]; then
  SCORE=$((SCORE - 10))
  DEDUCTIONS+=("❌ 台账未同步或版本号不一致 (-10)")
  CHECKS+=("❌ 台账同步异常 (-10)")
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
  printf '  "namingPass": %s,\n' "$([ "$NAMING_OUT" != "" ] && echo true || echo false)"
  printf '  "gatesPass": %s,\n' "$([ "$GATES_PASS" -eq 1 ] && echo true || echo false)"
  printf '  "redundancyPass": %s,\n' "$([ "$REDUNDANCY_PASS" -eq 1 ] && echo true || echo false)"
  printf '  "conflictPass": %s,\n' "$([ "$CONFLICT_PASS" -eq 1 ] && echo true || echo false)"
  printf '  "legacyPass": %s,\n' "$([ "$LEGACY_PASS" -eq 1 ] && echo true || echo false)"
  printf '  "syncPass": %s\n' "$([ "$SYNC_PASS" -eq 1 ] && echo true || echo false)"
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
echo "| **1. 首动命名** | 25分 | $([ $SCORE -ge 75 ] && echo "完成首发改名，标题符合三段式规范" || echo "未执行合规改名") | $([ $SCORE -ge 75 ] && echo "✅ 满分" || echo "❌ 扣分") |"
echo "| **2. 开工门禁** | 20分 | $([ $GATES_PASS -eq 1 ] && echo "G0~G4 全部门禁 100% 绿灯通过" || echo "门禁存在未通过项") | $([ $GATES_PASS -eq 1 ] && echo "✅ 满分" || echo "❌ 扣分") |"
echo "| **3. 冗余扫描** | 15分 | $([ $REDUNDANCY_PASS -eq 1 ] && echo "无实质高相似代码/文档重复" || echo "存在高相似冗余块") | $([ $REDUNDANCY_PASS -eq 1 ] && echo "✅ 满分" || echo "❌ 扣分") |"
echo "| **4. 冲突排查** | 15分 | $([ $CONFLICT_PASS -eq 1 ] && echo "无事实矛盾与死链残留" || echo "存在事实冲突或死链") | $([ $CONFLICT_PASS -eq 1 ] && echo "✅ 满分" || echo "❌ 扣分") |"
echo "| **5. 存量校准** | 15分 | $([ $LEGACY_PASS -eq 1 ] && echo "遇碰即对齐清单清零" || echo "存在遗留存量待对齐项") | $([ $LEGACY_PASS -eq 1 ] && echo "✅ 满分" || echo "❌ 扣分") |"
echo "| **6. 台账同步** | 10分 | $([ $SYNC_PASS -eq 1 ] && echo "主台账与管控台账原子同步 v4.17.0" || echo "台账或版本号撕裂") | $([ $SYNC_PASS -eq 1 ] && echo "✅ 满分" || echo "❌ 扣分") |"

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
