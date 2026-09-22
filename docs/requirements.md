# 全局需求管理台账 (Requirements Ledger)

> ### 🏷️ **版本信息与实施追踪**
> - **当前系统实施总版本**：`v2.9.0`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **最后同步时间**：2026-09-22
> - **版本状态**：`[Release 稳定生效]`

本文档是本项目唯一的**独立核心需求管理台账**。按照系统元规则，所有规则的提出、变动与注销都必须在此记录，杜绝没有需求依据的规则变更。

---

## 📌 状态说明

| 状态标识 | 状态名称 | 具体含义 |
| :--- | :--- | :--- |
| `[ACTIVE]` | **生效中** | 需求已明确，对应规则和文档已在工程中落地并正式运行 |
| `[EVOLVING]` | **演进中** | 需求正在优化、补充边界或经历版本迭代 |
| `[DEPRECATED]` | **已废弃** | 需求已过时或被新方案取代，仅保留文字供历史查阅 |

---

## 🛡️ 智能查重与过滤规则

录入新需求前，必须严格进行三步核对：
1. **查重对比**：比对已有条目的关键词与核心意图；
2. **意图判断**：若新诉求与已有条目目的相同，禁止新建，避免规则库臃肿；
3. **分流处置**：
   - **完全重复**：直接拦截并提示，不重复记录；
   - **增量优化**：在原需求追加变更记录，状态标为 `[EVOLVING]`；
   - **全新诉求**：按序分配新编号（`REQ-xxx`），采用结构化卡片录入。

---

## 📋 结构化需求明细表

### REQ-001: 工程结构化初始化与远程 Git 同步
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 搭建分层清晰的规则目录架构（rules、docs、templates、scripts）；
  2. 初始化本地 Git 仓库并将主分支设为 main；
  3. 绑定远程 GitHub 仓库并完成首次推送。
- **关联文件**：`README.md`、`.gitignore`、`.gitattributes`、`rules/*`
- **验收标准**：
  - [x] 目录骨架建立且包含防丢文件；
  - [x] 成功推送到 GitHub 远程主分支。

---

### REQ-002: 全中文交互基线与需求简化转执行工单
- **当前状态**：`[EVOLVING]` 演进中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 所有会话问答、状态汇报强制使用中文；
  2. 收到复杂任务时，先提炼理解并转为执行工单，再具体动手。
- **关联文件**：`rules/system/meta_rules.md`、`rules/system/language_standard.md`
- **验收标准**：
  - [x] 对话答复统一使用规范中文；
  - [x] 复杂指令优先输出执行文案。
- **演进记录**：
  - **2026-09-16 [优化]**：根据最新要求，将中文化范围扩展到所有工程文档，并明确通俗直白、无生僻字的表达准则（见 REQ-008）。

---

### REQ-003: 标准交互组件与系统命名体系
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 为系统可用工具分配直观的中文名称；
  2. 统一下层架构分层（基座、沙箱、网关、会话）的命名规范；
  3. 建立常用快捷口令速查表。
- **关联文件**：`rules/workflow/component_naming.md`
- **验收标准**：
  - [x] 组件命名规范落地并在文档中公开。

---

### REQ-004: 规则变更双向同步与智能去重全局机制
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 规则的新增、修改、删除必须同步回写本需求文档；
  2. 建立前置查重机制，杜绝重复与冲突。
- **关联文件**：`docs/requirements.md`、`rules/system/meta_rules.md`、`rules/workflow/change_flow.md`
- **验收标准**：
  - [x] 需求文档与规则文件保持严格一一对应。

---

### REQ-005: 全局规则运转逻辑梳理与教学图建设
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 全面梳理系统元规则、变更流程、去重与安全边界；
  2. 输出可视化架构图、决策图与协作时序图。
- **关联文件**：`docs/rules_tutorial.md`
- **验收标准**：
  - [x] 教学文档完整，包含清晰图表与步骤说明。

---

### REQ-006: 搜索引擎逻辑类比映射与智能体思考框架
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 借鉴 Google 工业级搜索引擎核心模块（抓取、意图理解、索引去重、排序仲裁、安全重排、结果交付），完成规则治理同构映射；
  2. 建立智能体“感知 ➔ 意图 ➔ 查重 ➔ 仲裁 ➔ 拦截 ➔ 闭环”六步思考管道。
- **关联文件**：`rules/system/thinking_framework.md`
- **验收标准**：
  - [x] 架构对照表与六步决策管道落地入库。

---

### REQ-007: 规则更新联动排查与存量资源治理机制
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 规则发生任何新增、修改或废除时，必须联动排查既有规则与旧文档；
  2. 及时清理、修订与新规则冲突的存量资源，杜绝孤岛规则和过期失效内容。
- **关联文件**：`rules/workflow/audit_and_cleanup.md`、`rules/workflow/change_flow.md`
- **验收标准**：
  - [ ] 规则变更工作流中新增联动排查步骤；
  - [ ] 存量治理规范明确旧资源的修改、归档与废除操作细则。

---

### REQ-008: 全文档中文化与通俗易懂表达标准
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 全面推进工程内所有文档的中文化，消除不必要的英文外壳；
  2. 语言表达必须通俗、平实、直白，严禁使用生僻字和故弄玄虚的晦涩词汇。
- **关联文件**：`rules/system/language_standard.md`、所有存量文档
- **验收标准**：
  - [ ] 语言规范正文正式发布；
  - [ ] 存量文档完成通俗汉化与文风优化。

---

### REQ-009: 会话自检与目录一键初始化协议
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 规定每次开启新会话或打开文档时的“开箱自检四步法”；
  2. 规定新建文件夹后，只需一句初始化口令即可自动建立占位符、专属说明文档并登记主目录。
- **关联文件**：`rules/system/initialization_protocol.md`、`templates/directory_readme_template.md`、`scripts/init_dir.sh`
- **验收标准**：
  - [x] 初始化流程清晰写入规则；
  - [x] 提供自动化初始化脚本与说明模板。

---

### REQ-010: 任务执行结构化流程与操作指代规范
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 确立任务执行的标准六步闭环流程（探境 ➔ 定标 ➔ 筹策 ➔ 攻坚 ➔ 质检 ➔ 归卷）；
  2. 建立双字代号、单字代号及快捷口令命名系统，支持用户在日常对话中轻量指代与敏捷调度；
  3. 提供利于智能体（Agent）理解与执行的高保真标准需求文案模板。
- **关联文件**：`rules/workflow/task_execution_flow.md`、`README.md`
- **验收标准**：
  - [x] 结构化流程规范文档落库且文风符合中文通俗规范；
  - [x] 命名与指代速查表定义完备；
  - [x] 工程索引与导航完成联动更新。

---

### REQ-011: 任务图形化双层进度条、起止卡片与难度量化打分规范
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 为任务执行过程引入常显的双层全图形化进度标记（全局百分比长条 + 当前阶段节点状态条）；
  2. 规范统一可复用的任务启动图形卡片（Start Card）与完成图形卡片（Finish Card）；
  3. 建立任务栏统一命名规约 `[任务编号][任务难度] 任务概述`，并确立基于四维度（范围+依赖+风险+复杂度）的 1~10 分量化难度打分模型。
- **关联文件**：`rules/workflow/task_execution_flow.md`、`README.md`
- **验收标准**：
  - [x] 规范文档全面扩充图形化组件标准原型与渲染规范；
  - [x] 四维度量化打分模型与分级映射落地并给出清晰示例；
  - [x] 全局索引完成联动排查与同步更新。

---

### REQ-012: 宿主模型多模态图片浏览能力配置与激活
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 排查并定位 DSH 运行环境下多模态模型无法调用 read_image 浏览图片的配置根因；
  2. 在宿主 settings.yaml 中为 gemini-3.8-flash-high 及相关视觉模型显式配置 input: [text, image] 模态声明；
  3. 确保热重载后工具链多模态门禁正确放行，实现原生图片浏览与解析能力。
- **关联文件**：`$DSH_HOME/settings.yaml`、`docs/requirements.md`
- **验收标准**：
  - [x] 成功定位宿主配置路径与源码门禁机制；
  - [x] settings.yaml 正确配置并在当前运行时生效；
  - [x] 完成需求台账登记与审计闭环。

