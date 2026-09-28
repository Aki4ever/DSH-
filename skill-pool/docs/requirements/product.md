# 产品需求规范 (REQ-SKILLPOOL-001)

## 1. 产品形态与定位
- **产品名称**：Skill池 (Skill Pool)
- **定位**：DSH / Codex 本地 Skill 资产与集合管理仓库
- **形态**：Git 驱动的规范化 Skill 资产集合仓库 + 轻量级管理 CLI (`bin/skill-pool`)
- **当前版本**：v0.2.0 (MVP + 管家演进包 REQ-BUTLER-010 ~ 014)

## 2. 目标用户与核心价值
- **目标用户**：使用 DSH (DeepSeek Harness) 或 Codex 进行智能体开发、使用自定义 Skill 的开发者。
- **核心问题**：
  - 本地 Skill 分散在 `~/.codex/skills/` 或各项目临时目录中，缺乏统一版本控制与备份；
  - 缺乏统一的标准规范检测，Skill 结构不一、容易缺少描述或关键文件；
  - 缺乏跨环境（如从本仓库一键软链/同步至 Codex/DSH）的轻量管理工具。
- **核心价值**：
  - 集中归档：统一存储在 `skills/<skill-name>/`，由 Git 跟踪迭代；
  - 规范统一：遵循标准 Skill 目录结构规范（`SKILL.md`、`README.md`、`scripts/` 等）；
  - 快速分发：提供 `skill-pool` CLI 工具，支持一键列表、规范校验、软链同步与状态自检。

## 3. 核心功能与模块规划 (MVP)

### 3.1 资产目录结构 (skills/)
- 标准 Skill 目录格式：
  ```text
  skills/
  └── <skill-name>/
      ├── SKILL.md       # 技能元数据与核心 System Prompt 引导规范（必需）
      ├── README.md      # 使用说明、入参示例与依赖环境（推荐）
      ├── scripts/       # 脚本目录（可选）
      └── references/    # 附带参考文档或模板资产（可选）
  ```
- 提供一个标准的 Skill 模板 `skills/_template/`，方便快速新建 Skill。

### 3.2 管理 CLI (bin/skill-pool)
- **实现语言**：Python 3（零额外 pip 依赖，纯标准库）。
- **核心命令**：
  - `list`：列出仓库内所有已登记的 Skill 及其标题与描述简况。
  - `validate [skill-name]`：校验指定或全部 Skill 是否符合标准结构与命名规范。
  - `status`：显示当前仓库 Skill 统计以及本地环境（如 `~/.codex/skills/`）的链接同步状态。
  - `link <skill-name>`：将指定的 Skill 以软链接 (symlink) 形式发布到目标运行环境目录（支持 `--target`，默认 `~/.codex/skills`）。
  - `unlink <skill-name>`：安全解除软链接。
  - `init <skill-name>`：根据标准模板初始化一个新的 Skill 目录。

### 3.3 交付验收标准
1. Git 仓库已正确初始化并具备完整的工程规范骨架（requirements, cli, operations, research, knowledge, problem-log）。
2. `skills/` 具备标准化说明与 `_template/` 样例。
3. `bin/skill-pool` 可执行且通过单元自测（list / validate / status / init / link 均可正常响应）。
4. `docs/cli/` 具备详尽的命令设计文档与使用范例。
5. 代码与文档通过 Git 首个规范提交，并成功推送到 GitHub 远程私有仓库（需确认 gh 认证）。

---

## 4. 管家 Agent 架构与执行层规范 (REQ-BUTLER-001)

### 4.1 角色定位
- **命名**：`dsh-butler`（DSH 全局主控管家）。
- **特权**：Root / 最高超级管理员特权（Full Authority），具备全局工具调用、环境读写、动态造物与执行层调度权。

### 4.2 统筹纳管的 6 大执行层
1. **Skill（技能层）**：规范化指令、业务规则、固定输出模版。
2. **Agent / Subagent（智能体层）**：自治子智能体，负责深度推导与独立任务隔离。
3. **CLI（命令行执行层）**：本地 Shell、Python/Node 脚本、系统命令。
4. **API（服务接口层）**：外部 RESTful / Web API、HTTP 交互。
5. **MCP（上下文协议层）**：已连接的 MCP Server、标准化协议工具集。
6. **Plugin（平台插件层）**：DSH 客户端扩展与平台插件模块。

### 4.3 动态造物与输出规约
- 管家内置元能力生成器 `skills/dsh-butler/scripts/create_rule_skill.py`。
- 当用户要求固定输出结构（如“10字以内、黑体、中文”）或缺少处理管道时，管家可一键动态生成规约 Skill 并自动同步链接至运行环境，实现自演进规约调度。已落地的示范规约资产为 `concise-chinese-bold-guard`。

---

## 5. 管家抗随机流程固化与 Skill Catalog 编目中心 (REQ-BUTLER-GOVERNANCE-001)

### 5.1 规划背景与目标
- **痛点**：复杂长链路任务中，LLM 输出容易漂移、缺失必要字段、漏掉验收环节、或因工具异常导致随机中断。
- **目标**：
  1. 固化核心抗随机流程为标准化 Skill（如结构化输出守卫 `schema-guard`、交付门禁质检 `qa-gatekeeper`）；
  2. 建立并集中维护全局统一的 `Skill Catalog`（机器可读 JSON + 人机查阅 Markdown），支持毫秒级意图与输入输出契约映射；
  3. 提供管家编目同步与查询工具，确保新增/动态创建的 Skill 自动进入编目索引。

### 5.2 核心交付组件
1. **抗随机规约类 Skill**：
   - `skills/schema-guard`：严格 JSON/YAML/Schema 校验，过滤废话，保证 100% 结构化输出。
   - `skills/qa-gatekeeper`：交付前门禁自检规范，确保文件、代码、状态自洽。
2. **全局编目体系 (Skill Catalog)**：
   - 数据源：`docs/operations/skill-catalog.json`。
   - 文档索引：`docs/operations/skills-catalog.md`。
3. **管家集成脚本与自维护命令**：
   - `skills/dsh-butler/scripts/sync_catalog.py`：自动扫描 `skills/` 及当前工作区，提取元数据，生成最新 catalog。
   - CLI 接入：`bin/skill-pool catalog` 命令，支持查询、导出与校验。

---

## 6. 四级能力分级体系与积木式组装标准 (REQ-BUTLER-LEVELS-002)

### 6.1 核心思想：积木加法法则 (Addition Rule)
- 任何复杂的控制流不再是一体化的黑盒 Prompt，而是自底向上由最微观的操作组合叠加而成；
- 管家调度时，像拼积木一样组合原子规则，实现对 LLM 输出的毫秒级精确约束。

### 6.2 L1 ~ L4 四级能力模型
1. **L1 原子规约级 (Atomic Primitives)**：
   - 特征：单一输入输出、不可再分、零外部依赖、用于消灭表达层随机性。
   - 资产：`output-chinese-only`（纯中文）、`limit-words-under-10`（限10字内）、`markdown-bold-only`（纯加粗）、`strip-markdown-fence`（纯数据去围栏）、`no-conversational-filler`（零闲聊客套）。
2. **L2 工序动作级 (Procedural Action Tools)**：
   - 特征：单步执行动作、带独立脚本实现物理检测与验证。
   - 资产：`verify-file-exists`（文件物理检测）、`check-python-syntax`（Python 编译语法检测）、`extract-json-payload`（严格闭合 JSON 提取）。
3. **L3 复合流程级 (Composite Pipelines)**：
   - 特征：基于「加法法则」由多个 L1 与 L2 显式组装（`composition`）而成的业务 SOP。
   - 资产：`concise-chinese-bold-guard`（L1 组合）、`schema-guard`（L1 + L2 组合）、`qa-gatekeeper`（L2 组合）。
4. **L4 中枢编排级 (Master Orchestration)**：
   - 特征：管家顶层调度与全域自演进，动态识别意图并装配对应能力的流水线。
   - 资产：`dsh-butler`。

---

## 7. 六大管控闭环体系与递归细化标准 (REQ-BUTLER-CONTROL-003)

### 7.1 分形递归法则 (Fractal Recursive Rule)
- 当某一管控技能的执行粒度无法达到 100% 物理确定性时，管家必须自动向下分裂出支撑它的微观 L1/L2 原子基元，直到每一个控制点都有明确的代码或硬性规则承载。

### 7.2 六大管控防线设计
1. **意图检测与噪音过滤 (Intent & Noise Filter)**：
   - 目标：提炼核心诉求，过滤语气助词、客套、重复与情绪化表达。
   - 组装：`intent-detector` (L3) = `filter-conversational-noise` (L1) + `strip-whitespace-newlines` (L1) + `detect-action-verb` (L2) + `detect-target-entity` (L2) + `extract-core-objective` (L2)。
2. **冗余检测与防膨胀 (Redundancy Detector & Anti-Bloat)**：
   - 目标：检测规则或技能重合，裁剪多余指令，确保管控机制简洁高效。
   - 组装：`redundancy-detector` (L3) = `prune-bloated-prompts` (L1) + `search-duplicate-rules` (L2)。
3. **冲突检测与仲裁自愈 (Conflict Detector & Arbitration)**：
   - 目标：检测规则互斥矛盾，按优先级裁决并输出自愈解决方案。
   - 组装：`conflict-detector` (L3) = `arbitrate-priority-resolver` (L1) + `detect-rule-conflicts` (L2)。
4. **索引控制与消歧路由 (Skill Index Router)**：
   - 目标：快速索引和命中对应 Skill，消除调用歧义，命中率 $\ge 99\%$。
   - 组装：`skill-index-router` (L3) = `match-intent-keywords` (L2) + `disambiguate-candidates` (L2)。
5. **索引头部契约 (Index Header Contract)**：
   - 目标：规范 Frontmatter 与触发场景，让索引一眼识破使用时机。
   - 组装：`index-header-contract` (L3) = `standardize-when-to-use` (L1) + `validate-header-triggers` (L2)。
6. **索引主体运作契约 (Index Body Contract)**：
   - 目标：规范 SOP 状态机与执行契约，让管家透视被调用 Skill 的运行逻辑。
   - 组装：`index-body-contract` (L3) = `standardize-workflow-sop` (L1) + `verify-mermaid-syntax` (L2) + `check-script-executable` (L2) + `verify-execution-contract` (L2)。

---

## 8. 自主递归分裂与解耦体系 (REQ-BUTLER-FISSION-004)

### 8.1 物理确定性检验红线 (Physical Determinism Invariant)
任何管控技能若无法通过以下四类物理探针之一进行 100% 断言，即判定为“粒度过粗”，必须触发自动分裂：
1. **字符串与长度探针**（如截断、字数 $\le N$）；
2. **正则排他探针**（如关键词黑名单命中、格式匹配）；
3. **进程退出码断言**（Exit Code = 0 为通过，1 为阻断）；
4. **文件与字节物理探针**（磁盘路径真实存在且非空）。

### 8.2 自动分裂引擎与解耦管线 (Auto-Fission Pipeline)
- 工具：`skills/dsh-butler/scripts/fission_engine.py`；
- 核心功能：评估 Skill 的粒度与主观性，自动分裂为独立的 L1 微规约和带 Python 脚本的 L2 工具，自动更新复合父级 Skill 的 `composition` 依赖，并触发 Catalog 自愈。
- 解耦落地步骤群：
  - `strip-whitespace-newlines` (L1: 空白与换行剥离)
  - `detect-action-verb` (L2: 独立动词判定脚本)
  - `detect-target-entity` (L2: 独立实体边界判定脚本)
  - `ensure-utf8-encoding` (L2: 字符编码物理探针)
  - `assert-zero-exitcode` (L2: 自动化命令退出码硬断言)

---

## 9. 全景索引与调度可视化透视 (REQ-BUTLER-VISUALIZE-005)

### 9.1 核心价值
- 提供确定性、数据驱动的“透视之眼”，将抽象的管控链路与技能分层转化为直观可见的图谱与卡片；
- 将“查看”动作本身作为标准 Skill 加以管理，遵循单一职责与物理脚本驱动原则，杜绝伪可视化。

### 9.2 递归分裂技能群
1. `format-visual-inspection` (L1): 强制必须以 Mermaid 或 GenUI 形式呈现，严禁大段无图散文。
2. `extract-catalog-topology` (L2): 物理读取 `skill-catalog.json` 导出有向图节点与依赖拓扑。
3. `render-governance-mermaid` (L2): 编译有向图与 6 大管控状态机为合规 Mermaid 源码。
4. `visualize-governance-topology` (L3): 复合流程级端到端透视技能。

---

## 10. 交付输出框架标准化规约 (REQ-BUTLER-OUTPUT-FRAMEWORK-006)

### 10.1 核心原则与分支机制
- 任务最终交付统一遵循四要素结构：**当前状态、输出物、输出地址、重要说明**；
- **动态分支规则**：若本次任务无物理文件产物，则强行省略“输出地址”，降级转为“核心结论”；
- **强相关说明**：重要说明必须与输出结果/操作命令高强绑定，严禁常识性空话。

### 10.2 递归分裂技能群
1. `format-status-block` (L1): 规范当前状态展示模版。
2. `conditional-deliverable-router` (L1): 条件分支裁决器（有产物输出地址，无产物输出核心结论）。
3. `high-relevance-notes-only` (L1): 重要说明强相关性过滤器。
4. `verify-deliverable-paths` (L2): 物理断言交付地址真实存在且非空（带独立 Python 脚本）。
5. `standard-output-framework` (L3): 复合流程级输出总控，绑定为管家收尾标准规范。

---

## 11. 尾部特异化图标输出与快捷路由 (REQ-BUTLER-FASTPATH-007)

### 11.1 核心价值与背景
- **尾部集中特异化展示**：将交付结构收敛在最终输出最末尾，并强化使用特异化图标（🚀 状态、📦 交付物、📍 路径、💡 结论、📌 说明），提供无可挑剔的清晰度与格式确定性；
- **全量存量合规审计**：对存量及新增的所有 Skill 实施全盘契约审计，物理断言必须具备 YAML Frontmatter、触发场景 (`## When to Use`)、主体运作 (`## Workflow / SOP`) 以及 L2 工具配套的执行脚本；
- **原子级快捷路由直达**：在索引命中技能时，不仅告知技能名称，还提供物理直达的运行指令与规约导引，大幅缩短管家触达底层原子能力的耗时。

