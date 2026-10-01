# 全局规则工程 · 项目级约束

> 本文件在本目录（及其子目录）的会话中被自动注入。
> 优先级高于宿主全局文件，**低于**用户直接指令。
> 细则一律按需读取，本文件只放"进这个工程必须先做什么"。

---

<!-- DSH-CONTROL-SCOPE:BEGIN（由 scripts/backfill_scope.mjs 生成，勿手改本段） -->
## 〇、管控机制接入（REQ-092 · 全域同权，存量与新增一律生效）

> 本段由全局规则仓库的 `scripts/backfill_scope.mjs` 生成；**引用均为真实存在的路径**，
> 判定器 `node /Users/linqiyu/Documents/DSH/全局规则/scripts/scope_audit.mjs --check` 会逐条验证其可达性。

本工程（主控仓库本身）与全域其它工程**同权受管，不享豁免**。统一入口 `./scripts/control.sh`
（薄壳，转发判定逻辑，不复制判定逻辑）：

| 动作 | 本工程入口命令 | 全局规则权威载体（绝对路径，真实存在） |
| :--- | :--- | :--- |
| 首动改名（S05） | `./scripts/control.sh naming` | `/Users/linqiyu/Documents/DSH/全局规则/scripts/name_me.sh` |
| 累积门禁 G0~G5 | `./scripts/control.sh check` | `/Users/linqiyu/Documents/DSH/全局规则/scripts/control_gates.sh` |
| 底层物理锁阶梯 | `./scripts/control.sh lock` | `/Users/linqiyu/Documents/DSH/全局规则/scripts/physical_lock.sh` |
| S07 待办常显 | `./scripts/control.sh todo` | `/Users/linqiyu/Documents/DSH/全局规则/scripts/todo_gate.sh` |
| 需求版本贯通 | `./scripts/control.sh version` | `/Users/linqiyu/Documents/DSH/全局规则/scripts/req_version_audit.mjs` |
| 全域覆盖审计 | `./scripts/control.sh scope` | `/Users/linqiyu/Documents/DSH/全局规则/scripts/scope_audit.mjs` |
| 四入口自证 | `./scripts/control.sh selfcheck` | —（本工程内置，逐条实跑并写留痕） |

- **运行留痕**：每次调用都会追加一行到本工程 `.dsh-control/run-audit.jsonl`；
  "本工程到底跑没跑过管控"以该文件与会话转录为唯一依据，**不认自述**。
- **存量与新增一体治理**：`scripts/scope_audit.mjs --check` 遍历 DSH 工作根下全部工程，
  四类事实（入口在位 / 文档引用可达 / 有运行留痕 / 台账含版本）全过才算接管，
  脱管项直接由累积门禁 **G5** 拦住，不存在"新规只管新文件"的盲区。
<!-- DSH-CONTROL-SCOPE:END -->

---

## 一、开工前置：管控门禁与底层物理锁必须全过

本工程受 **管控机制** 与 **底层物理锁 Agent (Physical Lock Agent)** 约束（名称唯一权威出处见 `indexes/rules_index.md`）。
物理锁看守单向严格工序链：**必须完成上一步才可以执行下一步**，任何跳步工具调用将被底层物理拦截拒止；该机制在全域所有项目中通用生效。
任何改动型动作（写文件、改配置、跑构建）之前，先运行管控看板与物理锁状态：

