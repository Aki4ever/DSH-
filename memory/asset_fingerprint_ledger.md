# 全域资产数字指纹与新鲜度审计台账 (Asset Fingerprint Ledger)

> ### 🏷️ **版本信息与实施追踪**
> - **当前台账版本**：`v3.1.0`
> - **基线对齐版本**：`v3.1.0`
> - **最后全盘扫描时间**：2026-09-23 15:26
> - **自动化引擎**：遵循 [`scripts/fingerprint_audit.sh`](../scripts/fingerprint_audit.sh)

本文档记录工程全域受管资产（规则、知识库、架构索引、工程模板、自动化脚本与需求台账）的**数字指纹（SHA-256 8位短哈希）**、**最后修改时间**与**新鲜度等级**，为全域资产对齐与防止暗中代码漂移提供唯一客观事实依据。

---

## 📊 一、新鲜度评级标准与判定矩阵

| 新鲜度评级 | 标识 | 判定准则 | 处置与对齐策略 |
| :--- | :---: | :--- | :--- |
| **完全新鲜 (Fresh)** | 🟢 `TIER-0` | 声明版本与系统最新总基线完全一致 (`v3.1.0`) | 资产处于最优生效态，免修改直接运行 |
| **存量落后 (Stale)** | 🟡 `TIER-1` | 属于正常受管资产，但版本落后于最新基线 | **遇碰即对齐 (Touch-and-Align)**，涉及该模块时顺带升级 |
| **未版本化 (None)** | ⚪ `TIER-2` | 无头部版本元数据区，或属于纯代码/脚本辅助文件 | 保持指纹追踪，必要时补充标准版本头部 |

---

## 🧬 二、全域受管资产数字指纹详细记录表

