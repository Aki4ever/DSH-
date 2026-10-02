# 需求文案：全域覆盖与版本贯通（GCM-SCOPE）· 管控机制脱管清零 / 需求版本号贯通 / 反空架子判定

> ### 🏷️ **版本信息与实施追踪**
> - **文档类型**：需求文案（登记为 `REQ-092`，状态 `[EVOLVING]`）
> - **当前系统实施总版本**：`v4.29.7`（第一批 v4.28.0 已落地；第二批 v4.29.0 已落地）
> - **本文档内容版本**：`v1.0.0`
> - **需求版本号**：`v1.1.0`（v1.1.0 = 新增「全域写拦截」与「推送闭环」两条验收标准）
> - **提出时间**：2026-10-02
> - **任务代号**：`GCM-SCOPE`（Scope：全域覆盖面 · Version：版本贯通面 · Enforce：反空架子面）
> - **需求状态**：`[EVOLVING]` **已实施两批**（覆盖/版本/反空架子 → 拦截层通电/全域写拦截/推送闭环）
> - **依据**：用户 3 条口语需求 + 本轮只读取证（`mechanism_audit.mjs` · `install_host_gate.sh verify` ·
>   `align_version.mjs --check` · `normalize_all_projects.mjs --dry-run` · 16 个外部工程会话转录扫描）

---

## 一、原始需求（用户口语原文）

> 以下是我对管控规则的优化需求,如果需求颗粒度过大导执行层(包括 skill、agent、plugin、插件、cli、mcp等)
> 导致没触达物理实现层,就递归分裂成更细更落地的执行层去完成这额个需求;
> 1、必须新增和存量都要服从管控机制(我现在看到DSH下的其他工程文件夹并没有完全服从管控机制,修复这个问题,
> 你可以看看其他工程文件夹的任务hui hua);
> 2、输出结构新增一项:需求版本号;每次更新都必须同步到需求文档并同时实施,且产品和需求都必须记录版本;
> 3、所有的任务执行都必须要能落地能触发到物理实现层,拒绝空架子以及AI幻觉;
>
> 理解以上需求并简化成更利于你执行的需求文案;

> 📌 **原文勘误（只做字面归一，不改语义）**："导执行层" = **到执行层**；"这额个需求" = **这个需求**；
> "任务hui hua" = **任务会话**（本机 `~/.dsh/sessions/` 下按工程分目录的会话转录）。

---

## 二、整理后的可执行需求

### 2.1 一句话定义

**任何 DSH 工程都不许脱管，任何需求版本都不许悬空，任何机制都不许只在文档里活着。**

### 2.2 三条需求 → 三条可机械判定的子需求

| # | 用户原话 | 落成什么 | 物理载体 | 判定命令 | 判红的条件 |
| :-- | :--- | :--- | :--- | :--- | :--- |
| **R1** | 新增和存量都要服从管控机制 | 全域管控覆盖审计器 + 存量自动补课（薄壳，不复制第二份实现） | 新建 `scripts/scope_audit.mjs`；改造 `scripts/normalize_all_projects.mjs` | `node scripts/scope_audit.mjs --check` | 任一工程缺 4 件实体（物理锁 / 累积门禁 / 改名调用 / 待办门禁）即退出码 1 |
| **R2** | 输出结构新增需求版本号；每次更新同步需求文档并同时实施；产品与需求都记版本 | 需求版本贯通：输出位 + 双台账 + 机读台账 + 一致性判定器 | 改 `rules/system/output_standard.md`、`ai-control/config/gates.conf`、`scripts/progress_ledger.mjs`、`scripts/align_version.mjs`；新建 `ai-control/requirements/req_versions.json`、`scripts/req_version_audit.mjs` | `node scripts/req_version_audit.mjs --check` | 四处（需求文案 / 需求台账 / 实施载体 / 回复回执）版本对不上，即退出码 1 |
| **R3** | 所有任务执行必须能落地、能触发物理实现层，拒绝空架子与 AI 幻觉 | 在既有六条触达判据上补两条，并接入累积门禁 | 新建 `scripts/anti_hallucination_audit.mjs`；改 `scripts/mechanism_audit.mjs`、`scripts/control_gates.sh` | `node scripts/anti_hallucination_audit.mjs --check` | 文档指向的脚本在磁盘不存在（悬空引用），或机制在位却无运行凭据，即退出码 1 |

