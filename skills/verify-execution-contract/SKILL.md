---
name: verify-execution-contract
level: L2
description: 工序动作级技能：校验 Skill 的输入/输出契约完整性及本地挂载脚本的可执行性。
---

# Verify Execution Contract (执行契约与脚本验证)

## Overview

本技能是 L2 工序动作级工具技能。用于自动化审查 Skill 是否声明了输入/输出边界，并检查其 `scripts/` 目录下的工具文件是否存在且具备可执行性。

## Usage & Script

```bash
python3 skills/verify-execution-contract/scripts/verify_contract.py --skill-dir skills/schema-guard
```
