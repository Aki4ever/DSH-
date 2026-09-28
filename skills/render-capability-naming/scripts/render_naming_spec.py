#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
render_naming_spec.py
把 docs/operations/capability-naming.json 渲染成两份人读文档的受管区块：
  1. 本仓文档        docs/operations/capability-naming.md
  2. 全局规则知识库  <全局规则>/knowledge/common/capability_naming_spec.md

单一真相源是 JSON；本脚本只做「数据 → 受管区块」的单向渲染。
任何规则表都不允许人工手写，否则同一事实会出现两种说法。

知识库路径按候选顺序探测（兼容合并前 / 合并后两种仓库布局）：
  1. 环境变量 DSH_GLOBAL_RULES_DIR/knowledge/common
  2. <repo>/../全局规则/knowledge/common          （合并前：Skill池 与 全局规则 平级）
  3. <repo>/../knowledge/common                   （合并后：仓库位于 全局规则/skills）

Exit Code:
  0 - 渲染完成（--write）或磁盘与真相源一致（--check）
  1 - 存在漂移（--check 下文档与 JSON 渲染结果不一致）
  2 - 输入不可读（JSON 缺失/非法、受管标记不成对、候选路径全部不可用）
"""

import sys

sys.dont_write_bytecode = True

import os
import json
import argparse

EXIT_OK = 0
EXIT_DRIFT = 1
EXIT_INPUT = 2

HERE = os.path.dirname(os.path.abspath(__file__))
# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(HERE, "../../../skill-pool"))
POOL_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SPEC_PATH = os.path.join(POOL_ROOT, "docs", "operations", "capability-naming.json")
CATALOG_PATH = os.path.join(POOL_ROOT, "docs", "operations", "skill-catalog.json")

KNOWLEDGE_DOC_VERSION = "v1.0.0"
REQUIREMENT_IDS = "REQ-KB-CAPABILITYNAMING-031、REQ-LAYER-NAMINGAUDIT-032"


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def load_json(path):
    if not os.path.isfile(path):
        return None, "not_found: %s" % path
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle), None
    except (OSError, ValueError) as exc:
        return None, "unreadable: %s: %s" % (path, exc)


def resolve_knowledge_dir(repo_root):
    candidates = []
    env = os.environ.get("DSH_GLOBAL_RULES_DIR")
    if env:
        candidates.append(os.path.join(env, "knowledge", "common"))
    candidates.append(os.path.join(os.path.dirname(repo_root), "全局规则", "knowledge", "common"))
    candidates.append(os.path.join(os.path.dirname(repo_root), "knowledge", "common"))
    for path in candidates:
        if os.path.isdir(path):
            return path, candidates
    return None, candidates


# ---------------------------------------------------------------- 渲染

def table(headers, rows):
    lines = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    for row in rows:
        lines.append("| " + " | ".join(str(cell) for cell in row) + " |")
    return "\n".join(lines)


def render_body(spec, compliance):
    s = spec["syntax"]
    out = []
    out.append("本文档由 `%s` 依据 `%s` 自动生成，禁止人工编辑受管区块。" %
               (spec["generated_by"], "docs/operations/capability-naming.json"))
    out.append("")
    out.append(spec["summary"])
    out.append("")

    out.append("---")
    out.append("")
    out.append("## 一、四要素（缺一不可）")
    out.append("")
    out.append("| # | 要素 | 字段 | 它回答的问题 | 判据 |")
    out.append("| :---: | :--- | :--- | :--- | :--- |")
    for item in spec["four_elements"]:
        out.append("| %d | **%s** | `%s` | %s | %s |" %
                   (item["order"], item["element"], item["field"], item["question"], item["rule"]))
    out.append("")
    out.append("**顺序不可颠倒**：先定归属（谁用），再定分类（哪一层），再定做什么（动词与宾语），最后才派生名字。")
    out.append("")

    out.append("---")
    out.append("")
    out.append("## 二、执行层分类（六层闭集）")
    out.append("")
    out.append(table(
        ["层名 `layer`", "中文名", "它是什么", "命名附加约束"],
        [[("`%s`" % r["layer"]), r["label"], r["what"], r["id_rule"]] for r in spec["layer_classification"]],
    ))
    out.append("")
    out.append("层名不得自创、不得用同义词替代，必须与 `docs/operations/execution-layers.json` 登记项逐字一致。")
    out.append("")

    out.append("---")
    out.append("")
    out.append("## 三、四种已登记命名形态")
    out.append("")
    out.append(table(
        ["形态", "中文名", "判据", "强制层级", "例"],
        [[("`%s`" % r["shape"]), r["label"], r["rule"], " / ".join(r["applies_to"]),
          "、".join("`%s`" % e for e in r["examples"])] for r in spec["shapes"]],
    ))
    out.append("")
    out.append("### 层级与形态的绑定")
    out.append("")
    out.append(table(
        ["层级", "要求", "为什么"],
        [[level, spec["shape_assignment"][level]["required"], spec["shape_assignment"][level]["note"]]
         for level in ("L1", "L2", "L3", "L4")],
    ))
    out.append("")

    out.append("---")
    out.append("")
    out.append("## 四、语法约束")
    out.append("")
    out.append(table(
        ["项", "取值"],
        [["形态", "`%s`" % s["shape"]],
         ["正则", "`%s`" % s["pattern"]],
         ["字符集", s["charset_note"]],
         ["段数", "%d ~ %d（单段仅限厂商边界形态）" % (s["min_segments"], s["max_segments"])],
         ["长度", "%d ~ %d 字符" % (s["min_length"], s["max_length"])]],
    ))
    out.append("")

    out.append("---")
    out.append("")
    out.append("## 五、动词词汇表（%d 条，含语义边界）" % len(spec["verb_vocabulary"]))
    out.append("")
    out.append("动作形态的首段必须落在此表内。表中同时钉死易混淆词的**边界**，"
               "边界即「什么时候该用哪个词」，避免同一个动作被拆成多个近义动词。")
    out.append("")
    out.append(table(["动词", "语义边界"],
                     [["`%s`" % v["verb"], v["boundary"]] for v in spec["verb_vocabulary"]]))
    out.append("")

    out.append("---")
    out.append("")
    out.append("## 六、编排名词表与规约尾段")
    out.append("")
    out.append("**编排名词表**（L3 编排形态的末段必须落在此表内）：%s" %
               "、".join("`%s`" % x for x in spec["orchestration_suffixes"]))
    out.append("")
    out.append("**规约尾段**（L1 规约形态的末段）：%s" %
               "、".join("`%s`" % x for x in spec["policy_suffixes"]))
    out.append("")

    out.append("---")
    out.append("")
    out.append("## 七、禁词表（出现即违规）")
    out.append("")
    out.append("、".join("`%s`" % w for w in spec["banned_words"]))
    out.append("")
    out.append("这些都是**信息量为零**的词：它们不说明能力做什么，只说明它相对于什么而存在"
               "（新旧、备份、临时、杂项）。一个名字一旦带 `util`，它就会变成什么东西都往里塞的垃圾桶。")
    out.append("")

    out.append("---")
    out.append("")
    out.append("## 八、同义归一")
    out.append("")
    out.append(table(["保留词", "别名（需归一）", "理由"],
                     [[("`%s`" % g["keep"]),
                       ("、".join("`%s`" % a for a in g["aliases"]) or "（无别名，独立登记）"),
                       g["reason"]] for g in spec["synonym_groups"]]))
    out.append("")

    out.append("---")
    out.append("")
    out.append("## 九、单段厂商边界白名单")
    out.append("")
    out.append(table(["id", "厂商", "理由"],
                     [[("`%s`" % v["id"]), v["vendor"], v["reason"]] for v in spec["single_token_vendors"]]))
    out.append("")

    out.append("---")
    out.append("")
    out.append("## 十、改名的六处同步契约")
    out.append("")
    out.append(spec["contract_sync"]["rule"] + "。")
    out.append("")
    out.append(table(["#", "同步对象", "位置"],
                     [[t["order"], t["target"], "`%s`" % t["location"]] for t in spec["contract_sync"]["targets"]]))
    out.append("")

    out.append("---")
    out.append("")
    out.append("## 十一、当前合规快照（实数，非声称）")
    out.append("")
    out.append(table(["指标", "数值"],
                     [["执行层总数", compliance["total"]],
                      ["合规数", compliance["compliant"]],
                      ["违规数", compliance["violations"]],
                      ["合规率", "%.4f" % compliance["compliance_rate"]],
                      ["按层级分布", " / ".join("%s %d" % (k, v) for k, v in compliance["by_level"])],
                      ["快照来源", "`docs/operations/skill-catalog.json`"]]))
    out.append("")
    return "\n".join(out).rstrip() + "\n"


def compliance_snapshot(spec):
    catalog, error = load_json(CATALOG_PATH)
    if catalog is None:
        return {"total": 0, "compliant": 0, "violations": 0, "compliance_rate": 0.0,
                "by_level": [], "error": error}
    verbs = {v["verb"] for v in spec["verb_vocabulary"]}
    orchestration = set(spec["orchestration_suffixes"])
    banned = set(spec["banned_words"])
    aliases = set()
    for group in spec["synonym_groups"]:
        aliases.update(group["aliases"])
    vendors = {v["id"] for v in spec["single_token_vendors"]}
    syntax = spec["syntax"]

    total = 0
    compliant = 0
    by_level = {}
    for skill in catalog.get("skills", []):
        identifier = skill.get("id") or ""
        level = skill.get("level") or ""
        total += 1
        by_level[level] = by_level.get(level, 0) + 1
        segments = identifier.split("-")
        ok = True
        if not identifier or not identifier[0].islower():
            ok = False
        elif not all(part.isalnum() and part.islower() for part in segments if part):
            ok = False
        elif len(segments) < syntax["min_segments"] and identifier not in vendors:
            ok = False
        elif len(segments) > syntax["max_segments"]:
            ok = False
        elif not (syntax["min_length"] <= len(identifier) <= syntax["max_length"]):
            ok = False
        if ok and (banned & set(segments)):
            ok = False
        if ok and segments[0] in aliases:
            ok = False
        if ok and level == "L2" and segments[0] not in verbs:
            ok = False
        if ok and level == "L3" and segments[0] not in verbs and segments[-1] not in orchestration:
            ok = False
        if ok and level == "L4" and identifier != "dsh-butler":
            ok = False
        if ok:
            compliant += 1
    rate = (compliant / total) if total else 0.0
    return {"total": total, "compliant": compliant, "violations": total - compliant,
            "compliance_rate": rate, "by_level": sorted(by_level.items())}


# ---------------------------------------------------------------- 组装与写盘

def compose_full(spec, body, doc_title, version_block):
    begin = spec["outputs"]["managed_begin"]
    end = spec["outputs"]["managed_end"]
    return "%s\n\n%s\n%s\n%s\n" % (doc_title, version_block, begin, body + end)


def replace_managed(spec, existing, body):
    begin = spec["outputs"]["managed_begin"]
    end = spec["outputs"]["managed_end"]
    start = existing.find(begin)
    stop = existing.find(end)
    if start == -1 or stop == -1 or stop < start:
        return None
    return existing[:start + len(begin)] + "\n" + body + existing[stop:]


def repo_doc_title(spec):
    return "\n".join([
        "# 能力层命名规范 (Capability Naming Specification)",
        "",
        "> ### 🏷️ **版本信息与实施追踪**",
        "> - **规范版本**：`%s`" % spec["version"],
        "> - **唯一真相源**：`docs/operations/capability-naming.json`",
        "> - **渲染器**：`%s`" % spec["generated_by"],
        "> - **需求依据**：`%s`" % REQUIREMENT_IDS,
        "> - **生效状态**：`[Release 稳定生效]`",
        "",
        "> 本文档是本仓执行层命名的唯一口径来源说明。任何位置提到「能力层怎么命名」「执行层 id 怎么起」，",
        "> 一律以本文档与真相源 JSON 为准；其余文件只允许写指针，**禁止复制规则表**。",
    ])


def knowledge_doc_title(spec):
    return "\n".join([
        "# 通用能力层命名规范 (Capability Naming Specification)",
        "",
        "> ### 🏷️ **版本信息与实施追踪**",
        "> - **当前文档版本**：`%s`" % KNOWLEDGE_DOC_VERSION,
        "> - **命名规范版本**：`%s`" % spec["version"],
        "> - **文档类型 (Doc Type)**：`[CORE-KNOWLEDGE 核心知识库]`",
        "> - **清理定位 (Retention)**：`[PERMANENT 永久核心白名单 · 严禁删除]`",
        "> - **规范层级**：`【知识库 · 通用公共规范 · 能力层命名唯一权威源】`",
        "> - **需求依据**：`%s`" % REQUIREMENT_IDS,
        "> - **生效状态**：`[Release 稳定生效]`",
        "",
        "本文档是**能力层命名格式的唯一权威源**：任何执行层（skill / cli / agent / api / mcp / plugin）",
        "叫什么、归谁管、属于哪一层、做什么，一律以本文档为准。其余文件（规则、记忆、脚本）只允许写指针，",
        "**禁止复制本文档的规则表**，避免同一事实出现两种说法。",
        "",
        "> 本文档的规则表由脚本 `%s` 从" % spec["generated_by"],
        "> `docs/operations/capability-naming.json` 单向渲染生成，人工编辑会在下一次",
        "> `--check` 时被判为漂移并覆盖。",
        "",
        "---",
        "",
        "## 🎯 零、与既有命名规范的分工",
        "",
        "| 规范 | 管什么 | 唯一权威源 |",
        "| :--- | :--- | :--- |",
        "| [`task_naming_spec.md`](task_naming_spec.md) | **会话 / 任务**标题（`[分类编号][难度分] 概述`） | `task_naming_spec.md` |",
        "| 本文档 | **能力层 / 执行层** id（`<verb>-<object>` 等四种形态） | `capability-naming.json` |",
        "",
        "两者互不覆盖：任务标题回答「这次要干什么」，能力层 id 回答「这个能力叫什么」。",
    ])


def build_targets(spec, compliance):
    body = render_body(spec, compliance)
    repo_path = os.path.join(POOL_ROOT, spec["outputs"]["repo_doc"])
    knowledge_dir, candidates = resolve_knowledge_dir(POOL_ROOT)
    targets = [{
        "name": "repo_doc",
        "path": repo_path,
        "body": body,
        "title": repo_doc_title(spec),
    }]
    if knowledge_dir:
        targets.append({
            "name": "knowledge_doc",
            "path": os.path.join(knowledge_dir, spec["outputs"]["knowledge_doc_basename"]),
            "body": body,
            "title": knowledge_doc_title(spec),
        })
    return targets, knowledge_dir, candidates


def expected_content(spec, target):
    existing = None
    if os.path.isfile(target["path"]):
        try:
            with open(target["path"], "r", encoding="utf-8") as handle:
                existing = handle.read()
        except OSError:
            existing = None
    if existing is not None:
        replaced = replace_managed(spec, existing, target["body"])
        if replaced is not None:
            return replaced
    header = "%s\n\n" % target["title"]
    return header + spec["outputs"]["managed_begin"] + "\n" + target["body"] + spec["outputs"]["managed_end"] + "\n"


def main(argv):
    parser = argparse.ArgumentParser(
        prog="render_naming_spec.py",
        description="把 capability-naming.json 渲染成本仓文档与全局规则知识库文档的受管区块",
    )
    parser.add_argument("--check", action="store_true", help="只比对不写入；存在漂移即退 1")
    parser.add_argument("--write", action="store_true", help="写入（默认行为）")
    parser.add_argument("--json", action="store_true", help="兼容开关；脚本恒输出 JSON")
    args = parser.parse_args(argv)

    spec, error = load_json(SPEC_PATH)
    if spec is None:
        emit({"error": "spec_unreadable", "detail": error})
        return EXIT_INPUT
    for key in ("outputs", "syntax", "verb_vocabulary", "shapes", "contract_sync"):
        if key not in spec:
            emit({"error": "spec_incomplete", "detail": "缺少字段 %s" % key})
            return EXIT_INPUT
    if not spec["outputs"].get("managed_begin") or not spec["outputs"].get("managed_end"):
        emit({"error": "managed_marker_missing",
              "detail": "capability-naming.json 的 outputs.managed_begin / managed_end 不可为空"})
        return EXIT_INPUT

    compliance = compliance_snapshot(spec)
    targets, knowledge_dir, candidates = build_targets(spec, compliance)

    results = []
    drifted = 0
    written = 0
    for target in targets:
        expected = expected_content(spec, target)
        actual = None
        if os.path.isfile(target["path"]):
            try:
                with open(target["path"], "r", encoding="utf-8") as handle:
                    actual = handle.read()
            except OSError as exc:
                results.append({"name": target["name"], "path": target["path"],
                                "status": "unreadable", "detail": str(exc)})
                drifted += 1
                continue
        if actual == expected:
            results.append({"name": target["name"], "path": target["path"], "status": "in_sync",
                            "bytes": len(expected.encode("utf-8"))})
            continue
        drifted += 1
        if args.check:
            results.append({"name": target["name"], "path": target["path"], "status": "drift",
                            "expected_bytes": len(expected.encode("utf-8")),
                            "actual_bytes": (len(actual.encode("utf-8")) if actual is not None else 0)})
            continue
        try:
            parent = os.path.dirname(target["path"])
            if parent:
                os.makedirs(parent, exist_ok=True)
            with open(target["path"], "w", encoding="utf-8") as handle:
                handle.write(expected)
        except OSError as exc:
            results.append({"name": target["name"], "path": target["path"],
                            "status": "write_failed", "detail": str(exc)})
            continue
        written += 1
        results.append({"name": target["name"], "path": target["path"], "status": "written",
                        "bytes": len(expected.encode("utf-8"))})

    payload = {
        "success": (drifted == 0) if args.check else all(r["status"] != "write_failed" for r in results),
        "mode": "check" if args.check else "write",
        "spec": SPEC_PATH,
        "spec_version": spec["version"],
        "knowledge_dir": knowledge_dir,
        "knowledge_dir_candidates": candidates,
        "compliance": compliance,
        "written": written,
        "drift": drifted,
        "targets": results,
    }
    payload["verdict"] = "in_sync" if (args.check and drifted == 0) else (
        "written" if not args.check else "drift_detected")
    if knowledge_dir is None:
        payload["warning"] = "全局规则知识库目录不可用，仅渲染本仓文档；候选路径：%s" % ", ".join(candidates)
    emit(payload)
    if args.check:
        return EXIT_OK if drifted == 0 else EXIT_DRIFT
    return EXIT_OK if payload["success"] else EXIT_INPUT


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
