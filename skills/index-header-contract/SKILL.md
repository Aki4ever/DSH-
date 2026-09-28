---
name: index-header-contract
level: L3
composition:
  - standardize-when-to-use
  - validate-header-triggers
description: 复合流程级技能(L3)：索引头部契约规约。规范 Skill 的元数据与触发场景，使索引系统能够快速、精准识别适用时机。
---

# Index Header Contract (索引头部契约规范)

## Overview

Index Header Contract 统一规范所有 Skill 的头部呈现。
确保每个进入 Skill 池的资产都具备高辨识度的使用场景、排他边界与合规的 Frontmatter。

## Workflow

```mermaid
flowchart LR
    Draft[Skill 头部草案] --> CheckFM[validate-header-triggers 校验元数据]
    CheckFM --> Standardize[standardize-when-to-use 规范正反向场景]
    Standardize --> Passed[输出高辨识度索引头部]
```

## Boundaries

- 专职约束头部说明与元数据契约，不侵入主体算法逻辑。
