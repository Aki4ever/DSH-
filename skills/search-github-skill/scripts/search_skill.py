#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
search_skill.py
GitHub 外部技能候选检索器（四类来源统一归一）。

设计边界（PKG-008 / REQ-SEARCH-MULTISOURCE-038 修订，诚实声明）：
  历史版本**绝不联网**，真实检索被外包给模型侧工具 —— 那意味着管线第一步「检索」
  没有物理探针，既不可复现也不可断言。
  本版本补齐探针，同时保留向后兼容：

候选来源优先级：
  1. --from-json <file>                      显式指定的候选 JSON 文件（离线，最高优先）
  2. --online                                真实调用 GitHub Search API（联网）
  3. docs/operations/skill-import-cache.json 仓库内共享缓存（离线）
  4. 空                                      无来源则返回空清单 + note 指引

联网口径（--online）：
  * 只调用 https://api.github.com/search/repositories，只用 Python 3 标准库 urllib；
  * 不携带任何 Token、不读取任何凭据、不写入任何文件；
  * 命中数、排序、分页全部由入参决定，同输入恒得同一查询串（可复算）；
  * 网络失败不静默：输出 success=false 与 error，并退 1（禁止假装「没找到」）。

Exit Code:
  0 - 正常输出
  1 - --from-json 文件不可读/非法，或 --online 且网络检索失败
