# classify-instance-safety

L2 工序动作：实例安全分档扫描。

## 用途

真实扫描执行层脚本源码，判定 `safe_multi` / `needs_lock` / `single_only`，提取资源键与信号，
并可写出 `docs/operations/instance-safety.json` 声明表。

## 使用方式

```bash
python3 skills/classify-instance-safety/scripts/classify_instance_safety.py --all --json
python3 skills/classify-instance-safety/scripts/classify_instance_safety.py --all --write
python3 skills/classify-instance-safety/scripts/classify_instance_safety.py --skill build-layer-graph
```

## 输出字段

`scanned` / `counts` / `skills[{id, instance_safety, reason, signals, resource_keys, scripts}]` / `issues`。

`signals` 含 `write` / `nondeterminism` / `temp` 三类。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 扫描完成 |
| 1 | `--skill` 指定的技能不存在 |
| 2 | 未给出 `--all`/`--skill`，或 catalog 不可读 |

## 上下游

- 上游：`instance-pool-policy`。
- 下游：`verify-instance-safety`、`instance-pool-guard`。
