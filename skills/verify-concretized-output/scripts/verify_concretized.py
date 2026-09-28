#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_concretized.py
含糊词具像化断言器：对「已具像化」的正文做三项硬断言，全过才放行。

词表唯一真相源
--------------
含糊词并集 AMBIGUITY_WORDS 与分类函数 classify_word(w) 只从
    skills/detect-vague-modifier/scripts/detect_vague.py
经 importlib.util.spec_from_file_location 动态加载。本脚本**绝不内置兜底词表**。

三项断言
--------
  1. no_unconcretized : 文本中不存在未具像化的含糊词（AMBIGUITY_WORDS 命中数 == 0）
  2. no_basis         : --strict 时，任何数量表述必须带依据（如 12 个（依据：…））
  3. no_synonym_swap  : 命中的含糊词右侧 6 字内不得出现同类别含糊词（如「尽快……尽早」）

Exit Code:
  0 - 三项断言全过
  1 - 存在违规（unconcretized / no_basis / synonym_swap）
  2 - 依赖模块未就绪，或输入缺失
"""

import argparse
import importlib.util
import json
import os
import re
import sys

# 加载依赖模块时不写 .pyc，避免在他人技能目录里留下字节码缓存（只读复用，零副作用）
sys.dont_write_bytecode = True

REPO_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
)
DEP_MODULE_PATH = os.path.join(
    REPO_ROOT, "skills", "detect-vague-modifier", "scripts", "detect_vague.py"
)

VALID_CATEGORIES = ("range", "reference", "timing", "hedge")

# 数量表述：阿拉伯数字 + 单位（无单位不构成可核对的数量表述）
QUANTITY_RE = re.compile(
    r"\d+(?:\.\d+)?\s*(?:个|处|条|次|行|份|项|人|页|分钟|小时|秒|毫秒|天|周|月|"
    r"MB|KB|GB|TB|ms|%)"
)
# 依据标记：数量右侧就近出现即视为带依据
BASIS_RE = re.compile(r"依据\s*[:：]")
# 汉字串：仅用于换字变体的词形判定
CJK_RE = re.compile(r"[\u4e00-\u9fff]+")
BASIS_WINDOW = 30   # 数量右侧查依据的字符窗口
SYNONYM_WINDOW = 6  # 同义替换检测窗口（右侧 6 字）

DEP_MISSING_MSG = (
    "[verify-concretized] 依赖未就绪：未找到词表唯一真相源 {path}\n"
    "[verify-concretized] 请等待 detect-vague-modifier 交付后重跑；本脚本不内置兜底词表。\n"
)


def fail_dependency(reason):
    sys.stderr.write(DEP_MISSING_MSG.format(path=DEP_MODULE_PATH))
    sys.stderr.write("[verify-concretized] 具体原因：{}\n".format(reason))
    return 2


def _collect(raw, bucket):
    if isinstance(raw, str):
        if raw.strip():
            bucket.add(raw.strip())
    elif isinstance(raw, dict):
        for key in raw:
            if isinstance(key, str) and key.strip():
                bucket.add(key.strip())
    elif isinstance(raw, (list, tuple, set, frozenset)):
        for item in raw:
            _collect(item, bucket)


def normalize_words(raw):
    """归一化 AMBIGUITY_WORDS：兼容 列表/元组/集合/字典 多种形态。"""
    bucket = set()
    if isinstance(raw, dict):
        value_is_container = any(
            isinstance(v, (list, tuple, set, frozenset, dict)) for v in raw.values()
        )
        if value_is_container:
            for value in raw.values():
                _collect(value, bucket)
        else:
            _collect(raw, bucket)
    else:
        _collect(raw, bucket)
    return sorted(bucket, key=lambda w: (-len(w), w))


def load_dependency():
    if not os.path.isfile(DEP_MODULE_PATH):
        return None, "文件不存在"
    try:
        spec = importlib.util.spec_from_file_location("detect_vague", DEP_MODULE_PATH)
        if spec is None or spec.loader is None:
            return None, "无法构造模块 spec"
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    except Exception as exc:
        return None, "模块加载失败：{}".format(exc)

    raw_words = getattr(module, "AMBIGUITY_WORDS", None)
    classify = getattr(module, "classify_word", None)
    if raw_words is None:
        return None, "模块缺少模块级常量 AMBIGUITY_WORDS"
    if not callable(classify):
        return None, "模块缺少可调用函数 classify_word"
    words = normalize_words(raw_words)
    if not words:
        return None, "AMBIGUITY_WORDS 归一化后为空"
    return (words, classify), None


def find_hits(text, words):
    """最长匹配扫描，命中区间占用标记，避免长词被短词拆开重复计数。"""
    consumed = [False] * len(text)
    hits = []
    for word in words:
        start = 0
        while True:
            index = text.find(word, start)
            if index < 0:
                break
            end = index + len(word)
            if not any(consumed[index:end]):
                for pos in range(index, end):
                    consumed[pos] = True
                hits.append((index, word))
            start = index + 1
    hits.sort(key=lambda item: (item[0], -len(item[1])))
    return hits


def line_of(text, index):
    return text.count("\n", 0, index) + 1


def snippet_of(text, index, width):
    raw = text[max(0, index - 12): index + width + 12]
    return " ".join(raw.split())


def category_of(word, classify, cache):
    if word in cache:
        return cache[word]
    try:
        raw = classify(word)
    except Exception:
        raw = None
    category = raw.strip().lower() if isinstance(raw, str) else ""
    if category not in VALID_CATEGORIES:
        category = "unknown"
    cache[word] = category
    return category


def swap_variant(window, term):
    """换字变体：与命中词等长、逐位比较仅一个汉字不同、其余位置完全相同。

    这是「同义替换」在中文里的物理词形（「尽快」→「尽早」）。候选项完全由命中词在
    运行期推导，不引入任何词条，因此不构成第二份词表。
    """
    size = len(term)
    if size < 2:
        return None
    for offset in range(0, max(0, len(window) - size + 1)):
        candidate = window[offset: offset + size]
        if candidate == term or not CJK_RE.fullmatch(candidate):
            continue
        if sum(1 for left, right in zip(term, candidate) if left != right) == 1:
            return candidate
    return None


def detect_synonym(text, index, term, category, words, classify, cache):
    """右侧 6 字窗口内是否出现同义替换，返回 (替换词, 判定依据) 或 None。

    判定顺序：
      1. 词表内其它同类别含糊词（唯一真相源 classify_word 为权威）；
      2. 窗口内 2~4 字切片经 classify_word 判为同类别者；
      3. 换字变体（等长仅差一字），覆盖词表尚未收录的同义替换词形。
    """
    end = index + len(term)
    window = text[end: end + SYNONYM_WINDOW]
    for other in words:
        if other != term and other in window and category_of(other, classify, cache) == category:
            return other, "同类别含糊词"
    for size in (2, 3, 4):
        for offset in range(0, max(0, len(window) - size + 1)):
            candidate = window[offset: offset + size]
            if candidate == term or not candidate:
                continue
            if category_of(candidate, classify, cache) == category:
                return candidate, "同类别含糊词"
    variant = swap_variant(window, term)
    if variant is not None:
        return variant, "换字变体"
    return None


def check_quantity_basis(text, strict):
    """--strict 下校验数量表述是否带依据，返回 (violations, detail)。"""
    violations = []
    if not strict:
        return violations, "未启用 --strict，默认不校验数量依据"
    consumed_until = -1
    checked = 0
    for match in QUANTITY_RE.finditer(text):
        if match.start() < consumed_until:
            continue
        checked += 1
        window = text[match.end(): match.end() + BASIS_WINDOW]
        if BASIS_RE.search(window):
            consumed_until = match.end() + BASIS_WINDOW
            continue
        term = re.sub(r"\s+", "", match.group(0))
        violations.append({
            "kind": "no_basis",
            "term": term,
            "line": line_of(text, match.start()),
            "detail": "数量表述「{}」右侧 {} 字内未出现「依据：」，缺计数依据".format(
                term, BASIS_WINDOW
            ),
        })
    return violations, "已校验 {} 处数量表述".format(checked)


def build_result(text, strict, words, classify):
    cache = {}
    hits = []
    violations = []

    for index, term in find_hits(text, words):
        category = category_of(term, classify, cache)
        hits.append({
            "term": term,
            "category": category,
            "line": line_of(text, index),
            "snippet": snippet_of(text, index, len(term)),
        })
        violations.append({
            "kind": "unconcretized",
            "term": term,
            "line": line_of(text, index),
            "detail": "命中未具像化的含糊词「{}」（类别 {}）".format(term, category),
        })
        synonym = detect_synonym(text, index, term, category, words, classify, cache)
        if synonym is not None:
            other, basis = synonym
            violations.append({
                "kind": "synonym_swap",
                "term": term,
                "line": line_of(text, index),
                "other_term": other,
                "detail": "「{}」右侧 {} 字内出现替换词「{}」（判定依据：{}），属同义替换".format(
                    term, SYNONYM_WINDOW, other, basis
                ),
            })

    basis_violations, basis_detail = check_quantity_basis(text, strict)
    violations.extend(basis_violations)

    checks = [
        {
            "name": "no_unconcretized",
            "pass": len(hits) == 0,
            "detail": "含糊词命中数 {}（要求 0）".format(len(hits)),
        },
        {
            "name": "quantity_basis",
            "pass": len(basis_violations) == 0,
            "detail": basis_detail,
        },
        {
            "name": "no_synonym_swap",
            "pass": not any(v["kind"] == "synonym_swap" for v in violations),
            "detail": "同义替换违规 {} 处（要求 0）".format(
                sum(1 for v in violations if v["kind"] == "synonym_swap")
            ),
        },
    ]

    return {
        "success": not violations,
        "strict": bool(strict),
        "hits": hits,
        "violations": violations,
        "checks": checks,
    }


def render_text(result):
    lines = ["[verify-concretized] strict={}".format(result["strict"])]
    for check in result["checks"]:
        lines.append("  [{}] {}：{}".format(
            "PASS" if check["pass"] else "FAIL", check["name"], check["detail"]))
    if result["violations"]:
        lines.append("违规明细：")
        for item in result["violations"]:
            lines.append("  - 第{line}行 [{kind}] {term}：{detail}".format(**item))
    lines.append("结论：{}".format("通过" if result["success"] else "不通过"))
    return "\n".join(lines)


def read_input(args):
    if args.text is not None:
        if not args.text.strip():
            return None, "text", "--text 为空字符串"
        return args.text, "text", None
    if args.file is not None:
        path = os.path.abspath(args.file)
        if not os.path.isfile(path):
            return None, args.file, "文件不存在或不是普通文件：{}".format(args.file)
        try:
            with open(path, "r", encoding="utf-8") as handle:
                content = handle.read()
        except (OSError, UnicodeDecodeError) as exc:
            return None, args.file, "文件不可读：{}".format(exc)
        if not content.strip():
            return None, args.file, "文件内容为空：{}".format(args.file)
        return content, args.file, None
    return None, None, "缺少输入：请给出 --text 或 --file"


def main():
    parser = argparse.ArgumentParser(
        description="Assert ambiguous terms have been concretized"
    )
    parser.add_argument("--text", help="待断言文本")
    parser.add_argument("--file", help="待断言文件路径")
    parser.add_argument("--strict", action="store_true",
                        help="额外要求任何数量表述必须带依据")
    parser.add_argument("--json", action="store_true", help="输出 JSON")
    args = parser.parse_args()

    text, source, error = read_input(args)
    if error is not None:
        message = {"success": False, "error": error}
        if args.json:
            print(json.dumps(message, ensure_ascii=False, indent=2))
        else:
            sys.stderr.write("[verify-concretized] 输入缺失：{}\n".format(error))
        return 2

    loaded, reason = load_dependency()
    if loaded is None:
        return fail_dependency(reason)
    words, classify = loaded

    result = build_result(text, args.strict, words, classify)
    result["source"] = source
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(render_text(result))
    return 0 if result["success"] else 1


if __name__ == "__main__":
    sys.exit(main())