### 11.2 递归分裂技能群
1. `format-iconized-tail` (L1): 强制必须在末尾集中使用特异化 Emoji 图标输出交付框架。
2. `validate-icon-syntax` (L2): 通过独立 Python 脚本利用正则表达式断言输出文案末尾合规性。
3. `iconized-output-showcase` (L3): 尾部图标展示总控复合技能。
4. `enforce-contract-completeness` (L1): 全量技能头体契约完整性规范。
5. `audit-all-skills-compliance` (L2): 遍历全量技能执行存量穿透审计并返回退出码 0/1 的独立检测脚本。
6. `full-spectrum-skill-auditor` (L3): 全量技能合规自检门禁复合技能。
7. `fastpath-dispatch-guide` (L1): 原子级快捷触达格式规范。
8. `generate-fastpath-route` (L2): 根据 Skill ID 物理提取一键直达命令与依赖拓扑的独立脚本。
9. `atomic-fastpath-router` (L3): 原子级快捷触达路由总控复合技能。

---

## 12. 通俗表达与量化看板 (REQ-BUTLER-METRICS-008)

### 12.1 核心价值与背景
- **纯中文与极致聚焦**：强制统一中文输出，无特殊要求下杜绝铺陈与废话，保障核心结论一目了然；
- **通俗化生活比喻**：用普通人听得懂的日常原理（如字典查字、门卫安检、积木拼装）解释复杂机制，若用户未提问，绝对静默底层代码细节；
- **量化观测维度**：在输出尾部新增 `🎯 索引命中` 与 `⏱️ 路由时长`，提供物理级量化指标，为系统迭代提供客观数据依据。

### 12.2 递归分裂技能群
1. `output-chinese-only` (L1): 全中文强制规约。
2. `concise-focused-output` (L1): 默认简短聚焦规约。
3. `plain-analogy-explanation` (L1): 通俗化常识比喻与技术细节静默规约。
4. `measure-routing-metrics` (L2): 物理测算索引匹配与路由检索耗时的独立脚本。
5. `tail-metrics-showcase` (L3): 尾部量化指标与通俗表达总控复合技能。

---

## 13. 需求驱动与七大规范对照 (REQ-BUTLER-SPEC-GOVERNANCE-009)

### 13.1 核心价值
- **需求生命周期严格闭环**：任务必须从需求文档出发，同步更新最新版本基线，严禁脱离需求图纸私自开工；
- **测试用例门禁 (Test-First & Gate)**：对照需求规格自动生成/执行测试用例脚本，全部通过（Exit Code 0）方可验收；
- **知识库 7 大规范最高准则**：在 `docs/knowledge/standards/` 沉淀世界观、美术、交互、文字、布局、工程与分人群对话规范。当执行过程发生冲突时，以知识库规范为绝对基准。

### 13.2 递归分裂技能群
1. `sync-requirements-lifecycle` (L2): 自动化检查并同步 requirements 版本生命周期的独立脚本。
2. `run-test-cases-gate` (L2): 对照需求执行自动化测试案例集，硬断言全部通过方可放行的独立门禁工具。
3. `reconcile-knowledge-specs` (L2): 遍历 7 大知识库规范并对拍冲突，强制裁定规范优先的独立对拍工具。
4. `spec-driven-governance` (L3): 需求驱动、测试用例验证与知识库规范仲裁的复合流程总控。

---

## 14. 口径单一真相源与漂移自愈 (REQ-BUTLER-CONSISTENCY-010)

### 14.1 核心价值与背景
- **触发实证**：§7.2 原描述的 `intent-detector` 与 `index-body-contract` 组装关系，与技能实际 YAML Frontmatter 不一致，形成「文档手写表」与「skill-catalog.json 生成表」双真相源；
- **根因判定**：漂移不是个别笔误，而是**组装关系存在两处人工录入点**（`product.md` 手写表 + `SKILL.md` frontmatter）。逐行改对只是治标，取消手写才是治本；
- **单一真相源原则**：以 `skills/<name>/SKILL.md` 的 YAML Frontmatter 为唯一真相源，`skill-catalog.json` 由脚本生成，`docs/**` 中一切组装关系表由 catalog 单向生成，禁止人工编辑。

### 14.2 递归分裂技能群
1. `render-catalog-docs` (L2): 读取 `skill-catalog.json`，将分级总览与组装关系注入 `docs/requirements/product.md` 的受管区块（标记行以 `CATALOG:BEGIN` / `CATALOG:END` 开头），区块外内容不动，幂等可重跑。
2. `verify-catalog-consistency` (L2): 三方对拍 `SKILL.md frontmatter` ⊆ `skill-catalog.json` ⊆ `docs` 受管区块，任意一侧差异即 Exit Code 1 并打印差异明细。
3. `catalog-consistency-guard` (L3): 口径一致性门禁复合技能，串联「生成 → 对拍 → 报告」，是技能池任何写入动作的前置门禁。
4. CLI 接入：`./bin/skill-pool consistency` 子命令，直接暴露 L2 对拍结果的退出码。

### 14.3 验收标准
- `./bin/skill-pool consistency` Exit Code == 0；
- 人工篡改 `docs` 受管区块任意一行后，同一命令 Exit Code == 1 并指出差异文件名与行号。

---

## 15. 可缩放图片与图谱查看器 (REQ-BUTLER-VIEWER-011)

### 15.1 核心价值与背景
- 服务「管家下属可视化」场景：用户点击任一技能节点，即可放大查看其结构图/示意图，并支持放大、缩小与复位；
- **落地形态选择（已拍板 A 方案）**：生成本地 standalone HTML 交互查看器。宿主 GenUI 的 `image` 组件为懒加载静态展示，不含缩放交互；改宿主插件超出本仓库范围，故不采用；
- **零依赖原则**：查看器为单文件 HTML（内联 SVG/CSS/JS），双击即可打开，不引入任何 CDN 或 npm 依赖。

### 15.2 递归分裂技能群
1. `format-zoomable-visual` (L1): 规约一切可视化产物必须提供「点击放大 + 放大/缩小 + 复位」三件套交互，严禁只输出静态图。
2. `build-image-viewer` (L2): 输入图片/SVG/拓扑数据，输出单文件交互 HTML（点击放大遮罩、`+ / −` 按钮、滚轮缩放、拖拽平移、复位）。
3. `verify-interactive-html` (L2): DOM 静态断言 —— HTML 文件存在且 > 0 字节、含 zoom 控制器标识（`data-zoom-in` / `data-zoom-out` / `data-zoom-reset`）、标签闭合可解析，返回退出码 0/1。
4. `interactive-image-viewer` (L3): 查看器复合流程总控，挂载于「⑤ 需求与透视」集群，作为 `visualize-governance-topology` 的兄弟节点。

### 15.3 验收标准
- 产出的 HTML 物理存在且非空，`verify-interactive-html` Exit Code == 0；
- 人工点击任一图形可放大，`+ / − / 复位` 三个控件均生效。

---

## 16. GitHub 技能引入管线 (REQ-BUTLER-IMPORT-012)

### 16.1 核心价值与背景
- 让外部优质 Skill 进入本池，而不是从零手写；
- **引入即纳管**：任何外部技能必须经「检索 → 审计 → 契约归一 → 定级挂载 → 门禁验证」五步，缺一步不得入库；
- **落点选择（已拍板 A 方案）**：优先经 `find_dsh_plugin`（GitHub `dsh-plugin` 主题）检索，结果可直接安装；需要时再以关键词扩大检索面。

### 16.2 递归分裂技能群
1. `search-github-skill` (L2): 按能力关键词检索候选技能/插件，输出结构化候选清单 JSON（名称、来源 URL、星标、许可、是否含脚本、依赖）。
2. `audit-imported-skill` (L2): 对候选执行许可（License 白名单）、依赖、脚本可执行面与安全风险体检，输出通过/拒绝与理由，返回退出码 0/1。
3. `normalize-skill-contract` (L2): 将引入技能改造为本池统一契约 —— 补齐 YAML Frontmatter（`name` / `level` / `composition` / `description`）、`## When to Use` 场景索引与 `## Workflow` 主体 SOP，幂等重跑。
4. `place-skill-into-cluster` (L2): 依据级别与触发关键词判定其归属集群与应挂载的父级，写入 `composition` 依赖边并更新集群归属，禁止人工拍脑袋放置。
5. `skill-import-pipeline` (L3): 五步串联总控，挂载于新增集群「⑦ 技能引入与演进」。

### 16.3 验收标准
- 引入后的技能通过 `./bin/skill-pool validate` 与 `./bin/skill-pool consistency`，两者 Exit Code 均为 0；
- 被拒绝的候选必须有明确的许可/安全理由，不得静默丢弃。

---

## 17. 完整流程与快速流程双轨制 (REQ-BUTLER-DUALFLOW-013)

### 17.1 核心价值与背景
- 现状问题：所有任务走同一条重型链路（意图 → 动态造物 → 多层路由 → 终审门禁 → 标准交付），读一行文件也要付全链路成本；
- **双轨定义**：
  - **快速流程（≤4 步）**：意图识别 → 命中既有技能 → 直接执行 → 结果回报，全程直调，不动态造物、不派子智能体；
  - **完整流程（现有 5 步）**：意图拆解 → 动态能力构建 → 多层协同路由 → 终审门禁 → 标准交付。

### 17.2 分流判定机制（物理可算，拒绝主观）
- **红线（任一命中即强制完整流程）**：R1 删除/清空/覆盖既有、R2 发布/部署/推送（含 `git commit`、`git push`）、R3 需求文档变更、R4 安装外部依赖或技能、R5 批量改动（涉及文件数 ≥ 2）；红线为硬规约，不受加权分影响。**普通单文件编辑不属于红线**，由加权分判定。
- **加权分（无红线时计算，五项简单性判据各计 1 分，满分 5）**：任务为只读、仅涉及单文件、操作可逆、预计原子步骤 ≤3、命中现成技能。**得分 ≥ 3 → 快速流程；得分 < 3 → 完整流程**（分值方向为「越简单分越高」）。
- **判定可审计**：判定结果必须输出 `lane` / `score` / `matched_redlines` / `reason` 四元组，且可被第三方脚本复算复现。

### 17.3 递归分裂技能群
1. `fastlane-redline-policy` (L1): 红线清单与「红线优先于分值」的仲裁规约，禁止以任何理由绕过。
2. `score-task-lane` (L2): 输入任务描述与上下文，输出 `lane` / `score` / `matched_redlines` / `reason` 的判定脚本，退出码恒为 0（判定结果走 stdout JSON，退出码不承载语义）。
3. `verify-lane-decision` (L2): 复算判定结果，断言同一输入必然得到同一 lane，防止判定被随机性污染。
4. `dual-lane-router` (L3): 双轨总控，挂载于「① 意图与路由」集群，位于 `intent-detector` 之后、`atomic-fastpath-router` 之前。

### 17.4 验收标准
- 5 组样本任务（只读查询、单文件改注释、需求变更、批量删除、发布推送）判定结果与预期 lane 完全一致，`verify-lane-decision` Exit Code == 0；
- 同一样本重复执行 10 次，lane 结果 100% 一致。

---

## 18. 粒度递归分裂门禁 (REQ-BUTLER-FISSION-014)

### 18.1 核心价值与背景
- 本条是 §14 ~ §17 的执行前提：任何管控步骤若不能绑定到四类物理探针之一，即判定为「粒度过粗」，必须在实施前递归分裂出更细颗粒度的 Skill 或 Agent；
- **四类物理探针（唯一合格判据）**：字符串与长度探针、正则排他探针、进程退出码断言、文件与字节物理探针；
- 与 §8 的关系：§8 定义了分裂引擎与解耦管线，本条补上**强制门禁**——不可断言即不得进入实施。

### 18.2 递归分裂技能群
1. `enforce-atomic-granularity` (L1): 强制规约 —— 每个 SOP 步骤必须声明其绑定的探针类型，未声明或声明为「人工判断」的步骤一律判定为不合格。
2. `plan-fission` (L2): 输入技能/SOP 描述，输出粒度评估与分裂清单（待拆分步骤、建议级别、建议探针、建议父级），复用现有 `skills/dsh-butler/scripts/fission_engine.py`。
3. `atomic-fission-guard` (L3): 分裂门禁复合技能，挂载于「② 契约与合规」集群，拦截一切「无法物理断言」的实施动作。

### 18.3 验收标准
- 对任一含主观步骤的 SOP，`plan-fission` 能输出非空分裂清单，且清单中每一步均绑定到四类探针之一；
- `atomic-fission-guard` 退出码 == 0 是 §14 ~ §17 全部实施任务的前置条件。

---

## 19. 本次演进带来的编制变化

| 级别 | 新增数 | 总览 |
| :--- | :--- | :--- |
| L1 原子规约 | +3 | `enforce-atomic-granularity`、`fastlane-redline-policy`、`format-zoomable-visual` |
| L2 工序动作 | +11 | `render-catalog-docs`、`verify-catalog-consistency`、`score-task-lane`、`verify-lane-decision`、`build-image-viewer`、`verify-interactive-html`、`search-github-skill`、`audit-imported-skill`、`normalize-skill-contract`、`place-skill-into-cluster`、`plan-fission` |
| L3 复合流程 | +5 | `atomic-fission-guard`、`catalog-consistency-guard`、`dual-lane-router`、`interactive-image-viewer`、`skill-import-pipeline` |
| L4 中枢编排 | ±0 | `dsh-butler` 新增「⑦ 技能引入与演进」集群与双轨分流入口 |
| **合计** | **+19** | 68 → 87 |

### 19.1 建议实施顺序
`REQ-BUTLER-FISSION-014` → `REQ-BUTLER-CONSISTENCY-010` → `REQ-BUTLER-DUALFLOW-013` → `REQ-BUTLER-VIEWER-011` → `REQ-BUTLER-IMPORT-012`（先立规约与口径底座，再做流程分流，最后引入外部资产）。

### 19.2 交付结果
本包已于 2026-09-24 实施完成，详见 [CHG-004](./change-log.md) 与 [PKG-002](./execution/pkg-002-butler-evolution.md)。技能池 68 → 87。

---

## 20. 下属按需调用 (REQ-BUTLER-ONDEMAND-015)

### 20.1 核心价值与背景
- **现状问题**：`skill-catalog.json` 已达 53.5 KB（估算 ≈ 14,476 token），全量技能正文合计 130 KB（≈ 36,177 token）。任何一次「找技能」的动作都可能把整份编目或大量 `SKILL.md` 拉进上下文；
- **目标**：上下文里**只出现本次任务确实命中的技能正文**，未命中的技能只以索引条目形式存在；
- **口径**：不降低能力——按需调用改变的是「什么时候把正文读进来」，不是「能不能找到」。

