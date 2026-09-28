#!/usr/bin/env python3
"""
verify_progress.py
过程输出预算断言门禁：对折叠后的过程输出做四项硬断言，全过才放行。

四项断言（全部通过才 Exit 0，任一失败即 Exit 1）：
  1. no_micro_leak          - rendered 中不含任何 micro 级事件原文；
  2. milestone_budget       - 折叠后保留的里程碑数 ≤ --max-milestones（默认 8）；
  3. milestone_coverage     - 里程碑覆盖 100%：输入中所有 milestone 事件都出现在 rendered 中；
  4. event_count_not_increased - 折叠后事件数（rendered 行数）≤ 输入事件数。

折叠结果由 skills/fold-repeated-events/scripts/fold_events.py 提供，
分档口径由 skills/classify-step-tier/scripts/classify_tier.py 提供，均优先 importlib 加载。

Exit Code:
  0 - 四项断言全部通过
  1 - 任一断言失败，或输入为空 / 文件不存在或不可读
"""

import os
import sys
import json
import argparse
import importlib.util
import subprocess

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
FOLD_SCRIPT = os.path.join(REPO_ROOT, "skills/fold-repeated-events/scripts/fold_events.py")
CLASSIFY_SCRIPT = os.path.join(REPO_ROOT, "skills/classify-step-tier/scripts/classify_tier.py")

DEFAULT_MAX_MILESTONES = 8


def load_module(path: str, name: str):
    """importlib 加载同仓库脚本模块；失败返回 None。"""
    try:
        spec = importlib.util.spec_from_file_location(name, path)
        if spec is None or spec.loader is None:
            return None
        module = importlib.util.module_from_spec(spec)
        # 加载期间关闭字节码落盘，避免在被复用技能目录里写入 __pycache__
        previous = sys.dont_write_bytecode
        sys.dont_write_bytecode = True
        try:
            spec.loader.exec_module(module)
        finally:
            sys.dont_write_bytecode = previous
        return module
    except (ImportError, AttributeError, OSError, SyntaxError, ValueError):
        return None


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


def read_events(path: str):
    if not os.path.exists(path) or not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            raw = handle.read()
    except (OSError, UnicodeDecodeError):
        return None
    return parse_lines(raw)


def classify_event(text: str) -> dict:
    """单条事件分档：优先 importlib，退化子进程。"""
    module = load_module(CLASSIFY_SCRIPT, "classify_step_tier")
    func = getattr(module, "classify", None) if module is not None else None
    if callable(func):
        try:
            return func(text) or {}
        except (AttributeError, ValueError, TypeError):
            pass
    proc = subprocess.run(
        [sys.executable, CLASSIFY_SCRIPT, "--text", text, "--json"],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"classify-step-tier 调用失败: {proc.stderr.strip()}")
    return json.loads(proc.stdout)


def run_fold(events, file_path: str):
    """折叠事件：优先 importlib 加载 fold 函数，退化子进程。"""
    module = load_module(FOLD_SCRIPT, "fold_repeated_events")
    func = getattr(module, "fold", None) if module is not None else None
    if callable(func):
        try:
            return func(events)
        except (AttributeError, ValueError, TypeError):
            pass
    proc = subprocess.run(
        [sys.executable, FOLD_SCRIPT, "--file", file_path, "--json"],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        return None
    try:
        return json.loads(proc.stdout)
    except ValueError:
        return None


def build_checks(events, rendered, max_milestones: int) -> list:
    tiers = [classify_event(ev) for ev in events]
    micro_texts = [ev for ev, r in zip(events, tiers) if (r or {}).get("tier") == "micro"]
    milestone_texts = [ev for ev, r in zip(events, tiers) if (r or {}).get("tier") == "milestone"]

    leaked = [t for t in micro_texts if t and t in rendered]
    kept = [t for t in milestone_texts if t and t in rendered]
    missing = [t for t in milestone_texts if not t or t not in rendered]

    rendered_lines = [ln for ln in rendered.splitlines() if ln.strip()]

    return [
        {
            "name": "no_micro_leak",
            "pass": not leaked,
            "detail": (f"micro 事件 {len(micro_texts)} 条，rendered 中泄漏原文 {len(leaked)} 条"
                       + (f": {leaked[:3]}" if leaked else "")),
        },
        {
            "name": "milestone_budget",
            "pass": len(kept) <= max_milestones,
            "detail": f"折叠后里程碑 {len(kept)} 条，上限 {max_milestones}",
        },
        {
            "name": "milestone_coverage",
            "pass": not missing,
            "detail": (f"里程碑覆盖 {len(kept)}/{len(milestone_texts)}"
                       + (f"，缺失: {missing[:3]}" if missing else "")),
        },
        {
            "name": "event_count_not_increased",
            "pass": len(rendered_lines) <= len(events),
            "detail": f"折叠后 {len(rendered_lines)} 行 ≤ 输入 {len(events)} 条",
        },
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description="Assert progress output budget and losslessness")
    parser.add_argument("--file", "-f", required=True, help="事件文件（jsonl 或每行一条纯文本）")
    parser.add_argument("--max-milestones", type=int, default=DEFAULT_MAX_MILESTONES,
                        help=f"里程碑数量上限（默认 {DEFAULT_MAX_MILESTONES}）")
    parser.add_argument("--rendered", help="可选：改为断言外部给定的折叠产物文件（对抗式校验）")
    parser.add_argument("--json", action="store_true", help="以 JSON 输出")
    args = parser.parse_args()

    events = read_events(args.file)
    if events is None:
        print(json.dumps({"success": False, "error": f"文件不存在或不可读: {args.file}"},
                         ensure_ascii=False))
        return 1
    if not events:
        print(json.dumps({"success": False, "error": "输入为空"}, ensure_ascii=False))
        return 1

    if args.rendered:
        if not os.path.exists(args.rendered):
            print(json.dumps({"success": False, "error": f"折叠产物不存在: {args.rendered}"},
                             ensure_ascii=False))
            return 1
        try:
            with open(args.rendered, "r", encoding="utf-8") as handle:
                rendered = handle.read()
        except (OSError, UnicodeDecodeError):
            print(json.dumps({"success": False, "error": f"折叠产物不可读: {args.rendered}"},
                             ensure_ascii=False))
            return 1
        after_events = len([ln for ln in rendered.splitlines() if ln.strip()])
    else:
        folded = run_fold(events, args.file)
        if folded is None:
            print(json.dumps({"success": False, "error": "折叠失败: fold-repeated-events 不可用"},
                             ensure_ascii=False))
            return 1
        rendered = folded.get("rendered", "")
        after_events = folded.get("after_events", len(rendered.splitlines()))

    checks = build_checks(events, rendered, args.max_milestones)
    success = all(item["pass"] for item in checks)

    tiers = [classify_event(ev) for ev in events]
    kept_total = sum(1 for ev, r in zip(events, tiers)
                     if (r or {}).get("tier") == "milestone" and ev in rendered)

    result = {
        "success": success,
        "checks": checks,
        "before_events": len(events),
        "after_events": after_events,
        "milestones": kept_total,
    }

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        for item in checks:
            print(f"{'✅' if item['pass'] else '❌'} {item['name']}: {item['detail']}")
        print(f"{'✅ 预算断言全部通过' if success else '❌ 存在失败断言，禁止交付'}")

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
