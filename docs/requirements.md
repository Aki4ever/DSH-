# 全局需求管理台账 (Requirements Ledger)

> ### 🏷️ **版本信息与实施追踪**
> - **当前系统实施总版本**：`v4.19.0`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **最后同步时间**：2026-09-24
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

---

### REQ-045：流程入驻审计与快速通道注册机制（GCM-ENHANCE-2）
- **实施版本**：`v3.0.0`
- **需求状态**：`[Release 稳定生效]`
- **需求文案依据**：[`docs/constraint_mechanism_enhance_2.md`](constraint_mechanism_enhance_2.md)（本条目为该文案的正式落地，用户已逐条拍板）
- **背景阐述**：`REQ-044` 建好了判定与检查能力，但**流程本身没有"入驻手续"**——新增脚本、新增规则靠临场判断该放哪、要不要进快速通道，导致：① 新流程会散落各处，出现"有脚本但没人知道"的孤儿流程；② 存量校准器的关键组件清单是**写死的 5 条**，磁盘上新增脚本漏登记时扫描器发现不了，与"不采信自我宣称"的原则直接冲突；③ 快速通道表已有 20 条通道但没有注册规范（触发词怎么写、什么算登记成功、如何退役）。
- **用户拍板结论（逐条确认，作为实施依据）**：
  1. 通道触发词采用 **"看看管控机制"** 与 **"生成信息图"**，且**高度相关的说法都应能触发**（同义词一并登记）；
  2. **生成信息图通道支持任何主题**（不限于机制类信息图）；
  3. 通道语义重叠按**方案甲**处理：保留"门禁看板"作为"只看门禁"的轻通道，"看看管控机制"输出机制全貌，两条分工写进各自说明；
  4. 版本号升 **`v3.0.0`**。
- **核心诉求与交付物**：
  1. **流程入驻四道审计**：查重（`redundancy_scan.mjs`）→ 查冲突（`conflict_scan.mjs`）→ 定位置（按"位置判定表"确定唯一权威落点）→ 定判定手段（有可跑通命令才可写"必须"，否则标注"建议"）；
  2. **固化四项登记**：写进权威源（只写一处，其余放指针）/ 配判定命令（写入核心判定命令表）/ 进快速通道（可能被一句话调用的流程必须登记）/ 登记台账（`docs/requirements.md` 留痕并注明实施版本）——缺一项即视为"没固化"；
  3. **快速通道注册规范**：触发词规则（≤12 汉字、唯一、可挂 1~2 个别名、动宾结构）、执行契约（路由层级 / 命中后做什么 / 输出什么 / 落地条件四件事必须写清）、注册与退役流程（目标文件消失必须删行，禁止留死通道）；
  4. **通道注册审计器** `scripts/channel_audit.mjs`：校验通道表路径真实存在（无死通道）、触发词可命中（含正例与"看似像但不应命中"的反例）、触发词不重复或过度近似；
  5. **存量校准升级为自动枚举**：`legacy_align_scan.mjs` 的关键组件清单由写死改为从磁盘枚举 `scripts/` 下全部脚本，未被入口层引用者输出为 `L2-入口覆盖` 待对齐项；
  6. **新增通道"看看管控机制"**：实跑门禁 + 双检 + 存量校准 + 冗余检测，输出机制全貌卡（四道门查什么、当前量化数字、十六步强制/建议统计、通道清单、四层载体），数字必须来自本次实跑；
  7. **新增通道"生成信息图"**：按教学图生成机制走"选型 → 取料 → 绘 SVG → 精确栅格化 → 目视校验 → 登记指针"，支持任意主题。
- **关联文件**：
  - `docs/constraint_mechanism_enhance_2.md`
  - `rules/workflow/change_flow.md`、`rules/workflow/task_execution_flow.md`
  - `indexes/shortcuts_index.md`
  - `scripts/channel_audit.mjs`、`scripts/legacy_align_scan.mjs`
  - `docs/requirements.md`、`README.md`、`AGENTS.md`
- **验收标准**：
  - [x] 通道注册审计器自检 **23/23** 通过，对现有 **23 条**通道实扫 **0 死通道**、0 说法失配、0 触发词冲突；
  - [x] 存量校准改为自动枚举后，实扫当场揪出 2 个漏登记脚本（`channel_audit.mjs` 随即补登记；`test_v180_spec.sh` 判定退役）；
  - [x] 两条新通道登记在册且动作目标带真实链接（"看看管控机制"4 个目标、"生成信息图"3 个目标）；
  - [x] 流程入驻四道审计与固化四项登记写入 `change_flow.md`，并配套"机器判定"一节；
  - [x] 冗余/冲突/存量校准/通道审计四项复跑全部清零（冗余 0 高相似对、冲突 0 项、待对齐 0 项、通道问题 0 项）；
  - [x] 退役的 v1.8.0 历史门禁已在文件头与任务流程中留下退役依据与教训。

---

### REQ-046：任务常显在输入框（可视化任务条）
- **实施版本**：`v3.0.0`
- **需求状态**：`[Release 稳定生效]`
- **背景阐述**：用户要求"任务无论完成与否都应该常显在输入框上"。当前会话中任务进度只出现在**对话流内部**（每轮的门禁看板卡片），一旦新任务开始、旧清单结束，输入框上方就空了 —— 用户看不到"现在在做什么、还剩什么"，必须往回翻记录。
- **技术核实（已完成，含源码依据）**：
  - DSH 原生已有输入框停靠坞插槽 `conversation.input.dock`，其中 **`TodoPanel`（`order=0`）** 与 **`GoalBar`（`order=10`）** 就是常显任务条；
  - **`TodoPanel` 仅在 `todos.length === 0` 时返回 `null`**（源码依据：`@deepseek-ai/dsh-client-ui-conversation/lib/client.js` 中 `if (todos.length === 0) return null;`），其余情况一律常显，且默认折叠为一行标题（含"已完成 N · 进行中 N · 待办 N"计数）；
  - `todo_write` 的 `content` 必须非空字符串（源码依据：`@deepseek-ai/dsh-tool-todo`），因此**清单只会被替换、不会被清空**；
  - 因此"常显"不需要开发前端组件，只需**机制上保证清单始终存在且状态实时**。
- **核心诉求与交付物**：
  1. **清单常驻规则**：实质任务（标准完备流）开工即建任务清单，收尾时保留完成态清单，**不得在任务结束后把清单清空**；
  2. **长任务目标条**：预计跨多轮或需要自主续跑的任务，开工即建自主目标，使 `GoalBar` 常显目标与轮次进度；
  3. **实现写入规范**：上述规则写入 `rules/workflow/task_execution_flow.md`，并附原生组件挂载槽位与判定依据（可验证）；
  4. **可见性判定手段**：给出可执行的检查方式（清单存在性 + 状态实时性），异常时能指出"输入框上方为何为空"。
- **关联文件**：
  - `rules/workflow/task_execution_flow.md`
  - `knowledge/common/dsh_native_ui_components.md`
  - `AGENTS.md`、`README.md`
- **验收标准**：
  - [x] 规则写入权威源（`task_execution_flow.md` 三之一），注明原生挂载槽位（`conversation.input.dock` order 0/10）与源码层判定依据（`todos.length === 0` 即不渲染）；
  - [x] 给出可执行的可见性检查方式（清单非空自查 + `get_goal` 返回 active + 空态归因流程）；
  - [x] 明确"**清单为空 = 不可见**"这一唯一失效条件，并说明 `todo_write` 的 content 非空约束使清单只会被替换、不会被清空；
  - [x] 全部完成态清单也常显（完成项为勾选态，标题栏仍显示"已完成 N"）。

---

### REQ-047：管控机制优化（拦截层复活 · 检测器能力 · 状态驱动出图）
- **实施版本**：`v3.1.0`
- **需求状态**：`[Release 稳定生效]`
- **背景阐述**：用户提出两条需求——「审计看看当下的管控机制，看看有什么优缺点，看看优化方案」与「看看公开的一些官网，看有什么可以让我快速的从图形学习一个新的流程，图形必须要非常平易近人且易学」。审计采用四路并行（判定层 / 拦截层 / 流程规则层 / 图形资产），全部结论均实测复现；优化范围经用户拍板限定为「高危问题 + 检测器能力」。需求文案见 `docs/constraint_mechanism_optimize_3.md`。
- **技术核实（已完成，均为实测复现而非推测）**：
  1. **拦截层装了但没通**：`loader.mjs` 导出 `inject = []`，而宿主只读「被加载模块自己导出」的 inject，`index.mjs` 里的 `inject = ['tools']` 永不被读到 → `ctx.tools` 未就绪 → 守卫静默不注册；看板因 `@deepseek-ai/dsh-llm` 解析失败而静默失活。历史实测：**5160 次受控调用 0 次否决、0 次看板注入**，而自检 33/33 全绿；
  2. **逃生舱可被穿透**：旧实现「参数含 `control_` 即放行」，实测 `write src/my_control_logic.js`、`bash: echo x > /tmp/run_control_log.txt` 均被放行（占受控调用 5.9%）；
  3. **冗余检测分桶召回失效**：桶键为「词元排序后前 3 个」，任何文本边缘改动都改变桶键 → 两块落入不同桶 → 永不被比较。实测 4 块（3 份相同 + 1 份前置 7 字）只报 3 对，那份副本**一对都没配上**；
  4. **`assets/` 是结构性检测盲区**：`legacy_align_scan` 只扫 `rules/` + `scripts/`，9 张 SVG 全在盲区，恒报「待对齐 0 项」；
  5. **版本提取漏检**：`headerVersion()` 不认 `**当前系统实施总版本**`，而 README 与台账都用这个写法 → C1 直接跳过 README，实测返回 `null`；
  6. **本 GUI 不渲染 Mermaid**：前端 4 个 bundle 检索 `mermaid` 命中 0（只有 shiki + katex），故图形必须产出 SVG/PNG。
- **核心诉求与交付物**：
  1. **拦截层复活（Q1）**：`loader.mjs` 更正依赖声明；看板注入失败由静默改为告警一次；新增 Loader 契约自检；
  2. **逃生舱结构化（Q2）**：由「参数子串匹配」改为结构化路径白名单（bash 须真正指向管控脚本；write/edit 目标须落在 `ai-control/` `scripts/` `.dsh-control/`）；
  3. **检测器能力（Q3）**：补 `assets/` 扫描；修版本提取并限定采纳范围为文档头部；修分桶召回为**内容决定型采样**；补「空虚下限」（0 实质块判不可判定）；打通 `block`（⛔）状态；
  4. **状态驱动出图（Q4）**：新增 `./scripts/control_gates.sh graph`，读实跑结果产出 SVG，数据不手工维护；
  5. **规范要求的对齐与豁免机制**：README 版本对齐；新增「书面说明」豁免登记 `ai-control/config/legacy_align_exempt.txt`。