### 20.2 递归分裂技能群
1. `lazy-load-policy` (L1): 规约——未命中不加载；禁止通配读取 `skills/**/SKILL.md` 或全量 `README.md`；单任务加载技能正文数 ≤ top-K。
2. `select-skills-for-task` (L2): 输入任务描述，输出选中技能 id 清单（默认 `K=5`），只读检索结果、不读技能正文。
3. `load-skill-contract` (L2): 按精确 id 加载**单个** `SKILL.md` 正文，返回字节数与 token 估算；拒绝通配与目录递归。
4. `verify-context-payload` (L2): 断言一次任务加载的技能正文数 ≤ K、技能正文字节 ≤ 12 KB，且未出现选中清单之外的技能正文。
5. `on-demand-dispatcher` (L3): 复合总控，挂载于「① 意图与路由」，位于 `dual-lane-router` 之后、执行分派之前。

### 20.3 验收标准
- 单任务加载 `SKILL.md` 数量 ≤ 5，技能正文字节合计 ≤ 12 KB（`verify-context-payload` Exit Code == 0）；
- 对未命中技能，一次读取都不发生（可由加载清单证明）。

---

## 21. 过程输出里程碑化 (REQ-BUTLER-PROGRESS-016)

### 21.1 核心价值与背景
- **现状问题**：过程输出把「上车 / 下车」这类高度重复的微操作逐条报出，读者得自己在噪音里找阶段；
- **目标（用户原话的物理化）**：从惠州去北京，只输出「到达长沙」「到达武汉」这类**阶段目标**；微操作折叠为计数，不逐条播报；
- **可落地前提**：必须有一把确定的尺子判定「什么算阶段目标」，否则粒度判定重新落回主观。

### 21.2 三档定义与折叠规则
| 档位 | 定义 | 输出策略 |
| :--- | :--- | :--- |
| **milestone** | 阶段达成（完成 / 到达 / 通过 / 落库 / 门禁通过 / 交付…） | 逐条原样输出，**只增不删** |
| **action** | 普通单步动作（非阶段、非微操作） | 按类别聚合为 `· {类别} ×{N}` |
| **micro** | 高度重复的微操作（读取文件 / 执行命令 / 点击 / 滚动 / 重试…） | 折叠为一行 `· 微操作 ×{N}`，**不得出现单条原文** |

### 21.3 递归分裂技能群
1. `milestone-only-progress` (L1): 里程碑化输出规约与三档定义。
2. `classify-step-tier` (L2): 按词表优先级确定性判定 tier 与 category，输出命中词与理由。
3. `fold-repeated-events` (L2): 按 tier 与类别折叠事件流，产出 `rendered` 多行文本。
4. `verify-progress-budget` (L2): 断言折叠结果不含 micro 原文、milestone 数 ≤ 8、里程碑覆盖 100%、输出事件数下降。
5. `milestone-progress-reporter` (L3): 复合总控，挂载于「④ 输出规约」。

### 21.4 验收标准
- 单任务进度输出事件数 ≤ 8，且 `rendered` 中 micro 级原文出现次数为 0（`verify-progress-budget` Exit Code == 0）；
- 里程碑覆盖率 100%：输入中的每一个 milestone 都出现在输出里。

---

## 22. Google 式技能检索引擎 (REQ-BUTLER-RETRIEVAL-017)

### 22.1 核心价值与背景
- 参考 Google 公开搜索机制的六个可落地部件，把「找技能」从全量加载变成**排序检索 + 片段回灌**；
- **只回灌片段**是省 token 的关键：检索结果不再返回整份编目，而是每条 ≤ 120 字的命中片段。

### 22.2 六个部件与对应技能
| 部件（Google 公开机制） | 本池实现 | 级别 |
| :--- | :--- | :--- |
| 倒排索引（term → 文档） | `build-inverted-index`：由 catalog 生成 `docs/operations/skill-index.json` | L2 |
| 查询解析（分词 / 归一 / 同义 / 停用词 / 纠错） | `parse-query` | L2 |
| 排序（TF-IDF / BM25 + 字段权重 + 长度归一） | `rank-skills-bm25`（字段权重：id > triggers > description） | L2 |
| 摘要片段（snippet） | `emit-search-snippet`（≤120 字） | L2 |
| 结果截断与分页 | `rank-skills-bm25` 的 `--top-k` / `--offset` | L2 |
| 质量信号（点击 → 排序修订） | `log-query-events`：`query → top-K → 实际选用` 落 `docs/operations/skill-query-log.jsonl` | L2 |

规约与总控：
1. `snippet-only-recall` (L1): 检索结果只允许回灌片段，**禁止**把 catalog 或技能正文整体回灌。
2. `google-style-skill-search-router` (L3): 组装上述六项，挂载于「① 意图与路由」，作为 `skill-index-router` 的检索实现升级。

### 22.3 验收标准
- 10 组标准查询的 top-3 命中率 ≥ 90%（期望答案见 [retrieval-queries.json](./execution/fixtures/retrieval-queries.json)）——**实测 10/10 = 100%**；
- 单次检索 stdout payload ≤ 3 KB（紧凑 JSON；`terms` 上限 24 条、每条结果 `matched_terms` 上限 6 项）——**实测 1971 字节**；`skill-index.json` 生成幂等。

---

## 23. Token 结构性下降 (REQ-BUTLER-TOKENBUDGET-018)

### 23.1 核心价值与背景
- **先测后降**：没有基线的「省 token」无法验收，因此第一步是确定性度量；
- **同等能力**：降 token 不得靠删事实、编号或验收证据；能力不变的判据是「证据字符串全部存活」；
- **估算公式（唯一标准）**：`tokens ≈ ceil(CJK 字符数 + ASCII 字节数 / 4)`，零依赖、可复算。

### 23.2 当前基线（109 技能规模实测）
| 上下文资产 | 体积 | 估算 token | 是否进模型上下文 |
| :--- | :--- | ---: | :--- |
| `docs/operations/skill-catalog.json` | 68 KB | ≈ 18,401 | 否（改为检索入口） |
| `docs/operations/skill-index.json` | 545 KB | ≈ 140,522 | **否（脚本侧产物，永不进上下文）** |
| 105 个 `SKILL.md` 合计 | — | ≈ 57,519（均 547/个） | 仅按需加载 ≤ 5 个 |
| `README.md` 合计 | — | ≈ 18,493 | 否（仅供人读） |
| **典型任务基线**（catalog 全量 + 5 个技能正文） | — | **≈ 21,136** | 改造前口径 |
| **改造后端到端实测**（检索层能力 + 5 个技能正文） | — | **3,071** | 下降 **84.9%**（门槛 ≥ 40%） |

> **口径澄清**：`skill-index.json` 体量已到 545 KB（≈14 万 token），但它是**脚本读取的机器产物**，一次都不进模型上下文；把它算进上下文预算会得出错误结论。上表的「改造后实测 3,071 token」已排除索引，只计「检索片段包 + 实际加载的技能正文」。

### 23.3 四项结构性手段
1. **检索替代全量加载**：见 §22，catalog 不再整体进上下文；
2. **按需加载正文**：见 §20，单任务技能正文 ≤ 5 个；
3. **受管区块与重复内容去重**：复用 `render-catalog-docs` 与 `prune-redundant-context`；
4. **注入面收敛**：技能 `description` 收敛到 ≤ 40 字；`README.md` 明确不进上下文（仅供人读）。

### 23.4 递归分裂技能群
1. `token-budget-policy` (L1): 预算优先级（索引/片段 > 技能正文 > 参考文档）与裁剪顺序。
2. `measure-token-budget` (L2): 按唯一公式度量文本/文件体积与分区占比。
3. `prune-redundant-context` (L2): 折叠重复行、重复段落与连续空行；**受管区块与需求编号一律不动**；幂等。
4. `verify-token-reduction` (L2): 断言降幅达标 **且** 全部证据字符串存活（能力不变）。
5. `token-economy-guard` (L3): 复合总控，挂载于「② 契约与合规」。

### 23.5 验收标准
- 同等能力下上下文 token 估算下降 ≥ 40%（`verify-token-reduction` Exit Code == 0）；
- 能力证据字符串全部存活，缺失列表为空；
- `prune-redundant-context` 幂等：第二次运行 `saved_tokens == 0`。

---

## 24. 本次演进带来的编制变化

| 级别 | 新增数 | 总览 |
| :--- | :--- | :--- |
| L1 原子规约 | +4 | `lazy-load-policy`、`snippet-only-recall`、`token-budget-policy`、`milestone-only-progress` |
| L2 工序动作 | +14 | `select-skills-for-task`、`load-skill-contract`、`verify-context-payload`、`build-inverted-index`、`parse-query`、`rank-skills-bm25`、`emit-search-snippet`、`log-query-events`、`measure-token-budget`、`prune-redundant-context`、`verify-token-reduction`、`classify-step-tier`、`fold-repeated-events`、`verify-progress-budget` |
| L3 复合流程 | +4 | `on-demand-dispatcher`、`google-style-skill-search-router`、`token-economy-guard`、`milestone-progress-reporter` |
| L4 中枢编排 | ±0 | `dsh-butler` 新增检索入口、按需加载与里程碑输出收尾 |
| **合计** | **+22** | 87 → 109 |

### 24.1 实施顺序
**`REQ-BUTLER-RETRIEVAL-017` → `REQ-BUTLER-ONDEMAND-015` → `REQ-BUTLER-TOKENBUDGET-018` → `REQ-BUTLER-PROGRESS-016`**。
四条需求是一条链：按需调用依赖检索够准，检索够准才能少进上下文，里程碑化输出管的是出口那一半。

---

## 25. 全流程中文输出 (REQ-BUTLER-ZHFLOW-019)

### 25.1 核心价值与背景
- **范围**：回复正文、进度播报、报错信息、解释说明、脚本注释**一律中文**；技术标识符（路径、命令、代码、技能 id、JSON 键）保留原文，但首次出现必须紧跟中文释义；
- **实测前提**：本仓库技术文档的中文占比只有 **25% ~ 40%**（`product.md` 40.1%、`workflows.md` 25.4%），拉丁字母几乎全是路径、命令与标识符。因此「纯中文」**必须先把非散文成分剥离再断言**，按整体字符占比一刀切会让任何一份合格的技术交付都违规。

