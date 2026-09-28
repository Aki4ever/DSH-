#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
detect_forbidden.py
反例检测器：把事件流（JSONL 或 stdin）逐条判定七条「绝不允许发生」的反例，
命中即给出反例编号、事件 seq 列表与人类可读证据。

七条反例与物理判据（默认阈值，口径由 anti-pattern-policy 唯一给定）：
  AP-01 死循环   : 连续相同 action 且 state 不变          >= 5 次
  AP-02 无反馈   : 连续 silent=true 步数 > 20            或 相邻 ts 间隔 > 120 秒
  AP-03 无限重试 : 同一 action + 显式 ok=false + state 未变 > 3 次
  AP-04 假完成   : claim_done=true 但 probe_exit != 0     任一命中即违规
  AP-05 静默降级 : caught_error=true 且 logged 非 true    任一命中即违规
  AP-06 预算爆炸 : 单事件 context_tokens > 30000
  AP-07 播报风暴 : tier=micro 的 text 原文重复出现        > 3 次

确定性口径（无随机、无系统时间依赖）：
  - ts 只从事件字段读取，绝不取系统当前时间，同输入恒得同结论；
  - seq 缺失时以 1 起算的行号代替，命中项永远带得走序号；
  - AP-04 的 probe_exit 缺失视为「非 0」（无探针证据即不得声明完成）；
  - AP-05 的 logged 缺失视为「未记录」（fail-safe，保守判违规）；
  - silent 只认显式 true，ok=false 只认显式 false，tier 只认显式 "micro"。

Exit Code:
  0 - 无命中
  1 - 有命中
  2 - 输入缺失或不可解析（未给 --events/--stdin、二者同给、文件不可读、JSONL 行非法、事件非对象）
