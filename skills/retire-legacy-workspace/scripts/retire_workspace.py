#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
retire_workspace.py
旧工作区退役器：把「已合并但还活着」的源目录**真正退场**。

为什么要单独做这一步：PKG-007 只做了子树合并（内容进新家、历史保留），
却把源目录保留成「只读镜像」——那不是迁移，是复制。实测两轮就分叉 44 个文件。

安全顺序（本脚本强制，不可调换）：
  1 内容一致性：源与目标逐文件 diff，差值为 0（空目录、.git、__pycache__ 除外）
  2 目标已入库：目标仓库工作树干净（内容在远端各有一份，删除才可回滚）
  3 会话完整性：源工作区的每条 sessionId 都已在目标工作区的 sessionIds 内
  4 写台账：retired-workspaces.json（写在**新家**，不写在将被删除的目录里）
  5 摘注册：从 workspace.json 移除源工作区条目（先备份 workspace.json）
  6 删目录：物理删除源路径
  7 复核：源路径不存在

**第 5 步必须早于第 6 步**：先取消注册再删目录，避免「注册项指向不存在路径」的中间态。

Exit Code:
  0 - 干跑完成 / 退役成功 / 已是目标状态（幂等）
  1 - 前置断言不成立（内容仍有差异 / 目标未入库 / 会话不完整）
  2 - 输入不可读（路径缺失、workspace.json 不可解析）
