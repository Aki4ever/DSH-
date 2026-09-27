# DSH 全局管家 (dsh-butler)

## 简介
DSH 全局主控管家，作为 DSH 统一调度中枢与执行层管理中心。统筹 Skill、Agent、CLI、API、MCP、插件等全量执行层；拥有最高操作权限；具备运行时动态创建与规约执行层能力。

## 目录结构
- `SKILL.md`: 管家智能体系统核心提示词与执行层路由规约。
- `scripts/create_rule_skill.py`: 管家动态创建格式规约 Skill 的自动化元编程工具。
- `references/`: 执行层分类与调用映射表。

## 核心能力
1. 统一路由与任务分派（Skill / Agent / CLI / API / MCP / Plugin）。
2. 动态造物：自动生成规范化 Skill，如固定字数限制、黑体、特定语种约束。
3. 质量门禁：交付前终审把关。
