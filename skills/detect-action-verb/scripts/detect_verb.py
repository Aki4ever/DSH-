#!/usr/bin/env python3
import sys
import argparse
import json
import re

VERBS = ["生成", "创建", "修改", "删除", "检验", "提取", "过滤", "规划", "分析", "输出", "运行", "执行", "自检", "检查"]

def detect_verb(text: str) -> dict:
    t = text.strip()
    found = None
    for v in VERBS:
        if v in t:
            found = v
            break
    return {
        "text": text,
        "verb_found": found is not None,
        "action_verb": found if found else "默认操作"
    }

def main():
    parser = argparse.ArgumentParser(description="Detect action verb in text")
    parser.add_argument("--text", "-t", required=True, help="Input text")
    args = parser.parse_args()

    res = detect_verb(args.text)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res["verb_found"] else 1)

if __name__ == "__main__":
    main()
