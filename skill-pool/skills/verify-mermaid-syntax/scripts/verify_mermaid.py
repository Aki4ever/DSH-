#!/usr/bin/env python3
import os
import sys
import re
import argparse
import json

def verify_mermaid(content: str) -> dict:
    blocks = re.findall(r"```mermaid\n(.*?)```", content, re.DOTALL)
    if not blocks:
        return {"ok": True, "has_mermaid": False, "blocks_count": 0, "errors": []}

    valid_headers = [
        "graph", "flowchart", "sequencediagram", "classdiagram", 
        "statediagram", "erdiagram", "gantt", "pie", "journey"
    ]
    
    errors = []
    for idx, b in enumerate(blocks):
        lines = [l.strip() for l in b.strip().splitlines() if l.strip() and not l.strip().startswith("%%")]
        if not lines:
            errors.append(f"Block #{idx+1}: Empty mermaid body")
            continue
        header = lines[0].lower().split()[0]
        if not any(header.startswith(vh) for vh in valid_headers):
            errors.append(f"Block #{idx+1}: Unsupported or missing diagram header '{header}'")

    return {
        "ok": len(errors) == 0,
        "has_mermaid": True,
        "blocks_count": len(blocks),
        "errors": errors
    }

def main():
    parser = argparse.ArgumentParser(description="Verify mermaid syntax in text or markdown file")
    parser.add_argument("--file", "-f", help="Markdown file path")
    parser.add_argument("--text", "-t", help="Raw text string")
    args = parser.parse_args()

    content = ""
    if args.file:
        if not os.path.exists(args.file):
            print(json.dumps({"ok": False, "error": f"File not found: {args.file}"}))
            sys.exit(1)
        with open(args.file, "r", encoding="utf-8") as fp:
            content = fp.read()
    elif args.text:
        content = args.text
    else:
        print(json.dumps({"ok": False, "error": "Must provide --file or --text"}))
        sys.exit(1)

    res = verify_mermaid(content)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res["ok"] else 1)

if __name__ == "__main__":
    main()
