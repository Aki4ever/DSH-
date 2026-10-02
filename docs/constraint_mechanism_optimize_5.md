# 需求文案：物理触达改造（GCM-PHY）· 细分到底 / 自证进度 / 流程管控层

> ### 🏷️ **版本信息与实施追踪**
> - **文档类型**：需求文案（登记为 `REQ-087`，状态 `[EVOLVING]`）
> - **当前系统实施总版本**：`v4.29.7`（本条目实施后递增）
> - **本文档内容版本**：`v1.0.0`
> - **提出时间**：2026-09-29
> - **任务代号**：`GCM-PHY`（Global Constraint Mechanism · Physical Reach）
> - **需求状态**：`[文案待拍板]`（未实施，未改任何机制载体）
> - **依据**：用户 3 条口语需求 + 本次实测（`mechanism_audit.mjs` / `install_host_gate.sh verify` / `control_gates.sh`）

---

## 一、原始需求（用户口语原文）

> 以下是我对管控机制的需求，如果执行的颗粒度过大导致执行层（agent、api、skill、cli、mcp、插件等）无法直接触达到物理层，就把执行层继续递归分裂成更细化的执行层；
> 1、检查当前机制，看看哪些环节没有实际落实，拒绝空架子，必须要物理层触达；
> 2、给当前机制留有迭代检测机制，方便你自己看自己做了什么以及做到什么程度，让你清楚了解自己的真实物理进度，而不是空架子瞎吹；
> 3、新增流程管控层，把现有的流程规划安插在执行效率最高的排列，要注意每次更新可能都会让整个流程变的不一样；确保每次更新后流程的一致性以及高效性；
>
> 理解以上需求并简化成更利于你执行的需求文案；

---

## 二、整理后的可执行需求

### 2.1 一句话定义

**规则里不许出现"没有一条命令能判它真假"的句子；判不了就拆细，拆到能判为止；每轮进度只认磁盘哈希与退出码，不认自述；流程顺序可重排但必须有载体算、有命令校、有台账留痕。**

### 2.2 三条子需求的可机械判定口径

| # | 诉求（用户原话） | 做什么 | 载体 | 判定命令 | 阈值 / 后果 |
| :-- | :--- | :--- | :--- | :--- | :--- |
| **R1** | 拒绝空架子，必须物理层触达 | 逐条机制核「载体 + 命令 + 退出码」，拆到叶子层 | `scripts/mechanism_audit.mjs`、`skill-pool/docs/operations/execution-layers.json` | `node scripts/mechanism_audit.mjs --exit` | 硬性未触达 = **0** 且 exit 0；否则该机制**不得标 `[ACTIVE]`** |
| **R1b** | 颗粒度过大就递归分裂执行层 | 按「叶子测试」裂分，裂到每个叶子能被单个执行层资产直接调起 | 执行层资产（`scripts/`、`skills/`、`skill-pool/`）+ 索引 | `node scripts/build_capabilities_index.mjs --check` | 未收录 = **0**；裂分未登记的资产视为不存在 |
| **R2** | 迭代检测，看清真实物理进度 | 每次改动追加机器可读记录（文件哈希 + 命令 + 退出码） | `scripts/progress_ledger.mjs`（新建） | `node scripts/progress_ledger.mjs --check` | 漂移 = **0**、无记录改动 = **0**；否则报"文实不符" |
| **R3** | 新增流程管控层，效率最优排列 + 更新后一致 | 依赖拓扑排序出最优顺序；更新后重算并校验一致 | `rules/workflow/task_execution_flow.md`（权威源）+ `scripts/flow_control.mjs`（新建） | `node scripts/flow_control.mjs --check` | 跳步 / 乱序 = **0**（exit 0）；顺序变更必须留痕并经确认 |

---

## 三、现状实测：哪些环节是空架子（本次真实取证）

> 数据源：`node scripts/mechanism_audit.mjs`（13 条登记机制）、`./scripts/install_host_gate.sh verify`、`./scripts/control_gates.sh check`、`./scripts/physical_lock.sh status`。全部命令本次实跑。

### 3.1 触达总账

| 判定 | 条数 | 说明 |
| :--- | :--: | :--- |
| ✅ 已触达 | 7 | 改名 / G0~G4 门禁 / 双检扫描 / 执行效果审计 / 执行层入索引 / 技能池归位 / 任务列表面板 |
| ⛔ 硬性未触达 | 3 | 底层物理锁（探针 ETIMEDOUT）· S07 待办常显（探针跑时尚未挂任务列表）· 拦截层宿主注册 |
| ⚠️ 无物理载体（纯文字） | 3 | S11 写后必读回 · 流程监督员 agent · 控制跳转插件 |

