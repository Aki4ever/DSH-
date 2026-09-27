# verify-no-lock-violation

L2 工序动作：并行派单前的**五项硬断言**放行器——全过才退 0。

## 用途

把 `detect-lock-conflict` 的检测结果加上「锁是否声明」与「是否死循环」两项体检，收敛成一份 `checks` 清单。
**并行派发的唯一机器判据就是这份清单五项 `pass` 全真**。

| 序 | 断言名 | 判据 | 违约 `kind` |
| :--- | :--- | :--- | :--- |
| 1 | `no_lock_conflict` | 无锁集合交集非空的任务对 | `lock_conflict` |
| 2 | `no_deadlock_cycle` | 无等待图成环 | `deadlock_cycle` |
| 3 | `no_lock_timeout` | 无跨度超 `timeout_s` / 逻辑已超时 | `lock_timeout` |
| 4 | `locks_declared` | 每个任务锁集合非空 | `missing_locks` |
| 5 | `no_loop_ap01` | 同一任务重复出现且相邻 `locks` 完全相同，连续 < 5 次 | `AP-01` |

**第 5 项复用 AP-01，不另立判据**：判据来自 `anti-pattern-policy` 的 **AP-01（连续相同 `action` 且 `state` 不变 ≥ 5 次）**。
本技能把「任务名」当 `action`、「归一化去重排序后的锁集合」当 `state`，改写成事件流后
用 importlib 加载 `detect-forbidden-state` 的 `detect_events` 判定，因此阈值口径完全来自唯一真相源。

## 使用方式

```bash
python3 skills/verify-no-lock-violation/scripts/verify_no_lock_violation.py \
  --from-json <tasks.jsonl> [--allow-conflict] [--json]
```

`--allow-conflict`：显式声明「本批冲突已人工接受」，此时 `lock_conflict` 降级为咨询项不单独阻断，
**其余四项断言照旧生效**。`--json` 为兼容开关，脚本恒输出 JSON。

## 输入字段（JSONL，每行一个并行任务）

```json
{"task":"pkg-006-t1","locks":["skills/a/SKILL.md"],"depends_on":["pkg-006-t0"],"timeout_s":300,"started_at":1000,"finished_at":1060}
```

- 字段口径与 `detect-lock-conflict` 完全一致（复用其解析与检测实现）；
- 同一 `task` 出现多行表示该任务被多次执行，是 AP-01 分支的输入形态。

## 输出字段

```json
{"success":false,
 "checks":[{"name":"no_lock_conflict","pass":true,"detail":"无锁冲突"}],
 "violations":[{"kind":"lock_conflict","task":"A、B","detail":"…","accepted":false}]}
```

| 字段 | 含义 |
| :--- | :--- |
| `checks[].name` | 五项断言名闭集 |
| `checks[].pass` | 该断言是否通过 |
| `checks[].detail` | 通过 / 失败的人类可读证据 |
| `violations[].kind` | `lock_conflict` / `deadlock_cycle` / `lock_timeout` / `missing_locks` / `AP-01`（输入错误另有 `input_unreadable`） |
| `violations[].accepted` | 仅 `lock_conflict` 且 `--allow-conflict` 时为 `true` |
| `error` | 仅输入或依赖不可读时出现 |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 五项断言全过（或 `--allow-conflict` 下仅剩已显式接受的 `lock_conflict`） |
| 1 | 存在未接受的违规 |
| 2 | 输入不可读或依赖脚本不可用（缺 `--from-json`、文件不存在/是目录/不可读、JSONL 行非法、`task` 缺失、`locks` 非数组、依赖模块加载失败） |

## 上下游

- 上游：`anti-pattern-policy`（AP-01 判据唯一真相源）、`detect-lock-conflict`（锁冲突 / 死锁环 / 超时检测，importlib 复用）。
- 下游：`parallel-lock-guard`（L3 派单前门禁的最终断言环节）。

## 边界

- 只断言不修复：不改写任务、不释放锁、不重排调度；
- 不复制判据：AP-01 交由 `detect-forbidden-state` 的检测器执行；
- `--allow-conflict` 只豁免 `lock_conflict` 一类，其余四类一律照旧阻断；
- 时间只从输入字段读，不取系统当前时间；加载依赖时关闭字节码落盘，不留副产物。
