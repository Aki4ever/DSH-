---
name: measure-routing-metrics
level: L2
description: 工序动作级技能：物理测算索引匹配与路由检索的命中技能及执行耗时（毫秒级 ms），提供量化优化指标。
---

# Measure Routing Metrics (索引路由量化测算工具)

## Overview

本技能是 L2 工序动作级工具技能。利用独立 Python 脚本对给定的用户查询关键词进行 Catalog 索引检索，并物理测量精确耗时（毫秒级）。

## Usage & Script

```bash
python3 skills/measure-routing-metrics/scripts/measure_metrics.py --query "输出格式"
```
