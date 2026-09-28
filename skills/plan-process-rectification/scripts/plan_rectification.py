#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
plan_rectification.py
对流程合规打分中**未通过**的步骤产出可执行整改清单。

口径：每个 fail 项必须带一条**可直接执行**的命令或动作；写不出命令的整改项
      判为不合格（exit 1）——「加强重视」「下不为例」不是整改。

Exit Code:
  0 - 整改清单产出完毕（可为空 = 无需整改）
  1 - 存在无法整改的项（缺 rectify）
  2 - 输入不可读
"""

import sys

sys.dont_write_bytecode = True

import io
import json
import argparse

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_INPUT = 2
VAGUE = ("加强", "重视", "注意", "下不为例", "尽快", "以后")


def emit(p):
    print(json.dumps(p, ensure_ascii=False, indent=2))


def main(argv):
    ap = argparse.ArgumentParser(prog="plan_rectification.py",
                                 description="流程整改清单生成器（写不出命令的整改项不合格）")
    ap.add_argument("--bundle", required=True)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    try:
        with io.open(args.bundle, encoding="utf-8") as h:
            bundle = json.load(h)
    except (OSError, ValueError) as exc:
        emit({"success": False, "error": "bundle_unreadable", "detail": str(exc)})
        return EXIT_INPUT

    items = []
    vague = []
    for step in bundle.get("steps") or []:
        if step.get("status") != "fail":
            continue
        rectify = (step.get("rectify") or "").strip()
        record = {"id": step.get("id"), "title": step.get("title"),
                  "reason": step.get("detail"), "rectify": rectify,
                  "required": bool(step.get("required")),
                  "unverifiable": bool(step.get("unverifiable"))}
        if not rectify:
            record["problem"] = "缺可执行整改动作"
        elif any(word in rectify for word in VAGUE):
            record["problem"] = "整改动作是空话（含「%s」）" % "/".join(VAGUE)
            vague.append(step.get("id"))
        items.append(record)

    unresolved = [i["id"] for i in items if i.get("problem")]
    payload = {
        "success": not unresolved,
        "failed_steps": len(items),
        "required_failed": [i["id"] for i in items if i["required"]],
        "rectification": items,
        "unresolved": unresolved,
        "note": "空清单表示无需整改；有 fail 但写不出命令的整改项一律判不合格。",
    }
    emit(payload)
    return EXIT_OK if not unresolved else EXIT_FAIL


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
