#!/usr/bin/env python3
import os
import sys
import argparse
import json
import re

# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../skill-pool"))
REPO_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
_SKILLS_CANDIDATE = os.path.join(os.path.dirname(REPO_ROOT), "skills")
SKILLS_ROOT = _SKILLS_CANDIDATE if os.path.isdir(_SKILLS_CANDIDATE) else os.path.join(REPO_ROOT, "skills")
SKILLS_DIR = SKILLS_ROOT
CATALOG_PATH = os.path.join(REPO_ROOT, "docs/operations/skill-catalog.json")

def parse_frontmatter(content: str) -> dict:
    match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return {}
    res = {}
    for line in match.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            res[k.strip()] = v.strip()
    return res

def resolve_route(skill_id: str) -> dict:
    skill_dir = os.path.join(SKILLS_DIR, skill_id)
    if not os.path.exists(skill_dir):
        return {"ok": False, "error": f"Skill '{skill_id}' not found in skills/"}

    skill_md = os.path.join(skill_dir, "SKILL.md")
    level = "L3"
    composition = []
    
    if os.path.exists(skill_md):
        with open(skill_md, "r", encoding="utf-8") as f:
            content = f.read()
            fm = parse_frontmatter(content)
            level = fm.get("level", "L3")

    # 如果有 Catalog，获取 composition
    if os.path.exists(CATALOG_PATH):
        try:
            with open(CATALOG_PATH, "r", encoding="utf-8") as cf:
                cdata = json.load(cf)
                for s in cdata.get("skills", []):
                    if s.get("id") == skill_id:
                        composition = s.get("composition", [])
                        break
        except Exception:
            pass

    fastpath_cmd = None
    direct_action_type = "PROMPT_RULE"

    if level == "L2":
        direct_action_type = "CLI_SCRIPT"
        scripts_dir = os.path.join(skill_dir, "scripts")
        if os.path.exists(scripts_dir):
            py_files = [f for f in os.listdir(scripts_dir) if f.endswith(".py")]
            if py_files:
                fastpath_cmd = f"python3 skills/{skill_id}/scripts/{py_files[0]}"
    elif level == "L1":
        direct_action_type = "INVARIANT_CONSTRAINT"
        fastpath_cmd = f"Apply micro-prompt invariant: skills/{skill_id}/SKILL.md"
    elif level == "L3":
        direct_action_type = "COMPOSITE_PIPELINE"
        fastpath_cmd = f"Pipeline composition of: {', '.join(composition) if composition else 'sub-skills'}"
    elif level == "L4":
        direct_action_type = "GLOBAL_ORCHESTRATOR"
        fastpath_cmd = "Invoke Butler master dispatch loop"

    return {
        "ok": True,
        "skill_id": skill_id,
        "level": level,
        "direct_action_type": direct_action_type,
        "fastpath_cmd": fastpath_cmd,
        "atomic_dependencies": composition,
        "skill_path": f"skills/{skill_id}/SKILL.md"
    }

def main():
    parser = argparse.ArgumentParser(description="Generate fastpath dispatch route for a skill")
    parser.add_argument("--skill-id", "-s", required=True, help="Target skill id")
    args = parser.parse_args()

    res = resolve_route(args.skill_id)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res.get("ok") else 1)

if __name__ == "__main__":
    main()
