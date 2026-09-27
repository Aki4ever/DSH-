---
name: verify-mermaid-syntax
level: L2
description: 工序动作级技能：物理提取文本中的 Mermaid 流程图并执行语法校验，确保流程图无语法破坏。
---

# Verify Mermaid Syntax (Mermaid 流程图语法物理校验)

## Overview

本技能是 L2 工序动作级工具技能。利用独立 Python 脚本审查 Mermaid 流程图代码块的结构与闭合完整性。

## Usage & Script

```bash
python3 skills/verify-mermaid-syntax/scripts/verify_mermaid.py --file skills/dsh-butler/SKILL.md
```