### 2.3 "触达物理实现层"的判据（递归分裂的停止条件）

前六条沿用 [`docs/constraint_mechanism_optimize_6.md`](constraint_mechanism_optimize_6.md) §2.3（**不复述**，避免实质冗余），
本条目**新增第七、第八条**，八条全满足才算触达，否则继续分裂：

| 序号 | 新增判据 | 探针类型 | 反例（判未触达） |
| :--: | :--- | :--- | :--- |
| 7 | **通电判定**：载体不只要在磁盘上，还要有"真跑过"的运行凭据 | `exitcode` + `file` | 脚本在位但从未产出任何运行留痕（如拦截层插件从未被加载） |
| 8 | **引用真实性判定**：文档里写到的脚本路径必须在磁盘真实存在 | `file` | `AGENTS.md` 让会话跑 `./scripts/physical_lock.sh`，而该工程内根本没有这个文件 |

### 2.4 递归分裂结果（粗颗粒 → 执行层叶子）

```text
GCM-SCOPE
├── R1 全域管控覆盖 (SCOPE-ALL)
│   ├── R1-a 覆盖审计器：遍历 DSH 根下各工程 × 逐项实跑（不是看文件在不在）
│   ├── R1-b 存量补课：为每个工程真实铺设可调用入口（薄壳指向全局规则，不复制核心逻辑）
│   ├── R1-c 新增即接管：新工程初始化模板强制含管控接入钩子 + v1.0.0 初始需求卡
│   ├── R1-d 门禁扩容：宿主硬门禁从"读本工程状态"升级为"读全域审计机读产物"
│   └── R1-e 假合规源清除：工程规范化脚本的合规判定改走覆盖审计，禁止再按文本发绿灯
├── R2 需求版本贯通 (VER-LINK)
│   ├── R2-a 输出位：需求版本号进首屏徽标与进度回执，作为硬判据入输出结构判定器
│   ├── R2-b 双记：需求台账条目新增"需求版本"字段与变更记录（主台账与管控台账同步）
│   ├── R2-c 机读台账：`ai-control/requirements/req_versions.json`（编号 → 需求版本 / 实施版本 / 承载文件 sha256）
│   ├── R2-d 一致性判定器：需求文案 ↔ 需求台账 ↔ 实施载体 ↔ 回复回执，四处对拍
│   └── R2-e 版本治理扩容：文档版本归位的受管范围从本工程扩到全部 DSH 工程
└── R3 反空架子 / 反幻觉 (NO-FAKE)
    ├── R3-a 通电判定（判据七）：载体在磁盘 + 真能跑 + 有运行凭据，三者齐才叫触达
    ├── R3-b 悬空引用判定（判据八）：文档里写的脚本路径必须在磁盘真实存在
    ├── R3-c 输出物可解析：拒绝把没有实体输出的步骤计为完成
    └── R3-d 接入累积门禁：不过就不许结项，缺失一律记未达标（不折算通过）
```

---

## 三、现状核查（先说事实，再说改什么）

### 3.1 已存在、可直接复用（不要再造一遍）

| 已有资产 | 复用在哪条 | 实测证据（本轮只读实跑） |
| :--- | :--- | :--- |
| `scripts/mechanism_audit.mjs` | R3-a / R3-d | 实跑列出 4 项硬性未触达、1 项无载体，已具备"载体在位与否"口径 |
| `scripts/align_version.mjs` | R2-e | `--check` 实跑：受管文档 99 个 · 需改动 0 个 |
| `scripts/progress_ledger.mjs` | R2-a / R2-c | `report` 实跑：台账 32 条记录 · 受管文件 379 个；已支持"写后必读回" |
| `scripts/output_audit.mjs` + `gates.conf` 的 `OUT_*` 段 | R2-a | 回执四字段已外置可配（`OUT_RECEIPT_FIELDS`），新增字段不改判定逻辑 |
| `scripts/normalize_all_projects.mjs` | R1-b / R1-e | 已在位，但目前只写文本、按文本发绿灯（见 3.2 的 G1） |

### 3.2 实测缺口（用户要修的就是这些）

