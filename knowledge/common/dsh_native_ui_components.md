# DSH 宿主原生可视化组件与插槽体系法典 (Native Visual Components Specification)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.14.0`
> - **对应实施版本**：`v4.14.0`
> - **规范层级**：`【知识库总纲 · 通用公共规范】`（所有 DSH 客户端交互与组件扩展 100% 共享遵循）
> - **生效状态**：`[Release 稳定生效]`

本文档是 DeepSeek Harness (DSH) 官方 Web 客户端原生可视化组件体系与 React 插槽 (Slot) 拓扑的**权威基准法典与命名全集**，旨在为智能体和开发者提供一站式的客户端 UI 架构解构、组件命名清单、插槽挂载契约与二次扩展指引。

---

## 🏗️ 一、前端渲染架构与插槽驱动机制

DSH Web GUI 呈现层采用 **Cordis 微内核插件化架构** 与 **React Slot 动态插槽协议** 构建，彻底实现展示与状态解耦：

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DSH Client Runtime (前端运行时)                     │
│   ┌───────────────────────────┬───────────────────────────┬─────────────┐   │
│   │ Cordis Client Container   │  Session Projection Store │ SSE Realtime│   │
│   └───────────────────────────┴───────────────────────────┴─────────────┘   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 声明 (declare) / 注入 (inject) / 注册 (register)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                       React Slot System (动态插槽核心网络)                   │
│   Single (单实例独占)  │  Keyed (键控多态路由)  │  List (有序追加)  │  Chain (责任链) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 挂载具体 Occupants (组件占位者)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    DSH Native Visual Surfaces (原生可视化层)                 │
│   ┌─────────────────────┬─────────────────────┬─────────────────────────┐   │
│   │ 视口外壳与侧边栏    │ 双视图环 (Chat/轨迹)│ 对话流节点与工具原子卡片 │   │
│   ├─────────────────────┼─────────────────────┼─────────────────────────┤   │
│   │ 输入坞与长期目标卡  │ 抢占式审批/问答面板 │ 系统设置与插件管理模态   │   │
│   └─────────────────────┴─────────────────────┴─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1. 插槽的四种存在形态 (Slot Kinds)
- **`single`（单实例独占）**：一个插槽仅允许恰好一个组件填充（后注册者覆盖或由 priority 裁决，如 `conversation.session.header`）；
- **`keyed`（键控路由）**：按业务 Key 分发给不同的多态视图（如 `conversation.chat.node` 按节点类型 `user` / `assistant-step` / `tool-call` 分发）；
- **`list`（有序列表追加）**：多个插件可按 `order` 权重向同一个插槽追加组件并排平铺（如 `conversation.input.dock`）；
- **`chain`（拦截责任链）**：按条件接管容器渲染，未命中则击穿至下一个 Occupant（如 `conversation.composer` 的审批与提问接管）。

### 2. 状态投影驱动 (Projection-Driven)
所有原生组件**不直接发起侵入式远程 RPC 轮询**，而是作为纯消费端消费 Host 计算出的 `session/projection`（如 Goal 状态、Jobs 队列、Token 消耗度量），保证首屏瞬时恢复与跨标签页强一致。

---

## 🧭 二、原生可视化组件分类命名对照全集

根据 DSH Desktop 运行时（`@deepseek-ai/dsh-client-ui-*`）源码，官方原生可视化组件共划分为九大层级：

### 1. 视口外壳与主题层 (Layout & Theme Surfaces)
| 组件系统命名 | 英文标识 / 类名 | 所属包名 / 驱动插件 | 挂载插槽 (Slot Key) | 核心渲染功能与交互特性 |
| :--- | :--- | :--- | :--- | :--- |
| **三栏应用视口外壳** | `AppFrame` | `dsh-client-ui-layout` | `root` | 承载侧边栏、会话区、详情抽屉的三栏布局；带可拖拽命中条、侧栏 56px 折叠让步与详情栏自动收缩 |
| **原生主题呈现器** | `ThemeRenderer` | `dsh-client-ui-theme` | 系统层注入 | 驱动原生 UA 控件与主题 Token 映射（`html { color-scheme }`、`body[data-ds-dark-theme]`、`--dsw-*` 语义变量） |

