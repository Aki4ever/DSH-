#!/usr/bin/env python3
"""
search_skills.py
Google 式技能检索总控：进程内组装 查询解析 → BM25 排序 → 片段生成 → 质量日志。

只回灌片段，不回灌全文（snippet-only-recall）。

Exit Code:
  0 - 检索完成；或 --eval 命中率达标
  1 - 索引缺失/陈旧、参数非法，或 --eval 命中率不达标
"""

import os
import sys

# 关闭字节码落盘：本脚本会用 importlib 加载同仓其它技能模块，
# 避免在他人技能目录里生成 __pycache__。
sys.dont_write_bytecode = True
import json
import argparse
import importlib.util


# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../skill-pool"))
REPO_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
_SKILLS_CANDIDATE = os.path.join(os.path.dirname(REPO_ROOT), "skills")
SKILLS_ROOT = _SKILLS_CANDIDATE if os.path.isdir(_SKILLS_CANDIDATE) else os.path.join(REPO_ROOT, "skills")
INDEX_JSON = os.path.join(REPO_ROOT, "docs/operations/skill-index.json")
BUILD_SCRIPT = os.path.join(SKILLS_ROOT, "build-inverted-index/scripts/build_index.py")
RANK_SCRIPT = os.path.join(SKILLS_ROOT, "rank-skills-bm25/scripts/rank_skills.py")
SNIPPET_SCRIPT = os.path.join(SKILLS_ROOT, "emit-search-snippet/scripts/emit_snippet.py")
LOG_SCRIPT = os.path.join(SKILLS_ROOT, "log-query-events/scripts/log_query.py")
DEFAULT_FIXTURE = os.path.join(REPO_ROOT, "docs/requirements/execution/fixtures/retrieval-queries.json")

MAX_PAYLOAD_BYTES = 1536
FORBIDDEN_FIELDS = ("content", "body", "text")
MAX_PAYLOAD_BYTES = 3072
TERMS_CAP = 24
MATCHED_CAP = 6
COMPACT = {"ensure_ascii": False, "separators": (",", ":")}


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def search(query, top_k=5, offset=0, want_log=False, index_path=INDEX_JSON):
    ranker = _load(RANK_SCRIPT, "bi_rank")
    snippet = _load(SNIPPET_SCRIPT, "bi_snippet")

    if not os.path.exists(index_path):
        return None, f"index not found: {index_path} (run build-inverted-index first)"

    index, err = ranker.load_index(index_path)
    if index is None:
        return None, err
    if not index.get("docs"):
        return None, "index has no documents; rebuild it"

    ranked = ranker.rank(index, query, top_k=top_k, offset=offset)

    results = []
    for r in ranked["results"]:
        snip, matched = snippet.make_snippet(index, r["id"], r["matched_terms"])
        results.append({
            "id": r["id"],
            "level": r["level"],
            "category_title": r["category_title"],
            "score": r["score"],
            "snippet": snip,
            "matched_terms": r["matched_terms"][:MATCHED_CAP],
        })

    payload = {
        "success": True,
        "query": query,
        "terms": ranked["terms"][:TERMS_CAP],
        "terms_total": len(ranked["terms"]),
        "corrections": ranked["corrections"],
        "total_hits": ranked["total_hits"],
        "top_k": top_k,
        "offset": offset,
        "returned": len(results),
        "results": results,
    }
    if not results:
        payload["hint"] = "零命中：请补充技能触发词后重建索引，或改用更宽泛的查询词"

    if want_log:
        logger = _load(LOG_SCRIPT, "bi_log")
        try:
            logger.append_event(os.path.join(REPO_ROOT, "docs/operations/skill-query-log.jsonl"), {
                "ts": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
                "query": query,
                "results": [r["id"] for r in results],
                "chosen": None,
                "top_k": top_k,
            })
            payload["logged"] = True
        except OSError:
            payload["logged"] = False

    return payload, None


def self_check(payload):
    """snippet-only-recall 自检：不得出现全文字段，片段长度受限。"""
    issues = []
    for r in payload.get("results", []):
        for bad in FORBIDDEN_FIELDS:
            if bad in r:
                issues.append(f"forbidden field '{bad}' in result {r.get('id')}")
        if len(r.get("snippet") or "") > 120:
            issues.append(f"snippet too long in result {r.get('id')}")
    body = json.dumps(payload, **COMPACT)
    if len(body.encode("utf-8")) > MAX_PAYLOAD_BYTES:
        issues.append(f"payload exceeds {MAX_PAYLOAD_BYTES} bytes")
    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="Google-style skill retrieval")
    parser.add_argument("--query", "-q", help="Query or task description")
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--index", default=INDEX_JSON)
    parser.add_argument("--log", action="store_true", help="Append a quality signal")
    parser.add_argument("--eval", nargs="?", const=DEFAULT_FIXTURE,
                        help="Evaluate top-K hit-rate against a fixture")
    parser.add_argument("--json", action="store_true", help="JSON output (default)")
    args = parser.parse_args()

    if args.eval:
        ranker = _load(RANK_SCRIPT, "bi_rank")
        index, err = ranker.load_index(args.index)
        if index is None:
            print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
            return 1
        result, err = ranker.evaluate(index, args.eval, args.top_k, 0.90)
        if result is None:
            print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
            return 1
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result["success"] else 1

    if not args.query:
        print(json.dumps({"success": False, "error": "missing --query"}, ensure_ascii=False, indent=2))
        return 1

    payload, err = search(args.query, args.top_k, args.offset, args.log, args.index)
    if payload is None:
        print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
        return 1

    issues = self_check(payload)
    payload["self_check"] = {"pass": not issues, "issues": issues}
    payload["payload_bytes"] = len(json.dumps(payload, **COMPACT).encode("utf-8"))
    print(json.dumps(payload, **COMPACT))
    return 0 if not issues else 1


if __name__ == "__main__":
    sys.exit(main())
