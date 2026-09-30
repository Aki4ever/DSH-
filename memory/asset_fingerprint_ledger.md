# 全域资产数字指纹与新鲜度审计台账 (Asset Fingerprint Ledger)

> ### 🏷️ **版本信息与实施追踪**
> - **当前台账版本**：`v4.24.0`
> - **基线对齐版本**：`v4.24.0`
> - **最后全盘扫描时间**：2026-10-01 06:34
> - **自动化引擎**：遵循 [`scripts/fingerprint_audit.sh`](../scripts/fingerprint_audit.sh)

本文档记录工程全域受管资产（规则、知识库、架构索引、工程模板、自动化脚本与需求台账）的**数字指纹（SHA-256 8位短哈希）**、**最后修改时间**与**新鲜度等级**，为全域资产对齐与防止暗中代码漂移提供唯一客观事实依据。

---

## 📊 一、新鲜度评级标准与判定矩阵

| 新鲜度评级 | 标识 | 判定准则 | 处置与对齐策略 |
| :--- | :---: | :--- | :--- |
| **完全新鲜 (Fresh)** | 🟢 `TIER-0` | 声明版本与系统最新总基线完全一致 (`v4.24.0`) | 资产处于最优生效态，免修改直接运行 |
| **存量落后 (Stale)** | 🟡 `TIER-1` | 属于正常受管资产，但版本落后于最新基线 | **遇碰即对齐 (Touch-and-Align)**，涉及该模块时顺带升级 |
| **未版本化 (None)** | ⚪ `TIER-2` | 无头部版本元数据区，或属于纯代码/脚本辅助文件 | 保持指纹追踪，必要时补充标准版本头部 |

---

## 🧬 二、全域受管资产数字指纹详细记录表

