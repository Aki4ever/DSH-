# instance-pool-guard

L3 复合流程：实例准入门禁。

## 用途

并行之前先证明能并行：先分档，再断言，只有 `safe_multi` 可无锁并发。

## 组成

| 组成 | 级别 | 职责 |
| :--- | :--- | :--- |
| `instance-pool-policy` | L1 | 三档定义与判定信号 |
| `classify-instance-safety` | L2 | 真实扫描分档 + 写声明表 |
| `verify-instance-safety` | L2 | 四项断言（齐全/不陈旧/无矛盾/资源键非空） |

## 使用方式

```bash
python3 skills/classify-instance-safety/scripts/classify_instance_safety.py --all --write
python3 skills/verify-instance-safety/scripts/verify_instance_safety.py
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 声明齐全且不陈旧，可按档位派发 |
| 1 | 任一项断言失败，本轮并行派发被阻断 |

## 上下游

- 上游：`classify-instance-safety`、`verify-instance-safety`。
- 下游：`parallel-lock-guard`（定并行时怎么加锁）。
