# verify-workspace-retirement

L2 工序动作级技能：退役断言器：源已消失 / 注册项已摘除 / 会话完整，三项全过才放行。

## 用途

退役断言器：源已消失 / 注册项已摘除 / 会话完整，三项全过才放行。

## 使用方式

```bash
python3 skills/verify-workspace-retirement/scripts/verify_retirement.py --all --json
```

## 退出码

| 码 | 含义 |
| --- | --- |
| `0` | 三项全过 |
| `1` | 任一失败 |
| `2` | 输入不可读 |

## 上下游

上游 `retire-legacy-workspace`；下游 `dsh-butler` 收尾接线。

## 边界

- 只断言不修改；
- 输出实测值；
- 台账必须可回滚。
