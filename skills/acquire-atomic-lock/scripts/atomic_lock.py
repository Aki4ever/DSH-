#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
atomic_lock.py
物理原子锁：基于 mkdir(2) 原子目录的内核级互斥原语，含陈旧锁回收与释放必达。

口径唯一来源：skills/atomic-lock-policy/SKILL.md
  ① 载体 = mkdir 原子目录（EEXIST 即抢锁失败），禁止 exists-then-write 伪原子
  ② 锁键 = realpath 归一化绝对路径（port:/instance: 前缀键不参与路径归一化）
  ③ 加锁顺序 = 字典序固定顺序（多锁一次性获取时按码点升序）
  ④ 持有者 = pid + start_ticks（防 PID 复用误判）
  ⑤ 超时默认 300 秒；等待超时即失败退出；持有超时即视为过期
  ⑥ 陈旧锁必须可回收，判据随模式分档：
       lease 模式（默认，跨命令调用加锁）：start_ticks 与存活进程不符（PID 被复用）或持有超时 → 陈旧
       live  模式（run 子命令，进程持有）：pid 不存在 或 start_ticks 不符 或持有超时 → 陈旧
     回收方式只能是「删除锁目录后重新 mkdir」，禁止就地改写锁内容
  ⑦ 释放必达：try/finally + SIGINT/SIGTERM 处理器；释放前校验 token，禁止释放他人锁

Exit Code:
  0 - 获取成功 / 释放成功 / 子命令执行完成（run 模式取子进程退出码）
  1 - 等待超时未获得锁 / token 不匹配拒绝释放 / 锁已不存在
  2 - 输入不可读（缺参、锁根目录不可写、owner.json 损坏）
