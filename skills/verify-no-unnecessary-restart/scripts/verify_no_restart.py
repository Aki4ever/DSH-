#!/usr/bin/env python3
"""
verify_no_restart.py
零重启门禁断言：复核「实际发生的重启事件」是否都确实必要、是否都带重建命令。

三项断言（全部通过才 Exit 0）：
  1. restart_path_in_change_set   - 每个重启事件的 path 都在当前变更路径集合内；
  2. restart_required_by_classifier - 每个重启事件的 path 经 classify-change-scope
     判定必须为 restart（确实需要重启），否则记为「不必要重启」；
  3. restart_has_rebuild_command  - 每个重启事件必须带非空 command（重建命令），
     否则记为「无证据重启」。

判定口径由 skills/classify-change-scope/scripts/classify_scope.py 提供，
优先 importlib 直接加载同仓库脚本（不起子进程），加载失败退化为子进程调用。

Exit Code:
  0 - 通过（--restarts 文件不存在或为空也视为通过）
  1 - 存在不必要重启或存在无证据重启
  2 - 参数缺失（无 --paths / 无 --restarts）、restart 记录不可解析，或判定器不可用
"""

import os
import sys
import json
import argparse

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.."))
CLASSIFY_SCRIPT = os.path.join(REPO_ROOT, "skills/classify-change-scope/scripts/classify_scope.py")

RESTART = "restart"


def load_classifier():
    """importlib 加载同仓库 classify-change-scope 脚本；失败返回 None。"""
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("classify_change_scope", CLASSIFY_SCRIPT)
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
        for name in ("classify_paths", "classify_path", "normalize_path"):
            if not callable(getattr(module, name, None)):
                return None
        return module
    except (ImportError, AttributeError, OSError, SyntaxError, ValueError):
        return None


