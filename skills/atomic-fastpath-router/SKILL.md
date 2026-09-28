---
name: atomic-fastpath-router
level: L3
composition:
  - fastpath-dispatch-guide
  - generate-fastpath-route
description: 复合流程级技能(L3)：原子级快捷路由总控。当索引命中目标技能后，提供直达原子动作的Shell执行命令与依赖指引，实现毫秒级触达。
---

# Atomic Fastpath Router (原子级快捷路由总控)

## Overview

本技能是 L3 复合流程级技能。打通“索引检索”到“底层动作直调”的最后一公里，使管家能够秒级获取目标技能的直调命令。

## Workflow

```mermaid
flowchart LR
    IndexMatch[索引命中 Skill ID] --> GenRoute[generate-fastpath-route 提取运行指令]
    GenRoute --> FormatGuide[fastpath-dispatch-guide 规范输出直调卡片]
    FormatGuide --> ButlerExec[管家秒级直达原子工具执行]
```
