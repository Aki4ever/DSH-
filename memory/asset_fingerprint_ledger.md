# 全域资产数字指纹与新鲜度审计台账 (Asset Fingerprint Ledger)

> ### 🏷️ **版本信息与实施追踪**
> - **当前台账版本**：`v4.21.0`
> - **基线对齐版本**：`v4.21.0`
> - **最后全盘扫描时间**：2026-09-24 18:48
> - **自动化引擎**：遵循 [`scripts/fingerprint_audit.sh`](../scripts/fingerprint_audit.sh)

本文档记录工程全域受管资产（规则、知识库、架构索引、工程模板、自动化脚本与需求台账）的**数字指纹（SHA-256 8位短哈希）**、**最后修改时间**与**新鲜度等级**，为全域资产对齐与防止暗中代码漂移提供唯一客观事实依据。

---

## 📊 一、新鲜度评级标准与判定矩阵

| 新鲜度评级 | 标识 | 判定准则 | 处置与对齐策略 |
| :--- | :---: | :--- | :--- |
| **完全新鲜 (Fresh)** | 🟢 `TIER-0` | 声明版本与系统最新总基线完全一致 (`v4.21.0`) | 资产处于最优生效态，免修改直接运行 |
| **存量落后 (Stale)** | 🟡 `TIER-1` | 属于正常受管资产，但版本落后于最新基线 | **遇碰即对齐 (Touch-and-Align)**，涉及该模块时顺带升级 |
| **未版本化 (None)** | ⚪ `TIER-2` | 无头部版本元数据区，或属于纯代码/脚本辅助文件 | 保持指纹追踪，必要时补充标准版本头部 |

---

## 🧬 二、全域受管资产数字指纹详细记录表

