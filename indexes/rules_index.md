# 全局规则与体系全景总索引 (Global Rules Index)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.11.0`
> - **对应实施版本**：`v4.11.0`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **最后更新日期**：2026-09-23
> - **版本状态**：`[Release 稳定生效]`

本文档是全局规则工程所有规则、流程、协议、知识库、外部生态与资产的**全局索引地图**。按层级与业务领域编目，方便快速定位与召回。

---

## 🚦 〇、管控机制（名称唯一权威出处）

本工程所有"改不动的硬约束"由**管控机制**统一承载。这是该名称的唯一权威出处，
其他文档一律引用本名称；历史上曾用过的"AI 执行流程管控系统""门禁内核""管控体系"等旧称一律废止。
正式流程编号统一写作 `REQ-###`（历史上曾混用的 `R0xx` 写法废止）。

**一句话定义**：不采信任何"已完成"的口头宣称，只按磁盘实况决定"能不能动手"。

| 分层 | 职责 | 落地载体 |
| :--- | :--- | :--- |
| **注入层** | 只放红线与路由指针，按需加载细则 | [`AGENTS.md`](../AGENTS.md)（项目级）、`$DSH_HOME/AGENTS.md`（宿主级）、[`indexes/shortcuts_index.md`](shortcuts_index.md) |
| **状态层** | 由磁盘实况推导真值，产出 `status.json` | [`scripts/control_gates.sh`](../scripts/control_gates.sh)、[`ai-control/config/gates.conf`](../ai-control/config/gates.conf) |
| **判定层** | 门禁判定 + 冗余与冲突双检 + 存量校准 + 通道审计 | [`scripts/redundancy_scan.mjs`](../scripts/redundancy_scan.mjs)、[`scripts/conflict_scan.mjs`](../scripts/conflict_scan.mjs)、[`scripts/legacy_align_scan.mjs`](../scripts/legacy_align_scan.mjs)、[`scripts/channel_audit.mjs`](../scripts/channel_audit.mjs) |
| **拦截层** | 门禁未过时拒绝改动型工具调用 | [`ai-control/plugin/index.mjs`](../ai-control/plugin/index.mjs) |

**四道基础门禁（累积语义，须按序全部通过）**：

| 门禁 | 判定内容 | 量化指标 |
| :--- | :--- | :--- |
| **G1 项目初始化** | 仓库、骨架、防丢文件齐备 | 骨架齐备率 / 防丢覆盖率 |
| **G2 工程结构化** | 目录有主、无孤儿目录、无散落垃圾 | 合规项 / 孤儿目录数 |
| **G3 需求文档同步** | 台账条目数与 Git 工作树对齐 | 需求条目数 / 未提交变更数 |
| **G4 冗余检测** | 实质重复率与重复标题在健康区 | 高相似块对 / 重复标题数 |

**双检与校准命令（相对项目根）**：

```bash
./scripts/control_gates.sh check                                   # 计算并输出门禁看板
node scripts/redundancy_scan.mjs --root .                           # 冗余检测（重复内容）
node scripts/conflict_scan.mjs --root .                             # 冲突检测（同一事实两种说法）
node scripts/legacy_align_scan.mjs --root .                         # 存量校准（遇碰即对齐清单）
node scripts/channel_audit.mjs --root .                             # 通道审计（死通道/说法命中/触发词冲突）
node scripts/align_version.mjs --dry-run                            # 升版预览：全库受管文档版本归位
```

**双检处置分流**：冗余 → 合并为迭代版本，保留单一权威源；
冲突 → 先出裁决方案，由用户确认后再迭代，**禁止自行取舍**。

机制面向普通读者的图文说明见 [`docs/constraint_mechanism_spec.md`](../docs/constraint_mechanism_spec.md)。

**机制信息图（版本分工，唯一权威出处即本节）**：

