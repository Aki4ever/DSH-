#!/usr/bin/env python3
import sys
import json
import argparse
import re

def clean_and_validate_json(raw_text: str) -> dict:
    text = raw_text.strip()
    # 尝试直接解析
    try:
        data = json.loads(text)
        return {"valid": True, "data": data, "raw": text}
    except Exception:
        pass
    
    # 尝试匹配 ```json ... ``` 块
    fence_pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
    match = re.search(fence_pattern, text)
    if match:
        extracted = match.group(1).strip()
        try:
            data = json.loads(extracted)
            return {"valid": True, "data": data, "raw": extracted}
        except Exception as e:
            return {"valid": False, "error": f"Fenced block invalid JSON: {e}"}
            
    # 尝试提取第一个 { 到最后一个 }
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = text[first_brace:last_brace+1]
        try:
            data = json.loads(candidate)
            return {"valid": True, "data": data, "raw": candidate}
        except Exception as e:
            return {"valid": False, "error": f"Extracted candidate invalid JSON: {e}"}

    return {"valid": False, "error": "No valid JSON structure found"}

def main():
    parser = argparse.ArgumentParser(description="Validate and sanitize structured text output")
    parser.add_argument("--input", "-i", type=str, help="Input file path (default stdin)")
    parser.add_argument("--format", "-f", choices=["json"], default="json", help="Expected format")
    args = parser.parse_args()

    if args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            content = f.read()
    else:
        content = sys.stdin.read()

    res = clean_and_validate_json(content)
    if res["valid"]:
        print(json.dumps(res["data"], ensure_ascii=False, indent=2))
        sys.exit(0)
    else:
        print(f"ERROR: {res['error']}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
