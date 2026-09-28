#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
place_skill.py
引入技能定级挂载定位器：依据级别与触发关键词判定集群归属，并给出建议父级与 composition 合法性。

硬边界（本技能只做定位判定）：
  * --dry-run 与常规运行**都不写任何文件**；
  * 实际的 composition 接线与集群落盘由人工 / 管家在复核建议后执行；
  * 禁止人工拍脑袋放置：归属必须由本脚本的关键词规则表物理推导。

Exit Code:
  0 - 定位成功且 composition 合法
  1 - docs/operations/skill-catalog.json 缺失、技能不在 catalog 中、或 composition 引用了不存在的技能
"""

import os
import re
import sys
import json
import argparse

# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../skill-pool"))
REPO_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
CATALOG_PATH = os.path.join(REPO_ROOT, "docs", "operations", "skill-catalog.json")

DEFAULT_CLUSTER = "⑦ 技能引入与演进"

# 关键词规则表：按序命中，先到先得。英文关键词做不区分大小写子串匹配，
# 中文关键词用于覆盖本池以中文为主的 description。
CLUSTER_RULES = [
    ("⑤ 需求与透视", ["zoom", "viewer", "image", "缩放", "视图", "透视", "图片", "可视化"]),
    ("⑦ 技能引入与演进", ["import", "github", "search", "audit", "normalize", "引入", "检索", "归一", "纳管", "外部技能"]),
    ("② 契约与合规", ["catalog", "consistency", "contract", "fission", "gate", "编目", "一致性", "契约", "分裂", "门禁", "合规"]),
    ("① 意图与路由", ["lane", "route", "fastpath", "intent", "index", "路由", "意图", "索引", "分流", "直达"]),
    ("④ 输出规约", ["output", "format", "tail", "icon", "输出", "格式", "图标"]),
    ("③ 冲突·冗余·质量", ["conflict", "redundancy", "qa", "audit-log", "冲突", "冗余", "质量"]),
]

LEVEL_RANK = {"L1": 1, "L2": 2, "L3": 3, "L4": 4}


def rank_to_level(rank):
    for level, value in LEVEL_RANK.items():
        if value == rank:
            return level
    return None


def _text(value):
    if value is None:
        return ""
    return value if isinstance(value, str) else str(value)


def load_catalog(path):
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    skills = data.get("skills") if isinstance(data, dict) else None
    if not isinstance(skills, list):
        raise ValueError("catalog 结构非法：缺少 skills 数组")
    return data, skills


def skill_index(skills):
    index = {}
    for item in skills:
        if not isinstance(item, dict):
            continue
        for key in (item.get("name"), item.get("id")):
            if key:
                index[str(key)] = item
    return index


def detect_cluster(name, description):
    """返回 (cluster, matched_keyword 或 None)。"""
    haystack = ("%s %s" % (name, description)).lower()
    for cluster, keywords in CLUSTER_RULES:
        for keyword in keywords:
            if keyword.lower() in haystack:
                return cluster, keyword
    return DEFAULT_CLUSTER, None


def bigrams(text):
    clean = re.sub(r"[\s\-_/]+", "", text.lower())
    return {clean[i:i + 2] for i in range(len(clean) - 1)}


def score_parent(target_name, target_desc, parent):
    parent_name = _text(parent.get("name"))
    parent_desc = _text(parent.get("description"))
    triggers = parent.get("triggers") or []
    target_text = ("%s %s" % (target_name, target_desc)).lower()

    trigger_hits = 0
    for trigger in triggers:
        needle = _text(trigger).strip().lower()
        if needle and needle in target_text:
            trigger_hits += 1

    target_name_lower = target_name.lower()
    name_hits = 0
    for token in parent_name.lower().split("-"):
        if len(token) >= 3 and token in target_name_lower:
            name_hits += 1

    desc_overlap = len(bigrams(parent_desc) & bigrams(target_desc))

    # 触发词重合度是主判据，名称词元次之，描述字面重合仅作同分兜底；
    # 权重按数量级拉开，确保「触发词重合度最高」的父级永远排在前面。
    score = trigger_hits * 100 + name_hits * 50 + min(desc_overlap, 20)
    return score, trigger_hits, name_hits, desc_overlap


def suggest_parents(target_name, target_desc, target_level, catalog_skills):
    target_rank = LEVEL_RANK.get(target_level)
    if target_rank is None:
        allowed = set(LEVEL_RANK)
    else:
        allowed = {rank_to_level(target_rank)}
        upper = rank_to_level(target_rank - 1)
        if upper:
            allowed.add(upper)

    scored = []
    for item in catalog_skills:
        if not isinstance(item, dict):
            continue
        name = _text(item.get("name"))
        if not name or name == target_name:
            continue
        if _text(item.get("level")) not in allowed:
            continue
        score, trigger_hits, name_hits, desc_overlap = score_parent(target_name, target_desc, item)
        if score <= 0:
            continue
        scored.append({
            "name": name,
            "level": _text(item.get("level")),
            "score": score,
            "matched_triggers": trigger_hits,
            "matched_name_tokens": name_hits,
            "description_overlap": desc_overlap,
        })

    scored.sort(key=lambda entry: (-entry["score"], entry["name"]))
    return scored[:3]


def build_report(name, level_override, dry_run):
    if not os.path.isfile(CATALOG_PATH):
        return {
            "success": False,
            "skill": name,
            "catalog": "docs/operations/skill-catalog.json",
            "error": "catalog 不存在，无法执行定级挂载判定：%s" % CATALOG_PATH,
        }, 1

    catalog, skills = load_catalog(CATALOG_PATH)
    index = skill_index(skills)
    target = index.get(name)
    if target is None:
        return {
            "success": False,
            "skill": name,
            "catalog": "docs/operations/skill-catalog.json",
            "error": "技能 '%s' 不在 catalog 中，禁止对未纳管技能做集群定位。" % name,
            "catalog_total": len(skills),
        }, 1

    description = _text(target.get("description"))
    level = (level_override or _text(target.get("level")) or "").strip()
    if level not in LEVEL_RANK:
        level = _text(target.get("level"))

    cluster, matched = detect_cluster(name, description)

    composition = target.get("composition") or []
    if not isinstance(composition, list):
        composition = []
    missing = [dep for dep in composition if _text(dep) not in index]

    issues = []
    if matched is None:
        issues.append("关键词规则表未命中，已按兜底规则归入「%s」，需人工复核。" % DEFAULT_CLUSTER)
    if missing:
        issues.append("composition 引用了 catalog 中不存在的技能：%s" % "、".join(missing))

    parents = suggest_parents(name, description, level, skills)
    if not parents:
        issues.append("未找到触发词重合度大于 0 的同级/上一级候选父级，需人工指定挂载父级。")

    composition_ok = not missing
    success = composition_ok
    report = {
        "success": success,
        "skill": name,
        "cluster": cluster,
        "cluster_matched_keyword": matched,
        "level": level,
        "description": description,
        "suggested_parents": parents,
        "composition": composition,
        "composition_ok": composition_ok,
        "issues": issues,
        "dry_run": bool(dry_run),
        "wrote_files": False,
        "note": "本技能只做定位判定：无论是否 --dry-run 都不写任何文件，composition 接线与集群落盘由人工/管家复核后执行。",
    }
    return report, (0 if success else 1)


def main():
    parser = argparse.ArgumentParser(
        description="引入技能定级挂载定位器（只判定，不写盘）"
    )
    parser.add_argument("--name", required=True, help="技能名（必须已存在于 catalog）")
    parser.add_argument("--level", default=None, help="级别覆盖 L1|L2|L3|L4，缺省取 catalog 中的级别")
    parser.add_argument("--dry-run", dest="dry_run", action="store_true",
                        help="只输出建议不写任何文件（本技能在任何模式下都不写文件）")
    parser.add_argument("--json", action="store_true",
                        help="以 JSON 输出（本脚本默认即 JSON，保留该开关兼容脚本化调用）")
    args = parser.parse_args()

    if args.level is not None and args.level not in LEVEL_RANK:
        report = {
            "success": False,
            "skill": args.name,
            "error": "--level '%s' 非法，只接受 L1|L2|L3|L4。" % args.level,
        }
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1

    try:
        report, code = build_report(args.name, args.level, args.dry_run)
    except (ValueError, OSError) as exc:
        report, code = {
            "success": False,
            "skill": args.name,
            "catalog": "docs/operations/skill-catalog.json",
            "error": "catalog 读取失败：%s" % exc,
        }, 1

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return code


if __name__ == "__main__":
    sys.exit(main())
