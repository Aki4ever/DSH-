# 全局需求管理台账 (Requirements Ledger)

> ### 🏷️ **版本信息与实施追踪**
> - **当前系统实施总版本**：`v4.29.0`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **最后同步时间**：2026-10-02
> - **版本状态**：`[Release 稳定生效]`
> - **历史跳号留痕**：`v4.24.0 → v4.26.0` 曾跳过 `v4.25.0`（`v4.25.0` 归 REQ-089、`v4.26.0` 归 REQ-090，两笔账一次结清）。
> - **版本跳号说明**：`v4.26.0 → v4.28.0 → v4.29.0`，跳过 `v4.27.0`。原因：REQ-091 已认领目标版本 `v4.27.0`
>   但其"所有页面常显"仍待人工 DOM 取证，**不满足递增条件**（未完成项不得冒充完成）；
>   REQ-092 两批实施分别落 `v4.28.0`（覆盖/版本/反空架子）与 `v4.29.0`（拦截层通电/全域写拦截/推送闭环），
>   `v4.27.0` 仍预留给 REQ-091。此说明为**显式留痕**，非静默跳号。
> - **需求版本台账**：[`ai-control/requirements/req_versions.json`](../ai-control/requirements/req_versions.json)（机读，
>   由 `scripts/req_version_gen.mjs` 生成）；一致性判定入口 `node scripts/req_version_audit.mjs --check`。

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
     - **交互规范**：格式塔七大定律（接近/相似/闭合/主体背景分离/对称秩序/连续/共同命运）与 Don't Make Me Think 零思考直觉、防呆与三秒法则；
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

### REQ-078: 尾部固定结构交付四联装契约、极简输出原则与全域工程管控机制永久固化
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.20.0`
- **提出时间**：2026-09-24
- **最新更新**：2026-09-24
- **核心诉求与交付物**：
  1. **尾部固定四联装总结结构铁律**：确立每次输出最末尾必须包含固定总结区块：当前状态（规划/实施）、核心结论/输出物、输出物地址、执行效果打分（0~100量化评分与扣分项）；
  2. **全域所有 DSH 工程文件夹管控机制永久生效**：管控机制（首动合规改名、底层物理锁单向工序链、G0~G4 累积门禁、执行效果审计）在 DSH 宿主全域永久生效，任何工程任务均强制受其约束；
  3. **极简高信噪比输出铁律**：严守最小输出原则，与任务不相关的少说，没有问到的不要说，只有很相关且非常重要的才说；
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `AGENTS.md`
  - `ai-control/requirements/control_requirements_ledger.md`
  - `docs/requirements.md`
- **验收标准**：
  - [x] 系统元规则新增第三十四条（全域管控常态化与文末四联装极简交付律）；
  - [x] 任务执行流程法典与项目约束 AGENTS.md 固化文末固定总结结构与极简铁律；
  - [x] 全局需求台账与管控专项目录版本统一跃迁至 v4.20.0；
  - [x] 双检扫描（冗余、冲突、存量校准）100% 绿灯通过。

### REQ-079: 管控机制五维深化治理、存量工程全域批量规范化与带说明视觉强化交付契约
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.21.0`
- **提出时间**：2026-09-24
- **最新更新**：2026-09-24
- **核心诉求与交付物**：
  1. **执行必入台账与消重排冲处置**：严禁无 REQ 凭证的代码与规则改动；入库前强制执行冗余排查与冲突扫描；
  2. **需求版本强递增与依据最新版本执行**：需求变动必须递增 SemVer 版本；所有执行工序必须以最新版本需求文档为唯一基准；
  3. **需求映射测试用例与全绿门禁**：测试用例 100% 映射需求验收项，必须真实测试通过（Exit Code 0）方可交付；
  4. **知识库法定基线绝对权威**：知识库（`knowledge/`）为系统全域最高法定基线，需求表述与之冲突时，强制以知识库基线纠偏需求；
  5. **存量工程全域批量规范化**：交付跨工程批量治理脚本 `scripts/normalize_all_projects.mjs`，全量清洗、补齐并规范化所有存量 DSH 工程文件夹；
  6. **文末固定五联装视觉强化交付契约**：文末固定收尾升级为五要素（状态、产物/结论、地址、重要说明、执行效果），大号加粗标头与图标强化视觉呈现。
- **关联文件**：
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `AGENTS.md`
  - `scripts/normalize_all_projects.mjs`
  - `docs/requirements.md`
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 系统元规则新增第三十五条，升级第三十四条为五联装视觉强化契约；
  - [x] 全域存量工程脚本实跑完成，5 个工程 100% 规范化；
  - [x] 全局需求台账与管控台账同步跃迁至 v4.21.0；
  - [x] 双检扫描（冗余、冲突、存量校准）100% 绿灯通过。

### REQ-080: S07 待办常显物理化治理（任务列表硬约束 · 原子证据层 · 物理锁一跳解锁）
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.22.0`
- **提出时间**：2026-09-28
- **最新更新**：2026-09-28
- **核心诉求与交付物**：
  1. **根因治理**：「任务必须常显在输入框上方」此前只是 `task_execution_flow.md` 防线 3 里的一句话——拦截层只看 `status.json` 与物理锁，从不看待办证据，无一脚本可判定，属于"无客观判定即无约束"；
  2. **原子证据层**：新增 `scripts/lib/todo_tracker.mjs`，每次 `todo_write` 落盘一条带时间戳的证据（含 total / completed / inProgress / percent），任何一方都能在不采信自述的前提下判定；
  3. **可判定入口**：新增 `scripts/todo_gate.sh`（`status` / `check` / `json` / `record` / `selftest`），退出码即判定，三态自检（无证据 / 假收尾 / 合规）全绿；
  4. **运行时硬门禁**：拦截层对改动型调用（write / edit / bash / pwsh / render_ui / present）前置判定——无任务列表或列表无 `in_progress` 项一律拒绝，并给出自救动作；逃生开关 `DSH_CONTROL_TODO=off`；
  5. **物理锁一跳解锁**：修复"todo_write 只放行、却没有任何代码把它推到 LOCK-2 → write/edit 永久阻断"的历史死锁，新增 `advanceLockTo` 逐阶带凭据晋升；`physical_lock.sh sync` 按磁盘实况（门禁全绿 + 待办证据）自动对齐锁阶。
- **关联文件**：`scripts/lib/todo_tracker.mjs`、`scripts/lib/todo_gate_cli.mjs`、`scripts/todo_gate.sh`、`scripts/lib/physical_lock.mjs`、`scripts/physical_lock.sh`、`ai-control/plugin/index.mjs`、`ai-control/plugin/selftest.mjs`
- **验收标准**：
  - [x] `./scripts/todo_gate.sh selftest` 三态自检 3/3 通过；
  - [x] 拦截层自检 `node ai-control/plugin/selftest.mjs` 69/69 全绿（含 7 条 S07 专项用例）；
  - [x] 宿主实测：无待办证据时 `bash` 调用被真实拒绝，`todo_write` 后证据落盘、`todo_gate.sh check` 退出码 0；
  - [x] `./scripts/physical_lock.sh sync` 依据磁盘实况逐阶晋升至 LOCK-2 并留痕凭据。

---

### REQ-081: 输出精简客观度量（体量 + 文末五联装结构 · 审计第 8 维）
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.22.0`
- **提出时间**：2026-09-28
- **最新更新**：2026-09-28
- **核心诉求与交付物**：
  1. **根因治理**：`meta_rules.md` 第二十五条等处的"极简高信噪比"此前**没有任何判定手段**——门禁只数文件，审计六维全是过程合规，没有一维回答"这次回复啰不啰嗦"；
  2. **客观度量**：新增 `scripts/lib/output_compactness.mjs`，把"废话多不多"降为两个可测数字：正文字符数/行数（代码块与表格行不计入，避免把交付物误判成废话）与文末五联装标头齐备度；
  3. **零成本采集**：拦截层订阅 `session/event` 的 `assistant/message`，逐条落盘到 `$DSH_HOME/.dsh-control/compact/<会话ID>.json`，不额外增加模型往返；
  4. **审计第 8 维**：`audit_execution.sh` 新增"输出精简"8 分；未采集或未达标一律扣分——把缺失记为通过等于给机制开永久免检口。
- **关联文件**：`scripts/lib/output_compactness.mjs`、`ai-control/plugin/index.mjs`、`scripts/audit_execution.sh`
- **验收标准**：
  - [x] 度量模块可独立运行（纯函数，无副作用）；
  - [x] 审计脚本实跑输出 8 个维度、总分 100；
  - [x] 度量报告在真实回复后落盘可读，且缺失时被明确判为扣分而非默认通过。

---

### REQ-082: 管控拦截层宿主注册根因治理（规则与物理运行时断层清零）
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.22.0`
- **提出时间**：2026-09-28
- **最新更新**：2026-09-28
- **核心诉求与交付物**：
  1. **实测根因**：`profiles/web/cordis.patch.yml` 中从来没有 AI 执行流程管控的注册条目，`plugin-status.txt` 的 `isHost=false`（最后一次激活来自自检脚本）——"待办常显 / 硬门禁 / 常显看板 / 自动命名"在物理运行时**全部不存在**：规则在，机制不在，这正是"硬要求却没有实现"的直接答案；
  2. **注册动作**：写入 `file://…/ai-control/plugin/loader.mjs` 条目（走 loader 以保留"加载失败降级为空插件"的故障安全），并配套新增幂等脚本 `scripts/install_host_gate.sh`（`verify` / `install` / `uninstall`）；
  3. **可验证**：`verify` 以"条目在位 + 加载器存在 + `isHost=true`"三重证据判定，未激活一律退出码 1，**不把"我写了配置"谎称为"机制在运行"**；
  4. **抗覆盖**：桌面端插件管理器重写 profile 配置后，重跑 `install` 即可恢复（幂等、自动备份）。
- **关联文件**：`scripts/install_host_gate.sh`、`ai-control/plugin/loader.mjs`、`ai-control/plugin/index.mjs`、`profiles/web/cordis.patch.yml`（宿主侧，不入本仓版本控制）
- **验收标准**：
  - [x] `./scripts/install_host_gate.sh verify` 退出码 0，且 `plugin-status.txt` 显示 `isHost=true`；
  - [x] 常显看板在真实会话中每步刷新（系统提示中的"🎛️ 管控看板"）；
  - [x] 宿主实测硬门禁真实拒绝（bash 被 S07 拒止），证明拦截层已在运行时生效。

#### REQ-082 本轮连带修复的存量缺陷（不新增条目编号，属根因治理的组成部分）

本轮实测暴露并当场修掉两个**真实**缺陷，均为"机制自身在特定条件下失效"这一类，故并入本条而非另开新规：

1. **自检污染宿主激活凭据**：`ai-control/plugin/selftest.mjs` 用默认 `stateDir` 调 `apply`，
   把宿主真实激活记录覆盖成 `isHost=false`，导致 `install_host_gate.sh verify` 在机制活着时误报"未激活"。
   修复：① 插件新增**追加式**激活台账 `host-activation.log`（只记 `isHost=true`，测试进程覆盖不掉）；
   ② 自检全部 `apply` 调用改写入临时沙箱 `stateDir`；③ `verify` 双源判据（台账优先、状态文件兜底）。
   实证：连续两次自检后 `plugin-status.txt` 时间戳不变（1790555778 → 1790555778），且 `verify` 退出码 0。
2. **提交入口自锁**：G3 要求"未提交变更不得超阈值"，而唯一的提交动作 `scripts/git_sync_remote.sh`
   不在拦截层逃生舱白名单内 → 提交需先过门禁、过门禁需先提交，实测死锁（68 个待提交文件）。
   修复：将 `scripts/git_sync_remote.sh` 列入 `escapeScriptPrefixes`，并在代码中写明这与 2026-09-23
   那次"门禁要求改名而改名被拦"属同一类自锁，避免同类缺陷第三次复发。

---