"""

import sys

sys.dont_write_bytecode = True

import os
import json
import time
import errno
import signal
import hashlib
import argparse
import shutil
import subprocess

EXIT_OK = 0
EXIT_CONFLICT = 1
EXIT_INPUT = 2

DEFAULT_TIMEOUT_S = 300
DEFAULT_LOCK_ROOT = os.path.join("/tmp", "dsh-atomic-locks")  # [shared-resource] atomic-lock-root
WAIT_STEP_S = 0.02


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


# ---------------------------------------------------------------- 锁键归一化

PREFIX_KEYS = ("port:", "instance:")


def normalize_key(key):
    """口径②：绝对路径 realpath 归一 + 剥尾斜杠；port:/instance: 前缀键逐字符保留。"""
    raw = (key or "").strip()
    if not raw:
        return None
    for prefix in PREFIX_KEYS:
        if raw.startswith(prefix):
            tail = raw[len(prefix):].strip()
            if not tail:
                return None
            return prefix + tail
    resolved = os.path.realpath(raw)
    if len(resolved) > 1:
        resolved = resolved.rstrip("/")
    return resolved


def lock_dir_name(normalized_key):
    digest = hashlib.sha1(normalized_key.encode("utf-8")).hexdigest()[:16]
    return digest + ".lock"


def lock_path(lock_root, normalized_key):
    return os.path.join(lock_root, lock_dir_name(normalized_key))


# ---------------------------------------------------------------- 持有者标识

def process_start_token(pid):
    """口径④：取进程起始时刻。Linux 读 /proc/<pid>/stat 第 22 字段，其余走 ps -o lstart=。

    进程不存在时返回 None。
    """
    stat_path = "/proc/%d/stat" % pid
    if os.path.exists(stat_path):
        try:
            with open(stat_path, "r", encoding="utf-8", errors="replace") as handle:
                content = handle.read()
            rparen = content.rfind(")")
            if rparen == -1:
                return None
            fields = content[rparen + 2:].split()
            if len(fields) < 20:
                return None
            return "proc:" + fields[19]
        except OSError:
            return None
    try:
        completed = subprocess.run(
            ["ps", "-o", "lstart=", "-p", str(pid)],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    except (OSError, ValueError):
        return None
    text = completed.stdout.decode("utf-8", "replace").strip()
    if not text:
        return None
    return "ps:" + text


def pid_alive(pid):
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return False
    return True


def make_owner(normalized_key, timeout_s, mode):
    pid = os.getpid()
    return {
        "key": normalized_key,
        "pid": pid,
        "start_ticks": process_start_token(pid) or ("self:%d" % int(time.time())),
        "host": os.uname().nodename,
        "acquired_at": time.time(),
        "timeout_s": timeout_s,
        "mode": mode,
    }


# ---------------------------------------------------------------- 陈旧判定

def read_owner(path):
    owner_file = os.path.join(path, "owner.json")
    try:
        with open(owner_file, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except FileNotFoundError:
        # 锁目录已建但 owner.json 尚未落盘：视为在建中，交由等待循环处理
        return None
    except (OSError, ValueError):
        return {"corrupt": True}
    if not isinstance(payload, dict):
        return {"corrupt": True}
    return payload


def classify_stale(owner, timeout_s, now):
    """口径⑥：返回 (是否陈旧, 原因)。判据随锁内记录的 mode 分档。

    lease 模式：锁跨命令调用存活，持有者进程退出不等于锁失效，因此**不**按 pid 存活判陈旧；
                只有「PID 被复用」（pid 活着但 start_ticks 不符）或「持有超时」才算陈旧。
    live  模式：锁与持有进程同生共死，pid 不存在即陈旧。
    """
    if owner is None:
        return False, "pending"
    if owner.get("corrupt"):
        return True, "owner_json_corrupt"
    pid = owner.get("pid")
    if not isinstance(pid, int):
        return True, "owner_pid_missing"
    mode = owner.get("mode") or "lease"
    alive = pid_alive(pid)
    if not alive and mode == "live":
        return True, "pid_not_alive"
    if alive:
        actual = process_start_token(pid)
        recorded = owner.get("start_ticks")
        if actual is not None and recorded is not None and actual != recorded:
            return True, "pid_reused_start_ticks_mismatch"
    acquired_at = owner.get("acquired_at")
    hold_limit = owner.get("timeout_s")
    if not isinstance(hold_limit, (int, float)) or hold_limit <= 0:
        hold_limit = timeout_s
    if isinstance(acquired_at, (int, float)) and now - acquired_at > hold_limit:
        return True, "hold_timeout_exceeded"
    return False, "held"


def reclaim(path):
    """口径⑥：回收方式只能是「删除后重新 mkdir」，禁止就地改写锁内容。"""
    try:
        shutil.rmtree(path)
        return True
    except FileNotFoundError:
        return True
    except OSError:
        return False


# ---------------------------------------------------------------- 获取 / 释放

def try_acquire(path, owner):
    try:
        os.mkdir(path)
    except FileExistsError:
        return False
    except OSError as exc:
        if exc.errno == errno.EEXIST:
            return False
        raise
    tmp_owner = os.path.join(path, "owner.json.tmp")
    final_owner = os.path.join(path, "owner.json")
    with open(tmp_owner, "w", encoding="utf-8") as handle:
        json.dump(owner, handle, ensure_ascii=False, indent=2)
    os.replace(tmp_owner, final_owner)
    return True


def acquire(args, normalized_key, path):
    owner = make_owner(normalized_key, args.timeout, args.mode)
    deadline = time.time() + args.wait
    reclaimed = []
    attempts = 0
    while True:
        attempts += 1
        if try_acquire(path, owner):
            return {
                "success": True,
                "acquired": True,
                "key": normalized_key,
                "lock_path": path,
                "token": "%d:%s" % (owner["pid"], owner["start_ticks"]),
                "owner": owner,
                "attempts": attempts,
                "reclaimed": reclaimed,
            }, EXIT_OK
        existing = read_owner(path)
        stale, reason = classify_stale(existing, args.timeout, time.time())
        if stale:
            if reclaim(path):
                reclaimed.append(reason)
                continue
        if time.time() >= deadline:
            return {
                "success": False,
                "acquired": False,
                "key": normalized_key,
                "lock_path": path,
                "reason": "wait_timeout",
                "waited_s": round(args.wait, 4),
                "holder": existing,
                "attempts": attempts,
                "reclaimed": reclaimed,
            }, EXIT_CONFLICT
        time.sleep(WAIT_STEP_S)


def release(normalized_key, path, token):
    if not os.path.isdir(path):
        return {
            "success": False,
            "released": False,
            "key": normalized_key,
            "lock_path": path,
            "reason": "lock_not_found",
        }, EXIT_CONFLICT
    owner = read_owner(path) or {}
    recorded = None
    if isinstance(owner.get("pid"), int) and owner.get("start_ticks") is not None:
        recorded = "%d:%s" % (owner["pid"], owner["start_ticks"])
    if token and recorded and token != recorded:
        return {
            "success": False,
            "released": False,
            "key": normalized_key,
            "lock_path": path,
            "reason": "token_mismatch",
            "expected_token": recorded,
            "given_token": token,
        }, EXIT_CONFLICT
    if not reclaim(path):
        return {
            "success": False,
            "released": False,
            "key": normalized_key,
            "lock_path": path,
            "reason": "remove_failed",
        }, EXIT_INPUT
    return {
        "success": True,
        "released": True,
        "key": normalized_key,
        "lock_path": path,
        "token": recorded,
    }, EXIT_OK


def status(args):
    entries = []
    now = time.time()
    if os.path.isdir(args.lock_root):
        for name in sorted(os.listdir(args.lock_root)):
            if not name.endswith(".lock"):
                continue
            full = os.path.join(args.lock_root, name)
            if not os.path.isdir(full):
                continue
            owner = read_owner(full)
            stale, reason = classify_stale(owner, args.timeout, now)
            entries.append({
                "lock_path": full,
                "key": (owner or {}).get("key"),
                "holder_pid": (owner or {}).get("pid"),
                "mode": (owner or {}).get("mode"),
                "state": "stale" if stale else "held",
                "reason": reason,
            })
    return {
        "success": True,
        "lock_root": args.lock_root,
        "locks": entries,
        "held": len([e for e in entries if e["state"] == "held"]),
        "stale": len([e for e in entries if e["state"] == "stale"]),
    }, EXIT_OK


def run_guarded(args, normalized_key, path):
    """持有锁执行子命令；try/finally + 信号处理器保证释放必达（口径⑦）。"""
    acquired, code = acquire(args, normalized_key, path)
    if code != EXIT_OK:
        emit(acquired)
        return code
    token = acquired["token"]

    def handler(signum, frame):  # noqa: ARG001
        release(normalized_key, path, token)
        sys.exit(128 + signum)

    previous = {}
    for signame in ("SIGINT", "SIGTERM", "SIGHUP"):
        signum = getattr(signal, signame, None)
        if signum is None:
            continue
        try:
            previous[signum] = signal.signal(signum, handler)
        except (ValueError, OSError):
            continue
    child_code = 0
    released = None
    try:
        child = subprocess.run(args.command, check=False)
        child_code = child.returncode
    except OSError as exc:
        child_code = EXIT_INPUT
        print(json.dumps({"error": "command_not_runnable", "detail": str(exc)}, ensure_ascii=False))
    finally:
        released, _ = release(normalized_key, path, token)
        for signum, prior in previous.items():
            try:
                signal.signal(signum, prior)
            except (ValueError, OSError):
                continue
    emit({
        "success": child_code == 0,
        "key": normalized_key,
        "lock_path": path,
        "token": token,
        "child_exit_code": child_code,
        "released": bool(released and released.get("released")),
    })
    return child_code


# ---------------------------------------------------------------- CLI

def build_parser():
    parser = argparse.ArgumentParser(
        prog="atomic_lock.py",
        description="物理原子锁：mkdir 原子目录 + 陈旧回收 + 释放必达（口径见 skills/atomic-lock-policy/SKILL.md）",
    )
    parser.add_argument("action", choices=["acquire", "release", "status", "run"])
    parser.add_argument("--key", default=None, help="共享资源键：路径或 port:/instance: 前缀键")
    parser.add_argument("--lock-root", default=DEFAULT_LOCK_ROOT, help="锁根目录，默认 /tmp/dsh-atomic-locks")
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT_S,
                        help="默认 300 秒：既是等待上限，也是锁的持有上限")
    parser.add_argument("--wait", type=float, default=None, help="等待获取的上限秒数，缺省等于 --timeout")
    parser.add_argument("--mode", choices=["lease", "live"], default="lease",
                        help="lease=锁跨命令调用存活（默认）；live=锁与持有进程同生共死（run 强制）")
    parser.add_argument("--token", default=None, help="释放时校验的持有者 token（pid:start_ticks）")
    parser.add_argument("--json", action="store_true", help="兼容开关；脚本恒输出 JSON")
    return parser


def split_command(argv):
    """在第一个独立的 `--` 处切分：左侧是锁参数，右侧是 run 模式的子命令。

    不使用 argparse 的 REMAINDER：它会把 `--key` 这类可选参数一并吞进子命令，
    导致 acquire / release / status 全部报 missing_key。
    """
    if "--" not in argv:
        return list(argv), []
    index = argv.index("--")
    return list(argv[:index]), list(argv[index + 1:])


def main(argv):
    parser = build_parser()
    head, command = split_command(argv)
    args = parser.parse_args(head)
    args.command = command
    if args.wait is None:
        args.wait = args.timeout

    if args.action == "status":
        payload, code = status(args)
        emit(payload)
        return code

    if not args.key:
        emit({"error": "missing_key", "detail": "--key 必填（status 除外）"})
        return EXIT_INPUT
    normalized_key = normalize_key(args.key)
    if normalized_key is None:
        emit({"error": "empty_key", "detail": "--key 归一化后为空"})
        return EXIT_INPUT

    try:
        os.makedirs(args.lock_root, exist_ok=True)
    except OSError as exc:
        emit({"error": "lock_root_unwritable", "detail": str(exc), "lock_root": args.lock_root})
        return EXIT_INPUT

    path = lock_path(args.lock_root, normalized_key)

    if args.action == "acquire":
        payload, code = acquire(args, normalized_key, path)
        emit(payload)
        return code
    if args.action == "release":
        payload, code = release(normalized_key, path, args.token)
        emit(payload)
        return code
    if args.action == "run":
        if not args.command:
            emit({"error": "missing_command", "detail": "run 模式需要 -- 之后给出子命令"})
            return EXIT_INPUT
        args.mode = "live"
        return run_guarded(args, normalized_key, path)
    emit({"error": "unknown_action"})
    return EXIT_INPUT


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
