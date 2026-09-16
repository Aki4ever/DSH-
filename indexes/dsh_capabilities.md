# DSH 宿主系统能力体系索引 (DSH Capabilities Matrix)

本文档是 DeepSeek Harness (DSH) 宿主运行环境与基座能力的系统化全景图，旨在为智能体和开发者提供一站式的能力定位与技术机制索引。

---

## 🏗️ 一、系统全景架构

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

---

## ⚡ 二、核心能力维度与机制

### 1. 会话生命周期与投影机制 (Session & Projections)
- **多会话持久化**：会话历史存储于 `$DSH_HOME/sessions/.../session.jsonl.zstd`；
- **Title 投影与实时锁定**：
  - 客户端通过 `session/projection` 监听标题；
  - 智能体通过 RPC 调用 `session.rename` 可向 host 发送强一致的标题更新，即时同步至侧边栏。
- **Fork 会话分支**：支持基于历史指定 seq 创建无缝承接的子会话。

### 2. 沙箱隔离与安全基线 (Sandbox Policy)
- **沙箱模式**：
  - `danger-full-access`：完全访问模式，文件系统与 Bash 不受限，需智能体自律；
  - `workspace-write`：工作区受限写入；
  - `read-only`：只读安全模式。
- **免审批策略 (`Approval: never`)**：所有操作免弹窗静默放行，智能体自主守门，严禁破坏宿主外部路径。

### 3. 多模态视觉解析 (Multimodal Vision)
- **原生支持**：支持直接通过 `read_image` 传入本地 PNG/JPEG/WebP/GIF；
- **宿主放行配置**：宿主 `$DSH_HOME/settings.yaml` 必须包含 `input: [text, image]` 模态声明，工具链门禁即自动放行，无需冗余安装第三方图像转换库。

### 4. 智能编排与多智能体系统 (Multi-Agent Orchestration)
- **单轮独立委托 (`subagent`)**：干净隔离上下文，适用于独立外包研究与代码审查；
- **连贯分支委托 (`subagent_fork`)**：克隆当前完整对话历史，适用于延续性推理与专项深入；
- **大规模流水线 (`workflow`)**：原生 JS 脚本编排，提供 `pipeline`、`parallel`、`agent` 异步并发管道；
- **反思重试环路 (`ralph`)**：基于外部共享工作区的全新冷启动自主迭代循环。

---

## 🧭 三、快捷定位与指引

- **工具函数调用**：参见 [`indexes/tool_interfaces.md`](tool_interfaces.md)
- **规则检索入口**：参见 [`indexes/rules_index.md`](rules_index.md)
- **长期避坑经验**：参见 [`memory/lessons_learned.md`](../memory/lessons_learned.md)
