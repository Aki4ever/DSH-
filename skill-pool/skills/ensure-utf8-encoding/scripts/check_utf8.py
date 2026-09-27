#!/usr/bin/env python3
import os
import sys
import argparse
import json

def check_files_utf8(files: list) -> dict:
    results = []
    all_ok = True
    for f in files:
        p = os.path.abspath(f)
        if not os.path.exists(p):
            results.append({"file": f, "ok": False, "error": "File not found"})
            all_ok = False
            continue
        try:
            with open(p, "r", encoding="utf-8") as fp:
                fp.read()
            results.append({"file": f, "ok": True, "error": None})
        except UnicodeDecodeError as e:
            results.append({"file": f, "ok": False, "error": f"UTF-8 decode failed: {e}"})
            all_ok = False
    return {"success": all_ok, "details": results}

def main():
    parser = argparse.ArgumentParser(description="Check UTF-8 encoding of files")
    parser.add_argument("--files", nargs="+", required=True, help="List of files")
    args = parser.parse_args()

    res = check_files_utf8(args.files)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res["success"] else 1)

if __name__ == "__main__":
    main()
