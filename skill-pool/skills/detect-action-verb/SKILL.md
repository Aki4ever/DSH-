---
name: detect-action-verb
level: L2
description: 工序动作级技能：单点物理识别并提取语句中的指令动作动词（如创建/生成/校验/修改）。
---

# Detect Action Verb (指令动作动词识别)

## Overview

本技能是 L2 工序动作级工具技能。用于意图分析步骤的深度解耦，专门负责动作判定。

## Usage & Script

```bash
python3 skills/detect-action-verb/scripts/detect_verb.py --text "生成纯JSON"
```
