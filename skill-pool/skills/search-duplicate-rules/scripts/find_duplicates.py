#!/usr/bin/env python3
import sys
import argparse
import json

def tokenize(text: str) -> set:
    # 简单中文单字/英文单词切分
    chars = set()
    for ch in text.strip().lower():
        if ch.isalnum():
            chars.add(ch)
    return chars

def jaccard_similarity(s1: set, s2: set) -> float:
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    return len(s1.intersection(s2)) / len(s1.union(s2))

def check_redundancy(rules: list, threshold: float = 0.65) -> dict:
    duplicates = []
    for i in range(len(rules)):
        s1 = tokenize(rules[i])
        for j in range(i + 1, len(rules)):
            s2 = tokenize(rules[j])
            sim = jaccard_similarity(s1, s2)
            if sim >= threshold:
                duplicates.append({
                    "rule_a": rules[i],
                    "rule_b": rules[j],
                    "similarity": round(sim, 2),
                    "redundant": True
                })
    return {
        "has_redundancy": len(duplicates) > 0,
        "duplicate_count": len(duplicates),
        "duplicates": duplicates
    }

def main():
    parser = argparse.ArgumentParser(description="Find duplicate and redundant rules")
    parser.add_argument("--rules", nargs="+", required=True, help="List of rules to compare")
    parser.add_argument("--threshold", type=float, default=0.65, help="Similarity threshold")
    args = parser.parse_args()

    res = check_redundancy(args.rules, args.threshold)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if not res["has_redundancy"] else 1)

if __name__ == "__main__":
    main()
