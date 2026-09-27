#!/usr/bin/env python3
"""
verify_decoupling.py
断言五类耦合违规为零；--allow 可显式豁免并在输出中标注 waived。

Exit Code:
  0 - 无未豁免违规
  1 - 存在未豁免违规
  2 - 输入缺失/不可读
"""

import os
import sys

sys.dont_write_bytecode = True

import json
import argparse
import importlib.util

DEFAULT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
DETECT_SCRIPT = "skills/detect-layer-coupling/scripts/detect_coupling.py"

KINDS = ["reverse_dependency", "dependency_cycle", "cross_layer_jump",
         "implicit_dependency", "shared_mutable_state"]


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    parser = argparse.ArgumentParser(description="Assert zero layer coupling violations")
    parser.add_argument("--root", default=DEFAULT_ROOT)
    parser.add_argument("--allow", default="", help="逗号分隔的豁免类别")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    allowed = {k.strip() for k in args.allow.split(",") if k.strip()}
    unknown = allowed - set(KINDS)
    if unknown:
        print(json.dumps({"success": False, "error": f"unknown kind in --allow: {sorted(unknown)}",
                          "allowed_kinds": KINDS}, ensure_ascii=False, indent=1))
        return 2

    detect_path = os.path.join(args.root, DETECT_SCRIPT)
    if not os.path.exists(detect_path):
        print(json.dumps({"success": False, "error": f"detector not found: {detect_path}"},
                         ensure_ascii=False, indent=1))
        return 2

    detector = _load(detect_path, "layer_coupling_detect")
    result, err = detector.detect(args.root)
    if result is None:
        print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=1))
        return 2

    waived, blocking = [], []
    for v in result["violations"]:
        (waived if v["kind"] in allowed else blocking).append(v)

    checks = []
    for kind in KINDS:
        n = len([v for v in blocking if v["kind"] == kind])
        checks.append({"name": f"no_{kind}", "pass": n == 0,
                       "detail": f"{n} 条" if n else "零违规"})

    success = not blocking
    print(json.dumps({
        "success": success,
        "scanned_skills": result["scanned_skills"],
        "edges": result["edges"],
        "blocking_count": len(blocking),
        "waived_count": len(waived),
        "checks": checks,
        "violations": blocking,
        "waived": waived,
    }, ensure_ascii=False, indent=1))
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
