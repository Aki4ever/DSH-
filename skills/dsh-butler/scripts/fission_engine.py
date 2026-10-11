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

def validate_skill_name(name):
    if not isinstance(name, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
        raise ValueError("技能名必须为小写kebab-case，不得包含路径或分隔符")
    return name


def create_atomic_subskill(name: str, level: str, desc: str, script_code: str = None) -> bool:
    validate_skill_name(name)
    if level not in ("L1", "L2"):
        raise ValueError("子技能级别非法")
    if level == "L2" and not script_code:
        raise ValueError("L2子技能缺少真实脚本，不得生成空架子")
    target_dir = os.path.join(SKILLS_DIR, name)
    os.makedirs(target_dir, exist_ok=False)

    # 1. SKILL.md
    skill_md = os.path.join(target_dir, "SKILL.md")
    content = f"""---
name: {name}
level: {level}
description: {json.dumps('分裂生成的待验收草案(' + level + ')：' + desc, ensure_ascii=False)}
---

# {name.replace('-', ' ').title()}

## Overview

{desc}。本技能由管家自主递归分裂生成，旨在消除粒度过粗与模糊性，形成待验收的单一职责草案。生成文件不等于执行成功，必须另行验证入口、判据、反例与留痕。

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

def composition_text(content, child_skill_name):
    validate_skill_name(child_skill_name)
    match = re.match(r"\A---\r?\n(.*?)\r?\n---(?:\r?\n|$)", content, re.S)
    if not match:
        raise ValueError("父技能缺少有效frontmatter")
    header = match.group(1)
    blocks = list(re.finditer(r"^composition:[ \t]*\r?$\n((?:[ \t]+-[^\n]*\n?)*)", header + "\n", re.M))
    if len(blocks) > 1:
        raise ValueError("重复composition声明，拒绝接线")
    if blocks and re.search(r"^[ \t]+-[ \t]*" + re.escape(child_skill_name) + r"[ \t]*$", blocks[0].group(1), re.M):
        return content
    if re.search(r"^composition:[ \t]*$", header, re.M):
        header = re.sub(r"^composition:[ \t]*$", "composition:\n  - " + child_skill_name, header, count=1, flags=re.M)
    elif re.search(r"^composition:", header, re.M):
        raise ValueError("不支持内联composition，拒绝猜测接线")
    else:
        header += "\ncomposition:\n  - " + child_skill_name
    return "---\n" + header + "\n---\n" + content[match.end():]


def wire_composition(parent_skill_name: str, child_skill_name: str):
    validate_skill_name(parent_skill_name)
    validate_skill_name(child_skill_name)
    parent_md = os.path.join(SKILLS_DIR, parent_skill_name, "SKILL.md")
    if not os.path.isfile(parent_md) or os.path.islink(parent_md) or os.path.islink(os.path.dirname(parent_md)):
        raise ValueError("父技能缺失或符号链接，接线失败")

    with open(parent_md, "r", encoding="utf-8") as f:
        content = f.read()

    next_content = composition_text(content, child_skill_name)
    if next_content == content:
        return
    with open(parent_md, "w", encoding="utf-8") as f:
        f.write(next_content)
    with open(parent_md, "r", encoding="utf-8") as f:
        if f.read() != next_content:
            raise RuntimeError("父技能接线回读不一致")

def main():
    parser = argparse.ArgumentParser(description="Autonomous Skill Fission & Determinism Engine")
    parser.add_argument("--selftest", action="store_true", help="Run non-writing safety fixtures")
    parser.add_argument("--analyze", "-a", help="Analyze coarseness of a skill directory")
    parser.add_argument("--split", "-s", help="Parent skill to split from")
    parser.add_argument("--child", "-c", help="New child skill name")
    parser.add_argument("--level", "-l", choices=["L1", "L2"], default="L1", help="Level of new skill")
    parser.add_argument("--desc", "-d", help="Description of new skill")
    args = parser.parse_args()

    if args.selftest:
        passed = 0
        for name in ("../outside", "/tmp/outside", "a/b", "UPPER", "", "a\nlevel: L2"):
            try:
                validate_skill_name(name)
                raise AssertionError("invalid name accepted")
            except ValueError:
                passed += 1
        assert validate_skill_name("safe-child") == "safe-child"
        passed += 1
        try:
            create_atomic_subskill("test-no-empty-l2", "L2", "fixture")
            raise AssertionError("empty L2 accepted")
        except ValueError:
            passed += 1
        assert not analyze_skill_coarseness(os.path.join(SKILLS_DIR, "__missing_fission_fixture__"))["valid"]
        passed += 1
        fixture = "---\nname: parent\nlevel: L2\n---\nbody mentions child-unit\n"
        wired = composition_text(fixture, "child-unit")
        assert "composition:\n  - child-unit" in wired
        assert wired.endswith("body mentions child-unit\n")
        assert composition_text(wired, "child-unit") == wired
        passed += 3
        unrelated = "---\nname: parent\ntags:\n  - child-unit\nlevel: L2\n---\nbody\n"
        assert "composition:\n  - child-unit" in composition_text(unrelated, "child-unit")
        passed += 1
        adjacent = "---\nname: parent\ncomposition:\nlevel: L2\n---\nbody\n"
        assert "level: L2" in composition_text(adjacent, "child-unit")
        passed += 1
        try:
            composition_text("---\ncomposition:\ncomposition:\n---\n", "child-unit")
            raise AssertionError("duplicate composition accepted")
        except ValueError:
            passed += 1
        try:
            composition_text("no-frontmatter", "child-unit")
            raise AssertionError("invalid parent accepted")
        except ValueError:
            passed += 1
        escaped = json.dumps("desc\n---\nlevel: L2", ensure_ascii=False)
        assert "\n" not in escaped and json.loads(escaped) == "desc\n---\nlevel: L2"
        passed += 1
        print(json.dumps({"passed": passed, "total": 17, "scope": "non-writing-safety-fixtures"}))
        sys.exit(0)

    if args.analyze:
        res = analyze_skill_coarseness(args.analyze)
        print(json.dumps(res, ensure_ascii=False, indent=2))
        sys.exit(2 if not res.get("valid") else (1 if res.get("needs_fission") else 0))

    if args.split and args.child and args.desc:
        validate_skill_name(args.split)
        validate_skill_name(args.child)
        parent_path = os.path.join(SKILLS_DIR, args.split, "SKILL.md")
        if not os.path.isfile(parent_path) or os.path.islink(os.path.dirname(parent_path)) or os.path.islink(parent_path):
            parser.error("父技能缺失或为符号链接，拒绝生成孤儿子技能")
        with open(parent_path, "r", encoding="utf-8") as f:
            composition_text(f.read(), args.child)  # 创建前先验证父接线可行
        create_atomic_subskill(args.child, args.level, args.desc)
        wire_composition(args.split, args.child)
        if not os.path.isfile(SYNC_CATALOG_SCRIPT):
            print("编目入口缺失；草案可能已生成与接线，未完成验收", file=sys.stderr)
            sys.exit(2)
        try:
            subprocess.run([sys.executable, SYNC_CATALOG_SCRIPT], capture_output=True, check=True, timeout=30)
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
            print(f"编目失败；保留草案供修复，不宣称完成: {exc}", file=sys.stderr)
            sys.exit(2)
        print(f"草案已生成与接线: [{args.split}] -> [{args.child}] ({args.level})；编目命令成功，但物理触达尚待独立验收。")
        sys.exit(0)

    parser.print_help()

if __name__ == "__main__":
    main()
