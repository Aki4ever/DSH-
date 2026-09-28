---
name: verify-deliverable-paths
level: L2
description: 工序动作级技能：物理验证交付物地址的有效性，严禁输出不存在或空路径。
---

# Verify Deliverable Paths (交付地址物理探针)

## Overview

本技能是 L2 工序动作级工具技能。在输出“输出地址”前，对声明的所有文件或目录路径进行物理存在性检查，若路径不存在或为空则立刻阻断。

## Usage & Script

```bash
python3 skills/verify-deliverable-paths/scripts/verify_paths.py --paths path1 path2
```
