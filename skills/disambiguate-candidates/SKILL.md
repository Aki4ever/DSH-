---
name: disambiguate-candidates
level: L2
description: 工序动作级技能：消除候选技能间的调用歧义，根据权重与上下文确定单一首选或互补协同组合。
---

# Disambiguate Candidates (候选技能消歧与精选)

## Overview

本技能是 L2 工序动作级工具技能。在初筛命中多个 Skill 时，负责评估打分，过滤掉被包含的次级冗余项，输出最终无歧义的执行链路。

## Usage & Script

```bash
python3 skills/disambiguate-candidates/scripts/disambiguate.py --candidates-json '[{"id":"a","score":10},{"id":"b","score":5}]'
```
