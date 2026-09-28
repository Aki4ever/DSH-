#!/usr/bin/env python3
"""
classify_instance_safety.py
静态扫描执行层脚本，判定 safe_multi / needs_lock / single_only 三档。

Exit Code:
  0 - 扫描完成
  1 - --skill 指定的技能不存在
  2 - 未给出 --all/--skill，或 catalog 不可读
"""

import os
import re
import sys

sys.dont_write_bytecode = True

import json
import argparse

# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../skill-pool"))
REPO_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
_SKILLS_CANDIDATE = os.path.join(os.path.dirname(REPO_ROOT), "skills")
SKILLS_ROOT = _SKILLS_CANDIDATE if os.path.isdir(_SKILLS_CANDIDATE) else os.path.join(REPO_ROOT, "skills")
SKILLS_DIR = SKILLS_ROOT
CATALOG_JSON = os.path.join(REPO_ROOT, "docs/operations/skill-catalog.json")
OUT_JSON = os.path.join(REPO_ROOT, "docs/operations/instance-safety.json")

WRITE_APIS = [
    (r"\.write_text\s*\(", "write_text"),
    (r"\.write_bytes\s*\(", "write_bytes"),
    (r"json\.dump\s*\(", "json.dump"),
    (r"os\.makedirs\s*\(", "os.makedirs"),
    (r"open\s*\([^)]*['\"][wa]\+?['\"]", "open-w"),
]
NONDETERMINISM = [
    (r"datetime\.now\s*\(", "datetime.now"),
    (r"time\.time\s*\(", "time.time"),
    (r"\brandom\.", "random"),
    (r"\buuid\.", "uuid"),
    (r"date\.today\s*\(", "date.today"),
]
TEMP_SIGNALS = [
    (r"tempfile\.(mkdtemp|mkstemp|NamedTemporaryFile)\s*\(", "tempfile(唯一键)"),
    (r"\btempfile\.", "tempfile"),
    (r"['\"]/tmp/", "/tmp 字面量"),
]
# 唯一临时键：mkdtemp / mkstemp / NamedTemporaryFile 每次都由内核分配互不相同的新路径，
# 并发实例各写各的目录，因此**不构成共享写**，不得据此判为 single_only。
UNIQUE_TEMP_RE = re.compile(r"tempfile\.(mkdtemp|mkstemp|NamedTemporaryFile)\s*\(")
# 声明式资源键：脚本内用 `[shared-resource] <键>` 显式声明自己独占的资源键，
# 与 detect-layer-coupling 的共享资源标记同源同写法，避免分类器靠猜。
SHARED_RESOURCE_RE = re.compile(r"\[shared-resource\]\s*(\S+)")
LITERAL_PATH_RE = re.compile(r"['\"]([A-Za-z0-9._~@%+\-/]*/[A-Za-z0-9._~@%+\-/]*\.(?:json|jsonl|md|txt|html|csv))['\"]")


