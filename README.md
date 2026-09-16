# 全局规则工程 (Global Rules Project)

> ### 🏷️ **版本信息与实施追踪**
> - **当前系统实施总版本**：`v1.2.0`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](rules/workflow/versioning_standard.md)
> - **最后更新日期**：2026-09-16
> - **版本状态**：`[Release 稳定生效]`

本项目用于集中管理、统一维护智能体与系统运行的各类全局规则、工作流程、代码工程规范、统一知识库、外部能力扩展矩阵、图表生成指南以及核心需求台账。

---

## 📁 目录与核心架构全景速查

```text
.
├── rules/                           # 核心规则目录
│   ├── system/                      # 【系统级基础规则】
│   │   ├── meta_rules.md            # 系统最高元规则（双向同步/去重/全中文/排查/双轨分流/知识库审查/事务原子性）
│   │   ├── thinking_framework.md    # 搜索引擎逻辑映射与智能体六步思考决策管道
│   │   ├── language_standard.md     # 全文档中文化与通俗直白表达规范
│   │   └── initialization_protocol.md # 会话开箱自检与目录一键初始化协议
│   ├── workflow/                    # 【流程协同规范】
│   │   ├── task_execution_flow.md   # 快慢双轨分流、100分制打分、8字标题、知识库前置核验与原子化收尾
│   │   ├── versioning_standard.md   # 实施版本号治理与全生命周期同步规范 (SemVer)
│   │   ├── change_flow.md           # 规则与需求变更六步工作流
│   │   ├── audit_and_cleanup.md     # 联动排查、存量资源治理与结构冗余去重规范
│   │   └── component_naming.md      # 标准组件中文指代、架构统一指代与快速通道指引
│   ├── coding/                      # 【代码与工程规范】
│   │   ├── unity_project_standard.md # Unity 结构化工程目录、文件形式与 C# 架构全局规范
│   │   └── atomicity_specification.md # 系统操作与工程设计原子性事务边界规范
│   └── security/                    # 安全防护与红线准则
├── knowledge/                       # 【统一知识库与业务法典】
│   ├── README.md                    # 知识库总索引与前置防冲突核验协议
│   ├── worldview_background.md      # 世界观故事背景、源能法则、时代纪元与阵营设定
│   ├── art_specification.md         # 游戏美术视觉与资产工程规范（风格/色彩/面数/PBR/UI）
│   └── engineering_specification.md # 软件技术与工程架构规范（Unity LTS/URP/60FPS/MVVM/零GC）
├── indexes/                         # 【能力索引、外部生态与快速通道】
│   ├── shortcuts_index.md           # 快速通道快捷词汇与指令路由索引（口令秒级直达）
│   ├── extension_ecosystem.md       # DSH 外部可扩展能力生态与协议全景矩阵 (MCP/Skill/CLI/API/Browser)
│   ├── dsh_capabilities.md          # DSH 宿主基座全景能力与系统机制索引
│   ├── tool_interfaces.md           # 全量插件与工具标准接口矩阵封装
│   ├── rules_index.md               # 全局规则体系与流程全景总索引
│   └── README.md                    # 索引层专属说明文档
├── memory/                          # 【长短期记忆中枢】
│   ├── context_memory.md            # 全局上下文约定、用户偏好与运行基线
│   ├── lessons_learned.md           # 实战排查沉淀的避坑指南与底层机制认知
│   └── README.md                    # 记忆层专属说明文档
├── docs/                            # 【说明、指南与核心台账】
│   ├── requirements.md              # 独立核心需求管理台账（REQ-001 ~ REQ-025，总版本 v1.2.0）
│   ├── diagram_generation_guide.md  # 全场景流程图、信息图与教学图生成技术指南与标准模板库
│   ├── memory_architecture.md       # AI 分层长短期记忆体系架构与工程落地规范
│   └── rules_tutorial.md            # 全局规则运转教学指南与图解
├── templates/                       # 【标准模板资产】
│   ├── requirement_template.md      # 结构化需求标准卡片模板（含实施版本号）
│   ├── directory_readme_template.md # 目录专属说明标准模板
│   └── graphical_block_template.md  # 原生图形化区块卡片组件标准模板
├── scripts/                         # 【自动化辅助工具】
│   ├── generate_image.py            # 图形生成、自动保存与图显渲染脚本
│   ├── rename_session.sh            # 会话一键重命名并锁定 RPC 脚本
│   └── init_dir.sh                  # 目录一键自动化初始化脚本
├── .gitignore                       # 版本管理忽略规则
├── .gitattributes                   # 文本换行与格式配置
└── README.md                        # 工程主说明文档
```

