# 管控机制专属需求台账 (Control Requirements Ledger)

> ### 🏷️ **版本信息与实施追踪**
> - **当前管控机制版本**：`v4.17.0`
> - **最后同步时间**：2026-09-24
> - **全局主台账对照**：[`docs/requirements.md`](../../docs/requirements.md)
> - **状态**：`[ACTIVE 生效中]`

---

## 📌 版本演进概览

| 管控需求编号 | 对应全局编号 | 管控机制版本 | 核心诉求概要 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **CR-001** | REQ-041 | `v1.0.0` | 四项基础门禁设计（G1骨架/G2结构/G3台账/G4冗余） | `[ACTIVE]` |
| **CR-002** | REQ-042 | `v1.1.0` | 客户端硬门禁拦截钩子（PreToolCall 拦截非法写入） | `[ACTIVE]` |
| **CR-003** | REQ-046 | `v2.0.0` | 双检排查机制与冗余、冲突扫描工具链 | `[ACTIVE]` |
| **CR-004** | REQ-049 | `v3.0.0` | 看板可视化与全中文交互规范 | `[ACTIVE]` |
| **CR-005** | REQ-050 | `v3.2.0` | 看板实时进度条、界面中文化补丁与非侵入重放 | `[ACTIVE]` |
| **CR-006** | REQ-051 | `v3.3.0` | 管控六项优化：低风险免密直通、能力层全景索引与正负案例、新鲜度检测、双向全量生效、独立需求同步仓 | `[ACTIVE]` |
| **CR-007** | REQ-052 | `v3.4.0` | 显式结论卡片置顶铁律与本地运算优先结构性 Token 降耗工程规约 | `[ACTIVE]` |
| **CR-008** | REQ-053 | `v3.5.0` | 任务闭环结构化回溯自进化机制与管控机制全链路 Token 深度压缩 | `[ACTIVE]` |
| **CR-009** | REQ-054 | `v3.6.0` | 快速通道高频指令扩充(入口/版本号)与地图导航式能力路由层 | `[ACTIVE]` |
| **CR-010** | REQ-055 | `v3.7.0` | 全局流程调度中枢 Agent Life、原子阶段反馈驱动与 Google 级高信噪比输出架构 | `[ACTIVE]` |
| **CR-011** | REQ-056 | `v3.8.0` | 能力唯一标识规范重命名、极速文案通道与单例 Agent PP / 短生命周期 Life(N) 并发调度 | `[ACTIVE]` |
| **CR-012** | REQ-057 | `v3.9.0` | 第一性原理与物理实证律、三不采信原则、实证调查五步法与三级证据定级 | `[ACTIVE]` |
| **CR-013** | REQ-058 | `v4.0.0` | 显式交付状态首行置顶、六大可见即用实体交付物与极端任务聚焦铁律 | `[ACTIVE]` |
| **CR-014** | REQ-059 | `v4.1.0` | 报错反思防复发闭环、流程刚柔分级矩阵与交付输出框架刚性化 | `[ACTIVE]` |
| **CR-015** | REQ-060 | `v4.2.0` | 全端统一可读性排版设计法典与检索路由质量评估自进化机制 | `[ACTIVE]` |
| **CR-016** | REQ-061 | `v4.3.0` | 文本精细排版法典扩充与系统交互动效组件规范化 | `[ACTIVE]` |
| **CR-017** | REQ-062 | `v4.4.0` | 格式塔交互映射深化与全域字体选型工程标准法典化 | `[ACTIVE]` |
| **CR-018** | REQ-063 | `v4.5.0` | 任务级版本强制递增律与全域交付输出物版本强同步闭环 | `[ACTIVE]` |
| **CR-019** | REQ-064 | `v4.6.0` | 交互式核心信息卡片增强、多官网精美组件检索图库与新能力标准化接口生命周期 | `[ACTIVE]` |
| **CR-020** | REQ-065 | `v4.7.0` | 管控机制实况巡检与信息图二期实测重绘 | `[ACTIVE]` |
| **CR-021** | REQ-066 | `v4.8.0` | 管控机制状态层脚本 Bash 语法缺陷修复与快照写入健全化 | `[ACTIVE]` |
| **CR-022** | REQ-067 | `v4.9.0` | 管控机制索引/路由/接口/执行四层解耦与任务命名全生命周期治理规范 | `[ACTIVE]` |
| **CR-023** | REQ-068 | `v4.10.0` | 全原子变动版本锚定基石律与管控机制存量新增全域双向同步治理体系 | `[ACTIVE]` |
| **CR-024** | REQ-069 | `v4.11.0` | 全任务强命名门禁与语义化分类编号难度打分模型扩充规范 | `[ACTIVE]` |
| **CR-025** | REQ-070 | `v4.12.0` | 管控机制结构化与全流程闭环防跳步执行规范 | `[ACTIVE]` |
| **CR-026** | REQ-071 | `v4.13.0` | 任务栏改名前端可见性保障与文末四要素固定精简收尾规范 | `[ACTIVE]` |
| **CR-027** | REQ-072 | `v4.14.0` | 管控机制核心链路四维深化优化（动态更名·版本联动·收敛落盘·初始化快速通道） | `[ACTIVE]` |
| **CR-028** | REQ-073 | `v4.15.0` | 全域任务命名同权治理与文件生命周期标记清除定位规约 | `[ACTIVE]` |
| **CR-029** | REQ-074 | `v4.16.0` | 任务首动命名调度句柄化与执行驱动路由索引自底向上强同步规约 | `[ACTIVE]` |
| **CR-030** | REQ-075 | `v4.17.0` | 管控机制知行合一强闭环、审计 Agent 与交付执行效果百分制量化打分规约 | `[ACTIVE]` |

