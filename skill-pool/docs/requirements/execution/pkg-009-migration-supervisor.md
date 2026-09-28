# PKG-009 迁移收尾 · 流程监督员 · 缺口修复执行明细

> 本文件即本轮 3 条需求的**简化可执行需求文案**。
> 每一条需求都必须落到「物理探针 + 退出码」上；不能绑探针的步骤一律递归分裂成更细颗粒度的
> skill / agent / api / mcp / plugin / cli 执行层。

| 字段 | 值 |
| --- | --- |
| 执行包编号 | PKG-009 |
| 关联需求 | REQ-REPO-MERGE-039（迁移收尾）、REQ-PROCESS-SUPERVISOR-040、REQ-GCM-GAPFIX-041 |
| 需求基线版本 | v0.4.0 → v0.5.0 |
| 实施顺序 | 041 缺口修复 → 040 流程监督员 → 039 迁移收尾（**实际执行序**；原稿把 039 排在中间是错的，删掉 cwd 后后续步骤会立刻断链） |
| 唯一 Owner Skill | `dsh-butler` (L4) |
| 状态 | 已实施并通过十四道门禁 |

**排序理由**：039 会删掉当前会话的工作目录，**必须放最后做**，否则后续步骤的 cwd 立刻断链。
041 里的 G0 门禁修复与 GCM 覆盖修复是本轮所有验收的前置（门禁本身不可信，用它验什么都没意义）。
040 是出口自检，放在能力齐备之后才有东西可监督。

---

## 0. 需求原文 → 可执行目标对照

| 编号 | 用户原话 | 可执行目标（一句话） | 判据 |
| --- | --- | --- | --- |
| R1 | 为何 skill 池文件夹没有迁移并合并到 DSH/全局规则？迁移完成后源文件夹应自动消失、任务对话自动关掉 | **完成迁移收尾**：源目录物理消失、会话归属收归一处、迁移前留台账 | 源目录不存在；`workspace.json` 无该条目；会话 id 全在目标工作区；新位置门禁全绿 |
| R2 | 新增流程监督员，查看流程是否按约定进行、打分，不合规就整改 | 新增**流程监督员**：按约定流程逐步取证 → 打分 → 对不合规项出整改清单 | 打分 0~100 且逐项 pass/fail/na；不合规项必须带可执行整改命令；缺证据判 `unverifiable` 而非 pass |
| R3 | 看看还有什么地方能优化、有什么缺口，给出方案并执行 | 按证据列出缺口清单，**本包修复可立即修的，其余登记待办** | 每个缺口带 file:line 或实测输出；修复项有前后对比实数 |

---

## 1. REQ-REPO-MERGE-039 迁移收尾（纠正 PKG-007 的判断）

### 1.1 上一轮做错了什么（诚实复盘）

PKG-007 的 R4 我做了**子树合并**：内容进了 `全局规则/skill-pool/`，历史保留，但**源目录保留为「只读镜像」**。
当时的理由是「当前会话的 cwd 就在源目录，搬走会立即断链」。

这个理由**只对了一半**：不搬走确实不会断链，但它把「迁移」变成了「复制」——
源目录仍是活着的 git 仓库、仍注册为 workspace、仍在被写。实测证据：

| 证据 | 数值 |
| :--- | :--- |
| 两处内容差异文件数 | **44**（PKG-008 的全部产出只在 `skill-pool/`，`Skill池/` 停在 PKG-007） |
| 两个仓库各自 HEAD | `Skill池` = `1c57af4`（PKG-007）；`全局规则` = `cfe4d91`（PKG-008） |
| 两个仓库各自远端 | `akidotdot-ai/skill-pool` 与 `Aki4ever/DSH-` |
| `Skill池` 仍注册为 workspace | 是，11 条会话，`mergedInto` 指向全局规则 |

**44 处差异就是双份真相的代价，而且只用了两轮就出现了。** 用户的理解是对的：迁移应当让源目录消失。

### 1.2 为什么当时不敢删、现在敢删

