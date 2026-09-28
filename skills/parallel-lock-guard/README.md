# parallel-lock-guard

L3 复合流程：并行任务调控锁的**派单前门禁**。**无独立脚本**，串联四个原子能力。

## 用途

把调控锁的四个环节串成一道不可跳步的门禁，挂载于管家 **「③ 冲突·冗余·质量」** 集群：

| 序 | 环节 | 承载技能 | 物理产物 | 不通过时 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 口径 | `parallel-lock-policy` | 四条口径（共享资源键 / 字典序 / 300 秒 / AP-01） | 无物理判据即不得派单 |
| 2 | 声明 | `declare-lock-set` | `tasks[].locks` 与 `acquire_order`、`issues[]` | `missing_locks` / `non_canonical` 即阻断 |
| 3 | 检测 | `detect-lock-conflict` | `conflicts[]` / `deadlock_cycles[]` / `timeouts[]` / `parallel_groups[]` | 任一命中即阻断 |
| 4 | 断言 | `verify-no-lock-violation` | `checks[]` 五项、`violations[]` | 未全过即阻断 |

**核心理念**：并行的前置条件是**先证明可并行**（`parallel_groups` 非空且冲突为零），
而不是先跑起来再补救。先并发启动再靠日志发现冲突，是把门禁后移到事故发生之后。

## 使用方式

无独立命令，三环顺序执行；任一环失败即停止，**不得从中间环续跑**：

```bash
python3 skills/declare-lock-set/scripts/declare_lock_set.py --from-json tasks.jsonl --json
python3 skills/detect-lock-conflict/scripts/detect_lock_conflict.py --from-json tasks.jsonl --json
python3 skills/verify-no-lock-violation/scripts/verify_no_lock_violation.py --from-json tasks.jsonl --json
```

## 放行判据（唯一）

1. `declare-lock-set` 退 0（`issues` 为空，`acquire_order` 与 `locks` 逐元素相同）；
2. `detect-lock-conflict` 退 0（`conflicts`、`deadlock_cycles`、`timeouts` 全为空）；
3. `parallel_groups` **非空**，且组内两两无锁交集（「可并行」被物理证明）；
4. `verify-no-lock-violation` 退 0，五项 `checks` 全 `pass == true`，其中 `no_loop_ap01` 的 `detail` 须标注判据来自 `anti-pattern-policy` 的 **AP-01**。

四条全中才允许按 `parallel_groups` 派单；`serialization_plan` 中的任务对强制串行。

## 输出字段

门禁自身不产出 JSON，产出的是三环证据串：

| 来源 | 关键字段 |
| :--- | :--- |
| `declare-lock-set` | `tasks[].locks` / `tasks[].acquire_order` / `issues[].kind` |
| `detect-lock-conflict` | `conflicts[]` / `deadlock_cycles[].cycle` / `timeouts[]` / `serialization_plan[]` / `parallel_groups[]` |
| `verify-no-lock-violation` | `checks[].name` / `checks[].pass` / `violations[].kind` |

## 退出码

取最后一条未通过的命令的退出码：

| 码 | 含义 |
| :--- | :--- |
| 0 | 三环全过，允许按 `parallel_groups` 派单 |
| 1 | 任一环命中（冲突 / 死锁环 / 超时 / 未声明锁 / 非规范键 / AP-01），禁止派单 |
| 2 | 输入不可读或依赖脚本不可用 |

## 上下游

- 上游：`parallel-lock-policy`（口径唯一真相源）、`anti-pattern-policy`（AP-01 判据唯一真相源）。
- 下游：`dsh-butler` 的「③ 冲突·冗余·质量」集群在并行派单前调用本门禁。

## 边界

- 只裁决与阻断：不加锁、不中断进程、不重排调度、不改写任何文件；
- 禁止「记录后继续」：命中即停，修复后必须从声明环节重跑；
- 判据与阈值不在本层新增，门禁只串联不复制；
- 不替代 `atomic-fission-guard`（粒度）与既有写入前置门禁（`catalog-consistency-guard`、`zero-restart-guard`）。
