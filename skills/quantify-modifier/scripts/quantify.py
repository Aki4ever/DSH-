#!/usr/bin/env python3
"""
quantify.py
按场景把程度类修饰词替换为可判定的数值区间，无映射的落 unquantifiable 并要求显式声明假设。

量化来源：docs/operations/quantifier-table.json 的 (term, domain) 条目，
每条已含四要素 term / domain / quantified / unit / basis；本脚本只做查表与拼装，不发明数值。

三条纪律：
  1. **场景优先**：指定 --domain 才查表。未指定场景时不替用户挑场景 —— 命中词一律落
     unquantifiable，并在建议里列出候选场景，要求调用方先声明场景与假设。
  2. **不可量化不得沉默**：无映射时输出 unquantifiable 并给出「需声明假设」提示，
     **但不以命中决定退出码、也不阻断交付**（公开基准确实不存在时，阻断只会惩罚诚实）。
  3. **保留原词**：替换文本保留原词并附「→ 数值 单位（依据：…）」，禁止用另一个程度词替换
     （「很快」→「非常快」不合格）。

词表来自唯一真相源 skills/detect-vague-modifier/scripts/detect_vague.py（importlib 进程内加载，不起子进程）。

Exit Code:
  0 - 处理完成（有多少 unquantifiable 都不影响退出码，断言交给 verify 层）
  1 - 输入缺失（既无 --text 也无 --file），或 --file 指向的文件不存在/不可读
"""

import os
import re
import sys
import json
import argparse
import importlib.util

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.."))
DETECT_SCRIPT = os.path.join(REPO_ROOT, "skills/detect-vague-modifier/scripts/detect_vague.py")

# 程度词叠用（用另一个程度词替换程度词）的识别，仅用于在建议里提示禁令。
INTENSIFIER_RE = re.compile(
    r"(?:很|非常|极其|极为|特别|十分|相当|格外|尤其|超级|太|挺|更|更加|过于|极其)"
)


def load_detector():
    """importlib 加载唯一真相源模块，返回 (module, error)；成功时 error 为 None。"""
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
        for attr in ("scan", "load_quantifier_table", "find_mapping", "CATEGORY_DEGREE"):
            if not hasattr(module, attr):
                raise ImportError("检测器缺少 {} 导出".format(attr))
        return module, None
    except Exception as exc:  # 加载失败按输入侧问题处理
        return None, "检测器加载失败: {}".format(exc)


def candidate_domains(term, table):
    """列出该词在映射表里已有的场景，供「场景未声明」时提示候选。"""
    domains = []
    for entry in (table or {}).get("entries", []):
        if entry.get("term") == term and entry.get("domain") not in domains:
            domains.append(entry.get("domain"))
    return domains


def quantify(text, domain=None, table=None, detector=None):
    """对文本做量化替换建议，返回 (substituted, unquantifiable, stats)。"""
    result = detector.scan(text, domain=domain, table=table)
    degree_hits = [h for h in result["hits"] if h["category"] == detector.CATEGORY_DEGREE]

    substituted = []
    unquantifiable = []

    for hit in degree_hits:
        term = hit["term"]
        entry = detector.find_mapping(term, domain, table) if domain else None

        if entry is not None:
            value = "{} {}".format(entry["quantified"], entry["unit"]).strip()
            substituted.append({
                "term": term,
                "from": term,
                "to": value,
                "basis": entry["basis"],
                "line": hit["line"],
                "suggestion": "{} → {}（依据：{}）".format(term, value, entry["basis"]),
            })
            continue

        if domain:
            suggestion = (
                "场景「{}」下未找到「{}」的量化映射：需显式声明假设"
                "（写明取值、单位与依据），不得用另一个程度词替换".format(domain, term)
            )
            if INTENSIFIER_RE.search(text[max(0, hit["index"] - 4):hit["index"] + len(term) + 4]):
                suggestion += "；检测到程度词叠用，属「用另一个程度词替换程度词」，一律不合格"
        else:
            candidates = candidate_domains(term, table)
            suggestion = "未指定场景，禁止替用户挑选场景：需先声明 --domain 与假设"
            if candidates:
                suggestion += "；该词已有场景映射（{}），请指明适用场景".format("、".join(candidates))
            else:
                suggestion += "；映射表中该词暂无任何场景条目"

        unquantifiable.append({
            "term": term,
            "line": hit["line"],
            "suggestion": suggestion,
        })

    stats = {
        "degree_hits": len(degree_hits),
        "replaced": len(substituted),
        "unquantifiable": len(unquantifiable),
    }
    return substituted, unquantifiable, stats


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
    parser = argparse.ArgumentParser(description="按场景把程度词替换为数值区间")
    parser.add_argument("--text", help="待检文本")
    parser.add_argument("--file", help="待检文件路径")
    parser.add_argument("--domain", help="场景名，如 接口响应 / 单表数据量 / 代码库")
    parser.add_argument("--json", action="store_true", help="以 JSON 输出结果")
    args = parser.parse_args()

    text, error = read_input(args)
    if error:
        print(json.dumps({"success": False, "error": error}, ensure_ascii=False, indent=2))
        return 1

    detector, load_error = load_detector()
    if load_error:
        print(json.dumps({"success": False, "error": load_error}, ensure_ascii=False, indent=2))
        return 1

    table, table_error = detector.load_quantifier_table()
    substituted, unquantifiable, stats = quantify(text, domain=args.domain, table=table, detector=detector)

    payload = {
        "success": True,
        "domain": args.domain,
        "substituted": substituted,
        "unquantifiable": unquantifiable,
        "stats": stats,
        "table_version": (table or {}).get("table_version"),
        "table_error": table_error,
    }

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    print("场景 {}：程度词命中 {} 处，已量化替换 {} 处，待声明假设 {} 处".format(
        args.domain or "(未指定)", stats["degree_hits"], stats["replaced"], stats["unquantifiable"]))
    for item in substituted:
        print("  [已量化] 第 {line} 行 {suggestion}".format(**item))
    for item in unquantifiable:
        print("  [unquantifiable] 第 {line} 行 {term}：{suggestion}".format(**item))
    return 0


if __name__ == "__main__":
    sys.exit(main())
