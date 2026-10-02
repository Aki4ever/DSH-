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
| 累积门禁 G0~G7 | `./scripts/control.sh check` | `/Users/linqiyu/Documents/DSH/全局规则/scripts/control_gates.sh` |
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

本工程受 **管控机制** 与 **底层物理锁 Agent (Physical Lock Agent)** 约束（名称权威出处见 `indexes/rules_index.md`）。物理锁看守单向工序链：**上一步没完成就不能做下一步**，跳步被底层拦截拒止（全域通用）。任何改动型动作（写文件/改配置/跑构建）前先跑：

```bash
./scripts/control_gates.sh check      # 量化看板（进度/卡点/指标）
./scripts/control_gates.sh badge      # 一行式徽标
./scripts/gate_selftest.sh            # 门禁证据可证性回归：空输出/缺键/自相矛盾不算通过（V4 锁定）
./scripts/physical_lock.sh status     # 查看物理锁阶梯与凭据
./scripts/physical_lock.sh sync       # 按磁盘实况对齐物理锁（带凭据，不跳阶）
./scripts/todo_gate.sh check          # S07 待办常显：未挂任务列表 → 改动型调用被拒
./scripts/install_host_gate.sh verify # 宿主是否真的加载了拦截层（isHost=true）
node scripts/mechanism_audit.mjs      # 物理触达审计：哪条机制只有文字、没有载体
node scripts/restore_skill_pool.mjs --check     # 技能池归位（面板能否看见技能）
node scripts/build_capabilities_index.mjs --check  # 执行层是否 100% 入索引层
node scripts/progress_ledger.mjs record --files a.md,b.mjs --judge "cmd" --expect "关键字"  # 改动登记（含写后读回）
node scripts/progress_ledger.mjs check  # 迭代检测：哈希漂移=0 且 未记录改动=0
node scripts/flow_control.mjs --check   # 流程顺序一致 + 五条不变式
node scripts/output_audit.mjs --check    # 输出结构契约（徽标/总结/不跳级/缩进/回执/档位）
node scripts/language_audit.mjs --check  # 无生僻字（基准国标 GB2312 字表）
node scripts/check_layer_interfaces.mjs --check  # 接口契约：接口覆盖率与名字覆盖率分开判
node scripts/gen_skill_interfaces.mjs --check   # 接口契约抽取：抽不到一律标 (待补)，不编造
node scripts/route_plan.mjs --check      # 路由自检：文档-实现一致 + 死通道 + 反向用例
node scripts/process_supervisor.mjs --fast  # 流程监督员独立复核（不采信自述）
node scripts/scope_audit.mjs --check     # 全域覆盖：其他工程是否 100% 纳入管控（REQ-092）
node scripts/req_version_audit.mjs --check        # 需求版本贯通：文案↔台账↔载体↔回执对拍
node scripts/anti_hallucination_audit.mjs --check # 反空架子：悬空引用 + 机制通电凭据
node scripts/session_source_audit.mjs --check  # 会话来源合规：禁手写 retired kind + 宿主校验器实跑对拍
node scripts/strategy_layer_audit.mjs --check   # 策略层表达：结论先行 + 正文零机器原文（REQ-097 R2）
node scripts/knowledge_audit.mjs --check        # 知识库条目与索引双向可达（REQ-097 R3）
node scripts/cli_plan_audit.mjs --check         # 立项 CLI 规划在位且真实（REQ-097 R4）
node scripts/todo_panel_audit.mjs --check      # 任务列表面板：逐条打钩行为断言 + 已进宿主 bundles
node scripts/market_guard_patch.mjs --check   # 市场安装守卫：忙是否已放宽为并发（可 --apply/--revert）
node scripts/backfill_scope.mjs --apply  # 存量补课：铺入口、正引用并实跑留痕
```

> **后四条为何必跑（REQ-087 实测）**：看板只证明"文件对不对"，证明不了"机制在不在跑"——拦截层实测从未被宿主加载（`isHost=false`），"待办常显/硬门禁/常显看板"物理上全不存在，看板却仍 100%；判据必须穿透到载体本身。同批三处断点由后四条兜住：① 待办证据原只由插件写 → 改读宿主转录 `scripts/lib/session_transcript.mjs`；② 状态快照写 `~/.dsh/.dsh-control/` 被沙箱拒 → 降级落盘 `ai-control/reports/state/` 并显式提示；③ 进度靠自述 → `progress_ledger` 以「sha256 + 判定命令 + 实跑退出码 + 回读断言」落盘。
> **REQ-092 同理**：`normalize_all_projects.mjs` 曾按"文本在不在"给 4 个从未跑过管控脚本的工程发绿灯（`name_me`/`control_gates`/`physical_lock`/`todo_gate` 命中数全 0）；判据须穿透到"有无可跑入口、跑没跑过、引用是否真实"，这四条已并入 **G5**，未过不得结项。

