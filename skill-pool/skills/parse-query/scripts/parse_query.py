#!/usr/bin/env python3
"""
parse_query.py
查询解析：归一化 → 分词 → 停用词剔除 → 同义词扩展 → ASCII 拼写纠错。

Exit Code:
  0 - 解析完成（terms 可为空）
  1 - 缺少 --query/--file，或 --vocab 不可读
"""

import os
import re
import sys

# 关闭字节码落盘：本脚本会用 importlib 加载同仓其它技能模块，
# 避免在他人技能目录里生成 __pycache__。
sys.dont_write_bytecode = True
import json
import argparse
import importlib.util


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
TOKENIZER_SCRIPT = os.path.join(REPO_ROOT, "skills/build-inverted-index/scripts/build_index.py")

FULLWIDTH_PUNCT = "，。；：！？、（）【】《》“”‘’—…·"

# 同义词表：键为归一化后的词，值为等价词列表
SYNONYMS = {
    "校验": ["检查", "验证", "断言"],
    "验证": ["校验", "检查", "断言"],
    "检查": ["校验", "验证", "审计"],
    "生成": ["创建", "构建", "产出"],
    "创建": ["生成", "新建", "初始化"],
    "删除": ["移除", "清理"],
    "检索": ["搜索", "查找", "查询"],
    "搜索": ["检索", "查找", "查询"],
    "配置": ["设置", "参数"],
    "文档": ["文件", "说明"],
    "文件": ["文档", "路径"],
    "输出": ["打印", "呈现", "交付"],
    "统计": ["度量", "测算", "计数"],
    "进度": ["阶段", "里程碑", "过程"],
    "优化": ["改进", "降低", "精简"],
    "token": ["令牌", "token"],
    "按需": ["懒加载", "延迟"],
    "提示词": ["prompt", "规约"],
}


def _load_tokenizer():
    spec = importlib.util.spec_from_file_location("bi_index", TOKENIZER_SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def normalize(text: str) -> str:
    out = []
    for ch in text:
        if ch in FULLWIDTH_PUNCT:
            out.append(" ")
        else:
            out.append(ch)
    return re.sub(r"\s+", " ", "".join(out)).strip().lower()


def edit_distance_le1(a: str, b: str) -> bool:
    if abs(len(a) - len(b)) > 1:
        return False
    if a == b:
        return True
    if len(a) == len(b):
        return sum(1 for x, y in zip(a, b) if x != y) <= 1
    if len(a) > len(b):
        a, b = b, a
    i = j = 0
    skipped = False
    while i < len(a) and j < len(b):
        if a[i] != b[j]:
            if skipped:
                return False
            skipped = True
            j += 1
            continue
        i += 1
        j += 1
    return True


def load_vocab(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return set(data.get("df", {}).keys()), None
    except (OSError, ValueError) as exc:
        return None, f"vocab unreadable: {exc}"


def parse(query: str, vocab=None):
    bi = _load_tokenizer()
    normalized = normalize(query)
    raw_terms = bi.tokenize(normalized)

    dropped = []
    kept = []
    for t in raw_terms:
        if t in bi.STOPWORDS:
            dropped.append(t)
        else:
            kept.append(t)

    corrections = []
    if vocab:
        fixed = []
        for t in kept:
            if t.isascii() and t not in vocab:
                candidates = [v for v in vocab if v.isascii() and edit_distance_le1(t, v)]
                if candidates:
                    best = sorted(candidates)[0]
                    corrections.append({"from": t, "to": best})
                    fixed.append(best)
                    continue
            fixed.append(t)
        kept = fixed

    expanded = []
    for t in kept:
        expanded.append(t)
        for syn in SYNONYMS.get(t, []):
            if syn not in expanded:
                expanded.append(syn)

    # 去重保序
    seen = set()
    terms = []
    for t in expanded:
        if t not in seen:
            seen.add(t)
            terms.append(t)

    return {
        "raw": query,
        "normalized": normalized,
        "terms": terms,
        "base_terms": kept,
        "dropped_stopwords": dropped,
        "corrections": corrections,
        "expanded": bool(len(terms) > len(kept)),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Parse a natural-language query into terms")
    parser.add_argument("--query", "-q", help="Raw query string")
    parser.add_argument("--file", help="Read query from a file instead")
    parser.add_argument("--vocab", help="skill-index.json for spelling correction")
    parser.add_argument("--json", action="store_true", help="JSON output (default)")
    args = parser.parse_args()

    query = args.query
    if not query and args.file:
        if not os.path.exists(args.file):
            print(json.dumps({"success": False, "error": f"file not found: {args.file}"},
                             ensure_ascii=False, indent=2))
            return 1
        with open(args.file, "r", encoding="utf-8") as f:
            query = f.read()

    if not query:
        print(json.dumps({"success": False, "error": "missing --query or --file"},
                         ensure_ascii=False, indent=2))
        return 1

    vocab = None
    if args.vocab:
        vocab, err = load_vocab(args.vocab)
        if vocab is None:
            print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
            return 1

    result = parse(query, vocab)
    result["success"] = True
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