### REQ-083: 任务列表可视化补强（完成即打钩 · 逐条进度条 · 面板可见性）
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.23.0`
- **提出时间**：2026-09-28
- **最新更新**：2026-09-28
- **核心诉求与交付物**：
  1. **完成即钩上**：任务列表每一行按状态显示勾号与颜色（完成 ✓ / 进行中 ◐），做好一项立刻可见；
  2. **逐条进度条**：每行带独立进度条（0%/50%/100%）与状态文字，另有首栏总体进度条与百分比，随时知道"当前这条"和"整体"的进度；
  3. **根因治理**：补丁脚本 `scripts/patch_dsh_todo_progress.cjs` 原先写死旧运行时路径
     （`Resources/runtime/harness/…`）与 CSS 哈希锚点（`const css$9`、`.lXshSW_`），
     App 升级后**锚点全部落空却只表现为"少打一半、不报错"**，补丁长期处于未生效状态；
  4. **抗失效改造**：运行时路径改为多候选探测；CSS 前缀从 **TodoPanel 自己的模块块**动态解析
     （不再取全文第一个 `"root"` 映射，避免命中别的组件）；体检判据改为版本无关；
     工具名中文化如实标注为"i18n 已接管（无需补丁）"而非继续报假故障。
- **关联文件**：`scripts/patch_dsh_todo_progress.cjs`
- **验收标准**：
  - [x] `node scripts/patch_dsh_todo_progress.cjs --check` 五项回读校验全 ✅（退出码 0）；
  - [x] 补丁后产物 `node --check` 语法通过；
  - [x] DOM 注入 4 处（总进度条 / 每行进度 / itemStateText / itemPercent）与 CSS 打钩样式均实测在位。

---

### REQ-084: 技能池归位与技能面板复活（178 技能找回 + CLI 路径治理）
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.23.0`
- **提出时间**：2026-09-28
- **最新更新**：2026-09-28
- **核心诉求与交付物**：
  1. **实测根因**：技能池合并落点为 `skill-pool/skills/`，而 DSH 技能面板只扫描
     `<项目根>/skills`（源码依据：`@michengai/dsh-skills-manager` 的 `PROJECT_SOURCES`），
     因此"磁盘上 178 个技能、面板里 0 个"——内容没丢，但**没有加载器能看见它**；
  2. **归位执行**：`scripts/restore_skill_pool.mjs` 以**逐文件字节比对**为前置条件完成归位，
     不一致则拒绝清理源目录；归位后源副本移除（git 历史保留，可回退）；
  3. **CLI 治理**：`skill-pool/bin/skill-pool` 的 6 处技能路径全部改为 `resolve_skills_dir()`
     （环境变量 → 项目根 skills → 本地 skills），修复"技能总数: 0"与 catalog not found；
  4. **面板复活实证**：会话可用技能目录已实际出现技能池条目（`acquire-atomic-lock`、
     `dsh-butler`、`process-supervisor`、`plugin-control-guard` 等）。
- **关联文件**：`scripts/restore_skill_pool.mjs`、`skills/`（178 目录）、`skills/README.md`、`skill-pool/bin/skill-pool`
- **验收标准**：
  - [x] `node scripts/restore_skill_pool.mjs --check` 退出码 0（源已清空、目标 177 技能、索引已收录）；
  - [x] `./skill-pool/bin/skill-pool validate` 全部技能通过规范校验；
  - [x] `./skill-pool/bin/skill-pool status` 技能总数 177、规范合规 177、异常 0；
  - [x] 技能面板实际展示技能池技能（会话技能目录已变更，可复核）。

---

### REQ-085: 执行层全量入索引层与覆盖率硬判定
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.23.0`
- **提出时间**：2026-09-28
- **最新更新**：2026-09-28
- **核心诉求与交付物**：
  1. **根因**：执行层（技能/agent/插件/CLI）已有实物，但 `indexes/` 全库**一处未提** skill-pool，
     索引层与实际执行层脱钩；靠手工抄表必然再次脱钩；
  2. **生成式同步**：`scripts/build_capabilities_index.mjs` 扫描执行层并在
     `indexes/capabilities_index.md` 受管区间（`<!-- SKILL-POOL-INDEX:BEGIN/END -->`）**重写**索引表，
     同时登记 11 条执行层资产指针（CLI 入口、catalog、执行层树、实例安全表、流程规约等）；
  3. **硬判定**：`--check` 以"未收录数 = 0"判定覆盖率，退出码 0/1，可接入门禁与审计；
  4. **口径统一**：`_template` 明确排除（脚手架非技能），索引口径 177 与 CLI 口径 177 逐名一致。
- **关联文件**：`scripts/build_capabilities_index.mjs`、`indexes/capabilities_index.md`、`skills/.skill-pool-manifest.json`
- **验收标准**：
  - [x] `node scripts/build_capabilities_index.mjs --check` 退出码 0（179 条执行层 100% 收录）；
  - [x] `--apply` 可重复执行且幂等（受管区间外内容零改动）；
  - [x] 索引口径与 CLI 口径逐名比对无差异（脚本实测）。

---

### REQ-086: 物理触达审计与"无载体机制"清零
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.23.0`
- **提出时间**：2026-09-28
- **最新更新**：2026-09-28
- **核心诉求与交付物**：
  1. **把"有没有物理触达"变成可判定问题**：逐条核对规则中宣称"必须/强制"的机制，
     给出「载体 + 实测命令 + 实测结果」三件套，无载体即判"未物理触达"；
  2. **禁止虚无缥缈**：任何写进规则的"必须"必须能回答"谁来执行、怎么判定、判定不过会怎样"；
  3. **交付补课清单**：对未触达项给出可执行命令级整改项，纳入后续迭代。
- **关联文件**：`rules/system/meta_rules.md`（第三十六条 硬约束物理化律）、`ai-control/`
- **验收标准**：
  - [ ] 产出触达矩阵（机制 / 宣称出处 / 载体 / 实测命令 / 结果 / 判定）；
  - [ ] 未触达项全部给出可执行整改命令；
  - [ ] 无法当场整改的项在台账中显式标注为待办，不以"已优化"含糊带过。

---

### REQ-087: 物理触达改造（细分到底 · 自证进度 · 流程管控层）
- **当前状态**：`[EVOLVING]` 演进中（**仅登记需求文案，尚未实施，未改任何机制载体**）
- **实施版本**：`未实施`（文案见 [`docs/constraint_mechanism_optimize_5.md`](constraint_mechanism_optimize_5.md)，任务代号 `GCM-PHY`）
- **提出时间**：2026-09-29
- **最新更新**：2026-09-29
- **核心诉求与交付物**：
  1. **空架子清零（R1 / R1b）**：逐条机制核「载体 + 判定命令 + 退出码」，把宣称"必须/强制"的规则全部物理化；
     颗粒度大到单个执行层资产（agent / api / skill / cli / mcp / 插件）无法直触物理层的，
     **按「叶子测试 L1~L4」递归裂分**（单入口 / 单职责 / 可判定 / 可直调），直至每个叶子层可被一条命令直接调起并判真假；
     裂分产物登记进 `skill-pool/docs/operations/execution-layers.json` 并 100% 入 `indexes/capabilities_index.md`；
  2. **迭代检测（R2）**：新增 `scripts/progress_ledger.mjs`，每次改动追加机器可读记录
     （文件 sha256 + 判定命令 + 实跑退出码 + 时间/任务名）；`--report` 一屏答完"做了什么 / 做到哪一步 / 还差什么"；
     `--check` 以"漂移 = 0、无记录改动 = 0"判定，**只认磁盘哈希与退出码，不认自我宣称**；
  3. **流程管控层（R3）**：新增规则章节（唯一权威源）+ `scripts/flow_control.mjs`（`--plan/--check/--diff/--graph`），
     按依赖拓扑排序 + 关键路径把现有流程排在执行效率最高处；每次机制更新后重算顺序并出一致性校验；
     重排受**不变式 I1~I5** 约束（物理锁单向递增 · G0→G4 累积门禁顺序 · 首动改名第 0 步 · 写后必读回就近 · 双检先于推送），
     **可重排、不可跳步**。
- **关联文件**：`docs/constraint_mechanism_optimize_5.md`（本需求文案）· `rules/workflow/task_execution_flow.md`（R3 权威源，待新增章节）·
  `scripts/mechanism_audit.mjs`（R1 判定）· `scripts/progress_ledger.mjs`（R2 新建）· `scripts/flow_control.mjs`（R3 新建）·
  `skill-pool/docs/operations/execution-layers.json`（裂分登记）
- **本轮实测依据（可复跑）**：
  - `node scripts/mechanism_audit.mjs` → 登记 13 条 · 已触达 7 · 硬性未触达 3 · 无载体 3；
  - `./scripts/install_host_gate.sh verify` → profile 条目缺失 + 载体语法通过 + 无 `isHost=true` 凭据（exit 1）；
  - `./scripts/control_gates.sh check` → 4/4（骨架 11/11 · 防丢 11/11 · 合规 5/5 · 条目 87 · 高相似对 0），
    但 stderr 报 `~/.dsh/.dsh-control/status.json.tmp / cache.env: Operation not permitted`（状态快照落盘物理不通，见文案 §3.4）；
  - `./scripts/physical_lock.sh status` → 锁阶 `[0] LOCK-0`，已签署凭据 0 条；
  - **S07 待办常显"永远判不过"的根因（本轮穿透取证）**：证据路径 `$DSH_HOME/.dsh-control/todos/<会话ID>.json`，
    全库 grep 确认运行时**唯一写入者是 `ai-control/plugin/index.mjs:965`**（即那条未被宿主加载的拦截层插件）——
    插件不跑 → 无人写证据 → 判定器永远 `NO_TODO` 阻断；磁盘上仅有 1 个旧会话证据文件，
    **挂载 `todo_write` 后复跑 `mechanism_audit` 仍判 exit=1**，证明不是探针顺序问题（见文案 §3.3）；
  - `./scripts/audit_execution.sh` → 补 `node` 进 PATH 后 80/100（扣 12 分待办常显 = 上述同根因；扣 8 分输出度量未采集）。
- **验收标准**：
  - [ ] `node scripts/mechanism_audit.mjs --exit` 硬性未触达 = 0（exit 0）；
  - [ ] `node scripts/build_capabilities_index.mjs --check` 叶子层未收录 = 0；
  - [ ] `node scripts/progress_ledger.mjs --check` 漂移 = 0 且无记录改动 = 0；
  - [ ] `node scripts/flow_control.mjs --check` 跳步 / 乱序 = 0；顺序变更经 `change_flow.md` 并由用户确认后留痕；
  - [ ] `./scripts/install_host_gate.sh verify` exit 0（`isHost=true`，拦截层真的在跑；需重启桌面端）；
  - [ ] 无法挂载物理载体的（如宿主无 agent 注册面）显式标 `BLOCKED` 并写明缺失的宿主扩展面，不以"已优化"盖过；
  - [ ] 台账登记 + 双检全绿 + 提交推送。

---

