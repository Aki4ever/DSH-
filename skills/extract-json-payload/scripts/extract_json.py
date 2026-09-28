#!/usr/bin/env python3
import sys
import json
import argparse
import re

def extract_json(raw_text: str) -> dict:
    text = raw_text.strip()
    try:
        return {"ok": True, "data": json.loads(text)}
    except Exception:
        pass

    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if fence:
        try:
            return {"ok": True, "data": json.loads(fence.group(1).strip())}
        except Exception:
            pass

    first = text.find('{')
    last = text.rfind('}')
    if first != -1 and last > first:
        try:
            return {"ok": True, "data": json.loads(text[first:last+1])}
        except Exception:
            pass

    return {"ok": False, "error": "No valid JSON payload found"}

def main():
    parser = argparse.ArgumentParser(description="Extract JSON payload from text")
    parser.add_argument("--input", "-i", help="Input file path")
    args = parser.parse_args()

    content = ""
    if args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            content = f.read()
    else:
        content = sys.stdin.read()

    res = extract_json(content)
    if res["ok"]:
        print(json.dumps(res["data"], ensure_ascii=False, indent=2))
        sys.exit(0)
    else:
        print(f"ERROR: {res['error']}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
