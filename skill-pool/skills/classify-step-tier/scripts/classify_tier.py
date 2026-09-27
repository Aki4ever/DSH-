#!/usr/bin/env python3
"""
classify_tier.py
过程事件三档分档器：把一条过程事件判定为 milestone / micro / action，并给出 category 归类。

判定优先级（先命中先返回，纯词表驱动，确定性、无随机、无时间依赖）：
  1. milestone —— 命中阶段词表；
  2. micro     —— 命中微操作词表；
  3. action    —— 两表皆未命中。

Exit Code:
  0 - 判定完成（结果由 stdout 承载）
  1 - 输入为空、文件不存在或参数缺失
"""

import os
import sys
import json
import argparse

# 阶段词表：命中即视为「状态推进」的里程碑
MILESTONE_WORDS = [
    "生成完毕", "门禁通过", "阶段目标", "里程碑",
    "已完成", "完成", "到达", "通过", "落库", "交付",
    "合并", "发布", "验收", "全量", "结束", "就绪",
]

# 微操作词表：高重复、无信息增量的机械操作，必须折叠
# 覆盖四类语义：机读操作（读取/查看/打印）、界面操作（点击/开关/滚动/复制粘贴）、
# 交通载具上下与进出（上车/下车/进站/出站/驶入/驶出）、拾取与重试（拾取/拿起/放下/按下/重试）。
MICRO_WORDS = [
    "读取文件", "写入一行", "执行命令", "调用脚本", "切换窗口",
    "重试一次", "编译单文件", "单条测试",
    "打开", "关闭", "点击", "滚动", "复制", "粘贴",
    "格式化", "查看", "列出", "打印",
    "上车", "下车", "进站", "出站", "驶入", "驶出",
    "开门", "关门", "拾取", "拿起", "放下", "按下", "重试",
]

# category 归类规则：按顺序先命中先返回，未命中归入「其他」
CATEGORY_RULES = [
    ("读取", ["读取", "打开", "查看", "列出", "打印", "载入", "加载", "浏览"]),
    ("命令", ["执行命令", "调用脚本", "运行", "命令", "终端", "shell", "编译", "格式化"]),
    ("写入", ["写入", "保存", "落库", "创建", "修改", "删除", "生成", "替换", "输出文件"]),
    ("检索", ["检索", "搜索", "查询", "查找", "匹配", "扫描", "grep", "遍历"]),
    ("测试", ["测试", "断言", "校验", "验证", "用例", "pytest"]),
    ("网络", ["请求", "接口", "下载", "上传", "网络", "http", "api", "curl", "抓取"]),
]

DEFAULT_CATEGORY = "其他"


def match_words(text: str, words) -> list:
    """返回 text 中命中的词，按词长降序（等长保持词表顺序），保证输出确定性。"""
    hits = [w for w in words if w in text]
    return sorted(hits, key=len, reverse=True)


def categorize(text: str) -> str:
    """动作归类：读取 / 命令 / 写入 / 检索 / 测试 / 网络 / 其他。"""
    for name, words in CATEGORY_RULES:
        if any(w in text for w in words):
            return name
    return DEFAULT_CATEGORY


def classify(text: str) -> dict:
    """判定单条事件，返回 {"tier","category","matched","reason","text"}。"""
    text = (text or "").strip()

    milestone_hits = match_words(text, MILESTONE_WORDS)
    if milestone_hits:
        tier = "milestone"
        matched = milestone_hits
        reason = f"命中阶段词表: {milestone_hits[0]}"
    else:
        micro_hits = match_words(text, MICRO_WORDS)
        if micro_hits:
            tier = "micro"
            matched = micro_hits
            reason = f"命中微操作词表: {micro_hits[0]}"
        else:
            tier = "action"
            matched = []
            reason = "未命中阶段词表与微操作词表，按工序动作处理"

    return {
        "tier": tier,
        "category": categorize(text),
        "matched": matched,
        "reason": reason,
        "text": text,
    }


def read_file_events(path: str):
    """读取每行一条事件的文件，返回去空行后的事件列表；不可读返回 None。

    每行支持两种形态：纯文本，或 JSON {"text": "..."}（与 fold-repeated-events
    的输入口径保持一致，避免同一条事件在上游下游被判成不同档位）。
    """
    if not os.path.exists(path) or not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            raw = handle.read()
    except (OSError, UnicodeDecodeError):
        return None

    events = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        text = line
        if line.startswith("{"):
            try:
                payload = json.loads(line)
            except ValueError:
                payload = None
            if isinstance(payload, dict) and isinstance(payload.get("text"), str):
                text = payload["text"].strip()
        if text:
            events.append(text)
    return events


def main() -> int:
    parser = argparse.ArgumentParser(description="Classify a process event into milestone / micro / action")
    source = parser.add_mutually_exclusive_group(required=False)
    source.add_argument("--text", "-t", help="单条过程事件文本")
    source.add_argument("--file", "-f", help="每行一条事件的文本文件")
    parser.add_argument("--json", action="store_true", help="以 JSON 输出")
    args = parser.parse_args()

    if args.text is not None:
        events = [(args.text or "").strip()]
        if not events[0]:
            print(json.dumps({"success": False, "error": "输入为空"}, ensure_ascii=False))
            return 1
    elif args.file:
        loaded = read_file_events(args.file)
        if loaded is None:
            print(json.dumps({"success": False, "error": f"文件不存在或不可读: {args.file}"},
                             ensure_ascii=False))
            return 1
        if not loaded:
            print(json.dumps({"success": False, "error": "输入为空"}, ensure_ascii=False))
            return 1
        events = loaded
    else:
        print(json.dumps({"success": False, "error": "必须提供 --text 或 --file"},
                         ensure_ascii=False))
        return 1

    results = [classify(ev) for ev in events]

    if args.json:
        if len(results) == 1:
            payload = results[0]
        else:
            payload = {"count": len(results), "results": results}
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        for item in results:
            print(f"{item['tier']}\t{item['category']}\t{item['text']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
