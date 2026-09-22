# 全域资产数字指纹与新鲜度审计台账 (Asset Fingerprint Ledger)

> ### 🏷️ **版本信息与实施追踪**
> - **当前台账版本**：`v2.9.0`
> - **基线对齐版本**：`v2.9.0`
> - **最后全盘扫描时间**：2026-09-22 21:47
> - **自动化引擎**：遵循 [`scripts/fingerprint_audit.sh`](../scripts/fingerprint_audit.sh)

本文档记录工程全域受管资产（规则、知识库、架构索引、工程模板、自动化脚本与需求台账）的**数字指纹（SHA-256 8位短哈希）**、**最后修改时间**与**新鲜度等级**，为全域资产对齐与防止暗中代码漂移提供唯一客观事实依据。

---

## 📊 一、新鲜度评级标准与判定矩阵

| 新鲜度评级 | 标识 | 判定准则 | 处置与对齐策略 |
| :--- | :---: | :--- | :--- |
| **完全新鲜 (Fresh)** | 🟢 `TIER-0` | 声明版本与系统最新总基线完全一致 (`v2.9.0`) | 资产处于最优生效态，免修改直接运行 |
| **存量落后 (Stale)** | 🟡 `TIER-1` | 属于正常受管资产，但版本落后于最新基线 | **遇碰即对齐 (Touch-and-Align)**，涉及该模块时顺带升级 |
| **未版本化 (None)** | ⚪ `TIER-2` | 无头部版本元数据区，或属于纯代码/脚本辅助文件 | 保持指纹追踪，必要时补充标准版本头部 |

---

## 🧬 二、全域受管资产数字指纹详细记录表

