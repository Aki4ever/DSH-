---
name: render-governance-mermaid
level: L2
description: 工序动作级技能：将拓扑数据物理编译为合规的 Mermaid 语法代码，支持调度链路图与全景拓扑图渲染。
---

# Render Governance Mermaid (Mermaid 拓扑图谱渲染)

## Overview

本技能是 L2 工序动作级工具技能。根据输入的拓扑数据或预设的管控流转状态机，自动化编译输出合规、无语法错误的 Mermaid 文本源码。

## Usage & Script

```bash
# 渲染管家端到端调度链路图
python3 skills/render-governance-mermaid/scripts/render_mermaid.py --mode dispatch

# 渲染全景金字塔拓扑图
python3 skills/render-governance-mermaid/scripts/render_mermaid.py --mode landscape
```
