# 需求文案：跨项目区间并发与递归触达（PROJ-CONC）

> ### 🏷️ **版本信息与实施追踪**
> - **文档类型**：需求文案（登记为 `REQ-101`，状态 `[ACTIVE]`）
> - **当前系统实施总版本**：`v4.29.17`（本条登记后由 `req_new.mjs --add` 自动 PATCH 递增）
> - **本文档内容版本**：`v1.0.0`
> - **需求版本号**：`v1.0.0`
> - **提出时间**：2026-10-09
> - **任务代号**：`PROJ-CONC`
> - **需求状态**：`[ACTIVE]` 五项子项，物理载体与判定入口见 §三、§四
> - **依据**：用户口语需求（本轮一条）+ 本轮只读取证（逐条见 §五）

---

## 一、原始需求（用户口语原文）

> 新增规则,不同工作项目区间可以同时有多个任务并发执行,目的是让整体运行效率更高;
> 如果这个规则无法触及到物理层就自动递归分裂到能触达到物理实现层;
>
> 理解以上需求并简化成更利于你执行的需求文案;

> 📌 **口径**：用户要的是**两条**——① 一条能真跑的并发规则；② 一条"够不到物理层就自动往下拆"的分裂铁律。
> 第 ② 条不是修辞，它是**判定器**：判据 11 判红即"未触达"，该叶子不得登记为完成，必须继续分裂。

---

## 二、简化后的可执行需求文案（本文件核心，可直接照做）

1. **并发的闸门是"区间"，不是"全局忙"**：判定两个任务能否同时跑，只问**两者的写域有没有交集**——
   交集为空 → 同时跑；交集非空 → 排队串行。**严禁**再出现"只要有任务在跑就拒绝/等待"的判定。
2. **区间 = 项目专属写域的唯一可移植标识**：`<工程名>/<受管路径或资源键>`（如 `DSH股票/scripts/quote.mjs`、
   `全局规则/ai-control/config/`）。标识由**一份登记表**唯一定义，禁止各处各写一套。
3. **有界并发**：并发上限写进同一份配置（默认 4，沿用 `butler_scheduler.mjs` 已固化口径），不许无界。
4. **排队必须可见**：入队要有队列台账 + 进度 + 超时，不许"静默等待、无进度"。
5. **递归触达铁律**：本条任一执行层若过不了物理触达判据（1~8 条沿用既有，**新增第 11 条"区间并发可证"**），
   就继续向下分裂到"一行配置 / 一条命令 / 一个判定器"，**不得登记为完成**。

---

## 三、物理载体清单（递归分裂到执行层）

> **落盘状态口径**：下表"在盘"= 校订时逐条 `ls` 实测存在；"本轮落盘"= 本条要求新建、校订时**已落盘**（此前为
> 未落盘态，未落盘前 §四 对应判定必红——这正是判据 1「载体在磁盘真实存在且非空」要拦的）。

| 执行层形态 | 物理落点 | 判定入口 |
| :--- | :--- | :--- |
| 区间登记表（唯一权威源） | `ai-control/config/concurrency_zones.json`（**本轮落盘** · 2321 B · 8 区间 · 上界 4 · `requirement: REQ-101 / PROJ-CONC`） | 被判定器实读；空表或区间路径不存在即判红 |
| 并发仲裁器 + 判定器 | `scripts/zone_concurrency.mjs`（**本轮落盘** · 36307 B） | `node scripts/zone_concurrency.mjs --check` |
| 原子锁原语（复用，不重写） | `scripts/lib/atomic_lock.sh`（**在盘**；锁根推导见 `:26-37`） | 锁目录对拍（`--print-dir`） |
| 有界派单器（复用） | `scripts/butler_scheduler.mjs`（**在盘**） | `node scripts/butler_scheduler.mjs --check` |
| 派单前五项断言（复用） | `skills/verify-no-lock-violation` · `skills/detect-lock-conflict` · `skills/declare-lock-set`（**均在盘**） | 同左 |
| 接口契约 | `scripts/interfaces/zone_concurrency.interface.json`（**本轮落盘** · 3482 B） | `node scripts/check_layer_interfaces.mjs --check` |
| 索引与路由 | `indexes/capabilities_index.json` · `indexes/capabilities_index.md` · `indexes/shortcuts_index.md`（**均在盘**） | `node scripts/build_capabilities_index.mjs --check` |
| 累积门禁接线 | `scripts/control_gates.sh` G6 **新增第 6 条**（**在盘**；实测 `check_concurrency()` 判定器条目已由 5 条增至 6 条，第 6 条为 `zone_concurrency.mjs|区间并发可证(跨区间并发/同区间串行)`，见 `:666`） | `./scripts/control_gates.sh check` |
| 台账与版本 | `docs/requirements.md` 对应条目 · `ai-control/requirements/req_versions.json`（**均在盘**） | `node scripts/req_version_audit.mjs --check --req REQ-101` |

