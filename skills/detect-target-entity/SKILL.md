---
name: detect-target-entity
level: L2
description: 工序动作级技能：单点物理提取语句中的核心操作实体（如JSON/文档/代码/文件）。
---

# Detect Target Entity (核心操作实体识别)

## Overview

本技能是 L2 工序动作级工具技能。用于意图分析步骤的深度解耦，专门负责实体目标判定。

## Usage & Script

```bash
python3 skills/detect-target-entity/scripts/detect_entity.py --text "生成纯JSON"
```
