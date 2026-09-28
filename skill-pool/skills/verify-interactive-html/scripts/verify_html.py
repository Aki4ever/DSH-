#!/usr/bin/env python3
"""verify_html.py — 静态断言交互查看器 HTML 是否满足可缩放可视化契约。

用法：
    python3 verify_html.py --file <html> [--json]

断言（全部通过才退出 0）：
    1. 文件存在且字节数 > 0；
    2. 含 data-zoom-in / data-zoom-out / data-zoom-reset 三个控制标识；
    2b. 多级缩放档位（PKG-008）：含 data-zoom-level（档位指示器）与 data-zoom-snap（吸附分支），
        data-zoom-levels 解析出的档位数 >= MIN_ZOOM_LEVELS，且 data-zoom-default 必须落在档位表内；
    2c. 下载交互（PKG-008）：含 data-download 与 data-download-name（扩展名须在白名单内：
        png/jpg/jpeg/svg/webp 为图片本体，html 为海报型产物导出自身），
        且源码同时具备 showSaveFilePicker 主路径与 Blob 降级路径；
    3. 含 <!DOCTYPE html / <html / </html> / <body / </body> 且标签成对；
    4. 无外部资源引用：src="http / href="http / url(http / <script src= / <link

注：xmlns 命名空间字符串不属于外部资源，本脚本刻意只匹配上面五类模式，不做泛化 http 扫描。

退出码：
    0  全部断言通过
    1  任一断言失败，或文件不可读
"""

import argparse
import json
import os
import re
import sys

REQUIRED_MARKERS = [
    "data-zoom-in",
    "data-zoom-out",
    "data-zoom-reset",
    "data-zoom-level",
    "data-zoom-snap",
    "data-download",
]

# 多级缩放：档位表最少档数。少于该值说明仍是「连续乘法」而非「离散档位」。
MIN_ZOOM_LEVELS = 5
# 下载扩展名白名单：图片本体五类 + HTML 海报型产物一类。
# 分开列是为了让「导出的是本体」这条约束可读：图片产品导图片，海报产品导它自己。
DOWNLOAD_EXT_WHITELIST = ("png", "jpg", "jpeg", "svg", "webp", "html")

LEVELS_ATTR_RE = re.compile(r'data-zoom-levels\s*=\s*"([^"]*)"')
DEFAULT_ATTR_RE = re.compile(r'data-zoom-default\s*=\s*"([^"]*)"')
DOWNLOAD_NAME_RE = re.compile(r'data-download-name\s*=\s*"([^"]*)"')

REQUIRED_TAGS = [
    "<!DOCTYPE html",
    "<html",
    "</html>",
    "<body",
    "</body>",
]

TAG_PAIRS = [
    ("<html", "</html>"),
    ("<body", "</body>"),
]

# 只匹配契约中列明的五类外部资源模式，避免把命名空间当成外链。
EXTERNAL_PATTERNS = [
    ("src_http", r'src\s*=\s*["\']?\s*http'),
    ("href_http", r'href\s*=\s*["\']?\s*http'),
    ("css_url_http", r"url\(\s*[\"']?\s*http"),
    ("script_src", r"<script[^>]*\ssrc\s*="),
    ("link_tag", r"<link[\s>/]"),
]

SNIPPET_RADIUS = 40


def make_check(name, passed, detail):
    return {"name": name, "pass": bool(passed), "detail": detail}


def scan_external(text):
    hits = []
    for name, pattern in EXTERNAL_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            start = max(0, match.start() - 8)
            end = min(len(text), match.end() + SNIPPET_RADIUS)
            snippet = text[start:end].replace("\n", " ")
            hits.append((name, pattern, snippet))
    return hits


