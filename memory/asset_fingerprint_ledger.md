# 全域资产数字指纹与新鲜度审计台账 (Asset Fingerprint Ledger)

> ### 🏷️ **版本信息与实施追踪**
> - **当前台账版本**：`v4.29.5`
> - **基线对齐版本**：`v4.29.0`
> - **最后全盘扫描时间**：2026-10-02 06:21
> - **自动化引擎**：遵循 [`scripts/fingerprint_audit.sh`](../scripts/fingerprint_audit.sh)

本文档记录工程全域受管资产（规则、知识库、架构索引、工程模板、自动化脚本与需求台账）的**数字指纹（SHA-256 8位短哈希）**、**最后修改时间**与**新鲜度等级**，为全域资产对齐与防止暗中代码漂移提供唯一客观事实依据。

---

## 📊 一、新鲜度评级标准与判定矩阵

| 新鲜度评级 | 标识 | 判定准则 | 处置与对齐策略 |
| :--- | :---: | :--- | :--- |
| **完全新鲜 (Fresh)** | 🟢 `TIER-0` | 声明版本与系统最新总基线完全一致 (`v4.29.0`) | 资产处于最优生效态，免修改直接运行 |
| **存量落后 (Stale)** | 🟡 `TIER-1` | 属于正常受管资产，但版本落后于最新基线 | **遇碰即对齐 (Touch-and-Align)**，涉及该模块时顺带升级 |
| **未版本化 (None)** | ⚪ `TIER-2` | 无头部版本元数据区，或属于纯代码/脚本辅助文件 | 保持指纹追踪，必要时补充标准版本头部 |

---

## 🧬 二、全域受管资产数字指纹详细记录表

