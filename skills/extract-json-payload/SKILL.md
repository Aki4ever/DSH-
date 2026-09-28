---
name: extract-json-payload
level: L2
description: 工序动作级技能：从任意夹杂自然语言的文本中，精准提取并解析出闭合合法的 JSON 负载。
---

# Extract JSON Payload (JSON 负载精准提取)

## Overview

本技能是 L2 工序动作级工具技能。用于自动化解析混合输出文本，剔除前后噪音，提取出机器可读的结构化 JSON。

## Usage & Script

```bash
python3 skills/extract-json-payload/scripts/extract_json.py --input mixed_text.txt
```
