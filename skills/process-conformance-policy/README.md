# process-conformance-policy

L1 微观原子规约：流程合规判定基元：九步流程可打分、必需项一票否决、na 第三态、缺证据即 fail。

## 用途

流程合规判定基元：九步流程可打分、必需项一票否决、na 第三态、缺证据即 fail。

## 使用方式

```bash
python3 skills/process-supervisor/scripts/supervise.py --evidence <证据目录>
```

## 退出码

| 码 | 含义 |
| --- | --- |
| `0` | 得分≥85 且必需项全过 |
| `1` | 未通过（附整改清单） |
| `2` | 输入不可读 |

## 上下游

上游 本规约（唯一真相源 process-spec.json）；下游 collect-process-evidence / score-process-conformance / plan-process-rectification / process-supervisor-agent / process-supervisor。

## 边界

- 只出判据；
- 必需项一票否决；
- na 不得当 pass；
- 缺证据 = fail；
- 整改必须可执行。
