#!/usr/bin/env python3
"""
verify_quantified.py
量化输出断言门禁：三项断言全部通过才 Exit 0，否则退 1 并列出词与行号。

三项断言（缺一不可）：
  1. no_unquantified_degree —— 文本中不存在「未量化」的程度词：每一处程度词命中，
     其上下文窗口（前 24 字 / 后 40 字）内必须出现可判定的量化表达式（数值 + 单位，
     如 >=180cm、P95<=200 ms、1 MB、20 条）。没有数值兜底的程度词一律违规。
  2. no_degree_word_replacement —— 文本中不存在「程度词被另一个程度词替换」的情形：
     程度强化词（很 / 非常 / 极其 / 特别 / 十分 / 相当 / 格外 / 尤其 / 超级 / 太 / 挺 /
     更 / 更加 / 过于）紧邻任意程度词（如「很快」「非常快」「极其严重」）即违规，
     因为它们替换前后的可判定性完全相同。
  3. mapping_required（仅 --require-mapping）—— 每个命中词都必须在量化映射表里找到
     domain 条目：指定 --domain 时必须存在该场景条目，未指定时存在任一场景条目即可。

词表与映射表读写都来自唯一真相源 skills/detect-vague-modifier/scripts/detect_vague.py
（importlib 进程内加载，不起子进程），本脚本不另写一套词表。

Exit Code:
  0 - 三项断言全部通过
  1 - 存在未量化程度词、程度词替换程度词，或缺失 domain 映射
  2 - 输入缺失（既无 --text 也无 --file / 文件不可读），或量化映射表不可读
"""

import os
import re
import sys
import json
import argparse
import importlib.util

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.."))
DETECT_SCRIPT = os.path.join(REPO_ROOT, "skills/detect-vague-modifier/scripts/detect_vague.py")

# 量化证据窗口：命中词前 24 字、后 40 字的范围内必须出现「数值 + 单位」。
WINDOW_BEFORE = 24
WINDOW_AFTER = 40

# 程度强化词：它们与程度词紧邻，等价于「用另一个程度词替换程度词」。
INTENSIFIERS = (
    "非常", "极其", "极为", "特别", "十分", "相当", "格外", "尤其",
    "超级", "更加", "过于", "很", "太", "挺", "更",
)

CHECK_UNQUANTIFIED = "no_unquantified_degree"
CHECK_REPLACEMENT = "no_degree_word_replacement"
CHECK_MAPPING = "mapping_required"


def load_detector():
    """importlib 加载唯一真相源模块，返回 (module, error)。"""
    if not os.path.exists(DETECT_SCRIPT):
        return None, "检测器脚本不存在: {}".format(DETECT_SCRIPT)
    try:
        spec = importlib.util.spec_from_file_location("detect_vague_modifier", DETECT_SCRIPT)
        if spec is None or spec.loader is None:
            raise ImportError("spec 构建失败")
        module = importlib.util.module_from_spec(spec)
        # 加载期间关闭字节码落盘，避免在检测器技能目录里写入 __pycache__。
        previous = sys.dont_write_bytecode
        sys.dont_write_bytecode = True
        try:
            spec.loader.exec_module(module)
        finally:
            sys.dont_write_bytecode = previous
        for attr in ("scan", "load_quantifier_table", "find_mapping", "DEGREE_WORDS",
                     "CATEGORY_DEGREE", "QUANTIFIED_RE"):
            if not hasattr(module, attr):
                raise ImportError("检测器缺少 {} 导出".format(attr))
        return module, None
    except Exception as exc:
        return None, "检测器加载失败: {}".format(exc)


def build_replacement_re(degree_words):
    """构造「程度强化词 + 程度词」紧邻判定正则，长词优先。"""
    degree_alt = "|".join(re.escape(w) for w in sorted(degree_words, key=lambda w: (-len(w), w)))
    intensifier_alt = "|".join(re.escape(w) for w in sorted(INTENSIFIERS, key=lambda w: (-len(w), w)))
    return re.compile("(?:{})(?:[ \\t\\u3000]{{0,1}})(?:{})".format(intensifier_alt, degree_alt))


def make_snippet(text, start, end, width=12):
    """截取命中附近片段，压缩换行，形如 …很快…。"""
    left = max(0, start - width)
    right = min(len(text), end + width)
    body = text[left:right].replace("\n", " ").replace("\r", " ")
    return "{}{}{}".format("…" if left > 0 else "", body, "…" if right < len(text) else "")


def line_of(text, offset):
    """把字符偏移换算为行号（从 1 开始）。"""
    return text.count("\n", 0, offset) + 1


