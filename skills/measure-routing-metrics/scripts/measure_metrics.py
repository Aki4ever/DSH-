#!/usr/bin/env python3
import os
import sys
import time
import argparse
import json

# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../skill-pool"))
REPO_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
CATALOG_PATH = os.path.join(REPO_ROOT, "docs/operations/skill-catalog.json")

def measure(query: str, catalog_path: str = CATALOG_PATH) -> dict:
    start_time = time.perf_counter()

    if not os.path.exists(catalog_path):
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        return {
            "ok": False,
            "query": query,
            "duration_ms": round(duration_ms, 2),
            "matched_skills": [],
            "error": "Catalog file not found"
        }

    with open(catalog_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    skills = data.get("skills", [])
    matched = []
    q_lower = query.lower()

    for s in skills:
        sid = s.get("id", "")
        desc = s.get("description", "")
        triggers = s.get("triggers", [])
        
        hit = False
        if q_lower in sid.lower() or any(q_lower in t.lower() for t in triggers) or q_lower in desc.lower():
            hit = True

        if hit:
            matched.append({
                "id": sid,
                "level": s.get("level", "L3"),
                "category": s.get("category_title", "")
            })

    duration_ms = (time.perf_counter() - start_time) * 1000.0

    return {
        "ok": True,
        "query": query,
        "duration_ms": round(duration_ms, 2),
        "hit_count": len(matched),
        "primary_hit": matched[0]["id"] if matched else "none",
        "matched_skills": matched
    }

def main():
    parser = argparse.ArgumentParser(description="Measure catalog index and routing duration")
    parser.add_argument("--query", "-q", default="输出", help="Search query")
    parser.add_argument("--catalog", "-c", default=CATALOG_PATH, help="Path to catalog JSON")
    args = parser.parse_args()

    res = measure(args.query, args.catalog)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res.get("ok") else 1)

if __name__ == "__main__":
    main()
