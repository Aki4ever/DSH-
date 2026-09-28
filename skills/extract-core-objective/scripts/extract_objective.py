#!/usr/bin/env python3
import sys
import argparse
import json
import re

STOPWORDS = [
    "你好", "您好", "请问", "麻烦", "劳驾", "谢谢", "拜托", "可不可以", "能不能", "我想", "要", "帮我",
    "啊", "呀", "吧", "呢", "哈", "呗", "哦", "嗯", "嘛", "啦", "进行", "一下", "一个"
]

def clean_noise(text: str) -> str:
    cleaned = text
    for w in STOPWORDS:
        cleaned = cleaned.replace(w, "")
    cleaned = re.sub(r"[,，。！？!?~…\s]+", " ", cleaned).strip()
    return cleaned

def extract_objective(text: str) -> dict:
    cleaned = clean_noise(text)
    # 提取常见动作动词与实体
    action_match = re.search(r"^(生成|创建|修改|转换|检测|提取|验证|过滤|规划|优化|分析|输出)", cleaned)
    action = action_match.group(1) if action_match else "处理"
    target = cleaned[len(action):].strip() if action_match else cleaned

    return {
        "raw": text,
        "cleaned": cleaned,
        "action": action,
        "target": target if target else cleaned
    }

def main():
    parser = argparse.ArgumentParser(description="Extract core objective from text")
    parser.add_argument("--text", "-t", required=True, help="Input raw text")
    args = parser.parse_args()

    res = extract_objective(args.text)
    print(json.dumps(res, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
