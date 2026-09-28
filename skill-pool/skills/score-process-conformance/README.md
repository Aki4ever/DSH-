# score-process-conformance

L2 工序动作级技能：按权重打分，na 从分母扣除，必需项一票否决；算式必须公开。

## 用途

按权重打分，na 从分母扣除，必需项一票否决；算式必须公开。

## 使用方式

```bash
python3 skills/score-process-conformance/scripts/score_conformance.py --bundle <证据包>
```

## 退出码

| 码 | 含义 |
| --- | --- |
| `0` | 通过 |
| `1` | 未通过 |
| `2` | 输入不可读 |

## 上下游

上游 `collect-process-evidence`；下游 `plan-process-rectification`、`process-supervisor`。

## 边界

- 只打分；
- 算式公开；
- 必需项一票否决。
