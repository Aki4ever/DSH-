#!/usr/bin/env python3
"""
plan_fission.py
粒度递归分裂规划器：扫描 SOP 步骤的物理探针绑定情况，输出分裂清单。

Exit Code:
  0 - 方案模式解析成功（即使存在待分裂项），或门禁模式下全部合格
  1 - 门禁模式存在待分裂项，或输入不可读
"""

import os
import re
import sys

# 关闭字节码落盘：本脚本会用 importlib 加载同仓其它技能模块，
# 避免在他人技能目录里生成 __pycache__。
sys.dont_write_bytecode = True
import json
import argparse

# 本脚本通过 importlib 加载同仓其它技能模块；关闭字节码落盘，
# 避免在他人技能目录生成 __pycache__（副作用归零）。

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))

VALID_PROBES = ("length", "regex", "exitcode", "file")

# ── 模糊词表唯一真相源 ────────────────────────────────────────────────
# 词表不再本地维护，改为从 detect-vague-modifier 加载 hedge（缓解/含糊）类。
# 该类的 13 个词是原先两份不一致词表的并集，收敛后覆盖不降、无误报。
VAGUE_WORD_MODULE = os.path.join(
    REPO_ROOT, "skills/detect-vague-modifier/scripts/detect_vague.py"
)


def _load_hedge_words():
    import importlib.util
    if not os.path.exists(VAGUE_WORD_MODULE):
        raise RuntimeError(
            f"模糊词表唯一真相源缺失: {VAGUE_WORD_MODULE}"
            "（请先确认 detect-vague-modifier 已落盘）"
        )
    spec = importlib.util.spec_from_file_location("vague_words_source", VAGUE_WORD_MODULE)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    classes = getattr(mod, "AMBIGUITY_WORDS", {})
    words = list(classes.get("hedge", []))
    if not words:
        raise RuntimeError("detect-vague-modifier 未导出 AMBIGUITY_WORDS['hedge']")
    return words


VAGUE_TERMS = _load_hedge_words()


PROBE_TAG_RE = re.compile(r"\[probe:\s*([A-Za-z]+)\s*\]")
STEP_RE = re.compile(r"^\s*(?:(\d+)[.)]|[-*])\s+(.+?)\s*$")
FENCE_RE = re.compile(r"^\s*```")


def resolve_input(path: str) -> str:
    abs_path = os.path.abspath(path)
    if os.path.isdir(abs_path):
        return os.path.join(abs_path, "SKILL.md")
    return abs_path


HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")


def extract_workflow_lines(content: str):
    """只取 `## Workflow` 章节的正文行（到下一个同级或更高级标题为止）。

    粒度纪律：只审查 SOP 本体，不把「触发场景 / 边界约束」里的说明性列表当成执行步骤。
    """
    lines = content.splitlines()
    start = None
    for i, line in enumerate(lines):
        m = HEADING_RE.match(line)
        if m and len(m.group(1)) == 2 and m.group(2).strip().lower().startswith("workflow"):
            start = i + 1
            continue
        if start is not None:
            m2 = HEADING_RE.match(line)
            if m2 and len(m2.group(1)) <= 2:
                return lines[start:i], start
    if start is None:
        return [], 0
    return lines[start:], start


def extract_steps(content: str):
    """提取 `## Workflow` 章节内的有序步骤，跳过代码围栏（如 mermaid 图）。"""
    section, offset = extract_workflow_lines(content)
    steps = []
    in_fence = False

    for idx, line in enumerate(section):
        if FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue

        m = STEP_RE.match(line)
        if m:
            steps.append({"line": offset + idx + 1, "text": m.group(2).strip()})

    return steps


def suggest_probe(text: str) -> str:
    if any(k in text for k in ("文件", "路径", "目录", "存在", "非空", "字节", "落地")):
        return "file"
    if any(k in text for k in ("正则", "匹配", "黑名单", "格式", "关键词")):
        return "regex"
    if any(k in text for k in ("字数", "长度", "截断", "上限", "剥离", "首尾")):
        return "length"
    return "exitcode"


def analyze(target: str, parent: str) -> dict:
    skill_md = resolve_input(target)
    if not os.path.exists(skill_md):
        return {"success": False, "error": f"input not found: {skill_md}"}

    try:
        with open(skill_md, "r", encoding="utf-8") as f:
            content = f.read()
    except (OSError, UnicodeDecodeError) as exc:
        return {"success": False, "error": f"unreadable input: {exc}"}

    steps = extract_steps(content)
    bound, unbound, plan = [], [], []
    vague_hits = []
    vague_steps = []

    for i, step in enumerate(steps, start=1):
        text = step["text"]
        tag = PROBE_TAG_RE.search(text)
        probe = tag.group(1).lower() if tag else None

        hits = [term for term in VAGUE_TERMS if term in text]
        if hits:
            vague_steps.append({"index": i, "line": step["line"], "terms": hits, "text": text})
            for term in hits:
                if term not in vague_hits:
                    vague_hits.append(term)

        if probe in VALID_PROBES:
            bound.append({"index": i, "line": step["line"], "probe": probe, "text": text})
            continue

        reason = "missing probe binding" if probe is None else f"invalid probe '{probe}'"
        unbound.append({"index": i, "line": step["line"], "reason": reason, "text": text})
        plan.append({
            "step_index": i,
            "source_line": step["line"],
            "text": text,
            "suggested_level": "L2",
            "suggested_probe": suggest_probe(text),
            "suggested_parent": parent,
        })

    fission_required = bool(unbound) or bool(vague_hits)

    return {
        "success": True,
        "input": skill_md,
        "parent": parent,
        "total_steps": len(steps),
        "bound_steps": bound,
        "unbound_steps": unbound,
        "vague_hits": vague_hits,
        "vague_steps": vague_steps,
        "fission_required": fission_required,
        "fission_plan": plan,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Plan atomic fission for a SOP or skill body")
    parser.add_argument("--input", "-i", required=True, help="Skill directory or SOP text file")
    parser.add_argument("--strict", action="store_true",
                        help="Gate mode: exit 1 when any step lacks a valid probe binding")
    parser.add_argument("--json", action="store_true", help="Force JSON output (default)")
    args = parser.parse_args()

    parent = os.path.basename(os.path.abspath(args.input)) or args.input
    result = analyze(args.input, parent)
    print(json.dumps(result, ensure_ascii=False, indent=2))

    if not result.get("success"):
        return 1
    if args.strict and result["fission_required"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
