#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_retirement.py
工作区退役断言器：断言源目录**真的消失**、注册项**真的摘掉**、会话**真的完整**。

三项断言（全过才 exit 0）：
  1 source_absent       源路径不存在（退役的物理证据）
  2 workspace_absent    workspace.json 中不再有指向源路径的条目
  3 sessions_complete   台账记录的会话数全部落在目标工作区

Exit Code: 0 全过 / 1 任一失败 / 2 台账或 workspace.json 不可读
"""

import sys

sys.dont_write_bytecode = True

import os
import io
import json
import argparse

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_INPUT = 2


def emit(p):
    print(json.dumps(p, ensure_ascii=False, indent=2))


def main(argv):
    ap = argparse.ArgumentParser(prog="verify_retirement.py",
                                 description="工作区退役断言器（源消失 / 注册摘除 / 会话完整）")
    ap.add_argument("--all", action="store_true", help="校验全部退役记录（默认行为）")
    ap.add_argument("--ledger", default=None, help="退役台账路径")
    ap.add_argument("--ws", default=None, help="workspace.json 路径")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    here = os.path.dirname(os.path.abspath(__file__))
    pool = os.path.abspath(os.path.join(here, "..", "..", ".."))
    ledger_path = args.ledger or os.path.join(pool, "docs", "operations", "retired-workspaces.json")
    home = os.environ.get("DSH_HOME") or os.path.join(os.path.expanduser("~"), ".dsh")
    ws_path = args.ws or os.path.join(home, "storages", "workspace.json")

    if not os.path.isfile(ledger_path):
        emit({"success": False, "error": "ledger_missing", "detail": ledger_path})
        return EXIT_INPUT
    try:
        with io.open(ledger_path, encoding="utf-8") as h:
            ledger = json.load(h)
        with io.open(ws_path, encoding="utf-8") as h:
            ws = json.load(h)
    except (OSError, ValueError) as exc:
        emit({"success": False, "error": "input_unreadable", "detail": str(exc)})
        return EXIT_INPUT

    source = ledger.get("source")
    target = ledger.get("target")
    workspaces = (ws.get("tables") or {}).get("workspaces") or {}

    source_absent = not os.path.exists(source or "")
    entry_absent = not any(os.path.abspath(v.get("path", "")) == os.path.abspath(source or "")
                           for v in workspaces.values())
    target_key = next((k for k, v in workspaces.items()
                       if os.path.abspath(v.get("path", "")) == os.path.abspath(target or "")), None)
    target_ids = set(workspaces.get(target_key, {}).get("sessionIds") or []) if target_key else set()
    expected = int(ledger.get("sessions_migrated") or 0)
    sessions_complete = len(target_ids) >= expected and target_key is not None

    checks = [
        {"name": "source_absent", "pass": source_absent,
         "detail": "%s %s" % (source, "不存在" if source_absent else "仍然存在")},
        {"name": "workspace_absent", "pass": entry_absent,
         "detail": "workspace.json %s指向源路径的条目" % ("无" if entry_absent else "仍有")},
        {"name": "sessions_complete", "pass": sessions_complete,
         "detail": "目标工作区会话 %d 条（台账记录迁移 %d 条）" % (len(target_ids), expected)},
    ]
    passed = all(c["pass"] for c in checks)
    emit({"success": passed, "ledger": ledger_path, "checks": checks,
          "verdict": "retirement_verified" if passed else "retirement_not_verified"})
    return EXIT_OK if passed else EXIT_FAIL


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
