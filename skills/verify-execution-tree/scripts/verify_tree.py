#!/usr/bin/env python3
"""
verify_tree.py
六项一致性检查：树 ↔ catalog ↔ 登记表 ↔ 受管区块，外加手写集群枚举漂移扫描。

Exit Code:
  0 - 六项检查全部通过
  1 - 任一项失败
"""

import os
import re
import sys
import json
import glob
import argparse
import subprocess

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
TREE_JSON = os.path.join(REPO_ROOT, "docs/operations/execution-tree.json")
CATALOG_JSON = os.path.join(REPO_ROOT, "docs/operations/skill-catalog.json")
REGISTRY_JSON = os.path.join(REPO_ROOT, "docs/operations/execution-layers.json")
BUILD_SCRIPT = os.path.join(REPO_ROOT, "skills/build-execution-tree/scripts/build_tree.py")

LAYERS = ["skill", "cli", "agent", "api", "mcp", "plugin"]
# 判据用「集群名」而非圈码：①②③ 在中文里被当普通编号用得太滥，
# 拿它当漂移信号会误伤（已实测误报 change-log 的一行修复列举）。
# 真正的漂移是「有人又手写了一张集群表」，那种行必然出现集群名。
CLUSTER_NAMES = ["意图与路由", "契约与合规", "冲突·冗余·质量", "输出规约",
                 "需求与透视", "外部纳管", "技能引入与演进"]
MANAGED_RE = re.compile(r"<!-- (CATALOG|TREE):BEGIN.*?<!-- (CATALOG|TREE):END -->", re.S)
ENUM_LINE_RE = re.compile(r"^\s*[-*>|].*$")


def load(path):
    if not os.path.exists(path):
        return None, f"not found: {path}"
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f), None
    except (OSError, ValueError) as exc:
        return None, f"unreadable: {path}: {exc}"


def strip_managed(text):
    """把受管区块整段替换为等长空行，保持行号不变。"""
    def repl(m):
        return "\n" * m.group(0).count("\n")
    return MANAGED_RE.sub(repl, text)


