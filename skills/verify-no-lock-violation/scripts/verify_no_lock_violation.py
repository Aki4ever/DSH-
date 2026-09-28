#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_no_lock_violation.py
并行任务调控锁放行断言器：五项硬断言全过才退 0。

口径唯一来源：skills/parallel-lock-policy/SKILL.md
断言（全过才退 0）：
  1. no_lock_conflict     : 无 lock_conflict（两个任务锁集合交集非空）；
  2. no_deadlock_cycle    : 无 deadlock_cycle（等待图成环）；
  3. no_lock_timeout      : 无 lock_timeout（跨度超 timeout_s 或只有 started_at 即逻辑已超时）；
  4. locks_declared       : 每个任务都已声明锁（锁集合非空）；
  5. no_loop_ap01         : 死循环体检——同一任务在 JSONL 中重复出现且相邻记录 locks 完全相同时，
                            连续 >= 5 次即记 AP-01。判据来自 anti-pattern-policy AP-01
                            （连续相同 action 且 state 不变 >= 5 次），本脚本通过 importlib
                            加载 detect-forbidden-state 的检测器做同一判定（闭集 AP-01/AP-03 过滤）。

--allow-conflict：显式声明「本批冲突已人工接受」，此时 lock_conflict 降级为咨询项，
不单独阻断放行（其余四项断言照旧生效）。

输出 JSON：{"success":bool,"checks":[{"name","pass","detail"}],"violations":[...]}

Exit Code:
  0 - 五项断言全过（或 --allow-conflict 下仅剩已接受的 lock_conflict）
  1 - 存在未被接受的违规
  2 - 输入不可读，或反例检测模块无法加载
