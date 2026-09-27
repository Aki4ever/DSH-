# one-shot-resolution-policy

L1 原子规约：一次性解决，不反复提问。

## 用途

定义「默认不提问 + 可回滚默认值 + 假设留痕 + 例外仅红线且不可逆」四条原子条款，
并裁决 `confirm-before-coding` 的作用域边界。本技能无脚本，是纯规约文本。

## 使用方式

作为条款被下游引用，无直接命令：

```bash
# 判定层：把不确定项判成 decide_now / ask_once（红线编号来自 fastlane-redline-policy）
python3 skills/classify-decision-reversibility/scripts/classify_decision.py \
  --item "阈值取 0.85 还是 0.9" --json

# 留痕层：把决断项写成假设四元组
python3 skills/record-assumptions/scripts/record_assumptions.py \
  --item "阈值" --value "0.9" --basis "与既有口径一致" --rollback "配置项单点回退" --format md

# 断言层：断言本次任务提问未超限
python3 skills/verify-no-unnecessary-question/scripts/verify_no_question.py \
  --questions /tmp/questions.jsonl --json
```

## 四条条款

| 编号 | 条款 | 物理判据 |
| :--- | :--- | :--- |
| ① | 默认不提问 | 未同时命中「不可逆信号 + 红线」即不得发起提问 |
| ② | 选自决可回滚默认值 | 决断项必须给出非空 `default_choice` 与 `rollback` |
| ③ | 假设必须随交付给出 | 假设四元组「项 / 取值 / 依据 / 回滚方式」四字段全非空 |
| ④ | 例外 = 红线 + 不可逆，每任务 ≤ 1 次且批量合并 | `ask_once` 计数 ≤ 1，且 `batch == true` |

## 与 confirm-before-coding 的关系

`confirm-before-coding`（@system L2）的作用域被**收窄为「红线内且不可逆」**：

- 普通写入（可回滚）→ 不再逐次确认，自行决断 + 记录假设；
- 红线内且不可逆 → 仍然确认，但每任务**合并为一次**。

## 输出字段

本技能不产出数据，只定义下游三层的字段口径：

| 字段 | 所属技能 | 含义 |
| :--- | :--- | :--- |
| `verdict` | classify-decision-reversibility | `decide_now` / `ask_once` |
| `reversible` | classify-decision-reversibility | 该项是否可逆 |
| `default_choice` | classify-decision-reversibility | 建议的可回滚默认值 |
| `rollback` | classify-decision-reversibility / record-assumptions | 回滚方式 |
| `assumptions[]` | record-assumptions | 假设四元组数组 |
| `ask_budget` | classify-decision-reversibility / verify-no-unnecessary-question | 提问预算与已用次数 |

## 退出码

本技能无脚本，退出码口径由下游三层实现：

| 码 | 含义 |
| :--- | :--- |
| 0 | 符合规约（判定完成 / 假设完整 / 提问未超限） |
| 1 | 违反规约（第二次提问、假设缺依据或回滚方式、提问无红线支撑） |
| 2 | 输入不可读 |

## 上下游

- 上游：`fastlane-redline-policy`（红线 R1~R5 的唯一真相源）。
- 下游：`classify-decision-reversibility`、`record-assumptions`、`verify-no-unnecessary-question`、`one-shot-guard`（L3 门禁）。