### 2. 左侧导航与工作区层 (Sidebar Surfaces)
| 组件系统命名 | 英文标识 / 类名 | 所属包名 / 驱动插件 | 挂载插槽 (Slot Key) | 核心渲染功能与交互特性 |
| :--- | :--- | :--- | :--- | :--- |
| **侧边栏骨架容器** | `SidebarShell` | `dsh-client-ui-sidebar` | `sidebar` | 侧边栏外壳，持有折叠手柄、品牌行、顶部操作区、主体滚动区与底座设置区 |
| **官方品牌标识与名** | `BrandMark` / `BrandName` | `dsh-client-ui-brand-official` | `sidebar.brand.mark`<br>`sidebar.brand.name` | 官方 DeepSeek Harness 品牌 Logo 矢量图标与名称徽章（仅 official 构建生效） |
| **多工作区与会话多级树**| `WorkspaceBrowser` | `dsh-client-ui-workspace` | `sidebar.workspaces` | 多工作区管理、会话多级树形拓扑、实时搜索过滤、分组折叠、会话运行状态小圆点 |
| **目录浏览选择器** | `DirectoryPickerBrowse` | `dsh-client-ui-directory-picker-browse` | `sidebar.workspaces.directoryFlow` | 应用内弹窗式目录选择器，用于非系统原生或远程模式下的工作区添加 |
| **系统原生目录选择器**| `DirectoryPickerNative`| `dsh-client-ui-directory-picker-native`| `sidebar.workspaces.directoryFlow` | 纯无渲染触发器，唤起 OS 原生目录选择窗口（Finder / Explorer） |
| **侧边栏设置底座** | `SidebarSettingsTrigger` | `dsh-client-ui-settings-general` | `sidebar.settings` | 侧边栏底部固定设置齿轮按钮，点击唤起全局设置模态窗口 |

### 3. 会话主体与双视图环 (Conversation View Ring)
| 组件系统命名 | 英文标识 / 类名 | 所属包名 / 驱动插件 | 挂载插槽 (Slot Key) | 核心渲染功能与交互特性 |
| :--- | :--- | :--- | :--- | :--- |
| **会话根容器** | `ConversationRoot` | `dsh-client-ui-conversation` | `conversation` | 会话主体状态管理、空状态 (Hero) 与激活会话分发 |
| **对话流核心视图** | `ChatView` | `dsh-client-ui-conversation` | `conversation.view` (`id="chat"`) | 标准主对话流：按轮次 (Turn) 组织、步骤卡片折叠、打断隔离与平滑虚拟滚动 |
| **执行轨迹时序视图** | `TrajectoryView` | `dsh-client-ui-trajectory` | `conversation.view` (`id="trajectory"`) | 深度事件记录表与时序耗时全景图：含 Overview 时间轴（区分 TTFT 首字延迟与解码时间）、鼠标滚轮缩放、区间框选聚焦、微秒级 Token 消耗局部检查器 |

### 4. 对话流消息节点组件 (Chat Node Views)
所有节点注册挂载于 `conversation.chat.node` 键控插槽：

| 组件系统命名 | 英文标识 / 节点 Key | 所属包名 | 核心展示内容与交互形态 |
| :--- | :--- | :--- | :--- |
| **用户提问节点** | `UserMessageNodeView`<br>`key="user"` | `dsh-client-ui-conversation` | 用户原生输入气泡、代码与格式化文本、携带图片缩略图 |
| **动态干预节点** | `UserMessageNodeView`<br>`key="steering"` | `dsh-client-ui-conversation` | 在任务执行中途插入的即时引导与用户干预指示卡 |
| **系统上下文节点** | `ContextMessageNodeView`<br>`key="context"` | `dsh-client-ui-conversation` | 环境信息注入、初始上下文导入与系统状态告知卡 |
| **助手流式步骤卡** | `AssistantNodeView`<br>`key="assistant-step"` | `dsh-client-ui-conversation` | 助手思考过程折叠栏、流式 Markdown 正文排版、数学公式与代码块渲染 |
| **斜杠命令回显卡** | `CommandNodeView`<br>`key="command"` | `dsh-client-ui-conversation` | 客户端本地斜杠命令（如 `/model`、`/clear`）执行反馈 |
| **工具调用根节点** | `ToolCallTree`<br>`key="tool-call"` | `dsh-client-ui-tool` | 工具调用树形拓扑容器，支持原子展开、嵌套 Code Dispatch 与状态图标 |
| **工作流独立执行节点**| `WorkflowRunNodeView`<br>`key="workflow-run"` | `dsh-client-ui-workflow-run` | 独立工作流运行卡：多 Stage 流水线可视化、嵌套 Agent 展开、阶段状态追踪 |
| **上下文压缩摘要卡** | `CompactionNodeView`<br>`key="compaction"` | `dsh-client-ui-conversation` | 自动上下文截断与压缩卡片，记录压缩前后的 Token 节省与摘要 |
| **手动压缩记录卡** | `ManualCompactionNodeView`<br>`key="manual-compaction"` | `dsh-client-ui-conversation` | 开发者显式触发 `/compact` 产生的手动历史修剪卡片 |
| **模型重试告警卡** | `RetryNodeView`<br>`key="model-retry"` | `dsh-client-ui-conversation` | 遇到超时、速率受限时模型退避重试状态与倒计时警告 |
| **轮次错误中断卡** | `TurnErrorNodeView`<br>`key="turn-error"` | `dsh-client-ui-conversation` | 执行致命报错卡、异常堆栈高亮与快速恢复重试按钮 |
| **Token超限截断卡** | `TurnMaxTokensNodeView`<br>`key="turn-max-tokens"` | `dsh-client-ui-conversation` | 单轮输出达到模型上下文物理极限时的提示与断点续生成指引 |
| **轮次收尾交付条** | `TurnTailNodeView`<br>`key="turn-tail"` | `dsh-client-ui-conversation` | 轮次结束收尾栏，包含产出文件交付行与助手操作按钮组 |