def load_catalog():
    try:
        with open(CATALOG_JSON, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def scan_script(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
    except (OSError, UnicodeDecodeError):
        return {"write": [], "nondeterminism": [], "temp": [], "literal_paths": [],
                "unique_temp": False, "declared_keys": []}

    write = [name for pattern, name in WRITE_APIS if re.search(pattern, text)]
    nondet = [name for pattern, name in NONDETERMINISM if re.search(pattern, text)]
    temp = [name for pattern, name in TEMP_SIGNALS if re.search(pattern, text)]
    literals = sorted(set(LITERAL_PATH_RE.findall(text)))
    return {"write": write, "nondeterminism": nondet, "temp": temp, "literal_paths": literals,
            "unique_temp": bool(UNIQUE_TEMP_RE.search(text)),
            "declared_keys": sorted(set(SHARED_RESOURCE_RE.findall(text)))}


def classify_skill(skill_id):
    skill_dir = os.path.join(SKILLS_DIR, skill_id)
    if not os.path.isdir(skill_dir):
        return None

    scripts = []
    scripts_dir = os.path.join(skill_dir, "scripts")
    if os.path.isdir(scripts_dir):
        scripts = sorted(f for f in os.listdir(scripts_dir) if f.endswith(".py"))

    signals = {"write": [], "nondeterminism": [], "temp": [], "literal_paths": []}
    unique_temp = False
    declared_keys = set()
    for name in scripts:
        found = scan_script(os.path.join(scripts_dir, name))
        for key in signals:
            signals[key].extend(found[key])
        unique_temp = unique_temp or found.get("unique_temp", False)
        declared_keys.update(found.get("declared_keys") or [])
    for key in signals:
        signals[key] = sorted(set(signals[key]))

    has_write = bool(signals["write"])
    has_literal = bool(signals["literal_paths"])
    has_temp = bool(signals["temp"])
    # 唯一临时键（mkdtemp/mkstemp/NamedTemporaryFile）每次都拿到新路径，不构成共享写，
    # 因此只有「固定临时路径」才把档位压到 single_only。
    has_fixed_temp = has_temp and not unique_temp

    if not has_write and not has_temp:
        safety = "safe_multi"
        reason = "无写盘、无固定临时文件，可无锁并发"
    elif has_literal or has_fixed_temp:
        safety = "single_only"
        reason = "写盘目标为字面量固定路径或固定临时文件，并发会互相覆盖，必须串行"
    else:
        safety = "needs_lock"
        reason = "有写盘但目标路径非字面量（含 tempfile 唯一键），同一资源键上必须持锁"

    resource_keys = sorted(set(signals["literal_paths"]) | declared_keys)
    if safety == "needs_lock" and not resource_keys:
        resource_keys = [f"skills/{skill_id}"]

    return {
        "id": skill_id,
        "instance_safety": safety,
        "reason": reason,
        "signals": {
            "write": signals["write"],
            "nondeterminism": signals["nondeterminism"],
            "temp": signals["temp"],
        },
        "resource_keys": resource_keys,
        "scripts": scripts,
    }


def dump_file(path, payload):
    old = None
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            old = f.read()
    if old == payload:
        return False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(payload)
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Classify concurrency safety of execution layers")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--skill", action="append", default=[])
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    catalog = load_catalog()
    if catalog is None:
        print(json.dumps({"success": False, "error": "catalog unreadable"}, ensure_ascii=False, indent=2))
        return 2

    local_ids = [s["id"] for s in catalog.get("skills", []) if s.get("scope") == "local-pool"]

    if args.all:
        targets = local_ids
    elif args.skill:
        targets = args.skill
        missing = [t for t in targets if t not in local_ids]
        if missing:
            print(json.dumps({"success": False, "error": f"skill not found: {missing}"},
                             ensure_ascii=False, indent=2))
            return 1
    else:
        print(json.dumps({"success": False, "error": "give --all or --skill"},
                         ensure_ascii=False, indent=2))
        return 2

    results = []
    issues = []
    for sid in targets:
        item = classify_skill(sid)
        if item is None:
            issues.append({"kind": "missing_dir", "skill": sid})
            continue
        if item["instance_safety"] in ("needs_lock", "single_only") and not item["resource_keys"]:
            issues.append({"kind": "empty_resource_keys", "skill": sid})
        results.append(item)

    counts = {"safe_multi": 0, "needs_lock": 0, "single_only": 0}
    for item in results:
        counts[item["instance_safety"]] += 1

    payload = {
        "table_version": "1.0.0",
        "scanned": len(results),
        "counts": counts,
        "skills": results,
        "issues": issues,
    }

    if args.write:
        body = json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=1) + "\n"
        changed = dump_file(OUT_JSON, body)
        print(json.dumps({"success": True, "written": OUT_JSON, "changed": changed,
                          "counts": counts, "issues": issues}, ensure_ascii=False, indent=1))
        return 0

    print(json.dumps({"success": True, **payload}, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