def scan_handwritten_cluster_enum():
    issues = []
    targets = sorted(glob.glob(os.path.join(REPO_ROOT, "skills/**/*.md"), recursive=True))
    targets += sorted(glob.glob(os.path.join(REPO_ROOT, "docs/requirements/*.md")))
    for path in targets:
        try:
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
        except (OSError, UnicodeDecodeError):
            continue
        stripped = strip_managed(text)
        for lineno, line in enumerate(stripped.splitlines(), start=1):
            if not ENUM_LINE_RE.match(line):
                continue
            marks = sum(1 for m in CLUSTER_NAMES if m in line)
            if marks >= 3:
                issues.append({"check": "C7", "kind": "handwritten_cluster_enum",
                               "file": os.path.relpath(path, REPO_ROOT), "line": lineno,
                               "detail": "受管区块外出现手写集群枚举（同行出现 ≥3 个集群名）"})
    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify execution tree consistency")
    parser.add_argument("--json", action="store_true", help="JSON output")
    args = parser.parse_args()

    checks = []
    issues = []

    tree, err = load(TREE_JSON)
    catalog, err2 = load(CATALOG_JSON)
    registry, err3 = load(REGISTRY_JSON)
    if tree is None or catalog is None or registry is None:
        for e in (err, err2, err3):
            if e:
                issues.append({"check": "C0", "kind": "missing_input", "file": e.split(":")[0], "line": 0, "detail": e})
        print(json.dumps({"success": False, "checks": [], "issues": issues}, ensure_ascii=False, indent=2))
        return 1

    skills = {s["id"]: s for s in catalog.get("skills", [])}
    local_skills = {k: v for k, v in skills.items() if v.get("scope") == "local-pool"}

    # C1 计数一致
    tree_skill_layer = next((l for l in tree.get("layers", []) if l["layer"] == "skill"), None)
    c1_ok = tree_skill_layer is not None and tree_skill_layer["count"] == len(skills)
    checks.append({"name": "C1_skill_count_matches_catalog", "pass": c1_ok,
                   "detail": f"tree={tree_skill_layer['count'] if tree_skill_layer else 'NA'} catalog={len(skills)}"})

    # C2 L3 集群归属唯一（L4 是树根，不要求归属集群）
    cluster_map = tree.get("cluster_map", {})
    l3_only = [sid for sid, s in skills.items() if s.get("level") == "L3"]
    missing = [sid for sid in l3_only if sid not in cluster_map]
    c2_ok = not missing
    checks.append({"name": "C2_l3_cluster_assigned", "pass": c2_ok,
                   "detail": f"未归属: {missing}" if missing else f"{len(l3_only)} 个 L3 均已归属"})
    for sid in missing:
        issues.append({"check": "C2", "kind": "unassigned_l3", "id": sid, "file": "execution-tree.json",
                       "line": 0, "detail": "L3 技能无集群归属"})

    # C3 孤儿原子
    orphans = [i["id"] for i in tree.get("issues", []) if i.get("kind") == "orphan_atom"]
    c3_ok = not orphans
    checks.append({"name": "C3_no_orphan_atom", "pass": c3_ok,
                   "detail": f"孤儿原子: {orphans}" if orphans else "无孤儿原子"})
    for sid in orphans:
        issues.append({"check": "C3", "kind": "orphan_atom", "id": sid, "file": "skill-catalog.json",
                       "line": 0, "detail": "本地 L1/L2 无父级引用"})

    # C4 依赖健康
    bad = [i for i in tree.get("issues", []) if i.get("kind") in ("composition_cycle", "missing_dependency", "max_depth")]
    c4_ok = not bad
    checks.append({"name": "C4_dependency_healthy", "pass": c4_ok,
                   "detail": f"{len(bad)} 个依赖问题" if bad else "无环、无缺失依赖"})
    for it in bad:
        issues.append({"check": "C4", "kind": it["kind"], "id": it["id"], "file": "skill-catalog.json",
                       "line": 0, "detail": it["detail"]})

    # C5 受管区块与产物最新
    proc = subprocess.run([sys.executable, BUILD_SCRIPT, "--check"], capture_output=True, text=True)
    c5_ok = proc.returncode == 0
    checks.append({"name": "C5_tree_up_to_date", "pass": c5_ok,
                   "detail": "已最新" if c5_ok else "陈旧：需重跑 build-execution-tree"})
    if not c5_ok:
        issues.append({"check": "C5", "kind": "stale_tree", "file": "docs/operations/execution-tree.json",
                       "line": 0, "detail": "树或受管区块落后于 catalog/登记表"})

    # C6 登记表条目合法
    bad_entries = []
    for e in registry.get("entries", []):
        layer = e.get("layer")
        if layer not in LAYERS:
            bad_entries.append((e.get("id"), f"illegal layer {layer!r}"))
            continue
        if e.get("source", "repo") == "repo":
            p = e.get("path")
            if not p or not os.path.exists(os.path.join(REPO_ROOT, p)):
                bad_entries.append((e.get("id"), f"path not found: {p}"))
    c6_ok = not bad_entries
    checks.append({"name": "C6_registry_entries_valid", "pass": c6_ok,
                   "detail": f"{bad_entries}" if bad_entries else f"{len(registry.get('entries', []))} 条合法"})
    for eid, detail in bad_entries:
        issues.append({"check": "C6", "kind": "invalid_registry_entry", "id": eid,
                       "file": "execution-layers.json", "line": 0, "detail": detail})

    # C7 手写集群枚举漂移
    drift = scan_handwritten_cluster_enum()
    c7_ok = not drift
    checks.append({"name": "C7_no_handwritten_cluster_enum", "pass": c7_ok,
                   "detail": f"{len(drift)} 处漂移" if drift else "无手写集群枚举"})
    issues.extend(drift)

    success = all(c["pass"] for c in checks)
    print(json.dumps({"success": success, "checks": checks, "issue_count": len(issues),
                      "issues": issues}, ensure_ascii=False, indent=2))
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
