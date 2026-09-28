#!/usr/bin/env python3
"""
verify_lane.py
分流判定复算探针：同一输入重复 N 次，断言 lane 完全一致。

Exit Code:
  0 - lane 完全一致
  1 - 出现多种 lane，或判定脚本不可用
"""

import os
import sys
import json
import argparse
import subprocess

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
SCORE_SCRIPT = os.path.join(REPO_ROOT, "skills/score-task-lane/scripts/score_lane.py")


def run_once(task, files, steps, skill_hit):
    cmd = [sys.executable, SCORE_SCRIPT, "--task", task, "--files", str(files),
           "--steps", str(steps)]
    if skill_hit:
        cmd.append("--skill-hit")
    proc = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(proc.stdout)
    except (ValueError, TypeError):
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify lane decision determinism")
    parser.add_argument("--task", "-t", default="", help="Task description text")
    parser.add_argument("--files", type=int, default=1, help="Number of files the task touches")
    parser.add_argument("--steps", type=int, default=1, help="Estimated atomic steps")
    parser.add_argument("--skill-hit", action="store_true", help="Task hits an existing skill")
    parser.add_argument("--repeat", type=int, default=10, help="How many times to re-run")
    args = parser.parse_args()

    if not os.path.exists(SCORE_SCRIPT):
        print(json.dumps({"success": False, "consistent": False,
                          "error": f"score script not found: {SCORE_SCRIPT}"},
                         ensure_ascii=False, indent=2))
        return 1

    observed = []
    details = []
    for _ in range(max(1, args.repeat)):
        payload = run_once(args.task, args.files, args.steps, args.skill_hit)
        if payload is None or "lane" not in payload:
            print(json.dumps({"success": False, "consistent": False,
                              "error": "score-task-lane returned no parsable lane"},
                             ensure_ascii=False, indent=2))
            return 1
        observed.append(payload["lane"])
        details.append({"lane": payload["lane"], "score": payload.get("score"),
                        "redlines": payload.get("matched_redlines", [])})

    unique = sorted(set(observed))
    consistent = len(unique) == 1

    result = {
        "success": consistent,
        "consistent": consistent,
        "lane": unique[0] if consistent else None,
        "observed": unique,
        "runs": len(observed),
        "samples": details,
    }
    if not consistent:
        result["error"] = f"lane drifted across runs: {unique}"

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if consistent else 1


if __name__ == "__main__":
    sys.exit(main())
