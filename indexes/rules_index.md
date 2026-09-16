# 全局规则与体系全景总索引 (Global Rules Index)

本文档是全局规则工程所有规则、流程、协议与资产的**全局索引地图**。按层级与业务领域编目，方便快速定位与召回。

---

## 🧭 一、系统层级规则 (System Level)

| 文档路径 | 中文全称 | 核心作用与边界 |
| :--- | :--- | :--- |
| [`rules/system/meta_rules.md`](../rules/system/meta_rules.md) | **系统最高全局元规则** | 最高裁决效力：双向同步、智能去重、全中文通俗表达、联动排查、安全自律、双轨分流与优先级仲裁。 |
| [`rules/system/thinking_framework.md`](../rules/system/thinking_framework.md) | **搜索引擎逻辑映射思考框架** | 工业级搜索引擎六步映射（感知➔意图➔去重➔仲裁➔拦截➔闭环），规范 Agent 认知管道。 |
| [`rules/system/language_standard.md`](../rules/system/language_standard.md) | **全文档中文化与通俗表达标准** | 消除晦涩英文与黑话，坚持大白话与结构化表达。 |
| [`rules/system/initialization_protocol.md`](../rules/system/initialization_protocol.md) | **开箱自检与目录一键初始化协议** | 会话开启自检六步法、目录四件套自动化初始化机制。 |

---

## 🔄 二、流程与协同规则 (Workflow Level)

| 文档路径 | 中文全称 | 核心作用与边界 |
| :--- | :--- | :--- |
| [`rules/workflow/task_execution_flow.md`](../rules/workflow/task_execution_flow.md) | **任务执行结构化流程与图形规范** | 快慢双轨分流（≤35分轻量流 ｜ >35分标准完备六步流）、六大分类编号、100分制打分、8字标题与吸顶组件。 |
| [`rules/workflow/change_flow.md`](../rules/workflow/change_flow.md) | **规则与需求变更六步工作流** | 接收意图 ➔ 查重拦截 ➔ 登记台账 ➔ 编写规则 ➔ 联动排查 ➔ 提交推送。 |
| [`rules/workflow/audit_and_cleanup.md`](../rules/workflow/audit_and_cleanup.md) | **规则更新联动排查与存量治理规范** | 消除孤岛规则、过期死链清理、结构去重与版本历史治理细则。 |
| [`rules/workflow/component_naming.md`](../rules/workflow/component_naming.md) | **标准组件中文指代与命名体系** | 系统组件中文规范与下层架构统一指代。 |

---

## 📂 三、台账、模板与工具脚本 (Assets & Tools)

| 分类 | 文档/脚本路径 | 说明 |
| :--- | :--- | :--- |
| **需求台账** | [`docs/requirements.md`](../docs/requirements.md) | 唯一核心需求管理台账（REQ-001 ~ REQ-015 完整记录） |
| **教学指南** | [`docs/rules_tutorial.md`](../docs/rules_tutorial.md) | 规则体系运转教学图解与实操说明 |
| **标准模板** | [`templates/requirement_template.md`](../templates/requirement_template.md) | 标准需求卡片录入模板 |
| **标准模板** | [`templates/directory_readme_template.md`](../templates/directory_readme_template.md) | 目录专属说明标准模板 |
| **自动化脚本** | [`scripts/rename_session.sh`](../scripts/rename_session.sh) | 会话一键重命名并锁定 RPC 脚本 |
| **自动化脚本** | [`scripts/init_dir.sh`](../scripts/init_dir.sh) | 新建目录自动化初始化四件套脚本 |

---

## 🧠 四、能力索引与记忆中枢 (Indexes & Memory)

| 分类 | 路径 | 核心内容 |
| :--- | :--- | :--- |
| **能力体系** | [`indexes/dsh_capabilities.md`](dsh_capabilities.md) | DSH 宿主基座全景能力架构图与运行机制 |
| **工具接口** | [`indexes/tool_interfaces.md`](tool_interfaces.md) | 全量系统工具与插件标准接口矩阵封装 |
| **长期记忆** | [`memory/context_memory.md`](../memory/context_memory.md) | 用户偏好、长期环境约定与核心参数沉淀 |
| **经验知识** | [`memory/lessons_learned.md`](../memory/lessons_learned.md) | 实战排查出的避坑指南与底层机制认知 |
