#!/usr/bin/env python3
"""
verify_chinese.py
中文输出硬断言门禁：对剥离后的「待检正文」做三项断言，全部通过才 Exit 0。

三项断言（缺一不可）：
  1. 待检正文的 CJK 字符占比 >= --min-cjk-ratio（默认 0.85）；
  2. 待检正文中的非白名单拉丁词数量 == 0（严格档，没有宽容参数）；
  3. 独立大写缩写（>=2 连续大写字母）必须给出中文释义：
     子判据甲 —— 每次出现后 12 字内必须有中文；
     子判据乙 —— 同一缩写的首次出现必须带中文释义结构
                 （例如 模型上下文协议（MCP）/ MCP：模型上下文协议 / MCP 即 模型上下文协议）。

占比口径：cjk_ratio = CJK 字符数 / 待检正文中「非空白、非标点、非符号」的字符数。
这样中文标点、空白与符号不会稀释分母；拉丁字母与数字计入分母，夹英文会立刻拉低占比。

白名单只豁免断言 2，不豁免断言 3：MCP 这类白名单缩写若不给中文全称，照样判违规。

剥离器通过 importlib 直接加载同仓库脚本
skills/strip-non-prose-scope/scripts/strip_scope.py（不起子进程）。

Exit Code:
  0 - 三项断言全部通过；
  1 - 存在违规；
  2 - 输入缺失、文件不存在不可读，或剥离器不可用。
"""

import os
import re
import sys
import json
import argparse
import importlib.util
import unicodedata

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
STRIP_SCRIPT = os.path.join(REPO_ROOT, "skills/strip-non-prose-scope/scripts/strip_scope.py")

# 拉丁词：以字母开头，后续允许字母、数字、下划线与连字符。
LATIN_WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9_\-]*")

# 独立大写缩写：>=2 连续大写字母，且左右不与其他字母数字相连。
ABBR_RE = re.compile(r"(?<![A-Za-z0-9])[A-Z]{2,}(?![A-Za-z0-9])")

# 释义结构（缩写之后）：紧跟括号或冒号起头的，或紧跟「即 / 也就是 / 是指 / 是 / 表示 / 意为 / 全称」起头的。
AFTER_GLOSS_RE = re.compile(
    r"^[ \t]*(?:[（(：:][ \t]*[\u4e00-\u9fff]"
    r"|(?:即|也就是|是指|是|表示|意为|全称)[ \t]*[\u4e00-\u9fff])"
)

# 释义结构（缩写之前）：中文全称后紧跟左括号，缩写被包在括号里，如「模型上下文协议（MCP）」。
BEFORE_GLOSS_RE = re.compile(r"[\u4e00-\u9fff][ \t]*[（(][ \t]*$")

CJK_RANGES = (
    (0x3400, 0x4DBF),    # 中日韩统一表意文字扩展甲
    (0x4E00, 0x9FFF),    # 中日韩统一表意文字
    (0xF900, 0xFAFF),    # 中日韩兼容表意文字
    (0x20000, 0x2FA1F),  # 扩展乙及以后
)


def is_cjk(char):
    """判断单字符是否属于 CJK 表意文字。"""
    code = ord(char)
    for low, high in CJK_RANGES:
        if low <= code <= high:
            return True
    return False


def is_prose_char(char):
    """判断单字符是否计入占比分母：排除空白、标点、符号与控制字符。"""
    if char.isspace():
        return False
    return unicodedata.category(char)[0] not in ("P", "S", "Z", "C")


def make_snippet(text, start, end, width=20):
    """截取违规位置附近的可读片段，压缩换行以便单行展示。"""
    left = max(0, start - width)
    right = min(len(text), end + width)
    return re.sub(r"\s+", " ", text[left:right]).strip()


def load_strip_module():
    """以 importlib 加载剥离器脚本，返回 (模块, 错误信息)；成功时错误信息为 None。"""
    if not os.path.exists(STRIP_SCRIPT):
        return None, f"剥离器脚本不存在: {STRIP_SCRIPT}"
    try:
        spec = importlib.util.spec_from_file_location("strip_non_prose_scope", STRIP_SCRIPT)
        if spec is None or spec.loader is None:
            raise ImportError("spec 构建失败")
        module = importlib.util.module_from_spec(spec)
        # 加载期间关闭字节码落盘，避免在剥离器技能目录里写入 __pycache__。
        previous = sys.dont_write_bytecode
        sys.dont_write_bytecode = True
        try:
            spec.loader.exec_module(module)
        finally:
            sys.dont_write_bytecode = previous
        if not callable(getattr(module, "strip_scope", None)):
            raise ImportError("strip_scope 函数缺失")
        if not callable(getattr(module, "build_whitelist", None)):
            raise ImportError("build_whitelist 函数缺失")
        return module, None
    except Exception as exc:  # 加载失败一律按输入侧问题处理
        return None, f"剥离器加载失败: {exc}"


