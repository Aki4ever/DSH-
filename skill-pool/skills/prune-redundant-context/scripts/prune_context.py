#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
prune_context.py
保守语义无损裁剪：折叠连续重复行、重复段落与连续空行，同时保护受管区块与需求编号/表格行。

裁剪规则（保守，语义无损）：
  1. 连续重复行只保留 1 行，并以 `<!-- ×N -->` 标注原出现次数；
  2. 完全相同的段落（连续 >=3 行且出现 >=2 次）只保留首次出现，其余替为一行 `<!-- 重复段落已折叠 ×N -->`；
  3. 连续空行折叠为 1 行；
  4. `<!-- CATALOG:BEGIN ... -->` 与 `<!-- CATALOG:END -->` 之间（含首尾标记行）的内容**逐字节不变**；
  5. 输入位于 `docs/requirements/` 时，编号行、需求 ID 行与表格行一律不动。

幂等保证：内部迭代至不动点，对同一输入连跑两次，第二次 saved_tokens 必为 0。

token 估算公式（唯一标准，全池三脚本一致）：汉字约 1 token/字，ASCII 约 4 字节 1 token。
该数值是确定性估算，不是真实分词器。

Exit Code:
  0 - 裁剪成功（含零改动）
  1 - 输入不存在
"""

import os
import re
import sys
import json
import math
import argparse

MAX_ITER = 8

CATALOG_BEGIN_RE = re.compile(r"^\s*<!--\s*CATALOG:BEGIN\b.*-->\s*$")
CATALOG_END_RE = re.compile(r"^\s*<!--\s*CATALOG:END\s*-->\s*$")
REQ_NUMBER_RE = re.compile(r"^\s*(?:\d+(?:\.\d+)*[.)]?|[（(]\d+[)）]|[①-⑳])\s*\S")
REQ_ID_RE = re.compile(r"REQ-[A-Za-z0-9][A-Za-z0-9._-]*")
REQ_TABLE_ROW_RE = re.compile(r"^\s*\|")

SENTINEL_PREFIX = "\x00PROTECTED:"
SENTINEL = SENTINEL_PREFIX + "%d\x00"
DUP_LINE_SUFFIX = " <!-- ×%d -->"
DUP_PARA_MARK = "<!-- 重复段落已折叠 ×%d -->"


def est_tokens(text: str) -> int:
    cjk = sum(1 for ch in text if '\u4e00' <= ch <= '\u9fff')
    ascii_bytes = sum(1 for ch in text if ord(ch) < 128)
    return math.ceil(cjk + ascii_bytes / 4)


def count_lines(text: str) -> int:
    return len(text.split("\n"))


def is_requirement_path(path: str) -> bool:
    return "docs/requirements" in str(path).replace("\\", "/")


def protect_lines(lines, requirement_mode: bool):
    """把受管区块与受保护行替换为唯一哨兵行，返回 (哨兵行列表, 原行表)。"""
    store = []
    out = []
    in_catalog = False
    for line in lines:
        if CATALOG_BEGIN_RE.match(line):
            in_catalog = True
        protected = in_catalog
        if not protected and requirement_mode:
            protected = bool(
                REQ_NUMBER_RE.match(line)
                or REQ_TABLE_ROW_RE.match(line)
                or REQ_ID_RE.search(line)
            )
        if protected:
            store.append(line)
            out.append(SENTINEL % (len(store) - 1))
        else:
            out.append(line)
        if CATALOG_END_RE.match(line):
            in_catalog = False
    return out, store


def restore_lines(lines, store):
    restored = []
    for line in lines:
        if line.startswith(SENTINEL_PREFIX) and line.endswith("\x00"):
            try:
                restored.append(store[int(line[len(SENTINEL_PREFIX):-1])])
                continue
            except (ValueError, IndexError):
                pass
        restored.append(line)
    return restored


def fold_duplicate_paragraphs(lines):
    """连续 >=3 行且出现 >=2 次的段落：保留首次出现，其余替为一行折叠标记。"""
    blocks = []
    i = 0
    while i < len(lines):
        if lines[i].strip() == "":
            i += 1
            continue
        j = i
        while j + 1 < len(lines) and lines[j + 1].strip() != "":
            j += 1
        if j - i + 1 >= 3:
            blocks.append((i, j))
        i = j + 1

    keyed = {}
    for start, end in blocks:
        keyed.setdefault("\n".join(lines[start:end + 1]), []).append((start, end))

    replacements = {}
    collapsed = 0
    for spans in keyed.values():
        if len(spans) < 2:
            continue
        for start, end in spans[1:]:
            replacements[start] = (end, DUP_PARA_MARK % len(spans))
            collapsed += 1
    if not replacements:
        return lines, 0

    out = []
    idx = 0
    while idx < len(lines):
        if idx in replacements:
            end, marker = replacements[idx]
            out.append(marker)
            idx = end + 1
            continue
        out.append(lines[idx])
        idx += 1
    return out, collapsed


def fold_duplicate_lines(lines):
    """连续重复的非空行只保留 1 行，并标注原出现次数。"""
    out = []
    folded = 0
    i = 0
    while i < len(lines):
        j = i
        if lines[i].strip() != "":
            while j + 1 < len(lines) and lines[j + 1] == lines[i]:
                j += 1
        run = j - i + 1
        if run >= 2:
            out.append(lines[i] + DUP_LINE_SUFFIX % run)
            folded += 1
        else:
            out.append(lines[i])
        i = j + 1
    return out, folded


def collapse_blank_lines(lines):
    """连续空行折叠为 1 行。"""
    out = []
    removed = 0
    prev_blank = False
    for line in lines:
        blank = line.strip() == ""
        if blank and prev_blank:
            removed += 1
            continue
        prev_blank = blank
        out.append(line)
    return out, removed


def prune_lines(lines):
    """迭代至不动点，保证对输出再跑一次必然零改动（幂等）。"""
    rules = {"dup_line": 0, "dup_paragraph": 0, "blank": 0}
    current = list(lines)
    for _ in range(MAX_ITER):
        nxt, dup_para = fold_duplicate_paragraphs(current)
        rules["dup_paragraph"] += dup_para
        nxt, dup_line = fold_duplicate_lines(nxt)
        rules["dup_line"] += dup_line
        nxt, blank = collapse_blank_lines(nxt)
        rules["blank"] += blank
        if nxt == current:
            return current, rules
        current = nxt
    return current, rules


def prune_text(text: str, sources):
    """返回 (统计报告, 裁剪后文本)；受保护内容逐字节还原。"""
    requirement_mode = any(is_requirement_path(p) for p in sources)
    guarded, store = protect_lines(text.split("\n"), requirement_mode)
    pruned, rules = prune_lines(guarded)
    result = "\n".join(restore_lines(pruned, store))

    before_tokens = est_tokens(text)
    after_tokens = est_tokens(result)
    saved_tokens = before_tokens - after_tokens
    report = {
        "before_tokens": before_tokens,
        "after_tokens": after_tokens,
        "saved_tokens": saved_tokens,
        "saved_ratio": round(saved_tokens / before_tokens, 4) if before_tokens else 0.0,
        "removed_lines": count_lines(text) - count_lines(result),
        "rules_applied": rules,
    }
    return report, result


def read_utf8(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        return fh.read()


def main() -> int:
    parser = argparse.ArgumentParser(description="Conservative semantic-lossless context pruning")
    parser.add_argument("--in", dest="infile", default=None, help="单个输入文件")
    parser.add_argument("--paths", nargs="+", default=None, help="多个输入文件（按序拼接后统一裁剪）")
    parser.add_argument("--out", required=True, help="输出文件路径")
    parser.add_argument("--json", action="store_true", help="输出 JSON（本脚本恒输出 JSON）")
    args = parser.parse_args()

    sources = list(args.paths or [])
    if args.infile:
        sources.append(args.infile)
    if not sources:
        print(json.dumps({"success": False, "error": "需要 --in 或 --paths 之一"},
                         ensure_ascii=False, indent=2))
        return 1

    missing = [p for p in sources if not os.path.isfile(p)]
    if missing:
        print(json.dumps({"success": False, "missing_inputs": missing,
                          "error": "输入不存在，裁剪中止"}, ensure_ascii=False, indent=2))
        return 1

    chunks = []
    for path in sources:
        content = read_utf8(path)
        if chunks and not chunks[-1].endswith("\n"):
            chunks.append("\n")
        chunks.append(content)

    report, result = prune_text("".join(chunks), sources)

    out_dir = os.path.dirname(os.path.abspath(args.out))
    if out_dir and not os.path.isdir(out_dir):
        os.makedirs(out_dir, exist_ok=True)
    with open(args.out, "w", encoding="utf-8", newline="") as fh:
        fh.write(result)

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
