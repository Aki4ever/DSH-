# 全局规则工程 (Global Rules Project)

> ### 🏷️ **版本信息与实施追踪**
> - **当前系统实施总版本**：`v4.21.0`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](rules/workflow/versioning_standard.md)
> - **最后更新日期**：2026-09-24
> - **版本状态**：`[Release 稳定生效]`

本项目用于集中管理、统一维护智能体与系统运行的各类全局规则、工作流程、代码工程规范、统一知识库、外部能力扩展矩阵、图表生成指南以及核心需求台账。

---

## 📁 目录与核心架构全景速查

```text
.
├── rules/                           # 核心规则目录
│   ├── system/                      # 【系统级基础规则】
│   │   ├── meta_rules.md            # 系统最高元规则（双向同步/去重/全中文/排查/双轨分流/风险揭示/测试门禁/页面台账/自迭代）
│   │   ├── thinking_framework.md    # 搜索引擎逻辑映射与智能体六步思考决策管道
│   │   ├── language_standard.md     # 全文档中文化与通俗直白表达规范
│   │   └── initialization_protocol.md # 会话开箱自检与目录一键初始化协议
│   ├── workflow/                    # 【流程协同规范】
│   │   ├── task_execution_flow.md   # 快慢双轨分流、100分制打分、首动命名门禁（格式见知识库）、风险揭示、自动化测试与自迭代十六步流水线
│   │   ├── risk_disclosure.md       # 事前四维风险雷达揭示、评估卡与高危阻断预案规范
│   │   ├── page_ledger_specification.md # 交付页面视觉台账、四段式截图命名与跨会话精准指代规范
│   │   ├── post_mortem_and_evolution.md # 事后三维 AAR 任务复盘与双向自迭代进化规范
│   │   ├── versioning_standard.md   # 实施版本号治理与全生命周期同步规范 (SemVer)
│   │   ├── change_flow.md           # 规则与需求变更六步工作流
│   │   ├── audit_and_cleanup.md     # 联动排查、存量资源治理与结构冗余去重规范
│   │   └── component_naming.md      # 标准组件中文指代、架构统一指代与快速通道指引
│   ├── coding/                      # 【代码与工程规范】
│   │   ├── testing_and_quality_gate.md # 需求即断言、真实运行与自动化测试 100% 绿灯硬门禁
│   │   ├── unity_project_standard.md # Unity 结构化工程目录、文件形式与 C# 架构全局规范
│   │   └── atomicity_specification.md # 系统操作与工程设计原子性事务边界规范
│   └── security/                    # 【安全防护与红线法典】
│       └── security_baseline.md     # 免审批安全基线、防破坏红线与写后读回机制
├── knowledge/                       # 【分层统一知识库与业务法典】
│   ├── README.md                    # 知识库总索引、分层架构教学图与前置核验协议
│   ├── common/                      # 【通用公共规范库 · 跨项目共享】
│   │   ├── README.md                # 通用规范导航总览
│   │   ├── interaction_specification.md # 交互规范（格式塔六大定律 / Don't Make Me Think 零思考）
│   │   ├── unity_specification.md   # Unity规范（页面Scene / 弹窗Prefab / 按钮阴影位移 / .meta铁律）
│   │   ├── web_specification.md     # Web规范（路由懒加载 / Modal Portal挂载 / box-shadow / 骨架屏）
│   │   ├── miniprogram_specification.md # 小程序规范（主包≤1.5MB / 弹窗Component / setData差量）
│   │   ├── engineering_specification.md # 技术架构规范（模块单向解耦 / 零GC / 状态机原子性）
│   │   ├── art_specification.md     # 视觉规范（60-30-10配比 / WCAG 4.5:1对比度 / 阴影阶梯）
│   │   └── task_naming_spec.md      # 任务命名规范【唯一权威源】（三要素 / R1~R7硬校验 / 六类业务管道 / 四维打分）
│   └── projects/                    # 【项目专属知识库 · 物理隔离防污染】
│       ├── README.md                # 项目隔离规约与清单
│       └── aether_echo/             # 源能回响项目（专属世界观/美术/Unity URP工程参数）
├── indexes/                         # 【能力索引、外部生态与快速通道】
│   ├── shortcuts_index.md           # 地图式高速干道路由导航与快速口令矩阵（G0~G3 四级权重）
│   ├── extension_ecosystem.md       # DSH 外部可扩展能力生态与协议全景矩阵 (MCP/Skill/CLI/API/Browser)
│   ├── dsh_capabilities.md          # DSH 宿主基座全景能力与系统机制索引
│   ├── tool_interfaces.md           # 全量插件与工具标准接口矩阵封装
│   ├── rules_index.md               # 全局规则体系与流程全景总索引
│   └── README.md                    # 索引层专属说明文档
├── memory/                          # 【长短期记忆中枢】
│   ├── context_memory.md            # 全局上下文约定、用户偏好与运行基线
│   ├── lessons_learned.md           # 实战排查沉淀的避坑指南与底层机制认知
│   ├── efficiency_audit_log.md      # 思考决策与执行效率全景量化审计台账 (M1~M6指标)
│   └── README.md                    # 记忆层专属说明文档
├── docs/                            # 【说明、指南与核心台账】
│   ├── requirements.md              # 独立核心需求管理台账（REQ-001 ~ REQ-047，总版本 v3.1.0）
│   ├── constraint_mechanism_spec.md # 【管控机制】正式命名、四层分工、双检处置与存量校准要求
│   ├── diagram_generation_guide.md  # 全场景流程图、信息图与教学图生成技术指南与标准模板库
│   ├── memory_architecture.md       # AI 分层长短期记忆体系架构与工程落地规范
│   └── rules_tutorial.md            # 全局规则运转教学指南与图解
├── templates/                       # 【标准模板资产】
│   ├── requirement_template.md      # 结构化需求标准卡片模板（含实施版本号）
│   ├── risk_assessment_template.md  # 前置四维风险评估卡标准模板
│   ├── page_ledger_template.md      # 项目页面资产与视觉台账模板
│   ├── post_mortem_template.md      # AAR 任务复盘与流程进化报告模板
│   ├── directory_readme_template.md # 目录专属说明标准模板
│   └── graphical_block_template.md  # 原生图形化区块卡片组件标准模板
├── scripts/                         # 【自动化辅助工具】
│   ├── generate_image.py            # 图形生成、自动保存与图显渲染脚本（含手写 SVG 精确出图模式）
│   ├── svg2png.sh                   # 手写 SVG 精确栅格化（WebKit 渲染，保留原始排版）
│   ├── svg_rasterize.swift          # 上述渲染器的源码（首次调用自动编译并缓存）
│   ├── rename_session.sh            # 会话一键重命名并锁定 RPC 脚本（含命名规范 R1~R7 硬校验）
│   ├── check_task_naming.sh         # 判定当前会话命名是否合规（看板常显 + 流程门禁判据）
│   ├── session_naming_audit.mjs     # 存量会话命名审计（只读：合规率、主/子会话、首条用户消息）
│   ├── generate_naming_plan.mjs     # 变更方案生成（工作区独立编号 + 难度分量化推导）
│   ├── batch_rename_sessions.mjs    # 批量规范改名（预校验 + 自动备份 + 自动回滚方案）
│   ├── init_dir.sh                  # 目录一键自动化初始化脚本
│   ├── control_gates.sh             # 【管控机制·状态层】四项门禁判定与量化看板
│   ├── redundancy_scan.mjs          # 【管控机制·判定层】冗余检测（词级相似度 + 元数据过滤）
│   ├── conflict_scan.mjs            # 【管控机制·判定层】冲突检测（版本/计数/指标/标识/死链）
│   ├── legacy_align_scan.mjs        # 【管控机制·判定层】存量校准（遇碰即对齐清单，脚本漏登记可自动检出）
│   ├── channel_audit.mjs            # 【管控机制·判定层】快速通道审计（死通道/说法命中/触发词冲突）
│   ├── align_version.mjs            # 【管控机制·判定层】全库受管文档版本归位（升版时一条命令对齐）
│   ├── check_freshness.mjs          # 【管控机制·判定层】存量与新增能力新鲜度与时效检测探针
│   ├── sync_control_requirements.mjs # 【管控机制·判定层】管控专项需求与全局台账双向同步校验
│   ├── global_scheduler_lock.sh     # 全局调度锁与并发资源防冲突
│   ├── git_sync_remote.sh           # 远程 Git 强同步与缺地址开页引导
│   ├── fingerprint_audit.sh         # 资产数字指纹与新鲜度审计
│   └── disk_check_and_cleanup.sh    # 磁盘巡检与安全自愈清理
├── ai-control/                      # 【管控机制·实现目录】判定层与拦截层落地
│   ├── config/gates.conf            # 门禁阈值唯一调参入口（改完即时生效）
│   ├── plugin/index.mjs             # 【拦截层】常显看板 + 工具调用否决
│   ├── plugin/loader.mjs            # 故障安全加载器（失败降级为空插件）
│   ├── plugin/selftest.mjs          # 插件自检（33 项，禁止凭语法通过上线）
│   └── reports/                     # 管控快照与检测结果留痕
├── AGENTS.md                        # 项目级约束（会话自动注入）
├── .gitignore                       # 版本管理忽略规则
├── .gitattributes                   # 文本换行与格式配置
└── README.md                        # 工程主说明文档
```