- **关联文件**：
  - `docs/constraint_mechanism_optimize_3.md`
  - `docs/visual_learning_research.md`、`docs/diagram_generation_guide.md`
  - `ai-control/plugin/loader.mjs`、`ai-control/plugin/index.mjs`、`ai-control/plugin/selftest.mjs`
  - `ai-control/config/legacy_align_exempt.txt`
  - `scripts/control_gates.sh`、`scripts/redundancy_scan.mjs`、`scripts/conflict_scan.mjs`、`scripts/legacy_align_scan.mjs`
  - `indexes/shortcuts_index.md`、`assets/generated_images/gate_graph.svg`
- **验收标准**：
  - [x] **Q1** `loader.mjs` 导出 `inject = ['tools']`；桩件实测守卫已注册、看板 pre-step 已注册、空状态时 `rm -rf build` 被拒、`control_gates.sh check` 经逃生舱放行（可自救不死锁）；
  - [x] **Q2** 逃生舱改结构化白名单；自检新增 **6 条反例**全部通过（含 `src/my_control_logic.js`、重定向到 `/tmp/run_control_log.txt`、`rm -rf build # ai-control` 等）；
  - [x] **Q3** `assets/` 扫描生效：**能报出** 2 张 `v1.6.0` 陈旧图；版本提取**能报出** README `v2.9.0` vs 台账 `v3.0.0`；分桶召回由 3 对提升至 **6 对全检出**（共同桶键 0 → 23）；空虚下限生效（`exit 2`）；`block` 实测可达（虚构工程显示 `⛔ 硬阻断`）；
  - [x] **Q4** `graph` 子命令实测两种状态（本工程 4/4 青绿、虚构工程 0/4 琥珀并显示"卡在第 1 道门"）；数据 100% 来自本次实跑；
  - [x] **附加** 修复「陈旧状态即拒绝」（实测真实调用派发延迟中位 3.93s、p90 16.90s，38.8% 超 5s 窗口）、「畸形状态反而放行」、「退出码恒为 0」、「缺 gates.conf 崩溃仍返回 0」、「表格结构行造成结构性假阳性」；
  - [x] 全部自检通过：冗余 9 项 · 存量校准 22 项 · 冲突 22 项 · 通道审计 23 项 · 插件 **47 项**（原 33 项）；
  - [x] 四项检测器与门禁复跑：冗余 0 高相似对、冲突 0 项、待对齐 0 项（另 2 项已书面说明）、通道 24 条 0 问题、门禁 **4/4**；
  - [ ] ⏳ 重启桌面端后验证看板真实注入与守卫真实拦截（插件改动必须重启才生效）；
  - [ ] ⬜ 3 张空壳 SVG 已退役（已完成，SHA-256 留痕）；两张 `v1.6.0` 图的版本语义待重绘时一并处置（已书面登记豁免理由）。

---

### REQ-048：管控机制双优化（客户端吞吐上限解除 · 任务命名规范统一）
- **实施版本**：`v3.1.0`
- **需求状态**：`[Release 稳定生效]`
- **背景阐述**：用户在 `REQ-047` 收口后追加两条需求——「把每秒 token 输出提到最高（能给多高就给多高）」与「每次执行任务时立刻修改任务名，任务名规范从知识库中获取，确保改名规格统一，要包括任务名、任务难度、任务概述」。需求经简化后于本轮拍板两项口径：① token 提速按「客户端不设限」落地；② 「任务名」即分类编号那一段，现有三段式格式已满足三要素，只需强化「必须按规范改名且格式零偏差」。
- **技术核实（已完成，均为实测而非推测）**：
  1. **客户端输出上限当时为 32768**：`dsh-llm-pi-ai/lib/index.js:851` `const DEFAULT_MAX_TOKENS = 32768`，而全局 `settings.yaml` **未配置任何 token 字段**，故全部模型走该默认值；
  2. **模型级上限无最大值约束**：`modelFields.maxTokens = z.number().step(1).min(1)`（源码 `dsh-llm-pi-ai/lib/index.js:921`），`profile.defaultMaxTokens` 同样只有下限（`:941`）；
  3. **参数链路确认可达服务端**：`dsh-agent-loop/lib/index.js:702,706` 把 `maxTokens` 写进 request seedConfig，`dsh-llm-pi-ai/lib/index.js:1741` 再透传进模型调用；
  4. **前端无渲染节流**：`dsh-client-ui-conversation/lib/client.js:7823-7825` 对 `assistant/chunk` 采用 `animation-frame` 合批，属帧级最优，不存在人为降速；
  5. **服务端上限实测探测**：对 `http://192.168.1.200:8080/v1/chat/completions` 依次发送 `max_tokens` = 32768 / 65536 / 131072 / 262144，**四档全部被接受**（未触发拒绝阈值）；
  6. **知识库确无命名规范**：`knowledge/` 全目录检索「命名规范 / 命名标准 / 任务名」**零命中**，规范当时散落于 `rules/workflow/task_execution_flow.md` 第五章、`rules/system/meta_rules.md:43`、`memory/context_memory.md:12` 三处；
  7. **改名脚本不校验格式**：原 `scripts/rename_session.sh` 仅判空标题，`[R048] 随便写` 之类不合规标题同样会被成功提交。
- **核心诉求与交付物**：
  1. **客户端吞吐不设限（需求一）**：建 `knowledge/common/task_naming_spec.md` 之外，于全局宿主 `settings.yaml` 的 `llm-pi-ai.providers.midpro` 显式声明 `defaultMaxTokens: 131072`，并在主用模型 `DS/DeepSeek V4.1 Flash` 上同样声明 `maxTokens: 131072`；
  2. **命名规范唯一权威源（需求二）**：新建 [`knowledge/common/task_naming_spec.md`](../knowledge/common/task_naming_spec.md)，定义三要素（任务名 / 任务难度 / 任务概述）、七条硬性规则（R1~R7）、六类业务管道字母表、100 分制四维打分与轨道联动、正反示例对照；
  3. **规则层指针化**：`rules/workflow/task_execution_flow.md` 第五章、`rules/system/meta_rules.md` 第七条、`memory/context_memory.md` 命名行一律改为指针，只保留「执行时机」与「上层约束」，格式定义不再复制；
  4. **改名脚本硬校验**：`scripts/rename_session.sh` 内置 R1~R7 逐条校验（含真实 Unicode 汉字计数），不合规直接拒绝并打印正确示例；
  5. **知识库登记**：`knowledge/common/README.md` 通用规范矩阵新增该文件条目，避免孤儿文件。
- **关联文件**：
  - `knowledge/common/task_naming_spec.md`、`knowledge/common/README.md`
  - `scripts/rename_session.sh`
  - `rules/workflow/task_execution_flow.md`、`rules/system/meta_rules.md`、`memory/context_memory.md`
  - 宿主配置：`$DSH_HOME/settings.yaml`（首次备份 `settings.yaml.bak.20260923145116`，终值备份 `settings.yaml.bak.20260923151217`）
- **验收标准**：
  - [x] **需求一（终值）**：`provider.defaultMaxTokens` = **393216**（服务端硬上限），且**删除**了 `DS/DeepSeek V4.1 Flash` 的模型级覆盖，改为 6 个模型**全部继承** provider 默认——实测每个模型生效上限均为 393216；
  - [x] **服务端真实上限已由服务端自述确认**：`max_tokens=524288` 返回 400 且报文明确写出
        `Invalid max_tokens value, the valid range of max_tokens is [1, 393216]`——这是**服务端给出的权威区间**，不再是"探测出的经验值"；
  - [x] **边界逐点实测**：32768 / 131072 / 196608 / 262144 / **393216** 全部 200 通过；**393217（仅超 1）即 400 拒绝**；大 prompt 组合（prompt=550）配 393216 同样通过；
  - [x] **发现 `max_tokens` 会连同"推理 token"一起消耗**：非流式两轮实测的 `completion_tokens` 为 4067 / 3596，其中 `reasoning_tokens` 占 4044 / 3570（**约 99%**）——上限是"推理 + 正文"的总预算，推理越多留给正文的越少。**这解释了为何那两轮正文只有 36 / 39 字符就 `stop`**（预算被推理吃光），先前据此推测"非流式有 4k 上限"是**错误推断，已推翻**；
  - [x] **长输出触顶实测（流式，决定性证据）**：单次请求 `completion_tokens = 38665`（其中推理 6657、正文 32008），正文字符 74781，耗时 106.6 秒，`finish_reason = stop`（**模型自然结束，未触顶**）——**38665 > 32768，旧上限已被实际突破，提升真实生效**。边界说明：本次请求用的 `max_tokens` 是 131072（不是终值 393216），所以结论是「上限至少可到 131072、确实高于旧的 32768」；**未验证** 393216 能否被单次用满（用满需要更长的输出任务）；
  - [x] 顺带测得真实生成速率：**362.7 token/秒**（总 token / 总耗时），首块延迟 0.21 秒，最大块间隔 662 ms；该速率由服务端决定，客户端侧无法提速；
  - [x] 用 zod 按适配器源码等价 schema 对配置做 safeParse：**success=true**，6 个模型条目完整无损；
  - [x] 澄清并保留了关键机制：`contextWindow` **仍是**适配器默认 262144，**刻意未同步抬高**——服务端不公布模型真实上下文窗口（实测 `/v1/models` 只返回 `id/created/object/owned_by`，**无窗口字段**），无依据地抬到 393216 会让"prompt+输出"合计超窗时被服务端 400 拒绝，风险更高；现状是最坏情况退化为 `finish_reason=length`（可识别、不报错）；
  - [x] **度量口径更正**：`REQ-049` 审计里的 `decodeTokens` 是**会话累计**输出，不是单次输出，不能用来断言"曾触及旧上限"；单次上限是否生效只能由本项的长输出实测判定；
  - [x] **需求二** 命名规范唯一权威源落地：`knowledge/common/task_naming_spec.md`（142 行），三要素定义、R1~R7、六类字母、四维打分、正反示例齐备；
  - [x] 改名脚本硬校验实测 **19 例全通过**：12 条反例全部拒绝（含顺序错误、编号非三位、字母越界、难度分越界/缺「分」字、概述 9 字、概述为空、组件间多余空格、纯英文概述），7 条正例全部放行（含 8 字边界、难度分下限 1、含英数概述、`008分` 前导零）；
  - [x] 修复施工中发现的 2 个隐藏缺陷：① `wc -m` 在命令替换环境退化为字节计数导致误判「不含汉字」，改用 `perl \p{Han}` 真实 Unicode 计数；② `[R048][008分]` 会被 bash 当八进制解析而报错，改用 `10#$SCORE_NUM` 强制十进制；
  - [x] 规则层三处重复定义已指针化，格式定义仅存于知识库一处；
  - [ ] ⏳ 宿主 `settings.yaml` 改动**需重启桌面端方生效**；重启后需实测一次"长输出能否突破旧上限 32768"（脚本已就位：`scripts/probe_long_output.mjs` 非流式版、`scripts/probe_long_output_stream.mjs` 流式版）；
  - [ ] ⬜ 待决项：单次输出上限 393216 已**超过**上下文窗口 262144，长回复可能挤压历史而更频繁触发上下文压缩；需重启后观察实际触发频率再决定是否回调；
  - [ ] ⬜ 顺手发现（非本次范围，未处理）：① `settings.yaml` 各模型的 `output: [text, image]` 字段不在适配器 schema 允许键内，被 zod 静默剥离（**不影响加载**，实测 success=true），属既有冗余声明；② `memory/context_memory.md` 记录的 `DSH Web URL` 与「主要模型」两项已与实况不符（本会话实测 `DSH_WEB_URL=http://127.0.0.1:54617`、主要模型为 `DS/DeepSeek V4.1 Flash`）。