### REQ-088: V4 缺陷系统修复 —— "检测器退出码 0 + 空输出即算通过"清零
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.24.0`
- **提出时间**：2026-10-01
- **最新更新**：2026-10-01
- **缺陷出处**：[`docs/constraint_mechanism_optimize_3.md`](constraint_mechanism_optimize_3.md) §3.2 表内编号 **V4**
  （原文：「检测器『退出码 0 + 空输出』即算通过」——`control_gates.sh` 兜底为 0）。该条自登记起**长期未处置**，
  本次不做"改一行了事"，而是把**整类**"无证据却显示健康"的路径一次性清零。
- **核心诉求与交付物**：
  1. **单点根因**：`check_redundancy` 里 `dup_pairs=${dup_pairs:-0}` 把"没解析到值"折算成
     `0 个高相似块对` = **通过**。即检测器根本没产出证据时，看板反而是绿的；
  2. **同类归并（不只修一行）**：凡"外部工具 / 外部文件产出指标"处，一律改成
     **退出码决定成败、内容必须解析出合法值才算有证据**，解析不出一律**失败关闭**；
  3. **交叉校验**：外壳自数的文件数 vs 检测器自报的实质块数必须自洽，
     "有文件却自称 0 实质块"判证据自相矛盾（防"输出合法 JSON 但什么都没看"这一最隐蔽形态）；
  4. **故障≠待前序**：证据不可得返回 `rc=2`（⛔ 硬阻断），不得显示成 `⏸️ 待前序`；
  5. **行为级回归锁**：新增 `scripts/gate_selftest.sh`，把桩检测器换成各种"没证据"的形态跑**真门禁**，
     断言不许通过 —— 不用"grep 源码有没有 `:-0`"这种文字级判定做回归。
- **关联文件**：`scripts/control_gates.sh`（被测件）· `scripts/gate_selftest.sh`（新建回归）·
  `docs/constraint_mechanism_optimize_3.md`（缺陷清单）· `rules/workflow/versioning_standard.md`（版本里程碑）
- **本轮实测依据（可复跑）**：
  - **复现（修复前）**：把检测器换成 `process.exit(0)`（零输出）后跑真门禁 →
    `✅ G4 通过 · 0 高相似块对 · 扫描 1 文件/0 实质块`（**检测器没产出任何证据，门禁照样放行**）；
  - **反证（同一修订、修复前后对照同一套用例）**：
    `DSH_GATE_UNDER_TEST=<修复前版本> ./scripts/gate_selftest.sh` → **6/9 失败**（T1/T2/T3/T4/T7/T9 全部错判为通过），
    其中 T5/T6/T8 三条"反向验证"用例在两版下都通过 —— 证明这套用例是**判别性**的，不是凑数的绿勾；
  - **修复后**：`./scripts/gate_selftest.sh` → **9/9 通过**；
  - **真实工程未误伤**：`./scripts/control_gates.sh check` → 仍 `4/4`、退出码 0。
  - **连带发现（非本缺陷本体，已一并清零）**：跑 `./scripts/install_host_gate.sh verify` 时崩溃
    `line 99: PROFILE_DIR<乱码>: unbound variable` —— `$VAR` 后紧跟中文全角括号时，
    非 UTF-8 locale 下 bash 把多字节首字节并入变量名。全库探针扫出 **4 处同类**并全部改为 `${VAR}`
    （`install_host_gate.sh`×2 · `verify_guard_live.sh` · `deepseek_key_setup.sh`），复扫 0 处；
    已登记 [`memory/error_ledger.md`](../memory/error_ledger.md) **ERR-006** 并附可复跑探针命令。
  - **第二处连带发现（同族"假绿"，已清零）**：`node scripts/conflict_scan.mjs --self-test` 长期
    **红着**却无人复跑 —— 真实用例报「真实元规则标题自洽（自称 35 / 实际 36）」失败。
    根因：`rules/system/meta_rules.md` 标题写「全局元规则三十五条」，而实际列出 **36 条**
    （第三十六条于 `9949df4` / v4.22.0 加入时未同步改标题）；同时 C2 的 `checkCount` 有
    「容许差 1」规则，于是**主扫描报"未发现冲突"、自检却红** —— 同一事实两套结论。
    处置：以磁盘实际条目为准，标题改为「三十六条」（**不动**差 1 容忍规则，它服务于导语行偏移，
    且正是这条自检把问题抓出来的）。复跑：自检 **26/26 全过**、主扫描 0 冲突。
- **验收标准**：
  - [x] `check_redundancy` 解析不出 `duplicatePairs` / `blocksScanned` → `rc=2`（不再默认 0）；
  - [x] 检测器自报 0 实质块而外壳扫到文件 → `rc=2`（证据自相矛盾）；
  - [x] `check_sync` 以 `git status --porcelain` 的**退出码**判定"计数是否有效"，git 不可用 → `rc=2`；
  - [x] `load_from_status` 校验快照必需字段与门禁条目数，半截快照一律回退重算；
  - [x] 新增 `scripts/gate_selftest.sh`：9 用例全过，且**在修复前版本上必须失败**（已实测 6/9 挂）；
  - [x] 双检（冗余/冲突/存量校准）零新增待对齐项；

---

### REQ-089: 执行层编排化改造（GCM-ORCH）—— 呈现简化 / 图片缩放 / 索引 / 接口 / 路由
> ### 🏷️ **资产元数据与生命周期标记**
> - **文档类型 (Doc Type)**: `[REQUIREMENT 业务需求台账]`
> - **清理定位 (Retention)**: `[PERSISTENT 长期受管]`
> - **生成会话**: `[优规001][60分] 管控机制流程讲解`
> - **到期/清理条件**: `[随版本演进]`

- **当前状态**：`[EVOLVING]` 演进中（**需求文案待用户拍板，尚未实施**）
- **实施版本**：`v4.25.0`（规划目标；未实施前不得声称已生效）
- **提出时间**：2026-10-01
- **最新更新**：2026-10-01
- **责任归属**：用户（提出与裁决） / AI 智能体（翻译、分裂与实施）
- **需求文案**：[`docs/constraint_mechanism_optimize_6.md`](constraint_mechanism_optimize_6.md)（唯一权威出处，本条目只放指针不复述细则）

#### 1. 提出背景与痛点
用户提出 5 条优化诉求（输出精简、图片缩放、索引层、执行层接口、路由层），
且明确要求"颗粒度过大就递归分裂到触达物理实现层"。本轮实测发现：**这 5 条里有 3 条并非"没有"，
而是"有纸面、没物理"**——索引层已有 232 条静态清单但无机读产物、路由层只有 3 个硬编码分支、
接口层 179 个技能只有 4 个 frontmatter 键；另有一条（图片缩放）物理落点已实测定位到
`dsh-client-ui-primitives` 的 `ImageLightbox`（有灯箱、无缩放控件）。

#### 2. 核心诉求与目标
1. **呈现侧（UX-SIMP）**：输出按《Don't Make Me Think》与格式塔心理学收敛到最小阅读成本；
   书目来源入知识库；输出体量判定从"只有未通电插件会写"改为可独立判定；
2. **编排侧（ORCH）**：232 个执行层从"名字清单"升级为「机读索引 + 接口契约 + 路由择优调配」；
3. **递归分裂铁律**：任何子需求若 6 条物理触达判据（§2.3）不全满足，继续分裂，不得登记为完成。

#### 3. 关联文件与影响范围
- **需求文案**：[`docs/constraint_mechanism_optimize_6.md`](constraint_mechanism_optimize_6.md)（本条目唯一细则出处）；
- **新建（规划）**：`knowledge/sources/` · `scripts/output_audit.mjs` · `scripts/check_layer_interfaces.mjs` ·
  `scripts/route_plan.mjs` · `indexes/capabilities_index.json` · `assets/viewers/image_viewer.html` ·
  `skill-pool/plugins/dsh-plugin-image-zoom/`；
- **改动（规划）**：`scripts/build_capabilities_index.mjs` · `indexes/capabilities_index.md` ·
  `scripts/route_navigate.mjs` 与 `indexes/navigation_router.md`（路由侧）· `scripts/audit_execution.sh`（第 8 维接线）·
  `knowledge/common/interaction_specification.md`（口径统一）· `skills/README.md`（接口文件约定，与 R4-d 冲突裁决绑定）。

#### 4. 验收标准
- [ ] 5 条子需求各自的判定命令可跑出退出码，且**名字覆盖率与接口覆盖率分开报**；
- [ ] 递归分裂的 18 个叶子逐一按 6 条物理触达判据过检，未触达者显式列为未完成；
- [ ] 4 项待裁决分歧（D1 格式塔书目出处 / D2 缩放落点 / D3 授权改宿主 / D4 失效补丁处置）经用户裁决后写入文案；
- [ ] 全量复跑 `control_gates.sh` · `gate_selftest.sh` · `mechanism_audit` · `process_supervisor` · `progress_ledger` 全绿。

#### 5. 历史演进与变更记录
- **2026-10-01 [新建]**：接收 5 条口语需求，产出需求文案并把 5 条递归分裂为 18 个执行层叶子；
  完成现状核查（可复用 7 项 / 实测缺口 11 项 / 本轮新发现 3 项）；登记 4 项待裁决分歧。
  本轮**未改任何机制载体**，状态为 `[EVOLVING]` 待拍板。

---

### REQ-090: 输出契约与反馈层强化（GCM-OUT）—— 缩进抬头 / 反馈层 / 一句话总结 / 通俗化 / 双档输出 / 一键重启
> ### 🏷️ **资产元数据与生命周期标记**
> - **文档类型 (Doc Type)**: `[REQUIREMENT 业务需求台账]`
> - **清理定位 (Retention)**: `[PERSISTENT 长期受管]`
> - **生成会话**: `[优规090][88] 输出反馈与重启`
> - **到期/清理条件**: `[随版本演进]`

- **当前状态**：`[EVOLVING]` **已实施第一批**（R1~R5 落地并自检通过；R6 插件已建成、打桩自检 84/84，
  并**已装配进 `~/.dsh/profiles/desktop`**；**尚未重启激活、尚未真机 PID 验证**）
- **实施版本**：`v4.26.0`（**已落盘生效**：全库受管文档头部已由 `align_version.mjs` 归位至 `v4.26.0`，
  并同时清偿 REQ-089 声明的 `v4.25.0` 欠账；跳号原因已在台账头部显式留痕）
- **提出时间**：2026-10-01
- **最新更新**：2026-10-01
- **责任归属**：用户（提出与裁决） / AI 智能体（翻译、分裂与实施）
- **需求文案**：[`docs/constraint_mechanism_optimize_7.md`](constraint_mechanism_optimize_7.md)（唯一权威出处，本条目只放指针不复述细则）

#### 1. 提出背景与痛点
用户提出 6 条输出与机制优化诉求（输出结构、反馈层、一句话总结、通俗化、双档输出、一键重启）。
本轮**查重拦截**实测发现：这 6 条里有 **5 条并非"没有"**，而是"有纸面、没物理"或"散在多处、无唯一源"——
无生僻字早在 [`rules/system/language_standard.md`](../rules/system/language_standard.md) 有明文却**零判定器**；
首行状态徽标与文末五联装已定义，却散在 `AGENTS.md` 与元规则**至少 5 处**、且判定器不查首行；
反馈层的数据源 `progress_ledger report` 已存在却**没有一条规则要求它出现在每轮输出里**；
双档输出与既有「技术细节绝对静默」规约**正面冲突**，须先裁决；
而「一句话总结」与「重启按钮」是**全库 0 命中**的真空白。**仅诉求 6（宿主可视化操控）需要新立机制载体。**

#### 2. 核心诉求与目标
1. **结构侧（GCM-OUT）**：建立输出结构唯一权威源，把首行图标、标题层级不跳级、缩进 ≤3 级转成**可判定硬判据**；
2. **反馈侧（FEEDBACK）**：每轮输出给"进度回执"四字段，且数字**只从台账实跑取，禁止手写**；
3. **档位侧（DUAL-LANE）**：默认浅白档、专业档须显式开关，并把旧规约冲突裁决清零；
4. **载体侧（UX-RESTART）**：新增**双半插件**按钮，点击后宿主**真实重启**（判定只认 PID 变化）。
   本轮已实测：生产包内**无任何可被页面调用的官方重启入口**（`app.relaunch()` 仅出现在致命错误恢复对话框与开发期菜单），
   故主推"宿主半注册命令 + 客户端半注入按钮 + 分离进程 `osascript` 退出并 `open -a`"链路（细则见文案 §3.4）；
5. **归并铁律（元规则第二条）**：诉求 1~5 一律**归并进既有权威源增量演进**，不新建第二套同义规则；只有诉求 6 新立机制；
6. **递归分裂铁律**：任何子需求若 6 条物理触达判据（文案 §2.3）不全满足，继续分裂，不得登记为完成。

#### 3. 关联文件与影响范围
- **需求文案**：[`docs/constraint_mechanism_optimize_7.md`](constraint_mechanism_optimize_7.md)（本条目唯一细则出处）；
- **新建（规划）**：`rules/system/output_standard.md` · `scripts/language_audit.mjs` · `scripts/lib/feedback_card.mjs` ·
  `data/common_chars.txt` · `skill-pool/plugins/dsh-plugin-restart/`；
- **改动（规划）**：`scripts/output_audit.mjs`（首行图标 / 层级 / 缩进 / 一句话总结 / 双档 / 回执六类判定）·
  `scripts/audit_execution.sh`（八维 → 九维）· `scripts/mechanism_audit.mjs`（新机制登记）·
  `AGENTS.md` §五 与 `rules/system/meta_rules.md` 第 22/29/34 条（改为指针，消除重复契约）·
  `scripts/progress_ledger.mjs`（`--report` 接入收尾强制与审计新维）·
  冲突规约 `skills/plain-analogy-explanation` 与 `skills/concise-chinese-bold-guard`（按裁决处置）。

#### 4. 验收标准
- [ ] 6 条子需求各自的判定命令可跑出退出码，且每条都带**反向用例**（检测器恒绿一律判未触达）；
- [ ] 递归分裂的叶子逐一按 6 条物理触达判据过检，未触达者显式列为未完成；
- [ ] R6 以"重启前后宿主 PID 变化"为唯一合格证据；做不到时按降级方案**显式标注未满足**，不得含糊成"已优化"；
- [ ] 诉求 1~5 的**规则只落在唯一权威源**，复扫无第二处同义定义（`redundancy_scan` / `conflict_scan` 为 0）；
- [ ] 6 项待裁决分歧经用户裁决后写入文案；
- [ ] 全量复跑 `control_gates.sh` · `gate_selftest.sh` · `mechanism_audit` · `process_supervisor` · `progress_ledger` 全绿。

#### 5. 历史演进与变更记录
- **2026-10-01 [新建]**：接收 6 条口语需求，完成字面勘误（"锁进→缩进""首航图标→首行图标"）、
  **查重拦截**（结论：1~5 归并既有权威源，仅 6 新立）与递归分裂（R1~R6，共 23 个叶子）；
  完成现状核查（可复用 16 项 / 实测缺口 9 项 / 本轮新发现 4 项）；
  完成 R6 专项可行性取证（`app.asar` 只读解析 → 生产包无官方重启入口，主推 A1 链路，登记 6 项待实测）；
  登记 6 项待裁决分歧。本轮**未改任何机制载体**，状态为 `[EVOLVING]` 待拍板。
- **2026-10-01 [实施 · 第一批]**：用户下令「实施」后开工，**按 D1~D6 各条的默认建议执行**（未逐条裁决，
  已在文案 §8.1 显式留痕，便于随时反悔）。落地：
  ① 新建 `rules/system/output_standard.md`（输出结构唯一权威源），`AGENTS.md` §五 与元规则第 22/29/34 条改为指针；
  ② `scripts/output_audit.mjs` 新增 `structureChecks()`（首行徽标 / 一句话总结 / 标题不跳级 / 缩进 ≤3 / 进度回执 / 档位标记），自检 16/16；
  ③ 新建 `scripts/lib/gates_config.mjs` + `gates.conf` 的 `OUT_*`/`LANG_*` 段，阈值从代码里搬到外置配置；
  ④ 新建 `scripts/gen_common_chars.mjs` + `data/common_chars.txt`（GB2312 基本集 6763 字，**推导生成非人工罗列**）
     + `data/common_chars_allowlist.txt` + `scripts/language_audit.mjs`，自检 13/13 与 11/11，**全库扫描 0 命中**；
  ⑤ `scripts/audit_execution.sh` 八维 → 九维（第 8 维 8→4 分，新增第 9 维文字可读性 4 分，总分保持 100）；
  ⑥ 新建 `skill-pool/plugins/dsh-plugin-restart/` 双半插件（宿主半注册 `/restart-dsh confirm`，客户端半注入头部动作条按钮），
     打桩自检 **84/84**，含**反向变异**（改坏确认口令后行为断言确实失败）；
  ⑦ `scripts/mechanism_audit.mjs` 新增 4 条登记（R1/R2/R4 已触达，R6 按 `strict:false` 登记）。
  **未完成且不得当作已完成**：R6 真机 PID 验证、R5 术语密度升硬门、D5 旧技能冲突裁决、
  回执数字与台账的真实对拍（详见文案 §8.2）。
- **2026-10-01 [实施 · 第一批续]**：R6 插件**装配进 `~/.dsh/profiles/desktop`**（回执 `status: installed`、
  `restart_required: true`；`dependencies` 已登记 `file:` 依赖、`bundles` 追加为 8 项；
  备份 `package.json.bak-20261001-124813` 与 `cordis.patch.yml.bak-20261001-124813` 均在位，回滚命令已输出）。
  同时登记两条快速通道：「专业档输出」（指向 `rules/system/output_standard.md` §三）与
  「一键重启」（指向插件打桩自检），`channel_audit --root .` 实测 **36 条 · 问题 0**。
  **仍缺的一步**：重启宿主激活 → 点按钮 → 比对 PID。**执行者不自行重启**（会中断当前会话），此举只能由人做。

---

### REQ-091: 常显与自证层强化（GCM-LIVE）—— 重启常显真执行 / API 知识库 / 峰谷常显 / 全域指纹 / 原子锁
> ### 🏷️ **资产元数据与生命周期标记**
> - **文档类型 (Doc Type)**: `[REQUIREMENT 业务需求台账]`
> - **清理定位 (Retention)**: `[PERSISTENT 长期受管]`
> - **生成会话**: `[新需001][70分] 管控六项优化`
> - **到期/清理条件**: `[随版本演进]`

- **当前状态**：`[EVOLVING]` **已实施第一批**（R1/R2/R4/R5/R6 落地并自检通过；
  R3 由并行子任务交付；**R1 的"所有页面常显"仍待人工 DOM 取证**，宿主进程早于本次改动启动）
- **实施版本**：`v4.27.0`（规划目标；**全量端到端验收（含重启后 PID 比对）完成前不递增总版本**）
- **提出时间**：2026-10-01
- **最新更新**：2026-10-01
- **责任归属**：用户（提出与裁决） / AI 智能体（翻译、分裂与实施）
- **需求文案**：[`docs/constraint_mechanism_optimize_8.md`](constraint_mechanism_optimize_8.md)（唯一权威出处，本条目只放指针不复述细则）

#### 1. 提出背景与痛点
用户提出 6 条优化诉求（重启按钮全域常显、点击真重启、API 文档知识库、峰谷时段常显实时、全域指纹、原子锁）。
本轮**查重拦截**实测结论：这 6 条里有 **4 条属"有原语、没接入"**，不是从零新建——
① 重启插件已建成且自检 84/84，但只挂会话页，且**全库无 PID 判定器**（"重启成功没有"物理上不可判）；
② 峰谷时段探针与底栏插件都在，但前者未上全域常显面、后者**在客户端重算时段**（双实现漂移）；
③ 指纹审计脚本已产出 234 个受管资产报表，但**无机读产物、无查询入口**，且 167 个资产未声明版本；
④ 原子锁原语（`mkdir` 目录锁 + 技能池 `atomic_lock.py`）齐备，但**没有任何自动化脚本调用**。
同族症状本轮再次实测到：管控拦截层插件 `isHost=false`（`install_host_gate.sh verify` 报"条目缺失 + 无激活凭据"），
而 `control_gates.sh check` 仍显示 4/4 · 100%——**看板只证明工程内文件对不对，证明不了机制在不在跑**。
唯一真空白是 **API 文档知识库**（全库仅 3 处命中，且只监控定价页指纹、不落正文）。

#### 2. 核心诉求与目标
1. **常显侧（UX-RESTART-2）**：重启按钮从会话页席位扩到**全域常显席位**（`sidebar.footer.action`，root scope），
   并以 **PID 变化**为唯一合格证据打通"点击 → 真重启"全链路；
2. **知识侧（KB-API）**：官方 `https://api-docs.deepseek.com/zh-cn/` 落成本地知识库（页清单 + 正文镜像 + 逐页指纹 + 同步器），
   成为峰谷时段口径的权威出处；
