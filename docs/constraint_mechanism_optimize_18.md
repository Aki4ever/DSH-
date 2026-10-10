# 需求文案：管控流程降耗与物理触达闭环（EFF-NOFLOW）

> ### 🏷️ **版本信息与实施追踪**
> - **文档类型**：需求文案（登记为 `REQ-102`，状态 `[ACTIVE]`）
> - **当前系统实施总版本**：`v4.29.16`（本条登记后由 `req_new.mjs --add` 自动 PATCH 递增）
> - **本文档内容版本**：`v1.0.0`
> - **需求版本号**：`v1.0.0`
> - **提出时间**：2026-10-10
> - **任务代号**：`EFF-NOFLOW`（Efficiency：降耗 · NoFlowChange：执行流程一步不改）
> - **需求状态**：`[ACTIVE]` 三项子项，物理载体与判定入口见 §三、§四
> - **依据**：用户口语需求（本轮一条）+ 本轮只读取证（逐条见 §五，全部可复跑）

---

## 一、原始需求（用户口语原文）

> 在不影响执行流程的情况下,优化执行效率;如果这个没法触及到物理实现层,就自动递归分裂到可以触达物理实现层为止;
>
> 理解以上需求并简化成更利于你执行的需求文案;

> 📌 **口径**：用户要的是**两条**——① 一条"降耗但不动流程"的效率规则；② 一条"够不到物理层就往下拆"的分裂铁律。
> 第 ② 条不是修辞，它是**判定器**：判据 12 判红即"未触达"，该叶子不得登记为完成，必须继续分裂。

---

## 二、简化后的可执行需求文案（本文件核心，可直接照做）

### 2.0 一句话

**受控流程的"步数、顺序、闸门、凭据"一步不减；只砍"重复劳动"。**

### 2.1 "不影响执行流程"的可判定定义（禁止各自解释）

"流程"指下面四件事，它们**一个都不许改**（改了就是违规，不是优化）：

| 维度 | 不许动的部分 | 唯一权威载体 |
| :--- | :--- | :--- |
| 门禁阶梯 | G0→G7 的顺序、累积语义、判据条目数 | `scripts/control_gates.sh` · `ai-control/config/gates.conf` |
| 物理锁阶梯 | 不跨阶、逐阶带凭据推进 | `scripts/lib/physical_lock.mjs` · `scripts/physical_lock.sh` |
| 待办常显 | 无任务列表即拒改动型调用（S07） | `scripts/todo_gate.sh` · `scripts/lib/todo_tracker.mjs` |
| 判定强度 | 通过条件、反例清单、留痕要求 | 各判定器本体 |

### 2.2 三条降耗规则（可机械判定）

| # | 规则 | 允许的做法 | 禁止的做法（判红） | 物理载体 | 判定命令 |
| :-- | :--- | :--- | :--- | :--- | :--- |
| **R1** | **同一份内容不重复读** | 同一次运行内按"文件路径 + 大小 + mtime"缓存事实；跨进程缓存必须带失效键 | 把"已判定过的事实"再全量解一遍（重复劳动） | `scripts/lib/session_transcript.mjs`（`maxFrames` 首帧读取）· `scripts/scope_audit.mjs`（归属记忆化） | `node scripts/scope_audit.mjs --selftest` 退出码 0 |
| **R2** | **耗时可见且受预算管** | 逐项与整跑计时落盘；超预算即判红 | 凭感觉说"好像变慢了"；把预算改大来变绿（须在同一次提交写明理由） | `scripts/control_profiler.sh` · `ai-control/config/perf_budget.conf` | `bash scripts/control_profiler.sh --check` 退出码 0 |
| **R3** | **降耗不得削弱判定强度** | 改"怎么读"，不改"怎么判"；改动前后判定结论必须一致 | 靠"少判一项/跳过反例/放过缺证据"来提速 | 各判定器的 `--selftest` 反例组 | `node scripts/scope_audit.mjs --check` + `--selftest` 双双退出码 0 |

### 2.3 递归触达铁律（第 ② 条需求的落地形态）

任一子项若过不了判据 12（§六），就继续向下分裂到"**一行配置 / 一条命令 / 一个判定器 / 一个反例**"，
**不得登记为完成**；分裂出来的每个叶子必须四件齐：**可跑入口 + 判定命令 + 反例用例 + 运行留痕**。

---

## 三、物理载体清单（递归分裂到执行层）

