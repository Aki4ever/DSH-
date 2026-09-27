#!/usr/bin/env python3
import os
import sys
import argparse
import json

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
CATALOG_PATH = os.path.join(REPO_ROOT, "docs/operations/skill-catalog.json")

def search_skills(query: str, catalog_path: str = CATALOG_PATH) -> list:
    if not os.path.exists(catalog_path):
        return []
    with open(catalog_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    q = query.lower().strip()
    candidates = []

    for s in data.get("skills", []):
        score = 0
        s_id = s.get("id", "").lower()
        s_desc = s.get("description", "").lower()
        s_triggers = [t.lower() for t in s.get("triggers", [])]

        if s_id in q or q in s_id:
            score += 10
        for t in s_triggers:
            if t in q:
                score += 8
            elif q in t:
                score += 4
        if any(term in s_desc for term in q.split()):
            score += 2

        if score > 0:
            candidates.append({
                "id": s.get("id"),
                "level": s.get("level"),
                "category": s.get("category_title"),
                "score": score,
                "composition": s.get("composition", [])
            })

    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates

def main():
    parser = argparse.ArgumentParser(description="Match skills in catalog by query")
    parser.add_argument("--query", "-q", required=True, help="Search query")
    args = parser.parse_args()

    results = search_skills(args.query)
    print(json.dumps(results, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
