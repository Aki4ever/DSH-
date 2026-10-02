# 全局规则与体系全景总索引

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.29.7`
> - **对应实施版本**：`v4.29.7`
> - **版本治理规范**：[`versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **最后更新日期**：2026-09-24
> - **版本状态**：`[Release 稳定生效]`

本索引是全局规则工程的索引地图：每条只登记「名称 + 路径 + 一句话职责」，细则指向权威源，不复述。

---

## 🚦 〇、管控机制（名称唯一权威出处）

所有“改不动的硬约束”由管控机制统一承载。本节即该名称的唯一权威出处，其他文档一律引用本名称；旧称“AI执行流程管控系统”“门禁内核”“管控体系”“执行流程管控系统”一律废止。流程编号统一写作`REQ-###`（`R0xx`废止）。

一句话定义：不采信任何“已完成”的口头宣称，只按磁盘实况决定能否动手。

| 分层 | 职责 | 落地载体 |
| :--- | :--- | :--- |
| **注入层** | 红线与路由指针 | [`AGENTS.md`](../AGENTS.md)、`$DSH_HOME/AGENTS.md`、[`indexes/shortcuts_index.md`](shortcuts_index.md) |
| **状态层** | 磁盘实况推导真值 | [`control_gates.sh`](../scripts/control_gates.sh)、[`gates.conf`](../ai-control/config/gates.conf) |
| **判定层** | 门禁 / 双检 / 校准 / 审计 / 契约 | 逐条命令见 [`AGENTS.md`](../AGENTS.md) §一（**唯一权威清单，此处不复述**） |
| **流程管控层** | 依赖源与顺序一致 | [`flow_graph.json`](../ai-control/config/flow_graph.json)、[`flow_control.mjs`](../scripts/flow_control.mjs)、[`task_execution_flow.md`](../rules/workflow/task_execution_flow.md) |
| **路由层** | 意图匹配与调配决策 | [`route_plan.mjs`](../scripts/route_plan.mjs)、[`indexes/navigation_router.md`](navigation_router.md)、[`indexes/capabilities_index.json`](capabilities_index.json)、[`channel_audit.mjs`](../scripts/channel_audit.mjs) |
| **拦截层** | 未过门禁拒改动 | [`ai-control/plugin/index.mjs`](../ai-control/plugin/index.mjs) |

累积门禁（G0→G7按序全通过）：G0会话命名·G1项目初始化·G2工程结构化·G3需求文档同步·G4冗余检测·G5落地与版本一致性·G6执行层并发与载体一致性·G7纪律分。
唯一权威源：[`AGENTS.md`](../AGENTS.md) §一——门禁定义与量化指标（G0~G7，含REQ-092 / REQ-093 / REQ-098）、双检、校准与各判定器逐条命令。
分流：冗余→并迭代版本、留单一权威源；冲突→先出裁决、**禁自行取舍**。

机制图文见[`constraint_mechanism_spec.md`](../docs/constraint_mechanism_spec.md)（REQ-047）。

机制信息图（版本分工，唯一权威出处即本节）：

| 版本 | 载体 | 数据口径与用法 |
| :--- | :--- | :--- |
| **基线版式** | [`gcm_gate_control_infographic.svg`](../assets/generated_images/gcm_gate_control_infographic.svg) + `.png` | REQ-044 原始产出；**数字已过时，勿当现状** |
| **现行实况版（历史）** | [`control_mechanism_infographic_v2.svg`](../assets/generated_images/control_mechanism_infographic_v2.svg) + `.png` | 快照 2026-09-23 16:02 |
| **结构树实况版（历史）** | [`control_mechanism_structure_tree_v3.svg`](../assets/generated_images/control_mechanism_structure_tree_v3.svg) + `.png` | 快照 2026-09-29（物理锁 LOCK-2） |
| **当前实况总览版（现行引用首选）** | [`control_mechanism_live_overview_v4.svg`](../assets/generated_images/control_mechanism_live_overview_v4.svg) + `.png` | **引用现状一律以本版为准**（v2/v3 退为历史） |
| **小白教学版（讲解用，不担数字权威）** | [`control_mechanism_beginner_flow_v1.svg`](../assets/generated_images/control_mechanism_beginner_flow_v1.svg) + `.png` | 讲"怎么运作"看本版，数字权威看上两行 |

