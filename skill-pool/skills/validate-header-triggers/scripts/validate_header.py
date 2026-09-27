#!/usr/bin/env python3
import os
import sys
import argparse
import json
import re

def validate_header(file_path: str) -> dict:
    if not os.path.exists(file_path):
        return {"valid": False, "error": "File does not exist"}

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    fm = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if not fm:
        return {"valid": False, "error": "Missing YAML frontmatter"}

    fm_text = fm.group(1)
    fields = {}
    for line in fm_text.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            fields[k.strip()] = v.strip().strip('"').strip("'")

    missing = []
    for req in ["name", "description"]:
        if req not in fields or not fields[req]:
            missing.append(req)

    level = fields.get("level")
    if level and level not in ["L1", "L2", "L3", "L4"]:
        return {"valid": False, "error": f"Invalid level: {level}"}

    return {
        "valid": len(missing) == 0,
        "name": fields.get("name"),
        "level": level,
        "description_len": len(fields.get("description", "")),
        "missing_fields": missing
    }

def main():
    parser = argparse.ArgumentParser(description="Validate skill header frontmatter")
    parser.add_argument("--file", "-f", required=True, help="Path to SKILL.md")
    args = parser.parse_args()

    res = validate_header(args.file)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res["valid"] else 1)

if __name__ == "__main__":
    main()
