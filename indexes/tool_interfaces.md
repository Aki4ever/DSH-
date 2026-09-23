# DSH 宿主工具与插件标准接口矩阵 (Tool & Plugin Interface Registry)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v3.5.0`
> - **对应实施版本**：`v3.5.0`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **最后更新日期**：2026-09-16
> - **版本状态**：`[Release 稳定生效]`

本文档是 DeepSeek Harness (DSH) 宿主内置工具与能力的**双层标准化接口法典**。每个工具均包含**外层索引卡（名称、描述、正向边界、反例约束）**与**内层实操手册（参数 Schema、执行代码、前端组件映射与异常防御）**，确保智能体秒级命中且执行精准无误。

---

## 📁 一、文件操作与检索类工具

### 1. `read` - 文件按行检阅
#### 🎯 外层索引卡
- **名称**：`read(options)`
- **核心描述**：读取指定 UTF-8 文件并按行号返回文本，支持分页偏移。
- **🟢 适用边界 (When to use)**：
  1. 查看源码、配置、文档正文与行号；
  2. 修改文件前的“先读后改”前置依循；
  3. 写操作完成后的“写后读回校验 (Read-Back)”。
- **🔴 反例约束 (When NOT to use)**：
  1. **严禁在 bash 中调用 `cat`、`head`、`tail` 替代 read**（会导致无法激活前端 `ReadCard` 高亮卡，且容易被输出截断）；
  2. 检索大范围内容或未知路径时，禁止逐个盲读，应优先使用 `grep` 或 `glob`；
  3. 二进制图片文件禁止使用 read，必须使用 `read_image`。

#### 🛠️ 内层实操手册
```typescript
interface ReadOptions {
  file_path: string; // 相对或绝对路径
  offset?: number;   // 1-based 起始行号，默认 1
  limit?: number;    // 最大返回行数，默认 2000
}
```
- **调用代码示例**：
  ```javascript
  read({ file_path: "rules/system/meta_rules.md", offset: 1, limit: 100 });
  ```
- **前端可视化映射**：在聊天流中激活 `tool.call.toolview` 键控的 **`ReadCard`**（带行号标尺、路径徽标与折叠高亮）。
- **异常防御**：若文件行数超过 2000 行，依据返回尾部的行数提示，递增 `offset` 继续读取下一页。

---

### 2. `edit` - 精准局部文本替换
#### 🎯 外层索引卡
- **名称**：`edit(options)`
- **核心描述**：基于严格匹配的 `old_string` 将目标文本替换为 `new_string`。
- **🟢 适用边界 (When to use)**：
  1. 修改已有代码函数、配置键值、更新文档局部段落；
  2. 单点删除文本（传 `new_string: ""`）；
  3. 绝大多数存量文件的精准更新首选。
- **🔴 反例约束 (When NOT to use)**：
  1. **禁止在未执行 `read` 之前直接发起 edit**（违背观察策略）；
  2. 新建文件时坚决不用 edit，必须使用 `write`；
  3. 若待替换文本在文件内多次出现且只想改其中一处，严禁盲目传 `replace_all: true`，必须提供更充分的上下文以确保 `old_string` 全局唯一。

#### 🛠️ 内层实操手册
```typescript
interface EditOptions {
  file_path: string;     // 目标文件路径
  old_string: string;    // 必须精确匹配的原文本（含缩进与换行）
  new_string: string;    // 替换后的文本
  replace_all?: boolean; // 是否全局替换所有匹配项，默认 false
}
```
- **调用代码示例**：
  ```javascript
  edit({
    file_path: "rules/workflow/versioning_standard.md",
    old_string: "- 当前版本：`v2.1.0`",
    new_string: "- 当前版本：`v2.2.0`"
  });
  ```
- **前端可视化映射**：激活 **`DiffCard`**（红删绿加 Unified Diff 双色比对卡）。
- **异常防御**：报错 `old_string was not found` 时，立即重新 `read` 目标文件周边 20 行，校准缩进与空格后再次重试。

---

