# milestone-progress-reporter

L3 复合流程：过程输出里程碑化总控（分档 → 折叠 → 预算断言）。

## 用途

过程输出形态的唯一总控出口，挂载于管家**「④ 输出规约」集群**。
把 L1 规约、L2 分档、L2 折叠、L2 断言串成一条可阻断的流水线，
保证交付的过程输出是「里程碑逐条 + ×N 计数」，而不是刷屏式的微操作流水账。

## 使用方式

```bash
python3 skills/classify-step-tier/scripts/classify_tier.py --file <events.jsonl> --json
python3 skills/fold-repeated-events/scripts/fold_events.py --file <events.jsonl> --json
python3 skills/verify-progress-budget/scripts/verify_progress.py --file <events.jsonl> --json
```

## 组成

| 组成 | 级别 | 职责 |
| :--- | :--- | :--- |
| `milestone-only-progress` | L1 | 三档定义（milestone / action / micro）与折叠规则 |
| `classify-step-tier` | L2 | 逐条确定性分档 + `category` 归类 |
| `fold-repeated-events` | L2 | 折叠为里程碑逐条 + `×N` 计数 |
| `verify-progress-budget` | L2 | 四项预算与无损断言，全过才放行 |

## 两条红线

1. **里程碑只增不删**：input 中的 milestone 原文必须逐条出现在终态输出（覆盖率 100%）。
2. **微操作只折叠不静默丢弃**：micro 必须留 `· 微操作 ×N` 计数，N 与输入 micro 条数相等。

## 输出字段

| 字段 | 来源 | 含义 |
| :--- | :--- | :--- |
| `rendered` | `fold-repeated-events` | 折叠后的过程输出正文 |
| `micro_total` | `fold-repeated-events` | 被折叠的 micro 条数（= `×N` 的 N） |
| `success` / `checks` | `verify-progress-budget` | 放行判定与逐项明细 |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 分档、折叠、四项断言全过，可交付过程输出 |
| 1 | 任一环节失败（输入不可读 / 折叠违规 / 断言失败），禁止交付 |

## 上下游

- 上游：`standard-output-framework`（管家输出框架）、任务过程事件流。
- 下游：`tail-metrics-showcase`（尾部量化指标展示）、`iconized-output-showcase`（尾部图标框架）。
