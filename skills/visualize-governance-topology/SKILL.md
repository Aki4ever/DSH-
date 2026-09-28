---
name: visualize-governance-topology
level: L3
composition:
  - format-visual-inspection
  - extract-catalog-topology
  - render-governance-mermaid
description: 复合流程级技能(L3)：全景索引与管家调度链路可视化透视。基于物理数据源提取与图表编译，向用户直观呈现静态资产金字塔与动态管控调用轨迹。
---

# Visualize Governance Topology (管控拓扑可视化透视)

## Overview

Visualize Governance Topology 是管家的“自我透视之眼”。
将“查看”动作本身固化为具备 100% 物理确定性的技能，由底层 Python 提取与渲染脚本支撑，彻底杜绝凭空想象。

## Workflow

```mermaid
flowchart LR
    Cmd[触发可视化指令] --> Extract[extract-catalog-topology 物理读取 Catalog 数据]
    Extract --> Render[render-governance-mermaid 编译合规 Mermaid 源码]
    Render --> Format[format-visual-inspection 强制图表与卡片交付]
    Format --> Visual[交付直观全景看板与调度轨迹图]
```

## Boundaries

- 专职负责物理抽取与可视化图谱渲染，不修改原始 Catalog 配置。
