#!/usr/bin/env python3
"""
record_assumptions.py
假设留痕器：把「自行决断」的不确定项写成可追溯、可回滚的假设条目。

元规则来自 L1 规约 one-shot-resolution-policy 第 ③ 条：
所作假设必须随交付给出，四元组为「项 / 取值 / 依据 / 回滚方式」。
因此本脚本对每条假设做硬校验：缺 basis 或 rollback 一律 Exit 1（假设必须可追溯、可回滚）。

两种输入：
  1. 命令行配对：--item a --value b --basis c --rollback d（可多次，按出现顺序逐位配对）；
  2. 导入判定结果：--from-decisions <classify_decision.py 的 JSON 输出>，
     自动把 verdict=decide_now 的项转成假设条目，default_choice 作为 value。

Exit Code:
  0 - 成功产出假设段
  1 - 缺项 / 缺依据 / 缺回滚方式（或没有任何可记录的条目）
  2 - 输入不可读（--from-decisions 指向的文件不存在、不可读或不是合法 JSON）
"""

import os
import sys
import json

# 假设四元组的规范字段顺序，输出与校验都以它为准
FIELDS = ("item", "value", "basis", "rollback")
# 必填字段：其余字段可为空，basis 与 rollback 任一为空即视为未留痕
REQUIRED_FIELDS = ("basis", "rollback")


def parse_argv(argv):
    """解析 --item/--value/--basis/--rollback 交错参数，返回四个平行列表。

    --from-decisions / --format / --json 不在此解析。
    出现重复的 --item 即开启一个新条目槽位，其余三键按当前槽位填充；
    这种交错配对方式可避免多个列表错位对应。
    """
    items, values, bases, rollbacks = [], [], [], []
    index = 0
    while index < len(argv):
        token = argv[index]
        if token in ("--item", "--value", "--basis", "--rollback"):
            if index + 1 >= len(argv):
                return None
            value = argv[index + 1]
            if token == "--item":
                items.append(value)
                values.append(None)
                bases.append(None)
                rollbacks.append(None)
            else:
                if not items:
                    # 未先声明 item 就出现其它字段：视为缺少归属，拒绝
                    return None
                if token == "--value":
                    values[-1] = value
                elif token == "--basis":
                    bases[-1] = value
                else:
                    rollbacks[-1] = value
            index += 2
        else:
            return None
    return items, values, bases, rollbacks


def normalize(text):
    """空值与 None 统一归一为去空白字符串。"""
    if text is None:
        return ""
    return str(text).strip()


def load_decisions(path: str):
    """读取 classify_decision.py 的输出 JSON；不可读返回 None。

    只取 verdict == "decide_now" 的项作为假设条目：
    default_choice 作为 value，原样带上 basis 与 rollback。
    """
    if not os.path.exists(path) or not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            raw = handle.read()
    except (OSError, UnicodeDecodeError):
        return None

    try:
        payload = json.loads(raw)
    except ValueError:
        return None
    if not isinstance(payload, dict):
        return None

    decisions = payload.get("decisions")
    if not isinstance(decisions, list):
        return None

    entries = []
    for decision in decisions:
        if not isinstance(decision, dict):
            continue
        if normalize(decision.get("verdict")) != "decide_now":
            continue
        entries.append({
            "item": normalize(decision.get("item")),
            "value": normalize(decision.get("default_choice")),
            "basis": normalize(decision.get("basis")),
            "rollback": normalize(decision.get("rollback")),
        })
    return entries


def to_markdown(entries):
    """渲染可直接粘进交付回复的 `## 本次假设` 段落。"""
    lines = [
        "## 本次假设",
        "",
        "以下条目为本次任务自行决断项，均给依据与回滚方式；如不认可，按回滚方式撤销即可。",
        "",
        "| 项 | 取值 | 依据 | 回滚方式 |",
        "| :--- | :--- | :--- | :--- |",
    ]
    for entry in entries:
        cells = [entry[f].replace("|", "\\|").replace("\n", " ") for f in FIELDS]
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines) + "\n"


def main() -> int:
    argv = sys.argv[1:]

    decisions_path = None
    fmt = "md"
    use_json = False
    rest = []

    index = 0
    while index < len(argv):
        token = argv[index]
        if token == "--from-decisions":
            if index + 1 >= len(argv):
                print(json.dumps({"success": False, "error": "缺少 --from-decisions 参数值"},
                                 ensure_ascii=False))
                return 1
            decisions_path = argv[index + 1]
            index += 2
        elif token == "--format":
            if index + 1 >= len(argv):
                print(json.dumps({"success": False, "error": "缺少 --format 参数值"},
                                 ensure_ascii=False))
                return 1
            fmt = argv[index + 1]
            index += 2
        elif token == "--json":
            use_json = True
            index += 1
        else:
            rest.append(token)
            index += 1

    if fmt not in ("md", "json"):
        print(json.dumps({"success": False, "error": f"--format 仅支持 md|json，收到: {fmt}"},
                         ensure_ascii=False))
        return 1

    parsed = parse_argv(rest)
    if parsed is None:
        print(json.dumps({
            "success": False,
            "error": "参数不合法：--item/--value/--basis/--rollback 必须成对提供，且 value/basis/rollback 不得先于 --item 出现",
        }, ensure_ascii=False))
        return 1

    items, values, bases, rollbacks = parsed
    entries = []
    for position in range(len(items)):
        entries.append({
            "item": normalize(items[position]),
            "value": normalize(values[position]),
            "basis": normalize(bases[position]),
            "rollback": normalize(rollbacks[position]),
        })

    if decisions_path is not None:
        imported = load_decisions(decisions_path)
        if imported is None:
            print(json.dumps({
                "success": False,
                "error": f"输入不可读或不是合法判定 JSON: {decisions_path}",
            }, ensure_ascii=False))
            return 2
        entries.extend(imported)

    if not entries:
        print(json.dumps({
            "success": False,
            "error": "没有任何可记录的假设条目（未提供 --item，且 --from-decisions 无 decide_now 项）",
        }, ensure_ascii=False))
        return 1

    # 硬校验：basis 与 rollback 缺一不可
    violations = []
    for position, entry in enumerate(entries, start=1):
        missing = [f for f in REQUIRED_FIELDS if not entry[f]]
        if missing:
            violations.append({
                "seq": position,
                "item": entry["item"],
                "missing": missing,
                "detail": f"第 {position} 条假设缺少字段: {', '.join(missing)}",
            })

    if violations:
        print(json.dumps({
            "success": False,
            "error": "假设必须可追溯、可回滚：存在缺少依据或回滚方式的条目",
            "violations": violations,
            "assumptions": entries,
        }, ensure_ascii=False, indent=2))
        return 1

    if use_json or fmt == "json":
        print(json.dumps({"success": True, "assumptions": entries}, ensure_ascii=False, indent=2))
    else:
        sys.stdout.write(to_markdown(entries))

    return 0


if __name__ == "__main__":
    sys.exit(main())
