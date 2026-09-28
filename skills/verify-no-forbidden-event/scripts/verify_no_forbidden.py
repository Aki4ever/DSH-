#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_no_forbidden.py
反例零命中断言：importlib 直接加载同仓库的
skills/detect-forbidden-state/scripts/detect_forbidden.py（不起子进程），
要求 hits == 0；--strict 下额外要求 checked_events > 0，空事件流不得「空过」。

断言（全过才退 0）：
  1. no_forbidden_event：检测结果 hits 为空（七条反例全部未命中）；
  2. strict_events_present：--strict 时要求 checked_events > 0；非 strict 时恒真。
  3. input_readable：事件流可被读取与解析（失败即退 2，不进入放行判定）。

输出 JSON：{"success":bool,"checked_events":n,"hits":[...],"checks":[{"name","pass","detail"}]}

Exit Code:
  0 - 断言全部通过（零命中；--strict 下事件非空）
  1 - 命中反例，或 --strict 下事件流为空（不允许「空过」）
  2 - 输入不可读或不可解析，或检测模块无法加载
"""

import os
import sys
import json
import argparse
import importlib.util

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
DETECT_SCRIPT = os.path.join(REPO_ROOT, "skills/detect-forbidden-state/scripts/detect_forbidden.py")


def build_report(payload):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def load_detect_module():
    """importlib 加载同仓库检测脚本（进程内调用，不起子进程）。返回 (module, error)。"""
    if not os.path.exists(DETECT_SCRIPT):
        return None, "检测脚本不存在: %s" % DETECT_SCRIPT
    # 进程内加载不落 __pycache__，避免断言动作在别的技能目录留下副产物
    sys.dont_write_bytecode = True
    try:
        spec = importlib.util.spec_from_file_location("detect_forbidden", DETECT_SCRIPT)
        if spec is None or spec.loader is None:
            return None, "无法为 %s 构造 importlib spec" % DETECT_SCRIPT
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    except Exception as exc:  # 加载期任意异常都归为「不可用」
        return None, "检测脚本加载失败: %s" % exc
    return module, None


def fail_input(message):
    build_report({
        "success": False,
        "checked_events": 0,
        "hits": [],
        "checks": [{"name": "input_readable", "pass": False, "detail": message}],
        "error": message,
    })
    return 2


def main():
    parser = argparse.ArgumentParser(description="Assert zero forbidden anti-pattern events")
    parser.add_argument("--events", required=True, help="事件流 JSONL 文件路径")
    parser.add_argument("--strict", action="store_true",
                        help="严格模式：空事件流不允许「空过」，必须 checked_events > 0")
    parser.add_argument("--json", action="store_true", help="输出 JSON（本脚本恒输出 JSON）")
    args = parser.parse_args()

    module, error = load_detect_module()
    if error:
        return fail_input(error)

    events, error = module.read_events_path(args.events)
    if error:
        return fail_input(error)
    if not isinstance(events, list):
        return fail_input("事件流解析结果不是数组: %s" % type(events).__name__)

    hits = module.detect_events(events, dict(module.DEFAULT_THRESHOLDS))
    checked = len(events)

    checks = [
        {
            "name": "input_readable",
            "pass": True,
            "detail": "事件流已解析：%s，共 %d 条事件" % (args.events, checked),
        },
        {
            "name": "no_forbidden_event",
            "pass": len(hits) == 0,
            "detail": ("零命中：AP-01 ~ AP-07 全部未触发"
                       if not hits else
                       "命中 %d 条反例: %s" % (
                           len(hits),
                           "、".join("%s(seq=%s)" % (h["code"], ",".join(str(s) for s in h["seq"]))
                                     for h in hits),
                       )),
        },
        {
            "name": "strict_events_present",
            "pass": (checked > 0) if args.strict else True,
            "detail": ("--strict 生效：要求 checked_events > 0，实测 %d 条" % checked
                       if args.strict else
                       "非 strict 模式：空事件流按「无事件可违例」放行，实测 %d 条" % checked),
        },
    ]

    success = all(check["pass"] for check in checks)
    build_report({
        "success": success,
        "checked_events": checked,
        "hits": hits,
        "checks": checks,
    })
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
