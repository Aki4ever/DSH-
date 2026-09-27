#!/usr/bin/env python3
"""
build_tree.py
合并 skill-catalog.json 与 execution-layers.json，生成执行层树唯一真相源。

产物：
  docs/operations/execution-tree.json
  docs/operations/execution-tree.md
  skills/dsh-butler/SKILL.md 的 TREE:BEGIN~TREE:END 受管区块

Exit Code:
  0 - 生成成功，或 --check 时已最新
  1 - 输入缺失/非法，或 --check 检测到陈旧
"""

import os
import sys
import json
import argparse

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
CATALOG_JSON = os.path.join(REPO_ROOT, "docs/operations/skill-catalog.json")
REGISTRY_JSON = os.path.join(REPO_ROOT, "docs/operations/execution-layers.json")
TREE_JSON = os.path.join(REPO_ROOT, "docs/operations/execution-tree.json")
TREE_MD = os.path.join(REPO_ROOT, "docs/operations/execution-tree.md")
BUTLER_MD = os.path.join(REPO_ROOT, "skills/dsh-butler/SKILL.md")

TREE_VERSION = "1.0.0"
BEGIN_PREFIX = "<!-- TREE:BEGIN"
END_MARK = "<!-- TREE:END -->"
MAX_DEPTH = 8

# 集群归属唯一判据：L3/L4 技能 → 集群
CLUSTER_ORDER = [
    "① 意图与路由",
    "② 契约与合规",
    "③ 冲突·冗余·质量",
    "④ 输出规约",
    "⑤ 需求与透视",
    "⑥ 外部纳管",
    "⑦ 技能引入与演进",
]

CLUSTER_MEMBERS = {
    "① 意图与路由": ["intent-detector", "skill-index-router", "atomic-fastpath-router",
                     "dual-lane-router", "google-style-skill-search-router", "on-demand-dispatcher"],
    "② 契约与合规": ["index-header-contract", "index-body-contract", "full-spectrum-skill-auditor",
                     "atomic-fission-guard", "catalog-consistency-guard", "token-economy-guard",
                     "execution-tree-guard", "zero-restart-guard", "decoupling-guard", "instance-pool-guard",
                     "layer-naming-guard"],
    "③ 冲突·冗余·质量": ["conflict-detector", "redundancy-detector", "qa-gatekeeper", "anti-pattern-guard",
                     "one-shot-guard", "parallel-lock-guard", "atomic-lock-guard"],
    "④ 输出规约": ["standard-output-framework", "concise-chinese-bold-guard", "schema-guard",
                    "iconized-output-showcase", "tail-metrics-showcase", "milestone-progress-reporter",
                    "chinese-output-guard", "quantification-guard", "concretization-guard"],
    "⑤ 需求与透视": ["spec-driven-governance", "visualize-governance-topology", "interactive-image-viewer"],
    "⑥ 外部纳管": ["github", "manage-requirements", "manage-problem-log"],
    "⑦ 技能引入与演进": ["skill-import-pipeline"],
}


def load_json(path):
    if not os.path.exists(path):
        return None, f"not found: {path}"
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f), None
    except (OSError, ValueError) as exc:
        return None, f"unreadable: {path}: {exc}"


def cluster_of(skill_id, level):
    if level == "L4":
        return None
    for cluster, members in CLUSTER_MEMBERS.items():
        if skill_id in members:
            return cluster
    return None