关键事实（本轮已核实）：**当前会话 id 已经同时存在于两个 workspace 的 `sessionIds` 里**。

| 工作区 | 含当前会话 |
| :--- | :--- |
| 全局规则 | ✅ |
| Skill池（已并入全局规则） | ✅ |

因此移除 `Skill池` 这一条 workspace 记录**不会让会话失去归属**——它本来就在新家里。
上一轮的顾虑（「删条目会让会话无家可归」）在当前数据下不成立。

### 1.3 落点与动作

| 任务 ID | 目标 | 产出路径 | 级别 | 绑定探针 | 依赖 |
| --- | --- | --- | --- | --- | --- |
| M01 | 迁移收尾器：一致性断言 → 台账留痕 → 删源目录 → 清 workspace 条目 | `skills/retire-legacy-workspace/scripts/retire_workspace.py` | L2 | 退出码 | 041 全部 |
| M02 | 台账（写在**新家**，不写在被删目录里） | `docs/operations/retired-workspaces.json` | — | 文件 + 字节 | M01 |
| M03 | 门禁：断言源目录确实消失且会话归属完整 | `skills/verify-workspace-retirement/scripts/verify_retirement.py` | L2 | 退出码 | M01 |
| M04 | 收尾器接线到管家（写入类动作前置） | `dsh-butler` 受管区块 | — | 正则 | M03 |

### 1.4 安全顺序（本包最容易出事的一步）

```
1 断言两处内容逐文件一致（差值为 0，空目录除外）
2 断言目标仓库工作树干净、已推送（源内容已在两个远端各有一份）
3 断言每个源会话 id 都在目标 workspace 的 sessionIds 里
4 写台账 retired-workspaces.json 到【新家】
5 移除 workspace.json 中的源条目（先备份 workspace.json）
6 删除源目录
7 复核：源目录不存在 + 目标门禁全绿
```

**第 5 步必须在第 6 步之前**：先取消注册再删目录，避免出现「注册项指向一个不存在的路径」的中间态。
**第 7 步之后本会话的 cwd 已失效**——这是需求明确要求的结果（「任务对话会自动关掉」），
执行器会在结束语里给出新家路径与重开方式。

### 1.5 验收断言

```bash
python3 skills/verify-workspace-retirement/scripts/verify_retirement.py --all --json
# 期望 exit 0：source_absent=true / workspace_entry_absent=true / sessions_complete=true
```

- `Skill池` 目录**不存在**（`os.path.isdir` 为假）；
- `workspace.json` 中不存在 `path` 指向 `Skill池` 的条目；
- 原 11 条会话 id **全部**出现在 `全局规则` 工作区的 `sessionIds` 中（差值 0）；
- `retired-workspaces.json` 含源路径、源 HEAD、删除时间、备份路径、回滚方式；
- 新家十四道门禁全绿。

---

## 2. REQ-PROCESS-SUPERVISOR-040 流程监督员

### 2.1 监督员要解决什么

池子今天有 **43 个 L3 门禁、14 道出厂检验**，全部是**单点检查**：
catalog 一致吗、树对得上吗、命名合规吗。**没有任何一个能力回答「这个任务整体按约定的流程走了吗」。**

结果是：门禁可以逐道全绿，而流程可能整段没走——
没查需求基线、没做双流程分流、没走粒度门禁、没留变更记录，照样能交付。
`workflows.md` §1 写了 8 步规范流转，但它是**散文**，没有探针，也就没有强制力。

监督员的职责：**把约定的流程变成一份可打分的数据**，并给出整改命令。

### 2.2 约定流程的机器可读化（唯一真相源）

新增 `docs/operations/process-spec.json`，把 `workflows.md` §1 的 8 步写成数据：
每步含 `id` / 标题 / **证据探针（四类之一）** / 权重 / 是否必需。