---

## 📋 管控需求详细台账

### CR-006: 管控机制综合优化（六大维度升级）
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v3.3.0`
- **对应全局台账**：`REQ-051`
- **提出时间**：2026-09-23
- **核心诉求与目标**：
  1. **低风险任务免密直通**：常规读写与工程内部操作全面静默放行，杜绝频繁输入密码或确认弹窗；
  2. **五大能力层统一索引**：对插件 (Plugin)、智能体 (Agent)、命令行 (CLI)、协议工具 (MCP)、技能 (Skill) 建立统一全景索引；
  3. **双层能力接口与正负案例**：索引接口层明确标注能力名、大致用法与典型反面案例（踩坑红线）；能力详情层提供深入使用说明；
  4. **存量与新增新鲜度检测机制**：建立自动化检测探针，实时检测能力可用性、版本时效与连通性，快速甄别过期与失效项；
  5. **管控更新全量双向生效**：管控机制与门禁更新必须对存量和新增同时生效，通过自动化存量校准脚本消除技术债；
  6. **独立文件夹归档与版本同步**：在 `ai-control/requirements/` 设立独立需求归档仓，版本显式标记，每次更新主台账与专项目录必须强制同步。
- **关联产出物**：
  - `ai-control/requirements/control_requirements_ledger.md`
  - `indexes/capabilities_index.md`
  - `scripts/check_freshness.mjs`
  - `scripts/sync_control_requirements.mjs`
  - `rules/security/security_baseline.md`（低风险放行准则扩充）
- **验收标准**：
  - [x] 独立需求仓目录建立且历史/当前版本齐全；
  - [x] 免密与低风险直通策略明确落地，不打扰常规任务；
  - [x] 五大能力层索引接口完成并包含负面案例标注；
  - [x] 新鲜度检测工具实跑输出健康报告；
  - [x] 存量校准与双向生效机制纳入门禁检查流；
  - [x] 全局主台账与专项目录同步校验通过。

---

### CR-007: 显式结论卡片置顶铁律与本地运算降耗规约
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v3.4.0`
- **对应全局台账**：`REQ-052`
- **提出时间**：2026-09-23
- **核心诉求与目标**：
  1. **首屏最显眼处显式结论**：杜绝答复模糊或计划与实施混淆，强制在首行最醒目处出具状态卡片（🟡【仅方案规划态】vs 🟢【真实实施完成态】）；
  2. **本地运算优先 (Local-Compute First)**：规则明确、计算密集的排查与过滤（如行数、差异比对、日志抽取、语法检查）一律在本地通过命令完成，严禁全量原始大文本往返上下文；
  3. **结构性降低 Token 消耗**：大文件禁用无脑全盘读取，强制使用 `grep -n` 定位后带 `offset`/`limit` 切片，轻量索引卡优先，状态缓存复用。
- **关联产出物**：
  - `rules/system/meta_rules.md`（第二十二条显式结论律、第二十三条Token降耗律）
  - `rules/coding/token_and_local_compute_optimization.md`
  - `AGENTS.md`（收尾显式结论要求）
  - `docs/requirements.md`（`REQ-052`）
- **验收标准**：
  - [x] 元规则与项目约束固化置顶显式结论卡片；
  - [x] 落地 Token 降耗工程规约；
  - [x] 管控版本升至 v3.4.0 并与全局台账对齐。

---

### CR-008: 任务闭环结构化回溯与管控机制 Token 深度压缩
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v3.5.0`
- **对应全局台账**：`REQ-053`
- **提出时间**：2026-09-23
- **核心诉求与目标**：
  1. **任务闭环自进化回溯**：在 `rules/system/meta_rules.md` 确立第二十四条元规则，收尾强制附带《任务流程结构化回溯卡》，覆盖步数效率、卡点根因剖析与流程优化演进；
  2. **管控机制看板 Token 深度压缩**：优化 `control_gates.sh` 和 `ai-control/plugin/index.mjs`，在全绿（100%）通过态时切换为高密度单行/紧凑视图，省略冗余通过细节，输出字符与 Token 消耗降低 65%；
  3. **常驻注入层精炼脱水**：持续压缩 `AGENTS.md` 提示词体积，删除修饰性废话，保持高密度原语与索引指针。
- **关联产出物**：
  - `rules/system/meta_rules.md`（第二十四条任务回溯与流程自进化律）
  - `ai-control/plugin/index.mjs`（全绿高密度紧凑输出优化）
  - `scripts/control_gates.sh`（全绿态精炼渲染）
  - `AGENTS.md`（收尾结构化回溯规范）
- **验收标准**：
  - [x] 任务结项强制要求流程结构化回溯；
  - [x] 看板全绿态紧凑压缩实测生效且字符缩减超 60%；
  - [x] 门禁全绿，版本统一推进至 v3.5.0。

---

### CR-009: 快速通道高频指令扩充与地图导航式能力路由层
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v3.6.0`
- **对应全局台账**：`REQ-054`
- **提出时间**：2026-09-23
- **核心诉求与目标**：
  1. **快捷高频指令扩充**：在 `indexes/shortcuts_index.md` 注册“给我入口”（秒取交付物与中枢地址）与“版本号”（单行秒取系统最新实施版本）；
  2. **地图导航式能力路由层**：设计三级导航模型（起点意图 → 规划匹配 → 逐级途径点指引 → 终点落地点 → 避坑路况），建立规约 `indexes/navigation_router.md`；
  3. **自动化轻量路由工具**：落地 `scripts/route_navigate.mjs`，支持本地秒级生成地图导航路线与入口直达卡，免模型长上下文规划开销。