### 3. `write` - 文件全量覆盖与全新创建
#### 🎯 外层索引卡
- **名称**：`write(options)`
- **核心描述**：全量创建新文件或完全覆盖已存在的文本文件。
- **🟢 适用边界 (When to use)**：
  1. 创建全新的规则、脚本、配置或代码文件；
  2. 文件需要发生根本性架构重写、无法通过局部 edit 增量达成时。
- **🔴 反例约束 (When NOT to use)**：
  1. **对存量成熟文件进行微调时严禁滥用 write**（会抹掉其他未修改上下文，且 DiffCard 呈现全红全绿无法做有效审查）；
  2. 禁止在没有提前 read 的情况下强行覆盖存量文件。

#### 🛠️ 内层实操手册
```typescript
interface WriteOptions {
  file_path: string; // 文件路径
  content: string;   // 完整的 UTF-8 文本
}
```
- **调用代码示例**：
  ```javascript
  write({
    file_path: "scripts/hello.sh",
    content: "#!/bin/bash\necho 'hello dsh'\n"
  });
  ```
- **前端可视化映射**：创建新文件激活 `DiffCard`（全绿新增卡），收尾由 `turnTail` 自动捕获为可点击产出物。

---

### 4. `grep` & `glob` - 正则内容与路径模式检索
#### 🎯 外层索引卡
- **名称**：`grep(options)` / `glob(options)`
- **核心描述**：`grep` 基于 ripgrep 正则扫描文件内容；`glob` 基于通配符检索文件路径列表。
- **🟢 适用边界 (When to use)**：
  1. 定位函数定义、关键词引用、报错信息位置（用 `grep`）；
  2. 探测工程目录拓扑、发现某后缀文件集（用 `glob`）。
- **🔴 反例约束 (When NOT to use)**：
  1. **严禁在 bash 中调用 `find` 或 `grep -rn`**（无法享受 DSH 前端高亮与溢出分页管理）；
  2. `glob` 不枚举目录实体本身，pattern 无 `/` 时默认递归全树。

#### 🛠️ 内层实操手册
- **调用代码示例**：
  ```javascript
  grep({ pattern: "v2.2.0", include: "*.md" });
  glob({ pattern: "rules/**/*.md" });
  ```
- **前端可视化映射**：激活 **`SearchCard`**（高亮关键词与文件名聚合列表）。

---

## ⚡ 二、系统终端与任务控制类工具

### 1. `bash` - 终端指令执行
#### 🎯 外层索引卡
- **名称**：`bash(options)`
- **核心描述**：在新鲜独立子 Shell 中执行系统 Bash 指令并返回退出码与输出。
- **🟢 适用边界 (When to use)**：
  1. 运行自动化测试脚本（如 `./scripts/disk_check_and_cleanup.sh`）；
  2. 执行 Git 提交流程、编译构建、系统环境指标查询。
- **🔴 反例约束 (When NOT to use)**：
  1. **严禁调用破坏性指令**（如 `rm -rf /`、清空根目录）；
  2. 严禁使用 bash 执行 `cat` 读文件或 `echo >` 写文件，必须使用原生 `read`/`write`；
  3. 各调用环境无状态共享，禁止通过 `cd` 期望影响下一次调用（改用 `workdir` 参数）。

#### 🛠️ 内层实操手册
```typescript
interface BashOptions {
  command: string;          // 待执行 bash 指令
  description: string;      // 必须使用纯中文规范动宾短语（呈现在 UI 终端卡片标题，严禁英文）
  workdir?: string;         // 工作目录
  run_in_background?: boolean; // 是否后台运行
  timeoutMs?: number;       // 超时毫秒数
}
```
- **调用代码示例**：
  ```javascript
  bash({
    command: "./scripts/disk_check_and_cleanup.sh --check",
    description: "检测宿主磁盘空间与健康水位"
  });
  ```
- **前端可视化映射**：激活 **`TerminalCard`**（带退出码绿灯/红灯、ANSI 语法着色流）。

---

### 2. `job_list`, `job_output`, `job_kill` - 异步长耗时后台任务管控
#### 🎯 外层索引卡
- **核心描述**：管理 `run_in_background: true` 启动的异步进程，支持读取增量与主动终止。
- **🟢 适用边界**：服务监听、长耗时测试、实时日志追踪。
- **🔴 反例约束**：轻量同步命令严禁打入后台导致上下文割裂；结项前必须收集或清理存活 Job。

