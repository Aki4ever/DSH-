---
name: ensure-utf8-encoding
level: L2
description: 工序动作级技能：物理检测并断言指定文件是否为合法 UTF-8 编码且无不可读乱码。
---

# Ensure UTF-8 Encoding (UTF-8 编码物理断言)

## Overview

本技能是 L2 工序动作级工具技能。消灭跨环境文件落盘或文本处理时引入的编码异常与乱码。

## Usage & Script

```bash
python3 skills/ensure-utf8-encoding/scripts/check_utf8.py --files file1.md file2.json
```