"""

import os
import sys
import json
import argparse

# 判定优先级：正确性 > 进展 > 可观测 > 成本（编号闭集，顺序即上报顺序）
PRIORITY = ["AP-04", "AP-05", "AP-01", "AP-03", "AP-02", "AP-07", "AP-06"]

ALL_CODES = ["AP-01", "AP-02", "AP-03", "AP-04", "AP-05", "AP-06", "AP-07"]

# 唯一默认阈值口径；只能由 CLI 显式覆盖，禁止在别处出现第二套
DEFAULT_THRESHOLDS = {
    "loop_threshold": 5,      # AP-01：连续相同 action 且 state 不变的最小命中次数
    "silent_threshold": 20,   # AP-02：连续 silent=true 步数上限
    "silence_seconds": 120,   # AP-02：相邻 ts 间隔上限（秒）
    "retry_threshold": 3,     # AP-03：同一 action 失败重复次数上限
    "token_budget": 30000,    # AP-06：单事件 context_tokens 上限
    "storm_threshold": 3,     # AP-07：同一 micro 原文重复次数上限
}


def _seq(event, line_no):
    """取事件序号：优先事件自带的整数 seq，缺失或非整数时退化为 1 起算的行号。"""
    value = event.get("seq")
    if isinstance(value, bool):
        return line_no
    if isinstance(value, int):
        return value
    return line_no


def _is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def _make_hit(code, seq_list, evidence, threshold):
    return {
        "code": code,
        "seq": list(seq_list),
        "evidence": evidence,
        "threshold": threshold,
    }


def parse_events(text):
    """解析 JSONL 文本；返回 (events, error)。空行跳过，空文件返回空列表。"""
    events = []
    for line_no, raw in enumerate(text.splitlines(), start=1):
        stripped = raw.strip()
        if not stripped:
            continue
        try:
            obj = json.loads(stripped)
        except ValueError as exc:
            return None, "第 %d 行不是合法 JSON: %s" % (line_no, exc)
        if not isinstance(obj, dict):
            return None, "第 %d 行不是 JSON 对象（事件必须是对象）" % line_no
        events.append(obj)
    return events, None


def read_events_path(path):
    """读取事件流文件；返回 (events, error)。"""
    if not os.path.exists(path):
        return None, "事件流文件不存在: %s" % path
    if os.path.isdir(path):
        return None, "事件流路径是目录而非 JSONL 文件: %s" % path
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            text = handle.read()
    except OSError as exc:
        return None, "事件流文件不可读: %s" % exc
    return parse_events(text)


def detect_loop(events, thresholds):
    """AP-01：连续相同 action 且 state 不变的运行段，长度达到阈值即命中。"""
    hits = []
    total = len(events)
    index = 0
    limit = thresholds["loop_threshold"]
    while index < total:
        key = (events[index].get("action"), events[index].get("state"))
        end = index + 1
        while end < total and (events[end].get("action"), events[end].get("state")) == key:
            end += 1
        run = list(range(index, end))
        if len(run) >= limit:
            seqs = [_seq(events[i], i + 1) for i in run]
            hits.append(_make_hit(
                "AP-01", seqs,
                "连续 %d 步 action=%s 且 state=%s 完全未变（第 %s ~ %s 步），无任何状态推进"
                % (len(run), json.dumps(key[0], ensure_ascii=False),
                   json.dumps(key[1], ensure_ascii=False), seqs[0], seqs[-1]),
                "连续相同 action 且 state 不变 >= %d 次" % limit,
            ))
        index = end
    return hits


def detect_retry(events, thresholds):
    """AP-03：同一 action、显式 ok=false、state 未变的连续重试段，超过阈值即命中。"""
    hits = []
    total = len(events)
    index = 0
    limit = thresholds["retry_threshold"]
    while index < total:
        key = (events[index].get("action"), events[index].get("state"))
        if events[index].get("ok") is not False:
            index += 1
            continue
        end = index
        while (end < total and events[end].get("ok") is False
               and (events[end].get("action"), events[end].get("state")) == key):
            end += 1
        run = list(range(index, end))
        if len(run) > limit:
            seqs = [_seq(events[i], i + 1) for i in run]
            hits.append(_make_hit(
                "AP-03", seqs,
                "同一 action=%s 失败重试 %d 次且 state 始终为 %s（第 %s ~ %s 步），重试未带来任何状态变化"
                % (json.dumps(key[0], ensure_ascii=False), len(run),
                   json.dumps(key[1], ensure_ascii=False), seqs[0], seqs[-1]),
                "同一 action 且 ok=false 重复 > %d 次且 state 未变" % limit,
            ))
        index = end
    return hits


def detect_silence(events, thresholds):
    """AP-02：连续 silent=true 超步数上限，或相邻 ts 间隔超秒数上限。"""
    hits = []
    total = len(events)
    step_limit = thresholds["silent_threshold"]
    second_limit = thresholds["silence_seconds"]

    index = 0
    while index < total:
        if events[index].get("silent") is not True:
            index += 1
            continue
        end = index
        while end < total and events[end].get("silent") is True:
            end += 1
        run = list(range(index, end))
        if len(run) > step_limit:
            seqs = [_seq(events[i], i + 1) for i in run]
            hits.append(_make_hit(
                "AP-02", seqs,
                "连续 %d 步 silent=true（第 %s ~ %s 步），对外无任何输出"
                % (len(run), seqs[0], seqs[-1]),
                "连续 silent=true 步数 > %d" % step_limit,
            ))
        index = end

    for i in range(total - 1):
        before, after = events[i].get("ts"), events[i + 1].get("ts")
        if not (_is_int(before) and _is_int(after)):
            continue
        gap = after - before
        if gap > second_limit:
            seqs = [_seq(events[i], i + 1), _seq(events[i + 1], i + 2)]
            hits.append(_make_hit(
                "AP-02", seqs,
                "相邻事件时间戳间隔 %d 秒（第 %s 步 ts=%d → 第 %s 步 ts=%d），超过静默上限"
                % (gap, seqs[0], before, seqs[1], after),
                "相邻 ts 间隔 > %d 秒" % second_limit,
            ))
    return hits


def detect_fake_done(events, thresholds):
    """AP-04：声明完成但门禁探针退出码非 0（probe_exit 缺失视为非 0）。"""
    hits = []
    for index, event in enumerate(events):
        if event.get("claim_done") is not True:
            continue
        probe_exit = event.get("probe_exit")
        if _is_int(probe_exit) and probe_exit == 0:
            continue
        seq = _seq(event, index + 1)
        shown = "缺失" if probe_exit is None else json.dumps(probe_exit, ensure_ascii=False)
        hits.append(_make_hit(
            "AP-04", [seq],
            "第 %s 步声明完成 claim_done=true，但门禁探针退出码为 %s（非 0），完成为假"
            % (seq, shown),
            "claim_done=true 且 probe_exit != 0，任一命中即违规",
        ))
    return hits


def detect_silent_degrade(events, thresholds):
    """AP-05：捕获错误但未记录仍继续执行（logged 缺失视为未记录）。"""
    hits = []
    total = len(events)
    for index, event in enumerate(events):
        if event.get("caught_error") is not True:
            continue
        if event.get("logged") is True:
            continue
        seq = _seq(event, index + 1)
        following = total - index - 1
        hits.append(_make_hit(
            "AP-05", [seq],
            "第 %s 步 caught_error=true 但 logged=false（错误未记录），其后仍有 %d 步继续执行，"
            "错误被静默吞掉" % (seq, following),
            "caught_error=true 且 logged=false，任一命中即违规",
        ))
    return hits


def detect_budget(events, thresholds):
    """AP-06：单事件 context_tokens 超过预算。"""
    hits = []
    limit = thresholds["token_budget"]
    for index, event in enumerate(events):
        tokens = event.get("context_tokens")
        if not _is_int(tokens):
            continue
        if tokens > limit:
            seq = _seq(event, index + 1)
            hits.append(_make_hit(
                "AP-06", [seq],
                "第 %s 步单次上下文加载 %d token，超出预算 %d（超 %d）"
                % (seq, tokens, limit, tokens - limit),
                "单事件 context_tokens > %d" % limit,
            ))
    return hits


def detect_storm(events, thresholds):
    """AP-07：同一 tier=micro 的 text 原文重复出现超过上限。"""
    hits = []
    limit = thresholds["storm_threshold"]
    groups = {}
    for index, event in enumerate(events):
        if event.get("tier") != "micro":
            continue
        text = event.get("text")
        if not isinstance(text, str) or not text:
            continue
        groups.setdefault(text, []).append(_seq(event, index + 1))
    for text, seqs in groups.items():
        if len(seqs) > limit:
            hits.append(_make_hit(
                "AP-07", seqs,
                "同一 tier=micro 原文 %s 重复播报 %d 次（第 %s 步），微操作刷屏"
                % (json.dumps(text, ensure_ascii=False), len(seqs),
                   "、".join(str(s) for s in seqs)),
                "同一 micro 原文重复出现 > %d 次" % limit,
            ))
    return hits


DETECTORS = {
    "AP-01": detect_loop,
    "AP-02": detect_silence,
    "AP-03": detect_retry,
    "AP-04": detect_fake_done,
    "AP-05": detect_silent_degrade,
    "AP-06": detect_budget,
    "AP-07": detect_storm,
}


def valid_thresholds(thresholds):
    """阈值必须是 >= 0 的整数，否则视为参数非法。"""
    for name, value in thresholds.items():
        if not _is_int(value) or value < 0:
            return "阈值 --%s 必须是非负整数，收到 %s" % (name.replace("_", "-"), value)
    if thresholds["loop_threshold"] < 1:
        return "阈值 --loop-threshold 必须 >= 1"
    return None


def detect_events(events, thresholds):
    """对事件流执行七条反例检测；返回按优先级排序的命中列表。"""
    hits = []
    for code in PRIORITY:
        hits.extend(DETECTORS[code](events, thresholds))
    hits.sort(key=lambda hit: (PRIORITY.index(hit["code"]), hit["seq"][0] if hit["seq"] else 0))
    return hits


def build_report(payload):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def fail_input(message):
    build_report({"success": False, "checked_events": 0, "hits": [],
                  "summary": {code: 0 for code in ALL_CODES}, "error": message})
    return 2


def main():
    parser = argparse.ArgumentParser(description="Detect forbidden anti-pattern events")
    parser.add_argument("--events", help="事件流 JSONL 文件路径")
    parser.add_argument("--stdin", action="store_true", help="从 stdin 读取事件流")
    parser.add_argument("--loop-threshold", type=int, default=DEFAULT_THRESHOLDS["loop_threshold"])
    parser.add_argument("--silent-threshold", type=int, default=DEFAULT_THRESHOLDS["silent_threshold"])
    parser.add_argument("--silence-seconds", type=int, default=DEFAULT_THRESHOLDS["silence_seconds"])
    parser.add_argument("--retry-threshold", type=int, default=DEFAULT_THRESHOLDS["retry_threshold"])
    parser.add_argument("--token-budget", type=int, default=DEFAULT_THRESHOLDS["token_budget"])
    parser.add_argument("--storm-threshold", type=int, default=DEFAULT_THRESHOLDS["storm_threshold"])
    parser.add_argument("--json", action="store_true", help="输出 JSON（本脚本恒输出 JSON）")
    args = parser.parse_args()

    if bool(args.events) == bool(args.stdin):
        return fail_input("必须且只能指定 --events <jsonl> 或 --stdin 之一")

    thresholds = {
        "loop_threshold": args.loop_threshold,
        "silent_threshold": args.silent_threshold,
        "silence_seconds": args.silence_seconds,
        "retry_threshold": args.retry_threshold,
        "token_budget": args.token_budget,
        "storm_threshold": args.storm_threshold,
    }
    invalid = valid_thresholds(thresholds)
    if invalid:
        return fail_input(invalid)

    if args.stdin:
        events, error = parse_events(sys.stdin.read())
    else:
        events, error = read_events_path(args.events)
    if error:
        return fail_input(error)

    hits = detect_events(events, thresholds)
    summary = {code: 0 for code in ALL_CODES}
    for hit in hits:
        summary[hit["code"]] += 1

    build_report({
        "success": not hits,
        "checked_events": len(events),
        "hits": hits,
        "summary": summary,
    })
    return 1 if hits else 0


if __name__ == "__main__":
    sys.exit(main())