| # | 缺口 | 现状证据（本轮实测，可复跑） |
| :-- | :--- | :--- |
| **G1** | **工程规范化脚本按"文本在不在"发绿灯** | `normalize_all_projects.mjs --dry-run` 判定 5 个工程全绿；而其写入物只有 `AGENTS.md` / `docs/requirements.md` / `.gitignore` 三份文本，不铺任何管控脚本 |
| **G2** | **外部工程从未真正跑过管控机制** | 扫描 16 个外部工程会话转录：`name_me` 0 次 · `control_gates` 0 次 · `physical_lock` 0 次 · `todo_gate` 0 次（本工程 64 会话中分别为 29 / 32 / 26 / 23 次） |
| **G3** | **外部工程 `AGENTS.md` 引用悬空** | 四个外部工程的 AGENTS.md 都要求"第一步调用全局改名工具"，但工程内无 `scripts/`；`查需求台账 docs/requirements.md 确认当前版本` 指向的路径在部分工程不存在 |
| **G4** | **拦截层从未通电** | `install_host_gate.sh verify` 实跑：`条目存在 ⛔ 缺失` · `宿主激活 ⛔ 无凭据`；即硬门禁物理上不存在，脱管工程写文件不会被拦 |
| **G5** | **"需求版本号"只有一句话，没有字段与判定** | 全库检索仅 `meta_rules.md` 第三十五条提到"需求变动必须同步递增需求版本号（SemVer）"；无输出位、无台账字段、无判定器 |
| **G6** | **版本治理不覆盖外部工程** | `align_version.mjs` 受管区间为 `rules/knowledge/indexes/docs/memory/templates`，实测外部四工程 109 份 Markdown 只有 11 份含版本声明 |

---

## 四、验收标准（逐条可跑）

- [ ] `node scripts/scope_audit.mjs --check` 退出码 0，且看板显示各工程覆盖项 x/y（R1）
- [ ] `node scripts/req_version_audit.mjs --check` 退出码 0，四处版本号逐字相等（R2）
- [ ] `node scripts/anti_hallucination_audit.mjs --check` 退出码 0，悬空引用清零（R3）
- [ ] 三条判定器各自带反向用例（改坏后必须判红，不允许恒绿）（R3-d）
- [ ] 三条判定器全部进入累积门禁，未过不得结项（R1-d / R3-d）
- [x] `bash scripts/install_host_gate.sh verify` 报出宿主激活凭据（`isHost=true`）（R1-d，v1.1.0）
- [x] `node scripts/domain_scope_selftest.mjs` 退出码 0：未接管工程拒写、其余零误伤（R1-d，v1.1.0）
- [ ] `bash scripts/push_external_projects.sh` 退出码 0：全部工程远程推送已闭环（v1.1.0，当前 1/4）

---

## 五、待裁决分歧（不裁决不开工的部分）

| # | 分歧 | 备选 |
| :-- | :--- | :--- |
| 1 | "需求版本号"口径 | 每条需求独立版本（本条采用）／ 复用系统总版本 |
| 2 | 脱管工程的执行方式 | 真实补课 + 全域硬拦截（本条采用）／ 只审计并显式标红 |
| 3 | 外部工程薄壳的落点 | 薄壳脚本放各工程 `scripts/` 下转发全局规则（本条采用）／ 只改 AGENTS.md 写绝对路径 |

---

## 六、实施记录

- **2026-10-02 [新建]**：接收 3 条口语需求，完成字面勘误、需求简化与递归分裂（R1~R3，共 14 个叶子）；
  完成现状核查（可复用 5 项 / 实测缺口 6 项）；登记 3 项待裁决分歧并给出本条采用口径。
  本轮**未改任何机制载体**，状态 `[EVOLVING]`。

---

> ### 📎 附：本轮取证命令清单（均可复跑，数字即上文引用）
>
> ```bash
> node scripts/mechanism_audit.mjs                      # 硬性未触达 4 项 · 无载体 1 项
> bash scripts/install_host_gate.sh verify              # 条目存在 ⛔ 缺失 · 宿主激活 ⛔ 无凭据
> node scripts/align_version.mjs --check                # 受管文档 99 个 · 需改动 0 个
> node scripts/normalize_all_projects.mjs --dry-run     # 5 个工程判"已完全合规"（只按文本判定）
> node scripts/progress_ledger.mjs report               # 台账 32 条记录 · 受管文件 379 个
> ```