- **关联产出物**：
  - `indexes/shortcuts_index.md`
  - `indexes/navigation_router.md`
  - `scripts/route_navigate.mjs`
  - `docs/requirements.md`（`REQ-054`）
- **验收标准**：
  - [x] 快速通道表注册“给我入口”、“版本号”、“地图导航”且通道审计通过；
  - [x] 导航脚本完成并实测三种模式输出正常；
  - [x] 全局台账与专项目录版本统一推进至 v3.6.0。

---

### CR-010: 全局流程调度 Agent Life 与 Google 级高信噪比输出架构
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v3.7.0`
- **对应全局台账**：`REQ-055`
- **提出时间**：2026-09-23
- **核心诉求与目标**：
  1. **全局流程管控 Agent Life**：确立专门负责时序掌控、执行裁决与全局调度锁申领/释放的生命周期调度器规约 `rules/workflow/agent_life_spec.md`；
  2. **阶段原子性完成反馈**：执行工人完成每道工序后出具标准的原子回执 (Stage Feedback Receipt) 驱动 Agent Life 推进下一步；
  3. **Google 级意图理解与输出呈现**：借鉴搜索精选摘要 (Featured Snippet) 与知识面板，首屏零击直达核心答案；
  4. **P0~P2 重要度三级过滤**：🔴 P0 置顶，🟡 P1 精炼单行，⚪ P2 无关修饰套话 100% 彻底静默剔除。
- **关联产出物**：
  - `rules/system/meta_rules.md`（第二十五条重要度三级过滤与高信噪比输出律）
  - `rules/workflow/agent_life_spec.md`
  - `scripts/agent_life.mjs`
  - `docs/requirements.md`（`REQ-055`）
- **验收标准**：
  - [x] Agent Life 规约与调度引擎脚本落地；
  - [x] 阶间原子回执标准确立；
  - [x] 元规则第二十五条生效，重要度过滤规则入册；
  - [x] 全局台账与专项目录版本统一推进至 v3.7.0。

---

### CR-011: 全域能力标识规范重命名、极速文案通道与单例 Agent PP / 短生命周期 Life(N) 并发调度
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v3.8.0`
- **对应全局台账**：`REQ-056`
- **提出时间**：2026-09-23
- **核心诉求与目标**：
  1. **全域五大能力标识规范化重命名与唯一性检测**：落地 `scripts/check_unique_identifiers.mjs`，在 `indexes/capabilities_index.md` 统一前缀与唯一 ID（`agent.*` / `mcp.*` / `cli.*` / `skill.*` / `plugin.*`）；
  2. **极速提炼通道“给出文案”**：在 `indexes/shortcuts_index.md` 注册 G0 高速通道，一键将口语想法提炼成便于 AI 执行的标准 PRD；
  3. **单例并发中枢 Agent PP**：确立全任务唯一并发编排中枢，负责任务树拓扑拆解、生命周期调度与屏障汇聚；
  4. **短生命周期串行执行体 Agent Life(N)**：支持多实例编号（life1, life2...），单线串行推进，完成出具回执后即刻消亡释放资源；
  5. **PP 与 Life 分层协同规约与引擎升级**：编制 `rules/workflow/pp_life_orchestration.md` 并升级 `scripts/agent_life.mjs` 支持派生、消亡与全局 teardown 初始化。
- **关联产出物**：
  - `indexes/shortcuts_index.md`
  - `indexes/capabilities_index.md`
  - `scripts/check_unique_identifiers.mjs`
  - `rules/workflow/pp_life_orchestration.md`
  - `scripts/agent_life.mjs`
  - `docs/requirements.md`（`REQ-056`）
- **验收标准**：
  - [x] 快速通道“给出文案”注册生效并通过通道审计；
  - [x] 能力唯一标识检测器通过，无重名冲突；
  - [x] PP-Life 调度规约建立并完成脚本引擎自测；
  - [x] 全局台账与专项目录版本统一推进至 v3.8.0。

---

### CR-012: 第一性原理与物理实证律
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v3.9.0`
- **对应全局台账**：`REQ-057`
- **提出时间**：2026-09-23
- **核心诉求与目标**：
  1. **元规则第二十六条**：在 `rules/system/meta_rules.md` 正式确立《第一性原理与物理实证律》，严禁人云亦云与盲目采信二手转述；
  2. **第一性原理调查与实证五步法**：编制 `rules/coding/first_principles_verification.md`，确立本质还原、剥离假设、最小探针、采集实况与实证闭环的标准化调查路径；
  3. **L1~L3 论据证据分级法典**：明确 L1 物理实证（退出码0/真实日志/读回）完全采信，L2 严密推论附推导链采信，L3 外部转述绝不采信必须探针化验。
- **关联产出物**：
  - `rules/system/meta_rules.md`
  - `rules/coding/first_principles_verification.md`
  - `indexes/rules_index.md`
  - `docs/requirements.md`（`REQ-057`）
- **验收标准**：
  - [x] 第二十六条元规则写入生效；
  - [x] 第一性原理与实证调查五步法规约落地；
  - [x] 全局台账与专项目录版本统一推进至 v3.9.0。

---

### CR-013: 显式交付状态、六大可见即用实体产物与极端任务聚焦
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.0.0`
- **对应全局台账**：`REQ-058`
- **提出时间**：2026-09-23
- **核心诉求与目标**：
  1. **显式交付状态置顶**：首屏第一行必须严格以 🟢【真实实施完成态】或 🟡【仅方案规划态】等标准化徽标定性，彻底消灭模糊交付；
  2. **六大实体产物可见即用铁律**：交付收尾中必须具备实体入口（文案、DMG安装包、Web服务URL、App/脚本、物理文件路径、可视化图片），真实存在且开箱即用；
  3. **极端任务聚焦与无关问题静默**：严格只围绕本次任务直接目标答复，客套寒暄、发散思考彻底 100% 静默过滤。