| 版本 | 载体 | 数据口径与用法 |
| :--- | :--- | :--- |
| **基线版式** | [`assets/generated_images/gcm_gate_control_infographic.svg`](../assets/generated_images/gcm_gate_control_infographic.svg) + `.png` | REQ-044 原始产出，固化版式基准；**内含写死数字（如"23 条通道"）已非当前实况，不得当作现状引用** |
| **现行实况版** | [`assets/generated_images/control_mechanism_infographic_v2.svg`](../assets/generated_images/control_mechanism_infographic_v2.svg) + `.png` | 复用基线版式、按实跑数据重绘；数字对应快照 2026-09-23 16:02（门禁 4/4 · 通道 24 条 · 双检与校准全 0）。**资产已落盘，台账条目尚未登记**，引用前先核对当轮实跑 |

---

## 🧭 一、系统层级规则 (System Level)

| 文档路径 | 中文全称 | 核心作用与边界 |
| :--- | :--- | :--- |
| [`rules/system/meta_rules.md`](../rules/system/meta_rules.md) | **系统最高全局元规则** | 最高裁决效力：双向同步、智能去重、全中文通俗表达、联动排查、安全自律、双轨分流、知识库前置审查律、事务原子性律。 |
| [`rules/system/thinking_framework.md`](../rules/system/thinking_framework.md) | **搜索引擎逻辑映射思考框架** | 工业级搜索引擎六步映射（感知➔意图➔去重➔仲裁➔拦截➔闭环），规范 Agent 认知管道。 |
| [`rules/system/language_standard.md`](../rules/system/language_standard.md) | **全文档中文化与通俗表达标准** | 消除晦涩英文与黑话，坚持大白话与结构化表达，落实执行全步骤与UI参数纯中文说明及上下文压缩镜像。 |
| [`rules/system/initialization_protocol.md`](../rules/system/initialization_protocol.md) | **开箱自检与目录一键初始化协议** | 会话开启自检六步法、目录四件套自动化初始化机制。 |
| [`rules/security/security_baseline.md`](../rules/security/security_baseline.md) | **免审批安全基线与防破坏红线规约** | 绝对阻断的八大红线原语、写后读回校验机制与交付入口规范。 |

---

## 🔄 二、流程与协同规则 (Workflow Level)

| 文档路径 | 中文全称 | 核心作用与边界 |
| :--- | :--- | :--- |
| [`rules/workflow/task_execution_flow.md`](../rules/workflow/task_execution_flow.md) | **任务执行结构化流程与图形规范** | 快慢双轨分流、六大分类编号、100分制打分、8字标题、十六步流水线闭环。 |
| [`rules/workflow/risk_disclosure.md`](../rules/workflow/risk_disclosure.md) | **任务前置风险揭示与评估规范** | 四维风险雷达、写前必揭示门禁、《前置风险评估卡》与高危阻断预案。 |
| [`rules/workflow/page_ledger_specification.md`](../rules/workflow/page_ledger_specification.md) | **页面视觉台账与截图指代规范** | 一项目一册、四段式截图命名、独立项目台账、跨会话编号精准指代。 |
| [`rules/workflow/post_mortem_and_evolution.md`](../rules/workflow/post_mortem_and_evolution.md) | **任务复盘与系统自迭代进化规范** | 任务收尾三维 AAR 强制复盘、根因深挖、记忆层经验沉淀与规则自迭代。 |
| [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md) | **实施版本号治理与全生命周期同步规范** | 语义化版本管理（SemVer）、需求-知识库-实施三位一体强同步铁律。 |
| [`rules/workflow/change_flow.md`](../rules/workflow/change_flow.md) | **规则与需求变更六步工作流** | 接收意图 ➔ 查重拦截 ➔ 登记台账 ➔ 编写规则 ➔ 联动排查 ➔ 提交推送。 |
| [`rules/workflow/agent_life_spec.md`](../rules/workflow/agent_life_spec.md) | **全局流程管控Agent Life调度规约** | 时序生命周期管控中枢、阶段原子反馈回执驱动、全局冲突锁接管。 |
| [`rules/workflow/pp_life_orchestration.md`](../rules/workflow/pp_life_orchestration.md) | **单例Agent PP与多Life并发调度规约** | 单例并发中枢Agent PP管控并行、短生命周期Life(N)执行串行并即刻消亡。 |
| [`rules/workflow/audit_and_cleanup.md`](../rules/workflow/audit_and_cleanup.md) | **规则更新联动排查与存量治理规范** | 消除孤岛规则、过期死链清理、结构去重与版本历史治理细则。 |
| [`rules/workflow/component_naming.md`](../rules/workflow/component_naming.md) | **标准组件中文指代与命名体系** | 系统组件中文规范、架构统一指代与快速通道指引。 |

