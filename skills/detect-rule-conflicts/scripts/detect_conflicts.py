#!/usr/bin/env python3
import sys
import argparse
import json
import re

# 互斥模式对
EXCLUSIVE_PAIRS = [
    {"type": "language", "a": r"(纯中文|全中文|只能中文|必须中文)", "b": r"(英文|english|纯英文)", "desc": "语种冲突：同时要求中文与英文"},
    {"type": "fence", "a": r"(去围栏|不要代码块|裸数据|禁止代码块)", "b": r"(必须代码块|用```包裹|包含围栏)", "desc": "排版冲突：代码围栏要求相反"},
    {"type": "length", "a": r"(10字内|不超过10字|极简|短文本)", "b": r"(详细|长篇|不少于\d+字|详尽阐述)", "desc": "长度冲突：同时要求极简与长篇详尽"},
    {"type": "format", "a": r"(纯JSON|纯json|严格json)", "b": r"(图表|Markdown表格|自由散文)", "desc": "格式冲突：纯JSON与富文本格式冲突"}
]

def check_conflicts(rules: list) -> dict:
    conflicts = []
    text_corpus = " \n ".join(rules)

    for item in EXCLUSIVE_PAIRS:
        m_a = re.search(item["a"], text_corpus, re.IGNORECASE)
        m_b = re.search(item["b"], text_corpus, re.IGNORECASE)
        if m_a and m_b:
            conflicts.append({
                "type": item["type"],
                "trigger_a": m_a.group(0),
                "trigger_b": m_b.group(0),
                "description": item["desc"],
                "suggested_solution": f"遵循优先级准则裁决：若为当前会话显式输入则保留更为具体的约束，否则裁剪掉次级规则。"
            })

    return {
        "has_conflict": len(conflicts) > 0,
        "conflict_count": len(conflicts),
        "conflicts": conflicts
    }

def main():
    parser = argparse.ArgumentParser(description="Detect conflicting rules in rule set")
    parser.add_argument("--rules", nargs="+", required=True, help="List of rules to check")
    args = parser.parse_args()

    res = check_conflicts(args.rules)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if not res["has_conflict"] else 1)

if __name__ == "__main__":
    main()
