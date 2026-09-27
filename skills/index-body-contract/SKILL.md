---
name: index-body-contract
level: L3
composition:
  - standardize-workflow-sop
  - verify-mermaid-syntax
  - check-script-executable
  - verify-execution-contract
description: 复合流程级技能(L3)：索引主体运作契约。细化解耦为SOP流程规范、Mermaid流程图语法物理校验、底层脚本可执行权限物理检测与执行契约完整性验证。
---

# Index Body Contract (索引主体运作契约)

## Overview

Index Body Contract 规范所有被索引 Skill 的内部运作白盒化。
确保管家在调用任意 Skill 时，不仅知道“什么时候调（头部）”，更能准确透视“具体怎么运作（主体）”。

## Workflow

```mermaid
flowchart LR
    BodyDraft[Skill 主体内容] --> SOP[standardize-workflow-sop 注入状态机与步骤]
    SOP --> Verify[verify-execution-contract 验证执行契约与脚本]
    Verify --> Transparent[输出可被管家白盒透视的执行主体]
```

## Boundaries

- 统一规约主体结构的标准呈现，不限制特定业务领域的自由算法。
