#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
detect_lock_conflict.py
并行任务调控锁冲突检测器：锁冲突 / 潜在死锁（等待环）/ 超时未释放，
并给出可安全并行的分组建议与必须串行的任务对。

口径唯一来源：skills/parallel-lock-policy/SKILL.md
  - 锁粒度 = 共享资源键；加锁顺序 = 字典序固定顺序（等待环即违反该序）；
  - 超时默认 300 秒，超时即判失败并释放；
  - 时间只从输入字段读（started_at / finished_at），绝不取系统当前时间。

三类检测：
  1. lock_conflict  : 两个并行任务锁集合交集非空 → 给出冲突任务对与冲突键；
  2. deadlock_cycle : 等待图成环 → 给出环路径。
                      等待边有两个来源：
                        (a) depends_on 显式依赖：X 依赖 Y ⇒ X 等 Y；
                        (b) 锁级推断：X、Y 共享资源键、无显式依赖关系、且两侧都带开始时间证据，
                            并且 X 的 started_at 严格早于 Y 的（或按 lock_events 给出每个键的取得时刻）。
                            缺失时间证据时两任务不做锁级推断，保持确定性与保守性。
  3. lock_timeout   : finished_at - started_at > timeout_s；只有 started_at 无 finished_at 时，
                      以本批次逻辑终点（全部时间字段的最大值）为参照点判定。

输出另含：
  serialization_plan : 必须串行的任务对（[[taskA, taskB], ...]）；
  parallel_groups    : 可安全并行的分组建议（组内两两无锁交集），按冲突图着色收敛。

Exit Code:
  0 - 无冲突、无死锁、无超时
  1 - 任一命中
  2 - 输入不可读（缺参、二者同给、文件不存在/是目录/不可读、JSONL 行非法或非对象、task 缺失）
