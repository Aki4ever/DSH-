#!/usr/bin/env python3
import os
import sys
import argparse
import json

def verify_contract(skill_dir: str) -> dict:
    abs_dir = os.path.abspath(skill_dir)
    skill_md = os.path.join(abs_dir, "SKILL.md")
    scripts_dir = os.path.join(abs_dir, "scripts")

    if not os.path.exists(skill_md):
        return {"ok": False, "error": "SKILL.md missing"}

    with open(skill_md, "r", encoding="utf-8") as f:
        content = f.read()

    has_workflow = "workflow" in content.lower() or "flowchart" in content.lower() or "流程" in content
    has_rules = "rules" in content.lower() or "规则" in content or "overview" in content.lower()

    scripts = []
    if os.path.exists(scripts_dir):
        for s in os.listdir(scripts_dir):
            sp = os.path.join(scripts_dir, s)
            if os.path.isfile(sp) and not s.startswith("."):
                scripts.append({
                    "name": s,
                    "executable": os.access(sp, os.X_OK),
                    "size": os.path.getsize(sp)
                })

    return {
        "ok": has_rules,
        "has_workflow": has_workflow,
        "has_rules": has_rules,
        "scripts_count": len(scripts),
        "scripts": scripts
    }

def main():
    parser = argparse.ArgumentParser(description="Verify skill execution contract")
    parser.add_argument("--skill-dir", "-d", required=True, help="Path to skill directory")
    args = parser.parse_args()

    res = verify_contract(args.skill_dir)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res["ok"] else 1)

if __name__ == "__main__":
    main()
