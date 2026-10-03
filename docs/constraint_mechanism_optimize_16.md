# 需求文案：管控执行保真 · 流程流转层 · 高度可复现 · 纪律双向督促（REQ-100）

> ### 🏷️ **版本信息与实施追踪**
> - **文档类型**：需求文案（登记为 `REQ-100`，状态 `[ACTIVE]`）
> - **当前系统实施总版本**：`v4.29.13`（本条落地后由登记入口自动递增）
> - **本文档内容版本**：`v1.0.0`
> - **需求版本号**：`v1.0.0`
> - **提出时间**：2026-10-03
> - **任务代号**：`FLOW-ROUTER`
> - **需求状态**：`[ACTIVE]` 四条子项，物理载体与验收命令见 §四、§五
> - **依据**：用户口语需求（本轮四条）+ 本轮只读取证（逐条见 §三）

---

## 一、原始需求（用户口语原文）

> 以下是我对管控规则的优化需求，如果需求颗粒度过大导执行层（包括 skill、agent、plugin、插件、cli、mcp 等）
> 导致没触达物理实现层，就递归分裂成更细更落地的执行层去完成这额个需求；
> 1、如何让每次任务执行都高度依照给出的管控机制执行，给出方案；
> 2、新建流程流转层，专门根据这个方案去构建对应的 agent 专门负责管控机制流程的流转；
> 3、流程的流转必须高度可复现；
> 4、流程的流转情况要与纪律委员进行反馈和相互督促；
> 理解以上需求并简化成更利于你执行的需求文案；

> 📌 **原文勘误**（只做字面归一，不改语义）：“导执行层” = **到执行层**；“这额个需求” = **这个需求**。
> 📌 **口径**：第 1 条要的是**一套能跑的方案**（不是一段说明文字）；第 2 条要的是**能推进的流转层 + 专职角色**；
> 第 3 条要的是**可被第三人重算**的复现；第 4 条是**双向**——流转报委员、委员拦流转，不是单向通报。

---

## 二、简化后的可执行需求文案（本文件的核心，可直接照做）

> 下面四段就是"更利于执行"的版本：每段都是**主谓宾 + 判据 + 命令**，没有修饰语。

### R1 · 每次任务都按机制走（方案 = 拦得住 + 算得出 + 罚得到）

**可执行文案**：一次任务从开头到收尾必须走 `ai-control/config/flow_graph.json` 里的步骤；
**上一步没有留下"退出码 0 + 证据"的记录，就推不动下一步**（跳步当场被拒，退出码 1）；
收尾时按任务分道算**合规率**（分母 = 该分道要求的必需步骤，不是"我做过的步骤"），
不达标不许收口；违规事实交给纪律委员扣分。
**三道牙**：① 拦截层（已有：待办常显 / 首动改名 / 门禁）② 流转层（本轮新建：跳步拒收）
③ 纪律维度（本轮新建：`10. 流程流转` 真扣分）。
**判定入口**：`node scripts/flow_router.mjs --status --json` · `node scripts/flow_router.mjs --close`

### R2 · 新建流程流转层，并配专职角色

**可执行文案**：新建**流程流转层**，只干四件事——**推进、拒收、留痕、复现**；
它的阈值（分道、必需步骤、纪律地板分、受拦阶段）只写在
`ai-control/config/flow_router.conf.json` 这一份机读配置里；
配套专职角色 `flow-router-agent`，职责写成契约文件，**运行载体是流转引擎的子命令**
（宿主无 agent 注册面，所以"能跑的命令"才算载体，只有 Markdown 不算）。
**判定入口**：`node scripts/flow_router.mjs --next`
**与相邻层的分工**：依赖图管"顺序对不对"，物理锁管"四阶粗锁"，流转层管"现在该走哪步、走了没有"。

### R3 · 流转必须高度可复现

**可执行文案**：每一步落一行**哈希链日志**（`前序哈希 + 规范化的整条正文` 取 sha256）；
运行标识由 `sha256(会话id|分道)` 推导，**不用随机数、不用时钟**；
`--replay` 必须用同一份日志把流转决策重推一遍，并对三条判据逐条给结论：
**链自洽 / 依赖图未变 / 当时每步都合法**。三条不全过即判"不可复现"，
**"我记得我按顺序做的"不作为证据**。
**判定入口**：`node scripts/flow_router.mjs --replay --json`（退出码 0 才算可复现）

### R4 · 流转与纪律委员双向反馈、相互督促

**可执行文案**：两条命令各管一向——
**流转 → 委员**：`--findings` 写出机器可读的违规事实包（跳步 / 乱序 / 缺步 / 退出码非 0 / 链断），
委员把它折算成审计维度 `10. 流程流转` 并**按 L2 真的入账**（该维度不接受"进行中"豁免）；
**委员 → 流转**：推进前读纪律分，已停用或低于地板分时，**受拦阶段（攻坚/质检/归卷）的推进被硬拒**。
两向都不许用话术代替事实：能被日志复算的事实，只有成立与不成立两种。
**判定入口**：`node scripts/flow_router.mjs --findings --json` · `node scripts/discipline_score.mjs verify --json`

