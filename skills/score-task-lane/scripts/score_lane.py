#!/usr/bin/env python3
"""
score_lane.py
双流程分流判定：红线优先，其次五项简单性判据加权分（阈值 3）。

Exit Code: 恒为 0（判定结果由 stdout JSON 承载）。
"""

import os
import re
import sys
import json
import argparse

# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../skill-pool"))
REPO_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
CATALOG_JSON = os.path.join(REPO_ROOT, "docs/operations/skill-catalog.json")

THRESHOLD = 3

REDLINES = [
    ("R1", "删除或清空", r"删除|移除|清空|\brm\s+-rf\b|drop\s+table|覆盖既有"),
    ("R2", "发布/部署/推送", r"发布|部署|上线|推送|\bpush\b|\bcommit\b|\brelease\b|\bdeploy\b"),
    ("R3", "需求文档变更", r"修改需求|变更需求|需求变更|基线|REQ-[A-Z]"),
    ("R4", "安装外部依赖或技能", r"安装|引入外部|\bnpm\s+install\b|\bpip\s+install\b|添加插件"),
]

WRITE_VERBS = r"写入|修改|创建|新增|改动|编辑|重构|生成文件|写文件|改写|重命名"


def load_skill_ids():
    if not os.path.exists(CATALOG_JSON):
        return []
    try:
        with open(CATALOG_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        return []
    return [s.get("id", "") for s in data.get("skills", []) if s.get("id")]


def detect_redlines(task: str, files: int):
    matched = []
    for code, title, pattern in REDLINES:
        if re.search(pattern, task, re.IGNORECASE):
            matched.append({"code": code, "title": title})
    if files >= 2:
        matched.append({"code": "R5", "title": "批量改动", "detail": f"files={files}"})
    return matched


def evaluate(task: str, files: int, steps: int, skill_hit: bool):
    task = task or ""
    redlines = detect_redlines(task, files)

    skill_ids = load_skill_ids()
    hits_skill = skill_hit or any(sid and sid in task for sid in skill_ids)

    criteria = {
        "readonly": not re.search(WRITE_VERBS, task),
        "single_file": files <= 1,
        "reversible": not any(r["code"] in ("R1", "R2") for r in redlines),
        "steps_le_3": steps <= 3,
        "hits_existing_skill": bool(hits_skill),
    }

    score = sum(1 for v in criteria.values() if v)

    if redlines:
        lane = "full"
        reason = ("命中红线 " + "、".join(f"{r['code']}({r['title']})" for r in redlines)
                  + "，红线优先于分值，强制完整流程。")
    elif score >= THRESHOLD:
        lane = "fast"
        reason = f"无红线且加权分 {score} ≥ {THRESHOLD}，走快速流程（≤4 步直调）。"
    else:
        lane = "full"
        reason = f"无红线但加权分 {score} < {THRESHOLD}，走完整流程。"

    return {
        "lane": lane,
        "score": score,
        "threshold": THRESHOLD,
        "matched_redlines": [r["code"] for r in redlines],
        "matched_redline_details": redlines,
        "reason": reason,
        "criteria": criteria,
        "inputs": {"files": files, "steps": steps, "skill_hit": bool(skill_hit)},
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Decide fast lane vs full lane for a task")
    parser.add_argument("--task", "-t", default="", help="Task description text")
    parser.add_argument("--file", help="Read task text from a file instead")
    parser.add_argument("--files", type=int, default=1, help="Number of files the task touches")
    parser.add_argument("--steps", type=int, default=1, help="Estimated atomic steps")
    parser.add_argument("--skill-hit", action="store_true", help="Task hits an existing skill")
    parser.add_argument("--json", action="store_true", help="JSON output (default)")
    args = parser.parse_args()

    task = args.task
    if args.file:
        if not os.path.exists(args.file):
            print(json.dumps({"success": False, "error": f"file not found: {args.file}"},
                             ensure_ascii=False, indent=2))
            return 0
        with open(args.file, "r", encoding="utf-8") as f:
            task = f.read()

    result = evaluate(task, args.files, args.steps, args.skill_hit)
    result["success"] = True
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