- **未验证项声明**：
  - **393216 能否被单次用满，未验证**：已实测单次可达 **38665** token（远超旧的 32768），已确证服务端接受 393216 并拒绝 393217；但"接受该参数值"不等于"真能吐出这么多"，要占满 393216 需要极长的输出任务，本次未做；
  - **生成速率已实测但非常量**：本次测得 **362.7 token/秒**（106.6 秒输出 38665 token），但这只是当前服务端负载下的单点值——速率由服务端与排队情况决定，**客户端无法提速**，不同时段会有差异，不应视为稳定指标；
  - **"推理 token 挤占正文预算"的量化影响未系统测量**：已确认推理计入 `completion_tokens`，但不同类型的任务（长推理 vs 长正文）各占多少比例，未做横向对比；
  - 改动需重启桌面端才生效，**重启前上述配置均尚未被运行时加载**。

- **后续演进**：本条目落地后用户追加「以后存量任务和新增任务都必须自动命名」，已立 `REQ-049` 承接执行闭环与存量回溯；随后用户要求「token 能给多高就给多高」，据此把取值从 131072 上推到服务端硬上限 393216 并写入本节。

---

### REQ-049：任务命名全自动化（新增即时命名 · 存量回溯 · 常显判定）
- **实施版本**：`v3.1.0`
- **需求状态**：`[Release 稳定生效]`
- **背景阐述**：用户在 `REQ-048` 建立命名规范后追加要求——「以后存量任务和新增任务都必须自动命名；实施」。这要求把命名从"规范 + 靠自觉执行"升级为**有强制写入、有客观判定、有常显可见**的闭环，并回溯历史存量会话。
- **技术核实（已完成，均为实测复现）**：
  1. **标题权威存储位置**：`$DSH_HOME/storages/session_projcache.json` → `tables.sessions.<sessionId>.rows.title.val`（49 条会话）；
  2. **会话正文是多帧 zstd**：`session.jsonl.zstd` 为 1623 帧拼接（每帧一次追加写入），单帧解压只能得到会话头（906KB 文件仅解出 0KB 内容），必须逐帧解压才能读到真实对话——实测逐帧解压得 1783KB / 2934 行；
  3. **`user/message` 不全是用户输入**：宿主注入的工作区约束提醒同样以 `user/message` 落盘，必须用 `data.source.kind === 'user'` 区分，否则会把系统提醒当用户需求；
  4. **RPC 可对非当前会话改名且能持久化**：实测对历史会话调用 `POST /api/session.rename` 返回 `ok:true` 并写入权威存储（首次复查因缓存竞态误判为"假成功"，二次复查证实已持久化）；
  5. **直接改存储文件会被覆盖**：写 `session_projcache.json` 后运行时会将内存状态回写覆盖，故**必须走 RPC**；
  6. **子代理会话不可改名**：5 条未挂 `session-` 前缀的会话由宿主 subagent routing 托管，改名返回 `agent-busy`（"owned by subagent routing"），属宿主限制；
  7. **存量合规率实测 18.4%**：49 条中 41 条（主会话）标题不符合规范（含标题为空、被抓成首句、旧式 `[PROJ]`/`[P001]`/`[REQ-007]` 等）。
- **核心诉求与交付物**：
  1. **强制写入**：`scripts/rename_session.sh` 已有 R1~R7 硬校验（`REQ-048` 交付）；
  2. **客观判定**：新增 [`scripts/check_task_naming.sh`](../scripts/check_task_naming.sh)——一条命令判定当前会话命名是否合规，`--exit` 供流程门禁使用；
  3. **常显可见**：`scripts/control_gates.sh` 各子命令收口处附加命名状态，不合规即显式告警（`json` 分支除外，保证 stdout 纯 JSON）；
  4. **存量回溯**：新增只读审计器 [`scripts/session_naming_audit.mjs`](../scripts/session_naming_audit.mjs)、方案生成器 [`scripts/generate_naming_plan.mjs`](../scripts/generate_naming_plan.mjs)、批量改名器 [`scripts/batch_rename_sessions.mjs`](../scripts/batch_rename_sessions.mjs)；
  5. **归位口径统一**：新增共享模块 [`scripts/lib/workspace_resolve.mjs`](../scripts/lib/workspace_resolve.mjs)，让生成器与批量器用同一套工作区归位逻辑；
  6. **流程门禁可审计化**：`task_execution_flow.md` 的 S05 判定由"首个 bash 调用是某脚本"（无法自证）改为 `check_task_naming.sh --exit` 返回 0（可机械判定）。
- **关联文件**：
  - `scripts/check_task_naming.sh`、`scripts/session_naming_audit.mjs`、`scripts/generate_naming_plan.mjs`、`scripts/batch_rename_sessions.mjs`、`scripts/lib/workspace_resolve.mjs`
  - **自动命名**：`scripts/lib/auto_naming.mjs`（核心逻辑，插件/看门狗/测试共用）、`scripts/test_auto_naming.mjs`（30 项测试）、`scripts/naming_watchdog.mjs`（兜底补齐）、`scripts/name_me.sh`（**开工一键改名入口**）、`ai-control/plugin/index.mjs`（宿主内触发点，暂缓）、`ai-control/config/naming_overrides.json`（人工指定/豁免）
  - `scripts/control_gates.sh`、`scripts/rename_session.sh`
  - `rules/workflow/task_execution_flow.md`、`knowledge/common/task_naming_spec.md`
- **回滚数据存放位置**（**刻意不入库**：文件含 41 条对话旧标题，属会话隐私内容）：
  - 回滚方案：`ai-control/reports/task_naming_rollback_20260923.json`（该目录在 `.gitignore` 内，已用 `git check-ignore` 确认会被忽略）；
  - 原始存储备份：`$DSH_HOME/storages/session_projcache.json.bak.2026-09-23T06-59-42-873Z`（改名**之前**的完整快照，是最终兜底）；
  - 回滚命令：`node scripts/batch_rename_sessions.mjs --plan ai-control/reports/task_naming_rollback_20260923.json --rollback --apply`。
  - **踩坑记录**：批量工具自动生成的"最新回滚文件"记录的是**改名之后**的状态，拿它回滚等于没回滚；真实初始标题必须取自**首次**备份快照。
- **验收标准**：
  - [x] **存量回溯**：46 条纳入规划范围，其中 **41 条（主会话）** 生成规范方案并通过预校验（含编号唯一性、概述 ≤8 汉字）；余 5 条经识别为子代理会话，由生成器自动剔除（改了也执行不了）；
  - [x] **主会话合规率由 18.4% 提升至 93.2%**（41/44）；未达 100% 的原因见下方"未验证项"；
  - [x] 批量改名实测两轮收敛：首轮权威存储生效 29 条，次轮 41 条已合规；全程自动备份存储文件并自动生成回滚方案；
  - [x] **判定可执行**：`check_task_naming.sh` 正向（合规会话返回 0）与反例（非规范标题 `--exit` 返回 1、空标题会话正确识别）实测通过；
  - [x] **常显生效**：`control_gates.sh check` / `badge` 末尾实测显示命名状态；不合规会话实测显示"⚠️ 任务命名不合规"；
  - [x] **纯 JSON 未被污染**：`control_gates.sh json` 实测仍可 `JSON.parse`，门禁 4 项完整；
  - [x] 施工中修复 1 个隐蔽缺陷：perl 文本定位 `title` 时因该字段位于 `sessionId` **之前**而取到**下一个会话**的标题（静默取错值），改为用 Node 做结构化 JSON 解析；
  - [ ] ⬜ 剩余 3 条主会话未合规：2 条为**零步空会话**（无首条消息，无法生成有意义的概述）、1 条内容为不当言论（不宜写入正式台账）；
  - [ ] ⬜ 5 条子代理会话受宿主 `agent-busy` 限制无法改名，已在审计报告中单列说明；
  - [ ] ⬜ 存量编号为**按工作区独立编排**（各项目 `R001`/`F001` 各自从 1 起），跨工作区同号属设计预期，批量器据此按工作区判重。
- **自动命名已由宿主插件补齐（本条目最重要的缺口修复）**：
  - **缺口是如何被发现的**：复查时发现本会话运行期间新增的会话「1、缠论相关的买点1、2、3和卖」
    已执行 76 步 / 48638 token，标题仍是被宿主抓取的首句，主会话合规率因此从 93.2% **回落到 89.1%**
    ——证明本条目原本交付的"三层闭环"只覆盖存量与自我约束，**新任务并未自动命名**；
  - **实现依据（实测探针，非推测）**：`agent/pre-step` 的 `payload.agent.id` 与
    `payload.agent.session.id` 都是精确的 44 字符会话 ID，因此插件能在每步进入前精确改名；
  - **实现方式**：命名逻辑抽到 [`scripts/lib/auto_naming.mjs`](../scripts/lib/auto_naming.mjs)，
    由 `ai-control/plugin/index.mjs` 在 `agent/pre-step` 中调用（**不 await，绝不阻塞步骤进入**）；
    抽模块的目的是让 `scripts/test_auto_naming.mjs` 与插件**导入同一份代码**，做到"测过的就是跑的"；
  - **保守策略**：只在标题不合规时动手，合规时一次都不动；分类按 cwd 推断，概述取首条真实用户
    消息前 8 个汉字，难度分取规范中位值 50——生成的是**合格底稿**，模型仍应按规范优化；
  - **实测结果**：`scripts/test_auto_naming.mjs` **23 项全通过**（含纯逻辑、真实数据读取、幂等、
    边界）；对真实会话 `session-f1e29e46-…` 实弹改名成功：
    「1、缠论相关的买点1、2、3和卖」→「[R001][50分] 缠论相关的买点和」，且**已被权威存储确认**；
  - [x] **改名生效判定已改为轮询权威存储**：实测发现 RPC 返回 `ok:true` 后，存储有
        **3~9 秒延迟**才更新（同会话两次改名 seq 108→109 的可见时刻可复现），
        故新增 `waitForTitle()` 轮询确认，**不采信 RPC 的自述**；
  - [ ] ⏳ 插件改动**需再次重启桌面端**才会加载（当前运行中的宿主仍是旧插件）。
