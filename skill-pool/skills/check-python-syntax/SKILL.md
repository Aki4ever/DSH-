---
name: check-python-syntax
level: L2
description: 工序动作级技能：对指定的 Python 源码文件执行静态编译语法验证，防止引入 SyntaxError。
---

# Check Python Syntax (Python 语法编译校验)

## Overview

本技能是 L2 工序动作级工具技能。在代码编写或编辑后，提供纯正的语法静态校验，保证不会交付无法运行的代码。

## Usage & Script

```bash
python3 skills/check-python-syntax/scripts/check_syntax.py --files file1.py file2.py
```
