---
name: dsh-butler
level: L4
composition:
  - detect-vague-modifier
  - retire-legacy-workspace
description: DSH 全局主控管家(L4 中枢编排级)，统筹调度 L1~L3 全量执行层，支持自底向上按需拼装能力积木与动态造物。
---

# DSH 全局管家 (Master Butler Orchestrator)

## Overview

DSH 管家是面向 DeepSeek Harness (DSH) 生态构建的最高权限全局主控与执行层调度中心。
管家作为用户意图与底层执行工具之间的中枢代理，承担统一路由调度、执行层资源生命周期管理、动态造物扩展以及交付门禁校验的核心职责。

---

## 核心权限与原则 (Privilege & Governance)

1. **最高权限特权 (Super-Admin / Root Authority)**：管家在 DSH 会话中拥有最高决策权与全局工具调用权，包括读取/修改配置、动态创建技能与派生子智能体。
2. **执行层全面纳管 (All-in-One Execution Surfaces)**：
   - **Skill（技能层）**：规范化指令、业务模版、输出约束规则。
   - **Agent / Subagent（智能体层）**：自治子智能体，负责深度推导、大颗粒度离线分析与并行拆解。
   - **CLI（本地执行层）**：本地 Shell、Python/Node 脚本、系统命令。
   - **API（服务接口层）**：外部 RESTful / Web API、HTTP 交互。
   - **MCP（上下文协议层）**：MCP Connector 及其挂载的标准协议工具集。
   - **Plugin（插件层）**：DSH 客户端扩展与平台插件模块。
3. **动态造物自演进 (Dynamic Runtime Generation)**：
   - 当遇到特定输出结构约束（如“10个字以内”、“黑体”、“全中文”、“指定 JSON Schema”）或缺少标准化处理管道时，管家不依赖硬编码，而是**直接动态创建专属 Skill 或执行层脚本**来执行规约。

---

## Workflow (调度与执行工作流)

```mermaid
flowchart TD
    User([用户意图]) --> Butler[DSH 管家 Agent]
    Butler --> Intent[1. 意图拆解与约束识别]

    Intent --> Lane[2. 双流程分流判定 dual-lane-router]
    Lane --> LaneCheck{命中红线 或 加权分 < 3 ?}

    LaneCheck -->|否: 快速流程| FastPath[3. 命中既有技能后直调执行]
    LaneCheck -->|是: 完整流程| NeedCheck{是否需要动态构建执行层?}

    NeedCheck -->|是: 需固定格式或缺工具| Gen[4. 动态造物: 创建规约 Skill / 脚本]
    NeedCheck -->|否: 具备现成工具| Select[4. 匹配已有执行层]

    Gen --> Select
    Select --> Dispatch[5. 统一分发与协同调度]

    subgraph 执行层全矩阵
        Dispatch --> E1[Skill 规范层]
        Dispatch --> E2[Agent 子任务]
        Dispatch --> E3[CLI 终端]
        Dispatch --> E4[API 接口]
        Dispatch --> E5[MCP 协议]
        Dispatch --> E6[Plugin 插件]
    end

    E1 & E2 & E3 & E4 & E5 & E6 --> Audit[6. 管家终审与质量门禁]
    Audit --> CheckPass{符合格式与质量?}
    CheckPass -->|未通过| Retry[内部重试与自愈]
    Retry --> Dispatch
    CheckPass -->|通过| Deliver([最终交付用户])
    FastPath --> Deliver
```

### 1. 意图拆解与约束识别
1. `[probe:regex]` 解析用户输入，提取硬性约束条件（字数、语种、字体风格、输出结构、时效性）。
2. `[probe:exitcode]` 判定所需执行层类别：简单命令行、多模型协同、MCP 外部调用，或强格式化生成。

### 2. 双流程分流判定 (Dual-Lane Routing)
1. `[probe:regex]` 红线匹配（`fastlane-redline-policy`）：删除/清空、发布/部署/推送、需求文档变更、安装外部依赖、批量改动（≥2 文件）任一命中即走完整流程；普通单文件编辑不是红线。
2. `[probe:exitcode]` 调用 `score-task-lane` 计算加权分（只读、单文件、可逆、步骤 ≤3、命中现成技能各计 1 分），`≥ 3` 走快速流程、`< 3` 走完整流程。
3. `[probe:exitcode]` 调用 `verify-lane-decision` 复算；lane 抖动即判定不可信，禁止继续执行。
4. `[probe:regex]` 以 `lane` / `score` / `matched_redlines` / `reason` 四元组呈现判定结论（`dual-lane-router`）。