"""

import os
import sys
import json
import argparse
import importlib.util

# 关闭字节码落盘：本脚本用 importlib 加载同仓其它技能模块，
# 避免在他人技能目录里生成 __pycache__（副作用归零）。
sys.dont_write_bytecode = True

EXIT_OK = 0
EXIT_VIOLATION = 1
EXIT_INPUT = 2

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
DETECT_LOCK = os.path.join(REPO_ROOT, "skills/detect-lock-conflict/scripts/detect_lock_conflict.py")
DETECT_FORBIDDEN = os.path.join(REPO_ROOT, "skills/detect-forbidden-state/scripts/detect_forbidden.py")

# AP-01 判据（阈值与判据编号来自 anti-pattern-policy，禁止本地另立第二套）
AP01_CODE = "AP-01"
AP01_ACTION = "parallel-task-repeat"

CHECK_NAMES = [
    "no_lock_conflict",
    "no_deadlock_cycle",
    "no_lock_timeout",
    "locks_declared",
    "no_loop_ap01",
]


def build_report(payload):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def fail_input(message):
    build_report({
        "success": False,
        "checks": [{"name": name, "pass": False, "detail": "输入不可读，未执行断言"}
                   for name in CHECK_NAMES],
        "violations": [{"kind": "input_unreadable", "task": "", "detail": message}],
        "error": message,
    })
    return EXIT_INPUT


def load_module(path, module_name):
    """importlib 进程内加载同仓脚本（不起子进程，不落 __pycache__）。"""
    if not os.path.exists(path):
        return None, "依赖脚本不存在: %s" % path
    try:
        spec = importlib.util.spec_from_file_location(module_name, path)
        if spec is None or spec.loader is None:
            return None, "无法为 %s 构造 importlib spec" % path
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    except Exception as exc:  # 加载期任意异常都归为「不可用」
        return None, "依赖脚本加载失败: %s（%s）" % (path, exc)
    return module, None


def find_repeat_loops(rows, lock_module, detect_module):
    """死循环体检：同一任务重复出现且相邻记录 locks 完全相同时连续 >= 5 次即命中 AP-01。

    判据来自 anti-pattern-policy AP-01（连续相同 action 且 state 不变 >= 5 次）：
    本脚本把「任务名」映射为 action、「去重排序后的锁集合」映射为 state，
    再把每个任务的重复序列改写成事件流，交由 detect-forbidden-state 的检测器判定，
    因此阈值与判据完全来自唯一真相源，本地不复制第二份。
    """
    groups = {}
    for index, (line_no, obj) in enumerate(rows):
        name = obj.get("task")
        if not isinstance(name, str) or name.strip() == "":
            continue
        raw_locks = obj.get("locks")
        keys = []
        if isinstance(raw_locks, list):
            keys = sorted(set(key for key in (lock_module.normalize_key(item) for item in raw_locks) if key))
        groups.setdefault(name.strip(), []).append({
            "seq": index + 1,
            "locks": keys,
        })

    violations = []
    for name in sorted(groups.keys()):
        entries = groups[name]
        events = [{
            "seq": entry["seq"],
            "action": AP01_ACTION,
            "state": json.dumps(entry["locks"], ensure_ascii=False),
        } for entry in entries]
        hits = detect_module.detect_events(events, dict(detect_module.DEFAULT_THRESHOLDS))
        for hit in hits:
            if hit["code"] != AP01_CODE:
                continue
            seqs = hit["seq"]
            violations.append({
                "kind": AP01_CODE,
                "task": name,
                "seq": seqs,
                "detail": "判据来自 anti-pattern-policy AP-01（连续相同 action 且 state 不变 >= %d 次）："
                          "任务 %s 连续 %d 次锁集合完全不变（%s），无任何推进，属死循环"
                          % (detect_module.DEFAULT_THRESHOLDS["loop_threshold"], name, len(seqs),
                             hit["evidence"]),
            })
    return violations


def main():
    parser = argparse.ArgumentParser(description="Assert no parallel lock violation before dispatch")
    parser.add_argument("--from-json", dest="from_json", required=True, help="并行任务 JSONL 文件路径")
    parser.add_argument("--allow-conflict", action="store_true",
                        help="显式接受 lock_conflict（降级为咨询项），其余断言照旧生效")
    parser.add_argument("--json", action="store_true", help="输出 JSON（本脚本恒输出 JSON）")
    args = parser.parse_args()

    lock_module, error = load_module(DETECT_LOCK, "detect_lock_conflict")
    if error:
        return fail_input(error)
    detect_module, error = load_module(DETECT_FORBIDDEN, "detect_forbidden")
    if error:
        return fail_input(error)

    rows, error = lock_module.read_jsonl_path(args.from_json)
    if error:
        return fail_input(error)
    tasks, error = lock_module.build_tasks(rows)
    if error:
        return fail_input(error)

    report = lock_module.detect(tasks)
    loops = find_repeat_loops(rows, lock_module, detect_module)

    violations = []
    for item in report["conflicts"]:
        violations.append({
            "kind": "lock_conflict",
            "task": "、".join(item["tasks"]),
            "detail": item["detail"],
            "accepted": bool(args.allow_conflict),
        })
    for item in report["deadlock_cycles"]:
        violations.append({"kind": "deadlock_cycle", "task": "、".join(item["tasks"]), "detail": item["detail"]})
    for item in report["timeouts"]:
        violations.append({"kind": "lock_timeout", "task": item["task"], "detail": item["detail"]})
    for item in tasks:
        if not item["locks"]:
            violations.append({
                "kind": "missing_locks",
                "task": item["task"],
                "detail": "任务 %s 未声明任何共享资源键：没有锁却参与并行，属无锁共享写（明确禁止项）" % item["task"],
            })
    violations.extend(loops)

    blocking = [item for item in violations
                if not (item["kind"] == "lock_conflict" and args.allow_conflict)]

    conflicts_ok = (not report["conflicts"]) or args.allow_conflict
    checks = [
        {
            "name": "no_lock_conflict",
            "pass": conflicts_ok,
            "detail": ("无锁冲突" if not report["conflicts"] else
                       ("存在 %d 组锁冲突，已被 --allow-conflict 显式接受" % len(report["conflicts"])
                        if args.allow_conflict else
                        "存在 %d 组锁冲突，禁止并行派发" % len(report["conflicts"]))),
        },
        {
            "name": "no_deadlock_cycle",
            "pass": not report["deadlock_cycles"],
            "detail": ("无等待环" if not report["deadlock_cycles"] else
                       "存在 %d 个等待环：%s" % (len(report["deadlock_cycles"]),
                                                 "、".join("→".join(item["cycle"]) for item in report["deadlock_cycles"]))),
        },
        {
            "name": "no_lock_timeout",
            "pass": not report["timeouts"],
            "detail": ("无超时未释放" if not report["timeouts"] else
                       "存在 %d 个超时任务：%s" % (len(report["timeouts"]),
                                                   "、".join(item["task"] for item in report["timeouts"]))),
        },
        {
            "name": "locks_declared",
            "pass": all(item["locks"] for item in tasks),
            "detail": ("%d 个任务全部声明了非空锁集合" % len(tasks) if all(item["locks"] for item in tasks) else
                       "存在未声明锁集合的任务：%s" % "、".join(item["task"] for item in tasks if not item["locks"])),
        },
        {
            "name": "no_loop_ap01",
            "pass": not loops,
            "detail": ("无死循环（按 AP-01 判据体检通过）" if not loops else
                       "命中 AP-01：%s" % "、".join(item["task"] for item in loops)),
        },
    ]

    success = all(check["pass"] for check in checks) and not blocking
    build_report({
        "success": success,
        "checks": checks,
        "violations": violations,
    })
    return EXIT_OK if success else EXIT_VIOLATION


if __name__ == "__main__":
    sys.exit(main())