> 各图台账留痕见 [`requirements.md`](../docs/requirements.md) 附录“资产变更留痕”；相关需求 REQ-089 / REQ-087。

---

## 🧭 一、系统层级规则

| 文档路径 | 中文全称 | 核心作用与边界 |
| :--- | :--- | :--- |
| [`meta_rules.md`](../rules/system/meta_rules.md) | **系统最高全局元规则** | 最高裁决效力 |
| [`thinking_framework.md`](../rules/system/thinking_framework.md) | **搜索引擎逻辑映射思考框架** | 六步认知管道 |
| [`language_standard.md`](../rules/system/language_standard.md) | **全文档中文化与通俗表达标准** | 全中文通俗表达 |
| [`initialization_protocol.md`](../rules/system/initialization_protocol.md) | **开箱自检与目录一键初始化协议** | 自检六步与四件套 |
| [`security_baseline.md`](../rules/security/security_baseline.md) | **免审批安全基线与防破坏红线规约** | 八大红线与写后读回 |
| [`discipline_score.md`](../rules/system/discipline_score.md) | **纪律分系统规约** | 全域一本账、扣分带证据、低于60分停用（REQ-098） |

---

## 🔄 二、流程与协同规则

| 文档路径 | 中文全称 | 核心作用与边界 |
| :--- | :--- | :--- |
| [`task_execution_flow.md`](../rules/workflow/task_execution_flow.md) | **任务执行结构化流程与图形规范** | 快慢双轨、十六步流水线 |
| [`risk_disclosure.md`](../rules/workflow/risk_disclosure.md) | **任务前置风险揭示与评估规范** | 四维风险雷达与写前门禁 |
| [`page_ledger_specification.md`](../rules/workflow/page_ledger_specification.md) | **页面视觉台账与截图指代规范** | 一项目一册截图台账 |
| [`post_mortem_and_evolution.md`](../rules/workflow/post_mortem_and_evolution.md) | **任务复盘与系统自迭代进化规范** | 三维 AAR 复盘与自迭代 |
| [`versioning_standard.md`](../rules/workflow/versioning_standard.md) | **实施版本号治理与全生命周期同步规范** | SemVer 与三位一体同步 |
| [`change_flow.md`](../rules/workflow/change_flow.md) | **规则与需求变更六步工作流** | 变更六步闭环 |
| [`agent_life_spec.md`](../rules/workflow/agent_life_spec.md) | **全局流程管控Agent Life调度规约** | 时序生命周期调度 |
| [`pp_life_orchestration.md`](../rules/workflow/pp_life_orchestration.md) | **单例Agent PP与多Life并发调度规约** | PP 并行与 Life 串行 |
| [`audit_and_cleanup.md`](../rules/workflow/audit_and_cleanup.md) | **规则更新联动排查与存量治理规范** | 联动排查与存量治理 |
| [`component_naming.md`](../rules/workflow/component_naming.md) | **标准组件中文指代与命名体系** | 组件中文指代体系 |

---

## 💻 三、编码与技术规范

| 文档路径 | 中文全称 | 核心作用与边界 |
| :--- | :--- | :--- |
| [`testing_and_quality_gate.md`](../rules/coding/testing_and_quality_gate.md) | **自动化测试与工程质量门禁规范** | 需求即断言、未测禁言 |
| [`unity_project_standard.md`](../rules/coding/unity_project_standard.md) | **Unity 结构化工程目录与文件形式规范** | 目录隔离与 .meta 铁律 |
| [`atomicity_specification.md`](../rules/coding/atomicity_specification.md) | **系统操作与工程设计原子性事务规范** | 操作级与设计级原子性 |
| [`token_and_local_compute_optimization.md`](../rules/coding/token_and_local_compute_optimization.md) | **本地运算优先与Token降耗规范** | 本地优先与精准切片 |
| [`first_principles_verification.md`](../rules/coding/first_principles_verification.md) | **第一性原理与物理实证规范** | 三不采信与物理实证 |