```bash
./scripts/control_gates.sh check      # 输出量化看板（进度/卡点/指标）
./scripts/control_gates.sh badge      # 一行式徽标
./scripts/gate_selftest.sh            # 门禁证据可证性回归：空输出/缺键/自相矛盾一律不得算通过（V4 锁定）
./scripts/physical_lock.sh status     # 查看底层物理锁阶梯与凭据
./scripts/physical_lock.sh sync       # 按磁盘实况逐阶对齐物理锁（带凭据，不跳阶）
./scripts/todo_gate.sh check          # S07 待办常显判定：未挂任务列表 → 改动型调用被拒
./scripts/install_host_gate.sh verify # 机制载体自证：宿主是否真的加载了拦截层（isHost=true）
node scripts/mechanism_audit.mjs      # 物理触达审计：哪条机制只有文字、没有载体
node scripts/restore_skill_pool.mjs --check     # 技能池归位判定（面板能否看见技能）
node scripts/build_capabilities_index.mjs --check  # 执行层是否 100% 入索引层
node scripts/progress_ledger.mjs record --files a.md,b.mjs --judge "cmd" --expect "关键字"  # 改动登记（含写后必读回）
node scripts/progress_ledger.mjs check  # 迭代检测：哈希漂移=0 且 未记录改动=0
node scripts/flow_control.mjs --check   # 流程管控层：顺序一致 + 五条不变式成立
node scripts/output_audit.mjs --check    # 输出结构契约判定（首行徽标/一句话总结/不跳级/缩进/回执/档位）
node scripts/language_audit.mjs --check  # 文字可读性判定（无生僻字，基准为国标 GB2312 字表）
node scripts/check_layer_interfaces.mjs --check  # 执行层接口契约：接口覆盖率与名字覆盖率分开判
node scripts/gen_skill_interfaces.mjs --check   # 技能层接口契约抽取：各字段抽取成功数/待补数（抽不到一律标 (待补)，不编造）
node scripts/route_plan.mjs --check      # 路由层自检：文档-实现一致 + 死通道 + 可达性 + 反向用例
node scripts/process_supervisor.mjs --fast  # 流程监督员独立复核（不采信执行者自述）
node scripts/scope_audit.mjs --check     # 全域覆盖审计：其他 DSH 工程是否 100% 纳入管控（REQ-092）
node scripts/req_version_audit.mjs --check        # 需求版本贯通：需求文案↔台账↔载体↔回执四处对拍
node scripts/anti_hallucination_audit.mjs --check # 反空架子/反幻觉：悬空引用 + 机制通电凭据
node scripts/backfill_scope.mjs --apply  # 存量补课：为未接管工程铺入口、正引用并实跑留痕
```

> **为什么后四条必须常跑（REQ-087 实测根因）**：门禁看板只能证明"工程内文件对不对"，
> 证明不了"规则要求的机制在不在运行"。实测发现拦截层插件从未被宿主加载（`isHost=false`），
> 于是"待办常显/硬门禁/常显看板"物理上全部不存在，而看板依旧 100%。
> 判定必须穿透到**载体是否活着**，否则它证明的只是文档自洽。
>
> 同批实测还揪出三条同类断点，分别由后四条命令兜住：
> ① 待办证据原先**只有拦截层插件会写**，插件不跑 → `todo_gate` 永远判不过；
> 现改读**宿主会话转录**（`scripts/lib/session_transcript.mjs`），不再依赖插件；
> ② 状态快照写 `~/.dsh/.dsh-control/` 在沙箱下被拒 → 看板数字照算、状态留不下，
> 现降级落盘 `ai-control/reports/state/` 并在看板显式提示，绝不静默；
> ③ 进度只能靠自我宣称 → `progress_ledger` 以「文件 sha256 + 判定命令 + 实跑退出码 + 回读断言」
> 三件套落盘，改了没登记、登记对不上磁盘，一律判不通过。
>
> **REQ-092 新增四条为何也在此列**：实测 `normalize_all_projects.mjs` 按"文本在不在"给 4 个工程
> 发"完全合规"绿灯，而它们从未跑过任何管控脚本（`name_me`/`control_gates`/`physical_lock`/`todo_gate`
> 在 16 个会话里命中数全为 0）。判据只有穿透到"工程里到底有没有可跑入口、跑没跑过、文档引用是否真实存在"，
> 才算证明机制在管；这四条即该判据的载体，并已并入累积门禁 **G5**，未过不得结项。

| 门禁 | 含义 | 量化指标 |
| :--- | :--- | :--- |
| **G0 会话命名** | 会话标题合规锁定，一票否决 | R1~R7 规范校验 / 退出码 |
| **G1 项目初始化** | 仓库、骨架、防丢文件齐备 | 骨架齐备率 / 防丢覆盖率 |
| **G2 工程结构化** | 目录有主、无孤儿、无垃圾 | 合规项 / 孤儿目录数 |
| **G3 需求文档同步** | 台账与 Git 工作树对齐 | 需求条目数 / 未提交变更数 |
| **G4 冗余检测** | 实质重复率健康 | 高相似块对 / 重复标题数 |
| **G5 落地与版本一致性** | 全域覆盖 + 需求版本贯通 + 无悬空引用（REQ-092） | 落地判定通过数 / 悬空引用数 |

门禁是**累积**的：必须 G0→G1→G2→G3→G4→G5 全部通过才算"可执行"。
状态由磁盘实况推导，**不接受任何自我宣称**。进度会常显在每轮对话中。

**调参入口**：`ai-control/config/gates.conf`（改完即时生效，无需重启）。
**绕过方式**（仅在确有必要时）：环境变量 `DSH_CONTROL_GUARD=off`。

---

## 二、任务启动自检核心步骤（零豁免首发改名 + 自检）

每次开启任务，按顺序执行（**不要跳步**）：

