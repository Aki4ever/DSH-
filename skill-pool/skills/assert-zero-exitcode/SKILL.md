---
name: assert-zero-exitcode
level: L2
description: 工序动作级技能：执行命令并硬断言退出码必须为 0，杜绝忽略报错与失败静默。
---

# Assert Zero Exitcode (命令退出码硬断言)

## Overview

本技能是 L2 工序动作级工具技能。确保任何下游命令或脚本执行必须完全成功（Exit Code == 0），非 0 立即阻断并上报错误。

## Usage & Script

```bash
python3 skills/assert-zero-exitcode/scripts/assert_exitcode.py --cmd "python3 --version"
```
