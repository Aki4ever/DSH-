#!/usr/bin/env python3
"""
detect_vague.py
模糊词检测器：扫描文本中的程度类修饰词与含糊类词语，输出命中词、类别、位置与是否已有量化映射。

本模块是**全仓模糊词表的唯一真相源**：程度类常量 DEGREE_WORDS、含糊类常量 AMBIGUITY_WORDS
与分类函数 classify_word() / scan() 均可被其它脚本用 importlib 直接复用，禁止再维护第二份词表。

词表分五类（WORD_CLASSES）：
    degree    程度类（高/大/快/多/好/严重/频繁/明显/显著/较多/较高/偏低/丰富/完善/稳定…），必须量化；
    hedge     含糊其辞类（适当/尽量/酌情/差不多/友好/美观/大概… 含既有两份旧词表的并集）；
    range     范围含糊（若干/一些/部分/多个/等等）；
    reference 指代含糊（相关/相应/等/其它/之类）；
    timing    时序含糊（尽快/必要时/适时/及时）。

对外契约里的 category 仍是二值口径：degree（程度类）/ ambiguity（含糊类）；
更细的五类归属通过 word_class 字段对外暴露，便于下游收敛词表时核对覆盖率。

quantified 判定：查 docs/operations/quantifier-table.json ——
    指定 --domain 时，该 term 在该 domain 下有映射即为 true；
    未指定 domain 时，该 term 只要有任一 domain 的映射即为 true，并在命中里给出 matched_domain。
注意：quantified 回答的是「该词在映射表里有没有场景量化值」，不是「当前这一处文本是否已落数值」；
后者由 verify-quantified-output 判定，前者由 quantify-modifier 用于产出替换建议。

匹配纪律：单趟左端最长匹配。词表按长度降序排入同一个正则，因此「差不多就行」先于「差不多」、
「等等」先于「等」、「多个」先于「多」命中，同一个位置不会重复计数。

Exit Code:
  0 - 扫描完成（命中多少都不影响退出码，判定交给 verify 层），或 --list-words 打印词表
  1 - 输入缺失（既无 --text 也无 --file），或 --file 指向的文件不存在/不可读
"""

import os

import re
import sys

# 关闭字节码落盘：本脚本会用 importlib 加载同仓其它技能模块，
# 避免在他人技能目录里生成 __pycache__。
sys.dont_write_bytecode = True
import json
import argparse

# 仓库根：本脚本位于 skills/detect-vague-modifier/scripts/ 之下
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.."))
TABLE_PATH = os.path.join(REPO_ROOT, "docs/operations/quantifier-table.json")

# 对外二值类别口径（契约字段 category）
CATEGORY_DEGREE = "degree"
CATEGORY_AMBIGUITY = "ambiguity"

# 五类词归属（契约字段 word_class）
WORD_CLASSES = ("degree", "hedge", "range", "reference", "timing")

# 程度类修饰词：必须量化。多字词在前，便于左端最长匹配。
DEGREE_WORDS = (
    "严重", "频繁", "明显", "显著", "较多", "较高", "偏低", "偏高",
    "丰富", "完善", "稳定",
    "高", "大", "快", "多", "好",
)

# 含糊类词语：分四类。
# hedge 为既有两份旧词表（plan-fission 与 dsh-butler/fission_engine 的 VAGUE_TERMS）的并集，
# 收敛后它们改为 importlib 加载本模块，因此这里必须完整保留，覆盖率不得下降。
AMBIGUITY_WORDS = {
    "hedge": (
        "差不多就行", "根据情况", "自行判断", "灵活处理", "尽可能",
        "差不多", "适当", "尽量", "视情况", "友好", "美观", "大概", "酌情",
    ),
    "range": ("若干", "一些", "部分", "多个", "等等"),
    "reference": ("相关", "相应", "其它", "之类", "等"),
    "timing": ("尽快", "尽早", "早日", "必要时", "适时", "及时"),
}

# 含糊类并集（对外暴露的完整列表）。
AMBIGUITY_WORD_LIST = tuple(
    word for kind in ("hedge", "range", "reference", "timing") for word in AMBIGUITY_WORDS[kind]
)

# 既有两份旧词表的原始清单，供收敛对拍时核对覆盖率（本模块必须完整包含）。
LEGACY_VAGUE_TERMS = (
    "适当", "尽量", "尽可能", "根据情况", "视情况", "差不多", "差不多就行",
    "友好", "美观", "大概", "酌情", "灵活处理", "自行判断",
)