def collect_checks(path):
    checks = []

    exists = os.path.isfile(path)
    checks.append(
        make_check("file_exists", exists, path if exists else "文件不存在: %s" % path)
    )
    if not exists:
        return checks

    try:
        size = os.path.getsize(path)
    except OSError as exc:
        checks.append(make_check("file_size_positive", False, "无法读取文件大小: %s" % exc))
        return checks

    checks.append(
        make_check("file_size_positive", size > 0, "字节数 = %d" % size)
    )
    if size <= 0:
        return checks

    try:
        with open(path, "rb") as handle:
            raw = handle.read()
    except OSError as exc:
        checks.append(make_check("file_readable", False, "读取失败: %s" % exc))
        return checks

    try:
        text = raw.decode("utf-8")
        checks.append(make_check("utf8_decodable", True, "UTF-8 解码成功"))
    except UnicodeDecodeError as exc:
        text = raw.decode("utf-8", errors="replace")
        checks.append(make_check("utf8_decodable", False, "非 UTF-8 字节: %s" % exc))

    for marker in REQUIRED_MARKERS:
        present = marker in text
        checks.append(
            make_check(
                "marker:%s" % marker,
                present,
                "命中" if present else "缺失控制标识 %s" % marker,
            )
        )

    for tag in REQUIRED_TAGS:
        present = tag in text
        checks.append(
            make_check("tag:%s" % tag, present, "命中" if present else "缺失标签 %s" % tag)
        )

    for open_tag, close_tag in TAG_PAIRS:
        opens = text.count(open_tag)
        closes = text.count(close_tag)
        paired = opens >= 1 and closes >= 1 and opens == closes
        checks.append(
            make_check(
                "pair:%s" % open_tag,
                paired,
                "开标签 %d 个 / 闭标签 %d 个" % (opens, closes),
            )
        )

    # 多级缩放档位：档位表非空、档数达标、默认档在表内
    levels_raw = LEVELS_ATTR_RE.search(text)
    levels = []
    if levels_raw:
        for piece in levels_raw.group(1).split(","):
            piece = piece.strip()
            if not piece:
                continue
            try:
                value = float(piece)
            except ValueError:
                continue
            if value > 0:
                levels.append(value)
    checks.append(
        make_check(
            "zoom_levels:count",
            len(levels) >= MIN_ZOOM_LEVELS,
            "解析到 %d 档（要求 >= %d）: %s"
            % (len(levels), MIN_ZOOM_LEVELS, ",".join("%g" % v for v in levels) or "无"),
        )
    )
    default_raw = DEFAULT_ATTR_RE.search(text)
    default_ok = False
    default_detail = "未找到 data-zoom-default"
    if default_raw:
        try:
            default_value = float(default_raw.group(1))
            default_ok = any(abs(default_value - v) < 1e-9 for v in levels)
            default_detail = "默认档 %g，%s档位表" % (
                default_value, "落在" if default_ok else "**不在**")
        except ValueError:
            default_detail = "data-zoom-default 不是数字: %s" % default_raw.group(1)
    checks.append(make_check("zoom_default:in_table", default_ok, default_detail))

    # 下载三段降级
    checks.append(
        make_check(
            "api:showSaveFilePicker",
            "showSaveFilePicker" in text,
            "命中主路径" if "showSaveFilePicker" in text else "缺失主路径（无法弹出目录选择控件）",
        )
    )
    has_blob = ("createObjectURL" in text) and ("download" in text)
    checks.append(
        make_check(
            "fallback:blob-download",
            has_blob,
            "命中降级路径" if has_blob else "缺失 Blob 降级路径（无该 API 的浏览器上将无反应）",
        )
    )
    name_raw = DOWNLOAD_NAME_RE.search(text)
    extension_ok = False
    extension_detail = "未找到 data-download-name"
    if name_raw:
        candidate = name_raw.group(1).strip()
        ext = candidate.rsplit(".", 1)[-1].lower() if "." in candidate else ""
        extension_ok = ext in DOWNLOAD_EXT_WHITELIST
        extension_detail = "下载文件名 %s（扩展名 %s %s白名单）" % (
            candidate, ext or "(无)", "在" if extension_ok else "**不在**")
    checks.append(make_check("filename:extension-whitelist", extension_ok, extension_detail))

    hits = scan_external(text)
    for name, pattern in EXTERNAL_PATTERNS:
        matched = [h for h in hits if h[0] == name]
        if matched:
            checks.append(
                make_check(
                    "no_external:%s" % name,
                    False,
                    "命中外部资源模式 %s，片段: ...%s..." % (pattern, matched[0][2]),
                )
            )
        else:
            checks.append(
                make_check("no_external:%s" % name, True, "未命中 %s" % pattern)
            )

    return checks


def render_human(result):
    lines = ["验证目标: %s" % result["file"], "结果: %s" % ("通过" if result["success"] else "失败")]
    for check in result["checks"]:
        lines.append(
            "  [%s] %s — %s"
            % ("PASS" if check["pass"] else "FAIL", check["name"], check["detail"])
        )
    return "\n".join(lines)


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="verify_html.py",
        description="静态断言交互查看器 HTML 契约",
    )
    parser.add_argument("--file", required=True, help="待校验的 HTML 文件路径")
    parser.add_argument(
        "--json",
        action="store_true",
        help="仅输出 JSON（缺省时额外把人类可读明细写到 stderr）",
    )
    args = parser.parse_args(argv)

    target = os.path.abspath(os.path.expanduser(args.file))
    checks = collect_checks(target)
    success = bool(checks) and all(item["pass"] for item in checks)

    result = {"success": success, "file": target, "checks": checks}
    sys.stdout.write(json.dumps(result, ensure_ascii=False) + "\n")
    sys.stdout.flush()

    if not args.json:
        sys.stderr.write(render_human(result) + "\n")

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