0. **首动改名**：**无论任务大小快慢，第一步必须调用 `./scripts/name_me.sh "[分类编号][难度分] 8字概述"` 锁定会话标题**；
1. **查红线**：读 `rules/security/security_baseline.md`，守住安全边界；
2. **看元规**：读 `rules/system/meta_rules.md`，这是本工程最高准则；
3. **走干道**：查 `indexes/shortcuts_index.md`，优先命中 G0/G1 高速干道；
4. **核知识库**：读 `knowledge/README.md`，执行前置防冲突核查
   （非游戏任务**坚决不载入**游戏设定）；
5. **查台账**：读 `docs/requirements.md`，确认需求进展、边界与当前实施总版本；
6. **读记忆**：读 `memory/` 继承跨会话偏好与避坑经验；
7. **门禁复核**：运行 `./scripts/control_gates.sh check` 确认系统底座健康度。

---

## 三、流程走哪条轨

依据 `rules/workflow/task_execution_flow.md` 做快慢双轨分流：

- **快速轻量流**：单点文字微调、查阅问答 → 三步走（【探】→【攻】→【归】）；
- **标准完备流**：复杂重构、规则研发 → 严格走标准闭环，收尾给出量化审计卡片。

---

## 四、规则变动必须走六步循环

任何规则的新增、修改、注销，遵循 `rules/workflow/change_flow.md`，依序走完六步：

1. **接收意图**：把口语需求整理成"能执行的需求文案"，先明确要改什么、改完怎么验收；
2. **查重拦截**：先比对 `docs/requirements.md` 与既有规则，杜绝碎片化冗余；同类诉求归并到原条目增量演进；
3. **登记台账**：在 `docs/requirements.md` 登记需求编号与实施版本，无需求依据的规则一律不成立；
4. **编写规则**：只改一处权威源，其余文件放指针；改完必须读回校验；
5. **联动排查**：运行存量校准与冲突检测，确认没有留下死链、旧称或与元规则矛盾的表述；
6. **提交推送**：提交信息基于真实改动生成，并推送到远程仓库，未推送不得声称闭环。

**双检命令（改动后必须跑）**：

```bash
node scripts/redundancy_scan.mjs --root .      # 冗余：同一内容写了两遍 → 合并为迭代版本
node scripts/conflict_scan.mjs --root .        # 冲突：同一事实两种说法 → 先出裁决方案再迭代
node scripts/legacy_align_scan.mjs --root .    # 存量：遇碰即对齐清单，须清零或书面说明
```

---

## 五、交付收尾与文末固定结构要求

> **输出格式的唯一权威源**：[`rules/system/output_standard.md`](rules/system/output_standard.md)。
> 本节只写"必须做"，**不复述格式细则**（首行徽标取值、一句话总结字数、标题层级、缩进层数、
> 进度回执字段、双档切换口径一律以该文件为准），避免同一事实两处各说一套。
> 判定入口：`node scripts/output_audit.mjs --check`（结构）· `node scripts/language_audit.mjs --check`（用字）。

任务完成或输出汇报时必须满足：
1. **按输出结构契约成形**：一次合格回复 = 首行状态徽标 → 一句话总结 → 分层正文 → 进度回执 → 文末五联装，五项顺序固定、缺一不合格；
2. **文末五联装视觉强化总结（强制收尾结构）**：定义见 [`rules/system/meta_rules.md`](rules/system/meta_rules.md) 第三十四条，
   必须是整条回复的**最后 5 项**，严格使用加粗与状态图标；判定入口 `./scripts/audit_execution.sh`（第 8 维）；
3. **进度回执必须是实数**：完成度与判定证据从 `node scripts/progress_ledger.mjs report --json` 取，
   **手写对不上的数字即判红**；
4. **极简高信噪比输出铁律**：与任务不相关的少说，没有问到的不要说，只有很相关并且比较重要的才说，坚决剔除无关冗余客套；
5. **全域所有 DSH 工程常态化永久生效**：本管控机制对所有 DSH 工程文件夹永久生效，存量与新增工程一律受其约束，杜绝任何项目特权或裸跑脱管。

---

## 六、当前工程结构速查

```text
rules/       规则法典（system / workflow / coding / security）
knowledge/   分层知识库（common 通用 / projects 项目专属）
indexes/     能力索引与快速通道路由
docs/        需求台账与指南
memory/      长短期记忆中枢
templates/   标准模板资产
scripts/     自动化工具（含管控门禁脚本）
ai-control/  管控机制实现目录（判定层 + 拦截层）
data/        判定器基准数据（通用汉字表等，有出处、可复现）
assets/      图形资产
```

完整说明见 `README.md` 与 `indexes/rules_index.md`。
