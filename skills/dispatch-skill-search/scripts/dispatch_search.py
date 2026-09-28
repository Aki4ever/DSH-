#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dispatch_search.py
四源调度器：按「本地优先」硬规则依次派发检索，命中即短路，未命中才外呼。

口径唯一来源：skills/multi-source-search-policy/SKILL.md

四类源与顺序：
  1 local          本地技能池 catalog + 已安装 DSH 插件   ← 命中即短路，不再外呼
  2 github         skills/search-github-skill（--online）
  3 official-site  skills/search-official-source（需 --domain）
  4 awesome-list   由 github 源内的清单型结果识别（source 字段标注）

**本地优先是硬规则**：已有能力先复用。已知本机已装 `archify-dsh` 这类现成可视化插件，
重造一份只会产生第二份真相（两份实现必然漂移）。

Exit Code:
  0 - 产出非空候选（本地命中或外呼成功）
  1 - 零候选（本地未命中且未允许外呼，或外呼失败）
  2 - 输入不可读（缺 --query、catalog 不可读）
"""

import sys

sys.dont_write_bytecode = True

import os
import json
import argparse
import importlib.util
import subprocess

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_INPUT = 2

HERE = os.path.dirname(os.path.abspath(__file__))
POOL_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
CATALOG_PATH = os.path.join(POOL_ROOT, "docs", "operations", "skill-catalog.json")
GITHUB_SEARCH = os.path.join(POOL_ROOT, "skills", "search-github-skill", "scripts", "search_skill.py")

# 中英同义桥：用户说「信息图」，GitHub 上的仓库叫 infographic / chart / diagram。
# 没有这座桥，中文查询在英文生态里的召回率接近 0。
QUERY_BRIDGE = {
    "信息图": ["infographic", "infographics", "diagram", "chart", "visualization"],
    "图表": ["chart", "diagram", "graph", "plot", "infographic"],
    "架构图": ["architecture", "diagram", "archify"],
    "可视化": ["visualization", "visualize", "visual"],
    "看图": ["viewer", "image-viewer"],
    "插件": ["plugin", "extension"],
    "技能": ["skill", "agent"],
    "下载": ["download", "export"],
    "缩放": ["zoom", "scale"],
}


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def query_tokens(query):
    tokens = {query.strip().lower()}
    for key, values in QUERY_BRIDGE.items():
        if key in query:
            tokens.update(values)
    return {token for token in tokens if token}


def default_plugin_root():
    home = os.environ.get("DSH_HOME")
    if home:
        return os.path.join(home, "profiles", ".generations", "live")
    return os.path.join(os.path.expanduser("~"), "Library", "Application Support",
                        "dsh-desktop", "harness", "profiles", ".generations", "live")


def scan_local_skills(tokens, limit):
    if not os.path.isfile(CATALOG_PATH):
        return None, "catalog 不可读: %s" % CATALOG_PATH
    try:
        with open(CATALOG_PATH, "r", encoding="utf-8") as handle:
            catalog = json.load(handle)
    except (OSError, ValueError) as exc:
        return None, "catalog 不可解析: %s" % exc
    hits = []
    for skill in catalog.get("skills", []):
        haystack = " ".join(str(skill.get(field) or "") for field in
                            ("id", "description", "category_title")).lower()
        if any(token in haystack for token in tokens):
            hits.append({
                "name": skill.get("id"),
                "full_name": skill.get("id"),
                "url": "skill://%s" % skill.get("id"),
                "source": "local",
                "license": "LOCAL",
                "has_scripts": None,
                "stars": 0,
                "description": (skill.get("description") or "")[:160],
                "level": skill.get("level"),
            })
    hits.sort(key=lambda item: item["name"])
    return hits[:limit], None


def scan_local_plugins(plugin_root, tokens, limit):
    if not os.path.isdir(plugin_root):
        return [], None
    hits = []
    for name in sorted(os.listdir(plugin_root)):
        gen_dir = os.path.join(plugin_root, name)
        manifest = os.path.join(gen_dir, "generation.json")
        if not os.path.isfile(manifest):
            continue
        try:
            with open(manifest, "r", encoding="utf-8") as handle:
                meta = json.load(handle)
        except (OSError, ValueError):
            continue
        plugin = str(meta.get("pluginName") or name)
        version = str(meta.get("version") or "")
        description = ""
        pkg = os.path.join(gen_dir, "node_modules", plugin, "package.json")
        if os.path.isfile(pkg):
            try:
                with open(pkg, "r", encoding="utf-8") as handle:
                    description = str(json.load(handle).get("description") or "")
            except (OSError, ValueError):
                description = ""
        haystack = ("%s %s" % (plugin, description)).lower()
        if any(token in haystack for token in tokens):
            hits.append({
                "name": plugin,
                "full_name": plugin,
                "url": "plugin://%s@%s" % (plugin, version),
                "source": "local",
                "license": "LOCAL",
                "has_scripts": None,
                "stars": 0,
                "description": description[:160],
                "layer": "plugin",
            })
    hits.sort(key=lambda item: item["name"])
    return hits[:limit], None


def call_github(query, limit):
    if not os.path.isfile(GITHUB_SEARCH):
        return None, "GitHub 适配器缺失: %s" % GITHUB_SEARCH
    completed = subprocess.run(
        [sys.executable, GITHUB_SEARCH, "--online", "--query", query,
         "--per-page", str(max(limit, 10)), "--limit", str(limit)],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    try:
        payload = json.loads(completed.stdout.decode("utf-8", "replace"))
    except ValueError:
        return None, "GitHub 适配器输出不可解析"
    if not payload.get("success"):
        return None, payload.get("error") or "GitHub 检索失败"
    return payload.get("candidates") or [], None


def main(argv):
    parser = argparse.ArgumentParser(
        prog="dispatch_search.py",
        description="四源调度器：本地优先，命中即短路；未命中才允许外呼",
    )
    parser.add_argument("--query", required=True, help="能力关键词（支持中文，内置中英同义桥）")
    parser.add_argument("--limit", type=int, default=8, help="候选上限，默认 8")
    parser.add_argument("--plugin-root", dest="plugin_root", default=None,
                        help="已安装插件根目录，缺省用 $DSH_HOME/profiles/.generations/live")
    parser.add_argument("--allow-network", dest="allow_network", action="store_true",
                        help="本地未命中时允许外呼 GitHub（未认证 Search API 实测 10 次/分钟）")
    parser.add_argument("--json", action="store_true", help="兼容开关；脚本恒输出 JSON")
    args = parser.parse_args(argv)

    query = (args.query or "").strip()
    if not query:
        emit({"success": False, "error": "empty_query", "detail": "--query 不可为空"})
        return EXIT_INPUT
    tokens = query_tokens(query)
    plugin_root = args.plugin_root or default_plugin_root()

    skill_hits, skill_error = scan_local_skills(tokens, args.limit)
    if skill_hits is None:
        emit({"success": False, "error": "input_unreadable", "detail": skill_error})
        return EXIT_INPUT
    plugin_hits, _ = scan_local_plugins(plugin_root, tokens, args.limit)
    local = skill_hits + plugin_hits
    local.sort(key=lambda item: (item["source"], item["name"]))

    if local:
        emit({
            "success": True,
            "query": query,
            "tokens": sorted(tokens),
            "short_circuit": "local",
            "network_used": False,
            "skipped_sources": ["github", "official-site", "awesome-list"],
            "local_hits": len(local),
            "plugin_root": plugin_root,
            "candidates": local,
            "note": "本地已命中，按本地优先硬规则短路，未向任何外部源发起检索。",
        })
        return EXIT_OK

    if not args.allow_network:
        emit({
            "success": False,
            "query": query,
            "tokens": sorted(tokens),
            "short_circuit": None,
            "network_used": False,
            "network_skipped": True,
            "skipped_sources": ["github", "official-site", "awesome-list"],
            "local_hits": 0,
            "plugin_root": plugin_root,
            "candidates": [],
            "note": "本地零命中，且未允许外呼（--allow-network）。"
                    "这是「未完成检索」，不是「没人在做这件事」。",
        })
        return EXIT_FAIL

    external, error = call_github(query, args.limit)
    if external is None:
        emit({
            "success": False,
            "query": query,
            "tokens": sorted(tokens),
            "short_circuit": None,
            "network_used": True,
            "local_hits": 0,
            "candidates": [],
            "error": error,
            "note": "外呼失败，未产出候选。禁止把失败当作「没找到」继续。",
        })
        return EXIT_FAIL

    emit({
        "success": bool(external),
        "query": query,
        "tokens": sorted(tokens),
        "short_circuit": None,
        "network_used": True,
        "local_hits": 0,
        "plugin_root": plugin_root,
        "candidates": external,
        "note": "" if external else "外呼成功但零候选。",
    })
    return EXIT_OK if external else EXIT_FAIL


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
