# verify-no-unnecessary-question

L2 工序动作：对本次任务的提问记录做四项硬断言。

## 用途

`one-shot-resolution-policy` 第 ④ 条的物理执行层：证明本次任务没有不必要的追问——
提问 ≤ 1 次、每次都有红线支撑且不可逆、且合并为一次批量提问；未显式授权时默认零提问。

## 使用方式

```bash
python3 skills/verify-no-unnecessary-question/scripts/verify_no_question.py \
  --questions <questions.jsonl> [--allow-ask] [--json]
```

`--questions` 每行一条记录：

```json
{"seq":1,"item":"删除旧的日志目录","redline":"R1","reversible":false,"batch":true,"merged_count":2}
```

空行丢弃；非 JSON 行忽略。

## 四项断言（全过才 Exit 0）

| # | 断言 | 违规 kind |
| :--- | :--- | :--- |
| 1 | 提问次数 ≤ 1（每任务） | `too_many` |
| 2 | 每次提问必须同时满足「非空 `redline`」且「`reversible == false`」 | `no_redline` / `reversible` |
| 3 | 提问次数为 1 时必须 `batch == true` | `not_batched` |
| 4 | 未给 `--allow-ask` 时任何提问都判失败（默认零提问） | `too_many`（预算为 0，真因写在 `detail`） |

标杆样例（判定口径基准，改动断言后必须逐条回归）：

| 场景 | 参数 | 期望退出码 |
| :--- | :--- | :--- |
| 空 questions | 无 | 0 |
| 1 条合法提问（R1 + irreversible + batch） | 无 `--allow-ask` | 1 |
| 1 条合法提问（R1 + irreversible + batch） | `--allow-ask` | 0 |
| 2 条提问 | `--allow-ask` | 1（`too_many`） |
| 1 条无 redline 提问 | `--allow-ask` | 1（`no_redline`） |

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `success` | 四项断言是否全过 |
| `question_count` | 提问次数 |
| `violations[].seq` | 违规提问序号 |
| `violations[].kind` | `too_many` / `no_redline` / `reversible` / `not_batched` |
| `violations[].detail` | 人类可读违规说明 |
| `checks[].name` | 检查项名称 |
| `checks[].pass` | 该检查是否通过 |
| `checks[].detail` | 检查口径说明 |
| `ask_budget` | `{"allowed": 1, "used": n}` |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 四项断言全过 |
| 1 | 存在违规，或缺少 `--questions`、出现未知参数 |
| 2 | `--questions` 文件不存在或不可读 |

## 上下游

- 上游：`record-assumptions`（留痕完成后进入反问检测）、`classify-decision-reversibility`（提问合法性来源）、`fastlane-redline-policy`（红线 R1~R5 唯一真相源）。
- 下游：`one-shot-guard`（L3 门禁的最后一环，未过即阻断交付）。
