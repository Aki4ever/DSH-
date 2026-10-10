# 需求文案：管控机制三处收敛与递归触达（CTRL-CONVERGE）

> 立项依据：`docs/control_mechanism_audit_20261010.md`（13 项缺陷，4 项致命）
> 体例对齐：`docs/constraint_mechanism_optimize_18.md`
> 登记台账：`docs/requirements.md` 本条 · 版本 `v4.29.15 → v4.29.16`

---

## 一、原始需求（用户口语原文）

> "根据你的优化方案进行优化，如果这个没法触及到物理实现层，就自动递归分裂到可以触达物理实现层为止。"
> （前置一轮："看看当前的管控机制，看有什么可以机构行优化的方案"）

---

## 二、简化后的可执行需求文案（本文件核心，可直接照做）

### 2.0 一句话

**按审计报告把"判定层 / 展示层 / 证据层"三处脱钩修掉；每一项都必须落到"一行配置 / 一条命令 / 一个判定器 / 一个反例"，落不到就继续往下拆，拆不到不许登记完成。**

### 2.1 "物理实现层"的可判定定义（禁止各自解释）

一项工作算"触达物理实现层"，当且仅当它同时具备下面 **四件**；缺任一件即判**未触达**，必须继续递归分裂：

| # | 四件 | 可机械判定的形态 |
| :-- | :--- | :--- |
| ① | **可跑入口** | 磁盘上存在一个文件，且 `bash <file> --check` 或 `node <file> --check` 退出码为三态值（0/1/2） |
| ② | **判定命令** | 一条可复跑的命令行，写进本条 `docs/requirements.md` 的验收清单 |
| ③ | **反例用例** | 同一入口的 `--selftest`，至少一条"应当判红却曾被放过"的用例 |
| ④ | **运行留痕** | `node scripts/progress_ledger.mjs record` 落盘的 `sha256 + judgeExit + 回读断言` |

**反面（明确不算触达）**：只改文档措辞、只加注释、只写"应加强"、只建目录、只登记台账。

### 2.2 三处收敛（本轮主体，对应审计 §三 的 P0/P1/P2）

| # | 收敛项 | 治哪些缺陷 | 唯一权威载体（本项负责） |
| :-- | :--- | :--- | :--- |
| **C1** | **判定与展示分离** → 建门禁注册表，提示自动等于实际失败项，紧凑态无法硬编码 | D1 · D3 · D6 · D9 | `ai-control/config/gates_registry.mjs`（新建，唯一机读定义） |
| **C2** | **三态语义统一** → "取不到证据"一律不得退 0 | 审计 P0 第二项 | 各判定器 `--check` 出口 + 一台横扫判定器 |
| **C3** | **证据层防伪** → 判据不可注入、锁凭据可验、绕过必留痕 | D10 · D11 · D12 · D13 | `progress_ledger.mjs` · `physical_lock.mjs` · `plugin/index.mjs` |

### 2.3 递归触达铁律

```
任一登记项，先跑它的判定命令：
  ├─ 退出码 0 且四件齐 → 触达，登记完成
  └─ 否则 → 向下分裂，直到叶子满足"一行配置 / 一条命令 / 一个判定器 / 一个反例"
           分裂出来的叶子同样要四件齐，再回到上面重跑
分裂不下三层仍到不了物理层的，判"该诉求不成立"并写明理由（不得静默丢弃，也不得假装完成）
```

**停止条件（判据 12）**：`待建的「物理触达审计」判定器` 退出码 0 ——
即本条所有登记项在矩阵里**不存在 `undecidable` 行**。

### 2.4 不许动的东西（改了就判违规，不是优化）

| 维度 | 不许动 | 理由 |
| :--- | :--- | :--- |
| 门禁数量与顺序 | G0→G7 的累积语义 | 收敛的是"呈现与提示"，不是"判定强度" |
| 判定强度 | 通过条件、阈值、反例清单 | 允许改"怎么报"，禁止改"怎么判" |
| 停用约束 | `discipline_score.mjs` 仅 `--by user` 可解除 | 不得为本轮方便而放松 |

