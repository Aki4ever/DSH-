---
name: validate-icon-syntax
level: L2
description: 工序动作级技能：通过正则表达式物理断言输出文案的尾部是否包含合规的特异化图标框架。
---

# Validate Icon Syntax (尾部图标语法正则校验)

## Overview

本技能是 L2 工序动作级工具技能。通过独立 Python 脚本利用正则表达式扫描目标文本，严格断言末尾是否具备固化的特异化图标。

## Usage & Script

```bash
python3 skills/validate-icon-syntax/scripts/validate_icon_syntax.py --text-file <path_to_reply.txt>
```