| 资产相对路径 | 短指纹 (SHA-256) | 最后修改时间 | 声明版本 | 新鲜度评级 | 对齐状态 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `AGENTS.md` | `ec667165` | 2026-10-02 06:20 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `README.md` | `d0aee6bb` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `ai-control/README.md` | `214d2cbf` | 2026-10-02 06:19 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/flow_graph.json` | `d76d2084` | 2026-09-29 04:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/gates.conf` | `e7c36acf` | 2026-10-02 00:22 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/ledger_drift_exempt.txt` | `6aaed95b` | 2026-10-02 06:19 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/legacy_align_exempt.txt` | `341d4788` | 2026-10-01 05:49 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `ai-control/config/naming_overrides.json` | `bfbbbe56` | 2026-09-23 15:43 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/skill_carrier_exempt.txt` | `0e9ccfd6` | 2026-10-02 00:53 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/token_budget.conf` | `f9d50b42` | 2026-10-02 00:55 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/token_budget_cases.json` | `51d90e3e` | 2026-10-02 00:55 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/token_budget_growth_exempt.txt` | `5d4dc9e3` | 2026-10-02 00:57 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/lib/host_identity.mjs` | `8a65acc3` | 2026-10-02 00:05 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/cordis.patch.yml` | `278de8b0` | 2026-10-02 01:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/index.mjs` | `11eb2fb0` | 2026-10-02 01:04 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/loader.mjs` | `6290a5f4` | 2026-09-28 08:46 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/package.json` | `ed1fd92b` | 2026-10-02 01:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/selftest.mjs` | `f7bf3f9e` | 2026-09-28 08:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/requirements/README.md` | `45e1a570` | 2026-10-01 05:49 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `ai-control/requirements/control_requirements_ledger.md` | `422710cb` | 2026-10-01 23:24 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `ai-control/requirements/req_versions.json` | `083794a7` | 2026-10-02 01:08 | `v1.0.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/constraint_mechanism_enhance_2.md` | `c4ff5d0d` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_10.md` | `86536c2b` | 2026-10-02 06:20 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_3.md` | `d45ef18a` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_4.md` | `076e8f25` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_5.md` | `8ceb406d` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_6.md` | `001f6771` | 2026-10-02 00:45 | `v4.29.0
v4.25.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/constraint_mechanism_optimize_7.md` | `f65739ee` | 2026-10-02 00:45 | `v4.29.0
v4.25.0
v4.26.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/constraint_mechanism_optimize_8.md` | `14605532` | 2026-10-02 00:45 | `v4.29.0
v4.27.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/constraint_mechanism_optimize_9.md` | `2082efac` | 2026-10-02 00:45 | `v4.29.0
v4.28.0
v4.29.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/constraint_mechanism_spec.md` | `d65ac7c2` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `docs/diagram_generation_guide.md` | `6cfcffed` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `docs/memory_architecture.md` | `a35e10e8` | 2026-09-16 16:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/mobile_control_dsh.md` | `d8f57b0a` | 2026-10-02 00:57 | `v4.29.0
v4.30.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/requirements.md` | `ead4a9c0` | 2026-10-02 01:08 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `docs/rules_tutorial.md` | `f71ad4d9` | 2026-09-16 14:41 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/visual_learning_research.md` | `5482925b` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/.gitkeep` | `e3b0c442` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/README.md` | `fdcd7814` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/capabilities_index.json` | `5957986b` | 2026-10-02 06:20 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/capabilities_index.md` | `e633386e` | 2026-10-02 06:20 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/dsh_capabilities.md` | `62b5f7ef` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/extension_ecosystem.md` | `2efadb4b` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/navigation_router.md` | `7147935f` | 2026-10-02 06:21 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/rules_index.md` | `756513ec` | 2026-10-02 06:20 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/shortcuts_index.md` | `46178131` | 2026-10-02 06:21 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/tool_interfaces.md` | `cff0029d` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/.gitkeep` | `e3b0c442` | 2026-09-16 16:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/README.md` | `9ac619dd` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/api/deepseek/README.md` | `51638b8f` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/api/deepseek/index.json` | `a0ff1962` | 2026-10-01 23:23 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/art_specification.md` | `b82cd885` | 2026-09-16 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/common/README.md` | `bb6bfc9a` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/art_specification.md` | `b5a5b808` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/capability_naming_spec.md` | `e4f1bb58` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/component_asset_reference.md` | `85577672` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/dsh_native_ui_components.md` | `dfd86e3f` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/engineering_specification.md` | `d3f1447d` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/execution_layer_interface_spec.md` | `00e5b9ae` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/interaction_specification.md` | `03af6490` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/miniprogram_specification.md` | `5bdfeca1` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/readability_specification.md` | `7febda1e` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/task_naming_spec.md` | `520e0ec1` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/unity_specification.md` | `4eb98255` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/web_specification.md` | `04ab1479` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/engineering_specification.md` | `20cc65f0` | 2026-09-16 18:02 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/projects/README.md` | `6ef77684` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/README.md` | `2dfe330a` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/project_art_spec.md` | `7e84ba34` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/project_engineering_spec.md` | `ace6a61a` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/worldview.md` | `c9b987e1` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/sources/README.md` | `f11de24d` | 2026-10-01 06:31 | `v4.24.0
v4.25.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/sources/SOURCE-001-dont-make-me-think.md` | `3d6262f2` | 2026-10-01 06:25 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/sources/SOURCE-002-gestalt-psychology.md` | `f35964b2` | 2026-10-01 06:25 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/worldview_background.md` | `075b4ce3` | 2026-09-16 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/.gitkeep` | `e3b0c442` | 2026-09-16 15:37 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/README.md` | `2778de38` | 2026-09-16 15:37 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/context_memory.md` | `9a54428f` | 2026-09-23 15:04 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/efficiency_audit_log.md` | `01ad6446` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `memory/error_ledger.md` | `860fde2a` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `memory/lessons_learned.md` | `b5776898` | 2026-09-23 15:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/README.md` | `fb0cb9f8` | 2026-09-22 20:12 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/coding/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/coding/atomicity_specification.md` | `9a150206` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/first_principles_verification.md` | `85c2a160` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/testing_and_quality_gate.md` | `172bb712` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/token_and_local_compute_optimization.md` | `d0ead993` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/unity_project_standard.md` | `dbf7c2bc` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `rules/security/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/security/security_baseline.md` | `333a2ee4` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `rules/system/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/initialization_protocol.md` | `64877a23` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/language_standard.md` | `b4ccddd1` | 2026-10-02 06:20 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `rules/system/meta_rules.md` | `16f3271a` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/output_standard.md` | `64ca0d98` | 2026-10-02 06:20 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `rules/system/thinking_framework.md` | `497b379b` | 2026-09-16 14:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/agent_life_spec.md` | `7861f68d` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/audit_and_cleanup.md` | `a892a5a2` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/change_flow.md` | `2d7f802e` | 2026-09-24 14:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/component_naming.md` | `035d767e` | 2026-09-16 16:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/page_ledger_specification.md` | `7f5b38c5` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/post_mortem_and_evolution.md` | `95056c52` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/pp_life_orchestration.md` | `fc2e707f` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/risk_disclosure.md` | `1bd00667` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/task_execution_flow.md` | `df4c1e35` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/versioning_standard.md` | `fb5ab805` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `scripts/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/agent_life.mjs` | `9a8dd623` | 2026-09-23 18:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/align_version.mjs` | `a426ba49` | 2026-10-02 00:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/anti_hallucination_audit.mjs` | `a7675d3d` | 2026-10-02 00:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/app_restart.mjs` | `61213193` | 2026-10-02 06:18 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/atomic_lock_audit.mjs` | `c729742f` | 2026-10-02 00:11 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/audit_execution.sh` | `c52519f1` | 2026-10-01 12:38 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/backfill_scope.mjs` | `4ca45358` | 2026-10-02 06:19 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/batch_fix_sidebar_titles.mjs` | `a05c9079` | 2026-09-24 19:03 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/batch_rename_sessions.mjs` | `280a7bff` | 2026-09-23 15:04 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/build_capabilities_index.mjs` | `7e581e10` | 2026-10-01 06:37 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/butler_scheduler.mjs` | `e6a9888b` | 2026-10-02 00:53 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/channel_audit.mjs` | `1bd0ebb6` | 2026-10-01 06:31 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_freshness.mjs` | `ba47c082` | 2026-09-24 13:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_layer_interfaces.mjs` | `54d1de13` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_task_naming.sh` | `dd0c4068` | 2026-09-29 02:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_unique_identifiers.mjs` | `debfb819` | 2026-09-23 18:34 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/conflict_scan.mjs` | `e7d047c9` | 2026-10-01 23:26 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/control.sh` | `7729d039` | 2026-10-02 00:58 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/control_gates.sh` | `def03b61` | 2026-10-02 00:58 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/deepseek_key_setup.sh` | `5b69398f` | 2026-10-01 05:51 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/deepseek_usage_probe.mjs` | `ac69bf1d` | 2026-09-29 02:26 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/disk_check_and_cleanup.sh` | `a49d5115` | 2026-10-01 05:49 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/domain_scope_selftest.mjs` | `384734d2` | 2026-10-02 00:43 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/fingerprint_audit.sh` | `4b21a30d` | 2026-10-01 23:29 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/fingerprint_index.mjs` | `a8153764` | 2026-10-01 23:23 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/flow_control.mjs` | `25f6562e` | 2026-09-29 04:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/gate_selftest.sh` | `3cd99125` | 2026-10-01 05:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/gen_common_chars.mjs` | `e9efe4da` | 2026-10-01 12:38 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/gen_skill_interfaces.mjs` | `90e93576` | 2026-10-01 06:39 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/generate_image.py` | `5733c6d9` | 2026-09-22 21:10 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/generate_naming_plan.mjs` | `181187ff` | 2026-09-23 15:03 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/git_sync_remote.sh` | `fbbc0062` | 2026-10-01 05:49 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/global_scheduler_lock.sh` | `be20ad72` | 2026-10-01 05:49 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/init_dir.sh` | `26de8e54` | 2026-09-24 18:15 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/init_project.sh` | `80abc55d` | 2026-09-24 16:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/install_host_gate.sh` | `29bd58c3` | 2026-10-02 01:03 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/agent_life.interface.json` | `bf6f208d` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/align_version.interface.json` | `758577cb` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/anti_hallucination_audit.interface.json` | `b896973e` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/app_restart.interface.json` | `172c8b04` | 2026-10-02 06:18 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/atomic_lock_audit.interface.json` | `fe64c65f` | 2026-10-01 23:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/audit_execution.interface.json` | `856f8f4c` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/backfill_scope.interface.json` | `1996b985` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/batch_fix_sidebar_titles.interface.json` | `9206c03b` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/batch_rename_sessions.interface.json` | `368f5510` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/build_capabilities_index.interface.json` | `f381903f` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/butler_scheduler.interface.json` | `e9933d87` | 2026-10-02 00:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/channel_audit.interface.json` | `7ffbbe8f` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/check_freshness.interface.json` | `77f3cca1` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/check_layer_interfaces.interface.json` | `f8017ad4` | 2026-10-01 06:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/check_task_naming.interface.json` | `9f3a23b7` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/check_unique_identifiers.interface.json` | `25f7de84` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/conflict_scan.interface.json` | `550f9e63` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/control.interface.json` | `025ee2f2` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/control_gates.interface.json` | `428bdbdf` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/deepseek_key_setup.interface.json` | `67d6d188` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/deepseek_usage_probe.interface.json` | `d3cd9b26` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/disk_check_and_cleanup.interface.json` | `a86db33a` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/domain_scope_selftest.interface.json` | `8740c506` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/fingerprint_audit.interface.json` | `4bd1c494` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/fingerprint_index.interface.json` | `8459f800` | 2026-10-01 23:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/flow_control.interface.json` | `96d667c0` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/gate_selftest.interface.json` | `9ca848a3` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/gen_common_chars.interface.json` | `ae49a4c2` | 2026-10-01 12:46 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/gen_skill_interfaces.interface.json` | `7d402761` | 2026-10-01 06:40 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/generate_image.interface.json` | `5ca4aa6e` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/generate_naming_plan.interface.json` | `503174d4` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/git_sync_remote.interface.json` | `ae4f4288` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/global_scheduler_lock.interface.json` | `e2c8603f` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/init_dir.interface.json` | `68a6560d` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/init_project.interface.json` | `5b9bb9c5` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/install_host_gate.interface.json` | `dbe04fa7` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/language_audit.interface.json` | `35f8be8f` | 2026-10-01 12:46 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/legacy_align_scan.interface.json` | `4e88d93c` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/market_guard_patch.interface.json` | `18f952bf` | 2026-10-02 06:19 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/mechanism_audit.interface.json` | `c27e7ef4` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/name_me.interface.json` | `3f8e3c44` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/naming_watchdog.interface.json` | `bc915b04` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/normalize_all_projects.interface.json` | `63687e79` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/output_audit.interface.json` | `a912c413` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/patch_dsh_todo_progress.interface.json` | `31685614` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/period_parity.interface.json` | `9747e538` | 2026-10-01 23:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/physical_lock.interface.json` | `8b076efe` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/plugin_install_queue.interface.json` | `ba30a8b6` | 2026-10-02 00:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/plugin_reload.interface.json` | `5b4dad7e` | 2026-10-02 06:20 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/plugin_sync.interface.json` | `5b81aadd` | 2026-10-02 00:12 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/probe_long_output.interface.json` | `c587b8e0` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/probe_long_output_stream.interface.json` | `b473b467` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/probe_max_tokens.interface.json` | `5d636002` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/process_supervisor.interface.json` | `2476f2bf` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/progress_ledger.interface.json` | `4f7935f1` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/push_external_projects.interface.json` | `1aec1ac4` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/redundancy_scan.interface.json` | `3943e27f` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/rename_session.interface.json` | `a6043b90` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/req_version_audit.interface.json` | `1bfd5716` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/req_version_gen.interface.json` | `75ce6f81` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/restart_verify.interface.json` | `e14c8733` | 2026-10-01 23:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/restore_skill_pool.interface.json` | `0b70dfb6` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/route_navigate.interface.json` | `75eee50b` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/route_plan.interface.json` | `2ac90e80` | 2026-10-01 06:34 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/scope_audit.interface.json` | `fba69741` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/session_naming_audit.interface.json` | `82530c5a` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/skill_carrier_audit.interface.json` | `ff20cef5` | 2026-10-02 00:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/svg2png.interface.json` | `2737023a` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/sync_api_docs.interface.json` | `ed61782c` | 2026-10-01 23:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/sync_control_requirements.interface.json` | `138d879b` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/task_layer_tree.interface.json` | `3458368c` | 2026-10-02 00:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/test_auto_naming.interface.json` | `f0ab33da` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/test_physical_lock.interface.json` | `d559ec55` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/test_v180_spec.interface.json` | `efc97128` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/todo_gate.interface.json` | `d02185a2` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/todo_panel_audit.interface.json` | `4da3b24a` | 2026-10-02 01:06 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/token_budget_audit.interface.json` | `05f120a4` | 2026-10-02 00:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/verify_auto_naming_e2e.interface.json` | `a7bfb480` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/verify_escape_hatch.interface.json` | `43bd0268` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/verify_guard_live.interface.json` | `f2e66a02` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/language_audit.mjs` | `592f3888` | 2026-10-01 12:38 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/legacy_align_scan.mjs` | `3b888d1f` | 2026-10-02 00:28 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/atomic_lock.mjs` | `4b8af7f7` | 2026-10-01 23:18 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/atomic_lock.sh` | `86f5e3ed` | 2026-10-02 00:11 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/auto_naming.mjs` | `f17076b2` | 2026-09-24 15:02 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/deepseek_balance.mjs` | `58f44292` | 2026-09-29 02:25 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/find_node.sh` | `6a7850da` | 2026-09-29 04:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/gates_config.mjs` | `ac104d81` | 2026-10-01 12:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/host_pid.mjs` | `0b2926b8` | 2026-10-01 23:20 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/mobile_bridge_core.mjs` | `af91e003` | 2026-10-02 00:55 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/output_compactness.mjs` | `db0b635e` | 2026-09-28 08:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/physical_lock.mjs` | `781b9a0d` | 2026-09-29 04:34 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/pricing_fingerprint.mjs` | `c3e3485c` | 2026-10-01 23:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/session_transcript.mjs` | `2b9b689a` | 2026-09-29 04:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/todo_gate_cli.mjs` | `dc994ef1` | 2026-09-29 04:25 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/todo_tracker.mjs` | `15dadcb6` | 2026-09-29 04:25 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/workspace_resolve.mjs` | `4e118a67` | 2026-09-23 14:59 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/market_guard_patch.mjs` | `513e50ee` | 2026-10-02 06:19 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/mechanism_audit.mjs` | `74b0bbac` | 2026-10-02 01:05 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/mobile_bridge.mjs` | `d704fc3e` | 2026-10-02 00:55 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/mobile_bridge_audit.mjs` | `f235d8de` | 2026-10-02 00:57 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/mobile_control.sh` | `6b9bc074` | 2026-10-02 00:55 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/name_me.sh` | `7ca6422f` | 2026-09-29 04:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/naming_watchdog.mjs` | `58df7b3f` | 2026-09-23 15:46 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/normalize_all_projects.mjs` | `5e72ab4e` | 2026-10-02 00:26 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/output_audit.mjs` | `acb9a3f2` | 2026-10-02 00:23 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/patch_dsh_todo_progress.cjs` | `d136c4e7` | 2026-10-01 06:26 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/period_parity.mjs` | `97904a9b` | 2026-10-01 23:23 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/physical_lock.sh` | `51cb94a3` | 2026-10-02 00:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/plugin_install_queue.mjs` | `2d54c89c` | 2026-10-02 06:19 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/plugin_reload.sh` | `51d9ba3e` | 2026-10-02 06:21 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/plugin_sync.sh` | `c8d051f2` | 2026-10-02 01:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/probe_long_output.mjs` | `52c32d04` | 2026-09-23 15:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/probe_long_output_stream.mjs` | `34445721` | 2026-09-23 15:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/probe_max_tokens.mjs` | `6be3205d` | 2026-09-23 15:11 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/process_supervisor.mjs` | `a8f64d39` | 2026-09-29 04:28 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/progress_ledger.mjs` | `ca492f83` | 2026-10-02 00:30 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/push_external_projects.sh` | `9f5a63eb` | 2026-10-02 00:43 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/redundancy_scan.mjs` | `bb95c36c` | 2026-10-01 23:25 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/rename_session.sh` | `bbaa860d` | 2026-09-29 04:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/req_version_audit.mjs` | `5167eb69` | 2026-10-02 00:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/req_version_gen.mjs` | `20cc05fa` | 2026-10-02 00:21 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/restart_verify.mjs` | `8258a35c` | 2026-10-01 23:20 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/restore_skill_pool.mjs` | `959ebea4` | 2026-09-28 08:43 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/route_navigate.mjs` | `f12eda97` | 2026-09-23 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/route_plan.mjs` | `3b592cc3` | 2026-10-01 06:33 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/scope_audit.mjs` | `814b06ab` | 2026-10-02 00:43 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/session_naming_audit.mjs` | `fe353407` | 2026-09-24 18:55 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/skill_carrier_audit.mjs` | `1e851774` | 2026-10-02 00:52 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/svg2png.sh` | `28127071` | 2026-09-22 21:06 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/svg_rasterize.swift` | `3e0357f9` | 2026-09-22 21:06 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/sync_api_docs.mjs` | `fbfcc3fd` | 2026-10-01 23:23 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/sync_control_requirements.mjs` | `06a99a62` | 2026-09-23 16:53 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/task_layer_tree.mjs` | `778fc58e` | 2026-10-02 00:59 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/test_auto_naming.mjs` | `0dc28b62` | 2026-09-23 15:39 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/test_physical_lock.mjs` | `58f9159d` | 2026-09-24 17:59 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/test_v180_spec.sh` | `e33884a7` | 2026-09-23 06:42 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/todo_gate.sh` | `080fadd2` | 2026-09-29 04:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/todo_panel_audit.mjs` | `5bebe038` | 2026-10-02 01:04 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/token_budget_audit.mjs` | `235dae1a` | 2026-10-02 01:08 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/verify_auto_naming_e2e.mjs` | `b69a2c2a` | 2026-09-23 15:41 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/verify_escape_hatch.sh` | `da05a50f` | 2026-09-23 14:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/verify_guard_live.sh` | `0b0c8fac` | 2026-10-01 05:51 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/directory_readme_template.md` | `1778c755` | 2026-09-16 14:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/graphical_block_template.md` | `58acfcfe` | 2026-09-16 15:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/page_ledger_template.md` | `1b82d19d` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `templates/post_mortem_template.md` | `e82b0e43` | 2026-09-16 18:22 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/project_control_shell.sh` | `e7d92cda` | 2026-10-02 00:23 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/project_dsh_bootstrap_template.md` | `a25005a7` | 2026-10-02 00:45 | `v4.29.0` | 🟢 TIER-0 | 最新基线 |
| `templates/requirement_template.md` | `4e86bcf0` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/risk_assessment_template.md` | `84777cc3` | 2026-09-16 18:22 | `-` | ⚪ TIER-2 | 指纹监控中 |

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
