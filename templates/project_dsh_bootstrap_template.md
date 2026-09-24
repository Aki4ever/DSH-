# 项目 DSH 赋能规划卡标准模板 (Project DSH Bootstrap Template)

> ### 🏷️ **版本信息与实施追踪**
> - **当前模板版本**：`v4.10.0`
> - **实施版本**：`v4.10.0`
> - **遵循规范**：[`rules/system/meta_rules.md`](../rules/system/meta_rules.md) 第十八条

在任何新项目（业务工具、Web 前端、后端服务、游戏工程、自动化脚本集）立项或规划阶段，智能体与开发人员**必须输出此卡片**，强制评估并至少集成 1 项 DSH 宿主基座能力。

---

## 📋 标准卡片模板 (复制使用)

```markdown
> ### 🚀 **新项目 DSH 赋能规划卡** `[ 项目名称 / 模块代号 ]`
> ────────────────────────────────────────────────────────────
> - 📌 **项目业务定位**：[一句话说明项目核心业务与交付目标]
> - 🌲 **选用的 DSH 宿主能力维度 (必须至少勾选 1 项)**：
>   - [ ] **1. CLI 命令行与终端基座**：将核心功能封装为 CLI，支持通过 bash/pwsh 标准化调用与后台 Jobs 异步监听
>   - [ ] **2. MCP 开放协议 Server**：构建或挂载标准 MCP Server (stdio/SSE)，对外暴露 Tools、Resources 与 Prompts
>   - [ ] **3. 宿主 API / RPC 网关联动**：调用 DSH 宿主 RPC (session.rename, session.fork, workspaces.openPath, settings)
>   - [ ] **4. Cordis 插件与 Web 插槽**：挂载为 Cordis 插件，向 Web GUI (Chat Node / Tool View / Input Dock) 注入原生卡片
>   - [ ] **5. 多智能体协同工作流**：使用 subagent 独立沙箱、subagent_fork 分支或 workflow JS 并发流水线
>   - [ ] **6. 动态 Agent Skill 技能包**：封装为标准 SKILL.md 技能清单，支持智能体运行时按需动态加载
> - 🔌 **具体集成与落地方式**：
>   - 接口契约：[如提供 `my-cli run --json` 或 MCP Tool `analyze_data`]
>   - 数据流转：[说明输入与输出如何与 DSH 会话/上下文无缝对接]
>   - 原生可视化呈现：[说明在 DSH Web GUI 激活哪类原生组件，如 DiffCard / TerminalCard]
> - 📈 **预期效能增益**：[说明相比孤立开发节省的开发、测试、运维与交互成本]
```

---

## 🛡️ 审查门禁与反例约束

1. **零集成阻断**：若新项目未勾选任何 DSH 能力且未做合理性说明，在【定标】阶段立即阻断；
2. **拒绝表面集成**：所勾选的 DSH 能力必须具备真实可调用的代码/接口或可执行路径，严禁空挂虚名；
3. **能力反例前置**：在规划接入 DSH 能力时，必须核对该能力的“适用边界”与“反例约束”，杜绝技术选型错位。
