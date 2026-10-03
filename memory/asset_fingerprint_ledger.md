# 全域资产数字指纹与新鲜度审计台账 (Asset Fingerprint Ledger)

> ### 🏷️ **版本信息与实施追踪**
> - **当前台账版本**：`v4.29.10`
> - **基线对齐版本**：`v4.29.10`
> - **最后全盘扫描时间**：2026-10-03 08:24
> - **自动化引擎**：遵循 [`scripts/fingerprint_audit.sh`](../scripts/fingerprint_audit.sh)

本文档记录工程全域受管资产（规则、知识库、架构索引、工程模板、自动化脚本与需求台账）的**数字指纹（SHA-256 8位短哈希）**、**最后修改时间**与**新鲜度等级**，为全域资产对齐与防止暗中代码漂移提供唯一客观事实依据。

---

## 📊 一、新鲜度评级标准与判定矩阵

| 新鲜度评级 | 标识 | 判定准则 | 处置与对齐策略 |
| :--- | :---: | :--- | :--- |
| **完全新鲜 (Fresh)** | 🟢 `TIER-0` | 声明版本与系统最新总基线完全一致 (`v4.29.10`) | 资产处于最优生效态，免修改直接运行 |
| **存量落后 (Stale)** | 🟡 `TIER-1` | 属于正常受管资产，但版本落后于最新基线 | **遇碰即对齐 (Touch-and-Align)**，涉及该模块时顺带升级 |
| **未版本化 (None)** | ⚪ `TIER-2` | 无头部版本元数据区，或属于纯代码/脚本辅助文件 | 保持指纹追踪，必要时补充标准版本头部 |

---

## 🧬 二、全域受管资产数字指纹详细记录表