- **关联产出物**：
  - `rules/system/meta_rules.md`（第二十七条）
  - `rules/workflow/task_execution_flow.md`（第六章交付收尾三要素）
  - `docs/requirements.md`（`REQ-058`）
- **验收标准**：
  - [x] 第二十七条元规则写入生效；
  - [x] 任务执行流固化六大可见实体交付物契约；
  - [x] 全局台账与专项目录版本统一跃迁至里程碑 v4.0.0。

---

### CR-014: 报错反思防复发闭环、流程刚柔分级矩阵与交付输出框架刚性化
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.1.0`
- **对应全局台账**：`REQ-059`
- **提出时间**：2026-09-23
- **核心诉求与目标**：
  1. **元规则第二十八条与报错防复发长期台账**：在 `rules/system/meta_rules.md` 确立《报错归因记录与防复发优化律》，落地 `memory/error_ledger.md`，执行非零退出与断言失败三段式解构并反哺前置探针；
  2. **流程刚柔分级实施准则**：在 `rules/workflow/task_execution_flow.md` 划定“绝对刚性实施”与“弹性自适应实施”两级矩阵，杜绝教条僵化与随意跳步；
  3. **交付收尾刚性输出框架**：在元规则第二十九条与执行流中固化交付收尾五大刚性模块（状态徽标、核心成果、实体入口、量化门禁/未验证声明、流程回溯卡），缺一不可。
- **关联产出物**：
  - `rules/system/meta_rules.md`（第二十八条、第二十九条）
  - `rules/workflow/task_execution_flow.md`（第一节刚柔分级矩阵、第六节刚性交付五模块、第七节报错闭环）
  - `memory/error_ledger.md`
  - `docs/requirements.md`（`REQ-059`）
- **验收标准**：
  - [x] 第二十八条、第二十九条元规则写入生效；
  - [x] 任务执行流固化刚柔分级矩阵与交付收尾五大模块；
  - [x] 长期报错台账建立并完成初始高频模式登记；
  - [x] 全局台账与专项目录版本统一推进至 v4.1.0。

---

### CR-015: 全端统一可读性排版设计法典与检索路由质量评估自进化机制
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.2.0`
- **对应全局台账**：`REQ-060`
- **提出时间**：2026-09-23
- **核心诉求与目标**：
  1. **全端可读性与无障碍排版设计法典落地**：编制 `knowledge/common/readability_specification.md`，确立 Web、DMG、App、小程序字体族、字号比例、导航大小、正文行高、绝对最小文字红线、WCAG 2.1 对比度与加粗节制规范，并统合至 `knowledge/common/interaction_specification.md` 与知识库总纲；
  2. **检索与路由质量统计评估与高速通道扩充**：建立 RQI 指标评估模型，在 `indexes/shortcuts_index.md` 增补“可读性规范”高速通道并扩充“给出文案”自然语言触发词，通道通过 `scripts/channel_audit.mjs` 审计保持 0 冲突与 0 死链。
- **关联产出物**：
  - `knowledge/common/readability_specification.md`
  - `knowledge/common/interaction_specification.md`
  - `knowledge/common/README.md`
  - `knowledge/README.md`
  - `indexes/shortcuts_index.md`
  - `docs/requirements.md`（`REQ-060`）
- **验收标准**：
  - [x] 全端排版设计法典建立并统合进公共知识库；
  - [x] 交互规范完成《Don't Make Me Think》排版章节指针统合；
  - [x] 快速通道表完成可读性通道注册并全量审计通过（29 条通道 0 问题）；
  - [x] 全局台账与专项目录版本统一推进至 v4.2.0。

---

### CR-016: 文本精细排版法典扩充与系统交互动效组件规范化
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.3.0`
- **对应全局台账**：`REQ-061`
- **提出时间**：2026-09-23
- **核心诉求与目标**：
  1. **文字微观排版铁律落地**：在 `knowledge/common/readability_specification.md` 扩充文字布局（桌面 45~75 字/移动 20~35 字）、中文左对齐/数据右对齐、1.5~1.6行高、避头尾法则与孤字防范；
  2. **交互按钮系统与页面动效组件规范**：在 `knowledge/common/interaction_specification.md` 落地 Large/Medium/Small 跨端按钮尺寸、圆角 Token、推进/淡入/抽屉页面过渡形式、250ms动效曲线及按压下沉反馈；
  3. **全域版本同步跃迁**：全局台账与管控专项目录版本统一推进至 v4.3.0。
- **关联产出物**：
  - `knowledge/common/readability_specification.md`
  - `knowledge/common/interaction_specification.md`
  - `docs/requirements.md`（`REQ-061`）
- **验收标准**：
  - [x] 文字精细排版四项铁律完成扩充；
  - [x] 按钮规格、页面过渡与点击反馈动效法典落地；
  - [x] 全局台账与专项目录版本统一推进至 v4.3.0。

---

### CR-017: 格式塔交互映射深化与全域字体选型工程标准法典化
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.4.0`
- **对应全局台账**：`REQ-062`
- **提出时间**：2026-09-23
- **核心诉求与目标**：
  1. **格式塔交互行为映射规范法典化**：在 `knowledge/common/interaction_specification.md` 扩充格式塔第七定律（共同命运律），并将接近/相似/闭合/主体背景分离/秩序/连续/共同命运七大定律深度绑定至具体交互映射行为（焦点流转、组件继承、蒙层交互、手势反馈、协同折叠动效）；
  2. **全域字体使用工程规范落地**：在 `knowledge/common/readability_specification.md` 落地四大跨端系统级字体栈，明确零网络字体依赖、艺术花体禁用红线、西文优先混排策略及 `tabular-nums` 数字等宽渲染铁律；
  3. **版本全局推进**：全局需求台账与管控专项目录版本统一跃迁至 v4.4.0。
