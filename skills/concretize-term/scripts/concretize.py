#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
concretize.py
含糊词具像化建议器：逐条命中含糊词，按其类别产出具像化建议模板与占位示例。

词表唯一真相源
--------------
含糊词并集 AMBIGUITY_WORDS 与分类函数 classify_word(w) 只从
    skills/detect-vague-modifier/scripts/detect_vague.py
经 importlib.util.spec_from_file_location 动态加载。本脚本**绝不内置兜底词表**：
该模块缺失或无法加载时，一律以 exit 2 明确退出，并说明依赖未就绪。

Exit Code:
  0 - 处理完成（含命中数为 0）
  1 - 输入缺失（未给 --text/--file，或文件不可读、为空）
  2 - 依赖模块 detect-vague-modifier 未就绪
"""

import argparse
import importlib.util
import json
import os
import re
import sys

# 加载依赖模块时不写 .pyc，避免在他人技能目录里留下字节码缓存（只读复用，零副作用）
sys.dont_write_bytecode = True

# 仓库根目录：<repo>/skills/concretize-term/scripts/concretize.py -> 上溯三级
REPO_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
)
DEP_MODULE_PATH = os.path.join(
    REPO_ROOT, "skills", "detect-vague-modifier", "scripts", "detect_vague.py"
)

# 四类合法分类标签（只作标签使用，不在此登记任何词条）
VALID_CATEGORIES = ("range", "reference", "timing", "hedge")

# 汉字串：仅用于换字变体的词形判定
CJK_RE = re.compile(r"[\u4e00-\u9fff]+")

# 固定建议模板：{t} 为命中的含糊词原文
SUGGESTION_TMPL = {
    "range": "补确切数量 + 计数依据：把「{t}」换成具体数字，并写明这个数字是怎么数出来的",
    "reference": "枚举具体实体清单：把「{t}」展开成可逐项核对的实体名字，禁止留指代",
    "timing": "给出可判定的触发条件 + 时限：把「{t}」换成「在什么事件之后、多久之内完成」",
    "hedge": "给出可核对的判据：把「{t}」换成具体阈值或条件，该词不得原样保留",
}
EXAMPLE_TMPL = {
    "range": "{t} → 12 个（依据：本次扫描命中 12 处）",
    "reference": "{t} → a.py、b.py、c.py（依据：同目录实际存在的文件名清单）",
    "timing": "{t} → 在下一个门禁运行前（≤10 分钟）",
    "hedge": "{t} → 把上限从 5 提到 8，依据：当前 90% 请求落在 5 以内",
}
UNKNOWN_SUGGESTION = "未识别的含糊词分类：{t}，需补词表或复核依赖模块 classify_word 的返回值"
UNKNOWN_EXAMPLE = "{t} → （待定：先修词表，再给具像化示例）"

# 依赖未就绪时的 stderr 说明（绝不退回内置词表）
DEP_MISSING_MSG = (
    "[concretize] 依赖未就绪：未找到词表唯一真相源 {path}\n"
    "[concretize] 请等待 detect-vague-modifier 交付后重跑；本脚本不内置兜底词表。\n"
)


def fail_dependency(reason):
    """依赖未就绪：写 stderr 并返回退出码 2。"""
    sys.stderr.write(DEP_MISSING_MSG.format(path=DEP_MODULE_PATH))
    sys.stderr.write("[concretize] 具体原因：{}\n".format(reason))
    return 2


def _collect(raw, bucket):
    """把任意容器形态的词集合摊平成字符串集合。"""
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
    """归一化 AMBIGUITY_WORDS：兼容 列表/元组/集合/字典 多种形态。

    字典形态两种含义都要容错：
      - {"等": "reference", ...}   → 键即词条（值为类别标签）
      - {"reference": ["等", ...]} → 值为词条集合
    返回按「词长降序 + 字典序」排序的词列表，保证最长匹配优先且结果确定。
    """
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
    """加载唯一真相源模块；成功返回 (words, classify_word)，失败返回 (None, 错误原因)。"""
    if not os.path.isfile(DEP_MODULE_PATH):
        return None, "文件不存在"
    try:
        spec = importlib.util.spec_from_file_location("detect_vague", DEP_MODULE_PATH)
        if spec is None or spec.loader is None:
            return None, "无法构造模块 spec"
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    except Exception as exc:  # 依赖侧任何异常都视为未就绪
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
    """最长匹配扫描：先长后短，命中区间做占用标记，避免「等等」被拆成两个「等」。"""
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


def enumerate_siblings(file_path):
    """枚举同目录真实存在的文件名，作为 reference 类的候选实体清单（限 5 个）。"""
    directory = os.path.dirname(os.path.abspath(file_path))
    try:
        names = sorted(
            name for name in os.listdir(directory)
            if os.path.isfile(os.path.join(directory, name)) and not name.startswith(".")
        )
    except OSError:
        return []
    return names[:5]


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


def one_char_swap(term, haystack):
    """换字变体：与命中词等长、逐位比较仅一个汉字不同、其余位置完全相同。

    这是「同义替换」在中文里的物理词形（「尽快」→「尽早」）。候选项完全由命中词在
    运行期推导，不引入任何词条，因此不构成第二份词表。
    """
    size = len(term)
    if size < 2:
        return None
    for offset in range(0, max(0, len(haystack) - size + 1)):
        candidate = haystack[offset: offset + size]
        if candidate == term or not CJK_RE.fullmatch(candidate):
            continue
        if sum(1 for left, right in zip(term, candidate) if left != right) == 1:
            return candidate
    return None


def detect_weak(suggestion_text, term, category, words, cache, classify):
    """替换词黑名单校验：去掉该词后仍含同类别其它含糊词 → weak。

    黑名单由两部分构成：唯一真相源词表内的同类别词，以及运行期推导出的换字变体
    （「尽快」→「尽早」这类只换一个字的同义替换）。
    """
    rest = suggestion_text.replace(term, "")
    for other in words:
        if other == term or other not in rest:
            continue
        if category_of(other, classify, cache) == category:
            return other
    return one_char_swap(term, rest)


def build_result(text, source, file_path, words, classify):
    cache = {}
    siblings = enumerate_siblings(file_path) if file_path else []
    suggestions = []
    counts = {name: 0 for name in VALID_CATEGORIES}

    for index, term in find_hits(text, words):
        category = category_of(term, classify, cache)
        counts[category] = counts.get(category, 0) + 1

        if category == "unknown":
            suggestion = UNKNOWN_SUGGESTION.format(t=term)
            example = UNKNOWN_EXAMPLE.format(t=term)
        elif category == "reference" and siblings:
            suggestion = SUGGESTION_TMPL[category].format(t=term)
            example = "{t} → {names}（依据：同目录实际存在的文件名）".format(
                t=term, names="、".join(siblings)
            )
        else:
            suggestion = SUGGESTION_TMPL[category].format(t=term)
            example = EXAMPLE_TMPL[category].format(t=term)

        weak_term = detect_weak(
            suggestion + example, term, category, words, cache, classify
        )
        item = {
            "term": term,
            "category": category,
            "line": line_of(text, index),
            "snippet": snippet_of(text, index, len(term)),
            "suggestion": suggestion,
            "example": example,
            "weak": weak_term is not None,
        }
        if weak_term is not None:
            item["weak_term"] = weak_term
        suggestions.append(item)

    if "unknown" in counts and counts["unknown"] == 0:
        counts.pop("unknown")

    return {
        "success": True,
        "source": source,
        "suggestions": suggestions,
        "counts": counts,
    }


def render_text(result):
    lines = ["[concretize] 来源：{}".format(result["source"])]
    if not result["suggestions"]:
        lines.append("[concretize] 未命中含糊词，无可具像化项。")
    for item in result["suggestions"]:
        lines.append(
            "- 第{line}行 [{category}] {term}｜上下文：{snippet}".format(**item)
        )
        lines.append("  建议：{}".format(item["suggestion"]))
        lines.append("  示例：{}".format(item["example"]))
        if item["weak"]:
            lines.append(
                "  警告：weak=true，建议去掉该词后仍含同类别含糊词「{}」".format(
                    item.get("weak_term", "")
                )
            )
    lines.append(
        "[concretize] 命中数：range={range} reference={reference} timing={timing} hedge={hedge}".format(
            **{k: result["counts"].get(k, 0) for k in VALID_CATEGORIES}
        )
    )
    return "\n".join(lines)


def read_input(args):
    """返回 (text, source, file_path, error)。"""
    if args.text is not None:
        if not args.text.strip():
            return None, None, None, "--text 为空字符串"
        return args.text, "text", None, None
    if args.file is not None:
        path = os.path.abspath(args.file)
        if not os.path.isfile(path):
            return None, None, None, "文件不存在或不是普通文件：{}".format(args.file)
        try:
            with open(path, "r", encoding="utf-8") as handle:
                content = handle.read()
        except (OSError, UnicodeDecodeError) as exc:
            return None, None, None, "文件不可读：{}".format(exc)
        if not content.strip():
            return None, None, None, "文件内容为空：{}".format(args.file)
        return content, args.file, path, None
    return None, None, None, "缺少输入：请给出 --text 或 --file"


def main():
    parser = argparse.ArgumentParser(
        description="Concretize ambiguous terms into concrete suggestions"
    )
    parser.add_argument("--text", help="待检文本")
    parser.add_argument("--file", help="待检文件路径")
    parser.add_argument("--json", action="store_true", help="输出 JSON")
    args = parser.parse_args()

    text, source, file_path, error = read_input(args)
    if error is not None:
        message = {"success": False, "error": error}
        if args.json:
            print(json.dumps(message, ensure_ascii=False, indent=2))
        else:
            sys.stderr.write("[concretize] 输入缺失：{}\n".format(error))
        return 1

    loaded, reason = load_dependency()
    if loaded is None:
        return fail_dependency(reason)
    words, classify = loaded

    result = build_result(text, source, file_path, words, classify)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(render_text(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
