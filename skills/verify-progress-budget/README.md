# verify-progress-budget

L2 工序动作：对折叠后的过程输出做四项硬断言，全过才放行。

## 用途

过程输出里程碑化的放行闸门：折叠器不自证，由本门禁对折叠产物逐项断言，
任何一项失败都禁止把违规过程输出交给用户。

## 使用方式

```bash
python3 skills/verify-progress-budget/scripts/verify_progress.py --file <events.jsonl> \
  [--max-milestones 8] [--json] [--rendered <折叠产物文件>]
```

`--rendered` 为可选对抗式校验：改为断言外部给定的折叠产物（例如被手工删过里程碑的产物）。

## 四项断言

| 断言名 | 内容 | 失败含义 |
| :--- | :--- | :--- |
| `no_micro_leak` | rendered 中不含任何 micro 级事件原文 | 微操作未被折叠，过程输出仍刷屏 |
| `milestone_budget` | 折叠后保留的里程碑数 ≤ `--max-milestones`（默认 8） | 里程碑超预算，读者抓不住重点 |
| `milestone_coverage` | 输入中所有 milestone 事件都出现在 rendered 中（100%） | 里程碑被吞，信息失真 |
| `event_count_not_increased` | rendered 行数 ≤ 输入事件数 | 折叠后反而变长，折叠失效 |

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `success` | 四项断言是否全部通过 |
| `checks` | `[{"name","pass","detail"}]` 逐项判定与明细 |
| `before_events` | 输入事件数 |
| `after_events` | 折叠后事件数（rendered 行数） |
| `milestones` | 折叠后实际保留的里程碑条数 |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 四项断言全部通过 |
| 1 | 任一断言失败，或输入为空/不可读、折叠器不可用 |

## 上下游

- 上游：`fold-repeated-events`（提供 rendered）、`classify-step-tier`（分档口径）。
- 下游：`milestone-progress-reporter`（过程输出总控的终检环节）。