| 资产相对路径 | 短指纹 (SHA-256) | 最后修改时间 | 声明版本 | 新鲜度评级 | 对齐状态 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `rules/README.md` | `fb0cb9f8` | 2026-09-22 20:12 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/coding/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/coding/atomicity_specification.md` | `e09d6675` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/first_principles_verification.md` | `9efdd1be` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/testing_and_quality_gate.md` | `00dfd7fc` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/token_and_local_compute_optimization.md` | `da53f0b1` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/unity_project_standard.md` | `ab7b263b` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `rules/security/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/security/security_baseline.md` | `723ea61d` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `rules/system/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/initialization_protocol.md` | `64877a23` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/language_standard.md` | `f1c14727` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `rules/system/meta_rules.md` | `151fe253` | 2026-09-24 18:43 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/thinking_framework.md` | `497b379b` | 2026-09-16 14:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/agent_life_spec.md` | `275d2f0c` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/audit_and_cleanup.md` | `60348108` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/change_flow.md` | `2d7f802e` | 2026-09-24 14:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/component_naming.md` | `035d767e` | 2026-09-16 16:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/page_ledger_specification.md` | `67361d4e` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/post_mortem_and_evolution.md` | `b8ce2230` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/pp_life_orchestration.md` | `944cb0ac` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/risk_disclosure.md` | `57d3f530` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/task_execution_flow.md` | `3f87fc71` | 2026-09-24 18:43 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/versioning_standard.md` | `86f3e38c` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/.gitkeep` | `e3b0c442` | 2026-09-16 16:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/README.md` | `54efa61d` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/art_specification.md` | `b82cd885` | 2026-09-16 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/common/README.md` | `840a5a61` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/art_specification.md` | `281c3dd0` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/component_asset_reference.md` | `07ac7828` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/dsh_native_ui_components.md` | `719df8a7` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/engineering_specification.md` | `f573800a` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/interaction_specification.md` | `a2375655` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/miniprogram_specification.md` | `fa4f0c72` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/readability_specification.md` | `28d3f171` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/task_naming_spec.md` | `d174ea80` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/unity_specification.md` | `34a40041` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/web_specification.md` | `71d9d327` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/engineering_specification.md` | `20cc65f0` | 2026-09-16 18:02 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/projects/README.md` | `d76994d3` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/README.md` | `550780f2` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/project_art_spec.md` | `dbac2be5` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/project_engineering_spec.md` | `82376742` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/worldview.md` | `7afe252d` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/worldview_background.md` | `075b4ce3` | 2026-09-16 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/.gitkeep` | `e3b0c442` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/README.md` | `fdcd7814` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/capabilities_index.md` | `03183199` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/dsh_capabilities.md` | `eade4911` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/extension_ecosystem.md` | `8e032a38` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/navigation_router.md` | `16f03cd5` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/rules_index.md` | `e52e3a80` | 2026-09-24 18:48 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/shortcuts_index.md` | `ab242d71` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/tool_interfaces.md` | `7e97955b` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `templates/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/directory_readme_template.md` | `1778c755` | 2026-09-16 14:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/graphical_block_template.md` | `58acfcfe` | 2026-09-16 15:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/page_ledger_template.md` | `27442001` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `templates/post_mortem_template.md` | `e82b0e43` | 2026-09-16 18:22 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/project_dsh_bootstrap_template.md` | `6414694e` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `templates/requirement_template.md` | `adf322a5` | 2026-09-24 18:46 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/risk_assessment_template.md` | `84777cc3` | 2026-09-16 18:22 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/agent_life.mjs` | `9a8dd623` | 2026-09-23 18:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/align_version.mjs` | `6410c6c5` | 2026-09-23 15:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/audit_execution.sh` | `d5eb888e` | 2026-09-24 18:03 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/batch_rename_sessions.mjs` | `280a7bff` | 2026-09-23 15:04 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/channel_audit.mjs` | `eaf40879` | 2026-09-22 22:33 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_freshness.mjs` | `ba47c082` | 2026-09-24 13:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_task_naming.sh` | `9f6a2305` | 2026-09-24 15:14 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_unique_identifiers.mjs` | `debfb819` | 2026-09-23 18:34 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/conflict_scan.mjs` | `cfc907bd` | 2026-09-23 09:30 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/control_gates.sh` | `fb89183f` | 2026-09-24 17:21 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/disk_check_and_cleanup.sh` | `c3671af0` | 2026-09-24 16:38 | `v4.15.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/fingerprint_audit.sh` | `2d0ee459` | 2026-09-23 09:50 | `v3.1.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/generate_image.py` | `5733c6d9` | 2026-09-22 21:10 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/generate_naming_plan.mjs` | `181187ff` | 2026-09-23 15:03 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/git_sync_remote.sh` | `720c8d01` | 2026-09-23 09:50 | `v3.1.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/global_scheduler_lock.sh` | `b51f5deb` | 2026-09-23 09:50 | `v3.1.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/init_dir.sh` | `26de8e54` | 2026-09-24 18:15 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/init_project.sh` | `80abc55d` | 2026-09-24 16:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/legacy_align_scan.mjs` | `6ae68e87` | 2026-09-24 13:25 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/auto_naming.mjs` | `f17076b2` | 2026-09-24 15:02 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/physical_lock.mjs` | `259272b8` | 2026-09-24 17:55 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/workspace_resolve.mjs` | `4e118a67` | 2026-09-23 14:59 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/name_me.sh` | `73379dcc` | 2026-09-23 15:46 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/naming_watchdog.mjs` | `58df7b3f` | 2026-09-23 15:46 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/normalize_all_projects.mjs` | `54b2a758` | 2026-09-24 18:44 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/patch_dsh_todo_progress.cjs` | `5361fa08` | 2026-09-23 15:54 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/physical_lock.sh` | `5da0fde2` | 2026-09-24 17:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/probe_long_output.mjs` | `52c32d04` | 2026-09-23 15:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/probe_long_output_stream.mjs` | `34445721` | 2026-09-23 15:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/probe_max_tokens.mjs` | `6be3205d` | 2026-09-23 15:11 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/redundancy_scan.mjs` | `66e7d395` | 2026-09-23 07:57 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/rename_session.sh` | `0f9da4e0` | 2026-09-24 17:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/route_navigate.mjs` | `f12eda97` | 2026-09-23 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/session_naming_audit.mjs` | `dcbd97f5` | 2026-09-23 15:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/svg2png.sh` | `28127071` | 2026-09-22 21:06 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/svg_rasterize.swift` | `3e0357f9` | 2026-09-22 21:06 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/sync_control_requirements.mjs` | `06a99a62` | 2026-09-23 16:53 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/test_auto_naming.mjs` | `0dc28b62` | 2026-09-23 15:39 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/test_physical_lock.mjs` | `58f9159d` | 2026-09-24 17:59 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/test_v180_spec.sh` | `e33884a7` | 2026-09-23 06:42 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/verify_auto_naming_e2e.mjs` | `b69a2c2a` | 2026-09-23 15:41 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/verify_escape_hatch.sh` | `da05a50f` | 2026-09-23 14:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/verify_guard_live.sh` | `35e23bfa` | 2026-09-23 14:11 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/constraint_mechanism_enhance_2.md` | `7b314a4d` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_3.md` | `1fe85e06` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_4.md` | `e0f7b517` | 2026-09-24 18:46 | `v4.21.0
v3.2.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/constraint_mechanism_spec.md` | `f3acac0d` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `docs/diagram_generation_guide.md` | `dc0e7c64` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `docs/memory_architecture.md` | `a35e10e8` | 2026-09-16 16:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/requirements.md` | `3b0c12f8` | 2026-09-24 18:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/rules_tutorial.md` | `f71ad4d9` | 2026-09-16 14:41 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/visual_learning_research.md` | `d690e463` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `ai-control/README.md` | `7efc9b71` | 2026-09-24 18:00 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/gates.conf` | `c7289222` | 2026-09-24 17:57 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/legacy_align_exempt.txt` | `4acab986` | 2026-09-23 09:32 | `v3.1.0` | 🟡 TIER-1 | 待升级对齐 |
| `ai-control/config/naming_overrides.json` | `bfbbbe56` | 2026-09-23 15:43 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/index.mjs` | `a3ea1473` | 2026-09-24 17:58 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/loader.mjs` | `d4a903ed` | 2026-09-23 15:40 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/selftest.mjs` | `d0fdb221` | 2026-09-23 14:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/requirements/README.md` | `e7f88307` | 2026-09-23 16:52 | `v3.3.0` | 🟡 TIER-1 | 待升级对齐 |
| `ai-control/requirements/control_requirements_ledger.md` | `1495e779` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `memory/.gitkeep` | `e3b0c442` | 2026-09-16 15:37 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/README.md` | `2778de38` | 2026-09-16 15:37 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/asset_fingerprint_ledger.md` | `b56c11ed` | 2026-09-24 18:48 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `memory/context_memory.md` | `9a54428f` | 2026-09-23 15:04 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/efficiency_audit_log.md` | `e220cb8a` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `memory/error_ledger.md` | `19ba46cb` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |
| `memory/lessons_learned.md` | `b5776898` | 2026-09-23 15:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `AGENTS.md` | `1837647c` | 2026-09-24 18:44 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `README.md` | `3289a281` | 2026-09-24 18:46 | `v4.21.0` | 🟢 TIER-0 | 最新基线 |

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