| 资产相对路径 | 短指纹 (SHA-256) | 最后修改时间 | 声明版本 | 新鲜度评级 | 对齐状态 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `rules/README.md` | `fb0cb9f8` | 2026-09-22 20:12 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/coding/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/coding/atomicity_specification.md` | `31b35211` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/testing_and_quality_gate.md` | `44778a1d` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/unity_project_standard.md` | `035b7226` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `rules/security/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/security/security_baseline.md` | `966d6876` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `rules/system/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/initialization_protocol.md` | `64877a23` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/language_standard.md` | `0e957c13` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `rules/system/meta_rules.md` | `e3b8e30a` | 2026-09-23 09:30 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/thinking_framework.md` | `497b379b` | 2026-09-16 14:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/audit_and_cleanup.md` | `49fb5fe2` | 2026-09-16 19:03 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/change_flow.md` | `055af98e` | 2026-09-23 06:43 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/component_naming.md` | `035d767e` | 2026-09-16 16:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/page_ledger_specification.md` | `a7e3b270` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/post_mortem_and_evolution.md` | `96ae13e7` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/risk_disclosure.md` | `3ad46f6d` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/task_execution_flow.md` | `984f3746` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/versioning_standard.md` | `a156d7fd` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/.gitkeep` | `e3b0c442` | 2026-09-16 16:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/README.md` | `0bd1bb00` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/art_specification.md` | `b82cd885` | 2026-09-16 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/common/README.md` | `d725bcb4` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/art_specification.md` | `da711975` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/dsh_native_ui_components.md` | `5aa7da32` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/engineering_specification.md` | `d37d8c73` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/interaction_specification.md` | `84bf2756` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/miniprogram_specification.md` | `e6289028` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/unity_specification.md` | `e388cbe9` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/web_specification.md` | `2d1e9d1a` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/engineering_specification.md` | `20cc65f0` | 2026-09-16 18:02 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/projects/README.md` | `3556e629` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/README.md` | `e35e46bb` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/project_art_spec.md` | `cc56f5d9` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/project_engineering_spec.md` | `6401211c` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/worldview.md` | `3d7e5128` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/worldview_background.md` | `075b4ce3` | 2026-09-16 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/.gitkeep` | `e3b0c442` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/README.md` | `fdcd7814` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/dsh_capabilities.md` | `3dc53813` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/extension_ecosystem.md` | `365942fe` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/rules_index.md` | `17eaa524` | 2026-09-23 14:13 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/shortcuts_index.md` | `4d727509` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/tool_interfaces.md` | `57e405ef` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `templates/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/directory_readme_template.md` | `1778c755` | 2026-09-16 14:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/graphical_block_template.md` | `58acfcfe` | 2026-09-16 15:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/page_ledger_template.md` | `3de06b04` | 2026-09-23 09:50 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `templates/post_mortem_template.md` | `e82b0e43` | 2026-09-16 18:22 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/project_dsh_bootstrap_template.md` | `da22f65f` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `templates/requirement_template.md` | `a7b212cf` | 2026-09-16 16:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/risk_assessment_template.md` | `84777cc3` | 2026-09-16 18:22 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/align_version.mjs` | `60211b77` | 2026-09-23 06:43 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/batch_rename_sessions.mjs` | `280a7bff` | 2026-09-23 15:04 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/channel_audit.mjs` | `eaf40879` | 2026-09-22 22:33 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/check_task_naming.sh` | `c7c493b9` | 2026-09-23 15:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/conflict_scan.mjs` | `cfc907bd` | 2026-09-23 09:30 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/control_gates.sh` | `cafdec3c` | 2026-09-23 07:59 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/disk_check_and_cleanup.sh` | `0d13cf4b` | 2026-09-23 09:50 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `scripts/fingerprint_audit.sh` | `2d0ee459` | 2026-09-23 09:50 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `scripts/generate_image.py` | `5733c6d9` | 2026-09-22 21:10 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/generate_naming_plan.mjs` | `181187ff` | 2026-09-23 15:03 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/git_sync_remote.sh` | `720c8d01` | 2026-09-23 09:50 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `scripts/global_scheduler_lock.sh` | `b51f5deb` | 2026-09-23 09:50 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `scripts/init_dir.sh` | `9bc60177` | 2026-09-16 14:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/legacy_align_scan.mjs` | `cc755ad0` | 2026-09-23 07:57 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/lib/workspace_resolve.mjs` | `4e118a67` | 2026-09-23 14:59 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/probe_long_output.mjs` | `52c32d04` | 2026-09-23 15:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/probe_long_output_stream.mjs` | `34445721` | 2026-09-23 15:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/probe_max_tokens.mjs` | `6be3205d` | 2026-09-23 15:11 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/redundancy_scan.mjs` | `66e7d395` | 2026-09-23 07:57 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/rename_session.sh` | `e5d90630` | 2026-09-23 14:51 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/session_naming_audit.mjs` | `dcbd97f5` | 2026-09-23 15:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/svg2png.sh` | `28127071` | 2026-09-22 21:06 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/svg_rasterize.swift` | `3e0357f9` | 2026-09-22 21:06 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/test_v180_spec.sh` | `e33884a7` | 2026-09-23 06:42 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/verify_escape_hatch.sh` | `da05a50f` | 2026-09-23 14:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/verify_guard_live.sh` | `35e23bfa` | 2026-09-23 14:11 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/constraint_mechanism_enhance_2.md` | `7fd56882` | 2026-09-23 09:50 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_optimize_3.md` | `7d8ebbd4` | 2026-09-23 14:12 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `docs/constraint_mechanism_spec.md` | `7b87ec98` | 2026-09-23 09:50 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `docs/diagram_generation_guide.md` | `7b345269` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `docs/memory_architecture.md` | `a35e10e8` | 2026-09-16 16:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/requirements.md` | `c79f4dff` | 2026-09-23 08:08 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/rules_tutorial.md` | `f71ad4d9` | 2026-09-16 14:41 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/visual_learning_research.md` | `be7ee037` | 2026-09-23 09:32 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `ai-control/README.md` | `7880d8f3` | 2026-09-23 06:43 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/gates.conf` | `d686ec33` | 2026-09-22 20:11 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/legacy_align_exempt.txt` | `4acab986` | 2026-09-23 09:32 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `ai-control/plugin/index.mjs` | `dd44f8f0` | 2026-09-23 15:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/loader.mjs` | `13ef6615` | 2026-09-23 07:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/selftest.mjs` | `d0fdb221` | 2026-09-23 14:13 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/.gitkeep` | `e3b0c442` | 2026-09-16 15:37 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/README.md` | `2778de38` | 2026-09-16 15:37 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/asset_fingerprint_ledger.md` | `fd513a57` | 2026-09-23 14:13 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `memory/context_memory.md` | `4abba659` | 2026-09-16 16:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `memory/efficiency_audit_log.md` | `0ead8330` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |
| `memory/lessons_learned.md` | `91c66693` | 2026-09-22 21:15 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `AGENTS.md` | `0242c347` | 2026-09-22 20:54 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `README.md` | `906ef0dd` | 2026-09-23 08:09 | `v3.1.0` | 🟢 TIER-0 | 最新基线 |

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
