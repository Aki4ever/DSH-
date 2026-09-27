#!/usr/bin/env python3
"""
classify_decision.py
决策可逆性判定器：把每个「不确定项」判成 decide_now（自行决断）或 ask_once（允许一次批量提问）。

判定依据的元规则来自 L1 规约 one-shot-resolution-policy；
红线编号 R1~R5 的唯一定义源是 skills/fastlane-redline-policy/SKILL.md，
本脚本不复制红线清单，只接收调用方传入的红线编号参数。

判定优先级（确定性，无随机、无时间依赖）：
  1. 命中不可逆信号 且 带红线  -> ask_once
  2. 命中不可逆信号 但 无红线  -> decide_now（必须选可回滚默认值 + 记录假设）
  3. 仅命中可逆信号            -> decide_now
  4. 两者都没命中              -> decide_now（保守默认：自行决断并记录假设）

Exit Code:
  0 - 判定完成（结果由 stdout 承载）
  1 - 未提供任何 item
  2 - --items 指向的文件不存在或不可读
"""

import os
import sys
import json

# 不可逆信号：命中即表示该决策「做错了很难轻松撤回」
IRREVERSIBLE_WORDS = [
    "删除", "清空", "覆盖", "发布", "部署", "推送", "上线",
    "卸载", "安装", "格式化", "迁移", "rm -rf", "drop", "需求变更", "基线",
]

# 可逆信号：命中即表示该决策「改了也能低成本改回来」
REVERSIBLE_WORDS = [
    "命名", "注释", "文档", "说明", "格式", "排序", "重命名", "草稿",
    "文案", "阈值", "默认值",
]

# 建议默认值规则：按顺序先命中先返回，三件套 = 默认值 / 依据 / 回滚方式
DEFAULT_RULES = [
    (
        "阈值",
        "取偏保守一侧的取值（更严/更小），并写成命名常量便于单点调整",
        "保守取值可避免误放行；常量集中定义使调整只需改一行",
        "改回原常量取值并重跑受影响的断言",
    ),
    (
        "命名",
        "统一采用 kebab-case（本技能池既有目录与技能 id 的唯一命名风格）",
        "与仓库既有目录、skills-index、catalog 的命名风格保持一致，避免口径分裂",
        "批量重命名回原风格并同步引用处，属纯字符串改动",
    ),
    (
        "删除",
        "先移动到可恢复位置（废纸篓 / .trash）并保留记录，不执行物理删除",
        "删除既有内容不可逆，先降级为可恢复动作可保留撤回窗口",
        "从废纸篓原样移回原路径",
    ),
    (
        "清空",
        "先备份到 .bak 再清空，原内容保留在备份中",
        "清空不可逆，备份后清空等价于可回滚",
        "用 .bak 覆盖回原位置",
    ),
    (
        "覆盖",
        "先备份既有文件为 .bak，再写入新内容",
        "覆盖既有内容不可逆，备份使覆盖可回滚",
        "用 .bak 覆盖回原位置",
    ),
    (
        "文档",
        "写入需求侧目录（docs/requirements），并在操作侧留一行指引",
        "需求文档是权威真相源，先写权威侧不会产生孤儿说明",
        "把文件与指引行一并挪回操作侧目录",
    ),
    (
        "目录",
        "写入需求侧目录（docs/requirements），并在操作侧留一行指引",
        "需求文档是权威真相源，先写权威侧不会产生孤儿说明",
        "把文件与指引行一并挪回操作侧目录",
    ),
    (
        "路径",
        "写入需求侧目录（docs/requirements），并在操作侧留一行指引",
        "需求文档是权威真相源，先写权威侧不会产生孤儿说明",
        "把文件与指引行一并挪回操作侧目录",
    ),
    (
        "推送",
        "本次不推送，只在本地完成提交并记录待推送清单",
        "推送对外可见且不可撤回，本地提交可随时重置",
        "本地提交可 reset 撤回；若已推送需增量 revert 而非改写历史",
    ),
    (
        "发布",
        "本次不发布，只产出可本地预览的产物并记录发布清单",
        "发布对外可见且不可撤回，本地产物可丢弃重生成",
        "丢弃本地产物；若已发布需回滚到上一版本产物",
    ),
    (
        "部署",
        "本次不部署，只在本地完成构建与自检并记录部署清单",
        "部署对外生效且难以撤回，本地构建零副作用",
        "回滚到上一版本部署产物",
    ),
    (
        "安装",
        "先不安装，改为记录依赖需求并给出可回滚的安装命令",
        "安装引入供应链风险且污染本机环境",
        "卸载该依赖并清理 lock / 缓存",
    ),
    (
        "迁移",
        "先在副本上迁移验证，原数据保持不动",
        "迁移不可逆，副本演练可零风险验证",
        "丢弃副本，原数据未被动过",
    ),
]

# 兜底规则：两者都没命中时的保守默认
FALLBACK_RULE = (
    "取最小改动方案先行落地，并在交付中显式标注为待确认假设",
    "可逆信号与不可逆信号均未命中，最小改动方案的爆炸半径最小",
    "按假设段落给出的回滚方式操作，最小改动通常只需撤销一处编辑",
)


def first_hit(text: str, words):
    """返回 text 中首个命中的词（按词表顺序，保证输出确定性），未命中返回 None。"""
    for word in words:
        if word in text:
            return word
    return None


def suggest_default(text: str):
    """按关键词给出「默认值 / 依据 / 回滚方式」三件套，未命中走兜底规则。"""
    for keyword, choice, basis, rollback in DEFAULT_RULES:
        if keyword in text:
            return choice, basis, rollback
    return FALLBACK_RULE


