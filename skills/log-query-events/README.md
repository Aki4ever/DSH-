# log-query-events

L2 工序动作：检索质量信号落盘。

## 用途

把 `query → top-K → 实际选用` 追加到 `docs/operations/skill-query-log.jsonl`，用于反向修订技能触发词。

## 使用方式

```bash
python3 skills/log-query-events/scripts/log_query.py \
  --query "校验文件是否存在" --results "verify-file-exists,qa-gatekeeper" --chosen verify-file-exists
```

## 事件字段

`ts` / `query` / `results`（id 数组）/ `chosen` / `top_k`。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 事件已追加且可解析 |
| 1 | 参数缺失或目标不可写 |

## 上下游

- 上游：`rank-skills-bm25`。
- 下游：触发词修订（人工或后续技能）。
