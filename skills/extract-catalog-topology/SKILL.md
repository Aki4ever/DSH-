---
name: extract-catalog-topology
level: L2
description: 工序动作级技能：物理读取全局 Catalog JSON 数据，提取全量技能节点与其加法依赖拓扑边。
---

# Extract Catalog Topology (提取编目依赖拓扑)

## Overview

本技能是 L2 工序动作级工具技能。负责真实读取本地数据源，解析出技能节点元数据与有向依赖树，为可视化提供物理真实的数据支撑。

## Usage & Script

```bash
python3 skills/extract-catalog-topology/scripts/extract_topology.py
```