---

## 四、验收标准（每一条都可复跑，期望退出码 0）

- [ ] `node scripts/zone_concurrency.mjs --check` 退出码 0，且证据文件同时给出：
      **跨区间正向**「运行时间重叠 > 0 且锁观测重叠 = 0」；**同区间反例**「运行时间重叠 = 0 且锁观测重叠 = 0」；
- [ ] `node scripts/zone_concurrency.mjs --self-test` 退出码 0（含反向用例：无界并发、空区间表、占比判定被拆掉必须判红）；
- [ ] `node scripts/zone_concurrency.mjs --plan <tasks.jsonl> --json` 输出批次（wave）且同区间任务不落在同一波；
- [ ] `node scripts/butler_scheduler.mjs --check` 退出码 0（并发调度仍有牙）；
- [ ] `./scripts/control_gates.sh check` G6 判据由 5 条增至 6 条且全绿；
- [ ] `node scripts/req_version_audit.mjs --check --req REQ-101` 退出码 0；
- [ ] 双检三扫全过：`redundancy_scan` / `conflict_scan` / `legacy_align_scan` / `flow_control` / `output_audit` / `language_audit`；
- [ ] 外部成因同步清零：`node scripts/market_guard_patch.mjs --check` 退出码 0，且重装路径挂上 `--heal` 自愈（重装后不再被静默覆盖，自愈动作留痕 `ai-control/reports/state/market_guard_heal.jsonl`）。

---

## 五、本轮只读取证的事实（可复跑，非推测）

| 编号 | 事实 | 复跑证据 |
| :--- | :--- | :--- |
| P1 | **守卫会被插件重装静默覆盖（可复发，非当前失效）**：本轮实测曾回落到「未生效」（EXIT=1，忙碌守卫 4 处 · `agentsBusy` 残留 4）；本轮已重打并新增自愈入口 `--heal`（幂等，可挂重装路径），复跑为**已生效**（EXIT=0，忙碌守卫块 4 个 · 补丁标记 4/4 · `agentsBusy` 残留 0）→ 真实属性是**重装即被静默抹掉、须靠自愈补回** | `node scripts/market_guard_patch.mjs --check` → **EXIT=0**（「✅ 已生效」）；目标 `~/.dsh/profiles/desktop/node_modules/dshmarket/lib/routes.js` mtime `2026-10-09 19:03:43`（本轮内重打），故"重装后不再被覆盖"仍**未证** |
| P2 | **调度器有牙但没接生产**：`butler_scheduler.mjs` 全仓**无任何生产调用方**（无脚本 `import`/`source`/`--run` 调用） | `grep -rn butler_scheduler .` 逐类核对全部命中：自身实现与用法头注、接口声明 `scripts/interfaces/butler_scheduler.interface.json`、门禁字符串 `scripts/control_gates.sh:662`、索引 `indexes/capabilities_index.{json,md}` · `indexes/shortcuts_index.md:46` · `indexes/fingerprint_index.json`、文档与台账 `docs/*`、指纹与进度留痕 `memory/asset_fingerprint_ledger.md` · `ai-control/reports/state/progress_ledger.jsonl`——**无一为生产调用方** |
| P3 | 锁根**按仓库独立**（`<仓库>/.dsh_locks`，由 `atomic_lock_root()` 从脚本位置上溯两级推导），跨工程天然不打架；真正的粒度问题是**同仓内的锁键**与"全局忙"判定 | 本机 DSH 根下 7 个目录逐目录实测：仅 `全局规则/.dsh_locks` 存在（本仓真跑过锁），另 6 个目录（含 1 个退役资产暂存目录）尚无；载体 `scripts/lib/atomic_lock.sh:26-37` |
| P4 | 既有并发铁律停在"只读共享、写操作排他"，**没有"按区间键控"的口径**，也没有"区间并发可证"判据 | `rules/system/meta_rules.md:90` 第二十一条原文逐字核对：仅「读写共享/写排他 + 冲突避让排队 + 超时熔断」三句，无区间粒度 |
| P5 | `atomic_lock_acquire` **抢不到锁即失败返回，不静默等待到超时** | `scripts/lib/atomic_lock.sh:23` 头注「退出码：`atomic_lock_acquire` / `atomic_lock_run` 抢不到锁 → 非 0（**不静默等待到超时**）」 |

