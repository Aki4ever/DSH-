# classify-decision-reversibility

L2 工序动作：把不确定项确定性判定为 `decide_now` / `ask_once`。

## 用途

`one-shot-resolution-policy` 规约的物理执行层：给出每个不确定项的可逆性标签、判定结论、
建议可回滚默认值与回滚方式，作为留痕层与门禁层的输入。

**红线唯一真相源**：红线 R1~R5 定义在 `skills/fastlane-redline-policy/SKILL.md`；
本技能通过 `--redline` 接收编号参数，不复制红线清单。

## 使用方式

```bash
python3 skills/classify-decision-reversibility/scripts/classify_decision.py \
  --item "<不确定项>" [--redline R1..R5] [--item ... --redline ...] [--json]

python3 skills/classify-decision-reversibility/scripts/classify_decision.py \
  --items <JSONL 文件> [--json]
```

`--redline` 紧跟在它所修饰的 `--item` 之后（交错配对）；若写在所有 `--item` 之前或之后无配对项，
则作为默认红线应用到尚未配对红线的项上。

`--items` 每行一条：`{"item": "...", "redline": "R1"|null}`；纯文本行按无红线处理；空行丢弃。

## 判定规则（先命中先返回，确定性）

| 优先级 | 条件 | verdict | 处置 |
| :--- | :--- | :--- | :--- |
| 1 | 命中不可逆信号 **且** 带红线 | `ask_once` | 允许提问一次，必须与其它待问项批量合并 |
| 2 | 命中不可逆信号 **但** 无红线 | `decide_now` | 必须选可回滚默认值并记录假设 |
| 3 | 仅命中可逆信号 | `decide_now` | 自行决断并记录假设 |
| 4 | 两者都没命中 | `decide_now` | 保守默认：自行决断并记录假设 |

| 词表 | 词条 |
| :--- | :--- |
| 不可逆信号 | 删除 / 清空 / 覆盖 / 发布 / 部署 / 推送 / 上线 / 卸载 / 安装 / 格式化 / 迁移 / `rm -rf` / `drop` / 需求变更 / 基线 |
| 可逆信号 | 命名 / 注释 / 文档 / 说明 / 格式 / 排序 / 重命名 / 草稿 / 文案 / 阈值 / 默认值 |

标杆样例（判定口径基准，改动词表后必须逐条回归）：

| 不确定项 | 红线 | 期望 verdict |
| :--- | :--- | :--- |
| 阈值取 0.85 还是 0.9 | 无 | `decide_now`（命中可逆信号「阈值」） |
| 命名风格用 kebab-case 还是 snake_case | 无 | `decide_now`（命中可逆信号「命名」） |
| 输出文件放 docs/operations 还是 docs/requirements | 无 | `decide_now`（均未命中，保守默认） |
| 删除旧的日志目录 | R1 | `ask_once` |
| 推送到远端 | R2 | `ask_once` |

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `decisions[].item` | 不确定项原文 |
| `decisions[].redline` | 传入的红线编号，无则 `null` |
| `decisions[].reversible` | 是否可逆（命中不可逆信号即 `false`） |
| `decisions[].verdict` | `decide_now` / `ask_once` |
| `decisions[].reason` | 判定依据（人类可读） |
| `decisions[].default_choice` | 建议的可回滚默认值 |
| `decisions[].rollback` | 回滚方式 |
| `decisions[].basis` | 建议默认值的依据（供留痕层直接引用） |
| `summary` | `{"decide_now": n, "ask_once": n}` |
| `ask_budget` | `{"allowed": 1, "used": n}` |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 判定完成 |
| 1 | 未提供 item、参数不合法（未知参数或缺配对值） |
| 2 | `--items` 文件不存在或不可读 |

## 上下游

- 上游：`fastlane-redline-policy`（红线 R1~R5 唯一真相源）、`one-shot-resolution-policy`（判定优先级）。
- 下游：`record-assumptions`（消费 `default_choice` / `basis` / `rollback`）、`verify-no-unnecessary-question`、`one-shot-guard`。
