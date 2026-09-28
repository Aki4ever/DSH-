---
name: search-duplicate-rules
level: L2
description: 工序动作级技能：计算两条或多条文本规则之间的词频重叠度，精准定位重复与高冗余规则。
---

# Find Duplicate Rules (重复与冗余规则检测)

## Overview

本技能是 L2 工序动作级工具技能。用于自动化排查多个 Skill 或多条指令之间是否存在冗余重叠。

## Usage & Script

```bash
python3 skills/search-duplicate-rules/scripts/find_duplicates.py --rules "规则1" "规则2"
```
