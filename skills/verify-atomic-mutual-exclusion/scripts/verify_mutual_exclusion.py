#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_mutual_exclusion.py
原子锁互斥性物理压测：N 个真实进程并发抢同一把 mkdir 原子锁，采集临界区进入/退出时间戳，
断言任一瞬间临界区持有者数 ≤ 1，即「同时处理」被真正串行化为互斥。

口径唯一来源：skills/atomic-lock-policy/SKILL.md
  ① 载体 = mkdir 原子目录（内核保证检查与创建不可分割）
  ⑥ 陈旧锁必须可回收（本脚本用「伪造死 PID」夹具做正向验证）
  ⑦ 释放必达（worker 用 try/finally 释放）

三段证据（缺一不可，否则无法证明检测器真的能看见并发）：
  guarded 段：worker 持锁进临界区 → 断言 overlap == 0 且 max_concurrent == 1
  control 段：worker **不**持锁进临界区 → 断言 overlap > 0 且 max_concurrent > 1
             （负向对照：若 control 段也测出 0 重叠，说明 journal 或检测逻辑坏了，
               guarded 段的 0 就是假阴性，必须判失败）
  stale   段：伪造已死 PID 的锁 → 断言 status 判 stale 且 acquire 能回收成功

Exit Code:
  0 - 三段证据全部成立，互斥被证明
  1 - 任一段断言失败（重叠窗口非零 / 控制段看不见并发 / 陈旧锁不可回收 / 有 worker 异常退出）
  2 - 输入不可读（依赖脚本缺失、锁根不可写、worker 启动失败）
