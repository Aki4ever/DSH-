---
name: sync-requirements-lifecycle
level: L2
description: 工序动作级技能：物理检查并同步 requirements 需求生命周期版本，确保任务严格从最新图纸出发。
---

# Sync Requirements Lifecycle (需求生命周期同步校验)

## Overview

本技能是 L2 工序动作级工具技能。用于自动化审查 `docs/requirements/index.md` 与 `product.md` 的版本一致性，杜绝脱离最新需求随意施工。

## Usage & Script

```bash
python3 skills/sync-requirements-lifecycle/scripts/sync_reqs.py --req-id REQ-BUTLER-SPEC-GOVERNANCE-009
```
