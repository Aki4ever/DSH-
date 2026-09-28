#!/usr/bin/env python3
"""
detect_coupling.py
检测执行层五类耦合违规（DC-01 ~ DC-05），判据口径来自 layer-decoupling-policy。

Exit Code:
  0 - 无违规
  1 - 有违规
  2 - 输入缺失/不可读
"""

import os
import re
import sys

sys.dont_write_bytecode = True

import json
import argparse
import importlib.util

# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../skill-pool"))
DEFAULT_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
_SKILLS_CANDIDATE = os.path.join(os.path.dirname(DEFAULT_ROOT), "skills")
SKILLS_ROOT = _SKILLS_CANDIDATE if os.path.isdir(_SKILLS_CANDIDATE) else os.path.join(DEFAULT_ROOT, "skills")
PROJECT_ROOT = os.path.dirname(SKILLS_ROOT)
BUILD_SCRIPT = "skills/build-layer-graph/scripts/build_layer_graph.py"

LEVEL_RANK = {"L1": 1, "L2": 2, "L3": 3, "L4": 4}

# DC-04：脚本里加载同仓模块的路径常量
LOADED_SKILL_RE = re.compile(r"[`\"']skills/([a-z0-9][a-z0-9\-]*)/scripts/")
IMPORTLIB_RE = re.compile(r"importlib\.util\.spec_from_file_location|spec_from_file_location\s*\(")

# DC-05：写盘调用与其目标字面量
WRITE_CALL_RES = [
    re.compile(r"\.write_text\s*\("),
    re.compile(r"\.write_bytes\s*\("),
    re.compile(r"json\.dump\s*\("),
]
OPEN_W_RE = re.compile(r"open\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"][wa]")
WRITE_PATH_LITERAL_RE = re.compile(r"['\"]([A-Za-z0-9._~@%+\-/]*/[A-Za-z0-9._~@%+\-/]*\.(?:json|jsonl|md|txt|html|csv))['\"]")
SHARED_MARKER_RE = re.compile(r"\[shared-resource\]\s*(\S+)")


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_json(path):
    if not os.path.exists(path):
        return None, f"not found: {path}"
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f), None
    except (OSError, ValueError) as exc:
        return None, f"unreadable: {path}: {exc}"


