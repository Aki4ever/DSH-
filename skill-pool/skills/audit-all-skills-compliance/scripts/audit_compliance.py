#!/usr/bin/env python3
import os
import sys
import re
import argparse
import json

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
SKILLS_DIR = os.path.join(REPO_ROOT, "skills")

def parse_frontmatter(content: str) -> dict:
    match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return {}
    fm_text = match.group(1)
    res = {}
    for line in fm_text.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            res[k.strip()] = v.strip()
    return res

def audit_skill(skill_dir: str) -> dict:
    sid = os.path.basename(skill_dir)
    skill_md = os.path.join(skill_dir, "SKILL.md")
    
    if not os.path.exists(skill_md):
        return {"id": sid, "pass": False, "reason": "Missing SKILL.md"}
    
    with open(skill_md, "r", encoding="utf-8") as f:
        content = f.read()
    
    fm = parse_frontmatter(content)
    if not fm:
        return {"id": sid, "pass": False, "reason": "Missing or invalid YAML frontmatter"}
    
    if fm.get("name") != sid:
        return {"id": sid, "pass": False, "reason": f"Frontmatter name '{fm.get('name')}' != directory '{sid}'"}
    
    level = fm.get("level", "L3")
    
    has_header = ("## When to Use" in content) or ("## Overview" in content)
    if not has_header:
        return {"id": sid, "pass": False, "reason": "Missing header contract (## When to Use or ## Overview)"}
    
    has_body = ("## Workflow" in content) or ("## SOP" in content) or ("## Strict Rules" in content) or ("## Usage & Script" in content) or ("## Instructions" in content)
    if not has_body:
        return {"id": sid, "pass": False, "reason": "Missing body workflow/rules contract"}
    
    if level == "L2":
        scripts_dir = os.path.join(skill_dir, "scripts")
        if not os.path.exists(scripts_dir) or not os.path.isdir(scripts_dir):
            return {"id": sid, "pass": False, "reason": "L2 procedural skill must contain scripts/ directory"}
        py_files = [f for f in os.listdir(scripts_dir) if f.endswith(".py")]
        if not py_files:
            return {"id": sid, "pass": False, "reason": "L2 procedural skill scripts/ has no python script"}

    return {"id": sid, "pass": True, "level": level, "reason": None}

def audit_all(skills_root: str = SKILLS_DIR) -> dict:
    if not os.path.exists(skills_root):
        return {"success": False, "error": f"Skills dir not found: {skills_root}"}

    subdirs = [
        os.path.join(skills_root, d) for d in os.listdir(skills_root)
        if os.path.isdir(os.path.join(skills_root, d)) and not d.startswith("_") and not d.startswith(".")
    ]
    subdirs.sort()

    details = []
    all_pass = True
    passed_count = 0
    failed_count = 0

    for d in subdirs:
        res = audit_skill(d)
        details.append(res)
        if res["pass"]:
            passed_count += 1
        else:
            all_pass = False
            failed_count += 1

    return {
        "success": all_pass,
        "total_audited": len(subdirs),
        "passed": passed_count,
        "failed": failed_count,
        "details": details
    }

def main():
    parser = argparse.ArgumentParser(description="Audit all skills for contract completeness")
    parser.add_argument("--skills-dir", default=SKILLS_DIR, help="Skills root directory")
    args = parser.parse_args()

    res = audit_all(args.skills_dir)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res["success"] else 1)

if __name__ == "__main__":
    main()