---

### REQ-013: 历史存量任务栏统一命名与量化打分回溯治理
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 回溯并排查当前工作区下的全部历史存量会话任务；
  2. 按照 [任务编号][难度等级·分值/分级] 任务概述 规范，对各历史会话进行四维量化打分；
  3. 调用 DSH 核心 API session.rename 对所有存量会话执行统一重命名，确保 GUI 任务栏彻底保持统一规范。
- **关联文件**：`docs/requirements.md`
- **验收标准**：
  - [x] 存量会话逐一匹配对应 REQ 需求并完成四维难度打分；
  - [x] 通过 session.rename API 成功将最新标题推送至 Web GUI；
  - [x] 需求台账完成审计记录并同步 Git 提交。

---

### REQ-014: 任务极简图形交互、100分制打分与段落吸顶置顶组件
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 建立基于字母代号（R/F/D/S/O/Q）与三位数字的任务分类编码体系；
  2. 升级难度量化模型为 100 分制打分体系；
  3. 严格限制任务栏概述字数在 8 个汉字以内，全面回溯重命名存量会话；
  4. 采用极简轻量图形起止提示符与阶段常显进度指示；
  5. 引入可吸附在 DSH 视口顶部的 Sticky 置顶段落组件规范。
- **关联文件**：`rules/workflow/task_execution_flow.md`、`README.md`、`docs/requirements.md`
- **验收标准**：
  - [x] 规范文档全面更新分类表、100分制打分模型、8字限制与极简图符标准；
  - [x] 吸顶置顶交互组件规范与原型落地；
  - [x] 历史存量会话全部完成 8 字新标题重命名推送；
  - [x] 需求台账与 Git 提交闭环。

---

### REQ-015: 全局体系七维升级与能力索引记忆中枢
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 自动化解决会话漏重命名问题，沉淀 `scripts/rename_session.sh` 并固化首轮定标强制重命名动作；
  2. 将任务标准执行流程提升并固化为全局最高元规则硬性约束；
  3. 建立任务快慢双轨分流管道（简单任务轻量流 ≤35分，复杂任务完备六步流 >35分）；
  4. 将系统所有插件与工具抽象封装为标准函数接口形式，定义输入、输出与边界；
  5. 新增顶级索引层 `indexes/`（包含能力全景、工具接口矩阵与规则索引）；
  6. 新增结构与内容冗余去重与治理机制；
  7. 新增短期（视口吸顶内存）与长期（`memory/` 持久化知识库与避坑指南）双层记忆体系。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/system/initialization_protocol.md`
  - `rules/workflow/task_execution_flow.md`
  - `rules/workflow/audit_and_cleanup.md`
  - `indexes/dsh_capabilities.md`
  - `indexes/tool_interfaces.md`
  - `indexes/rules_index.md`
  - `memory/context_memory.md`
  - `memory/lessons_learned.md`
  - `scripts/rename_session.sh`
  - `README.md`
- **验收标准**：
  - [x] 自动化重命名脚本落地并在执行流中首发调用；
  - [x] 元规则与工作流完成快慢双轨及流程强制硬约束升级；
  - [x] 顶级目录 `indexes/` 与 `memory/` 骨架及说明文档建立；
  - [x] 工具接口矩阵详实封装完成；
  - [x] 结构去重规范明确；
  - [x] 主页 README 完成多层联动索引更新。

---

### REQ-016: 任务栏强制实时命名与原生图形化区块组件标准
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 确立“任务首动即改名”的硬约束，任何新任务开始时首发运行重命名脚本，确保左侧任务栏永远实时准确对应；
  2. 针对 DSH 聊天引擎将裸 HTML 标签转义为乱码字符串的问题，彻底杜绝 `<details>` 与 `<div>`，制定基于 GFM 原生语法的图形化区块卡片标准；
  3. 提供长文按逻辑切块的区块化卡片模板资产。
- **关联文件**：
  - `rules/workflow/task_execution_flow.md`
  - `memory/lessons_learned.md`
  - `templates/graphical_block_template.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 会话任务栏实时重命名已通过脚本首发执行；
  - [x] 排查出 DSH 聊天转义 HTML 的底层根因并录入避坑经验库；
  - [x] 零乱码原生图形化卡片组件规范与模板落库；
  - [x] 台账与 Git 提交闭环。

---

### REQ-017: AI分层架构下长短期记忆体系落地与存储规范
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 基于现代 AI 四层架构（模型层、上下文层、编排层、存储层），系统确立短期工作记忆与长期持久记忆的协同机制；
  2. 规范短期工作记忆在会话生命周期中的意图锚定、步骤维持与视口聚焦机制；
  3. 规范长期持久记忆的存储载体（文件知识库、关系数据库、向量库）以及在 `memory/` 目录下的持久化与跨会话自检召回机制；
  4. 产出《AI 分层长短期记忆体系架构与工程落地规范》技术说明文档。
- **关联文件**：
  - `docs/memory_architecture.md`
  - `memory/context_memory.md`
  - `memory/lessons_learned.md`
  - `indexes/rules_index.md`
  - `README.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 架构文档 `docs/memory_architecture.md` 撰写落库；
  - [x] `memory/` 长期记忆中枢使用与回写规范完善；
  - [x] 全局索引与 README 联动更新；
  - [x] Git 提交与远程同步闭环。

---

### REQ-018: 快速通道快捷词汇与指令路由机制
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.2.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 用户输入自然语言快捷词（例如“看看当前dsh体系能力”），智能体秒级匹配输出 DSH 全景能力架构图与具体说明；
  2. 建立快速通道快捷词汇映射矩阵，杜绝冗余多轮会话消耗；
  3. 沉淀快捷通道使用指南至索引目录；
  4. 产出端到端任务流转全景流程图（Mermaid + ASCII 框线架构）并集成落库。
- **关联文件**：
  - `indexes/shortcuts_index.md`
  - `indexes/dsh_capabilities.md`
  - `docs/diagram_generation_guide.md`
  - `rules/workflow/component_naming.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 快速通道索引文件 `indexes/shortcuts_index.md` 建立；
  - [x] 输入“看看当前dsh体系能力”等词汇具备标准化全量输出路由；
  - [x] 端到端任务流转全景流程图持久化落库至 `indexes/dsh_capabilities.md`；
  - [x] 实施版本号与工程保持同步。
- **演进记录**：
  - **2026-09-16 [升级 v1.2.0]**：在 `indexes/dsh_capabilities.md` 中集成端到端任务流转全景流程图（Mermaid 与 ASCII 框线架构），联动外部生态扩展与图解指南。

---

### REQ-019: Unity 结构化工程目录与文件形式全局规范
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.1.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 审计 Unity 工程常见文件形式与组织弊病，制定清晰工业级目录规范（根目录 `_Project/` 划分等）；
  2. 确立 C# 脚本架构规范（程序集定义 asmdef 隔离、Runtime 与 Editor 解耦、生命周期规范）；
  3. 确立 Unity 关键文件与元数据规范（`.meta` 同步生命周期铁律、资产命名与 GUID 引用防丢）。
