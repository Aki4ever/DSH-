#!/usr/bin/env python3
import sys
import os
import argparse
import json
import py_compile

def check_files(file_list):
    results = []
    has_failure = False

    for path in file_list:
        p = os.path.abspath(path)
        item = {
            "path": path,
            "exists": os.path.exists(p),
            "size": 0,
            "syntax_valid": True,
            "error": None
        }

        if not item["exists"]:
            item["error"] = "File does not exist"
            has_failure = True
            results.append(item)
            continue

        item["size"] = os.path.getsize(p)
        if item["size"] == 0:
            item["error"] = "File is empty (0 bytes)"
            has_failure = True
            results.append(item)
            continue

        # 语法检测
        if path.endswith(".py"):
            try:
                py_compile.compile(p, doraise=True)
            except Exception as e:
                item["syntax_valid"] = False
                item["error"] = f"Python syntax error: {e}"
                has_failure = True
        elif path.endswith(".json"):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    json.load(f)
            except Exception as e:
                item["syntax_valid"] = False
                item["error"] = f"JSON syntax error: {e}"
                has_failure = True

        results.append(item)

    return {
        "pass": not has_failure,
        "checked_count": len(file_list),
        "results": results
    }

def main():
    parser = argparse.ArgumentParser(description="Delivery QA gatekeeper checker")
    parser.add_argument("--files", nargs="+", required=True, help="List of file paths to check")
    args = parser.parse_args()

    report = check_files(args.files)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    sys.exit(0 if report["pass"] else 1)

if __name__ == "__main__":
    main()