| # | 约定步骤 | 证据探针 | 权重 | 必需 |
| :---: | :--- | :--- | ---: | :---: |
| 1 | 从需求索引取当前生效需求与基线 | `file`：`docs/requirements/index.md` 存在且基线非空 | 10 | 是 |
| 2 | 判定增量还是完整规则审计 | `regex`：本次变更集合里是否出现规则文件 | 5 | 否 |
| 3 | 问题诊断先查问题台账 | `file`：`docs/problem-log/` 被检索过（有查询日志或记录） | 5 | 否 |
| 4 | 双流程分流判定 | `exitcode`：`score_task_lane.py` 有可复算输出 | 15 | 是 |
| 5 | 按需加载选中技能（≤ top-K） | `exitcode`：`verify_context_payload.py` 退 0 | 10 | 是 |
| 6 | 写入类任务过粒度门禁，契约变更过口径门禁 | `exitcode`：`atomic_fission_guard` / `catalog_consistency_guard` | 20 | 是 |
| 7 | 同步受影响的需求 / CLI / 界面 / 操作索引 | `file`：相关台账文件 mtime 不早于本次首个变更 | 15 | 是 |
| 8 | 提交前生成并展示非空备注 | `regex`：提交信息非空且非占位词 | 10 | 是 |
| 9 | （新增）交付前过流程监督员自评 | `exitcode`：本次打分 ≥ 阈值 | 10 | 是 |

**权重合计 100**。必需项未过即判 **不通过**（无论分数多少）——必需项是红线的同胞，不能靠加权稀释。

### 2.3 打分口径

| 项 | 取值 |
| :--- | :--- |
| 分值区间 | 0 ~ 100（权重和） |
| 单项三态 | `pass`（证据命中）/ `fail`（证据缺失或反例命中）/ `na`（该步本次不适用，如无写入则无需粒度门禁） |
| `na` 处理 | 权重从分母中扣除，**不得当作 pass** |
| 通过线 | **≥ 85 且全部必需项 pass** |
| 证据缺失 | 判 `fail` 并给 `unverifiable` 标记——**没有证据不等于走了这一步** |

**为什么必须有 `na` 而不是「没做也算过」**：不分场景地要求「写入类任务过粒度门禁」，
在纯只读任务上会制造假失败；而把「没做」直接算过又会制造假通过。`na` 是唯一诚实的第三态。

### 2.4 递归分裂：监督员不是一个技能，是一条链

按「颗粒度过大就递归分裂」的总规则，监督员拆成五层，每层各绑一类探针：

| 序 | 层级 | 能力 | 职责 | 探针 |
| :---: | :--- | :--- | :--- | :--- |
| 1 | L1 | `process-conformance-policy` | 钉死 9 步、权重、三态、通过线 | 正则 |
| 2 | L2 | `collect-process-evidence` | 从磁盘实况逐步取证 | 文件 + 退出码 |
| 3 | L2 | `score-process-conformance` | 按权重与必需项打分 | 退出码 |
| 4 | L2 | `plan-process-rectification` | 对 `fail` 项产出可执行整改命令 | 退出码 |
| 5 | **agent** | `process-supervisor-agent` | **独立视角复核**：由宿主 `subagent` 承载，不共享主上下文 | 文件（`PROMPT.md` + 证据包） |
| 6 | L3 | `process-supervisor` | 串成门禁，挂管家「③ 冲突·冗余·质量」集群 | 退出码 |

**为什么要有 agent 层这一环**：自己给自己打分必然偏松——主上下文里「我记得我做了」会污染取证。
把复核交给一个**不共享上下文**的子智能体，它只能看到落在磁盘上的证据包；
看不到的，就是没做。这是本轮唯一真正需要 agent 层的理由，不是为凑层数。

`agents/process-supervisor-agent/PROMPT.md` 是它的契约：输入证据包路径，输出逐项判定与理由，
**不得引用证据包之外的任何信息**。

### 2.5 验收断言

```bash
python3 skills/process-supervisor/scripts/supervise.py --evidence <dir> --json
# 期望 exit 0（≥85 且必需项全过）或 exit 1（附整改清单）
```

