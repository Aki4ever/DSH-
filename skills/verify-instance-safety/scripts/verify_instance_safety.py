#!/usr/bin/env python3
"""
verify_instance_safety.py
断言实例安全声明表：齐全、不陈旧、档位与证据一致、受限档位带资源键。

Exit Code:
  0 - 四项断言全部通过
  1 - 存在缺声明 / 陈旧 / 矛盾 / 资源键为空
  2 - 声明表缺失或 catalog 不可读
"""

import os
import sys

sys.dont_write_bytecode = True

import json
import argparse
import importlib.util

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
CATALOG_JSON = os.path.join(REPO_ROOT, "docs/operations/skill-catalog.json")
TABLE_JSON = os.path.join(REPO_ROOT, "docs/operations/instance-safety.json")
CLASSIFY_SCRIPT = os.path.join(REPO_ROOT, "skills/classify-instance-safety/scripts/classify_instance_safety.py")


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify instance safety declarations")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if not os.path.exists(TABLE_JSON):
        print(json.dumps({"success": False, "error": f"declaration table not found: {TABLE_JSON}",
                          "hint": "run classify-instance-safety --all --write first"},
                         ensure_ascii=False, indent=1))
        return 2

    try:
        with open(TABLE_JSON, "r", encoding="utf-8") as f:
            table = json.load(f)
        with open(CATALOG_JSON, "r", encoding="utf-8") as f:
            catalog = json.load(f)
    except (OSError, ValueError) as exc:
        print(json.dumps({"success": False, "error": f"unreadable input: {exc}"},
                         ensure_ascii=False, indent=1))
        return 2

    if not os.path.exists(CLASSIFY_SCRIPT):
        print(json.dumps({"success": False, "error": "classify-instance-safety script missing"},
                         ensure_ascii=False, indent=1))
        return 2

    classify = _load(CLASSIFY_SCRIPT, "instance_classify")
    declared = {item["id"]: item for item in table.get("skills", [])}
    local_ids = [s["id"] for s in catalog.get("skills", []) if s.get("scope") == "local-pool"]

    checks = []
    missing, stale, inconsistent, empty_keys = [], [], [], []

    for sid in local_ids:
        if sid not in declared:
            missing.append(sid)
            continue
        scanned = classify.classify_skill(sid)
        if scanned is None:
            missing.append(sid)
            continue
        if scanned["instance_safety"] != declared[sid].get("instance_safety"):
            stale.append({
                "skill": sid,
                "declared": declared[sid].get("instance_safety"),
                "actual": scanned["instance_safety"],
            })
        if declared[sid].get("instance_safety") == "safe_multi" and scanned["signals"]["write"]:
            inconsistent.append({"skill": sid, "evidence": scanned["signals"]["write"]})
        if declared[sid].get("instance_safety") in ("needs_lock", "single_only") \
                and not declared[sid].get("resource_keys"):
            empty_keys.append(sid)

    checks.append({"name": "C1_declared_all", "pass": not missing,
                   "detail": f"缺失声明: {missing[:8]}" if missing else f"{len(local_ids)} 个本地技能均有声明"})
    checks.append({"name": "C2_declarations_fresh", "pass": not stale,
                   "detail": f"陈旧: {stale[:5]}" if stale else "声明与实际扫描一致"})
    checks.append({"name": "C3_safe_multi_has_no_write", "pass": not inconsistent,
                   "detail": f"档位与证据矛盾: {inconsistent[:5]}" if inconsistent else "safe_multi 均无写盘证据"})
    checks.append({"name": "C4_restricted_has_resource_keys", "pass": not empty_keys,
                   "detail": f"资源键为空: {empty_keys[:8]}" if empty_keys else "受限档位资源键均非空"})

    success = all(c["pass"] for c in checks)
    print(json.dumps({
        "success": success, "checks": checks, "scanned": len(local_ids),
        "declared": len(declared),
        "violations": {"missing": missing, "stale": stale,
                       "inconsistent": inconsistent, "empty_resource_keys": empty_keys},
    }, ensure_ascii=False, indent=1))
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