3. **读数侧（PERIOD-LIVE）**：高峰/空闲时段做成全页面常显、可复跑的实时读数，读数与探针输出逐字相等；
4. **自证侧（FINGERPRINT）**：全域受管资产统一发指纹并产出机读索引，支持"一眼查某文件改没改"；
5. **并发侧（ATOMIC-WIRE）**：把已存在但未被调用的锁原语接到真实写路径的 choke point，
   并发压测须同时证明"持锁 0 重叠"与"无锁 >0 重叠"；
6. **递归分裂铁律**：任何子需求若 6 条物理触达判据（文案 §2.3）不全满足，继续分裂，不得登记为完成。

#### 3. 关联文件与影响范围
- **需求文案**：[`docs/constraint_mechanism_optimize_8.md`](constraint_mechanism_optimize_8.md)（本条目唯一细则出处）；
- **新建（规划）**：`knowledge/api/deepseek/` · `scripts/sync_api_docs.mjs` · `indexes/fingerprint_index.json` ·
  `scripts/fingerprint_index.mjs` · `scripts/lib/atomic_lock.mjs` · `scripts/lib/atomic_lock.sh` ·
  `scripts/lib/host_pid.mjs` · `scripts/restart_verify.mjs` · `scripts/atomic_lock_audit.mjs`；
- **改动（规划）**：`skill-pool/plugins/dsh-plugin-restart/`（席位常量 + 双席位挂载 + 自检扩项）·
  `skill-pool/plugins/dsh-plugin-usage-bar/`（时段改读探针输出）· `scripts/fingerprint_audit.sh`（接机读产物）·
  `memory/asset_fingerprint_ledger.md`（降为生成器产物）· `scripts/control_gates.sh` / `progress_ledger.mjs` /
  `deepseek_usage_probe.mjs` / `ai-control/plugin/index.mjs`（写路径加锁）·
  `knowledge/README.md`（新增 api 分层口径）· `ai-control/config/gates.conf`（新鲜度阈值外置）。

#### 4. 验收标准
- [ ] R1~R6 各自的判定命令可跑出退出码，且每条都带**反向用例**（检测器恒绿一律判未触达）；
- [ ] 递归分裂的 27 个叶子逐一按 6 条物理触达判据过检，未触达者显式列为未完成；
- [ ] R2 以"重启前后宿主 PID 变化"为唯一合格证据；做不到时按降级方案**显式标注未满足**，不得含糊成"已修复"；
- [ ] R3 页清单覆盖率 100%、每页 sha256 可复算，抓取失败有显式报错路径（不手写正文）；
- [ ] R4 常显读数与 `deepseek_usage_probe.mjs --json` 逐字相等，读数过期必须显式标注；
- [ ] R5 覆盖受管资产 ≥234 且漂移判定可判红；R6 接入点 100% 命中且压测"持锁 0 / 无锁 >0"；
- [ ] 8 项待裁决分歧（D1~D8）经用户裁决后写入文案；
- [ ] 全量复跑 `control_gates.sh` · `gate_selftest.sh` · `mechanism_audit` · `process_supervisor` ·
  `progress_ledger` · 双检与存量校准全绿，并推送远程。

#### 5. 历史演进与变更记录
- **2026-10-01 [实施 · 第一批]**：落地 R1/R2/R4/R5/R6，逐项证据：
  ① **R5** 新建 `scripts/fingerprint_index.mjs`（自检 14/14）+ `indexes/fingerprint_index.json`（234 条 · `--check` 漂移 0）；
     受管清单归一到索引（修掉"审计 239 vs 索引 235"的口径分叉）；
  ② **R6** 新建 `scripts/lib/atomic_lock.mjs` + `.sh` + `scripts/atomic_lock_audit.mjs`（自检 15/15），
     接入 5 处写路径；压测"持锁段丢失 0 / 无锁段丢失 60+"。**修掉三个真缺陷**：锁键洗净两侧不一致、
     建锁与写元数据的竞态窗口、假击穿式回收；并加 Node/Bash 锁目录对拍与回归锁防复发；
  ③ **R2** 新建 `scripts/lib/host_pid.mjs` + `scripts/restart_verify.mjs`（自检 9/9），
     已记录重启前基准 PID 84747；插件自检 84→**96/96**；
  ④ **R1** 重启按钮扩为双席位（会话头部 + `sidebar.footer.action` 全域常显），
     席位清单唯一真相源在内核 `SLOT_NAMES`；**"所有页面常显"待人工刷新页面后 DOM 取证**；
  ⑤ **R4** 时段徽标上全域常显面（每秒刷新），新建 `scripts/period_parity.mjs`（18 基准点 · 自检 6/6），
     **揪出并修复一处真实错价**：客户端节假日表与探针表矛盾（多 `10-08`、漏中秋 `09-25`~`09-27`）；
  ⑥ 新增 5 份接口契约，CLI 层声明覆盖率回到 **100%**（`check_layer_interfaces --check` 通过）。
- **2026-10-01 [新建]**：接收 6 条口语需求，完成字面勘误（"导执行层→到执行层""这额个→这个"）、
  **查重拦截**（结论：4 条为"有原语没接入"、1 条为"位置不对"、1 条为真空白）与递归分裂（R1~R6，共 27 个叶子）；
  完成现状核查（可复用 9 项 / 实测缺口 9 项 / 本轮新发现 4 项，
  含 `shell.leading` 仅在 macOS 折叠态挂载这一关键落点事实）；登记 8 项待裁决分歧。
  本轮**未改任何机制载体**（仅新增本文案与台账条目），状态为 `[EVOLVING]` 待拍板。

