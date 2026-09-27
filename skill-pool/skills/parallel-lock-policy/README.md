# parallel-lock-policy

L1 微观原子规约：并行任务「调控锁」的判定基元。**无脚本**，只出定义与判据。

## 用途

为并行派发钉死唯一口径，供 `declare-lock-set`、`detect-lock-conflict`、`verify-no-lock-violation`
与 L3 门禁 `parallel-lock-guard` 引用。核心立场：**并行的前置条件是先证明可并行，而不是先跑起来再补救。**

本层只回答四个问题：

1. **锁什么**——粒度 = **共享资源键**（文件路径 / 目录 / 端口 / 实例 id）；粒度太小锁不住，太粗会串行化一切。
2. **按什么顺序锁**——**字典序固定顺序**（去重后按码点升序）。这是防死锁的**充分手段**：全序之下等待关系只能单向延伸，成环不可能。
3. **锁多久算超时**——**默认 300 秒**，超时即判本次执行失败并**立即释放**持有的全部键。
4. **死循环怎么判**——**复用 `anti-pattern-policy` 的 AP-01**（连续相同 action 且 state 不变 ≥ 5 次），**禁止另立判据**。

## 使用方式

无命令可跑。作为规约被下游引用：

```bash
# 声明锁集合（归一化 + 去重 + 字典序 + 静态错误检测）
python3 skills/declare-lock-set/scripts/declare_lock_set.py --from-json tasks.jsonl --json

# 检测锁冲突 / 死锁环 / 超时未释放 + 可并行分组建议
python3 skills/detect-lock-conflict/scripts/detect_lock_conflict.py --from-json tasks.jsonl --json

# 放行断言（五项硬断言，含 AP-01 死循环体检）
python3 skills/verify-no-lock-violation/scripts/verify_no_lock_violation.py --from-json tasks.jsonl --json
```

## 四条口径速查

| 序 | 口径 | 物理判据 | 违约后果 |
| :--- | :--- | :--- | :--- |
| ① | 粒度 = 共享资源键 | 键落四类形态之一，且不细于单资源、不粗于全仓 | 细/粗皆判不合格，回退重划 |
| ② | 加锁顺序 = 字典序固定顺序 | 去重后按码点升序，两次运行逐字节一致 | 出现等待环 `deadlock_cycle` 即违约 |
| ③ | 超时默认 300 秒 | `finished_at - started_at > timeout_s`（只读输入字段） | 判 `lock_timeout`，失败即释放 |
| ④ | 死循环复用 AP-01 | 同一任务连续 ≥ 5 次且 `locks` 完全相同 | 判 `AP-01`，禁止另立判据 |

补充一条禁止项：**无锁共享写**。写任务（`writes:true`）声明不出共享资源键即判 `missing_locks`，
禁止以「应该不会冲突」为由放行。

## 输出字段

本规约为纯文档技能，不产出 JSON；字段契约见下游三个技能的 README：

- `declare-lock-set`：`tasks[]`（`task` / `locks` / `acquire_order`）与 `issues[]`（`kind` / `task` / `detail`）；
- `detect-lock-conflict`：`conflicts[]` / `deadlock_cycles[]` / `timeouts[]` / `serialization_plan[]` / `parallel_groups[]`；
- `verify-no-lock-violation`：`checks[]`（`name` / `pass` / `detail`）与 `violations[]`。

## 退出码

本规约自身无退出码；承载脚本统一遵循：

| 码 | 含义 |
| :--- | :--- |
| 0 | 无问题，允许并行派发 |
| 1 | 存在缺失锁 / 非规范键 / 冲突 / 死锁 / 超时 / AP-01 任一命中，禁止派发 |
| 2 | 输入缺失或不可解析（缺参、文件不可读、JSONL 行非法、任务非法） |

## 上下游

- 上游：`anti-pattern-policy`（AP-01 判据的唯一真相源）。
- 下游：`declare-lock-set` → `detect-lock-conflict` → `verify-no-lock-violation` → `parallel-lock-guard`（L3 派单前门禁）。

## 边界

- 只出定义与判据，不排锁、不检测、不写文件、不中断任务；
- 阈值唯一（300 秒）、判据唯一（AP-01），禁止下游另立第二套口径；
- 全部判定只依赖输入字段，无随机、无系统时间依赖，同输入恒得同结论。
