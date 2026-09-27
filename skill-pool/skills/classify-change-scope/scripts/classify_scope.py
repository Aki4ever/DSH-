#!/usr/bin/env python3
"""
classify_scope.py
变更范围处置判定器：把一组变更路径逐条判定为 hot_reload / incremental / restart。

判定口径来自 L1 规约 skills/prefer-hot-reload-policy（最长前缀匹配，先长后短）：
    处置优先级 hot_reload（热更）> incremental（增量重载）> restart（重启）；
    只有命中「不可热更边界」白名单（/Applications/DSH Desktop.app/**、
    apps/web/**、dist/**、*.bundle.js）才允许 restart，且必须给出非空 boundary。

确定性：只依赖固定判定表与路径字符串本身，无随机数、无时间依赖、无网络。

stdout 契约（--json）：{"success":true,"decisions":[...],"summary":{...},"verdict":"..."}
Exit Code:
  0 - 判定完成（结果由 stdout 承载；路径不存在同样给出判定）
  1 - --paths 为空（无变更路径可判定）
"""

import os
import sys
import json
import argparse

# 仓库根：本脚本位于 skills/classify-change-scope/scripts/ 之下
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.."))

HOT_RELOAD = "hot_reload"
INCREMENTAL = "incremental"
RESTART = "restart"

VERDICT_NO_RESTART = "no_restart_needed"
VERDICT_RESTART = "restart_required"

# 判定表：按「匹配具体度」择优，具体度相同时表内靠前者优先（先长后短）。
# kind: prefix 前缀 / exact 精确 / suffix 后缀 / child_json 目录下直接子级 json / fallback 兜底
RULES = (
    {
        "kind": "prefix",
        "value": "/applications/dsh desktop.app",
        "boundary": "/Applications/DSH Desktop.app/**",
        "disposition": RESTART,
        "reason": "宿主应用 bundle 不可热更",
    },
    {
        "kind": "prefix",
        "value": "apps/web",
        "boundary": "apps/web/**",
        "disposition": RESTART,
        "reason": "Web 产物需重建并刷新页面",
    },
    {
        "kind": "prefix",
        "value": "dist",
        "boundary": "dist/**",
        "disposition": RESTART,
        "reason": "构建产物需重建并刷新页面",
    },
    {
        "kind": "suffix",
        "value": ".bundle.js",
        "boundary": "*.bundle.js",
        "disposition": RESTART,
        "reason": "打包产物需重建后刷新页面",
    },
    {
        "kind": "child_json",
        "value": "docs/operations/",
        "boundary": "",
        "disposition": HOT_RELOAD,
        "reason": "由脚本重建后立即生效（catalog/index/tree）",
    },
    {
        "kind": "prefix",
        "value": "skills",
        "boundary": "",
        "disposition": HOT_RELOAD,
        "reason": "技能契约下次调用即生效",
    },
    {
        "kind": "prefix",
        "value": "docs",
        "boundary": "",
        "disposition": HOT_RELOAD,
        "reason": "文档下次读取即生效",
    },
    {
        "kind": "exact",
        "value": "bin/skill-pool",
        "boundary": "",
        "disposition": HOT_RELOAD,
        "reason": "下次调用即生效",
    },
    {
        "kind": "fallback",
        "value": "",
        "boundary": "",
        "disposition": INCREMENTAL,
        "reason": "保守处置：未识别路径先尝试增量重载",
    },
)


def normalize_path(raw: str) -> str:
    """把路径归一化为「仓库内相对路径 / 仓库外绝对路径」，仅做字符串规整。"""
    text = str(raw).strip().replace("\\", "/")
    while "//" in text:
        text = text.replace("//", "/")
    if text.startswith("./"):
        text = text[2:]
    # 仓库内绝对路径折叠为相对路径；仓库外绝对路径保持原样
    root = REPO_ROOT.replace("\\", "/").rstrip("/") + "/"
    if text.lower().startswith(root.lower()):
        text = text[len(root):]
    return text


def _match(rule: dict, path_lower: str):
    """命中返回具体度整数（越大越具体），未命中返回 None。"""
    kind = rule["kind"]
    value = rule["value"]

    if kind == "fallback":
        return 0

    if kind == "prefix":
        if path_lower == value or path_lower.startswith(value + "/"):
            return len(value)
        return None

    if kind == "exact":
        return len(value) if path_lower == value else None

    if kind == "suffix":
        base = path_lower.rsplit("/", 1)[-1]
        if base.endswith(value) and len(base) > len(value):
            return len(base)
        return None

    if kind == "child_json":
        if not path_lower.startswith(value):
            return None
        tail = path_lower[len(value):]
        if tail.endswith(".json") and "/" not in tail:
            return len(path_lower)
        return None

    return None


def classify_path(raw_path: str) -> dict:
    """单条路径 → 处置决策；路径不存在同样给出判定（判定只作用于路径字符串）。"""
    path = normalize_path(raw_path)
    lowered = path.lower()

    best_rule = None
    best_score = -1
    for rule in RULES:
        score = _match(rule, lowered)
        if score is None:
            continue
        # 严格大于：具体度相同时表内靠前者优先（先长后短）
        if score > best_score:
            best_score = score
            best_rule = rule

    if best_rule is None:
        best_rule = RULES[-1]

    return {
        "path": path,
        "disposition": best_rule["disposition"],
        "reason": best_rule["reason"],
        "boundary": best_rule["boundary"],
    }


def classify_paths(paths) -> dict:
    """多条路径 → 完整判定负载（decisions + summary + verdict）。"""
    decisions = [classify_path(p) for p in paths]
    summary = {HOT_RELOAD: 0, INCREMENTAL: 0, RESTART: 0}
    for item in decisions:
        summary[item["disposition"]] += 1
    verdict = VERDICT_RESTART if summary[RESTART] else VERDICT_NO_RESTART
    return {
        "success": True,
        "decisions": decisions,
        "summary": summary,
        "verdict": verdict,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Classify change scope: hot_reload / incremental / restart")
    parser.add_argument("--paths", nargs="*", default=[], help="本次变更路径，可一次给多条")
    parser.add_argument("--json", action="store_true", help="输出 JSON（默认行为）")
    args = parser.parse_args()

    paths = [p for p in (args.paths or []) if str(p).strip()]
    if not paths:
        print(json.dumps({"success": False, "error": "缺少 --paths：至少提供一条变更路径"},
                         ensure_ascii=False, indent=2))
        return 1

    payload = classify_paths(paths)
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    for item in payload["decisions"]:
        print("{0}\t{1}\t{2}".format(item["disposition"], item["path"], item["reason"]))
    print("verdict\t{0}".format(payload["verdict"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