| 资产相对路径 | 短指纹 (SHA-256) | 最后修改时间 | 声明版本 | 新鲜度评级 | 对齐状态 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `rules/README.md` | `fb0cb9f8` | 2026-09-22 20:12 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/coding/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/coding/atomicity_specification.md` | `11537623` | 2026-09-22 21:11 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/testing_and_quality_gate.md` | `3f3ef95c` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `rules/coding/unity_project_standard.md` | `5607f2dc` | 2026-09-22 21:11 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `rules/security/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/security/security_baseline.md` | `c1ea3870` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `rules/system/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/initialization_protocol.md` | `64877a23` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/system/language_standard.md` | `c258d040` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `rules/system/meta_rules.md` | `1324762b` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `rules/system/thinking_framework.md` | `497b379b` | 2026-09-16 14:47 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/audit_and_cleanup.md` | `49fb5fe2` | 2026-09-16 19:03 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/change_flow.md` | `9b3a607d` | 2026-09-16 19:04 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/component_naming.md` | `035d767e` | 2026-09-16 16:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `rules/workflow/page_ledger_specification.md` | `95373d3b` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/post_mortem_and_evolution.md` | `b7719ea7` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/risk_disclosure.md` | `adf2a469` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/task_execution_flow.md` | `e2a2edfe` | 2026-09-22 20:57 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `rules/workflow/versioning_standard.md` | `7d3f6291` | 2026-09-22 21:22 | `v1.0.0
v2.0.0` | 🟡 TIER-1 | 待升级对齐 |
| `knowledge/.gitkeep` | `e3b0c442` | 2026-09-16 16:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/README.md` | `1291d822` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/art_specification.md` | `b82cd885` | 2026-09-16 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/common/README.md` | `5e70dd59` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/art_specification.md` | `9f406f61` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/dsh_native_ui_components.md` | `497e860b` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/engineering_specification.md` | `cefaa715` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/interaction_specification.md` | `9f055dfc` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/miniprogram_specification.md` | `9b926839` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/unity_specification.md` | `56036c7c` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/common/web_specification.md` | `13ba52d7` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/engineering_specification.md` | `20cc65f0` | 2026-09-16 18:02 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `knowledge/projects/README.md` | `860140d8` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/README.md` | `3d6a5c14` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/project_art_spec.md` | `1d164e13` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/project_engineering_spec.md` | `58d2f9e8` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/projects/aether_echo/worldview.md` | `0e65164d` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `knowledge/worldview_background.md` | `075b4ce3` | 2026-09-16 18:01 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/.gitkeep` | `e3b0c442` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/README.md` | `fdcd7814` | 2026-09-16 15:36 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `indexes/dsh_capabilities.md` | `47f7f7d1` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/extension_ecosystem.md` | `4b97857c` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/rules_index.md` | `a15e5a46` | 2026-09-22 20:56 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/shortcuts_index.md` | `112e9a4d` | 2026-09-22 21:12 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `indexes/tool_interfaces.md` | `6aae322f` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `templates/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/directory_readme_template.md` | `1778c755` | 2026-09-16 14:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/graphical_block_template.md` | `58acfcfe` | 2026-09-16 15:45 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/page_ledger_template.md` | `5dfbd96e` | 2026-09-16 18:22 | `v1.0.0` | 🟡 TIER-1 | 待升级对齐 |
| `templates/post_mortem_template.md` | `e82b0e43` | 2026-09-16 18:22 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/project_dsh_bootstrap_template.md` | `580882c1` | 2026-09-22 21:19 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `templates/requirement_template.md` | `a7b212cf` | 2026-09-16 16:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `templates/risk_assessment_template.md` | `84777cc3` | 2026-09-16 18:22 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/conflict_scan.mjs` | `0f6b546a` | 2026-09-22 21:29 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/control_gates.sh` | `0a418b61` | 2026-09-22 20:41 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/disk_check_and_cleanup.sh` | `053f8584` | 2026-09-16 19:03 | `v2.0.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/fingerprint_audit.sh` | `cc27085b` | 2026-09-22 20:40 | `v2.3.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/generate_image.py` | `5733c6d9` | 2026-09-22 21:10 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/git_sync_remote.sh` | `0f701aa9` | 2026-09-17 17:21 | `v2.4.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/global_scheduler_lock.sh` | `46d4c160` | 2026-09-18 17:28 | `v2.6.0` | 🟡 TIER-1 | 待升级对齐 |
| `scripts/init_dir.sh` | `9bc60177` | 2026-09-16 14:56 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/legacy_align_scan.mjs` | `4e0a6b66` | 2026-09-22 21:33 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/redundancy_scan.mjs` | `1113b8a0` | 2026-09-22 20:11 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/rename_session.sh` | `9303adf2` | 2026-09-16 15:35 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/svg2png.sh` | `28127071` | 2026-09-22 21:06 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/svg_rasterize.swift` | `3e0357f9` | 2026-09-22 21:06 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `scripts/test_v180_spec.sh` | `500bf0cf` | 2026-09-16 18:24 | `v1.8.0` | 🟡 TIER-1 | 待升级对齐 |
| `docs/.gitkeep` | `e3b0c442` | 2026-09-16 14:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/constraint_mechanism_spec.md` | `bc4179b9` | 2026-09-22 21:46 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `docs/diagram_generation_guide.md` | `6b91cf09` | 2026-09-22 20:52 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `docs/memory_architecture.md` | `a35e10e8` | 2026-09-16 16:17 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `docs/requirements.md` | `25e0e5ff` | 2026-09-22 21:45 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |
| `docs/rules_tutorial.md` | `f71ad4d9` | 2026-09-16 14:41 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/README.md` | `567aaba4` | 2026-09-22 20:55 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/config/gates.conf` | `d686ec33` | 2026-09-22 20:11 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/index.mjs` | `6342b3ea` | 2026-09-22 20:31 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/loader.mjs` | `211d2767` | 2026-09-22 20:16 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `ai-control/plugin/selftest.mjs` | `84a63ca7` | 2026-09-22 20:31 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `AGENTS.md` | `0242c347` | 2026-09-22 20:54 | `-` | ⚪ TIER-2 | 指纹监控中 |
| `README.md` | `6f7d8e9e` | 2026-09-22 21:36 | `v2.9.0` | 🟢 TIER-0 | 最新基线 |

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
