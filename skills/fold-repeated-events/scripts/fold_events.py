#!/usr/bin/env python3
"""
fold_events.py
过程事件折叠器：milestone 逐条保留，action 按 category 聚合，micro 汇总为一行计数。

输入每行一条事件：纯文本，或 JSON {"text": "..."}。
分档通过 importlib 直接加载同仓库的 skills/classify-step-tier/scripts/classify_tier.py
（不起子进程）；加载失败时退化为子进程调用，保证功能不因导入失败而中断。

stdout 契约：
  默认（不带 --json）- 直接打印折叠后的 rendered 多行文本，永远非空；
  带 --json        - 打印六字段 JSON（milestones/actions/micro_total/rendered/before_events/after_events）。

Exit Code:
  0 - 折叠完成（结果由 stdout 承载）
  1 - 输入为空、文件不存在或不可读
"""

import os
import sys
import json
import argparse
import importlib.util
import subprocess

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
CLASSIFY_SCRIPT = os.path.join(REPO_ROOT, "skills/classify-step-tier/scripts/classify_tier.py")

MICRO_SUMMARY_PREFIX = "· 微操作"


def classify_via_subprocess(text: str) -> dict:
    """退化路径：脚本加载失败时以子进程调用分档器。"""
    proc = subprocess.run(
        [sys.executable, CLASSIFY_SCRIPT, "--text", text, "--json"],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"classify-step-tier 子进程失败: {proc.stderr.strip()}")
    return json.loads(proc.stdout)


def load_classifier():
    """返回 classify(text) -> dict；优先 importlib 加载同仓库脚本，失败退化子进程。"""
    try:
        spec = importlib.util.spec_from_file_location("classify_step_tier", CLASSIFY_SCRIPT)
        if spec is None or spec.loader is None:
            raise ImportError("spec 构建失败")
        module = importlib.util.module_from_spec(spec)
        # 加载期间关闭字节码落盘，避免在被复用技能目录里写入 __pycache__
        previous = sys.dont_write_bytecode
        sys.dont_write_bytecode = True
        try:
            spec.loader.exec_module(module)
        finally:
            sys.dont_write_bytecode = previous
        func = getattr(module, "classify", None)
        if not callable(func):
            raise ImportError("classify 函数缺失")
        return func
    except (ImportError, AttributeError, OSError, SyntaxError, ValueError):
        return classify_via_subprocess


def parse_lines(raw_text: str) -> list:
    """每行一条事件：纯文本，或 JSON {"text": "..."}；空行丢弃。"""
    events = []
    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue
        text = line
        if line.startswith("{"):
            try:
                payload = json.loads(line)
            except ValueError:
                payload = None
            if isinstance(payload, dict) and isinstance(payload.get("text"), str):
                text = payload["text"].strip()
        if text:
            events.append(text)
    return events


def read_events_from_file(path: str):
    """读取事件文件；不存在或不可读返回 None。"""
    if not os.path.exists(path) or not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            raw = handle.read()
    except (OSError, UnicodeDecodeError):
        return None
    return parse_lines(raw)


def fold(events, classifier=None) -> dict:
    """折叠事件列表，返回契约规定的六个字段。"""
    clf = classifier or load_classifier()

    milestones = []
    action_order = []
    action_counts = {}
    micro_total = 0

    for event in events:
        result = clf(event) or {}
        tier = result.get("tier")
        if tier == "milestone":
            milestones.append(event)
        elif tier == "micro":
            micro_total += 1
        else:
            category = result.get("category") or "其他"
            if category not in action_counts:
                action_counts[category] = 0
                action_order.append(category)
            action_counts[category] += 1

    actions = [{"category": c, "count": action_counts[c]} for c in action_order]

    lines = list(milestones)
    lines.extend(f"· {item['category']} ×{item['count']}" for item in actions)
    if micro_total:
        lines.append(f"{MICRO_SUMMARY_PREFIX} ×{micro_total}")

    return {
        "milestones": milestones,
        "actions": actions,
        "micro_total": micro_total,
        "rendered": "\n".join(lines),
        "before_events": len(events),
        "after_events": len(lines),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Fold repeated process events into milestone lines")
    source = parser.add_mutually_exclusive_group(required=False)
    source.add_argument("--file", "-f", help="事件文件（jsonl 或每行一条纯文本）")
    source.add_argument("--stdin", action="store_true", help="从标准输入读取事件")
    parser.add_argument("--json", action="store_true",
                        help="输出六字段 JSON；缺省时直接打印折叠后的 rendered 多行文本（非空）")
    args = parser.parse_args()

    if args.stdin:
        events = parse_lines(sys.stdin.read())
    elif args.file:
        events = read_events_from_file(args.file)
        if events is None:
            print(json.dumps({"success": False, "error": f"文件不存在或不可读: {args.file}"},
                             ensure_ascii=False))
            return 1
    else:
        print(json.dumps({"success": False, "error": "必须提供 --file 或 --stdin"},
                         ensure_ascii=False))
        return 1

    if not events:
        print(json.dumps({"success": False, "error": "输入为空"}, ensure_ascii=False))
        return 1

    result = fold(events)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(result["rendered"])

    return 0


if __name__ == "__main__":
    sys.exit(main())
