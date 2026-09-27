# instance-pool-policy

L1 原子规约：执行层多实例准入。

## 用途

规定「多开」不是默认权利：只有被判为可多开的执行层才允许并行发出多个实例。

## 三档

| 档位 | 含义 | 判定 |
| :--- | :--- | :--- |
| `safe_multi` | 无状态、无写盘，可无锁并发 | 无写盘信号 |
| `needs_lock` | 可多开但同资源键上须持锁 | 有写盘，目标路径为参数化/派生 |
| `single_only` | 写固定路径或固定临时文件，必须串行 | 有写盘，目标是字面量固定路径 |

## 两条口径

1. `needs_lock` 与 `single_only` 必须给出**非空资源键**；
2. 非确定性（读时钟 / 随机）**不等于并发不安全**——只影响可复现性，单独记为 `nondeterminism` 信号，不据此降档。

## 上下游

- 上游：无（原子基元）。
- 下游：`classify-instance-safety`、`verify-instance-safety`、`instance-pool-guard`。