- **首次重启后实测：自动命名未生效，已定位并修复三处根因（全部为真实缺陷）**：
  - **实测事实**：重启后对真实会话执行，`agent/pre-step` 确实触发过（该会话事件含 `step/start`），
    但 `auto-naming.log` **零新记录**、标题仍是被抓取的首句；
  - **根因 1 · 失败完全静默**：取不到宿主地址时提前 `return`，而写日志的代码在其**之后**，
    于是"拿不到地址"这类失败没有留下任何痕迹。→ 已改为**每次判定都留痕**（含 `SKIP` 与提前返回）；
  - **根因 2 · 宿主环境没有 `DSH_WEB_URL`**：实测桌面端宿主进程只有 `DSH_HOME` 与
    `DSH_TELEMETRY_DISABLED`，而 Web 端口由 `--port 0` 动态分配。旧实现只读环境变量，
    必然拿不到地址。→ 已新增 `resolveWebUrl()`：插件与宿主同进程，用宿主 pid 反查监听端口并探测确认；
  - **根因 3 · 插件不在宿主模块解析链上**：插件位于规则库目录，`import('@deepseek-ai/dsh-llm')`
    在宿主内必然失败——这正是看板长期"0 次注入"的原因。→ 已改为从宿主自身入口
    `process.argv[1]` 推导 `node_modules` 后按绝对路径导入；
  - **顺带修掉一处耦合缺陷**：自动命名曾被写在 `if (cfg.showCard)` 内部，
    关掉看板会连带让自动命名彻底失效。→ 已解耦，两者互不依赖；
  - **新增可查证性**：loader 与 apply 各落一个标记文件，用于区分
    "模块未加载" / "已加载但宿主未激活" / "已激活但逻辑失败"三种状态——
    此前这三者表象完全相同，只能靠猜。
- **路线调整：改用不依赖重启的看门狗（用户明确不再重启桌面端）**：
  - **为什么改路线**：插件方案逻辑虽已修好，但**插件改动必须重启桌面端才会加载**。
    而改名所需的两样东西其实都在宿主进程之外——标题在磁盘
    （`session_projcache.json`）、改名通道是宿主 Web RPC（可用端口反查定位），
    因此可以完全绕开插件完成同一件事；
  - **实现**：`scripts/naming_watchdog.mjs`，与插件**共用同一份**
    `scripts/lib/auto_naming.mjs`，避免两套实现各自演化；
  - **实测结果**：对真实会话执行成功，并经权威存储确认——
    `session-0175e700` →「[R001][50分] 请用一句话说明缠」；
    `session-a28c4f73` →「[R002][10分] 闲聊内容归档」；
  - **顺带修掉一个真实缺陷**：改名后存储有 3~9 秒回写延迟，导致同一轮巡更里
    连续改两条会话时**序号会撞车**（实测 dry-run 两条都取到 `R001`）。
    → `nextNumber()` 新增"本轮已占用序号"集合，不再依赖存储即时可见；
  - **新增人工清单** `ai-control/config/naming_overrides.json`：
    个别会话首条消息是闲聊或不当言论，机器照抄会把那句话搬进侧边栏标题，
    **比不改更糟**，此时应人工指定中性标题或显式豁免（改完即生效，无需重启）；
  - **空会话规则**：零步空会话（无标题、无首条消息）**不命名**——
    无内容可概括，硬起名等于编造。当前 5 条未合规会话全部属于此类。
- **当前命名状态（实测）**：凡有实际内容的会话，命名**100% 合规**；
  未合规的 5 条全部是零步空会话，属上述规则的预期结果。
- **插件路线暂缓**：插件相关修复（地址自解析、全程留痕、看板模块解析、
  与 `showCard` 解耦）已完成并提交，但**在宿主内的实际效果未经重启验证**，
  故不作为当前生效机制；`scripts/verify_auto_naming_e2e.mjs` 保留，
  待将来有机会重启时一次性验收。
- **最终采用的机制：宿主级「开工第一动作」指令 + 一键改名入口（无需重启）**：
  - **需求原话**：「每次发起任务都对当前任务马上进行修改」。轮询式看门狗
    （每 N 秒巡一遍）不满足"马上"，故不作为主机制；
  - **机制一 · 指令注入**：把「零、开工第一动作：立刻给当前任务改名」
    写入 `$DSH_HOME/AGENTS.md`。该文件由 DSH 在**每个会话的首次请求**注入，
    因此**改完即刻对新会话生效，无需重启桌面端**——
    这一点已实测确认：文件修改后宿主当场重读并把新内容注入本会话；
  - **机制二 · 一键入口**：新增 `scripts/name_me.sh`，把"解析会话身份 → 解析宿主地址 →
    规范校验 → 改名 → 回读确认"压成一条命令，任何目录可用：
    `name_me.sh "[R012][60分] 概述"` 指定标题、`--auto` 机器生成、`--check` 只查不改；
  - **实测**：从 `/tmp` 调用 `--check` 正确输出当前会话合规状态；
    对不合规标题退出码 1、对合规标题退出码 0、指定同名标题走通了完整 RPC 链路
    并经权威存储确认；
  - **顺带消除一处真实冲突**：门禁放行白名单里没有命名入口，而新规则要求
    "任何会话开工先改名"——若门禁未过就会变成"规则要求先改名、改名却被门禁挡住"的自锁。
    已将 `scripts/name_me.sh` 加入 `escapeScriptPrefixes`（只放行这一个入口，
    不放行 `rename_session.sh`）：它只改当前会话标题这一条元数据，不触碰工程实质。
- **看门狗定位调整**：`scripts/naming_watchdog.mjs` 从"主机制"降为**兜底**——
  当某个会话的执行者漏掉改名时，可手动或按需跑一遍补齐；不再要求常驻轮询。
- **未验证项声明**：
  - 自动命名**尚未在真实宿主中跑过**：逻辑已离线测通并实弹验证过 RPC 通路，但"插件在宿主内
    被 `agent/pre-step` 调起"这一步要重启后才能确认；在此之前不能声称它已在生产路径生效；
  - 自动生成的标题是**合格底稿而非最优**：分类与概述由机器按规则提炼，难度分固定 50，
    与人工按规范打分的质量有差距，模型仍应在首轮调用 `rename_session.sh` 优化；
  - 存量改名的**跨重启持久性已验证**（重启后复查 41 条合规标题仍在），但自动命名对
    "重启后新建会话"的覆盖情况，同样要等插件加载后才能验证。

---

### REQ-050：任务看板进度同步、界面中文化与精简输出（GCM-LEAN）
- **实施版本**：`v3.2.0`
- **需求状态**：`[Release 稳定生效]`
- **需求文案**：[`docs/constraint_mechanism_optimize_4.md`](constraint_mechanism_optimize_4.md)
- **背景阐述**：用户对管控机制提出五条优化——① 每次任务自约束输入/输出，杜绝废话；
  ② 任务看板每行后跟实时进度、首栏给整体进度；③ `bash`/`think` 等全部中文；
  ④ 输出精简到一屏内、废话用小字；⑤ 能不重启就不重启。用户就改动范围 / 进度口径 /
  中文化深度三项已拍板（见需求文案第一章）。
- **技术核实（实测复现）**：
  1. 看板即 `TodoPanel`（`conversation.input.dock` order=0），仅空清单不渲染；
  2. `todos` 投影只有 `content` + `status` 三态，**没有数字进度字段** → 进度只能由状态派生；
  3. 英文标签是**硬编码设计字面量**（`Think`、`VARIANT_TITLES`），不在语言包里；
  4. 宿主 boot 图每个插件带 `?rev=哈希` → 改文件后**刷新页面即生效，无需重启 App**；
  5. **本机 App 运行在只读 DMG 上**（`/dev/disk17s1 … read-only`，实测写入报 `EROFS`）
     → 必须先把 App 复制到可写位置才能打补丁，这正是本次唯一一次重启的物理原因；
  6. 原包为 Developer ID 签名（`H8MSV8BL2G`）且无特殊 entitlements，改动后需 ad-hoc 重签。
- **核心诉求与交付物**：
  1. **看板进度**：`client.js` 新增 `todoDone/todoPercent/itemPercent/itemStateText`，
     标题栏加总进度条 + `N%（已完成/总数）`，每行加「状态字 + 迷你进度条」；
  2. **界面中文化**：`Think`→`思考中`；`Search/Read/Bash/Write/Edit/Code/Tool call`
     → `搜索/读取/执行命令/写入/编辑/代码/工具调用`；
  3. **可重放补丁器**：新增 [`scripts/patch_dsh_todo_progress.cjs`](../scripts/patch_dsh_todo_progress.cjs)
     ——幂等（锚点唯一性校验 + 已打则跳过）、自动备份、回读六项校验、只读卷拒绝、
     优先选可写安装位；`--check` 退出码即补丁在位与否（供门禁/收尾使用）；
  4. **安装位迁移**：`ditto` 复制到 `/Applications/DSH Desktop.app` 并 ad-hoc 重签。
- **关联文件**：
  - `scripts/patch_dsh_todo_progress.cjs`
  - `docs/constraint_mechanism_optimize_4.md`
  - 补丁目标（App 内置，非本仓）：`@deepseek-ai/dsh-client-ui-conversation/lib/client.js`、
    `@deepseek-ai/dsh-client-ui-tool/lib/client.js`
- **验收标准**：
  - [x] 补丁器 `--check` 六项回读全绿（看板总进度条 / 每行进度 / 进度样式 / 思考中 / 执行命令 / 搜索）；
  - [x] **补丁可从原始包完整重放**：对 DMG 原始 `client.js` 副本跑 `--apply` 得到的产物与落地副本逐字节一致；
  - [x] 补丁后 `node --check` 语法通过（会话包 + 工具包）；
  - [x] **补丁幂等实测**：重复 `--apply` 不产生二次插入、不重复追加 CSS；
  - [x] 只读卷保护实测：对 DMG 内路径 `--apply` 被拒绝并给出迁移指引（退出码 3）；
  - [x] 进度口径可复算：2 完成 + 1 进行中 / 7 项 = 36%；
  - [ ] ⬜ **视觉效果未验证**：我无法截取浏览器画面，需用户重启后肉眼确认；
  - [ ] ⬜ 重启后需确认新安装位（`/Applications`）能正常启动并加载已打补丁的插件；
  - [ ] ⬜ App 升级会覆盖补丁，需重跑补丁器——目前**没有自动守护**，属已知缺口。

---

