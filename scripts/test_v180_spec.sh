#!/usr/bin/env bash
# ==============================================================================
# 测试脚本：test_v180_spec.sh
# 适用标准：遵循 rules/coding/testing_and_quality_gate.md 质量门禁协议
# 测试目标：对 v1.8.0 四大规范、三套模板、版本号同步及文档链接进行全自动断言
# ------------------------------------------------------------------------------
# ⚠️ 已退役（2026-09-22，REQ-045 存量审计）：本脚本不再作为质量门禁使用。
#   退役理由（实测）：26 项断言中 10 项长期失败 —— 断言把"元规则条号（第十六/十七条）"
#   与"工序编号"写死，而这些编号在 v1.8.0 之后已演进，于是测试与文档必然背离；
#   又因无人运行，失败状态长期无人知晓（"测试存在但形同废纸"）。
#   能力替代：其覆盖范围已由全库活体判定取代 ——
#     scripts/conflict_scan.mjs（版本/计数/指标/标识/死链）
#     scripts/legacy_align_scan.mjs（版本对齐/入口覆盖/指纹覆盖/台账留痕）
#     scripts/channel_audit.mjs（快速通道可点击与可命中）
#   保留原因：作为 v1.8.0 里程碑的历史留痕；如需复活，必须先改为"不写死编号"的断言。
# ==============================================================================

set -euo pipefail

PASS_COUNT=0
FAIL_COUNT=0

function assert_file_exists() {
  local file="$1"
  local desc="$2"
  if [[ -f "$file" && -s "$file" ]]; then
    echo "  [PASS] 文件存在且有效: $file ($desc)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  [FAIL] 文件不存在或为空: $file ($desc)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

function assert_content_contains() {
  local file="$1"
  local pattern="$2"
  local desc="$3"
  if grep -qF "$pattern" "$file"; then
    echo "  [PASS] 内容断言命中: $file 包含 '$pattern' ($desc)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  [FAIL] 内容断言缺失: $file 未找到 '$pattern' ($desc)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

echo "================================================================"
echo "🚀 启动 v1.8.0 自动化测试与质量门禁校验"
echo "================================================================"

# 1. 验证四大新增规范文件
echo "--- [Group 1: 核心规范文件校验] ---"
assert_file_exists "rules/workflow/risk_disclosure.md" "事前风险揭示规范"
assert_file_exists "rules/coding/testing_and_quality_gate.md" "事中自动化测试门禁规范"
assert_file_exists "rules/workflow/page_ledger_specification.md" "交付页面视觉台账规范"
assert_file_exists "rules/workflow/post_mortem_and_evolution.md" "事后复盘自迭代规范"

# 2. 验证三套新增模板文件
echo "--- [Group 2: 标准模板资产校验] ---"
assert_file_exists "templates/risk_assessment_template.md" "前置风险评估卡模板"
assert_file_exists "templates/page_ledger_template.md" "项目页面台账模板"
assert_file_exists "templates/post_mortem_template.md" "AAR复盘与流程进化模板"

# 3. 验证三位一体版本号强同步 (v1.8.0)
echo "--- [Group 3: 版本号强同步一致性校验] ---"
assert_content_contains "README.md" "v1.8.0" "README当前系统总版本"
assert_content_contains "docs/requirements.md" "v1.8.0" "需求台账当前实施总版本"
assert_content_contains "docs/requirements.md" "REQ-031" "需求台账REQ-031条目"
assert_content_contains "rules/workflow/versioning_standard.md" "v1.8.0" "版本标准里程碑"
assert_content_contains "indexes/rules_index.md" "v1.8.0" "规则全景总索引实施版本"
assert_content_contains "rules/workflow/risk_disclosure.md" "v1.8.0" "风险揭示文档版本"
assert_content_contains "rules/coding/testing_and_quality_gate.md" "v1.8.0" "测试门禁文档版本"
assert_content_contains "rules/workflow/page_ledger_specification.md" "v1.8.0" "页面台账文档版本"
assert_content_contains "rules/workflow/post_mortem_and_evolution.md" "v1.8.0" "复盘自迭代文档版本"

# 4. 验证元规则与流水线不可跳步工序
echo "--- [Group 4: 元规则与流水线融合校验] ---"
assert_content_contains "rules/system/meta_rules.md" "第十四条：前置风险揭示与防御律" "元规则第十四条"
assert_content_contains "rules/system/meta_rules.md" "第十五条：自动化测试与质量零缺陷门禁律" "元规则第十五条"
assert_content_contains "rules/system/meta_rules.md" "第十六条：页面视觉资产与台账化管控律" "元规则第十六条"
assert_content_contains "rules/system/meta_rules.md" "第十七条：任务复盘与系统自迭代进化律" "元规则第十七条"
assert_content_contains "rules/workflow/task_execution_flow.md" "S08" "流水线S08工序"
assert_content_contains "rules/workflow/task_execution_flow.md" "S12" "流水线S12工序"
assert_content_contains "rules/workflow/task_execution_flow.md" "S13" "流水线S13工序"
assert_content_contains "rules/workflow/task_execution_flow.md" "S16" "流水线S16工序"

# 5. 验证记忆库避坑条目沉淀
echo "--- [Group 5: 经验记忆库条目校验] ---"
assert_content_contains "memory/lessons_learned.md" "【交付闭环】自动化测试真实命令跑通与 100% 绿灯铁律" "经验条目7"
assert_content_contains "memory/lessons_learned.md" "【工程沉淀】页面视觉台账与前置风险揭示的双重防线" "经验条目8"

echo "================================================================"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo "📊 测试执行汇总: 总用例数: $TOTAL | 通过: $PASS_COUNT | 失败: $FAIL_COUNT"
if [[ $FAIL_COUNT -eq 0 ]]; then
  echo "✅ 质量门禁检测结果: [PASSED 100% 绿灯通过]"
  exit 0
else
  echo "❌ 质量门禁检测结果: [FAILED 存在未通过用例]"
  exit 1
fi
