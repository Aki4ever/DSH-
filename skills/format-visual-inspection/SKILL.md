---
name: format-visual-inspection
level: L1
description: 微观原子规约：强制可视化透视输出必须包含标准 Mermaid 图表或 GenUI 卡片，严禁仅输出大段无图纯文本。
---

# Format Visual Inspection (可视化巡检输出规约)

## Overview

本技能是 L1 原子级基础规约。杜绝“说是可视化，实际全是大段白话”的伪可视化问题。

## Strict Rules

1. **必须包含图表载体**：输出中必须至少包含一个合规的 Mermaid 流程图/状态图，或一个 dsh-ui 交互卡片；
2. **严禁纯散文堆叠**：文字仅用于提纲挈领的指标说明，主体结构必须通过图表与列表透视；
3. **图表语法合法**：Mermaid 节点命名与箭头必须通过语法检验，不得包含引发渲染崩溃的特殊字符。