---

## 三、本轮只读取证的事实（可复跑，非推测）

| 编号 | 事实 | 复跑证据 |
| :--- | :--- | :--- |
| P1 | 已有"流程管控层"只校验**顺序一致性**（图合法 / 载体在位 / 不变式 / 规则层同步 / 已批准==重算），**没有推进状态机**：没有"上一步没完成就拒下一步"的入口 | `node scripts/flow_control.mjs --check` 只输出这六项；`--mark` 仅记 `{at, session, step}` |
| P2 | 既有轨迹 `ai-control/reports/state/flow_trace.jsonl` **只有 step id**：无退出码、无证据、无哈希链，因此**"跑没跑过、跑对没有"不可复算** | 读该文件可见字段仅 4 个 |
| P3 | 纪律委员的证据只来自 `audit_execution.sh --json` 的 9 个维度，**没有流程维度**：跳步不影响分数 | `node scripts/discipline_score.mjs verify --json` 的 `witness.failedDims` 里无流程项 |
| P4 | 复现能力此前只覆盖"账本哈希链"（纪律分）与"技能指纹"，**流程流转本身没有复现校验** | 旧 `flow_control --check` 的"轨迹合法"仅判轨迹是否为合法拓扑序，不重算链 |
| P5 | 宿主**没有 agent 注册面**（既有 `discipline-officer-agent` 的运行载体也是脚本子命令） | `skill-pool/agents/discipline-officer-agent/PROMPT.md` 的调用段落即为证据 |

> 结论：四条需求都不是"再加一段规则文字"，核心缺口是**流转状态机 + 可复算轨迹 + 纪律维度**三件物理载体。

---

## 四、递归分裂：需求 → 执行层 → 物理载体（触达物理实现层为止）

> 规则：**分裂到"有一个真实文件 + 一条能跑的验收命令"才停**；停在 Markdown 说明上即为未落地。

| 子项 | 分裂出的执行层条目 | 层 | 物理载体（真实路径） | 验收命令 |
| :--- | :--- | :--- | :--- | :--- |
| R1 | 跳步拒收（依赖未满足即拒） | cli | `scripts/flow_router.mjs` | `node scripts/flow_router.mjs --advance S16 --rc 0`（应退出码 1） |
| R1 | 合规率度量（分母=分道必需步骤） | cli | `scripts/flow_router.mjs`（`conform`） | `node scripts/flow_router.mjs --status --json` 的 `conform.rate` |
| R1 | 分道与阈值唯一权威源 | config | `ai-control/config/flow_router.conf.json` | 同上（`lane` 与 `required` 取自该文件） |
| R1 | 收口门（合规率+链+复现全过才可收口） | cli | `scripts/flow_router.mjs --close` | `node scripts/flow_router.mjs --close` |
| R2 | 流转引擎（推进/拒收/留痕/复现/报委员） | cli | `scripts/flow_router.mjs`（7 个子命令） | `node scripts/flow_router.mjs --selftest`（6/6） |
| R2 | 流转层规则章节（分工+不变式，不放数值） | 规则 | `rules/workflow/task_execution_flow.md` §二之六 | `node scripts/flow_control.mjs --check` |
| R2 | 专职角色契约 + 接口契约 | agent | `skill-pool/agents/flow-router-agent/{PROMPT.md,interface.json}` | `python3 skills/verify-execution-tree/scripts/verify_tree.py`（issue 0） |
| R2 | 角色登记进执行层树 | 索引 | `skill-pool/docs/operations/execution-layers.json` + `execution-tree.*` | 同上 |
| R3 | 哈希链日志（只追加、可重算） | 数据 | `ai-control/reports/state/flow_runs/<runId>.jsonl` | `node scripts/flow_router.mjs --replay` |
| R3 | 确定性运行标识（无随机、无时钟） | cli | `scripts/flow_router.mjs`（`makeRunId`） | 同会话连跑两次 `--begin`，`runId` 相同 |
| R3 | 依赖图绑定的复现边界（图变则旧日志作废） | cli | `scripts/flow_router.mjs`（`graphHash`） | 反例见 `--selftest` 第 5 条 |
| R4 | 违规事实包（流转 → 委员） | 数据 | `ai-control/reports/discipline/flow_findings.json` | `node scripts/flow_router.mjs --findings --json` |
| R4 | 委员第 10 维落账（委员判与罚） | cli | `scripts/discipline_score.mjs`（`collectFlowFindings` / `FLOW_DIM`） | `node scripts/discipline_score.mjs --selftest`（20/20） |
| R4 | 纪律规则条目 R9（口径，不复述数值） | 规则 | `rules/system/discipline_score.md` R9 行 | 同上 |
| R4 | 反向拦截（纪律分卡流转） | cli | `scripts/flow_router.mjs`（`readDiscipline` + `blockedPhases`） | 构造低分/停用后 `--advance` 攻坚步（应退出码 1） |
| R1~R4 | 流转层纳入 CLI 规划与能力索引 | 索引 | `CLI_PLAN.md` · `indexes/capabilities_index.{md,json}` | `node scripts/cli_plan_audit.mjs --check` · `node scripts/build_capabilities_index.mjs --check` |