---

## 三、物理载体清单（递归分裂到执行层）

| 项 | 执行层形态 | 物理落点 | 判定入口 |
| :--- | :--- | :--- | :--- |
| C1-a | 门禁注册表（**新建**） | `ai-control/config/gates_registry.mjs`：`{id,name,judge,metricA,metricB,hintTemplate,inDenominator}` | `待建的「门禁注册表审计」判定器` |
| C1-b | 提示解耦（**改造**） | `scripts/control_gates.sh:633/:702` 的硬编码 HINT → 由注册表按实际失败项生成 | `bash -x scripts/control_gates.sh check \| grep HINT`（提示内必须含实际失败项名） |
| C1-c | 看板去硬编码（**改造**） | `ai-control/plugin/index.mjs:652` 字面量 `100% (4/4) 🟢` → 由注册表派生 | `待建的「看板口径审计」判定器` |
| C1-d | G0 入槽（**改造**） | `scripts/control_gates.sh:112` `GATE_IDS` 显式声明 G0 是否计入分母 | 同上 |
| C2-a | 三态统一（**改造**） | `scripts/session_source_audit.mjs:368`（`--fast` 时 `!probe.ran → 0` 改 2）· `scripts/todo_panel_audit.mjs:115`（离线夹具改判不可判定）· `scripts/anti_hallucination_audit.mjs:277`（mtime 新鲜度不得当内容证据） | `待建的「无证据退出码横扫」判定器` |
| C3-a | 判据防注入（**改造**） | `scripts/progress_ledger.mjs:266`：禁 shell 元字符与 `; true`/`\|\| true`/管道；改参数数组直调 | `node scripts/progress_ledger.mjs --selftest` |
| C3-b | 锁凭据签名（**改造**） | `scripts/lib/physical_lock.mjs:82-84,242`：`stage+proofs` 参与 HMAC，`sig` 缺失/不符即判不可判定 | `node scripts/lib/physical_lock.mjs --selftest` |
| C3-c | 绕过留痕（**改造**） | `ai-control/plugin/index.mjs:1192-1193,784`：绕过动作写 `bypass.jsonl`，看板显示"本次被绕过" | `待建的「绕过留痕审计」判定器` |
| C4 | 覆盖穿透（**改造**） | `scripts/scope_audit.mjs:182-198`：`docs` 判据增加 `DSH-CONTROL-SCOPE:BEGIN/END` 标记块校验 | `node scripts/scope_audit.mjs --selftest` |
| C5 | 可执行位（**修复**） | 6 个 `100644` 的 `.sh` → `755` + `git update-index --chmod=+x` | `待建的「可执行位审计」判定器` |
| C6 | 脚本登记表（**新建**） | `ai-control/config/script_registry.json`：`{path,role:judge\|tool\|test\|legacy,referencedBy}` | `待建的「脚本登记表审计」判定器` |
| C7 | 物理触达矩阵（**新建**） | `ai-control/reports/state/physical_reach_matrix.json` | `待建的「物理触达审计」判定器` |

---

## 四、验收标准（每一条都可复跑，期望退出码 0）

> 说明：下列条目里的判定入口脚本**多数属"本轮待建"**——它们此刻在磁盘上尚不存在，
> 故此段**不写成可执行命令形态**（`anti_hallucination_audit` 只把"反引号内的命令位路径"算引用，
> 写成命令位就等于宣称它已存在，会被判悬空引用）。
> 待各判定器落地后，其命令形态**回填到 `docs/requirements.md` 本条的验收清单**，再逐条打钩。

- [ ] **C1-a**：门禁注册表判定器退出码 0，且反例全过：注册表被篡改（删一项 / 改判据命令）→ 判红；提示模板与注册表不一致 → 判红；
- [ ] **C1-c 硬编码归零可证**：`ai-control/plugin/index.mjs` 中 `100% (4/4)` 与 `全部门禁通过` 字面量在改造后不再作为结论来源；看板判红时必须显示具体失败项；
- [ ] **C1-b 提示正确可证**：人工制造一项失败后，门禁输出的"未达标"提示里**必须包含实际失败判定器名**
      （本轮缺陷：提示指向 `control_profiler.sh`，真因是 `token_budget_audit.mjs`）；