---

## 💻 三、编码与技术规范 (Coding Level)

| 文档路径 | 中文全称 | 核心作用与边界 |
| :--- | :--- | :--- |
| [`rules/coding/testing_and_quality_gate.md`](../rules/coding/testing_and_quality_gate.md) | **自动化测试与工程质量门禁规范** | 需求即断言、真实执行用例、100% 绿灯硬性交付门禁、未测禁言交付。 |
| [`rules/coding/unity_project_standard.md`](../rules/coding/unity_project_standard.md) | **Unity 结构化工程目录与文件形式规范** | `_Project/` 根目录隔离、.meta 同生共死铁律、asmdef 模块解耦、C# 生命周期守则。 |
| [`rules/coding/atomicity_specification.md`](../rules/coding/atomicity_specification.md) | **系统操作与工程设计原子性事务规范** | 明确操作级原子性（双向同步/目录四件套/.meta）与设计级原子性（存档/交易/状态机）。 |
| [`rules/coding/token_and_local_compute_optimization.md`](../rules/coding/token_and_local_compute_optimization.md) | **本地运算优先与Token降耗规范** | 确定性计算本地先行、精准切片读取、拒绝全盘盲读、TTL缓存秒回。 |
| [`rules/coding/first_principles_verification.md`](../rules/coding/first_principles_verification.md) | **第一性原理与物理实证规范** | 三不采信原则、实证调查五步法、L1~L3 证据等级与物理穿透法则。 |

---

## 📚 四、核心知识库与业务法典 (Knowledge Base)

| 文档路径 | 中文全称 | 核心管理内容与约束 |
| :--- | :--- | :--- |
| [`knowledge/README.md`](../knowledge/README.md) | **系统分层知识库总索引与教学图** | 知识库总览、分层架构教学图、前置防冲突阻断卡点与项目隔离导航。 |
| [`knowledge/common/interaction_specification.md`](../knowledge/common/interaction_specification.md) | **通用交互与体验设计规范** | 格式塔六大定律实操、Don't Make Me Think 零思考设计与防呆机制。 |
| [`knowledge/common/readability_specification.md`](../knowledge/common/readability_specification.md) | **全端可读性与无障碍排版设计法典** | 跨端（Web/DMG/App/小程序）字号阶梯、绝对最小文字红线、WCAG 2.1 对比度与加粗节制规范。 |
| [`knowledge/common/unity_specification.md`](../knowledge/common/unity_specification.md) | **通用 Unity 客户端工程规范** | 页面做成 Scene、弹窗做成 Prefab、按钮必配 Drop Shadow 阴影与微动效。 |
| [`knowledge/common/web_specification.md`](../knowledge/common/web_specification.md) | **通用 Web 前端工程规范** | 路由懒加载、Modal Portal 根挂载防层叠污染、box-shadow 与骨架屏。 |
| [`knowledge/common/miniprogram_specification.md`](../knowledge/common/miniprogram_specification.md) | **通用小程序研发工程规范** | 主包≤1.5MB、组件化弹窗防滚动穿透、hover-class、setData 路径差量。 |
| [`knowledge/common/engineering_specification.md`](../knowledge/common/engineering_specification.md) | **通用技术架构与工程规范** | 四层单向解耦模型、零 GC 循环法则、状态机流转原子性。 |
| [`knowledge/common/art_specification.md`](../knowledge/common/art_specification.md) | **通用视觉与色彩设计规范** | 60-30-10 色彩平衡定律、WCAG 4.5:1 对比度标准、三层阴影空间。 |
| [`knowledge/common/dsh_native_ui_components.md`](../knowledge/common/dsh_native_ui_components.md) | **DSH 原生可视化组件体系法典** | 九大层级组件命名、React Slot 插槽树拓扑、原子工具卡片契约与注入规范。 |
| [`knowledge/projects/README.md`](../knowledge/projects/README.md) | **项目专属知识库隔离总规** | 独立工程物理隔离、非游戏禁载游戏设定铁律与继承体系。 |
| [`knowledge/projects/aether_echo/README.md`](../knowledge/projects/aether_echo/README.md) | **源能回响项目专属法典** | 源能以太法则、时代纪元年表、阵营势力、专属半写实轻科幻美术与 URP。 |

