#!/usr/bin/env python3
import os
import sys
import argparse
import json

# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../skill-pool"))
REPO_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
CATALOG_PATH = os.path.join(REPO_ROOT, "docs/operations/skill-catalog.json")

def extract_topology(catalog_path: str = CATALOG_PATH) -> dict:
    if not os.path.exists(catalog_path):
        return {"ok": False, "error": f"Catalog not found at {catalog_path}"}

    with open(catalog_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    nodes = []
    edges = []
    level_counts = {"L1": 0, "L2": 0, "L3": 0, "L4": 0}

    for s in data.get("skills", []):
        sid = s.get("id")
        lvl = s.get("level", "L3")
        level_counts[lvl] = level_counts.get(lvl, 0) + 1
        nodes.append({
            "id": sid,
            "level": lvl,
            "category": s.get("category_title", ""),
            "triggers": s.get("triggers", [])
        })

        for child in s.get("composition", []):
            edges.append({
                "from": sid,
                "to": child,
                "type": "composes"
            })

    return {
        "ok": True,
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "level_counts": level_counts,
        "nodes": nodes,
        "edges": edges
    }

def main():
    parser = argparse.ArgumentParser(description="Extract catalog topology nodes and edges")
    parser.add_argument("--catalog", "-c", default=CATALOG_PATH, help="Path to skill-catalog.json")
    args = parser.parse_args()

    res = extract_topology(args.catalog)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res.get("ok") else 1)

if __name__ == "__main__":
    main()
