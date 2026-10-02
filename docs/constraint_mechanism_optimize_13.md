# 需求文案：需求有出处·结论讲人话·原理进知识库·CLI 先规划（PLAIN-STRATEGY-1）

> ### 🏷️ **版本信息与实施追踪**
> - **文档类型**：需求文案（登记为 `REQ-097`，状态 `[ACTIVE]`）
> - **当前系统实施总版本**：`v4.29.7`（PATCH 递增：R2/R4 判定器与门禁接线，向下兼容）
> - **本文档内容版本**：`v1.1.0`（第二批落地：R2/R3 判定器 + R4 立项 CLI 规划）
> - **需求版本号**：`v1.1.0`（初版 v1.0.0 留痕；第二批落地递增）
> - **提出时间**：2026-10-02
> - **任务代号**：`PLAIN-STRATEGY-1`
> - **需求状态**：`[ACTIVE]` 四条子项全部落地并实跑（R1 登记入口 · R2 策略层判定 · R3 知识库索引判定 · R4 立项 CLI 规划）
> - **依据**：用户口语需求（本轮四条）+ 本轮的只读取证（逐条证据见 §五）

---

## 一、原始需求（用户口语原文）

> 以下是我对管控规则的优化需求，如果需求颗粒度过大、到执行层（包括 skill、agent、plugin、插件、cli、mcp 等）
> 导致没触达物理实现层，就递归分裂成更细更落地的执行层去完成这个需求；
> 1、所有需求必须都从需求文档发起，如果有新需求就先把需求整理好再同步到需求文档，需求文档每次更新都必须更新版本号；
> 2、输出的东西要聚焦算法层面的策略层，输出必须以人为本，以大白话的形式输出，简单明了无生僻字，拒绝输出人看不懂的机器语言；
> 3、推理过程必须遵循第一性原理；第一性原理纳入知识库中；
> 4、项目开启的时候要把 CLI 规划进去，以方便 AI 调用；
> 理解以上需求并简化成更利于你执行的需求文案；

> 📌 **原文勘误（只做字面归一，不改语义）**：“导执行层” = **到执行层**；“这额个需求” = **这个需求**；
> “输出的东西要聚焦算法层面的策略层” = 输出要停在**策略层**（说清“该怎么办”），不要停在**实现层**（甩日志、代码、报错原文）。
>
> 📌 **口径**：用户授权按磁盘实况自行判定与分级；本文只写“改什么、判据是什么、怎么复跑”。

---

## 二、整理后的可执行需求（大白话版）

### 2.1 一句话定义

**让规则“从需求来、说人话、讲原理、能调用”**——四条需求是同一件事的四个侧面：
需求先立条目才准动手（R1）；给用户的答复停在“该怎么办”并用大白话（R2）；
讲道理要从最底层事实推起、这条道理也存进知识库（R3）；新项目一开工就规划好给 AI 用的命令行入口（R4）。

### 2.2 四条需求 · 简化文案与落地口径

| 子项 | 用户原话（要点） | **简化后的可执行文案** | 改什么 | 判定入口 |
| :--- | :--- | :--- | :--- | :--- |
| **R1** 需求有出处 | 所有需求必须从需求文档发起；新需求先整理再同步；每次更新必升版本号 | **任何改动先立需求条目；新需求先写成可执行文案再登记进台账；台账改一次、总版本号就往上走一格，且这件事必须能被机器查出来（不许靠嘴说）。** | ① 新增登记入口 `scripts/req_new.mjs`（分配编号 → 查重 → 写卡片 → 升版本 → 读回）；② 台账头部必须写“这次为什么升版”；③ 判定器查“台账相对上次提交有改动时版本号必须变大” | `node scripts/req_new.mjs --check`<br>`node scripts/req_version_audit.mjs --check` |
| **R2** 结论讲人话 | 聚焦算法层面的策略层；以人为本、大白话、无生僻字；拒绝机器语言 | **给用户的答复要停在策略层：先说结论、再说该怎么办；日志、堆栈、代码、报错原文不得直接甩给用户；用大白话，不用让人看不懂的词。** | ① `output_standard.md` 增“策略层结论”条款；② 新增判定器 `scripts/strategy_layer_audit.mjs`（结论段在位 + 机器语言密度不超线）；③ 黑话表扩容口径 | `node scripts/strategy_layer_audit.mjs --check`（8 条反向用例；已并入 `audit_execution.sh` 输出契约维度） |
| **R3** 原理进知识库 | 推理必须遵循第一性原理；第一性原理纳入知识库 | **把“凡事从最底层事实推起、不轻信二手转述”这条原理，从 `rules/` 提炼一张要点卡进知识库，让全域工程都查得到；细则仍只写在 `rules/`，知识库只放要点与指针，不复述。** | ① 新增 `knowledge/common/first_principles_specification.md`；② 索引登记（`knowledge/common/README.md` 矩阵表 + `indexes/rules_index.md` 知识库表）；③ 判定：条目在位且双向可寻址 | `grep -rn "第一性原理" knowledge/`（粗判，本轮判据）<br>`node scripts/req_version_audit.mjs --check`（版本贯通） |
| **R4** CLI 先规划 | 项目开启的时候要把 CLI 规划进去，方便 AI 调用 | **新项目一开工就先写清“这台机器怎么被 AI 调用”，至少要有一条能跑的命令行入口与接口契约，别等做完了才发现 AI 用不上。** | ① `rules/system/initialization_protocol.md` 增“立项必出 CLI 规划”条款；② 初始化入口生成 CLI 规划清单；③ 判定：新工程至少一条可跑命令且接口契约在位 | `node scripts/check_layer_interfaces.mjs --check`（**已有**，覆盖 CLI 接口契约）<br>`node scripts/scope_audit.mjs --check`（全域工程入口在位） |

