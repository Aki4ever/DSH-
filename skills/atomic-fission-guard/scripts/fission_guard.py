#!/usr/bin/env python3
"""
fission_guard.py
粒度递归分裂门禁：调用 plan-fission --strict，放行 0 / 阻断 1。

Exit Code:
  0 - 目标全部步骤已绑定四类合法探针之一（或 --report 模式）
  1 - 存在未绑定探针的步骤，或目标不可读
"""

import os
import re
import sys
import json
import argparse
import subprocess

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
PLAN_SCRIPT = os.path.join(REPO_ROOT, "skills/plan-fission/scripts/plan_fission.py")


def run_plan(target: str):
    if not os.path.exists(PLAN_SCRIPT):
        return None, f"plan-fission script not found: {PLAN_SCRIPT}"
    proc = subprocess.run(
        [sys.executable, PLAN_SCRIPT, "--input", target, "--strict"],
        capture_output=True, text=True,
    )
    try:
        payload = json.loads(proc.stdout)
    except (ValueError, TypeError):
        payload = {"raw_stdout": proc.stdout.strip(), "raw_stderr": proc.stderr.strip()}
    return proc.returncode, payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Atomic fission gate for SOP steps")
    parser.add_argument("--target", "-t", required=True, help="Skill directory or SOP file")
    parser.add_argument("--report", action="store_true", help="Report only, never block")
    args = parser.parse_args()

    if not os.path.exists(args.target):
        print(json.dumps({"success": False, "error": f"target not found: {args.target}"},
                         ensure_ascii=False, indent=2))
        return 0 if args.report else 1

    code, payload = run_plan(args.target)
    if code is None:
        print(json.dumps({"success": False, "error": payload}, ensure_ascii=False, indent=2))
        return 0 if args.report else 1

    blocked = code != 0
    result = {
        "success": not blocked,
        "target": args.target,
        "blocked": blocked,
        "report_only": bool(args.report),
        "plan": payload,
    }

    if blocked:
        unbound = payload.get("unbound_steps", []) if isinstance(payload, dict) else []
        indices = [str(u.get("index")) for u in unbound if isinstance(u, dict)]
        result["blocked_step_indices"] = indices
        result["message"] = (
            "存在未绑定物理探针的步骤，实施被阻断。"
            f"待分裂步骤序号: {', '.join(indices) if indices else '(见 plan.unbound_steps)'}"
        )
    else:
        result["message"] = "全部步骤已绑定四类物理探针之一，放行。"

    print(json.dumps(result, ensure_ascii=False, indent=2))

    if args.report:
        return 0
    return 1 if blocked else 0


if __name__ == "__main__":
    sys.exit(main())
