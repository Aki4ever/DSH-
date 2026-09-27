---
name: check-script-executable
level: L2
description: 工序动作级技能：物理检测指定技能目录中的配套脚本是否存在且具备可执行权限 (chmod +x)。
---

# Check Script Executable (脚本可执行权限物理检测)

## Overview

本技能是 L2 工序动作级工具技能。利用独立 Python 脚本对指定目录下的脚本执行 `os.access(path, os.X_OK)` 物理检测，非可执行文件立即拦截。

## Usage & Script

```bash
python3 skills/check-script-executable/scripts/check_executable.py --dir skills/verify-file-exists/scripts
```