### 3.2 根因：最深处的一个断点，废掉四条机制

`./scripts/install_host_gate.sh verify` 本次实测：

```text
条目存在: ⛔ 缺失          # ~/.dsh/profiles/desktop/cordis.patch.yml 中 ai-execution-control 条目丢失
语法自检: ✅ loader.mjs / index.mjs 可解析   # 上次的致命语法错误已修
宿主激活: ⛔ 无宿主激活凭据（isHost=true 不存在）
```

后果链（**同一根因**）：拦截层插件没被宿主加载 →
**①硬门禁 ②常显看板 ③S07 待办常显 ④物理锁运行时拦截，四件事在物理层全部没在跑**，
而 `control_gates.sh` 依旧报 4/4 门禁通过——它证明的只是"工程内文件自洽"，证明不了"机制活着"。

### 3.3 同一根因的第二条证据链：S07 待办常显"永远判不过"

本次实测（**已挂载 `todo_write` 任务列表之后**复跑 `node scripts/mechanism_audit.mjs`，S07 仍判 `exit=1`）：

```text
./scripts/todo_gate.sh status
会话标识: session-6d61aa3e-...
待办常显：⛔ 无证据（未挂载任务列表）      # 已挂载仍无证据
```

穿透取证（grep 全库，谁写证据）：

| 事实 | 证据 |
| :--- | :--- |
| 证据路径 | `$DSH_HOME/.dsh-control/todos/<会话ID>.json`（`scripts/lib/todo_gate_cli.mjs:15`） |
| **运行时唯一的写入者** | `ai-control/plugin/index.mjs:965` → `recordTodoWriteSync(...)`（拦截层插件） |
| 磁盘实况 | 该目录只有 **1 个旧会话**（`session-33f12493-…`，01:48）的证据，本会话无 |
| 判定链 | 插件未加载 → 无人写证据 → 判定器永远拿不到证据 → **S07 永远 `NO_TODO` 阻断** |

**即：`todo_write` 这个动作本身在物理层是"只显示、不落盘"** —— 表面看任务列表挂上了，
判定器那头永远是空白。这正是"空架子"最典型的形态：**不是没写规则，而是写证据的那个人没在跑**。

### 3.4 附带取证：状态快照目录在当前沙箱模式下不可写

```text
./scripts/control_gates.sh check
./scripts/control_gates.sh: line 557: ~/.dsh/.dsh-control/status.json.tmp: Operation not permitted
touch: ~/.dsh/.dsh-control/cache.env: Operation not permitted
```

`~/.dsh/.dsh-control/` 的 mtime 冻结在 **04:00**（`touch` 探针实测 `WRITE DENIED`）。
即：**门禁看板的状态快照与物理锁凭据的落盘通道，在 `workspace-write` 策略下物理不通**——
看板数字仍能算出来（读的是工程内文件），但"机制活着"的状态无法留存为跨会话凭据。
本项与 3.2 同属"判定层 vs 载体"脱节，列入 R1 清单。

### 3.5 结论（写入需求的硬要求）

1. **判定必须穿透到"载体是否活着"**，不能止于"文件是否存在"（存在性检查抓不到语法错误、抓不到条目丢失、抓不到宿主未加载）；
2. 有实物但宿主无扩展面的（如 `process-supervisor-agent`），**只许标 `BLOCKED` 并写明缺哪种宿主面**，不许写"已优化"含糊过去；
3. 每条"必须/强制"的规则，必须同时能回答：**谁来执行 · 怎么判定 · 判定不过会怎样**。

---

## 四、R1 落地规约：叶子测试与递归裂分

### 4.1 叶子执行层测试（四条全过才算叶子）

| 编号 | 判据 | 反例（→ 必须继续裂分） |
| :--- | :--- | :--- |
| **L1 单入口** | 有且只有一个可执行入口（脚本文件 / 命令 / 插件 main） | "管控机制"整体——入口是几十个文件 |
| **L2 单职责** | 一次调用只做一件事，有输入/输出契约 | `control_gates.sh` 同时做骨架检查 + 结构检查 + 同步检查 + 冗余检查 |
| **L3 可判定** | 退出码 0/1 判真假，无需人解读文字 | "请注意写后必读回"——没有判定器 |
| **L4 可直调** | 上层一条命令 / 一次工具调用即可触达 | `process-supervisor-agent`——宿主无注册面，谁也调不起 |