---

### REQ-092: 全域覆盖与版本贯通（GCM-SCOPE）—— 管控脱管清零 / 需求版本号贯通 / 反空架子判定
> ### 🏷️ **资产元数据与生命周期标记**
> - **文档类型 (Doc Type)**: `[REQUIREMENT 业务需求台账]`
> - **清理定位 (Retention)**: `[PERSISTENT 长期受管]`
> - **生成会话**: `[新需001][3] 管控规则全域覆盖`
> - **到期/清理条件**: `[随版本演进]`

- **当前状态**：`[EVOLVING]` **已实施第二批**（第一批：覆盖/版本/反空架子；第二批：拦截层真通电 + 全域写拦截 + 推送闭环；未完成项见 §5）
- **实施版本**：`v4.29.0`（第一批 v4.28.0：三条判定器全绿并接入累积门禁；第二批 v4.29.0：宿主拦截层通电 + 全域写拦截）
- **需求版本**：`v1.1.0`（需求自身的版本；v1.1.0 = 新增「全域写拦截」与「推送闭环」两条验收标准）
- **提出时间**：2026-10-02
- **最新更新**：2026-10-02
- **责任归属**：用户（提出与裁决） / AI 智能体（翻译、分裂与实施）
- **需求文案**：[`docs/constraint_mechanism_optimize_9.md`](constraint_mechanism_optimize_9.md)（唯一权威出处，本条目只放指针不复述细则）

#### 1. 提出背景与痛点
用户提出 3 条优化诉求（新增存量都服从管控 / 输出新增需求版本号并双记 / 全部任务必须触达物理实现层）。
本轮**查重拦截**实测结论：3 条都不是从零新建，而是"机制在、运行时不在跑"的三处同族断点——
① `normalize_all_projects.mjs --dry-run` 判定 5 个工程"已完全合规"，而其写入物只有三份文本，**不铺任何管控脚本**；
② 扫描 16 个外部工程会话转录，`name_me` / `control_gates` / `physical_lock` / `todo_gate` 命中数**全为 0**；
③ "需求版本号"全库仅有 `meta_rules.md` 第三十五条一句话，**无输出位、无台账字段、无判定器**。

#### 2. 核心诉求与目标
1. **覆盖侧（SCOPE-ALL）**：新增与存量工程 100% 纳入管控，脱管项由判定器列出并接入累积门禁；
2. **版本侧（VER-LINK）**：需求版本号成为输出结构的硬判据项，并贯通"需求文案 ↔ 需求台账 ↔ 实施载体 ↔ 回复回执"四处；
3. **落地侧（NO-FAKE）**：在既有六条触达判据上补"通电判定"与"引用真实性判定"，让空架子与悬空引用判红；
4. **递归分裂铁律**：任何子需求若八条物理触达判据不全满足，继续分裂，不得登记为完成。

#### 3. 关联文件与影响范围
- **需求文案**：[`docs/constraint_mechanism_optimize_9.md`](constraint_mechanism_optimize_9.md)（本条目唯一细则出处）；
- **新建**：`scripts/scope_audit.mjs` · `scripts/req_version_audit.mjs` · `scripts/anti_hallucination_audit.mjs` ·
  `ai-control/requirements/req_versions.json` · `ai-control/reports/state/scope_audit.json`；
- **改动**：`rules/system/output_standard.md`（新增需求版本号字段）· `ai-control/config/gates.conf`（`OUT_RECEIPT_FIELDS` + `SCOPE_*`）·
  `scripts/output_audit.mjs` · `scripts/progress_ledger.mjs`（登记需求版本）· `scripts/align_version.mjs`（受管范围扩容）·
  `scripts/normalize_all_projects.mjs`（合规判定改走覆盖审计）· `scripts/control_gates.sh`（接入三条判定器）·
  `scripts/mechanism_audit.mjs`（新增两条判据）· 外部四工程 `AGENTS.md` 与 `scripts/` 薄壳。

#### 4. 验收标准
- [ ] `node scripts/scope_audit.mjs --check` 退出码 0，看板显示各工程覆盖项 x/y；
- [ ] `node scripts/req_version_audit.mjs --check` 退出码 0，四处版本号逐字相等；
- [ ] `node scripts/anti_hallucination_audit.mjs --check` 退出码 0，悬空引用清零；
- [ ] 三条判定器各带反向用例（改坏后必须判红，不允许恒绿）且全部进入累积门禁。

#### 5. 实施记录
- **2026-10-02 [新建]**：接收 3 条口语需求，完成字面勘误（"导执行层→到执行层""这额个→这个""任务hui hua→任务会话"）、
  **查重拦截**（结论：3 条均为"有机制、没运行时"的同族断点，不是真空白）与递归分裂（R1~R3，共 14 个叶子）；
  完成现状核查（可复用 5 项 / 实测缺口 6 项）；登记 3 项待裁决分歧并给出本条采用口径。
  本轮**未改任何机制载体**（仅新增本文案与台账条目），状态为 `[EVOLVING]`。
- **2026-10-02 [实施 · 第一批]**：用户下令「继续」后开工，R1/R2/R3 三批全部落地并接入累积门禁：
  - **R1 全域覆盖**：新建 `scripts/scope_audit.mjs`（四类事实逐工程实跑 · 自检 11/11）
    与 `scripts/backfill_scope.mjs` + `templates/project_control_shell.sh`（薄壳入口 + 正引用 + 实跑留痕，幂等）。
    实测 4 个存量工程由 **1/4 → 4/4** 全部接管；`scope_audit --check` 全域已接管 4/4。
    **实测揪出并修掉一个跨工程级真缺陷**：`physical_lock.sh` 的内联 ESM 相对 import 按**进程 cwd** 解析，
    在别的工程目录调用必然 `ERR_MODULE_NOT_FOUND` —— 物理锁在跨工程场景**完全不可用**，
    而原判定只在本仓库内跑过，从未暴露。已改为 `cd "$ROOT"` 后执行，并加 cwd 中立性注释防复发。
  - **R2 需求版本贯通**：进度回执由四项扩为**五项**（新增 `🏷️ 需求版本`），阈值外置
    `OUT_RECEIPT_FIELDS`，`output_audit` 反向用例 16 → **18 项**全通过；
    新建 `scripts/req_version_gen.mjs` + `ai-control/requirements/req_versions.json`（92 条机读台账）；
    新建 `scripts/req_version_audit.mjs`：需求文案 ↔ 需求台账 ↔ 实施载体 ↔ 回复回执四处对拍（自检 10/10）。
    **修掉两处静默缺陷**：① `align_version.mjs` 被 import 时顺带全库写入（读一眼就改盘）；
    ② 版本提取的 lazy 量词吃掉版本号自身的 `v`，导致合规回执被判"未披露"。
  - **R3 反空架子 / 反幻觉**：新建 `scripts/anti_hallucination_audit.mjs`
    （判据七"通电凭据" + 判据八"引用真实性"，自检 12/12）；清零 4 处悬空引用；
    `mechanism_audit` 登记判据七/八/九三条新机制（登记 23 条 · 已触达 16 条）。
  - **接入累积门禁**：新增 **G5 落地与版本一致性**（三态语义 0/1/2，判定器缺失即判"不可判定"而非放行）；
    拦截层逃生舱补入 4 个新诊断脚本，避免"门禁没过 → 定位工具被门禁拦住"的自锁。
  - **联动修复**：`legacy_align_scan` 的 L4 指纹覆盖改读 `indexes/fingerprint_index.json`（统一真相源），
    指纹索引重扫 **256** 个受管资产，存量待对齐清零。
  - **版本**：系统总版本 `v4.26.0 → v4.28.0`（`v4.27.0` 仍预留 REQ-091：其"所有页面常显"待人工 DOM 取证，
    不满足递增条件，不静默认领）。
  - **未完成项（不得当作已完成）**：① 拦截层插件 `isHost=false` 仍未通电（`install_host_gate.sh verify` 实测条目缺失），
    本轮未改宿主 profile；② R1-d"宿主硬门禁升级为读全域产物"未落地（当前靠 G5 判定 + 显式标红兜住）。
- **2026-10-02 [实施 · 第二批]**：用户下令「实施」后开工，清偿上一批列出的未完成项：
  - **R1-d 宿主拦截层真通电**：`install_host_gate.sh install` 写入 profile 注册条目，
    宿主重载后 `install_host_gate.sh verify` 实测 **`isHost=true`**（激活台账
    2026-10-01T16:40:29.109Z HOST pid=6809）—— 这是本工程第一次拿到宿主侧激活凭据，
    此前"硬门禁存在"一直只是文档自述。**通电即被它自己拦了一次**（门禁快照陈旧报"会话未合规命名"），
    正好构成端到端实证：机制真的在跑，且自救通道（白名单里的门禁脚本）真的可用。
  - **R1-d 全域写拦截（新判据）**：拦截层新增 `evaluateDomainScope` ——
    守卫按节拍读全域覆盖快照，**工作区所属工程未接管即拒写**，并给出补课命令；
    主控仓库自身、取不到工作目录、快照不可用一律放行（不制造误伤）。
    配套：`scope_audit.mjs --fast`（只读本地留痕，毫秒级）+ 门禁同节拍刷新
    `scope_audit_fast.json`（**与权威报告分文件，禁止弱口径覆盖强口径**）。
    反向用例 `scripts/domain_scope_selftest.mjs` **9/9**（该拒的真拒、不该拒的零误伤），已并入 G5。
  - **推送闭环**：新建 `scripts/push_external_projects.sh`（逐工程判"有远程/有无待推送/推没推成"，
    不采信自述：推完再数一次未推送提交数）。实测 `冗余垃圾文件清除` 推送成功；
    `DSH股票` 网络超时未闭环；`DSH每日健康评估`、`日常琐碎` 本无远程 origin，需补配置后才能闭环。
  - **宿主重载后生效声明**：本轮插件代码改动需宿主重载才在运行时生效（当前宿主进程启动于改动前），
    代码级判定与新判定器均已实跑验证；"运行时是否已加载新版"以宿主激活台账为准。

---


### REQ-093: 执行层并发调度与管控瘦身（ELC-5）—— 执行层树可视化 / 插件安装并发 / 管家并发调配 / 管控精简 / 落地审计清零
> ### 🏷️ **资产元数据与生命周期标记**
> - **文档类型 (Doc Type)**: `[REQUIREMENT 业务需求台账]`
> - **清理定位 (Retention)**: `[PERSISTENT 长期受管]`
> - **生成会话**: `[R093][3] 管控需求简化落地`
> - **到期/清理条件**: `[随版本演进]`

- **当前状态**：`[EVOLVING]` **第一批已实施**（R1/R2/R3/R5 载体在位并接入新增累积门禁 **G6**；R4 载体在位但降幅目标未达成）
- **实施版本**：`v4.30.0`（规划目标；因 R4 目标未达成、R5 尚有 2 项机制判红，**未认领**，当前系统实施总版本仍为 `v4.29.0`）
- **需求版本**：`v1.2.0`（v1.0.0 初版文案 → v1.1.0 补图归一 → v1.2.0 第一批实施留痕）
- **提出时间**：2026-10-02
- **最新更新**：2026-10-02
- **责任归属**：用户（提出与裁决） / AI 智能体（翻译、分裂与实施）
- **需求文案**：[`docs/constraint_mechanism_optimize_10.md`](constraint_mechanism_optimize_10.md)（唯一权威出处，本条目只放指针不复述细则）

#### 1. 提出背景与痛点
用户提出 5 条优化诉求（执行层树可视化 / 插件安装并发 / 管家并发调度 / 管控机制瘦身 / 落地审计清零）。
本轮**查重拦截**结论：R1、R3、R4、R5 四条**属于"既有能力积木已备、缺装配与接线"**（
`route_plan` 不装配树、三把并行锁只有原语无调用方、token 三件套无受管对象、`mechanism_audit` 4 项判红），
**只有 R2 是真外部成因**：真凶不在本仓，而在 profile 内第三方市场插件 `dshmarket` 的 running-agent 守卫
（`lib/routes.js:5193-5202` 回 409 + `agentsBusy`），**发起安装的当前会话自己就是 running agent**，
于是 agent 回合内点安装必然被拒，客户端只能排队等空闲——这正是"要等任务空闲"的物理来源。