- **关联产出物**：
  - `knowledge/common/interaction_specification.md`
  - `knowledge/common/readability_specification.md`
  - `docs/requirements.md`（`REQ-062`）
- **验收标准**：
  - [x] 交互规范完成格式塔七大定律交互映射行为法典化；
  - [x] 可读性规范完成全域系统字体族与四大字体红线固化；
  - [x] 全局台账与专项目录版本统一推进至 v4.4.0。

---

### CR-018: 任务级版本强制递增律与全域交付输出物版本强同步闭环
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.5.0`
- **对应全局台账**：`REQ-063`
- **提出时间**：2026-09-23
- **核心诉求与目标**：
  1. **第三十条元规则落地**：在 `rules/system/meta_rules.md` 写入《任务级版本强制递增与双向闭环律》，确立“每动必升版”与“无台账无版本”刚性红线；
  2. **交付收尾输出物强同步三大靶点**：在 `rules/workflow/task_execution_flow.md` 与 `rules/workflow/versioning_standard.md` 固化交付物自身元数据、需求管理主台账、最终答复与收尾卡片的三级版本 100% 同步约束；
  3. **版本全局推进**：全库实施总版本与受管文档头部版本一致推进至 v4.5.0。
- **关联产出物**：
  - `rules/system/meta_rules.md`
  - `rules/workflow/task_execution_flow.md`
  - `rules/workflow/versioning_standard.md`
  - `docs/requirements.md`（`REQ-063`）
- **验收标准**：
  - [x] 第三十条元规则写入生效；
  - [x] 执行流与版本规范固化每动必升版与输出物强同步三大靶点；
  - [x] 全局台账与专项目录版本统一推进至 v4.5.0。

---

### CR-019: 交互式核心信息卡片增强、多官网精美组件检索图库与新能力标准化接口生命周期
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.6.0`
- **对应全局台账**：`REQ-064`
- **提出时间**：2026-09-23
- **核心诉求与目标**：
  1. **核心交付信息交互式卡片化**：在 `rules/workflow/task_execution_flow.md` 与 `knowledge/common/interaction_specification.md` 落地核心成果交互卡片标准（包含卡片闭合、状态/版本胶囊、一句话成果点透、指标栅格与直达入口）；
  2. **多官网精美组件检索与图控法典**：编制 `knowledge/common/component_asset_reference.md`，建立 Shadcn UI、Tailwind UI、Apple HIG、AntD、Material 3 与 WeUI 权威检索源白名单，并抽象四大可复用微组件版式；
  3. **新能力命名与双层接口生命周期全规约**：在 `indexes/capabilities_index.md` 确立五大类分层点分命名法、内外双层接口契约（输入/输出/正负案例/降级策略）与快速通道路由强绑定闭环；
  4. **版本强同步跃迁**：全库实施总版本推进至 v4.6.0。
- **关联产出物**：
  - `rules/workflow/task_execution_flow.md`
  - `knowledge/common/interaction_specification.md`
  - `knowledge/common/component_asset_reference.md`
  - `indexes/capabilities_index.md`
  - `docs/requirements.md`（`REQ-064`）
- **验收标准**：
  - [x] 执行流收尾框架落地交互式核心信息卡片标准；
  - [x] 多官网精美组件检索图控法典建立并统合进知识库；
  - [x] 新能力标准化命名与双层接口生命周期法典化；
  - [x] 全局台账与专项目录版本统一推进至 v4.6.0。

---

### CR-020: 管控机制实况巡检与信息图二期实测重绘
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.7.0`
- **对应全局台账**：`REQ-065`
- **提出时间**：2026-09-23
- **核心诉求与目标**：
  1. **管控机制全景实测巡检**：执行 G1~G4 四道门禁、骨架齐备率、防丢覆盖、孤儿目录、未提交代码与双检查重全面探活；
  2. **信息图二期实测数据重绘**：将实测数据（65需求条目、70文件/494实质块、单行最高51/限65、v4.7.0）重绘进 `assets/generated_images/control_mechanism_infographic_v2.svg` 并同步生成 PNG；
  3. **版本全生命周期强同步**：受管文档与主台账版本统一跃迁至 v4.7.0。
- **关联产出物**：
  - `assets/generated_images/control_mechanism_infographic_v2.svg`
  - `assets/generated_images/control_mechanism_infographic_v2.png`
  - `docs/requirements.md`（`REQ-065`）
- **验收标准**：
  - [x] 管控机制全要素物理探针巡检完成；
  - [x] 信息图 SVG/PNG 完成实测数据重绘；
  - [x] 全局台账与专项目录版本统一推进至 v4.7.0。

---

### CR-021: 管控机制状态层脚本 Bash 语法缺陷修复与快照写入健全化
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.8.0`
- **对应全局台账**：`REQ-066`
- **提出时间**：2026-09-24
- **核心诉求与目标**：
  1. **状态层脚本（旧称门禁内核）Bash 变量解析缺陷修复**：修复 `scripts/control_gates.sh` 快照输出代码块中 `$TOTAL_GATES` 变量因紧贴中文全角括号导致的 `unbound variable` 致命异常，以及非函数上下文中使用 `local i` 的语法错误；
  2. **门禁判定状态快照生成与退出码健全化**：消除生成 `ai-control/reports/latest_status.md` 时被 `2>/dev/null` 静默掩盖的崩溃，确保门禁看板计算执行时退出码真实返回 0 并完整产出 30 行结构化快照；
  3. **任务级版本强制递增与双向台账闭环**：依照第三十条元规则，全库受管文档与主/专属台账实施总版本统一推进至 `v4.8.0`。