def read_text(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except (OSError, UnicodeDecodeError):
        return ""


def composition_line(skill_md_text, dep):
    """定位 composition 中某条依赖所在行号（1 起）。"""
    for idx, line in enumerate(skill_md_text.splitlines(), start=1):
        if re.match(r"^\s*-\s+", line) and line.strip()[2:].strip().strip('"').strip("'") == dep:
            return idx
    return 0


def find_cycles(adjacency):
    """返回去重后的有向环列表（每个环用规范化起点表示）。"""
    cycles = set()
    nodes = sorted(adjacency)

    def canonical(body):
        if not body:
            return tuple()
        i = body.index(min(body))
        return tuple(body[i:] + body[:i])

    def walk(node, path, visited):
        for nxt in adjacency.get(node, []):
            if nxt in path:
                cycles.add(canonical(path[path.index(nxt):]))
                continue
            if nxt in visited:
                continue
            walk(nxt, path + [nxt], visited | {nxt})

    for n in nodes:
        walk(n, [n], {n})
    return [list(c) for c in sorted(cycles)]


def write_targets(text):
    """返回该脚本的写目标字面量路径（含行号）。DC-05 专用：只认写盘调用附近的目标。"""
    found = []
    lines = text.splitlines()
    for idx, line in enumerate(lines, start=1):
        m = OPEN_W_RE.search(line)
        if m:
            found.append((m.group(1), idx))
            continue
        if any(rx.search(line) for rx in WRITE_CALL_RES):
            for path in WRITE_PATH_LITERAL_RE.findall(line):
                found.append((path, idx))
    return found


def shared_markers(skill_dir):
    markers = set()
    for name in ("SKILL.md", "README.md"):
        text = read_text(os.path.join(skill_dir, name))
        for m in SHARED_MARKER_RE.finditer(text):
            markers.add(m.group(1).lstrip("./"))
    return markers


def detect(root=DEFAULT_ROOT):
    catalog, err = load_json(os.path.join(root, "docs/operations/skill-catalog.json"))
    if catalog is None:
        return None, err
    registry, err = load_json(os.path.join(root, "docs/operations/execution-layers.json"))
    if registry is None:
        return None, err

    # 建图工具始终从本技能所在仓库加载：--root 只重定向「被测对象」，
    # 不应把检测器自己的依赖也指向被测根目录。
    build = _load(os.path.join(PROJECT_ROOT, BUILD_SCRIPT), "layer_graph_build")
    graph = build.build(catalog, registry)

    levels = {n["id"]: n["level"] for n in graph["nodes"]}
    compositions = {n["id"]: n["composition"] for n in graph["nodes"]}
    skills_dir = os.path.join(os.path.dirname(root), "skills") if os.path.isdir(
        os.path.join(os.path.dirname(root), "skills")) else os.path.join(root, "skills")

    violations = []

    # DC-01 逆向依赖 / DC-03 跨层跳跃
    for edge in graph["edges"]:
        u, v = edge["from"], edge["to"]
        lu, lv = levels.get(u), levels.get(v)
        if lu is None or lv is None:
            continue
        text = read_text(os.path.join(skills_dir, u, "SKILL.md"))
        line = composition_line(text, v)
        if LEVEL_RANK[lv] > LEVEL_RANK[lu]:
            violations.append({
                "kind": "reverse_dependency", "from": u, "to": v,
                "evidence": f"{u}({lu}) 引用更高层 {v}({lv})",
                "file": f"skills/{u}/SKILL.md", "line": line,
            })
        if LEVEL_RANK[lu] <= 2 and lv == "L4":
            violations.append({
                "kind": "cross_layer_jump", "from": u, "to": v,
                "evidence": f"{u}({lu}) 直接引用 L4 中枢 {v}，跳过复合流程层",
                "file": f"skills/{u}/SKILL.md", "line": line,
            })

    # DC-02 依赖环
    adjacency = {}
    for edge in graph["edges"]:
        adjacency.setdefault(edge["from"], []).append(edge["to"])
    for cycle in find_cycles(adjacency):
        body = cycle + [cycle[0]]
        violations.append({
            "kind": "dependency_cycle", "from": cycle[0], "to": cycle[-1],
            "evidence": "composition 成环: " + " → ".join(body),
            "file": f"skills/{cycle[0]}/SKILL.md", "line": 0,
        })

    # DC-04 隐式耦合 / DC-05 共享可变状态
    writers = {}
    for sid in sorted(levels):
        if levels[sid] not in LEVEL_RANK:
            continue
        skill_dir = os.path.join(skills_dir, sid)
        scripts_dir = os.path.join(skill_dir, "scripts")
        if not os.path.isdir(scripts_dir):
            continue
        declared = set(compositions.get(sid) or [])
        markers = shared_markers(skill_dir)

        for name in sorted(f for f in os.listdir(scripts_dir) if f.endswith(".py")):
            path = os.path.join(scripts_dir, name)
            text = read_text(path)
            rel = f"skills/{sid}/scripts/{name}"

            if IMPORTLIB_RE.search(text):
                for lineno, line in enumerate(text.splitlines(), start=1):
                    for target in LOADED_SKILL_RE.findall(line):
                        if target == sid or target in declared:
                            continue
                        violations.append({
                            "kind": "implicit_dependency", "from": sid, "to": target,
                            "evidence": f"脚本 importlib 加载 skills/{target}，但 {target} 未出现在 composition 中",
                            "file": rel, "line": lineno,
                        })

            for target, lineno in write_targets(text):
                writers.setdefault(target.lstrip("./"), set()).add(sid)
                if target.lstrip("./") in markers:
                    continue

    for target, owners in sorted(writers.items()):
        if len(owners) < 2:
            continue
        missing = sorted(o for o in owners
                         if target not in shared_markers(os.path.join(skills_dir, o)))
        if not missing:
            continue
        violations.append({
            "kind": "shared_mutable_state", "from": sorted(owners)[0], "to": target,
            "evidence": f"路径 {target} 被 {sorted(owners)} 写入，未登记者: {missing}",
            "file": f"skills/{missing[0]}/SKILL.md", "line": 0,
        })

    counts = {}
    for v in violations:
        counts[v["kind"]] = counts.get(v["kind"], 0) + 1

    return {
        "success": not violations,
        "scanned_skills": len(levels),
        "edges": graph["edge_count"],
        "violations": violations,
        "counts": counts,
    }, None


def main() -> int:
    parser = argparse.ArgumentParser(description="Detect layer coupling violations (DC-01..DC-05)")
    parser.add_argument("--root", default=DEFAULT_ROOT)
    parser.add_argument("--skill", action="append", default=[])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result, err = detect(args.root)
    if result is None:
        print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=1))
        return 2

    if args.skill:
        wanted = set(args.skill)
        result["violations"] = [v for v in result["violations"]
                                if v.get("from") in wanted or v.get("to") in wanted]
        result["success"] = not result["violations"]

    print(json.dumps(result, ensure_ascii=False, indent=1))
    return 0 if result["success"] else 1


if __name__ == "__main__":
    sys.exit(main())
