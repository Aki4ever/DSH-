---
name: match-intent-keywords
level: L2
description: 工序动作级技能：在全局 Skill Catalog 中执行倒排关键词与触发标签匹配，快速筛选初筛候选技能。
---

# Match Intent Keywords (意图触发词索引匹配)

## Overview

本技能是 L2 工序动作级工具技能。根据用户的核心意图词，在 `skill-catalog.json` 索引库中快速检索所有匹配的 Skill 候选集合。

## Usage & Script

```bash
python3 skills/match-intent-keywords/scripts/match_keywords.py --query "输出纯JSON"
```