def build(catalog, registry):
    skills = {s["id"]: s for s in catalog.get("skills", [])}
    issues = []

    # 1. L3/L4 集群归属
    cluster_map = {}
    for sid, s in skills.items():
        level = s.get("level")
        if level in ("L3", "L4"):
            c = cluster_of(sid, level)
            if level == "L3" and c is None:
                issues.append({"kind": "unassigned_l3", "id": sid,
                               "detail": "L3 技能未列入任何集群归属表"})
                cluster_map[sid] = "⑦ 技能引入与演进"
            elif c:
                cluster_map[sid] = c

    # 2. 孤儿原子检测（本地 L1/L2 是否被引用）
    referenced = set()
    for s in catalog.get("skills", []):
        for c in s.get("composition") or []:
            referenced.add(c)
    orphans = [sid for sid, s in skills.items()
               if s.get("level") in ("L1", "L2")
               and s.get("scope") == "local-pool"
               and sid not in referenced]
    for sid in sorted(orphans):
        issues.append({"kind": "orphan_atom", "id": sid,
                       "detail": "本地 L1/L2 未被任何父级 composition 引用"})

    # 3. 递归展开（含环检测）
    def expand(skill_id, path, depth=0):
        if depth > MAX_DEPTH:
            issues.append({"kind": "max_depth", "id": skill_id, "detail": f"展开深度超过 {MAX_DEPTH}"})
            return []
        if skill_id in path:
            issues.append({"kind": "composition_cycle", "id": skill_id,
                           "detail": " -> ".join(path + [skill_id])})
            return []
        node = skills.get(skill_id)
        if node is None:
            issues.append({"kind": "missing_dependency", "id": skill_id, "detail": "composition 引用了不存在的技能"})
            return []
        children = []
        for child in node.get("composition") or []:
            children.append({
                "id": child,
                "level": (skills.get(child) or {}).get("level", "?"),
                "children": expand(child, path + [skill_id], depth + 1),
            })
        return children

    forest = []
    for root_id, s in sorted(skills.items()):
        if s.get("level") != "L4":
            continue
        clusters = []
        for cluster in CLUSTER_ORDER:
            members = [m for m in CLUSTER_MEMBERS[cluster] if m in skills]
            if not members:
                continue
            clusters.append({
                "cluster": cluster,
                "children": [
                    {"id": m, "level": skills[m].get("level", "L3"),
                     "children": expand(m, [root_id])}
                    for m in sorted(members)
                ],
            })
        forest.append({"id": root_id, "level": "L4", "children": clusters})

    # 4. 六层清单
    registry_layers = registry.get("layers", {})
    entries = registry.get("entries", [])
    layers = []
    for layer in ["skill", "cli", "agent", "api", "mcp", "plugin"]:
        if layer == "skill":
            items = [{"id": sid, "level": s.get("level"), "path": s.get("path"),
                      "cluster": cluster_map.get(sid), "source": "registry"}
                     for sid, s in sorted(skills.items())]
        else:
            items = [e for e in entries if e.get("layer") == layer]
        meta = registry_layers.get(layer, {})
        layers.append({"layer": layer, "title": meta.get("title", layer),
                       "auto": bool(meta.get("auto")), "count": len(items), "entries": items})

    # 5. 边集合（composition 边 + 集群归属边）
    edges = []
    for s in catalog.get("skills", []):
        for c in s.get("composition") or []:
            edges.append([s["id"], c])
    for sid, c in sorted(cluster_map.items()):
        if c:
            edges.append([c, sid])

    counts = {l["layer"]: l["count"] for l in layers}

    return {
        "tree_version": TREE_VERSION,
        "built_from": ["docs/operations/skill-catalog.json", "docs/operations/execution-layers.json"],
        "counts": counts,
        "cluster_map": {k: cluster_map[k] for k in sorted(cluster_map)},
        "layers": layers,
        "skill_forest": forest,
        "edges": sorted(edges),
        "issues": issues,
    }, issues


def render_md(tree):
    lines = [
        "# 执行层树（唯一真相源）",
        "",
        "> 本文件由 `skills/build-execution-tree` 自动生成，禁止人工编辑。",
        f"> 数据源：`skill-catalog.json` + `execution-layers.json`（tree_version {tree['tree_version']}）。",
        "",
        "## 1. 六执行层计数",
        "",
        "| 层级 | 名称 | 自动派生 | 条目数 |",
        "| :--- | :--- | :--- | ---: |",
    ]
    for l in tree["layers"]:
        lines.append(f"| `{l['layer']}` | {l['title']} | {'是' if l['auto'] else '否'} | {l['count']} |")

    lines += ["", "## 2. 非技能执行层条目", "",
              "| 层级 | ID | 父级 | 路径 | 来源 | 说明 |",
              "| :--- | :--- | :--- | :--- | :--- | :--- |"]
    rows = 0
    for l in tree["layers"]:
        if l["layer"] == "skill":
            continue
        for e in l["entries"]:
            rows += 1
            lines.append(f"| `{l['layer']}` | `{e.get('id')}` | `{e.get('parent') or '-'}` | "
                         f"`{e.get('path') or '-'}` | {e.get('source') or '-'} | {e.get('description') or ''} |")
    if rows == 0:
        lines.append("| - | *(暂无)* | - | - | - | - |")

    lines += ["", "## 3. 技能层树（L4 → 集群 → L3 → 原子）", ""]
    for root in tree["skill_forest"]:
        lines.append(f"- `{root['id']}` ({root['level']})")
        for cl in root["children"]:
            lines.append(f"  - {cl['cluster']}")
            for l3 in cl["children"]:
                lines.append(f"    - `{l3['id']}` ({l3['level']})")
                for atom in l3["children"]:
                    lines.append(f"      - `{atom['id']}` ({atom['level']})")
                    for sub in atom.get("children") or []:
                        lines.append(f"        - `{sub['id']}` ({sub['level']})")

    lines += ["", "## 4. 一致性问题（由 verify-execution-tree 判定是否阻断）", ""]
    if tree["issues"]:
        lines.append("| 类型 | 对象 | 说明 |")
        lines.append("| :--- | :--- | :--- |")
        for it in tree["issues"]:
            lines.append(f"| `{it['kind']}` | `{it['id']}` | {it['detail']} |")
    else:
        lines.append("- 无")

    return "\n".join(lines) + "\n"