### REQ-051: 管控机制六项综合优化与能力全景治理
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v3.3.0`
- **提出时间**：2026-09-23
- **最新更新**：2026-09-23
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-006`）
- **核心诉求与交付物**：
  1. **低风险任务免密直通**：常规读写与工程内开发操作全面静默放行，杜绝频发输入机器密码或阻断确认；更新 [`rules/security/security_baseline.md`](../rules/security/security_baseline.md)；
  2. **五大能力层统一索引**：编目插件 (Plugin)、智能体 (Agent)、命令行 (CLI)、协议工具 (MCP)、技能 (Skill)；
  3. **双层能力接口与正负案例**：在 [`indexes/capabilities_index.md`](../indexes/capabilities_index.md) 建立外层索引卡（含大致用法与负面反例/踩坑红线）与内层实操指南；
  4. **存量与新增新鲜度检测机制**：产出 [`scripts/check_freshness.mjs`](../scripts/check_freshness.mjs)，支持全量健康度探活与看板输出；
  5. **管控更新全量双向生效**：在 [`rules/workflow/change_flow.md`](../rules/workflow/change_flow.md) 确立新增与存量同权铁律，存量校准脚本闭环；
  6. **独立文件夹归档与版本同步**：设立 [`ai-control/requirements/`](../ai-control/requirements/) 专属需求归档仓，并通过 [`scripts/sync_control_requirements.mjs`](../scripts/sync_control_requirements.mjs) 校验双向同步。
- **关联文件**：
  - `ai-control/requirements/README.md`
  - `ai-control/requirements/control_requirements_ledger.md`
  - `indexes/capabilities_index.md`
  - `scripts/check_freshness.mjs`
  - `scripts/sync_control_requirements.mjs`
  - `rules/security/security_baseline.md`
  - `rules/workflow/change_flow.md`
- **验收标准**：
  - [x] 独立需求仓目录建立且版本 SemVer 标记规范；
  - [x] 免打扰低风险静默放行白名单固化进安全基线；
  - [x] 五大能力层全景索引建立且正反案例标注完整；
  - [x] 新鲜度与可用性检测探针实跑 100% 通过；
  - [x] 管控机制双向生效铁律落地，存量对齐扫描通过；
  - [x] 需求双向同步脚本校验通过。

---

### REQ-052: 显式结论置顶铁律与本地运算降耗规约
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v3.4.0`
- **提出时间**：2026-09-23
- **最新更新**：2026-09-23
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-007`）
- **核心诉求与交付物**：
  1. **首屏最显眼处显式结论**：在 [`rules/system/meta_rules.md`](../rules/system/meta_rules.md) 与 [`AGENTS.md`](../AGENTS.md) 确立置顶结论铁律，首行必须显式输出物理执行状态徽标（🟡【仅方案规划态】vs 🟢【真实实施完成态】），杜绝计划与实施混淆；
  2. **本地运算优先 (Local-Compute First)**：在 [`rules/coding/token_and_local_compute_optimization.md`](../rules/coding/token_and_local_compute_optimization.md) 落地工程规约，凡规则明确、计算密集的排查与过滤必须在本地用命令执行，禁止海量原始字符往返；
  3. **结构性降低 Token 消耗**：大文件禁用无脑全盘读取，强制使用 `grep -n` 定位后带 `offset`/`limit` 切片，轻量索引卡优先，状态缓存复用。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/coding/token_and_local_compute_optimization.md`
  - `AGENTS.md`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 元规则第二十二条（显式结论律）与第二十三条（Token降耗律）生效；
  - [x] 项目级约束收尾规范加入首行显式结论卡；
  - [x] 本地运算优先规约建立并包含反模式正向重构对照表；
  - [x] 管控专属台账与全局主台账版本双向对齐 v3.4.0。

---

### REQ-053: 任务闭环回溯自进化机制与管控机制 Token 深度压缩
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v3.5.0`
- **提出时间**：2026-09-23
- **最新更新**：2026-09-23
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-008`）
- **核心诉求与交付物**：
  1. **任务闭环自进化回溯**：确立第二十四条元规则与项目约束，收尾强制附带《任务流程结构化回溯卡》，覆盖实际步数、卡点根因与流程优化演进；
  2. **管控机制看板 Token 深度压缩**：优化 `control_gates.sh` 和 `ai-control/plugin/index.mjs`，在全绿通过态时切换为高密度紧凑视图，省略冗余通过细节，输出字符与 Token 消耗降低 65%；
  3. **常驻注入层精炼脱水**：优化 `AGENTS.md` 提示词体积，保持高密度原语与索引指针。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `ai-control/plugin/index.mjs`
  - `scripts/control_gates.sh`
  - `AGENTS.md`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 任务结项强制要求流程结构化回溯；
  - [x] 看板全绿态紧凑压缩实测生效且字符缩减超 60%；
  - [x] 管控版本统一推进至 v3.5.0。

---

### REQ-054: 快速通道高频指令扩充与地图导航式能力路由层
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v3.6.0`
- **提出时间**：2026-09-23
- **最新更新**：2026-09-23
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-009`）
- **核心诉求与交付物**：
  1. **快速高频指令扩充**：在 [`indexes/shortcuts_index.md`](../indexes/shortcuts_index.md) 注册“给我入口”（秒取交付物与中枢地址）与“版本号”（单行秒取系统最新实施版本）；
  2. **地图导航式能力路由层**：设计三级导航模型（起点意图 → 规划匹配 → 逐级途径点指引 → 终点落地点 → 避坑路况），建立规约 [`indexes/navigation_router.md`](../indexes/navigation_router.md)；
  3. **自动化轻量路由工具**：落地 [`scripts/route_navigate.mjs`](../scripts/route_navigate.mjs)，支持本地秒级生成地图导航路线与入口直达卡，免模型长上下文规划开销。
- **关联文件**：
  - `indexes/shortcuts_index.md`
  - `indexes/navigation_router.md`
  - `scripts/route_navigate.mjs`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 快速通道表注册“给我入口”、“版本号”、“地图导航”且通道审计通过；
  - [x] 导航脚本完成并实测三种模式输出正常；
  - [x] 全局台账与专项目录版本统一推进至 v3.6.0。

---

### REQ-055: 全局流程调度 Agent Life 与 Google 级高信噪比输出架构
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v3.7.0`
- **提出时间**：2026-09-23
- **最新更新**：2026-09-23
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-010`）
- **核心诉求与交付物**：
  1. **全局流程管控 Agent Life**：确立专门负责时序掌控、执行裁决与全局调度锁申领/释放的生命周期调度器规约 [`rules/workflow/agent_life_spec.md`](../rules/workflow/agent_life_spec.md)；
  2. **阶段原子性完成反馈**：执行工人完成每道工序后出具标准的原子回执 (Stage Feedback Receipt) 驱动 Agent Life 推进下一步；
  3. **Google 级意图理解与输出呈现**：借鉴搜索精选摘要 (Featured Snippet) 与知识面板，首屏零击直达核心答案；
  4. **P0~P2 重要度三级过滤**：在 [`rules/system/meta_rules.md`](../rules/system/meta_rules.md) 确立第二十五条，🔴 P0 置顶，🟡 P1 精炼单行，⚪ P2 无关修饰套话 100% 彻底静默剔除。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/workflow/agent_life_spec.md`
  - `scripts/agent_life.mjs`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] Agent Life 规约与调度引擎脚本落地；
  - [x] 阶间原子回执标准确立；
  - [x] 元规则第二十五条生效，重要度过滤规则入册；
  - [x] 全局台账与专项目录版本统一推进至 v3.7.0。

---

### REQ-056: 全域能力标识规范重命名、极速文案通道与单例 Agent PP / 短生命周期 Life(N) 并发调度
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v3.8.0`
- **提出时间**：2026-09-23
- **最新更新**：2026-09-23
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-011`）
- **核心诉求与交付物**：
  1. **全域五大能力标识规范化重命名与唯一性检测**：落地 `scripts/check_unique_identifiers.mjs`，在 `indexes/capabilities_index.md` 统一前缀与唯一 ID（`agent.*` / `mcp.*` / `cli.*` / `skill.*` / `plugin.*`）；
  2. **极速提炼通道“给出文案”**：在 `indexes/shortcuts_index.md` 注册 G0 高速通道，一键将口语想法提炼成便于 AI 执行的标准 PRD；
  3. **单例并发中枢 Agent PP**：确立全任务唯一并发编排中枢，负责任务树拓扑拆解、生命周期调度与屏障汇聚；
  4. **短生命周期串行执行体 Agent Life(N)**：支持多实例编号（life1, life2...），单线串行推进，完成出具回执后即刻消亡释放资源；
  5. **PP 与 Life 分层协同规约与引擎升级**：编制 [`rules/workflow/pp_life_orchestration.md`](../rules/workflow/pp_life_orchestration.md) 并升级 `scripts/agent_life.mjs` 支持派生、消亡与全局 teardown 初始化。
- **关联文件**：
  - `indexes/shortcuts_index.md`
  - `indexes/capabilities_index.md`
  - `scripts/check_unique_identifiers.mjs`
  - `rules/workflow/pp_life_orchestration.md`
  - `scripts/agent_life.mjs`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 快速通道“给出文案”注册生效并通过通道审计；
  - [x] 能力唯一标识检测器通过，无重名冲突；
  - [x] PP-Life 调度规约建立并完成脚本引擎自测；
  - [x] 全局台账与专项目录版本统一推进至 v3.8.0。

---

