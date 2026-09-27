#!/usr/bin/env python3
"""
Dynamic Rule Skill Generator for DSH Butler
Allows the butler agent to dynamically construct standardized format-constraining Skills.
"""

import sys
import argparse
from pathlib import Path

def create_rule_skill(name: str, max_words: int, bold: bool, lang: str, extra_rules: str = ""):
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    skills_dir = repo_root / "skills"
    target_dir = skills_dir / name

    if target_dir.exists():
        print(f"⚠️ 目标目录已存在: {target_dir}")
    else:
        target_dir.mkdir(parents=True, exist_ok=True)
        (target_dir / "scripts").mkdir(exist_ok=True)
        (target_dir / "references").mkdir(exist_ok=True)

    bold_str = "全黑体（Markdown 加粗语法 `**文本**`）" if bold else "标准字体"
    
    skill_content = f"""---
name: {name}
description: 动态生成的格式规约技能。强制要求输出文本：不超过 {max_words} 个字、必须使用{bold_str}、必须使用{lang}。
---

# 格式规约技能: {name}

## Overview

本技能由 DSH 管家动态生成，用于将执行层的最终输出文本强行约束为统一且固定的格式结构。

## 强制输出约束规则 (Hard Constraints)

1. **字数上限**：最终有效回复**严格控制在 {max_words} 个字以内**（不含纯 Markdown 格式符号）。
2. **字体样式**：输出内容必须使用 **{bold_str}** 呈现。
3. **语言语种**：必须使用 **{lang}**。
4. **禁止多余废话**：严禁出现任何解释性前缀、免责声明、思考过程、问候语或末尾附言。
{f'5. **额外规则**：{extra_rules}' if extra_rules else ''}

## 执行与校验流程

1. 接收输入内容或下游执行层生成的原始文本。
2. 提炼核心结论，精简压缩至 {max_words} 字以内。
3. 转换为{lang}，并使用 `**...**` 进行全黑体包裹。
4. 交付最终结果。
"""

    readme_content = f"""# {name}

## 简介
由 DSH 全局管家按需动态构建的规约 Skill。

- 目标字数: ≤ {max_words} 字
- 字体要求: {bold_str}
- 目标语言: {lang}
"""

    (target_dir / "SKILL.md").write_text(skill_content, encoding="utf-8")
    (target_dir / "README.md").write_text(readme_content, encoding="utf-8")
    print(f"✅ 成功动态生成格式规约 Skill: {name} -> {target_dir}")
    return target_dir

def main():
    parser = argparse.ArgumentParser(description="DSH Butler Dynamic Rule Skill Creator")
    parser.add_argument("--name", required=True, help="Skill name in kebab-case")
    parser.add_argument("--max-words", type=int, default=10, help="Max word limit")
    parser.add_argument("--bold", action="store_true", default=True, help="Enforce bold font")
    parser.add_argument("--lang", default="中文", help="Target language")
    parser.add_argument("--extra-rules", default="", help="Any additional rules")

    args = parser.parse_args()
    create_rule_skill(args.name, args.max_words, args.bold, args.lang, args.extra_rules)

if __name__ == "__main__":
    main()