### 2.3 四条共同遵守的三条铁律

1. **先立条目再动手**：没有需求依据的改动一律不落盘（元规则第三十五条既有条文，本轮只补“入口”与“判据”）；
2. **写在规则里的“必须”，必须配一条能跑的命令**：无判定手段的“必须”不得写入（元规则第三十六条既有条文）；
3. **够不到物理层就往下拆**：一条需求若落不到可跑载体，就继续拆成 CLI / 技能 / 规则条款 / 知识库条目 / 判定器，直到每片都有落点与判据（本轮分裂表见 §四）。

---

## 三、查重拦截结果：与原条目的归并关系（不新建碎片）

| 子项 | 同源既有条目 | 处置 |
| :--- | :--- | :--- |
| R1 | `REQ-004`（规则变更双向同步与去重）· `REQ-092`（需求版本号贯通）· 元规则第三十五条 | **增量演进**：既有条文只讲“必须登记”，本轮补“可跑登记入口 + 版本必增判定”；在原条目追加演进记录指向 `REQ-097` |
| R2 | `REQ-002`（需求简化转执行工单）· `REQ-008`（全文档中文化与通俗表达）· `REQ-090`（输出结构与双档） | **增量演进**：既有条目只到“结构与用字”，本轮新增“策略层结论”这一层；在原条目追加演进记录指向 `REQ-097` |
| R3 | `REQ-057` / `CR-012`（第一性原理与物理实证律） | **增量演进**：既有载体只在 `rules/coding/` 与元规则，本轮补知识库侧条目；在原条目追加演进记录指向 `REQ-097` |
| R4 | `REQ-009`（会话自检与目录初始化）· 元规则第十八条（立项 DSH 赋能规划卡） | **增量演进**：立项卡早已含“CLI 命令行与终端基座”勾选项，但**没有强制判定**；本轮补判定口径 |

> 结论：四条诉求均**不新建规则碎片**，统一登记为父条目 `REQ-097`（四个子项 R1~R4），原条目只放指针与演进记录。

---

## 四、递归分裂到执行层（物理载体清单）

> 分裂规则：一条需求若只停在“文字”，就继续拆，直到每一片都落在**可跑的载体**上（CLI / 技能 / 规则条款 / 知识库条目 / 判定器 / 门禁）。

| 子项 | 子项再拆 | 执行层形态 | 物理落点 | 判定入口 | 本轮状态 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| R1 | R1-a 登记入口 | **CLI** | `scripts/req_new.mjs` | `node scripts/req_new.mjs --help` | ✅ 已落 |
| R1 | R1-b 接口契约 | 接口契约 | `scripts/interfaces/req_new.interface.json` | `node scripts/check_layer_interfaces.mjs --check` | ✅ 已落 |
| R1 | R1-c 版本必增判定 | **判定器**（同脚本 `--check` 模式） | `scripts/req_new.mjs --check` | 退出码 0/1 | ✅ 已落 |
| R1 | R1-d 台账登记 | 台账 | `docs/requirements.md` 之 `REQ-097` | `node scripts/req_version_audit.mjs --check` | ✅ 已落 |
| R2 | R2-a 条款 | 规则条款 | `rules/system/output_standard.md` §三.5 | — | ✅ 已落 |
| R2 | R2-b 判定器 | **判定器（CLI）** | `scripts/strategy_layer_audit.mjs` | `--check` / `--selftest`（8 条反向用例） | ✅ 已落 |
| R2 | R2-c 落地讲人话的写法 | **技能（skill）** | 复用 `skills/plain-analogy-explanation/`、`skills/concise-focused-output/`（技能层，非脚本） | `skill audit-all-skills-compliance` | ⏳ 待接线 |
| R3 | R3-a 知识库条目 | **知识库条款** | `knowledge/common/first_principles_specification.md` | `grep -rn "第一性原理" knowledge/` | ✅ 已落 |
| R3 | R3-b 索引登记 | 索引 | `knowledge/common/README.md` · `indexes/rules_index.md` | `node scripts/anti_hallucination_audit.mjs --check` | ✅ 已落 |
| R3 | R3-c 知识库索引判定 | **判定器** | `scripts/knowledge_audit.mjs`（条目 ↔ 索引双向对拍） | `--check` / `--selftest`（4 条反向用例） | ✅ 已落 |
| R4 | R4-a 条款 | 规则条款 | `rules/system/initialization_protocol.md` §五 | — | ✅ 已落 |
| R4 | R4-e 立项脚手架 | **脚本（CLI）** | `scripts/init_project.sh`（立项即生成 `CLI_PLAN.md`） | `bash scripts/init_project.sh <路径>` | ✅ 已落 |
| R4 | R4-f 规划判定器 | **判定器（CLI）** | `scripts/cli_plan_audit.mjs` | `--check` / `--project` / `--selftest`（5 条反向用例） | ✅ 已落 |
| R4 | R4-b 立项卡勾选项 | 模板 | `templates/project_dsh_bootstrap_template.md`（**已含 CLI 维度**） | — | ✅ 已有 |
| R4 | R4-c CLI 接口契约判定 | **判定器（已有）** | `scripts/check_layer_interfaces.mjs` | `--check` | ✅ 已有 |
| R4 | R4-d 全域工程入口不在位判定 | **判定器（已有）** | `scripts/scope_audit.mjs` | `--check` | ✅ 已有 |