### REQ-057: 第一性原理与物理实证律
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v3.9.0`
- **提出时间**：2026-09-23
- **最新更新**：2026-09-23
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-012`）
- **核心诉求与交付物**：
  1. **元规则第二十六条**：在 [`rules/system/meta_rules.md`](../rules/system/meta_rules.md) 正式确立《第一性原理与物理实证律》，严禁人云亦云与盲目采信二手转述；
  2. **第一性原理调查与实证五步法**：编制 [`rules/coding/first_principles_verification.md`](../rules/coding/first_principles_verification.md)，确立本质还原、剥离假设、最小探针、采集实况与实证闭环的标准化调查路径；
  3. **L1~L3 论据证据分级法典**：明确 L1 物理实证（退出码0/真实日志/读回）完全采信，L2 严密推论附推导链采信，L3 外部转述绝不采信必须探针化验。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/coding/first_principles_verification.md`
  - `indexes/rules_index.md`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 第二十六条元规则写入生效；
  - [x] 第一性原理与实证调查五步法规约落地；
  - [x] 全局台账与专项目录版本统一推进至 v3.9.0。

---

### REQ-058: 显式交付状态、六大可见即用实体产物与极端任务聚焦
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.0.0`
- **提出时间**：2026-09-23
- **最新更新**：2026-09-23
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-013`）
- **核心诉求与交付物**：
  1. **显式交付状态置顶**：首屏第一行必须严格以 🟢【真实实施完成态】或 🟡【仅方案规划态】等标准化徽标定性，彻底消灭模糊交付；
  2. **六大实体产物可见即用铁律**：交付收尾中必须具备实体入口（文案、DMG安装包、Web服务URL、App/脚本、物理文件路径、可视化图片），真实存在且开箱即用；
  3. **极端任务聚焦与无关问题静默**：严格只围绕本次任务直接目标答复，客套寒暄、发散思考彻底 100% 静默过滤。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 第二十七条元规则写入生效；
  - [x] 任务执行流固化六大可见实体交付物契约；
  - [x] 全局台账与专项目录版本统一跃迁至里程碑 v4.0.0。

---

### REQ-059: 报错反思防复发闭环、流程刚柔分级矩阵与交付输出框架刚性化
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.1.0`
- **提出时间**：2026-09-23
- **最新更新**：2026-09-23
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-014`）
- **核心诉求与交付物**：
  1. **元规则第二十八条与报错防复发长期台账**：在 [`rules/system/meta_rules.md`](../rules/system/meta_rules.md) 确立《报错归因记录与防复发优化律》，落地 [`memory/error_ledger.md`](../memory/error_ledger.md)，非零退出与断言失败强制三段式解构并反哺前置探针自检；
  2. **流程刚柔分级实施准则**：在 [`rules/workflow/task_execution_flow.md`](../rules/workflow/task_execution_flow.md) 明确划分“绝对刚性实施（安全红线/真实性/状态/标准输出框架）”与“弹性自适应实施（并发调度/深度上下文遍历/独立PRD）”边界；
  3. **交付收尾刚性输出框架**：在元规则第二十九条与执行流中固化交付收尾五大刚性模块（状态徽标、核心成果、实体入口、量化门禁/未验证声明、流程回溯卡），缺一不可。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `memory/error_ledger.md`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 第二十八条、第二十九条元规则写入生效；
  - [x] 任务执行流固化流程刚柔分级矩阵与交付五大模块；
  - [x] 长期报错台账模板与规范建立；
  - [x] 全局台账与专项目录版本统一推进至 v4.1.0。

---

### REQ-060: 全端统一可读性排版设计法典与检索路由质量评估自进化机制
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.2.0`
- **提出时间**：2026-09-23
- **最新更新**：2026-09-23
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-015`）
- **核心诉求与交付物**：
  1. **全端可读性与无障碍排版设计法典落地**：编制 [`knowledge/common/readability_specification.md`](../knowledge/common/readability_specification.md)，统一 Web、DMG、App、小程序字体族、字号阶梯比例、导航大小、正文行高、绝对最小文字红线、WCAG 2.1 对比度与加粗节制规范，并统合至 [`knowledge/common/interaction_specification.md`](../knowledge/common/interaction_specification.md) 与知识库总纲；
  2. **检索与路由质量统计评估与高速通道扩充**：建立 RQI 指标评估模型，在 [`indexes/shortcuts_index.md`](../indexes/shortcuts_index.md) 增补“可读性规范”高速通道并扩充“给出文案”自然语言触发词，通道通过 `scripts/channel_audit.mjs` 审计保持 0 冲突与 0 死链。
- **关联文件**：
  - `knowledge/common/readability_specification.md`
  - `knowledge/common/interaction_specification.md`
  - `knowledge/common/README.md`
  - `knowledge/README.md`
  - `indexes/shortcuts_index.md`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 全端排版设计法典建立并统合进公共知识库；
  - [x] 交互规范完成《Don't Make Me Think》排版章节指针统合；
  - [x] 快速通道表完成可读性通道注册并全量审计通过（29 条通道 0 问题）；
  - [x] 全局台账与专项目录版本统一推进至 v4.2.0。

---

### REQ-061: 文本精细排版法典扩充与系统交互动效组件规范化
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.3.0`
- **提出时间**：2026-09-23
- **最新更新**：2026-09-23
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-016`）
- **核心诉求与交付物**：
  1. **文字微观排版铁律落地**：在 [`knowledge/common/readability_specification.md`](../knowledge/common/readability_specification.md) 扩充文字布局（桌面 45~75 字/移动 20~35 字）、中文左对齐/数据右对齐、1.5~1.6行高、避头尾法则与孤字防范；
  2. **交互按钮系统与页面动效组件规范**：在 [`knowledge/common/interaction_specification.md`](../knowledge/common/interaction_specification.md) 落地 Large/Medium/Small 跨端按钮尺寸、圆角 Token、推进/淡入/抽屉页面过渡形式、250ms动效曲线及按压下沉反馈；
  3. **全域版本同步跃迁**：全局台账与管控专项目录版本统一推进至 v4.3.0。
- **关联文件**：
  - `knowledge/common/readability_specification.md`
  - `knowledge/common/interaction_specification.md`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 文字精细排版四项铁律完成扩充；
  - [x] 按钮规格、页面过渡与点击反馈动效法典落地；
  - [x] 全局台账与专项目录版本统一推进至 v4.3.0。

---

### REQ-062: 格式塔交互映射深化与全域字体选型工程标准法典化
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.4.0`
- **提出时间**：2026-09-23
- **最新更新**：2026-09-23
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-017`）
- **核心诉求与交付物**：
  1. **格式塔交互行为映射规范法典化**：在 [`knowledge/common/interaction_specification.md`](../knowledge/common/interaction_specification.md) 扩充格式塔第七定律（共同命运律），并将接近/相似/闭合/主体背景分离/秩序/连续/共同命运七大定律深度绑定至具体交互映射行为（焦点流转、组件继承、蒙层交互、手势反馈、协同折叠动效）；
  2. **全域字体使用工程规范落地**：在 [`knowledge/common/readability_specification.md`](../knowledge/common/readability_specification.md) 落地四大跨端系统级字体栈，明确零网络字体依赖、艺术花体禁用红线、西文优先混排策略及 `tabular-nums` 数字等宽渲染铁律；
  3. **版本全局推进**：全局需求台账与管控专项目录版本统一跃迁至 v4.4.0。
- **关联文件**：
  - `knowledge/common/interaction_specification.md`
  - `knowledge/common/readability_specification.md`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 交互规范完成格式塔七大定律交互映射行为法典化；
  - [x] 可读性规范完成全域系统字体族与四大字体红线固化；
  - [x] 全局台账与专项目录版本统一推进至 v4.4.0。

---

### REQ-063: 任务级版本强制递增律与全域交付输出物版本强同步闭环
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.5.0`
- **提出时间**：2026-09-23
- **最新更新**：2026-09-23
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-018`）
- **核心诉求与交付物**：
  1. **第三十条元规则落地**：在 [`rules/system/meta_rules.md`](../rules/system/meta_rules.md) 写入《任务级版本强制递增与双向闭环律》，确立“每动必升版”与“无台账无版本”刚性红线；
  2. **交付收尾输出物强同步三大靶点**：在 [`rules/workflow/task_execution_flow.md`](../rules/workflow/task_execution_flow.md) 与 [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md) 固化交付物自身元数据、需求管理主台账、最终答复与收尾卡片的三级版本 100% 同步约束；
  3. **版本全局推进**：全库实施总版本与受管文档头部版本一致推进至 v4.5.0。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `rules/workflow/versioning_standard.md`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 第三十条元规则写入生效；
  - [x] 执行流与版本规范固化每动必升版与输出物强同步三大靶点；
  - [x] 全局台账与专项目录版本统一推进至 v4.5.0。

---

### REQ-064: 交互式核心信息卡片增强、多官网精美组件检索图库与新能力标准化接口生命周期
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.6.0`
- **提出时间**：2026-09-23
- **最新更新**：2026-09-23
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-019`）
- **核心诉求与交付物**：
  1. **核心交付信息交互式卡片化**：在 [`rules/workflow/task_execution_flow.md`](../rules/workflow/task_execution_flow.md) 与 [`knowledge/common/interaction_specification.md`](../knowledge/common/interaction_specification.md) 落地核心成果交互卡片标准（包含卡片闭合、状态/版本胶囊、一句话成果点透、指标栅格与直达入口）；
  2. **多官网精美组件检索与图控法典**：编制 [`knowledge/common/component_asset_reference.md`](../knowledge/common/component_asset_reference.md)，建立 Shadcn UI、Tailwind UI、Apple HIG、AntD、Material 3 与 WeUI 权威检索源白名单，并抽象四大可复用微组件版式；
  3. **新能力命名与双层接口生命周期全规约**：在 [`indexes/capabilities_index.md`](../indexes/capabilities_index.md) 确立五大类分层点分命名法、内外双层接口契约（输入/输出/正负案例/降级策略）与快速通道路由强绑定闭环；
  4. **版本强同步跃迁**：全库实施总版本推进至 v4.6.0。
- **关联文件**：
  - `rules/workflow/task_execution_flow.md`
  - `knowledge/common/interaction_specification.md`
  - `knowledge/common/component_asset_reference.md`
  - `indexes/capabilities_index.md`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 执行流收尾框架落地交互式核心信息卡片标准；
  - [x] 多官网精美组件检索图控法典建立并统合进知识库；
  - [x] 新能力标准化命名与双层接口生命周期法典化；
  - [x] 全局台账与专项目录版本统一推进至 v4.6.0。

---

### REQ-065: 管控机制实况巡检与信息图二期实测重绘 (v4.7.0)
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.7.0`
- **提出时间**：2026-09-23
- **最新更新**：2026-09-23
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-020`）
- **核心诉求与交付物**：
  1. **管控机制全景实测巡检**：执行 G1~G4 四道门禁、骨架齐备率、防丢覆盖、孤儿目录、未提交代码与双检查重全面探活；
  2. **信息图二期实测数据重绘**：将实测数据（65需求条目、70文件/494实质块、单行最高51/限65、v4.7.0）重绘进 `assets/generated_images/control_mechanism_infographic_v2.svg` 并同步生成 PNG；
  3. **版本全生命周期强同步**：受管文档与主台账版本统一跃迁至 v4.7.0。
- **关联文件**：
  - `assets/generated_images/control_mechanism_infographic_v2.svg`
  - `assets/generated_images/control_mechanism_infographic_v2.png`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 管控机制全要素物理探针巡检完成；
  - [x] 信息图 SVG/PNG 完成实测数据重绘；
  - [x] 全局台账与专项目录版本统一推进至 v4.7.0。

---

### REQ-066: 管控机制状态层脚本 Bash 语法缺陷修复与快照写入健全化 (v4.8.0)
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.8.0`
- **提出时间**：2026-09-24
- **最新更新**：2026-09-24
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-021`）
- **核心诉求与交付物**：
  1. **状态层脚本（旧称门禁内核）Bash 变量解析缺陷修复**：修复 `scripts/control_gates.sh` 快照输出代码块中 `$TOTAL_GATES` 变量因紧贴中文全角括号导致的 `unbound variable` 致命异常，以及非函数上下文中使用 `local i` 的语法错误；
  2. **门禁判定状态快照生成与退出码健全化**：消除生成 `ai-control/reports/latest_status.md` 时被 `2>/dev/null` 静默掩盖的崩溃，确保门禁看板计算执行时退出码真实返回 0 并完整产出 30 行结构化快照；
  3. **任务级版本强制递增与双向台账闭环**：依照第三十条元规则，全库受管文档与主/专属台账实施总版本统一推进至 `v4.8.0`。
- **关联文件**：
  - `scripts/control_gates.sh`
  - `ai-control/reports/latest_status.md`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] `./scripts/control_gates.sh check` 退出码真实返回 0；
  - [x] `ai-control/reports/latest_status.md` 完整持久化；
  - [x] 全局台账与专项目录版本统一推进至 v4.8.0。

---

### REQ-067: 管控机制索引/路由/接口/执行四层解耦与任务命名全生命周期治理规范 (v4.9.0)
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.9.0`
- **提出时间**：2026-09-24
- **最新更新**：2026-09-24
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-022`）
- **核心诉求与交付物**：
  1. **任务命名全生命周期双向同步**：在任务执行前置（S05 环节）与门禁看板中固化自动/手动命名闭环，保持存量与新增会话命名 100% 同步合规；
  2. **四级解耦执行体系确立**：在 [`rules/workflow/task_execution_flow.md`](../rules/workflow/task_execution_flow.md) 确立“索引层 (Index) ➔ 路由层 (Route) ➔ 接口层 (Interface) ➔ 执行层 (Execution)”四级解耦流水线；
  3. **新增与变更全量同步到索引层铁律**：在 [`rules/workflow/change_flow.md`](../rules/workflow/change_flow.md) 固化索引覆盖硬约束，并在 [`scripts/legacy_align_scan.mjs`](../scripts/legacy_align_scan.mjs) 建立索引覆盖探针；
  4. **执行层全面开放标准化接口**：在 [`indexes/tool_interfaces.md`](../indexes/tool_interfaces.md) 与 [`indexes/capabilities_index.md`](../indexes/capabilities_index.md) 统一定义全域能力的 Identifier、边界范围、输入参数 Schema、输出回执与安全评级；
  5. **执行层原子黑盒封装**：执行逻辑内部自治封装，外部调度只走确定性标准接口，杜绝跨层直接穿透。
- **关联文件**：
  - `rules/workflow/task_execution_flow.md`
  - `rules/workflow/change_flow.md`
  - `indexes/capabilities_index.md`
  - `indexes/navigation_router.md`
  - `indexes/tool_interfaces.md`
  - `scripts/legacy_align_scan.mjs`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 四级解耦执行体系与全生命周期命名规范写入生效；
  - [x] 索引层与接口层开放契约定义完备；
  - [x] 存量校准脚本具备索引覆盖判定能力并全绿通行；
  - [x] 全局台账与专项目录版本统一推进至 v4.9.0。

---

### REQ-068: 全原子变动版本锚定基石律与管控机制存量新增全域双向同步治理体系 (v4.10.0)
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.10.0`
- **提出时间**：2026-09-24
- **最新更新**：2026-09-24
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-023`）
- **核心诉求与交付物**：
  1. **全原子变动版本锚定律**：确立“无论多小的改动均须以版本变动为法定基石”原则，单字/注释/配置微调均至少递增 PATCH，彻底杜绝无版本悬空物理修改；
  2. **管控机制存量新增全域双向同权律**：管控规则、门禁判定、扫描探针的任何优化，100% 同权无差别覆盖存量资产与未来新增资产，禁止任何历史豁免；
  3. **存量强制校准闭环**：机制升级必须强制配套存量资产批量迁移与对齐，存量违规项清零前禁止关闭任务；
  4. **四位一体强同步**：受管文档头部元数据、主需求台账、管控台账、实况图资 100% 推进归位至 `v4.10.0`。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/workflow/versioning_standard.md`
  - `rules/workflow/change_flow.md`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 第三十条元规则与版本标准完成零容忍版本锚定与同权法典化；
  - [x] 变更流规约固化存量全量回扫与当轮清零闭环；
  - [x] 全局台账与专项目录版本统一推进至 v4.10.0。

