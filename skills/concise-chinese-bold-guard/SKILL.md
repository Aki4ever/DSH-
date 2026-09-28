---
name: concise-chinese-bold-guard
level: L3
composition:
  - output-chinese-only
  - limit-words-under-10
  - markdown-bold-only
  - no-conversational-filler
description: 复合流程级技能(L3)：基于 4 个微观 L1 原子规约叠加而成。强制要求输出文本不超过 10 个字、纯中文、全黑体、零闲聊。
---

# 格式规约技能: concise-chinese-bold-guard

## Overview

本技能由 DSH 管家动态生成，用于将执行层的最终输出文本强行约束为统一且固定的格式结构。

## 强制输出约束规则 (Hard Constraints)

1. **字数上限**：最终有效回复**严格控制在 10 个字以内**（不含纯 Markdown 格式符号）。
2. **字体样式**：输出内容必须使用 **全黑体（Markdown 加粗语法 `**文本**`）** 呈现。
3. **语言语种**：必须使用 **中文**。
4. **禁止多余废话**：严禁出现任何解释性前缀、免责声明、思考过程、问候语或末尾附言。


## Workflow

1. `[probe:length]` 接收输入内容或下游执行层生成的原始文本。
2. `[probe:length]` 提炼核心结论，精简压缩至 10 字以内。
3. `[probe:regex]` 转换为中文，并使用 `**...**` 进行全黑体包裹。
4. `[probe:exitcode]` 交付最终结果。