---

## 🎛️ 管控机制（开工前置）

本工程所有硬约束由**管控机制**统一承载，名称的唯一权威出处见
[`indexes/rules_index.md`](indexes/rules_index.md)。任何改动型动作前须先确认门禁全过；
门禁状态由磁盘实况推导，**绝不采信自我宣称**，并常显于每轮对话。

| 分层 | 职责 |
| :--- | :--- |
| **注入层** | 常驻红线与路由指针（本文件、`AGENTS.md`、快速通道索引） |
| **状态层** | 由磁盘实况推导真值，产出状态快照 |
| **判定层** | 四道门禁判定 + 冗余／冲突双检 + 存量校准 |
| **拦截层** | 门禁未过时拒绝改动型工具调用 |

```bash
./scripts/control_gates.sh check                      # 状态层：输出量化看板（进度/卡点/指标）
./scripts/control_gates.sh badge                      # 状态层：一行式进度徽标
node scripts/redundancy_scan.mjs --root .              # 判定层：冗余检测（重复内容 → 合并为迭代版本）
node scripts/conflict_scan.mjs --root .                # 判定层：冲突检测（同一事实两种说法 → 先裁决再迭代）
node scripts/legacy_align_scan.mjs --root .            # 判定层：存量校准（遇碰即对齐清单，含脚本漏登记）
node scripts/channel_audit.mjs --root .                # 判定层：通道审计（死通道/说法命中/触发词冲突）
node scripts/check_freshness.mjs                      # 判定层：新鲜度与可用性审计（能力与规则健康探活）
node scripts/sync_control_requirements.mjs            # 判定层：管控专属需求双向同步校验（CR与REQ对齐）
./scripts/check_task_naming.sh                         # 判定层：当前任务命名是否合规（看板已自动常显此行）
node scripts/session_naming_audit.mjs                  # 命名层：存量会话命名审计（只读，含合规率与待改名清单）
node scripts/session_naming_audit.mjs --json           # 命名层：导出审计数据供生成改名方案
node scripts/batch_rename_sessions.mjs --plan p.json --dry-run   # 命名层：批量改名预览（--apply 才真正执行）
node scripts/batch_rename_sessions.mjs --plan p.json --rollback --apply   # 命名层：应急回滚（豁免规范校验）
node scripts/test_auto_naming.mjs                     # 命名层：自动命名逻辑测试（24 项，不改动任何数据）
node scripts/test_auto_naming.mjs --live              # 命名层：对真实未命名会话做实弹自动命名
```

