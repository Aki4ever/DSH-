#!/usr/bin/env python3
"""
strip_scope.py
非散文成分剥离器：为「中文占比」断言产出可信的待检正文。

剥离顺序固定，不可交换（交换会让 URL 被误判成文件路径）：
  1. ``` 围栏代码块；
  2. 行内反引号内容；
  3. URL（http / https / ftp / mailto）；
  4. 文件路径（含 / 的 token，例如 docs/x.md、bin/skill-pool）。

设计前提：本仓库技术文档实测中文占比只有 25%~40%，拉丁字母几乎全是路径、命令、
JSON 键与技能 id。因此「纯中文」判定必须先剥离上述非散文成分再断言，禁止按整体
字符占比一刀切——否则任何一份合格的技术交付都会被误判为违规。

stdout 契约：
  默认（不带 --json）- 打印中文可读摘要，含待检正文与四类剥离计数；
  带 --json         - 打印 {"scope_text","stripped","whitelist_hits"} 三字段 JSON。

Exit Code:
  0 - 剥离成功；
  1 - 输入缺失（既无 --text 也无 --file），或 --file 指向的文件不存在 / 不可读。
"""

import os
import re
import sys
import json
import argparse

# 内置白名单：这些专有名词即使留在待检正文中也不计入「非白名单拉丁词」。
DEFAULT_WHITELIST = [
    "DSH", "JSON", "YAML", "BM25", "CLI", "API", "MCP", "HTML", "CSS", "SVG",
    "PNG", "JPEG", "README", "SKILL", "catalog", "index", "token", "agent",
    "plugin", "git", "GitHub", "Python",
    # 中文技术写作中的常见借词：它们是行业通用词，不是「外文表达」
    "Bug", "Web", "KB", "MB", "GB", "TB", "bundle", "Node", "Shell", "Log",
    "Debug", "Cache", "Cookie", "Session", "SQL", "CSV", "XML", "TOML",
    "Markdown", "npm", "pnpm", "pip", "macOS", "Windows", "Linux",
    "DeepSeek", "OpenAI", "HTTP", "HTTPS", "URL", "URI", "UUID", "ID",
]

# 无需中文释义的「已汉化缩写」：这些缩写在中文技术写作里已等同中文词，
# 强制要求首现中文全称只会制造噪声。需要释义的那一类（DSH/MCP/BM25/JSON…）不在此列。
GLOSS_EXEMPT = {
    "ID", "URL", "URI", "UUID", "HTTP", "HTTPS", "SQL", "CSV", "XML", "TOML",
    "KB", "MB", "GB", "TB", "API", "CLI", "CSS", "HTML", "PNG", "JPEG", "SVG",
}

# 技术标识符模式：编号、kebab-case id、版本号。它们不是「外文词」，
# 也不应被拆成缩写片段去做「首现必须有中文全称」的判定。
IDENTIFIER_PATTERNS = [
    r"^REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*$",    # 需求编号：REQ-BUTLER-QUANTIFY-023
    r"^PKG-\d+$",                          # 执行包：PKG-005
    r"^CHG-\d+$",                          # 变更记录：CHG-011
    r"^AP-\d+$",                           # 反例编号：AP-01
    r"^AMEND-\d+$",                        # 需求修正：AMEND-11
    r"^TC-[A-Z0-9]+(?:-[A-Z0-9]+)*$",     # 用例编号：TC-FINAL5-001
    r"^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d+$",  # 项目内简写编号：ONDEMAND-015 / UTF-8
    r"^[a-z0-9]+(?:-[a-z0-9]+)+$",        # kebab-case 技能 id / 文件名主干
    r"^v?\d+(?:\.\d+)*$",                # 版本号：v0.2.0
]
_IDENTIFIER_RES = [re.compile(pattern) for pattern in IDENTIFIER_PATTERNS]


def is_identifier(token):
    """token 是否属于技术标识符（编号 / kebab-case id / 版本号）。"""
    if not token:
        return False
    return any(rx.match(token) for rx in _IDENTIFIER_RES)


def is_gloss_exempt(token):
    """token 是否属于已汉化缩写（无需中文全称）。"""
    return bool(token) and token.upper() in GLOSS_EXEMPT

# 第 1 类：``` 或 ~~~ 围栏代码块（含未闭合到文末的围栏）。
FENCE_RE = re.compile(r"^[ \t]*(?:```|~~~)[^\n]*\n(?:.*?^[ \t]*(?:```|~~~)[ \t]*$|.*\Z)",
                      re.DOTALL | re.MULTILINE)

