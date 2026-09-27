#!/usr/bin/env python3
import os
import sys
import re
import argparse
import json

def validate_icons(text: str) -> dict:
    status_match = re.search(r"🚀\s*【当前状态】\s*([^\n\r]+)", text)
    has_status = bool(status_match)
    
    valid_states = ["【已实施】", "【规划中】", "【实施中】", "【已阻断】", "已实施", "规划中", "实施中", "已阻断"]
    status_text = status_match.group(1).strip() if status_match else ""
    state_valid = any(s in status_text for s in valid_states)

    has_hit = bool(re.search(r"🎯\s*【索引命中】", text))
    has_duration = bool(re.search(r"⏱️\s*【路由时长】", text))

    has_deliverables = bool(re.search(r"📦\s*【输出物】", text))
    has_paths = bool(re.search(r"📍\s*【输出地址】", text))
    has_conclusion = bool(re.search(r"💡\s*【核心结论】", text))
    has_notes = bool(re.search(r"📌\s*【重要说明】", text))

    metrics_valid = has_hit and has_duration

    branch_with_files = has_status and state_valid and metrics_valid and has_deliverables and has_paths and has_notes and not has_conclusion
    branch_without_files = has_status and state_valid and metrics_valid and has_conclusion and has_notes and not has_deliverables and not has_paths

    is_valid = branch_with_files or branch_without_files
    branch = "WITH_DELIVERABLES" if branch_with_files else ("WITHOUT_DELIVERABLES" if branch_without_files else "INVALID")

    return {
        "valid": is_valid,
        "branch": branch,
        "status_state_valid": state_valid,
        "metrics_valid": metrics_valid,
        "icons_found": {
            "status (🚀)": has_status,
            "hit (🎯)": has_hit,
            "duration (⏱️)": has_duration,
            "deliverables (📦)": has_deliverables,
            "paths (📍)": has_paths,
            "conclusion (💡)": has_conclusion,
            "notes (📌)": has_notes
        }
    }

def main():
    parser = argparse.ArgumentParser(description="Validate iconized tail framework via regex")
    parser.add_argument("--text-file", "-f", help="Path to text file to validate")
    parser.add_argument("--text", "-t", help="Raw string text to validate")
    args = parser.parse_args()

    content = ""
    if args.text_file:
        if not os.path.exists(args.text_file):
            print(json.dumps({"valid": False, "error": f"File not found: {args.text_file}"}))
            sys.exit(1)
        with open(args.text_file, "r", encoding="utf-8") as fp:
            content = fp.read()
    elif args.text:
        content = args.text
    else:
        print(json.dumps({"valid": False, "error": "Must provide --text-file or --text"}))
        sys.exit(1)

    res = validate_icons(content)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res["valid"] else 1)

if __name__ == "__main__":
    main()
