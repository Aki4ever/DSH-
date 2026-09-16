# 全局规则与体系全景总索引 (Global Rules Index)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v1.5.0`
> - **对应实施版本**：`v1.5.0`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **最后更新日期**：2026-09-16
> - **版本状态**：`[Release 稳定生效]`

本文档是全局规则工程所有规则、流程、协议、知识库、外部生态与资产的**全局索引地图**。按层级与业务领域编目，方便快速定位与召回。

---

## 🧭 一、系统层级规则 (System Level)

| 文档路径 | 中文全称 | 核心作用与边界 |
| :--- | :--- | :--- |
| [`rules/system/meta_rules.md`](../rules/system/meta_rules.md) | **系统最高全局元规则** | 最高裁决效力：双向同步、智能去重、全中文通俗表达、联动排查、安全自律、双轨分流、知识库前置审查律、事务原子性律。 |
| [`rules/system/thinking_framework.md`](../rules/system/thinking_framework.md) | **搜索引擎逻辑映射思考框架** | 工业级搜索引擎六步映射（感知➔意图➔去重➔仲裁➔拦截➔闭环），规范 Agent 认知管道。 |
| [`rules/system/language_standard.md`](../rules/system/language_standard.md) | **全文档中文化与通俗表达标准** | 消除晦涩英文与黑话，坚持大白话与结构化表达。 |
| [`rules/system/initialization_protocol.md`](../rules/system/initialization_protocol.md) | **开箱自检与目录一键初始化协议** | 会话开启自检六步法、目录四件套自动化初始化机制。 |
| [`rules/security/security_baseline.md`](../rules/security/security_baseline.md) | **免审批安全基线与防破坏红线规约** | 绝对阻断的八大红线原语、写后读回校验机制与交付入口规范。 |

---

## 🔄 二、流程与协同规则 (Workflow Level)

| 文档路径 | 中文全称 | 核心作用与边界 |
| :--- | :--- | :--- |
| [`rules/workflow/task_execution_flow.md`](../rules/workflow/task_execution_flow.md) | **任务执行结构化流程与图形规范** | 快慢双轨分流、六大分类编号、100分制打分、8字标题、知识库前置审查与原子化收尾。 |
| [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md) | **实施版本号治理与全生命周期同步规范** | 语义化版本管理（SemVer）、需求-知识库-实施三位一体强同步铁律。 |
| [`rules/workflow/change_flow.md`](../rules/workflow/change_flow.md) | **规则与需求变更六步工作流** | 接收意图 ➔ 查重拦截 ➔ 登记台账 ➔ 编写规则 ➔ 联动排查 ➔ 提交推送。 |
| [`rules/workflow/audit_and_cleanup.md`](../rules/workflow/audit_and_cleanup.md) | **规则更新联动排查与存量治理规范** | 消除孤岛规则、过期死链清理、结构去重与版本历史治理细则。 |
| [`rules/workflow/component_naming.md`](../rules/workflow/component_naming.md) | **标准组件中文指代与命名体系** | 系统组件中文规范、架构统一指代与快速通道指引。 |

---

## 💻 三、编码与技术规范 (Coding Level)

| 文档路径 | 中文全称 | 核心作用与边界 |
| :--- | :--- | :--- |
| [`rules/coding/unity_project_standard.md`](../rules/coding/unity_project_standard.md) | **Unity 结构化工程目录与文件形式规范** | `_Project/` 根目录隔离、.meta 同生共死铁律、asmdef 模块解耦、C# 生命周期守则。 |
| [`rules/coding/atomicity_specification.md`](../rules/coding/atomicity_specification.md) | **系统操作与工程设计原子性事务规范** | 明确操作级原子性（双向同步/目录四件套/.meta）与设计级原子性（存档/交易/状态机）。 |

---

## 📚 四、核心知识库与业务法典 (Knowledge Base)