"""

import os
import sys
import json
import argparse

EXIT_OK = 0
EXIT_HIT = 1
EXIT_INPUT = 2

DEFAULT_TIMEOUT_S = 300


def build_report(payload):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def empty_report():
    return {
        "success": False,
        "conflicts": [],
        "deadlock_cycles": [],
        "timeouts": [],
        "serialization_plan": [],
        "parallel_groups": [],
    }


def fail_input(message):
    payload = empty_report()
    payload["error"] = message
    build_report(payload)
    return EXIT_INPUT


def normalize_key(value):
    """锁键归一化：反斜杠统一、折叠连续斜杠、剥离 ./ 段、剥离尾部斜杠、剥除空白。"""
    if not isinstance(value, str):
        return ""
    text = value.strip().replace("\\", "/")
    parts = [segment for segment in text.split("/") if segment not in ("", ".")]
    normalized = ("/" if text.startswith("/") else "") + "/".join(parts)
    if len(normalized) > 1 and normalized.endswith("/"):
        normalized = normalized.rstrip("/")
    return normalized


def is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def parse_jsonl_text(text):
    """解析 JSONL 文本；返回 (rows, error)。空行跳过，空文本返回空列表。"""
    rows = []
    for line_no, raw in enumerate(text.splitlines(), start=1):
        stripped = raw.strip()
        if not stripped:
            continue
        try:
            obj = json.loads(stripped)
        except ValueError as exc:
            return None, "第 %d 行不是合法 JSON: %s" % (line_no, exc)
        if not isinstance(obj, dict):
            return None, "第 %d 行不是 JSON 对象（并行任务必须是对象）" % line_no
        rows.append((line_no, obj))
    return rows, None


def read_jsonl_path(path):
    if not os.path.exists(path):
        return None, "任务清单文件不存在: %s" % path
    if os.path.isdir(path):
        return None, "任务清单路径是目录而非 JSONL 文件: %s" % path
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            text = handle.read()
    except OSError as exc:
        return None, "任务清单不可读: %s" % exc
    return parse_jsonl_text(text)


def build_tasks(rows):
    """把 JSONL 行规整成任务记录；返回 (tasks, error)。"""
    tasks = []
    for index, (line_no, obj) in enumerate(rows):
        name = obj.get("task")
        if not isinstance(name, str) or name.strip() == "":
            return None, "第 %d 行缺少非空 task 字段" % line_no
        name = name.strip()
        raw_locks = obj.get("locks")
        if raw_locks is None:
            raw_locks = []
        if not isinstance(raw_locks, list):
            return None, "任务 %s 的 locks 不是数组" % name
        locks = sorted(set(key for key in (normalize_key(item) for item in raw_locks) if key))
        depends = obj.get("depends_on")
        if depends is None:
            depends = []
        if not isinstance(depends, list):
            return None, "任务 %s 的 depends_on 不是数组" % name
        timeout_s = obj.get("timeout_s")
        if not is_int(timeout_s) or timeout_s < 0:
            timeout_s = DEFAULT_TIMEOUT_S
        # lock_events: {"x": 1000, "y": 1050} —— 每个资源键的取得时刻，用于锁级等待推断
        raw_events = obj.get("lock_events")
        lock_events = {}
        if isinstance(raw_events, dict):
            for lock_key, stamp in raw_events.items():
                canonical = normalize_key(lock_key)
                if canonical and is_int(stamp):
                    lock_events[canonical] = stamp
        tasks.append({
            "key": "%05d" % index,
            "task": name,
            "locks": locks,
            "depends_on": sorted(set(str(dep).strip() for dep in depends if str(dep).strip())),
            "timeout_s": timeout_s,
            "started_at": obj.get("started_at"),
            "finished_at": obj.get("finished_at"),
            "lock_events": lock_events,
        })
    return tasks, None


def find_conflicts(tasks):
    """两两求锁集合交集，非空即冲突；返回按任务对排序的冲突清单。"""
    conflicts = []
    for i in range(len(tasks)):
        for j in range(i + 1, len(tasks)):
            left, right = tasks[i], tasks[j]
            shared = sorted(set(left["locks"]) & set(right["locks"]))
            if shared:
                conflicts.append({
                    "tasks": [left["task"], right["task"]],
                    "keys": shared,
                    "detail": "任务 %s 与 %s 并行时争用同一资源键 %s，交集非空即不可安全并行"
                              % (left["task"], right["task"],
                                 "、".join(shared)),
                })
    conflicts.sort(key=lambda item: (item["tasks"], item["keys"]))
    return conflicts


def build_wait_graph(tasks):
    """构造等待图：返回 (邻接表, 节点键集合, 等待边证据)。"""
    by_name = {}
    for item in tasks:
        by_name.setdefault(item["task"], []).append(item)

    adjacency = {item["key"]: set() for item in tasks}
    edges = []

    # (a) 显式依赖：X 依赖 Y ⇒ X 等 Y（同名以首条记录为准，保持确定性）
    for item in tasks:
        for dep in item["depends_on"]:
            holders = by_name.get(dep)
            if not holders:
                continue
            adjacency[item["key"]].add(holders[0]["key"])
            edges.append({
                "from": item["task"],
                "to": holders[0]["task"],
                "reason": "depends_on: %s 显式依赖 %s" % (item["task"], dep),
            })

    # (b) 锁级推断：共享键 + 无显式依赖 + 取得时刻有序 ⇒ 后取得者等先取得者
    def acquire_time(item, lock_key):
        """该任务取得某键的时刻：优先 lock_events 逐键时刻，回退任务级 started_at。"""
        if lock_key in item["lock_events"]:
            return item["lock_events"][lock_key]
        return item["started_at"] if is_int(item["started_at"]) else None

    for i in range(len(tasks)):
        for j in range(i + 1, len(tasks)):
            left, right = tasks[i], tasks[j]
            shared = sorted(set(left["locks"]) & set(right["locks"]))
            if not shared:
                continue
            if (right["task"] in left["depends_on"]) or (left["task"] in right["depends_on"]):
                continue  # 已有显式依赖，不再叠加推断边
            for lock_key in shared:
                left_time = acquire_time(left, lock_key)
                right_time = acquire_time(right, lock_key)
                if left_time is None or right_time is None or left_time == right_time:
                    continue  # 无时间证据或同时取得：不推断，保持保守
                if left_time < right_time:
                    holder, waiter, holder_time, waiter_time = left, right, left_time, right_time
                else:
                    holder, waiter, holder_time, waiter_time = right, left, right_time, left_time
                if holder["key"] == waiter["key"]:
                    continue
                adjacency[waiter["key"]].add(holder["key"])
                edges.append({
                    "from": waiter["task"],
                    "to": holder["task"],
                    "reason": "lock: %s 于 %d 先取得键 %s，%s 于 %d 等待其释放"
                              % (holder["task"], holder_time, lock_key, waiter["task"], waiter_time),
                })
    return adjacency, edges


def tarjan_scc(nodes, adjacency):
    """迭代式 Tarjan 强连通分量；返回按分量内最小节点键排序的 SCC 列表。"""
    index_of = {}
    low = {}
    on_stack = set()
    stack = []
    components = []
    counter = [0]

    for root in nodes:
        if root in index_of:
            continue
        work = [(root, iter(sorted(adjacency.get(root, ()))))]
        index_of[root] = counter[0]
        low[root] = counter[0]
        counter[0] += 1
        stack.append(root)
        on_stack.add(root)
        while work:
            node, neighbours = work[-1]
            advanced = False
            for nxt in neighbours:
                if nxt not in index_of:
                    index_of[nxt] = counter[0]
                    low[nxt] = counter[0]
                    counter[0] += 1
                    stack.append(nxt)
                    on_stack.add(nxt)
                    work.append((nxt, iter(sorted(adjacency.get(nxt, ())))))
                    advanced = True
                    break
                if nxt in on_stack:
                    low[node] = min(low[node], index_of[nxt])
            if advanced:
                continue
            work.pop()
            if work:
                parent = work[-1][0]
                low[parent] = min(low[parent], low[node])
            if low[node] == index_of[node]:
                component = []
                while True:
                    member = stack.pop()
                    on_stack.discard(member)
                    component.append(member)
                    if member == node:
                        break
                components.append(sorted(component))

    components.sort(key=lambda comp: comp[0])
    return components


def canonical_cycle(path):
    """把环旋转到最小节点开头，保证同一环在不同起点下得到同一表示。"""
    smallest = min(range(len(path)), key=lambda i: path[i])
    return path[smallest:] + path[:smallest]


def find_deadlock_cycles(adjacency):
    """在等待图中找环（SCC 内确定性枚举）；返回去重后的环路径（任务键列表）。"""
    nodes = sorted(adjacency.keys())
    components = tarjan_scc(nodes, adjacency)
    cycles = []
    for component in components:
        members = set(component)
        if len(component) == 1:
            node = component[0]
            if node in adjacency.get(node, ()):
                cycles.append([node, node])
            continue
        # 沿最小节点出发实际走一遍环：始终优先走向已访问节点，必然回到起点
        path = [component[0]]
        position = {component[0]: 0}
        current = component[0]
        while True:
            nxts = sorted(nxt for nxt in adjacency.get(current, ()) if nxt in members)
            if not nxts:
                break
            nxt = next((candidate for candidate in nxts if candidate in position), nxts[0])
            if nxt in position:
                cycles.append(path[position[nxt]:])
                break
            position[nxt] = len(path)
            path.append(nxt)
            current = nxt

    unique = {}
    for cycle in cycles:
        body = cycle[:-1] if len(cycle) > 1 and cycle[0] == cycle[-1] else cycle
        if not body:
            continue
        canonical = canonical_cycle(body)
        edge_count = sum(1 for i in range(len(canonical))
                         if canonical[(i + 1) % len(canonical)] in adjacency.get(canonical[i], ()))
        key = tuple(canonical)
        if key not in unique or edge_count > unique[key][1]:
            unique[key] = (canonical, edge_count)
    return sorted((value[0] for value in unique.values()), key=lambda item: item)


def find_timeouts(tasks):
    """超时未释放：只读输入字段，以本批次逻辑终点为缺失 finished_at 的参照点。"""
    stamps = []
    for item in tasks:
        for field in ("started_at", "finished_at"):
            if is_int(item[field]):
                stamps.append(item[field])
    batch_end = max(stamps) if stamps else None

    timeouts = []
    for item in tasks:
        started = item["started_at"]
        finished = item["finished_at"]
        timeout_s = item["timeout_s"]
        if not is_int(started):
            if is_int(finished) and is_int(batch_end) and (batch_end - finished) > timeout_s:
                timeouts.append({
                    "task": item["task"],
                    "started_at": None,
                    "finished_at": finished,
                    "timeout_s": timeout_s,
                    "span_s": batch_end - finished,
                    "detail": "任务 %s 缺少 started_at，以批次逻辑终点 %d 为参照已超时 %d 秒（上限 %d 秒），视为未在时限内释放锁"
                              % (item["task"], batch_end, batch_end - finished, timeout_s),
                })
            continue
        if is_int(finished):
            span = finished - started
            if span > timeout_s:
                timeouts.append({
                    "task": item["task"],
                    "started_at": started,
                    "finished_at": finished,
                    "timeout_s": timeout_s,
                    "span_s": span,
                    "detail": "任务 %s 持锁跨度 %d 秒（started_at=%d → finished_at=%d）超过上限 %d 秒，锁被超时持有"
                              % (item["task"], span, started, finished, timeout_s),
                })
            continue
        if is_int(batch_end):
            span = batch_end - started
            if span > timeout_s:
                timeouts.append({
                    "task": item["task"],
                    "started_at": started,
                    "finished_at": None,
                    "timeout_s": timeout_s,
                    "span_s": span,
                    "detail": "任务 %s 只有 started_at=%d 无 finished_at，以批次逻辑终点 %d 为参照跨度 %d 秒已超上限 %d 秒，锁未释放"
                              % (item["task"], started, batch_end, span, timeout_s),
                })
    timeouts.sort(key=lambda item: item["task"])
    return timeouts


def build_parallel_groups(tasks, conflicts):
    """按冲突图着色给出可安全并行的分组建议：组内两两无锁交集。"""
    keys = [item["key"] for item in tasks]
    conflict_pairs = {key: set() for key in keys}
    for item in conflicts:
        left = next(task["key"] for task in tasks if task["task"] == item["tasks"][0])
        right = next(task["key"] for task in tasks if task["task"] == item["tasks"][1])
        conflict_pairs[left].add(right)
        conflict_pairs[right].add(left)

    degree = {key: len(conflict_pairs[key]) for key in keys}
    order = sorted(keys, key=lambda key: (-degree[key], key))
    assignment = {}
    groups = []
    for key in order:
        for group_index, group in enumerate(groups):
            if all(member not in conflict_pairs[key] for member in group):
                group.append(key)
                assignment[key] = group_index
                break
        else:
            groups.append([key])
            assignment[key] = len(groups) - 1

    name_of = {item["key"]: item["task"] for item in tasks}
    result = []
    for group in groups:
        result.append([name_of[key] for key in sorted(group)])
    result.sort(key=lambda names: names[0] if names else "")
    return result


def build_serialization_plan(conflicts):
    """必须串行的任务对：按任务名与冲突键稳定排序后去重。"""
    pairs = {}
    for item in conflicts:
        pair = (item["tasks"][0], item["tasks"][1])
        pairs[pair] = sorted(set(pairs.get(pair, [])) | set(item["keys"]))
    return [[pair[0], pair[1]] for pair in sorted(pairs.keys())]


def detect(tasks):
    conflicts = find_conflicts(tasks)
    adjacency, _edges = build_wait_graph(tasks)
    name_of = {item["key"]: item["task"] for item in tasks}
    cycles = find_deadlock_cycles(adjacency)
    deadlock_cycles = []
    for cycle in cycles:
        names = [name_of[key] for key in cycle]
        deadlock_cycles.append({
            "cycle": names + [names[0]],
            "tasks": names,
            "detail": "等待图成环：%s —— 每个任务都在等下一个任务持有的键，违反字典序固定取锁顺序，必然死锁"
                      % " → ".join(names + [names[0]]),
        })
    timeouts = find_timeouts(tasks)
    return {
        "success": not (conflicts or deadlock_cycles or timeouts),
        "conflicts": conflicts,
        "deadlock_cycles": deadlock_cycles,
        "timeouts": timeouts,
        "serialization_plan": build_serialization_plan(conflicts),
        "parallel_groups": build_parallel_groups(tasks, conflicts),
    }


def main():
    parser = argparse.ArgumentParser(description="Detect parallel lock conflicts, deadlock cycles and lock timeouts")
    parser.add_argument("--from-json", dest="from_json", help="并行任务 JSONL 文件路径")
    parser.add_argument("--stdin", action="store_true", help="从 stdin 读取并行任务 JSONL")
    parser.add_argument("--json", action="store_true", help="输出 JSON（本脚本恒输出 JSON）")
    args = parser.parse_args()

    if bool(args.from_json) == bool(args.stdin):
        return fail_input("必须且只能指定 --from-json <jsonl> 或 --stdin 之一")

    if args.stdin:
        rows, error = parse_jsonl_text(sys.stdin.read())
    else:
        rows, error = read_jsonl_path(args.from_json)
    if error:
        return fail_input(error)

    tasks, error = build_tasks(rows)
    if error:
        return fail_input(error)

    report = detect(tasks)
    build_report(report)
    return EXIT_OK if report["success"] else EXIT_HIT


if __name__ == "__main__":
    sys.exit(main())