---

## 📚 四、核心知识库与业务法典

| 文档路径 | 中文全称 | 核心管理内容与约束 |
| :--- | :--- | :--- |
| [`knowledge/README.md`](../knowledge/README.md) | **系统分层知识库总索引与教学图** | 分层架构与隔离导航 |
| [`interaction_specification.md`](../knowledge/common/interaction_specification.md) | **通用交互与体验设计规范** | 格式塔定律与防呆 |
| [`readability_specification.md`](../knowledge/common/readability_specification.md) | **全端可读性与无障碍排版设计法典** | 字号阶梯与 WCAG 2.1 |
| [`unity_specification.md`](../knowledge/common/unity_specification.md) | **通用 Unity 客户端工程规范** | Scene / Prefab 与阴影 |
| [`web_specification.md`](../knowledge/common/web_specification.md) | **通用 Web 前端工程规范** | 懒加载与 Portal 挂载 |
| [`miniprogram_specification.md`](../knowledge/common/miniprogram_specification.md) | **通用小程序研发工程规范** | 主包上限与差量 setData |
| [`engineering_specification.md`](../knowledge/common/engineering_specification.md) | **通用技术架构与工程规范** | 四层解耦与零 GC |
| [`art_specification.md`](../knowledge/common/art_specification.md) | **通用视觉与色彩设计规范** | 色彩平衡与对比度 |
| [`dsh_native_ui_components.md`](../knowledge/common/dsh_native_ui_components.md) | **DSH 原生可视化组件体系法典** | 组件分层与插槽树 |
| [`first_principles_specification.md`](../knowledge/common/first_principles_specification.md) | **第一性原理与实证方法论（知识库通用条款卡）** | 三不采信与证据三级定级（REQ-097 / R3） |
| [`execution_layer_interface_spec.md`](../knowledge/common/execution_layer_interface_spec.md) | **执行层接口契约规范** | 九项必填字段与基线占位口径 |
| [`projects/README.md`](../knowledge/projects/README.md) | **项目专属知识库隔离总规** | 物理隔离与禁载铁律 |
| [`aether_echo/README.md`](../knowledge/projects/aether_echo/README.md) | **源能回响项目专属法典** | 以太法则与纪元阵营 |

---

## 📂 五、台账、模板与工具指南