---

## 五、验收标准

- [x] `node scripts/flow_router.mjs --selftest` 退出码 0（6 条用例：正例 + 跳步 + 篡改断链 + 缺步 + 失败步 + 依赖图变更）；
- [x] `node scripts/flow_router.mjs --replay --json` 对本次运行输出 `ok:true`（三条复现判据逐条在案）；
- [x] `node scripts/discipline_score.mjs --selftest` 退出码 0（20 条用例，含"流转违规可落账 / 无违规不罚 / 证据缺失不冒充通过"三条）；
- [x] `node scripts/flow_control.mjs --check` 退出码 0（不变式 6 条，含 I6 流转轨迹可复现）；
- [x] `node scripts/flow_control.mjs --selftest` 退出码 0（含"流转轨迹断链被检出"）；
- [x] `python3 skills/verify-execution-tree/scripts/verify_tree.py` issue 0（`flow-router-agent` 已登记，登记表 17 条）；
- [x] `node scripts/cli_plan_audit.mjs --check` · `node scripts/build_capabilities_index.mjs --check` · `node scripts/check_layer_interfaces.mjs --check` 三条退出码 0（执行层 280 条全部入索引，CLI 层接口覆盖 100%）；
- [x] 反向验证：手工改一行流转日志 → `--replay` 判不可复现；构造跳步 → `--advance` 退出码 1；`--findings` 产出违规事实包。

---

## 六、实施记录

- **2026-10-03 [新建 + 落地]**：接收四条口语需求并简化为可执行文案（本文件）。
  查重结论：四条都是既有条目线的**增量演进**——R1/R2 是 REQ-087 R3「流程管控层」缺的推进与角色段，
  R3 是 REQ-087/REQ-098 复现口径的延伸，R4 是 REQ-098 R7「专职纪律委员」缺的流程维度，故不新建规则碎片。
- **2026-10-03 [首次实跑 · 抓到三个真缺陷]**：用新建的流转层把本轮任务真跑一遍（每步用真实判定命令与真实退出码），
  过程本身抓出三处此前**看板一路绿灯却跑不通**的问题：
  1. **依赖图判定命令写错**：`S08` 的 `judge` 曾写作 `./scripts/global_scheduler_lock.sh status`
     （正确是 `--status`），实测 rc=1。根因是 `flow_control --check` 只验 `carrier` 在不在盘、
     **不验真正被执行的 `judge` 命令**——已补 `judgeCarrierProblems()`（判定命令引用的脚本必须在盘）并修正该命令。
  2. **委员把"进行中"当违规**：首版 `collectFlowFindings` 把"合规率 < 100%"也当违规，
     于是委员对一个**正在推进、并无违规事实**的 run 扣了 L2 −5。这正是 REQ-099 已立过的
     「进行中不计罚」口径被重犯——已改为**只认违规事实**（跳步/乱序/缺步/失败/链断），
     并补反向用例「进行中的流转 run 不得计罚」钉住。账本只追加不可回滚，那 5 分**留在账上**
     （当前 65 而非 70），恢复权在用户，见下方诚实缺口④。
  3. **收口后复跑才暴露的参数解析缺陷**：`--replay --json` 曾把 `--json` 当成 runId
     （报 `run --json 无日志`）。根因是"可选位置参数"的解析没区分"选项 token"。
     已修，并把 `--replay`（不带给 runId）与 `--replay --json` 两种形式都实跑过。
     **该修补发生在 run 收口之后**，属收口后修补，如实记录、不回溯改写已封存的日志。
- **本轮自捕获缺陷（如实记录）**：本轮首次物理写入（`flow_router.mjs`）发生在流转层自身建成**之前**，
  属"工具未就位时的既成事实"；处置方式是把该缺口写进本节，并在流转 run 里以真实判定命令补记，
  **不做回溯补绿**。这条正是 R1 要解决的问题本身。
- **诚实缺口**：① `light` 分道必需步骤清单是**判断**不是事实（由我拟定），若被认为过松，改
  `flow_router.conf.json` 即生效；② 委员读不到流转事实包时**不罚也不通过**（避免"没通电当满分"），
  代价是"流转层压根没跑"只体现在合规率上、不会自动扣分；③ 反向拦截只覆盖三个受拦阶段
  （保留逃生舱，避免"修门禁须先过门禁"式死锁）；④ 账本里那笔 −5 是**误扣**（口径缺陷所致），
  只追加账本无法自回滚，须由用户裁定恢复；⑤ `S11`（写后必读回）在依赖图上是**一次性步骤**，
  但语义是 `per-write`：本轮之后的多次改写仍需人工重跑 `progress_ledger record`，
  流转层目前不会自动对同一步骤"重复计次"。
