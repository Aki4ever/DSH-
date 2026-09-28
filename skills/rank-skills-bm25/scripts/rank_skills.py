#!/usr/bin/env python3
"""
rank_skills.py
对技能倒排索引执行 BM25 排序，支持 top-K / offset / 命中率评测。

Exit Code:
  0 - 排序完成，或 --eval 命中率达标
  1 - 索引或查询不可读，或 --eval 命中率低于阈值
"""

import os
import re
import sys

# 关闭字节码落盘：本脚本会用 importlib 加载同仓其它技能模块，
# 避免在他人技能目录里生成 __pycache__。
sys.dont_write_bytecode = True
import json
import math
import argparse
import importlib.util


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
INDEX_JSON = os.path.join(REPO_ROOT, "docs/operations/skill-index.json")
PARSE_SCRIPT = os.path.join(REPO_ROOT, "skills/parse-query/scripts/parse_query.py")
DEFAULT_FIXTURE = os.path.join(REPO_ROOT, "docs/requirements/execution/fixtures/retrieval-queries.json")

K1 = 1.2
B = 0.75
FIELD_NAMES = ["id", "triggers", "category_title", "description"]


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def load_index(path=INDEX_JSON):
    if not os.path.exists(path):
        return None, f"index not found: {path}"
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError) as exc:
        return None, f"index unreadable: {exc}"
    for key in ("postings", "df", "avg_doc_len", "docs"):
        if key not in data:
            return None, f"index missing required field: {key}"
    return data, None


def rank(index, query, top_k=5, offset=0):
    pq = _load(PARSE_SCRIPT, "pq_parse")
    parsed = pq.parse(query)
    terms = parsed["terms"]

    weights = index.get("field_weights") or {f: 1.0 for f in FIELD_NAMES}
    avg_len = index.get("avg_doc_len") or 1.0
    n_docs = index.get("doc_count") or len(index.get("docs") or [])
    postings = index["postings"]
    df = index["df"]

    # doc_idx -> {term: weighted_tf}, doc_idx -> matched terms
    weighted = {}
    matched = {}

    for term in terms:
        plist = postings.get(term)
        if not plist:
            continue
        dfi = df.get(term, len(plist))
        idf = math.log(1 + (n_docs - dfi + 0.5) / (dfi + 0.5))
        for doc_idx, field_idx, tf in plist:
            field = FIELD_NAMES[field_idx] if field_idx < len(FIELD_NAMES) else "description"
            w = weights.get(field, 1.0) * tf
            weighted.setdefault(doc_idx, {})
            weighted[doc_idx][term] = weighted[doc_idx].get(term, 0.0) + w
            matched.setdefault(doc_idx, set())
            matched[doc_idx].add((term, idf))

    scored = []
    for doc_idx, term_tf in weighted.items():
        doc = index["docs"][doc_idx]
        dl = doc.get("len") or 1.0
        score = 0.0
        terms_used = []
        for term, wtf in term_tf.items():
            idf = dict(matched[doc_idx]).get(term, 0.0)
            denom = wtf + K1 * (1 - B + B * dl / avg_len)
            if denom <= 0:
                continue
            score += idf * (wtf * (K1 + 1)) / denom
            terms_used.append(term)
        if score <= 0:
            continue
        scored.append({
            "id": doc.get("id"),
            "level": doc.get("level"),
            "category_title": doc.get("category_title", ""),
            "score": round(score, 4),
            "matched_terms": sorted(set(terms_used)),
        })

    scored.sort(key=lambda r: (-r["score"], r["id"]))
    total = len(scored)
    page = scored[offset: offset + top_k] if top_k > 0 else scored[offset:]

    return {
        "query": query,
        "terms": terms,
        "corrections": parsed.get("corrections", []),
        "total_hits": total,
        "top_k": top_k,
        "offset": offset,
        "returned": len(page),
        "results": page,
    }


def evaluate(index, fixture_path, top_k, threshold):
    if not os.path.exists(fixture_path):
        return None, f"fixture not found: {fixture_path}"
    try:
        with open(fixture_path, "r", encoding="utf-8") as f:
            fixture = json.load(f)
    except (OSError, ValueError) as exc:
        return None, f"fixture unreadable: {exc}"

    queries = fixture.get("queries") or []
    k = fixture.get("top_k", top_k)
    thr = fixture.get("pass_threshold", threshold)
    details = []
    hits = 0

    for case in queries:
        res = rank(index, case["query"], top_k=k, offset=0)
        ids = [r["id"] for r in res["results"]]
        expect = case.get("expect_any_of") or []
        hit = any(e in ids for e in expect)
        if hit:
            hits += 1
        rank_of = None
        for e in expect:
            if e in ids:
                rank_of = ids.index(e) + 1
                break
        details.append({"id": case["id"], "query": case["query"], "hit": hit,
                        "expect_any_of": expect, "top_k_ids": ids, "expected_rank": rank_of})

    total = len(queries)
    rate = (hits / total) if total else 0.0
    return {
        "success": rate >= thr,
        "hit_rate": round(rate, 4),
        "threshold": thr,
        "hits": hits,
        "total": total,
        "top_k": k,
        "details": details,
    }, None


def main() -> int:
    parser = argparse.ArgumentParser(description="BM25 ranking over skill inverted index")
    parser.add_argument("--query", "-q", help="Query string")
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--index", default=INDEX_JSON)
    parser.add_argument("--eval", nargs="?", const=DEFAULT_FIXTURE,
                        help="Evaluate hit-rate against a query fixture")
    parser.add_argument("--json", action="store_true", help="JSON output (default)")
    args = parser.parse_args()

    index, err = load_index(args.index)
    if index is None:
        print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
        return 1

    if args.eval:
        result, err = evaluate(index, args.eval, args.top_k, 0.90)
        if result is None:
            print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
            return 1
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result["success"] else 1

    if not args.query:
        print(json.dumps({"success": False, "error": "missing --query"}, ensure_ascii=False, indent=2))
        return 1

    result = rank(index, args.query, args.top_k, args.offset)
    result["success"] = True
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
