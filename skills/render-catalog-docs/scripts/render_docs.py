#!/usr/bin/env python3
"""
render_docs.py
把 skill-catalog.json 的组装关系注入 docs 受管区块，取消人工手写组装表。

Exit Code:
  0 - 写入成功，或 --check 模式下文档已是最新
  1 - catalog JSON 缺失/非法，或 --check 检测到漂移
"""

import os
import sys
import json
import argparse

# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../skill-pool"))
REPO_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
CATALOG_JSON = os.path.join(REPO_ROOT, "docs/operations/skill-catalog.json")
DEFAULT_TARGET = os.path.join(REPO_ROOT, "docs/requirements/product.md")

BEGIN_PREFIX = "<!-- CATALOG:BEGIN"
END_MARK = "<!-- CATALOG:END -->"

SECTION_HEADING = "## 附录 A. 组装关系受管区块（自动生成）"


def load_catalog(path):
    if not os.path.exists(path):
        return None, f"catalog not found: {path}"
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError) as exc:
        return None, f"catalog unreadable: {exc}"

    for key in ("total_skills", "levels_summary", "skills"):
        if key not in data:
            return None, f"catalog missing required field: {key}"
    return data, None


def render_block(catalog):
    levels = catalog.get("levels_summary", {})
    total = catalog.get("total_skills", len(catalog.get("skills", [])))
    skills = catalog.get("skills", [])

    rows = [s for s in skills if s.get("composition")]
    order = {"L1": 1, "L2": 2, "L3": 3, "L4": 4}
    rows.sort(key=lambda s: (order.get(s.get("level"), 9), s.get("id", "")))

    lines = [
        f"{BEGIN_PREFIX} 受管区块：由 skills/render-catalog-docs/scripts/render_docs.py 自动生成，禁止人工编辑 -->",
        "",
        SECTION_HEADING,
        "",
        f"- 数据源：`docs/operations/skill-catalog.json`（catalog_version {catalog.get('catalog_version', 'unknown')}，total_skills {total}）",
        f"- 级别分布：L1 {levels.get('L1', 0)} / L2 {levels.get('L2', 0)} / L3 {levels.get('L3', 0)} / L4 {levels.get('L4', 0)}",
        "",
        "| 级别 | Skill ID | 组装依赖 (Composition) |",
        "| :--- | :--- | :--- |",
    ]

    for s in rows:
        comp = " + ".join(f"`{c}`" for c in s["composition"])
        lines.append(f"| **{s.get('level', '-')}** | `{s.get('id')}` | {comp} |")

    if not rows:
        lines.append("| - | *(当前无带组装依赖的技能)* | - |")

    lines.extend(["", END_MARK, ""])
    return "\n".join(lines) + "\n"


def find_marker_lines(lines):
    """行锚定查找标记：只有整行以 BEGIN 标记开头、且整行等于 END 标记才算受管区块边界。

    这样可以安全地在正文里以行内代码形式提及标记名，而不会误伤受管区块。
    """
    begin = end = None
    for i, line in enumerate(lines):
        if begin is None:
            if line.startswith(BEGIN_PREFIX):
                begin = i
            continue
        if line.strip() == END_MARK:
            end = i
            break
    return begin, end


def inject(existing: str, block: str):
    """返回 (新内容, changed)。只替换受管区块，标记缺失则在文末补齐章节。"""
    if not existing.endswith("\n"):
        existing += "\n"
    lines = existing.splitlines(keepends=True)
    begin, end = find_marker_lines(lines)

    if begin is not None and end is not None:
        tail = end + 1
        while tail < len(lines) and lines[tail].strip() == "":
            tail += 1
        new = "".join(lines[:begin]) + block + "".join(lines[tail:])
    else:
        sep = "" if existing.endswith("\n\n") else "\n"
        new = existing + sep + "---\n\n" + block
    return new, new != existing


def main() -> int:
    parser = argparse.ArgumentParser(description="Render managed catalog blocks into docs")
    parser.add_argument("--target", default=DEFAULT_TARGET, help="Target markdown file")
    parser.add_argument("--catalog", default=CATALOG_JSON, help="Catalog JSON path")
    parser.add_argument("--check", action="store_true", help="Detect drift without writing")
    parser.add_argument("--json", action="store_true", help="JSON output")
    args = parser.parse_args()

    catalog, err = load_catalog(args.catalog)
    if catalog is None:
        print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
        return 1

    if not os.path.exists(args.target):
        print(json.dumps({"success": False, "error": f"target not found: {args.target}"},
                         ensure_ascii=False, indent=2))
        return 1

    with open(args.target, "r", encoding="utf-8") as f:
        existing = f.read()

    block = render_block(catalog)
    new_content, changed = inject(existing, block)

    result = {
        "success": True,
        "target": args.target,
        "mode": "check" if args.check else "write",
        "changed": changed,
        "managed_rows": len([s for s in catalog.get("skills", []) if s.get("composition")]),
        "total_skills": catalog.get("total_skills"),
    }

    if args.check:
        result["drift"] = changed
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 1 if changed else 0

    if changed:
        with open(args.target, "w", encoding="utf-8") as f:
            f.write(new_content)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
