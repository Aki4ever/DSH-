---
name: run-test-cases-gate
level: L2
description: 工序动作级技能：对照需求规格执行自动化测试案例脚本，所有用例全部通过方可放行验收。
---

# Run Test Cases Gate (需求测试案例门禁)

## Overview

本技能是 L2 工序动作级工具技能。根据需求编写或读取测试案例集合并执行物理验证，一旦有用例失败立即阻断验收。

## Usage & Script

```bash
python3 skills/run-test-cases-gate/scripts/run_testcases.py
```
