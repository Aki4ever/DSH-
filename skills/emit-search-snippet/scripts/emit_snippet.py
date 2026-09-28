#!/usr/bin/env python3
"""
emit_snippet.py
为单条检索结果生成 ≤ max-chars 的确定性摘要片段。

Exit Code:
  0 - 片段生成成功
  1 - 索引不可读，或技能 id 不存在
"""

import os
import sys
import json
import argparse

# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../skill-pool"))
REPO_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
INDEX_JSON = os.path.join(REPO_ROOT, "docs/operations/skill-index.json")

DEFAULT_MAX_CHARS = 120
ELLIPSIS = "…"


def load_index(path=INDEX_JSON):
    if not os.path.exists(path):
        return None, f"index not found: {path}"
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f), None
    except (OSError, ValueError) as exc:
        return None, f"index unreadable: {exc}"


def find_doc(index, skill_id):
    for doc in index.get("docs", []):
        if doc.get("id") == skill_id:
            return doc
    return None


def make_snippet(index, skill_id, terms, max_chars=DEFAULT_MAX_CHARS):
    """返回 (snippet, matched_terms)；skill 不存在时返回 (None, [])。"""
    doc = find_doc(index, skill_id)
    if doc is None:
        return None, []

    base = (doc.get("description") or "").replace("\n", " ").strip()
    if not base:
        base = doc.get("category_title") or skill_id

    matched = [t for t in (terms or []) if t and t in base]

    if matched:
        pos = base.find(matched[0])
        head = max(0, pos - 12)
        window = base[head: head + max_chars]
        prefix = ELLIPSIS if head > 0 else ""
        suffix = ELLIPSIS if head + max_chars < len(base) else ""
        snippet = prefix + window + suffix
    else:
        snippet = base[:max_chars] + (ELLIPSIS if len(base) > max_chars else "")

    if len(snippet) > max_chars:
        snippet = snippet[:max_chars]

    return snippet, matched


def main() -> int:
    parser = argparse.ArgumentParser(description="Emit a retrieval snippet for one skill")
    parser.add_argument("--skill", required=True, help="Skill id")
    parser.add_argument("--terms", default="", help="Comma-separated matched terms")
    parser.add_argument("--max-chars", type=int, default=DEFAULT_MAX_CHARS)
    parser.add_argument("--index", default=INDEX_JSON)
    parser.add_argument("--json", action="store_true", help="JSON output (default)")
    args = parser.parse_args()

    index, err = load_index(args.index)
    if index is None:
        print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
        return 1

    terms = [t.strip() for t in args.terms.split(",") if t.strip()]
    snippet, matched = make_snippet(index, args.skill, terms, args.max_chars)
    if snippet is None:
        print(json.dumps({"success": False, "error": f"skill not found: {args.skill}"},
                         ensure_ascii=False, indent=2))
        return 1

    print(json.dumps({"success": True, "skill": args.skill, "snippet": snippet,
                      "chars": len(snippet), "max_chars": args.max_chars,
                      "matched_terms": matched}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