| 分类 | 文档/脚本路径 | 说明 |
| :--- | :--- | :--- |
| **需求台账** | [`requirements.md`](../docs/requirements.md) | 唯一需求台账（REQ-001 起） |
| **机制说明** | [`constraint_mechanism_spec.md`](../docs/constraint_mechanism_spec.md) | 名称、分层与双检处置 |
| **机制优化** | [`constraint_mechanism_optimize_3.md`](../docs/constraint_mechanism_optimize_3.md) | REQ-047 文案与验收 |
| **图形化调研** | [`visual_learning_research.md`](../docs/visual_learning_research.md) | 教学范式调研 |
| **图表生成** | [`diagram_generation_guide.md`](../docs/diagram_generation_guide.md) | 图表生成指南 |
| **教学指南** | [`rules_tutorial.md`](../docs/rules_tutorial.md) | 体系运转图解 |
| **记忆架构** | [`memory_architecture.md`](../docs/memory_architecture.md) | 分层记忆架构 |
| **标准模板** | [`project_dsh_bootstrap_template.md`](../templates/project_dsh_bootstrap_template.md) | 赋能规划卡（必填） |
| **标准模板** | [`requirement_template.md`](../templates/requirement_template.md) | 需求卡片 |
| **标准模板** | [`risk_assessment_template.md`](../templates/risk_assessment_template.md) | 风险评估卡 |
| **标准模板** | [`page_ledger_template.md`](../templates/page_ledger_template.md) | 页面台账 |
| **标准模板** | [`post_mortem_template.md`](../templates/post_mortem_template.md) | AAR 复盘 |
| **标准模板** | [`directory_readme_template.md`](../templates/directory_readme_template.md) | 目录说明 |
| **标准模板** | [`graphical_block_template.md`](../templates/graphical_block_template.md) | 区块卡片 |
| **管控机制·判定器** | [`mechanism_audit.mjs`](../scripts/mechanism_audit.mjs)、[`output_audit.mjs`](../scripts/output_audit.mjs)、[`language_audit.mjs`](../scripts/language_audit.mjs)、[`process_supervisor.mjs`](../scripts/process_supervisor.mjs)、[`progress_ledger.mjs`](../scripts/progress_ledger.mjs)、[`check_layer_interfaces.mjs`](../scripts/check_layer_interfaces.mjs)、[`gen_common_chars.mjs`](../scripts/gen_common_chars.mjs) | 触达 / 输出 / 用字（GB2312）/ 复核 / 登记 / 接口 / 字表 |
| **管控机制** | [`control_gates.sh`](../scripts/control_gates.sh) | 门禁看板 |
| **管控机制** | [`gate_selftest.sh`](../scripts/gate_selftest.sh) | 可证性回归 |
| **管控机制** | [`redundancy_scan.mjs`](../scripts/redundancy_scan.mjs) | 真冗余识别 |
| **管控机制** | [`conflict_scan.mjs`](../scripts/conflict_scan.mjs) | 五类冲突裁决 |
| **管控机制** | [`legacy_align_scan.mjs`](../scripts/legacy_align_scan.mjs) | 五类待对齐清单 |
| **管控机制** | [`channel_audit.mjs`](../scripts/channel_audit.mjs) | 死链与触发词 |
| **管控机制** | [`align_version.mjs`](../scripts/align_version.mjs) | 版本归位 |
| **管控机制** | [`normalize_all_projects.mjs`](../scripts/normalize_all_projects.mjs) | 全域规范化 |
| **管控机制** | [`scope_audit.mjs`](../scripts/scope_audit.mjs) | 覆盖审计（REQ-092） |
| **管控机制** | [`backfill_scope.mjs`](../scripts/backfill_scope.mjs) | 存量补课（REQ-092） |
| **管控机制** | [`req_version_gen.mjs`](../scripts/req_version_gen.mjs) | 版本台账生成 |
| **管控机制** | [`req_version_audit.mjs`](../scripts/req_version_audit.mjs) | 四处对拍 |
| **管控机制** | [`anti_hallucination_audit.mjs`](../scripts/anti_hallucination_audit.mjs) | 反空架子与幻觉 |
| **管控机制** | [`domain_scope_selftest.mjs`](../scripts/domain_scope_selftest.mjs) | 写拦截自检 |
| **管控机制** | [`push_external_projects.sh`](../scripts/push_external_projects.sh) | 推送闭环 |
| **管控机制** | [`verify_guard_live.sh`](../scripts/verify_guard_live.sh) | 拦截层上线验证 |
| **管控机制** | [`verify_escape_hatch.sh`](../scripts/verify_escape_hatch.sh) | 逃生舱验证 |
| **管控机制** | [`physical_lock.sh`](../scripts/physical_lock.sh) | **物理锁**查看与推进 |
| **管控机制** | [`lib/physical_lock.mjs`](../scripts/lib/physical_lock.mjs) | 物理锁内核 |
| **应用重启** | [`app_restart.mjs`](../scripts/app_restart.mjs) | 应用层重启入口 |
| **自动化脚本** | [`global_scheduler_lock.sh`](../scripts/global_scheduler_lock.sh) | 全局调度锁 |
| **自动化脚本** | [`git_sync_remote.sh`](../scripts/git_sync_remote.sh) | 远程同步 |
| **自动化脚本** | [`fingerprint_audit.sh`](../scripts/fingerprint_audit.sh) | 指纹防漂移 |
| **自动化脚本** | [`disk_check_and_cleanup.sh`](../scripts/disk_check_and_cleanup.sh) | 磁盘巡检清理 |
| **自动化脚本** | [`generate_image.py`](../scripts/generate_image.py) | 图形生成渲染 |
| **自动化脚本** | [`gen_control_map.mjs`](../scripts/gen_control_map.mjs) | 管控实况单页图 |
| **自动化脚本** | [`rename_session.sh`](../scripts/rename_session.sh) | 会话改名锁定 |
| **自动化脚本** | [`init_dir.sh`](../scripts/init_dir.sh) | 目录四件套 |
| **自动化脚本** | [`route_navigate.mjs`](../scripts/route_navigate.mjs) | 导航式路由 |
| **自动化脚本** | [`agent_life.mjs`](../scripts/agent_life.mjs) | 生命周期调度 |
| **自动化脚本** | [`check_unique_identifiers.mjs`](../scripts/check_unique_identifiers.mjs) | 标识审计 |
| **命名自动化** | [`check_task_naming.sh`](../scripts/check_task_naming.sh) | 标题合规判定 |
| **命名自动化** | [`session_naming_audit.mjs`](../scripts/session_naming_audit.mjs) | 存量审计 |
| **命名自动化** | [`generate_naming_plan.mjs`](../scripts/generate_naming_plan.mjs) | 方案生成 |
| **命名自动化** | [`batch_rename_sessions.mjs`](../scripts/batch_rename_sessions.mjs) | 批量改名与回滚 |
| **命名自动化** | [`batch_fix_sidebar_titles.mjs`](../scripts/batch_fix_sidebar_titles.mjs) | 三层穿透改名 |
| **命名自动化** | [`lib/workspace_resolve.mjs`](../scripts/lib/workspace_resolve.mjs) | 归位共享口径 |
| **命名自动化** | [`lib/auto_naming.mjs`](../scripts/lib/auto_naming.mjs) | 命名核心逻辑 |
| **命名自动化** | [`test_auto_naming.mjs`](../scripts/test_auto_naming.mjs) | 24 项测试 |
| **命名自动化** | [`verify_auto_naming_e2e.mjs`](../scripts/verify_auto_naming_e2e.mjs) | 端到端验收 |
| **命名自动化** | [`name_me.sh`](../scripts/name_me.sh) | 开工一键改名 |
| **命名自动化** | [`naming_watchdog.mjs`](../scripts/naming_watchdog.mjs) | 漏改兜底 |
| **命名自动化** | [`naming_overrides.json`](../ai-control/config/naming_overrides.json) | 人工豁免清单 |
| **模型配置** | [`probe_max_tokens.mjs`](../scripts/probe_max_tokens.mjs) | 区间探测 |
| **模型配置** | [`probe_long_output.mjs`](../scripts/probe_long_output.mjs) | 触顶实测 |
| **模型配置** | [`probe_long_output_stream.mjs`](../scripts/probe_long_output_stream.mjs) | 触顶实测（流式） |

