# score-task-lane

L2 工序动作：双流程分流判定。

## 用途

对任务做确定性分流：走快速流程（≤4 步直调）还是完整流程（现有 5 步链路）。

## 使用方式

```bash
python3 skills/score-task-lane/scripts/score_lane.py --task "<任务描述>" [--files N] [--steps N] [--skill-hit]
```

## 判定规则

1. **红线优先**（`fastlane-redline-policy`）：命中 R1~R5 任一 → `lane = full`。
2. **加权分**（无红线时）：五项简单性判据各计 1 分，满分 5。

| 判据 | 计分条件 |
| :--- | :--- |
| 只读 | 文本无写入类动词 |
| 单文件 | `--files` 缺省或等于 1 |
| 可逆 | 未命中 R1 / R2 |
| 步骤 ≤3 | `--steps` 缺省或 ≤ 3 |
| 命中现成技能 | 传 `--skill-hit` 或文本中出现 catalog 技能 ID |

`score ≥ 3` → `lane = fast`；`score < 3` → `lane = full`。

## 输出字段

`lane` / `score` / `matched_redlines` / `reason` / `criteria`

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 判定完成（结果看 stdout JSON） |

## 上下游

- 上游：`fastlane-redline-policy`。
- 下游：`verify-lane-decision`、`dual-lane-router`。
