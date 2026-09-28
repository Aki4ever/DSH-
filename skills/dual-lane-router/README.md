# dual-lane-router

L3 复合流程：完整流程 / 快速流程双轨总控。

## 用途

每个任务执行前的分流关口：判定走哪条轨道，并证明判定可复算。

## 两条轨道

| 轨道 | 链路 | 适用 |
| :--- | :--- | :--- |
| 快速流程 | 意图 → 命中既有技能 → 执行 → 回报（≤4 步） | 无红线且加权分 ≥ 3 |
| 完整流程 | 意图 → 动态造物 → 多层路由 → 终审门禁 → 标准交付 | 命中红线或加权分 < 3 |

## 组成

| 组成 | 级别 | 职责 |
| :--- | :--- | :--- |
| `fastlane-redline-policy` | L1 | 红线清单与优先级仲裁 |
| `score-task-lane` | L2 | 确定性分流判定 |
| `verify-lane-decision` | L2 | 判定复算，防抖动 |

## 使用方式

```bash
python3 skills/score-task-lane/scripts/score_lane.py --task "<任务>"
python3 skills/verify-lane-decision/scripts/verify_lane.py --task "<任务>" --repeat 10
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 判定完成且复算一致 |
| 1 | 判定脚本不可用，或 lane 抖动（禁止继续执行） |

## 上下游

- 上游：`intent-detector`。
- 下游：`atomic-fastpath-router`（快车道直调）、`qa-gatekeeper`（完整流程终审）。