- **关联产出物**：
  - `scripts/control_gates.sh`
  - `ai-control/reports/latest_status.md`
  - `docs/requirements.md`（`REQ-066`）
- **验收标准**：
  - [x] `./scripts/control_gates.sh check` 退出码真实返回 0；
  - [x] `ai-control/reports/latest_status.md` 完整持久化；
  - [x] 全局台账与专项目录版本统一推进至 v4.8.0。

---

### CR-022: 管控机制索引/路由/接口/执行四层解耦与任务命名全生命周期治理规范
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.9.0`
- **对应全局台账**：`REQ-067`
- **提出时间**：2026-09-24
- **核心诉求与目标**：
  1. **任务命名全生命周期双向同步**：在任务执行前置（S05 环节）与门禁看板中固化自动/手动命名闭环，保持存量与新增会话命名 100% 同步合规；
  2. **四级解耦执行体系确立**：在 `rules/workflow/task_execution_flow.md` 确立“索引层 (Index) ➔ 路由层 (Route) ➔ 接口层 (Interface) ➔ 执行层 (Execution)”四级解耦流水线；
  3. **新增与变更全量同步到索引层铁律**：在 `rules/workflow/change_flow.md` 固化索引覆盖硬约束，并在 `scripts/legacy_align_scan.mjs` 建立索引覆盖探针；
  4. **执行层全面开放标准化接口**：在 `indexes/tool_interfaces.md` 与 `indexes/capabilities_index.md` 统一定义全域能力的 Identifier、边界范围、输入参数 Schema、输出回执与安全评级；
  5. **执行层原子黑盒封装**：执行逻辑内部自治封装，外部调度只走确定性标准接口，杜绝跨层直接穿透。
- **关联产出物**：
  - `rules/workflow/task_execution_flow.md`
  - `rules/workflow/change_flow.md`
  - `indexes/capabilities_index.md`
  - `indexes/navigation_router.md`
  - `indexes/tool_interfaces.md`
  - `scripts/legacy_align_scan.mjs`
  - `docs/requirements.md`（`REQ-067`）
- **验收标准**：
  - [x] 四级解耦执行体系与全生命周期命名规范写入生效；
  - [x] 索引层与接口层开放契约定义完备；
  - [x] 存量校准脚本具备索引覆盖判定能力并全绿通行；
  - [x] 全局台账与专项目录版本统一推进至 v4.9.0。

---

### CR-023: 全原子变动版本锚定基石律与管控机制存量新增全域双向同步治理体系
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.10.0`
- **对应全局台账**：`REQ-068`
- **提出时间**：2026-09-24
- **核心诉求与目标**：
  1. **全原子变动版本锚定律**：确立“无论多小的改动均须以版本变动为法定基石”原则，单字/注释/配置微调均至少递增 PATCH，彻底杜绝无版本悬空物理修改；
  2. **管控机制存量新增全域双向同权律**：管控规则、门禁判定、扫描探针的任何优化，100% 同权无差别覆盖存量资产与未来新增资产，禁止任何历史豁免；
  3. **存量强制校准闭环**：机制升级必须强制配套存量资产批量迁移与对齐，存量违规项清零前禁止关闭任务；
  4. **四位一体强同步**：受管文档头部元数据、主需求台账、管控台账、实况图资 100% 推进归位至 `v4.10.0`。
- **关联产出物**：
  - `rules/system/meta_rules.md`
  - `rules/workflow/versioning_standard.md`
  - `rules/workflow/change_flow.md`
  - `docs/requirements.md`（`REQ-068`）
- **验收标准**：
  - [x] 第三十条元规则与版本标准完成零容忍版本锚定与同权法典化；
  - [x] 变更流规约固化存量全量回扫与当轮清零闭环；
  - [x] 全局台账与专项目录版本统一推进至 v4.10.0。

---

### CR-024: 全任务强命名门禁与语义化分类编号难度打分模型扩充规范
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.11.0`
- **对应全局台账**：`REQ-069`
- **提出时间**：2026-09-24
- **核心诉求与目标**：
  1. **任务启动即命名法定硬门禁**：确立每次执行任务首动在 S05 工序对当前会话完成合规命名的刚性约束；
  2. **知识库命名法典扩充：中文语义化分类**：在 `knowledge/common/task_naming_spec.md` 扩充七大中文语义化分类（新需/调研/优规/修漏/重构/巡检/测验），保持 `[分类编号][难度] 概述` 标准三段式；
  3. **模型自主难度打分梯队法典化**：完善 1~100 分四维难度打分模型与四个执行区间（1~30极低/31~60中等/61~85复杂/86~100颠覆），100 分最难；
  4. **任务概述极简与防截断**：概述汉字数严格限制在 8 字或以内，动宾短语一语中的；
  5. **存量与新增双向全面调整**：升级脚本工具链（`check_task_naming.sh`、`name_me.sh`、`auto_naming.mjs`），向后兼容存量英文字母分类，新增任务优先中文语义化标签，并完成全库版本与台账推进至 `v4.11.0`。
- **关联产出物**：
  - `knowledge/common/task_naming_spec.md`
  - `scripts/check_task_naming.sh`
  - `scripts/name_me.sh`
  - `scripts/lib/auto_naming.mjs`
  - `rules/workflow/task_execution_flow.md`
  - `docs/requirements.md`（`REQ-069`）
- **验收标准**：
  - [x] 知识库命名规范权威源完成中文语义化分类与难度标尺扩充；
  - [x] 校验脚本与一键改名工具支持新中文分类与难度格式并实测通过；
  - [x] 全局台账与专项目录版本统一推进至 v4.11.0。

---

### CR-025: 管控机制结构化与全流程闭环防跳步执行规范
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.13.0`
- **对应全局台账**：`REQ-070`
- **提出时间**：2026-09-24
- **核心诉求与目标**：
  1. **结构化与流程化顶层设计**：强化“索引 ➔ 路由 ➔ 接口 ➔ 执行”四级解耦机制，确立全域任务执行的刚柔分级实施准则；
  2. **不可跳过的刚性卡点保障机制 (Anti-Bypass Guardrails)**：法典化确立“无客观判定不立规，有客观判定必阻断”铁律，固化六大物理防线（G1~G4底座门禁、S05首发改名、S07待办常显、S11写后必读回、S13多维双检扫描、S16五大模块收尾），明确机器判定命令与跳步处罚；
  3. **细致的全景任务执行流程闭环**：在 `rules/workflow/task_execution_flow.md` 细化从阶段 0（意图接收）到阶段 7（交付收尾）的八阶端到端流水线，明确每道工序的输入前置、核心动作、客观判定与产出标准；
  4. **四位一体版本强同步**：推进全局实施总版本号至 `v4.12.0`，主需求台账与管控台账原子同步。