### 5. 原子工具调用卡片体系 (Atomic Tool Views)
通过 `tool.call.toolview` 键控插槽分发，与具体的工具接口深度绑定：

| 组件系统命名 | 英文标识 / 视图 Key | 对应系统工具 | 核心视觉与交互设计 |
| :--- | :--- | :--- | :--- |
| **终端执行卡** | `TerminalCard` | `bash`, `pwsh` | 终端命令展示、退出码徽标（0为绿灯，非0为红灯）、执行耗时、ANSI 彩色终端输出流式刷新 |
| **文件读取卡** | `ReadCard` | `read` | 带有绝对/相对路径徽章、起始行号、折叠区间的代码高亮阅读器 |
| **差异对比卡** | `DiffCard` | `write`, `edit` | Unified Diff 双色对比视图（绿色加行、红色删行）、行号联动、变更代码即时比对 |
| **搜索匹配卡** | `SearchCard` | `grep`, `glob` | 正则检索与文件模式匹配列表、文件计数、命中行提取与关键词高亮 |
| **网页检索卡** | `WebCard` | `web_search` | 搜索 Query 关键词徽章、结构化网页摘要折叠、信源卡片与一键外链直达 |
| **待办清单卡** | `TodoCard` | `todo_write` | 待办项勾选状态徽章（pending灰/in_progress蓝/completed绿）、完成态自动横线划除 |
| **结构化提问卡** | `QuestionCard` | `ask_user_question` | 交互式问答卡片（单选/多选表单、提交按钮、用户交互历史回显） |
| **技能调用卡** | `SkillCard` | `skill` | 专用 Skill 图标徽章、技能名称、参数卡片与执行结果展示 |
| **Cordis插件卡** | `CordisCard` | `cordis_define` | 动态插件定义代码高亮卡片、实时运行/停止 (Run/Stop) 开关控件 |
| **通用工具兜底卡** | `GenericFallbackCard` | 未适配工具 | 通用平铺参数与结果 JSON 树状折叠展示 |

### 6. 右侧深度检查器抽屉 (Details Drawer Surface)
| 组件系统命名 | 英文标识 / 类名 | 所属包名 | 挂载插槽 (Slot Key) | 核心渲染功能与交互特性 |
| :--- | :--- | :--- | :--- | :--- |
| **详情抽屉容器** | `DetailsPanel` | `dsh-client-ui-conversation` | `details` | 页面右侧可滑出的深入检查抽屉，支持快捷关闭与浮动胶囊拖拽 |
| **工具全量深度检查器**| `ToolDetails` | `dsh-client-ui-tool` | `conversation.details.tool` | 为当前选中的工具调用提供全量参数、未截断完整日志、原始 JSON Payload 与堆栈追溯 |

