# DSH 插件与工具标准接口矩阵 (Tool & Plugin Interface Registry)

本文档将 DeepSeek Harness (DSH) 内置的所有系统工具、插件及后台能力抽象封装为统一的**标准函数接口形式**，作为全工程统一的工具契约与调用索引。

---

## 🧭 一、工具分类总览

| 分类 | 涵盖接口 | 核心定位 |
| :--- | :--- | :--- |
| **📁 文件操作类** | `read`, `write`, `edit`, `glob`, `grep`, `read_image` | 基础文件读写、正则匹配与多模态图片解析 |
| **⚡ 终端执行类** | `bash`, `job_list`, `job_output`, `job_kill` | Shell 指令执行与长耗时后台异步任务调度 |
| **🤖 智能协同类** | `subagent`, `subagent_fork`, `send_message`, `list_agents`, `interrupt_agent`, `workflow`, `ralph` | 多智能体协作、分支会话、大规模工作流调度 |
| **📋 规划治理类** | `todo_write`, `create_goal`, `get_goal`, `update_goal`, `ask_user_question` | 任务追踪、目标闭环与交互决策 |
| **🌐 扩展检索类** | `skill`, `web_search` | 技能加载与实时互联网搜索 |
| **🔌 宿主 RPC API** | `session.rename`, `session.history`, `session.create` 等 | 宿主基座与 Web GUI 深度联动接口 |

---

## 📁 二、文件操作类接口封装

### 1. `read(options)` - 文件按行读取
```typescript
interface ReadOptions {
  file_path: string; // 文件相对或绝对路径
  offset?: number;   // 1-based 起始行号，默认 1
  limit?: number;    // 最大返回行数，默认 2000
}
type ReadResult = string; // 带行号的纯文本内容
```
- **契约约束**：修改已有文件前必须先 read；禁止使用 cat 读文件。

### 2. `write(options)` - 文件全量写入/覆盖
```typescript
interface WriteOptions {
  file_path: string; // 目标路径
  content: string;   // 完整的 UTF-8 文本
  justification?: string;          // 提权申请理由（免审批下不传）
  sandbox_permissions?: string;    // 沙箱权限（免审批下不传）
}
type WriteResult = { file_path: string };
```
- **契约约束**：全量覆盖操作；已有文件优先用 `edit`，新建文件用 `write`。

### 3. `edit(options)` - 精准局部文本替换
```typescript
interface EditOptions {
  file_path: string;  // 待修改文件路径
  old_string: string; // 必须精确匹配的原文本
  new_string: string; // 替换后的新文本（传空字符串代表删除）
  replace_all?: boolean; // 是否替换全部匹配项，默认 false
}
type EditResult = { file_path: string };
```
- **契约约束**：必须在此前已 read 该文件；`old_string` 需独一无二。

### 4. `glob(options)` - 路径模式匹配
```typescript
interface GlobOptions {
  pattern: string; // 匹配模式，如 "*.ts" 或 "rules/**/*.md"
  path?: string;    // 起始路径，默认为工作区
}
type GlobResult = string[]; // 文件相对路径列表（按修改时间排序）
```
- **契约约束**：不匹配目录实体；无斜杠 pattern 会递归搜全树。

### 5. `grep(options)` - 内容正则高速检索
```typescript
interface GrepOptions {
  pattern: string;  // ripgrep 语法正则表达式
  path?: string;     // 检索路径
  include?: string; // 文件名过滤通配符，如 "*.{md,sh}"
}
type GrepResult = string; // 包含行号的匹配结果
```
- **契约约束**：禁止在 shell 中手工运行 grep/rg；支持大结果分页溢出。

### 6. `read_image(options)` - 多模态图片读取
```typescript
interface ReadImageOptions {
  file_path: string; // 图片本地路径 (PNG/JPEG/WebP/GIF)
}
type ReadImageResult = ImageAttachment; // 注入模型的视觉对象
```
- **契约约束**：需要模型开启多模态输入；禁止安装额外依赖生成缩略图。