def render_butler_block(tree):
    counts = tree["counts"]
    lines = [
        f"{BEGIN_PREFIX} 受管区块：由 skills/build-execution-tree 自动生成，禁止人工编辑 -->",
        "",
        "## 下属编制 (L1~L3 Subordinate Clusters)",
        "",
        f"管家当前纳管 6 个执行层，其中技能层 {counts.get('skill', 0)} 条"
        f"（cli {counts.get('cli', 0)} / agent {counts.get('agent', 0)} / api {counts.get('api', 0)}"
        f" / mcp {counts.get('mcp', 0)} / plugin {counts.get('plugin', 0)}）。",
        "",
        "完整树见 `docs/operations/execution-tree.md`（唯一真相源，禁止手写副本）。",
        "",
        "| 集群 | L3 总控 |",
        "| :--- | :--- |",
    ]
    for root in tree["skill_forest"]:
        for cl in root["children"]:
            members = "、".join(f"`{c['id']}`" for c in cl["children"])
            lines.append(f"| {cl['cluster']} | {members} |")
    lines.extend(["", END_MARK, ""])
    return "\n".join(lines) + "\n"


def find_marker_lines(lines):
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


def inject(existing, block):
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


def write_if_changed(path, payload):
    old = None
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            old = f.read()
    if old == payload:
        return False
    with open(path, "w", encoding="utf-8") as f:
        f.write(payload)
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the execution layer tree")
    parser.add_argument("--check", action="store_true", help="Detect staleness without writing")
    parser.add_argument("--json", action="store_true", help="JSON output")
    args = parser.parse_args()

    catalog, err = load_json(CATALOG_JSON)
    if catalog is None:
        print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
        return 1
    registry, err = load_json(REGISTRY_JSON)
    if registry is None:
        print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
        return 1

    tree, issues = build(catalog, registry)
    tree_payload = json.dumps(tree, ensure_ascii=False, sort_keys=True, indent=1) + "\n"
    md_payload = render_md(tree)

    if not os.path.exists(BUTLER_MD):
        print(json.dumps({"success": False, "error": f"not found: {BUTLER_MD}"},
                         ensure_ascii=False, indent=2))
        return 1
    with open(BUTLER_MD, "r", encoding="utf-8") as f:
        butler = f.read()
    butler_new, butler_changed = inject(butler, render_butler_block(tree))

    if args.check:
        stale = False
        for path, payload in ((TREE_JSON, tree_payload), (TREE_MD, md_payload)):
            if not os.path.exists(path):
                stale = True
                break
            with open(path, "r", encoding="utf-8") as f:
                if f.read() != payload:
                    stale = True
                    break
        stale = stale or butler_changed
        print(json.dumps({"success": not stale, "stale": stale, "issues": issues,
                          "counts": tree["counts"]}, ensure_ascii=False, indent=2))
        return 1 if stale else 0

    changed = write_if_changed(TREE_JSON, tree_payload)
    changed = write_if_changed(TREE_MD, md_payload) or changed
    if butler_changed:
        with open(BUTLER_MD, "w", encoding="utf-8") as f:
            f.write(butler_new)
        changed = True

    print(json.dumps({"success": True, "changed": changed, "counts": tree["counts"],
                      "issues": issues,
                      "outputs": ["docs/operations/execution-tree.json",
                                  "docs/operations/execution-tree.md",
                                  "skills/dsh-butler/SKILL.md"]},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