- **关联产出物**：
  - `rules/workflow/task_execution_flow.md`
  - `docs/requirements.md`（`REQ-070`）
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 核心流程法典完成结构化、流程化与防跳步刚性卡点扩充；
  - [x] 任务执行八阶闭环流水线与机器判定命令细致落盘并完成写后读回；
  - [x] 全局台账、管控台账与受管文档版本统一推进至 v4.12.0。

---

### CR-026: 任务栏改名前端可见性保障与文末四要素固定精简收尾规范
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.13.0`
- **对应全局台账**：`REQ-071`
- **提出时间**：2026-09-24
- **核心诉求与目标**：
  1. **任务栏改名前端肉眼可见刚性保障**：彻底根治仅修改存储但前端界面脱节的问题；重构 `scripts/rename_session.sh`，自动从 SQLite 数据库提取宿主 Web 鉴权 Cookie，构造标准的 `session/rename` RPC 请求体与正确的 `args.request` 封装，通过宿主事件总线广播前端，实现前端任务栏/侧边栏无需刷新原地即时更新，并完成本地权威存储双写闭环；
  2. **文末四要素固定精简收尾结构**：废除冗长五大模块的无效信息堆砌，在 `rules/workflow/task_execution_flow.md` 固化文末绝对刚性收尾框架，必须且仅包含：【输出物】、【输出地址】、【当前状态】、【重要说明】四项标准要素；
  3. **四位一体版本强同步**：推进全局实施总版本号至 `v4.13.0`，主需求台账与管控台账原子同步。
- **关联产出物**：
  - `scripts/rename_session.sh`
  - `rules/workflow/task_execution_flow.md`
  - `docs/requirements.md`（`REQ-071`）
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 改名脚本通过 RPC 广播 + 存储双写实现前端任务栏肉眼可见修改；
  - [x] 实操法典固化文末四要素固定精简收尾结构并完成读回校验；
  - [x] 全局台账、管控台账与受管文档版本统一推进至 v4.13.0。

---

### CR-027: 管控机制核心链路四维深化优化（动态更名 · 版本联动 · 收敛落盘 · 初始化快速通道）
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.14.0`
- **对应全局台账**：`REQ-072`
- **提出时间**：2026-09-24
- **核心诉求与目标**：
  1. **任务全生命周期动态更名与前端穿透**：任务执行前必须强制命名（S05），执行过程中阶段演进时动态更名，依托 `scripts/rename_session.sh` 与 RPC 广播实现前端看板肉眼可见即时更新；
  2. **版本号与需求强联动**：任务执行前置生成/关联需求编号，版本号按 SemVer 刚性递增，并在前端状态栏/版本徽标中完成同步呈现；
  3. **收敛态落盘与“以需定测”闭环**：任务执行收敛后自动将技术决策回写项目文件夹需求文件，测试用例严格以需求文件验收条款为基准执行验证；
  4. **“项目初始化”快速通道落地**：将“项目初始化”注册为 G0 高速通道，新增 `scripts/init_project.sh` 脚手架脚本，秒级生成目录骨架、防丢文件与 v1.0.0 基础版本。
- **关联产出物**：
  - `scripts/init_project.sh`
  - `indexes/shortcuts_index.md`
  - `rules/workflow/task_execution_flow.md`
  - `rules/workflow/versioning_standard.md`
  - `docs/requirements.md`（`REQ-072`）
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 快速通道注册“项目初始化”且通道审计（`channel_audit.mjs`）100% 绿灯；
  - [x] 脚手架脚本 `scripts/init_project.sh` 具备可执行权限并支持秒级骨架与基础版本生成；
  - [x] 任务动态更名、版本需求联动、收敛落盘与以需定测在实操法典中闭环落盘；
  - [x] 全局台账、管控台账与受管文档版本统一推进至 v4.14.0。

---

