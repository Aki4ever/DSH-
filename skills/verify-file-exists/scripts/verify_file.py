#!/usr/bin/env python3
import os
import sys
import argparse
import json

def verify_paths(paths):
    details = []
    all_ok = True
    for p in paths:
        abs_p = os.path.abspath(p)
        exists = os.path.exists(abs_p)
        size = os.path.getsize(abs_p) if exists else 0
        ok = exists and size > 0
        if not ok:
            all_ok = False
        details.append({
            "path": p,
            "exists": exists,
            "size": size,
            "ok": ok
        })
    return {"success": all_ok, "details": details}

def main():
    parser = argparse.ArgumentParser(description="Verify files exist and have content")
    parser.add_argument("--paths", nargs="+", required=True, help="List of file paths")
    args = parser.parse_args()

    result = verify_paths(args.paths)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()
