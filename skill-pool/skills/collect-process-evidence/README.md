# collect-process-evidence

L2 工序动作级技能：按 process-spec.json 逐步取证，产出证据包；无证据一律 fail+unverifiable。

## 用途

按 process-spec.json 逐步取证，产出证据包；无证据一律 fail+unverifiable。

## 使用方式

```bash
python3 skills/collect-process-evidence/scripts/collect_evidence.py --evidence <证据目录>
```

## 退出码

| 码 | 含义 |
| --- | --- |
| `0` | 取证完成 |
| `2` | 输入不可读 |

## 上下游

上游 `process-conformance-policy`；下游 `score-process-conformance`、`plan-process-rectification`。

## 边界

- 只取证；
- 无证据 = fail；
- na 有明确条件。
