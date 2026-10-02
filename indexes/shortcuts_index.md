# 快速通道指令路由与地图式高速干道导航索引

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.29.3`
> - **对应实施版本**：`v4.29.3`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **最后更新日期**：2026-09-16
> - **版本状态**：`[Release 稳定生效]`

全局规则体系抽象为四级路网权重拓扑：命中口令走干道。

---

## 🗺️ 一、四级干道路网权重拓扑架构

```text
意图输入 → G0（安全放行）→ G1 → 深度专业研发走G2；冷门资产或模版走G3

🔴 G0特快高速·权重100：rules/system/meta_rules.md·rules/security/security_baseline.md——0延迟门禁，最高仲裁，高危阻断
🔵 G1国道业务主干·权重80：口令秒级直达（探➔攻➔归）；六大管道[R规/F功/D文/S系/O运/Q测]；台账docs/requirements.md双向对齐——高频零空转、直出交付
🟡 G2省道专业支线·权重50：Unity规范/原子性事务规约；知识库三法典（世界观/美术/工程）—— 垂直召回
🟢 G3县道便道·权重20：模版（templates/*）；避坑（lessons/*）—— 只读一次防漫游
```

---

## 🚀 二、G1 级高速干道快速口令与路由映射表 (含直达入口)

| 快速口令 (示例) | 路由路网 | 命中意图 | 标准动作与数据源 | 结构化交互交付入口 (必给) |
| :--- | :---: | :--- | :--- | :--- |
|**“看看当前dsh体系能力”**（“系统能力全景”）|G1干线|召回 DSH 宿主基座全景架构|读取 [`indexes/dsh_capabilities.md`](dsh_capabilities.md)|[http://127.0.0.1:50447](http://127.0.0.1:50447)|
|**“查看规则全景”**（“规则索引”）|G1干线|召回所有规则与规范总图|读取 [`indexes/rules_index.md`](rules_index.md)|
|**“安全红线”**（“安全基线”）|G0高速|查阅免审批环境八大红线|读取 [`rules/security/security_baseline.md`](../rules/security/security_baseline.md)|
|**“查看知识库”**（“知识库总览”）|G2支线|检阅世界观、美术与工程标准|读取 [`knowledge/README.md`](../knowledge/README.md)|
|**“unity规范”**|G2支线|查阅 Unity 目录与代码规范|读取 [`rules/coding/unity_project_standard.md`](../rules/coding/unity_project_standard.md)|
|**“原子性规范”**|G2支线|查阅操作与设计原子性清单|读取 [`rules/coding/atomicity_specification.md`](../rules/coding/atomicity_specification.md)|
|**“避坑经验”**|G3辅道|查阅避坑认知沉淀|读取 [`memory/lessons_learned.md`](../memory/lessons_learned.md)|
|**“全域有没有脱管”**（“其他工程服从管控了吗”）|G1干线|判定全域 DSH 工程 100% 纳入管控|实跑 [`node scripts/scope_audit.mjs --check`](../scripts/scope_audit.mjs)|
|**“需求版本对得上吗”**（“版本贯通判定”）|G1干线|需求文案 ↔ 台账 ↔ 载体 ↔ 回复四处对拍|实跑 [`node scripts/req_version_audit.mjs --check`](../scripts/req_version_audit.mjs)|
|**“外部工程推送闭环没”**（“还有没推送的工程吗”）|G1干线|逐工程核验远程/待推送/推没推成|实跑 [`bash scripts/push_external_projects.sh`](../scripts/push_external_projects.sh)|
|**“有没有空架子/幻觉”**（“悬空引用清理”）|G1干线|治理文档引用真实性+机制通电凭据|实跑 [`node scripts/anti_hallucination_audit.mjs --check`](../scripts/anti_hallucination_audit.mjs)|
|**“检查输出精简”**（“回复啰不啰嗦”）|G2支线|判定最近一轮回复的体量与文末结构|实跑 [`node scripts/output_audit.mjs --check`](../scripts/output_audit.mjs)（证据源为宿主会话转录）|
|**“检查接口覆盖”**（“执行层有接口吗”）|G2支线|核查执行层有无 OOP 式接口契约|实跑 [`node scripts/check_layer_interfaces.mjs --coverage`](../scripts/check_layer_interfaces.mjs)|[`knowledge/common/execution_layer_interface_spec.md`](../knowledge/common/execution_layer_interface_spec.md)|
|**“规划执行路线”**（“这个能力怎么调更高效”）|G1干线|命中执行层后给出调配方案（依赖/并行/锁冲突/失败回退）|实跑 [`node scripts/route_plan.mjs "<意图>"`](../scripts/route_plan.mjs)|
|**“这个任务要哪些执行层”**（“任务执行层树/执行层树状图”）|G1干线|把任务所需执行层装配成可视图树|实跑 [`node scripts/task_layer_tree.mjs "<任务意图>"`](../scripts/task_layer_tree.mjs)（出图追加 `--png <基名>`）|
|**“并发调度”**（“并行派单/防死锁/有界并发”）|G1干线|有界并发派单：先证可并行，冲突/死锁/活锁一律拒单|实跑 [`node scripts/butler_scheduler.mjs --plan <tasks.jsonl>`](../scripts/butler_scheduler.mjs)（真派单用 `--run`）|
|**“插件安装排队没”**（“安装市场插件/插件并发”）|G1干线|插件安装并发受理+冲突域排队+进度可见，杜绝无界等待|实跑 [`node scripts/plugin_install_queue.mjs list`](../scripts/plugin_install_queue.mjs) 或 `probe`|`agentsBusy`|
|**“技能有没有载体”**（“空架子技能/技能物理触达”）|G1干线|技能层 178 条逐条判有无可执行载体|实跑 [`node scripts/skill_carrier_audit.mjs --check`](../scripts/skill_carrier_audit.mjs)|
|**“管控机制瘦身”**（“压缩管控篇幅/token 用量”）|G2支线|能力等价+只许减不许涨（篇幅与 token 预算）|实跑 [`node scripts/token_budget_audit.mjs --check`](../scripts/token_budget_audit.mjs)|
|**“任务列表面板在跑吗”**（“逐条进度/完成打钩面板”）|G1干线|判定任务列表面板（逐条进度+完成打钩）是否触达物理层|实跑 [`node scripts/todo_panel_audit.mjs --check`](../scripts/todo_panel_audit.mjs)|
|**“生态扩展”**|G1干线|查阅外部智能体扩展生态|读取 [`indexes/extension_ecosystem.md`](extension_ecosystem.md)|
|**“生成图表”**|G1干线|查阅图表标准与决策树|读取 [`docs/diagram_generation_guide.md`](../docs/diagram_generation_guide.md)|
|**“生成图片 <描述>”**|G1干线|用图像模型按描述创作图片（非手绘信息图）|执行 [`scripts/generate_image.py`](../scripts/generate_image.py)|`![描述](路径)`|
|**“快速体检”**|G1干线|执行工程健康度巡检|执行 [`scripts/rename_session.sh`](../scripts/rename_session.sh) 并巡检 Git|
|**“磁盘体检”**（“清理垃圾/释放空间”）|G1干线|检查磁盘水位与清理 DSH 临时垃圾|执行 [`scripts/disk_check_and_cleanup.sh`](../scripts/disk_check_and_cleanup.sh) `--clean`|
|**“资产指纹”**（“新鲜度雷达/指纹审计”）|G1干线|扫描全域资产新鲜度与数字指纹|执行 [`scripts/fingerprint_audit.sh`](../scripts/fingerprint_audit.sh) `--freshness`|
|**“远程同步”**（“提交并推送/git同步”）|G1干线|触发任务收尾远程 Git 强同步|执行 [`scripts/git_sync_remote.sh`](../scripts/git_sync_remote.sh) `<ID> <Title> <Summary>`|
|**“调度锁”**（“资源锁/防冲突/排队看盘”）|G1干线|查看全局资源锁占用大盘与自愈清理|执行 [`scripts/global_scheduler_lock.sh`](../scripts/global_scheduler_lock.sh) `--status`|
|**“门禁看板”**（“闸门状态/门禁状态”）|G1干线|四道门禁是否全过|执行 [`scripts/control_gates.sh`](../scripts/control_gates.sh) `check`|
|**“看看管控机制”**（“管控机制全貌/管控机制/机制全貌”）|G1干线|门禁+双检+存量校准+通道清单|依次 [`scripts/control_gates.sh`](../scripts/control_gates.sh) `check`、[`scripts/redundancy_scan.mjs`](../scripts/redundancy_scan.mjs)、[`scripts/conflict_scan.mjs`](../scripts/conflict_scan.mjs)、[`scripts/legacy_align_scan.mjs`](../scripts/legacy_align_scan.mjs)；要一页图则执行 [`scripts/gen_control_map.mjs`](../scripts/gen_control_map.mjs)|[`assets/generated_images/control_mechanism_now_v5.svg`](../assets/generated_images/control_mechanism_now_v5.svg)|
|**“看图学管控”**（“管控出图/一图看懂管控/出管控图”）|G1干线|看懂四道门禁状态与各门查什么|执行 [`scripts/control_gates.sh`](../scripts/control_gates.sh) `graph`（默认输出 `ai-control/reports/gate_graph.svg`）|`DSH_CONTROL_GRAPH_OUT=<路径>`|
|**“流程管控”**（“流程一致性/流程顺序/迭代台账/物理进度/独立复核”）|G1干线|看真实物理进度：顺序是否最优一致、改动是否都有记录、复核是否独立通过|依次 [`scripts/flow_control.mjs`](../scripts/flow_control.mjs) `--check`、[`scripts/progress_ledger.mjs`](../scripts/progress_ledger.mjs) `check`、[`scripts/process_supervisor.mjs`](../scripts/process_supervisor.mjs) `--fast`|
|**“查啰嗦”**（“冗余检测/重复内容”）|G1干线|检出同一内容被写两遍|执行 [`scripts/redundancy_scan.mjs`](../scripts/redundancy_scan.mjs) `--root .`|
|**“查打架”**（“冲突检测/自相矛盾”）|G1干线|检出同一事实两种说法（版本/计数/指标/标识/死链）|执行 [`scripts/conflict_scan.mjs`](../scripts/conflict_scan.mjs) `--root .`|
|**“存量校准”**（“遇碰即对齐/对齐清单”）|G1干线|检查存量资产是否跟上新规范|执行 [`scripts/legacy_align_scan.mjs`](../scripts/legacy_align_scan.mjs) `--root .`|
|**“通道审计”**（“通道体检/快速通道检查”）|G1干线|检查通道表有无死通道、说法能否命中|执行 [`scripts/channel_audit.mjs`](../scripts/channel_audit.mjs) `--root .`|
|**“手写图上屏”**（“SVG 出图/精确栅格化”）|G1干线|把手写 SVG 精确渲染为 PNG|执行 [`scripts/generate_image.py`](../scripts/generate_image.py)（`--svg <文件.svg>`，内部走 [`scripts/svg2png.sh`](../scripts/svg2png.sh)）|
|**“生成信息图 <主题>”**（“出信息图/画信息图/画机制图”）|G1干线|任何主题的信息图或教学图：按教学图机制产出|读取 [`docs/diagram_generation_guide.md`](../docs/diagram_generation_guide.md) 选型 → 取料 → 绘 SVG → 执行 [`scripts/generate_image.py`](../scripts/generate_image.py) `--svg` 栅格化 → 登记指针|[`assets/generated_images/gcm_gate_control_infographic.svg`](../assets/generated_images/gcm_gate_control_infographic.svg)|
|**“给我入口”**（“入口/交付入口/产出入口”）|G0高速|秒级输出当前任务或全域核心入口|执行 [`scripts/route_navigate.mjs`](../scripts/route_navigate.mjs) `--entry`|
|**“版本号”**（“查看版本号/当前版本/查版本”）|G0高速|秒级获取系统与管控机制实施总版本|读取 [`docs/requirements.md`](../docs/requirements.md) 与 [`ai-control/requirements/control_requirements_ledger.md`](../ai-control/requirements/control_requirements_ledger.md)|
|**“给出文案”**（“生成文案/提炼文案/整理需求/需求文案”）|G0高速|将口语想法提炼为可执行的 PRD 需求文案|读取 [`templates/requirement_template.md`](../templates/requirement_template.md) 并执行意图解构|
|**“可读性规范”**（“排版设计标准/字体字号规范”）|G1干线|查阅全端 (Web/DMG/App/小程序) 可读性与字号排版标准|读取 [`knowledge/common/readability_specification.md`](../knowledge/common/readability_specification.md)|
|**“地图导航 <能力/目标>”**（“能力导航/路线规划”）|G1干线|索引命中后生成起点至终点的地图式导航路线|执行 [`scripts/route_navigate.mjs`](../scripts/route_navigate.mjs) `<目标>`|
|**“项目初始化”**（“初始化项目/立项初始化”）|G0高速|快速生成项目结构、骨架防丢文件与基础版本|执行 [`scripts/init_project.sh`](../scripts/init_project.sh) `[项目路径]`|
|**“专业档输出”**（“详细技术版/面向专业人士”）|G1干线|把答复从浅白档切到专业档（术语与实现细节可展开）|读取 [`rules/system/output_standard.md`](../rules/system/output_standard.md) `§三 双档输出`|`⚙️ 专业档` `node scripts/output_audit.mjs --check`|
|**“一键重启”**（“重启DSH/重启宿主”）|G1干线|查“重启按钮”是否可用，并给出真机验收步骤|执行 [`skill-pool/plugins/dsh-plugin-restart/verify_restart_button.cjs`](../skill-pool/plugins/dsh-plugin-restart/verify_restart_button.cjs)|
---

## 🧩 二之一、快速通道注册规范

新增通道怎样才算登记合格：通道表唯一权威源，其余文件只写指针（如[`rules/workflow/component_naming.md`](../rules/workflow/component_naming.md) 只写“详见快速通道总表”）。

### 1. 触发词规则

| 规则 | 要求 |
| :--- | :--- |
|长度|**≤ 12 汉字**，好记好说（审计器查）|
|唯一性|不得重名或一名含另一名（如"门禁看板"与"看板"）|
|别名|允许 1~2 个同义说法，写作"主触发词"（"别名"）|
|命名偏好|动宾结构，忌单字/纯名词|
|宽触发|相关说法均应命中（如"帮我看一下管控机制"）；主名称优先，详见 §2|

### 2. 执行契约（每条通道必须写清四件事，缺一不可）

路由层级（G0高速/G1干线/G2支线/G3辅道）· 命中动作（脚本或文件**必须写成Markdown链接**，不得只写反引号命令）· 输出形态（看板/清单/图片/报告）· 落地条件（目标文件真实存在）。

### 3. 语义重叠的分工口径（用户已裁决：方案甲）

“门禁看板”与“看看管控机制”两条并存：

| 通道 | 定位 | 差别 |
| :--- | :--- | :--- |
|**门禁看板**|只看门禁|只跑四道门禁，答"能否动手"|
|**看看管控机制**|看机制全貌|门禁+双检+存量校准+通道清单，答"机制现状"|

> “管控机制”归“看看管控机制”（主名称优先），不再作“门禁看板”别名。

### 4. 注册与退役流程

- **注册**：走 `rules/workflow/change_flow.md` “流程入驻四道审计”→ 本表加一行（目标带链接）→ 登记 `docs/requirements.md`；
- **退役**：目标不存在或功能已合并**必须删除该行**，禁止留死通道；
- **自检**：

```bash
node scripts/channel_audit.mjs --root .
node scripts/channel_audit.mjs --self-test
```
---

## 🧭 三、干道路由命中与收敛算法

1. **高权重干道直达**：命中 G0/G1 仅走主干道，禁在 G2/G3 盲读；
2. **渐进式支路下探**：任务涉深度专业领域（如 Unity 开发、事务拆解）才下探 G2；
3. **交付物必带交互入口**：走任一级路由，交付必须含可点击直达入口，杜绝“交付无入口”。

---

## 🚦 四、双轨决策速查表

| 意图与任务特征 | 难度分 | 路由通道 | 必走/豁免关键点 |
| :--- | :---: | :---: | :--- |
|**纯查询/参数读取/口令检索**|$\le 20$ 分|**⚡ Fast Track**|免改名、免 todo_write、免四维大表，直出结论|
|**单文件文字微调/拼写修补**|$20\sim35$ 分|**⚡ Fast Track**|免重命名与测试脚本，`read` 读回自验即交付|
|**规则新增/核心逻辑重大修改**|$40\sim70$ 分|**🚨 Hard Line**|首动改名、前置审查、风险评估卡、todo_write、测试门禁、升版|
|**跨系统重构/代码研发/版本发布**|$> 70$ 分|**🚨 Hard Line**|十六步全工序闭环、自动化测试 100% 绿灯、三位一体强同步|