def classify_item(item: str, redline) -> dict:
    """判定单个不确定项，返回规范化决策对象。"""
    item = (item or "").strip()
    redline = redline.strip() if isinstance(redline, str) and redline.strip() else None

    bad_hit = first_hit(item, IRREVERSIBLE_WORDS)
    good_hit = first_hit(item, REVERSIBLE_WORDS)
    reversible = bad_hit is None

    choice, basis, rollback = suggest_default(item)

    if bad_hit is not None and redline is not None:
        verdict = "ask_once"
        reason = (
            f"命中不可逆信号「{bad_hit}」且带红线 {redline}，"
            f"允许提问一次（须与其它待问项批量合并）"
        )
    elif bad_hit is not None:
        verdict = "decide_now"
        reason = f"命中不可逆信号「{bad_hit}」但无红线支撑，不允许提问，须选可回滚默认值并记录假设"
    elif good_hit is not None:
        verdict = "decide_now"
        reason = f"仅命中可逆信号「{good_hit}」，自行决断并记录假设即可"
    else:
        verdict = "decide_now"
        reason = "未命中可逆或不可逆信号，按保守默认自行决断（decide_now）并记录假设"

    if bad_hit is not None and good_hit is not None:
        reason += f"；注意：同一项同时命中可逆信号「{good_hit}」，按不可逆信号优先判定"

    return {
        "item": item,
        "redline": redline,
        "reversible": reversible,
        "verdict": verdict,
        "reason": reason,
        "default_choice": choice,
        "rollback": rollback,
        "basis": basis,
    }


def read_items_file(path: str):
    """读取 JSONL 形式的不确定项文件；不可读返回 None。

    每行形如 {"item": "...", "redline": "R1"}，redline 可为空或省略。
    """
    if not os.path.exists(path) or not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            raw = handle.read()
    except (OSError, UnicodeDecodeError):
        return None

    items = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        payload = None
        if line.startswith("{"):
            try:
                payload = json.loads(line)
            except ValueError:
                payload = None
        if isinstance(payload, dict):
            items.append((str(payload.get("item", "")).strip(), payload.get("redline")))
        else:
            items.append((line, None))
    return items


def parse_argv(argv):
    """手工解析：支持 --item / --redline 交错出现与多次出现。

    --redline 作用域是「紧邻其前的那个 --item」；若前面没有 item，
    则作为默认红线应用到所有未显式配对的红线为空的 item 上。
    这种交错配对方式可避免 nargs 把多个 item 与多个 redline 错位对应。

    返回 (items, use_json)；items 为 [(item, redline), ...]；解析失败返回 None。
    """
    items = []
    default_redline = None
    use_json = False

    index = 0
    while index < len(argv):
        token = argv[index]
        if token == "--item":
            if index + 1 >= len(argv):
                return None
            items.append([argv[index + 1], None])
            index += 2
        elif token == "--redline":
            if index + 1 >= len(argv):
                return None
            value = argv[index + 1]
            if items and items[-1][1] is None:
                items[-1][1] = value
            else:
                default_redline = value
            index += 2
        elif token == "--json":
            use_json = True
            index += 1
        else:
            return None

    if default_redline is not None:
        for entry in items:
            if entry[1] is None:
                entry[1] = default_redline

    return [(str(i).strip(), r) for i, r in items], use_json


def main() -> int:
    argv = sys.argv[1:]

    # 先摘出 --items / --json，剩余参数交给配对解析器
    items_path = None
    rest = []
    index = 0
    while index < len(argv):
        if argv[index] == "--items":
            if index + 1 >= len(argv):
                print(json.dumps({"success": False, "error": "缺少 --items 参数值"},
                                 ensure_ascii=False))
                return 1
            items_path = argv[index + 1]
            index += 2
        else:
            rest.append(argv[index])
            index += 1

    parsed = parse_argv(rest)
    if parsed is None:
        print(json.dumps({
            "success": False,
            "error": "参数不合法：--item/--redline 必须成对提供，未知参数一律拒绝",
        }, ensure_ascii=False))
        return 1
    pairs, use_json = parsed

    if items_path is not None:
        loaded = read_items_file(items_path)
        if loaded is None:
            print(json.dumps({"success": False, "error": f"文件不存在或不可读: {items_path}"},
                             ensure_ascii=False))
            return 2
        pairs.extend(loaded)

    pairs = [(i, r) for i, r in pairs if i]
    if not pairs:
        print(json.dumps({"success": False, "error": "未提供任何 --item 或 --items"},
                         ensure_ascii=False))
        return 1

    decisions = [classify_item(item, redline) for item, redline in pairs]

    decide_now = sum(1 for d in decisions if d["verdict"] == "decide_now")
    ask_once = sum(1 for d in decisions if d["verdict"] == "ask_once")
    # 提问预算：每任务允许 1 次；已有 ask_once 项时视为预算已被这批批量提问用掉
    used = 1 if ask_once > 0 else 0

    payload = {
        "success": True,
        "decisions": decisions,
        "summary": {"decide_now": decide_now, "ask_once": ask_once},
        "ask_budget": {"allowed": 1, "used": used},
    }

    if use_json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        for entry in decisions:
            redline = entry["redline"] or "null"
            print(f"{entry['verdict']}\t{redline}\t{entry['item']}\t{entry['reason']}")
        print(json.dumps(payload["summary"], ensure_ascii=False))

    return 0


if __name__ == "__main__":
    sys.exit(main())
