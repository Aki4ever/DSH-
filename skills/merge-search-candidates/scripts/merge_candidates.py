#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
merge_candidates.py
多源候选去重归一器：把 GitHub / 官网 / awesome 清单 / 本地四类源的候选合并成同一契约。

口径唯一来源：skills/multi-source-search-policy/SKILL.md

去重判据（两级，顺序固定）：
  ① URL 归一后相同 → 同一条（归一：小写 scheme+host、剥尾斜杠、剥 utm_* 查询参数）
  ② URL 不同但 name 归一后相同 → 同一条（归一：小写、下划线转连字符、剥首尾连字符）

排序：stars 降序 → name 升序 → url 升序（全序，同输入恒得同一顺序）

Exit Code:
  0 - 合并后候选非空
  1 - 输入都读到了但合并后为空（空检索不是通过）
  2 - 输入不可读（--from 文件缺失/非法、未给任何 --from）
"""

import sys

sys.dont_write_bytecode = True

import os
import re
import json
import argparse
import urllib.parse

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_INPUT = 2

REQUIRED_FIELDS = ("name", "url", "source", "license", "has_scripts", "stars")
SOURCE_CLOSED_SET = ("local", "github", "official-site", "awesome-list")


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def normalize_url(url):
    text = (url or "").strip()
    if not text:
        return ""
    parts = urllib.parse.urlsplit(text)
    query = urllib.parse.urlencode(
        [(k, v) for k, v in urllib.parse.parse_qsl(parts.query) if not k.startswith("utm_")])
    path = parts.path.rstrip("/") or "/"
    return urllib.parse.urlunsplit((
        (parts.scheme or "https").lower(), parts.netloc.lower(), path, query, ""))


def normalize_name(name):
    text = (name or "").strip().lower()
    text = text.replace("_", "-").replace(" ", "-")
    text = re.sub(r"-{2,}", "-", text)
    return text.strip("-")


def extract(payload):
    if isinstance(payload, dict):
        raw = payload.get("candidates")
        if raw is None:
            raw = payload.get("skills")
        if raw is None:
            raw = payload.get("items")
        if raw is None:
            raw = []
    elif isinstance(payload, list):
        raw = payload
    else:
        raise ValueError("候选负载必须是 JSON 对象或数组")
    if not isinstance(raw, list):
        raise ValueError("candidates 字段必须是数组")
    return [item for item in raw if isinstance(item, dict)]


def load_inputs(paths):
    candidates = []
    errors = []
    for path in paths:
        full = os.path.abspath(os.path.expanduser(path))
        if not os.path.isfile(full):
            errors.append({"path": path, "error": "文件不存在"})
            continue
        try:
            with open(full, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except (OSError, ValueError) as exc:
            errors.append({"path": path, "error": "不可解析: %s" % exc})
            continue
        try:
            candidates.extend(extract(payload))
        except ValueError as exc:
            errors.append({"path": path, "error": str(exc)})
    return candidates, errors


def missing_fields(candidate):
    return [field for field in REQUIRED_FIELDS if field not in candidate]


def main(argv):
    parser = argparse.ArgumentParser(
        prog="merge_candidates.py",
        description="多源候选去重归一（URL + 名称两级去重，全序排序）",
    )
    parser.add_argument("--from", dest="sources", action="append", default=None,
                        help="候选 JSON 文件，可重复")
    parser.add_argument("--json", action="store_true", help="兼容开关；脚本恒输出 JSON")
    args = parser.parse_args(argv)

    if not args.sources:
        emit({"success": False, "error": "no_input", "detail": "至少给一个 --from"})
        return EXIT_INPUT

    raw, errors = load_inputs(args.sources)
    if errors and not raw:
        emit({"success": False, "error": "input_unreadable", "errors": errors})
        return EXIT_INPUT

    by_url = {}
    by_name = {}
    duplicates = 0
    incomplete = []
    unknown_source = []
    for candidate in raw:
        gaps = missing_fields(candidate)
        if gaps:
            incomplete.append({"name": candidate.get("name"), "missing": gaps})
            continue
        source = str(candidate.get("source"))
        if source not in SOURCE_CLOSED_SET:
            unknown_source.append({"name": candidate.get("name"), "source": source})
        url_key = normalize_url(candidate.get("url"))
        name_key = normalize_name(candidate.get("name"))
        if url_key and url_key in by_url:
            duplicates += 1
            continue
        if name_key and name_key in by_name:
            duplicates += 1
            continue
        record = {
            "name": candidate.get("name"),
            "full_name": candidate.get("full_name") or candidate.get("name"),
            "url": candidate.get("url"),
            "source": source,
            "license": candidate.get("license"),
            "has_scripts": candidate.get("has_scripts"),
            "stars": int(candidate.get("stars") or 0),
            "description": candidate.get("description") or "",
        }
        if url_key:
            by_url[url_key] = record
        if name_key:
            by_name[name_key] = record

    merged = list(by_url.values()) if by_url else list(by_name.values())
    merged.sort(key=lambda item: (-item["stars"], item["name"], item["url"]))
    counts = {}
    for item in merged:
        counts[item["source"]] = counts.get(item["source"], 0) + 1

    payload = {
        "success": bool(merged),
        "sources_read": len(args.sources),
        "raw": len(raw),
        "duplicates_removed": duplicates,
        "skipped_incomplete": incomplete,
        "unknown_source": unknown_source,
        "source_counts": dict(sorted(counts.items())),
        "candidates": merged,
        "errors": errors,
    }
    if not merged:
        payload["note"] = "合并后为空——空检索不是通过，禁止继续下游审计。"
    emit(payload)
    return EXIT_OK if merged else EXIT_FAIL


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
