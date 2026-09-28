# fold-repeated-events

L2 工序动作：把逐条过程事件折叠为「里程碑逐条 + ×N 计数」的紧凑过程输出。

## 用途

过程输出里程碑化的压缩执行层：milestone 逐条保留，action 按类别计数，micro 汇总为一行，
把刷屏式过程日志收敛为可读的里程碑视图，且不静默丢弃任何条目。

## 使用方式

```bash
python3 skills/fold-repeated-events/scripts/fold_events.py --file <events.jsonl|txt> [--json]
cat events.jsonl | python3 skills/fold-repeated-events/scripts/fold_events.py --stdin
```

**stdout 契约**：默认（不带 `--json`）直接打印折叠后的 `rendered` 多行文本，**永远非空**；
带 `--json` 时打印六字段 JSON。两者都不写文件，结果全部走 stdout。

输入每行一条事件：纯文本，或 JSON `{"text": "..."}`。空行丢弃。

分档复用 `skills/classify-step-tier/scripts/classify_tier.py` 的 `classify()` 函数
（importlib 直接加载，不起子进程；加载失败时退化子进程）。

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `milestones` | 保留的里程碑原文列表（顺序同输入） |
| `actions` | `[{"category": "...", "count": N}]`，按类别首次出现顺序 |
| `micro_total` | 输入中被判定为 micro 的事件条数 |
| `rendered` | 折叠后的多行文本（里程碑逐条 + `· {category} ×N` + `· 微操作 ×N`） |
| `before_events` | 输入事件数 |
| `after_events` | rendered 行数 |

`rendered` 中**不得出现任何单条 micro 原文**。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 折叠完成（结果看 stdout） |
| 1 | 输入为空、文件不存在或不可读 |

## 上下游

- 上游：`classify-step-tier`（分档函数据此调用）。
- 下游：`verify-progress-budget`（对本脚本的 rendered 做预算与无损断言）。
