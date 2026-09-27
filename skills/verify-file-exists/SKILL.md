---
name: verify-file-exists
level: L2
description: 工序动作级技能：物理验证指定文件路径是否真实存在于磁盘上，且文件大小大于 0 字节。
---

# Verify File Exists (文件物理存在性验证)

## Overview

本技能是 L2 工序动作级工具技能。提供确定性的文件落地物理探针，杜绝智能体仅在文本中声称修改却未落盘的问题。

## Usage & Script

```bash
python3 skills/verify-file-exists/scripts/verify_file.py --paths path1 path2
```

## Success Contract

- 路径存在；
- 类型为普通文件或目录；
- 文件字节数 > 0。
