#!/usr/bin/env python3
"""
dispatch_on_demand.py
按需调用总控：选技 → 逐个加载 → 预算断言 → 输出上下文包。

Exit Code:
  0 - 断言通过（空清单也算通过）
  1 - 索引缺失 / 越权加载 / 超 top-K / 超字节预算
"""

import os
import sys

# 关闭字节码落盘：本脚本会用 importlib 加载同仓其它技能模块，
# 避免在他人技能目录里生成 __pycache__。
sys.dont_write_bytecode = True
import json
import argparse
import importlib.util


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
SELECT_SCRIPT = os.path.join(REPO_ROOT, "skills/select-skills-for-task/scripts/select_skills.py")
LOAD_SCRIPT = os.path.join(REPO_ROOT, "skills/load-skill-contract/scripts/load_contract.py")
VERIFY_SCRIPT = os.path.join(REPO_ROOT, "skills/verify-context-payload/scripts/verify_payload.py")
INDEX_JSON = os.path.join(REPO_ROOT, "docs/operations/skill-index.json")


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def dispatch(task, top_k, max_skills, max_bytes, emit, index_path=INDEX_JSON):
    if not os.path.exists(index_path):
        return None, f"index not found: {index_path}"

    sel = _load(SELECT_SCRIPT, "od_select")
    ldr = _load(LOAD_SCRIPT, "od_load")
    vfy = _load(VERIFY_SCRIPT, "od_verify")

    selection, err = sel.select(task, top_k=top_k, index_path=index_path)
    if selection is None:
        return None, err

    selected = selection["selected_ids"]
    loaded, package, load_errors = [], [], []

    for sid in selected[:max_skills]:
        item, lerr = ldr.load_one(sid, meta_only=not emit)
        if item is None:
            load_errors.append({"id": sid, "error": lerr})
            continue
        loaded.append(sid)
        if emit:
            package.append({"id": sid, "content": item["content"]})

    manifest = {"selected": selected, "loaded": loaded}
    check, verr = vfy.verify(selected, loaded, max_skills, max_bytes)
    if check is None:
        return None, verr

    result = {
        "success": check["success"],
        "task": task,
        "top_k": top_k,
        "selected_ids": selected,
        "loaded_ids": loaded,
        "unselected_reads": [x for x in loaded if x not in selected],
        "manifest": manifest,
        "total_bytes": check["total_bytes"],
        "total_tokens": check["total_tokens"],
        "emit": bool(emit),
        "verify": {"checks": check["checks"]},
        "load_errors": load_errors,
        "hint": selection.get("hint"),
    }
    if emit:
        result["package"] = package
    return result, None


def main() -> int:
    parser = argparse.ArgumentParser(description="On-demand dispatch of butler subordinates")
    parser.add_argument("--task", "-t", required=True)
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--max-skills", type=int, default=5)
    parser.add_argument("--max-bytes", type=int, default=12288)
    parser.add_argument("--emit", action="store_true", help="Include skill bodies in the package")
    parser.add_argument("--index", default=INDEX_JSON)
    parser.add_argument("--json", action="store_true", help="JSON output (default)")
    args = parser.parse_args()

    result, err = dispatch(args.task, args.top_k, args.max_skills, args.max_bytes,
                           args.emit, args.index)
    if result is None:
        print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
        return 1

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["success"] else 1


if __name__ == "__main__":
    sys.exit(main())