### 4.2 裂分触发条件（命中任一即强制裂分）

- T1 **一资产多职责**：一个资产干 ≥2 件互不相关的事；
- T2 **一调用跑不完**：单次调用无法在一条命令内闭合，需人工分段驱动；
- T3 **判定靠读文字**：判定结果不是退出码，而是"人来理解"；
- T4 **多执行面混杂**：同一机制同时管 agent + 插件 + CLI，未按执行面拆开。

### 4.3 裂分产物登记（防"拆完就丢"）

- 每条新裂分出来的叶子层，登记进 `skill-pool/docs/operations/execution-layers.json`；
- 按 `skill-pool/docs/operations/rebuild-chain.json` 跑派生重建；
- 跑 `node scripts/build_capabilities_index.mjs --apply` 使其 100% 入索引；
- 未登记的裂分产物视为**不存在**（`--check` 未收录数必须为 0）。

---

## 五、R2 落地规约：迭代检测（自己看自己）

### 5.1 三问必须一屏答完

`node scripts/progress_ledger.mjs --report` 一次输出三问：

1. **我做了什么** —— 本轮改动的文件清单 + 每个文件的物理锚点（sha256 + 行数 + mtime）；
2. **做到哪一步** —— 每条需求条目的判定命令与最近一次实跑退出码；
3. **还差什么** —— 未触达项 / BLOCKED 项 / 验收未打勾项，逐条带补课命令。

### 5.2 只认磁盘，不认自述（防"瞎吹"的物理手段）

| 记录字段 | 来源 | 为什么必须 |
| :--- | :--- | :--- |
| `file` | 声明改动的路径 | 定位 |
| `sha256` | **改动后从磁盘重算** | 与账本记录不一致 → 判"漂移"，即文实不符 |
| `judgeCmd` | 该改动对应的判定命令 | 每条改动必须自带判据 |
| `exitCode` | 该命令**实跑**退出码 | 没跑过的改动不许记 |
| `at` / `task` | 时间 + 会话标题 | 可回溯到轮次 |

### 5.3 判定

- `node scripts/progress_ledger.mjs --check` → **漂移 = 0 且无记录改动 = 0**，exit 0；
- 允许"书面降级"：确实无宿主扩展面的，记为 `BLOCKED` 并写明缺失的宿主面，**不计为触达，也不计为漂移**。

---

## 六、R3 落地规约：流程管控层（效率最优 + 更新后一致）

### 6.1 分层与唯一权威源

| 层 | 载体 | 只放什么 |
| :--- | :--- | :--- |
| 规则层（权威源） | `rules/workflow/task_execution_flow.md` 新增"流程管控层"章节 | 步骤清单、依赖边、**不变式**；不放细则 |
| 判定层 | `scripts/flow_control.mjs`（新建） | 拓扑排序、关键路径、一致性校验、变更提案 |
| 留痕层 | `docs/requirements.md` 附节 + `progress_ledger` | 每次顺序变更的前后对比 |

### 6.2 `flow_control.mjs` 四个子命令

| 命令 | 作用 | 输出 |
| :--- | :--- | :--- |
| `--plan` | 读依赖声明 + 实测耗时 → 拓扑排序 + 关键路径 | 建议顺序（人读表 + JSON） |
| `--check` | 实际执行轨迹 vs 规划顺序比对 | 跳步 / 乱序数；**exit 0/1** |
| `--diff` | 机制更新后重算，输出"顺序变化提案" | 变更前 / 变更后 / 影响面；**不自动改规则文件** |
| `--graph` | 出依赖图 | 可接入信息图资产 |

### 6.3 不变式（重排的硬边界，永远不许被重排破坏）

| 编号 | 不变式 |
| :--- | :--- |
| **I1** | 底层物理锁 `LOCK-0 → LOCK-4` 单向严格递增，不可跳阶、不可并行 |
| **I2** | `G0 → G4` 累积门禁顺序不变（G0 命名不通过则后续一律不许开跑） |
| **I3** | 首动改名必须是第 0 步（零豁免） |
| **I4** | 写后必读回紧跟每一次写之后，**不是**流程末尾一次性做 |
| **I5** | 双检（冗余 / 冲突 / 存量）必须在提交推送之前 |

### 6.4 可变部分（允许每次更新重排）