def verify_text(text, min_cjk_ratio=0.85, allow=None, module=None):
    """执行三项断言，返回五字段结果字典。"""
    if module is None:
        module, error = load_strip_module()
        if error:
            raise RuntimeError(error)

    payload = module.strip_scope(text, allow=allow)
    scope = payload["scope_text"]
    whitelist = {item.lower() for item in module.build_whitelist(allow)}

    prose_chars = [char for char in scope if is_prose_char(char)]
    cjk_count = sum(1 for char in prose_chars if is_cjk(char))
    # 待检正文为空（全部成分被豁免）时无可判内容，占比记为 1.0。
    ratio = (cjk_count / len(prose_chars)) if prose_chars else 1.0

    violations = []

    # 断言一：中文占比。
    ratio_pass = ratio >= min_cjk_ratio
    if not ratio_pass:
        violations.append({
            "kind": "cjk_ratio",
            "token": f"{ratio:.4f}",
            "index": -1,
            "snippet": f"待检正文中文占比 {ratio:.4f} 低于阈值 {min_cjk_ratio:.4f}",
        })

    # 断言二：非白名单拉丁词零容忍。
    latin_hits = []
    for match in LATIN_WORD_RE.finditer(scope):
        token = match.group(0)
        if token.lower() in whitelist:
            continue
        if module.is_identifier(token):
            continue
        latin_hits.append(token)
        violations.append({
            "kind": "latin_word",
            "token": token,
            "index": match.start(),
            "snippet": make_snippet(scope, match.start(), match.end()),
        })

    # 断言三：独立大写缩写必须有中文释义。
    abbr_total = 0
    abbr_first_seen = set()
    abbr_violations = 0
    for match in ABBR_RE.finditer(scope):
        token = match.group(0)
        start, end = match.start(), match.end()

        # 把缩写片段扩回完整 token：REQ-BUTLER-… 不应被拆成 REQ / BUTLER 两个缩写。
        left, right = start, end
        while left > 0 and (scope[left - 1].isalnum() or scope[left - 1] in "_-"):
            left -= 1
        while right < len(scope) and (scope[right].isalnum() or scope[right] in "_-"):
            right += 1
        full_token = scope[left:right]
        if module.is_identifier(full_token) or module.is_gloss_exempt(token):
            continue

        abbr_total += 1

        window = scope[end:end + 12]
        has_cjk_after = any(is_cjk(char) for char in window)
        if not has_cjk_after:
            abbr_violations += 1
            violations.append({
                "kind": "abbr_no_gloss",
                "token": token,
                "index": start,
                "snippet": ("缩写后 12 字内无中文：" + make_snippet(scope, start, end)),
            })
            abbr_first_seen.add(token)
            continue

        if token in abbr_first_seen:
            continue
        abbr_first_seen.add(token)

        before = scope[max(0, start - 12):start]
        after = scope[end:]
        glossed = bool(AFTER_GLOSS_RE.match(after)) or bool(BEFORE_GLOSS_RE.search(before))
        if not glossed:
            abbr_violations += 1
            violations.append({
                "kind": "abbr_no_gloss",
                "token": token,
                "index": start,
                "snippet": ("缩写首现缺少中文释义：" + make_snippet(scope, start, end)),
            })

    checks = [
        {
            "name": "cjk_ratio",
            "pass": ratio_pass,
            "detail": (f"待检正文中文占比 {ratio:.4f}，阈值 {min_cjk_ratio:.4f}"
                       f"（CJK {cjk_count} 字 / 正交字符 {len(prose_chars)} 字）"),
        },
        {
            "name": "no_latin_word",
            "pass": not latin_hits,
            "detail": (f"非白名单拉丁词 {len(latin_hits)} 个"
                       + ("：" + "、".join(latin_hits[:10]) if latin_hits else "")),
        },
        {
            "name": "abbr_gloss",
            "pass": abbr_violations == 0,
            "detail": (f"独立大写缩写 {abbr_total} 处，其中缺中文释义 {abbr_violations} 处"),
        },
    ]

    return {
        "success": not violations,
        "cjk_ratio": round(ratio, 4),
        "scope_len": len(scope),
        "violations": violations,
        "checks": checks,
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
    parser = argparse.ArgumentParser(description="中文输出三项硬断言门禁")
    parser.add_argument("--text", help="待检文本")
    parser.add_argument("--file", help="待检文件路径")
    parser.add_argument("--min-cjk-ratio", type=float, default=0.85,
                        help="待检正文中文占比下限，默认 0.85")
    parser.add_argument("--allow", default="", help="追加白名单，逗号分隔")
    parser.add_argument("--json", action="store_true", help="以 JSON 输出")
    args = parser.parse_args(argv)

    text, error = read_input(args)
    if error:
        _emit_error(args.json, error)
        return 2

    module, error = load_strip_module()
    if error:
        _emit_error(args.json, error)
        return 2

    try:
        result = verify_text(text, min_cjk_ratio=args.min_cjk_ratio,
                             allow=args.allow, module=module)
    except RuntimeError as exc:
        _emit_error(args.json, str(exc))
        return 2

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        for item in result["checks"]:
            print(f"{'✅' if item['pass'] else '❌'} {item['name']}: {item['detail']}")
        for violation in result["violations"]:
            print(f"   - {violation['kind']} | {violation['token']} | "
                  f"位置 {violation['index']} | {violation['snippet']}")
        print("✅ 三项断言全部通过，可交付" if result["success"]
              else "❌ 存在违规，禁止交付")
    return 0 if result["success"] else 1


def _emit_error(as_json, message):
    """统一输出输入侧错误。"""
    if as_json:
        print(json.dumps({"success": False, "error": message},
                         ensure_ascii=False, indent=2))
    else:
        print(f"❌ {message}", file=sys.stderr)


if __name__ == "__main__":
    sys.exit(main())
