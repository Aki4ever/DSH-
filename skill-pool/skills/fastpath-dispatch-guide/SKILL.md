---
name: fastpath-dispatch-guide
level: L1
description: 微观原子规约：规范快捷路由的指引结构，必须包含目标技能ID、级别、直调执行命令与底层原子依赖。
---

# Fastpath Dispatch Guide (快捷路由指引规约)

## Overview

本技能是 L1 原子级基础规约。消灭管家在索引到技能后不知道如何以最低成本执行的迟疑与漂移。

## Strict Rules

1. **结构化直调卡片**：快捷路由指引必须包含 `skill_id`、`level`、`action_type` 与 `fastpath_cmd`；
2. **免整篇阅读**：对于 L2 工具，必须直接给出具体的 `python3 <script_path> <args>`，使管家无需重复通读 Markdown 即可就地执行；
3. **透视原子依赖**：对于 L3 流程，必须展开列出其底层包含的原子技能列表。
