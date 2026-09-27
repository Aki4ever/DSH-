---
name: validate-header-triggers
level: L2
description: 工序动作级技能：静态校验 Skill 的 YAML Frontmatter 元数据与触发关键词覆盖度。
---

# Validate Header Triggers (头部触发元数据校验)

## Overview

本技能是 L2 工序动作级工具技能。解析 SKILL.md 头部，检验 `name`、`level`、`description` 字段的完整性与合规性。

## Usage & Script

```bash
python3 skills/validate-header-triggers/scripts/validate_header.py --file skills/schema-guard/SKILL.md
```