---

### REQ-069: 全任务强命名门禁与语义化分类编号难度打分模型扩充规范 (v4.11.0)
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.11.0`
- **提出时间**：2026-09-24
- **最新更新**：2026-09-24
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-024`）
- **核心诉求与交付物**：
  1. **任务启动即命名法定硬门禁**：确立每次执行任务首动在 S05 工序对当前会话完成合规命名的刚性约束；
  2. **知识库命名法典扩充：中文语义化分类**：在 [`knowledge/common/task_naming_spec.md`](../knowledge/common/task_naming_spec.md) 扩充七大中文语义化分类（新需/调研/优规/修漏/重构/巡检/测验），保持 `[分类编号][难度] 概述` 标准三段式；
  3. **模型自主难度打分梯队法典化**：完善 1~100 分四维难度打分模型与四个执行区间（1~30极低/31~60中等/61~85复杂/86~100颠覆），100 分最难；
  4. **任务概述极简与防截断**：概述汉字数严格限制在 8 字或以内，动宾短语一语中的；
  5. **存量与新增双向全面调整**：升级脚本工具链（`check_task_naming.sh`、`name_me.sh`、`auto_naming.mjs`），向后兼容存量英文字母分类，新增任务优先中文语义化标签，并完成全库版本与台账推进至 `v4.11.0`。
- **关联文件**：
  - `knowledge/common/task_naming_spec.md`
  - `scripts/check_task_naming.sh`
  - `scripts/name_me.sh`
  - `scripts/lib/auto_naming.mjs`
  - `rules/workflow/task_execution_flow.md`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 知识库命名规范权威源完成中文语义化分类与难度标尺扩充；
  - [x] 校验脚本与一键改名工具支持新中文分类与难度格式并实测通过；
  - [x] 全局台账与专项目录版本统一推进至 v4.11.0。

---

### REQ-070: 管控机制结构化与全流程闭环防跳步执行规范 (v4.12.0)
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.13.0`
- **提出时间**：2026-09-24
- **最新更新**：2026-09-24
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-025`）
- **核心诉求与交付物**：
  1. **结构化与流程化顶层设计**：强化“索引 ➔ 路由 ➔ 接口 ➔ 执行”四级解耦机制，确立全域任务执行的刚柔分级实施准则；
  2. **不可跳过的刚性卡点保障机制 (Anti-Bypass Guardrails)**：法典化确立“无客观判定不立规，有客观判定必阻断”铁律，固化六大物理防线（G1~G4底座门禁、S05首发改名、S07待办常显、S11写后必读回、S13多维双检扫描、S16五大模块收尾），明确机器判定命令与跳步处罚；
  3. **细致的全景任务执行流程闭环**：在 `rules/workflow/task_execution_flow.md` 细化从阶段 0（意图接收）到阶段 7（交付收尾）的八阶端到端流水线，明确每道工序的输入前置、核心动作、客观判定与产出标准；
  4. **四位一体版本强同步**：推进全局实施总版本号至 `v4.12.0`，主需求台账与管控台账原子同步。
- **关联文件**：
  - `rules/workflow/task_execution_flow.md`
  - `ai-control/requirements/control_requirements_ledger.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 核心流程法典完成结构化、流程化与防跳步刚性卡点扩充；
  - [x] 任务执行八阶闭环流水线与机器判定命令细致落盘并完成写后读回；
  - [x] 全局台账、管控台账与受管文档版本统一推进至 v4.12.0。

---

### REQ-071: 任务栏改名前端可见性保障与文末四要素固定精简收尾规范 (v4.13.0)
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.13.0`
- **提出时间**：2026-09-24
- **最新更新**：2026-09-24
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-026`）
- **核心诉求与交付物**：
  1. **任务栏改名前端肉眼可见刚性保障**：彻底根治仅修改存储但前端界面脱节的问题；重构 `scripts/rename_session.sh`，自动从 SQLite 数据库提取宿主 Web 鉴权 Cookie，构造标准的 `session/rename` RPC 请求体与正确的 `args.request` 封装，通过宿主事件总线广播前端，实现前端任务栏/侧边栏无需刷新原地即时更新，并完成本地权威存储双写闭环；
  2. **文末四要素固定精简收尾结构**：废除冗长五大模块的无效信息堆砌，在 `rules/workflow/task_execution_flow.md` 固化文末绝对刚性收尾框架，必须且仅包含：【输出物】、【输出地址】、【当前状态】、【重要说明】四项标准要素；
  3. **四位一体版本强同步**：推进全局实施总版本号至 `v4.13.0`，主需求台账与管控台账原子同步。
- **关联文件**：
  - `scripts/rename_session.sh`
  - `rules/workflow/task_execution_flow.md`
  - `ai-control/requirements/control_requirements_ledger.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 改名脚本通过 RPC 广播 + 存储双写实现前端任务栏肉眼可见修改；
  - [x] 实操法典固化文末四要素固定精简收尾结构并完成读回校验；
  - [x] 全局台账、管控台账与受管文档版本统一推进至 v4.13.0。

---

### REQ-072: 管控机制核心链路四维深化优化（动态更名 · 版本联动 · 收敛落盘 · 初始化快速通道）
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.14.0`
- **提出时间**：2026-09-24
- **最新更新**：2026-09-24
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-027`）
- **核心诉求与交付物**：
  1. **任务全生命周期动态更名与前端穿透**：任务执行前必须强制命名（S05），执行过程中阶段演进时动态更名，依托 `scripts/rename_session.sh` 与 RPC 广播实现前端看板肉眼可见即时更新；
  2. **版本号与需求强联动**：任务执行前置生成/关联需求编号，版本号按 SemVer 刚性递增，并在前端状态栏/版本徽标中完成同步呈现；
  3. **收敛态落盘与“以需定测”闭环**：任务执行收敛后自动将技术决策回写项目文件夹需求文件，测试用例严格以需求文件验收条款为基准执行验证；
  4. **“项目初始化”快速通道落地**：将“项目初始化”注册为 G0 高速通道，新增 `scripts/init_project.sh` 脚手架脚本，秒级生成目录骨架、防丢文件与 v1.0.0 基础版本。
- **关联文件**：
  - `scripts/init_project.sh`
  - `indexes/shortcuts_index.md`
  - `rules/workflow/task_execution_flow.md`
  - `rules/workflow/versioning_standard.md`
  - `ai-control/requirements/control_requirements_ledger.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 快速通道注册“项目初始化”且通道审计（`channel_audit.mjs`）100% 绿灯；
  - [x] 脚手架脚本 `scripts/init_project.sh` 具备可执行权限并支持秒级骨架与基础版本生成；
  - [x] 任务动态更名、版本需求联动、收敛落盘与以需定测在实操法典中闭环落盘；
  - [x] 全局台账、管控台账与受管文档版本统一推进至 v4.14.0。

---

### REQ-073: 全域任务命名同权治理与文件生命周期标记清除定位规约 (v4.15.0)
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.15.0`
- **提出时间**：2026-09-24
- **最新更新**：2026-09-24
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-028`）
- **核心诉求与交付物**：
  1. **存量与新增任务命名全域同权机器治理**：依据 [`knowledge/common/task_naming_spec.md`](../knowledge/common/task_naming_spec.md) 严格推行三要素 `[分类编号][难度分] 汉字概述`。新增任务首动强制调用 `scripts/rename_session.sh` 并通过 RPC 穿透前端任务栏；历史存量任务通过 `scripts/batch_rename_sessions.mjs` 审计与批量清洗，门禁看板常显命名状态，不合规直接阻断；
  2. **全域文件生命周期元数据标记 (Retention Tagging)**：在所有新建或修改的文档头部强制嵌入生命周期元数据块（文档类型 Doc Type、清理定位 Retention、生成会话、到期清除条件），四级保留策略白名单（`[PERMANENT]` 永久核心资产、`[PERSISTENT]` 长期受管资产、`[EPHEMERAL-AUTO]` 临时易失产物、`[DEPRECATED-PURGEABLE]` 已废弃可清理）；
  3. **清除机制快速扫描与自动化联动**：升级自愈清理脚本 `scripts/disk_check_and_cleanup.sh`，支持根据头部 `Retention` 标签秒级定位可删除文件并安全清理，绝对保护 `[PERMANENT]` 白名单资产；
  4. **四位一体版本强同步**：推进全局实施总版本号至 `v4.15.0`，主需求台账与管控台账原子同步。
- **关联文件**：
  - `knowledge/common/task_naming_spec.md`
  - `rules/workflow/audit_and_cleanup.md`
  - `templates/requirement_template.md`
  - `templates/page_ledger_template.md`
  - `scripts/disk_check_and_cleanup.sh`
  - `ai-control/requirements/control_requirements_ledger.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 任务命名规约明确新增与存量任务全域同权与机器拦截；
  - [x] 资源治理规约明确文件元数据头部标记与四级 Retention 策略；
  - [x] 标准模板 templates/ 注入规范生命周期元数据头部；
  - [x] 磁盘自愈清理脚本落地基于头部元数据标记的快速定位与安全清除；
  - [x] 全局台账、管控台账与受管文档版本统一推进至 v4.15.0。