---

## 🚀 核心工作规程与快速上手

### 1. 任务启动自检六步法
每次开启任务或新会话，第一步按顺序自检：
1. **查权限**：核对沙箱读写模式与免审批状态（`Approval: never`）；
2. **看元规**：阅读 `rules/system/meta_rules.md` 明确最高准则与双轨分流；
3. **核知识库**：检阅 `knowledge/README.md`，执行前置防冲突核查，确保新任务与世界观/美术/工程设定绝不冲突；
4. **查台账**：检索 `docs/requirements.md` 了解需求当前进展、边界与当前实施总版本号（`v1.2.0`）；
5. **读记忆**：读取 `memory/` 目录继承跨会话偏好与避坑经验；
6. **定轨道**：依据 100 分制打分判定走快速轻量流还是标准完备流；首动执行会话重命名。

### 2. 快速通道指令直达
常用操作无需长句问答，输入口令直达目标：
- 输入 **“看看当前dsh体系能力”** ➔ 输出 DSH 全景架构图与四大维度说明；
- 输入 **“生态扩展”** ➔ 输出 MCP、Agent Skills、CLI 工具链与外部能力扩展全景矩阵；
- 输入 **“生成图表”** ➔ 输出全场景流程图、时序图、SVG 信息卡片标准模版与场景决策树；
- 输入 **“生成图片 <描述>”** ➔ 驱动图形生成管道创作图片并直接图显；
- 输入 **“查看规则全景”** ➔ 输出规则体系完整地图；
- 输入 **“查看知识库”** ➔ 输出世界观、美术与工程标准总览；
- 输入 **“unity规范”** ➔ 输出 Unity 目录架构与 .meta 铁律；
- 输入 **“原子性规范”** ➔ 输出操作级与设计级原子性事务清单；
- 完整口令详见 [`indexes/shortcuts_index.md`](indexes/shortcuts_index.md)。

### 3. 快慢双轨分流与会话重命名
依据 `rules/workflow/task_execution_flow.md` 执行任务：
- **快速轻量流 (≤35分)**：单点文字微调、查阅问答走轻量三步（【探】➔【攻】➔【归】），快速交付；
- **标准完备流 (>35分)**：复杂重构与规则研发严格走标准六步闭环，首轮定标立即调用 `./scripts/rename_session.sh "[分类编号][难度分] 8字概述"` 锁死标题，并开启视口吸顶组件；
- **任务分类与 8 字概述**：`[R/F/D/S/O/Q 编号][100分制打分] 概述(≤8字)`。

### 4. 规则变动六步循环与去重
遵循 `rules/workflow/change_flow.md` 开展任何规则操作：
`接收意图 ➔ 查重拦截 ➔ 登记台账 ➔ 编写规则 ➔ 联动排查 ➔ 提交推送`
若有同类规则或模板，遵循 `rules/workflow/audit_and_cleanup.md` 严格执行增量合并，杜绝碎片化冗余。

### 5. 新建目录一键初始化
新建文件夹后输入 `初始化 <目录路径>`（或直接运行 `./scripts/init_dir.sh <目录路径> [说明]`），系统会自动生成 `.gitkeep`、标准 `README.md` 并完成结构登记。
