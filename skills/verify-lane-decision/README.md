# verify-lane-decision

L2 工序动作：分流判定复算探针。

## 用途

把 `score-task-lane` 用同参数跑 N 次，断言 lane 100% 一致，证明分流是确定性机制而非随机感觉。

## 使用方式

```bash
python3 skills/verify-lane-decision/scripts/verify_lane.py --task "<任务描述>" [--repeat 10] [--files N] [--steps N]
```

## 输出

```json
{"success": true, "consistent": true, "lane": "fast", "runs": 10, "observed": ["fast"]}
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | N 次判定 lane 完全一致 |
| 1 | 出现多种 lane，或判定脚本不可用 |

## 上下游

- 上游：`score-task-lane`。
- 下游：`dual-lane-router`。
