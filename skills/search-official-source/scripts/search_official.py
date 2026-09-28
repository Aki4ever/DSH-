#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
search_official.py
官网 / 官方文档源检索器：从官方站点的 sitemap 里按关键词检索可用执行层入口。

口径唯一来源：skills/multi-source-search-policy/SKILL.md（官方站点是四类源之一）

为什么用 sitemap 而不是搜索引擎：sitemap 是**站点自己声明的**页面全集，
来源可追溯、结果可复现、不依赖第三方排序；搜索引擎结果会随排序策略漂移，
同一个查询今天第 1 名明天第 7 名，无法写进可复算的判据。

联网口径：
  * 只用 Python 3 标准库 urllib；只读；不携带任何凭据；不写任何文件；
  * 支持 --from-file 读本地 sitemap 夹具，用于离线与回归测试（优先于联网）。

Exit Code:
  0 - 正常输出（candidates 可非空）
  1 - 全部域名都失败且零候选（失败绝不静默为「没找到」）
  2 - 输入不可读（缺 --domain/--from-file、query 为空、夹具不可解析）
"""

import sys

sys.dont_write_bytecode = True

import os
import re
import json
import argparse
import urllib.error
import urllib.request

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_INPUT = 2

HTTP_TIMEOUT_S = 20
USER_AGENT = "dsh-skill-pool-official-source/1.0 (+local)"
LOC_RE = re.compile(r"<loc>\s*([^<\s]+)\s*</loc>", re.IGNORECASE)
SITEMAP_CANDIDATES = ("/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml")
SCRIPT_SUFFIXES = (".py", ".sh", ".js", ".mjs", ".cjs", ".ts")


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def fetch(url):
    request = urllib.request.Request(url, headers={
        "Accept": "application/xml,text/xml,*/*",
        "User-Agent": USER_AGENT,
    })
    with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_S) as response:
        return response.read().decode("utf-8", "replace")


def parse_locs(text):
    return [item.strip() for item in LOC_RE.findall(text or "") if item.strip()]


def to_candidate(url, query):
    path = url.split("://", 1)[-1]
    tail = path.rstrip("/").split("/")[-1] or path
    lowered = tail.lower()
    for suffix in SCRIPT_SUFFIXES:
        if lowered.endswith(suffix):
            lowered = lowered[: -len(suffix)]
    name = lowered.replace("_", "-").replace(".", "-").strip("-") or tail
    return {
        "name": name,
        "full_name": name,
        "url": url,
        "source": "official-site",
        "license": "UNKNOWN",
        "has_scripts": None,
        "stars": 0,
        "description": "官方站点页面（查询词：%s）" % query,
    }


def main(argv):
    parser = argparse.ArgumentParser(
        prog="search_official.py",
        description="官网 / 官方文档源检索器（sitemap 驱动，来源可追溯）",
    )
    parser.add_argument("--query", required=True, help="能力关键词")
    parser.add_argument("--domain", action="append", default=None,
                        help="官方域名，可重复，如 docs.example.com")
    parser.add_argument("--from-file", dest="from_file", default=None,
                        help="读取本地 sitemap 夹具（离线模式，优先于联网）")
    parser.add_argument("--limit", type=int, default=10, help="候选上限，默认 10")
    parser.add_argument("--json", action="store_true", help="兼容开关；脚本恒输出 JSON")
    args = parser.parse_args(argv)

    query = (args.query or "").strip()
    if not query:
        emit({"success": False, "error": "empty_query", "detail": "--query 不可为空"})
        return EXIT_INPUT

    documents = []
    errors = []
    if args.from_file:
        path = os.path.abspath(os.path.expanduser(args.from_file))
        if not os.path.isfile(path):
            emit({"success": False, "error": "fixture_missing", "detail": path})
            return EXIT_INPUT
        try:
            with open(path, "r", encoding="utf-8") as handle:
                documents.append(("file://" + path, handle.read()))
        except (OSError, UnicodeDecodeError) as exc:
            emit({"success": False, "error": "fixture_unreadable", "detail": str(exc)})
            return EXIT_INPUT
    else:
        domains = [d.strip() for d in (args.domain or []) if d.strip()]
        if not domains:
            emit({"success": False, "error": "missing_source",
                  "detail": "联网模式必须给出 --domain（至少一个），否则无从检索"})
            return EXIT_INPUT
        for domain in domains:
            for suffix in SITEMAP_CANDIDATES:
                url = "https://%s%s" % (domain, suffix)
                try:
                    documents.append((url, fetch(url)))
                    break
                except (urllib.error.HTTPError, urllib.error.URLError, OSError) as exc:
                    errors.append({"domain": domain, "url": url, "error": str(exc)})

    keyword = query.lower()
    seen = set()
    candidates = []
    for origin, text in documents:
        for url in parse_locs(text):
            if keyword not in url.lower():
                continue
            if url in seen:
                continue
            seen.add(url)
            candidates.append(to_candidate(url, query))

    candidates.sort(key=lambda item: item["url"])
    if args.limit > 0:
        candidates = candidates[:args.limit]

    if not candidates and errors:
        emit({
            "success": False,
            "query": query,
            "source": "official-site",
            "candidates": [],
            "errors": errors,
            "note": "全部官方源都不可达且零候选——这是失败，不是「没找到」。",
        })
        return EXIT_FAIL

    emit({
        "success": True,
        "query": query,
        "source": "official-site",
        "documents": [origin for origin, _ in documents],
        "candidates": candidates,
        "errors": errors,
    })
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
