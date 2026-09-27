#!/usr/bin/env python3
"""
load_contract.py
按精确技能 id 加载单个 SKILL.md 正文（技能正文进入上下文的唯一合法入口）。

Exit Code:
  0 - 加载成功
  1 - id 非法/通配/路径穿越，或目标缺失/为空
"""

import os
import re
import sys
import json
import math
import argparse

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
SKILLS_DIR = os.path.join(REPO_ROOT, "skills")

SAFE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9\-]*$")


def est_tokens(text: str) -> int:
    cjk = sum(1 for ch in text if "\u4e00" <= ch <= "\u9fff")
    ascii_bytes = sum(1 for ch in text if ord(ch) < 128)
    return math.ceil(cjk + ascii_bytes / 4)


def load_one(skill_id: str, meta_only: bool = False):
    if not SAFE_ID_RE.match(skill_id or ""):
        return None, f"illegal skill id (wildcards/paths are forbidden): {skill_id!r}"

    skill_md = os.path.join(SKILLS_DIR, skill_id, "SKILL.md")
    if not os.path.exists(skill_md):
        return None, f"SKILL.md not found for skill: {skill_id}"

    size = os.path.getsize(skill_md)
    if size <= 0:
        return None, f"SKILL.md is empty for skill: {skill_id}"

    with open(skill_md, "r", encoding="utf-8") as f:
        content = f.read()

    result = {
        "success": True,
        "name": skill_id,
        "path": os.path.relpath(skill_md, REPO_ROOT),
        "bytes": size,
        "tokens": est_tokens(content),
        "meta_only": bool(meta_only),
    }
    if not meta_only:
        result["content"] = content
    return result, None


def main() -> int:
    parser = argparse.ArgumentParser(description="Load exactly one skill contract")
    parser.add_argument("--name", "-n", required=True, help="Exact skill id")
    parser.add_argument("--meta-only", action="store_true", help="Return metadata without content")
    parser.add_argument("--json", action="store_true", help="JSON output (default)")
    args = parser.parse_args()

    result, err = load_one(args.name, args.meta_only)
    if result is None:
        print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
        return 1

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
