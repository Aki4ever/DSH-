#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
normalize_skill.py
外部引入技能的契约归一器：在 skills/<name>/ 下生成符合本池统一契约的 SKILL.md 与 README.md。

关键性质：
  * 幂等：输出内容 100% 由命令行参数决定，不含时间戳、随机数、计数器；
    同一参数连续运行两次，SKILL.md 逐字节一致（sha256 不变）。
  * 只写 skills/<name>/ 下两个文件，不触碰仓库内任何其他文件。
  * 纯标准库、不联网。

Exit Code:
  0 - 归一成功（新建或幂等更新）
  1 - 参数非法（name 非 kebab-case / level 非法 / description 为空）
"""

import os
import re
import sys
import json
import hashlib
import argparse

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))

KEBAB_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
LEVELS = ("L1", "L2", "L3", "L4")
FENCE = "```"


def normalize_description(text):
    """压实为单行，必要时加引号，保证 Frontmatter 可被本池解析器读取。"""
    flat = " ".join(text.split())
    if not flat:
        return ""
    if ": " in flat or flat.startswith(("-", "#", "&", "*", "!")) or '"' in flat:
        return '"%s"' % flat.replace('"', "'")
    return flat


def build_skill_md(name, level, description, composition, title):
    composition = composition or []
    lines = []
    lines.append("---")
    lines.append("name: %s" % name)
    lines.append("level: %s" % level)
    if level == "L3" and composition:
        lines.append("composition:")
        for dep in composition:
            lines.append("  - %s" % dep)
    lines.append("description: %s" % normalize_description(description))
    lines.append("---")
    lines.append("")
    lines.append("# %s" % title)
    lines.append("")
    lines.append("## Overview")
    lines.append("")
    lines.append(
        "%s 为外部引入并完成契约归一的技能，级别 %s。" % (title, level)
    )
    lines.append(
        "归一后必须同时具备：YAML Frontmatter 元数据、`## When to Use` 场景索引、"
        "`## Workflow` 主体 SOP（Mermaid + 带物理探针标记的有序步骤）与明确的退出码契约。"
    )
    if composition:
        lines.append("")
        lines.append("组合依赖（composition）：%s。" % "、".join("`%s`" % d for d in composition))
    lines.append("")
    lines.append("## When to Use")
    lines.append("")
    lines.append("**正触发**：")
    lines.append("- 需要执行「%s」所描述的能力时；" % description)
    lines.append("- 作为上游复合流程的一环被显式引用（composition 命中）时。")
    lines.append("")
    lines.append(
        "**触发禁区**：本技能的职责边界由 `## Boundaries & Constraints` 限定，"
        "越界动作（跨职责改写、未授权写入、网络外发）一律不触发本技能。"
    )
    lines.append("")
    lines.append("## Workflow")
    lines.append("")
    lines.append(FENCE + "mermaid")
    lines.append("flowchart TD")
    lines.append("    Start([接收 %s 任务]) --> P1[1. 确认输入与约束]" % name)
    lines.append("    P1 --> P2[2. 执行核心处理]")
    lines.append("    P2 --> P3[3. 物理探针自检]")
    lines.append("    P3 --> Gate{探针全部通过?}")
    lines.append("    Gate -->|否| Fix[就地修复后重跑] --> P3")
    lines.append("    Gate -->|是| Report([输出结构化结果])")
    lines.append(FENCE)
    lines.append("")
    lines.append("**有序步骤**：")
    lines.append("")
    lines.append("1. `[probe:file]` 确认输入目标（文件/目录/入参）真实存在且非空，缺失即阻断。")
    lines.append("2. `[probe:regex]` 对核心处理结果做格式断言（结构、标识、黑名单命中）。")
    lines.append("3. `[probe:exitcode]` 运行底层命令或脚本，断言退出码为 0。")
    lines.append("4. `[probe:length]` 断言输出长度/字段数落在约定区间，防止空结果与膨胀。")
    lines.append("5. `[probe:exitcode]` 收尾自检：失败必须显式退出非 0，禁止带病交付。")
    lines.append("")
    lines.append("## Usage & Script")
    lines.append("")
    lines.append(FENCE + "bash")
    lines.append("# 1. 契约文件物理落地自检（存在且非空）")
    lines.append("test -s skills/%s/SKILL.md && echo contract-ok" % name)
    lines.append("")
    lines.append("# 2. 池级规范校验（仓库根目录执行）")
    lines.append("./bin/skill-pool validate %s" % name)
    lines.append(FENCE)
    lines.append("")
    lines.append("## Success Contract")
    lines.append("")
    lines.append("| 退出码 | 语义 |")
    lines.append("| :--- | :--- |")
    lines.append("| `0` | 任务完成且全部物理探针通过 |")
    lines.append("| `1` | 输入缺失、格式越界或探针断言失败（必须给出失败理由） |")
    lines.append("")
    lines.append("## Boundaries & Constraints")
    lines.append("")
    lines.append("- 仅在本技能职责范围内动作，越界改写必须交还对应 Owner 技能；")
    lines.append("- 所有宣称完成的结果必须可被物理探针复核，禁止「口述完成」；")
    lines.append("- 归一生成的文件仅由 `normalize-skill-contract` 管理，手工改写会导致幂等基线失效。")
    lines.append("")
    return "\n".join(lines)


def build_readme(name, level, description):
    lines = []
    lines.append("# %s" % name)
    lines.append("")
    lines.append(description)
    lines.append("")
    lines.append("- 级别：%s" % level)
    lines.append("")
    lines.append("## 使用方式")
    lines.append("")
    lines.append(FENCE + "bash")
    lines.append("test -s skills/%s/SKILL.md && echo contract-ok" % name)
    lines.append("./bin/skill-pool validate %s" % name)
    lines.append(FENCE)
    lines.append("")
    lines.append("## 退出码表")
    lines.append("")
    lines.append("| 退出码 | 语义 |")
    lines.append("| :--- | :--- |")
    lines.append("| `0` | 任务完成且探针通过 |")
    lines.append("| `1` | 输入缺失、越界或断言失败 |")
    lines.append("")
    lines.append("## 上下游")
    lines.append("")
    lines.append("- 由 `normalize-skill-contract` 归一生成，受管区块请勿手工改写。")
    lines.append("")
    return "\n".join(lines)


def sha256_of(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def write_if_changed(path, content):
    """内容相同则完全不写盘，保证幂等运行的修改时间与哈希都稳定。"""
    if os.path.isfile(path):
        try:
            with open(path, "r", encoding="utf-8") as fh:
                if fh.read() == content:
                    return
        except OSError:
            pass
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(content)


def main():
    parser = argparse.ArgumentParser(
        description="外部引入技能契约归一器（幂等）"
    )
    parser.add_argument("--name", required=True, help="kebab-case 技能名")
    parser.add_argument("--level", required=True, help="技能级别 L1|L2|L3|L4（非法值返回退出码 1，不走 argparse 的 2）")
    parser.add_argument("--description", required=True, help="技能描述（非空）")
    parser.add_argument("--composition", default="", help="逗号分隔的组合依赖，仅 L3 写入 Frontmatter")
    parser.add_argument("--title", default="", help="正文标题，缺省复用技能名")
    args = parser.parse_args()

    name = (args.name or "").strip()
    level = (args.level or "").strip()
    description = " ".join((args.description or "").split())
    title = (args.title or "").strip() or name

    errors = []
    if not KEBAB_RE.match(name):
        errors.append("name '%s' 不是合法 kebab-case" % name)
    if level not in LEVELS:
        errors.append("level '%s' 非法" % level)
    if not description:
        errors.append("description 为空")

    composition = [part.strip() for part in (args.composition or "").split(",") if part.strip()]
    for dep in composition:
        if not KEBAB_RE.match(dep):
            errors.append("composition 项 '%s' 不是合法 kebab-case" % dep)

    if errors:
        report = {
            "success": False,
            "skill": name,
            "path": "skills/%s" % name if name else "",
            "created": False,
            "sha256": "",
            "errors": errors,
        }
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1

    skill_dir = os.path.join(REPO_ROOT, "skills", name)
    skill_md = os.path.join(skill_dir, "SKILL.md")
    readme_md = os.path.join(skill_dir, "README.md")
    created = not os.path.isfile(skill_md)

    os.makedirs(skill_dir, exist_ok=True)
    content = build_skill_md(name, level, description, composition, title)
    write_if_changed(skill_md, content)
    write_if_changed(readme_md, build_readme(name, level, description))

    report = {
        "success": True,
        "skill": name,
        "path": "skills/%s" % name,
        "created": created,
        "sha256": sha256_of(content),
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
