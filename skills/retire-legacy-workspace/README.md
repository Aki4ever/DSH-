# retire-legacy-workspace

L2 工序动作级技能：旧工作区退役器：不丢文件 → 目标已入库 → 会话完整 → 台账 → 摘注册 → 删目录。

## 用途

旧工作区退役器：不丢文件 → 目标已入库 → 会话完整 → 台账 → 摘注册 → 删目录。

## 使用方式

```bash
python3 skills/retire-legacy-workspace/scripts/retire_workspace.py --source <源> --target <目标> --apply
```

## 退出码

| 码 | 含义 |
| --- | --- |
| `0` | 干跑/退役成功/幂等 |
| `1` | 前置断言不成立 |
| `2` | 输入不可读 |

## 上下游

上游 `verify-workspace-retirement`（退役后断言）；被退役对象是任意已合并的工作区目录。

## 边界

- 不丢文件是唯一硬门；
- 先摘注册再删目录；
- 台账写在新家；
- 先备份后改动。
