#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
declare_lock_set.py
并行任务的锁集合声明器：归一化 + 去重 + 字典序排序，并检测两类静态错误。

口径唯一来源：skills/parallel-lock-policy/SKILL.md（粒度 = 共享资源键；加锁顺序 = 字典序固定顺序）。

两类静态错误（均记入 issues，命中即退 1）：
  missing_locks : 同一任务的锁集合为空却 writes:true（没有锁却要写；无锁共享写是明确禁止项）
  non_canonical : 锁键不是归一化路径（含重复斜杠、./、尾斜杠不一致、空白、反斜杠），并给出规范化结果

归一化口径（纯字符串处理，无随机、无时间依赖）：
  1. 反斜杠统一为 "/"；
  2. 连续斜杠折叠为单个 "/"；
  3. 逐段剥离 "."（当前目录）段与空段；
  4. 剥离尾部斜杠（根 "/" 除外）；目录键因此与同路径的文件键写法一致；
  5. 剥除首尾空白（strip），全空白视为空键。

Exit Code:
  0 - 全部任务声明成功且无 issue
  1 - 存在 missing_locks 或 non_canonical
  2 - 输入不可读（缺参、--from-json 文件不存在/是目录/不可读、JSONL 行非法或非对象、任务名为空）
"""

import os
import sys
import json
import argparse

EXIT_OK = 0
EXIT_ISSUE = 1
EXIT_INPUT = 2


def build_report(payload):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def fail_input(message):
    """输入不可读：统一退 2，契约字段照样齐全，避免上游解析崩溃。"""
    build_report({
        "success": False,
        "tasks": [],
        "issues": [{"kind": "input_unreadable", "task": "", "detail": message}],
        "error": message,
    })
    return EXIT_INPUT


def normalize_key(value):
    """把一个锁键规范化为「仓库相对/绝对路径」的统一写法。

    仅做字符串归一化，不做文件系统访问，因此路径不存在同样得到确定结果。
    """
    if not isinstance(value, str):
        return ""
    text = value.strip().replace("\\", "/")
    parts = []
    for segment in text.split("/"):
        if segment in ("", "."):
            continue
        parts.append(segment)
    if text.startswith("/"):
        normalized = "/" + "/".join(parts)
    else:
        normalized = "/".join(parts)
    if normalized == "":
        return ""
    # 目录键与文件键统一写法：剥离尾部斜杠（根除外）
    if len(normalized) > 1 and normalized.endswith("/"):
        normalized = normalized.rstrip("/")
    return normalized


def parse_lock_string(raw):
    """--locks 的单个参数值：既支持逗号分隔，也支持单键。"""
    return [part for part in raw.split(",") if part.strip() != ""]


def load_jsonl(path):
    """读取 JSONL；返回 (rows, issues, error)。error 非空即输入不可读（退 2）。"""
    if not os.path.exists(path):
        return None, None, "任务清单文件不存在: %s" % path
    if os.path.isdir(path):
        return None, None, "任务清单路径是目录而非 JSONL 文件: %s" % path
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            text = handle.read()
    except OSError as exc:
        return None, None, "任务清单不可读: %s" % exc

    rows = []
    for line_no, raw in enumerate(text.splitlines(), start=1):
        stripped = raw.strip()
        if not stripped:
            continue
        try:
            obj = json.loads(stripped)
        except ValueError as exc:
            return None, None, "第 %d 行不是合法 JSON: %s" % (line_no, exc)
        if not isinstance(obj, dict):
            return None, None, "第 %d 行不是 JSON 对象（并行任务必须是对象）" % line_no
        rows.append((line_no, obj))
    return rows, [], None


def collect_raw_locks(obj):
    """取锁集合原始值；locks 缺失按空集合处理，非数组即视为非法（交由上游报输入错误）。"""
    locks = obj.get("locks")
    if locks is None:
        return []
    if not isinstance(locks, list):
        return None
    return locks


def declare_from_rows(rows):
    """逐任务归一化并排序锁集合；返回 (tasks, issues, error)。"""
    tasks = []
    issues = []

    for line_no, obj in rows:
        name = obj.get("task")
        if not isinstance(name, str) or name.strip() == "":
            return None, None, "第 %d 行缺少非空 task 字段" % line_no
        name = name.strip()

        raw_locks = collect_raw_locks(obj)
        if raw_locks is None:
            return None, None, "任务 %s 的 locks 不是数组" % name

        writes = obj.get("writes") is True
        normalized = []
        for raw in raw_locks:
            canonical = normalize_key(raw)
            normalized.append(canonical)
            if not isinstance(raw, str) or raw.strip() == "":
                issues.append({
                    "kind": "non_canonical",
                    "task": name,
                    "detail": "锁键不是非空字符串，规范化结果为 %s（原始值 %s）"
                              % (json.dumps(canonical, ensure_ascii=False),
                                 json.dumps(raw, ensure_ascii=False)),
                })
            elif canonical != raw:
                issues.append({
                    "kind": "non_canonical",
                    "task": name,
                    "detail": "锁键 %s 不是归一化路径，规范化结果为 %s（重复斜杠 / ./ / 尾斜杠不一致 / 空白 / 反斜杠）"
                              % (json.dumps(raw, ensure_ascii=False),
                                 json.dumps(canonical, ensure_ascii=False)),
                })
            elif canonical == "":
                issues.append({
                    "kind": "non_canonical",
                    "task": name,
                    "detail": "锁键 %s 归一化后为空，不指向任何共享资源，不能作为资源键"
                              % json.dumps(raw, ensure_ascii=False),
                })

        unique = sorted(set(canonical for canonical in normalized if canonical != ""))

        if writes and not unique:
            issues.append({
                "kind": "missing_locks",
                "task": name,
                "detail": "任务声明 writes=true 但锁集合为空：没有锁却要写，属无锁共享写（明确禁止项）",
            })

        tasks.append({
            "task": name,
            "locks": unique,
            "acquire_order": list(unique),
        })

    issues.sort(key=lambda issue: (issue["task"], issue["kind"], issue["detail"]))
    return tasks, issues, None


def declare_from_args(task_args, locks_args):
    """按 --task / --locks 配对构造任务；返回 (tasks, issues, error)。"""
    if len(locks_args) > len(task_args):
        return None, None, "--locks 数量多于 --task，无法一一配对"

    rows = []
    for index, name in enumerate(task_args):
        if index < len(locks_args):
            raw_locks = parse_lock_string(locks_args[index])
        else:
            raw_locks = []
        rows.append((index + 1, {"task": name, "locks": raw_locks, "writes": raw_locks == []}))
    return declare_from_rows(rows)


def main():
    parser = argparse.ArgumentParser(description="Declare and normalize parallel task lock sets")
    parser.add_argument("--task", action="append", default=[], help="任务名，可重复并依次与 --locks 配对")
    parser.add_argument("--locks", action="append", default=[],
                        help="该任务的锁集合，逗号分隔，可重复并依次与 --task 配对")
    parser.add_argument("--from-json", dest="from_json", help="并行任务 JSONL 文件路径")
    parser.add_argument("--json", action="store_true", help="输出 JSON（本脚本恒输出 JSON）")
    args = parser.parse_args()

    if args.from_json and args.task:
        return fail_input("--from-json 与 --task 不可同时使用")
    if args.from_json:
        rows, _, error = load_jsonl(args.from_json)
        if error:
            return fail_input(error)
        tasks, issues, error = declare_from_rows(rows)
    elif args.task:
        tasks, issues, error = declare_from_args(args.task, args.locks)
    else:
        return fail_input("必须指定 --from-json <jsonl> 或至少一个 --task <name>")

    if error:
        return fail_input(error)

    build_report({
        "success": not issues,
        "tasks": tasks,
        "issues": issues,
    })
    return EXIT_ISSUE if issues else EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