---

## ⚡ 三、终端执行类接口封装

### 1. `bash(options)` - 命令行执行器
```typescript
interface BashOptions {
  command: string;      // 执行的 bash 命令
  description: string;  // 5~10 字符的简短动作描述 (UI 显示)
  workdir?: string;     // 工作目录，默认会话工作区
  timeoutMs?: number;   // 超时毫秒数
  run_in_background?: boolean; // 是否后台运行
}
type BashResult = string; // stdout + stderr 输出文本及 exit code 标记
```
- **契约约束**：环境间独立执行，变量与目录不跨调用残留；必须检查 `[exit code: 0]`。

### 2. `job_output(options)` / `job_kill(options)` - 后台任务管理
```typescript
interface JobOutputOptions {
  job_id: string;      // 后台任务 ID
  wait?: boolean;      // 是否阻塞等待完成
  timeout_ms?: number; // 最长等待毫秒
}
interface JobKillOptions {
  job_id: string;
  reason?: string;
}
```

---

## 🤖 四、智能协同类接口封装

### 1. `subagent(options)` - 独立轻量子智能体
```typescript
interface SubagentOptions {
  description: string; // 3~5 字任务描述
  prompt: string;      // 完整自包含的独立任务 Prompt（不继承父级上下文）
  run_in_background?: boolean; // 默认 true 异步运行
}
type SubagentResult = { agent_id: string };
```

### 2. `subagent_fork(options)` - 继承上下文子智能体
```typescript
interface SubagentForkOptions {
  description: string;
  prompt: string;      // 仅包含增量新指令（已继承父级所有完整历史轮次）
  run_in_background?: boolean;
}
```

### 3. `workflow(options)` - 大规模并发工作流调度
```typescript
interface WorkflowOptions {
  meta: {
    name: string;        // 规范 kebab-case 标识
    description: string; // 工作流描述
    phases?: Array<{ title: string; detail?: string }>;
  };
  script: string; // 纯 JavaScript 执行脚本 (支持 top-level await, agent, pipeline, parallel)
  args?: Record<string, unknown>;
}
```

### 4. `ralph(options)` - 迭代反思环路
```typescript
interface RalphOptions {
  objective: string;   // 终极不可变目标
  maxRounds?: number;  // 最大迭代轮数
}
```

---

## 📋 五、规划治理与长时任务接口封装

### 1. `todo_write(options)` - 结构化任务列表
```typescript
interface TodoItem {
  content: string; // 祈使句短句
  status: 'pending' | 'in_progress' | 'completed';
}
interface TodoWriteOptions {
  todos: TodoItem[]; // 全量替换的清单数组
}
```
- **契约约束**：全量替换；同一时刻至少保留一项处于 `in_progress`；完成一项立即更新一项。

### 2. `create_goal` / `get_goal` / `update_goal` - 跨轮次持久化目标
```typescript
interface GoalOptions {
  objective: string;
  max_goal_rounds?: number;
}
interface GoalUpdateOptions {
  goal_id: string;
  revision: number;
  action: 'edit' | 'pause' | 'resume' | 'complete' | 'blocked';
  blocked_reason?: string;
}
```

---

## 🔌 六、DSH 后台 RPC 接口封装

### 1. `session.rename` - 会话标题规范化锁定
```typescript
interface SessionRenamePayload {
  sessionId: string; // 会话 UUID (DSH_SESSION_ID)
  title: string;     // 必须符合 "[分类编号][难度分] 8字概述"
}
// 请求端点：POST $DSH_WEB_URL/api/session.rename
// 快捷封装：./scripts/rename_session.sh "新标题"
```
- **返回值**：`{ type: "server-response", result: { ok: true, value: { title, seq } } }`
- **调用时机**：新任务【定标】阶段第一时间必须触发。