---

## 🤖 三、多智能体协同与高级编排工具

### 1. `subagent` - 独立单轮沙箱委托
#### 🎯 外层索引卡
- **核心描述**：启动纯净无污染独立上下文子智能体，执行封闭性任务并返回最终结论。
- **🟢 适用边界**：独立文件重构审查、外部独立技术方案调研、跨模块代码审计。
- **🔴 反例约束**：需要继承当前会话长篇历史讨论的场景严禁使用 subagent（改用 `subagent_fork`）。

### 2. `subagent_fork` - 上下文克隆分支委托
#### 🎯 外层索引卡
- **核心描述**：克隆当前主会话的完整历史状态启动子智能体，继续执行深度延续推演。
- **🟢 适用边界**：复杂技术决策对比、长上下文排错、针对现有思路的多方案分叉探索。
- **🔴 反例约束**：简单无状态的小任务禁止滥用 fork，避免浪费模型上下文。

### 3. `workflow` - 高并发 JavaScript 流水线编排
#### 🎯 外层索引卡
- **核心描述**：通过原生 JS 脚本编排，利用 `pipeline`、`parallel`、`agent` 接口执行大规模并发任务。
- **🟢 适用边界**：全库数十个文件的批量语法巡检、多角度对抗性评审。
- **🔴 反例约束**：一两个简单任务禁止使用 workflow，改用普通调用。

---

## 📋 四、流程治理与交互决策类工具

### 1. `todo_write` - 任务实时步骤条维护
#### 🎯 外层索引卡
- **核心描述**：维护当前会话的结构化待办清单，驱动前端输入坞实时渲染 `TodoPanel`。
- **🟢 适用边界**：所有 Hard Line 复杂任务、多步骤工程落地任务。
- **🔴 反例约束**：单步直出的极简查询任务免调；更新时必须发送完整全量清单（覆盖式更新）。

#### 🛠️ 内层实操手册
```typescript
interface TodoItem {
  content: string; // 简明动宾任务描述
  status: "pending" | "in_progress" | "completed";
}
```
- **前端可视化映射**：激活 **`TodoPanel`**（置顶在输入坞上方的动态步骤条带，order 0）。

---

### 2. `create_goal`, `get_goal`, `update_goal` - 长期自主目标胶囊
#### 🎯 外层索引卡
- **核心描述**：管理跨多轮次持续演进的长生命周期任务目标，驱动前端渲染 `GoalBar`。
- **🟢 适用边界**：跨多个问答轮次的长篇系统性重构、自愈演进任务。
- **🔴 反例约束**：日常单轮次交互禁止创建 goal。

---

### 3. `ask_user_question` - 结构化用户交互提问
#### 🎯 外层索引卡
- **核心描述**：发起多项选择或表单式主动澄清，彻底抢占前端普通输入框。
- **🟢 适用边界**：遇到重大技术路线二选一、破坏性操作前置确认、需求关键信息缺失。
- **🔴 反例约束**：模型能自主推断或技术已有定论的事项，严禁过度打扰用户提问。
- **前端可视化映射**：激活 **`UserQuestionsView`**（接管输入框并渲染单选/多选/表单卡片）。

---

### 4. `skill` - 动态专家技能按需挂载
#### 🎯 外层索引卡
- **核心描述**：从宿主技能库加载具体命名技能的完整操作指引。
- **🟢 适用边界**：处理专有领域任务（如 Unity 项目规范检测、特定业务协议生成）时按需加载。
- **🔴 反例约束**：禁止在无对应技能或通用文本处理时盲目调用。
- **前端可视化映射**：激活 **`SkillCard`**。

---

### 5. `web_search` - 互联网高时效检索
#### 🎯 外层索引卡
- **核心描述**：检索外部实时互联网信息，返回结构化摘要与信源外链。
- **🟢 适用边界**：查询最新三方库版本、API 变更、外部突发时效性知识。
- **🔴 反例约束**：本地已存在的规则、知识库与工程文件，绝对禁止舍近求远调用 web_search。
- **前端可视化映射**：激活 **`WebCard`**。