### 3. 快速流程 (Fast Lane, ≤4 步)
1. `[probe:exitcode]` 意图 → 命中既有技能 → 直接执行 → 结果回报；不动态造物、不派子智能体。
2. `[probe:file]` 快速流程不降低交付质量：仍须返回可核对的执行结果（文件存在且非空，或命令退出码可复现）。

### 4. 动态能力构建与资产编目 (Meta-Creation & Catalog)
1. `[probe:file]` 若输出格式需要长久规约（如“10字内、黑体、中文”），按标准 Skill 目录结构创建，或运行 `python3 skills/dsh-butler/scripts/create_rule_skill.py --name <skill-name> --rules "<rules>"`。
2. `[probe:exitcode]` 运行 `python3 skills/dsh-butler/scripts/sync_catalog.py`，把新增资产收录进 `docs/operations/skill-catalog.json`。
3. `[probe:exitcode]` 过 `atomic-fission-guard` 粒度门禁：任何新步骤若不能绑定四类物理探针之一（length / regex / exitcode / file），必须先递归分裂，禁止带着模糊表述进入实施。
4. `[probe:exitcode]` 过 `catalog-consistency-guard` 口径门禁：技能契约变更后禁止人工手写组装关系表。
5. `[probe:exitcode]` 过 `execution-tree-guard` 结构门禁：非技能层先经 `register-execution-layer` 登记，再重建执行层树并断言六项一致；**集群表一律取自受管区块，禁止手写副本**。
6. `[probe:exitcode]` 过 `anti-pattern-guard` 反例门禁：执行过程事件流不得命中 AP-01~07（死循环 / 无反馈 / 无限重试 / 假完成 / 静默降级 / 预算爆炸 / 播报风暴）；命中即阻断，禁止「记录后继续」。
7. `[probe:exitcode]` 过 `zero-restart-guard` 零重启门禁：变更优先热更，重启必须由「不可热更边界 + 重建命令」双向举证，否则判为不必要重启。
8. `[probe:exitcode]` 过 `decoupling-guard` 解耦门禁：执行层只经契约通信，依赖单向无环；脚本 importlib 加载的技能**必须已写进自身 composition**，共享产物必须显式登记。
9. `[probe:exitcode]` 过 `instance-pool-guard` 实例准入门禁：每个执行层必须有实例安全声明；只有 `safe_multi` 可无锁并发，`needs_lock` 必须带资源键，`single_only` 必须串行。

### 5. 多层协同路由 (Multi-Surface Dispatch)
1. `[probe:exitcode]` 检索入口：调用 `google-style-skill-search-router` 取得 top-K 片段（**禁止直接读整份 `skill-catalog.json`**）。
2. `[probe:exitcode]` 按需加载：经 `on-demand-dispatcher` 只加载选中清单内的技能正文，清单之外一个都不读。
3. `[probe:regex]` 精准映射：在检索结果中按触发词确认最合适的规约与执行 Skill。
4. `[probe:exitcode]` 短平快任务：直调 CLI、API 或单工具。
5. `[probe:exitcode]` 复杂研究或独立模块：使用 `subagent` 派发独立子任务。
6. `[probe:regex]` 结构化规范输出：强制引用已创建的规约 Skill（如 `schema-guard`）。
7. `[probe:exitcode]` 外部技能引入：经 `skill-import-pipeline` 五步（检索 → 审计 → 归一 → 定级挂载 → 门禁）纳入「⑦ 技能引入与演进」集群，禁止绕过审计直接落池。
8. `[probe:exitcode]` **并行派单前过 `parallel-lock-guard`**：先为每个并行任务声明锁集合（资源键），再跑冲突/死锁/超时检测；只有 `parallel_groups` 内的任务可同时发出，锁集合有交集的一律串行。加锁顺序取字典序，超时 300 秒；死循环判定复用 AP-01，禁止另立判据。

