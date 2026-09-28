---
name: extract-core-objective
level: L2
description: 工序动作级技能：提取自然语言语句中的核心动宾主干与关键实体目标，输出标准化结构。
---

# Extract Core Objective (核心动宾目标提取)

## Overview

本技能是 L2 工序动作级工具技能。利用正则与关键词模式，从去除噪音后的文本中快速提取动作词（Action）与目标实体（Target）。

## Usage & Script

```bash
python3 skills/extract-core-objective/scripts/extract_objective.py --text "请帮我把输出转换成纯JSON"
```
