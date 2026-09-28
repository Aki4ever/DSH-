#!/usr/bin/env python3
"""
build_layer_graph.py
由 skill-catalog.json 与 execution-layers.json 生成层间依赖图 docs/operations/layer-graph.json。

只建图，不判违规（违规判定归 detect-layer-coupling）。

Exit Code:
  0 - 写盘成功，或 --check 时图已最新
  1 - 输入缺失/不可读，或 --check 检测到陈旧
  2 - catalog 缺少必需字段
"""

import os
import sys

sys.dont_write_bytecode = True

import json
import argparse

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
CATALOG_JSON = os.path.join(REPO_ROOT, "docs/operations/skill-catalog.json")
REGISTRY_JSON = os.path.join(REPO_ROOT, "docs/operations/execution-layers.json")
GRAPH_JSON = os.path.join(REPO_ROOT, "docs/operations/layer-graph.json")

GRAPH_VERSION = "1.0.0"
LEVEL_ORDER = {"L1": 1, "L2": 2, "L3": 3, "L4": 4}


def level_rank(level):
    return LEVEL_ORDER.get(level, 99)


def load_json(path):
    if not os.path.exists(path):
        return None, f"not found: {path}"
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f), None
    except (OSError, ValueError) as exc:
        return None, f"unreadable: {path}: {exc}"


def build(catalog, registry):
    skills = catalog.get("skills") or []
    nodes, skipped, edges = [], [], []

    for s in skills:
        sid = s.get("id")
        level = s.get("level")
        if not sid or level not in LEVEL_ORDER:
            skipped.append({"id": sid, "reason": "缺少合法 level，未入图"})
            continue
        nodes.append({
            "id": sid,
            "level": level,
            "layer": s.get("layer", "skill"),
            "scope": s.get("scope"),
            "composition": list(s.get("composition") or []),
        })
        for dep in s.get("composition") or []:
            edges.append({"from": sid, "to": dep, "kind": "composition"})

    known = {n["id"] for n in nodes}
    dangling = sorted({e["to"] for e in edges if e["to"] not in known})
    for dep in dangling:
        edges.append({"from": None, "to": dep, "kind": "dangling"})

    edges = [e for e in edges if e["from"] is not None]
    edges.sort(key=lambda e: (e["from"], e["to"]))

    layers = {lv: len([n for n in nodes if n["level"] == lv]) for lv in ("L1", "L2", "L3", "L4")}
    non_skill = [e for e in (registry.get("entries") or [])]

    return {
        "graph_version": GRAPH_VERSION,
        "built_from": ["docs/operations/skill-catalog.json", "docs/operations/execution-layers.json"],
        "nodes": sorted(nodes, key=lambda n: (level_rank(n["level"]), n["id"])),
        "edges": edges,
        "layers": layers,
        "edge_count": len(edges),
        "non_skill_nodes": len(non_skill),
        "dangling_dependencies": dangling,
        "skipped": skipped,
    }


def dump(graph):
    return json.dumps(graph, ensure_ascii=False, sort_keys=True, indent=1) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the layer dependency graph")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    catalog, err = load_json(CATALOG_JSON)
    if catalog is None:
        print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=1))
        return 1
    if "skills" not in catalog:
        print(json.dumps({"success": False, "error": "catalog missing 'skills'"}, ensure_ascii=False, indent=1))
        return 2
    registry, err = load_json(REGISTRY_JSON)
    if registry is None:
        print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=1))
        return 1

    graph = build(catalog, registry)
    payload = dump(graph)

    if args.check:
        stale = True
        if os.path.exists(GRAPH_JSON):
            with open(GRAPH_JSON, "r", encoding="utf-8") as f:
                stale = f.read() != payload
        print(json.dumps({"success": not stale, "stale": stale, "layers": graph["layers"],
                          "edge_count": graph["edge_count"],
                          "dangling": graph["dangling_dependencies"]},
                         ensure_ascii=False, indent=1))
        return 1 if stale else 0

    old = None
    if os.path.exists(GRAPH_JSON):
        with open(GRAPH_JSON, "r", encoding="utf-8") as f:
            old = f.read()
    changed = old != payload
    if changed:
        os.makedirs(os.path.dirname(GRAPH_JSON), exist_ok=True)
        with open(GRAPH_JSON, "w", encoding="utf-8") as f:
            f.write(payload)

    print(json.dumps({"success": True, "changed": changed, "layers": graph["layers"],
                      "edge_count": graph["edge_count"],
                      "dangling": graph["dangling_dependencies"],
                      "skipped": len(graph["skipped"]),
                      "graph": "docs/operations/layer-graph.json"},
                     ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
