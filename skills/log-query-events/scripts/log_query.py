#!/usr/bin/env python3
"""
log_query.py
把一次检索的质量信号追加写入 skill-query-log.jsonl。

Exit Code:
  0 - 事件已追加且可解析
  1 - 参数缺失或目标不可写
"""

import os
import sys
import json
import argparse
from datetime import datetime

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
DEFAULT_LOG = os.path.join(REPO_ROOT, "docs/operations/skill-query-log.jsonl")


def append_event(log_path, event):
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    line = json.dumps(event, ensure_ascii=False, sort_keys=True)
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(line + "\n")

    with open(log_path, "r", encoding="utf-8") as f:
        last = f.read().strip().splitlines()[-1]
    return json.loads(last)


def main() -> int:
    parser = argparse.ArgumentParser(description="Append a retrieval quality signal")
    parser.add_argument("--query", "-q", required=True)
    parser.add_argument("--results", required=True, help="Comma-separated result ids")
    parser.add_argument("--chosen", default=None, help="Skill actually used")
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--log", default=DEFAULT_LOG)
    parser.add_argument("--json", action="store_true", help="JSON output (default)")
    args = parser.parse_args()

    results = [r.strip() for r in args.results.split(",") if r.strip()]
    if not args.query.strip() or not results:
        print(json.dumps({"success": False, "error": "empty query or results"},
                         ensure_ascii=False, indent=2))
        return 1

    event = {
        "ts": datetime.now().isoformat(timespec="seconds"),
        "query": args.query.strip(),
        "results": results,
        "chosen": args.chosen,
        "top_k": args.top_k,
    }

    try:
        stored = append_event(args.log, event)
    except (OSError, ValueError, IndexError) as exc:
        print(json.dumps({"success": False, "error": f"append failed: {exc}"},
                         ensure_ascii=False, indent=2))
        return 1

    print(json.dumps({"success": True, "log": args.log, "event": stored},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
