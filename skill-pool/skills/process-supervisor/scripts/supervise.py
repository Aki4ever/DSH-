#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
supervise.py
流程监督员总控：把「取证 → 打分 → 整改」串成一道不可跳步的出口门禁。

为什么要有 agent 这一环（PKG-009 唯一真正需要 agent 层的地方）：
    自己给自己打分必然偏松——主上下文里「我记得我做了」会污染取证。
    本脚本可选地把**证据包**交给一个不共享上下文的子智能体（process-supervisor-agent）
    独立复核；它只能看到落在磁盘上的证据，看不到的就是没做。
    --agent-command 未给出时退化为纯脚本打分，并在输出里标注 agent_review=skipped
    （分数会偏松，这是知情降级，不是静默跳过）。

Exit Code:
  0 - 流程合规（得分 >= 阈值且全部必需项通过）
  1 - 不合规（附逐项明细与整改清单）
  2 - 输入不可读或依赖脚本缺失
"""

import sys

sys.dont_write_bytecode = True

import os
import io
import json
import argparse
import subprocess

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_INPUT = 2
HERE = os.path.dirname(os.path.abspath(__file__))
POOL_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))


def emit(p):
    print(json.dumps(p, ensure_ascii=False, indent=2))


def run(script_rel, args):
    script = os.path.join(POOL_ROOT, script_rel)
    if not os.path.isfile(script):
        return None, "依赖脚本缺失: %s" % script_rel
    proc = subprocess.run([sys.executable, script] + args,
                          stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    try:
        return json.loads(proc.stdout.decode("utf-8", "replace")), None
    except ValueError:
        return None, "%s 输出不可解析" % script_rel


def main(argv):
    ap = argparse.ArgumentParser(prog="supervise.py",
                                 description="流程监督员：取证 → 打分 → 整改（可选 agent 独立复核）")
    ap.add_argument("--evidence", required=True, help="本次任务的证据目录")
    ap.add_argument("--agent-command", dest="agent_command", default=None,
                    help="独立复核命令（宿主 subagent 包装）；缺省则知情降级为纯脚本打分")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    evidence = os.path.abspath(os.path.expanduser(args.evidence))
    if not os.path.isdir(evidence):
        emit({"success": False, "error": "evidence_dir_missing", "detail": evidence})
        return EXIT_INPUT

    collect, error = run("skills/collect-process-evidence/scripts/collect_evidence.py",
                         ["--evidence", evidence])
    if collect is None:
        emit({"success": False, "error": "collect_failed", "detail": error})
        return EXIT_INPUT
    bundle_path = collect["bundle"]

    score, error = run("skills/score-process-conformance/scripts/score_conformance.py",
                       ["--bundle", bundle_path])
    if score is None:
        emit({"success": False, "error": "score_failed", "detail": error})
        return EXIT_INPUT

    plan, error = run("skills/plan-process-rectification/scripts/plan_rectification.py",
                      ["--bundle", bundle_path])
    if plan is None:
        emit({"success": False, "error": "plan_failed", "detail": error})
        return EXIT_INPUT

    agent_review = "skipped"
    agent_output = None
    if args.agent_command:
        proc = subprocess.run(args.agent_command.split() + [bundle_path],
                              stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        agent_review = "ran" if proc.returncode == 0 else "failed"
        agent_output = proc.stdout.decode("utf-8", "replace").strip()[:2000]
        review_path = os.path.join(evidence, "agent-review.txt")
        with io.open(review_path, "w", encoding="utf-8") as h:
            h.write(agent_output or "")
    else:
        review_path = None

    passed = bool(score.get("success"))
    emit({
        "success": passed,
        "score": score.get("score"),
        "arithmetic": score.get("arithmetic"),
        "pass_score": score.get("pass_score"),
        "required_failed": score.get("required_failed"),
        "required_all_pass": score.get("required_all_pass"),
        "failed": score.get("failed"),
        "rectification": plan.get("rectification"),
        "rectification_unresolved": plan.get("unresolved"),
        "agent_review": agent_review,
        "agent_review_output": review_path,
        "verdict": score.get("verdict"),
        "note": ("agent_review=skipped：未提供独立复核命令，分数偏松（知情降级）。"
                 if agent_review == "skipped" else "已执行独立复核。"),
    })
    return EXIT_OK if passed else EXIT_FAIL


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
