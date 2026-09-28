#!/usr/bin/env python3
import os
import sys
import argparse
import py_compile
import json

def check_files(files):
    details = []
    all_ok = True
    for f in files:
        abs_p = os.path.abspath(f)
        item = {"file": f, "valid": True, "error": None}
        if not os.path.exists(abs_p):
            item["valid"] = False
            item["error"] = "File not found"
            all_ok = False
        else:
            try:
                py_compile.compile(abs_p, doraise=True)
            except Exception as e:
                item["valid"] = False
                item["error"] = str(e)
                all_ok = False
        details.append(item)
    return {"success": all_ok, "details": details}

def main():
    parser = argparse.ArgumentParser(description="Check Python files syntax")
    parser.add_argument("--files", nargs="+", required=True, help="List of python files")
    args = parser.parse_args()

    result = check_files(args.files)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()