- **关联文件**：
  - `rules/coding/unity_project_standard.md`
  - `indexes/rules_index.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 规范文档 `rules/coding/unity_project_standard.md` 落地；
  - [x] 包含标准工程目录树、文件类型定义、代码分层与 .meta 安全铁律；
  - [x] 实施版本号与工程保持同步。

---

### REQ-020: 统一知识库架构建设与需求前置冲突审查机制
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.1.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 建立顶级目录 `knowledge/` 及其自检四件套；
  2. 规范化落地三套核心知识库：世界观故事背景、美术规范、工程规范，内容详实且结构化；
  3. 硬化“需求与代码编写前置审查知识库机制”，在执行流程与元规则中强制前置核验，保证新内容与知识库绝不冲突。
- **关联文件**：
  - `knowledge/README.md`
  - `knowledge/worldview_background.md`
  - `knowledge/art_specification.md`
  - `knowledge/engineering_specification.md`
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] `knowledge/` 目录及三套知识库规范完整建立；
  - [x] 世界观、美术、工程规范包含具体基线内容与编写指南；
  - [x] 元规则与任务执行流硬化知识库前置核验阻断逻辑；
  - [x] 实施版本号与工程保持同步。

---

### REQ-021: 需求与知识库全生命周期实施版本号同步规范 (SemVer)
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.1.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 制定语义化版本号管理规范（`vMAJOR.MINOR.PATCH`）；
  2. 在需求台账与所有知识库文档头部增加版本信息与实施追踪区；
  3. 确立“代码落地、需求台账与知识库版本必须同批次原子递增”的同步铁律，杜绝版本滞后与割裂。
- **关联文件**：
  - `rules/workflow/versioning_standard.md`
  - `docs/requirements.md`
  - `knowledge/*`
  - `indexes/rules_index.md`
- **验收标准**：
  - [x] 版本治理规范文档落地；
  - [x] 需求台账全量补充实施版本号并标明当前系统总版本号 `v1.1.0`；
  - [x] 知识库文档头部全量具备版本追踪元数据并保持一致。

---

### REQ-022: 系统操作与工程设计原子性事务边界规范
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.1.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 明确界定“原子性”判定标准（全成或全败、不留中间态脏数据与半成品）；
  2. 系统梳理并明确操作级原子性清单（需求与规则双向同步、目录四件套、Unity资源与.meta同生共死、文件写入事务）；
  3. 梳理设计级原子性清单（存档保存、游戏交易消耗、业务状态机流转、网络包协议处理）；
  4. 给出原子性事务失败回滚机制与工程实操准则。
- **关联文件**：
  - `rules/coding/atomicity_specification.md`
  - `rules/system/meta_rules.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 原子性规范文档 `rules/coding/atomicity_specification.md` 落地；
  - [x] 操作级与设计级原子性分类详实，覆盖日常研发与 Unity 开发；
  - [x] 实施版本号与工程保持同步。

---

### REQ-023: 外部智能体能力生态 (MCP / Skill / CLI / API) 扩展全景调研与矩阵建设
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.2.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 系统调研现代 AI 智能体生态最前沿的 6 大可扩展能力（MCP 协议、Agent Skills、CLI 工具链、OpenAPI 自动反射、Playwright 无头浏览器、插件集成）；
  2. 梳理官方及开源精选 MCP Servers 清单与通信机制；
  3. 输出《DSH 外部可扩展能力生态与协议全景矩阵》文档。
- **关联文件**：
  - `indexes/extension_ecosystem.md`
  - `indexes/dsh_capabilities.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 扩展矩阵文档 `indexes/extension_ecosystem.md` 落地；
  - [x] 覆盖 MCP、Skill、CLI、API、浏览器与插件六大维度并提供横向对比；
  - [x] 实施版本号与工程保持同步。

---

### REQ-024: 全场景流程图、信息图与教学图生成技术指南与标准模板库
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.2.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 梳理五大主流图表生成技术方案（ASCII 字符图、Mermaid.js、原生 SVG、PlantUML、Excalidraw）；
  2. 建立针对终端会话、工程文档、高保真卡片的场景选型决策树；
  3. 提供流程图、时序图、状态图、SVG 信息卡片标准模版库及 AI 防踩坑铁律；
  4. 输出《全场景流程图、信息图与教学图生成技术指南与标准模板库》文档。
- **关联文件**：
  - `docs/diagram_generation_guide.md`
  - `templates/graphical_block_template.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 指南文档 `docs/diagram_generation_guide.md` 建立；
  - [x] 包含场景决策树、横向对比表格与即拷即用标准模版库；
  - [x] 实施版本号与工程保持同步。

---

### REQ-025: 图形生成模型模态配置激活与绘图管道建设
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.2.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 调整宿主配置 `$DSH_HOME/settings.yaml`，为模型补充 `output: [image]` / `output: [text, image]` 模态声明，并扩充可用图像生成模型；
  2. 落地 `scripts/generate_image.py` 绘图脚本，支持 API 与本地矢量双模式，自动保存至 `assets/generated_images/`；
  3. 建立 Web 界面 `![描述](路径)` 直接图显闭环，并在快捷通道字典中增加口令直达。
- **关联文件**：
  - `$DSH_HOME/settings.yaml`
  - `scripts/generate_image.py`
  - `indexes/shortcuts_index.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 宿主配置文件模态声明生效；
  - [x] 图像生成脚本 `scripts/generate_image.py` 成功产出测试图并实现图显；
  - [x] 实施版本号与工程保持同步。

---

### REQ-026: Codex全局规则吸收与DSH执行契约升华
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.3.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. 深度审计用户输入的 Codex 15 条全局高密度规则，提炼核心工程价值，并根据当前 DSH 运行时能力与免审批环境进行适配解耦；
  2. 确立“报错三段式释义（中文释义 + 根本原因 + 修复建议）”，并固化到系统元规则；
  3. 引入“六维需求价值评分模型（含变现可行性，各项10分/总60分）”，与原有“100分难度打分模型”形成“价值-难度双螺旋决策矩阵”；
  4. 固化“上下文经济学（同路径同步骤指纹单次读取，写后或变更才重读）”与“两步无进展留证熔断恢复机制”；
  5. 明确“能力派生摘要必带明确负面案例/反例”与“交付只给已验证入口并保留可用回滚”铁律；
  6. 产出结构化、极简利于智能体高质执行的《DSH 智能体核心执行契约与需求规范手册》。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `indexes/rules_index.md`
  - `README.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 提炼输出面向 DSH 执行的高效结构化需求文案；
  - [x] 系统元规则与任务执行流程完成增量吸收与升级；
  - [x] 全局实施版本号统一推进至 `v1.3.0`。

---

### REQ-027: 交互式输出入口标准与地图式高速干道路由规范
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.4.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. **结构化输出入口必给规范 (Delivery-as-an-Entrypoint)**：
     - 交付物输出必须提供直达入口：网页必须给完整 URL，图片必须给 Markdown 图片渲染及可点击打开链接，文件/脚本给出直接执行命令与可点击文件路径；
     - 在系统元规则与任务流程【归卷】阶段确立统一标准。
  2. **地图式高速干道路由机制 (High-Weight Arterial Routing)**：
     - 参考地图导航“高速优先、主干收敛、避免小道”算法，将全局规则与指令路由分划为四级路网（G0 宪法级元规 ➔ G1 业务高速主干 ➔ G2 细分领域支线 ➔ G3 辅助旁道）；
     - 优先命中高权重高速干道，实现秒级收敛，避免大模型漫游遍历消耗上下文。
  3. **现有规则体系全量审计与短板补齐**：
     - 补齐此前未建立的 `rules/security/security_baseline.md` 免审批安全基线防破坏细则；
     - 完善 `indexes/shortcuts_index.md` 干道路由权重字典；
     - 系统实施版本号推进至 `v1.4.0`。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `rules/security/security_baseline.md`
  - `indexes/shortcuts_index.md`
  - `rules/system/thinking_framework.md`
  - `indexes/rules_index.md`
  - `README.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 交付物输出入口规范化组件确立；
  - [x] 地图式四级干道路由模型建立并完成索引更新；
  - [x] `rules/security/security_baseline.md` 安全自律规则落地；
  - [x] 实施总版本号推进至 `v1.4.0`。

---

### REQ-028: 全流程不可跳步固化机制、会话命名首动门禁与全景效率量化审计看板
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.5.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. **全流程不可跳步固化 (Strict 16-Step Pipeline)**：
     - 将标准六步闭环（探-定-筹-攻-验-归）固化为不可拆解、不可合并、不可脑内跳过的十六个标准细分工序；
     - 每一工序必须输出明确的执行回执或证据卡片，杜绝随意跳步与执行漂移。
  2. **会话重命名首动门禁机制 (First-Action Handshake Gate)**：
     - 系统性解决“侧边栏任务命名丢失或截断”痛点，确立硬性契约：
     - 任何任务首轮定标后，发出的第一个工具调用必须且必定是 `./scripts/rename_session.sh`，未完成重命名禁止下发任何业务文件写操作；
     - 开箱自检协议与收尾归卷协议双重设卡拦截校准。
  3. **效率量化审计机制与可溯源台账 (Efficiency Audit Ledger)**：
     - 建立涵盖 6 项量化指标（意图收敛度、思考管道耗时、工具调用有效率、写后读回覆盖率、流程完整度、命名履约率）的效率评估模型；
     - 新建 `memory/efficiency_audit_log.md` 长期审计台账，支持跨任务横向对比与后续自调优；
     - 在任务收尾【归卷】阶段强制输出《任务执行效率与思考审计指标卡片》。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `memory/efficiency_audit_log.md`
  - `indexes/rules_index.md`
  - `README.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 确立首动作重命名强制门禁；
  - [x] 细化十六步不可跳步固化流程与阶段交付证据要求；
  - [x] 建立 `memory/efficiency_audit_log.md` 台账与六维量化审计指标模型；
  - [x] 实施总版本号推进至 `v1.5.0`。

---

### REQ-029: DSH全景能力体系流程深度梳理与高保真矢量教学图解
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.6.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. **能力体系深度剖析与架构全景可视化**：
     - 细致梳理 DSH 四层分层架构（呈现感知层、宿主控制层、核心执行层、外部扩展层）与核心机制（8字标题投影、无乱码吸顶卡片、SSE 实时流、JSONL.zstd 增量压缩与分支、danger-full-access 免审批沙箱、多模态直读、多智能体协同流水线）；
     - 设计并生成现代暗黑风格的高保真矢量架构信息图 `assets/generated_images/dsh_system_architecture_infographic.svg`。
  2. **端到端执行流程教学与工序固化**：
     - 梳理双轨分流决策（快轨 ≤35分 vs 慢轨 >35分）与不可跳步的标准十六步流水线；
     - 设计并生成全流程教学流程图 `assets/generated_images/dsh_pipeline_teaching_flowchart.svg`，涵盖门禁证据、工具调度、写后读回与三位一体归卷；
     - 生成 1200px 高清渲染栅格图，并通过 `read_image` 完成多模态原图质检闭环。
  3. **生态联动与审计合规**：
     - 同步更新能力索引文档 `indexes/dsh_capabilities.md`，内嵌高保真图表；
     - 记录审计明细至 `memory/efficiency_audit_log.md`，全局实施总版本号推进至 `v1.6.0`。
- **关联文件**：
  - `indexes/dsh_capabilities.md`
  - `assets/generated_images/dsh_system_architecture_infographic.svg`
  - `assets/generated_images/dsh_pipeline_teaching_flowchart.svg`
  - `memory/efficiency_audit_log.md`
  - `README.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 产出四层架构全景信息图与十六步流水线教学流程图；
  - [x] 原生免库 `read_image` 质检验证图像高清渲染无变形；
  - [x] 能力索引文档内嵌图表与链接无缝更新；
  - [x] 需求台账、审计日志与工程实施总版本号推进至 `v1.6.0`。

---

### REQ-030: 分层知识库多项目隔离架构与原子级全平台工程规范
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.7.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. **Codex 与 DSH 能力体系流程对比图解**：
     - 梳理 Codex（专用子代理矩阵/外层Hook/Confirm）与 DSH（四级干道路由/十六步流水线/免审批自律/M1~M6效率审计）的全景对比与转化映射；
     - 产出高保真矢量信息图 `assets/generated_images/codex_vs_dsh_architecture_comparison.svg`。
  2. **知识库分层架构重构与多项目物理隔离**：
     - 确立 `knowledge/common/`（跨项目公共规范共享）与 `knowledge/projects/`（按工程物理隔离）双层拓扑架构；
     - 产出分层架构教学图 `assets/generated_images/knowledge_base_layered_architecture.svg`；
     - 将游戏世界观等特定资产隔离进 `knowledge/projects/aether_echo/`，严格阻断跨业务上下文污染。
  3. **细化到原子级的跨平台工程与交互规范**：
     - **交互规范**：格式塔六大定律（接近/相似/闭合/主体背景）与 Don't Make Me Think 零思考直觉、防呆与三秒法则；
     - **Unity 规范**：主页面必做成 Scene、弹窗浮层必做成 Prefab、按钮必配 Drop Shadow 阴影与物理下沉动效、动静分离双 Canvas 与 `.meta` 同生共死；
     - **Web 规范**：页面路由懒加载、Modal Portal 挂载防层叠上下文污染、立体 box-shadow 与骨架屏；
     - **小程序规范**：主包 ≤1.5MB、组件化弹窗与防滚动穿透、`hover-class` 原生按压、`setData` 路径差量更新。
- **关联文件**：
  - `knowledge/README.md`
  - `knowledge/common/*`
  - `knowledge/projects/*`
  - `assets/generated_images/codex_vs_dsh_architecture_comparison.svg`
  - `assets/generated_images/knowledge_base_layered_architecture.svg`
  - `README.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 完成两张高保真矢量对比与教学图创建并支持直达；
  - [x] `knowledge/common/` 六大通用规范文件落地，细致到 Scene/Prefab/阴影/格式塔像素级；
  - [x] `knowledge/projects/` 建立物理隔离，完成示例项目迁移；
  - [x] 全局实施总版本号推进至 `v1.7.0`。

---

### REQ-031: 智能体四大工程交付规范与自迭代演进体系
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.8.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **核心诉求与目标**：
  1. **前置风险揭示与评估机制 (Pre-flight Risk Disclosure)**：
     - 凡谋先审险，凡动必有备。在动手编写代码或变更环境前，必须通过四维风险雷达（技术依赖、数据破坏、需求边界、权限安全）显式评估并输出《前置风险评估卡》与回滚预案；
     - 遇到不可逆高危操作强制阻断提示确认。落地 `rules/workflow/risk_disclosure.md` 与 `templates/risk_assessment_template.md`。
  2. **自动化测试与 100% 绿灯质量门禁 (Automated Testing & Quality Gate)**：
     - 需求即断言，工程未测非可信。必须将需求映射为可自动运行的测试用例，通过终端真实执行；
     - 确立 100% 绿灯硬门禁，未测或测试失败严禁结项交付。落地 `rules/coding/testing_and_quality_gate.md`。
  3. **页面资产台账与截图指代规范 (Page Ledger Protocol)**：
     - 视图必有凭据，页面皆有命名，一项目一册。前端/GUI 项目必须为所有页面在标准视口下捕获截图，按四段式规范命名（`Page_[模块]_[页面]_[状态].png`），在独立《项目页面台账》中全生命周期追踪；
     - 多轮对话必须按台账编号（如 `P-001`）精准指代。落地 `rules/workflow/page_ledger_specification.md` 与 `templates/page_ledger_template.md`。
  4. **任务复盘与系统自迭代进化体系 (Post-Mortem & Self-Evolution)**：
     - 任务交付非终点，复盘沉淀促进化。收尾阶段强制输出 AAR 复盘报告，剖析偏差、深挖根因、提出规则与工作流演进建议；
     - 双向自迭代闭环：排坑实战认知即时增量写入 `memory/lessons_learned.md`，流程优化推动规则库版本持续升级。落地 `rules/workflow/post_mortem_and_evolution.md` 与 `templates/post_mortem_template.md`。
- **关联文件**：
  - `rules/workflow/risk_disclosure.md`
  - `rules/coding/testing_and_quality_gate.md`
  - `rules/workflow/page_ledger_specification.md`
  - `rules/workflow/post_mortem_and_evolution.md`
  - `templates/risk_assessment_template.md`
  - `templates/page_ledger_template.md`
  - `templates/post_mortem_template.md`
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `rules/workflow/versioning_standard.md`
  - `memory/lessons_learned.md`
  - `README.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 四大工程规范文档全部落地并读回验证；
  - [x] 三套标准卡片与台账模板全部落地；
  - [x] 系统最高元规则与十六步流水线深度融合联动；
  - [x] 经验记忆库完成避坑条目增量更新；
  - [x] 自动化测试验证脚本全部跑通；
  - [x] 实施总版本号严格推进至 `v1.8.0`。

---

### REQ-032: DSH 宿主原生可视化组件体系架构梳理与分层知识库归卷
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v1.9.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **标准需求重构文案 (利于 Agent 执行的标准化任务单)**：
  - **任务代号**：`DSH-NATIVE-UI-DISCOVERY-AND-CATALOG`
  - **背景阐述**：DeepSeek Harness (DSH) 官方 Web 客户端基于 Cordis 微内核与 React Slot 插槽体系构建。为了让智能体与研发人员在任务执行、组件设计、图表生成与工具调用中无缝调用原生呈现能力，需对宿主运行时前端包（`@deepseek-ai/dsh-client-ui-*`）进行源码级逆向梳理，建立权威的可视化组件命名对照表与插槽拓扑，并沉淀入库。
  - **范围界定**：覆盖视口外壳、左侧侧边栏、双视图环 (Chat/Trajectory)、对话流节点、原子工具卡片、右侧详情抽屉、输入坞控制区、抢占式面板及偏好设置中心九大层级。
  - **核心诉求与交付物**：
    1. **源码级架构解构**：深度解析 Cordis 插槽驱动机制（`single` / `keyed` / `list` / `chain` 四类 Slot）与 Projection 响应式投影；
    2. **中英文分类命名全集**：给出 30+ 原生可视化组件的中英文名称、类名标识、Slot Key、对应 npm 包与交互职能对照表；
    3. **知识库沉淀与法典化**：落成 `knowledge/common/dsh_native_ui_components.md`，并在 `knowledge/README.md` 与 `indexes/dsh_capabilities.md` 中建立双向检索通道；
    4. **规范实施与版本同步**：严格执行三位一体强同步，将系统实施总版本递增至 `v1.9.0`。
- **关联文件**：
  - `knowledge/common/dsh_native_ui_components.md`
  - `knowledge/README.md`
  - `indexes/dsh_capabilities.md`
  - `indexes/rules_index.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 源码层深度排查 DSH 运行时所有 `dsh-client-ui-*` 模块；
  - [x] 形成九大层级、分类详尽的原生可视化组件与 Slot 插槽命名清单；
  - [x] 完成《DSH 宿主原生可视化组件与插槽体系法典》入库与读回校验；
  - [x] 完成知识库总目录及全景能力矩阵的索引联动更新；
  - [x] 需求台账、知识库与能力索引版本号原子同步至 `v1.9.0`。

---

### REQ-033: 系统运行能效三维优化工程 (磁盘自愈 + Token 瘦身 + 流程分层)
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v2.0.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **标准需求重构文案 (利于 Agent 执行的标准化任务单)**：
  - **任务代号**：`SYS-TRIPLE-OPTIMIZATION`
  - **背景阐述**：针对系统磁盘水位逼近 96% 告警上限、规则库上下文 Token 膨胀以及部分轻量任务受困于繁冗工序的痛点，实施三位一体系统能效优化工程。
  - **核心诉求与交付物**：
    1. **周期性硬盘检测与安全自愈清理**：编写运维自愈脚本 `scripts/disk_check_and_cleanup.sh`，设置 90% 空间告警阈值，扫描清除临时溢出目录 (`dsh-spill-*`) 与元数据碎片；建立 `knowledge/`、`memory/`、`rules/`、`indexes/`、`docs/` 绝对禁止删除的有价资产白名单保护制度，并沉淀入 `rules/workflow/audit_and_cleanup.md`。
    2. **全局规则高密度 Token 瘦身压缩**：重构 `rules/system/meta_rules.md`、`rules/workflow/task_execution_flow.md` 等核心文件，提炼十七大元法则，剔除冗长情绪化铺垫，信息密度提升，规则核心文档行数精简 60%+，显著降低模型装载开销。
    3. **流程硬约束 (Hard Line) 与捷径通道 (Fast Track) 显式分层落地**：明确界定高危/核心任务必走十六道工序，单点轻量/查询/微调任务准许走敏捷三步流（豁免改名、免四维大表、免 todo_write、读回代测、精要交付），在 `task_execution_flow.md` 与 `shortcuts_index.md` 深度落地，确保规则与落实一致。
    4. **版本治理三位一体强同步**：推进全局实施总版本号至里程碑式 `v2.0.0`。
- **关联文件**：
  - `scripts/disk_check_and_cleanup.sh`
  - `rules/workflow/audit_and_cleanup.md`
  - `rules/workflow/task_execution_flow.md`
  - `rules/system/meta_rules.md`
  - `indexes/shortcuts_index.md`
  - `indexes/rules_index.md`
  - `knowledge/README.md`
  - `indexes/dsh_capabilities.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 落地 `scripts/disk_check_and_cleanup.sh` 并真实执行 `--clean` 成功释放临时垃圾；
  - [x] 确立核心资产白名单保护机制，并写入 `rules/workflow/audit_and_cleanup.md`；
  - [x] 重构 `rules/workflow/task_execution_flow.md` 显式划分强制流程与捷径通道；
  - [x] 重构 `rules/system/meta_rules.md`，实现核心规则高密度 Token 瘦身；
  - [x] 更新 `indexes/shortcuts_index.md` 注入磁盘清理口令与双轨判定矩阵；
  - [x] 全局文档版本号与需求台账强同步推进至 `v2.0.0`。

---

### REQ-034: 任务全生命周期 DSH 原生可视化组件全量深度装配
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v2.1.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **标准需求重构文案 (利于 Agent 执行的标准化任务单)**：
  - **任务代号**：`NATIVE-VISUAL-FULL-PIPELINE-INTEGRATION`
  - **背景阐述**：DSH 客户端具备基于 Cordis 插件与 React Slot 构建的高保真原生可视化系统（包括侧边栏标题、TodoPanel、GoalBar、各工具专用原子卡片、可点击交付链接、时序轨迹等）。为彻底消除文字单调白板与能力闲置，将任务执行过程中所有涉及可视化的节点进行 100% 全量组件化强绑定。
  - **核心诉求与交付物**：
    1. **全生命周期组件装配法典化**：在 `rules/workflow/task_execution_flow.md` 第三节详细定义全工序可视化组件 100% 装配矩阵，涵盖 11 类核心场景（标题投影、GoalBar、TodoPanel、TerminalCard、ReadCard、DiffCard、SearchCard、WebCard、UserQuestionsView、turnTail 可点击产出、GFM 色条区块）；
    2. **知识库装配契约入库**：在 `knowledge/common/dsh_native_ui_components.md` 第五节增设智能体任务全生命周期装配契约；
    3. **即刻实装与实效呈现**：在当前及后续任务交互中，严格执行 `todo_write` 驱动输入坞进度条、专用工具驱动原子卡片、行内代码驱动可点击交付物、GFM 引用块驱动主题高亮卡；
    4. **三位一体版本号强同步**：推进全局实施总版本号至 `v2.1.0`。
- **关联文件**：
  - `rules/workflow/task_execution_flow.md`
  - `knowledge/common/dsh_native_ui_components.md`
  - `indexes/dsh_capabilities.md`
  - `indexes/rules_index.md`
  - `knowledge/README.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 确立任务全流程 11 大原生可视化组件强绑定装配矩阵；
  - [x] 更新 `task_execution_flow.md` 并读回校验；
  - [x] 更新 `dsh_native_ui_components.md` 并写入装配契约；
  - [x] 知识库总览、规则总索引与能力全景版本号原子同步推进至 `v2.1.0`；
  - [x] 本轮输出完整践行原生组件驱动，包含可点击交付物与 GFM 原生卡片。

---

### REQ-035: DSH-First 项目立项赋能、全景能力树与双层接口法典化规范
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v2.2.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **标准需求重构文案 (利于 Agent 执行的标准化任务单)**：
  - **任务代号**：`DSH-CAPABILITY-TREE-AND-DUAL-TIER-SPEC`
  - **背景阐述**：新项目规划若缺乏与 DSH 宿主基座的深度联动，极易沦为孤岛；同时，宿主能力缺乏全景树形拓扑，导致人类与智能体检索效率受限；工具接口缺乏反例约束与执行代码示例，容易诱发调用幻觉与执行反复。
  - **核心诉求与交付物**：
    1. **立项 DSH-First 强约束机制**：确立新项目必须优先评估 DSH 六维能力树且至少集成 1 项（CLI/MCP/API/插件/Agent/Skill），在 `rules/system/meta_rules.md` 增设立项第十八条，并落地 `templates/project_dsh_bootstrap_template.md`（《项目 DSH 赋能规划卡》标准模板）；
    2. **DSH 全景能力六维树形拓扑**：在 `indexes/dsh_capabilities.md` 中重构注入完整的六维能力架构树（CLI、MCP、API、Plugins、Multi-Agent、Skills），支持秒级极速定位；
    3. **双层能力接口规范全面落地**：重构 `indexes/tool_interfaces.md`，对核心工具统一编写“外层索引卡（名称、核心描述、正向边界 When to use、反例约束 When NOT to use）”与“内层实操手册（参数 Schema、执行代码示例、前端可视化映射、异常防御）”；
    4. **三位一体版本号强同步**：推进全局实施总版本号至 `v2.2.0`。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `templates/project_dsh_bootstrap_template.md`
  - `indexes/dsh_capabilities.md`
  - `indexes/tool_interfaces.md`
  - `indexes/rules_index.md`
  - `knowledge/README.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 最高元规则注入第十八条“立项 DSH 优先与保底集成律”；
  - [x] 落地《项目 DSH 赋能规划卡标准模板》；
  - [x] 完成 DSH 全景能力六维树形拓扑结构图谱构建并写入能力矩阵；
  - [x] 工具接口手册全面补齐外层反例约束与内层可执行代码示例；
  - [x] 需求台账、规则总索引与知识库总目录版本号强同步推进至 `v2.2.0`。

---

### REQ-036: 全域资产最新规则对齐、数字指纹机制与新鲜度追踪工程
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v2.3.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **标准需求重构文案 (利于 Agent 执行的标准化任务单)**：
  - **任务代号**：`ASSET-FINGERPRINT-AND-FULL-SPECTRUM-ALIGNMENT`
  - **背景阐述**：消除新旧任务双重标准与存量资产规则落后断层；建立数字指纹机制，快速辨别全域内容新鲜度，预防暗中代码与规范漂移。
  - **核心诉求与交付物**：
    1. **全域资产最新规则对齐律**：新增任务严格按最新规范执行，存量资产遵循“遇碰即对齐 (Touch-and-Align)”机制，修改到哪里就升级对齐到哪里；在 `rules/system/meta_rules.md` 增设第十九条，并强化 `task_execution_flow.md` 执行工序；
    2. **工程数字指纹与新鲜度三级雷达**：建立资产短指纹（SHA-256 8位）+ 修改时间 + 声明版本的追踪体系，划分 🟢TIER-0 Fresh / 🟡TIER-1 Stale / ⚪TIER-2 None 三级状态；
    3. **自动化嗅探脚本与持久化台账**：落地 `scripts/fingerprint_audit.sh`（支持 `--freshness` 雷达看盘、`--scan` 刷新底册、`--verify` 一致性断言），并生成持久化台账 `memory/asset_fingerprint_ledger.md`；
    4. **三位一体版本号强同步**：推进全局实施总版本号至 `v2.3.0`。
- **关联文件**：
  - `scripts/fingerprint_audit.sh`
  - `memory/asset_fingerprint_ledger.md`
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `indexes/shortcuts_index.md`
  - `indexes/rules_index.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 落地 `scripts/fingerprint_audit.sh` 并实测跑通三种运行模式；
  - [x] 生成并入库 `memory/asset_fingerprint_ledger.md`；
  - [x] 元规则增设第十九条，流程法典固化“遇碰即对齐”工序；
  - [x] 快捷口令索引注入“资产指纹 / 新鲜度雷达”命令；
  - [x] 需求台账与全局所有关联文档版本原子同步推进至 `v2.3.0`。

---

### REQ-037: 工程远程 Git 强同步、缺地址开页引导与独立仓库治理规约
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v2.4.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **标准需求重构文案 (利于 Agent 执行的标准化任务单)**：
  - **任务代号**：`ENGINEERING-REMOTE-GIT-MANDATORY-SYNC`
  - **背景阐述**：消除工程改动停留在本地单机可能导致的资产脱节与丢失风险；杜绝多工程混用同一 Git 地址引起的代码与规范污染；解决缺失远程地址时缺乏主动开页引导的痛点。
  - **核心诉求与交付物**：
    1. **远程 Git 强同步硬门禁**：凡发生代码/规则/配置变更的任务，收尾 S15 工序必须执行 `git_sync_remote.sh` 成功推送到远端；未推送到远程严禁声称交付闭环；
    2. **缺地址智能探针与开页引导**：无远程 `origin` 时，自动调用操作系统指令唤起常用代码托管平台新建仓库页面（GitHub/Gitee），并在终端引导用户绑定 URL；
    3. **一工程一独立仓库原则**：每个工程项目必须使用专属独立的远程仓库地址，严格物理隔离；
    4. **动态任务摘要 Commit Message 规范**：格式标准化为 `<type>(<scope>): [<任务代号>] <8字概述> - <变更事实摘要>`；
    5. **最高元规则与流水线固化**：元规则增设第二十条，十六步流水线与快捷口令全面接入，全局实施总版本号严格推进至 `v2.4.0`。
- **关联文件**：
  - `scripts/git_sync_remote.sh`
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `indexes/shortcuts_index.md`
  - `indexes/rules_index.md`
  - `knowledge/README.md`
  - `indexes/dsh_capabilities.md`
  - `indexes/tool_interfaces.md`
  - `memory/asset_fingerprint_ledger.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 落地 `scripts/git_sync_remote.sh` 支持智能探针、开页引导与自动推送；
  - [x] 最高元规则固化第二十条“工程远程 Git 强同步与独立仓库律”；
  - [x] S15 流程固化远程 Git 强同步门禁；
  - [x] 快捷口令索引注入“远程同步”命令；
  - [x] 当前全量累积变更真实执行推送至远程 GitHub 仓库并收集 Commit-Hash；
  - [x] 需求台账、规则总索引与知识库总目录版本强同步推进至 `v2.4.0`。

---

### REQ-038: 上下文压缩同语种一致性与语言镜像保真规约
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v2.5.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **标准需求重构文案 (利于 Agent 执行的标准化任务单)**：
  - **任务代号**：`CONTEXT-COMPACTION-LANGUAGE-CONSISTENCY`
  - **背景阐述**：在长会话触发自动检查点或上下文压缩时，由于英文预设 Prompt 干扰，容易误将中文对话提炼为英文摘要，破坏了语言一致性并引入阅读疲劳与认知漂移。
  - **核心诉求与交付物**：
    1. **同语种镜像保真硬门禁**：确立上下文压缩、检查点提炼与跨轮次摘要输出语言必须与前文主导输入语种 100% 保持一致（输入是中文，压缩提炼必须完全使用中文，严禁跳切为英文摘要）；
    2. **元规则第三条升级**：在 `rules/system/meta_rules.md` 第三条明确写入“上下文压缩同语种镜像保真律”；
    3. **语言规范法典化**：重构 `rules/system/language_standard.md`，新增第二节《上下文压缩与跨轮摘要同语种镜像守则》及五大标准化中文提炼骨架；
    4. **流程法典与全局索引同步**：在 `task_execution_flow.md` S01 增加语种自检，全局总索引与知识库推进至 `v2.5.0`；
    5. **三位一体版本强同步与 Git 强推**：刷新资产指纹台账，执行 `scripts/git_sync_remote.sh` 强同步推送到远程仓库。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/system/language_standard.md`
  - `rules/workflow/task_execution_flow.md`
  - `indexes/rules_index.md`
  - `indexes/dsh_capabilities.md`
  - `indexes/tool_interfaces.md`
  - `indexes/shortcuts_index.md`
  - `knowledge/README.md`
  - `memory/asset_fingerprint_ledger.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 元规则第三条固化“上下文压缩同语种镜像保真律”；
  - [x] 重构升级 `rules/system/language_standard.md` 写入中文提炼模板；
  - [x] 执行流程法典 S01 强化语种自检；
  - [x] 需求台账、规则总索引与知识库总目录版本强同步推进至 `v2.5.0`；
  - [x] 资产指纹通过校验，变更成功推送到远端 Git 仓库。

---

### REQ-039: 全自动轻量级全局调度锁与并发资源防冲突规约
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v2.6.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **标准需求重构文案 (利于 Agent 执行的标准化任务单)**：
  - **任务代号**：`AUTOMATED-GLOBAL-SCHEDULER-LOCK`
  - **背景阐述**：在多任务、多智能体协同或运行后台工作流时，并发修改同一核心文件或执行 Git 提交容易发生争抢与脏写冲突；传统的排队缺乏自动化自愈机制，容易导致死锁或效率停滞。
  - **核心诉求与交付物**：
    1. **全自动读写分离分级调度**：只读操作默认放行多任务共享并发；变更与敏感操作自动申领排他独占锁，互斥隔离杜绝打架；
    2. **POSIX 原子锁与极速效能**：基于目录原子创建机制实现微秒级低开销加锁，免去重型依赖；
    3. **超时熔断自愈 (TTL)**：排他锁默认持有超时为 180 秒，超时后自动判定为孤儿锁并自愈释放，杜绝系统挂死；
    4. **自动化中枢脚本**：落地 `scripts/global_scheduler_lock.sh`（支持 `--acquire`、`--release`、`--status`、`--run` 包装执行与 `--clean`）；
    5. **最高元规则与流水线法典固化**：在 `rules/system/meta_rules.md` 增设第二十一条，十六步流水线 S08/S15 阶段嵌入锁治理门禁，全局版本严格推进至 `v2.6.0`。
- **关联文件**：
  - `scripts/global_scheduler_lock.sh`
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `indexes/shortcuts_index.md`
  - `indexes/rules_index.md`
  - `indexes/dsh_capabilities.md`
  - `indexes/tool_interfaces.md`
  - `knowledge/README.md`
  - `memory/asset_fingerprint_ledger.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 落地 `scripts/global_scheduler_lock.sh` 并实测抢锁、冲突阻断、自愈熔断与包装运行 100% 绿灯；
  - [x] 最高元规则固化第二十一条“全局调度锁与并发资源防冲突律”；
  - [x] 执行流水线 S08/S15 嵌入锁治理工序；
  - [x] 快捷口令索引注入“调度锁”看盘口令；
  - [x] 需求台账、规则总索引与知识库总目录版本强同步推进至 `v2.6.0`；
  - [x] 资产指纹通过校验，变更成功推送到远端 Git 仓库。

---

### REQ-040: DSH 执行全步骤 Assistant 纯中文说明与无死角汉化规约
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v2.7.0`
- **提出时间**：2026-09-16
- **最新更新**：2026-09-16
- **标准需求重构文案 (利于 Agent 执行的标准化任务单)**：
  - **任务代号**：`DSH-ASSISTANT-FULL-STEP-CHINESE-EXPLANATION`
  - **背景阐述**：消除智能体在调用系统工具（如 bash description 字段）或执行中间步骤时混杂英文旁白的现象，保障中文用户体验纯粹连贯。
  - **核心诉求与交付物**：
    1. **全步骤纯中文说明硬门禁**：在 DSH 执行全生命周期中，智能体的前导交代、工序推进、异常剖析与复盘交付必须 100% 采用纯中文说明；
    2. **客户端 UI 投射参数 100% 汉化**：向 `bash` 传递的 `description` 参数（投射至 TerminalCard 标题）以及子智能体描述严禁使用英文，必须传规范中文动宾短语；
    3. **最高元规则与语言标准法典化**：元规则第三条增设“全步骤与 UI 投射参数纯中文说明律”；重构 `rules/system/language_standard.md` 写入《执行全生命周期中文说明细则》；
    4. **流水线与工具契约规范同步**：更新 `task_execution_flow.md` 与 `tool_interfaces.md` 固化中文参数约束；
    5. **三位一体版本强同步与 Git 强推**：刷新资产指纹大底册，执行 `scripts/git_sync_remote.sh` 强同步推送到远程仓库。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/system/language_standard.md`
  - `rules/workflow/task_execution_flow.md`
  - `indexes/tool_interfaces.md`
  - `indexes/shortcuts_index.md`
  - `indexes/rules_index.md`
  - `indexes/dsh_capabilities.md`
  - `knowledge/README.md`
  - `memory/asset_fingerprint_ledger.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 最高元规则第三条固化执行全步骤中文说明约束；
  - [x] 语言标准法典明确写入 bash description 等 UI 参数 100% 汉化细则；
  - [x] 工具接口规范与十六步流水线同步更新；
  - [x] 需求台账、规则总索引与知识库总目录版本强同步推进至 `v2.7.0`；
  - [x] 资产指纹通过校验，变更成功推送到远端 Git 仓库。















---

### REQ-041: 管控机制（门禁判定 + 常显看板 + 运行时拦截）
- **当前状态**：`[ACTIVE]` 生效中（旧称"AI 执行流程管控系统"，名称口径已按 `REQ-044` 统一为"管控机制"）
- **实施版本**：`v2.8.0`
- **提出时间**：2026-09-22
- **最新更新**：2026-09-22
- **标准需求重构文案 (利于 Agent 执行的标准化任务单)**：
  - **任务代号**：`AI-EXECUTION-CONTROL-GATE-KERNEL`
  - **背景阐述**：消除"智能体自称已完成、实际未做前置工序"的失控现象。需要一套**以磁盘实况推导、不采信自我宣称**的流程管控机制，强制四项基础必要性工序（项目初始化、工程结构化、需求文档同步、冗余检测）按序完成，并把进度常显可视化。
  - **核心诉求与交付物**：
    1. **状态层判定脚本**：`scripts/control_gates.sh` 以磁盘状态推导 G1~G4 门禁，输出量化看板与 `status.json`，写入 `$DSH_HOME/.dsh-control/`；
    2. **阈值可调**：所有判定阈值集中于 `ai-control/config/gates.conf`，改完即时生效，无需重启；
    3. **常显可视化**：硬门禁插件在每个步骤进入前注入最新进度卡片，实现"执行到哪里都可见、进度可量化"；
    4. **运行时强制**：以 `ctx.tools.guard`（单调守卫，不可翻案）在门禁未通过时拒绝改动型工具调用，只读工具与 `todo_write` 始终放行；
    5. **故障安全**：插件加载失败降级为空插件，绝不影响宿主启动；状态过期时失败关闭而非静默放行；提供 `DSH_CONTROL_GUARD=off` 逃生舱；
    6. **承载层落地**：写入宿主级 `$DSH_HOME/AGENTS.md` 与项目级 `AGENTS.md`，实现跨会话自动注入。
- **关联文件**：
  - `scripts/control_gates.sh`
  - `ai-control/config/gates.conf`
  - `ai-control/plugin/index.mjs`
  - `ai-control/plugin/loader.mjs`
  - `ai-control/plugin/selftest.mjs`
  - `ai-control/README.md`
  - `AGENTS.md`
  - `$DSH_HOME/AGENTS.md`（宿主级）
  - `$DSH_HOME/profiles/web/cordis.patch.yml`（插件挂载行）
- **验收标准**：
  - [x] `control_gates.sh check` 输出量化看板，四项门禁全部按磁盘实况判定；
  - [x] G1 门禁实测发现并修复 `assets`、`rules` 两处缺说明文件的真实缺陷；
  - [x] 拦截层插件自检 **33/33** 通过（可拒绝、可自救、可绕过、过期失败关闭、冷启动自举、故障安全降级）；
  - [x] **故障安全加固**：真实 Cordis 联调中发现"服务未就绪时 `ctx.tools` 为 undefined 导致 TypeError"的宿主崩溃隐患，已加固为静默降级并纳入回归自检（5 项）；
  - [x] **冷启动自举**：状态缺失时插件自动调用管控脚本生成，实测修复"脚本按 DSH_HOME 落盘、插件按 stateDir 读取"的错位死锁缺陷；
  - [x] 守护工具名与真实注册表逐一对账（`bash`/`edit`/`pwsh`/`read`/`write`/`str_replace_editor` 全匹配）；
  - [x] profile 组装干跑通过，插件运行时解析与挂载实测成功；
  - [x] `createUserMessage` 契约与真实运行时实测匹配，看板注入链路打通（status.json → 渲染 → 合法 UserMessage）；
  - [x] 注入预算实测 7452 字节，仅占 65536 预算的 **11.4%**，无截断风险；
  - [x] 宿主级与项目级 `AGENTS.md` 注入实测生效，无需重启。

---

### REQ-042: 真·冗余检测器（词级相似度 + 元数据过滤 + 自检门禁）
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v2.8.0`
- **提出时间**：2026-09-22
- **最新更新**：2026-09-22
- **标准需求重构文案 (利于 Agent 执行的标准化任务单)**：
  - **任务代号**：`TRUE-REDUNDANCY-DETECTOR`
  - **背景阐述**：逐行统计式冗余检测产生大量**假阳性**——Markdown 的表格分隔线与代码围栏天然重复，需求台账 40 余条共用同一字段模板也天然重复。实测初版指标报出 27% 重复率，经诊断为纯噪声，若不修正将导致门禁失去公信力。
  - **核心诉求与交付物**：
    1. **块级归一化**：按标题与空行切块，归一化时抹掉版本号、日期、数字、文件名与绝对路径；
    2. **词级 Jaccard 相似度**：中文按字、英文按词构造词元集，相似度 ≥ 0.85 判为高相似块对；
    3. **元数据块过滤**：识别由版本号、日期、生效状态、文件链接构成的"结构性抬头"，此类跨文件相似属结构一致性而非内容冗余，必须排除；
    4. **模板型台账排除**：`docs/requirements.md` 属模板化台账，按配置排除；
    5. **自检门禁**：内置 `--self-test`，必须证明"模板不误报"与"复制粘贴必检出"双向能力，禁止凭语法通过上线；
    6. **接入 G4 门禁**：检测器不可用时按"未通过"处理，**不允许以"检测失效"充当通过**。
- **关联文件**：
  - `scripts/redundancy_scan.mjs`
  - `scripts/control_gates.sh`
  - `ai-control/config/gates.conf`
- **验收标准**：
  - [x] 自检 6/6 通过：模板字段相似度 0.655 不误报、复制粘贴 1.000 必检出；
  - [x] 版本抬头被正确识别为元数据块；
  - [x] 实扫本仓库假阳性由 73 项降至 **0 项**，确认原仓库无真冗余；
  - [x] 检测器不可用时 G4 判定为未通过，杜绝"检测失效=通过"。

---

### REQ-043: 全局约束载体化（薄入口 + 按需加载）
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v2.8.0`
- **提出时间**：2026-09-22
- **最新更新**：2026-09-22
- **标准需求重构文案 (利于 Agent 执行的标准化任务单)**：
  - **任务代号**：`GLOBAL-CONSTRAINT-CARRIER`
  - **背景阐述**：规则库 Markdown 合计约 336KB，而 DSH 的 `agent-instructions` 注入预算为 64KB/会话，超预算时策略是**先整份丢弃较宽泛的文件**。若把规则全量塞入 `AGENTS.md`，将导致最高元规则被整份丢弃，反而更不安全。
  - **核心诉求与交付物**：
    1. **薄入口原则**：宿主级 `AGENTS.md` 只放"不可违背红线 + 路由指针"，预算控制在 12KB 以内；
    2. **按需加载**：细则一律通过索引按需 `read`，常驻注入总量不超过预算的 1/5；
    3. **真相源单一**：规则内容只在 `rules/` 里写一次，`AGENTS.md` 只放指针，杜绝双份真相源；
    4. **路径失效兜底**：规则库不可达时红线仍然生效，并须明确告知用户细则未能载入；
    5. **优先级明确**：用户直接指令 > 项目级 `AGENTS.md` > 宿主级 `AGENTS.md` > 规则库细则。
- **关联文件**：
  - `AGENTS.md`（项目级）
  - `$DSH_HOME/AGENTS.md`（宿主级）
  - `docs/requirements.md`
  - `README.md`
- **验收标准**：
  - [x] 宿主级 `AGENTS.md` 注入实测生效（会话中收到 `Instructions from: $DSH_HOME/AGENTS.md`）；
  - [x] 项目级 `AGENTS.md` 注入实测生效并自动标注作用目录；
  - [x] 常驻注入预算受控，未触发 `Workspace instruction budget` 截断通知；
  - [x] 红线条目与规则库细则无重复表述。

---

### REQ-044: 管控机制精简、双检迭代与存量全库校准
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v2.9.0`
- **提出时间**：2026-09-22
- **最新更新**：2026-09-22
- **标准需求重构文案 (利于 Agent 执行的标准化任务单)**：
  - **任务代号**：`GCM-REFORM`（GCM = Global Constraint Mechanism，全局约束机制）
  - **需求文案依据**：[`docs/constraint_mechanism_spec.md`](constraint_mechanism_spec.md)（本条目为该文案的正式落地）
  - **背景阐述**：原机制存在三个真实缺口——① 流程"写在纸上"，十六步流水线只有 4 项有脚本判定，其余靠模型自觉；② 有冗余检测而无冲突检测，规则互相打架时只能靠人发现；③ 机制无统一名称、无面向普通人的说明图，且存量资产普遍落后于新规范（实测 33 个受管文档版本落后、2 处死链、1 处计数自称与实际不符、1 处指标数字互相矛盾）。
  - **机制正式命名（唯一权威口径）**：
    - 整套机制：**管控机制**；
    - 四层组件：**注入层**（常驻红线与指针）/ **状态层**（磁盘实况推导真值）/ **判定层**（门禁判定与双检）/ **拦截层**（运行时拒绝改动型调用）；
    - 权威出处：`indexes/rules_index.md` 与 `README.md`，其余文件一律引用不复述别名。
  - **核心诉求与交付物**：
    1. **冲突检测器**：`scripts/conflict_scan.mjs`，判定五类冲突（C1 版本 / C2 计数 / C3 指标 / C4 标识 / C5 死链），内置 22 项正反例自检；
    2. **存量校准扫描器**：`scripts/legacy_align_scan.mjs`，输出 L1 命名 / L2 入口覆盖 / L3 版本对齐 / L4 指纹覆盖 / L5 台账留痕五类待对齐清单，内置 19 项自检；
    3. **流程精简**：十六步流水线中不具备可判定条件的工序降级为建议，允许按项目裁剪，不再表述为"必须"；具备判定条件的工序保持强制，判定脚本必须真实存在并可运行；
    4. **冗余与冲突的处置分流**：冗余 → 合并为迭代版本（保留单一权威源）；冲突 → 先出裁决方案再由用户确认（禁止自行取舍）；
    5. **普通人可读的信息图**：`assets/generated_images/gcm_gate_control_infographic.svg`（含 PNG）与图文说明，讲清"何时被拦 / 依据从哪来 / 怎么才能通过"；
    6. **全库存量校准**：受管文档版本统一归位至 `v2.9.0`，修复死链与计数口径，为正式流程建立 `REQ-###` 统一编号（不再混用 R0xx / REQ-xxx 两套写法）。
- **关联文件**：
  - `scripts/conflict_scan.mjs`
  - `scripts/legacy_align_scan.mjs`
  - `docs/constraint_mechanism_spec.md`
  - `indexes/rules_index.md`
  - `rules/workflow/task_execution_flow.md`
  - `rules/workflow/versioning_standard.md`
  - `assets/generated_images/gcm_gate_control_infographic.svg`
  - `README.md`、`AGENTS.md`
- **验收标准**：
  - [x] 冲突检测器自检 **22/22** 通过，实扫识别出全库冲突并逐条给出裁决建议；
  - [x] 存量校准扫描器自检 **19/19** 通过；
  - [x] 全库冲突由 37 项降至 **0 项**（含 33 项版本落后、2 项死链、1 项计数冲突、1 项指标冲突）；
  - [x] 存量待对齐清单由 49 项降至 **0 项**；
  - [x] 机制名称唯一权威出处落地，旧称在全库清除（历史里程碑行与"旧称"说明行按规则豁免）；
  - [x] 信息图与图文说明产出，机制可被非专业读者理解；
  - [x] 冗余检测 56 文件 / 273 实质块 / 高相似对 **0**；拦截层插件自检 **33/33** 通过。
