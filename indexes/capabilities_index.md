# 全能力层全景索引与双层接口法典 (Comprehensive Capabilities Index & Interface Matrix)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.26.0`
> - **对应实施版本**：`v4.26.0`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **需求依据**：`REQ-051` / `CR-006`（能力层索引与正负案例规格）
> - **生效状态**：`[Release 稳定生效]`

本文档是系统内**五大核心能力层（Plugins / Agents / CLI / MCP / Skills）**的统一全景索引与标准化接口法典。
采用**双层架构**设计：
- **外层：能力索引接口表**：提供名称、定位、核心正向用法、负面反例/踩坑红线；
- **内层：能力实操与集成详情**：提供详细参数、执行指令、调用契约与容错防护。

---

## 🧭 一、五大能力层统一索引接口总表 (外层速查矩阵)

| 类别 | 能力名称 (Identifier) | 大致怎么用 (正向推荐场景) | 负面反例 / 踩坑红线 (When NOT to use) | 详情指引 |
| :--- | :--- | :--- | :--- | :---: |
| **🔌 插件 (Plugin)** | `plugin.ui.conversation` | 用于渲染会话流面板、对话输入框、气泡流与折叠卡片 | **严禁**直接脱离 DSH 打包运行环境使用；不可篡改非幂等 DOM 锚点 | [§二.1](#1-插件层-plugins-实操详情) |
| **🔌 插件 (Plugin)** | `plugin.ui.tool` | 负责渲染文件读写、Bash 执行、进度卡与折叠状态 | **严禁**在前端覆写工具返回数据格式；不可拦截非只读工具卡片 | [§二.1](#1-插件层-plugins-实操详情) |
| **🔌 插件 (Plugin)** | `plugin.control.guard` | 实时计算与常显 G1~G4 四项管控门禁看板 | **严禁**手动篡改缓存报告伪造通过；必须基于磁盘实况推导 | [§二.1](#1-插件层-plugins-实操详情) |
| **🤖 代理 (Agent)** | `agent.task.subagent` | **独立子任务**：无上下文继承，用于独立的审计、搜索、并行调研 | **严禁**在需要继承前文大量对话历史时使用（会导致上下文断流） | [§二.2](#2-智能体与代理层-agents-实操详情) |
| **🤖 代理 (Agent)** | `agent.task.subagent_fork` | **继承式子任务**：完整继承当前上下文，用于后续方案细化与分支评审 | **严禁**用于完全无关的并发耗时查询，避免上下文累赘消耗 Token | [§二.2](#2-智能体与代理层-agents-实操详情) |
| **🤖 代理 (Agent)** | `agent.orchestration.workflow` | **多代理 JS 编排**：利用 pipeline/parallel 对海量文件进行批量巡检与重构 | **严禁**写 TypeScript 代码；严禁在代码中写 `export`；禁止简单单点任务滥用 | [§二.2](#2-智能体与代理层-agents-实操详情) |
| **🤖 代理 (Agent)** | `agent.orchestration.pp` | **单例并发中枢 Agent PP**：全局唯一，负责多任务并发派生与屏障汇聚 | **严禁**同一任务中多次实例化；严禁绕过 PP 擅自并发脏写悬空 | [§二.2](#2-智能体与代理层-agents-实操详情) |
| **🤖 代理 (Agent)** | `agent.workflow.life` | **短生命周期串行 Agent Life(N)**：负责单线串行工序推进，调用完成即消亡 | **严禁**内部随意分叉并发；严禁未向 PP 提交原子回执擅自结束 | [§二.2](#2-智能体与代理层-agents-实操详情) |
| **🤖 代理 (Agent)** | `agent.iterative.ralph` | **全新迭代循环**：长时间长程目标，各轮次全新进程只以工作区文件为记忆 | **严禁**在普通即时会话中未经用户明确要求擅自调用；禁止无退出条件空转 | [§二.2](#2-智能体与代理层-agents-实操详情) |
| **💻 脚本 (CLI)** | `cli.control.gates` | 执行四项门禁检查（`check` 输出面板、`badge` 输出单行徽标） | **严禁**在有未提交代码且超阈值时强行绕过；不可修改判定基线逃避检查 | [§二.3](#3-命令行与脚本工具-cli-实操详情) |
| **💻 脚本 (CLI)** | `cli.task.naming` | 开工首个动作自动/手动规范会话命名：`[分类编号][难度分] 概述` | **严禁**概述超过 8 个汉字；严禁分类字母不在白名单（限 R/F/D/S/O/Q） | [§二.3](#3-命令行与脚本工具-cli-实操详情) |
| **💻 脚本 (CLI)** | `cli.scan.redundancy` | 规则与文档相似度查重，防止重复造轮子 | **严禁**在扫描出高相似块后置之不理强行新增文件；必须合并为演进版本 | [§二.3](#3-命令行与脚本工具-cli-实操详情) |
| **💻 脚本 (CLI)** | `cli.scan.conflict` | 冲突检测，排查同一事实出现两种说法或与元规则矛盾 | **严禁**在检测到冲突时自行取舍；必须出具裁决方案由用户判定 | [§二.3](#3-命令行与脚本工具-cli-实操详情) |
| **💻 脚本 (CLI)** | `cli.scan.legacy_align` | 存量资产对齐与新规范校准扫描（含脚本入驻与接口覆盖） | **严禁**无书面说明强行豁免；待对齐清单未清零禁止关闭任务 | [§二.3](#3-命令行与脚本工具-cli-实操详情) |
| **💻 脚本 (CLI)** | `cli.audit.channel` | 快速通道可用性审计（死链、触发词冲突、自然语言命中） | **严禁**留存死链或未注册别名；退役通道必须及时删行 | [§二.3](#3-命令行与脚本工具-cli-实操详情) |
| **💻 脚本 (CLI)** | `cli.audit.freshness` | 自动检测存量与新增能力的新鲜度、时效性、版本与依赖健康度 | **严禁**忽视失效（BROKEN）警告直接投入生产；禁止跳过探活检查 | [§二.3](#3-命令行与脚本工具-cli-实操详情) |
| **💻 脚本 (CLI)** | `cli.sync.requirements` | 同步主台账与 `ai-control/requirements/` 管控需求与版本 | **严禁**单边修改主台账或专项目录而遗漏另一侧；必须联动同步 | [§二.3](#3-命令行与脚本工具-cli-实操详情) |
| **💻 脚本 (CLI)** | `cli.route.navigate` | 地图式导航路由器与快速入口提取器 | **严禁**在索引未匹配时随意伪造路径；必须基于能力索引与通道大盘 | [§二.3](#3-命令行与脚本工具-cli-实操详情) |
| **💻 脚本 (CLI)** | `cli.sync.git` | 任务收尾远程 Git 强同步与多仓库治理引擎 | **严禁**未完成本地自动化验证即强推远程；严禁无理由 force push | [§二.3](#3-命令行与脚本工具-cli-实操详情) |
| **💻 脚本 (CLI)** | `cli.disk.clean` | 磁盘水位巡检与临时缓存文件安全自愈清理 | **严禁**清理白名单外受管文件；严禁未经确认删除版本库资产 | [§二.3](#3-命令行与脚本工具-cli-实操详情) |
| **💻 脚本 (CLI)** | `cli.lock.scheduler` | 全局资源排他排队防冲突锁中枢管理 | **严禁**长时间占锁不释放；严禁绕过全局锁并发修改核心资产 | [§二.3](#3-命令行与脚本工具-cli-实操详情) |
| **💻 脚本 (CLI)** | `cli.audit.fingerprint` | 全域资产数字指纹扫描与资产台账同步 | **严禁**手动篡改哈希指纹；资产变动必须重新生成指纹回写台账 | [§二.3](#3-命令行与脚本工具-cli-实操详情) |
| **💻 脚本 (CLI)** | `cli.align.version` | 全库受管文档版本号一键批量归位推进器 | **严禁**在缺少需求台账依据时盲目升版；正式写入前须 dry-run 预览 | [§二.3](#3-命令行与脚本工具-cli-实操详情) |
| **🔌 协议 (MCP)** | `mcp.filesystem.local` | 规范受控物理路径读写，沙箱化安全操作指定资产目录 | **严禁**挂载根目录 `/` 或 `~` 用户家目录；禁止绕过沙箱执行全盘扫描 | [§二.4](#4-协议服务层-mcp-servers-实操详情) |
| **🔌 协议 (MCP)** | `mcp.vcs.git` | 深度分析 Git 提交图谱、生成精确 Release Notes、追溯 blame | **严禁**利用 MCP 下发危险破坏性 reset/rebase；严禁无理由强推 | [§二.4](#4-协议服务层-mcp-servers-实操详情) |
| **🔌 协议 (MCP)** | `mcp.context.memory` | 基于知识图谱沉淀跨会话实体关系与业务实体上下文 | **严禁**写入临时性变量或敏感密钥 Token；避免图谱节点无限膨胀 | [§二.4](#4-协议服务层-mcp-servers-实操详情) |
| **🔌 协议 (MCP)** | `mcp.network.fetch` | 抓取外部网页/API 技术文档并自动提取 Markdown 纯文本 | **严禁**用于高频爬取未经授权的受保护站点；不可用于内网嗅探 | [§二.4](#4-协议服务层-mcp-servers-实操详情) |
| **🧠 技能 (Skill)** | `skill.web.frontend` | 专注前端现代框架 (React/Vue/Vite/Tailwind) 架构与组件设计 | **严禁**在无 Web 相关需求的后端或脚本项目中盲目载入 | [§二.5](#5-专属技能层-skills-实操详情) |
| **🧠 技能 (Skill)** | `skill.game.unity` | Unity 渲染管线、HLSL/ShaderLab 编写与材质优化 | **严禁**在非游戏/非 Unity 任务中载入（违反知识库防冲突红线） | [§二.5](#5-专属技能层-skills-实操详情) |
| **🧠 技能 (Skill)** | `skill.architecture.api` | 遵循 RESTful/OpenAPI 规范设计工程化微服务契约与接口 | **严禁**仅给草稿不给字段类型定义；禁止不给错误码和边界约束 | [§二.5](#5-专属技能层-skills-实操详情) |

---

## 🛠️ 二、各能力层实操与集成规格详情 (内层详细手册)

### 1. 插件层 (Plugins) 实操详情
- **核心定位**：深度集成于 DSH 桌面端 Electron/Web 前端渲染管道，直接增强界面交互体验。
- **机制与生效**：
  - 插件通常位于宿主打包资源目录或由 Vite 动态载入；
  - 生产环境下修改前端 bundle 需要遵循非侵入补丁器规范（如 `scripts/patch_dsh_todo_progress.cjs`），确保具备幂等备份、语法自检与回读校验；
  - **刷新生效**：宿主 boot 携带资源哈希，普通前端改动仅需刷新 Web 页面即可生效，无需频繁重启客户端进程。

---

### 2. 智能体与代理层 (Agents) 实操详情
- **`subagent` (独立并发子任务)**：
  - **入参**：`{ description: string, prompt: string, run_in_background?: boolean }`
  - **实操范式**：适用于耗时调研、文档多路检索等。默认后台运行，可同时发起多个。
- **`subagent_fork` (上下文分支继承)**：
  - **入参**：`{ description: string, prompt: string, run_in_background?: boolean }`
  - **实操范式**：适用于基于当前会话事实进行方案深度推演、交叉质检。
- **`workflow` (多代理自动化编排)**：
  - **代码格式**：纯 JavaScript 脚本，通过 `await agent(prompt, opts)` 调度，严禁使用 TS 语法或 Node.js 原生 API。
  - **流水线语法**：`await pipeline(items, async (prev, item) => ...)`。

---

### 3. 命令行与脚本工具 (CLI) 实操详情
- **管控看板运行规范**：
  ```bash
  ./scripts/control_gates.sh check     # 详细量化看板输出
  ./scripts/control_gates.sh badge     # 紧凑型单行进度徽标
  ```
- **自动化命名规范**：
  ```bash
  ./scripts/name_me.sh "[R051][40分] 管控优化文案精简"
  ./scripts/name_me.sh --auto          # 自动推断三段式命名
  ```
- **双检与质量扫描规范**：
  ```bash
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
  node scripts/redundancy_scan.mjs --root .     # 冗余扫描
  node scripts/conflict_scan.mjs --root .       # 冲突扫描
  node scripts/legacy_align_scan.mjs --root .   # 存量对齐扫描
  node scripts/check_freshness.mjs             # 新鲜度自检
  node scripts/sync_control_requirements.mjs   # 需求双向同步
  ```

---

### 4. 协议服务层 (MCP Servers) 实操详情
- **配置文件路径**：用户或项目目录下的 `settings.yaml` 或 MCP 客户端配置中挂载。
- **调用范例**：由 DSH 核心引擎自动反射为可用 Tool，以 `mcp__<server>__<tool>` 形式呈现。
- **治理原则**：遵循“最小权限与沙箱隔离”，涉及数据库查询一律采用 Read-Only 账号。

---

### 5. 专属技能层 (Skills) 实操详情
- **加载机制**：在收到特定领域（如 Unity、前端、算法设计）任务时，通过 `skill({ name: "..." })` 载入完整规范与实战案例。
- **隔离原则**：非目标领域技能绝对不主动载入，严格避免跨领域知识冲突污染。

---

## 📊 三、新能力标准化命名与双层接口生命周期全规约 (Capability Lifecycle & Interface Specification)

任何新获取或新构建的能力（无论是外部工具引入、自研脚本还是智能体派生），必须走完标准化“命名-契约-索引-调度”四步生命周期闭环：

### 1. 新能力唯一命名规范 (Naming Standard)
新能力标识符必须严格遵循分层点分语义命名法，严禁使用非语义缩写：
- **🔌 插件**：`plugin.<domain>.<name>`（例：`plugin.ui.core_card`）；
- **🤖 代理**：`agent.<domain>.<name>`（例：`agent.research.web_asset`）；
- **💻 脚本**：`cli.<domain>.<name>`（例：`cli.asset.fetch_component`）；
- **🌐 协议工具**：`mcp.<provider>.<tool>` 或 `tool.<name>`；
- **🧠 专属技能**：`skill.<domain>.<name>`。

### 2. 标准化双层接口声明契约 (Dual-Layer Interface Contract)
新能力接入必须同时定义两层接口规范：
- **外层：速查索引接口 (Quick Index Interface)**：
  - 必须提供：【标识符】+【大致怎么用（正向推荐场景）】+【负面反例/踩坑红线】；
- **内层：执行交互契约 (Execution Contract)**：
  - **输入契约 (Inputs)**：明确各参数名、类型、必填性、默认值及合法值域；
  - **输出契约 (Outputs)**：明确返回数据结构（如 JSON 结构体、Markdown 卡片或标准化 Exit Code）；
  - **容错与降级保护**：当依赖项不可达或外部环境失效时，必须具备明确的非阻塞降级逻辑。

### 3. 索引入库与通道路由强绑定 (Registration & Route Binding)
1. **能力总表编目**：新能力必须在本文件第一章《五大能力层统一索引接口总表》登记对应条目；
2. **高速通道挂接**：若新能力属于高频核心操作（高频前 20%），必须同步在 [`indexes/shortcuts_index.md`](shortcuts_index.md) 注册 G0/G1 快速通道口令，确保“生成即可被索引、张口即可被调度”；
3. **时效性探针纳管**：新能力接入后必须纳入 `scripts/check_freshness.mjs` 监控范畴，确保时效性与版本健康。

---

<!-- SKILL-POOL-INDEX:BEGIN -->

## 🧰 三、技能池执行层索引（由 `scripts/build_capabilities_index.mjs` 生成，请勿手改）

> 数据源：`skills/`（技能唯一权威源）、`skill-pool/agents`、`skill-pool/plugins`、`skill-pool/docs/cli/commands`、`scripts/`（本工程 CLI）。
> 级别与分类取自真相源 `skill-pool/docs/operations/skill-catalog.json`，并**逐条对拍磁盘**。
> 覆盖率由 `node scripts/build_capabilities_index.mjs --check` 判定，未收录数必须为 0。

**执行层条目总数：246**（技能 178 · 其他执行层 68）
**catalog 分级口径**：L1 43 · L2 96 · L3 43 · L4 1

### 3.0 能力分级与集群（真相源口径）

| 级别 | 分类集群 | 能力标识 | 物理路径 |
| :--- | :--- | :--- | :--- |
| L2 | 工序动作-物理原子锁 | `skill.pool.acquire-atomic-lock` | `skills/acquire-atomic-lock` |
| L3 | 复合流程-反例门禁 | `skill.pool.anti-pattern-guard` | `skills/anti-pattern-guard` |
| L1 | 原子规约-反例清单 | `skill.pool.anti-pattern-policy` | `skills/anti-pattern-policy` |
| L1 | 原子规约-仲裁准则 | `skill.pool.arbitrate-priority-resolver` | `skills/arbitrate-priority-resolver` |
| L2 | 工序动作-退出码断言 | `skill.pool.assert-zero-exitcode` | `skills/assert-zero-exitcode` |
| L3 | 复合流程-快捷路由总控 | `skill.pool.atomic-fastpath-router` | `skills/atomic-fastpath-router` |
| L3 | 复合流程-粒度分裂门禁 | `skill.pool.atomic-fission-guard` | `skills/atomic-fission-guard` |
| L3 | 复合流程-物理原子锁门禁 | `skill.pool.atomic-lock-guard` | `skills/atomic-lock-guard` |
| L1 | 原子规约-物理原子锁 | `skill.pool.atomic-lock-policy` | `skills/atomic-lock-policy` |
| L2 | 工序动作-全量合规审计 | `skill.pool.audit-all-skills-compliance` | `skills/audit-all-skills-compliance` |
| L2 | 工序动作-引入审计 | `skill.pool.audit-imported-skill` | `skills/audit-imported-skill` |
| L2 | 工序动作-命名体检 | `skill.pool.audit-layer-naming` | `skills/audit-layer-naming` |
| L2 | 工序动作-执行层建树 | `skill.pool.build-execution-tree` | `skills/build-execution-tree` |
| L2 | 工序动作-查看器生成 | `skill.pool.build-image-viewer` | `skills/build-image-viewer` |
| L2 | 工序动作-倒排索引 | `skill.pool.build-inverted-index` | `skills/build-inverted-index` |
| L2 | 工序动作-层间依赖图 | `skill.pool.build-layer-graph` | `skills/build-layer-graph` |
| L2 | 工序动作-量化映射表 | `skill.pool.build-quantifier-table` | `skills/build-quantifier-table` |
| L1 | 原子规约-能力层命名 | `skill.pool.capability-naming-policy` | `skills/capability-naming-policy` |
| L3 | 复合流程-口径一致性门禁 | `skill.pool.catalog-consistency-guard` | `skills/catalog-consistency-guard` |
| L2 | 业务定制技能 | `skill.pool.check-deepseek-usage` | `skills/check-deepseek-usage` |
| L2 | 工序动作-语法编译 | `skill.pool.check-python-syntax` | `skills/check-python-syntax` |
| L2 | 工序动作-脚本可执行检测 | `skill.pool.check-script-executable` | `skills/check-script-executable` |
| L1 | 原子规约-全流程中文 | `skill.pool.chinese-end-to-end` | `skills/chinese-end-to-end` |
| L3 | 复合流程-中文输出门禁 | `skill.pool.chinese-output-guard` | `skills/chinese-output-guard` |
| L2 | 工序动作-变更处置判定 | `skill.pool.classify-change-scope` | `skills/classify-change-scope` |
| L2 | 工序动作-决策可逆判定 | `skill.pool.classify-decision-reversibility` | `skills/classify-decision-reversibility` |
| L2 | 工序动作-实例安全分档 | `skill.pool.classify-instance-safety` | `skills/classify-instance-safety` |
| L2 | 工序动作-事件分档 | `skill.pool.classify-step-tier` | `skills/classify-step-tier` |
| L2 | 工序动作-流程取证 | `skill.pool.collect-process-evidence` | `skills/collect-process-evidence` |
| L3 | 复合流程-极简加粗 | `skill.pool.concise-chinese-bold-guard` | `skills/concise-chinese-bold-guard` |
| L1 | 原子规约-简短聚焦 | `skill.pool.concise-focused-output` | `skills/concise-focused-output` |
| L3 | 复合流程-具像化门禁 | `skill.pool.concretization-guard` | `skills/concretization-guard` |
| L1 | 原子规约-含糊具像化 | `skill.pool.concretize-ambiguity-policy` | `skills/concretize-ambiguity-policy` |
| L2 | 工序动作-含糊词具像化 | `skill.pool.concretize-term` | `skills/concretize-term` |
| L1 | 原子规约-分支路由 | `skill.pool.conditional-deliverable-router` | `skills/conditional-deliverable-router` |
| L3 | 复合流程-冲突检测 | `skill.pool.conflict-detector` | `skills/conflict-detector` |
| L2 | 工序动作-锁集合声明 | `skill.pool.declare-lock-set` | `skills/declare-lock-set` |
| L3 | 复合流程-解耦门禁 | `skill.pool.decoupling-guard` | `skills/decoupling-guard` |
| L2 | 工序动作-动词识别 | `skill.pool.detect-action-verb` | `skills/detect-action-verb` |
| L2 | 工序动作-反例检测 | `skill.pool.detect-forbidden-state` | `skills/detect-forbidden-state` |
| L2 | 工序动作-耦合检测 | `skill.pool.detect-layer-coupling` | `skills/detect-layer-coupling` |
| L2 | 工序动作-锁冲突检测 | `skill.pool.detect-lock-conflict` | `skills/detect-lock-conflict` |
| L2 | 工序动作-冲突对拍 | `skill.pool.detect-rule-conflicts` | `skills/detect-rule-conflicts` |
| L2 | 工序动作-实体提取 | `skill.pool.detect-target-entity` | `skills/detect-target-entity` |
| L2 | 工序动作-模糊词检测 | `skill.pool.detect-vague-modifier` | `skills/detect-vague-modifier` |
| L2 | 工序动作-消歧打分 | `skill.pool.disambiguate-candidates` | `skills/disambiguate-candidates` |
| L2 | 工序动作-四源检索调度 | `skill.pool.dispatch-skill-search` | `skills/dispatch-skill-search` |
| L4 | 中枢编排-全局管家 | `skill.pool.dsh-butler` | `skills/dsh-butler` |
| L3 | 复合流程-双流程分流总控 | `skill.pool.dual-lane-router` | `skills/dual-lane-router` |
| L2 | 工序动作-摘要片段 | `skill.pool.emit-search-snippet` | `skills/emit-search-snippet` |
| L1 | 原子规约-粒度物理化 | `skill.pool.enforce-atomic-granularity` | `skills/enforce-atomic-granularity` |
| L1 | 原子规约-契约完整性 | `skill.pool.enforce-contract-completeness` | `skills/enforce-contract-completeness` |
| L2 | 工序动作-编码检测 | `skill.pool.ensure-utf8-encoding` | `skills/ensure-utf8-encoding` |
| L3 | 复合流程-执行层树门禁 | `skill.pool.execution-tree-guard` | `skills/execution-tree-guard` |
| L2 | 工序动作-拓扑提取 | `skill.pool.extract-catalog-topology` | `skills/extract-catalog-topology` |
| L2 | 工序动作-目标提取 | `skill.pool.extract-core-objective` | `skills/extract-core-objective` |
| L2 | 工序动作-数据抽取 | `skill.pool.extract-json-payload` | `skills/extract-json-payload` |
| L1 | 原子规约-快车道红线 | `skill.pool.fastlane-redline-policy` | `skills/fastlane-redline-policy` |
| L1 | 原子规约-快捷路由指引 | `skill.pool.fastpath-dispatch-guide` | `skills/fastpath-dispatch-guide` |
| L1 | 原子规约-噪音过滤 | `skill.pool.filter-conversational-noise` | `skills/filter-conversational-noise` |
| L2 | 工序动作-事件折叠 | `skill.pool.fold-repeated-events` | `skills/fold-repeated-events` |
| L1 | 原子规约-图标尾部 | `skill.pool.format-iconized-tail` | `skills/format-iconized-tail` |
| L1 | 原子规约-状态规范 | `skill.pool.format-status-block` | `skills/format-status-block` |
| L1 | 原子规约-可视化规约 | `skill.pool.format-visual-inspection` | `skills/format-visual-inspection` |
| L1 | 原子规约-可缩放可视化 | `skill.pool.format-zoomable-visual` | `skills/format-zoomable-visual` |
| L3 | 复合流程-全量审计门禁 | `skill.pool.full-spectrum-skill-auditor` | `skills/full-spectrum-skill-auditor` |
| L2 | 工序动作-快捷路由生成 | `skill.pool.generate-fastpath-route` | `skills/generate-fastpath-route` |
| L3 | 复合流程-技能检索总控 | `skill.pool.google-style-skill-search-router` | `skills/google-style-skill-search-router` |
| L1 | 原子规约-说明过滤 | `skill.pool.high-relevance-notes-only` | `skills/high-relevance-notes-only` |
| L3 | 复合流程-图标展示总控 | `skill.pool.iconized-output-showcase` | `skills/iconized-output-showcase` |
| L3 | 复合流程-主体契约 | `skill.pool.index-body-contract` | `skills/index-body-contract` |
| L3 | 复合流程-头部契约 | `skill.pool.index-header-contract` | `skills/index-header-contract` |
| L2 | 工序动作-客户端插件装配 | `skill.pool.install-client-plugin` | `skills/install-client-plugin` |
| L3 | 复合流程-实例准入门禁 | `skill.pool.instance-pool-guard` | `skills/instance-pool-guard` |
| L1 | 原子规约-多实例准入 | `skill.pool.instance-pool-policy` | `skills/instance-pool-policy` |
| L3 | 复合流程-意图检测 | `skill.pool.intent-detector` | `skills/intent-detector` |
| L3 | 复合流程-可缩放查看器总控 | `skill.pool.interactive-image-viewer` | `skills/interactive-image-viewer` |
| L1 | 原子规约-执行层解耦 | `skill.pool.layer-decoupling-policy` | `skills/layer-decoupling-policy` |
| L3 | 复合流程-命名规范门禁 | `skill.pool.layer-naming-guard` | `skills/layer-naming-guard` |
| L1 | 原子规约-按需加载 | `skill.pool.lazy-load-policy` | `skills/lazy-load-policy` |
| L1 | 原子规约-长度基元 | `skill.pool.limit-words-under-10` | `skills/limit-words-under-10` |
| L2 | 工序动作-单契约加载 | `skill.pool.load-skill-contract` | `skills/load-skill-contract` |
| L2 | 工序动作-质量信号 | `skill.pool.log-query-events` | `skills/log-query-events` |
| L1 | 原子规约-排版基元 | `skill.pool.markdown-bold-only` | `skills/markdown-bold-only` |
| L2 | 工序动作-关键词索引 | `skill.pool.match-intent-keywords` | `skills/match-intent-keywords` |
| L2 | 工序动作-路由耗时测算 | `skill.pool.measure-routing-metrics` | `skills/measure-routing-metrics` |
| L2 | 工序动作-token度量 | `skill.pool.measure-token-budget` | `skills/measure-token-budget` |
| L2 | 工序动作-候选去重归一 | `skill.pool.merge-search-candidates` | `skills/merge-search-candidates` |
| L1 | 原子规约-里程碑输出 | `skill.pool.milestone-only-progress` | `skills/milestone-only-progress` |
| L3 | 复合流程-里程碑输出总控 | `skill.pool.milestone-progress-reporter` | `skills/milestone-progress-reporter` |
| L1 | 原子规约-多源检索 | `skill.pool.multi-source-search-policy` | `skills/multi-source-search-policy` |
| L1 | 原子规约-风格基元 | `skill.pool.no-conversational-filler` | `skills/no-conversational-filler` |
| L2 | 工序动作-契约归一 | `skill.pool.normalize-skill-contract` | `skills/normalize-skill-contract` |
| L3 | 复合流程-按需调用总控 | `skill.pool.on-demand-dispatcher` | `skills/on-demand-dispatcher` |
| L3 | 复合流程-一次性解决门禁 | `skill.pool.one-shot-guard` | `skills/one-shot-guard` |
| L1 | 原子规约-一次性解决 | `skill.pool.one-shot-resolution-policy` | `skills/one-shot-resolution-policy` |
| L1 | 原子规约-语言基元 | `skill.pool.output-chinese-only` | `skills/output-chinese-only` |
| L3 | 复合流程-并行锁门禁 | `skill.pool.parallel-lock-guard` | `skills/parallel-lock-guard` |
| L1 | 原子规约-并行调控锁 | `skill.pool.parallel-lock-policy` | `skills/parallel-lock-policy` |
| L2 | 工序动作-查询解析 | `skill.pool.parse-query` | `skills/parse-query` |
| L2 | 工序动作-定级挂载 | `skill.pool.place-skill-into-cluster` | `skills/place-skill-into-cluster` |
| L1 | 原子规约-通俗比喻 | `skill.pool.plain-analogy-explanation` | `skills/plain-analogy-explanation` |
| L2 | 工序动作-分裂规划 | `skill.pool.plan-fission` | `skills/plan-fission` |
| L2 | 工序动作-流程整改 | `skill.pool.plan-process-rectification` | `skills/plan-process-rectification` |
| L3 | 复合流程-插件调控门禁 | `skill.pool.plugin-control-guard` | `skills/plugin-control-guard` |
| L1 | 原子规约-插件调控入口 | `skill.pool.plugin-control-jump-policy` | `skills/plugin-control-jump-policy` |
| L1 | 原子规约-不重启优先 | `skill.pool.prefer-hot-reload-policy` | `skills/prefer-hot-reload-policy` |
| L1 | 原子规约-流程合规 | `skill.pool.process-conformance-policy` | `skills/process-conformance-policy` |
| L3 | 复合流程-流程监督员 | `skill.pool.process-supervisor` | `skills/process-supervisor` |
| L1 | 原子规约-防膨胀 | `skill.pool.prune-bloated-prompts` | `skills/prune-bloated-prompts` |
| L2 | 工序动作-上下文裁剪 | `skill.pool.prune-redundant-context` | `skills/prune-redundant-context` |
| L3 | 复合流程-质量门禁 | `skill.pool.qa-gatekeeper` | `skills/qa-gatekeeper` |
| L3 | 复合流程-量化门禁 | `skill.pool.quantification-guard` | `skills/quantification-guard` |
| L2 | 工序动作-程度词量化 | `skill.pool.quantify-modifier` | `skills/quantify-modifier` |
| L1 | 原子规约-程度词量化 | `skill.pool.quantify-modifier-policy` | `skills/quantify-modifier-policy` |
| L2 | 工序动作-相关度排序 | `skill.pool.rank-skills-bm25` | `skills/rank-skills-bm25` |
| L2 | 工序动作-规范对照仲裁 | `skill.pool.reconcile-knowledge-specs` | `skills/reconcile-knowledge-specs` |
| L2 | 工序动作-假设留痕 | `skill.pool.record-assumptions` | `skills/record-assumptions` |
| L3 | 复合流程-冗余检测 | `skill.pool.redundancy-detector` | `skills/redundancy-detector` |
| L2 | 工序动作-执行层登记 | `skill.pool.register-execution-layer` | `skills/register-execution-layer` |
| L2 | 工序动作-命名整改 | `skill.pool.rename-execution-layer` | `skills/rename-execution-layer` |
| L2 | 工序动作-命名文档渲染 | `skill.pool.render-capability-naming` | `skills/render-capability-naming` |
| L2 | 工序动作-受管区块生成 | `skill.pool.render-catalog-docs` | `skills/render-catalog-docs` |
| L2 | 工序动作-图谱编译 | `skill.pool.render-governance-mermaid` | `skills/render-governance-mermaid` |
| L2 | 工序动作-工作区退役 | `skill.pool.retire-legacy-workspace` | `skills/retire-legacy-workspace` |
| L2 | 工序动作-测试用例门禁 | `skill.pool.run-test-cases-gate` | `skills/run-test-cases-gate` |
| L3 | 复合流程-格式守卫 | `skill.pool.schema-guard` | `skills/schema-guard` |
| L2 | 工序动作-流程打分 | `skill.pool.score-process-conformance` | `skills/score-process-conformance` |
| L2 | 工序动作-分流判定 | `skill.pool.score-task-lane` | `skills/score-task-lane` |
| L2 | 工序动作-重复比对 | `skill.pool.search-duplicate-rules` | `skills/search-duplicate-rules` |
| L2 | 工序动作-外部技能检索 | `skill.pool.search-github-skill` | `skills/search-github-skill` |
| L2 | 工序动作-官网源检索 | `skill.pool.search-official-source` | `skills/search-official-source` |
| L2 | 工序动作-选技清单 | `skill.pool.select-skills-for-task` | `skills/select-skills-for-task` |
| L3 | 复合流程-技能引入管线 | `skill.pool.skill-import-pipeline` | `skills/skill-import-pipeline` |
| L3 | 复合流程-索引控制 | `skill.pool.skill-index-router` | `skills/skill-index-router` |
| L1 | 原子规约-片段回灌 | `skill.pool.snippet-only-recall` | `skills/snippet-only-recall` |
| L3 | 复合流程-规范驱动总控 | `skill.pool.spec-driven-governance` | `skills/spec-driven-governance` |
| L3 | 复合流程-输出总控 | `skill.pool.standard-output-framework` | `skills/standard-output-framework` |
| L1 | 原子规约-场景规范 | `skill.pool.standardize-when-to-use` | `skills/standardize-when-to-use` |
| L1 | 原子规约-SOP规范 | `skill.pool.standardize-workflow-sop` | `skills/standardize-workflow-sop` |
| L1 | 原子规约-结构基元 | `skill.pool.strip-markdown-fence` | `skills/strip-markdown-fence` |
| L2 | 工序动作-非散文剥离 | `skill.pool.strip-non-prose-scope` | `skills/strip-non-prose-scope` |
| L1 | 原子规约-排版基元 | `skill.pool.strip-whitespace-newlines` | `skills/strip-whitespace-newlines` |
| L2 | 工序动作-需求生命周期同步 | `skill.pool.sync-requirements-lifecycle` | `skills/sync-requirements-lifecycle` |
| L3 | 复合流程-量化指标总控 | `skill.pool.tail-metrics-showcase` | `skills/tail-metrics-showcase` |
| L1 | 原子规约-token预算 | `skill.pool.token-budget-policy` | `skills/token-budget-policy` |
| L3 | 复合流程-token门禁 | `skill.pool.token-economy-guard` | `skills/token-economy-guard` |
| L1 | 原子规约-树同步强制 | `skill.pool.tree-update-mandatory` | `skills/tree-update-mandatory` |
| L2 | 工序动作-头部校验 | `skill.pool.validate-header-triggers` | `skills/validate-header-triggers` |
| L2 | 工序动作-图标正则校验 | `skill.pool.validate-icon-syntax` | `skills/validate-icon-syntax` |
| L2 | 工序动作-互斥压测断言 | `skill.pool.verify-atomic-mutual-exclusion` | `skills/verify-atomic-mutual-exclusion` |
| L2 | 工序动作-口径对拍 | `skill.pool.verify-catalog-consistency` | `skills/verify-catalog-consistency` |
| L2 | 工序动作-中文断言 | `skill.pool.verify-chinese-output` | `skills/verify-chinese-output` |
| L2 | 工序动作-具像化断言 | `skill.pool.verify-concretized-output` | `skills/verify-concretized-output` |
| L2 | 工序动作-上下文预算断言 | `skill.pool.verify-context-payload` | `skills/verify-context-payload` |
| L2 | 工序动作-解耦断言 | `skill.pool.verify-decoupling` | `skills/verify-decoupling` |
| L2 | 工序动作-地址探针 | `skill.pool.verify-deliverable-paths` | `skills/verify-deliverable-paths` |
| L2 | 工序动作-契约脚本验证 | `skill.pool.verify-execution-contract` | `skills/verify-execution-contract` |
| L2 | 工序动作-树一致性断言 | `skill.pool.verify-execution-tree` | `skills/verify-execution-tree` |
| L2 | 工序动作-文件探针 | `skill.pool.verify-file-exists` | `skills/verify-file-exists` |
| L2 | 工序动作-实例声明断言 | `skill.pool.verify-instance-safety` | `skills/verify-instance-safety` |
| L2 | 工序动作-交互HTML探针 | `skill.pool.verify-interactive-html` | `skills/verify-interactive-html` |
| L2 | 工序动作-判定复算 | `skill.pool.verify-lane-decision` | `skills/verify-lane-decision` |
| L2 | 工序动作-命名断言 | `skill.pool.verify-layer-naming` | `skills/verify-layer-naming` |
| L2 | 工序动作-流程图语法校验 | `skill.pool.verify-mermaid-syntax` | `skills/verify-mermaid-syntax` |
| L2 | 工序动作-反例零命中断言 | `skill.pool.verify-no-forbidden-event` | `skills/verify-no-forbidden-event` |
| L2 | 工序动作-锁违规断言 | `skill.pool.verify-no-lock-violation` | `skills/verify-no-lock-violation` |
| L2 | 工序动作-反问检测断言 | `skill.pool.verify-no-unnecessary-question` | `skills/verify-no-unnecessary-question` |
| L2 | 工序动作-重启必要性断言 | `skill.pool.verify-no-unnecessary-restart` | `skills/verify-no-unnecessary-restart` |
| L2 | 工序动作-调控按钮断言 | `skill.pool.verify-plugin-control-button` | `skills/verify-plugin-control-button` |
| L2 | 工序动作-进度预算断言 | `skill.pool.verify-progress-budget` | `skills/verify-progress-budget` |
| L2 | 工序动作-量化断言 | `skill.pool.verify-quantified-output` | `skills/verify-quantified-output` |
| L2 | 工序动作-降幅断言 | `skill.pool.verify-token-reduction` | `skills/verify-token-reduction` |
| L2 | 工序动作-退役断言 | `skill.pool.verify-workspace-retirement` | `skills/verify-workspace-retirement` |
| L3 | 复合流程-可视化交互门禁 | `skill.pool.visual-interaction-guard` | `skills/visual-interaction-guard` |
| L3 | 复合流程-可视化透视 | `skill.pool.visualize-governance-topology` | `skills/visualize-governance-topology` |
| L3 | 复合流程-零重启门禁 | `skill.pool.zero-restart-guard` | `skills/zero-restart-guard` |
| L1 | 原子规约-可视化交互 | `skill.pool.zoom-level-policy` | `skills/zoom-level-policy` |

### 3.1 全量执行层速查（含 agent / plugin / cli）

| 层级 | 能力标识 (Identifier) | 物理路径 | 接口声明 | 调用命令 | 简介 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 技能 (Skill) | `skill.pool.acquire-atomic-lock` | `skills/acquire-atomic-lock` | ✅ `skills/acquire-atomic-lock/interface.json` | `skill acquire-atomic-lock` | 工序动作级技能(L2)：基于 mkdir(2) 原子目录的物理锁获取与释放器。锁键经 realpath 归一为绝对路径，持有者记录 pid+start_ticks 防 PID 复用误判，支持 lease/live 两种锁模式与按模式分档的陈 |
| 技能 (Skill) | `skill.pool.anti-pattern-guard` | `skills/anti-pattern-guard` | ✅ `skills/anti-pattern-guard/interface.json` | `skill anti-pattern-guard` | 复合流程级技能(L3)：反例门禁。把「清单 → 检测 → 断言」串成一道"绝不允许发生"的放行门禁，挂载于管家「③ 冲突·冗余·质量」集群，命中反例一律阻断，禁止记录后继续。 |
| 技能 (Skill) | `skill.pool.anti-pattern-policy` | `skills/anti-pattern-policy` | ✅ `skills/anti-pattern-policy/interface.json` | `skill anti-pattern-policy` | 微观原子规约：反例层判定基元。定义系统「绝不允许发生」的七条反例（AP-01 死循环 ~ AP-07 播报风暴）及其物理判据、默认阈值与判定优先级，写不出物理判据的口号一律不得进入本层。 |
| 技能 (Skill) | `skill.pool.arbitrate-priority-resolver` | `skills/arbitrate-priority-resolver` | ✅ `skills/arbitrate-priority-resolver/interface.json` | `skill arbitrate-priority-resolver` | 微观原子规约：优先级仲裁基元。在多条规则发生逻辑冲突时，强制遵循固定优先级决断法则。 |
| 技能 (Skill) | `skill.pool.assert-zero-exitcode` | `skills/assert-zero-exitcode` | ✅ `skills/assert-zero-exitcode/interface.json` | `skill assert-zero-exitcode` | 工序动作级技能：执行命令并硬断言退出码必须为 0，杜绝忽略报错与失败静默。 |
| 技能 (Skill) | `skill.pool.atomic-fastpath-router` | `skills/atomic-fastpath-router` | ✅ `skills/atomic-fastpath-router/interface.json` | `skill atomic-fastpath-router` | 复合流程级技能(L3)：原子级快捷路由总控。当索引命中目标技能后，提供直达原子动作的Shell执行命令与依赖指引，实现毫秒级触达。 |
| 技能 (Skill) | `skill.pool.atomic-fission-guard` | `skills/atomic-fission-guard` | ✅ `skills/atomic-fission-guard/interface.json` | `skill atomic-fission-guard` | 复合流程级技能(L3)：粒度递归分裂门禁。任何管控步骤若不能绑定四类物理探针之一，一律阻断实施并强制向下分裂。 |
| 技能 (Skill) | `skill.pool.atomic-lock-guard` | `skills/atomic-lock-guard` | ✅ `skills/atomic-lock-guard/interface.json` | `skill atomic-lock-guard` | 复合流程级技能(L3)：并发处理原子锁放行门禁。把「口径 → 真获取 → 真并发压测 → 断言」串成一道不可跳步的互斥门禁，挂载于管家「③ 冲突·冗余·质量」集群；放行的唯一合法证据是「持锁段重叠窗口 0 + 无锁对照段看得见并发 + 陈旧 |
| 技能 (Skill) | `skill.pool.atomic-lock-policy` | `skills/atomic-lock-policy` | ✅ `skills/atomic-lock-policy/interface.json` | `skill atomic-lock-policy` | 微观原子规约：并发共享资源的物理原子锁判定基元。钉死七条硬口径——锁载体必须是 mkdir 原子目录或 flock -n 排他文件锁、锁键=归一化绝对资源路径、加锁顺序=字典序、持有者=PID+进程起始时间戳、超时默认 300 秒且超时即失 |
| 技能 (Skill) | `skill.pool.audit-all-skills-compliance` | `skills/audit-all-skills-compliance` | ✅ `skills/audit-all-skills-compliance/interface.json` | `skill audit-all-skills-compliance` | 工序动作级技能：遍历全量存量与增量技能，物理审查其头部场景索引、主体SOP与配套脚本合规性，返回退出码 0/1。 |
| 技能 (Skill) | `skill.pool.audit-imported-skill` | `skills/audit-imported-skill` | ✅ `skills/audit-imported-skill/interface.json` | `skill audit-imported-skill` | 工序动作级技能：对外部引入候选执行许可白名单、来源 URL、脚本可执行面、描述完整性与命名规范体检，逐项 pass/fail 给出理由并返回接受/拒绝裁决。 |
| 技能 (Skill) | `skill.pool.audit-layer-naming` | `skills/audit-layer-naming` | ✅ `skills/audit-layer-naming/interface.json` | `skill audit-layer-naming` | 工序动作级技能(L2)：全量执行层命名体检器。按四要素（归属 / 分类 / 做什么 / 命名）与四种命名形态逐条扫描 catalog、磁盘目录、契约头与执行层登记表，输出带违规码、对象与 file:line 的违规清单；判据实现以 nami |
| 技能 (Skill) | `skill.pool.build-execution-tree` | `skills/build-execution-tree` | ✅ `skills/build-execution-tree/interface.json` | `skill build-execution-tree` | 工序动作级技能：合并 skill-catalog.json 与执行层登记表，生成 execution-tree.json/md 唯一真相源，并把受管集群区块注入 dsh-butler 契约。 |
| 技能 (Skill) | `skill.pool.build-image-viewer` | `skills/build-image-viewer` | ✅ `skills/build-image-viewer/interface.json` | `skill build-image-viewer` | 工序动作级技能：把任意图片以 base64 内联进零依赖单文件 HTML，产出可点击放大、可滚轮缩放、可拖拽平移、可一键复位的交互查看器。 |
| 技能 (Skill) | `skill.pool.build-inverted-index` | `skills/build-inverted-index` | ✅ `skills/build-inverted-index/interface.json` | `skill build-inverted-index` | 工序动作级技能：由 skill-catalog.json 生成倒排索引 skill-index.json（term→文档→字段→词频），并把分词器作为可复用库对外暴露。 |
| 技能 (Skill) | `skill.pool.build-layer-graph` | `skills/build-layer-graph` | ✅ `skills/build-layer-graph/interface.json` | `skill build-layer-graph` | 工序动作级技能：由 skill-catalog.json 与执行层登记表生成层间依赖图 layer-graph.json（节点 / 边 / 层级计数），幂等可重跑。 |
| 技能 (Skill) | `skill.pool.build-quantifier-table` | `skills/build-quantifier-table` | ✅ `skills/build-quantifier-table/interface.json` | `skill build-quantifier-table` | 工序动作级技能(L2)：生成并维护场景量化映射表 docs/operations/quantifier-table.json。内置种子映射不少于 20 条，覆盖高/大/快/多/好/严重/频繁等词且每词至少 3 个场景；每条必须含 term/ |
| 技能 (Skill) | `skill.pool.capability-naming-policy` | `skills/capability-naming-policy` | ✅ `skills/capability-naming-policy/interface.json` | `skill capability-naming-policy` | 微观原子规约：能力层命名判定基元。钉死「归属 / 分类 / 做什么 / 命名」四要素与四种已登记命名形态（动作 / 编排 / 规约 / 厂商边界），规定语法约束、禁词、同义归一、唯一性与改名的六处同步契约；词表与形态的唯一真相源是 docs |
| 技能 (Skill) | `skill.pool.catalog-consistency-guard` | `skills/catalog-consistency-guard` | ✅ `skills/catalog-consistency-guard/interface.json` | `skill catalog-consistency-guard` | 复合流程级技能(L3)：口径一致性门禁。串联受管区块生成与三方对拍，是技能池任何写入动作的前置门禁。 |
| 技能 (Skill) | `skill.pool.check-deepseek-usage` | `skills/check-deepseek-usage` | ✅ `skills/check-deepseek-usage/interface.json` | `skill check-deepseek-usage` | 工序动作级技能(L2)：DeepSeek 用量探针。以北京时间本地判定高峰/空闲时段并算出下次切换倒计时，真实调用官方余额接口取额度，并对官方定价页做 sha256 指纹巡检（每日一次语义）；铁律是「取不到就如实报错，绝不编造余额/时段/指 |
| 技能 (Skill) | `skill.pool.check-python-syntax` | `skills/check-python-syntax` | ✅ `skills/check-python-syntax/interface.json` | `skill check-python-syntax` | 工序动作级技能：对指定的 Python 源码文件执行静态编译语法验证，防止引入 SyntaxError。 |
| 技能 (Skill) | `skill.pool.check-script-executable` | `skills/check-script-executable` | ✅ `skills/check-script-executable/interface.json` | `skill check-script-executable` | 工序动作级技能：物理检测指定技能目录中的配套脚本是否存在且具备可执行权限 (chmod +x)。 |
| 技能 (Skill) | `skill.pool.chinese-end-to-end` | `skills/chinese-end-to-end` | ✅ `skills/chinese-end-to-end/interface.json` | `skill chinese-end-to-end` | 微观原子规约：全流程中文输出。回复正文、进度播报、报错信息、解释说明与脚本注释一律中文；技术标识符与英文缩写保留原文但首现必须紧跟中文释义与中文全称。 |
| 技能 (Skill) | `skill.pool.chinese-output-guard` | `skills/chinese-output-guard` | ✅ `skills/chinese-output-guard/interface.json` | `skill chinese-output-guard` | 复合流程级技能(L3)：全流程中文输出交付前门禁。把「规约 → 剥离 → 断言」串成一道门禁，挂载于管家「④ 输出规约」，代码块与命令原文豁免，白名单外拉丁词零容忍。 |
| 技能 (Skill) | `skill.pool.classify-change-scope` | `skills/classify-change-scope` | ✅ `skills/classify-change-scope/interface.json` | `skill classify-change-scope` | 工序动作级技能(L2)：把一组变更路径逐条判定为 hot_reload / incremental / restart，输出理由与命中的不可热更边界，并给出 no_restart_needed / restart_required 总判定。 |
| 技能 (Skill) | `skill.pool.classify-decision-reversibility` | `skills/classify-decision-reversibility` | ✅ `skills/classify-decision-reversibility/interface.json` | `skill classify-decision-reversibility` | 工序动作级技能(L2)：对每个不确定项确定性判定可逆性与红线归属，输出 decide_now / ask_once、建议默认值与回滚方式。 |
| 技能 (Skill) | `skill.pool.classify-instance-safety` | `skills/classify-instance-safety` | ✅ `skills/classify-instance-safety/interface.json` | `skill classify-instance-safety` | 工序动作级技能：真实扫描执行层脚本，判定 safe_multi / needs_lock / single_only 三档，提取资源键与信号，并可写出实例安全声明表。 |
| 技能 (Skill) | `skill.pool.classify-step-tier` | `skills/classify-step-tier` | ✅ `skills/classify-step-tier/interface.json` | `skill classify-step-tier` | 工序动作级技能(L2)：把一条过程事件确定性判定为 milestone / micro / action 三档之一，并输出 category 归类，作为折叠的前置判据。 |
| 技能 (Skill) | `skill.pool.collect-process-evidence` | `skills/collect-process-evidence` | ✅ `skills/collect-process-evidence/interface.json` | `skill collect-process-evidence` | 工序动作级技能(L2)：流程合规取证器。按 process-spec.json 逐步从证据目录与仓库实况取证，产出证据包；铁律是「没有证据不等于走了这一步」——取不到证据一律记 fail + unverifiable，na 只在该步明确不适 |
| 技能 (Skill) | `skill.pool.concise-chinese-bold-guard` | `skills/concise-chinese-bold-guard` | ✅ `skills/concise-chinese-bold-guard/interface.json` | `skill concise-chinese-bold-guard` | 复合流程级技能(L3)：基于 4 个微观 L1 原子规约叠加而成。强制要求输出文本不超过 10 个字、纯中文、全黑体、零闲聊。 |
| 技能 (Skill) | `skill.pool.concise-focused-output` | `skills/concise-focused-output` | ✅ `skills/concise-focused-output/interface.json` | `skill concise-focused-output` | 微观原子规约：默认简短聚焦输出。在无特定篇幅扩充要求下，压缩篇幅、开门见山、直击要害，杜绝冗长铺垫。 |
| 技能 (Skill) | `skill.pool.concretization-guard` | `skills/concretization-guard` | ✅ `skills/concretization-guard/interface.json` | `skill concretization-guard` | 复合流程级技能(L3)：含糊词具像化交付门禁。把「规约 → 具像化建议 → 断言」串成一道不可跳步的放行门禁，挂载于管家「④ 输出规约」集群；与 quantification-guard 分工为「程度词补数值 / 含糊词补实体与判据」；we |
| 技能 (Skill) | `skill.pool.concretize-ambiguity-policy` | `skills/concretize-ambiguity-policy` | ✅ `skills/concretize-ambiguity-policy/interface.json` | `skill concretize-ambiguity-policy` | 微观原子规约：含糊词具像化判定基元。定义范围含糊、指代含糊、时序含糊三类含糊词与 hedge 缓解词四类判据及其具像化方式（确切数量 + 计数依据 / 具体实体清单 / 触发条件 + 时限 / 可核对判据），并立下「禁止用另一个含糊词替换含 |
| 技能 (Skill) | `skill.pool.concretize-term` | `skills/concretize-term` | ✅ `skills/concretize-term/interface.json` | `skill concretize-term` | 工序动作级技能(L2)：含糊词具像化建议器。从唯一真相源加载含糊词并集 AMBIGUITY_WORDS 与分类函数 classify_word，对每个命中词按 range/reference/timing/hedge 四类产出具像化建议模板 |
| 技能 (Skill) | `skill.pool.conditional-deliverable-router` | `skills/conditional-deliverable-router` | ✅ `skills/conditional-deliverable-router/interface.json` | `skill conditional-deliverable-router` | 微观原子规约：输出框架条件分支裁决。有物理产物时展示输出物与地址；无产物时强制抹除输出地址，转为输出核心结论。 |
| 技能 (Skill) | `skill.pool.conflict-detector` | `skills/conflict-detector` | ✅ `skills/conflict-detector/interface.json` | `skill conflict-detector` | 复合流程级技能(L3)：规则冲突检测与仲裁自愈。检测多技能或多指令间的排他矛盾，给出确定性裁决方案，保障管控稳固有效。 |
| 技能 (Skill) | `skill.pool.declare-lock-set` | `skills/declare-lock-set` | ✅ `skills/declare-lock-set/interface.json` | `skill declare-lock-set` | 工序动作级技能(L2)：为并行任务归一化并排序锁集合（去重 + 字典序），并检测「没有锁却要写」与「锁键非归一化路径」两类静态错误，输出每任务的 locks 与 acquire_order。 |
| 技能 (Skill) | `skill.pool.decoupling-guard` | `skills/decoupling-guard` | ✅ `skills/decoupling-guard/interface.json` | `skill decoupling-guard` | 复合流程级技能(L3)：执行层解耦门禁。任何执行层变更后强制建图、检测并断言五类违规为零，契约外耦合一律阻断。 |
| 技能 (Skill) | `skill.pool.detect-action-verb` | `skills/detect-action-verb` | ✅ `skills/detect-action-verb/interface.json` | `skill detect-action-verb` | 工序动作级技能：单点物理识别并提取语句中的指令动作动词（如创建/生成/校验/修改）。 |
| 技能 (Skill) | `skill.pool.detect-forbidden-state` | `skills/detect-forbidden-state` | ✅ `skills/detect-forbidden-state/interface.json` | `skill detect-forbidden-state` | 工序动作级技能：把事件流（JSONL 或 stdin）逐条判定七条反例，每条反例都有独立可命中的检测分支，命中即给出反例编号、事件 seq 列表与人类可读证据，并按正确性 > 进展 > 可观测 > 成本上报。 |
| 技能 (Skill) | `skill.pool.detect-layer-coupling` | `skills/detect-layer-coupling` | ✅ `skills/detect-layer-coupling/interface.json` | `skill detect-layer-coupling` | 工序动作级技能：按 layer-decoupling-policy 的五类判据真实扫描契约与脚本源码，输出逆向依赖、依赖环、跨层跳跃、隐式耦合与共享可变状态违规。 |
| 技能 (Skill) | `skill.pool.detect-lock-conflict` | `skills/detect-lock-conflict` | ✅ `skills/detect-lock-conflict/interface.json` | `skill detect-lock-conflict` | 工序动作级技能(L2)：对并行任务检测锁冲突（锁集合交集非空）、潜在死锁（等待图成环）与超时未释放（跨度超 timeout_s 或逻辑已超时），并给出必须串行的任务对与可安全并行的分组建议。 |
| 技能 (Skill) | `skill.pool.detect-rule-conflicts` | `skills/detect-rule-conflicts` | ✅ `skills/detect-rule-conflicts/interface.json` | `skill detect-rule-conflicts` | 工序动作级技能：检测规则集中的排他性冲突（如语种互斥、长度上下限倒挂、格式互斥）。 |
| 技能 (Skill) | `skill.pool.detect-target-entity` | `skills/detect-target-entity` | ✅ `skills/detect-target-entity/interface.json` | `skill detect-target-entity` | 工序动作级技能：单点物理提取语句中的核心操作实体（如JSON/文档/代码/文件）。 |
| 技能 (Skill) | `skill.pool.detect-vague-modifier` | `skills/detect-vague-modifier` | ✅ `skills/detect-vague-modifier/interface.json` | `skill detect-vague-modifier` | 工序动作级技能(L2)：扫描文本中的程度类与含糊类词语，输出命中词、类别（degree/ambiguity 与五类细分）、位置、是否已有场景量化映射。本技能内置词表是全仓模糊词表的唯一真相源，DEGREE_WORDS / AMBIGUITY |
| 技能 (Skill) | `skill.pool.disambiguate-candidates` | `skills/disambiguate-candidates` | ✅ `skills/disambiguate-candidates/interface.json` | `skill disambiguate-candidates` | 工序动作级技能：消除候选技能间的调用歧义，根据权重与上下文确定单一首选或互补协同组合。 |
| 技能 (Skill) | `skill.pool.dispatch-skill-search` | `skills/dispatch-skill-search` | ✅ `skills/dispatch-skill-search/interface.json` | `skill dispatch-skill-search` | 工序动作级技能(L2)：四源检索调度器。按「本地优先」硬规则先扫本地技能池 catalog 与已装 DSH 插件，命中即短路且不向任何外部源发起检索并留痕 skipped_sources；未命中才在显式 --allow-network 下外 |
| 技能 (Skill) | `skill.pool.dsh-butler` | `skills/dsh-butler` | ✅ `skills/dsh-butler/interface.json` | `skill dsh-butler` | DSH 全局主控管家(L4 中枢编排级)，统筹调度 L1~L3 全量执行层，支持自底向上按需拼装能力积木与动态造物。 |
| 技能 (Skill) | `skill.pool.dual-lane-router` | `skills/dual-lane-router` | ✅ `skills/dual-lane-router/interface.json` | `skill dual-lane-router` | 复合流程级技能(L3)：完整流程与快速流程双轨总控。先判红线，再算加权分，判定可复算后方可进入执行。 |
| 技能 (Skill) | `skill.pool.emit-search-snippet` | `skills/emit-search-snippet` | ✅ `skills/emit-search-snippet/interface.json` | `skill emit-search-snippet` | 工序动作级技能：为单条检索结果生成 ≤120 字的确定性摘要片段，并对命中词做居中截断。 |
| 技能 (Skill) | `skill.pool.enforce-atomic-granularity` | `skills/enforce-atomic-granularity` | ✅ `skills/enforce-atomic-granularity/interface.json` | `skill enforce-atomic-granularity` | 微观原子规约：强制每个 SOP 步骤声明其绑定的物理探针类型，未声明或声明为非探针表述的步骤一律判定为粒度过粗，必须递归分裂。 |
| 技能 (Skill) | `skill.pool.enforce-contract-completeness` | `skills/enforce-contract-completeness` | ✅ `skills/enforce-contract-completeness/interface.json` | `skill enforce-contract-completeness` | 微观原子规约：技能契约完整性强制要求。所有存量与增量技能必须同时具备Frontmatter元数据、头部场景索引与主体运作SOP。 |
| 技能 (Skill) | `skill.pool.ensure-utf8-encoding` | `skills/ensure-utf8-encoding` | ✅ `skills/ensure-utf8-encoding/interface.json` | `skill ensure-utf8-encoding` | 工序动作级技能：物理检测并断言指定文件是否为合法 UTF-8 编码且无不可读乱码。 |
| 技能 (Skill) | `skill.pool.execution-tree-guard` | `skills/execution-tree-guard` | ✅ `skills/execution-tree-guard/interface.json` | `skill execution-tree-guard` | 复合流程级技能(L3)：执行层树门禁。任何执行层变更后强制重建并断言树与索引一致，手写集群表一律阻断。 |
| 技能 (Skill) | `skill.pool.extract-catalog-topology` | `skills/extract-catalog-topology` | ✅ `skills/extract-catalog-topology/interface.json` | `skill extract-catalog-topology` | 工序动作级技能：物理读取全局 Catalog JSON 数据，提取全量技能节点与其加法依赖拓扑边。 |
| 技能 (Skill) | `skill.pool.extract-core-objective` | `skills/extract-core-objective` | ✅ `skills/extract-core-objective/interface.json` | `skill extract-core-objective` | 工序动作级技能：提取自然语言语句中的核心动宾主干与关键实体目标，输出标准化结构。 |
| 技能 (Skill) | `skill.pool.extract-json-payload` | `skills/extract-json-payload` | ✅ `skills/extract-json-payload/interface.json` | `skill extract-json-payload` | 工序动作级技能：从任意夹杂自然语言的文本中，精准提取并解析出闭合合法的 JSON 负载。 |
| 技能 (Skill) | `skill.pool.fastlane-redline-policy` | `skills/fastlane-redline-policy` | ✅ `skills/fastlane-redline-policy/interface.json` | `skill fastlane-redline-policy` | 微观原子规约：定义强制进入完整流程的不可逆红线清单，并规定红线优先于任何加权分值。 |
| 技能 (Skill) | `skill.pool.fastpath-dispatch-guide` | `skills/fastpath-dispatch-guide` | ✅ `skills/fastpath-dispatch-guide/interface.json` | `skill fastpath-dispatch-guide` | 微观原子规约：规范快捷路由的指引结构，必须包含目标技能ID、级别、直调执行命令与底层原子依赖。 |
| 技能 (Skill) | `skill.pool.filter-conversational-noise` | `skills/filter-conversational-noise` | ✅ `skills/filter-conversational-noise/interface.json` | `skill filter-conversational-noise` | 微观原子规约：过滤用户表达或大模型交流中的语气词、叹词、客套、口癖等纯噪音内容。 |
| 技能 (Skill) | `skill.pool.fold-repeated-events` | `skills/fold-repeated-events` | ✅ `skills/fold-repeated-events/interface.json` | `skill fold-repeated-events` | 工序动作级技能(L2)：把逐条过程事件折叠成里程碑逐条保留、动作按类别计数、微操作汇总为 ×N 的紧凑过程输出。 |
| 技能 (Skill) | `skill.pool.format-iconized-tail` | `skills/format-iconized-tail` | ✅ `skills/format-iconized-tail/interface.json` | `skill format-iconized-tail` | 微观原子规约：强制在最终回复的末尾集中使用特异化图标输出四要素框架，严禁在正文过早打断或散落分布。 |
| 技能 (Skill) | `skill.pool.format-status-block` | `skills/format-status-block` | ✅ `skills/format-status-block/interface.json` | `skill format-status-block` | 微观原子规约：规范输出框架中的“当前状态”板块，必须使用确切状态标记与一句话结论。 |
| 技能 (Skill) | `skill.pool.format-visual-inspection` | `skills/format-visual-inspection` | ✅ `skills/format-visual-inspection/interface.json` | `skill format-visual-inspection` | 微观原子规约：强制可视化透视输出必须包含标准 Mermaid 图表或 GenUI 卡片，严禁仅输出大段无图纯文本。 |
| 技能 (Skill) | `skill.pool.format-zoomable-visual` | `skills/format-zoomable-visual` | ✅ `skills/format-zoomable-visual/interface.json` | `skill format-zoomable-visual` | 微观原子规约：一切可视化产物（图片、图谱、拓扑图、示意图）必须提供「点击放大 + 多级缩放按钮 + 复位 + 下载」四件套交互，严禁只输出静态图；缩放必须走离散档位表（口径见 zoom-level-policy），下载必须三段降级可选存储地 |
| 技能 (Skill) | `skill.pool.full-spectrum-skill-auditor` | `skills/full-spectrum-skill-auditor` | ✅ `skills/full-spectrum-skill-auditor/interface.json` | `skill full-spectrum-skill-auditor` | 复合流程级技能(L3)：全量技能合规自检门禁。在每次更新时穿透审计全量存量与增量技能的Frontmatter元数据、头部场景索引与主体SOP，确保零契约缺失。 |
| 技能 (Skill) | `skill.pool.generate-fastpath-route` | `skills/generate-fastpath-route` | ✅ `skills/generate-fastpath-route/interface.json` | `skill generate-fastpath-route` | 工序动作级技能：接收 Skill ID，秒级提取并返回其直达运行命令、级别属性与原子依赖链。 |
| 技能 (Skill) | `skill.pool.google-style-skill-search-router` | `skills/google-style-skill-search-router` | ✅ `skills/google-style-skill-search-router/interface.json` | `skill google-style-skill-search-router` | 复合流程级技能(L3)：Google 式技能检索总控。进程内组装查询解析、BM25 排序、片段生成与质量日志，只回灌片段不回灌全文。 |
| 技能 (Skill) | `skill.pool.high-relevance-notes-only` | `skills/high-relevance-notes-only` | ✅ `skills/high-relevance-notes-only/interface.json` | `skill high-relevance-notes-only` | 微观原子规约：规范输出框架中的“重要说明”，强制与本次输出物高强绑定，剔除泛泛空话与日常客套。 |
| 技能 (Skill) | `skill.pool.iconized-output-showcase` | `skills/iconized-output-showcase` | ✅ `skills/iconized-output-showcase/interface.json` | `skill iconized-output-showcase` | 复合流程级技能(L3)：尾部集中特异化图标展示总控。将交付输出全部收敛至最终末尾，通过特异化Emoji形成结构化视觉锚点，并通过正则断言保障物理合规。 |
| 技能 (Skill) | `skill.pool.index-body-contract` | `skills/index-body-contract` | ✅ `skills/index-body-contract/interface.json` | `skill index-body-contract` | 复合流程级技能(L3)：索引主体运作契约。细化解耦为SOP流程规范、Mermaid流程图语法物理校验、底层脚本可执行权限物理检测与执行契约完整性验证。 |
| 技能 (Skill) | `skill.pool.index-header-contract` | `skills/index-header-contract` | ✅ `skills/index-header-contract/interface.json` | `skill index-header-contract` | 复合流程级技能(L3)：索引头部契约规约。规范 Skill 的元数据与触发场景，使索引系统能够快速、精准识别适用时机。 |
| 技能 (Skill) | `skill.pool.install-client-plugin` | `skills/install-client-plugin` | ✅ `skills/install-client-plugin/interface.json` | `skill install-client-plugin` | 工序动作级技能(L2)：DSH client 插件幂等装配器。把本仓 plugins/ 下的自建 client 插件构建后复制进指定 profile 的 node_modules，登记 file: 依赖并追加进 dsh.profile.bu |
| 技能 (Skill) | `skill.pool.instance-pool-guard` | `skills/instance-pool-guard` | ✅ `skills/instance-pool-guard/interface.json` | `skill instance-pool-guard` | 复合流程级技能(L3)：实例准入门禁。多实例不是默认允许，必须先分档、再断言，只有 safe_multi 可无锁并发。 |
| 技能 (Skill) | `skill.pool.instance-pool-policy` | `skills/instance-pool-policy` | ✅ `skills/instance-pool-policy/interface.json` | `skill instance-pool-policy` | 微观原子规约：执行层实例可多开，但必须无状态或状态外置到资源键；独占资源必须声明，禁止实例间共享可变全局。 |
| 技能 (Skill) | `skill.pool.intent-detector` | `skills/intent-detector` | ✅ `skills/intent-detector/interface.json` | `skill intent-detector` | 复合流程级技能(L3)：意图识别与噪声过滤。解耦组装了噪音剥离、空白规约、动词判定、实体提取与核心目标提取五项原子能力。 |
| 技能 (Skill) | `skill.pool.interactive-image-viewer` | `skills/interactive-image-viewer` | ✅ `skills/interactive-image-viewer/interface.json` | `skill interactive-image-viewer` | 复合流程级技能(L3)：可缩放可视化总控。把规约、单文件生成器与静态验证探针串成「生成 → 自检 → 交付」端到端流程，确保交付的每一张图片或图谱都真正可点击放大、可缩放复位。 |
| 技能 (Skill) | `skill.pool.layer-decoupling-policy` | `skills/layer-decoupling-policy` | ✅ `skills/layer-decoupling-policy/interface.json` | `skill layer-decoupling-policy` | 微观原子规约：执行层解耦判定基元。规定执行层之间只通过契约（catalog 的 composition 边 + 已声明产物路径）通信，依赖方向只允许 L4→L3→L2→L1 与同层，禁止环与跨层直引内部实现，并给出逆向依赖、依赖环、跨层跳跃 |
| 技能 (Skill) | `skill.pool.layer-naming-guard` | `skills/layer-naming-guard` | ✅ `skills/layer-naming-guard/interface.json` | `skill layer-naming-guard` | 复合流程级技能(L3)：执行层命名规范门禁。把「体检 → 整改 → 断言 → 渲染」串成一道不可跳步的放行门禁，挂载于管家「② 契约与合规」集群；放行的唯一合法证据是「合规率 1.0000 + 旧名悬空引用 0 + 文档与真相源零漂移」三项 |
| 技能 (Skill) | `skill.pool.lazy-load-policy` | `skills/lazy-load-policy` | ✅ `skills/lazy-load-policy/interface.json` | `skill lazy-load-policy` | 微观原子规约：未命中的技能一律不加载；禁止通配读取技能正文，单任务加载技能数不得超过 top-K。 |
| 技能 (Skill) | `skill.pool.limit-words-under-10` | `skills/limit-words-under-10` | ✅ `skills/limit-words-under-10/interface.json` | `skill limit-words-under-10` | 微观原子规约：强制输出严格不超过 10 个字符（含标点符号），杜绝字数膨胀与冗余展开。 |
| 技能 (Skill) | `skill.pool.load-skill-contract` | `skills/load-skill-contract` | ✅ `skills/load-skill-contract/interface.json` | `skill load-skill-contract` | 工序动作级技能：按精确技能 id 加载单个 SKILL.md 正文，拒绝通配与目录递归，并返回字节数与 token 估算。 |
| 技能 (Skill) | `skill.pool.log-query-events` | `skills/log-query-events` | ✅ `skills/log-query-events/interface.json` | `skill log-query-events` | 工序动作级技能：把 query → top-K → 实际选用 追加写入 skill-query-log.jsonl，作为质量信号用于后续触发词修订。 |
| 技能 (Skill) | `skill.pool.markdown-bold-only` | `skills/markdown-bold-only` | ✅ `skills/markdown-bold-only/interface.json` | `skill markdown-bold-only` | 微观原子规约：强制所有正文文本必须包裹在 Markdown 加粗语法（**内容**）中。 |
| 技能 (Skill) | `skill.pool.match-intent-keywords` | `skills/match-intent-keywords` | ✅ `skills/match-intent-keywords/interface.json` | `skill match-intent-keywords` | 工序动作级技能：在全局 Skill Catalog 中执行倒排关键词与触发标签匹配，快速筛选初筛候选技能。 |
| 技能 (Skill) | `skill.pool.measure-routing-metrics` | `skills/measure-routing-metrics` | ✅ `skills/measure-routing-metrics/interface.json` | `skill measure-routing-metrics` | 工序动作级技能：物理测算索引匹配与路由检索的命中技能及执行耗时（毫秒级 ms），提供量化优化指标。 |
| 技能 (Skill) | `skill.pool.measure-token-budget` | `skills/measure-token-budget` | ✅ `skills/measure-token-budget/interface.json` | `skill measure-token-budget` | 工序动作级技能：用唯一确定性公式物理测算文本与文件的 token 占用，并按技能契约 / README / Catalog / docs / 其他五个分区汇总，为裁剪与门禁提供可复算基线。 |
| 技能 (Skill) | `skill.pool.merge-search-candidates` | `skills/merge-search-candidates` | ✅ `skills/merge-search-candidates/interface.json` | `skill merge-search-candidates` | 工序动作级技能(L2)：多源候选去重归一器。把四类源的候选合并成同一六字段契约，按「URL 归一 → 名称归一」两级去重，按 stars→name→url 全序排序；剔除字段缺失的候选并计入 skipped_incomplete，合并后为空 |
| 技能 (Skill) | `skill.pool.milestone-only-progress` | `skills/milestone-only-progress` | ✅ `skills/milestone-only-progress/interface.json` | `skill milestone-only-progress` | 微观原子规约：过程输出只报阶段目标（如从惠州去北京只报「到达长沙」「到达武汉」），严禁输出「上车」「下车」这类高度重复的微操作；同类微操作一律折叠为 ×N。 |
| 技能 (Skill) | `skill.pool.milestone-progress-reporter` | `skills/milestone-progress-reporter` | ✅ `skills/milestone-progress-reporter/interface.json` | `skill milestone-progress-reporter` | 复合流程级技能(L3)：过程输出里程碑化总控。把「分档 → 折叠 → 预算断言」串成一条流水线，挂载于管家「④ 输出规约」集群，保证里程碑只增不删、微操作只折叠不静默丢弃。 |
| 技能 (Skill) | `skill.pool.multi-source-search-policy` | `skills/multi-source-search-policy` | ✅ `skills/multi-source-search-policy/interface.json` | `skill multi-source-search-policy` | 微观原子规约：执行层检索源判定基元。钉死四类源（本地 / GitHub / 官网 / awesome 清单）与「本地优先」硬规则、统一候选六字段契约、中英同义桥、以及「检索失败绝不等同于没找到」的诚实口径；规定官网源必须走站点自声明 sit |
| 技能 (Skill) | `skill.pool.no-conversational-filler` | `skills/no-conversational-filler` | ✅ `skills/no-conversational-filler/interface.json` | `skill no-conversational-filler` | 微观原子规约：严禁任何开场白、问候客套、总结废话或承接虚词，直接输出核心内容。 |
| 技能 (Skill) | `skill.pool.normalize-skill-contract` | `skills/normalize-skill-contract` | ✅ `skills/normalize-skill-contract/interface.json` | `skill normalize-skill-contract` | 工序动作级技能：把外部引入技能改造为本池统一契约，在 skills/<name>/ 下幂等生成含 YAML Frontmatter、场景索引、Mermaid SOP 与探针步骤的 SKILL.md 与 README.md。 |
| 技能 (Skill) | `skill.pool.on-demand-dispatcher` | `skills/on-demand-dispatcher` | ✅ `skills/on-demand-dispatcher/interface.json` | `skill on-demand-dispatcher` | 复合流程级技能(L3)：按需调用总控。先选技、再逐个加载、最后做预算断言，清单之外的技能一个都不读。 |
| 技能 (Skill) | `skill.pool.one-shot-guard` | `skills/one-shot-guard` | ✅ `skills/one-shot-guard/interface.json` | `skill one-shot-guard` | 复合流程级技能(L3)：一次性解决门禁。把「判定 → 决断 → 留痕 → 反问检测」串成一道派单前/交付前门禁，挂载于管家「③ 冲突·冗余·质量」集群。 |
| 技能 (Skill) | `skill.pool.one-shot-resolution-policy` | `skills/one-shot-resolution-policy` | ✅ `skills/one-shot-resolution-policy/interface.json` | `skill one-shot-resolution-policy` | 微观原子规约：默认不提问，不确定项选自决可回滚默认值并强制假设留痕，仅「红线 + 不可逆」允许每任务一次批量提问。 |
| 技能 (Skill) | `skill.pool.output-chinese-only` | `skills/output-chinese-only` | ✅ `skills/output-chinese-only/interface.json` | `skill output-chinese-only` | 微观原子规约：强制输出纯正中文，严禁非必要的英文单词、拼音或中英混杂，消灭跨语种表达的随机性。 |
| 技能 (Skill) | `skill.pool.parallel-lock-guard` | `skills/parallel-lock-guard` | ✅ `skills/parallel-lock-guard/interface.json` | `skill parallel-lock-guard` | 复合流程级技能(L3)：并行任务调控锁派单前门禁。把「声明 → 冲突/死锁检测 → 断言」串成一道不可跳步的放行门禁，挂载于管家「③ 冲突·冗余·质量」集群；并行的前置条件是先证明可并行（parallel_groups 非空且冲突为零），死 |
| 技能 (Skill) | `skill.pool.parallel-lock-policy` | `skills/parallel-lock-policy` | ✅ `skills/parallel-lock-policy/interface.json` | `skill parallel-lock-policy` | 微观原子规约：并行任务调控锁的判定基元。钉死四条硬口径——锁粒度=共享资源键、加锁顺序=字典序固定顺序、超时默认 300 秒且超时即失败释放、死循环判定复用 anti-pattern-policy 的 AP-01；无锁共享写为明确禁止项。 |
| 技能 (Skill) | `skill.pool.parse-query` | `skills/parse-query` | ✅ `skills/parse-query/interface.json` | `skill parse-query` | 工序动作级技能：查询解析——归一化、分词、停用词剔除、同义词扩展与 ASCII 拼写纠错，输出可排序的 term 列表。 |
| 技能 (Skill) | `skill.pool.place-skill-into-cluster` | `skills/place-skill-into-cluster` | ✅ `skills/place-skill-into-cluster/interface.json` | `skill place-skill-into-cluster` | 工序动作级技能：依据级别与触发关键词判定引入技能的集群归属与建议父级，校验 composition 依赖边是否都真实存在于 catalog，只输出建议不写任何文件。 |
| 技能 (Skill) | `skill.pool.plain-analogy-explanation` | `skills/plain-analogy-explanation` | ✅ `skills/plain-analogy-explanation/interface.json` | `skill plain-analogy-explanation` | 微观原子规约：通俗生活化原理解释与技术细节静默。用普通人听得懂的日常原理阐述，用户未主动提问时绝对不展开底层代码技术细节。 |
| 技能 (Skill) | `skill.pool.plan-fission` | `skills/plan-fission` | ✅ `skills/plan-fission/interface.json` | `skill plan-fission` | 工序动作级技能：读取 SOP 或技能主体，逐步骤判定探针绑定情况，输出结构化分裂清单（待拆步骤、建议级别、建议探针、建议父级）。 |
| 技能 (Skill) | `skill.pool.plan-process-rectification` | `skills/plan-process-rectification` | ✅ `skills/plan-process-rectification/interface.json` | `skill plan-process-rectification` | 工序动作级技能(L2)：流程整改清单生成器。对每个 fail 步骤产出可直接执行的整改命令与理由；整改项为空或含「加强/重视/注意/尽快」等空话的一律判不合格（exit 1）；required 失败的项单独标出；返回退出码 0/1/2。 |
| 技能 (Skill) | `skill.pool.plugin-control-guard` | `skills/plugin-control-guard` | ✅ `skills/plugin-control-guard/interface.json` | `skill plugin-control-guard` | 复合流程级技能(L3)：插件常显调控按钮放行门禁。把「契约 → 装配 → 断言」串成一道不可跳步的门禁，挂载于管家「② 契约与合规」集群；放行的唯一合法证据是「包结构符合宿主 client 插件契约 + 注入内核运行时 31 项断言全过 + |
| 技能 (Skill) | `skill.pool.plugin-control-jump-policy` | `skills/plugin-control-jump-policy` | ✅ `skills/plugin-control-jump-policy/interface.json` | `skill plugin-control-jump-policy` | 微观原子规约：插件常显调控按钮判定基元。钉死按钮的唯一标识（data-control-jump="<plugin-id>"）、常显位置（市场已安装列表与宿主插件清单的每个条目）、点击语义（定位到同 id 的配置项并高亮）、幂等去重键（容器\| |
| 技能 (Skill) | `skill.pool.prefer-hot-reload-policy` | `skills/prefer-hot-reload-policy` | ✅ `skills/prefer-hot-reload-policy/interface.json` | `skill prefer-hot-reload-policy` | 微观原子规约：能不重启就不重启。定义 hot_reload（热更）/ incremental（增量重载）/ restart（重启）三级处置与最长前缀判定表，只有命中「不可热更边界」白名单才允许重启，且必须同时给出「路径 + 边界 + 重建命 |
| 技能 (Skill) | `skill.pool.process-conformance-policy` | `skills/process-conformance-policy` | ✅ `skills/process-conformance-policy/interface.json` | `skill process-conformance-policy` | 微观原子规约：流程合规判定基元。钉死「约定流程必须是可打分的机器可读数据」这一前提，规定九步流程各自必须绑定四类物理探针之一、权重合计 100、必需项一票否决、na 第三态（权重从分母扣除且不得当 pass）、以及「没有证据不等于走了这一步 |
| 技能 (Skill) | `skill.pool.process-supervisor` | `skills/process-supervisor` | ✅ `skills/process-supervisor/interface.json` | `skill process-supervisor` | 复合流程级技能(L3)：流程监督员。把「取证 → 打分 → 整改 → 独立复核」串成一道不可跳步的出口门禁，挂载于管家「③ 冲突·冗余·质量」集群；放行的唯一合法证据是「得分 ≥ 85 且全部必需项 pass 且整改清单无 unresolv |
| 技能 (Skill) | `skill.pool.prune-bloated-prompts` | `skills/prune-bloated-prompts` | ✅ `skills/prune-bloated-prompts/interface.json` | `skill prune-bloated-prompts` | 微观原子规约：防膨胀裁剪。禁止在提示词或机制中加入等价/重复语句，保持指令极致紧凑。 |
| 技能 (Skill) | `skill.pool.prune-redundant-context` | `skills/prune-redundant-context` | ✅ `skills/prune-redundant-context/interface.json` | `skill prune-redundant-context` | 工序动作级技能：以保守语义无损规则折叠连续重复行、重复段落与连续空行，同时逐字节保护 CATALOG 受管区块与 docs/requirements 编号表格行，输出裁剪前后 token 账。 |
| 技能 (Skill) | `skill.pool.qa-gatekeeper` | `skills/qa-gatekeeper` | ✅ `skills/qa-gatekeeper/interface.json` | `skill qa-gatekeeper` | 复合流程级技能(L3)：交付门禁与质量守卫。解耦组装了物理落地检测、Python编译验证、UTF-8编码断言与退出码硬断言。 |
| 技能 (Skill) | `skill.pool.quantification-guard` | `skills/quantification-guard` | ✅ `skills/quantification-guard/interface.json` | `skill quantification-guard` | 复合流程级技能(L3)：量化交付门禁。把「规约 → 建表 → 检测 → 量化 → 断言」串成一道出口门禁，挂载于管家「④ 输出规约」集群；缺失映射不阻断但必须声明假设，禁止用另一个程度词替换程度词糊过去。 |
| 技能 (Skill) | `skill.pool.quantify-modifier` | `skills/quantify-modifier` | ✅ `skills/quantify-modifier/interface.json` | `skill quantify-modifier` | 工序动作级技能(L2)：按场景把程度类修饰词替换为可判定的数值区间。命中且有 (term, domain) 映射时产出「保留原词 + → 数值 单位（依据：…）」的建议；无映射或场景未声明时落 unquantifiable 并要求显式声明假 |
| 技能 (Skill) | `skill.pool.quantify-modifier-policy` | `skills/quantify-modifier-policy` | ✅ `skills/quantify-modifier-policy/interface.json` | `skill quantify-modifier-policy` | 微观原子规约：程度类修饰词的量化判定基元。定义「高/大/快/多/好/严重/频繁/明显/显著…」清单、四要素（场景 + 数值或区间 + 单位 + 依据）规约、场景优先原则、不可量化的处置（声明假设而非沉默）与「禁止用另一个程度词替换程度词」禁 |
| 技能 (Skill) | `skill.pool.rank-skills-bm25` | `skills/rank-skills-bm25` | ✅ `skills/rank-skills-bm25/interface.json` | `skill rank-skills-bm25` | 工序动作级技能：对技能倒排索引执行 BM25 排序（字段权重 + 文档长度归一），支持 top-K、分页与命中率评测。 |
| 技能 (Skill) | `skill.pool.reconcile-knowledge-specs` | `skills/reconcile-knowledge-specs` | ✅ `skills/reconcile-knowledge-specs/interface.json` | `skill reconcile-knowledge-specs` | 工序动作级技能：遍历 7 大知识库规范并对拍冲突，强制裁定知识库规范为绝对最高执行基准。 |
| 技能 (Skill) | `skill.pool.record-assumptions` | `skills/record-assumptions` | ✅ `skills/record-assumptions/interface.json` | `skill record-assumptions` | 工序动作级技能(L2)：把自行决断的项写成可追溯假设四元组（项/取值/依据/回滚方式），缺依据或回滚方式即阻断。 |
| 技能 (Skill) | `skill.pool.redundancy-detector` | `skills/redundancy-detector` | ✅ `skills/redundancy-detector/interface.json` | `skill redundancy-detector` | 复合流程级技能(L3)：冗余检测与防机制膨胀。检测管控规则中的重复与重叠，输出去重与裁剪方案，确保机制简洁高效。 |
| 技能 (Skill) | `skill.pool.register-execution-layer` | `skills/register-execution-layer` | ✅ `skills/register-execution-layer/interface.json` | `skill register-execution-layer` | 工序动作级技能：登记与维护非技能执行层条目（cli/agent/api/mcp/plugin），校验层名合法、仓库内路径存在、id 唯一，幂等可重跑。 |
| 技能 (Skill) | `skill.pool.rename-execution-layer` | `skills/rename-execution-layer` | ✅ `skills/rename-execution-layer/interface.json` | `skill rename-execution-layer` | 工序动作级技能(L2)：执行层命名整改器。一次改名同步六处（目录名 / catalog id / Frontmatter name / 组装边 / 树与索引五件产物 / docs 与登记表），配套脚本同名改写，改前校验目标名合法性、改后自动 |
| 技能 (Skill) | `skill.pool.render-capability-naming` | `skills/render-capability-naming` | ✅ `skills/render-capability-naming/interface.json` | `skill render-capability-naming` | 工序动作级技能(L2)：能力层命名规范文档渲染器。把 docs/operations/capability-naming.json 单向渲染成本仓文档与全局规则知识库文档两份受管区块，规则表全部由真相源生成、禁止人工双写；知识库路径按合并前 |
| 技能 (Skill) | `skill.pool.render-catalog-docs` | `skills/render-catalog-docs` | ✅ `skills/render-catalog-docs/interface.json` | `skill render-catalog-docs` | 工序动作级技能：读取 skill-catalog.json，把组装关系注入 docs 的受管区块，取消人工手写组装表，支持幂等重跑与 --check 漂移检测。 |
| 技能 (Skill) | `skill.pool.render-governance-mermaid` | `skills/render-governance-mermaid` | ✅ `skills/render-governance-mermaid/interface.json` | `skill render-governance-mermaid` | 工序动作级技能：将拓扑数据物理编译为合规的 Mermaid 语法代码，支持调度链路图与全景拓扑图渲染。 |
| 技能 (Skill) | `skill.pool.retire-legacy-workspace` | `skills/retire-legacy-workspace` | ✅ `skills/retire-legacy-workspace/interface.json` | `skill retire-legacy-workspace` | 工序动作级技能(L2)：旧工作区退役器。把「已合并但还活着」的源目录真正退场——先断言不丢文件（源侧独有文件数为 0）、目标已入库、会话已完整归入，再写台账、摘除 workspace.json 条目、物理删除源目录；强制「先摘注册再删目录」 |
| 技能 (Skill) | `skill.pool.run-test-cases-gate` | `skills/run-test-cases-gate` | ✅ `skills/run-test-cases-gate/interface.json` | `skill run-test-cases-gate` | 工序动作级技能：对照需求规格执行自动化测试案例脚本，所有用例全部通过方可放行验收。 |
| 技能 (Skill) | `skill.pool.schema-guard` | `skills/schema-guard` | ✅ `skills/schema-guard/interface.json` | `skill schema-guard` | 复合流程级技能(L3)：基于 L1 零闲聊、L1 去围栏与 L2 JSON提取叠加组装而成。保证严格结构化纯净输出。 |
| 技能 (Skill) | `skill.pool.score-process-conformance` | `skills/score-process-conformance` | ✅ `skills/score-process-conformance/interface.json` | `skill score-process-conformance` | 工序动作级技能(L2)：流程合规打分器。按权重计算分子与分母（na 权重从分母扣除），输出逐项 pass/fail/na 与得分；通过条件为得分 ≥ 85 且全部必需项 pass（必需项一票否决）；输出必须打印分子/分母/na 扣除项，禁止 |
| 技能 (Skill) | `skill.pool.score-task-lane` | `skills/score-task-lane` | ✅ `skills/score-task-lane/interface.json` | `skill score-task-lane` | 工序动作级技能：对任务做确定性双流程分流判定，输出 lane、score、matched_redlines 与 reason 四元组。 |
| 技能 (Skill) | `skill.pool.search-duplicate-rules` | `skills/search-duplicate-rules` | ✅ `skills/search-duplicate-rules/interface.json` | `skill search-duplicate-rules` | 工序动作级技能：计算两条或多条文本规则之间的词频重叠度，精准定位重复与高冗余规则。 |
| 技能 (Skill) | `skill.pool.search-github-skill` | `skills/search-github-skill` | ✅ `skills/search-github-skill/interface.json` | `skill search-github-skill` | 工序动作级技能：按能力关键词检索 GitHub 外部技能/插件候选，把结果归一为标准结构化候选清单 JSON（名称、URL、星标、许可、是否含脚本、描述）。 |
| 技能 (Skill) | `skill.pool.search-official-source` | `skills/search-official-source` | ✅ `skills/search-official-source/interface.json` | `skill search-official-source` | 工序动作级技能(L2)：官网 / 官方文档源检索器。从官方站点自声明的 sitemap 中按关键词检索可用执行层入口，产出统一六字段候选；只读、只用标准库、不携带凭据；支持 --from-file 读本地夹具做离线回归，全部域名不可达时显式 |
| 技能 (Skill) | `skill.pool.select-skills-for-task` | `skills/select-skills-for-task` | ✅ `skills/select-skills-for-task/interface.json` | `skill select-skills-for-task` | 工序动作级技能：由一个任务描述产出受 top-K 约束的选中技能 id 清单，只读检索结果、绝不读取技能正文。 |
| 技能 (Skill) | `skill.pool.skill-import-pipeline` | `skills/skill-import-pipeline` | ✅ `skills/skill-import-pipeline/interface.json` | `skill skill-import-pipeline` | 复合流程级技能(L3)：外部执行层引入管线总控。五步串联检索→审计→归一→定级挂载→门禁验证，落点新集群「⑦ 技能引入与演进」；检索步自 PKG-008 起绑脚本探针（四源调度：本地优先 / GitHub / 官网 / awesome 清单 |
| 技能 (Skill) | `skill.pool.skill-index-router` | `skills/skill-index-router` | ✅ `skills/skill-index-router/interface.json` | `skill skill-index-router` | 复合流程级技能(L3)：索引控制与消歧路由。控制全局 Catalog 索引寻址，消灭调用歧义，确保极速精准命中。 |
| 技能 (Skill) | `skill.pool.snippet-only-recall` | `skills/snippet-only-recall` | ✅ `skills/snippet-only-recall/interface.json` | `skill snippet-only-recall` | 微观原子规约：检索结果只允许回灌命中片段与元数据，严禁把 catalog 或技能正文整体灌回上下文。 |
| 技能 (Skill) | `skill.pool.spec-driven-governance` | `skills/spec-driven-governance` | ✅ `skills/spec-driven-governance/interface.json` | `skill spec-driven-governance` | 复合流程级技能(L3)：需求驱动执行与规范仲裁总控。强制任务严格从需求图纸出发，全程对照知识库7大规范（冲突以规范为准），并通过自动化测试用例方可验收交付。 |
| 技能 (Skill) | `skill.pool.standard-output-framework` | `skills/standard-output-framework` | ✅ `skills/standard-output-framework/interface.json` | `skill standard-output-framework` | 复合流程级技能(L3)：交付输出框架标准化总控。强制最终答复统一遵循“当前状态、输出物、输出地址、重要说明”，无产物时自动剔除输出地址转为核心结论。 |
| 技能 (Skill) | `skill.pool.standardize-when-to-use` | `skills/standardize-when-to-use` | ✅ `skills/standardize-when-to-use/interface.json` | `skill standardize-when-to-use` | 微观原子规约：标准化触发场景说明。强制包含明确的正面触发条件与触发禁区，方便索引快速识破。 |
| 技能 (Skill) | `skill.pool.standardize-workflow-sop` | `skills/standardize-workflow-sop` | ✅ `skills/standardize-workflow-sop/interface.json` | `skill standardize-workflow-sop` | 微观原子规约：标准化主体运作 SOP。强制正文必须具备清晰的 Mermaid 流程图与有序执行步骤。 |
| 技能 (Skill) | `skill.pool.strip-markdown-fence` | `skills/strip-markdown-fence` | ✅ `skills/strip-markdown-fence/interface.json` | `skill strip-markdown-fence` | 微观原子规约：强制输出纯净原生文本，绝对禁止包裹任何 ``` 代码围栏。 |
| 技能 (Skill) | `skill.pool.strip-non-prose-scope` | `skills/strip-non-prose-scope` | ✅ `skills/strip-non-prose-scope/interface.json` | `skill strip-non-prose-scope` | 工序动作级技能(L2)：按固定顺序剥离四类非散文成分（围栏代码块、行内代码、URL、文件路径），产出「待检正文」与白名单命中，供中文占比断言使用。 |
| 技能 (Skill) | `skill.pool.strip-whitespace-newlines` | `skills/strip-whitespace-newlines` | ✅ `skills/strip-whitespace-newlines/interface.json` | `skill strip-whitespace-newlines` | 微观原子规约：严格剥离文本首尾与多余的连续空白字符、制表符及空行，实现物理对齐。 |
| 技能 (Skill) | `skill.pool.sync-requirements-lifecycle` | `skills/sync-requirements-lifecycle` | ✅ `skills/sync-requirements-lifecycle/interface.json` | `skill sync-requirements-lifecycle` | 工序动作级技能：物理检查并同步 requirements 需求生命周期版本，确保任务严格从最新图纸出发。 |
| 技能 (Skill) | `skill.pool.tail-metrics-showcase` | `skills/tail-metrics-showcase` | ✅ `skills/tail-metrics-showcase/interface.json` | `skill tail-metrics-showcase` | 复合流程级技能(L3)：尾部量化指标与通俗表达总控。实现输出纯中文、默认极简聚焦、通俗生活常识比喻，并在尾部展示索引命中与路由时长量化指标。 |
| 技能 (Skill) | `skill.pool.token-budget-policy` | `skills/token-budget-policy` | ✅ `skills/token-budget-policy/interface.json` | `skill token-budget-policy` | 微观原子规约：定义上下文预算优先级（索引/检索片段 > 选中技能正文 > 参考文档）与超预算裁剪顺序，规定索引与检索片段永不裁剪、README 不进上下文、docs 长文仅以片段入上下文。 |
| 技能 (Skill) | `skill.pool.token-economy-guard` | `skills/token-economy-guard` | ✅ `skills/token-economy-guard/interface.json` | `skill token-economy-guard` | 复合流程级技能(L3)：token 经济门禁。把「先测 → 裁剪 → 等价能力断言」串成一道写入前置门禁，挂载于管家「② 契约与合规」集群，证据串不存活即阻断。 |
| 技能 (Skill) | `skill.pool.tree-update-mandatory` | `skills/tree-update-mandatory` | ✅ `skills/tree-update-mandatory/interface.json` | `skill tree-update-mandatory` | 微观原子规约：任何执行层（skill/agent/api/mcp/plugin/cli）新增或优化后，必须同步刷新索引与执行层树，禁止只改能力不改树。 |
| 技能 (Skill) | `skill.pool.validate-header-triggers` | `skills/validate-header-triggers` | ✅ `skills/validate-header-triggers/interface.json` | `skill validate-header-triggers` | 工序动作级技能：静态校验 Skill 的 YAML Frontmatter 元数据与触发关键词覆盖度。 |
| 技能 (Skill) | `skill.pool.validate-icon-syntax` | `skills/validate-icon-syntax` | ✅ `skills/validate-icon-syntax/interface.json` | `skill validate-icon-syntax` | 工序动作级技能：通过正则表达式物理断言输出文案的尾部是否包含合规的特异化图标框架。 |
| 技能 (Skill) | `skill.pool.verify-atomic-mutual-exclusion` | `skills/verify-atomic-mutual-exclusion` | ✅ `skills/verify-atomic-mutual-exclusion/interface.json` | `skill verify-atomic-mutual-exclusion` | 工序动作级技能(L2)：原子锁互斥性物理压测断言器。真实拉起 N 个独立进程并发抢同一把 mkdir 原子锁，采集临界区进入/退出时间戳做扫描线，断言重叠窗口为 0 且任一瞬间持有者 ≤ 1；同时跑无锁负向对照段证明检测器确实能看见并发（否 |
| 技能 (Skill) | `skill.pool.verify-catalog-consistency` | `skills/verify-catalog-consistency` | ✅ `skills/verify-catalog-consistency/interface.json` | `skill verify-catalog-consistency` | 工序动作级技能：三方对拍 SKILL.md Frontmatter、skill-catalog.json 与 docs 受管区块，并扫描正文手写组装关系造成的口径漂移，返回退出码 0/1。 |
| 技能 (Skill) | `skill.pool.verify-chinese-output` | `skills/verify-chinese-output` | ✅ `skills/verify-chinese-output/interface.json` | `skill verify-chinese-output` | 工序动作级技能(L2)：中文输出三项硬断言（待检正文 CJK 占比 ≥ 0.85、非白名单拉丁词 = 0、独立大写缩写后必须有中文释义），全部通过才 Exit 0。 |
| 技能 (Skill) | `skill.pool.verify-concretized-output` | `skills/verify-concretized-output` | ✅ `skills/verify-concretized-output/interface.json` | `skill verify-concretized-output` | 工序动作级技能(L2)：含糊词具像化断言器。对「已具像化」的正文做三项硬断言——不含未具像化含糊词（AMBIGUITY_WORDS 命中数为 0）、--strict 下任何数量表述必须带依据（如 12 个（依据：…））、命中词右侧 6 字内 |
| 技能 (Skill) | `skill.pool.verify-context-payload` | `skills/verify-context-payload` | ✅ `skills/verify-context-payload/interface.json` | `skill verify-context-payload` | 工序动作级技能：断言一次任务加载的技能正文数不超过 top-K、字节数不超预算，且未出现选中清单之外的技能。 |
| 技能 (Skill) | `skill.pool.verify-decoupling` | `skills/verify-decoupling` | ✅ `skills/verify-decoupling/interface.json` | `skill verify-decoupling` | 工序动作级技能：断言五类耦合违规为零；豁免必须经 --allow 显式声明并在输出中标注 waived，杜绝静默放过。 |
| 技能 (Skill) | `skill.pool.verify-deliverable-paths` | `skills/verify-deliverable-paths` | ✅ `skills/verify-deliverable-paths/interface.json` | `skill verify-deliverable-paths` | 工序动作级技能：物理验证交付物地址的有效性，严禁输出不存在或空路径。 |
| 技能 (Skill) | `skill.pool.verify-execution-contract` | `skills/verify-execution-contract` | ✅ `skills/verify-execution-contract/interface.json` | `skill verify-execution-contract` | 工序动作级技能：校验 Skill 的输入/输出契约完整性及本地挂载脚本的可执行性。 |
| 技能 (Skill) | `skill.pool.verify-execution-tree` | `skills/verify-execution-tree` | ✅ `skills/verify-execution-tree/interface.json` | `skill verify-execution-tree` | 工序动作级技能：断言执行层树与 catalog、登记表、受管区块四方一致，扫描文档中手写集群枚举造成的结构漂移并给出文件与行号。 |
| 技能 (Skill) | `skill.pool.verify-file-exists` | `skills/verify-file-exists` | ✅ `skills/verify-file-exists/interface.json` | `skill verify-file-exists` | 工序动作级技能：物理验证指定文件路径是否真实存在于磁盘上，且文件大小大于 0 字节。 |
| 技能 (Skill) | `skill.pool.verify-instance-safety` | `skills/verify-instance-safety` | ✅ `skills/verify-instance-safety/interface.json` | `skill verify-instance-safety` | 工序动作级技能：断言每个本地执行层都有实例安全声明、声明与实际扫描一致、safe_multi 无写盘证据、受限档位带资源键。 |
| 技能 (Skill) | `skill.pool.verify-interactive-html` | `skills/verify-interactive-html` | ✅ `skills/verify-interactive-html/interface.json` | `skill verify-interactive-html` | 工序动作级技能：对交互查看器 HTML 做静态断言，校验缩放控制标识齐备、结构标签闭合且零外部资源引用，返回退出码 0/1。 |
| 技能 (Skill) | `skill.pool.verify-lane-decision` | `skills/verify-lane-decision` | ✅ `skills/verify-lane-decision/interface.json` | `skill verify-lane-decision` | 工序动作级技能：对同一任务重复执行分流判定，断言结果 100% 一致，杜绝分流被随机性污染。 |
| 技能 (Skill) | `skill.pool.verify-layer-naming` | `skills/verify-layer-naming` | ✅ `skills/verify-layer-naming/interface.json` | `skill verify-layer-naming` | 工序动作级技能(L2)：执行层命名整改后的三项硬断言器——合规率必须为 1.0000、旧名残留引用必须为 0（按词边界扫描，避免把新名误判为旧名残留）、执行层登记表零违规；判据复用 audit-layer-naming 的 naming_r |
| 技能 (Skill) | `skill.pool.verify-mermaid-syntax` | `skills/verify-mermaid-syntax` | ✅ `skills/verify-mermaid-syntax/interface.json` | `skill verify-mermaid-syntax` | 工序动作级技能：物理提取文本中的 Mermaid 流程图并执行语法校验，确保流程图无语法破坏。 |
| 技能 (Skill) | `skill.pool.verify-no-forbidden-event` | `skills/verify-no-forbidden-event` | ✅ `skills/verify-no-forbidden-event/interface.json` | `skill verify-no-forbidden-event` | 工序动作级技能：反例零命中断言。进程内 importlib 加载 detect-forbidden-state 的检测器，要求 hits == 0；--strict 时额外要求 checked_events > 0，杜绝空事件流「空过」放行 |
| 技能 (Skill) | `skill.pool.verify-no-lock-violation` | `skills/verify-no-lock-violation` | ✅ `skills/verify-no-lock-violation/interface.json` | `skill verify-no-lock-violation` | 工序动作级技能(L2)：并行派单前的五项硬断言——无锁冲突、无死锁环、无超时未释放、每个任务都已声明锁、死循环体检复用 anti-pattern-policy 的 AP-01；全过才退 0，任一违规即阻断。 |
| 技能 (Skill) | `skill.pool.verify-no-unnecessary-question` | `skills/verify-no-unnecessary-question` | ✅ `skills/verify-no-unnecessary-question/interface.json` | `skill verify-no-unnecessary-question` | 工序动作级技能(L2)：对本次任务的提问记录做四项硬断言（次数≤1、必须红线、必须不可逆、必须批量合并），默认零提问。 |
| 技能 (Skill) | `skill.pool.verify-no-unnecessary-restart` | `skills/verify-no-unnecessary-restart` | ✅ `skills/verify-no-unnecessary-restart/interface.json` | `skill verify-no-unnecessary-restart` | 工序动作级技能(L2)：对实际发生的重启事件做三项硬断言——路径在变更集合内、判定确实需要重启、带非空重建命令；任一不成立即记为不必要重启或无证据重启并退 1。 |
| 技能 (Skill) | `skill.pool.verify-plugin-control-button` | `skills/verify-plugin-control-button` | ✅ `skills/verify-plugin-control-button/interface.json` | `skill verify-plugin-control-button` | 工序动作级技能(L2)：插件常显调控按钮断言器。第一层静态断言包结构符合宿主 client 插件契约（dsh.client.platform=web、client 入口、cordis.patch.yml、__ModuleLoader__ 注 |
| 技能 (Skill) | `skill.pool.verify-progress-budget` | `skills/verify-progress-budget` | ✅ `skills/verify-progress-budget/interface.json` | `skill verify-progress-budget` | 工序动作级技能(L2)：对折叠后的过程输出做四项硬断言（零微操作泄漏、里程碑预算、里程碑 100% 覆盖、事件数不增加），全部通过才放行交付。 |
| 技能 (Skill) | `skill.pool.verify-quantified-output` | `skills/verify-quantified-output` | ✅ `skills/verify-quantified-output/interface.json` | `skill verify-quantified-output` | 工序动作级技能(L2)：量化输出三项硬断言——文本中不存在未量化的程度词、不存在程度词被另一个程度词替换、--require-mapping 下每个命中词都能找到 domain 条目；全部通过才 exit 0，否则 exit 1 并列出词与 |
| 技能 (Skill) | `skill.pool.verify-token-reduction` | `skills/verify-token-reduction` | ✅ `skills/verify-token-reduction/interface.json` | `skill verify-token-reduction` | 工序动作级技能：对裁剪前后文本同时断言 token 降幅达标与等价能力存活（cases.json 的 requires 证据串全部命中），任一条不成立即退 1 阻断放行。 |
| 技能 (Skill) | `skill.pool.verify-workspace-retirement` | `skills/verify-workspace-retirement` | ✅ `skills/verify-workspace-retirement/interface.json` | `skill verify-workspace-retirement` | 工序动作级技能(L2)：工作区退役断言器。三项硬断言——源路径不存在（退役的物理证据）、workspace.json 中不再有指向源路径的条目、台账记录的迁移会话数全部落在目标工作区；全过才 exit 0，任一失败 exit 1，台账或 w |
| 技能 (Skill) | `skill.pool.visual-interaction-guard` | `skills/visual-interaction-guard` | ✅ `skills/visual-interaction-guard/interface.json` | `skill visual-interaction-guard` | 复合流程级技能(L3)：可视化交互四件套放行门禁。把「规约 → 档位 → 生成 → 断言」串成一道不可跳步的门禁，挂载于管家「⑤ 需求与透视」集群；放行的唯一合法证据是「档位表 ≥5 档且默认档在表内 + 吸附分支两种状态齐备 + 下载三段 |
| 技能 (Skill) | `skill.pool.visualize-governance-topology` | `skills/visualize-governance-topology` | ✅ `skills/visualize-governance-topology/interface.json` | `skill visualize-governance-topology` | 复合流程级技能(L3)：全景索引与管家调度链路可视化透视。基于物理数据源提取与图表编译，向用户直观呈现静态资产金字塔与动态管控调用轨迹。 |
| 技能 (Skill) | `skill.pool.zero-restart-guard` | `skills/zero-restart-guard` | ✅ `skills/zero-restart-guard/interface.json` | `skill zero-restart-guard` | 复合流程级技能(L3)：零重启写入门禁。把「路径 → 处置判定 → 重启证据断言」串成一道写入门禁，挂载于管家「② 契约与合规」集群，默认目标是零重启，重启必须由不可热更边界加重建命令双向举证。 |
| 技能 (Skill) | `skill.pool.zoom-level-policy` | `skills/zoom-level-policy` | ✅ `skills/zoom-level-policy/interface.json` | `skill zoom-level-policy` | 微观原子规约：可视化产物交互判定基元。钉死三条硬口径——缩放必须走离散档位表（13 档，+/- 跳相邻档，滚轮连续微调后吸附，档位可枚举可复算）、下载必须三段降级（showSaveFilePicker / Blob 下载 / 就地提示，禁止 |
| 智能体 (Agent) | `agent.skillpool.process-supervisor-agent` | `skill-pool/agents/process-supervisor-agent` | ✅ `skill-pool/agents/process-supervisor-agent/interface.json` | `subagent（宿主工具，按需分派）` | --- |
| 插件 (Plugin) | `plugin.skillpool.dsh-plugin-control-jump` | `skill-pool/plugins/dsh-plugin-control-jump` | ✅ `skill-pool/plugins/dsh-plugin-control-jump/interface.json` | `dsh plugin add skill-pool/plugins/dsh-plugin-control-jump` | — |
| 插件 (Plugin) | `plugin.skillpool.dsh-plugin-image-zoom` | `skill-pool/plugins/dsh-plugin-image-zoom` | ✅ `skill-pool/plugins/dsh-plugin-image-zoom/interface.json` | `dsh plugin add skill-pool/plugins/dsh-plugin-image-zoom` | — |
| 插件 (Plugin) | `plugin.skillpool.dsh-plugin-restart` | `skill-pool/plugins/dsh-plugin-restart` | ✅ `skill-pool/plugins/dsh-plugin-restart/interface.json` | `dsh plugin add skill-pool/plugins/dsh-plugin-restart` | --- |
| 插件 (Plugin) | `plugin.skillpool.dsh-plugin-usage-bar` | `skill-pool/plugins/dsh-plugin-usage-bar` | ✅ `skill-pool/plugins/dsh-plugin-usage-bar/interface.json` | `dsh plugin add skill-pool/plugins/dsh-plugin-usage-bar` | — |
| 脚本 (CLI) | `cli.rules.agent_life` | `scripts/agent_life.mjs` | ✅ `scripts/interfaces/agent_life.interface.json` | `node scripts/agent_life.mjs` | agent_life.mjs |
| 脚本 (CLI) | `cli.rules.align_version` | `scripts/align_version.mjs` | ✅ `scripts/interfaces/align_version.interface.json` | `node scripts/align_version.mjs` | 全库受管文档版本归位（把受管文档头部版本统一改到当前总版本） |
| 脚本 (CLI) | `cli.rules.atomic_lock_audit` | `scripts/atomic_lock_audit.mjs` | ✅ `scripts/interfaces/atomic_lock_audit.interface.json` | `node scripts/atomic_lock_audit.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.audit_execution` | `scripts/audit_execution.sh` | ✅ `scripts/interfaces/audit_execution.interface.json` | `bash scripts/audit_execution.sh` | 对当前任务的执行流程与合规性进行机器审计，输出 0~100 分量化打分与审计卡片 |
| 脚本 (CLI) | `cli.rules.batch_fix_sidebar_titles` | `scripts/batch_fix_sidebar_titles.mjs` | ✅ `scripts/interfaces/batch_fix_sidebar_titles.interface.json` | `node scripts/batch_fix_sidebar_titles.mjs` | 全量穿透修复前端侧边栏及权威存储中的全部存量会话标题 |
| 脚本 (CLI) | `cli.rules.batch_rename_sessions` | `scripts/batch_rename_sessions.mjs` | ✅ `scripts/interfaces/batch_rename_sessions.interface.json` | `node scripts/batch_rename_sessions.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.build_capabilities_index` | `scripts/build_capabilities_index.mjs` | ✅ `scripts/interfaces/build_capabilities_index.interface.json` | `node scripts/build_capabilities_index.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.channel_audit` | `scripts/channel_audit.mjs` | ✅ `scripts/interfaces/channel_audit.interface.json` | `node scripts/channel_audit.mjs` | 快速通道注册审计器 —— 校验"通道表"是否真的可用（对应 REQ-045） |
| 脚本 (CLI) | `cli.rules.check_freshness` | `scripts/check_freshness.mjs` | ✅ `scripts/interfaces/check_freshness.interface.json` | `node scripts/check_freshness.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.check_layer_interfaces` | `scripts/check_layer_interfaces.mjs` | ✅ `scripts/interfaces/check_layer_interfaces.interface.json` | `node scripts/check_layer_interfaces.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.check_task_naming` | `scripts/check_task_naming.sh` | ✅ `scripts/interfaces/check_task_naming.interface.json` | `bash scripts/check_task_naming.sh` | 检查「当前会话」的任务命名是否符合规范，供看板常显与流程判定使用 |
| 脚本 (CLI) | `cli.rules.check_unique_identifiers` | `scripts/check_unique_identifiers.mjs` | ✅ `scripts/interfaces/check_unique_identifiers.interface.json` | `node scripts/check_unique_identifiers.mjs` | check_unique_identifiers.mjs |
| 脚本 (CLI) | `cli.rules.conflict_scan` | `scripts/conflict_scan.mjs` | ✅ `scripts/interfaces/conflict_scan.interface.json` | `node scripts/conflict_scan.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.control_gates` | `scripts/control_gates.sh` | ✅ `scripts/interfaces/control_gates.interface.json` | `bash scripts/control_gates.sh` | — |
| 脚本 (CLI) | `cli.rules.deepseek_key_setup` | `scripts/deepseek_key_setup.sh` | ✅ `scripts/interfaces/deepseek_key_setup.interface.json` | `bash scripts/deepseek_key_setup.sh` | — |
| 脚本 (CLI) | `cli.rules.deepseek_usage_probe` | `scripts/deepseek_usage_probe.mjs` | ✅ `scripts/interfaces/deepseek_usage_probe.interface.json` | `node scripts/deepseek_usage_probe.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.disk_check_and_cleanup` | `scripts/disk_check_and_cleanup.sh` | ✅ `scripts/interfaces/disk_check_and_cleanup.interface.json` | `bash scripts/disk_check_and_cleanup.sh` | DSH 宿主磁盘空间周期性健康检测与安全自愈清理脚本 (支持文档元数据标记定位) |
| 脚本 (CLI) | `cli.rules.fingerprint_audit` | `scripts/fingerprint_audit.sh` | ✅ `scripts/interfaces/fingerprint_audit.interface.json` | `bash scripts/fingerprint_audit.sh` | DSH 工程全域资产数字指纹计算、新鲜度嗅探与对齐审计引擎 |
| 脚本 (CLI) | `cli.rules.fingerprint_index` | `scripts/fingerprint_index.mjs` | ✅ `scripts/interfaces/fingerprint_index.interface.json` | `node scripts/fingerprint_index.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.flow_control` | `scripts/flow_control.mjs` | ✅ `scripts/interfaces/flow_control.interface.json` | `node scripts/flow_control.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.gate_selftest` | `scripts/gate_selftest.sh` | ✅ `scripts/interfaces/gate_selftest.interface.json` | `bash scripts/gate_selftest.sh` | — |
| 脚本 (CLI) | `cli.rules.gen_common_chars` | `scripts/gen_common_chars.mjs` | ✅ `scripts/interfaces/gen_common_chars.interface.json` | `node scripts/gen_common_chars.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.gen_skill_interfaces` | `scripts/gen_skill_interfaces.mjs` | ✅ `scripts/interfaces/gen_skill_interfaces.interface.json` | `node scripts/gen_skill_interfaces.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.generate_image` | `scripts/generate_image.py` | ✅ `scripts/interfaces/generate_image.interface.json` | `python3 scripts/generate_image.py` | — |
| 脚本 (CLI) | `cli.rules.generate_naming_plan` | `scripts/generate_naming_plan.mjs` | ✅ `scripts/interfaces/generate_naming_plan.interface.json` | `node scripts/generate_naming_plan.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.git_sync_remote` | `scripts/git_sync_remote.sh` | ✅ `scripts/interfaces/git_sync_remote.interface.json` | `bash scripts/git_sync_remote.sh` | DSH 工程远程 Git 智能探针、缺地址开页引导、动态摘要提交与强同步引擎 |
| 脚本 (CLI) | `cli.rules.global_scheduler_lock` | `scripts/global_scheduler_lock.sh` | ✅ `scripts/interfaces/global_scheduler_lock.interface.json` | `bash scripts/global_scheduler_lock.sh` | DSH 全自动轻量级全局调度锁中枢与并发资源防冲突引擎 |
| 脚本 (CLI) | `cli.rules.init_dir` | `scripts/init_dir.sh` | ✅ `scripts/interfaces/init_dir.interface.json` | `bash scripts/init_dir.sh` | — |
| 脚本 (CLI) | `cli.rules.init_project` | `scripts/init_project.sh` | ✅ `scripts/interfaces/init_project.interface.json` | `bash scripts/init_project.sh` | — |
| 脚本 (CLI) | `cli.rules.install_host_gate` | `scripts/install_host_gate.sh` | ✅ `scripts/interfaces/install_host_gate.interface.json` | `bash scripts/install_host_gate.sh` | — |
| 脚本 (CLI) | `cli.rules.language_audit` | `scripts/language_audit.mjs` | ✅ `scripts/interfaces/language_audit.interface.json` | `node scripts/language_audit.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.legacy_align_scan` | `scripts/legacy_align_scan.mjs` | ✅ `scripts/interfaces/legacy_align_scan.interface.json` | `node scripts/legacy_align_scan.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.mechanism_audit` | `scripts/mechanism_audit.mjs` | ✅ `scripts/interfaces/mechanism_audit.interface.json` | `node scripts/mechanism_audit.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.name_me` | `scripts/name_me.sh` | ✅ `scripts/interfaces/name_me.interface.json` | `bash scripts/name_me.sh` | **立刻**给"当前会话"改名——开工第一动作，一条命令，任何目录可用 |
| 脚本 (CLI) | `cli.rules.naming_watchdog` | `scripts/naming_watchdog.mjs` | ✅ `scripts/interfaces/naming_watchdog.interface.json` | `node scripts/naming_watchdog.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.normalize_all_projects` | `scripts/normalize_all_projects.mjs` | ✅ `scripts/interfaces/normalize_all_projects.interface.json` | `node scripts/normalize_all_projects.mjs` | 全域存量 DSH 工程文件夹批量合规与规范化治理脚本 |
| 脚本 (CLI) | `cli.rules.output_audit` | `scripts/output_audit.mjs` | ✅ `scripts/interfaces/output_audit.interface.json` | `node scripts/output_audit.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.patch_dsh_todo_progress` | `scripts/patch_dsh_todo_progress.cjs` | ✅ `scripts/interfaces/patch_dsh_todo_progress.interface.json` | `node scripts/patch_dsh_todo_progress.cjs` | ⛔⛔⛔ [DEPRECATED 已废弃 · 2026-10-01 · REQ-089 D4] ⛔⛔⛔ |
| 脚本 (CLI) | `cli.rules.period_parity` | `scripts/period_parity.mjs` | ✅ `scripts/interfaces/period_parity.interface.json` | `node scripts/period_parity.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.physical_lock` | `scripts/physical_lock.sh` | ✅ `scripts/interfaces/physical_lock.interface.json` | `bash scripts/physical_lock.sh` | — |
| 脚本 (CLI) | `cli.rules.plugin_sync` | `scripts/plugin_sync.sh` | ⛔ 未声明 | `bash scripts/plugin_sync.sh` | — |
| 脚本 (CLI) | `cli.rules.probe_long_output` | `scripts/probe_long_output.mjs` | ✅ `scripts/interfaces/probe_long_output.interface.json` | `node scripts/probe_long_output.mjs` | 长输出实测探针：验证 max_tokens 提高后单次回复能否突破旧上限（32768）。 |
| 脚本 (CLI) | `cli.rules.probe_long_output_stream` | `scripts/probe_long_output_stream.mjs` | ✅ `scripts/interfaces/probe_long_output_stream.interface.json` | `node scripts/probe_long_output_stream.mjs` | 长输出触顶实测（流式版）：验证单次回复到底能有多长。 |
| 脚本 (CLI) | `cli.rules.probe_max_tokens` | `scripts/probe_max_tokens.mjs` | ✅ `scripts/interfaces/probe_max_tokens.interface.json` | `node scripts/probe_max_tokens.mjs` | 探测服务端对 max_tokens 的接受范围。 |
| 脚本 (CLI) | `cli.rules.process_supervisor` | `scripts/process_supervisor.mjs` | ✅ `scripts/interfaces/process_supervisor.interface.json` | `node scripts/process_supervisor.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.progress_ledger` | `scripts/progress_ledger.mjs` | ✅ `scripts/interfaces/progress_ledger.interface.json` | `node scripts/progress_ledger.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.redundancy_scan` | `scripts/redundancy_scan.mjs` | ✅ `scripts/interfaces/redundancy_scan.interface.json` | `node scripts/redundancy_scan.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.rename_session` | `scripts/rename_session.sh` | ✅ `scripts/interfaces/rename_session.interface.json` | `bash scripts/rename_session.sh` | 通过 DSH 后台 HTTP RPC 接口，为当前会话重命名并锁定侧边栏标题 |
| 脚本 (CLI) | `cli.rules.restart_verify` | `scripts/restart_verify.mjs` | ✅ `scripts/interfaces/restart_verify.interface.json` | `node scripts/restart_verify.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.restore_skill_pool` | `scripts/restore_skill_pool.mjs` | ✅ `scripts/interfaces/restore_skill_pool.interface.json` | `node scripts/restore_skill_pool.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.route_navigate` | `scripts/route_navigate.mjs` | ✅ `scripts/interfaces/route_navigate.interface.json` | `node scripts/route_navigate.mjs` | route_navigate.mjs |
| 脚本 (CLI) | `cli.rules.route_plan` | `scripts/route_plan.mjs` | ✅ `scripts/interfaces/route_plan.interface.json` | `node scripts/route_plan.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.session_naming_audit` | `scripts/session_naming_audit.mjs` | ✅ `scripts/interfaces/session_naming_audit.interface.json` | `node scripts/session_naming_audit.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.svg2png` | `scripts/svg2png.sh` | ✅ `scripts/interfaces/svg2png.interface.json` | `bash scripts/svg2png.sh` | 把手写 SVG 按设计尺寸精确栅格化为 PNG（出图管道的本地渲染环节） |
| 脚本 (CLI) | `cli.rules.sync_api_docs` | `scripts/sync_api_docs.mjs` | ✅ `scripts/interfaces/sync_api_docs.interface.json` | `node scripts/sync_api_docs.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.sync_control_requirements` | `scripts/sync_control_requirements.mjs` | ✅ `scripts/interfaces/sync_control_requirements.interface.json` | `node scripts/sync_control_requirements.mjs` | 管控机制专属需求同步校验脚本 (Control Requirements Sync Verifier) |
| 脚本 (CLI) | `cli.rules.test_auto_naming` | `scripts/test_auto_naming.mjs` | ✅ `scripts/interfaces/test_auto_naming.interface.json` | `node scripts/test_auto_naming.mjs` | 自动命名逻辑测试（在**不重启宿主**的前提下验证）。 |
| 脚本 (CLI) | `cli.rules.test_physical_lock` | `scripts/test_physical_lock.mjs` | ✅ `scripts/interfaces/test_physical_lock.interface.json` | `node scripts/test_physical_lock.mjs` | ============================================================================== |
| 脚本 (CLI) | `cli.rules.test_v180_spec` | `scripts/test_v180_spec.sh` | ✅ `scripts/interfaces/test_v180_spec.interface.json` | `bash scripts/test_v180_spec.sh` | — |
| 脚本 (CLI) | `cli.rules.todo_gate` | `scripts/todo_gate.sh` | ✅ `scripts/interfaces/todo_gate.interface.json` | `bash scripts/todo_gate.sh` | — |
| 脚本 (CLI) | `cli.rules.verify_auto_naming_e2e` | `scripts/verify_auto_naming_e2e.mjs` | ✅ `scripts/interfaces/verify_auto_naming_e2e.interface.json` | `node scripts/verify_auto_naming_e2e.mjs` | 自动命名端到端验收（重启后运行，一次给出结论）。 |
| 脚本 (CLI) | `cli.rules.verify_escape_hatch` | `scripts/verify_escape_hatch.sh` | ✅ `scripts/interfaces/verify_escape_hatch.interface.json` | `bash scripts/verify_escape_hatch.sh` | — |
| 脚本 (CLI) | `cli.rules.verify_guard_live` | `scripts/verify_guard_live.sh` | ✅ `scripts/interfaces/verify_guard_live.interface.json` | `bash scripts/verify_guard_live.sh` | — |

### 3.2 ⚠️ catalog 与磁盘漂移（必须处理，禁止当成可用能力）

以下条目在真相源 catalog 中登记，但 `skills/<name>/SKILL.md` **在磁盘上不存在**。
它们不是本仓技能，必须二选一：补齐文件，或从 catalog 注销。

- `confirm-before-coding`（catalog 有、磁盘无）
- `track-task-progress`（catalog 有、磁盘无）
- `github`（catalog 有、磁盘无）
- `manage-problem-log`（catalog 有、磁盘无）
- `manage-requirements`（catalog 有、磁盘无）

### 3.3 执行层资产指针（非能力条目，但必须可追溯）

| 资产 | 物理路径 | 作用 |
| :--- | :--- | :--- |
| ✅ | `skill-pool/bin/skill-pool` | 技能池 CLI 入口（list/validate/status/link/catalog/consistency） |
| ✅ | `skill-pool/docs/operations/skill-catalog.json` | 技能目录真相源（catalog） |
| ✅ | `skill-pool/docs/operations/execution-tree.json` | 执行层树真相源 |
| ✅ | `skill-pool/docs/operations/execution-layers.json` | 非技能执行层登记表（cli/agent/api/mcp/plugin） |
| ✅ | `skill-pool/docs/operations/layer-graph.json` | 层间依赖图 |
| ✅ | `skill-pool/docs/operations/instance-safety.json` | 实例安全声明表（safe_multi / needs_lock / single_only） |
| ✅ | `skill-pool/docs/operations/process-spec.json` | 流程合规判定规约（九步 + 物理探针绑定） |
| ✅ | `skill-pool/docs/operations/global-rules-index.md` | 技能池侧全局规则索引 |
| ✅ | `skill-pool/docs/requirements/index.md` | 技能池需求台账（基线） |
| ✅ | `skill-pool/docs/operations/workflows.md` | 技能池操作规范与命令入口 |
| ✅ | `skill-pool/MIGRATED.md` | 合并说明（本目录并入全局规则的记录） |

<!-- SKILL-POOL-INDEX:END -->