**第二批已全部落地（2026-10-02）**：R2、R4 的条款与判定器上线，知识库索引判定器补上，
三条判定器各自带反向用例（该判红的必须判红），并接入门禁 **G5** 与 `audit_execution.sh`；门禁跑绿才放行。

---

## 五、验收标准（可跑命令 + 期望结果）

- [x] `node scripts/req_new.mjs --check` 退出码 0（台账无版本倒退、条目字段齐备）；
- [x] `node scripts/req_new.mjs --selftest` 退出码 0（反向用例：版本倒退、条目缺字段必须判红）；
- [x] `node scripts/req_version_audit.mjs --check` 退出码 0（文案 ↔ 台账 ↔ 载体 ↔ 回执四处对拍）；
- [x] `grep -rn "第一性原理" knowledge/` 至少 1 处命中（知识库条目在位）；
- [x] `node scripts/check_layer_interfaces.mjs --check` 覆盖 `cli.rules.req_new`（接口契约齐备）；
- [x] `node scripts/legacy_align_scan.mjs --root .` 待对齐 0 项（总版本升到 `v4.29.3` 后全库归位）；
- [x] `node scripts/strategy_layer_audit.mjs --check` 0 · `--selftest` 8/8（R2）；
- [x] `node scripts/knowledge_audit.mjs --check` 0（抓出并补登 1 张未索引规范卡）· `--selftest` 4/4（R3）；
- [x] `node scripts/cli_plan_audit.mjs --check` 0 · `--selftest` 5/5 · `init_project.sh` 端到端实测（新工程生成 `CLI_PLAN.md`，填好即判绿）（R4）；
- [x] `bash scripts/control_gates.sh check` G0~G6 全过（G5 已含知识库与 CLI 规划两条新判据）；
- [x] `node scripts/token_budget_audit.mjs --check` 篇幅未膨胀（新增段落压缩后回落容差内）。

---

## 六、本轮取证（只读，逐条可复跑）

| 事实 | 复跑方式 |
| :--- | :--- |
| 需求登记入口此前不存在（`scripts/` 下只有生成器与判定器，没有登记入口） | `ls scripts/ \| grep -i req` |
| 「策略层」「算法层」在全库 0 命中 | `grep -rn "策略层\|算法层" .` |
| `output_audit.mjs` 七个硬判据全是形状/字数，`language_audit.mjs` 唯一硬门是生僻字 | 读两个脚本的判据键与 `gatePass` 表达式 |
| 「机器语言」无任何判据 | `grep -rn "机器语言\|以人为本" .`（仅命中技能备注，均与“机器语言”无关） |
| 第一性原理只在 `rules/`，知识库 40 个文件里 0 命中 | `grep -rn "第一性原理" knowledge/` |
| 立项卡已含 CLI 勾选项，但无强制判定 | 读 `templates/project_dsh_bootstrap_template.md` 能力维度第 1 项 |

---

## 七、诚实缺口

1. **机器只能守形状，判不了语义**：R2 的两条硬判据是“结论先行 + 零机器原文”；
   至于“讲得够不够策略、够不够人话”，只列报告项——那属于人的判断，硬门即自造阈值。
2. **技能层接线未做**：R2-c 复用 `skills/plain-analogy-explanation/` 等既有技能，本轮只登记关系、未改技能契约。
3. **存量工程未铺 `CLI_PLAN.md`**：R4 的判定目前只跑本工程（G5 口径），其它 DSH 工程由下一轮存量补课统一铺设。
4. **`req_new.mjs` 的边界**：它只机械完成“分编号 / 查重 / 写卡片 / 升版本 / 读回”，
   需求文案的**内容质量**（是不是大白话、是不是真需求）不由它判断——那属于人的判断，机器只能守形状。
