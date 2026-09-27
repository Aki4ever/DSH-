---
name: enforce-contract-completeness
level: L1
description: 微观原子规约：技能契约完整性强制要求。所有存量与增量技能必须同时具备Frontmatter元数据、头部场景索引与主体运作SOP。
---

# Enforce Contract Completeness (契约完整性原子规约)

## Overview

本技能是 L1 原子级基础规约。消灭粗制滥造、缺少核心场景或流程图的残缺技能。

## Strict Rules

1. **元数据完整**：`SKILL.md` 必须具备合法的 YAML Frontmatter，且包含与目录名严格一致的 `name`，明确的 `level` (L1~L4) 及 `description`；
2. **头部索引契约 (When to Use)**：正文必须包含触发场景章节（`## When to Use` 或 `## Overview`），列明适用范围与边界；
3. **主体运作契约 (Workflow / SOP)**：正文必须包含具体的流程图（Mermaid）或有序执行步骤规约；
4. **动作脚本挂载 (L2 专属)**：若 Skill 等级为 L2，必须在 `scripts/` 目录下配套真实存在且具备执行权限的 Python 脚本。
