---
name: generate-fastpath-route
level: L2
description: 工序动作级技能：接收 Skill ID，秒级提取并返回其直达运行命令、级别属性与原子依赖链。
---

# Generate Fastpath Route (生成原子快捷路由)

## Overview

本技能是 L2 工序动作级工具技能。根据输入的 Skill 标识，快速定位其物理实现并生成可直接执行的命令，为管家实现毫秒级触达。

## Usage & Script

```bash
python3 skills/generate-fastpath-route/scripts/fastpath_route.py --skill-id verify-file-exists
```
