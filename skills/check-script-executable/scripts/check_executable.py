#!/usr/bin/env python3
import os
import sys
import argparse
import json

def check_executables(scripts_dir: str) -> dict:
    abs_dir = os.path.abspath(scripts_dir)
    if not os.path.exists(abs_dir) or not os.path.isdir(abs_dir):
        return {"ok": False, "error": f"Directory not found: {scripts_dir}", "scripts": []}

    files = [f for f in os.listdir(abs_dir) if os.path.isfile(os.path.join(abs_dir, f)) and not f.startswith(".")]
    if not files:
        return {"ok": False, "error": "No script files found in directory", "scripts": []}

    results = []
    all_ok = True

    for f in sorted(files):
        p = os.path.join(abs_dir, f)
        is_x = os.access(p, os.X_OK)
        size = os.path.getsize(p)
        results.append({
            "file": f,
            "executable": is_x,
            "size": size,
            "ok": is_x and size > 0
        })
        if not (is_x and size > 0):
            all_ok = False

    return {
        "ok": all_ok,
        "scripts_count": len(files),
        "scripts": results
    }

def main():
    parser = argparse.ArgumentParser(description="Check if scripts in directory are executable")
    parser.add_argument("--dir", "-d", required=True, help="Directory containing scripts")
    args = parser.parse_args()

    res = check_executables(args.dir)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res["ok"] else 1)

if __name__ == "__main__":
    main()
