#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
measure_tokens.py
确定性 token 占用测算：按唯一标准公式把文本与文件折算为 token 数，并按来源分区汇总。

估算公式（唯一标准，全池三脚本一致）：
    汉字约 1 token/字，ASCII 约 4 字节 1 token。
    这是确定性估算，不是真实分词器：同一输入恒得同一数值，可复算、可对拍，但不等于模型实际分词结果。

Exit Code:
  0 - 测算成功
  1 - --paths 中存在不存在的路径（或不是普通文件）
"""

import os
import re
import sys
import json
import math
import argparse

PARTITION_KEYS = ("skill_contract", "readme", "catalog", "docs", "other")


def est_tokens(text: str) -> int:
    cjk = sum(1 for ch in text if '\u4e00' <= ch <= '\u9fff')
    ascii_bytes = sum(1 for ch in text if ord(ch) < 128)
    return math.ceil(cjk + ascii_bytes / 4)


def classify(path: str) -> str:
    """按路径判定来源类型：技能契约 / README / Catalog / docs / 其他。"""
    norm = str(path).replace("\\", "/")
    base = os.path.basename(norm)
    if re.search(r"(^|/)skills/[^/]+/SKILL\.md$", norm):
        return "skill_contract"
    if re.search(r"(^|/)skills/[^/]+/README\.md$", norm):
        return "readme"
    if re.search(r"skills?-(?:catalog|index)", base):
        return "catalog"
    if re.search(r"(^|/)docs/", norm):
        return "docs"
    return "other"


def read_utf8(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        return fh.read()


def build_item(path: str, text: str) -> dict:
    return {
        "path": path,
        "bytes": len(text.encode("utf-8")),
        "tokens": est_tokens(text),
        "type": classify(path),
    }


def build_payload(items) -> dict:
    partitions = {key: 0 for key in PARTITION_KEYS}
    total_tokens = 0
    total_bytes = 0
    for item in items:
        total_tokens += item["tokens"]
        total_bytes += item["bytes"]
        partitions[item["type"]] = partitions.get(item["type"], 0) + item["tokens"]
    return {
        "total_tokens": total_tokens,
        "total_bytes": total_bytes,
        "items": items,
        "partitions": partitions,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Deterministic token budget measurement")
    parser.add_argument("--paths", nargs="+", default=[], help="待测算文件列表")
    parser.add_argument("--text", default=None, help="直接测算一段文本")
    parser.add_argument("--json", action="store_true", help="输出 JSON（本脚本恒输出 JSON）")
    args = parser.parse_args()

    if not args.paths and args.text is None:
        print(json.dumps({"success": False, "error": "需要 --paths 或 --text 之一"},
                         ensure_ascii=False, indent=2))
        return 1

    missing = [p for p in args.paths if not os.path.isfile(p)]
    if missing:
        print(json.dumps({"success": False, "missing_paths": missing,
                          "error": "存在不存在的路径，测算中止"},
                         ensure_ascii=False, indent=2))
        return 1

    items = []
    for path in args.paths:
        items.append(build_item(path, read_utf8(path)))
    if args.text is not None:
        items.append(build_item("<text>", args.text))

    print(json.dumps(build_payload(items), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