| 门禁 | 含义 | 量化指标 |
| :--- | :--- | :--- |
| **G0 会话命名** | 标题合规锁定，一票否决 | R1~R7 / 退出码 |
| **G1 项目初始化** | 仓库、骨架、防丢文件齐备 | 骨架率 / 防丢覆盖率 |
| **G2 工程结构化** | 目录有主、无孤儿垃圾 | 合规项 / 孤儿目录数 |
| **G3 需求文档同步** | 台账与 Git 工作树对齐 | 条目数 / 未提交变更数 |
| **G4 冗余检测** | 实质重复率健康 | 高相似块对 / 重复标题 |
| **G5 落地与版本一致性** | 全域覆盖 + 版本贯通 + 无悬空引用（REQ-092） | 落地判定通过数 / 悬空引用 |
| **G6 执行层并发与载体一致性** | 树可溯源 + 调度有牙 + 队列有界 + 载体齐备 + 篇幅受管（REQ-093） | 并发与载体判定通过数 / 未达标项 |
| **G7 纪律分** | 纪律账本哈希链自洽 + 当前分在停用阈值之上（REQ-098） | 账本记录数 / 当前纪律分 |

门禁**累积**：G0→G1→G2→G3→G4→G5→G6→G7 全过才算可执行；状态由磁盘实况推导，**不接受自我宣称**，进度每轮常显。调参入口 `ai-control/config/gates.conf`（改完即时生效）；确有必要时才用 `DSH_CONTROL_GUARD=off` 绕过。

---

## 二、任务启动自检核心步骤（零豁免首发改名 + 自检）

开工按序执行（**不要跳步**）：

0. **首动改名**：无论任务大小快慢，第一步必须 `./scripts/name_me.sh "[分类编号][难度分] 8字概述"` 锁定会话标题；
1. **查红线**：`rules/security/security_baseline.md`（安全边界）；
2. **看元规**：`rules/system/meta_rules.md`（本工程最高准则）；
3. **走干道**：`indexes/shortcuts_index.md`（优先 G0/G1 高速干道）；
4. **核知识库**：`knowledge/README.md`（非游戏任务**坚决不载入**游戏设定）；
5. **查台账**：`docs/requirements.md`（需求进展、边界、当前实施总版本）；
6. **读记忆**：`memory/`（跨会话偏好与避坑经验）；
7. **门禁复核**：`./scripts/control_gates.sh check`（系统底座健康度）。

---

## 三、流程走哪条轨

依据 `rules/workflow/task_execution_flow.md` 快慢双轨分流：**快速轻量流**（单点文字微调、查阅问答）走三步【探】→【攻】→【归】；**标准完备流**（复杂重构、规则研发）走标准闭环，收尾给出量化审计卡片。

---

## 四、规则变动必须走六步循环

规则的增/改/废一律走 `rules/workflow/change_flow.md` 六步：

1. **接收意图**：口语需求 → 能执行的需求文案（先明确改什么、改完怎么验收）；
2. **查重拦截**：比对 `docs/requirements.md` 与既有规则；同类诉求归并到原条目增量演进，不新建碎片；
3. **登记台账**：在 `docs/requirements.md` 登记需求编号与实施版本；无需求依据的规则一律不成立；
4. **编写规则**：只改一处权威源，其余文件放指针；改完必须读回校验；
5. **联动排查**：跑存量校准与冲突检测，确认无死链、旧称或与元规则矛盾的表述；
6. **提交推送**：提交信息基于真实改动生成并推送远程仓库；未推送不得声称闭环。

**双检命令（改动后必须跑）**：

```bash
node scripts/redundancy_scan.mjs --root .      # 冗余：同一内容写了两遍 → 合并为迭代版本
node scripts/conflict_scan.mjs --root .        # 冲突：同一事实两种说法 → 先出裁决方案再迭代
node scripts/legacy_align_scan.mjs --root .    # 存量：遇碰即对齐清单，须清零或书面说明
```

---

## 五、交付收尾与文末固定结构要求

> **输出格式唯一权威源**：[`rules/system/output_standard.md`](rules/system/output_standard.md)。本节只写"必须做"，**不复述格式细则**（徽标取值 / 总结字数 / 标题层级 / 缩进层数 / 回执字段 / 双档口径一律以该文件为准）。判定入口：`node scripts/output_audit.mjs --check`（结构）· `node scripts/language_audit.mjs --check`（用字）。

任务完成或输出汇报时必须满足：
1. **按输出结构契约成形**：一次合格回复 = 首行状态徽标 → 一句话总结 → 分层正文 → 进度回执 → 文末五联装，顺序固定、缺一不合格。
2. **文末五联装**（强制收尾）：定义见 [`rules/system/meta_rules.md`](rules/system/meta_rules.md) 第三十四条，必须是整条回复的**最后 5 项**，用加粗与状态图标；判定入口 `./scripts/audit_execution.sh`（第 8 维）。
3. **进度回执必须是实数**：完成度与判定证据从 `node scripts/progress_ledger.mjs report --json` 取，**手写对不上即判红**。
4. **极简高信噪比**：与任务无关的少说，没问到的不要说，剔除无关客套。
5. **全域所有 DSH 工程永久生效**：本机制对全域所有 DSH 工程文件夹永久生效，存量与新增一律受约束，杜绝项目特权与裸跑脱管。

---

## 六、当前工程结构速查

`rules/`（法典）·`knowledge/`（知识库）·`indexes/`（索引与路由）·`docs/`（需求台账）·`memory/`（记忆）·`templates/`（模板）·`scripts/`（工具）·`ai-control/`（管控实现）·`data/`（基准数据）·`assets/`（图形资产）——逐项说明见 `README.md` 与 `indexes/rules_index.md`。
