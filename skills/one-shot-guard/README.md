# one-shot-guard

L3 复合流程门禁：一次性解决、不反复提问。

## 用途

把「判定 → 决断 → 留痕 → 反问检测」串成一条不可跳步的门禁，挂载于管家「③ 冲突·冗余·质量」集群。
凡任务派单前与交付前都必须过这道门禁：交付清单必含 `assumptions` 段，
同一次任务出现第二次提问即判失败。本技能无自有脚本，串联调用下游四层。

## 使用方式

```bash
# ① ② 判定：逐项判成 decide_now / ask_once（红线编号来自 fastlane-redline-policy）
python3 skills/classify-decision-reversibility/scripts/classify_decision.py \
  --item "<不确定项>" [--redline R1..R5] [--item ... --redline ...] --json > /tmp/decisions.json

# ③ 留痕：生成可直接粘进交付回复的 本次假设 段落
python3 skills/record-assumptions/scripts/record_assumptions.py \
  --from-decisions /tmp/decisions.json --format md

# ③ 交付清单断言：必须存在 assumptions 段
grep -q '^## 本次假设' <交付清单 Markdown>

# ④ 反问检测：问题记录逐条断言
python3 skills/verify-no-unnecessary-question/scripts/verify_no_question.py \
  --questions /tmp/questions.jsonl [--allow-ask] --json
```

门禁串联口径：②③④ 任一环退出码非 0，即视为本次交付未过门禁，补齐后整条流水线重跑。

## 门禁链路

| 环 | 承接技能 | 放行条件 |
| :--- | :--- | :--- |
| ① 判定 | `one-shot-resolution-policy` | 判定优先级与例外口径已应用（红线唯一真相源为 `fastlane-redline-policy`） |
| ② 决断 | `classify-decision-reversibility` | Exit 0 且 `ask_budget.used <= 1` |
| ③ 留痕 | `record-assumptions` | Exit 0，交付清单含 `assumptions` 段且四元组齐备 |
| ④ 反问检测 | `verify-no-unnecessary-question` | Exit 0，四项断言全过 |

## 两道硬约束

1. **交付清单必含 `assumptions` 段**：缺段、或段内条目缺依据/回滚方式 → 阻断；
2. **第二次提问即判失败**：同一次任务提问次数 > 1，不论理由一律硬判失败。

## 输出字段

本技能不产出独立数据，透传下游字段：

| 字段 | 来源 | 含义 |
| :--- | :--- | :--- |
| `decisions[]` | classify-decision-reversibility | 逐项 `verdict` / `reversible` / `default_choice` / `rollback` |
| `ask_budget` | classify-decision-reversibility / verify-no-unnecessary-question | `{"allowed": 1, "used": n}` |
| `assumptions[]` | record-assumptions | 假设四元组「项 / 取值 / 依据 / 回滚方式」 |
| `violations[]` / `checks[]` | verify-no-unnecessary-question | 反问检测的违规明细与逐项检查结果 |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 门禁通过：判定完成、假设齐备、提问未超限 |
| 1 | 门禁阻断：假设缺依据或回滚方式、交付清单缺 `assumptions` 段、第二次提问、提问无红线支撑 |
| 2 | 输入不可读：判定输入或问题记录文件缺失、不可读、非法 |

## 上下游

- 上游：`fastlane-redline-policy`（红线 R1~R5 唯一真相源）、`one-shot-resolution-policy`（L1 元规则）。
- 下游：`dsh-butler`（管家「③ 冲突·冗余·质量」集群在派单前与交付前挂载本门禁）、`conflict-detector`（记录与 `confirm-before-coding` 的范围裁决）。