| 执行层形态 | 物理落点 | 判定入口 |
| :--- | :--- | :--- |
| 耗时取证器（**本条新建**） | `scripts/control_profiler.sh`（整跑 + 逐项计时，只读；产物 `ai-control/reports/state/perf_profile.json`） | `bash scripts/control_profiler.sh --check` |
| 耗时预算配置（**本条新建**） | `ai-control/config/perf_budget.conf`（`GATE_TOTAL_BUDGET_MS=45000` · `GATE_TOTAL_TARGET_MS=25000` · `ITEM_HOTSPOT_MS=10000`） | 被取证器实读；配置缺失即回落默认并在输出注明 |
| 转录按需解帧（**本条改造**） | `scripts/lib/session_transcript.mjs`（`decompressFrames(buf, {maxFrames})` · `readTranscriptEvents(..., {maxFrames, transcriptPath})`） | `node scripts/scope_audit.mjs --selftest` 退出码 0（含"只解首帧 frames 受限"用例） |
| 归属记忆化（**本条改造**） | `scripts/scope_audit.mjs`（`sessionOwner()` + 一次审计内 `ownerMemoGlobal`） | `node scripts/scope_audit.mjs --check`（判定结论与改造前逐工程一致） |
| 反例组（**本条补齐**） | `scripts/scope_audit.mjs` `selftest()` 第 ⑥ 组（转录证据判据此前**零用例**） | `node scripts/scope_audit.mjs --selftest`（14/14） |
| 门禁接线 | `scripts/control_gates.sh` G6 新增"耗时预算可证"判据 | `./scripts/control_gates.sh check` |
| 台账与版本 | `docs/requirements.md` 本条 · `ai-control/requirements/req_versions.json` | `node scripts/req_version_audit.mjs --check --req REQ-102` |

---

## 四、验收标准（每一条都可复跑，期望退出码 0）

- [ ] `bash scripts/control_profiler.sh --check` 退出码 0，且 `perf_profile.json` 给出整跑毫秒数与逐项耗时；
- [ ] `bash scripts/control_profiler.sh --selftest` 退出码 0（3/3：产物缺失 / 形状非法 → 判不可判定；合法产物 → 判通过**且证据文件 sha256 不变**）；
- [ ] `node scripts/scope_audit.mjs --selftest` 退出码 0（14/14，含新增第 ⑥ 组转录证据反例）；
- [ ] `node scripts/scope_audit.mjs --check` 退出码 0，且**判定结论与改造前一致**（同一批工程全托管）；
- [ ] **降耗可证**：同机 A/B 对照下，单个"无本地留痕工程"的转录证据判定耗时下降 ≥ 10 倍，
      且逐工程 `found` / `scanned` 与旧实现**逐个一致**（本轮实测 5 工程合计 15.0s → 0.11s，136x，见 §五 P6）；
- [ ] `./scripts/control_gates.sh check` 全门禁通过，且整跑耗时 ≤ 预算（本轮 32~36s → 16.2s，预算 45s，目标 25s）；
- [ ] **流程未动可证**：G0~G7 条目数、顺序、判据条目数在改动前后一致（`git diff` 只碰 2 个实现文件 + 3 个新文件）；
- [ ] 双检三扫全过：`redundancy_scan` / `conflict_scan` / `legacy_align_scan` / `flow_control` / `output_audit` / `language_audit`；
- [ ] `node scripts/req_version_audit.mjs --check --req REQ-102` 退出码 0（四处对拍一致）。

---

## 五、本轮只读取证的事实（可复跑，非推测）

| 编号 | 事实 | 复跑证据 |
| :--- | :--- | :--- |
| P1 | **受控整跑耗时 32~36s**：`control_gates.sh check` 本机实测 36.5s（首次）/ 29.0s / 32.2s（xtrace 计时），非"感觉慢" | `time ./scripts/control_gates.sh check` |
| P2 | **热点唯一且可定位**：整跑里 `scope_audit.mjs --check` 单项占 17.0s（52%），`zone_concurrency` 3.0s、`session_source_audit` 2.8s、`butler_scheduler` 1.2s | `bash -x scripts/control_gates.sh check` 逐行计时（见 §七 复跑脚本） |
| P3 | **转录语料规模**：`$DSH_HOME/sessions` 下 206 个转录文件、120.3 MB（多帧 zstd，单文件最多 662 帧） | `du -sh ~/.dsh/sessions` + 本轮取样脚本 |
| P4 | **旧实现是"每工程全量解一遍全库"**：`transcriptEvidence()` 对每个工程都遍历全部会话、全量解帧、再逐行 `JSON.parse`；**即使该工程的转录 `owner` 判不出来也照样全量解**（无任何短路） | `scripts/scope_audit.mjs` HEAD 版本 `:81-109`（`git show HEAD:scripts/scope_audit.mjs`） |
| P5 | **归属事实只在首帧**：会话头（含 `cwd`）位于第一帧；实测 1.18 MB / 662 帧的转录，首帧解压 0.9ms vs 全量 23.8ms（27.9x） | 本轮取样脚本（`decompressFrames` 对照） |
| P6 | **逐工程 A/B 降耗实数（同机、同 dshHome、同 5 个工程）**：旧径 2894~3117ms/工程，新径 6~73ms/工程；全域 5 工程合计 **15.0s → 0.11s（136x）**，且逐工程 `found` / `scanned` **逐个一致**（如 DSH股票：旧 `found=false, scanned=74` → 新 `found=false, scanned=74`） | `node /tmp/ev_old_new.mjs`（旧版逐字取自 `git show HEAD:`，新版为在盘实现） |
| P7 | **整跑降耗实数**：改造后 `./scripts/control_gates.sh check` 实测 **16.2s**（改造前 32~36s，同机同语料），全门禁仍 7/7 通过；关键证据是同一份 `perf_profile.json` 里 `scope_audit` 由 17.0s 降到 **0.28s** | `bash scripts/control_profiler.sh --measure` · `time ./scripts/control_gates.sh check` |
| P8 | **该判据此前零用例**：`scope_audit.selftest()` 十用例全部 `skipTranscript: true`，转录证据判据**从无用例**（判据 5 不满足） | HEAD 版本 `:211-256`；本轮补第 ⑥ 组 4 条（14/14） |