---

## 🧠 六、能力索引、生态扩展与记忆中枢

| 分类 | 路径 | 核心内容 |
| :--- | :--- | :--- |
| **外部生态** | [`indexes/extension_ecosystem.md`](extension_ecosystem.md) | 扩展生态与协议矩阵 |
| **快速通道** | [`indexes/shortcuts_index.md`](shortcuts_index.md) | 干道路由与口令矩阵 |
| **能力体系** | [`indexes/dsh_capabilities.md`](dsh_capabilities.md) | 宿主能力架构 |
| **全能力层** | [`indexes/capabilities_index.md`](capabilities_index.md) | 五大能力层索引 |
| **导航路由** | [`indexes/navigation_router.md`](navigation_router.md) | 三级路由指引 |
| **工具接口** | [`indexes/tool_interfaces.md`](tool_interfaces.md) | 工具与插件接口 |
| **长期记忆** | [`memory/context_memory.md`](../memory/context_memory.md) | 用户偏好与约定 |
| **经验知识** | [`memory/lessons_learned.md`](../memory/lessons_learned.md) | 避坑与机制认知 |
| **效率审计** | [`memory/efficiency_audit_log.md`](../memory/efficiency_audit_log.md) | 效率量化台账 |
| **错误台账** | [`memory/error_ledger.md`](../memory/error_ledger.md) | 报错归因台账 |