| 门禁 | 含义 | 量化指标 |
| :--- | :--- | :--- |
| **G1 项目初始化** | 仓库、骨架、防丢文件齐备 | 骨架齐备率 / 防丢覆盖率 |
| **G2 工程结构化** | 目录有主、无孤儿、无垃圾 | 合规项 / 孤儿目录数 |
| **G3 需求文档同步** | 台账与 Git 工作树对齐 | 需求条目数 / 未提交变更数 |
| **G4 冗余检测** | 实质重复率健康 | 高相似块对 / 重复标题数 |

- **双检处置分流**：冗余 → 合并为迭代版本（保留单一权威源）；冲突 → 先出裁决方案，由用户确认后迭代，**禁止自行取舍**；
- **调参入口**：`ai-control/config/gates.conf`（改完即时生效，无需重启）；
- **临时绕过**：环境变量 `DSH_CONTROL_GUARD=off`；
- **机制说明与信息图**：[`docs/constraint_mechanism_spec.md`](docs/constraint_mechanism_spec.md) · [`assets/generated_images/gcm_gate_control_infographic.svg`](assets/generated_images/gcm_gate_control_infographic.svg)（基线版式，数据已过时）· [`assets/generated_images/control_mechanism_infographic_v2.svg`](assets/generated_images/control_mechanism_infographic_v2.svg)（现行实况版，版本分工见 [`indexes/rules_index.md`](indexes/rules_index.md) 第〇章）；
- **完整说明**：见 [`ai-control/README.md`](ai-control/README.md)。