---

## 📂 五、台账、模板与工具指南 (Assets, Guides & Tools)

| 分类 | 文档/脚本路径 | 说明 |
| :--- | :--- | :--- |
| **需求台账** | [`docs/requirements.md`](../docs/requirements.md) | 唯一核心需求管理台账（REQ-001 ~ REQ-047 完整记录，总版本 `v3.1.0`） |
| **机制说明** | [`docs/constraint_mechanism_spec.md`](../docs/constraint_mechanism_spec.md) | 管控机制的正式名称、四层分工、双检处置与全库校准要求 |
| **机制优化** | [`docs/constraint_mechanism_optimize_3.md`](../docs/constraint_mechanism_optimize_3.md) | REQ-047 需求文案与验收清单：拦截层复活、检测器能力加固、状态驱动出图（含实测证据与未验证项声明） |
| **图形化调研** | [`docs/visual_learning_research.md`](../docs/visual_learning_research.md) | 公开官网的图形化流程教学范式调研（含证据强度分级与 URL 逐条校验） |
| **图表生成** | [`docs/diagram_generation_guide.md`](../docs/diagram_generation_guide.md) | 全场景流程图、信息图与教学图生成技术指南与标准模板库 |
| **教学指南** | [`docs/rules_tutorial.md`](../docs/rules_tutorial.md) | 规则体系运转教学图解与实操说明 |
| **记忆架构** | [`docs/memory_architecture.md`](../docs/memory_architecture.md) | AI 分层长短期记忆体系架构与工程落地规范 |
| **标准模板** | [`templates/project_dsh_bootstrap_template.md`](../templates/project_dsh_bootstrap_template.md) | 项目 DSH 赋能规划卡标准模板 (立项必填) |
| **标准模板** | [`templates/requirement_template.md`](../templates/requirement_template.md) | 标准需求卡片录入模板（支持实施版本号） |
| **标准模板** | [`templates/risk_assessment_template.md`](../templates/risk_assessment_template.md) | 前置四维风险评估卡标准模板 |
| **标准模板** | [`templates/page_ledger_template.md`](../templates/page_ledger_template.md) | 项目页面资产与视觉台账模板 |
| **标准模板** | [`templates/post_mortem_template.md`](../templates/post_mortem_template.md) | AAR 任务复盘与流程进化报告模板 |
| **标准模板** | [`templates/directory_readme_template.md`](../templates/directory_readme_template.md) | 目录专属说明标准模板 |
| **标准模板** | [`templates/graphical_block_template.md`](../templates/graphical_block_template.md) | 原生图形化区块卡片组件标准模板 |
| **自动化脚本** | [`scripts/global_scheduler_lock.sh`](../scripts/global_scheduler_lock.sh) | 全自动轻量级全局调度锁中枢与并发资源防冲突引擎 |
| **自动化脚本** | [`scripts/git_sync_remote.sh`](../scripts/git_sync_remote.sh) | 工程远程 Git 智能探针、缺地址开页引导与强同步引擎 |
| **自动化脚本** | [`scripts/fingerprint_audit.sh`](../scripts/fingerprint_audit.sh) | 全域资产数字指纹计算、新鲜度嗅探与防漂移审计引擎 |
| **自动化脚本** | [`scripts/disk_check_and_cleanup.sh`](../scripts/disk_check_and_cleanup.sh) | 周期性磁盘空间巡检与安全自愈清理脚本 |
| **自动化脚本** | [`scripts/generate_image.py`](../scripts/generate_image.py) | 图形生成、自动保存与图显渲染脚本 |
| **自动化脚本** | [`scripts/rename_session.sh`](../scripts/rename_session.sh) | 会话一键重命名并锁定 RPC 脚本 |
| **自动化脚本** | [`scripts/init_dir.sh`](../scripts/init_dir.sh) | 新建目录自动化初始化四件套脚本 |
| **自动化脚本** | [`scripts/route_navigate.mjs`](../scripts/route_navigate.mjs) | 地图导航式能力路由器、核心入口提取与版本速查脚本 |
| **自动化脚本** | [`scripts/agent_life.mjs`](../scripts/agent_life.mjs) | 全局流程调度中枢 Agent PP & Agent Life(N) 辅助引擎（并发管理、生命周期推进与消亡） |
| **自动化脚本** | [`scripts/check_unique_identifiers.mjs`](../scripts/check_unique_identifiers.mjs) | 全域能力 (Agent/MCP/CLI/Skill/Plugin) 唯一标识符与命名空间规范审计器 |
| **管控机制** | [`scripts/control_gates.sh`](../scripts/control_gates.sh) | 状态层：由磁盘实况推导 G1~G4 并输出量化看板与状态快照 |
| **管控机制** | [`scripts/redundancy_scan.mjs`](../scripts/redundancy_scan.mjs) | 冗余检测：词级相似度识别真复制粘贴（内置自检） |
| **管控机制** | [`scripts/conflict_scan.mjs`](../scripts/conflict_scan.mjs) | 冲突检测：五类冲突（版本/计数/指标/标识/死链）识别与裁决建议 |
| **管控机制** | [`scripts/legacy_align_scan.mjs`](../scripts/legacy_align_scan.mjs) | 存量校准：输出命名/入口/版本/指纹/台账五类待对齐清单；脚本漏登记可自动检出 |
| **管控机制** | [`scripts/channel_audit.mjs`](../scripts/channel_audit.mjs) | 通道审计：快速通道死链、说法能否命中、触发词是否冲突（内置正反例自检） |
| **管控机制** | [`scripts/align_version.mjs`](../scripts/align_version.mjs) | 版本归位：把全库受管文档头部版本统一到台账总版本（支持 --dry-run 预览） |
| **管控机制** | [`scripts/verify_guard_live.sh`](../scripts/verify_guard_live.sh) | 拦截层上线验证：**重启桌面端后**检查守卫/看板是否真实生效（源码契约 + 插件自检 + 门禁实况 + 人工观察清单） |
| **管控机制** | [`scripts/verify_escape_hatch.sh`](../scripts/verify_escape_hatch.sh) | 逃生舱重启后验证：**宿主是否已加载最新代码**（进程启动时间 vs 插件改动时间）+ 逃生舱判定逻辑 7 项 + 宿主级实弹步骤；只读，不制造门禁未过状态 |
| **命名自动化** | [`scripts/check_task_naming.sh`](../scripts/check_task_naming.sh) | 命名判定：一条命令判定当前会话标题是否合规（`--exit` 供流程门禁使用），看板借它常显命名状态 |
| **命名自动化** | [`scripts/session_naming_audit.mjs`](../scripts/session_naming_audit.mjs) | 存量审计（只读）：枚举全部会话、判定合规率、区分主/子会话，并抽取首条真用户消息供生成概述 |
| **命名自动化** | [`scripts/generate_naming_plan.mjs`](../scripts/generate_naming_plan.mjs) | 方案生成：按「工作区 + 分类字母」编排编号，难度分由会话规模量化推导（步数 60% + 输出 token 40%） |
| **命名自动化** | [`scripts/batch_rename_sessions.mjs`](../scripts/batch_rename_sessions.mjs) | 批量改名：预校验 → 自动备份 → 自动回滚方案 → 以权威存储复查真实生效数（`--dry-run` 预览；回滚用 `--rollback`，该模式豁免命名规范校验，否则回滚方案会被自己拦死） |
| **命名自动化** | [`scripts/lib/workspace_resolve.mjs`](../scripts/lib/workspace_resolve.mjs) | 归位共享模块：方案生成器与批量器共用同一套工作区归位口径，避免两处判断错位 |
| **命名自动化** | [`scripts/lib/auto_naming.mjs`](../scripts/lib/auto_naming.mjs) | 自动命名核心逻辑：插件在宿主内调用，测试脚本导入同一份代码（保证"测过的就是跑的"） |
| **命名自动化** | [`scripts/test_auto_naming.mjs`](../scripts/test_auto_naming.mjs) | 自动命名测试（24 项）：纯逻辑 + 真实数据读取 + 幂等 + 分类正确性；`--live` 可做实弹改名 |
| **命名自动化** | [`scripts/verify_auto_naming_e2e.mjs`](../scripts/verify_auto_naming_e2e.mjs) | 重启后端到端验收：三态分离（未加载/未激活/已激活）+ 造真实会话撞测，一次给出结论 |
| **命名自动化** | [`scripts/name_me.sh`](../scripts/name_me.sh) | **开工一键改名入口**：任何目录一条命令改当前会话名；`--auto` 机器生成、`--check` 只查不改。已纳入门禁放行白名单 |
| **命名自动化** | [`scripts/naming_watchdog.mjs`](../scripts/naming_watchdog.mjs) | **兜底补齐**：漏改时可手动或按需巡一遍；默认 dry-run，`--apply` 执行 |
| **命名自动化** | [`ai-control/config/naming_overrides.json`](../ai-control/config/naming_overrides.json) | 人工指定/豁免清单：闲聊或不当内容的会话指定中性标题，避免机器照抄搬进侧边栏 |
| **模型配置** | [`scripts/probe_max_tokens.mjs`](../scripts/probe_max_tokens.mjs) | 探测服务端接受的 `max_tokens` 区间（边界逐点实测，密钥从 `.credentials.yaml` 内部读取、不打印） |
| **模型配置** | [`scripts/probe_long_output.mjs`](../scripts/probe_long_output.mjs) | 长输出触顶实测（非流式）：验证提高上限后单次回复能否突破旧上限，并给出真实生成速率 |
| **模型配置** | [`scripts/probe_long_output_stream.mjs`](../scripts/probe_long_output_stream.mjs) | 长输出触顶实测（流式）：贴近 DSH 真实调用形态，带进度输出，是判定上限是否生效的决定性口径 |

