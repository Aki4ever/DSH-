# 全能力层全景索引与双层接口法典 (Comprehensive Capabilities Index & Interface Matrix)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.18.0`
> - **对应实施版本**：`v4.18.0`
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

