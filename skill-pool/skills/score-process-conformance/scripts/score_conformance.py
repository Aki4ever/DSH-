#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
score_conformance.py
按 process-spec.json 的权重与必需项给流程合规打分。

打分口径（唯一真相源：skills/process-conformance-policy/SKILL.md）：
  * 分子 = status==pass 的权重之和
  * 分母 = 总权重 - status==na 的权重之和（na 从分母扣除，**绝不当 pass**）
  * 通过 = 得分 >= pass_score 且 **全部必需项 pass**（必需项一票否决，不由加权稀释）
  * fail 一律带 unverifiable 标记：**没有证据不等于走了这一步**

输出必须打印分子 / 分母 / na 扣除项，禁止只给一个百分数。

Exit Code:
  0 - 通过
  1 - 未通过（附逐项明细）
  2 - 输入不可读（证据包缺失/不可解析）
"""

import sys

sys.dont_write_bytecode = True

import io
import json
import argparse

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_INPUT = 2


def emit(p):
    print(json.dumps(p, ensure_ascii=False, indent=2))


def main(argv):
    ap = argparse.ArgumentParser(prog="score_conformance.py",
                                 description="流程合规打分器（分子/分母/na 全公开）")
    ap.add_argument("--bundle", required=True, help="collect_evidence.py 产出的证据包")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    try:
        with io.open(args.bundle, encoding="utf-8") as h:
            bundle = json.load(h)
    except (OSError, ValueError) as exc:
        emit({"success": False, "error": "bundle_unreadable", "detail": str(exc)})
        return EXIT_INPUT

    steps = bundle.get("steps") or []
    if not steps:
        emit({"success": False, "error": "bundle_empty", "detail": "steps 为空"})
        return EXIT_INPUT
    pass_score = int(bundle.get("pass_score") or 85)

    numerator = 0
    total = 0
    na_weight = 0
    na_steps = []
    failed = []
    required_failed = []
    for step in steps:
        weight = int(step.get("weight") or 0)
        total += weight
        status = step.get("status")
        if status == "na":
            na_weight += weight
            na_steps.append(step.get("id"))
            continue
        if status == "pass":
            numerator += weight
        else:
            failed.append({"id": step.get("id"), "title": step.get("title"),
                           "detail": step.get("detail"), "unverifiable": step.get("unverifiable"),
                           "rectify": step.get("rectify")})
            if step.get("required"):
                required_failed.append(step.get("id"))

    denominator = total - na_weight
    score = int(round(numerator * 100.0 / denominator)) if denominator else 0
    required_all = not required_failed
    passed = score >= pass_score and required_all

    emit({
        "success": passed,
        "score": score,
        "numerator": numerator,
        "denominator": denominator,
        "total_weight": total,
        "na_weight_deducted": na_weight,
        "na_steps": na_steps,
        "pass_score": pass_score,
        "required_all_pass": required_all,
        "required_failed": required_failed,
        "failed": failed,
        "verdict": "process_conformant" if passed else "process_not_conformant",
        "arithmetic": "%d / %d = %d%%（总权重 %d，na 扣除 %d）" % (
            numerator, denominator, score, total, na_weight),
    })
    return EXIT_OK if passed else EXIT_FAIL


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
