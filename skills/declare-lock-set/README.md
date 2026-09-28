# declare-lock-set

L2 工序动作：为并行任务**归一化并排序锁集合**，并检测两类静态错误。

## 用途

`parallel-lock-policy` 规约的物理执行层。输入一组并行任务，输出每个任务的规范锁集合 `locks` 与取锁顺序
`acquire_order`（去重 + 按码点字典序升序），同时检测：

- `missing_locks`：锁集合为空却 `writes:true`——**没有锁却要写**，属无锁共享写（明确禁止项）；
- `non_canonical`：锁键不是归一化路径（重复斜杠 / `./` / 尾斜杠不一致 / 空白 / 反斜杠），并给出**规范化结果**。

不检测冲突、不判超时——归 `detect-lock-conflict`。

## 使用方式

```bash
# 文件模式（推荐）
python3 skills/declare-lock-set/scripts/declare_lock_set.py --from-json <tasks.jsonl> [--json]

# 命令行配对模式：--task 与 --locks 依次配对，--locks 逗号分隔
python3 skills/declare-lock-set/scripts/declare_lock_set.py \
  --task pkg-006-t1 --locks "skills/a/SKILL.md,docs/operations/x.json" \
  --task pkg-006-t2 --locks "skills/b/SKILL.md" [--json]
```

`--from-json` 与 `--task` 不可同用；二者皆缺即退 2。`--json` 为兼容开关，脚本恒输出 JSON。

## 输入字段（JSONL，每行一个并行任务）

```json
{"task":"pkg-006-t1","locks":["skills/a/SKILL.md","docs/operations/x.json"],"depends_on":["pkg-006-t0"],"timeout_s":300,"started_at":1000,"finished_at":1060}
```

| 字段 | 是否使用 | 口径 |
| :--- | :--- | :--- |
| `task` | 必填 | 非空字符串；缺失即退 2 |
| `locks` | 使用 | 数组；缺失按空集合处理，非数组即退 2 |
| `writes` | 使用 | 只认显式 `true`；`true` 且锁集合为空 ⇒ `missing_locks` |
| `depends_on` / `timeout_s` / `started_at` / `finished_at` | 透传 | 由下游检测器使用 |

## 归一化规则（纯字符串，无随机、无时间依赖）

| 序 | 规则 | 例 |
| :--- | :--- | :--- |
| 1 | 反斜杠 → `/` | `skills\a\b.md` → `skills/a/b.md` |
| 2 | 折叠连续斜杠 | `skills/a//b.md` → `skills/a/b.md` |
| 3 | 剥离 `.` 段与空段 | `./skills/a/b.md` → `skills/a/b.md` |
| 4 | 剥离尾部斜杠（根除外） | `skills/a/` → `skills/a` |
| 5 | 剥除首尾空白 | `" skills/a/b.md "` → `skills/a/b.md` |

## 输出字段

```json
{"success":true,
 "tasks":[{"task":"pkg-006-t1","locks":["docs/operations/x.json","skills/a/SKILL.md"],"acquire_order":["docs/operations/x.json","skills/a/SKILL.md"]}],
 "issues":[]}
```

| 字段 | 含义 |
| :--- | :--- |
| `tasks[].task` | 任务名（剥除首尾空白后的原值） |
| `tasks[].locks` | 归一化去重后按码点升序排列的锁集合 |
| `tasks[].acquire_order` | 取锁顺序，与 `locks` 逐元素相同（字典序固定顺序即加锁顺序） |
| `issues[].kind` | `missing_locks` / `non_canonical`（输入错误时另有 `input_unreadable`） |
| `issues[].task` | 命中的任务名（输入级错误为空串） |
| `issues[].detail` | 人类可读证据；`non_canonical` 必含原串与规范化结果 |
| `error` | 仅输入不可读时出现 |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 全部任务声明成功且 `issues` 为空 |
| 1 | 存在 `missing_locks` 或 `non_canonical` |
| 2 | 输入不可读（缺参、二者同给、文件不存在/是目录/不可读、JSONL 行非法或非对象、`task` 缺失、`locks` 非数组） |

## 上下游

- 上游：`parallel-lock-policy`（共享资源键定义、字典序固定顺序、300 秒超时口径）。
- 下游：`detect-lock-conflict`（锁冲突 / 死锁环 / 超时检测）、`verify-no-lock-violation`（放行断言）、`parallel-lock-guard`（L3 派单前门禁）。

## 边界

- 只声明不检测，不做调度，不改动任何文件；
- 不访问文件系统判断路径存在性，锁键纯字符串处理；
- 归一化与排序口径唯一，禁止下游另立第二套。
