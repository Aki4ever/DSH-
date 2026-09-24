# CLI 索引

`skill-pool` 是 Skill池 仓库内置的轻量化管理与分发命令行工具，基于 Python 3 标准库开发，零第三方 pip 依赖。

## 快速导航
- 核心设计：[design.md](./design.md)
- 详细子命令：
  - [list](./commands/list.md)：列出仓库内技能与软链状态
  - [validate](./commands/validate.md)：校验技能规范合规性
  - [status](./commands/status.md)：查看状态统计概览
  - [init](./commands/init.md)：快速初始化新技能模版
  - [link](./commands/link.md)：将技能软链发布至运行环境
  - [unlink](./commands/unlink.md)：安全解除技能软链

## 入口脚本
- 执行路径：`bin/skill-pool`
- 运行前提：Python 3.8+