### CR-028: 全域任务命名同权治理与文件生命周期标记清除定位规约
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.15.0`
- **对应全局台账**：`REQ-073`
- **提出时间**：2026-09-24
- **核心诉求与目标**：
  1. **存量与新增任务命名全域同权机器治理**：依据 [`knowledge/common/task_naming_spec.md`](../../knowledge/common/task_naming_spec.md) 严格推行三要素 `[分类编号][难度分] 汉字概述`。新增任务首动强制调用 `scripts/rename_session.sh` 并通过 RPC 穿透前端任务栏；历史存量任务通过 `scripts/batch_rename_sessions.mjs` 审计与批量清洗，门禁看板常显命名状态，不合规直接阻断；
  2. **全域文件生命周期元数据标记 (Retention Tagging)**：在所有新建或修改的文档头部强制嵌入生命周期元数据块（文档类型 Doc Type、清理定位 Retention、生成会话、到期清除条件），四级保留策略白名单（`[PERMANENT]` 永久核心资产、`[PERSISTENT]` 长期受管资产、`[EPHEMERAL-AUTO]` 临时易失产物、`[DEPRECATED-PURGEABLE]` 已废弃可清理）；
  3. **清除机制快速扫描与自动化联动**：升级自愈清理脚本 `scripts/disk_check_and_cleanup.sh`，支持根据头部 `Retention` 标签秒级定位可删除文件并安全清理，绝对保护 `[PERMANENT]` 白名单资产；
  4. **四位一体版本强同步**：推进全局实施总版本号至 `v4.15.0`，主需求台账与管控台账原子同步。
- **关联产出物**：
  - `knowledge/common/task_naming_spec.md`
  - `rules/workflow/audit_and_cleanup.md`
  - `templates/requirement_template.md`
  - `templates/page_ledger_template.md`
  - `scripts/disk_check_and_cleanup.sh`
  - `docs/requirements.md`（`REQ-073`）
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 任务命名规约明确新增与存量任务全域同权与机器拦截；
  - [x] 资源治理规约明确文件元数据头部标记与四级 Retention 策略；
  - [x] 标准模板 templates/ 注入规范生命周期元数据头部；
  - [x] 磁盘自愈清理脚本落地基于头部元数据标记的快速定位与安全清除；
  - [x] 全局台账、管控台账与受管文档版本统一推进至 v4.15.0。

---

### CR-029: 任务首动命名调度句柄化与执行驱动路由索引自底向上强同步规约
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.16.0`
- **对应全局台账**：`REQ-074`
- **提出时间**：2026-09-24
- **核心诉求与目标**：
  1. **任务首动改名与调度句柄法定化**：在方案筹策后、任何实质操作前，首发命令必须调用 `scripts/rename_session.sh` 并广播穿透前端任务栏；标准三要素任务名自动成为该任务在生命周期中的全局唯一调度句柄（Task Dispatch Handle），子代理派发（Agent PP/Life）、锁申领与审计台账强制显式携带该名称；
  2. **执行驱动四级解耦自底向上逆向强同步**：确立“执行层能力变动 ➔ 接口层提取 ➔ 路由层注册 ➔ 索引层上架”的反向强同步协议（Reverse Capability Sync & Bubble-up Protocol）。任何执行层脚本能力的增删改，必须同步在接口层声明契约、在路由层注册自然语言通道、在索引层上架能力与正反案例；
  3. **机器判定硬门禁保障**：由 `scripts/channel_audit.mjs` 实施全通道审计，死链或冲突未归零前禁止交付；
  4. **四位一体版本强同步**：推进全局实施总版本号至 `v4.16.0`，主需求台账与管控台账原子同步。
- **关联产出物**：
  - `rules/workflow/task_execution_flow.md`
  - `rules/workflow/agent_life_spec.md`
  - `indexes/capabilities_index.md`
  - `indexes/shortcuts_index.md`
  - `indexes/tool_interfaces.md`
  - `scripts/channel_audit.mjs`
  - `docs/requirements.md`（`REQ-074`）
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] 实操法典确立任务首动改名为调度句柄前置法定条件；
  - [x] 实操法典固化执行驱动四级解耦自底向上强同步规约；
  - [x] 调度规范 agent_life_spec.md 明确子代理调度携带任务名称句柄；
  - [x] 通道审计脚本 channel_audit.mjs 保持 100% 绿灯；
  - [x] 全局台账、管控台账与受管文档版本统一推进至 v4.16.0。

---

### CR-030: 管控机制知行合一强闭环、审计 Agent 与交付执行效果百分制量化打分规约
- **当前状态**：`[ACTIVE]` 生效中
- **实施版本**：`v4.17.0`
- **对应全局台账**：`REQ-075`
- **提出时间**：2026-09-24
- **核心诉求与目标**：
  1. **管控机制知行合一闭环**：废除 Fast Track 免改名等一切豁免后门，所有任务必须在开工第一步首动改名；升级管控门禁接入 G0 命名硬门禁，未完成合规命名的会话直接阻断 `execAllowed`；
  2. **管控专属审计智能体 (Control Auditor)**：设立专职管控监督智能体，采用 0~100 分量化评分机制，严格按规划执行打 100 满分，按跳步、漏读回、未双检等违规项递减扣分；
  3. **交付结构升级扩充**：交付标准固化为六大模块，文末强制新增【执行效果】专属板块，呈现得分、评级与扣分审计明细；
  4. **版本强同步**：推进全局实施总版本号至 `v4.17.0`。
- **关联产出物**：
  - `AGENTS.md`
  - `rules/workflow/task_execution_flow.md`
  - `ai-control/config/gates.conf`
  - `scripts/control_gates.sh`
  - `scripts/audit_execution.sh`
  - `docs/requirements.md`（`REQ-075`）
  - `ai-control/requirements/control_requirements_ledger.md`
- **验收标准**：
  - [x] AGENTS.md 写入开工第〇步首动改名与全新【执行效果】收尾标准；
  - [x] task_execution_flow.md 废除豁免，确立知行合一原则与执行效果审计标准；
  - [x] control_gates.sh 接入 G0 命名门禁并联动阻断；
  - [x] scripts/audit_execution.sh 实现 0~100 分量化打分逻辑并输出标准卡片；
  - [x] 双检扫描与门禁脚本全部通过。


















