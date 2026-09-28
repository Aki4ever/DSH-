# record-assumptions

L2 工序动作：把自行决断项写成可追溯、可回滚的假设四元组。

## 用途

`one-shot-resolution-policy` 第 ③ 条的物理执行层：把 `classify-decision-reversibility` 判出的
`decide_now` 项，转成交付清单里的 `assumptions` 段落（Markdown 表格或 JSON 数组）。

## 使用方式

```bash
# 命令行配对（--item 开启新条目，后三键填充该条目）
python3 skills/record-assumptions/scripts/record_assumptions.py \
  --item "<项>" --value "<取值>" --basis "<依据>" --rollback "<回滚方式>" \
  [--item ... --value ... --basis ... --rollback ...] [--format md|json] [--json]

# 导入判定结果（自动只取 verdict=decide_now 的项，default_choice 作为 value）
python3 skills/record-assumptions/scripts/record_assumptions.py \
  --from-decisions <classify_decision.py 的 JSON 输出> [--format md|json] [--json]
```

两种输入可同时给：命令行条目在前，导入条目在后，按序拼接。

## 配对口径

`--item` 开启一个新条目槽位；`--value` / `--basis` / `--rollback` 填充**当前**槽位。
若这三键出现在任何 `--item` 之前，参数直接判非法（避免错位配对）。

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `assumptions[].item` | 不确定项（项） |
| `assumptions[].value` | 自行决断的取值（取值） |
| `assumptions[].basis` | 依据，必填 |
| `assumptions[].rollback` | 回滚方式，必填 |
| `success` | 是否全部条目齐备 |

Markdown 模式输出可直接粘进交付回复的 `## 本次假设` 段落，表格列顺序为「项 / 取值 / 依据 / 回滚方式」。

## 校验规则

| 规则 | 处置 |
| :--- | :--- |
| 任一 entry 的 `basis` 为空 | Exit 1，输出 `violations[]`（`seq` / `item` / `missing` / `detail`） |
| 任一 entry 的 `rollback` 为空 | Exit 1，同上 |
| 没有任何可记录条目 | Exit 1 |
| `--from-decisions` 不是合法判定 JSON | Exit 2 |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 成功产出假设段（Markdown 或 JSON） |
| 1 | 缺项 / 缺依据 / 缺回滚方式 / 无可记录条目 / 参数不合法 |
| 2 | `--from-decisions` 文件不存在、不可读或非法 |

## 上下游

- 上游：`classify-decision-reversibility`（`decide_now` 判定与 `default_choice` / `basis` / `rollback`）、`one-shot-resolution-policy`（四元组口径）。
- 下游：`verify-no-unnecessary-question`（承接留痕后的反问检测）、`one-shot-guard`（L3 门禁要求交付清单必含 `assumptions`）。