"""

import sys

sys.dont_write_bytecode = True

import os
import json
import time
import shutil
import signal
import hashlib
import argparse
import importlib.util
import subprocess
import tempfile

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_INPUT = 2

HERE = os.path.dirname(os.path.abspath(__file__))
POOL_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
ATOMIC_LOCK_SCRIPT = os.path.join(POOL_ROOT, "skills", "acquire-atomic-lock", "scripts", "atomic_lock.py")
# [shared-resource] instance:dsh-mutual-exclusion

DEFAULT_WORKERS = 16
DEFAULT_ROUNDS = 20
DEFAULT_HOLD_MS = 5.0
DEFAULT_TIMEOUT_S = 60.0


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def load_atomic_lock(path):
    if not os.path.isfile(path):
        return None
    spec = importlib.util.spec_from_file_location("dsh_atomic_lock", path)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# ---------------------------------------------------------------- worker 侧

class Args(object):
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def run_worker(options):
    """单个 worker：rounds 次 (进入临界区 → 写入时间戳 → 退出临界区)。

    guarded=True 时每次进出都真的持有 mkdir 原子锁（live 模式），
    guarded=False 时为负向对照，不取锁。
    """
    module = load_atomic_lock(options.atomic_lock_script)
    if module is None:
        return EXIT_INPUT
    key = module.normalize_key(options.key)
    path = module.lock_path(options.lock_root, key)
    records = []
    hold = options.hold_ms / 1000.0
    for index in range(options.rounds):
        token = None
        acquired = True
        if options.guarded:
            lock_args = Args(
                timeout=options.timeout,
                wait=options.timeout,
                mode="live",
                lock_root=options.lock_root,
            )
            payload, code = module.acquire(lock_args, key, path)
            if code != EXIT_OK:
                acquired = False
                records.append({"w": options.worker_id, "r": index, "acquired": False,
                                "reason": payload.get("reason")})
                continue
            token = payload["token"]
        try:
            enter = time.time()
            if hold > 0:
                time.sleep(hold)
            exit_at = time.time()
            records.append({"w": options.worker_id, "r": index, "acquired": acquired,
                            "enter": enter, "exit": exit_at})
        finally:
            if token is not None:
                module.release(key, path, token)
    with open(options.journal, "w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    return EXIT_OK


# ---------------------------------------------------------------- 父进程侧

def sweep(intervals):
    """扫描线：返回 (最大同时持有者数, 重叠窗口数)。

    重叠窗口数按「进入事件发生时已有其他持锁者」计数——这正是「同时处理」的物理定义。
    """
    events = []
    for item in intervals:
        events.append((item["enter"], 1, item["w"], item["r"]))
        events.append((item["exit"], -1, item["w"], item["r"]))
    events.sort(key=lambda row: (row[0], -row[1]))
    active = 0
    max_concurrent = 0
    overlap_windows = 0
    for _, delta, _, _ in events:
        if delta == 1:
            if active >= 1:
                overlap_windows += 1
            active += 1
            if active > max_concurrent:
                max_concurrent = active
        else:
            active -= 1
            if active < 0:
                active = 0
    return max_concurrent, overlap_windows


def collect(journal_paths):
    intervals = []
    missing = []
    for path in journal_paths:
        if not os.path.isfile(path):
            missing.append(path)
            continue
        with open(path, "r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                except ValueError:
                    missing.append(path + ":unparsable")
                    continue
                if "enter" in record and "exit" in record:
                    intervals.append(record)
    return intervals, missing


def run_phase(workers, rounds, hold_ms, lock_root, work_dir, guarded, timeout):
    key = "instance:dsh-mutual-exclusion-%s" % ("guarded" if guarded else "control")
    journals = []
    processes = []
    for index in range(workers):
        journal = os.path.join(work_dir, "journal-%s-%d.jsonl" % ("g" if guarded else "c", index))
        journals.append(journal)
        command = [
            sys.executable, os.path.abspath(__file__), "--worker",
            "--worker-id", str(index),
            "--rounds", str(rounds),
            "--hold-ms", str(hold_ms),
            "--lock-root", lock_root,
            "--key", key,
            "--journal", journal,
            "--timeout", str(timeout),
            "--atomic-lock-script", ATOMIC_LOCK_SCRIPT,
        ]
        if guarded:
            command.append("--guarded")
        processes.append(subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE))
    exit_codes = []
    for process in processes:
        _, stderr = process.communicate()
        exit_codes.append((process.returncode, stderr.decode("utf-8", "replace").strip()))
    intervals, missing = collect(journals)
    max_concurrent, overlap_windows = sweep(intervals)
    return {
        "phase": "guarded" if guarded else "control",
        "workers": workers,
        "rounds": rounds,
        "entries": len(intervals),
        "expected_entries": workers * rounds,
        "max_concurrent_holders": max_concurrent,
        "overlap_windows": overlap_windows,
        "missing_journals": missing,
        "worker_failures": [
            {"exit_code": code, "stderr": err} for code, err in exit_codes if code != EXIT_OK
        ],
    }


def stale_phase(module, lock_root, timeout):
    """口径⑥正向验证：伪造「进程已不存在」的锁，断言可判陈旧且可被回收。"""
    key = module.normalize_key("instance:dsh-stale-fixture")
    path = module.lock_path(lock_root, key)
    module.reclaim(path)
    owner = {
        "key": key,
        "pid": 999999,
        "start_ticks": "ps:definitely-not-a-real-process",
        "host": os.uname().nodename,
        "acquired_at": time.time() - 100000,
        "timeout_s": timeout,
        "mode": "live",
    }
    os.mkdir(path)
    with open(os.path.join(path, "owner.json"), "w", encoding="utf-8") as handle:
        json.dump(owner, handle, ensure_ascii=False)
    detected, reason = module.classify_stale(module.read_owner(path), timeout, time.time())
    lock_args = Args(timeout=timeout, wait=timeout, mode="live", lock_root=lock_root)
    payload, code = module.acquire(lock_args, key, path)
    acquired_after_reclaim = code == EXIT_OK and bool(payload.get("acquired"))
    if acquired_after_reclaim:
        module.release(key, path, payload.get("token"))
    return {
        "phase": "stale",
        "detected_stale": bool(detected),
        "reason": reason,
        "reclaimed_and_acquired": acquired_after_reclaim,
    }


def evaluate(result):
    """三段证据的硬断言。返回 (是否全部通过, 断言清单)。"""
    guarded = result["guarded"]
    control = result["control"]
    stale = result["stale"]
    checks = [
        {
            "name": "guarded_no_overlap",
            "pass": guarded["overlap_windows"] == 0 and guarded["max_concurrent_holders"] <= 1,
            "detail": "持锁段临界区重叠窗口 %d，任一瞬间最大持有者 %d（要求分别为 0 与 1）"
                      % (guarded["overlap_windows"], guarded["max_concurrent_holders"]),
        },
        {
            "name": "guarded_all_acquired",
            "pass": guarded["entries"] == guarded["expected_entries"]
                    and not guarded["worker_failures"] and not guarded["missing_journals"],
            "detail": "持锁段完成 %d/%d 次临界区，worker 异常 %d 个"
                      % (guarded["entries"], guarded["expected_entries"], len(guarded["worker_failures"])),
        },
        {
            "name": "control_sees_concurrency",
            "pass": control["overlap_windows"] > 0 and control["max_concurrent_holders"] > 1,
            "detail": "无锁对照段重叠窗口 %d，最大持有者 %d（必须 > 0 与 > 1，否则检测器看不见并发，"
                      "持锁段的 0 属假阴性）"
                      % (control["overlap_windows"], control["max_concurrent_holders"]),
        },
        {
            "name": "stale_lock_reclaimable",
            "pass": stale["detected_stale"] and stale["reclaimed_and_acquired"],
            "detail": "陈旧锁判定 %s（原因 %s），回收后重新获取 %s"
                      % (stale["detected_stale"], stale["reason"], stale["reclaimed_and_acquired"]),
        },
    ]
    return all(item["pass"] for item in checks), checks


# ---------------------------------------------------------------- CLI

def build_parser():
    parser = argparse.ArgumentParser(
        prog="verify_mutual_exclusion.py",
        description="原子锁互斥性物理压测：真实多进程并发 + 无锁负向对照 + 陈旧锁回收三段证据",
    )
    parser.add_argument("--workers", type=int, default=DEFAULT_WORKERS, help="并发进程数，默认 16")
    parser.add_argument("--rounds", type=int, default=DEFAULT_ROUNDS, help="每进程临界区轮次，默认 20")
    parser.add_argument("--hold-ms", type=float, default=DEFAULT_HOLD_MS, help="临界区驻留毫秒，默认 5")
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT_S, help="单次等待/持有上限秒数")
    parser.add_argument("--lock-root", default=None, help="锁根目录，缺省用临时目录")
    parser.add_argument("--skip-control", action="store_true", help="跳过无锁负向对照段（不建议）")
    parser.add_argument("--json", action="store_true", help="兼容开关；脚本恒输出 JSON")
    parser.add_argument("--worker", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--worker-id", type=int, default=0, help=argparse.SUPPRESS)
    parser.add_argument("--journal", default=None, help=argparse.SUPPRESS)
    parser.add_argument("--key", default=None, help=argparse.SUPPRESS)
    parser.add_argument("--guarded", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--atomic-lock-script", default=ATOMIC_LOCK_SCRIPT, help=argparse.SUPPRESS)
    return parser


def main(argv):
    args = build_parser().parse_args(argv)

    if args.worker:
        options = Args(
            worker_id=args.worker_id, rounds=args.rounds, hold_ms=args.hold_ms,
            lock_root=args.lock_root, key=args.key, journal=args.journal,
            guarded=args.guarded, timeout=args.timeout,
            atomic_lock_script=args.atomic_lock_script,
        )
        return run_worker(options)

    if args.workers < 2:
        emit({"error": "workers_too_small", "detail": "--workers 至少为 2，单进程无法构成并发"})
        return EXIT_INPUT
    if args.rounds < 1:
        emit({"error": "rounds_too_small", "detail": "--rounds 至少为 1"})
        return EXIT_INPUT
    module = load_atomic_lock(ATOMIC_LOCK_SCRIPT)
    if module is None:
        emit({"error": "dependency_missing", "detail": "找不到 %s" % ATOMIC_LOCK_SCRIPT})
        return EXIT_INPUT

    work_dir = tempfile.mkdtemp(prefix="dsh-mutex-")
    lock_root = args.lock_root or os.path.join(work_dir, "locks")
    os.makedirs(lock_root, exist_ok=True)

    def cleanup(signum=None, frame=None):  # noqa: ARG001
        shutil.rmtree(work_dir, ignore_errors=True)
        if signum is not None:
            sys.exit(128 + signum)

    for signame in ("SIGINT", "SIGTERM"):
        signum = getattr(signal, signame, None)
        if signum is not None:
            try:
                signal.signal(signum, cleanup)
            except (ValueError, OSError):
                pass

    try:
        guarded = run_phase(args.workers, args.rounds, args.hold_ms, lock_root,
                            work_dir, True, args.timeout)
        if args.skip_control:
            control = {"phase": "control", "skipped": True, "entries": 0, "expected_entries": 0,
                       "max_concurrent_holders": 0, "overlap_windows": 0,
                       "missing_journals": [], "worker_failures": []}
        else:
            control = run_phase(args.workers, args.rounds, args.hold_ms, lock_root,
                                work_dir, False, args.timeout)
        stale = stale_phase(module, lock_root, args.timeout)
    finally:
        pass

    result = {
        "success": False,
        "workers": args.workers,
        "rounds": args.rounds,
        "hold_ms": args.hold_ms,
        "lock_root": lock_root,
        "guarded": guarded,
        "control": control,
        "stale": stale,
        "checks": [],
    }
    passed, checks = evaluate(result)
    if args.skip_control:
        passed = passed and all(
            item["pass"] for item in checks if item["name"] != "control_sees_concurrency"
        )
        for item in checks:
            if item["name"] == "control_sees_concurrency":
                item["detail"] = "已按 --skip-control 跳过"
                item["pass"] = True
    result["checks"] = checks
    result["success"] = passed
    result["verdict"] = "mutual_exclusion_proven" if passed else "mutual_exclusion_not_proven"
    result["journal_dir"] = work_dir
    emit(result)
    shutil.rmtree(work_dir, ignore_errors=True)
    return EXIT_OK if passed else EXIT_FAIL


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
