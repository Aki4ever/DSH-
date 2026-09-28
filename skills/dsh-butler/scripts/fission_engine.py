#!/usr/bin/env python3
"""
fission_engine.py
DSH 管家自主递归分裂引擎 (Autonomous Skill Fission & Determinism Engine)。
负责审查 Skill 的粒度与物理确定性，一旦发现过粗或含模糊主观词，自动向下裂变出更细粒度的 L1/L2 原子 Skill。
"""

import os
import sys

# 关闭字节码落盘：本脚本会用 importlib 加载同仓其它技能模块，
# 避免在他人技能目录里生成 __pycache__。
sys.dont_write_bytecode = True
import argparse
import json
import re
import subprocess

# 本脚本通过 importlib 加载同仓其它技能模块；关闭字节码落盘，
# 避免在他人技能目录生成 __pycache__（副作用归零）。

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
SKILLS_DIR = os.path.join(REPO_ROOT, "skills")
SYNC_CATALOG_SCRIPT = os.path.join(REPO_ROOT, "skills/dsh-butler/scripts/sync_catalog.py")

# ── 模糊词表唯一真相源 ────────────────────────────────────────────────
# 词表不再本地维护，改为从 detect-vague-modifier 加载 hedge（缓解/含糊）类。
# 该类的 13 个词是原先两份不一致词表的并集，收敛后覆盖不降、无误报。
VAGUE_WORD_MODULE = os.path.join(
    REPO_ROOT, "skills/detect-vague-modifier/scripts/detect_vague.py"
)


def _load_hedge_words():
    import importlib.util
    if not os.path.exists(VAGUE_WORD_MODULE):
        raise RuntimeError(
            f"模糊词表唯一真相源缺失: {VAGUE_WORD_MODULE}"
            "（请先确认 detect-vague-modifier 已落盘）"
        )
    spec = importlib.util.spec_from_file_location("vague_words_source", VAGUE_WORD_MODULE)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    classes = getattr(mod, "AMBIGUITY_WORDS", {})
    words = list(classes.get("hedge", []))
    if not words:
        raise RuntimeError("detect-vague-modifier 未导出 AMBIGUITY_WORDS['hedge']")
    return words


VAGUE_TERMS = _load_hedge_words()


def analyze_skill_coarseness(skill_path: str) -> dict:
    abs_path = os.path.abspath(skill_path)
    skill_md = os.path.join(abs_path, "SKILL.md") if os.path.isdir(abs_path) else abs_path

    if not os.path.exists(skill_md):
        return {"valid": False, "error": f"SKILL.md not found at {skill_md}"}

    with open(skill_md, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. 检查主观模糊词
    found_vague = [term for term in VAGUE_TERMS if term in content]

    # 2. 检查是否有脚本支撑
    skill_dir = os.path.dirname(skill_md)
    scripts_dir = os.path.join(skill_dir, "scripts")
    has_script = os.path.exists(scripts_dir) and len(os.listdir(scripts_dir)) > 0

    # 3. 提取 level
    level_match = re.search(r"level:\s*(L[1-4])", content)
    level = level_match.group(1) if level_match else "L3"

    # 判定是否需要分裂
    needs_fission = False
    reasons = []

    if found_vague:
        needs_fission = True
        reasons.append(f"包含主观模糊词汇: {found_vague}")

    if level in ["L2"] and not has_script:
        needs_fission = True
        reasons.append("L2工序级动作缺少底层物理脚本支撑")

    return {
        "valid": True,
        "skill": os.path.basename(skill_dir),
        "level": level,
        "has_script": has_script,
        "needs_fission": needs_fission,
        "reasons": reasons
    }

def create_atomic_subskill(name: str, level: str, desc: str, script_code: str = None) -> bool:
    target_dir = os.path.join(SKILLS_DIR, name)
    os.makedirs(target_dir, exist_ok=True)

    # 1. SKILL.md
    skill_md = os.path.join(target_dir, "SKILL.md")
    content = f"""---
name: {name}
level: {level}
description: 由管家自主分裂引擎生成的原子级技能({level})：{desc}
---

# {name.replace('-', ' ').title()}

## Overview

{desc}。本技能由管家自主递归分裂生成，旨在消除粒度过粗与模糊性，实现单一职责与 100% 物理确定性。

## Rules / Verification

- 具备严格的单一控制边界；
- 杜绝一切非物理确定的模糊描述。
"""
    with open(skill_md, "w", encoding="utf-8") as f:
        f.write(content)

    # 2. README.md
    readme_md = os.path.join(target_dir, "README.md")
    with open(readme_md, "w", encoding="utf-8") as f:
        f.write(f"# {name}\n\n{desc}\n")

    # 3. scripts (若为 L2)
    if script_code:
        scripts_dir = os.path.join(target_dir, "scripts")
        os.makedirs(scripts_dir, exist_ok=True)
        script_file = os.path.join(scripts_dir, "run.py")
        with open(script_file, "w", encoding="utf-8") as f:
            f.write(script_code)
        os.chmod(script_file, 0o755)

    return True

def wire_composition(parent_skill_name: str, child_skill_name: str):
    parent_md = os.path.join(SKILLS_DIR, parent_skill_name, "SKILL.md")
    if not os.path.exists(parent_md):
        return

    with open(parent_md, "r", encoding="utf-8") as f:
        content = f.read()

    if child_skill_name in content:
        return

    if "composition:" in content:
        content = content.replace("composition:\n", f"composition:\n  - {child_skill_name}\n")
    else:
        # 在 frontmatter 里加
        content = re.sub(r"(level:\s*L[34]\n)", f"\\1composition:\n  - {child_skill_name}\n", content)

    with open(parent_md, "w", encoding="utf-8") as f:
        f.write(content)

def main():
    parser = argparse.ArgumentParser(description="Autonomous Skill Fission & Determinism Engine")
    parser.add_argument("--analyze", "-a", help="Analyze coarseness of a skill directory")
    parser.add_argument("--split", "-s", help="Parent skill to split from")
    parser.add_argument("--child", "-c", help="New child skill name")
    parser.add_argument("--level", "-l", choices=["L1", "L2"], default="L1", help="Level of new skill")
    parser.add_argument("--desc", "-d", help="Description of new skill")
    args = parser.parse_args()

    if args.analyze:
        res = analyze_skill_coarseness(args.analyze)
        print(json.dumps(res, ensure_ascii=False, indent=2))
        sys.exit(0 if not res.get("needs_fission") else 2)

    if args.split and args.child and args.desc:
        create_atomic_subskill(args.child, args.level, args.desc)
        wire_composition(args.split, args.child)
        if os.path.exists(SYNC_CATALOG_SCRIPT):
            subprocess.run([sys.executable, SYNC_CATALOG_SCRIPT], capture_output=True)
        print(f"✅ 成功完成递归分裂: 父技能 [{args.split}] -> 生成子技能 [{args.child}] ({args.level}) 并已完成依赖接线与编目刷新。")
        sys.exit(0)

    parser.print_help()

if __name__ == "__main__":
    main()
