---
name: detect-rule-conflicts
level: L2
description: 工序动作级技能：检测规则集中的排他性冲突（如语种互斥、长度上下限倒挂、格式互斥）。
---

# Detect Rule Conflicts (规则互斥冲突检测)

## Overview

本技能是 L2 工序动作级工具技能。根据内置的排他模式字典，自动化审查传入的一组规则中是否存在逻辑矛盾。

## Usage & Script

```bash
python3 skills/detect-rule-conflicts/scripts/detect_conflicts.py --rules "必须纯中文" "必须英文输出"
```
