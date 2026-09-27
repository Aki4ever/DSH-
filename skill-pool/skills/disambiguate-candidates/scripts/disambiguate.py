#!/usr/bin/env python3
import sys
import argparse
import json

def disambiguate(candidates: list) -> dict:
    if not candidates:
        return {"chosen": None, "synergy": [], "ambiguity_resolved": True}

    # 排序取最高分
    sorted_candidates = sorted(candidates, key=lambda x: x.get("score", 0), reverse=True)
    best = sorted_candidates[0]

    # 检查是否存在得分完全相同的互斥项
    ties = [c for c in sorted_candidates if c.get("score") == best.get("score")]
    is_tied = len(ties) > 1

    # 提取非冲突协同项 (如 L1 配合 L3)
    synergies = []
    best_comp = set(best.get("composition", []))
    for c in sorted_candidates[1:]:
        # 若某项已被包含在 best 的 composition 里，则无需重复调用
        if c.get("id") in best_comp:
            continue
        # 分数达到阈值可作为协同项
        if c.get("score", 0) >= best.get("score", 0) * 0.6:
            synergies.append(c.get("id"))

    return {
        "chosen": best.get("id"),
        "best_score": best.get("score"),
        "is_tied": is_tied,
        "synergies": synergies[:2],
        "ambiguity_resolved": True
    }

def main():
    parser = argparse.ArgumentParser(description="Disambiguate skill candidates")
    parser.add_argument("--candidates-json", required=True, help="JSON string of candidate list")
    args = parser.parse_args()

    candidates = json.loads(args.candidates_json)
    res = disambiguate(candidates)
    print(json.dumps(res, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