---

## 六、查重拦截结果（不新建碎片）

| 子项 | 同源既有条目 | 处置 |
| :--- | :--- | :--- |
| 区间并发闸门 | `REQ-039`（全局调度锁与并发资源防冲突）· 元规则第二十一条 | **增量演进**：补"按区间键控"粒度，不另立锁体系 |
| 有界并发派单 | `REQ-093` / R3（管家并发调度）· `scripts/butler_scheduler.mjs` | **增量演进**：补生产调用方与区间口径，判定器沿用 |
| 物理触达判据 | `REQ-086` / `REQ-093`（十条判据） | **增量演进**：新增第 11 条"区间并发可证"，判据 1~8 不复述 |
| 无载体机制清零 | `REQ-086` · `REQ-093` / R5 | **增量演进**：本轮新载体一律同时补接口契约与索引收录 |

**结论**：本条不是新体系——锁原语、调度器、门禁 G6、元规则第二十一条**全都已存在**；
缺的是"**区间**这个并发粒度 + 调度器的生产调用方 + 判据 11 的判定器"。

---

## 七、递归分裂停止条件（物理触达判据）

判据 1~6 见 [`constraint_mechanism_optimize_6.md`](constraint_mechanism_optimize_6.md) §2.3，
判据 7~8 见 [`constraint_mechanism_optimize_9.md`](constraint_mechanism_optimize_9.md) §2.3，
判据 9~10 见 [`constraint_mechanism_optimize_10.md`](constraint_mechanism_optimize_10.md) §2.3（**均不复述**，避免实质冗余）。
本条**新增第 11 条**，十一条全满足才算触达，否则继续分裂：

| 序号 | 判据 | 探针类型 | 反例（判未触达） |
| :--: | :--- | :--- | :--- |
| 11 | **区间并发可证**：必须有一条命令，实跑两个不同区间的任务并取证「时间重叠 > 0 且锁重叠 = 0」；同时有同区间反例证明「时间重叠 = 0（被串行）且锁重叠 = 0」 | `exitcode` + `file`（时间戳证据） | 规则只写在文档里；调度器存在但无生产者调用方；并发上限只写在注释里；只报"测得并发"而无同区间串行对照 |

> **递归分裂铁律**：本条任一叶子若判据 11 判红，则该叶子**不得登记为完成**，必须继续向下分裂出更细的执行层。

---

## 八、与相邻层的分工

| 层 | 管什么 | 唯一权威载体 |
| :--- | :--- | :--- |
| 物理原子锁 | 抢没抢到（互斥、TTL 自愈） | `scripts/lib/atomic_lock.{sh,mjs}` |
| 全局调度锁 | 写操作排他排队 | `scripts/global_scheduler_lock.sh` |
| 流程流转层 | 现在该走哪一步、走了没有 | `scripts/flow_router.mjs` |
| **本条：区间并发层** | **两个任务能不能同时跑（按写域交集裁决）** | `scripts/zone_concurrency.mjs` + `ai-control/config/concurrency_zones.json` |
