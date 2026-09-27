# Skill池 并入记录 (Merged from Skill池)

> ### 🏷️ 版本信息与实施追踪
> - **合并日期**：2026-09-28
> - **需求依据**：`REQ-REPO-MERGE-033`（执行包 PKG-007）
> - **源仓库**：`/Users/linqiyu/Documents/DSH/Skill池`（远端 `https://github.com/akidotdot-ai/skill-pool.git`）
> - **源提交**：`3d99364`
> - **合并方式**：子树合并（`git merge -s ours` + `git read-tree --prefix`），**保留源仓库全部提交历史**
> - **生效状态**：`[Release 稳定生效]`

---

## 一、合并结果

```text
全局规则/
├── rules/ knowledge/ indexes/ scripts/ …   # 原有，未改动
├── skill-pool/                             # 新增：Skill池 整体迁入（含 .gitignore 与全部 docs）
└── workspaces/workspaces.json              # 新增：任务会话迁移台账
```

`skill-pool/` 与 `knowledge/` 平级，因此从 `skill-pool/` 出发 `../knowledge/common/` 正好命中
知识库通用规范层——`render-capability-naming` 的知识库路径候选第三项即为该布局。

## 二、技能池内容

| 项 | 值 |
| :--- | :--- |
| 执行层总数 | 165（L1 39 / L2 85 / L3 40 / L4 1） |
| 转移文件 | 479 个受版本控制文件 |
| 入口 | `skill-pool/bin/skill-pool` |
| 需求台账 | `skill-pool/docs/requirements/index.md`（基线 v0.3.0） |
| 操作规范 | `skill-pool/docs/operations/workflows.md` |
| 命名规范真相源 | `skill-pool/docs/operations/capability-naming.json` |

## 三、任务会话迁移

DSH 会话归属的唯一真相源是
`~/Library/Application Support/dsh-desktop/harness/storages/workspace.json`。

迁移动作：**备份 → 把 `Skill池` 工作区的 11 条 `sessionIds` 并入 `全局规则` 工作区 → 原条目保留并标注 `mergedInto`**。

| 工作区 | 迁移前会话数 | 迁移后会话数 |
| :--- | ---: | ---: |
| 全局规则 | 9 | **20** |
| Skill池（已并入全局规则） | 11 | 11（保留，带 `mergedInto` 指针） |

**为什么保留原条目而不删除**：当前会话的工作目录就在源目录，删掉工作区条目会让运行中的会话失去归属。
保留并标注指针，既完成了「任务会话挪过去」，又不打断正在运行的会话。

**回滚**：拷贝 `workspace.json.bak-<时间戳>` 覆盖回原路径即可完全还原（迁移不改动任何会话数据，只改归属登记）。
台账见 [`workspaces/workspaces.json`](workspaces/workspaces.json)。

## 四、源目录处置

源目录 `/Users/linqiyu/Documents/DSH/Skill池` **不删除**，原地保留为只读镜像，并写入
[`MIGRATED.md`](../Skill池/MIGRATED.md) 指向本目录。理由：当前会话 cwd 在其中，
移动会让会话立即断链；保留镜像也使整次合并可零成本回退。

## 五、合并后校验

在 `全局规则/skill-pool/` 内重跑全部十二道门禁，结果见提交说明的「验证结果」段。