| 文档路径 | 中文全称 | 核心管理内容与约束 |
| :--- | :--- | :--- |
| [`knowledge/README.md`](../knowledge/README.md) | **核心知识库总索引与前置核验协议** | 知识库总览、前置冲突阻断卡点与强制核查工作流。 |
| [`knowledge/worldview_background.md`](../knowledge/worldview_background.md) | **世界观与故事背景知识库** | 源能以太法则、时代纪元、三大阵营架构、专有名词与叙事禁忌。 |
| [`knowledge/art_specification.md`](../knowledge/art_specification.md) | **游戏美术视觉与资产工程规范** | 半写实轻科幻风格、色彩矩阵、3D面数/骨骼预算、PBR材质通道与UI排版。 |
| [`knowledge/engineering_specification.md`](../knowledge/engineering_specification.md) | **软件技术与工程架构规范** | Unity LTS/URP基线、60FPS/DrawCall性能预算、MVVM解耦架构与零GC法则。 |

---

## 📂 五、台账、模板与工具指南 (Assets, Guides & Tools)

| 分类 | 文档/脚本路径 | 说明 |
| :--- | :--- | :--- |
| **需求台账** | [`docs/requirements.md`](../docs/requirements.md) | 唯一核心需求管理台账（REQ-001 ~ REQ-028 完整记录，总版本 `v1.5.0`） |
| **图表生成** | [`docs/diagram_generation_guide.md`](../docs/diagram_generation_guide.md) | 全场景流程图、信息图与教学图生成技术指南与标准模板库 |
| **教学指南** | [`docs/rules_tutorial.md`](../docs/rules_tutorial.md) | 规则体系运转教学图解与实操说明 |
| **记忆架构** | [`docs/memory_architecture.md`](../docs/memory_architecture.md) | AI 分层长短期记忆体系架构与工程落地规范 |
| **标准模板** | [`templates/requirement_template.md`](../templates/requirement_template.md) | 标准需求卡片录入模板（支持实施版本号） |
| **标准模板** | [`templates/directory_readme_template.md`](../templates/directory_readme_template.md) | 目录专属说明标准模板 |
| **标准模板** | [`templates/graphical_block_template.md`](../templates/graphical_block_template.md) | 原生图形化区块卡片组件标准模板 |
| **自动化脚本** | [`scripts/generate_image.py`](../scripts/generate_image.py) | 图形生成、自动保存与图显渲染脚本 |
| **自动化脚本** | [`scripts/rename_session.sh`](../scripts/rename_session.sh) | 会话一键重命名并锁定 RPC 脚本 |
| **自动化脚本** | [`scripts/init_dir.sh`](../scripts/init_dir.sh) | 新建目录自动化初始化四件套脚本 |

---

## 🧠 六、能力索引、生态扩展与记忆中枢 (Indexes, Ecosystem & Memory)

| 分类 | 路径 | 核心内容 |
| :--- | :--- | :--- |
| **外部生态** | [`indexes/extension_ecosystem.md`](extension_ecosystem.md) | DSH 外部可扩展能力生态与协议全景矩阵（MCP / Skill / CLI / API / Browser） |
| **快速通道** | [`indexes/shortcuts_index.md`](shortcuts_index.md) | 地图式高速干道路由导航与快速口令矩阵（G0~G3 四级权重） |
| **能力体系** | [`indexes/dsh_capabilities.md`](dsh_capabilities.md) | DSH 宿主基座全景能力架构图与运行机制 |
| **工具接口** | [`indexes/tool_interfaces.md`](tool_interfaces.md) | 全量系统工具与插件标准接口矩阵封装 |
| **长期记忆** | [`memory/context_memory.md`](../memory/context_memory.md) | 用户偏好、长期环境约定与核心参数沉淀 |
| **经验知识** | [`memory/lessons_learned.md`](../memory/lessons_learned.md) | 实战排查出的避坑指南与底层机制认知 |
| **效率审计** | [`memory/efficiency_audit_log.md`](../memory/efficiency_audit_log.md) | 思考决策与执行效率全景量化审计台账 (M1~M6六维指标) |
