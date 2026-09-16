# 快速通道快捷词汇与指令路由索引 (Quick Shortcuts Matrix)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v1.1.0`
> - **对应实施版本**：`v1.1.0`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **最后更新日期**：2026-09-16
> - **版本状态**：`[Release 稳定生效]`

本文档是系统针对高频日常操作定制的**快速通道快捷词汇与响应路由字典**。用户只需输入日常大白话快捷口令，智能体即可命中规则并直接输出标准化权威内容，无需冗长多轮问答。

---

## 🚀 一、核心快速通道口令与路由映射表

| 用户输入快捷词汇 (示例) | 核心命中意图 | 标准响应动作与数据源 | 输出内容要点与交付形式 |
| :--- | :--- | :--- | :--- |
| **“看看当前dsh体系能力”**<br>*(或“dsh能力体系”、“系统能力全景”)* | 召回 DSH 宿主基座全景能力架构 | 读取 [`indexes/dsh_capabilities.md`](dsh_capabilities.md) | 输出三层架构全景图（Web GUI ➔ Runtime Host ➔ Execution Core）及四大核心维度（会话与投影、沙箱安全、多模态、多智能体）深度解析 |
| **“查看规则全景”**<br>*(或“规则索引”、“有哪些规则”)* | 召回所有规则与规范总目录 | 读取 [`indexes/rules_index.md`](rules_index.md) | 输出系统级元规则、流程规则、编码规范、知识库与工具脚本全景表格 |
| **“查看知识库”**<br>*(或“知识库”、“查世界观/美术/工程”)* | 检阅产品世界观、美术与工程标准 | 读取 [`knowledge/README.md`](../knowledge/README.md) | 输出知识库总览、前置冲突阻断卡点协议，以及世界观/美术/工程规范入口 |
| **“unity规范”**<br>*(或“unity工程规范”、“unity代码规范”)* | 查阅 Unity 目录与代码规范 | 读取 [`rules/coding/unity_project_standard.md`](../rules/coding/unity_project_standard.md) | 输出 Unity 标准工程目录树、.meta 同生共死铁律、asmdef 解耦与生命周期规约 |
| **“原子性规范”**<br>*(或“哪些操作要做成原子性的”)* | 查阅操作与设计原子性清单 | 读取 [`rules/coding/atomicity_specification.md`](../rules/coding/atomicity_specification.md) | 输出操作级原子性（双向同步/目录四件套/.meta成对）与设计级原子性（存档/交易/状态机）清单 |
| **“避坑经验”**<br>*(或“长期避坑指南”)* | 查阅历史排查沉淀的避坑指南 | 读取 [`memory/lessons_learned.md`](../memory/lessons_learned.md) | 输出转义字符避坑、会话锁定、沙箱策略与底层关键认知 |
| **“快速体检”**<br>*(或“系统自检”)* | 执行工程完整性自检 | 执行 `./scripts/rename_session.sh` 并巡检 Git 状态 | 输出当前工作区状态、版本号对齐情况与健康度检查报告 |

---

## ⚡ 二、快速通道执行示范：输入“看看当前dsh体系能力”

当智能体收到包含“**看看当前dsh体系能力**”的指令时，必须按照以下标准骨架立刻输出结构化全景：

```text
┌───────────────────────────────────────────────────────────────┐
│                 DSH Web GUI (客户端呈现层)                      │
│       - 侧边栏任务栏 (Session Projections / Title 投影)         │
│       - 视口自适应渲染 (Sticky 视口置顶 / 主题 CSS 变量)         │
│       - 实时双向流 (SSE mux / events.host / events.mux)        │
└──────────────────────────────┬────────────────────────────────┘
                               │ HTTP / SSE / JSON RPC
┌──────────────────────────────▼────────────────────────────────┐
│               DSH Runtime Host (宿主执行层)                    │
│   ┌─────────────────────┬─────────────────┬───────────────┐   │
│   │   ApiProxy 路由网关  │   会话持久化引擎 │   沙箱安全网关 │   │
│   │   (Fetch Handler)   │   (JSONL.zstd)  │   (Sandbox)   │   │
│   └─────────────────────┴─────────────────┴───────────────┘   │
└──────────────────────────────┬────────────────────────────────┘
                               │ 工具调度与进程隔离
┌──────────────────────────────▼────────────────────────────────┐
│               执行引擎与能力底座 (Execution Core)               │
│   - 文件读写与正则检索 (read, write, edit, glob, grep)         │
│   - 命令行与多模态视觉 (bash, read_image)                      │
│   - 协同编排 (subagent, subagent_fork, workflow, ralph)       │
│   - 任务目标治理 (todo_write, goal 系统)                       │
└───────────────────────────────────────────────────────────────┘
```

### 核心能力维度具体说明：
1. **会话生命周期与投影机制 (Session & Projections)**：
   - 多会话通过 `JSONL.zstd` 持久化；
   - 智能体通过 HTTP RPC `session.rename` 可向 host 实时锁定侧边栏标题。
2. **沙箱隔离与安全基线 (Sandbox Policy)**：
   - 具备 `danger-full-access` 完全模式与 `workspace-write` 受限模式；
   - 本环境支持免审批自律运行（`Approval: never`），自主遵循安全红线。
3. **多模态视觉解析 (Multimodal Vision)**：
   - 原生支持 `read_image` 读图分析，由宿主 `input: [text, image]` 自动放行。
4. **多智能体编排生态 (Multi-Agent Ecosystem)**：
   - `subagent`（单轮独立沙箱）、`subagent_fork`（继承上下文深入）、`workflow`（JS脚本高并发流水线）、`ralph`（冷启动新鲜智能体自愈环路）。

---

## 🛠️ 三、快速通道命中与响应准则

1. **零冗余问答**：一旦用户输入命中上述任一关键词，智能体无需再次反问确认，应直接给出完整结构化交付内容；
2. **轻量管道分流**：纯快速通道查询任务属于“探 ➔ 攻 ➔ 归”极简流程（难度打分 ≤ 35 分），快速响应，绝不进行不必要的长流程空转。