- 打分必须打印**分子 / 分母 / na 扣除项**，禁止只输出一个百分数；
- 每个 `fail` 项必须带**可执行整改命令**（含具体脚本与参数），否则判整改清单不合格；
- 证据缺失一律 `unverifiable` + `fail`，禁止默认 `pass`；
- 同输入连跑两次分数与逐项判定**逐字节相同**（确定性）；
- 反例夹具：删掉需求索引 → 第 1 步 `fail` 且必需项未过 → 总分 < 85 且退 1。

---

## 3. REQ-GCM-GAPFIX-041 缺口清单与修复

以下每条都带实测证据，不是猜的。**本包修复 P1~P3，P4~P6 登记待办并给出方案。**

### P1（必修）G0 会话命名一票否决闸**真空通过**

| 项 | 内容 |
| :--- | :--- |
| 证据 | `bash scripts/check_task_naming.sh --exit` 输出「⚠️ 找不到会话存储，无法判定当前任务命名」但 **exit=0** |
| 后果 | GCM 唯一的**一票否决**闸形同虚设：判不了就放行。这是最深的一个洞——最强的闸没有牙 |
| 修复 | 判不了必须**显式三态**：`pass` / `fail` / `unknown`；`unknown` 时 GCM 记 `pending` 而非 `pass`，且输出原因 |
| 判据 | 会话存储不可用时 `check_task_naming.sh --exit` 退出码 **≠ 0**；GCM 看板该闸显示「无法判定」而非「通过」 |

### P2（必修）GCM **完全不覆盖** `skill-pool/` 子目录

| 项 | 内容 |
| :--- | :--- |
| 证据 | `ai-control/config/gates.conf` 的 `G4_SCAN_DIRS="rules knowledge indexes docs templates memory"` —— **不含 `skill-pool`**；G1/G2 只扫顶层一级目录 |
| 后果 | 517 个文件、188 个执行层、全部需求台账**不在**冗余检测与结构门禁范围内；GCM 看板 100% 通过，但那份 100% 只覆盖了 `全局规则` 自己的文档 |
| 修复 | 把 `skill-pool` 纳入 `G4_SCAN_DIRS`；G2 的「目录有主」与「无标题」检查递归覆盖一级子目录 |
| 判据 | 修复后 G4 的扫描文件数从 71 升到覆盖 skill-pool 的数量级；`skill-pool` 内故意植入重复块能被 G4 检出 |

### P3（必修）双份真相（由 R1 收尾消除）

| 项 | 内容 |
| :--- | :--- |
| 证据 | 两处**44 个文件差异**；两个仓库各有远端；`Skill池` 仍是活 workspace |
| 后果 | 任何一处改动都可能在另一处丢失；两轮就出现分叉 |
| 修复 | R1 迁移收尾（删源目录 + 清 workspace 条目 + 台账留痕） |
| 判据 | 源目录不存在；`verify_retirement.py` 退 0 |

### P4（本包登记，方案已给）无**任务出口自检**

| 项 | 内容 |
| :--- | :--- |
| 证据 | 池内 43 个 L3 门禁全部是单点检查；`workflows.md` §1 的 8 步规范流转无任何探针 |
| 修复 | R2 流程监督员（本包实施） |

### P5（本包登记）`retired-names.json` 的 `allowed_contexts` 可能被滥用

| 项 | 内容 |
| :--- | :--- |
| 证据 | 该清单从 3 条长到 6 条，每加一份台账文档就要加一条；当前**无条数上限、无 reason 非空断言** |
| 后果 | 允许清单是「旧名悬空引用」这项硬断言的唯一出口；出口开太大，断言就失效 |
| 修复 | 加两条断言：① 每条 `allowed_contexts` 必须有非空 `reason`；② 条数上限 **≤ 12**，超出即失败并要求合并台账 |
| 判据 | 删掉某条 reason → 断言失败；把清单灌到 13 条 → 断言失败 |

### P6（本包登记）`execution-layers.json` 的 `api` / `mcp` 两层长期为空

