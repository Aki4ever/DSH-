#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_naming.py
执行层命名整改后的硬断言器：合规率必须为 1.0000，且旧名残留引用必须为 0。

三项断言（--strict 下全过才 exit 0）：
  naming_compliant   合规率 == 1.0000 且违规清单为空（判据实现复用 naming_rules.py）
  no_dangling_ref    全仓扫描 retired-names.json 里的每个旧名，出现次数必须为 0
  registry_clean     执行层登记表（execution-layers.json）零违规

判据实现唯一来源：skills/audit-layer-naming/scripts/naming_rules.py
Exit Code:
  0 - 断言全过
  1 - 任一断言失败
  2 - 输入不可读（词表 / catalog / 登记表缺失或不可解析）
"""

import sys

sys.dont_write_bytecode = True

import os
import re
import json
import argparse
import importlib.util

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_INPUT = 2

HERE = os.path.dirname(os.path.abspath(__file__))
POOL_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
RULES_PATH = os.path.join(POOL_ROOT, "skills", "audit-layer-naming", "scripts", "naming_rules.py")
RETIRED_PATH = os.path.join(POOL_ROOT, "docs", "operations", "retired-names.json")

SKIP_DIRS = {".git", "__pycache__", "node_modules", ".venv"}
TEXT_SUFFIXES = {".md", ".json", ".py", ".sh", ".mjs", ".cjs", ".js", ".ts", ".txt", ".yaml", ".yml", ".toml"}


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


def load_retired():
    """返回 (旧名行, 允许出现的上下文清单)。

    `allowed_contexts` 用于**改名台账本身与整改器证据表**：一份记录「谁被改成了什么」的文档，
    必然要写出旧名，否则台账失去意义。允许清单是显式、逐文件、带理由的，不是通配——
    清单之外任何一处旧名出现，仍然是硬失败。
    """
    if not os.path.isfile(RETIRED_PATH):
        return [], {}
    try:
        with open(RETIRED_PATH, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, ValueError):
        return [], {}
    rows = [row for row in payload.get("renames", []) if row.get("from")]
    allowed = {}
    for item in payload.get("allowed_contexts") or []:
        path = item.get("path")
        if path:
            allowed[path] = item.get("reason", "")
    return rows, allowed


def needle_pattern(needle):
    """旧名必须按「词边界」匹配，不能按子串匹配。

    追加后缀式改名会让**新名把旧名整体包含为自己的前缀**（旧名 + 一个编排名词尾段）。
    纯子串扫描会把这类已经改好的新名，全部误报成残留引用。
    边界定义为：两侧都不能是 ASCII 字母数字或连字符。
    """
    return re.compile(r"(?<![a-z0-9-])" + re.escape(needle) + r"(?![a-z0-9-])")


def scan(root, needles, skip_paths):
    """返回 {needle: [{path, first_line, count}]}，只统计词边界命中的文件。"""
    result = {needle: [] for needle in needles}
    patterns = {needle: needle_pattern(needle) for needle in needles}
    skipped = {os.path.abspath(p) for p in skip_paths}
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            path = os.path.join(dirpath, name)
            if os.path.abspath(path) in skipped:
                continue
            if os.path.splitext(name)[1] not in TEXT_SUFFIXES:
                continue
            try:
                with open(path, "r", encoding="utf-8") as handle:
                    text = handle.read()
            except (OSError, UnicodeDecodeError):
                continue
            for needle in needles:
                matches = patterns[needle].findall(text)
                if not matches:
                    continue
                first_line = 0
                for index, line in enumerate(text.splitlines(), start=1):
                    if patterns[needle].search(line):
                        first_line = index
                        break
                result[needle].append({
                    "path": os.path.relpath(path, root),
                    "count": len(matches),
                    "first_line": first_line,
                    })
    for needle in result:
        result[needle].sort(key=lambda item: item["path"])
    return result


def main(argv):
    parser = argparse.ArgumentParser(
        prog="verify_naming.py",
        description="命名合规率与旧名残留引用双断言",
    )
    parser.add_argument("--strict", action="store_true", help="额外要求零违规（等价于合规率必须为 1.0000）")
    parser.add_argument("--root", default=POOL_ROOT, help="技能池根目录")
    parser.add_argument("--json", action="store_true", help="兼容开关；脚本恒输出 JSON")
    args = parser.parse_args(argv)

    rules = load_rules()
    if rules is None:
        emit({"error": "rules_missing", "detail": RULES_PATH})
        return EXIT_INPUT
    report, error = rules.evaluate(args.root)
    if report is None:
        emit({"error": "input_unreadable", "detail": error})
        return EXIT_INPUT

    compliance = report["compliance"]
    retired, allowed = load_retired()
    needles = [row["from"] for row in retired]
    raw = scan(args.root, needles, skip_paths=[RETIRED_PATH]) if needles else {}
    dangling = {}
    historical = {}
    for needle, items in raw.items():
        for item in items:
            if item["path"] in allowed:
                historical.setdefault(needle, []).append(
                    {"path": item["path"], "reason": allowed[item["path"]], "count": item["count"]})
            else:
                dangling.setdefault(needle, []).append(item)
    dangling_total = sum(len(items) for items in dangling.values())
    historical_total = sum(len(items) for items in historical.values())

    checks = [
        {
            "name": "naming_compliant",
            "pass": compliance["violations"] == 0,
            "detail": "合规率 %.4f（%d/%d），违规 %d 条"
                      % (compliance["compliance_rate"], compliance["compliant"],
                         compliance["total"], compliance["violations"]),
        },
        {
            "name": "no_dangling_ref",
            "pass": dangling_total == 0,
            "detail": "%d 个旧名 / 清单外残留引用 %d 个 / 台账内历史引用 %d 处"
                      % (len(needles), dangling_total, historical_total),
        },
        {
            "name": "registry_clean",
            "pass": len(report["registry_violations"]) == 0,
            "detail": "执行层登记表违规 %d 条" % len(report["registry_violations"]),
        },
    ]
    passed = all(item["pass"] for item in checks)

    payload = {
        "success": passed,
        "root": args.root,
        "compliance": compliance,
        "violation_codes": report["violation_codes"],
        "violations": report["violations"],
        "registry_violation_codes": report["registry_violation_codes"],
        "registry_violations": report["registry_violations"],
        "retired_names": needles,
        "dangling_references": dangling,
        "dangling_total": dangling_total,
        "historical_mentions": historical,
        "historical_total": historical_total,
        "allowed_contexts": allowed,
        "checks": checks,
    }
    payload["verdict"] = "naming_verified" if passed else "naming_not_verified"
    emit(payload)
    return EXIT_OK if passed else EXIT_FAIL


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
