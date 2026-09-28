#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
collect_evidence.py
按 process-spec.json 从**磁盘实况 + 证据目录**逐步取证的采集器。

口径唯一来源：skills/process-conformance-policy/SKILL.md（判据）与
             docs/operations/process-spec.json（步骤表）

铁律：**没有证据不等于走了这一步**。取不到证据一律记 fail + unverifiable，
      绝不因为「看起来应该做了」而给 pass。`na` 只在该步明确不适用时给出。

Exit Code:
  0 - 采集完成（步骤里允许有 fail）
  2 - 输入不可读（spec 缺失/不可解析、evidence 目录不存在）
"""

import sys

sys.dont_write_bytecode = True

import os
import io
import json
import argparse

EXIT_OK = 0
EXIT_INPUT = 2
HERE = os.path.dirname(os.path.abspath(__file__))
POOL_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SPEC_PATH = os.path.join(POOL_ROOT, "docs", "operations", "process-spec.json")
PLACEHOLDER_WORDS = ("更新", "修改", "临时提交", "wip", "fix", "update")


def emit(p):
    print(json.dumps(p, ensure_ascii=False, indent=2))


def read_json(path):
    try:
        with io.open(path, encoding="utf-8") as h:
            return json.load(h)
    except (OSError, ValueError):
        return None


def read_text(path):
    try:
        with io.open(path, encoding="utf-8") as h:
            return h.read()
    except (OSError, UnicodeDecodeError):
        return None


def ev(evidence_dir, name):
    return os.path.join(evidence_dir, name)


def step_s1(root, _e):
    path = os.path.join(root, "docs", "requirements", "index.md")
    text = read_text(path)
    if text is None:
        return "fail", "docs/requirements/index.md 不存在", None
    marker = "当前生效基线"
    if marker not in text:
        return "fail", "index.md 缺「%s」字段" % marker, path
    for line in text.splitlines():
        if marker in line and "|" in line:
            value = line.split("|")[2].strip() if len(line.split("|")) > 2 else ""
            if value:
                return "pass", "基线 = %s" % value, path
    return "fail", "基线版本为空", path


def step_s2(root, _e):
    path = os.path.join(root, "docs", "operations", "global-rules-index.md")
    if os.path.isfile(path):
        return "pass", "规则指纹索引存在", path
    return "fail", "缺 docs/operations/global-rules-index.md", None


def step_s3(root, e):
    path = ev(e, "problem-log-query.txt")
    if os.path.isfile(path):
        return "pass", "问题台账检索留痕存在", path
    problem_log = os.path.join(root, "docs", "problem-log")
    if os.path.isdir(problem_log) and os.listdir(problem_log):
        return "pass", "docs/problem-log/ 非空", problem_log
    return "fail", "既无检索留痕也无问题台账记录", None


def step_s4(_root, e):
    path = ev(e, "lane.json")
    data = read_json(path) if os.path.isfile(path) else None
    if data is None:
        return "fail", "缺 evidence/lane.json", None
    missing = [k for k in ("lane", "score", "matched_redlines", "reason") if k not in data]
    if missing:
        return "fail", "lane.json 缺字段 %s" % ",".join(missing), path
    return "pass", "lane=%s score=%s" % (data.get("lane"), data.get("score")), path


def step_s5(_root, e):
    for name in ("context-payload.json", "selected-skills.json"):
        path = ev(e, name)
        data = read_json(path) if os.path.isfile(path) else None
        if data is None:
            continue
        skills = data.get("skills") or data.get("selected") or []
        topk = data.get("top_k") or data.get("topK") or 5
        if len(skills) > topk:
            return "fail", "加载 %d 个技能，超 top-K=%d" % (len(skills), topk), path
        return "pass", "加载 %d 个技能（top-K=%d）" % (len(skills), topk), path
    return "fail", "缺 evidence/context-payload.json", None


def step_s6(_root, e, changed):
    if changed is not None and not changed:
        return "na", "本次无写入变更，粒度/口径门禁不适用", None
    for name in ("fission.json", "consistency.json"):
        path = ev(e, name)
        if os.path.isfile(path):
            code = read_json(path) or {}
            if code.get("exit_code", 0) == 0 or code.get("success") is True:
                return "pass", "%s 通过" % name, path
            return "fail", "%s 未通过" % name, path
    return "fail", "缺 evidence/fission.json 与 consistency.json", None


def step_s7(root, e, changed):
    path = ev(e, "changed-files.txt")
    text = read_text(path)
    if text is None:
        return "fail", "缺 evidence/changed-files.txt", None
    files = [x.strip() for x in text.splitlines() if x.strip()]
    if not files:
        return "na", "变更集合为空，无需同步台账", path
    ledger = ("docs/requirements/product.md", "docs/requirements/index.md",
              "docs/requirements/change-log.md", "docs/operations/workflows.md")
    first = None
    for rel in files:
        full = os.path.join(root, rel)
        if os.path.isfile(full):
            m = os.path.getmtime(full)
            first = m if first is None else min(first, m)
    if first is None:
        return "fail", "变更文件都不存在，无法比对时间", path
    touched = [rel for rel in ledger if os.path.isfile(os.path.join(root, rel))
               and os.path.getmtime(os.path.join(root, rel)) >= first - 1]
    if touched:
        return "pass", "台账已同步：%s" % "、".join(touched), path
    return "fail", "受影响台账未同步（变更起点 %.0f 之后无台账改动）" % first, path


def step_s8(_root, e):
    path = ev(e, "commit-message.txt")
    text = read_text(path)
    if text is None:
        return "fail", "缺 evidence/commit-message.txt", None
    body = text.strip()
    if not body:
        return "fail", "提交备注为空", path
    if len(body) < 12:
        return "fail", "提交备注过短（%d 字符），不构成说明" % len(body), path
    lowered = body.lower()
    if any(body.strip() == w or lowered.strip() == w for w in PLACEHOLDER_WORDS):
        return "fail", "提交备注是占位词：%s" % body.strip(), path
    return "pass", "备注 %d 字符，非占位" % len(body), path


def step_s9(_root, e):
    path = ev(e, "guard-output.json")
    data = read_json(path) if os.path.isfile(path) else None
    if data is None:
        return "fail", "缺 evidence/guard-output.json", None
    results = data.get("guards") or {}
    if not results:
        return "fail", "guard-output.json 无 guards 结果", path
    failed = [k for k, v in results.items() if v not in (0, True)]
    if failed:
        return "fail", "未通过：%s" % ",".join(failed), path
    return "pass", "三项输出规约门禁全过", path


def main(argv):
    ap = argparse.ArgumentParser(prog="collect_evidence.py",
                                 description="流程合规取证器（无证据 = fail，不等于通过）")
    ap.add_argument("--evidence", required=True, help="本次任务的证据目录")
    ap.add_argument("--out", default=None, help="证据包输出路径")
    ap.add_argument("--root", default=POOL_ROOT, help="技能池根目录")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    spec = read_json(SPEC_PATH)
    if spec is None:
        emit({"success": False, "error": "spec_unreadable", "detail": SPEC_PATH})
        return EXIT_INPUT
    evidence_dir = os.path.abspath(os.path.expanduser(args.evidence))
    if not os.path.isdir(evidence_dir):
        emit({"success": False, "error": "evidence_dir_missing", "detail": evidence_dir})
        return EXIT_INPUT
    changed_path = ev(evidence_dir, "changed-files.txt")
    changed = None
    text = read_text(changed_path) if os.path.isfile(changed_path) else None
    if text is not None:
        changed = [x.strip() for x in text.splitlines() if x.strip()]

    dispatch = {"S1": lambda: step_s1(args.root, evidence_dir),
                "S2": lambda: step_s2(args.root, evidence_dir),
                "S3": lambda: step_s3(args.root, evidence_dir),
                "S4": lambda: step_s4(args.root, evidence_dir),
                "S5": lambda: step_s5(args.root, evidence_dir),
                "S6": lambda: step_s6(args.root, evidence_dir, changed),
                "S7": lambda: step_s7(args.root, evidence_dir, changed),
                "S8": lambda: step_s8(args.root, evidence_dir),
                "S9": lambda: step_s9(args.root, evidence_dir)}

    items = []
    for step in spec.get("steps", []):
        sid = step.get("id")
        fn = dispatch.get(sid)
        if fn is None:
            items.append({"id": sid, "title": step.get("title"), "weight": step.get("weight"),
                          "required": bool(step.get("required")), "status": "fail",
                          "detail": "未实现该步骤的取证分支", "unverifiable": True,
                          "evidence": None, "rectify": step.get("rectify")})
            continue
        status, detail, path = fn()
        items.append({"id": sid, "title": step.get("title"), "weight": step.get("weight"),
                      "required": bool(step.get("required")), "status": status,
                      "detail": detail, "unverifiable": status == "fail",
                      "evidence": (os.path.relpath(path, args.root) if path else None),
                      "rectify": step.get("rectify")})

    out = {"spec_version": spec.get("version"), "pass_score": spec.get("pass_score"),
           "evidence_dir": evidence_dir, "generated_from": spec.get("generated_from"),
           "steps": items}
    target = args.out or os.path.join(evidence_dir, "evidence-bundle.json")
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with io.open(target, "w", encoding="utf-8") as h:
        json.dump(out, h, ensure_ascii=False, indent=2)
        h.write("\n")
    emit({"success": True, "bundle": target, "steps": len(items),
          "pass": sum(1 for i in items if i["status"] == "pass"),
          "fail": sum(1 for i in items if i["status"] == "fail"),
          "na": sum(1 for i in items if i["status"] == "na")})
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