---

## 六、递归分裂停止条件（物理触达判据）

判据 1~6 见 [`constraint_mechanism_optimize_6.md`](constraint_mechanism_optimize_6.md) §2.3，
判据 7~8 见 [`constraint_mechanism_optimize_9.md`](constraint_mechanism_optimize_9.md) §2.3，
判据 9~10 见 [`constraint_mechanism_optimize_10.md`](constraint_mechanism_optimize_10.md) §2.3，
判据 11 见 [`constraint_mechanism_optimize_17.md`](constraint_mechanism_optimize_17.md) §七（**均不复述**，避免实质冗余）。
本条**新增第 12 条**，十二条全满足才算触达，否则继续分裂：

| 序号 | 新增判据 | 探针类型 | 反例（判未触达） |
| :--: | :--- | :--- | :--- |
| 12 | **降耗可证**：① 必须有一条命令产出"改造前 / 改造后"的**同机同语料**耗时实数；② 必须有 `--check` 形式的耗时预算判据（超预算即判红），预算阈值写在配置里而非代码里；③ 必须证明"判定结论未变"（判定器 `--selftest` 反例组全过，且改造前后结论逐工程一致）；④ 缓存类降耗必须写明失效键（路径+大小+mtime 之类），无失效键的缓存判红 | `exitcode` + `file`（耗时 JSON） | 只写"已优化"无实数；只有耗时数字没有预算判据；靠删判定项/跳反例/跳过缺证据提速；跨进程缓存无失效键；把预算改大来变绿 |

> **递归分裂铁律**：本条任一叶子若判据 12 判红，则该叶子**不得登记为完成**，必须继续向下分裂出更细的执行层。

---

## 七、查重拦截结果（不新建碎片）

| 子项 | 同源既有条目 | 处置 |
| :--- | :--- | :--- |
| 执行效率量化看板 | `REQ-028`（全景效率量化审计看板：6 项指标 + 收尾审计卡片） | **增量演进**：补"耗时实数 + 预算判据"，指标模型沿用，不另立看板 |
| 并发降耗 | `REQ-093` / `REQ-101`（管家并发调配 · 区间并发） | **边界互斥**：并发层管"能不能同时跑"；本条管"单条路径上的重复劳动"，不重叠 |
| 缓存与失效键 | `REQ-087` / R1（自证进度）· `scripts/lib/atomic_lock.sh`（TTL 自愈） | **增量演进**：沿用既有 TTL/失效键口径，不新建缓存体系 |
| 物理触达判据 | `REQ-086` · `REQ-093` · `REQ-101`（判据 1~11） | **增量演进**：新增第 12 条"降耗可证"，1~11 不复述 |
| 无载体机制清零 | `REQ-086` · `REQ-093` / R5 | **增量演进**：本条新载体一律同时补接口契约与索引收录 |

**结论**：本条不是新体系——门禁、物理锁、待办门禁、转录读取器**全都已存在**；
缺的是"**耗时基线 + 预算判据 + 该判据的反例组**"，以及转录读取路径上的一处真实重复劳动。

---

## 八、与相邻层的分工

| 层 | 管什么 | 唯一权威载体 |
| :--- | :--- | :--- |
| 区间并发层（REQ-101） | 两个任务能不能**同时**跑（按写域交集裁决） | `scripts/zone_concurrency.mjs` |
| 流程流转层（REQ-100） | 现在该走哪一步、走了没有 | `scripts/flow_router.mjs` |
| **本条：降耗层（EFF-NOFLOW）** | **同一条路径上的重复劳动有多少、耗时是否在预算内** | `scripts/control_profiler.sh` + `ai-control/config/perf_budget.conf` |

---

## 九、复跑脚本（人读取证，逐条对应 §五）

```bash
# P1 / P7：整跑计时
time ./scripts/control_gates.sh check

# P2：热点定位（xtrace 逐行计时，只读）
PS4='#${LINENO} ' bash -x scripts/control_gates.sh check >/dev/null 2>/tmp/gtrace.txt
grep -c 'scope_audit.mjs' /tmp/gtrace.txt   # 出现处即热点

# P3：语料规模
du -sh "${DSH_HOME:-$HOME/.dsh}/sessions"

# P4：旧实现读取路径（逐字核对 HEAD 版本）
git show HEAD:scripts/scope_audit.mjs | sed -n '81,109p'

# P6：A/B 对照（本轮脚本，含"结论一致"断言）
node /tmp/evidence_ab.mjs

# R2 验收：耗时预算判据
bash scripts/control_profiler.sh --check
```
