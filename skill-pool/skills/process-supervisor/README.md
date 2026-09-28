# process-supervisor

L3 复合流程级技能：流程监督员出口门禁：取证 → 打分 → 整改 → 独立复核，三项齐备才放行。

## 用途

流程监督员出口门禁：取证 → 打分 → 整改 → 独立复核，三项齐备才放行。

## 使用方式

```bash
python3 skills/process-supervisor/scripts/supervise.py --evidence <证据目录> --json
```

## 退出码

| 码 | 含义 |
| --- | --- |
| `0` | 流程合规 |
| `1` | 不合规（附整改清单） |
| `2` | 输入不可读 |

## 上下游

上游 `process-conformance-policy`、`collect-process-evidence`、`score-process-conformance`、`plan-process-rectification`、agent 层 `process-supervisor-agent`。

## 边界

- 只做裁决；
- 判据不在本层新增；
- agent 降级必须知情；
- 缺证据 = fail。