- [ ] **C2**：无证据退出码横扫判定器退出码 0，且伪 `DSH_SESSION_ID` 下 `session_source_audit --check --fast`、`todo_panel_audit --check` 均退 2；
- [ ] **C3-a**：`node scripts/progress_ledger.mjs --selftest` 退出码 0，含"`; true` 判据被拒"反例；且磁盘上**已存在的 3 条历史绕过记录被判红**（不得因"历史遗留"放行）；
- [ ] **C3-b**：物理锁模块自检退出码 0，含"手改 `stage` 而无 `sig` → 不可判定"反例；
- [ ] **C3-c**：绕过留痕判定器退出码 0，含"设 `DSH_CONTROL_BYPASS=all` 后启动一次 → `bypass.jsonl` 多一条记录"反例；
- [ ] **C4**：`node scripts/scope_audit.mjs --selftest` 退出码 0，含"`AGENTS.md` 缺 SCOPE 标记块 → 判未接管"反例；
- [ ] **C5**：可执行位判定器退出码 0；`git ls-files -s scripts/*.sh` 无 `100644`；
- [ ] **C6**：脚本登记表判定器退出码 0；登记表覆盖 `scripts/` 下 100% 脚本；`role=judge` 者必须真被门禁或入口调用；
- [ ] **C7**：物理触达判定器退出码 0；触达矩阵无 `undecidable` 行；
- [ ] **流程未动可证**：`git diff` 只碰本轮点名文件；G0~G7 数量、顺序、判据条目数改动前后一致；
- [ ] `./scripts/control_gates.sh check` 全门禁通过，且整跑耗时 ≤ `GATE_TOTAL_BUDGET_MS`；
- [ ] 双检三扫全过：`redundancy_scan` / `conflict_scan` / `legacy_align_scan` / `flow_control` / `output_audit` / `language_audit`；
- [ ] 需求版本四处对拍一致（`req_version_audit` 对本条需求编号退出码 0）。

---

## 五、本轮只读取证的事实（可复跑，非推测）

| 编号 | 事实 | 复跑证据 |
| :--- | :--- | :--- |
| P1 | G6 判红真因是 `token_budget_audit.mjs`，而提示指向 `control_profiler.sh`/`task_layer_tree.mjs` | `bash -x scripts/control_gates.sh check 2>&1 \| grep 'detail='` |
| P2 | 紧凑看板 `100% (4/4) 🟢 全部门禁通过` 为字面量 | `sed -n '652p' ai-control/plugin/index.mjs` |
| P3 | G0 不进分母、无独立槽位 | `sed -n '112p' scripts/control_gates.sh` + `~/.dsh/.dsh-control/status.json` 的 `gateTotal:7` |
| P4 | 台账判据可注入，磁盘已有 3 条 `…; true` 记录 | 遍历 `ai-control/reports/state/progress_ledger.jsonl`（130 条） |
| P5 | 物理锁凭据字段无签名 | 读 `~/.dsh/.dsh-control/physical_locks/<sid>.json` 字段清单 |
| P6 | 逃生舱静默且零留痕，`status.json` 无绕过字段 | `ai-control/plugin/index.mjs:1192-1193` + 状态目录无 bypass 文件 |
| P7 | `find_node()` 4 份，3 份缺新版宿主 glob | `grep -c dsh-runtimes scripts/lib/find_node.sh scripts/control_gates.sh scripts/check_task_naming.sh` |
| P8 | `G4_TOP_DUP_LIMIT` seed=45 / conf=65，实测重复标题=47 | `sed -n '66p' scripts/control_gates.sh` + `gates.conf:89` + `status.json` |
| P9 | `gate_selftest.sh` 9 用例从未接线 | `grep -n gate_selftest scripts/control_gates.sh`（2 处均为注释） |
| P10 | 6 个 `.sh` 在 git 里是 `100644` | `git ls-files -s scripts/*.sh \| grep 100644` |