"""

import os
import sys
import json
import argparse
import urllib.parse
import urllib.request
import urllib.error

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
CACHE_PATH = os.path.join(REPO_ROOT, "docs", "operations", "skill-import-cache.json")

FALLBACK_NOTE = (
    "本地无可用候选来源：请由智能体侧检索工具（find_dsh_plugin / web 检索）"
    "获取候选后，经 --from-json 传入本脚本完成结构化与过滤。"
)

GITHUB_SEARCH_API = "https://api.github.com/search/repositories"
HTTP_TIMEOUT_S = 20
USER_AGENT = "dsh-skill-pool-search/1.0 (+local)"


def github_search(query, per_page, sort="stars"):
    """真实调用 GitHub Search API，返回 (items, error)。

    只用标准库、只读、不带凭据。失败不静默：把错误原样返回给调用方决定退出码。
    """
    params = {
        "q": query,
        "sort": sort,
        "order": "desc",
        "per_page": str(max(1, min(per_page, 50))),
    }
    url = GITHUB_SEARCH_API + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": USER_AGENT,
    })
    try:
        with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_S) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        # 未认证的 Search API 限流很紧（实测 10 次/分钟，超出即 403）。
        # 必须把「限流」与「真没找到」区分开，否则调用方会把失败当成空结果。
        if exc.code in (403, 429):
            remaining = exc.headers.get("X-RateLimit-Remaining") if exc.headers else None
            reset = exc.headers.get("X-RateLimit-Reset") if exc.headers else None
            return [], "HTTP %s: %s（疑似限流；remaining=%s reset=%s）" % (
                exc.code, exc.reason, remaining, reset)
        return [], "HTTP %s: %s" % (exc.code, exc.reason)
    except urllib.error.URLError as exc:
        return [], "网络不可达: %s" % exc.reason
    except (ValueError, OSError) as exc:
        return [], "响应不可解析: %s" % exc
    items = payload.get("items")
    if not isinstance(items, list):
        return [], "响应缺少 items 数组"
    return items, None


SCRIPT_SUFFIXES = (".py", ".sh", ".js", ".mjs", ".cjs", ".ts", ".bash", ".zsh")
CONTENTS_API = "https://api.github.com/repos/%s/contents"


def probe_has_scripts(full_name):
    """真实探测仓库根目录是否存在可执行脚本面，返回 (True/False/None, error)。"""
    if not full_name:
        return None, "缺少 full_name"
    request = urllib.request.Request(CONTENTS_API % full_name, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": USER_AGENT,
    })
    try:
        with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_S) as response:
            entries = json.loads(response.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, ValueError, OSError) as exc:
        return None, str(exc)
    if not isinstance(entries, list):
        return None, "contents 不是数组"
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        entry_name = str(entry.get("name") or "")
        entry_type = str(entry.get("type") or "")
        if entry_type == "dir" and entry_name in ("scripts", "bin", "tools"):
            return True, None
        if entry_name.lower().endswith(SCRIPT_SUFFIXES):
            return True, None
    return False, None


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
    raw_license = item.get("license")
    if isinstance(raw_license, dict):
        # GitHub Search API 返回的是 license 对象，直接 str() 会写进一坨 dict repr
        license_name = _as_text(raw_license.get("spdx_id")) or _as_text(raw_license.get("key")) or "UNKNOWN"
        if license_name in ("NOASSERTION", "none"):
            license_name = "UNKNOWN"
    else:
        license_name = _as_text(raw_license) or _as_text(item.get("license_spdx")) or "UNKNOWN"
    description = _as_text(item.get("description")) or _as_text(item.get("summary"))
    lowered = (name + " " + description).lower()
    source = _as_text(item.get("source"))
    if not source:
        # 精选清单与真实工具在下一步审计里的待遇完全不同，因此必须在此分开标注
        if name.startswith("awesome-") or "curated list" in lowered or "awesome list" in lowered:
            source = "awesome-list"
        else:
            source = "github"
    # has_scripts 是三态：True / False / None(未探测)。
    # 未探测时写 False 是**假阴性**——审计步会据此认为对方没有可执行面。
    if "has_scripts" in item:
        has_scripts = _as_bool(item.get("has_scripts"))
    else:
        has_scripts = None
    return {
        "name": name,
        "full_name": _as_text(item.get("full_name")) or name,
        "url": url,
        "source": source,
        "license": license_name,
        "has_scripts": has_scripts,
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
    parser.add_argument("--online", action="store_true",
                        help="真实调用 GitHub Search API（联网）；缺省为离线模式")
    parser.add_argument("--per-page", dest="per_page", type=int, default=20,
                        help="联网模式下向 GitHub 请求的条数，1~50，默认 20")
    parser.add_argument("--sort", default="stars", choices=("stars", "updated", "best-match"),
                        help="联网模式排序字段，默认 stars")
    parser.add_argument("--probe-scripts", dest="probe_scripts", action="store_true",
                        help="联网模式下逐条探测仓库根目录是否含可执行脚本（额外的 /contents 调用）")
    parser.add_argument("--json", action="store_true",
                        help="以 JSON 输出（本脚本默认即 JSON，保留该开关兼容脚本化调用）")
    args = parser.parse_args()

    if args.online:
        query = (args.query or "").strip()
        if not query:
            print(json.dumps({
                "success": False, "query": "", "source": "github-online",
                "candidates": [],
                "note": "--online 必须同时给出 --query：空查询会把整个 GitHub 拖回来，不是检索。",
            }, ensure_ascii=False, indent=2))
            return 1
        sort = "best-match" if args.sort == "best-match" else args.sort
        items, error = github_search(query, args.per_page, sort)
        if error is not None:
            print(json.dumps({
                "success": False, "query": query, "source": "github-online",
                "candidates": [], "error": error,
                "rate_limited": "限流" in error,
                "note": "网络检索失败，未产出任何候选。禁止把失败当作「没找到」继续；"
                        "遇限流必须退避重试（未认证 Search API 实测 10 次/分钟）。",
            }, ensure_ascii=False, indent=2))
            return 1
        online = [normalize_candidate(item) for item in items]
        online = [item for item in online if item.get("name")]
        # 联网模式下**不再按原始 query 二次过滤**：检索已经由 GitHub 完成，
        # 而 query 里通常带 in:name,description 这类限定符，拿它去匹配 name/description
        # 必然全部落空——那会把「检索成功但结果为空」伪装成「没人在做这件事」。
        filtered = online if args.limit <= 0 else online[:args.limit]
        probed, probe_errors = 0, []
        if args.probe_scripts:
            for candidate in filtered:
                value, probe_error = probe_has_scripts(candidate.get("full_name"))
                candidate["has_scripts"] = value
                if probe_error:
                    probe_errors.append({"name": candidate.get("name"), "error": probe_error})
                else:
                    probed += 1
        report = {
            "success": True,
            "query": query,
            "source": "github-online",
            "fetched": len(online),
            "scripts_probed": probed,
            "probe_errors": probe_errors,
            "candidates": filtered,
        }
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

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