# 全部词条（程度 + 含糊），按「长度降序 + 字典序」排入单趟正则，保证左端最长匹配且输出确定。
ALL_WORDS = tuple(sorted(set(DEGREE_WORDS) | set(AMBIGUITY_WORD_LIST), key=lambda w: (-len(w), w)))

WORD_PATTERN = re.compile("|".join(re.escape(word) for word in ALL_WORDS))

# 量化表达式识别（仅用于片段展示与下游断言复用，不改变本脚本的退出码）。
QUANTIFIED_RE = re.compile(
    r"(?:>=|<=|≥|≤|>|<|=|约)?\s*\d+(?:\.\d+)?\s*"
    r"(?:%|cm|mm|km|kg|ms|s|min|h|MB|GB|KB|TB|QPS|RPS|px|"
    r"条|行|个|次|人|份|项|级|倍|万元|万|亿|秒|分钟|小时|天|周|月|年|用户|字节|字)",
    re.IGNORECASE,
)


def classify_word(word):
    """返回词的五类归属：degree / hedge / range / reference / timing；查不到返回 None。"""
    if word in DEGREE_WORDS:
        return "degree"
    return ambiguity_kind(word)


def ambiguity_kind(word):
    """返回含糊词的四类归属：hedge / range / reference / timing；非含糊词返回 None。"""
    for kind in ("hedge", "range", "reference", "timing"):
        if word in AMBIGUITY_WORDS[kind]:
            return kind
    return None


def word_category(word):
    """返回契约二值类别：degree / ambiguity；查不到返回 None。"""
    kind = classify_word(word)
    if kind is None:
        return None
    return CATEGORY_DEGREE if kind == "degree" else CATEGORY_AMBIGUITY


def load_quantifier_table(path=None):
    """加载量化映射表，返回 (table, error)；成功时 error 为 None。"""
    target = path or TABLE_PATH
    if not os.path.exists(target):
        return None, "量化映射表不存在: {}".format(target)
    try:
        with open(target, "r", encoding="utf-8") as handle:
            table = json.load(handle)
    except (OSError, ValueError) as exc:
        return None, "量化映射表不可读: {}".format(exc)
    if not isinstance(table, dict) or not isinstance(table.get("entries"), list):
        return None, "量化映射表结构非法：缺少 entries 数组"
    return table, None


def find_mapping(term, domain, table):
    """查 (term, domain) 条目；domain 为空时退化为「任一场景命中」，返回 None 表示无映射。"""
    if not table:
        return None
    entries = table.get("entries") or []
    if domain:
        for entry in entries:
            if entry.get("term") == term and entry.get("domain") == domain:
                return entry
        return None
    for entry in entries:
        if entry.get("term") == term:
            return entry
    return None


def build_line_index(text):
    """预先算出每行起始偏移，供 index -> line 换算。"""
    starts = [0]
    for i, char in enumerate(text):
        if char == "\n":
            starts.append(i + 1)
    return starts


def offset_to_line(starts, offset):
    """二分查找偏移量所属行号（从 1 开始）。"""
    low, high = 0, len(starts) - 1
    while low < high:
        mid = (low + high + 1) // 2
        if starts[mid] <= offset:
            low = mid
        else:
            high = mid - 1
    return low + 1


def make_snippet(text, start, end, width=12):
    """截取命中词左右各 width 个字符，压缩换行为空格，形如 …大量…。"""
    left = max(0, start - width)
    right = min(len(text), end + width)
    body = text[left:right].replace("\n", " ").replace("\r", " ")
    return "{}{}{}".format("…" if left > 0 else "", body, "…" if right < len(text) else "")


