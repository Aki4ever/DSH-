#!/usr/bin/env python3
"""
build_index.py
由 skill-catalog.json 生成倒排索引 skill-index.json。

同时对外暴露确定性分词器 tokenize()，供 parse-query / rank-skills-bm25 复用。

Exit Code:
  0 - 索引已最新（--check）或重建成功
  1 - catalog 缺失/非法，或 --check 检测到索引陈旧
"""

import os
import re
import sys
import json
import argparse

# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../skill-pool"))
REPO_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
CATALOG_JSON = os.path.join(REPO_ROOT, "docs/operations/skill-catalog.json")
INDEX_JSON = os.path.join(REPO_ROOT, "docs/operations/skill-index.json")

INDEX_VERSION = "1.0.0"

FIELD_WEIGHTS = {"id": 3.0, "triggers": 2.0, "category_title": 1.5, "description": 1.0}

CJK_RUN_RE = re.compile(r"[\u4e00-\u9fff]+")
ASCII_WORD_RE = re.compile(r"[a-z0-9][a-z0-9\-_.]*")

STOPWORDS = {
    "的", "了", "和", "与", "或", "是", "不", "在", "有", "把", "被", "对", "为", "从", "到",
    "the", "a", "an", "of", "and", "or", "to", "for", "in", "on", "is", "are", "be", "with",
}


def tokenize(text: str):
    """确定性分词：ASCII 词原样保留，CJK 连续段切一元与二元。"""
    if not text:
        return []
    low = text.lower()
    tokens = []

    for m in ASCII_WORD_RE.finditer(low):
        word = m.group(0).strip("._-")
        if word and word not in STOPWORDS:
            tokens.append(word)

    for m in CJK_RUN_RE.finditer(low):
        run = m.group(0)
        for ch in run:
            if ch not in STOPWORDS:
                tokens.append(ch)
        for i in range(len(run) - 1):
            bigram = run[i:i + 2]
            if bigram[0] in STOPWORDS and bigram[1] in STOPWORDS:
                continue
            tokens.append(bigram)

    return tokens


def field_text(skill: dict, field: str) -> str:
    if field == "triggers":
        return " ".join(skill.get("triggers") or [])
    return str(skill.get(field) or "")


def build(catalog: dict) -> dict:
    skills = catalog.get("skills") or []
    docs = []
    postings = {}   # term -> [[doc_idx, field_idx, tf], ...]
    df = {}
    field_names = list(FIELD_WEIGHTS.keys())

    for skill in skills:
        doc = {"id": skill.get("id"), "level": skill.get("level"),
               "category_title": skill.get("category_title", ""),
               "description": skill.get("description", ""),
               "triggers": skill.get("triggers") or [],
               "field_len": {}, "len": 0.0}
        doc_terms = set()

        for fi, field in enumerate(field_names):
            toks = tokenize(field_text(skill, field))
            counts = {}
            for t in toks:
                counts[t] = counts.get(t, 0) + 1
            doc["field_len"][field] = sum(counts.values())
            doc["len"] += FIELD_WEIGHTS[field] * sum(counts.values())

            for term, tf in counts.items():
                postings.setdefault(term, []).append([len(docs), fi, tf])
                doc_terms.add(term)

        for term in doc_terms:
            df[term] = df.get(term, 0) + 1

        docs.append(doc)

    avg_len = (sum(d["len"] for d in docs) / len(docs)) if docs else 0.0

    return {
        "index_version": INDEX_VERSION,
        "built_from": "docs/operations/skill-catalog.json",
        "doc_count": len(docs),
        "field_weights": FIELD_WEIGHTS,
        "avg_doc_len": round(avg_len, 4),
        "df": {k: df[k] for k in sorted(df)},
        "postings": {k: sorted(postings[k]) for k in sorted(postings)},
        "docs": docs,
    }


def load_catalog():
    if not os.path.exists(CATALOG_JSON):
        return None, f"catalog not found: {CATALOG_JSON}"
    try:
        with open(CATALOG_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError) as exc:
        return None, f"catalog unreadable: {exc}"
    for key in ("total_skills", "skills"):
        if key not in data:
            return None, f"catalog missing required field: {key}"
    return data, None


def dump(index: dict) -> str:
    return json.dumps(index, ensure_ascii=False, sort_keys=True, indent=1) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Build inverted index for skill retrieval")
    parser.add_argument("--check", action="store_true", help="Detect staleness without writing")
    parser.add_argument("--json", action="store_true", help="JSON output")
    args = parser.parse_args()

    catalog, err = load_catalog()
    if catalog is None:
        print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
        return 1

    index = build(catalog)
    payload = dump(index)

    if args.check:
        stale = True
        if os.path.exists(INDEX_JSON):
            with open(INDEX_JSON, "r", encoding="utf-8") as f:
                stale = f.read() != payload
        print(json.dumps({"success": not stale, "stale": stale,
                          "index": os.path.relpath(INDEX_JSON, REPO_ROOT),
                          "doc_count": index["doc_count"],
                          "terms": len(index["postings"])}, ensure_ascii=False, indent=2))
        return 1 if stale else 0

    old = None
    if os.path.exists(INDEX_JSON):
        with open(INDEX_JSON, "r", encoding="utf-8") as f:
            old = f.read()

    changed = old != payload
    if changed:
        with open(INDEX_JSON, "w", encoding="utf-8") as f:
            f.write(payload)

    print(json.dumps({"success": True, "changed": changed,
                      "index": os.path.relpath(INDEX_JSON, REPO_ROOT),
                      "doc_count": index["doc_count"],
                      "terms": len(index["postings"]),
                      "avg_doc_len": index["avg_doc_len"]}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