#### 2. 核心诉求与目标
1. **可看（TREE-VIZ）**：能按任务列出"完成它需要哪些执行层"，出图且每个节点可回溯到磁盘实体；
2. **可并（PLUGIN-CONC / BUTLER-SCHED）**：插件安装与管家派单都允许并发，忙闸门由"全体会话"细化为"冲突域"，
   直接拒绝改为入队 + 进度可见；死锁靠字典序全序取锁、活锁复用 AP-01，**禁止另立判据**；
3. **可瘦（TOKEN-TRIM）**：管控机制篇幅有基线、有降幅、有等价能力断言，**只折叠重复、不删事实与证据**；
4. **可证（LAND-ZERO）**：机制触达 4 项判红逐项清零，技能层载体纳入审计，并行安全归并为单一真相源；
5. **递归分裂铁律**：任何叶子若十条物理触达判据不全满足（前六条见 `optimize_6` §2.3、七八条见 `optimize_9` §2.3、
   本条新增第九"并发安全判定"与第十"等量能力判定"），继续分裂，不得登记为完成。

#### 3. 关联文件与影响范围
- **需求文案**：[`docs/constraint_mechanism_optimize_10.md`](constraint_mechanism_optimize_10.md)（本条目唯一细则出处）；
- **规划新建**：`scripts/task_layer_tree.mjs` · `scripts/plugin_install_queue.mjs` · `scripts/butler_scheduler.mjs` ·
  `scripts/skill_carrier_audit.mjs` · `ai-control/config/token_budget.conf` · `ai-control/reports/state/plugin_install_queue.json`；
- **规划改动**：`scripts/mechanism_audit.mjs`（4 项判据修复）· `scripts/lib/todo_gate_cli.mjs`（区分"无转录"与"无待办"）·
  `scripts/install_host_gate.sh`（增 bundles 通道）· `skill-pool/plugins/dsh-plugin-restart`（重建 bundle 并同步）·
  `scripts/plugin_sync.sh`（锁键按包分片）· `scripts/control_gates.sh`（接入新判定器）；
- **边界外（需用户裁决，本轮不动）**：profile 内第三方包 `dshmarket` 源码、宿主 `app.asar`（已签名，改动需重启桌面端）。

#### 4. 验收标准
- [ ] `node scripts/task_layer_tree.mjs --check "<任务意图>"` 退出码 0，树内节点 100% 可回溯到磁盘实体；
- [ ] `node scripts/plugin_install_queue.mjs --check` 退出码 0：无"全体空闲"式无界等待、无双重持锁、无丢失请求；
- [ ] `node scripts/butler_scheduler.mjs --check` 退出码 0，并附必冲突反向用例证明有牙；
- [ ] `python3 skills/verify-token-reduction/scripts/verify_reduction.py --target 0.30 --cases <清单>` 退出码 0 且 `capability.missing` 为空；
- [ ] `node scripts/mechanism_audit.mjs --exit` 退出码 0（4 项硬性未触达清零）；`node scripts/skill_carrier_audit.mjs --check` 退出码 0；
- [ ] 上述判定器**全部接入累积门禁**，未过不得结项。

#### 5. 实施记录
- **2026-10-02 [新建]**：接收 5 条口语需求，完成字面勘误（"导执行层→到执行层""这额个→这个""toeken→token"）、
  **查重拦截**（结论：4 条是"有积木、缺接线"，1 条是外部成因）与递归分裂（R1~R5，共 **24 个叶子**）；
  完成现状核查（可复用 8 项 / 实测缺口 8 类）；登记 6 项待裁决分歧并给出本条采用口径；
  两项穿透到物理根因的只读取证（`dshmarket` running-agent 守卫；4 项机制判红逐项根因与最小修复载体）。
  **本轮未改任何机制载体**（仅新增本文案与本条目），状态为 `[EVOLVING]`。
- **2026-10-02 [实施 · 第一批]**：用户补图（"如图"= 界面里"N 个子智能体"树状面板）并下令"所有改动都要同步到索引和路由；实施"。
  五条诉求的物理载体全部落地：新建 `scripts/task_layer_tree.mjs`（R1，判定 6/6 + 反向用例判红 + 出图）、
  `scripts/butler_scheduler.mjs`（R3，五类固化用例 5/5，锁冲突/死锁环/AP-01 活锁/无界并发一律拒单）、
  `scripts/plugin_install_queue.mjs`（R2，并发受理 + 冲突域排队 + 有界重试，probe 取到 2 条 install-blocked 实证）、
  `scripts/skill_carrier_audit.mjs` + 豁免白名单（R5，178 条技能载体审计：硬缺口 0）、
  `scripts/token_budget_audit.mjs` + 预算配置与能力证据串（R4，269/269 证据串全存活、篇幅未膨胀）。
  **索引与路由同步**：执行层入索引 261 条；5 个新脚本补齐手写接口契约（CLI 声明覆盖率 → 100%）；
  新增 5 条快速通道（通道 → 45 条，channel_audit 问题 0）；route_plan --check 全过。
  **新增累积门禁 G6 执行层并发与载体一致性**（五条判定器全绿才放行），看板 5/5 → 6/6 · 100%。
  **诚实缺口**：① R4 的 30% 降幅目标未达成（总篇幅 34161 → 34557 tokens，AGENTS.md 单文件减 5.0%，
  索引因新增 5 条通道 +9.8% 已书面豁免），故**不认领 v4.30.0**；② R2 外部根因 dshmarket 守卫未消除（未获授权改第三方产物）；
  ③ R5 尚有 2 项机制判红（拦截层宿主注册、任务列表面板），修复载体已在文案 §3.3 锁定。
- **2026-10-02 [实施 · 第二批]**：**机制触达清零**——`mechanism_audit` 硬性未触达 **0 条**（已触达 22/23）。
  三项原判红全部落到物理层：① 拦截层改走宿主 **bundles 通道**（新建 `ai-control/plugin/package.json`
  与 `cordis.patch.yml`，`plugin_sync.sh` 支持"路径|包名"映射，`install_host_gate.sh` 增认该通道），
  `verify` 实测退出码 0；② 任务列表面板**迁移载体**到拦截层插件（新增 `renderTodoPanel()` 逐条打钩面板）
  并新建 `scripts/todo_panel_audit.mjs` 做**行为断言**判定（含"空列表不得画假进度条"反向用例），
  `mechanism_audit` 该条判据改为委托它；③ 重启插件 bundle 重建并同步 profile，打桩自检 100/100 通过。
  **反向用例揪出并修掉一个假绿灯**：能力等价判据因 `--target 0` 非法而**从未真正执行**，却一路报通过；
  已修正参数并加"缺 capability.missing 即判取不到证据"硬约束（修正后 8/8 用例通过、证据串丢失 0）。
  R4 篇幅：`indexes/rules_index.md` 结构化压缩并修掉落后两代的门禁表（7 973 → 7 726 tokens），
  全库 34 161 → 34 467 tokens（仍增 0.9%），**30% 目标仍未达成、不认领 v4.30.0**。
- **2026-10-02 [实施 · 第三批]**：① **R2 打通并发**——新增 `scripts/market_guard_patch.mjs`，
  把 `dshmarket` 4 条改盘路由的「有任意 agent 在跑就 409 拒绝」放宽为「并发受理 + 留痕」，
  可回滚（时间戳备份 + `--revert` 逐字节还原）、幂等、`--self-test` 在临时副本上验证"能打上/判得出/能还原"；
  实测 `--apply` 后 `--check` 退出码 0（标记 4/4 · `agentsBusy` 残留 0 · 语法 ✅）。
  ② **R4 压缩到无损下限**——8 个受管文件 **34 161 → 25 552 tokens（减 25.2%）**，
  能力等价 8/8 用例、**269 条证据串丢失 0**；新增 `TOKEN_LOSSLESS_FLOOR_RATIO=0.748` 把"目标"与"物理下限"分开报。
  **30% 目标未达成**：再压 1 425 tokens 只能删受保护内容（元规则要求正文 / 索引逐条职责 / AGENTS.md 执行清单），
  与"保持同等执行水准"冲突，**故不越界、不认领 v4.30.0，待用户裁决**。

---

### REQ-094: 手机远端操控 DSH（MBC-1）—— LAN 网桥 / 现签鉴权 cookie / PIN 闸门 / 端到端判定
> ### 🏷️ **资产元数据与生命周期标记**
> - **文档类型 (Doc Type)**: `[REQUIREMENT 业务需求台账]`
> - **清理定位 (Retention)**: `[PERSISTENT 长期受管]`
> - **生成会话**: `[新需094][4分] 手机远端操控DSH`
> - **到期/清理条件**: `[随版本演进]`

- **当前状态**：`[IMPLEMENTED]` 物理载体已落地并实跑取证（`--e2e` 8/8 通过 · `--check` 通过；真浏览器实点后已修复缺陷 1）
- **实施版本**：`v4.29.0`（**随当前总版本增量落地**；`v4.30.0` 因 REQ-093 未达降幅目标而未被认领，本条不抢版本号，
  此为显式留痕、非静默跳过）
- **需求版本**：`v1.0.0`
- **提出时间**：2026-10-02
- **最新更新**：2026-10-02
- **责任归属**：用户（提出与裁决） / AI 智能体（翻译、分裂与实施）
- **需求文案**：[`docs/mobile_control_dsh.md`](mobile_control_dsh.md)（唯一权威出处，本条目只放指针不复述细则）

#### 1. 提出背景与痛点

用户提出"用 iPhone 操控 Mac 上的 DSH 干活"。**查重拦截**结论：全域既有条目只覆盖"本机 Web GUI"
（`DSH_WEB_URL` 与输出契约等），**无任何一条覆盖"跨设备接管"**，故立新条目而非归并。
**现状核查**（三条实测事实）：① 宿主只绑 `127.0.0.1:19387`；② 裸访问返回 401 鉴权文案；
③ DSH 虽有 `--host 0.0.0.0` 能力，但桌面端启动参数写死、且鉴权 URL 携带**每进程作废的内存令牌** ——
即"存在半成品通道、不存在可用现成方案"。

#### 2. 核心诉求与目标

1. **可直达（M1）**：iPhone 一个链接进入完整 DSH 界面，PIN 含在链接里，重启 DSH 后链接不变；
2. **可干活（M2）**：`/api` RPC 必须穿过宿主 Host/Origin 围栏与鉴权，不能只是"渲染个空壳"；
3. **进不来（M3）**：无 PIN 只有登录页、错 PIN 被拒、公网来源 403、PIN 落盘 600 且不入库；
4. **可证（M4）**：判定器 `--check`（结构 + 宿主实活）与 `--e2e`（真起网桥 7 项断言）**并入累积门禁 G5**；
5. **递归分裂铁律**：执行层（skill / agent / plugin / cli / mcp）任一层若没有可跑载体与判定命令就继续分裂，
   拆不动的一律按"不适用"结案并写明理由，不许造空架子。

#### 3. 关联文件与影响范围

- **需求文案**：[`docs/mobile_control_dsh.md`](mobile_control_dsh.md)（含 11 个叶子的分裂记录）；
- **新增载体**：`scripts/lib/mobile_bridge_core.mjs` · `scripts/mobile_bridge.mjs` ·
  `scripts/mobile_control.sh` · `scripts/mobile_bridge_audit.mjs`；
- **改动载体**：`scripts/control.sh`（新增 `mobile` 动作转发）· `scripts/control_gates.sh`（G5 判定器列表加入本条）·
  `indexes/capabilities_index.md`（能力层索引同步）；
- **运行态落盘（不入库）**：`ai-control/reports/state/mobile_bridge/`（PIN、签名密钥、访问日志，权限 600）；
- **边界外**：宿主 `app.asar`（已签名，本轮零改动）；`~/.dsh/.credentials.yaml`（只读密钥，不写）。

#### 4. 验收标准

- [x] `node scripts/mobile_bridge_audit.mjs --check` 退出码 0（载体在位 + 宿主认下现签 cookie）；
- [x] `node scripts/mobile_bridge_audit.mjs --e2e` 退出码 0，8/8 项通过（无 PIN 401 / 带 PIN 200 /
      下发会话 cookie / 无会话 401 / `/api` 404 已进 RPC 层 / 真实端点不被围栏拦 / 现签 cookie 被宿主直收 /
      引导资源逐字节对拍 10 个全等）；