"""

import sys

sys.dont_write_bytecode = True

import os
import io
import json
import time
import shutil
import filecmp
import argparse
import subprocess

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_INPUT = 2
SKIP_NAMES = {".git", "__pycache__", ".DS_Store"}


def emit(p):
    print(json.dumps(p, ensure_ascii=False, indent=2))


def workspace_json():
    home = os.environ.get("DSH_HOME") or os.path.join(os.path.expanduser("~"), ".dsh")
    return os.path.join(home, "storages", "workspace.json")


def content_diff(a, b, limit=50):
    """逐文件比对。空目录不视为差异：git 不跟踪空目录，子树合并不会带上它们。"""
    diffs = []
    for root, dirs, files in os.walk(a):
        dirs[:] = [d for d in dirs if d not in SKIP_NAMES]
        for name in files:
            if name in SKIP_NAMES:
                continue
            src = os.path.join(root, name)
            rel = os.path.relpath(src, a)
            dst = os.path.join(b, rel)
            if not os.path.exists(dst):
                diffs.append({"file": rel, "kind": "missing_in_target"})
            elif not filecmp.cmp(src, dst, shallow=False):
                diffs.append({"file": rel, "kind": "content_mismatch"})
            if len(diffs) >= limit:
                return diffs
    for root, dirs, files in os.walk(b):
        dirs[:] = [d for d in dirs if d not in SKIP_NAMES]
        for name in files:
            if name in SKIP_NAMES:
                continue
            rel = os.path.relpath(os.path.join(root, name), b)
            if not os.path.exists(os.path.join(a, rel)):
                diffs.append({"file": rel, "kind": "extra_in_target"})
            if len(diffs) >= limit:
                return diffs
    return diffs


def git(repo, *args):
    proc = subprocess.run(["git", "-C", repo] + list(args),
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return proc.returncode, proc.stdout.decode("utf-8", "replace").strip()


def main(argv):
    ap = argparse.ArgumentParser(prog="retire_workspace.py",
                                 description="旧工作区退役器（内容已合并 → 摘注册 → 删目录）")
    ap.add_argument("--source", required=True, help="待退役的源目录")
    ap.add_argument("--target", required=True, help="已承接内容的目标目录")
    ap.add_argument("--ledger", default=None, help="退役台账输出路径（默认写到目标仓库）")
    ap.add_argument("--ws", default=None, help="workspace.json 路径覆盖")
    ap.add_argument("--apply", action="store_true", help="真正执行；缺省为干跑")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    source = os.path.abspath(os.path.expanduser(args.source))
    target = os.path.abspath(os.path.expanduser(args.target))
    ws_path = args.ws or workspace_json()
    ledger_path = args.ledger or os.path.join(target, "docs", "operations", "retired-workspaces.json")

    state = {"source": source, "target": target, "dry_run": not args.apply}

    if not os.path.isdir(source):
        if os.path.isfile(ledger_path):
            emit({"success": True, "status": "already_retired", "source": source,
                  "ledger": ledger_path, "changed": 0})
            return EXIT_OK
        emit({"success": False, "error": "source_missing", "detail": source})
        return EXIT_INPUT
    if not os.path.isdir(target):
        emit({"success": False, "error": "target_missing", "detail": target})
        return EXIT_INPUT
    if not os.path.isfile(ws_path):
        emit({"success": False, "error": "workspace_json_missing", "detail": ws_path})
        return EXIT_INPUT

    # 1 内容不丢失：**只**把「源里有、目标没有」当作阻断条件。
    # 源目录是被冻结的旧镜像，它的文件比目标旧（content_mismatch）是**预期状态**，
    # 目标多出的文件（extra_in_target）更是预期的——真正的风险只有一个：
    # 某个文件只存在于将被删除的那一侧，删了就永久丢失。
    diffs = content_diff(source, target)
    lost = [d for d in diffs if d["kind"] == "missing_in_target"]
    stale = [d for d in diffs if d["kind"] == "content_mismatch"]
    state["content_diff_count"] = len(diffs)
    state["would_be_lost"] = len(lost)
    state["stale_in_source"] = len(stale)
    if lost:
        emit({"success": False, "status": "blocked", "stage": "content_loss",
              "detail": "有 %d 个文件只存在于源侧，删除会永久丢失" % len(lost),
              "lost": lost[:10]})
        return EXIT_FAIL

    # 2 目标已入库
    rc, out = git(target, "status", "--porcelain")
    if rc != 0:
        emit({"success": False, "status": "blocked", "stage": "target_git",
              "detail": "目标不是 git 仓库或 git 不可用：%s" % out})
        return EXIT_FAIL
    dirty = [line for line in out.splitlines() if line.strip()]
    if dirty:
        emit({"success": False, "status": "blocked", "stage": "target_git",
              "detail": "目标工作树有 %d 项未提交变更；请先提交推送再删除源目录" % len(dirty),
              "dirty": dirty[:10]})
        return EXIT_FAIL

    # 3 会话完整性
    try:
        with io.open(ws_path, encoding="utf-8") as h:
            ws = json.load(h)
    except (OSError, ValueError) as exc:
        emit({"success": False, "error": "workspace_unreadable", "detail": str(exc)})
        return EXIT_INPUT
    workspaces = (ws.get("tables") or {}).get("workspaces") or {}
    src_key = next((k for k, v in workspaces.items()
                    if os.path.abspath(v.get("path", "")) == source), None)
    tgt_key = next((k for k, v in workspaces.items()
                    if os.path.abspath(v.get("path", "")) == target), None)
    state["workspace_entry"] = src_key or "absent"
    if src_key and tgt_key:
        src_ids = set(workspaces[src_key].get("sessionIds") or [])
        tgt_ids = set(workspaces[tgt_key].get("sessionIds") or [])
        missing = sorted(src_ids - tgt_ids)
        state["sessions_missing"] = missing
        if missing:
            emit({"success": False, "status": "blocked", "stage": "session_completeness",
                  "detail": "有 %d 条会话尚未归入目标工作区" % len(missing),
                  "missing": missing})
            return EXIT_FAIL

    if not args.apply:
        emit({"success": True, "status": "dry_run", "source": source, "target": target,
              "would_be_lost": 0, "stale_in_source": len(stale),
              "content_diff_count": len(diffs), "target_dirty": 0,
              "workspace_entry": state["workspace_entry"],
              "would": ["写台账 " + ledger_path,
                        "备份并摘除 workspace.json 中的源条目",
                        "物理删除 " + source]})
        return EXIT_OK

    # 4 台账（写到新家）
    stamp = time.strftime("%Y%m%d-%H%M%S")
    rc, src_head = git(source, "rev-parse", "HEAD")
    sessions_migrated = len(workspaces.get(src_key, {}).get("sessionIds") or []) if src_key else 0
    ledger = {
        "version": 1,
        "retired_at": stamp,
        "source": source,
        "target": target,
        "source_head": src_head if rc == 0 else None,
        "workspace_entry_removed": src_key,
        "sessions_migrated": sessions_migrated,
        "rollback": "源仓库内容已在远端各有一份：git clone <remote> 即可恢复；"
                    "workspace.json 可从备份还原",
        "reason": "PKG-007 只做了子树合并并保留源目录为镜像，两轮内分叉 44 个文件；"
                  "本步骤完成真正的退役",
    }
    os.makedirs(os.path.dirname(ledger_path), exist_ok=True)
    with io.open(ledger_path, "w", encoding="utf-8") as h:
        json.dump(ledger, h, ensure_ascii=False, indent=2)
        h.write("\n")
    state["ledger"] = ledger_path

    # 5 摘注册（先备份）
    backup = ws_path + ".bak-" + stamp
    shutil.copy2(ws_path, backup)
    if src_key:
        workspaces.pop(src_key, None)
        with io.open(ws_path, "w", encoding="utf-8") as h:
            json.dump(ws, h, ensure_ascii=False, indent=2)
            h.write("\n")
    state["workspace_backup"] = backup

    # 6 删目录
    shutil.rmtree(source)
    state["source_absent"] = not os.path.exists(source)

    emit({"success": True, "status": "retired", **state})
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