### 7. 会话顶部操作与血缘层 (Session Header Surfaces)
| 组件系统命名 | 英文标识 / 类名 | 所属包名 | 挂载插槽 (Slot Key) | 核心渲染功能与交互特性 |
| :--- | :--- | :--- | :--- | :--- |
| **Subagent血缘导航条**| `LineageNav` | `dsh-client-ui-subagent` | `conversation.session.header.lineage` | 面向 Fork / Subagent 会话，渲染父子血缘面包屑，支持一键点击回溯父级主会话 |
| **后台任务弹层** | `JobsPopover` | `dsh-client-ui-jobs` | `conversation.session.header.actions` | 顶部菜单栏后台任务计数图标，点击展开当前会话存活的后台进程清单与 Kill 操作 |

### 8. 输入控制与上下文停靠坞 (Composer & Dock Surfaces)
| 组件系统命名 | 英文标识 / 类名 | 所属包名 | 挂载插槽 (Slot Key) | 核心渲染功能与交互特性 |
| :--- | :--- | :--- | :--- | :--- |
| **会话指标统计条** | `StatsLine` | `dsh-client-ui-conversation` | `conversation.composer.dock` | 置顶或底部的实时 Token 消耗计量、会话总轮次、耗时与窗口饱和度 |
| **任务待办条带** | `TodoPanel` | `dsh-client-ui-conversation` | `conversation.input.dock` (`order=0`) | 停靠在输入框上方的实时任务待办条，动态展示当前正在进行的步骤与剩余待办 |
| **长期自主目标条** | `GoalBar` | `dsh-client-ui-goal` | `conversation.input.dock` (`order=10`) | 呈现自主目标 Objective、轮次进度；提供 CAS 锁防护的 Edit/Pause/Resume/Clear 按钮 |
| **排队指示条** | `QueueBar` | `dsh-client-ui-conversation` | `conversation.input.dock` | 当模型忙碌时展示后续任务排队等待队列与插队控制 |
| **多模态附件工具栏** | `AttachmentBar` | `dsh-client-ui-attachment` | `conversation.input.attachments` | 输入框草稿图片缩略图横条、本地文件拖拽落点指示与一键移除按钮 |
| **图片原图灯箱** | `Lightbox` | `dsh-client-ui-attachment` | 全局挂载 | 点击聊天历史或草稿中的图片时唤起的全屏高保真原图查看器 |
| **规划模式徽章** | `PlanModeBadge` | `dsh-client-ui-plan` | `conversation.input.plan` | 切换与展示 Plan Mode 启用状态，控制仅规划不直接调工具 |
| **模型级联选择器** | `ModelSelector` | `dsh-client-ui-model-selection` | `conversation.input.model` | 两级联动下拉弹窗：选择 Provider/模型，并级联调节 Reasoning Effort（推理强度） |
| **智能触发联想菜单** | `InputTriggerMenu` | `dsh-client-ui-input-trigger` | 输入框内部光标路由 | 监听光标键入：`/` 唤起命令建议菜单，`@` 唤起文件/会话/智能体混合引用列表 |
| **沙箱权限选择器** | `PermissionSelector` | `dsh-client-ui-permission-presets`| 设置/输入区 | 切换沙箱运行权限（只读、工作区写入、完全放行），含高危权限确认弹窗 |

### 9. 抢占式全屏与输入接管交互 (Composer Takeover Surfaces)
挂载于 `conversation.composer` 插槽（具备高优先级阻断机制）：

| 组件系统命名 | 英文标识 / 类名 | 所属包名 | 优先级 / 触发条件 | 核心功能与交互形态 |
| :--- | :--- | :--- | :--- | :--- |
| **权限审批接管面板** | `ApprovalPanel` | `dsh-client-ui-conversation` | `priority=1` (需审批模式) | 当工具触发沙箱越界或高危操作且配置为需确认时，彻底接管输入框，呈现命令详情并等待用户批准/拒绝 |
| **交互提问接管面板** | `UserQuestionsView` | `dsh-client-ui-user-questions` | 工具发起 `ask_user_question` | 模型发起主动澄清时完全替换输入框，渲染单选/多选/表单回答控件，提交前锁定普通输入 |

### 10. 系统偏好设置模态中心 (Settings Surfaces)
通过 `settings.section` 与 `settings.plugins.tab` 扩展：