---

## 🧠 六、能力索引、生态扩展与记忆中枢 (Indexes, Ecosystem & Memory)

| 分类 | 路径 | 核心内容 |
| :--- | :--- | :--- |
| **外部生态** | [`indexes/extension_ecosystem.md`](extension_ecosystem.md) | DSH 外部可扩展能力生态与协议全景矩阵（MCP / Skill / CLI / API / Browser） |
| **快速通道** | [`indexes/shortcuts_index.md`](shortcuts_index.md) | 地图式高速干道路由导航与快速口令矩阵（G0~G3 四级权重） |
| **能力体系** | [`indexes/dsh_capabilities.md`](dsh_capabilities.md) | DSH 宿主基座全景能力架构图与运行机制 |
| **全能力层** | [`indexes/capabilities_index.md`](capabilities_index.md) | 五大能力层（插件/Agent/CLI/MCP/Skill）全景索引与正负案例接口法典 |
| **导航路由** | [`indexes/navigation_router.md`](navigation_router.md) | 地图导航式能力路由层：起点意图到终点落地的三级路由指引与避坑路况模型 |
| **工具接口** | [`indexes/tool_interfaces.md`](tool_interfaces.md) | 全量系统工具与插件标准接口矩阵封装 |
| **长期记忆** | [`memory/context_memory.md`](../memory/context_memory.md) | 用户偏好、长期环境约定与核心参数沉淀 |
| **经验知识** | [`memory/lessons_learned.md`](../memory/lessons_learned.md) | 实战排查出的避坑指南与底层机制认知 |
| **效率审计** | [`memory/efficiency_audit_log.md`](../memory/efficiency_audit_log.md) | 思考决策与执行效率全景量化审计台账 (M1~M6六维指标) |
| **错误台账** | [`memory/error_ledger.md`](../memory/error_ledger.md) | 任务报错归因与防复发长期台账，典型失误指纹与防复发探针 |