def scan(text, domain=None, table=None):
    """扫描文本，返回 {"hits": [...], "counts": {...}, "unquantified": n}。"""
    if table is None:
        table, _ = load_quantifier_table()

    starts = build_line_index(text or "")
    hits = []
    counts = {"degree": 0, "ambiguity": 0, "hedge": 0, "range": 0, "reference": 0, "timing": 0}
    unquantified = 0

    for match in WORD_PATTERN.finditer(text or ""):
        term = match.group(0)
        kind = classify_word(term)
        if kind is None:
            continue
        category = CATEGORY_DEGREE if kind == CATEGORY_DEGREE else CATEGORY_AMBIGUITY
        counts[category] += 1
        if category == CATEGORY_AMBIGUITY:
            counts[kind] += 1

        mapped = None
        if category == CATEGORY_DEGREE:
            mapped = find_mapping(term, domain, table)

        quantified = mapped is not None
        if category == CATEGORY_DEGREE and not quantified:
            unquantified += 1

        hits.append({
            "term": term,
            "category": category,
            "word_class": kind,
            "line": offset_to_line(starts, match.start()),
            "index": match.start(),
            "quantified": quantified,
            "domain": domain,
            "matched_domain": mapped.get("domain") if mapped else None,
            "snippet": make_snippet(text, match.start(), match.end()),
        })

    return {"hits": hits, "counts": counts, "unquantified": unquantified}


def list_words_payload():
    """--list-words 的词表载荷：逐词类别 + 五类分组 + 既有旧词表覆盖率核对。"""
    words = []
    for word in sorted(set(DEGREE_WORDS) | set(AMBIGUITY_WORD_LIST)):
        kind = classify_word(word)
        words.append({
            "term": word,
            "category": word_category(word),
            "word_class": kind,
        })
    legacy_missing = [w for w in LEGACY_VAGUE_TERMS if w not in AMBIGUITY_WORD_LIST]
    return {
        "word_classes": list(WORD_CLASSES),
        "categories": [CATEGORY_DEGREE, CATEGORY_AMBIGUITY],
        "degree": list(DEGREE_WORDS),
        "ambiguity": {kind: list(AMBIGUITY_WORDS[kind]) for kind in ("hedge", "range", "reference", "timing")},
        "words": sorted(words, key=lambda item: (item["category"], item["word_class"], item["term"])),
        "counts": {
            "degree": len(DEGREE_WORDS),
            "ambiguity": len(AMBIGUITY_WORD_LIST),
            "total": len(set(DEGREE_WORDS) | set(AMBIGUITY_WORD_LIST)),
        },
        "legacy_coverage": {
            "legacy_terms": list(LEGACY_VAGUE_TERMS),
            "missing": legacy_missing,
            "covered": not legacy_missing,
        },
    }


def read_input(args):
    """读取待检文本，返回 (text, error)。"""
    if args.text is not None:
        return args.text, None
    if args.file:
        if not os.path.exists(args.file):
            return None, "文件不存在: {}".format(args.file)
        try:
            with open(args.file, "r", encoding="utf-8") as handle:
                return handle.read(), None
        except (OSError, UnicodeDecodeError) as exc:
            return None, "文件不可读: {}".format(exc)
    return None, "必须提供 --text 或 --file 之一"


def main() -> int:
    parser = argparse.ArgumentParser(description="模糊词检测器（全仓模糊词表唯一真相源）")
    parser.add_argument("--text", help="待检文本")
    parser.add_argument("--file", help="待检文件路径")
    parser.add_argument("--domain", help="场景名，用于判定该词是否已有场景量化映射")
    parser.add_argument("--list-words", action="store_true", help="打印词表 JSON 后退出")
    parser.add_argument("--json", action="store_true", help="以 JSON 输出扫描结果")
    args = parser.parse_args()

    if args.list_words:
        print(json.dumps(list_words_payload(), ensure_ascii=False, indent=2))
        return 0

    text, error = read_input(args)
    if error:
        print(json.dumps({"success": False, "error": error}, ensure_ascii=False, indent=2))
        return 1

    table, table_error = load_quantifier_table()
    result = scan(text, domain=args.domain, table=table)
    payload = {
        "success": True,
        "hits": result["hits"],
        "counts": result["counts"],
        "unquantified": result["unquantified"],
        "domain": args.domain,
        "table_version": (table or {}).get("table_version"),
        "table_error": table_error,
    }

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    print("命中 {} 处：程度类 {} 处，含糊类 {} 处；未量化程度词 {} 处".format(
        len(payload["hits"]), payload["counts"][CATEGORY_DEGREE],
        payload["counts"][CATEGORY_AMBIGUITY], payload["unquantified"]))
    for hit in payload["hits"]:
        print("  第 {line} 行 [{category}/{word_class}] {term}  quantified={quantified}  {snippet}".format(**hit))
    return 0


if __name__ == "__main__":
    sys.exit(main())