| 组件系统命名 | 英文标识 / 页面 Key | 所属包名 | 挂载分类 | 核心功能与交互形态 |
| :--- | :--- | :--- | :--- | :--- |
| **通用偏好设置页** | `SettingsGeneral` | `dsh-client-ui-settings-general` | `settings.section` (`general`) | 默认智能体 Preset 选择、新建会话默认权限预设、多语言与界面外观切换 |
| **模型服务商设置页** | `SettingsModels` | `dsh-client-ui-settings-models` | `settings.section` (`models`) | LLM 服务商清单、各通道心跳健康状态、API Key / Secret 脱敏编辑与保存卡片 |
| **插件列表只读页** | `PluginInventoryTab` | `dsh-client-ui-settings-plugin-inventory` | `settings.plugins.tab` (`all`) | Cordis 加载器已挂载插件只读名册、版本与依赖状态列表 |
| **宿主插件配置页** | `PluginConfigTab` | `dsh-client-ui-settings-plugins` | `settings.plugins.tab` (`configured`)| 用户可配置宿主插件卡片、就地配置项表单、重置回部署默认值入口 |

---

## 🛠️ 三、插槽扩展与自定义组件注入规范

若要在工程或自定义插件中向 DSH Web GUI 注入全新可视化卡片，必须遵循以下标准模式：

### 1. 扩展自定义工具视图 (Tool Card Registration)
```typescript
import { Context } from '@deepseek-ai/cordis';
import type { ToolCallOwnerProps } from '@deepseek-ai/dsh-client-ui-tool';

export function apply(ctx: Context) {
  // 注入到原子工具展示插槽
  ctx.slots.inject('tool.call.toolview', () =>
    ctx.slots.register({
      name: 'tool.call.toolview',
      key: 'my_custom_tool', // 绑定工具 wire tool 名称
    }, MyCustomToolCard)
  );
}

function MyCustomToolCard(props: ToolCallOwnerProps) {
  const { callId, toolName, block, openFile } = props;
  return (
    <div className="custom-tool-card rounded-lg p-3 bg-surface-2 border border-border-subtle">
      <div className="flex items-center gap-2 font-mono text-xs text-primary">
        <span>⚡ {toolName}</span>
        <span className="text-secondary">[{block.state}]</span>
      </div>
      <div className="mt-2 text-sm text-content">
        {/* 纯 Props 渲染，禁止直接发起网络请求 */}
        {JSON.stringify(block.input)}
      </div>
    </div>
  );
}
```

### 2. 扩展输入框顶部 Dock 控件
```typescript
ctx.slots.inject('conversation.input.dock', () =>
  ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'my_dock_badge',
    order: 15, // 处于 Todo(0) 与 Goal(10) 之后
  }, MyCustomDockBadge)
);
```

---

## 🛡️ 四、可视化交互与展示红线

1. **零 DOM 穿透原则**：
   - 所有 UI 组件必须由 Cordis 插槽系统或标准 Portal 托管，禁止直接通过原生 `document.getElementById` 强行篡改主界面 DOM 结构。
2. **纯 Props 确定性渲染**：
   - 原子卡片（`ToolCard`、`ChatNode`）必须是纯无副作用的 Presentation Components，渲染仅依赖传入的 Props 或 `useProjection` 快照，严禁在渲染周期内私自发起破坏性 RPC。
3. **路径相对化与安全防泄露**：
   - 面向用户的卡片路径展示，必须相对当前会话 `cwd` 进行缩短处理，并将宿主家目录安全替换为 `~`，杜绝系统敏感路径外泄。
4. **大文本截断保护**：
   - 终端日志（TerminalCard）与文件对比（DiffCard）必须设置虚拟滚动或首尾截断（默认行数阈值），防止万行级输出导致客户端渲染帧率骤降。

---

## ⚡ 五、智能体任务全生命周期原生组件 100% 装配契约

智能体在日常执行任务时，必须将 DSH 原生可视化能力嵌入到执行工序中：
1. **标题锁定**：执行复杂任务首发调用 `./scripts/rename_session.sh`，驱动 `sidebar.workspaces` 渲染 8 字标题；
2. **状态条带**：多步任务必须调用 `todo_write`，驱动 `conversation.input.dock` 实时渲染 `TodoPanel`；
3. **长期目标**：跨轮次持续推进目标调用 `create_goal` / `update_goal`，驱动 `GoalBar` 交互胶囊；
4. **原子卡片**：优先使用标准专用工具（`read`/`write`/`edit`/`bash`/`web_search`/`ask_user_question`），触发前端专用的原子卡片渲染；
5. **可点击产出**：收尾总结中使用 `` `path/to/file` `` 引用文件，驱动 `turnTail` 插件自动生成可点击跳转链接；
6. **视觉排版**：采用 Markdown 二级引用块（`> ### 📌 ...`）封装卡片，触发 DSH 宿主前端主题高亮色条。