| 项 | 内容 |
| :--- | :--- |
| 证据 | 执行层树 `{agent: 3, api: 0, cli: 9, mcp: 0, plugin: 1, skill: 175}` |
| 判断 | **不是缺口**：本机确实没有自建 API 与 MCP 服务，硬凑两层属机制膨胀 |
| 处置 | 不改；在 `workflows.md` 写明「空层是事实登记，不是待办」，避免以后被当成缺口反复「优化」 |

---

## 4. 新增执行层清单（预计 +6）

| 层级 | 数量 | 名称 |
| :--- | ---: | :--- |
| L1 原子规约 | +1 | `process-conformance-policy` |
| L2 工序动作 | +5 | `collect-process-evidence`、`score-process-conformance`、`plan-process-rectification`、`retire-legacy-workspace`、`verify-workspace-retirement` |
| L3 复合流程 | +1 | `process-supervisor` |
| **agent** | **+1** | `process-supervisor-agent`（**首个仓库自定义 agent 层执行层**） |
| **合计** | **+8** | skill 175 → 181，agent 3 → 4，执行层总数 188 → **196** |

新增产物：`docs/operations/process-spec.json`（约定流程唯一真相源）、
`docs/operations/retired-workspaces.json`（迁移台账）、
`agents/process-supervisor-agent/PROMPT.md`（监督员契约）。

---

## 5. 终局门禁（全部必须 exit 0）

```bash
./bin/skill-pool validate
./bin/skill-pool consistency
python3 skills/audit-all-skills-compliance/scripts/audit_compliance.py
python3 skills/verify-execution-tree/scripts/verify_tree.py
python3 skills/build-layer-graph/scripts/build_layer_graph.py --check
python3 skills/detect-layer-coupling/scripts/detect_coupling.py
python3 skills/verify-decoupling/scripts/verify_decoupling.py
python3 skills/verify-instance-safety/scripts/verify_instance_safety.py
python3 skills/verify-layer-naming/scripts/verify_naming.py --strict
python3 skills/render-capability-naming/scripts/render_naming_spec.py --check
python3 skills/process-supervisor/scripts/supervise.py --evidence <dir>
python3 skills/verify-workspace-retirement/scripts/verify_retirement.py --all
bash ../scripts/control_gates.sh check          # GCM 必须 100% 且覆盖 skill-pool
```

---

## 6. 自决假设留痕

| 项 | 取值 | 依据 | 回滚方式 |
| :--- | :--- | :--- | :--- |
| 源目录处置 | **物理删除**（不再保留镜像） | 用户明确「实际的 skill 池也会自动消失」；且实测两轮就分叉 44 个文件 | 内容在两个远端各有一份；`git clone` 即可恢复 |
| 删除时机 | **本包最后一步** | 删掉后当前会话 cwd 立即失效，后续任何相对路径命令都会断 | 不适用（用户已预期会话关闭） |
| 会话归属 | 移除 `Skill池` workspace 条目，会话全归 `全局规则` | 已核实当前会话 id **同时**存在于两个工作区，移除不丢归属 | 还原 `workspace.json.bak-<时间戳>` |
| 监督员通过线 | **≥ 85 且必需项全过** | 与既有 100 分制加权口径同源；必需项用一票否决而非加权稀释 | 改 `process-spec.json` 一处即全量生效 |
| `na` 语义 | 权重从分母扣除，**不得当 pass** | 不分场景要求会造假失败，把「没做」算过会造假通过 | 同上 |
| 打分者 | agent 层独立复核（宿主 `subagent`） | 主上下文「我记得我做了」会污染取证；独立上下文只能看到磁盘证据 | 去掉 agent 环，降级为纯脚本打分（分数会偏松） |
| P6（api/mcp 空层） | **不改**，登记为事实 | 本机确实没有自建 API 与 MCP，凑层属机制膨胀 | 不适用 |
| G0 修复方向 | 判不了退出码 ≠ 0，GCM 记 `pending` | 一票否决闸不能「判不了就放行」 | 改 `gates.conf` 一个开关 |