- 非锁步之间的先后关系与并行关系；
- 无数据依赖的判定合并成一次调用（省往返）；
- 关键路径上的步骤前置，非关键路径步骤可后移。

### 6.5 更新协议（保证"每次更新后一致 + 高效"）

```text
机制更新 → node scripts/flow_control.mjs --diff   （算出新顺序提案）
        → 用户确认（顺序变更属规则变更，走 change_flow.md）
        → 改规则层唯一权威源
        → node scripts/flow_control.mjs --check    （必须 exit 0）
        → progress_ledger 留痕 + 台账附节登记
```

**铁律**：流程可以重排，**不可跳步**；重排只改"非锁步"的先后/并行关系。`--diff` 出提案前不得改动流程规则文件。

---

## 七、验收清单（命令级，全部实跑才可勾）

```bash
node scripts/mechanism_audit.mjs --exit              # 硬性未触达 = 0（exit 0）
node scripts/progress_ledger.mjs --check             # 漂移 = 0 · 无记录改动 = 0
node scripts/flow_control.mjs --check                # 跳步 / 乱序 = 0
node scripts/build_capabilities_index.mjs --check    # 叶子层未收录 = 0
./scripts/install_host_gate.sh verify                # exit 0（isHost=true，拦截层真的在跑）
./scripts/control_gates.sh check                     # G0~G4 4/4
node scripts/redundancy_scan.mjs --root .            # 高相似对 = 0
node scripts/conflict_scan.mjs --root .              # 冲突 = 0
```

- [ ] R1：`mechanism_audit --exit` 归零，无载体项清空或书面 `BLOCKED`；
- [ ] R1b：裂分产物 100% 入索引，派生重建全绿；
- [ ] R2：`progress_ledger` 落盘且 `--check` 漂移 0；
- [ ] R3：流程管控层章节落地（唯一权威源）+ `flow_control --check` 绿 + 顺序变更留痕；
- [ ] 拦截层宿主激活（`verify` exit 0）——**需重启桌面端**，属实测已确认的硬前置；
- [ ] 台账登记 + 提交推送。

---

## 八、待用户拍板（未自行取舍）

| 编号 | 待决事项 | 选项 |
| :--- | :--- | :--- |
| **D1** | 是否**现在就实施**，还是先只落需求文案 | A. 只落文案（本轮已做） / B. 立刻进入实施 |
| **D2** | 递归裂分范围 | A. 只裂分审计判"无载体 / 硬性未触达"的 6 条 / B. 全量 13 条一律过叶子测试 |
| **D3** | 拦截层宿主激活需**重启桌面端** | A. 现在改 profile 并请用户重启 / B. 暂不动宿主，先做纯本地 R2+R3 |
| **D4** | `flow_control.mjs` 的依赖声明来源 | A. 从 `task_execution_flow.md` 解析 / B. 独立 JSON 声明文件（更易校验，但多一份源） |

---

## 九、附：本轮实测原始输出（可复跑）

| 命令 | 本次结果 |
| :--- | :--- |
| `./scripts/control_gates.sh check` | 4/4 通过（骨架 11/11 · 防丢 11/11 · 合规 5/5 · 孤儿 0 · 条目 86 · 高相似对 0） |
| `node scripts/mechanism_audit.mjs` | 13 条 · 已触达 7 · 硬性未触达 3 · 无载体 3 |
| `./scripts/physical_lock.sh status` | 锁阶 `[0] LOCK-0`，已签署凭据 0 条（本会话首次探境态） |
| `./scripts/todo_gate.sh check` | 首次报"无任务列表证据"→ 挂载 `todo_write` 后**复跑仍报同一结论**（根因见 §3.3，非探针顺序问题） |
| `./scripts/install_host_gate.sh verify` | 条目缺失 + 载体语法通过 + 无 isHost 凭据（exit 1） |
| `./scripts/control_gates.sh check` | 4/4 通过，但 stderr 报 `status.json.tmp / cache.env: Operation not permitted`（状态快照落盘被沙箱拦下，见 §3.4） |
| `./scripts/audit_execution.sh` | 补 `node` 进 PATH 后 80/100（扣 12 分待办常显 = §3.3 根因；扣 8 分输出度量未采集）；不补 PATH 时误报 36/100 |
| grep 全库 `recordTodoWrite` | 运行时唯一写入者 = `ai-control/plugin/index.mjs:965`（即那条没被加载的拦截层插件） |
