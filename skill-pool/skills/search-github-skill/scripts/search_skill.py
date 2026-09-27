#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
search_skill.py
GitHub 外部技能候选检索器（离线结构化，绝不联网）。

设计边界（诚实声明）：
  本脚本不做任何网络访问，不 import urllib / requests / socket。
  真实检索由智能体侧工具（find_dsh_plugin / web 检索 / gh CLI）完成，
  本脚本只负责把候选清单标准化、按关键词过滤并截断。

候选来源优先级：
  1. --from-json <file>                      显式指定的候选 JSON 文件
  2. docs/operations/skill-import-cache.json 仓库内共享缓存（若存在）
  3. 空                                      无来源则返回空清单 + note 指引

Exit Code:
  0 - 正常输出（即使 candidates 为空）
  1 - --from-json 指定的文件不存在或不是合法 JSON
"""

import os
import sys
import json
import argparse

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
CACHE_PATH = os.path.join(REPO_ROOT, "docs", "operations", "skill-import-cache.json")

FALLBACK_NOTE = (
    "本地无可用候选来源：请由智能体侧检索工具（find_dsh_plugin / web 检索）"
    "获取候选后，经 --from-json 传入本脚本完成结构化与过滤。"
)

def _as_text(value):
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()

def _as_bool(value):
    if isinstance(value, bool):
        return value
    text = _as_text(value).lower()
    return text in ("1", "true", "yes", "y", "on")

def _as_int(value):
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    text = _as_text(value)
    if not text:
        return 0
    try:
        return int(float(text))
    except ValueError:
        return 0

def normalize_candidate(item):
    """把任意来源的候选条目归一为标准结构，字段缺失时给安全默认值。"""
    name = _as_text(item.get("name")) or _as_text(item.get("id")) or _as_text(item.get("full_name"))
    url = _as_text(item.get("url")) or _as_text(item.get("html_url")) or _as_text(item.get("repository"))
    license_name = _as_text(item.get("license")) or _as_text(item.get("license_spdx")) or "UNKNOWN"
    description = _as_text(item.get("description")) or _as_text(item.get("summary"))
    return {
        "name": name,
        "url": url,
        "license": license_name,
        "has_scripts": _as_bool(item.get("has_scripts", False)),
        "stars": _as_int(item.get("stars", item.get("stargazers_count", 0))),
        "description": description,
    }

def extract_candidates(payload):
    """兼容 {"candidates":[...]} 与裸数组两种输入。"""
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

    candidates = []
    for item in raw:
        if isinstance(item, dict):
            candidates.append(normalize_candidate(item))
    return candidates

def load_candidates(from_json):
    """按优先级装载候选，返回 (candidates, source, fatal_error)。"""
    if from_json:
        path = os.path.abspath(from_json)
        if not os.path.isfile(path):
            return [], "from-json", "候选 JSON 文件不存在: %s" % from_json
        try:
            with open(path, "r", encoding="utf-8") as fh:
                payload = json.load(fh)
        except (ValueError, OSError) as exc:
            return [], "from-json", "候选 JSON 文件不可解析: %s (%s)" % (from_json, exc)
        try:
            return extract_candidates(payload), "from-json", None
        except ValueError as exc:
            return [], "from-json", "候选 JSON 结构非法: %s (%s)" % (from_json, exc)

    if os.path.isfile(CACHE_PATH):
        try:
            with open(CACHE_PATH, "r", encoding="utf-8") as fh:
                payload = json.load(fh)
            return extract_candidates(payload), "cache", None
        except (ValueError, OSError):
            return [], "none", None

    return [], "none", None

def filter_candidates(candidates, query, limit):
    """name + description 不区分大小写子串匹配；query 为空返回全部。"""
    keyword = (query or "").strip().lower()
    if keyword:
        matched = []
        for item in candidates:
            haystack = ("%s %s" % (item.get("name", ""), item.get("description", ""))).lower()
            if keyword in haystack:
                matched.append(item)
    else:
        matched = list(candidates)

    if limit is not None and limit >= 0:
        matched = matched[:limit]
    return matched

def main():
    parser = argparse.ArgumentParser(
        description="GitHub 技能候选检索器（离线结构化，不联网）"
    )
    parser.add_argument("--query", default="", help="能力关键词；留空返回全部候选")
    parser.add_argument("--limit", type=int, default=8, help="返回候选上限，默认 8")
    parser.add_argument("--from-json", dest="from_json", default=None,
                        help="候选 JSON 文件路径（对象含 candidates 或裸数组）")
    parser.add_argument("--json", action="store_true",
                        help="以 JSON 输出（本脚本默认即 JSON，保留该开关兼容脚本化调用）")
    args = parser.parse_args()

    candidates, source, fatal = load_candidates(args.from_json)
    if fatal:
        report = {
            "success": False,
            "query": args.query,
            "source": source,
            "candidates": [],
            "note": fatal,
        }
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1

    result = filter_candidates(candidates, args.query, args.limit)
    report = {
        "success": True,
        "query": args.query,
        "source": source,
        "candidates": result,
    }
    if source == "none":
        report["note"] = FALLBACK_NOTE
    if source != "none" and not result:
        report["note"] = "来源中共 %d 条候选，按关键词 %r 过滤后为空。" % (len(candidates), args.query)

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0

if __name__ == "__main__":
    sys.exit(main())
