# 快速通道指令路由与地图式高速干道导航索引 (Arterial Routing & Quick Shortcuts Matrix)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v3.0.0`
> - **对应实施版本**：`v3.0.0`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **最后更新日期**：2026-09-16
> - **版本状态**：`[Release 稳定生效]`

本文档是系统连接意图与规则落地的**高权重地图式导航枢纽**。参考工业级地图导航（如高德/Google Maps）的“高速干道优先、快速收敛、避免小道”算法，将全局规则体系抽象为**四级路网权重拓扑**。用户输入口令或日常指令时，智能体优先走高速干道，实现秒级直接收敛，彻底杜绝无序漫游。

---

## 🗺️ 一、四级干道路网权重拓扑架构 (Road Network Hierarchy)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   🗺️ 地图式指令干道路由导航拓扑                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ 用户意图输入
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 🔴 [G0 级 · 特快高速公路 · 权重 100]                                   │
│    - 系统全局元规则：rules/system/meta_rules.md                         │
│    - 免审批安全红线法典：rules/security/security_baseline.md            │
│    ★ 特性：0 延迟前置门禁，最高仲裁效力，高危指令绝对阻断                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ 安全放行
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 🔵 [G1 级 · 国道业务主干 · 权重 80]                                    │
│    - 快速通道口令秒级直达（如下表字典，探➔攻➔归 极简闭环）               │
│    - 六大核心业务管道分流：[R规 / F功 / D文 / S系 / O运 / Q测]          │
│    - 需求台账双向对齐：docs/requirements.md                            │
│    ★ 特性：高频业务优先走干线，零长流程空转，直接输出交付物              │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ 遇到深度专业研发               │ 需翻阅冷门资产/模版
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│ 🟡 [G2 级 · 省道专业支线 · 权重 50]   │  │ 🟢 [G3 级 · 县道便道 · 权重 20]│
│    - Unity 规范 / 原子性事务规约     │  │    - 标准模版 (templates/*)  │
│    - 知识库三法典 (世界观/美术/工程) │  │    - 历史避坑 (lessons/*)    │
│    ★ 特性：垂直领域精准召回          │  │    ★ 特性：按需只读一次，防漫游│
└──────────────────────────────────────┘  └──────────────────────────────┘
```

---

## 🚀 二、G1 级高速干道快速口令与路由映射表 (含直达入口)

| 快速口令 (示例) | 路由路网 | 命中意图 | 标准动作与数据源 | 结构化交互交付入口 (必给) |
| :--- | :---: | :--- | :--- | :--- |
| **“看看当前dsh体系能力”**<br>*(或“系统能力全景”)* | **G1 干线** | 召回 DSH 宿主基座全景架构 | 读取 [`indexes/dsh_capabilities.md`](dsh_capabilities.md) | 输出三层架构全景图，提供 Web 控制台入口：[http://127.0.0.1:50447](http://127.0.0.1:50447) |
| **“查看规则全景”**<br>*(或“规则索引”)* | **G1 干线** | 召回所有规则与规范总图 | 读取 [`indexes/rules_index.md`](rules_index.md) | 输出分层规则表，提供源码入口：[`indexes/rules_index.md`](rules_index.md) |
| **“安全红线”**<br>*(或“安全基线”)* | **G0 高速** | 查阅免审批环境八大红线 | 读取 [`rules/security/security_baseline.md`](../rules/security/security_baseline.md) | 输出八大阻断清单，提供入口：[`rules/security/security_baseline.md`](../rules/security/security_baseline.md) |
| **“查看知识库”**<br>*(或“知识库总览”)* | **G2 支线** | 检阅世界观、美术与工程标准 | 读取 [`knowledge/README.md`](../knowledge/README.md) | 输出知识库总览，提供入口：[`knowledge/README.md`](../knowledge/README.md) |
| **“unity规范”** | **G2 支线** | 查阅 Unity 目录与代码规范 | 读取 [`rules/coding/unity_project_standard.md`](../rules/coding/unity_project_standard.md) | 输出 Unity 目录与 .meta 铁律，提供入口：[`rules/coding/unity_project_standard.md`](../rules/coding/unity_project_standard.md) |
| **“原子性规范”** | **G2 支线** | 查阅操作与设计原子性清单 | 读取 [`rules/coding/atomicity_specification.md`](../rules/coding/atomicity_specification.md) | 输出操作级与设计级事务清单，提供入口：[`rules/coding/atomicity_specification.md`](../rules/coding/atomicity_specification.md) |
| **“避坑经验”** | **G3 辅道** | 查阅排查沉淀的避坑认知 | 读取 [`memory/lessons_learned.md`](../memory/lessons_learned.md) | 输出避坑指引，提供入口：[`memory/lessons_learned.md`](../memory/lessons_learned.md) |
| **“生态扩展”** | **G1 干线** | 查阅外部智能体扩展生态 | 读取 [`indexes/extension_ecosystem.md`](extension_ecosystem.md) | 输出 MCP / Skills / CLI / API 矩阵，提供入口：[`indexes/extension_ecosystem.md`](extension_ecosystem.md) |
| **“生成图表”** | **G1 干线** | 查阅图表标准与决策树 | 读取 [`docs/diagram_generation_guide.md`](../docs/diagram_generation_guide.md) | 输出五大图表模版，提供入口：[`docs/diagram_generation_guide.md`](../docs/diagram_generation_guide.md) |
| **“生成图片 <描述>”** | **G1 干线** | 用图像模型按描述创作图片（非手绘信息图） | 执行 [`scripts/generate_image.py`](../scripts/generate_image.py) | 自动生图，输出 `![描述](路径)` 并附带可点击打开链接 |
| **“快速体检”** | **G1 干线** | 执行工程健康度巡检 | 执行 [`scripts/rename_session.sh`](../scripts/rename_session.sh) 并巡检 Git | 输出工作区与版本对齐报告，提供 Git 状态回执 |
| **“磁盘体检”**<br>*(或“清理垃圾/释放空间”)* | **G1 干线** | 检查磁盘水位与清理 DSH 临时垃圾 | 执行 [`scripts/disk_check_and_cleanup.sh`](../scripts/disk_check_and_cleanup.sh) `--clean` | 输出释放容量、当前水位报告与白名单保护状态 |
| **“资产指纹”**<br>*(或“新鲜度雷达/指纹审计”)* | **G1 干线** | 扫描全域资产新鲜度与数字指纹 | 执行 [`scripts/fingerprint_audit.sh`](../scripts/fingerprint_audit.sh) `--freshness` | 输出资产新鲜度三级雷达看盘与落后清单 |
| **“远程同步”**<br>*(或“提交并推送/git同步”)* | **G1 干线** | 触发任务收尾远程 Git 强同步 | 执行 [`scripts/git_sync_remote.sh`](../scripts/git_sync_remote.sh) `<ID> <Title> <Summary>` | 自动探针、未配置自动开页引导、输出远程 Commit-Hash |
| **“调度锁”**<br>*(或“资源锁/防冲突/排队看盘”)* | **G1 干线** | 查看当前全局资源锁占用大盘与自愈清理 | 执行 [`scripts/global_scheduler_lock.sh`](../scripts/global_scheduler_lock.sh) `--status` | 输出活跃排他锁清单、持有任务、超时判定与防打架调度策略 |
| **“门禁看板”**<br>*(或“闸门状态/门禁状态”)* | **G1 干线** | **只看门禁**：四道门禁当前是否全过 | 执行 [`scripts/control_gates.sh`](../scripts/control_gates.sh) `check` | 输出量化看板（G1~G4 状态 + 指标 + 卡点） |
| **“看看管控机制”**<br>*(或“管控机制全貌/管控机制/机制全貌”)* | **G1 干线** | **看机制全貌**：门禁 + 双检 + 存量校准 + 通道清单 | 依次执行 [`scripts/control_gates.sh`](../scripts/control_gates.sh) `check`、[`scripts/redundancy_scan.mjs`](../scripts/redundancy_scan.mjs)、[`scripts/conflict_scan.mjs`](../scripts/conflict_scan.mjs)、[`scripts/legacy_align_scan.mjs`](../scripts/legacy_align_scan.mjs) | 输出机制全貌卡：四道门各查什么与当前状态、双检与存量校准实测数字、十六步强制/建议统计、当前通道清单、四层分工与载体路径。**数字必须来自本次实跑** |
| **“查啰嗦”**<br>*(或“冗余检测/重复内容”)* | **G1 干线** | 检出同一内容被写两遍 | 执行 [`scripts/redundancy_scan.mjs`](../scripts/redundancy_scan.mjs) `--root .` | 输出高相似块对清单；有重复则合并为迭代版本 |
| **“查打架”**<br>*(或“冲突检测/自相矛盾”)* | **G1 干线** | 检出同一事实两种说法（版本/计数/指标/标识/死链） | 执行 [`scripts/conflict_scan.mjs`](../scripts/conflict_scan.mjs) `--root .` | 输出冲突清单与裁决建议；**先裁决再改，禁止自行取舍** |
| **“存量校准”**<br>*(或“遇碰即对齐/对齐清单”)* | **G1 干线** | 检查存量资产是否跟上新规范 | 执行 [`scripts/legacy_align_scan.mjs`](../scripts/legacy_align_scan.mjs) `--root .` | 输出待对齐清单；须清零或书面说明原因 |
| **“通道审计”**<br>*(或“通道体检/快速通道检查”)* | **G1 干线** | 检查快速通道表是否有死通道、说法是否还能命中 | 执行 [`scripts/channel_audit.mjs`](../scripts/channel_audit.mjs) `--root .` | 输出通道数、死链清单、命中自检结果与触发词冲突清单 |
| **“手写图上屏”**<br>*(或“SVG 出图/精确栅格化”)* | **G1 干线** | 把手写 SVG 精确渲染为 PNG | 执行 [`scripts/generate_image.py`](../scripts/generate_image.py)（`--svg <文件.svg>`，内部走 [`scripts/svg2png.sh`](../scripts/svg2png.sh)） | 输出与设计尺寸一致的 PNG，保留原始排版与配色 |
| **“生成信息图 <主题>”**<br>*(或“出信息图/画信息图/画机制图”)* | **G1 干线** | **任何主题**的信息图或教学图：按教学图生成机制产出图片 | 读取 [`docs/diagram_generation_guide.md`](../docs/diagram_generation_guide.md) 选型 → 取料 → 绘 SVG → 执行 [`scripts/generate_image.py`](../scripts/generate_image.py) `--svg` 栅格化 → 登记指针 | 输出 SVG + PNG 两个文件路径与可点击入口；机制类信息图复用 [`assets/generated_images/gcm_gate_control_infographic.svg`](../assets/generated_images/gcm_gate_control_infographic.svg) 版式并更新为实测数据 |

---

## 🧩 二之一、快速通道注册规范 (Channel Registration Standard)

本节回答一个过去没人管的问题：**新增一条通道，怎样才算登记合格？** 通道表是快速通道的唯一权威源，
其余文件只允许写指针（例如 [`rules/workflow/component_naming.md`](../rules/workflow/component_naming.md) 只写"详见快速通道总表"），禁止复制通道内容。

### 1. 触发词规则

| 规则 | 要求 |
| :--- | :--- |
| 长度 | **≤ 12 个汉字**，一眼记住、张口能说（由通道审计器检查） |
| 唯一性 | 不得与既有通道重名，也不得一个名字包含另一个（如"门禁看板"与"看板"），否则说法会歧义 |
| 别名 | 允许挂 1~2 个同义说法，写法为"主触发词 + *(或"别名")*" |
| 命名偏好 | 动宾结构短语（"看看管控机制""生成信息图"），避免单字或纯名词 |
| 宽触发原则 | **高度相关的说法都应能命中**（如"帮我看一下管控机制"）；命中判定为主名称优先于别名，详见 §2 |

### 2. 执行契约（每条通道必须写清四件事，缺一不可）

1. **路由层级**：G0 高速 / G1 干线 / G2 支线 / G3 辅道；
2. **命中后做什么**：要跑的脚本或要读的文件——**必须写成 Markdown 链接**，不能只写一行反引号命令，
   否则通道无法被自动校验（这是"可点击、可校验"的硬要求）；
3. **输出什么**：交付物形态（看板 / 清单 / 图片 / 报告）；
4. **落地条件**：目标文件真实存在，由通道审计器自动核对。

### 3. 语义重叠的分工口径（用户已裁决：方案甲）

"门禁看板"与"看看管控机制"有重叠，**两条并存**，分工如下：

| 通道 | 定位 | 差别 |
| :--- | :--- | :--- |
| **门禁看板** | **只看门禁** | 只跑四道门禁判定，回答"现在能不能动手"，最轻最快 |
| **看看管控机制** | **看机制全貌** | 门禁 + 双检 + 存量校准 + 通道清单，回答"这套机制现在什么状态" |

> 因此"管控机制"这个说法归属"看看管控机制"（主名称优先），它不再作为"门禁看板"的别名。

### 4. 注册与退役流程

- **注册**：走 `rules/workflow/change_flow.md` 的"流程入驻四道审计" → 在本表新增一行（动作目标必须带链接）→ 登记 `docs/requirements.md`；
- **退役**：目标文件已不存在、或功能已被合并时，**必须删除该行**，禁止留死通道；
- **自检**：每次改动通道表后执行

```bash
node scripts/channel_audit.mjs --root .      # 通道审计：死链 / 说法能否命中 / 触发词冲突
node scripts/channel_audit.mjs --self-test   # 正反例自检，确认判定能力没被改坏
```

---

## 🧭 三、干道路由命中与收敛算法 (Arterial Convergence Algorithm)

1. **高权重干道直达 (Shortest Arterial Route)**：
   - 当用户指令明确命中 G0/G1 范畴时，智能体**仅走主干道**，严禁在 G2/G3 层级反复遍历盲读无关文件；
2. **渐进式支路下探 (Progressive Off-ramp)**：
   - 只有当任务涉及深度专业领域（如 Unity 开发、架构事务拆解）时，才从 G1 出口下探至 G2 专业支线；
3. **交付物必带交互入口 (Delivery-as-an-Entrypoint)**：
   - 无论走哪级路由，任务最终交付必须包含标准可点击直达入口，杜绝“交付无入口、查找靠翻找”。

---

## 🚦 四、双轨决策速查表 (Hard Line vs Fast Track)

| 意图与任务特征 | 难度分 | 路由通道 | 必走/豁免关键点 |
| :--- | :---: | :---: | :--- |
| **纯查询/参数读取/口令检索** | $\le 20$ 分 | **⚡ Fast Track** | 免改名、免 todo_write、免四维大表，直出结论 |
| **单文件文字微调/拼写修补** | $20\sim35$ 分 | **⚡ Fast Track** | 免重命名与独立测试脚本，`read` 读回自验即交付 |
| **规则新增/核心逻辑重大修改** | $40\sim70$ 分 | **🚨 Hard Line** | 首动改名、前置审查、风险评估卡、todo_write、测试门禁、升版 |
| **跨系统重构/代码研发/版本发布** | $> 70$ 分 | **🚨 Hard Line** | 严格十六步全工序闭环、自动化测试 100% 绿灯、三位一体强同步 |