### 25.2 剥离规则（顺序固定）
1. ``` 围栏代码块；2. 行内反引号内容；3. URL；4. 文件路径（含 `/` 的 token）。

剥离后的「待检正文」才进入断言；代码块与命令原文**豁免**本规约。

### 25.3 递归分裂技能群
1. `chinese-end-to-end` (L1): 全流程中文规约（含缩写首现必须给中文全称）。
2. `strip-non-prose-scope` (L2): 按固定顺序剥离四类非散文成分，输出待检正文与白名单命中。
3. `verify-chinese-output` (L2): 三项硬断言 —— 待检正文 CJK 占比 ≥ 0.85、非白名单拉丁词 = 0、独立大写缩写后 12 字内必须有中文释义。
4. `chinese-output-guard` (L3): 交付前门禁，挂载于「④ 输出规约」。

### 25.4 验收标准
- 合规中文样本 Exit Code == 0；夹整句英文的样本 Exit Code == 1 且 `violations` 含违规词与位置；
- 白名单外拉丁词零容忍（无宽容档）；
- 字典白名单（专有名词 + 中文技术写作常见借词）：`DSH,JSON,YAML,BM25,CLI,API,MCP,HTML,CSS,SVG,PNG,JPEG,README,SKILL,catalog,index,token,agent,plugin,git,GitHub,Python,Bug,Web,KB,MB,GB,TB,bundle,Node,Shell,Log,Debug,Cache,Cookie,Session,SQL,CSV,XML,TOML,Markdown,npm,pnpm,pip,macOS,Windows,Linux,DeepSeek,OpenAI,HTTP,HTTPS,URL,URI,UUID,ID`（可用 `--allow` 追加）；
- **标识符模式豁免**（不是「外文词」，不参与零容忍，也不参与缩写释义判定）：`REQ-*`、`PKG-NNN`、`CHG-NNN`、`AP-NN`、`AMEND-NN`、`TC-*`、项目内简写编号（如 `ONDEMAND-015`、`UTF-8`）、kebab-case 技能 id、版本号 `v0.2.0`；
- **已汉化缩写免释义**：`ID/URL/URI/UUID/HTTP/HTTPS/SQL/CSV/XML/TOML/KB/MB/GB/TB/API/CLI/CSS/HTML/PNG/JPEG/SVG` 视为已等同中文词，不再强制首现中文全称；`DSH/MCP/BM25/JSON` 这类仍必须给中文全称。

---

## 26. 六执行层树状结构与单一真相源 (REQ-BUTLER-TREE-020)

### 26.1 核心价值与背景
- **现状问题**：`skill-catalog.json` 的 109 条**全部没有 `layer`/`surface` 字段**，cli / api / mcp / plugin / agent 五个层**零注册**；同时集群树存在**多份手写副本**（`dsh-butler/SKILL.md` 的集群表、`place-skill-into-cluster/README.md` 的集群清单），与 PKG-002 修掉的口径漂移是同一类病；
- **目标**：六个执行层统一进树，`docs/operations/execution-tree.json` 成为树的**唯一真相源**，其余展示位置改为「受管区块」或指向它。

### 26.2 六个执行层
| 层级 | 注册方式 | 当前实物 |
| :--- | :--- | :--- |
| skill 技能层 | 由 catalog 自动派生 | 109 条 |
| cli 命令层 | 手工登记 | `bin/skill-pool` 及其 8 个子命令 |
| agent 智能体层 | 手工登记（宿主提供） | `subagent`、`workflow`、`ralph` |
| api 接口层 | 手工登记 | 暂无 |
| mcp 协议层 | 手工登记 | 暂无（宿主连接器不在本仓库） |
| plugin 插件层 | 手工登记 | 暂无（宿主插件不在本仓库） |

### 26.3 递归分裂技能群
1. `tree-update-mandatory` (L1): 规约 —— 任何执行层新增/优化后必须同步刷新索引与树，禁止只改技能不改树。
2. `register-execution-layer` (L2): 非 skill 层的增删改登记，校验 `layer` 合法、`path` 存在（`source=host` 豁免）。
3. `build-execution-tree` (L2): 合并 catalog 与登记表，生成 `execution-tree.json` 与 `execution-tree.md`，并向 `dsh-butler/SKILL.md`、`place-skill-into-cluster/README.md` 注入受管集群区块；幂等。
4. `verify-execution-tree` (L2): 断言 —— 每个 catalog 技能在树中恰好出现一次；父子边合法且无环；每个集群非空；受管区块与生成结果一致；扫描 docs 中手写的集群表（漂移即报行号）。
5. `execution-tree-guard` (L3): 写入门禁，挂载于「② 契约与合规」。

### 26.4 验收标准
- `build-execution-tree` 幂等（第二次 `changed: false`）；
- `verify-execution-tree` Exit Code == 0，且人工篡改一处集群归属后 Exit Code == 1 并给出文件与行号；
- catalog 每条技能新增 `layer` 字段，六层计数可被一次性列出。

---

## 27. 反例层：系统不允许发生的事件 (REQ-BUTLER-ANTIPATTERN-021)

### 27.1 核心价值与背景
- 能力层管「能做什么」，反例层管「**绝不允许发生什么**」；二者互补而非并列；
- **纪律**：每条反例都必须有物理判据，写不出判据的口号一律不得进这一层。

### 27.2 七条反例与判据
| 编号 | 反例 | 物理判据 | 默认阈值 |
| :--- | :--- | :--- | :--- |
| AP-01 | 死循环 | 连续相同动作签名且状态指纹不变 | ≥ 5 次 |
| AP-02 | 无反馈 | 连续 `silent` 步数超阈值，或相邻时间戳间隔超阈值 | 20 步 / 120 秒 |
| AP-03 | 无限重试 | 同一动作失败重复超阈值且状态未变 | > 3 次 |
| AP-04 | 假完成 | 声明完成但门禁探针退出码非 0 | 任一命中即违规 |
| AP-05 | 静默降级 | 捕获错误但未记录仍继续 | 任一命中即违规 |
| AP-06 | 预算爆炸 | 单次上下文加载超预算 | > 30000 token |
| AP-07 | 播报风暴 | 同一 micro 事件原文重复出现 | > 3 次 |

优先级：AP-04 / AP-05（正确性）> AP-01 / AP-03（进展）> AP-02 / AP-07（可观测）> AP-06（成本）。

### 27.3 递归分裂技能群
1. `anti-pattern-policy` (L1): 七条反例清单、判据与优先级。
2. `detect-forbidden-state` (L2): 事件流 → 命中编号 + 事件序号 + 人类可读证据。
3. `verify-no-forbidden-event` (L2): 断言零命中；`--strict` 下空事件流不得「空过」。
4. `anti-pattern-guard` (L3): 反例门禁，挂载于「③ 冲突·冗余·质量」。

### 27.4 验收标准
- 七条反例**逐条可命中**且互不误伤（7 份单项样例 7/7 精确命中）；
- 合规事件流 Exit Code == 0；命中即 Exit Code == 1 并给出 `code` 与事件序号；
- 命中反例时禁止「记录后继续」。

---

## 28. 能不重启就不重启 (REQ-BUTLER-HOTRELOAD-022)

### 28.1 核心价值与背景
- **实测事实**：本会话中途新增 22 个技能、宿主技能目录即时刷新，**一次重启都没发生**；仓库内 `skills/**`、`docs/**`、`docs/operations/*.json`、`bin/skill-pool` 都是「下次读取/下次调用即生效」；
- **处置优先级**：`hot_reload`（热更）> `incremental`（增量重载）> `restart`（重启）；只有落在「不可热更边界」白名单内才允许重启，且必须给出证据。

### 28.2 判定表
| 路径模式 | 处置 | 依据 |
| :--- | :--- | :--- |
| `skills/**` | hot_reload | 技能契约下次调用即生效 |
| `docs/**` | hot_reload | 文档下次读取即生效 |
| `docs/operations/*.json` | hot_reload | 脚本重建后立即生效 |
| `bin/skill-pool` | hot_reload | 下次调用即生效 |
| `apps/web/**`、`dist/**`、`*.bundle.js` | restart | Web 产物需重建并刷新页面 |
| `/Applications/DSH Desktop.app/**` | restart | 宿主应用 bundle 不可热更 |
| 其它未识别路径 | incremental | 保守：先尝试增量重载 |

### 28.3 递归分裂技能群
1. `prefer-hot-reload-policy` (L1): 三级处置定义、判定表与「重启三要素（路径 + 边界 + 重建命令）」。
2. `classify-change-scope` (L2): 变更路径 → 处置级别 + 理由 + 边界，并给出总判定。
3. `verify-no-unnecessary-restart` (L2): 断言每个重启事件都确实必要且带重建命令，否则记为不必要/无证据重启。
4. `zero-restart-guard` (L3): 写入门禁，挂载于「② 契约与合规」。

### 28.4 验收标准
- 只改 `skills/**` 且无重启记录 → Exit Code == 0；
- 改 `skills/**` 却记录重启 → Exit Code == 1（`unnecessary` 非空）；
- 宿主 bundle 重启但缺重建命令 → Exit Code == 1（`unproven` 非空）；
- **口径限定**：宿主侧不可热更属本仓库不可改范围，本次验收只覆盖「仓库可见范围内的不必要重启」。

---

## 29. 本次演进带来的编制变化

| 级别 | 新增数 | 总览 |
| :--- | :--- | :--- |
| L1 原子规约 | +4 | `chinese-end-to-end`、`tree-update-mandatory`、`anti-pattern-policy`、`prefer-hot-reload-policy` |
| L2 工序动作 | +9 | `strip-non-prose-scope`、`verify-chinese-output`、`register-execution-layer`、`build-execution-tree`、`verify-execution-tree`、`detect-forbidden-state`、`verify-no-forbidden-event`、`classify-change-scope`、`verify-no-unnecessary-restart` |
| L3 复合流程 | +4 | `chinese-output-guard`、`execution-tree-guard`、`anti-pattern-guard`、`zero-restart-guard` |
| L4 中枢编排 | ±0 | `dsh-butler` 增加「反例层」入口、树刷新前置与零重启约束 |
| **合计** | **+17** | 109 → 126 |

### 29.1 实施顺序
**`REQ-BUTLER-TREE-020` → `REQ-BUTLER-ZHFLOW-019` → `REQ-BUTLER-ANTIPATTERN-021` → `REQ-BUTLER-HOTRELOAD-022`**。
树是底座：反例层本身就是一个必须进树的新层，重启判定（R4）要先知道「改动落在哪一层」才能判是否可热更；中文探针（R1）与其余三条无耦合，是最便宜的快速见效项。

---

<!-- CATALOG:BEGIN 受管区块：由 skills/render-catalog-docs/scripts/render_docs.py 自动生成，禁止人工编辑 -->

## 附录 A. 组装关系受管区块（自动生成）

- 数据源：`docs/operations/skill-catalog.json`（catalog_version 2.0.0，total_skills 182）
- 级别分布：L1 43 / L2 95 / L3 43 / L4 1

| 级别 | Skill ID | 组装依赖 (Composition) |
| :--- | :--- | :--- |
| **L2** | `acquire-atomic-lock` | `atomic-lock-policy` |
| **L2** | `audit-layer-naming` | `capability-naming-policy` |
| **L2** | `build-execution-tree` | `register-execution-layer` |
| **L2** | `build-image-viewer` | `format-zoomable-visual` |
| **L2** | `build-layer-graph` | `layer-decoupling-policy` |
| **L2** | `build-quantifier-table` | `quantify-modifier-policy` |
| **L2** | `classify-change-scope` | `prefer-hot-reload-policy` |
| **L2** | `classify-decision-reversibility` | `one-shot-resolution-policy` |
| **L2** | `classify-instance-safety` | `instance-pool-policy` |
| **L2** | `classify-step-tier` | `milestone-only-progress` |
| **L2** | `collect-process-evidence` | `process-conformance-policy` |
| **L2** | `concretize-term` | `concretize-ambiguity-policy` + `detect-vague-modifier` |
| **L2** | `declare-lock-set` | `parallel-lock-policy` |
| **L2** | `detect-forbidden-state` | `anti-pattern-policy` |
| **L2** | `detect-layer-coupling` | `build-layer-graph` |
| **L2** | `detect-lock-conflict` | `declare-lock-set` |
| **L2** | `detect-vague-modifier` | `build-quantifier-table` |
| **L2** | `dispatch-skill-search` | `multi-source-search-policy` + `search-github-skill` + `search-official-source` + `merge-search-candidates` |
| **L2** | `emit-search-snippet` | `rank-skills-bm25` |
| **L2** | `fold-repeated-events` | `classify-step-tier` |
| **L2** | `install-client-plugin` | `plugin-control-jump-policy` |
| **L2** | `load-skill-contract` | `lazy-load-policy` |
| **L2** | `log-query-events` | `rank-skills-bm25` |
| **L2** | `measure-token-budget` | `token-budget-policy` |
| **L2** | `merge-search-candidates` | `multi-source-search-policy` |
| **L2** | `parse-query` | `build-inverted-index` |
| **L2** | `plan-fission` | `enforce-atomic-granularity` + `detect-vague-modifier` |
| **L2** | `plan-process-rectification` | `process-conformance-policy` |
| **L2** | `prune-redundant-context` | `measure-token-budget` |
| **L2** | `quantify-modifier` | `detect-vague-modifier` |
| **L2** | `rank-skills-bm25` | `parse-query` + `build-inverted-index` |
| **L2** | `record-assumptions` | `classify-decision-reversibility` |
| **L2** | `register-execution-layer` | `tree-update-mandatory` |
| **L2** | `rename-execution-layer` | `capability-naming-policy` + `audit-layer-naming` + `build-layer-graph` + `build-inverted-index` + `classify-instance-safety` + `build-execution-tree` |
| **L2** | `render-capability-naming` | `capability-naming-policy` + `audit-layer-naming` |
| **L2** | `render-catalog-docs` | `enforce-atomic-granularity` |
| **L2** | `retire-legacy-workspace` | `verify-workspace-retirement` |
| **L2** | `score-process-conformance` | `process-conformance-policy` |
| **L2** | `score-task-lane` | `fastlane-redline-policy` |
| **L2** | `search-official-source` | `multi-source-search-policy` |
| **L2** | `select-skills-for-task` | `rank-skills-bm25` + `lazy-load-policy` |
| **L2** | `strip-non-prose-scope` | `chinese-end-to-end` |
| **L2** | `verify-atomic-mutual-exclusion` | `atomic-lock-policy` + `acquire-atomic-lock` |
| **L2** | `verify-catalog-consistency` | `render-catalog-docs` |
| **L2** | `verify-chinese-output` | `strip-non-prose-scope` |
| **L2** | `verify-concretized-output` | `concretize-term` |
| **L2** | `verify-context-payload` | `select-skills-for-task` + `load-skill-contract` |
| **L2** | `verify-decoupling` | `detect-layer-coupling` |
| **L2** | `verify-execution-tree` | `build-execution-tree` |
| **L2** | `verify-instance-safety` | `classify-instance-safety` |
| **L2** | `verify-interactive-html` | `format-zoomable-visual` |
| **L2** | `verify-lane-decision` | `score-task-lane` |
| **L2** | `verify-layer-naming` | `capability-naming-policy` + `audit-layer-naming` |
| **L2** | `verify-no-forbidden-event` | `detect-forbidden-state` |
| **L2** | `verify-no-lock-violation` | `detect-lock-conflict` + `detect-forbidden-state` |
| **L2** | `verify-no-unnecessary-question` | `record-assumptions` |
| **L2** | `verify-no-unnecessary-restart` | `classify-change-scope` |
| **L2** | `verify-plugin-control-button` | `plugin-control-jump-policy` + `install-client-plugin` |
| **L2** | `verify-progress-budget` | `fold-repeated-events` + `classify-step-tier` |
| **L2** | `verify-quantified-output` | `quantify-modifier` + `detect-vague-modifier` |
| **L2** | `verify-token-reduction` | `measure-token-budget` + `prune-redundant-context` |
| **L3** | `anti-pattern-guard` | `anti-pattern-policy` + `detect-forbidden-state` + `verify-no-forbidden-event` |
| **L3** | `atomic-fastpath-router` | `fastpath-dispatch-guide` + `generate-fastpath-route` |
| **L3** | `atomic-fission-guard` | `enforce-atomic-granularity` + `plan-fission` |
| **L3** | `atomic-lock-guard` | `atomic-lock-policy` + `acquire-atomic-lock` + `verify-atomic-mutual-exclusion` |
| **L3** | `catalog-consistency-guard` | `render-catalog-docs` + `verify-catalog-consistency` |
| **L3** | `chinese-output-guard` | `chinese-end-to-end` + `strip-non-prose-scope` + `verify-chinese-output` |
| **L3** | `concise-chinese-bold-guard` | `output-chinese-only` + `limit-words-under-10` + `markdown-bold-only` + `no-conversational-filler` |
| **L3** | `concretization-guard` | `concretize-ambiguity-policy` + `concretize-term` + `verify-concretized-output` |
| **L3** | `conflict-detector` | `arbitrate-priority-resolver` + `detect-rule-conflicts` |
| **L3** | `decoupling-guard` | `layer-decoupling-policy` + `build-layer-graph` + `detect-layer-coupling` + `verify-decoupling` |
| **L3** | `dual-lane-router` | `fastlane-redline-policy` + `score-task-lane` + `verify-lane-decision` |
| **L3** | `execution-tree-guard` | `tree-update-mandatory` + `register-execution-layer` + `build-execution-tree` + `verify-execution-tree` |
| **L3** | `full-spectrum-skill-auditor` | `enforce-contract-completeness` + `audit-all-skills-compliance` |
| **L3** | `google-style-skill-search-router` | `snippet-only-recall` + `build-inverted-index` + `parse-query` + `rank-skills-bm25` + `emit-search-snippet` + `log-query-events` |
| **L3** | `iconized-output-showcase` | `format-iconized-tail` + `validate-icon-syntax` |
| **L3** | `index-body-contract` | `standardize-workflow-sop` + `verify-mermaid-syntax` + `check-script-executable` + `verify-execution-contract` |
| **L3** | `index-header-contract` | `standardize-when-to-use` + `validate-header-triggers` |
| **L3** | `instance-pool-guard` | `instance-pool-policy` + `classify-instance-safety` + `verify-instance-safety` |
| **L3** | `intent-detector` | `filter-conversational-noise` + `strip-whitespace-newlines` + `detect-action-verb` + `detect-target-entity` + `extract-core-objective` |
| **L3** | `interactive-image-viewer` | `format-zoomable-visual` + `build-image-viewer` + `verify-interactive-html` |
| **L3** | `layer-naming-guard` | `capability-naming-policy` + `audit-layer-naming` + `rename-execution-layer` + `verify-layer-naming` + `render-capability-naming` |
| **L3** | `milestone-progress-reporter` | `milestone-only-progress` + `classify-step-tier` + `fold-repeated-events` + `verify-progress-budget` |
| **L3** | `on-demand-dispatcher` | `lazy-load-policy` + `select-skills-for-task` + `load-skill-contract` + `verify-context-payload` |
| **L3** | `one-shot-guard` | `one-shot-resolution-policy` + `classify-decision-reversibility` + `record-assumptions` + `verify-no-unnecessary-question` |
| **L3** | `parallel-lock-guard` | `parallel-lock-policy` + `declare-lock-set` + `detect-lock-conflict` + `verify-no-lock-violation` |
| **L3** | `plugin-control-guard` | `plugin-control-jump-policy` + `install-client-plugin` + `verify-plugin-control-button` |
| **L3** | `process-supervisor` | `process-conformance-policy` + `collect-process-evidence` + `score-process-conformance` + `plan-process-rectification` |
| **L3** | `qa-gatekeeper` | `verify-file-exists` + `check-python-syntax` + `ensure-utf8-encoding` + `assert-zero-exitcode` |
| **L3** | `quantification-guard` | `quantify-modifier-policy` + `build-quantifier-table` + `detect-vague-modifier` + `quantify-modifier` + `verify-quantified-output` |
| **L3** | `redundancy-detector` | `prune-bloated-prompts` + `search-duplicate-rules` |
| **L3** | `schema-guard` | `no-conversational-filler` + `strip-markdown-fence` + `extract-json-payload` |
| **L3** | `skill-import-pipeline` | `search-github-skill` + `audit-imported-skill` + `normalize-skill-contract` + `place-skill-into-cluster` + `dispatch-skill-search` + `search-official-source` + `merge-search-candidates` |
| **L3** | `skill-index-router` | `match-intent-keywords` + `disambiguate-candidates` |
| **L3** | `spec-driven-governance` | `sync-requirements-lifecycle` + `reconcile-knowledge-specs` + `run-test-cases-gate` |
| **L3** | `standard-output-framework` | `format-status-block` + `conditional-deliverable-router` + `verify-deliverable-paths` + `high-relevance-notes-only` |
| **L3** | `tail-metrics-showcase` | `output-chinese-only` + `concise-focused-output` + `plain-analogy-explanation` + `measure-routing-metrics` + `format-iconized-tail` + `validate-icon-syntax` |
| **L3** | `token-economy-guard` | `token-budget-policy` + `measure-token-budget` + `prune-redundant-context` + `verify-token-reduction` |
| **L3** | `visual-interaction-guard` | `format-zoomable-visual` + `zoom-level-policy` + `build-image-viewer` + `verify-interactive-html` + `interactive-image-viewer` |
| **L3** | `visualize-governance-topology` | `format-visual-inspection` + `extract-catalog-topology` + `render-governance-mermaid` |
| **L3** | `zero-restart-guard` | `prefer-hot-reload-policy` + `classify-change-scope` + `verify-no-unnecessary-restart` |
| **L4** | `dsh-butler` | `detect-vague-modifier` + `retire-legacy-workspace` |

<!-- CATALOG:END -->

---

## 30. 修饰程度词必须量化 (REQ-BUTLER-QUANTIFY-023)

### 30.1 核心价值与背景
- **现状实测**：仓库里程度类修饰词密度很高——`大` 98 处、`快` 69 处、`多` 61 处、`高` 52 处、`好` 18 处，涉及 155 个文件实例；真正被量化的不足一成（例：`fold-repeated-events/SKILL.md` 写「上报大量同质动作」）。
- **目标**：凡出现程度类修饰词（高 / 大 / 快 / 多 / 好 / 严重 / 频繁 / 明显 / 显著…），必须给出**四要素**：`场景` + `数值或区间` + `单位` + `依据`。
- **量化来源**：以公开统计、国家标准、行业惯例或本项目既有基线为准，**禁止拍脑袋**；每条映射必须可追溯到 `basis` 字段。

### 30.2 量化四要素与示例
| 模糊词 | 场景 | 量化结果 | 依据（basis） |
| :--- | :--- | :--- | :--- |
| 高 | 成年男性身高 | `≥ 180 cm` | 公开身高分布：均值约 170 cm，180 cm 约在前 10% |
| 快 | 接口响应 | `P95 ≤ 200 ms` | 行业常见 SLA 区间 |
| 大 | 单表数据量 | `≥ 1000 万行` | 单机关系库经验阈值 |
| 多 | 单次检索候选 | `≥ 20 条` | 本项目 `--top-k` 默认 5 的 4 倍冗余 |

**场景优先于全局**：同一个词在不同场景量化不同（「大文件」在日志场景是 ≥100 MB，在代码库场景是 ≥1 MB）。

### 30.3 递归分裂技能群
1. `quantify-modifier-policy` (L1): 程度词四要素规约与「不可量化不得沉默」原则。
2. `build-quantifier-table` (L2): 生成并维护 `docs/operations/quantifier-table.json`（term / domain / quantified / unit / basis），幂等。
3. `detect-vague-modifier` (L2): 扫描文本，输出命中词、位置、类别（`degree` / `ambiguity`）与是否已量化；**同时成为全仓模糊词表的唯一真相源**（现有两份不一致副本收编于此）。
4. `quantify-modifier` (L2): 按场景映射把模糊词替换为数值区间；无映射时输出 `unquantifiable` 并要求显式声明假设。
5. `verify-quantified-output` (L2): 断言输出中不存在未量化的程度词。
6. `quantification-guard` (L3): 交付门禁，挂载于「④ 输出规约」。

### 30.4 验收标准
- `quantifier-table.json` 每条形如四要素齐全，缺 `basis` 即视为不合格条目；
- 对 5 个真实样本（含「大量同质动作」「响应要快」「数据量大」）跑门禁：已量化样本 exit 0，未量化样本 exit 1 并列出词与位置；
- **词表收敛**：`plan-fission` 与 `fission_engine` 不再各自维护词表，二者改为引用唯一真相源。

---

## 31. 含糊其辞必须具像化 (REQ-BUTLER-CONCRETIZE-024)

### 31.1 核心价值与背景
- 与 §30 共用同一条「检测 → 映射 → 断言」管线，差别只在词表与替换动作：程度词是**补数值**，含糊词是**补实体与判据**。
- **三类含糊**与各自的具像化方式：

| 类别 | 典型词 | 具像化方式 |
| :--- | :--- | :--- |
| 范围含糊 | 若干 / 一些 / 部分 / 多个 / 等等 | 给出确切数量或区间 + 计数依据 |
| 指代含糊 | 相关 / 相应 / 等 / 其它 / 之类 | 枚举出具体实体清单（可核对） |
| 时序含糊 | 尽快 / 必要时 / 适时 / 及时 | 给出可判定的触发条件 + 时限 |

### 31.2 递归分裂技能群
1. `concretize-ambiguity-policy` (L1): 三类含糊的定义、替换方式与「不得用同义词替代」原则。
2. `concretize-term` (L2): 对命中词产出具像化建议（具体数量 / 实体枚举 / 触发条件 + 时限）。
3. `verify-concretized-output` (L2): 断言输出中不存在未具像化的含糊词。
4. `concretization-guard` (L3): 交付门禁，挂载于「④ 输出规约」。

### 31.3 验收标准
- 三类含糊词各有一份违规样本被精确命中并 exit 1；
- 具像化建议必须可核对（数量带依据、实体可枚举、时序带时限），**禁止用另一个模糊词替换**（如「尽快」→「尽早」属不合格）。

---

## 32. 一次性解决，不反复提问 (REQ-BUTLER-ONESHOT-025)

### 32.1 核心价值与背景
- **现状实测**：本会话连续三个交付包，每个都以一轮「问 2 个问题 → 等回答」收尾，共 3 轮 6 次往返；其中绝大多数问题（阈值取值、默认档位）本可自行决断。
- **默认规则**：**不提问**。遇不确定项时，选择一个**可回滚的默认值**自行决断，并在交付中显式列出所作假设。
- **唯一例外**：命中 `fastlane-redline-policy` 的红线 **且** 该决策不可逆时，才允许提问，且必须合并为**一次批量提问**，禁止挤牙膏式追问。

### 32.2 与既有能力的关系（需显式裁决）
- `confirm-before-coding`（@system L2）原要求「写入前确认」。本需求将其作用域**收窄为「红线内且不可逆」的变更**；普通写入按一次性原则自行决断并记录假设。该裁决须由 `conflict-detector` 记录，避免两条规则互相打架。

### 32.3 递归分裂技能群
1. `one-shot-resolution-policy` (L1): 默认不提问、可回滚默认值、假设必须留痕、例外仅红线+不可逆。
2. `classify-decision-reversibility` (L2): 判定每个不确定项是否可逆、是否命中红线，输出 `decide_now` / `ask_once` 与理由。
3. `record-assumptions` (L2): 把自行决断的假设写入交付清单（`assumptions` 数组：项 / 取值 / 依据 / 回滚方式）。
4. `verify-no-unnecessary-question` (L2): 断言本次任务未发起不必要提问；允许的提问必须同时满足「红线 + 不可逆 + 已合并为一次」。
5. `one-shot-guard` (L3): 门禁，挂载于「③ 冲突·冗余·质量」。

### 32.4 验收标准
- 对 5 类不确定项（阈值取值 / 命名风格 / 文件路径 / 删除既有文件 / 发布推送）跑判定：前三类判 `decide_now`，后两类判 `ask_once`；
- 交付清单必含 `assumptions`，每项含依据与回滚方式；
- 反问检测：同一次任务中出现第二次提问即判失败。

---

## 33. 本次演进带来的编制变化

| 级别 | 新增数 | 总览 |
| :--- | :--- | :--- |
| L1 原子规约 | +3 | `quantify-modifier-policy`、`concretize-ambiguity-policy`、`one-shot-resolution-policy` |
| L2 工序动作 | +9 | `build-quantifier-table`、`detect-vague-modifier`、`quantify-modifier`、`verify-quantified-output`、`concretize-term`、`verify-concretized-output`、`classify-decision-reversibility`、`record-assumptions`、`verify-no-unnecessary-question` |
| L3 复合流程 | +3 | `quantification-guard`、`concretization-guard`、`one-shot-guard` |
| L4 中枢编排 | ±0 | `dsh-butler` 增加量化门禁、具像化门禁与「默认不提问 + 假设留痕」约束 |
| **合计** | **+15** | 126 → 141 |

### 33.1 实施顺序
**`REQ-BUTLER-QUANTIFY-023` → `REQ-BUTLER-CONCRETIZE-024` → `REQ-BUTLER-ONESHOT-025`**。
023 与 024 共用同一检测器（`detect-vague-modifier` 的唯一真相源），故 023 先行为 024 铺路；025 与前两者无耦合，最后落地。

### 33.2 自行拍定的默认值（依 §32 一次性原则，不再征询）
| 项 | 取值 | 依据 |
| :--- | :--- | :--- |
| 量化缺失处置 | 输出 `unquantifiable` 并强制声明假设，**不阻断交付** | 阻断会惩罚「公开基准确实不存在」的场景 |
| 词表唯一真相源 | `detect-vague-modifier` 内置表 + `quantifier-table.json` | 消除现有两份不一致副本（12 项 vs 10 项） |
| 提问上限 | 每任务 ≤ 1 次，且必须红线 + 不可逆 | 与 §32.1 例外条款一致 |
| 假设清单位置 | 交付回复内 `assumptions` 段落 | 无需新增文件，随交付可追溯 |


---

## 34. 宿主反馈面需求登记（外部依赖） (REQ-BUTLER-UISURFACE-026)

### 34.1 定位说明
本条为**宿主侧需求登记**：目标控件不在本技能池仓库内，本仓库不具备实施条件，仅登记需求、验收口径与精确定位证据，供宿主/插件侧实现。按 §28 的 `prefer-hot-reload-policy`，此类改动属 **restart 白名单**（需重建 Web 产物并刷新页面，或重装插件）。

### 34.2 三条需求与精确实测定位
| 需求 | 归属 | 精确定位（实测） | 现状与建议 |
| :--- | :--- | :--- | :--- |
| **U1 状态栏字体整体加大** | 宿主主题 + 社区插件 | 状态栏由社区插件 `dsh-bottom-info-bar` v1.20.8 渲染；其字号取自宿主变量 `--dsh-content-font-size-secondary`，插件**自身无字号设置项**（只有「完整 / 简洁」两种信息密度，见 `host.infoDensityMustBeFullOrCompact`） | 正解是**调宿主字号/主题变量**（"整体加大"）；若只放大该插件，属局部补丁，不符合"整体" |
| **U2 空闲价做成单独视觉模块** | 社区插件 `dsh-bottom-info-bar` | 插件**已有两个互相独立、可单独开关的字段**：`field.period`（当前时段：高峰/空闲）、`field.countdown`（下次价格切换倒计时）；相关文案 `ui.offPeakPrice=空闲价`、`ui.pricingPeakOffPeakBeijing=定价：峰谷价（工作日高峰 9-12、14-18 点；周末全天空闲）` | **首选零代码路径**：在「信息栏设置 → 要显示的信息」中只开这两个字段、关掉其余；若需徽章/进度环等更强视觉强调，才需改插件 |
| **U3 任务列表常显（成功后仍保留）** | 宿主应用级 UI | 未在任何社区插件中找到归属；候选为应用包内的 `dsh-client-ui-jobs` / `dsh-client-ui-plan` | 需宿主机侧改动；本仓库无法验证其实现细节 |

### 34.3 硬约束（为什么不打补丁）
1. 宿主 UI 位于**已签名的应用包**内（`/Applications/DSH Desktop.app/**`）——改动破坏签名，且随应用更新丢失；
2. 已装插件位于**生成缓存**（`.../profiles/.generations/live/<plugin>+<ver>/node_modules/`）——下次生成即被覆盖；
3. 规范路径是 **fork 插件上游仓库 → 本地安装**，而不是就地改缓存。

### 34.4 本仓库能做的部分（已交付）
- 把「宿主应展示哪些字段」沉淀为可核对的**展示契约**（本节 §34.2 表即为该契约）；
- 给出**零代码优先**的处置顺序（先设置项 → 再插件改动 → 最后宿主改动）；
- 登记为外部依赖需求条目，纳入索引与变更记录，避免"提了就忘"。

---

## 35. 执行层解耦设计 (REQ-BUTLER-DECOUPLE-027)

### 35.1 核心价值与背景
- 执行层之间当前通过 `composition` 边与脚本内 `importlib` 路径**两种方式**耦合，其中后者**不写进契约**，是最隐蔽的一类；
- 目标：执行层只通过**契约**通信（catalog 的 composition 边 + 显式登记的产物路径），依赖方向单向，禁止环，共享产物显式登记。

### 35.2 五类物理判据
| 类别 | 判据 |
| :--- | :--- |
| `reverse_dependency` | 低层技能的 composition 引用高层技能（L1→L3 等） |
| `dependency_cycle` | composition 图存在有向环 |
| `cross_layer_jump` | L1/L2 直接引用 L4 中枢 |
| `implicit_dependency` | 脚本 importlib 加载了某技能模块，但该 id **未出现在自己的 composition** 中 |
| `shared_mutable_state` | 两个及以上技能写同一个产物路径却没登记为共享资源 |

### 35.3 递归分裂技能群
1. `layer-decoupling-policy` (L1): 契约通信、单向依赖、禁止环与显式登记共享产物。
2. `build-layer-graph` (L2): 生成 `docs/operations/layer-graph.json`（节点 + 边 + 违规）。
3. `detect-layer-coupling` (L2): 真实扫描 frontmatter 与脚本源码，输出五类违规。
4. `verify-decoupling` (L2): 断言违规为零（豁免需显式登记并标注 `waived`）。
5. `decoupling-guard` (L3): 写入门禁，挂载于「② 契约与合规」。

### 35.4 验收标准
- `build-layer-graph` 幂等；`--check` exit 0；
- 五类判据**逐条可命中**（临时假仓库验证）；
- 首轮真实扫描结果**如实报告**（存量违规不隐藏、不用放宽判据的方式凑绿）。

---

## 36. 执行层可多实例 (REQ-BUTLER-MULTIINSTANCE-028)

### 36.1 核心价值与背景
- 管家并行处理的前提是「执行层能被安全地多开」；本层负责**准入判定**，真正起实例由宿主的 `subagent` / 后台 job 承担；
- 三档：`safe_multi`（无状态幂等可无锁并发）/ `needs_lock`（同资源键上须持锁）/ `single_only`（写固定路径或读全局可变状态，必须串行）。

### 36.2 递归分裂技能群
1. `instance-pool-policy` (L1): 三档定义与判定信号（写盘、固定路径、非确定性、临时文件）。
2. `classify-instance-safety` (L2): 真实扫描 `scripts/*.py` 分档，并可写 `docs/operations/instance-safety.json`。
3. `verify-instance-safety` (L2): 断言每个本地技能都有声明、声明与实际一致、`safe_multi` 无写盘证据、`needs_lock`/`single_only` 有非空资源键。
4. `instance-pool-guard` (L3): 派单前门禁，挂载于「② 契约与合规」。

### 36.3 验收标准
- 全仓分档真实分布如实给出；
- `instance-safety.json` 写盘幂等；
- 反向：声明 `safe_multi` 但实际写固定路径 → 断言 3 命中并 exit 1。

---

## 37. 并行任务调控锁 (REQ-BUTLER-PARALLELLOCK-029)

### 37.1 核心价值与背景
- 并行不是"先跑起来再说"，而是**先证明可并行**：锁集合两两不相交才允许同组并发；
- **死循环判定复用** `anti-pattern-policy` 的 **AP-01**（连续相同 action 且 state 不变 ≥5 次），禁止另立判据。

### 37.2 四条硬规则
1. **锁粒度 = 共享资源键**（文件路径 / 目录 / 端口 / 实例 id）；
2. **加锁顺序 = 字典序固定顺序**（防死锁的充分手段）；
3. **超时默认 300 秒**，超时即判失败并释放；
4. **无锁共享写为禁止项**。

### 37.3 递归分裂技能群
1. `parallel-lock-policy` (L1): 四条硬规则 + 复用 AP-01 的纪律。
2. `declare-lock-set` (L2): 归一化与排序锁集合，检出 `missing_locks` 与 `non_canonical`。
3. `detect-lock-conflict` (L2): 检出 `lock_conflict` / `deadlock_cycle` / `lock_timeout`，并给出 `parallel_groups` 与 `serialization_plan`。
4. `verify-no-lock-violation` (L2): 五项断言（含 AP-01 死循环体检）。
5. `parallel-lock-guard` (L3): 派单前门禁，挂载于「③ 冲突·冗余·质量」。

### 37.4 验收标准
- 四份样例（可安全并行 / 锁冲突 / 死锁环 / 超时）判定与预期一致；
- `parallel_groups` 组内两两无锁交集，`serialization_plan` 覆盖全部冲突对；
- 不合规样例 exit 1 并指出冲突键或环路径。

---

## 38. 本次演进带来的编制变化

| 级别 | 新增数 | 总览 |
| :--- | :--- | :--- |
| L1 原子规约 | +3 | `layer-decoupling-policy`、`instance-pool-policy`、`parallel-lock-policy` |
| L2 工序动作 | +8 | `build-layer-graph`、`detect-layer-coupling`、`verify-decoupling`、`classify-instance-safety`、`verify-instance-safety`、`declare-lock-set`、`detect-lock-conflict`、`verify-no-lock-violation` |
| L3 复合流程 | +3 | `decoupling-guard`、`instance-pool-guard`、`parallel-lock-guard` |
| L4 中枢编排 | ±0 | `dsh-butler` 增加解耦门禁、实例准入门禁与并行派单锁 |
| **合计** | **+14** | 141 → 155 |

### 38.1 实施顺序
**`REQ-BUTLER-DECOUPLE-027` → `REQ-BUTLER-MULTIINSTANCE-028` → `REQ-BUTLER-PARALLELLOCK-029`**。
解耦先行：多实例安全与并行锁都建立在"层间依赖已白盒化"之上——依赖关系不清楚，就无从判断哪些能并发。

### 38.2 自行拍定的默认值（依 §32 一次性原则）
| 项 | 取值 | 依据 |
| :--- | :--- | :--- |
| A 组（U1~U3）处置 | 登记为宿主侧需求 + 展示契约，**不打补丁到签名包与生成缓存** | 补丁会被更新/重建冲掉并破坏签名 |
| U2 首选路径 | 先开插件现有 `field.period` + `field.countdown` | 已有能力优先于新增代码 |
| 锁粒度 | 共享资源键 | 过粗串行化一切，过细锁不住 |
| 锁超时 | 300 秒 | 与 §32 的 1 次提问预算同源：宁可失败也不无限等待 |
| 死循环判据 | 复用 AP-01 | 已有定义，禁止第二份 |

---

## 39. 并发处理处的物理原子锁 (REQ-BUTLER-ATOMICLOCK-030)

**需求原文**：「需要同时处理的地方增加原子锁，确保是同时进行的」。

**问题定位**：存量只有**声明层锁**——`declare-lock-set` 声明锁集合、`detect-lock-conflict` 静态检测冲突与死锁、
`verify-no-lock-violation` 断言、`parallel-lock-guard` 派单门禁。四者全部是静态检查：它们能证明
「两个任务理论上不该并行」，但**不能阻止**两个进程真的同时写同一份文件。

**交付形态**：补齐锁的**物理实现层**，并把「真的互斥」变成可复算的实验证据。

| 层级 | 能力 | 作用 |
| :--- | :--- | :--- |
| L1 | `atomic-lock-policy` | 七条硬口径：载体 / 锁键 / 顺序 / 持有者 / 超时 / 陈旧回收 / 释放必达 |
| L2 | `acquire-atomic-lock` | `mkdir` 原子目录真获取与释放，两种锁模式，陈旧回收，释放必达 |
| L2 | `verify-atomic-mutual-exclusion` | 真并发压测：持锁段 / 无锁对照段 / 陈旧回收段三段证据 |
| L3 | `atomic-lock-guard` | 把四者串成放行门禁，挂载管家「③ 冲突·冗余·质量」集群 |

### 39.1 七条硬口径

| # | 口径 | 取值与理由 |
| :---: | :--- | :--- |
| ① | 锁载体 | **仅** `mkdir` 原子目录与 `flock -n` 排他文件锁；`exists-then-write`、pid 文件读改写、应用层布尔标志一律判伪原子 |
| ② | 锁键 | `os.path.realpath` 归一为绝对路径并剥尾斜杠；相对路径因 cwd 不同会算出两个键，锁形同虚设 |
| ③ | 加锁顺序 | 字典序（与 `parallel-lock-policy` 同源）；字典序是全序，同一全序下等待环在数学上不可能 |
| ④ | 持有者标识 | `pid` + `start_ticks`；仅 PID 会因操作系统复用而误判「锁仍被合法持有」 |
| ⑤ | 超时 | 默认 **300 秒**，既是等待上限也是持有上限；超时即失败并释放，绝不无限等待 |
| ⑥ | 陈旧回收 | 判据按模式分档（见 39.2）；回收方式只能是「删除锁目录后重新 `mkdir`」，禁止就地改写 |
| ⑦ | 释放必达 | `try/finally` + `SIGINT`/`SIGTERM`/`SIGHUP` 处理器覆盖退出 / 异常 / INT / TERM 四条路径；释放前校验 token，禁止释放他人锁 |

### 39.2 两种锁模式（本需求最易踩错之处）

| 模式 | 语义 | 陈旧判据 | 适用 |
| :--- | :--- | :--- | :--- |
| `lease`（默认） | 锁**跨命令调用**存活，持有者进程退出 ≠ 锁失效 | `start_ticks` 与存活进程不符（PID 复用）**或** 持有超时 | 多步任务先 `acquire`、跨若干命令、最后 `release` |
| `live` | 锁与持有进程同生共死 | `pid` 不存在 **或** `start_ticks` 不符 **或** 持有超时 | `run` 子命令（自动强制） |

**这是实测踩出来的**：首版实现只用一套 `live` 判据，`acquire` 命令自身退出后锁立刻被判
`pid_not_alive` 回收，第二次 `acquire` 竟然成功——**互斥彻底失效**。两种模式不是可选优化，
是两套不同的正确性口径。

### 39.3 验收实数

| 段 | 重叠窗口 | 最大同时持有者 | 完成临界区 |
| :--- | ---: | ---: | ---: |
| `guarded`（16 进程 × 20 轮，持锁） | **0** | **1** | 320 / 320 |
| `control`（同参数，**不持锁**） | **318** | **17** | 320 / 320 |

**为什么必须有 `control` 段**：一个永远输出「0 重叠」的检测器，在真互斥和完全没锁两种情况下
结论相同——那种 0 是**假阴性**。只有当场证明同一检测器在不加锁时看得见并发，持锁段的 0 才有证明力。

---

## 40. 知识库能力层命名规则 (REQ-KB-CAPABILITYNAMING-031)

**需求原文**：「知识库新增能力层命名规则，归属、分类（cli 还是 api 还是 agent 还是 skill 等）、做什么等」。

**落点**：`/Users/linqiyu/Documents/DSH/全局规则/knowledge/common/capability_naming_spec.md`（知识库通用公共规范层）；
机器可读唯一真相源为 `docs/operations/capability-naming.json`。

**禁止双写**：知识库文档的规则表由 `render-capability-naming` 从 JSON 单向渲染成受管区块，
人工编辑会在下一次 `--check` 被判为漂移。

### 40.1 四要素

| # | 要素 | 字段 | 它回答的问题 | 判据 |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **归属** | `owner` | 它归谁管？ | L1/L2 必须被同池 `composition` 边引用；L3 必须落在七个集群之一；L4 是根 |
| 2 | **分类** | `layer` | 它是哪一种执行层？ | 六层闭集 `skill`/`cli`/`agent`/`api`/`mcp`/`plugin`，须与 `execution-layers.json` 逐字一致 |
| 3 | **做什么** | `intent` | 它到底做什么？ | `description` 非空且 ≥ 20 字节，且带已登记的层级声明前缀 |
| 4 | **命名** | `id` | 它物理上叫什么？ | 目录名 + catalog `id` + Frontmatter `name` 三处逐字一致，且落在四种形态之一 |

### 40.2 四种已登记命名形态

| 形态 | 判据 | 强制层级 | 例 |
| :--- | :--- | :--- | :--- |
| `action` 动作形态 | 首段 ∈ 动词词汇表（61 条，含语义边界） | **L2 强制** | `verify-layer-naming` |
| `orchestration` 编排形态 | 末段 ∈ 编排名词表（15 条） | L3 二者取一 | `layer-naming-guard` |
| `policy` 规约形态 | 末段 ∈ `policy`/`spec`/`standard`/`protocol` | L1 允许 | `atomic-lock-policy` |
| `vendor` 厂商形态 | 整名为单段且 ∈ 单段厂商白名单 | 外部平台边界 | `github` |

**L1 形态自由是经过论证的例外**：L1 有 39 条全是规约，描述的是「什么必须成立」而非「做什么动作」。
若强制动词开头，`chinese-end-to-end`、`no-conversational-filler`、`milestone-only-progress`
会被迫改成 `enforce-*` 之类——语义没有变准，只是换了个动词壳，代价是 13 次无收益改名。

### 40.3 禁词与同义归一

- **禁词**（18 个）：`util` `utils` `helper` `helpers` `misc` `temp` `tmp` `new` `old` `bak` `final` `copy` `test2` `data2` `stuff` `thing` `v2` 等——全部是**信息量为零**的词，只说明相对于什么而存在，不说明能力做什么；
- **同义归一**：`search` / `find` / `query` / `lookup` / `seek` 只允许 `search` 作为首段；
- **明确不合并的边界词对**：`check`/`verify`（单点检测 vs 断言裁决）、`build`/`generate`（既有数据源 vs 参数模板）、`audit`/`detect`（全量审查 vs 命中定位）。

---

## 41. 执行层命名规范管理与存量整改 (REQ-LAYER-NAMINGAUDIT-032)

**需求原文**：「对所有的执行层进行命名规范管理，然后对存量执行层进行命名整改，整改同时要对树状结构以及索引等跟命名相关的地方进行同步」。

### 41.1 改名的六处同步契约

改名**不是**只改目录名。任何一次改名必须同时改掉下表六处，漏一处即判悬空引用：

| # | 同步对象 | 位置 |
| :---: | :--- | :--- |
| 1 | 目录名 | `skills/<id>/`，配套脚本 `<from_>.py` → `<to_>.py` |
| 2 | 技能 ID | `skill-catalog.json` 的 `id` 与 `name`，以及全部派生产物 |
| 3 | 契约头 | `SKILL.md` 的 YAML Frontmatter `name` |
| 4 | 组装边 | 全池 `composition` / `depends_on` 引用 |
| 5 | 树与索引 | `execution-tree.json`/`.md`、`skill-index.json`、`layer-graph.json`、`instance-safety.json` |
| 6 | 文档与登记 | `docs/**` 受控正文与受管区块、`execution-layers.json` |

### 41.2 存量整改实数

| 旧名 | 新名 | 违规码 | 命中文件数 |
| :--- | :--- | :--- | ---: |
| `find-duplicate-rules` | `search-duplicate-rules` | `synonym_alias` + `shape_action` | 14 |
| `concise-chinese-bold` | `concise-chinese-bold-guard` | `shape_orchestration` | 19 |
| `google-style-skill-search` | `google-style-skill-search-router` | `shape_orchestration` | 28 |

- 整改前合规率 **0.9811（156/159）**，整改后 **1.0000（165/165）**；
- 合计改写 **61 个文件**，五件派生产物全部重建成功；
- 整改器**幂等**：二次运行 `changed_files_total = 0` 且退 0。

### 41.3 两个实测踩出来的检测器缺陷

| # | 缺陷 | 后果 | 修复 |
| :---: | :--- | :--- | :--- |
| ① | 旧名按**子串**扫描 | 追加后缀式改名（旧名是新名前缀）让**合规新名被误报**为残留，误报 47 个文件 | 改用词边界正则 `(?<![a-z0-9-])旧名(?![a-z0-9-])`，误报归零 |
| ② | 未区分**唯一临时键**与固定临时路径 | `tempfile.mkdtemp` 被当作共享写，把可无锁并发的执行层误判为 `single_only` 且资源键为空 | 分类器区分唯一键与固定路径，并支持脚本内 `[shared-resource] <键>` 显式声明 |

**①为什么重要**：一个会把合规产物报成违规的检测器，比没有检测器更糟——它会逼人忽略它的输出。

### 41.4 新增能力

| 层级 | 能力 | 作用 |
| :--- | :--- | :--- |
| L1 | `capability-naming-policy` | 四要素、四形态、语法、禁词、同义归一、六处同步契约 |
| L2 | `audit-layer-naming` | 全量体检，输出违规码 + `file:line`；`naming_rules.py` 是全池唯一判据实现 |
| L2 | `rename-execution-layer` | 六处同步整改，词边界替换，幂等，留痕，按重建链刷新派生产物 |
| L2 | `verify-layer-naming` | 合规率 / 悬空引用 / 登记表三项实数断言 |
| L2 | `render-capability-naming` | 规范文档单向渲染 + 漂移检测 |
| L3 | `layer-naming-guard` | 把四者串成命名放行门禁，挂载管家「② 契约与合规」集群 |

**判据只有一份**：`naming_rules.py` 被体检、断言、渲染三处共用。两份判据必然漂移，
漂移之后同一个技能会「体检合规、门禁违规」。

---

## 42. Skill池与全局规则目录合并 (REQ-REPO-MERGE-033)

**需求原文**：「对 skill 池文件夹和全局规则文件夹进行合并，把 skill 池合并到全局规则中，并同时把任务会话也挪到那边，确保执行完这个任务后即刻刷新生效」。

**合并目标**：`/Users/linqiyu/Documents/DSH/全局规则`（用户 2026-09-24 明确指定）。

### 42.1 目标结构

```
/Users/linqiyu/Documents/DSH/全局规则/     ← 唯一根
├── rules/ knowledge/ indexes/ scripts/ …  ← 原有，不动
├── skill-pool/                            ← 新增：由 Skill池 整体迁入（保留全部提交历史）
└── workspaces/workspaces.json             ← 新增：任务会话迁移台账
```

`skill-pool/` 与 `knowledge/` 平级，因此从 `skill-pool/` 出发 `../knowledge/common/` 正好命中
知识库通用规范层——`render-capability-naming` 的候选路径第三项即为该布局。

### 42.2 任务会话迁移

`~/Library/Application Support/dsh-desktop/harness/storages/workspace.json` 是 DSH 会话归属的唯一真相源。
迁移动作：备份 → 把 `Skill池` 工作区的 `sessionIds` 并入 `全局规则` 工作区 → 保留原条目并标注 `mergedInto`。

**为什么保留原条目而不删除**：当前会话的 cwd 就在源目录，删掉工作区条目会让运行中的会话失去归属。

### 42.3 不可逆性处置

| 项 | 做法 | 回滚 |
| :--- | :--- | :--- |
| 代码迁入 | 子树合并，**保留 Skill池 全部提交历史** | `git reset --hard <合并前 sha>` |
| 源目录 | **不删除**，原地保留为只读镜像 + `MIGRATED.md` | 无需回滚，源始终在 |
| 任务会话 | 先备份 `workspace.json`，只改登记不删数据 | 覆盖回 `workspace.json.bak-<ts>` |
| cwd 断链 | 当前会话 cwd 在源目录，**绝不 move**，只做合并 + 校验 + 切换登记 | 源目录未动，会话不中断 |

---

## 43. 自动提交与推送 (REQ-REPO-GITPUBLISH-034)

**需求原文**：「完成后自动帮我上传 git」。

**授权范围**：仅本需求明确授权的两个仓库，不得触碰其他远端。

| 仓库 | 路径 | 远端 |
| :--- | :--- | :--- |
| Skill池（源仓，保留为镜像） | `~/Documents/DSH/Skill池` | `https://github.com/akidotdot-ai/skill-pool.git` |
| 全局规则（合并后主仓） | `~/Documents/DSH/全局规则` | `https://github.com/Aki4ever/DSH-.git` |

**账号门禁**：执行前必须 `gh auth status` 确认活动账号；不满足即暂停并说明。

**完成判据**：`git status --short` 为空 且 `git log origin/main..HEAD` 为空，两个仓库都要满足。

---

## 44. 本次演进带来的编制变化

| 级别 | 新增数 | 总览 |
| :--- | :--- | :--- |
| L1 原子规约 | +2 | `atomic-lock-policy`、`capability-naming-policy` |
| L2 工序动作 | +6 | `acquire-atomic-lock`、`verify-atomic-mutual-exclusion`、`audit-layer-naming`、`rename-execution-layer`、`verify-layer-naming`、`render-capability-naming` |
| L3 复合流程 | +2 | `atomic-lock-guard`、`layer-naming-guard` |
| L4 中枢编排 | ±0 | `dsh-butler` 增加原子锁门禁与命名规范门禁两处接线 |
| **合计** | **+10** | 155 → 165 |

### 44.1 新增产物（非技能）

| 产物 | 作用 |
| :--- | :--- |
| `docs/operations/capability-naming.json` | 能力层命名唯一真相源（词表 / 形态 / 禁词 / 同义组 / 六处契约） |
| `docs/operations/capability-naming.md` | 本仓命名规范人读文档（受管区块） |
| `docs/operations/rebuild-chain.json` | 派生产物重建链唯一真相源（整改器不硬编码路径） |
| `docs/operations/retired-names.json` | 改名台账 + 悬空引用扫描输入 |
| `docs/operations/merge-snapshot.json` | 合并前双仓快照（sha + 文件数） |
| `全局规则/knowledge/common/capability_naming_spec.md` | 知识库通用公共规范：能力层命名唯一权威源 |

### 44.2 自行拍定的默认值（依 §32 一次性原则）

| 项 | 取值 | 依据 | 回滚方式 |
| :--- | :--- | :--- | :--- |
| 合并目标 | `/Users/linqiyu/Documents/DSH/全局规则` | 用户明确指定 | 不适用 |
| 迁入子目录名 | `skill-pool/` | 避免 `skills/skills` 嵌套，且使 `../knowledge/common` 正好命中知识库 | 目录重命名 |
| 任务会话范围 | 仅 **Skill池 工作区的会话**并入「全局规则」工作区；`DSH股票` 等其他任务工作区不动 | 需求原文说的是「skill 池文件夹」与「任务会话」一起挪，其余工作区是独立项目 | 还原 `workspace.json.bak-<ts>` |
| 原子锁载体 | `mkdir` 原子目录 | POSIX 无第三方依赖的真原子原语，且崩溃残留可读可回收 | 换实现不改契约 |
| 锁模式默认 | `lease` | 默认用法是跨命令调用的任务级锁 | 单次 `--mode live` |
| 命名语法 | `<verb>-<object>[-<qualifier>]` kebab-case | 对齐池内 165 个存量名的实际主流形态，整改面最小（仅 3 个真违规） | 改词表 JSON 一处即全量生效 |
| 知识库规范路径 | `knowledge/common/capability_naming_spec.md` | 与既有 `task_naming_spec.md` 同目录同层级 | 文件重命名 |
| 提交推送范围 | 仅上述两个仓库 | 需求 R5 授权范围 | `git reset --hard <sha>` |

---

## 45. 可视化产物的多级缩放与可下载 (REQ-VISUAL-ZOOMLEVELS-035 / REQ-VISUAL-DOWNLOAD-037)

**需求原文**：「生成的图片需要有 +- 按钮可以点击后放大或者缩小进行查看，并且可以多级放大和缩小」
「生成的图片必须有可下载的按钮，点击后可以拉开目录控件选择存储地址进行存储」。

### 45.1 缺口：连续缩放的档位是算出来的，不是定义出来的

改造前 `+` / `−` 走**连续乘法**（每次 ×1.2）。「多级」在物理上**不可枚举**：
点三次得到 `1.728` 倍，这个数字既不可复算也不可断言，用户也无法回答「我现在在第几级」。
断言只能写成「大于 1」，那等于没断言。

### 45.2 离散档位表（13 档）

| 序 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 倍率 | 0.25 | 0.33 | 0.50 | 0.67 | 0.75 | **1.00** | 1.25 | 1.50 | 2.00 | 3.00 | 4.00 | 6.00 | 8.00 |

- `+` / `−` **跳相邻档**，到端点即停（不越界、不回绕）；
- 滚轮/触摸为**连续微调**，松手后**吸附到最近档位**（按对数距离，缩放是对数感知的）；
- 产物暴露 `data-zoom-level` / `data-zoom-levels` / `data-zoom-default` / `data-zoom-snap` / `data-zoom-current` 五个机器可读属性。

**可复算断言**：连点 `+` N 次后的倍率必须逐次等于档位表第 `默认序 + N` 档。

### 45.3 下载三段降级

| 序 | 条件 | 行为 |
| :---: | :--- | :--- |
| ① | 支持 `showSaveFilePicker` | 弹出**原生保存控件**，用户自选目录与文件名 |
| ② | 不支持但支持 `Blob` + `createObjectURL` | `<a download="<有意义的名字>.<扩展名>">` 程序化点击 |
| ③ | 都没有 | **就地可见提示**，禁止静默无反应 |

白名单按产物类型二分：**图片型** → `png/jpg/jpeg/svg/webp`；**HTML 海报型** → `html`（导出它自己）。

### 45.4 验收实数

| 项 | 实测 |
| :--- | :--- |
| `verify-interactive-html` 断言数 | **26 项全过** |
| 档位解析 | 13 档（要求 ≥ 5） |
| 默认档 | 1.00，落在档位表内 |
| 下载主路径 / 降级路径 | 均命中 |
| 外链 | `<link>` / `<script src=>` / `http` 各 0 处 |

**可证伪性**：4 个负向夹具各自只打中一条断言并 exit 1 —— 档数缩到 3 档 → `zoom_levels:count` 失败；
移除 `showSaveFilePicker` → `api:showSaveFilePicker` 失败；扩展名改成 `.exe` → `filename:extension-whitelist` 失败；
去掉档位与吸附标识 → `marker:data-zoom-snap` 失败。

---

## 46. 插件市场常显调控按钮 (REQ-PLUGIN-QUICKCONTROL-036)

**需求原文**：「每个插件市场下载的插件必须常显按钮，这个按钮可以直接点击就进入到对应插件的详情控制页面，方便进行调控」。

### 46.1 落点判定

| 候选 | 事实 | 结论 |
| :--- | :--- | :--- |
| 宿主应用包 `/Applications/DSH Desktop.app` | 已签名 | **改它即破签名**（PKG-006 已有结论）→ 不可用 |
| 插件市场本体 `dshmarket` v1.65.1 | 社区第三方包，装在 `.generations/live/` | **重装即覆盖** → 不可用 |
| 宿主详情控制页 | **本来就存在**：`settings.plugins` / `settings.pluginInventory`，含 `data-plugin-entry` 与 `plugin-config-*` | 缺的只是**直达它的常显按钮** |
| 宿主扩展机制 | `package.json` 的 `dsh.client.inject` + `platform: web` + `dsh.bundle.patch` | **自建 client 插件是唯一合规落点** |

**这是「颗粒度过大不能物理触达」的教科书案例**：需求说的是 UI 行为，若只在 skill 层写一段
「请给插件加个按钮」的说明，它 100% 无法被物理执行——没有可断言对象、没有可安装产物、没有可回滚动作。

**因此引入全池第一个 plugin 层执行层**：`dsh-plugin-control-jump`。

### 46.2 按钮契约

| 项 | 取值 |
| :--- | :--- |
| 唯一标识 | `data-control-jump="<plugin-id>"` |
| 常显位置 | 市场「已安装」列表与宿主插件清单的**每个条目** |
| 点击语义 | 定位同 id 配置项 + 滚动进视口 + 高亮 |
| 去重键 | `容器标识\|插件 id` |
| 无 id 条目 | **绝不注入**（造不出正确跳转目标，比没有按钮更糟） |
| 导航降级 | 宿主钩子 → 定位/点击原生导航 → 复制 id 并就地提示（**第三级永远可用**） |

### 46.3 验收实数

| 层 | 断言数 | 内容 |
| :--- | ---: | :--- |
| 静态 | 13 | 平台 web、client 入口、patch 一致、`__ModuleLoader__` 注册、bundle 逐字内联内核、零外链 |
| 运行时（Node + DOM 打桩） | 18 | 每容器每 id 恰 1 个按钮、二次扫描幂等、跨容器隔离、同容器同名去重、id 解析三级回退 |
| 合计 | **31 全过** | `verdict = control_button_verified` |

**为什么必须有运行时层**：静态断言证明不了「重复渲染之后按钮不会翻倍」——那类缺陷只在真的跑一遍注入逻辑时才暴露。
因此用 Node + DOM 打桩**真实执行** `inject-core.cjs`，而不是只 grep 字符串。

**装配是幂等且可回滚的**：装配前备份 `package.json` 与 `cordis.patch.yml`；二次运行 `already_installed`、`changed=0`；
`--rollback` 一键还原。实测装配后 `bundles` 由 20 项变 21 项。

**生效条件（诚实声明）**：新增插件的 bundle 注册表在宿主启动时读取，**需重启宿主才生效，只刷新页面不够**。
装配脚本输出 `restart_required=true`，绝不假装热更成功。

---

## 47. GitHub 与官网作为执行层检索源 (REQ-SEARCH-MULTISOURCE-038)

**需求原文**：「图片可以去 github 去搜索，当要求找执行层的时候，github 以及官网可以作为搜索源，
例如生成信息图的 skill github 上就有比较不错的 skill；可以去使用这个 skill」。

### 47.1 缺口（实测确认，比需求描述的更大）

查 `skills/search-github-skill/scripts/search_skill.py` 的实现：`load_candidates()` 的唯一输入是
`--from-json` 或本地缓存 —— **它自己不联网、不检索 GitHub**。

也就是说管线第一步「检索」**没有物理探针**，实际把工作外包给了模型的即兴发挥：
既不可复现、也不可断言、更无法回答「搜了几个源、搜到几条」。这是典型的粒度过粗。

### 47.2 四类源与本地优先

| 序 | `source` | 物理手段 | 关键约束 |
| :---: | :--- | :--- | :--- |
| 1 | `local` | 读 catalog + 扫已装插件 `generation.json` | **命中即短路**，留痕 `skipped_sources` |
| 2 | `github` | GitHub Search API（标准库 urllib，无凭据） | 未认证实测 **10 次/分钟**，超出 403 |
| 3 | `official-site` | 官方站点自声明的 `sitemap.xml` | 来源可追溯、结果可复现 |
| 4 | `awesome-list` | 由 github 源内清单型结果识别标注 | 与真实工具分开标注 |

**为什么官网走 sitemap 而不是搜索引擎**：sitemap 是站点自己声明的页面全集；
搜索引擎结果随排序策略漂移——同一查询今天第 1 名明天第 7 名，写不进可复算的判据。

**中英同义桥**：用户说「信息图」，GitHub 上叫 `infographic`/`chart`/`diagram`。
没有这座桥，中文查询在英文生态里的召回率接近 0。

### 47.3 需求举的例子已经装在本机

用户点名「生成信息图的 skill」——本机已装 `@tt-a1i/archify-dsh`（DSH 插件，同时在会话技能目录可见）。
**本地优先原则当场生效**：查询「信息图」命中 `@tt-a1i/archify-dsh` 与 `@changfenhuang/dsh-genui`，
`short_circuit=local`、`network_used=false`、一个网络请求都没发。**先复用不重造。**

### 47.4 验收实数

| 项 | 实测 |
| :--- | :--- |
| 本地短路（信息图） | `short_circuit=local`、`network_used=false`、2 条命中 |
| 本地短路（命名） | `short_circuit=local`、3 条命中 |
| 零命中且未允许外呼 | `success=false` + `network_skipped=true` +「这是未完成检索」 |
| 允许外呼 | 真实 GitHub 检索命中（`showdown` ★14868 等） |
| 限流 | `HTTP 403: rate limit exceeded` → `success=false` + `rate_limited` + 退 1（**不当作空结果**） |
| 去重归一 | 5 条原始 → 去重 1 + 剔除 1 缺字段 → 3 条；连跑两次逐字节相同 |

**两个实测踩出来的缺陷**（都已修）：
① 联网后仍按原始 query 二次过滤 —— 而 query 带 `in:name,description` 限定符，必然全部落空，
把「检索成功但结果为空」伪装成「没人在做这件事」；
② `license` 拿到的是 GitHub 的 license **对象**，直接 `str()` 会把一坨 dict repr 写进候选，
并让 `has_scripts` 恒为 `false`（假阴性）——改为取 `spdx_id`，且 `has_scripts` 改**三态**（`null` = 未探测）。

---

## 48. 本次演进带来的编制变化

| 级别 | 新增数 | 总览 |
| :--- | :--- | :--- |
| L1 原子规约 | +3 | `zoom-level-policy`、`multi-source-search-policy`、`plugin-control-jump-policy` |
| L2 工序动作 | +5 | `search-official-source`、`merge-search-candidates`、`dispatch-skill-search`、`install-client-plugin`、`verify-plugin-control-button` |
| L3 复合流程 | +2 | `visual-interaction-guard`、`plugin-control-guard` |
| **plugin 插件** | **+1** | `dsh-plugin-control-jump`（**全池第一个 plugin 层执行层**） |
| 改造（不新增） | — | `format-zoomable-visual`、`build-image-viewer`、`verify-interactive-html`、`search-github-skill`、`skill-import-pipeline` |
| **合计** | **+11** | skill 165 → 175，plugin 0 → 1，执行层总数 177 → **188** |

### 48.1 自行拍定的默认值（依 §32 一次性原则）

| 项 | 取值 | 依据 | 回滚方式 |
| :--- | :--- | :--- | :--- |
| 缩放档位 | 13 档（0.25 → 8.00），默认 100% | 覆盖「整体看全」到「看清单个像素块」，全部有限小数便于断言 | 改 `zoom-level-policy` 一处即全量生效 |
| 吸附距离 | 对数距离最近档 | 缩放是对数感知的；算术距离会让低位档吸附偏移 | 同上 |
| 下载主路径 | `showSaveFilePicker`，降级 Blob | 前者才是「拉开目录控件选地址」 | 规约改一处 |
| 下载扩展名白名单 | 图片型 5 类 + 海报型 `html` | 按产物类型二分，避免「图片产物导出 HTML」 | 改探针白名单 |
| 插件按钮落点 | 自建 client 插件（plugin 层） | 宿主已签名、市场是第三方包 | 装配脚本 `--rollback` |
| 注入方式 | DOM 增强（MutationObserver + 属性锚点），不用 React | 注入目标在市场卡片内部，不是宿主 slot | 内核改一处 |
| 本地优先 | 硬规则，命中即短路 | 用户示例（信息图 skill）本机已装 `archify-dsh`，重造无收益 | 规约改一处 |
| 是否引入 archify 为新技能 | **否**，登记为已装外部能力 | 已在机器上且会话可见，重复引入会产生两份真相 | `skill-import-pipeline` 留痕 |
| 官网源技术路线 | 站点自声明 sitemap | 来源可追溯、结果可复现；搜索引擎排序会漂移 | 规约改一处 |

---

## 49. 迁移收尾：源目录真正退场 (REQ-REPO-MERGE-039)

**需求原文**：「为何 skill 池文件夹没有迁移并合并到 DSH 下面的全局规则文件夹里？(以我理解是只要迁移完成,所有内容都会合并到那边并且任务对话会自动关掉,实际的 skill 池也会自动消失)」

### 49.1 上一轮做错了什么（诚实复盘）

PKG-007 我做了子树合并（内容进新家、历史保留），却把源目录保留成「只读镜像」。
理由写的是「cwd 在里面，搬走会立即断链」——这句话本身没错，但我把「不搬」当成了终点，
结果是**复制而不是迁移**。实测代价：

| 证据 | 数值 |
| :--- | :--- |
| 两处内容差异 | 50 处（PKG-008 后继续扩大） |
| 两仓 HEAD | `Skill池` 停在 PKG-007；`全局规则` 已到 PKG-009 |
| 两仓远端 | 各持一份历史 |

**用户的判断是对的。** 当初真正的顾虑是「删掉 workspace 条目会让会话失去归属」，
本轮核实该顾虑不成立：当前会话 id 同时存在于两个工作区的 `sessionIds` 里。

### 49.2 退役的安全顺序（不可调换）

```
1 不丢文件：源侧独有文件数 = 0        ← 唯一硬门
2 目标已入库：git status 干净
3 会话完整：源 sessionIds ⊆ 目标 sessionIds
4 写台账到【新家】
5 备份并摘除 workspace.json 源条目   ← 必须早于第 6 步
6 物理删除源目录
7 复核：源路径不存在
```

**为什么第 1 步只查「源侧独有」而不是「完全一致」**：源是被冻结的旧镜像，
它的文件比目标旧（`content_mismatch`）与目标多出文件都是**预期状态**；
唯一真实的删除风险是「某个文件只存在于将被删除那一侧」。

**为什么第 5 步必须早于第 6 步**：先取消注册再删目录，避免「注册项指向不存在路径」的中间态。

---

## 50. 流程监督员 (REQ-PROCESS-SUPERVISOR-040)

**需求原文**：「新增当前管控机制的流程监督员,这个监督员帮忙查看流程是否按照约定进行,并进行打分,如果流程不合规就要整改;目标是让所有任务都按约定的流程进行」。

### 50.1 缺口

池内 **43 个 L3 门禁、14 道出厂检验全部是单点检查**：catalog 一致吗、树对得上吗、命名合规吗。
**没有任何一个能力回答「这个任务整体按约定的流程走了吗」。**
`workflows.md` §1 写了 8 步规范流转，但那是**散文**——没有探针，就没有强制力。
门禁可以逐道全绿，而流程整段没走，照样交付。

### 50.2 把散文变成数据

`docs/operations/process-spec.json`（唯一真相源）把约定流程写成九步，
每步绑定四类探针之一、带权重与必需标记，权重合计 **100**。

| 步 | 约定动作 | 探针 | 权重 | 必需 |
| :---: | :--- | :--- | ---: | :---: |
| S1 | 取当前生效需求与基线 | file | 10 | ✅ |
| S2 | 判定增量还是完整规则审计 | file | 5 | — |
| S3 | 问题诊断先查问题台账 | file | 5 | — |
| S4 | 双流程分流判定且可复算 | exitcode | 15 | ✅ |
| S5 | 按需加载选中技能（≤ top-K） | exitcode | 10 | — |
| S6 | 写入过粒度门禁 / 契约变更过口径门禁 | exitcode | 20 | ✅ |
| S7 | 同步受影响的需求 / CLI / 界面 / 操作索引 | file | 15 | ✅ |
| S8 | 提交前生成并展示非空备注 | regex | 10 | ✅ |
| S9 | 交付前过输出规约门禁 | exitcode | 10 | — |

### 50.3 三条关键口径

| 口径 | 取值 | 为什么 |
| :--- | :--- | :--- |
| 通过线 | **≥ 85 且全部必需项 pass** | 必需项一票否决，靠加权摊平等于允许用别的高分买通它 |
| `na` | 独立第三态，**权重从分母扣除且绝不当 pass** | 不分场景要求会造假失败；把「没做」算过会造假通过 |
| 缺证据 | 一律 `fail` + `unverifiable` | **没有证据不等于走了这一步**；「我记得我做了」不是证据 |

### 50.4 递归分裂：监督员是一条链，不是一个技能

| 层 | 能力 | 职责 |
| :--- | :--- | :--- |
| L1 | `process-conformance-policy` | 钉九步、权重、三态、通过线 |
| L2 | `collect-process-evidence` | 从磁盘实况逐步取证 |
| L2 | `score-process-conformance` | 分子/分母/na 公开打分 |
| L2 | `plan-process-rectification` | 出可执行整改命令 |
| **agent** | `process-supervisor-agent` | **独立视角复核**（不共享上下文） |
| L3 | `process-supervisor` | 串成出口门禁 |

**agent 层这一环是本包唯一真正需要它的地方**：自己给自己打分必然偏松——
主上下文里「我记得我做了」会污染取证。独立上下文只能看到磁盘证据包，
**看不到的就是没做**。无 `--agent-command` 时输出 `agent_review=skipped` 并提示分数偏松：
**知情降级，不是静默跳过**。

### 50.5 验收实数

| 夹具 | 得分 | 必需项 | 退出码 |
| :--- | ---: | :--- | ---: |
| 空证据目录 | 20 / 100 = 20% | 未过 `S4,S6,S7,S8` | 1 |
| 合规证据 | 100 / 100 = 100% | 全过 | 0 |

---

## 51. GCM 缺口修复 (REQ-GCM-GAPFIX-041)

### P1（已修）G0 一票否决闸**真空通过** —— 而且是三重缺陷叠加

| # | 缺陷 | 实测证据 |
| :---: | :--- | :--- |
| 1 | 判不了就放行 | `check_task_naming.sh --exit` 输出「找不到会话存储」却 **exit=0** |
| 2 | 存储查找只认旧布局 | 实际有**三种**布局，第三种是 `sessions/<编码工作区>/<sid>/session.v3.jsonl.zstd`（**多帧 zstd**），两个脚本都没查 |
| 3 | 无法判定与不合规混为一谈 | 都用 `if ! cmd` 判，整改动作不同却给同一提示 |

修复后：语义改为三态 —— **0 合规 / 1 不合规 / 3 无法判定**；
接入第三种布局（按 zstd 魔数逐帧解压，取最后一个 `session/title` 事件的 `data.title`）；
有 session id 却无记录判「会话尚未命名」（退出码 1，动作明确），无 session id 才判「无法判定」（3）。

**当场闭环**：读出真实标题「查看管家下属树状结构」→ 判不合规 → 运行 `name_me.sh` 改为
`[优规001][85] 管控机制补缺` → G0 通过。

### P2（已修）GCM 不覆盖 `skill-pool/`

| 项 | 修复前 | 修复后 |
| :--- | :--- | :--- |
| G4 扫描目录 | `rules knowledge indexes docs templates memory` | **加入 `skill-pool`** |
| G4 扫描文件数 | 71 | **465** |
| G2 散落垃圾深度 | `maxdepth 2` | **`maxdepth 4`** |

修复前 GCM 看板显示 100%，但那份 100% 只覆盖本工程自己的 81 个文件——
**一个只检查 13% 文件却报满分的门禁，比不检查更危险。**

### 同批修掉的两个结构性假阳性

扩展覆盖后，G4 的两项指标被模板骨架顶爆：

| 指标 | 修复前 | 顶爆来源 | 处置 |
| :--- | ---: | :--- | :--- |
| 重复标题 | 69（限 12） | `## Overview` ×171、`## Usage & Script` ×125 —— **契约强制每份文档都写** | 降级为**报告指标** |
| 单行最高 | 120（限 65） | `flowchart TD` ×120、`composition:` ×97 —— 同样是强制骨架 | 降级为**报告指标** |

**为什么是降级而不是继续加白名单**：我一开始加了两级豁免（模板标题 + 模板化路径），
残留仍有 24 条与 88 次，来源全是版本块、README 模板、CLI 子命令骨架。
再往下加就是养一张无限增长的清单——**正是本包 P5 指出的反模式**。
所以止损：G4 的放行只依赖 **4.1 块级 Jaccard 相似度**（阈值 0），
它是唯一能区分「模板骨架」与「真复制粘贴」的判据。

**可证伪性当场验证**：植入一段 >120 字复制块 → `高相似块对` 由 0 → 1 → G4 失败；
删除后回到 0 → G4 通过。**真冗余抓得住，就不需要一个只会随文档数量线性增长的计数器来当闸。**

### P3（本包完成）双份真相 —— 由 §49 退役收尾消除

### P4/P5/P6 处置

| 级 | 缺口 | 处置 |
| :--- | :--- | :--- |
| P4 | 无任务出口自检 | ✅ 本包实施（§50 流程监督员） |
| P5 | 旧名允许清单可被滥用 | 本包**已用同一推理止损**：不再给 G4 加豁免，而是把两项指标降级；`allowed_contexts` 的 reason 非空 + 条数上限断言登记待办 |
| P6 | `api`/`mcp` 两层长期为空 | **不改**：本机确实没有自建 API 与 MCP，凑层属机制膨胀 |

---

## 52. 本次演进带来的编制变化

| 级别 | 新增数 | 总览 |
| :--- | :--- | :--- |
| L1 原子规约 | +1 | `process-conformance-policy` |
| L2 工序动作 | +5 | `collect-process-evidence`、`score-process-conformance`、`plan-process-rectification`、`retire-legacy-workspace`、`verify-workspace-retirement` |
| L3 复合流程 | +1 | `process-supervisor` |
| **agent 智能体** | **+1** | `process-supervisor-agent`（**首个仓库自定义 agent 层执行层**） |
| **合计** | **+8** | skill 175 → 182，agent 3 → 4，执行层总数 188 → **196** |

新增产物：`docs/operations/process-spec.json`（约定流程唯一真相源）、
`docs/operations/retired-workspaces.json`（退役台账）、
`agents/process-supervisor-agent/PROMPT.md`（监督员契约）。

