# register-execution-layer

L2 工序动作：非技能执行层登记。

## 用途

把技能层之外的五种执行层（cli / agent / api / mcp / plugin）登记进
`docs/operations/execution-layers.json`，让它们和技能一样能进树、被验证、被检索。

## 使用方式

```bash
python3 skills/register-execution-layer/scripts/register_layer.py --list
python3 skills/register-execution-layer/scripts/register_layer.py --add --id skill-pool --layer cli --path bin/skill-pool
python3 skills/register-execution-layer/scripts/register_layer.py --add --id subagent --layer agent --source host
python3 skills/register-execution-layer/scripts/register_layer.py --remove --id skill-pool
```

## 条目字段

`id` / `layer` / `parent` / `path` / `source`（repo|host）/ `status` / `description`。

`source=repo` 时 `path` 必须真实存在；`source=host` 允许 `path` 为空。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 登记成功、幂等命中或 `--list` 完成 |
| 1 | 层名非法 / 路径缺失 / id 冲突且内容不同 / 移除不存在的 id |

## 上下游

- 上游：`tree-update-mandatory`。
- 下游：`build-execution-tree`。
