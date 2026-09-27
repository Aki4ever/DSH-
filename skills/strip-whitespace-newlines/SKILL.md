---
name: strip-whitespace-newlines
level: L1
description: 微观原子规约：严格剥离文本首尾与多余的连续空白字符、制表符及空行，实现物理对齐。
---

# Strip Whitespace Newlines (剥离首尾空白换行规约)

## Overview

本技能是 L1 原子级基础规约。消灭文本处理前后因多余空格、换行符造成的比较失配与格式污染。

## Strict Rules

1. **绝对去除首尾空字符**：输出首字符与尾字符绝不可为 `\s`、`\t`、`\n`、`\r`；
2. **多重空行折叠**：连续两个以上的空行强制折叠为单一换行。