- [x] 局域网 IP 实测可达：`http://192.168.31.37:19388/?k=<PIN>` 返回 200；
- [x] 反向用例：`http://192.168.31.37:19388/` 无 PIN 返回 401（判定器有牙）；
- [x] 载体加入 **G5** 判定器列表，未过不得结项。

#### 5. 实施记录

- **2026-10-02 [新建+落地]**：接收 1 条口语需求，完成字面勘误（"时苹果手机→是苹果手机"）、
  查重拦截（结论：全域无同类条目）、现状核查（三条实测事实 + 一条物理根因穿透：
  桌面端鉴权令牌只存内存、但签名密钥持久化，故改用"现签 cookie"路线）；
  递归分裂为 4 条诉求 / 11 个叶子（6 个落到文件与命令、5 个按不适用结案）；
  落地 4 个物理载体并接入累积门禁 G5；端到端实跑 7/7 通过、局域网 IP 实活 200、无 PIN 401。
- **2026-10-02 [缺陷修复 · 真浏览器实点回填]**：用户在浏览器打开手机链接后白屏，
  报 `client-modules: HTML did not preload .../client.js`。取证发现 index.html 与宿主逐字节相同，
  真差异是拼接式插件 URL `/plugins/??a/client.js,b/client.js&rev=x` 经网桥 404（宿主 200/40330B）。
  根因：网桥用 WHATWG `new URL` + `searchParams.delete` 重新序列化查询串，把 `??@...` 转义成 `%3F%40...`。
  修复：改字符串级 `parseRawUrl`，只摘 `k` 参数、其余原样透传（升级请求同口径）。
  防回归：`--e2e` 增加"引导资源逐字节对拍"断言（10 个资源全等，含 10.4MB+2.2MB 两条拼接 URL），项数 7→8。
  同时修掉 `stop` 删状态导致下次 `start` 换 PIN 的体验缺陷（停服只摘 pid，PIN/密钥保留）。

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

### 结构树图谱与执行层仪表盘（2026-09-29 · 通道"管控机制结构"与"执行层盘点"）

- **触发**：用户口令"当前管控机制是怎样的结构，输出树状结构 + 信息图"、"看看执行层都有什么 + 仪表盘盘点"；
- **新增资产 1**：`assets/generated_images/control_mechanism_structure_tree_v3.svg` + `.png`（1120×2170）——
  管控机制五层分工（注入/状态/判定/拦截/自证审计）+ 两把硬闸（G0~G4 累积门禁、LOCK-0~4 物理锁）结构树；
- **新增资产 2**：`assets/generated_images/execution_layer_dashboard_v1.svg` + `.png`（1120×1560）——
  执行层六层闭集盘点仪表盘（六层分布 / 四口径对照 / 结构健康 / 漂移空洞 / 五项体检红绿灯）；
- **数据源**（均可复跑）：`control_gates.sh check` · `physical_lock.sh status` · `install_host_gate.sh verify` ·
  `mechanism_audit.mjs`（13 条登记机制 · 已触达 8 · 硬性未触达 1 · 无载体 3）·
  `build_capabilities_index.mjs --check`（224 执行层 / 收录 224 / 未收录 0 / 漂移 5）·
  `skill-pool/docs/operations/` 下 5 个登记 JSON（树 196 条 · 依赖边 225 / 悬空 0 · 实例安全 177 扫描 / 问题 0）；
- **本轮新发现（非重复登记）**：§3.2 已登记的 5 条 catalog 漂移中，`github`、`manage-problem-log`、
  `manage-requirements` **3 条已穿透进执行层树**（`execution-tree.md` §3），而该树 §4 自检仍报"一致性问题：无"
  —— `verify-execution-tree` 对"磁盘不存在"这一类缺校验，属判定盲区；已在本节留痕，处置留待裁决；
- **本轮实修（非本资产）**：G0 改名 RPC 凭据目录错位（`dsh-desktop` → `@deepseek-ai/dsh-desktop`）已用正确凭据改名成功；
  G2 因 `.DS_Store` 被 macOS 秒级回填而在 4/4 与 3/4 间闪烁，已在本节留痕；
- **改动后复跑**：冗余高相似对 0 · 冲突 0 · 存量待对齐 0（3 项书面豁免）· 门禁 4/4 · 物理锁 [2] LOCK-2；
- **未验证项**：两张 PNG 与 SVG 未推送远程；`rename_session.sh` 的凭据路径缺陷当时**只记录未修**（已在下一节完成修复）。

### 体检修复 + DeepSeek 用量探针（2026-09-29 · 阶段 A · 纯本地零宿主风险）

> 触发：用户提出三条全局规则需求（① 修体检问题 ② 底部常显 DeepSeek 时段与额度 ③ 管家续任评估），
> 并明确"颗粒度过大就继续细分成执行层直到触达物理层"。经确认先执行**阶段 A（纯本地、不改宿主 profile）**。

**1) 判定层与命名层的三处真缺陷（均实测复现后修复）**

| 编号 | 载体 | 缺陷 | 修法 | 复跑证据 |
| :--- | :--- | :--- | :--- | :--- |
| F1 | `scripts/rename_session.sh` | 只读旧 Electron 目录 `dsh-desktop/Cookies`，而宿主实为 `@deepseek-ai/dsh-desktop` → RPC `unauthorized`，标题**从未真正改过**却仍报"已落盘"并 `exit 0` | 改为多候选目录逐个尝试 + 打印凭据来源；RPC 失败时**明确报错并退 1** | `name_me.sh "[新需013][75] 用量常显与修复"` → `ok:true`，退出码 0 |
| F2 | `scripts/check_task_naming.sh`、`scripts/rename_session.sh` | 正则用多字节量词 `分?` 表达"分字可选"，空 locale 下退化为"**必须有**分" → 合规标题 `[新需013][75]` 被判非法 | 先用纯字符串运算剥掉可选「分」，再跑只含 ASCII 的正则 | `check_task_naming.sh --exit` → 0；`[75]` 与 `[75分]` 双双通过 |
| F5 | `scripts/control_gates.sh`、`ai-control/config/gates.conf` | G2 把 macOS 秒级回填的 `.DS_Store` 当"散落垃圾"，门禁 4/4↔3/4 闪烁；且豁免表只支持**单个** glob，`for _pat in ${VAR}` 还会触发**路径名展开**把模式吃成真实文件路径 | 豁免表升级为空格分隔多 glob（`read -ra` 切词）+ 排除 `*/.DS_Store` | 含 `.DS_Store` 的情况下连续 3 次 `check` 均 **4/4 · exit 0** |

**2) 判定盲区补强（F6）**：`skills/verify-execution-tree/scripts/verify_tree.py` 新增第 8 项检查
`C8_catalog_entries_exist_on_disk`（原 C1~C7 只比对四方**互相同步**，从不问"磁盘上真的存在吗"）。
口径：`scope: system-builtin` / `path: @system/*` 豁免并**显式报数**，只有"非 system-builtin 却查无目录"才判失败。
实测：加豁免前磁盘缺失 5 条、加豁免后真缺失 0 条、豁免 5 条 —— 判别力已验证。

**3) 新增执行层能力（U1~U4，对应需求 ②的物理层）**

- `scripts/lib/deepseek_balance.mjs`（api 层，276 行）：官方 `GET https://api.deepseek.com/user/balance`，多来源凭据解析（仅接受 `sk-` 前缀，**不解析** `~/.dsh/.credentials.yaml`，因实测那里只有账号令牌）；
- `scripts/lib/pricing_fingerprint.mjs`（273 行）：官方定价页 sha256 + ETag/Last-Modified 指纹，状态落 `$DSH_HOME/.dsh-control/pricing_fingerprint.json`，**同日幂等**（二跑只改 `lastCheckedAt`/`lastFetchedAt`）；
- `scripts/deepseek_usage_probe.mjs`（491 行，CLI 层）：`--json/--check/--price-sync`；时段**按北京时间本地计算**（官方明确无时段接口），节假日表内置 2026（来源：国办发明电〔2025〕7 号），未覆盖年份在 `reason` 显式降级；
- `skills/check-deepseek-usage/`（skill 层）：L2 技能。**按 naming spec 改名**：初版 `probe-deepseek-usage` 的首段动词 `probe` 不在 64 条动词表内 → 改为 `check-`（在表内）；
- **实测硬约束**：本机只有 `deepseek-account-platform` 账号令牌，官方余额接口要求 `Bearer sk-...`（实测 401：`auth header format should be Bearer sk-...`）→ 余额栏如实报 `errorKind=no-credential`，**不显示任何假数字**；要显示真实额度需另行提供 `sk-` API Key。

**4) 依规范执行的派生重建**：新增/改名执行层后按 `skill-pool/docs/operations/rebuild-chain.json` 跑完 5 步
（sync_catalog → layer_graph → inverted_index → instance_safety → execution_tree），
并将新技能挂到 L3 `visualize-governance-topology` 的 composition 下以消除孤儿原子；
另跑 `fingerprint_audit.sh --scan`（151 个受管资产）与 `build_capabilities_index.mjs --apply`。

**5) 本次复跑结果**：门禁 4/4（连续 3 次稳定）· catalog 183 条 · 树校验 8/8 通过（issue 0）·
索引 226 条 100% 收录 · 冗余高相似对 0 · 冲突 0 · 存量待对齐 0 · 指纹台账已更新。

**6) 待裁决（未自行取舍）**：`skill-catalog.json` 中 5 条 `scope: system-builtin` 记录（`confirm-before-coding`、
`track-task-progress`、`github`、`manage-problem-log`、`manage-requirements`）与
`indexes/capabilities_index.md` §3.2 的"漂移，必须补齐文件或注销"表述**口径冲突**。
按元规则"冲突先出裁决方案、由用户确认后再迭代"，本轮只让 C8 把两类分开报数，**未删记录、未建空壳技能**。

**7) 阶段 B 前的状态**：宿主拦截层注册与底部栏 UI 插件当时均未做（均需改宿主 profile 并重载）—— 已在下一节完成。

### 阶段 B：宿主注册 + 用量常显底栏插件（2026-09-29 · 需重启宿主生效）

**1) F3 修 profile 解析**：`scripts/install_host_gate.sh` 原把 profile 硬编码成 `profiles/web/`，
而本机 `~/.dsh/profiles/` 下**只有 desktop** → install 报"找不到 profile"、verify 永远报"条目缺失"，
这个自证工具本身失去判定力。现按「`DSH_PROFILE_DIR` → `DSH_PROFILE` → 磁盘上真实含 `cordis.patch.yml` 的 profile」解析，
并把解析结果打印出来。实测：`目标 profile: /Users/linqiyu/.dsh/profiles/desktop（已解析）`。

**2) F4 宿主注册（已写入，待重载）**：`./scripts/install_host_gate.sh install` 已把拦截层条目写入
`~/.dsh/profiles/desktop/cordis.patch.yml`（写入前自动备份）。`verify` 现返回 **exit 2 = 已注册但宿主尚未落运行时凭据**
（三态语义：0 已激活 / 1 载体坏了 / 2 待重载）—— 这是**诚实的中间态**，不是失败。

**3) U5 新增底部用量栏插件** `skill-pool/plugins/dsh-plugin-usage-bar/`：
- 挂载点 `conversation.input.dock`（`order=20`，排在 TodoPanel 0 / GoalBar 10 之后），走 `ctx.slots.inject/register` 标准插槽；
- **时段与下次切换倒计时为纯前端本地计算**（官方确认无时段接口）；客户端 bundle 内联 `src/usage-core.cjs`，
  由 `build_client.py` 构建并以 sha256 摘要锁死"两份实现"；
- **额度栏在宿主通道与 `sk-` 凭据就位前一律显示「未接入」**，不显示任何假数字；
- 宿主半体只做一件事：每 5 分钟调 `scripts/deepseek_usage_probe.mjs --json` 并原子落盘
  `$DSH_HOME/.dsh-control/usage-bar.json`（+ `usage-bar-host.json` 诊断）；
- 红线遵守：宿主未提供 slots 或 React seed 时**只记诊断、不做 DOM 穿透**；任何异常只写日志、不抛出。
- **实测（桩件，不需宿主 App）**：`node skill-pool/plugins/dsh-plugin-usage-bar/verify_stub.cjs` → **9/9 通过**
  （含"注册到正确插槽 / order=20 / 渲染含真实时段与倒计时 / 无假额度 / 无 slots 与无 React 两种降级都不抛"）；
  时段逻辑对拍 **9/9 正确**，其中修掉一个真 bug：首版把周末的 18:00 也算成"下次切换"（周末全天空闲、价格并不变），
  已改为按"当前波段终点"推导（周末→下周一 09:00，国庆→10-09 09:00）。
