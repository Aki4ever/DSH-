#!/usr/bin/env python3
"""
verify_no_question.py
反问检测器：断言一次任务没有发起不必要的提问。

元规则来自 L1 规约 one-shot-resolution-policy 第 ④ 条：
提问例外 = 红线 + 不可逆 + 每任务 ≤ 1 次且批量合并。四条断言全过才 Exit 0。

四条断言：
  1. 提问次数 ≤ 1（每任务）；
  2. 每次提问必须同时满足「有非空 redline」且「reversible == false」；
  3. 若提问次数为 1，必须 batch == true，否则视为挤牙膏式追问；
  4. 未给 --allow-ask 时，任何提问都判失败（默认零提问）。

红线编号 R1~R5 的定义唯一真相源是 skills/fastlane-redline-policy/SKILL.md，
本脚本只校验 redline 字段是否非空，不复制红线清单。

Exit Code:
  0 - 四条断言全部通过
  1 - 存在违规
  2 - 输入不可读
"""

import os
import sys
import json

# 每个任务的提问硬上限：第二次提问即判失败
MAX_QUESTIONS = 1


def normalize(value):
    """空值与 None 统一归一为去空白字符串。"""
    if value is None:
        return ""
    return str(value).strip()


def is_false(value):
    """严格判定布尔假：只认 Python 的 False（JSON false），字符串 'false' 也认。"""
    if value is False:
        return True
    if isinstance(value, str) and value.strip().lower() == "false":
        return True
    return False


def is_true(value):
    """严格判定布尔真：只认 Python 的 True（JSON true），字符串 'true' 也认。"""
    if value is True:
        return True
    if isinstance(value, str) and value.strip().lower() == "true":
        return True
    return False


def read_questions(path: str):
    """读取 JSONL 形式的问题记录；不可读返回 None。"""
    if not os.path.exists(path) or not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            raw = handle.read()
    except (OSError, UnicodeDecodeError):
        return None

    questions = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except ValueError:
            payload = None
        if isinstance(payload, dict):
            questions.append(payload)
    return questions


def main() -> int:
    argv = sys.argv[1:]

    path = None
    allow_ask = False
    use_json = False

    index = 0
    while index < len(argv):
        token = argv[index]
        if token == "--questions":
            if index + 1 >= len(argv):
                print(json.dumps({"success": False, "error": "缺少 --questions 参数值"},
                                 ensure_ascii=False))
                return 1
            path = argv[index + 1]
            index += 2
        elif token == "--allow-ask":
            allow_ask = True
            index += 1
        elif token == "--json":
            use_json = True
            index += 1
        else:
            print(json.dumps({"success": False, "error": f"未知参数: {token}"},
                             ensure_ascii=False))
            return 1

    if path is None:
        print(json.dumps({"success": False, "error": "必须提供 --questions"},
                         ensure_ascii=False))
        return 1

    questions = read_questions(path)
    if questions is None:
        print(json.dumps({"success": False, "error": f"文件不存在或不可读: {path}"},
                         ensure_ascii=False))
        return 2

    count = len(questions)
    violations = []

    # 断言 1：提问次数 ≤ 1（每任务）
    if count > MAX_QUESTIONS:
        for position, question in enumerate(questions, start=1):
            if position <= MAX_QUESTIONS:
                continue
            violations.append({
                "seq": question.get("seq", position),
                "kind": "too_many",
                "detail": (
                    f"本任务已提问 {count} 次，超过每任务上限 {MAX_QUESTIONS} 次；"
                    f"第 {position} 次提问属第二次追问，直接判失败"
                ),
            })

    # 断言 2：每次提问必须有非空 redline 且 reversible == false
    for position, question in enumerate(questions, start=1):
        seq = question.get("seq", position)
        if not normalize(question.get("redline")):
            violations.append({
                "seq": seq,
                "kind": "no_redline",
                "detail": "提问缺少非空 redline，不满足「红线 + 不可逆」例外条件",
            })
        if not is_false(question.get("reversible")):
            violations.append({
                "seq": seq,
                "kind": "reversible",
                "detail": (
                    f"提问的 reversible 取值为 {question.get('reversible')!r}，"
                    f"必须显式为 false（不可逆）才允许提问"
                ),
            })

    # 断言 3：提问次数为 1 时必须 batch == true
    if count == 1 and not is_true(questions[0].get("batch")):
        violations.append({
            "seq": questions[0].get("seq", 1),
            "kind": "not_batched",
            "detail": "本轮提问未合并为一次批量提问（batch != true），属挤牙膏式追问",
        })

    # 断言 4：未给 --allow-ask 时，任何提问都判失败
    # kind 只允许 too_many|no_redline|reversible|not_batched 四值（契约固定枚举），
    # 「未授权提问」在语义上就是「预算被击穿」，故归入 too_many 并在 detail 中写明真因。
    if count > 0 and not allow_ask:
        for position, question in enumerate(questions, start=1):
            violations.append({
                "seq": question.get("seq", position),
                "kind": "too_many",
                "detail": (
                    "未提供 --allow-ask，按「默认零提问」原则本次任务的提问预算为 0，"
                    "任何提问即视为超限失败"
                ),
            })

    checks = [
        {
            "name": "question_count<=1",
            "pass": count <= MAX_QUESTIONS,
            "detail": f"提问次数 {count}，上限 {MAX_QUESTIONS}",
        },
        {
            "name": "every_ask_has_redline_and_irreversible",
            "pass": all(
                normalize(q.get("redline")) and is_false(q.get("reversible"))
                for q in questions
            ),
            "detail": "每次提问都必须带非空 redline 且 reversible == false",
        },
        {
            "name": "single_ask_is_batched",
            "pass": count != 1 or is_true(questions[0].get("batch")),
            "detail": "提问次数为 1 时必须 batch == true（合并为一次批量提问）",
        },
        {
            "name": "allow_ask_granted_or_zero_questions",
            "pass": allow_ask or count == 0,
            "detail": "未提供 --allow-ask 时提问次数必须为 0",
        },
    ]

    success = not violations
    payload = {
        "success": success,
        "question_count": count,
        "violations": violations,
        "checks": checks,
        "ask_budget": {"allowed": MAX_QUESTIONS, "used": count},
    }

    if use_json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        state = "PASS" if success else "FAIL"
        print(f"{state}\tquestion_count={count}")
        for check in checks:
            print(f"  [{'pass' if check['pass'] else 'fail'}] {check['name']}: {check['detail']}")
        for violation in violations:
            print(f"  违规 seq={violation['seq']} kind={violation['kind']}: {violation['detail']}")

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
