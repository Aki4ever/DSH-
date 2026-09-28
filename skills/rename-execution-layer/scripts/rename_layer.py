#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rename_layer.py
执行层命名整改器：一次改名同步 capability-naming-policy 契约里的**六处**，漏一处即悬空引用。

六处同步顺序（原子性由「先校验 → 再改名 → 再全量重写 → 最后重建产物」保证）：
  1 目录名      skills/<from>/  →  skills/<to>/
  2 技能 ID     docs/operations/skill-catalog.json 的 id 与 name（以及全部 derived 产物）
  3 契约头      skills/<to>/SKILL.md 的 YAML Frontmatter name
  4 组装边      全池 composition / depends_on 引用
  5 树与索引    execution-tree.json/.md、skill-index.json、layer-graph.json、instance-safety.json
  6 文档与登记  docs/** 正文与受管区块、docs/operations/execution-layers.json

配套脚本同名改写：若 skills/<from>/scripts/<from_underscored>.py 存在，同步改名为 <to_underscored>.py。

Exit Code:
  0 - 干跑完成 / 整改全部成功 / 已是目标状态（幂等）
  1 - 目标名非法、目标名已被占用、源不存在且无整改记录
  2 - 输入不可读（plan 非法、catalog 缺失、词表缺失）
"""

import sys

sys.dont_write_bytecode = True

import os
import re
import json
import shutil
import argparse
import importlib.util
import subprocess

EXIT_OK = 0
EXIT_CONFLICT = 1
EXIT_INPUT = 2

HERE = os.path.dirname(os.path.abspath(__file__))
# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(HERE, "../../../skill-pool"))
POOL_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(HERE, "..", "..", ".."))
_SKILLS_CANDIDATE = os.path.join(os.path.dirname(POOL_ROOT), "skills")
SKILLS_ROOT = _SKILLS_CANDIDATE if os.path.isdir(_SKILLS_CANDIDATE) else os.path.join(POOL_ROOT, "skills")
RULES_PATH = os.path.join(SKILLS_ROOT, "audit-layer-naming", "scripts", "naming_rules.py")
CATALOG_PATH = os.path.join(POOL_ROOT, "docs", "operations", "skill-catalog.json")
RETIRED_PATH = os.path.join(POOL_ROOT, "docs", "operations", "retired-names.json")
CHAIN_PATH = os.path.join(POOL_ROOT, "docs", "operations", "rebuild-chain.json")

SKIP_DIRS = {".git", "__pycache__", "node_modules", ".venv", ".mypy_cache", ".pytest_cache"}
TEXT_SUFFIXES = {".md", ".json", ".py", ".sh", ".mjs", ".cjs", ".js", ".ts", ".txt", ".yaml", ".yml", ".toml"}


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def load_rules():
    if not os.path.isfile(RULES_PATH):
        return None
    spec = importlib.util.spec_from_file_location("dsh_naming_rules", RULES_PATH)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def iter_text_files(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if os.path.splitext(name)[1] in TEXT_SUFFIXES:
                yield os.path.join(dirpath, name)


def needle_pattern(needle):
    """旧名按「词边界」匹配。

    追加后缀式改名会让新名把旧名整体包含为自己的前缀；用纯子串替换会把已经改好的新名
    再次改写，产生双重后缀。因此换代只能落在词边界上。
    """
    return re.compile(r"(?<![a-z0-9-])" + re.escape(needle) + r"(?![a-z0-9-])")


def scan_occurrences(root, needle):
    pattern = needle_pattern(needle)
    hits = []
    for path in iter_text_files(root):
        if os.path.abspath(path) == os.path.abspath(RETIRED_PATH):
            continue
        try:
            with open(path, "r", encoding="utf-8") as handle:
                text = handle.read()
        except (OSError, UnicodeDecodeError):
            continue
        count = len(pattern.findall(text))
        if count:
            hits.append({"path": os.path.relpath(path, root), "count": count})
    return sorted(hits, key=lambda item: item["path"])


def rewrite_occurrences(root, needle, replacement, skip_paths):
    pattern = needle_pattern(needle)
    changed = []
    skipped = [os.path.abspath(p) for p in skip_paths]
    for path in iter_text_files(root):
        if os.path.abspath(path) in skipped:
            continue
        try:
            with open(path, "r", encoding="utf-8") as handle:
                text = handle.read()
        except (OSError, UnicodeDecodeError):
            continue
        if not pattern.search(text):
            continue
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(pattern.sub(replacement, text))
        changed.append(os.path.relpath(path, root))
    return sorted(changed)


def load_retired():
    if not os.path.isfile(RETIRED_PATH):
        return {"version": 1, "renames": []}
    try:
        with open(RETIRED_PATH, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, ValueError):
        return {"version": 1, "renames": []}
    payload.setdefault("renames", [])
    return payload


def save_retired(payload):
    os.makedirs(os.path.dirname(RETIRED_PATH), exist_ok=True)
    with open(RETIRED_PATH, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def catalog_level(root, identifier):
    try:
        with open(CATALOG_PATH, "r", encoding="utf-8") as handle:
            catalog = json.load(handle)
    except (OSError, ValueError):
        return None, "catalog_unreadable"
    for skill in catalog.get("skills", []):
        if skill.get("id") == identifier:
            return skill.get("level"), None
    return None, "id_not_in_catalog"


def plan_items(args):
    items = []
    if args.plan:
        if not os.path.isfile(args.plan):
            return None, "plan_not_found: %s" % args.plan
        try:
            with open(args.plan, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except (OSError, ValueError) as exc:
            return None, "plan_unreadable: %s" % exc
        for row in payload.get("renames", []):
            if not isinstance(row, dict) or not row.get("from") or not row.get("to"):
                return None, "plan_row_invalid: %r" % (row,)
            items.append({"from": row["from"], "to": row["to"], "reason": row.get("reason", "")})
    for pair in args.rename or []:
        if "=" not in pair:
            return None, "rename_pair_invalid: %s（应为 from=to）" % pair
        source, target = pair.split("=", 1)
        items.append({"from": source.strip(), "to": target.strip(), "reason": "命令行指定"})
    if not items:
        return None, "no_renames_given"
    return items, None


def apply_one(root, item, rules, retired):
    source = item["from"]
    target = item["to"]
    record = {"from": source, "to": target, "reason": item.get("reason", "")}
    src_dir = os.path.join(root, "skills", source)
    dst_dir = os.path.join(root, "skills", target)

    already = [r for r in retired["renames"] if r.get("from") == source and r.get("to") == target]
    if already and not os.path.isdir(src_dir):
        return {"from": source, "to": target, "status": "already_applied", "changed_files": 0}

    if not os.path.isdir(src_dir):
        return {"from": source, "to": target, "status": "source_missing",
                "detail": "skills/%s/ 不存在" % source, "changed_files": 0}

    level, error = catalog_level(root, source)
    if level is None:
        return {"from": source, "to": target, "status": "source_not_in_catalog",
                "detail": error, "changed_files": 0}

    spec, spec_error = rules.load_json(
        os.path.join(root, "docs", "operations", "capability-naming.json"))
    if spec is None:
        return {"from": source, "to": target, "status": "spec_unreadable",
                "detail": spec_error, "changed_files": 0}
    problems = rules.NamingRules(spec).check_identifier(target, level)
    if problems:
        return {"from": source, "to": target, "status": "target_invalid",
                "detail": "；".join("%s: %s" % (p["code"], p["detail"]) for p in problems),
                "changed_files": 0}

    if os.path.isdir(dst_dir):
        return {"from": source, "to": target, "status": "target_taken",
                "detail": "skills/%s/ 已存在" % target, "changed_files": 0}

    hits = scan_occurrences(root, source)
    return {"from": source, "to": target, "level": level, "status": "ready",
            "occurrence_files": hits, "occurrence_total": sum(h["count"] for h in hits)}


def execute_one(root, item, rules, retired):
    source = item["from"]
    target = item["to"]
    src_dir = os.path.join(root, "skills", source)
    dst_dir = os.path.join(root, "skills", target)
    steps = []

    os.rename(src_dir, dst_dir)
    steps.append({"step": 1, "name": "rename_directory",
                  "detail": "skills/%s → skills/%s" % (source, target)})

    script_src = os.path.join(dst_dir, "scripts", source.replace("-", "_") + ".py")
    script_dst = os.path.join(dst_dir, "scripts", target.replace("-", "_") + ".py")
    if os.path.isfile(script_src) and not os.path.isfile(script_dst):
        os.rename(script_src, script_dst)
        steps.append({"step": 1, "name": "rename_script",
                      "detail": "scripts/%s.py → scripts/%s.py"
                                % (source.replace("-", "_"), target.replace("-", "_"))})

    changed = rewrite_occurrences(root, source, target, skip_paths=[RETIRED_PATH])
    steps.append({"step": 2, "name": "rewrite_references",
                  "detail": "改写 %d 个文件中的 %s" % (len(changed), source), "files": changed})

    retired["renames"].append({
        "from": source, "to": target, "target_level": item.get("level_hint", ""),
        "reason": item.get("reason", ""), "files_rewritten": len(changed),
    })
    save_retired(retired)
    steps.append({"step": 6, "name": "record_retired_name", "detail": "docs/operations/retired-names.json"})
    return {"from": source, "to": target, "status": "renamed", "changed_files": len(changed), "steps": steps}


def load_chain():
    """重建链的唯一真相源是 docs/operations/rebuild-chain.json。

    整改器**不硬编码任何 skills/<id>/scripts/ 路径**：路径由 skill + script 两字段拼出。
    这样派生产物的重建顺序是可登记、可审计的数据，而不是散落在脚本里的字面量，
    也避免与 layer-decoupling-policy 的隐式耦合判据（脚本内硬编码他层内部路径）冲突。
    """
    if not os.path.isfile(CHAIN_PATH):
        return None, "rebuild_chain_missing: %s" % CHAIN_PATH
    try:
        with open(CHAIN_PATH, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, ValueError) as exc:
        return None, "rebuild_chain_unreadable: %s" % exc
    steps = payload.get("steps")
    if not isinstance(steps, list) or not steps:
        return None, "rebuild_chain_empty"
    return steps, None


def rebuild(root):
    steps, error = load_chain()
    if steps is None:
        return [{"builder": "(chain)", "status": "failed", "detail": error}]
    results = []
    for step in steps:
        name = step.get("name") or "(unnamed)"
        script = os.path.join(root, "skills", step.get("skill", ""), step.get("script", ""))
        if not os.path.isfile(script):
            results.append({"builder": name, "status": "missing",
                            "path": os.path.relpath(script, root)})
            continue
        completed = subprocess.run([sys.executable, script] + list(step.get("args") or []),
                                   cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        results.append({"builder": name, "status": "ok" if completed.returncode == 0 else "failed",
                        "exit_code": completed.returncode,
                        "produces": step.get("produces") or [],
                        "tail": completed.stdout.decode("utf-8", "replace").strip().splitlines()[-3:]})
    return results


def main(argv):
    parser = argparse.ArgumentParser(
        prog="rename_layer.py",
        description="执行层命名整改器：一次改名同步六处，幂等可重跑",
    )
    parser.add_argument("--plan", default=None, help="整改计划 JSON：{\"renames\":[{\"from\",\"to\",\"reason\"}]}")
    parser.add_argument("--rename", action="append", default=None, help="命令行指定 from=to，可重复")
    parser.add_argument("--dry-run", action="store_true", help="只报告影响面，不写任何文件")
    parser.add_argument("--apply", action="store_true", help="真正执行整改")
    parser.add_argument("--rebuild", action="store_true", help="整改后重建 catalog / 图 / 索引 / 树")
    parser.add_argument("--root", default=POOL_ROOT, help="技能池根目录")
    parser.add_argument("--json", action="store_true", help="兼容开关；脚本恒输出 JSON")
    args = parser.parse_args(argv)

    if not args.apply:
        args.dry_run = True

    rules = load_rules()
    if rules is None:
        emit({"error": "rules_missing", "detail": RULES_PATH})
        return EXIT_INPUT
    items, error = plan_items(args)
    if items is None:
        emit({"error": "plan_invalid", "detail": error})
        return EXIT_INPUT

    retired = load_retired()
    results = []
    conflict = False
    for item in items:
        preview = apply_one(args.root, item, rules, retired)
        if preview["status"] == "ready":
            if args.dry_run:
                preview["status"] = "would_rename"
                results.append(preview)
                continue
            outcome = execute_one(args.root, item, rules, retired)
            results.append(outcome)
        else:
            if preview["status"] not in ("already_applied",):
                conflict = True
            results.append(preview)

    rebuild_results = []
    if args.rebuild and not args.dry_run:
        rebuild_results = rebuild(args.root)

    changed_total = sum(r.get("changed_files", 0) for r in results)
    all_ok = all(r["status"] in ("would_rename", "renamed", "already_applied") for r in results)
    payload = {
        "success": all_ok and not conflict and all(b["status"] == "ok" for b in rebuild_results),
        "mode": "dry_run" if args.dry_run else "apply",
        "root": args.root,
        "renames": results,
        "changed_files_total": changed_total,
        "rebuild": rebuild_results,
        "retired_registry": os.path.relpath(RETIRED_PATH, args.root),
    }
    payload["verdict"] = ("dry_run_ok" if args.dry_run and all_ok else
                          "renamed" if all_ok and not args.dry_run else "blocked")
    emit(payload)
    return EXIT_OK if all_ok and not conflict and all(b["status"] == "ok" for b in rebuild_results) else EXIT_CONFLICT


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
