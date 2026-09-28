#!/usr/bin/env python3
import sys
import argparse
import json
import re

ENTITIES = ["json", "yaml", "xml", "markdown", "代码", "文件", "目录", "表格", "文档", "需求", "脚本", "规则"]

def detect_entity(text: str) -> dict:
    t = text.lower().strip()
    found = None
    for e in ENTITIES:
        if e in t:
            found = e
            break
    return {
        "text": text,
        "entity_found": found is not None,
        "target_entity": found if found else "通用内容"
    }

def main():
    parser = argparse.ArgumentParser(description="Detect target entity in text")
    parser.add_argument("--text", "-t", required=True, help="Input text")
    args = parser.parse_args()

    res = detect_entity(args.text)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res["entity_found"] else 1)

if __name__ == "__main__":
    main()
