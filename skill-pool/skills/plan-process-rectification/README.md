# plan-process-rectification

L2 工序动作级技能：把 fail 步骤变成可直接执行的整改命令；空话整改判不合格。

## 用途

把 fail 步骤变成可直接执行的整改命令；空话整改判不合格。

## 使用方式

```bash
python3 skills/plan-process-rectification/scripts/plan_rectification.py --bundle <证据包>
```

## 退出码

| 码 | 含义 |
| --- | --- |
| `0` | 清单产出完毕 |
| `1` | 存在无法整改的项 |
| `2` | 输入不可读 |

## 上下游

上游 `score-process-conformance`、`collect-process-evidence`；下游 `process-supervisor`。

## 边界

- 只生成不执行；
- 空话判不合格；
- 必需项单列。
