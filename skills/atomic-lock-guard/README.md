# atomic-lock-guard

L3 复合流程门禁：**并发处理原子锁放行门禁**——把「口径 → 真获取 → 真压测 → 断言」串成一道不可跳步的互斥门禁。

## 用途

放行的唯一合法证据是**三段齐备**，不是「代码里写了 `mkdir`」：

| 段 | 必须满足 | 堵住的自欺 |
| :--- | :--- | :--- |
| `guarded` | 重叠窗口 0，任一瞬间持有者 ≤ 1 | — |
| `control`（**不取锁**） | 重叠窗口 > 0，最大持有者 > 1 | 一个恒返回「互斥成功」的实现也能满足上一条 |
| `stale` | 陈旧锁可判定且可回收 | 崩溃残留会永久瘫痪资源池 |

只有第 1 段是典型的自欺。门禁必须同时看到「同一个检测器在不加锁时确实看见了并发」，才把假阴性这条路堵死。

## 与既有并行锁链的分工

| 能力 | 证明什么 | 属于 |
| :--- | :--- | :--- |
| `parallel-lock-guard` | 这批任务**理论上**不该并行（锁集合无交集、无等待环） | 方案层（声明） |
| `atomic-lock-guard` | 这份资源**实际上**真的互斥（临界区重叠为 0） | 执行层（物理） |

方案层通过而执行层没装锁，等于「算好了不该撞车，然后两辆车同时开进路口」。

## 使用方式

```bash
# 1) 真获取
python3 skills/acquire-atomic-lock/scripts/atomic_lock.py acquire --key docs/operations/skill-catalog.json --timeout 300

# 2) 真压测：三段证据
python3 skills/verify-atomic-mutual-exclusion/scripts/verify_mutual_exclusion.py --workers 16 --rounds 20 --hold-ms 5 --json

# 3) 按 token 释放 + 体检无残留
python3 skills/acquire-atomic-lock/scripts/atomic_lock.py release --key docs/operations/skill-catalog.json --token "<token>"
python3 skills/acquire-atomic-lock/scripts/atomic_lock.py status --lock-root /tmp/dsh-atomic-locks
```

推荐的真实写入形态（释放由 `try/finally` 兜底）：

```bash
python3 skills/acquire-atomic-lock/scripts/atomic_lock.py run \
  --key docs/operations/skill-catalog.json --timeout 300 -- python3 skills/dsh-butler/scripts/sync_catalog.py
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 四环全过，互斥已被物理证明 |
| 1 | 伪原子载体 / `wait_timeout` / `token_mismatch` / 重叠非零 / 控制段看不见并发 / 陈旧锁不可回收 / 释放路径不完整 |
| 2 | 输入不可读或依赖脚本不可用 |

## 上下游

- 上游：`atomic-lock-policy`（七条口径）、`acquire-atomic-lock`（真获取与释放）、`verify-atomic-mutual-exclusion`（三段证据）。
- 并列：`parallel-lock-guard`（方案层可并行证明）、`atomic-fission-guard`（粒度可断言证明）。
- 下游：管家「③ 冲突·冗余·质量」集群；任何写入前置门禁（如 `catalog-consistency-guard`、`zero-restart-guard`）仍须照走。

## 边界

- 只做裁决与阻断，不获取锁、不中断进程、不改写业务文件（仅写临时锁目录）；
- `control` 段不可省——省掉它就等于接受一个无法证伪的 0；
- 禁止「记录后继续」：任一环失败即停止，修复后从口径环节重跑。