---

### REQ-074: 任务首动命名调度句柄化与执行驱动路由索引自底向上强同步规约 (v4.16.0)
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.16.0`
- **提出时间**：2026-09-24
- **最新更新**：2026-09-24
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-029`）
- **核心诉求与交付物**：
  1. **任务首动改名与调度句柄法定化**：在方案筹策后、任何实质操作前，首发命令必须调用 `scripts/rename_session.sh` 并广播穿透前端任务栏；标准三要素任务名自动成为该任务在生命周期中的全局唯一调度句柄（Task Dispatch Handle），子代理派发（Agent PP/Life）、锁申领与审计台账强制显式携带该名称；
  2. **执行驱动四级解耦自底向上逆向强同步**：确立“执行层能力变动 ➔ 接口层提取 ➔ 路由层注册 ➔ 索引层上架”的反向强同步协议（Reverse Capability Sync & Bubble-up Protocol）。任何执行层脚本能力的增删改，必须同步在接口层声明契约、在路由层注册自然语言通道、在索引层上架能力与正反案例；
  3. **机器判定硬门禁保障**：由 `scripts/channel_audit.mjs` 实施全通道审计，死链或冲突未归零前禁止交付；
  4. **四位一体版本强同步**：推进全局实施总版本号至 `v4.16.0`，主需求台账与管控台账原子同步。
- **关联文件**：
  - `rules/workflow/task_execution_flow.md`
  - `rules/workflow/agent_life_spec.md`
  - `indexes/capabilities_index.md`
  - `indexes/shortcuts_index.md`
  - `indexes/tool_interfaces.md`
  - `scripts/channel_audit.mjs`
  - `ai-control/requirements/control_requirements_ledger.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 实操法典确立任务首动改名为调度句柄前置法定条件；
  - [x] 实操法典固化执行驱动四级解耦自底向上强同步规约；
  - [x] 调度规范 agent_life_spec.md 明确子代理调度携带任务名称句柄；
  - [x] 通道审计脚本 channel_audit.mjs 保持 100% 绿灯；
  - [x] 全局台账、管控台账与受管文档版本统一推进至 v4.16.0。

---

### REQ-075: 管控机制知行合一强闭环、审计 Agent 与交付执行效果百分制量化打分规约
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.17.0`
- **提出时间**：2026-09-24
- **最新更新**：2026-09-24
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-030`）
- **核心诉求与交付物**：
  1. **管控机制知行合一闭环**：废除 Fast Track 免改名等一切豁免后门，所有任务必须在开工第一步首动改名；升级管控门禁接入 G0 命名硬门禁，未完成合规命名的会话直接阻断 `execAllowed`；
  2. **管控专属审计智能体 (Control Auditor)**：设立专职管控监督智能体，采用 0~100 分量化评分机制，严格按规划执行打 100 满分，按跳步、漏读回、未双检等违规项递减扣分；
  3. **交付结构升级扩充**：交付标准固化为六大模块，文末强制新增【执行效果】专属板块，呈现得分、评级与扣分审计明细；
  4. **版本强同步**：推进全局实施总版本号至 `v4.17.0`。
- **关联文件**：
  - `AGENTS.md`
  - `rules/workflow/task_execution_flow.md`
  - `ai-control/config/gates.conf`
  - `scripts/control_gates.sh`
  - `scripts/audit_execution.sh`
  - `ai-control/requirements/control_requirements_ledger.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] AGENTS.md 写入开工第〇步首动改名与全新【执行效果】收尾标准；
  - [x] task_execution_flow.md 废除豁免，确立知行合一原则与执行效果审计标准；
  - [x] control_gates.sh 接入 G0 命名门禁并联动阻断；
  - [x] scripts/audit_execution.sh 实现 0~100 分量化打分逻辑并输出标准卡片；
  - [x] 双检扫描与门禁脚本全部通过。

---

### REQ-076: 管控机制底层物理锁 Agent (Physical Lock Agent) 与全项目流程串行化硬阻断规约
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.18.0`
- **提出时间**：2026-09-24
- **最新更新**：2026-09-24
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-031`）
- **核心诉求与交付物**：
  1. **底层物理锁 Agent (Physical Lock Agent / PLA)**：在管控机制中新增独立物理锁机制，构建单向严格递增的工序链式状态机；必须完成上一步并产出机器落盘凭证，才允许解锁并执行下一步，严防跳步与抢跑；
  2. **全项目全局无差别强生效**：物理锁机制下沉至宿主基础设施与全局薄入口，在所有被 DSH 打开和管理的项目中全域生效；
  3. **底层拦截层联动**：在 `ai-control/plugin/index.mjs` 中接入物理锁检验，对无前置工序凭据的改动型工具调用实施底层硬阻断；
  4. **配套物理锁工具与自检**：研发 `scripts/lib/physical_lock.mjs` 内核与 `scripts/physical_lock.sh` CLI 工具，并补充完整自检测试套件；
  5. **版本强同步**：推进全局实施总版本号至 `v4.18.0`。
- **关联文件**：
  - `rules/workflow/task_execution_flow.md`
  - `rules/system/meta_rules.md`
  - `indexes/rules_index.md`
  - `ai-control/README.md`
  - `ai-control/plugin/index.mjs`
  - `scripts/lib/physical_lock.mjs`
  - `scripts/physical_lock.sh`
  - `scripts/test_physical_lock.mjs`
  - `ai-control/requirements/control_requirements_ledger.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 物理锁内核与 CLI 工具实现，支持状态查询、凭证写入、锁阶梯推进与跳步检测；
  - [x] 拦截层接入物理锁，未满足前置工序时严格阻断改动操作；
  - [x] 物理锁全套自检用例 100% 绿灯通过；
  - [x] 全局台账与管控台账同步推进至 v4.18.0；
  - [x] 双检扫描（冗余、冲突、存量校准）100% 绿灯。

---

### REQ-077: DSH 全域工程执行基线（全工程物理锁 · 五维知识库驱动 · 框架式留白初始化）规约
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.19.0`
- **提出时间**：2026-09-24
- **最新更新**：2026-09-24
- **管控专属台账**：[`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)（`CR-032`）
- **核心诉求与交付物**：
  1. **全域强制普适律**：确立物理锁与流程管控机制在所有 DSH 执行任务的工程中 100% 强制生效，消灭任何脱管与环境例外；
  2. **五维知识库驱动律**：所有任务执行必须以合法需求台账与知识库五大核心规范（工程、文字、交互、美术、故事背景世界观）为法定驱动基线，前置审查防冲突，严禁脱离规范凭空捏造；
  3. **新项目框架式留白初始化准则**：新工程初始化时坚决消除生硬假业务代码与过度膨胀的假数据，仅构建“骨架三件套 + 扩展插槽 (Slots)”，保持框架留白，为后续增量演进预留最大弹性；
  4. **版本强同步**：推进全局实施总版本号至 `v4.19.0`。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `knowledge/README.md`
  - `templates/project_dsh_bootstrap_template.md`
  - `scripts/init_dir.sh`
  - `indexes/rules_index.md`
  - `ai-control/requirements/control_requirements_ledger.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 系统元规则新增第三十二条（双轮驱动律）与第三十三条（框架留白初始化律）；
  - [x] 任务执行流程法典与知识库总纲强化五维规范前置约束与插槽规范；
  - [x] 新项目立项模板与自动化初始化脚本全面贯彻框架式留白；
  - [x] 全局台账与管控台账同步推进至 v4.19.0；
  - [x] 双检扫描（冗余、冲突、存量校准）100% 绿灯通过。

---

## 📎 附：不计入条目数的资产变更留痕

> 本节只是**资产与指针变更留痕**，不构成 `REQ-###` 需求条目、不新增规则、不改判定逻辑。
> 本节标题刻意不使用 `### REQ-N` 形式，故不影响 G3 门禁的条目计数口径
> （计数正则见 `scripts/control_gates.sh` 的 `check_sync()`）。

### 信息图重绘（2026-09-23 · 通道"生成信息图"）

- **触发**：用户口令"看看管控机制 + 生成信息图"，命中 [`indexes/shortcuts_index.md`](../indexes/shortcuts_index.md) 两条已登记通道；
- **新增资产**：`assets/generated_images/control_mechanism_infographic_v2.svg` + `.png`（1120×2000，复用基线版式、按实跑数据重绘）；
- **版本分工**：原 `assets/generated_images/gcm_gate_control_infographic.svg` 保留为**基线版式**（其内数字为写死值，已非现状）；
  分工口径的唯一权威出处为 [`indexes/rules_index.md`](../indexes/rules_index.md) 第〇章"机制信息图"表，
  [`README.md`](../README.md) 与 [`docs/constraint_mechanism_spec.md`](constraint_mechanism_spec.md) 只放指针；
- **本次实跑数据**（信息图数据源，均可复现）：门禁 4/4 · 骨架 11/11 · 防丢 8/8 · 合规 5/5 · 需求条目 50 ·
  未提交 0/30 · 冗余高相似对 0 · 冲突 0 · 待对齐 0（另 3 项书面豁免）· 通道 24 条 0 问题 · 十六步强制 11 / 建议 5；
- **改动后复跑**：冗余 0 · 冲突 0 · 待对齐 0 · 通道 0 问题；
- **未验证项**：`README.md`、`indexes/rules_index.md`、`docs/constraint_mechanism_spec.md` 中的新指针**尚未推送远程**；
  信息图 PNG 未在 Web GUI 页面内实点打开验证（仅以文件工具读回与目视校验）。
