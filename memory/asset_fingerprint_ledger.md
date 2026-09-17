# 全域资产数字指纹与新鲜度审计台账 (Asset Fingerprint Ledger)

> ### 🏷️ **版本信息与实施追踪**
> - **当前台账版本**：`v2.4.0`
> - **基线对齐版本**：`v2.4.0`
> - **最后全盘扫描时间**：2026-09-17 17:23
> - **自动化引擎**：遵循 [`scripts/fingerprint_audit.sh`](../scripts/fingerprint_audit.sh)

本文档记录工程全域受管资产（规则、知识库、架构索引、工程模板、自动化脚本与需求台账）的**数字指纹（SHA-256 8位短哈希）**、**最后修改时间**与**新鲜度等级**，为全域资产对齐与防止暗中代码漂移提供唯一客观事实依据。

---

## 📊 一、新鲜度评级标准与判定矩阵

| 新鲜度评级 | 标识 | 判定准则 | 处置与对齐策略 |
| :--- | :---: | :--- | :--- |
| **完全新鲜 (Fresh)** | 🟢 `TIER-0` | 声明版本与系统最新总基线完全一致 (`v2.4.0`) | 资产处于最优生效态，免修改直接运行 |
| **存量落后 (Stale)** | 🟡 `TIER-1` | 属于正常受管资产，但版本落后于最新基线 | **遇碰即对齐 (Touch-and-Align)**，涉及该模块时顺带升级 |
| **未版本化 (None)** | ⚪ `TIER-2` | 无头部版本元数据区，或属于纯代码/脚本辅助文件 | 保持指纹追踪，必要时补充标准版本头部 |

---

## 🧬 二、全域受管资产数字指纹详细记录表