# 第 2 类：行内反引号内容（单反引号或双反引号包裹）。
INLINE_CODE_RE = re.compile(r"`+[^`\n]*`+")

# 第 3 类：URL，覆盖 http / https / ftp / mailto。
URL_RE = re.compile(r"(?:(?:https?|ftp)://|mailto:)[^\s<>\"'）)】〉」]+")

# 第 4 类：文件路径。只认「由 ASCII 路径字符与 / 组成、且至少含一个 ASCII 字母数字」的 token，
# 这样既能剥离 docs/x.md、bin/skill-pool、skills/a/scripts/b.py，又不会误剥中文里的「和/或」。
PATH_RE = re.compile(r"[A-Za-z0-9._~@%+\-]*/(?:[A-Za-z0-9._~@%+\-]*/?)*")

# 拉丁词：以字母开头，后续允许字母、数字、下划线与连字符。
LATIN_WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9_\-]*")


def build_whitelist(allow=None):
    """合并内置白名单与 --allow 追加项，去重并保持声明顺序。"""
    merged = list(DEFAULT_WHITELIST)
    if allow:
        if isinstance(allow, str):
            extra = allow.split(",")
        else:
            extra = list(allow)
        for item in extra:
            word = item.strip()
            if word and word not in merged:
                merged.append(word)
    return merged


def _strip_paths(text):
    """剥离文件路径 token，返回 (新文本, 剥离个数)。"""
    count = 0

    def replace(match):
        nonlocal count
        token = match.group(0)
        # 必须含至少一个 ASCII 字母或数字，且不能只是孤立的斜杠。
        if not re.search(r"[A-Za-z0-9]", token):
            return token
        count += 1
        return " "

    return PATH_RE.sub(replace, text), count


def _whitelist_hits(scope_text, whitelist):
    """统计剥离后正文中命中的白名单专有名词：大小写不敏感，去重保序。"""
    lookup = {}
    for entry in whitelist:
        lookup.setdefault(entry.lower(), entry)
    hits = []
    seen = set()
    for match in LATIN_WORD_RE.finditer(scope_text):
        key = match.group(0).lower()
        if key in lookup and key not in seen:
            seen.add(key)
            hits.append(lookup[key])
    return hits


def strip_scope(text, allow=None):
    """按固定顺序剥离四类非散文成分，返回三字段结果字典。"""
    whitelist = build_whitelist(allow)
    scope = text

    scope, n_fence = FENCE_RE.subn(" ", scope)
    scope, n_inline = INLINE_CODE_RE.subn(" ", scope)
    scope, n_url = URL_RE.subn(" ", scope)
    scope, n_path = _strip_paths(scope)

    return {
        "scope_text": scope,
        "stripped": {
            "code_blocks": n_fence,
            "inline_code": n_inline,
            "urls": n_url,
            "paths": n_path,
        },
        "whitelist_hits": _whitelist_hits(scope, whitelist),
    }


def read_input(args):
    """解析输入，返回 (文本, 错误信息)；成功时错误信息为 None。"""
    if args.file:
        if not os.path.exists(args.file):
            return None, f"文件不存在: {args.file}"
        try:
            with open(args.file, "r", encoding="utf-8") as handle:
                return handle.read(), None
        except (OSError, UnicodeDecodeError) as exc:
            return None, f"文件不可读: {exc}"
    if args.text is not None:
        return args.text, None
    return None, "输入缺失：必须提供 --text 或 --file 之一"


def main(argv=None):
    parser = argparse.ArgumentParser(description="剥离四类非散文成分，产出待检正文")
    parser.add_argument("--text", help="待剥离文本")
    parser.add_argument("--file", help="待剥离文件路径")
    parser.add_argument("--allow", default="", help="追加白名单，逗号分隔")
    parser.add_argument("--json", action="store_true", help="以 JSON 输出")
    args = parser.parse_args(argv)

    text, error = read_input(args)
    if error:
        if args.json:
            print(json.dumps({"success": False, "error": error},
                             ensure_ascii=False, indent=2))
        else:
            print(f"❌ {error}", file=sys.stderr)
        return 1

    result = strip_scope(text, allow=args.allow)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        stripped = result["stripped"]
        print("剥离计数："
              f"代码块 {stripped['code_blocks']} 处，"
              f"行内代码 {stripped['inline_code']} 处，"
              f"URL {stripped['urls']} 处，"
              f"文件路径 {stripped['paths']} 处")
        hits = result["whitelist_hits"]
        print("白名单命中：" + ("、".join(hits) if hits else "（无）"))
        print("待检正文：" + result["scope_text"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
