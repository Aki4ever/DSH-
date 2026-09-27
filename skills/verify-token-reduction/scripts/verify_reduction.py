#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_reduction.py
token 降幅与等价能力双断言门禁：降幅达标 + requires 证据串全部存活，才放行。

断言（全过才退 0）：
  1. after_tokens <= before_tokens * (1 - target)；
  2. 能力不变：cases.json 中每条 case 的每个 requires 字符串都必须仍出现在 after 文本拼接结果中；
  3. 输出 JSON：success / before_tokens / after_tokens / saved_ratio / target / capability / checks。

token 估算公式（唯一标准，全池三脚本一致）：汉字约 1 token/字，ASCII 约 4 字节 1 token。
该数值是确定性估算，不是真实分词器。

Exit Code:
  0 - 降幅达标且能力证据全部存活
  1 - 降幅不足，或存在能力缺失
  2 - 参数/文件缺失（缺参、文件不存在、cases.json 结构非法）
"""

import os
import sys
import json
import math
import argparse


def est_tokens(text: str) -> int:
    cjk = sum(1 for ch in text if '\u4e00' <= ch <= '\u9fff')
    ascii_bytes = sum(1 for ch in text if ord(ch) < 128)
    return math.ceil(cjk + ascii_bytes / 4)


def read_concat(paths):
    return "\n".join(read_utf8(p) for p in paths)


def read_utf8(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        return fh.read()


def fail2(message: str) -> int:
    print(json.dumps({"success": False, "error": message}, ensure_ascii=False, indent=2))
    return 2


def load_cases(path: str):
    """返回 (cases, error_message)；cases 为规范化后的 [{id, requires}]。"""
    try:
        raw = json.loads(read_utf8(path))
    except (OSError, ValueError) as exc:
        return None, f"cases.json 不可读或非法 JSON: {exc}"
    if not isinstance(raw, dict) or not isinstance(raw.get("cases"), list):
        return None, "cases.json 结构非法：顶层必须为 {\"cases\": [...]}"
    cases = []
    for index, item in enumerate(raw["cases"]):
        if not isinstance(item, dict):
            return None, f"cases[{index}] 必须是对象"
        if not isinstance(item.get("requires"), list) or not all(
                isinstance(x, str) for x in item["requires"]):
            return None, f"cases[{index}].requires 必须是字符串数组"
        cases.append({
            "id": str(item.get("id", f"case-{index + 1}")),
            "requires": list(item["requires"]),
        })
    return cases, None


def main() -> int:
    parser = argparse.ArgumentParser(description="Token reduction and capability equivalence gate")
    parser.add_argument("--before", nargs="+", required=True, help="裁剪前文件列表")
    parser.add_argument("--after", nargs="+", required=True, help="裁剪后文件列表")
    parser.add_argument("--target", type=float, default=0.40, help="目标降幅，默认 0.40")
    parser.add_argument("--cases", required=True, help="能力证据文件 cases.json")
    parser.add_argument("--json", action="store_true", help="输出 JSON（本脚本恒输出 JSON）")
    args = parser.parse_args()

    if not 0.0 < args.target < 1.0:
        return fail2(f"--target 必须落在 (0, 1) 区间，收到 {args.target}")

    all_inputs = list(args.before) + list(args.after) + [args.cases]
    missing = [p for p in all_inputs if not os.path.isfile(p)]
    if missing:
        return fail2("参数/文件缺失，以下路径不存在: " + ", ".join(missing))

    cases, error = load_cases(args.cases)
    if error:
        return fail2(error)

    before_text = read_concat(args.before)
    after_text = read_concat(args.after)
    before_tokens = est_tokens(before_text)
    after_tokens = est_tokens(after_text)

    cap_tokens = before_tokens * (1.0 - args.target)
    reduction_ok = after_tokens <= cap_tokens
    saved_ratio = round((before_tokens - after_tokens) / before_tokens, 4) if before_tokens else 0.0

    missing_needles = []
    cases_passed = 0
    for case in cases:
        case_missing = [needle for needle in case["requires"] if needle not in after_text]
        if case_missing:
            for needle in case_missing:
                missing_needles.append({"case": case["id"], "needle": needle})
        else:
            cases_passed += 1
    capability_ok = not missing_needles

    checks = [
        {
            "name": "inputs_readable",
            "ok": True,
            "detail": f"before={len(args.before)} 个文件, after={len(args.after)} 个文件, cases={len(cases)} 条",
        },
        {
            "name": "cases_schema",
            "ok": True,
            "detail": "cases.json 结构合法：每条 case 含 id 与字符串数组 requires",
        },
        {
            "name": "token_reduction",
            "ok": reduction_ok,
            "detail": (f"after_tokens={after_tokens} <= before_tokens*(1-target)="
                       f"{math.floor(cap_tokens)} (before={before_tokens}, target={args.target})"),
        },
        {
            "name": "capability_preserved",
            "ok": capability_ok,
            "detail": (f"{cases_passed}/{len(cases)} 条 case 的 requires 证据串全部存活"
                       + ("" if capability_ok else f"，缺失 {len(missing_needles)} 条")),
        },
    ]

    success = reduction_ok and capability_ok
    payload = {
        "success": success,
        "before_tokens": before_tokens,
        "after_tokens": after_tokens,
        "saved_ratio": saved_ratio,
        "target": args.target,
        "capability": {
            "cases_total": len(cases),
            "cases_passed": cases_passed,
            "missing": missing_needles,
        },
        "checks": checks,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