| 资产相对路径 | 短指纹 (SHA-256) | 最后修改时间 | 声明版本 | 新鲜度评级 | 对齐状态 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `rules/coding/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/coding/atomicity_specification.md` | `cddf2834` | 2026-09-16 19:24 | `v2.3.0` | 🟡 TIER-1 | 待升级对齐 |
| `rules/coding/testing_and_quality_gate.md` | `4b2e47b0` | 2026-09-16 19:24 | `v2.3.0` | 🟡 TIER-1 | 待升级对齐 |
| `rules/coding/unity_project_standard.md` | `49eecd35` | 2026-09-16 16:48 | `v1.2.0` | 🟡 TIER-1 | 待升级对齐 |
| `rules/security/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/security/security_baseline.md` | `4ed4c887` | 2026-09-16 19:24 | `v2.3.0` | 🟡 TIER-1 | 待升级对齐 |
| `rules/system/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/initialization_protocol.md` | `64877a23` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/language_standard.md` | `65a53862` | 2026-09-16 14:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/meta_rules.md` | `8284ed61` | 2026-09-17 17:22 | `v2.4.0` | 🟢 TIER-0 | 最新基线 |
| `rules/system/thinking_framework.md` | `497b379b` | 2026-09-16 14:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/audit_and_cleanup.md` | `49fb5fe2` | 2026-09-16 19:03 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/change_flow.md` | `9b3a607d` | 2026-09-16 19:04 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/component_naming.md` | `035d767e` | 2026-09-16 16:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/page_ledger_specification.md` | `2c88dcbc` | 2026-09-16 19:24 | `v2.3.0` | 🟡 TIER-1 | 待升级对齐 |
| `rules/workflow/post_mortem_and_evolution.md` | `33ad784b` | 2026-09-16 19:24 | `v2.3.0` | 🟡 TIER-1 | 待升级对齐 |
| `rules/workflow/risk_disclosure.md` | `c78741cb` | 2026-09-16 19:24 | `v2.3.0` | 🟡 TIER-1 | 待升级对齐 |
| `rules/workflow/task_execution_flow.md` | `d1722cb9` | 2026-09-17 17:22 | `v2.4.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/versioning_standard.md` | `04dc5a59` | 2026-09-16 18:24 | `v1.0.0
v2.0.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/.gitkeep` | `e3b0c442` | 2026-09-16 16:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/README.md` | `fad56bba` | 2026-09-17 17:23 | `v2.4.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/art_specification.md` | `b82cd885` | 2026-09-16 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/common/README.md` | `f028859c` | 2026-09-16 18:00 | `v1.6.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/common/art_specification.md` | `968b9d56` | 2026-09-16 18:00 | `v1.6.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/common/dsh_native_ui_components.md` | `cfab8272` | 2026-09-16 19:12 | `v2.1.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/common/engineering_specification.md` | `197cc684` | 2026-09-16 18:00 | `v1.6.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/common/interaction_specification.md` | `350aec20` | 2026-09-16 17:59 | `v1.6.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/common/miniprogram_specification.md` | `14ef22d4` | 2026-09-16 18:00 | `v1.6.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/common/unity_specification.md` | `35afa4b1` | 2026-09-16 18:00 | `v1.6.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/common/web_specification.md` | `e877699c` | 2026-09-16 18:00 | `v1.6.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/engineering_specification.md` | `20cc65f0` | 2026-09-16 18:02 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/projects/README.md` | `0d4ad685` | 2026-09-16 18:00 | `v1.6.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/projects/aether_echo/README.md` | `914383fe` | 2026-09-16 18:01 | `v1.6.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/projects/aether_echo/project_art_spec.md` | `88b03ea6` | 2026-09-16 18:01 | `v1.6.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/projects/aether_echo/project_engineering_spec.md` | `407975d1` | 2026-09-16 18:01 | `v1.6.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/projects/aether_echo/worldview.md` | `dea8b2e4` | 2026-09-16 18:00 | `v1.6.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/worldview_background.md` | `075b4ce3` | 2026-09-16 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/.gitkeep` | `e3b0c442` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/README.md` | `fdcd7814` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/dsh_capabilities.md` | `23ac7e04` | 2026-09-17 17:23 | `v2.4.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/extension_ecosystem.md` | `a24b9d6e` | 2026-09-16 19:25 | `v2.3.0` | 🟡 TIER-1 | 待升级对齐 |
| `indexes/rules_index.md` | `cf417457` | 2026-09-17 17:23 | `v2.4.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/shortcuts_index.md` | `f3eefd79` | 2026-09-17 17:22 | `v2.4.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/tool_interfaces.md` | `e6c22a41` | 2026-09-17 17:23 | `v2.4.0` | 🟢 TIER-0 | 最新基线 |
| `templates/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/directory_readme_template.md` | `1778c755` | 2026-09-16 14:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/graphical_block_template.md` | `58acfcfe` | 2026-09-16 15:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/page_ledger_template.md` | `5dfbd96e` | 2026-09-16 18:22 | `v1.0.0` | 🟡 TIER-1 | 待升级对齐 |
| `templates/post_mortem_template.md` | `e82b0e43` | 2026-09-16 18:22 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/project_dsh_bootstrap_template.md` | `172518ae` | 2026-09-16 19:20 | `v2.2.0` | 🟡 TIER-1 | 待升级对齐 |
| `templates/requirement_template.md` | `a7b212cf` | 2026-09-16 16:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/risk_assessment_template.md` | `84777cc3` | 2026-09-16 18:22 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/disk_check_and_cleanup.sh` | `053f8584` | 2026-09-16 19:03 | `v2.0.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/fingerprint_audit.sh` | `29b346d1` | 2026-09-16 19:24 | `v2.3.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/generate_image.py` | `96b41a0f` | 2026-09-16 16:58 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/git_sync_remote.sh` | `0f701aa9` | 2026-09-17 17:21 | `v2.4.0` | 🟢 TIER-0 | 最新基线 |
| `scripts/init_dir.sh` | `9bc60177` | 2026-09-16 14:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/rename_session.sh` | `9303adf2` | 2026-09-16 15:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/test_v180_spec.sh` | `500bf0cf` | 2026-09-16 18:24 | `v1.8.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/diagram_generation_guide.md` | `41e67d26` | 2026-09-16 16:46 | `v1.2.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/memory_architecture.md` | `a35e10e8` | 2026-09-16 16:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/requirements.md` | `bedba1bd` | 2026-09-17 17:23 | `v2.4.0` | 🟢 TIER-0 | 最新基线 |
| `docs/rules_tutorial.md` | `f71ad4d9` | 2026-09-16 14:41 | `-` | ⚪ TIER-2 | 指纹监控中 |

---

## 🛡️ 三、资产漂移校验与自动化口令

- **一键扫描更新台账**：
  ```bash
  ./scripts/fingerprint_audit.sh --scan
  ```
- **一键输出新鲜度雷达看盘**：
  ```bash
  ./scripts/fingerprint_audit.sh --freshness
  ```
- **全域资产指纹校验**：
  ```bash
  ./scripts/fingerprint_audit.sh --verify
  ```