### 6. 终审门禁 (Gatekeeper QA)
1. `[probe:file]` 物理落地检查：宣称的文件是否存在且非空。
2. `[probe:exitcode]` 语法校验：Python / JSON / YAML 是否可被解析。
3. `[probe:regex]` 格式规约：是否包含多余解释性套话、字数是否在规定范围内。
4. `[probe:exitcode]` 过 `quantification-guard` 与 `concretization-guard`：交付文本中不得存在未量化的程度词（高/大/快/多…）与未具像化的含糊词（若干/相关/尽快…）；缺失公开基准时须显式声明假设。
5. `[probe:exitcode]` 校验通过方可进入输出环节；未通过则在调度层内就地修复。

### 7. 标准交付输出 (Standardized Deliverable Output)
1. `[probe:regex]` 固定结构：当前状态、输出物、输出地址、重要说明。
2. `[probe:regex]` 动态分支：若无物理产物，抹除“输出地址”，切换为“核心结论”。
3. `[probe:regex]` 说明强相关：重要说明聚焦操作命令与配置依赖，过滤一切客套废话。
4. `[probe:exitcode]` 过程输出里程碑化：执行过程中经 `milestone-progress-reporter` **只报阶段目标**（如「到达长沙」「到达武汉」），微操作折叠为 `×N`，禁止逐条播报「上车 / 下车」级细节。
5. `[probe:exitcode]` 全流程中文：回复、进度、报错、说明一律经 `chinese-output-guard` 断言；剥离代码块、行内码、URL 与路径后，**白名单外拉丁词必须为零**，缩写首现必须给中文全称。
6. `[probe:exitcode]` 一次性解决：默认不提问，不确定项选可回滚默认值自行决断，并随交付给出 `assumptions`（项 / 取值 / 依据 / 回滚方式）；提问仅限「红线 + 不可逆」且每任务 ≤ 1 次。

---

<!-- TREE:BEGIN 受管区块：由 skills/build-execution-tree 自动生成，禁止人工编辑 -->

## 下属编制 (L1~L3 Subordinate Clusters)

管家当前纳管 6 个执行层，其中技能层 182 条（cli 9 / agent 4 / api 0 / mcp 0 / plugin 1）。

完整树见 `docs/operations/execution-tree.md`（唯一真相源，禁止手写副本）。

| 集群 | L3 总控 |
| :--- | :--- |
| ① 意图与路由 | `atomic-fastpath-router`、`dual-lane-router`、`google-style-skill-search-router`、`intent-detector`、`on-demand-dispatcher`、`skill-index-router` |
| ② 契约与合规 | `atomic-fission-guard`、`catalog-consistency-guard`、`decoupling-guard`、`execution-tree-guard`、`full-spectrum-skill-auditor`、`index-body-contract`、`index-header-contract`、`instance-pool-guard`、`layer-naming-guard`、`plugin-control-guard`、`token-economy-guard`、`zero-restart-guard` |
| ③ 冲突·冗余·质量 | `anti-pattern-guard`、`atomic-lock-guard`、`conflict-detector`、`one-shot-guard`、`parallel-lock-guard`、`process-supervisor`、`qa-gatekeeper`、`redundancy-detector` |
| ④ 输出规约 | `chinese-output-guard`、`concise-chinese-bold-guard`、`concretization-guard`、`iconized-output-showcase`、`milestone-progress-reporter`、`quantification-guard`、`schema-guard`、`standard-output-framework`、`tail-metrics-showcase` |
| ⑤ 需求与透视 | `interactive-image-viewer`、`spec-driven-governance`、`visual-interaction-guard`、`visualize-governance-topology` |
| ⑥ 外部纳管 | `github`、`manage-problem-log`、`manage-requirements` |
| ⑦ 技能引入与演进 | `skill-import-pipeline` |

<!-- TREE:END -->

---

## Boundaries & Constraints

- 管家具有最高执行权限，但在执行破坏性系统变更（如清空关键目录、格式化磁盘）前，必须显式遵循系统安全红线。
- 动态创建的执行层必须遵循统一规范（具备 YAML Frontmatter、明确边界与验收机制）。
