#!/usr/bin/env python3
"""
select_skills.py
由一个任务描述产出受 top-K 约束的选中技能 id 清单（不读取技能正文）。

Exit Code:
  0 - 清单产出完成（可为空清单）
  1 - 索引缺失或参数非法
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
RANK_SCRIPT = os.path.join(REPO_ROOT, "skills/rank-skills-bm25/scripts/rank_skills.py")
INDEX_JSON = os.path.join(REPO_ROOT, "docs/operations/skill-index.json")


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def select(task, top_k=5, index_path=INDEX_JSON):
    if not os.path.exists(index_path):
        return None, f"index not found: {index_path}"
    ranker = _load(RANK_SCRIPT, "bm25_rank")
    index, err = ranker.load_index(index_path)
    if index is None:
        return None, err

    # 只依赖 L2 排序器：选技清单本身不需要片段，也不该依赖 L3 总控（避免逆向依赖）。
    ranked = ranker.rank(index, task, top_k=top_k, offset=0)
    selected = [{"id": r["id"], "level": r["level"], "score": r["score"]}
                for r in ranked["results"]]

    return {
        "success": True,
        "task": task,
        "top_k": top_k,
        "count": len(selected),
        "truncated": ranked["total_hits"] > len(selected),
        "selected": selected,
        "selected_ids": [s["id"] for s in selected],
        "hint": None if selected else "零命中：请补充技能触发词后重建索引",
        "reads_skill_body": False,
    }, None


def main() -> int:
    parser = argparse.ArgumentParser(description="Select skills for a task (ids only)")
    parser.add_argument("--task", "-t", required=True)
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--index", default=INDEX_JSON)
    parser.add_argument("--json", action="store_true", help="JSON output (default)")
    args = parser.parse_args()

    result, err = select(args.task, args.top_k, args.index)
    if result is None:
        print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
        return 1

    for item in result["selected"]:
        if "content" in item or "body" in item:
            print(json.dumps({"success": False, "error": "policy violation: skill body present"},
                             ensure_ascii=False, indent=2))
            return 1

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
