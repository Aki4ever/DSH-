# acquire-atomic-lock

L2 工序动作：基于 `mkdir(2)` 原子目录的**物理锁获取与释放器**，含两种锁模式与陈旧回收。

## 用途

`atomic-lock-policy` 规约的物理执行层。声明层的 `declare-lock-set` / `detect-lock-conflict` 只能证明
「两个任务理论上不该并行」，拦不住两个进程真的同时写同一份文件。本技能用内核原子原语真的拦住。

| action | 做什么 |
| :--- | :--- |
| `acquire` | `mkdir` 抢锁；失败则判陈旧或等待；返回 token |
| `release` | 校验 token 后删除锁目录；不符即拒绝（不释放他人锁） |
| `status` | 枚举锁根下全部锁，逐条判 `held` / `stale` 与原因 |
| `run` | 持锁执行子命令，`try/finally` + 信号处理器保证释放，退出码透传 |

## 两种锁模式

| 模式 | 语义 | 陈旧判据 | 适用 |
| :--- | :--- | :--- | :--- |
| `lease`（默认） | 锁跨命令调用存活，持有者进程退出 ≠ 锁失效 | `start_ticks` 与存活进程不符（PID 复用）**或** 持有超时 | 先 `acquire`、跨多次命令、最后 `release` |
| `live` | 锁与持有进程同生共死 | `pid` 不存在 **或** `start_ticks` 不符 **或** 持有超时 | `run` 子命令（自动强制） |

单模式冒充两用会直接导致互斥失效：用 `live` 判据管 `lease` 场景时，`acquire` 命令自身退出后
锁会立刻被判 `pid_not_alive` 回收。

## 使用方式

```bash
# 跨命令加锁（lease）
python3 skills/acquire-atomic-lock/scripts/atomic_lock.py acquire --key skills/a/SKILL.md --timeout 300
python3 skills/acquire-atomic-lock/scripts/atomic_lock.py release --key skills/a/SKILL.md --token "1234:ps:Mon Sep 28 ..."

# 包住一条命令（live，退出码透传）
python3 skills/acquire-atomic-lock/scripts/atomic_lock.py run \
  --key docs/operations/skill-catalog.json --timeout 120 -- ./bin/skill-pool catalog

# 枚举与体检
python3 skills/acquire-atomic-lock/scripts/atomic_lock.py status --lock-root /tmp/dsh-atomic-locks
```

## 参数

| 参数 | 适用 | 口径 |
| :--- | :--- | :--- |
| `--key` | acquire / release / run | 共享资源键；路径键 `realpath` 归一，`port:` / `instance:` 前缀键逐字符保留 |
| `--lock-root` | 全部 | 默认 `/tmp/dsh-atomic-locks` |
| `--timeout` | 全部 | 默认 **300 秒**：既是等待上限，也是持有上限 |
| `--wait` | acquire / run | 等待上限秒数，缺省等于 `--timeout` |
| `--mode` | acquire | `lease`（默认）/ `live`；`run` 强制 `live` |
| `--token` | release | 持有者 token（`pid:start_ticks`） |
| `-- <命令...>` | run | 第一个独立 `--` 之后给出子命令 |

## 锁内记录（owner.json，七字段）

| 字段 | 作用 |
| :--- | :--- |
| `key` | 归一化锁键（便于 `status` 反查资源） |
| `pid` | 持有者进程号 |
| `start_ticks` | 持有者进程起始时刻，防 PID 复用误判 |
| `host` | 机器名，仅记录用，不用于分布式协调 |
| `acquired_at` | 获取时刻（wall clock 浮点秒） |
| `timeout_s` | 持有上限 |
| `mode` | `lease` / `live`，决定陈旧判据档位 |

锁目录名 = `sha1(归一化锁键)[:16] + ".lock"`，因此同一份资源经不同路径写法必得同一个锁目录。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | acquire 成功 / release 成功 / status 完成 / run 取子进程退出码 |
| 1 | `wait_timeout`（等待超时）/ `token_mismatch`（拒绝释放他人锁）/ `lock_not_found` |
| 2 | 输入不可读（缺 `--key`、锁键归一化后为空、锁根不可写、`run` 缺子命令、子命令不可执行） |

## 上下游

- 上游：`atomic-lock-policy`（载体清单、锁键归一化、持有者标识、超时、陈旧回收、释放必达六条口径）。
- 下游：`verify-atomic-mutual-exclusion`（真并发压测出互斥证据）、`atomic-lock-guard`（L3 门禁）。

## 边界

- 只做锁，不做调度、不排队、不抢占；
- 不提供 `exists-then-write` / pid 文件读改写 / 应用层布尔标志等伪原子载体；
- 跨主机网络文件系统不在保证范围内；
- 陈旧判定只依赖锁内字段与输入参数，无随机退避、无主观判断。
