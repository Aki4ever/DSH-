#!/usr/bin/env python3
import os
import sys
import argparse
import json

def verify_paths(paths: list) -> dict:
    results = []
    all_valid = True

    for p in paths:
        clean_p = p.strip().strip('`').strip('"').strip("'")
        if not clean_p or clean_p.lower() in ["none", "null", "无", "empty"]:
            results.append({"path": p, "valid": False, "error": "Empty or dummy path forbidden"})
            all_valid = False
            continue

        abs_p = os.path.abspath(clean_p)
        exists = os.path.exists(abs_p)
        size = os.path.getsize(abs_p) if exists else 0

        if not exists:
            results.append({"path": p, "valid": False, "error": "Path does not exist on disk"})
            all_valid = False
        elif size == 0 and os.path.isfile(abs_p):
            results.append({"path": p, "valid": False, "error": "File is empty (0 bytes)"})
            all_valid = False
        else:
            results.append({"path": p, "valid": True, "size": size})

    return {
        "all_valid": all_valid,
        "checked_count": len(paths),
        "results": results
    }

def main():
    parser = argparse.ArgumentParser(description="Verify deliverable file paths physically")
    parser.add_argument("--paths", nargs="+", required=True, help="List of file paths")
    args = parser.parse_args()

    res = verify_paths(args.paths)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res["all_valid"] else 1)

if __name__ == "__main__":
    main()