- **装配器泛化**：`skills/install-client-plugin/scripts/install_plugin.py` 原来把插件 id 写死，
  只能装 `dsh-plugin-control-jump` 一个；新增 `--plugin <id>`（默认值保持向后兼容，目录缺失即退 2）。
  实测装配 `dsh-plugin-usage-bar` → `installed`，复跑 → `already_installed / changed=0`（幂等成立）。

**4) F8 无载体机制处置**：`dsh-plugin-control-jump` 已由同一装配器装入 desktop profile（原"未注册"状态解除）；
`process-supervisor-agent`（宿主无 agent 注册面）与 S11（写后必读回，拦截层无判定）**本轮无合规载体可挂**，
按"禁止虚无缥缈"改为**书面降级待办**，待宿主提供相应扩展面后再做，不以"已优化"含糊带过。

**5) 派生同步**：新 plugin 执行层已登记进 `skill-pool/docs/operations/execution-layers.json`（14→15 条），
并按 `rebuild-chain.json` 重建全部派生产物；`verify-execution-tree` **8/8 通过**（C6 校验 15 条登记合法）；
`skill-pool/docs/operations/workflows.md` 新增 §17.1 登记本插件全部命令（构建 / 新鲜度 / 桩件 / 干跑 / 装配 / 回滚）。

**6) 生效条件（必须说清）**：新增插件的 bundle 注册表与 profile patch **在宿主启动时读取**
→ 需**重启桌面端**，仅刷新页面不够。重启后按 `./scripts/install_host_gate.sh verify` 验收（期望 exit 0）。

**7) 已知冗余（未合并，已书面说明）**：时段规则目前在 `scripts/deepseek_usage_probe.mjs`（CLI）与
`skill-pool/plugins/dsh-plugin-usage-bar/src/usage-core.cjs`（客户端内核）**各有一份实现**；
原因是浏览器 bundle 不能 require 仓库文件、必须内联。两者行为已对拍一致（各 9/9），
但存在漂移风险，后续应让 CLI 复用该内核（`createRequire` 加载）；本轮为控制改动半径未动已审计的 CLI。

### 额度接入 + 拦截层致命语法错误修复（2026-09-29 · 阶段 B 续）

**1) 阻断性发现：拦截层插件从来没被成功加载过**
`ai-control/plugin/index.mjs` 第 902 行存在**真语法错误** —— `try { stats = { ...stats, ...JSON.parse(...) } catch {`
少了**一个闭括号**（那个 `}` 闭合的是对象字面量，try 块从未闭合）。
后果链：`import` 必然抛异常 → `loader.mjs` 按"故障安全"设计降级为空插件 →
**硬门禁、常显看板、S07 待办常显、物理锁运行时拦截四件事全部从未运行过**，
而外观症状与"插件没注册"完全一致，极难归因。
关键证据：`git show HEAD:ai-control/plugin/index.mjs` **同样报同一处语法错误**，
即该缺陷**已在上一版提交里**；而 `selftest.mjs` 第 18 行是 `import ... from './index.mjs'` 的**静态导入** ——
文件语法错误时自检根本无法启动，所以"自检 69/69 全绿"必然是**在文件被改坏之前**跑的，
之后没有任何一道关卡重新解析过载体。**已修**：`node --check` 通过，`selftest.mjs` 复跑 **69/69 通过**。

**2) 补关卡：载体自证新增"可解析"判定**
`scripts/install_host_gate.sh verify` 原来只检查"加载器文件是否存在"就报在位，
存在性检查抓不到语法错误这一类。现新增两条语法自检（`loader.mjs` + `index.mjs` 各跑一次 `node --check`），
失败即把 `local_ok` 归零（判"载体坏了"）。实测输出：`语法自检 : ✅ loader.mjs 可解析` / `✅ index.mjs 可解析`。

**3) 额度接入（宿主侧通道已打通，凭据待用户提供）**
- **前置事实（实测）**：全机搜索无 `sk-` 凭据 —— 环境变量无、shell rc 无、钥匙串无、配置目录无；
  `~/.dsh/.credentials.yaml` 里只有 `deepseek-account-platform` 的**账号令牌**，
  而官方余额接口只认 `Bearer sk-...`（实测返回 `401 Authentication Fails (auth header format should be Bearer sk-...)`）。
  即：**桌面端账号 ≠ API Key**，二者不是一套东西；
- **新增**：`scripts/deepseek_key_setup.sh` —— 交互式安全落盘（`read -s` 不回显，写 `$DSH_HOME/.dsh-control/deepseek_api_key`，权限 600），
  并当场调官方接口验证；另有 `--check`（只报状态与长度）/`--clear`/`--from-env`；
- **新增**：拦截层常显看板的**用量常显行** —— `ai-control/plugin/index.mjs` 新增 `buildUsageLine()`，
  每 5 分钟调一次本仓已审计的探针 CLI（**不在插件里重算**，避免双实现漂移），
  渲染形如 `> DeepSeek **空闲时段**（高峰价 5 折） · 距切换 6 小时 19 分 · 剩余额度 <真实值/明确原因>`；
  探针不可用时该行**自动消失**，绝不用假数字占位；已实测导出函数并按真实输出验证；
- **前端措辞**：底栏插件原来固定显示"额度：未接入"（客户端拿不到宿主数据，看着像坏了），
  改为 `额度见每轮常显看板`，把额度归口到唯一有数据通道的地方；桩件实测复跑 **9/9 通过**。

**4) 复跑**：`install_host_gate.sh verify` exit 2（已注册 + 载体语法通过 + 待重载）· 拦截层自检 69/69 ·
底栏桩件 9/9 · 索引 228 条 100% 收录（新增 `cli` 1 条）· 指纹台账已更新。

**5) 仍未闭环的一步**：需**重启桌面端**（profile patch 与插件 bundle 在宿主启动时读取）。
重启后 `verify` 应为 exit 0（isHost=true），常显看板会出现用量行；
在此之前，额度仍按"未配置 API Key"如实显示。

### 管控机制当前实况总览信息图 v4（2026-09-29 · 通道"生成信息图"）

- **触发**：用户口令"看看当前的管控机制 + 生成信息图"，命中 [`indexes/shortcuts_index.md`](../indexes/shortcuts_index.md) 已登记通道；
- **新增资产**：`assets/generated_images/control_mechanism_live_overview_v4.svg` + `.png`（1120×2935）——
  五层管道实况（注入 / 状态 / 判定 / 拦截 / 自证审计）+ 13 条机制触达清点 + 12 格实跑数据矩阵 + 断点与处置 + 常跑命令；
- **版本分工**：唯一权威出处为 [`indexes/rules_index.md`](../indexes/rules_index.md) 第〇章"机制信息图"表，
  本版登记为**现行实况总览版（引用现状首选）**，v2 与 v3 退为历史版本；本节不新增 `REQ-###` 条目，不影响 G3 计数口径；
- **本次实跑数据**（信息图数据源，均可复跑）：门禁 4/4（骨架 11/11 · 防丢 11/11 · 合规 5/5 · 孤儿 0 · 无标题 0/493 ·
  条目 86 = A80/E3/D1 · 缺号 0 · 未提交 0/30 · HEAD 267b861 · 高相似对 0，门禁口径 128 文件 / 551 实质块）·
  冲突 0（74 文件）· 存量待对齐 0（74 文件，3 项书面豁免）· 通道 30 条 0 问题 · 技能池 178 未归位 0 ·
  执行层 228（技能 178 + agent/plugin/cli 50）收录 228 未收录 0 catalog 漂移 5 · S07 待办 4/5 · 90% ·
  物理锁 [2] LOCK-2（凭据 2 条）· mechanism_audit 13 条登记（已触达 9 · 无载体 3 · 硬性未触达 1）；
- **本轮新取证的根因（v3 时只知"未注册"，本轮穿透到两层原因）**：
  ① **profile 迁移丢条目**：宿主 profile 目录已由 `profiles/web/` 迁到 `profiles/desktop/`，
  `cordis.patch.yml`（实测 mtime 03:27:58）被重写，其中的 `ai-execution-control` 条目随之丢失
  （`grep -rl ai-execution-control ~/.dsh/profiles/` 全域无命中，`profiles/web/` 目录已不存在）；
  ② **isHost 判据未覆盖当前宿主形态**：当前宿主进程 argv 为
  `…/dsh-desktop-host/lib/index.js`，既不含 `DSH Desktop Helper`/`node.mojom.NodeService` 三件套，
  也不含 `dsh/lib/bin.js`，故 `isHost` 恒为 false；`~/.dsh/.dsh-control/plugin-status.txt` 留存的
  03:24 记录虽显示 `apply 执行`、`showCard=true`、`enforce=true`，但 `isHost=false` —— 即"加载过、但判据不认"。
  **两层叠加**：写回条目仍需重载 profile，且判据不修则激活凭据依旧空白；
- **本轮未动宿主**：仅取证与出图，**未**执行 `install_host_gate.sh install`（改宿主 profile 需重启桌面端，留待用户裁决）；
- **改动后复跑**：冗余高相似对 0 · 冲突 0 · 存量待对齐 0（3 项书面豁免）· 门禁 4/4 · 物理锁 [2] LOCK-2；
- **未验证项**：PNG 未在 Web GUI 页面内实点打开验证（仅文件工具读回 + 目视校验）；SVG 由手写坐标排版，
  已按设计尺寸栅格化并逐段目视核对，但未做跨浏览器渲染差异比对。

### 小白版全流程图文（2026-10-01 · 用户提问"可视化讲解管控机制流程"）

- **触发**：用户直接提问"看看当前管控机制的流程，用可视化图文讲给小白听"——属查阅问答类，走快速轻量流（【探】→【攻】→【归】），
  仍按机制完成首动改名（`[优规001][60分] 管控机制流程讲解`）与 G0~G4 门禁前置；
- **新增资产**：`assets/generated_images/control_mechanism_beginner_flow_v1.svg` + `.png`（1200×3310）——
  面向非专业读者的教学版：① 你发一句话后必过的 10 道关（带真实命令与判定标签）· ② 五层分工（配生活化比喻）·
  ③ 物理锁 LOCK-0~4 五级台阶 · ④ 16 条机制触达红绿灯 · ⑤ 三句脾气（不采信自述 / 不静默失败 / 不跳步）；
- **版本分工**：本图定位为**教学讲解版**，只承担"讲清楚怎么运作"，**不承担实况数字权威**；
  引用机制现状一律仍以 [`indexes/rules_index.md`](../indexes/rules_index.md) 第〇章"机制信息图"表中的
  **当前实况总览版 v4** 为准，本节不新增 `REQ-###` 条目，不影响 G3 计数口径；
- **本次实跑数据**（图文数据源，均可复跑）：门禁 4/4（骨架 11/11 · 防丢 11/11 · 条目 88 · 未提交 0/30 · HEAD 7211e4b）·
  物理锁 [2] LOCK-2（凭据 2 条：`sync_gates_ok` + `sync_todo_evidence`）· S07 待办 1/6 完成 · 总进度 42% ·
  `mechanism_audit` 登记 16 条（已触达 13 · 硬性未触达 2 · 无载体 1）· `process_supervisor --fast` 硬项 9/9 全绿 ·
  `flow_control --check` 步骤 19 / 批次 17 / 五条不变式成立 · 双检与存量校准全 0；
- **本轮新发现（非重复登记）**：`mechanism_audit` 的"任务列表面板"判据仍在按 `DSH Desktop.app` 旧应用名找宿主前端产物，
  当前宿主已更名为 `DeepSeek Harness.app`，故该条**恒判未触达**——属判据路径未随宿主更名对齐（本轮只留痕，未改判据）；
- **改动后复跑**：冗余高相似对 0 · 冲突 0 · 存量待对齐 0（7 项书面豁免）· 门禁 4/4 · 物理锁 [2] LOCK-2；
- **未验证项**：PNG 未在 Web GUI 页面内实点打开验证（仅文件工具读回 + 四段裁切目视核对）；
  本次改动**尚未推送远程**；SVG 由一次性 Python 生成器排版（生成器未落地为仓库脚本，交付物为 SVG 与 PNG 两份）。