| 资产相对路径 | 短指纹 (SHA-256) | 最后修改时间 | 声明版本 | 新鲜度评级 | 对齐状态 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `AGENTS.md` | `837fe4a0` | 2026-10-02 09:10 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `README.md` | `55e6c41c` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `ai-control/README.md` | `575db13c` | 2026-10-02 09:12 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/flow_graph.json` | `712a73fe` | 2026-10-03 08:20 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/flow_router.conf.json` | `79dea4af` | 2026-10-03 08:15 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/gates.conf` | `55c17bf7` | 2026-10-02 09:05 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/ledger_drift_exempt.txt` | `2765c28b` | 2026-10-02 06:58 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/legacy_align_exempt.txt` | `341d4788` | 2026-10-01 05:49 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `ai-control/config/naming_overrides.json` | `bfbbbe56` | 2026-09-23 15:43 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/skill_carrier_exempt.txt` | `0e9ccfd6` | 2026-10-02 00:53 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/token_budget.conf` | `387fbef0` | 2026-10-02 07:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/token_budget_cases.json` | `51d90e3e` | 2026-10-02 00:55 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/token_budget_growth_exempt.txt` | `9a85e68a` | 2026-10-03 08:04 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/lib/host_identity.mjs` | `8a65acc3` | 2026-10-02 00:05 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/cordis.patch.yml` | `278de8b0` | 2026-10-02 01:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/index.mjs` | `78e28874` | 2026-10-02 07:31 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/loader.mjs` | `6290a5f4` | 2026-09-28 08:46 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/package.json` | `ed1fd92b` | 2026-10-02 01:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/selftest.mjs` | `f7bf3f9e` | 2026-09-28 08:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/requirements/README.md` | `45e1a570` | 2026-10-01 05:49 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `ai-control/requirements/control_requirements_ledger.md` | `422710cb` | 2026-10-01 23:24 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `ai-control/requirements/req_versions.json` | `5c48ddb7` | 2026-10-03 08:02 | `v1.0.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/constraint_mechanism_enhance_2.md` | `539787a2` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_10.md` | `d4b7aac8` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_11.md` | `631eddcb` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_12.md` | `76b2fbb7` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_13.md` | `e6aab68f` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_14.md` | `0db4aa74` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_15.md` | `b71a741f` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_16.md` | `a1287799` | 2026-10-03 08:23 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_3.md` | `a66e2202` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_4.md` | `f7ad5cac` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_5.md` | `21e42143` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_6.md` | `038e8833` | 2026-10-03 08:18 | `v4.29.10
v4.25.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/constraint_mechanism_optimize_7.md` | `7d8b593b` | 2026-10-03 08:18 | `v4.29.10
v4.25.0
v4.26.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/constraint_mechanism_optimize_8.md` | `d06f2c74` | 2026-10-03 08:18 | `v4.29.10
v4.27.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/constraint_mechanism_optimize_9.md` | `3f81399d` | 2026-10-03 08:18 | `v4.29.10
v4.28.0
v4.29.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/constraint_mechanism_spec.md` | `6ddc71a4` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `docs/diagram_generation_guide.md` | `66a10807` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `docs/memory_architecture.md` | `a35e10e8` | 2026-09-16 16:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/mobile_control_dsh.md` | `26e167f5` | 2026-10-03 08:18 | `v4.29.10
v4.30.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/requirements.md` | `5b1398c6` | 2026-10-03 08:23 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `docs/rules_tutorial.md` | `f71ad4d9` | 2026-09-16 14:41 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/visual_learning_research.md` | `b7da6f44` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `indexes/.gitkeep` | `e3b0c442` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/README.md` | `fdcd7814` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/capabilities_index.json` | `dc653bb4` | 2026-10-03 08:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/capabilities_index.md` | `050f9777` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `indexes/dsh_capabilities.md` | `eb406719` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `indexes/extension_ecosystem.md` | `392d3720` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `indexes/navigation_router.md` | `4a7ba94b` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `indexes/rules_index.md` | `250d553a` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `indexes/shortcuts_index.md` | `8ec3dc03` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `indexes/tool_interfaces.md` | `3911c4e8` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/.gitkeep` | `e3b0c442` | 2026-09-16 16:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/README.md` | `1b762831` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/api/deepseek/README.md` | `861a11b6` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/api/deepseek/index.json` | `a0ff1962` | 2026-10-01 23:23 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/art_specification.md` | `b82cd885` | 2026-09-16 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/common/README.md` | `60f06c6d` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/art_specification.md` | `678153ac` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/capability_naming_spec.md` | `073ab700` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/component_asset_reference.md` | `2ceb05a2` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/dsh_native_ui_components.md` | `6777a48e` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/engineering_specification.md` | `1a892bca` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/execution_layer_interface_spec.md` | `021280f8` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/first_principles_specification.md` | `3ab45ab0` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/interaction_specification.md` | `7e0c0f25` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/miniprogram_specification.md` | `421073d0` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/readability_specification.md` | `5110560f` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/task_naming_spec.md` | `c1929cb2` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/unity_specification.md` | `3d7b2453` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/web_specification.md` | `3cf4e04c` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/engineering_specification.md` | `20cc65f0` | 2026-09-16 18:02 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/projects/README.md` | `f891dc44` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/README.md` | `c1492634` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/project_art_spec.md` | `316b7281` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/project_engineering_spec.md` | `b49ff25b` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/worldview.md` | `7c2e226e` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `knowledge/sources/README.md` | `f11de24d` | 2026-10-01 06:31 | `v4.24.0
v4.25.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/sources/SOURCE-001-dont-make-me-think.md` | `3d6262f2` | 2026-10-01 06:25 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/sources/SOURCE-002-gestalt-psychology.md` | `f35964b2` | 2026-10-01 06:25 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/worldview_background.md` | `075b4ce3` | 2026-09-16 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/.gitkeep` | `e3b0c442` | 2026-09-16 15:37 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/README.md` | `2778de38` | 2026-09-16 15:37 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/context_memory.md` | `9a54428f` | 2026-09-23 15:04 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/efficiency_audit_log.md` | `21b5c334` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `memory/error_ledger.md` | `ca8a8e7f` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `memory/lessons_learned.md` | `b5776898` | 2026-09-23 15:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/README.md` | `fb0cb9f8` | 2026-09-22 20:12 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/coding/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/coding/atomicity_specification.md` | `7cadc585` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/first_principles_verification.md` | `4d8de6f3` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/testing_and_quality_gate.md` | `3d270c08` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/token_and_local_compute_optimization.md` | `5e720d73` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/unity_project_standard.md` | `7296566f` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/security/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/security/security_baseline.md` | `cca4e427` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/system/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/discipline_score.md` | `b173c3d0` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/system/initialization_protocol.md` | `cc35f7e9` | 2026-10-02 08:19 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/language_standard.md` | `4da4bba1` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/system/meta_rules.md` | `35e47315` | 2026-10-03 08:18 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/output_standard.md` | `b0cbaae0` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/system/thinking_framework.md` | `497b379b` | 2026-09-16 14:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/agent_life_spec.md` | `42341133` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/audit_and_cleanup.md` | `3ca046ec` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/change_flow.md` | `2d7f802e` | 2026-09-24 14:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/component_naming.md` | `035d767e` | 2026-09-16 16:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/page_ledger_specification.md` | `3bfc5e43` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/post_mortem_and_evolution.md` | `0d3d56e8` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/pp_life_orchestration.md` | `7593ca2c` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/risk_disclosure.md` | `a78cb067` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/task_execution_flow.md` | `db4a1fe6` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/versioning_standard.md` | `49330adc` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `scripts/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/agent_life.mjs` | `9a8dd623` | 2026-09-23 18:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/align_version.mjs` | `a426ba49` | 2026-10-02 00:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/anti_hallucination_audit.mjs` | `a7675d3d` | 2026-10-02 00:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/app_restart.mjs` | `61213193` | 2026-10-02 06:18 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/atomic_lock_audit.mjs` | `c729742f` | 2026-10-02 00:11 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/audit_execution.sh` | `f9ce4265` | 2026-10-03 07:14 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/backfill_scope.mjs` | `9a4a0874` | 2026-10-02 09:08 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/backup_gc.mjs` | `10e5f794` | 2026-10-03 07:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/backup_writer_probe.mjs` | `13091962` | 2026-10-03 07:50 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/batch_fix_sidebar_titles.mjs` | `a05c9079` | 2026-09-24 19:03 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/batch_rename_sessions.mjs` | `280a7bff` | 2026-09-23 15:04 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/build_capabilities_index.mjs` | `7e581e10` | 2026-10-01 06:37 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/butler_scheduler.mjs` | `e6a9888b` | 2026-10-02 00:53 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/channel_audit.mjs` | `1bd0ebb6` | 2026-10-01 06:31 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_freshness.mjs` | `ba47c082` | 2026-09-24 13:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_layer_interfaces.mjs` | `54d1de13` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_task_naming.sh` | `dd0c4068` | 2026-09-29 02:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_unique_identifiers.mjs` | `debfb819` | 2026-09-23 18:34 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/chinese_output_audit.mjs` | `ebb47ce7` | 2026-10-03 07:15 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/cli_plan_audit.mjs` | `250dde4a` | 2026-10-02 08:19 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/conflict_scan.mjs` | `e7d047c9` | 2026-10-01 23:26 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/control.sh` | `7729d039` | 2026-10-02 00:58 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/control_gates.sh` | `f79f86c2` | 2026-10-02 09:06 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/deepseek_key_setup.sh` | `5b69398f` | 2026-10-01 05:51 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/deepseek_usage_probe.mjs` | `ac69bf1d` | 2026-09-29 02:26 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/discipline_guard_probe.mjs` | `7a8844ce` | 2026-10-03 06:59 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/discipline_score.mjs` | `32fb2605` | 2026-10-03 08:22 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/disk_check_and_cleanup.sh` | `a49d5115` | 2026-10-01 05:49 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/domain_scope_selftest.mjs` | `384734d2` | 2026-10-02 00:43 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/fingerprint_audit.sh` | `4b21a30d` | 2026-10-01 23:29 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/fingerprint_index.mjs` | `a8153764` | 2026-10-01 23:23 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/flow_control.mjs` | `0f64b92c` | 2026-10-03 08:20 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/flow_router.mjs` | `948d66bd` | 2026-10-03 08:20 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/gate_selftest.sh` | `3cd99125` | 2026-10-01 05:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/gen_common_chars.mjs` | `e9efe4da` | 2026-10-01 12:38 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/gen_control_map.mjs` | `be591fc2` | 2026-10-02 09:09 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/gen_skill_interfaces.mjs` | `90e93576` | 2026-10-01 06:39 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/generate_image.py` | `5733c6d9` | 2026-09-22 21:10 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/generate_naming_plan.mjs` | `181187ff` | 2026-09-23 15:03 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/git_sync_remote.sh` | `fbbc0062` | 2026-10-01 05:49 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/global_scheduler_lock.sh` | `be20ad72` | 2026-10-01 05:49 | `v4.24.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/init_dir.sh` | `26de8e54` | 2026-09-24 18:15 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/init_project.sh` | `9694a356` | 2026-10-02 08:19 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/install_host_gate.sh` | `f3c983cc` | 2026-10-03 07:21 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/agent_life.interface.json` | `bf6f208d` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/align_version.interface.json` | `758577cb` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/anti_hallucination_audit.interface.json` | `b896973e` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/app_restart.interface.json` | `172c8b04` | 2026-10-02 06:18 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/atomic_lock_audit.interface.json` | `fe64c65f` | 2026-10-01 23:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/audit_execution.interface.json` | `856f8f4c` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/backfill_scope.interface.json` | `1996b985` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/backup_gc.interface.json` | `2ce6055f` | 2026-10-03 07:16 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/backup_writer_probe.interface.json` | `ee01886d` | 2026-10-03 07:50 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/batch_fix_sidebar_titles.interface.json` | `9206c03b` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/batch_rename_sessions.interface.json` | `368f5510` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/build_capabilities_index.interface.json` | `f381903f` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/butler_scheduler.interface.json` | `e9933d87` | 2026-10-02 00:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/channel_audit.interface.json` | `7ffbbe8f` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/check_freshness.interface.json` | `77f3cca1` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/check_layer_interfaces.interface.json` | `f8017ad4` | 2026-10-01 06:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/check_task_naming.interface.json` | `9f3a23b7` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/check_unique_identifiers.interface.json` | `25f7de84` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/chinese_output_audit.interface.json` | `15f5d7e6` | 2026-10-03 07:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/cli_plan_audit.interface.json` | `785ef670` | 2026-10-02 08:19 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/conflict_scan.interface.json` | `550f9e63` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/control.interface.json` | `025ee2f2` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/control_gates.interface.json` | `428bdbdf` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/deepseek_key_setup.interface.json` | `67d6d188` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/deepseek_usage_probe.interface.json` | `d3cd9b26` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/discipline_guard_probe.interface.json` | `045e0e47` | 2026-10-03 06:59 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/discipline_score.interface.json` | `f9b2ce4a` | 2026-10-02 09:09 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/disk_check_and_cleanup.interface.json` | `a86db33a` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/domain_scope_selftest.interface.json` | `8740c506` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/fingerprint_audit.interface.json` | `4bd1c494` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/fingerprint_index.interface.json` | `8459f800` | 2026-10-01 23:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/flow_control.interface.json` | `96d667c0` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/flow_router.interface.json` | `3ee8cbbd` | 2026-10-03 08:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/gate_selftest.interface.json` | `9ca848a3` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/gen_common_chars.interface.json` | `ae49a4c2` | 2026-10-01 12:46 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/gen_control_map.interface.json` | `833e2cf8` | 2026-10-02 08:04 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/gen_skill_interfaces.interface.json` | `7d402761` | 2026-10-01 06:40 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/generate_image.interface.json` | `5ca4aa6e` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/generate_naming_plan.interface.json` | `503174d4` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/git_sync_remote.interface.json` | `ae4f4288` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/global_scheduler_lock.interface.json` | `e2c8603f` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/init_dir.interface.json` | `68a6560d` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/init_project.interface.json` | `5b9bb9c5` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/install_host_gate.interface.json` | `95ab1bfd` | 2026-10-02 07:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/knowledge_audit.interface.json` | `1b3b5379` | 2026-10-02 08:19 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/language_audit.interface.json` | `35f8be8f` | 2026-10-01 12:46 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/legacy_align_scan.interface.json` | `4e88d93c` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/market_guard_patch.interface.json` | `18f952bf` | 2026-10-02 06:19 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/mechanism_audit.interface.json` | `c27e7ef4` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/mobile_bridge.interface.json` | `3e19d803` | 2026-10-02 07:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/mobile_bridge_audit.interface.json` | `92b102f9` | 2026-10-02 07:28 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/mobile_control.interface.json` | `d129b3d3` | 2026-10-02 07:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
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
| `scripts/interfaces/req_new.interface.json` | `a11073d2` | 2026-10-02 08:00 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/req_version_audit.interface.json` | `1bfd5716` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/req_version_gen.interface.json` | `75ce6f81` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/restart_verify.interface.json` | `e14c8733` | 2026-10-01 23:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/restore_skill_pool.interface.json` | `0b70dfb6` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/route_navigate.interface.json` | `75eee50b` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/route_plan.interface.json` | `2ac90e80` | 2026-10-01 06:34 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/scope_audit.interface.json` | `fba69741` | 2026-10-02 00:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/session_naming_audit.interface.json` | `82530c5a` | 2026-10-01 06:27 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/session_source_audit.interface.json` | `b5a31ab0` | 2026-10-02 07:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/skill_carrier_audit.interface.json` | `ff20cef5` | 2026-10-02 00:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/interfaces/strategy_layer_audit.interface.json` | `191821b8` | 2026-10-02 08:19 | `-` | ⚪ TIER-2 | 指纹监控中 |
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
| `scripts/knowledge_audit.mjs` | `afef1317` | 2026-10-02 08:18 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/language_audit.mjs` | `592f3888` | 2026-10-01 12:38 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/legacy_align_scan.mjs` | `3b888d1f` | 2026-10-02 00:28 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/atomic_lock.mjs` | `4b8af7f7` | 2026-10-01 23:18 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/atomic_lock.sh` | `86f5e3ed` | 2026-10-02 00:11 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/auto_naming.mjs` | `8e391a67` | 2026-10-02 07:39 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/backup_retention.mjs` | `dfc13fab` | 2026-10-03 07:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/backup_retention.sh` | `92d6c08e` | 2026-10-03 07:14 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/deepseek_balance.mjs` | `58f44292` | 2026-09-29 02:25 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/find_node.sh` | `6a7850da` | 2026-09-29 04:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/gates_config.mjs` | `ac104d81` | 2026-10-01 12:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/host_pid.mjs` | `0b2926b8` | 2026-10-01 23:20 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/mobile_bridge_core.mjs` | `10633832` | 2026-10-02 06:57 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/output_compactness.mjs` | `db0b635e` | 2026-09-28 08:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/physical_lock.mjs` | `781b9a0d` | 2026-09-29 04:34 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/pricing_fingerprint.mjs` | `c3e3485c` | 2026-10-01 23:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/session_source.mjs` | `c003fafa` | 2026-10-02 07:28 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/session_transcript.mjs` | `2b9b689a` | 2026-09-29 04:24 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/todo_gate_cli.mjs` | `dc994ef1` | 2026-09-29 04:25 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/todo_tracker.mjs` | `15dadcb6` | 2026-09-29 04:25 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/workspace_resolve.mjs` | `4e118a67` | 2026-09-23 14:59 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/market_guard_patch.mjs` | `f135ef8b` | 2026-10-03 07:16 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/mechanism_audit.mjs` | `74b0bbac` | 2026-10-02 01:05 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/mobile_bridge.mjs` | `11c999e3` | 2026-10-02 06:57 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/mobile_bridge_audit.mjs` | `0ac3d6df` | 2026-10-02 06:57 | `-` | ⚪ TIER-2 | 指纹监控中 |
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
| `scripts/plugin_sync.sh` | `1640cdd1` | 2026-10-03 07:15 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/probe_long_output.mjs` | `52c32d04` | 2026-09-23 15:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/probe_long_output_stream.mjs` | `34445721` | 2026-09-23 15:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/probe_max_tokens.mjs` | `6be3205d` | 2026-09-23 15:11 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/process_supervisor.mjs` | `859d34c0` | 2026-10-02 09:18 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/progress_ledger.mjs` | `ca492f83` | 2026-10-02 00:30 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/push_external_projects.sh` | `9f5a63eb` | 2026-10-02 00:43 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/redundancy_scan.mjs` | `2b44575a` | 2026-10-02 08:03 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/rename_session.sh` | `bbaa860d` | 2026-09-29 04:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/req_new.mjs` | `16a64acd` | 2026-10-02 08:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/req_version_audit.mjs` | `5167eb69` | 2026-10-02 00:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/req_version_gen.mjs` | `20cc05fa` | 2026-10-02 00:21 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/restart_verify.mjs` | `8258a35c` | 2026-10-01 23:20 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/restore_skill_pool.mjs` | `5d46e975` | 2026-10-03 07:16 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/route_navigate.mjs` | `f12eda97` | 2026-09-23 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/route_plan.mjs` | `3b592cc3` | 2026-10-01 06:33 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/scope_audit.mjs` | `814b06ab` | 2026-10-02 09:02 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/session_naming_audit.mjs` | `9aea7295` | 2026-10-02 07:39 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/session_source_audit.mjs` | `1b039617` | 2026-10-02 07:33 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/skill_carrier_audit.mjs` | `1e851774` | 2026-10-02 00:52 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/strategy_layer_audit.mjs` | `48141c41` | 2026-10-02 08:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
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
| `scripts/token_budget_audit.mjs` | `706c663e` | 2026-10-02 06:41 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/verify_auto_naming_e2e.mjs` | `b69a2c2a` | 2026-09-23 15:41 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/verify_escape_hatch.sh` | `da05a50f` | 2026-09-23 14:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/verify_guard_live.sh` | `0b0c8fac` | 2026-10-01 05:51 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/cli_plan_template.md` | `23a4c364` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `templates/directory_readme_template.md` | `1778c755` | 2026-09-16 14:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/graphical_block_template.md` | `58acfcfe` | 2026-09-16 15:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/page_ledger_template.md` | `bd77878f` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `templates/post_mortem_template.md` | `e82b0e43` | 2026-09-16 18:22 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/project_control_shell.sh` | `e7d92cda` | 2026-10-02 00:23 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/project_dsh_bootstrap_template.md` | `8cce7b47` | 2026-10-03 08:18 | `v4.29.10` | 🟢 TIER-0 | 最新基线 |
| `templates/requirement_template.md` | `d2394b7f` | 2026-10-03 08:18 | `-` | ⚪ TIER-2 | 指纹监控中 |
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