| 资产相对路径 | 短指纹 (SHA-256) | 最后修改时间 | 声明版本 | 新鲜度评级 | 对齐状态 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `rules/.DS_Store` | `8487f26b` | 2026-10-01 05:48 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/README.md` | `fb0cb9f8` | 2026-09-22 20:12 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/coding/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/coding/atomicity_specification.md` | `567fbe28` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/first_principles_verification.md` | `1d22e0a5` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/testing_and_quality_gate.md` | `8c968425` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/token_and_local_compute_optimization.md` | `d0eebd14` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/unity_project_standard.md` | `2bb82310` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `rules/security/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/security/security_baseline.md` | `ea6b9ae2` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `rules/system/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/initialization_protocol.md` | `64877a23` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/language_standard.md` | `e81a3a4f` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `rules/system/meta_rules.md` | `48274b87` | 2026-10-01 05:52 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/thinking_framework.md` | `497b379b` | 2026-09-16 14:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/agent_life_spec.md` | `28f7b991` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/audit_and_cleanup.md` | `bed24df7` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/change_flow.md` | `2d7f802e` | 2026-09-24 14:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/component_naming.md` | `035d767e` | 2026-09-16 16:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/page_ledger_specification.md` | `5f38dc01` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/post_mortem_and_evolution.md` | `ecd7a198` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/pp_life_orchestration.md` | `e4902666` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/risk_disclosure.md` | `f7ad7dd8` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/task_execution_flow.md` | `4846bcdc` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/versioning_standard.md` | `cbe07278` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/.DS_Store` | `d39e0142` | 2026-10-01 06:31 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/.gitkeep` | `e3b0c442` | 2026-09-16 16:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/README.md` | `1d205a70` | 2026-10-01 06:24 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/art_specification.md` | `b82cd885` | 2026-09-16 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/common/README.md` | `4b7c4c92` | 2026-10-01 06:23 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/art_specification.md` | `ecfcf9a5` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/capability_naming_spec.md` | `e423c430` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/component_asset_reference.md` | `f7f3e88b` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/dsh_native_ui_components.md` | `4744af90` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/engineering_specification.md` | `8870267a` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/execution_layer_interface_spec.md` | `0bc44e63` | 2026-10-01 06:30 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/interaction_specification.md` | `afe5d0d4` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/miniprogram_specification.md` | `184c7dbd` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/readability_specification.md` | `e6c0c3e6` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/task_naming_spec.md` | `0941b919` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/unity_specification.md` | `770d8e15` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/web_specification.md` | `2e692924` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/engineering_specification.md` | `20cc65f0` | 2026-09-16 18:02 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/projects/README.md` | `cefe120b` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/README.md` | `25db3dd6` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/project_art_spec.md` | `c19b774b` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/project_engineering_spec.md` | `6d902139` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/worldview.md` | `7fc5cab2` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/sources/README.md` | `f11de24d` | 2026-10-01 06:31 | `v4.24.0
v4.25.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/sources/SOURCE-001-dont-make-me-think.md` | `3d6262f2` | 2026-10-01 06:25 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/sources/SOURCE-002-gestalt-psychology.md` | `f35964b2` | 2026-10-01 06:25 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/worldview_background.md` | `075b4ce3` | 2026-09-16 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/.gitkeep` | `e3b0c442` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/README.md` | `fdcd7814` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/capabilities_index.json` | `2f22a686` | 2026-10-01 06:32 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/capabilities_index.md` | `d5039d69` | 2026-10-01 06:32 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/dsh_capabilities.md` | `23ca3232` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/extension_ecosystem.md` | `35ac28c2` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/navigation_router.md` | `424341d0` | 2026-10-01 06:31 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/rules_index.md` | `0b41702f` | 2026-10-01 06:32 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/shortcuts_index.md` | `a9de2c38` | 2026-10-01 06:32 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/tool_interfaces.md` | `b4b886cb` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `templates/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/directory_readme_template.md` | `1778c755` | 2026-09-16 14:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/graphical_block_template.md` | `58acfcfe` | 2026-09-16 15:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/page_ledger_template.md` | `e0b7c4f4` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `templates/post_mortem_template.md` | `e82b0e43` | 2026-09-16 18:22 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/project_dsh_bootstrap_template.md` | `d7bbf733` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `templates/requirement_template.md` | `1f057443` | 2026-10-01 05:48 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/risk_assessment_template.md` | `84777cc3` | 2026-09-16 18:22 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/.DS_Store` | `bc95372d` | 2026-10-01 06:33 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/agent_life.mjs` | `9a8dd623` | 2026-09-23 18:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/align_version.mjs` | `6410c6c5` | 2026-09-23 15:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/audit_execution.sh` | `fcc96002` | 2026-10-01 06:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/batch_fix_sidebar_titles.mjs` | `a05c9079` | 2026-09-24 19:03 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/batch_rename_sessions.mjs` | `280a7bff` | 2026-09-23 15:04 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/build_capabilities_index.mjs` | `89f600d3` | 2026-10-01 06:26 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/channel_audit.mjs` | `1bd0ebb6` | 2026-10-01 06:31 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_freshness.mjs` | `ba47c082` | 2026-09-24 13:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_layer_interfaces.mjs` | `54d1de13` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_task_naming.sh` | `dd0c4068` | 2026-09-29 02:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_unique_identifiers.mjs` | `debfb819` | 2026-09-23 18:34 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/conflict_scan.mjs` | `bc8ecfca` | 2026-10-01 06:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/control_gates.sh` | `1bc81653` | 2026-10-01 05:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/deepseek_key_setup.sh` | `5b69398f` | 2026-10-01 05:51 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/deepseek_usage_probe.mjs` | `ac69bf1d` | 2026-09-29 02:26 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/disk_check_and_cleanup.sh` | `a49d5115` | 2026-10-01 05:49 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `scripts/fingerprint_audit.sh` | `3830af1b` | 2026-10-01 05:49 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `scripts/flow_control.mjs` | `25f6562e` | 2026-09-29 04:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/gate_selftest.sh` | `3cd99125` | 2026-10-01 05:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/generate_image.py` | `5733c6d9` | 2026-09-22 21:10 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/generate_naming_plan.mjs` | `181187ff` | 2026-09-23 15:03 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/git_sync_remote.sh` | `fbbc0062` | 2026-10-01 05:49 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `scripts/global_scheduler_lock.sh` | `be20ad72` | 2026-10-01 05:49 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `scripts/init_dir.sh` | `26de8e54` | 2026-09-24 18:15 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/init_project.sh` | `80abc55d` | 2026-09-24 16:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/install_host_gate.sh` | `a0ec8534` | 2026-10-01 05:51 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/agent_life.interface.json` | `bf6f208d` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/align_version.interface.json` | `758577cb` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/audit_execution.interface.json` | `856f8f4c` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/batch_fix_sidebar_titles.interface.json` | `9206c03b` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/batch_rename_sessions.interface.json` | `368f5510` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/build_capabilities_index.interface.json` | `f381903f` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/channel_audit.interface.json` | `7ffbbe8f` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/check_freshness.interface.json` | `77f3cca1` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/check_layer_interfaces.interface.json` | `f8017ad4` | 2026-10-01 06:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/check_task_naming.interface.json` | `9f3a23b7` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/check_unique_identifiers.interface.json` | `25f7de84` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/conflict_scan.interface.json` | `550f9e63` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/control_gates.interface.json` | `428bdbdf` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/deepseek_key_setup.interface.json` | `67d6d188` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/deepseek_usage_probe.interface.json` | `d3cd9b26` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/disk_check_and_cleanup.interface.json` | `a86db33a` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/fingerprint_audit.interface.json` | `4bd1c494` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/flow_control.interface.json` | `96d667c0` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/gate_selftest.interface.json` | `9ca848a3` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/generate_image.interface.json` | `5ca4aa6e` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/generate_naming_plan.interface.json` | `503174d4` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/git_sync_remote.interface.json` | `ae4f4288` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/global_scheduler_lock.interface.json` | `e2c8603f` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/init_dir.interface.json` | `68a6560d` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/init_project.interface.json` | `5b9bb9c5` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/install_host_gate.interface.json` | `dbe04fa7` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/legacy_align_scan.interface.json` | `4e88d93c` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/mechanism_audit.interface.json` | `c27e7ef4` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/name_me.interface.json` | `3f8e3c44` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/naming_watchdog.interface.json` | `bc915b04` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/normalize_all_projects.interface.json` | `63687e79` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/output_audit.interface.json` | `a912c413` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/patch_dsh_todo_progress.interface.json` | `31685614` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/physical_lock.interface.json` | `8b076efe` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/probe_long_output.interface.json` | `c587b8e0` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/probe_long_output_stream.interface.json` | `b473b467` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/probe_max_tokens.interface.json` | `5d636002` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/process_supervisor.interface.json` | `2476f2bf` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/progress_ledger.interface.json` | `4f7935f1` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/redundancy_scan.interface.json` | `3943e27f` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/rename_session.interface.json` | `a6043b90` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/restore_skill_pool.interface.json` | `0b70dfb6` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/route_navigate.interface.json` | `75eee50b` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/route_plan.interface.json` | `db4b1f1c` | 2026-10-01 06:32 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/session_naming_audit.interface.json` | `82530c5a` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/svg2png.interface.json` | `2737023a` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/sync_control_requirements.interface.json` | `138d879b` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/test_auto_naming.interface.json` | `f0ab33da` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/test_physical_lock.interface.json` | `d559ec55` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/test_v180_spec.interface.json` | `efc97128` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/todo_gate.interface.json` | `d02185a2` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/verify_auto_naming_e2e.interface.json` | `a7bfb480` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/verify_escape_hatch.interface.json` | `43bd0268` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/verify_guard_live.interface.json` | `f2e66a02` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/legacy_align_scan.mjs` | `f4fa47d9` | 2026-09-28 08:46 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/auto_naming.mjs` | `f17076b2` | 2026-09-24 15:02 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/deepseek_balance.mjs` | `58f44292` | 2026-09-29 02:25 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/find_node.sh` | `6a7850da` | 2026-09-29 04:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/output_compactness.mjs` | `db0b635e` | 2026-09-28 08:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/physical_lock.mjs` | `781b9a0d` | 2026-09-29 04:34 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/pricing_fingerprint.mjs` | `7a0c7b4f` | 2026-09-29 02:25 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/session_transcript.mjs` | `2b9b689a` | 2026-09-29 04:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/todo_gate_cli.mjs` | `dc994ef1` | 2026-09-29 04:25 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/todo_tracker.mjs` | `15dadcb6` | 2026-09-29 04:25 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/workspace_resolve.mjs` | `4e118a67` | 2026-09-23 14:59 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/mechanism_audit.mjs` | `f24d494a` | 2026-09-29 04:34 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/name_me.sh` | `7ca6422f` | 2026-09-29 04:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/naming_watchdog.mjs` | `58df7b3f` | 2026-09-23 15:46 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/normalize_all_projects.mjs` | `54b2a758` | 2026-09-24 18:44 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/output_audit.mjs` | `1674e4ae` | 2026-10-01 06:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/patch_dsh_todo_progress.cjs` | `d136c4e7` | 2026-10-01 06:26 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/physical_lock.sh` | `0a042f31` | 2026-09-29 04:34 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/probe_long_output.mjs` | `52c32d04` | 2026-09-23 15:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/probe_long_output_stream.mjs` | `34445721` | 2026-09-23 15:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/probe_max_tokens.mjs` | `6be3205d` | 2026-09-23 15:11 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/process_supervisor.mjs` | `a8f64d39` | 2026-09-29 04:28 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/progress_ledger.mjs` | `ca5af833` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/redundancy_scan.mjs` | `66e7d395` | 2026-09-23 07:57 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/rename_session.sh` | `bbaa860d` | 2026-09-29 04:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/restore_skill_pool.mjs` | `959ebea4` | 2026-09-28 08:43 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/route_navigate.mjs` | `f12eda97` | 2026-09-23 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/route_plan.mjs` | `3b592cc3` | 2026-10-01 06:33 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/session_naming_audit.mjs` | `fe353407` | 2026-09-24 18:55 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/svg2png.sh` | `28127071` | 2026-09-22 21:06 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/svg_rasterize.swift` | `3e0357f9` | 2026-09-22 21:06 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/sync_control_requirements.mjs` | `06a99a62` | 2026-09-23 16:53 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/test_auto_naming.mjs` | `0dc28b62` | 2026-09-23 15:39 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/test_physical_lock.mjs` | `58f9159d` | 2026-09-24 17:59 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/test_v180_spec.sh` | `e33884a7` | 2026-09-23 06:42 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/todo_gate.sh` | `080fadd2` | 2026-09-29 04:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/verify_auto_naming_e2e.mjs` | `b69a2c2a` | 2026-09-23 15:41 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/verify_escape_hatch.sh` | `da05a50f` | 2026-09-23 14:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/verify_guard_live.sh` | `0b0c8fac` | 2026-10-01 05:51 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/constraint_mechanism_enhance_2.md` | `2c52a021` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_3.md` | `741ba88b` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_4.md` | `c246bc12` | 2026-10-01 05:49 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_5.md` | `f1f1a6e6` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_6.md` | `702ee603` | 2026-10-01 06:33 | `v4.24.0
v4.25.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/constraint_mechanism_spec.md` | `5e415829` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `docs/diagram_generation_guide.md` | `611a5bb8` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `docs/memory_architecture.md` | `a35e10e8` | 2026-09-16 16:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/requirements.md` | `dc16a0af` | 2026-10-01 06:23 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/rules_tutorial.md` | `f71ad4d9` | 2026-09-16 14:41 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/visual_learning_research.md` | `f4d3d262` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `ai-control/.DS_Store` | `e5392dee` | 2026-10-01 06:34 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/README.md` | `98563e8f` | 2026-10-01 06:32 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/flow_graph.json` | `d76d2084` | 2026-09-29 04:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/gates.conf` | `99001310` | 2026-09-29 02:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/legacy_align_exempt.txt` | `341d4788` | 2026-10-01 05:49 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `ai-control/config/naming_overrides.json` | `bfbbbe56` | 2026-09-23 15:43 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/lib/host_identity.mjs` | `5107cc24` | 2026-09-28 08:46 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/index.mjs` | `a3fe8087` | 2026-09-29 02:40 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/loader.mjs` | `6290a5f4` | 2026-09-28 08:46 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/selftest.mjs` | `f7bf3f9e` | 2026-09-28 08:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/requirements/README.md` | `45e1a570` | 2026-10-01 05:49 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `ai-control/requirements/control_requirements_ledger.md` | `1a50fa61` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `memory/.gitkeep` | `e3b0c442` | 2026-09-16 15:37 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/README.md` | `2778de38` | 2026-09-16 15:37 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/asset_fingerprint_ledger.md` | `40ce095f` | 2026-10-01 06:34 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `memory/context_memory.md` | `9a54428f` | 2026-09-23 15:04 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/efficiency_audit_log.md` | `35cc5e84` | 2026-10-01 05:48 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `memory/error_ledger.md` | `5dd99114` | 2026-10-01 05:51 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |
| `memory/lessons_learned.md` | `b5776898` | 2026-09-23 15:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `AGENTS.md` | `e260f593` | 2026-10-01 06:32 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `README.md` | `f7507626` | 2026-10-01 06:32 | `v4.24.0` | 🟢 TIER-0 | 最新基线 |

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
