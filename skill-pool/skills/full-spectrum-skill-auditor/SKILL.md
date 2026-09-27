---
name: full-spectrum-skill-auditor
level: L3
composition:
  - enforce-contract-completeness
  - audit-all-skills-compliance
description: 复合流程级技能(L3)：全量技能合规自检门禁。在每次更新时穿透审计全量存量与增量技能的Frontmatter元数据、头部场景索引与主体SOP，确保零契约缺失。
---

# Full Spectrum Skill Auditor (全量技能合规审计门禁)

## Overview

本技能是 L3 复合流程级技能。对技能池内全量 40+ 个 Skill 执行穿透式静态合规体检，杜绝残缺、缺少头部场景或缺少动作脚本的技能留存。

## Workflow

```mermaid
flowchart TD
    Trigger[触发全量更新或自检] --> Rule[enforce-contract-completeness 载入契约规范]
    Rule --> RunAudit[audit-all-skills-compliance 遍历扫描所有技能目录]
    RunAudit --> Check{是否全量通过 (Exit Code == 0)?}
    Check -->|是| Pass[合规门禁放行]
    Check -->|否| Block[阻断并输出未达标技能清单与原因]
```
