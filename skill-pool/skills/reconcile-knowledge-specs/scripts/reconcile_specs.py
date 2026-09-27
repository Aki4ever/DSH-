#!/usr/bin/env python3
import os
import sys
import argparse
import json

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
STANDARDS_DIR = os.path.join(REPO_ROOT, "docs/knowledge/standards")

REQUIRED_SPECS = {
    "worldview": "worldview-standard.md",
    "art": "art-visual-standard.md",
    "interaction": "interaction-standard.md",
    "text": "text-language-standard.md",
    "layout": "layout-standard.md",
    "engineering": "engineering-standard.md",
    "dialogue": "dialogue-standard.md"
}

def reconcile() -> dict:
    missing = []
    specs_status = {}

    for k, fname in REQUIRED_SPECS.items():
        p = os.path.join(STANDARDS_DIR, fname)
        if not os.path.exists(p) or os.path.getsize(p) == 0:
            missing.append(fname)
            specs_status[k] = {"file": fname, "exists": False, "size": 0}
        else:
            specs_status[k] = {"file": fname, "exists": True, "size": os.path.getsize(p)}

    ok = len(missing) == 0

    return {
        "ok": ok,
        "precedence_rule": "Knowledge base standards take absolute precedence over conflicting ad-hoc inputs",
        "specs_count": len(REQUIRED_SPECS),
        "missing_count": len(missing),
        "specs_status": specs_status
    }

def main():
    parser = argparse.ArgumentParser(description="Reconcile knowledge standards precedence")
    parser.add_argument("--check-all", action="store_true", help="Check all 7 standards")
    args = parser.parse_args()

    res = reconcile()
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res["ok"] else 1)

if __name__ == "__main__":
    main()
