#!/usr/bin/env python3
"""
verify_payload.py
断言一次任务的技能正文加载量符合 lazy-load-policy 的四条硬规则。

Exit Code:
  0 - 四项断言全部通过
  1 - 越权加载 / 超出 top-K / 超出字节预算 / 目标缺失
"""

import os
import sys
import json
import math
import argparse

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
SKILLS_DIR = os.path.join(REPO_ROOT, "skills")

DEFAULT_MAX_SKILLS = 5
DEFAULT_MAX_BYTES = 12288


def est_tokens(text: str) -> int:
    cjk = sum(1 for ch in text if "\u4e00" <= ch <= "\u9fff")
    ascii_bytes = sum(1 for ch in text if ord(ch) < 128)
    return math.ceil(cjk + ascii_bytes / 4)


def verify(selected, loaded, max_skills, max_bytes):
    checks = []

    if not isinstance(selected, list) or not isinstance(loaded, list):
        return None, "manifest must provide 'selected' and 'loaded' arrays"

    extra = [x for x in loaded if x not in selected]
    checks.append({"name": "loaded_subset_of_selected", "pass": not extra,
                   "detail": f"越权加载: {extra}" if extra else "全部命中选中清单"})

    ok_count = len(loaded) <= max_skills
    checks.append({"name": "within_top_k", "pass": ok_count,
                   "detail": f"loaded={len(loaded)} max_skills={max_skills}"})

    total_bytes = 0
    total_tokens = 0
    missing = []
    for sid in loaded:
        path = os.path.join(SKILLS_DIR, str(sid), "SKILL.md")
        if not os.path.exists(path):
            missing.append(sid)
            continue
        size = os.path.getsize(path)
        total_bytes += size
        with open(path, "r", encoding="utf-8") as f:
            total_tokens += est_tokens(f.read())

    checks.append({"name": "no_missing_contract", "pass": not missing,
                   "detail": f"缺失: {missing}" if missing else "全部契约存在"})

    ok_bytes = total_bytes <= max_bytes
    checks.append({"name": "within_byte_budget", "pass": ok_bytes,
                   "detail": f"bytes={total_bytes} max_bytes={max_bytes}"})

    success = all(c["pass"] for c in checks) and not missing
    return {
        "success": success,
        "checks": checks,
        "selected": selected,
        "loaded": loaded,
        "loaded_count": len(loaded),
        "max_skills": max_skills,
        "total_bytes": total_bytes,
        "total_tokens": total_tokens,
        "max_bytes": max_bytes,
    }, None


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify skill context payload budget")
    parser.add_argument("--manifest", help="JSON file with selected/loaded arrays")
    parser.add_argument("--selected", help="Comma-separated selected skill ids")
    parser.add_argument("--loaded", help="Comma-separated loaded skill ids")
    parser.add_argument("--max-skills", type=int, default=DEFAULT_MAX_SKILLS)
    parser.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES)
    parser.add_argument("--json", action="store_true", help="JSON output (default)")
    args = parser.parse_args()

    if args.manifest:
        if not os.path.exists(args.manifest):
            print(json.dumps({"success": False, "error": f"manifest not found: {args.manifest}"},
                             ensure_ascii=False, indent=2))
            return 1
        try:
            with open(args.manifest, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError) as exc:
            print(json.dumps({"success": False, "error": f"manifest unreadable: {exc}"},
                             ensure_ascii=False, indent=2))
            return 1
        selected, loaded = data.get("selected"), data.get("loaded")
    else:
        selected = [s.strip() for s in (args.selected or "").split(",") if s.strip()]
        loaded = [s.strip() for s in (args.loaded or "").split(",") if s.strip()]

    result, err = verify(selected, loaded, args.max_skills, args.max_bytes)
    if result is None:
        print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
        return 1

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["success"] else 1


if __name__ == "__main__":
    sys.exit(main())
