#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
audit_skill.py
引入技能候选审计器：许可白名单 + URL + 脚本面 + 描述 + 命名规范，逐项 pass/fail 并给出理由。

设计边界：
  逐项判定必须给出可读理由；「含脚本」不是拒绝理由，但必须进入 warnings 提醒人工审脚本。
  被拒绝的候选必须留下明确理由，绝不静默丢弃。

Exit Code:
  0 - 接受（accept）
  1 - 拒绝（reject）
  2 - 输入不可解析（候选既不是可读文件，也不是合法 JSON）
"""

import os
import sys
import json
import re
import argparse

LICENSE_WHITELIST = {
    "mit",
    "apache-2.0",
    "bsd-2-clause",
    "bsd-3-clause",
    "isc",
    "mpl-2.0",
    "unlicense",
    "cc0-1.0",
}

KEBAB_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def _as_text(value):
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _as_bool(value):
    if isinstance(value, bool):
        return value
    return _as_text(value).lower() in ("1", "true", "yes", "y", "on")


def parse_candidate(raw):
    """raw 可以是文件路径，也可以是内联 JSON 字符串。"""
    path = os.path.abspath(raw)
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as fh:
            payload = json.load(fh)
    else:
        payload = json.loads(raw)

    if isinstance(payload, dict) and "candidate" in payload and isinstance(payload["candidate"], dict):
        payload = payload["candidate"]
    if not isinstance(payload, dict):
        raise ValueError("候选必须是 JSON 对象")
    return payload


def audit(item):
    name = _as_text(item.get("name")) or _as_text(item.get("id"))
    url = _as_text(item.get("url")) or _as_text(item.get("html_url"))
    license_name = _as_text(item.get("license")) or "UNKNOWN"
    has_scripts = _as_bool(item.get("has_scripts", False))
    description = _as_text(item.get("description"))

    checks = []
    warnings = []
    reasons = []

    # 1. 许可白名单
    license_key = license_name.strip().lower()
    if license_key in LICENSE_WHITELIST:
        checks.append({
            "id": "license-whitelist",
            "passed": True,
            "reason": "许可 %s 在白名单内。" % license_name,
        })
    else:
        detail = "未声明许可（按 UNKNOWN 处理）" if license_key in ("", "unknown") else "许可 %s 不在白名单内" % license_name
        checks.append({
            "id": "license-whitelist",
            "passed": False,
            "reason": "%s；白名单：%s。" % (detail, ", ".join(sorted(LICENSE_WHITELIST))),
        })
        reasons.append("许可不合规：%s" % detail)

    # 2. URL 存在且为 https
    if url and url.lower().startswith("https://"):
        checks.append({
            "id": "source-url-https",
            "passed": True,
            "reason": "来源 URL 存在且为 https：%s" % url,
        })
    elif url:
        checks.append({
            "id": "source-url-https",
            "passed": False,
            "reason": "来源 URL 非 https（不可信/明文）：%s" % url,
        })
        reasons.append("来源 URL 非 https：%s" % url)
    else:
        checks.append({
            "id": "source-url-https",
            "passed": False,
            "reason": "缺少来源 URL，无法回溯与复核来源。",
        })
        reasons.append("缺少来源 URL")

    # 3. 是否声明含脚本（不是拒绝理由，但必须提醒人工审脚本）
    if has_scripts:
        checks.append({
            "id": "declared-scripts",
            "passed": True,
            "reason": "候选声明含脚本；含脚本不是拒绝理由，但必须人工审查脚本内容后方可引入。",
        })
        warnings.append("候选声明含脚本（has_scripts=true）：引入前必须人工逐行审查脚本，确认无网络外发、无静默写盘、无凭据窃取。")
    else:
        checks.append({
            "id": "declared-scripts",
            "passed": True,
            "reason": "候选未声明含脚本；仍建议在归一阶段复核目录结构。",
        })

    # 4. 描述非空
    if description:
        checks.append({
            "id": "non-empty-description",
            "passed": True,
            "reason": "描述非空（%d 字符）。" % len(description),
        })
    else:
        checks.append({
            "id": "non-empty-description",
            "passed": False,
            "reason": "描述为空：无法判定技能意图与触发场景，禁止进入索引。",
        })
        reasons.append("描述为空")

    # 5. name 为 kebab-case
    if name and KEBAB_RE.match(name):
        checks.append({
            "id": "kebab-case-name",
            "passed": True,
            "reason": "name '%s' 符合 kebab-case。" % name,
        })
    elif name:
        checks.append({
            "id": "kebab-case-name",
            "passed": False,
            "reason": "name '%s' 不符合 kebab-case（仅允许小写字母/数字，以单个连字符分隔）。" % name,
        })
        reasons.append("name 非 kebab-case：%s" % name)
    else:
        checks.append({
            "id": "kebab-case-name",
            "passed": False,
            "reason": "缺少 name 字段。",
        })
        reasons.append("缺少 name 字段")

    accepted = all(check["passed"] for check in checks)
    decision = "accept" if accepted else "reject"
    if accepted:
        reasons = ["全部硬性检查通过" + ("；存在待人工确认项。" if warnings else "，无警告。")]
    return {
        "success": accepted,
        "candidate": name or "(unnamed)",
        "checks": checks,
        "warnings": warnings,
        "decision": decision,
        "reasons": reasons,
    }


def main():
    parser = argparse.ArgumentParser(
        description="引入技能候选审计器（许可白名单 / URL / 脚本面 / 描述 / 命名）"
    )
    parser.add_argument("--candidate", required=True,
                        help="候选条目 JSON 文件路径，或内联 JSON 字符串")
    parser.add_argument("--json", action="store_true",
                        help="以 JSON 输出（本脚本默认即 JSON，保留该开关兼容脚本化调用）")
    args = parser.parse_args()

    try:
        item = parse_candidate(args.candidate)
    except Exception as exc:
        report = {
            "success": False,
            "candidate": "(unparsable)",
            "checks": [],
            "warnings": [],
            "decision": "reject",
            "reasons": ["输入不可解析：%s" % exc],
        }
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 2

    report = audit(item)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["decision"] == "accept" else 1


if __name__ == "__main__":
    sys.exit(main())
