# verify-instance-safety

L2 工序动作：实例安全声明断言。

## 四项断言

| 断言 | 内容 |
| :--- | :--- |
| `C1_declared_all` | 每个本地技能都有声明 |
| `C2_declarations_fresh` | 声明与重扫结果一致（防陈旧） |
| `C3_safe_multi_has_no_write` | `safe_multi` 不得有写盘证据 |
| `C4_restricted_has_resource_keys` | `needs_lock`/`single_only` 资源键非空 |

## 使用方式

```bash
python3 skills/verify-instance-safety/scripts/verify_instance_safety.py
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 四项断言全部通过 |
| 1 | 缺声明 / 陈旧 / 矛盾 / 资源键为空 |
| 2 | 声明表缺失或 catalog 不可读 |

## 上下游

- 上游：`classify-instance-safety`。
- 下游：`instance-pool-guard`。