---

## 六、递归分裂停止条件（物理触达判据）

| 判据 | 含义 | 判定 |
| :--- | :--- | :--- |
| 判据 12 | 本条全部登记项在 `physical_reach_matrix.json` 中无 `undecidable` 行 | `待建的「物理触达审计」判定器` → 0 |
| 判据 13 | 每个叶子四件齐（入口 + 判定命令 + 反例 + 留痕） | 同上矩阵逐行 `hasEntry/hasJudge/hasSelftest/hasLedger` 全 true |

**分裂不下三层的处理**：在矩阵里记 `status:"not-applicable"` 并写明理由；
**禁止**记 `status:"done"` 而无四件。

---

## 七、查重拦截结果（不新建碎片）

| 相邻条目 | 关系 | 处置 |
| :--- | :--- | :--- |
| REQ-047 管控机制优化（拦截层复活 · 检测器能力） | 同源诉求（用户原话几乎一致） | **增量演进**：本轮治的是它当年未覆盖的"展示层脱钩 + 证据层防伪" |
| REQ-102 降耗与物理触达闭环 | 已解决"重复劳动"与"耗时预算" | 复用其 `control_profiler.sh` 与判据 12 体例，不另立体例 |
| REQ-092 全域同权 | 覆盖审计的接入段盲区 | C4 是对它的**判据补强**，不新增机制 |
| REQ-093 管控瘦身 | "压缩不得削减能力" | C1-c 是它的**执行层兜底**（此前只有原则、无判据） |

**结论：不新建体系，只加判据 + 修载体。**

---

## 八、与相邻层的分工

| 层 | 本轮负责 | 不负责 |
| :--- | :--- | :--- |
| 判定层（门禁） | 提示与实际失败项一致、三态语义统一 | 不改通过条件与阈值 |
| 展示层（插件看板） | 去硬编码、G0 入槽、绕过可见 | 不改压缩降耗策略本身 |
| 证据层（台账 / 锁 / 逃生舱） | 防注入、签名、留痕 | 不放宽 `--by user` 恢复约束 |
| 文档层 | 权威源归位（`AGENTS.md` 门禁表的唯一性） | 不重写规则正文 |

---

## 九、复跑脚本（人读取证，逐条对应 §五）

```bash
# P1 提示错位
bash -x scripts/control_gates.sh check 2>&1 | grep 'detail=' | tail -3

# P2 硬编码
sed -n '652p' ai-control/plugin/index.mjs

# P3 G0 不进分母
sed -n '112p' scripts/control_gates.sh
node -e 'const s=require(process.env.HOME+"/.dsh/.dsh-control/status.json");console.log(s.gateTotal,s.gateIndex)'

# P4 台账可注入（统计绕过式判据）
node -e 'const fs=require("fs");const r=fs.readFileSync("ai-control/reports/state/progress_ledger.jsonl","utf8").trim().split("\n").map(JSON.parse);const b=r.filter(x=>/;\s*true\s*$|\|\|\s*true/.test(String(x.judge||"")));console.log("总记录",r.length,"绕过式",b.length)'

# P5 锁凭据字段
node -e 'const fs=require("fs"),os=require("os");const d=fs.readdirSync(os.homedir()+"/.dsh/.dsh-control/physical_locks")[0];console.log(Object.keys(JSON.parse(fs.readFileSync(os.homedir()+"/.dsh/.dsh-control/physical_locks/"+d,"utf8"))))'

# P7 find_node 副本漂移
grep -c dsh-runtimes scripts/lib/find_node.sh scripts/control_gates.sh scripts/check_task_naming.sh

# P8 阈值漂移
grep -n '^G4_TOP_DUP_LIMIT=' scripts/control_gates.sh ai-control/config/gates.conf

# P9 回归锁空挂
grep -n gate_selftest scripts/control_gates.sh

# P10 可执行位
git ls-files -s scripts/*.sh | grep 100644
```