---

## 🚀 核心工作规程与快速上手

### 1. 任务启动自检七步法
每次开启任务或新会话，第一步按顺序自检：
1. **过门禁（第零步）**：运行 `./scripts/control_gates.sh check` 确认四项门禁全过；未过则先修复，禁止跳过；
2. **查权限与红线**：查阅 `rules/security/security_baseline.md` 守住安全红线；
3. **看元规与干道**：阅读 `rules/system/meta_rules.md` 明确最高准则，通过 `indexes/shortcuts_index.md` 优先命中 G0/G1 高速干道路由；
4. **核知识库**：检阅 `knowledge/README.md`，执行前置防冲突核查，确保新任务与世界观/美术/工程设定绝不冲突（非游戏坚决不载入游戏设定）；
5. **查台账**：检索 `docs/requirements.md` 了解需求当前进展、边界与当前实施总版本号（`v3.1.0`）；
6. **读记忆**：读取 `memory/` 目录继承跨会话偏好与避坑经验（指纹单次读，写后才重读）；
7. **定轨道与首动命名**：依据六维价值打分(60分)与四维难度打分(100分)双螺旋决策，复杂任务**定标后立即执行 `./scripts/rename_session.sh` 按命名规范锁定会话**（格式权威源见 `knowledge/common/task_naming_spec.md`）；十六步流水线中带判定脚本的工序严格执行，未配判定手段的工序按建议执行（见 `rules/workflow/task_execution_flow.md`）；收尾必给结构化交付入口、管控进度徽标与六维量化审计指标卡片。

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
- **标准完备流 (>35分)**：复杂重构与规则研发严格走标准六步闭环，首轮定标立即调用 `./scripts/rename_session.sh` 按命名规范锁死标题（格式权威源见 `knowledge/common/task_naming_spec.md`），并开启视口吸顶组件；
- **任务命名与判定**：格式权威源见 [`knowledge/common/task_naming_spec.md`](knowledge/common/task_naming_spec.md)；合规性由 `./scripts/check_task_naming.sh` 判定，并已常显于门禁看板。

### 4. 规则变动六步循环与去重
遵循 `rules/workflow/change_flow.md` 开展任何规则操作：
`接收意图 ➔ 查重拦截 ➔ 登记台账 ➔ 编写规则 ➔ 联动排查 ➔ 提交推送`
若有同类规则或模板，遵循 `rules/workflow/audit_and_cleanup.md` 严格执行增量合并，杜绝碎片化冗余。

### 5. 新建目录一键初始化
新建文件夹后输入 `初始化 <目录路径>`（或直接运行 `./scripts/init_dir.sh <目录路径> [说明]`），系统会自动生成 `.gitkeep`、标准 `README.md` 并完成结构登记。