def fallback_via_subprocess(paths):
    """退化路径：脚本加载失败时以子进程调用判定器（返回负载或 None）。"""
    import subprocess
    proc = subprocess.run(
        [sys.executable, CLASSIFY_SCRIPT, "--paths"] + list(paths) + ["--json"],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        return None
    try:
        return json.loads(proc.stdout)
    except ValueError:
        return None


def classify_scope(paths):
    """返回 (normalize_path, decisions_by_path)；判定器完全不可用时返回 (None, None)。"""
    module = load_classifier()
    if module is not None:
        payload = module.classify_paths(list(paths))
        decisions = {item["path"]: item for item in payload["decisions"]}
        return module.normalize_path, decisions

    payload = fallback_via_subprocess(paths)
    if isinstance(payload, dict) and isinstance(payload.get("decisions"), list):
        decisions = {item["path"]: item for item in payload["decisions"]}
        return _normalize_fallback, decisions

    return None, None


def _normalize_fallback(raw):
    """判定器不可用时的兜底归一化（与被加载模块保持同一字符串规则）。"""
    text = str(raw).strip().replace("\\", "/")
    while "//" in text:
        text = text.replace("//", "/")
    if text.startswith("./"):
        text = text[2:]
    root = REPO_ROOT.replace("\\", "/").rstrip("/") + "/"
    if text.lower().startswith(root.lower()):
        text = text[len(root):]
    return text


def read_restart_events(path):
    """读取 jsonl 重启记录；返回 (events, error)。

    文件不存在或为空 → ([], None)，按契约视为通过。
    任一行不是合法 JSON 对象，或缺非空 path → (None, 错误说明)，对应 Exit 2。
    """
    if not path or not os.path.exists(path) or not os.path.isfile(path):
        return [], None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            raw = handle.read()
    except (OSError, UnicodeDecodeError) as exc:
        return None, "重启记录不可读: {0}".format(exc)

    events = []
    for index, line in enumerate(raw.splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except ValueError:
            return None, "第 {0} 行不是合法 JSON".format(index)
        if not isinstance(payload, dict):
            return None, "第 {0} 行不是 JSON 对象".format(index)
        event_path = payload.get("path")
        if not isinstance(event_path, str) or not event_path.strip():
            return None, "第 {0} 行缺少非空 path".format(index)
        command = payload.get("command")
        events.append({
            "path": event_path.strip(),
            "command": command if isinstance(command, str) else "",
            "reason": payload.get("reason") if isinstance(payload.get("reason"), str) else "",
        })
    return events, None


def verify(paths, events, normalize, decisions):
    """执行三项断言，返回完整负载（不含 error 键）。"""
    change_set = set(normalize(p) for p in paths)

    unnecessary = []
    unproven = []
    not_in_change_set = 0
    not_required = 0
    missing_command = 0

    for event in events:
        norm = normalize(event["path"])
        if norm not in change_set:
            not_in_change_set += 1
            unnecessary.append({"path": norm, "reason": "重启路径不在当前变更路径集合内"})
        else:
            decision = decisions.get(norm)
            disposition = decision["disposition"] if decision else RESTART
            if disposition != RESTART:
                not_required += 1
                unnecessary.append({
                    "path": norm,
                    "reason": "经 classify-change-scope 判定为 {0}（{1}），无需重启".format(
                        disposition, decision["reason"]),
                })
        if not event["command"].strip():
            missing_command += 1
            unproven.append({"path": norm})

    total = len(events)
    checks = [
        {
            "name": "restart_path_in_change_set",
            "pass": not_in_change_set == 0,
            "detail": "{0}/{1} 条重启事件的路径不在当前变更集合内".format(not_in_change_set, total),
        },
        {
            "name": "restart_required_by_classifier",
            "pass": not_required == 0,
            "detail": "{0}/{1} 条重启事件的路径判定为无需重启".format(not_required, total),
        },
        {
            "name": "restart_has_rebuild_command",
            "pass": missing_command == 0,
            "detail": "{0}/{1} 条重启事件缺少非空重建命令".format(missing_command, total),
        },
    ]

    return {
        "success": all(check["pass"] for check in checks),
        "restart_events": total,
        "unnecessary": unnecessary,
        "unproven": unproven,
        "checks": checks,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Assert no unnecessary or unproven restarts")
    parser.add_argument("--paths", nargs="*", default=[], help="本次变更路径，可一次给多条")
    parser.add_argument("--restarts", default=None, help="实际发生的重启事件 jsonl 文件")
    parser.add_argument("--json", action="store_true", help="输出 JSON（默认行为）")
    args = parser.parse_args()

    paths = [p for p in (args.paths or []) if str(p).strip()]
    if not paths:
        print(json.dumps({"success": False, "error": "缺少 --paths：至少提供一条变更路径"},
                         ensure_ascii=False, indent=2))
        return 2
    if args.restarts is None:
        print(json.dumps({"success": False, "error": "缺少 --restarts：需给出重启事件 jsonl 路径"},
                         ensure_ascii=False, indent=2))
        return 2

    events, error = read_restart_events(args.restarts)
    if error is not None:
        print(json.dumps({"success": False, "error": error}, ensure_ascii=False, indent=2))
        return 2

    normalize, decisions = classify_scope(paths)
    if normalize is None:
        print(json.dumps({"success": False, "error": "classify-change-scope 判定器不可用: {0}".format(CLASSIFY_SCRIPT)},
                         ensure_ascii=False, indent=2))
        return 2

    payload = verify(paths, events, normalize, decisions)
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        for check in payload["checks"]:
            print("{0}\t{1}\t{2}".format("PASS" if check["pass"] else "FAIL", check["name"], check["detail"]))
        print("restart_events\t{0}\tunnecessary\t{1}\tunproven\t{2}".format(
            payload["restart_events"], len(payload["unnecessary"]), len(payload["unproven"])))

    return 0 if payload["success"] else 1


if __name__ == "__main__":
    sys.exit(main())
