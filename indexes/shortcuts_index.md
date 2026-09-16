# 快速通道指令路由与地图式高速干道导航索引 (Arterial Routing & Quick Shortcuts Matrix)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v1.4.0`
> - **对应实施版本**：`v1.4.0`
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
| **“生成图片 <描述>”** | **G1 干线** | 驱动图形管道创作图片 | 执行 `scripts/generate_image.py` | 自动生图，输出 `![描述](路径)` 并附带可点击打开链接 |
| **“快速体检”** | **G1 干线** | 执行工程健康度巡检 | 执行 `./scripts/rename_session.sh` 并巡检 Git | 输出工作区与版本对齐报告，提供 Git 状态回执 |

---

## 🧭 三、干道路由命中与收敛算法 (Arterial Convergence Algorithm)

1. **高权重干道直达 (Shortest Arterial Route)**：
   - 当用户指令明确命中 G0/G1 范畴时，智能体**仅走主干道**，严禁在 G2/G3 层级反复遍历盲读无关文件；
2. **渐进式支路下探 (Progressive Off-ramp)**：
   - 只有当任务涉及深度专业领域（如 Unity 开发、架构事务拆解）时，才从 G1 出口下探至 G2 专业支线；
3. **交付物必带交互入口 (Delivery-as-an-Entrypoint)**：
   - 无论走哪级路由，任务最终交付必须包含标准可点击直达入口，杜绝“交付无入口、查找靠翻找”。