def check_unquantified(text, detector, table, domain):
    """断言 1：逐处程度词命中检查上下文窗口内是否存在量化表达式。"""
    result = detector.scan(text, domain=domain, table=table)
    degree_hits = [h for h in result["hits"] if h["category"] == detector.CATEGORY_DEGREE]
    violations = []
    for hit in degree_hits:
        start = hit["index"]
        end = start + len(hit["term"])
        window = text[max(0, start - WINDOW_BEFORE):min(len(text), end + WINDOW_AFTER)]
        if detector.QUANTIFIED_RE.search(window):
            continue
        violations.append({"term": hit["term"], "line": hit["line"], "snippet": hit["snippet"]})
    detail = "程度词命中 {} 处".format(len(degree_hits))
    if violations:
        detail += "，其中 {} 处无量化证据：{}".format(
            len(violations),
            "、".join("{}（第 {} 行）".format(v["term"], v["line"]) for v in violations[:8]),
        )
    else:
        detail += "，全部在上下文窗口内带数值与单位"
    return violations, detail


def check_replacement(text, detector):
    """断言 2：程度强化词紧邻程度词即违规（很快 / 非常快 / 极其严重）。"""
    pattern = build_replacement_re(detector.DEGREE_WORDS)
    violations = []
    for match in pattern.finditer(text):
        violations.append({
            "term": match.group(0),
            "line": line_of(text, match.start()),
            "snippet": make_snippet(text, match.start(), match.end()),
        })
    detail = "未发现程度词叠用" if not violations else "发现 {} 处程度词替换程度词：{}".format(
        len(violations),
        "、".join("{}（第 {} 行）".format(v["term"], v["line"]) for v in violations[:8]),
    )
    return violations, detail


def check_mapping(text, detector, table, domain):
    """断言 3：每个命中词都必须能在映射表里找到 domain 条目。"""
    result = detector.scan(text, domain=domain, table=table)
    degree_hits = [h for h in result["hits"] if h["category"] == detector.CATEGORY_DEGREE]
    missing = []
    for hit in degree_hits:
        entry = detector.find_mapping(hit["term"], domain, table)
        if entry is None:
            missing.append((hit["term"], hit["line"]))
    detail = "命中词 {} 个".format(len({h["term"] for h in degree_hits}))
    if missing:
        detail += "，缺少映射：{}".format("、".join("{}（第 {} 行）".format(t, l) for t, l in missing[:8]))
    else:
        detail += "，全部在场景「{}」下找到映射".format(domain or "(任一场景)")
    return missing, detail


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
    parser = argparse.ArgumentParser(description="量化输出三项硬断言门禁")
    parser.add_argument("--text", help="待检文本")
    parser.add_argument("--file", help="待检文件路径")
    parser.add_argument("--domain", help="场景名，如 接口响应 / 单表数据量 / 代码库")
    parser.add_argument("--require-mapping", action="store_true",
                        help="额外要求每个命中词都能在映射表中找到 domain 条目")
    parser.add_argument("--json", action="store_true", help="以 JSON 输出结果")
    args = parser.parse_args()

    text, error = read_input(args)
    if error:
        print(json.dumps({"success": False, "error": error}, ensure_ascii=False, indent=2))
        return 2

    detector, load_error = load_detector()
    if load_error:
        print(json.dumps({"success": False, "error": load_error}, ensure_ascii=False, indent=2))
        return 2

    table, table_error = detector.load_quantifier_table()
    if table is None:
        print(json.dumps({"success": False, "error": table_error}, ensure_ascii=False, indent=2))
        return 2

    unquantified, unquantified_detail = check_unquantified(text, detector, table, args.domain)
    replacement, replacement_detail = check_replacement(text, detector)

    checks = [
        {"name": CHECK_UNQUANTIFIED, "pass": not unquantified, "detail": unquantified_detail},
        {"name": CHECK_REPLACEMENT, "pass": not replacement, "detail": replacement_detail},
    ]

    if args.require_mapping:
        missing, mapping_detail = check_mapping(text, detector, table, args.domain)
        checks.append({"name": CHECK_MAPPING, "pass": not missing, "detail": mapping_detail})

    success = all(check["pass"] for check in checks)
    payload = {"success": success, "unquantified": unquantified, "checks": checks}

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print("门禁结论：{}".format("通过" if success else "不通过"))
        for check in checks:
            print("  [{}] {} —— {}".format("PASS" if check["pass"] else "FAIL", check["name"], check["detail"]))
        for item in unquantified:
            print("  未量化：{}（第 {} 行）{}".format(item["term"], item["line"], item["snippet"]))

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
