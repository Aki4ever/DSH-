#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
audit_naming.py
全量执行层命名体检：按 capability-naming-policy 的四要素与四种形态逐条扫描，
输出违规清单（含违规码、对象、位置与人类可读证据）。

判据实现唯一来源：skills/audit-layer-naming/scripts/naming_rules.py
真相源：docs/operations/capability-naming.json

Exit Code:
  0 - 零违规（compliance_rate == 1.0000）
  1 - 存在违规
  2 - 输入不可读（catalog / 词表 / 登记表缺失或不可解析）
"""

import sys

sys.dont_write_bytecode = True

import os
import json
import argparse
import importlib.util

EXIT_OK = 0
EXIT_VIOLATION = 1
EXIT_INPUT = 2

HERE = os.path.dirname(os.path.abspath(__file__))
POOL_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
RULES_PATH = os.path.join(HERE, "naming_rules.py")


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def load_rules():
    if not os.path.isfile(RULES_PATH):
        return None
    spec = importlib.util.spec_from_file_location("dsh_naming_rules", RULES_PATH)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main(argv):
    parser = argparse.ArgumentParser(
        prog="audit_naming.py",
        description="全量执行层命名体检：四要素 + 四种形态 + 禁词 + 同义归一 + 唯一性 + 三处一致",
    )
    parser.add_argument("--all", action="store_true", help="扫描全量（默认行为）")
    parser.add_argument("--root", default=POOL_ROOT, help="技能池根目录")
    parser.add_argument("--spec", default=None, help="capability-naming.json 路径覆盖")
    parser.add_argument("--codes", default=None, help="只看指定违规码，逗号分隔")
    parser.add_argument("--limit", type=int, default=0, help="最多输出多少条违规，0 表示不限")
    parser.add_argument("--json", action="store_true", help="兼容开关；脚本恒输出 JSON")
    args = parser.parse_args(argv)

    rules = load_rules()
    if rules is None:
        emit({"error": "rules_missing", "detail": "找不到 %s" % RULES_PATH})
        return EXIT_INPUT

    report, error = rules.evaluate(args.root, args.spec)
    if report is None:
        emit({"error": "input_unreadable", "detail": error})
        return EXIT_INPUT

    violations = report["violations"]
    if args.codes:
        wanted = {code.strip() for code in args.codes.split(",") if code.strip()}
        violations = [v for v in violations if v["code"] in wanted]
    shown = violations if args.limit <= 0 else violations[:args.limit]

    payload = {
        "success": report["compliance"]["violations"] == 0,
        "root": args.root,
        "spec_version": report["spec_version"],
        "compliance": report["compliance"],
        "violation_codes": report["violation_codes"],
        "violations": shown,
        "violations_shown": len(shown),
        "violations_total": len(violations),
        "registry_violation_codes": report["registry_violation_codes"],
        "registry_violations": report["registry_violations"],
    }
    payload["verdict"] = "naming_compliant" if payload["success"] else "naming_violations_found"
    emit(payload)
    return EXIT_OK if payload["success"] else EXIT_VIOLATION


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
