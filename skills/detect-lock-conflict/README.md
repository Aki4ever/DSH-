# detect-lock-conflict

L2 工序动作：对并行任务检测**锁冲突 / 潜在死锁 / 超时未释放**，并给出可安全并行的分组建议。

## 用途

`parallel-lock-policy` 的物理执行层。回答一个物理问题：**这批任务凭什么可以并行？**
答案是 `parallel_groups` 非空且三类命中为零——先证明可并行，再派发。

三类检测：

1. **锁冲突 `lock_conflict`**：两个任务锁集合**交集非空** → 给出冲突任务对与冲突键；
2. **潜在死锁 `deadlock_cycle`**：等待图**成环** → 给出环路径（头尾相接）；
3. **超时未释放 `lock_timeout`**：`finished_at - started_at > timeout_s`，或只有 `started_at` 无 `finished_at`
   且以批次逻辑终点为参照已超时。

额外产出：`serialization_plan`（必须串行的任务对）与 `parallel_groups`（组内两两无锁交集的可并行分组）。

## 使用方式

```bash
python3 skills/detect-lock-conflict/scripts/detect_lock_conflict.py --from-json <tasks.jsonl> [--json]
cat <tasks.jsonl> | python3 skills/detect-lock-conflict/scripts/detect_lock_conflict.py --stdin [--json]
```

`--from-json` 与 `--stdin` 必须二选一，二者同给或缺省即退 2。`--json` 为兼容开关，脚本恒输出 JSON。

## 输入字段（JSONL，每行一个并行任务）

```json
{"task":"pkg-006-t1","locks":["skills/a/SKILL.md"],"depends_on":["pkg-006-t0"],"timeout_s":300,"started_at":1000,"finished_at":1060}
```

| 字段 | 口径 |
| :--- | :--- |
| `task` | 必填非空字符串；缺失即退 2 |
| `locks` | 数组；缺失按空集合；非数组即退 2；比对前逐键归一化去重 |
| `depends_on` | 数组；显式等待边 `X → Y` |
| `timeout_s` | 整数秒；缺失或非非负整数时按默认 **300 秒** |
| `started_at` / `finished_at` | 整数秒，**只从字段读，绝不取系统当前时间** |
| `lock_events` | 可选 `{"锁键": 取得时刻}`，用于锁级等待推断（逐键时刻优先于 `started_at`） |

## 等待边来源（死锁检测的依据）

| 来源 | 判据 |
| :--- | :--- |
| 显式依赖 | `X.depends_on` 含 `Y` ⇒ 边 `X → Y` |
| 锁级推断 | X、Y 共享键、无显式依赖、且两侧都有取得时刻 ⇒ 边 `后取得者 → 先取得者`；**无时间证据不推断** |

交叉取锁（A 先拿 `x` 后拿 `y`、B 先拿 `y` 后拿 `x`）正是靠 `lock_events` 逐键时刻才能识别的死锁形态。

## 输出字段

```json
{"success":false,
 "conflicts":[{"tasks":["A","B"],"keys":["skills/a/SKILL.md"],"detail":"…"}],
 "deadlock_cycles":[{"cycle":["A","B","A"],"tasks":["A","B"],"detail":"…"}],
 "timeouts":[{"task":"T","started_at":1000,"finished_at":1120,"timeout_s":60,"span_s":120,"detail":"…"}],
 "serialization_plan":[["A","B"]],
 "parallel_groups":[["A","C"],["B"]]}
```

| 字段 | 含义 |
| :--- | :--- |
| `conflicts[].tasks` / `keys` | 冲突任务对 / 非空冲突键列表 |
| `deadlock_cycles[].cycle` | 头尾相接的环路径，如 `["A","B","A"]`（读作 A 等 B、B 等 A） |
| `deadlock_cycles[].tasks` | 环上任务（不含重复收尾），按最小节点旋转归一，同一环只报一次 |
| `timeouts[].span_s` | 实测跨度；缺 `finished_at` 时为「批次逻辑终点 − started_at」 |
| `serialization_plan[]` | 必须串行的任务对 `[[taskA, taskB], ...]`，按任务名稳定排序 |
| `parallel_groups[]` | 可安全并行的分组建议，**组内两两无锁交集**；组按首个任务名排序 |
| `error` | 仅输入不可读时出现 |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 无冲突、无死锁、无超时，允许按 `parallel_groups` 派发 |
| 1 | 三类任一命中，禁止并行派发 |
| 2 | 输入不可读（缺参、二者同给、文件不存在/是目录/不可读、JSONL 行非法或非对象、`task` 缺失、`locks` 非数组） |

## 上下游

- 上游：`parallel-lock-policy`（三条口径）、`declare-lock-set`（锁键归一化与字典序排序口径）。
- 下游：`verify-no-lock-violation`（importlib 直接加载本脚本的 `read_jsonl_path` / `build_tasks` / `detect` 做放行断言）、`parallel-lock-guard`（L3 派单前门禁）。

## 边界

- 只检测与建议，不真的加锁、不中断任务、不重排调度、不改写任何文件；
- 时间判定只读输入字段，缺 `finished_at` 时用批次逻辑终点，绝不取系统当前时间；
- 无时间证据不做等待推断，宁可漏报不制造假环；
- 阈值口径唯一（默认 300 秒来自 `parallel-lock-policy`）。
