# 需求文案：全流程中文·备份有界·纪律扣分落地（REQ-099）

> ### 🏷️ **版本信息与实施追踪**
> - **文档类型**：需求文案（登记为 `REQ-099`，状态 `[ACTIVE]`）
> - **当前系统实施总版本**：`v4.29.7`（本条落地后由登记入口自动递增）
> - **本文档内容版本**：`v1.0.0`
> - **需求版本号**：`v1.0.0`
> - **提出时间**：2026-10-03
> - **任务代号**：`ZH-CLEAN-DISC-1`
> - **需求状态**：`[ACTIVE]` 三条子项，物理载体与判定入口见 §三
> - **依据**：用户口语需求（本轮三条）+ 截图取证 + 本轮只读取证（逐条见 §二）

---

## 一、原始需求（用户口语原文）

> 以下是我对管控规则的优化需求，如果需求颗粒度过大导执行层（包括 skill、agent、plugin、插件、cli、mcp 等）
> 导致没触达物理实现层，就递归分裂成更细更落地的执行层去完成这额个需求；
> 1、所有任务进程都应该用中文回答；
> 2、如图，这里这么多 cordis.patch.yml 的不同版本是怎么回事？帮我处理好；
> 3、输出的结构化怎么缺失了？纪律委员怎么不扣分？
> 理解以上需求并简化成更利于你执行的需求文案；

> 📌 **原文勘误（只做字面归一，不改语义）**：“导执行层” = **到执行层**；“这额个需求” = **这个需求**。
> 📌 **口径**：第 2 条是“解释清楚 + 处理干净”两件事都要做；第 3 条是“查出为什么缺、并让委员真的扣分”两件事都要做。

---

## 二、整理后的可执行需求（附本轮取证）

### 2.1 三条需求 · 简化文案与落地口径

| 子项 | 用户原话（要点） | **简化后的可执行文案** | 判定入口 |
| :--- | :--- | :--- | :--- |
| **R1** 全流程中文 | 所有任务进程都应该用中文回答 | **不只是最终汇报用中文——中途的每一句叙述、每一步进度说明，也必须用中文写；英文只允许出现在代码、命令、路径、标识符里。** | `node scripts/chinese_output_audit.mjs` |
| **R2** 备份有界 | 这么多不同版本是怎么回事？帮我处理好 | **每个被改写的配置，改动前留最新 3 份备份、更旧的自动清掉；存量一次性清理到同一口径，并且这条策略写进写入器本身，不靠人记得手动删。** | `node scripts/backup_gc.mjs --check` |
| **R3** 纪律扣分落地 | 输出的结构化怎么缺失了？纪律委员怎么不扣分？ | **两件事：① 输出结构化缺失要被判出来并计入评分；② 纪律委员复核发现的违规必须真的从账上扣分，而不是只写在报告里。** | `node scripts/discipline_score.mjs verify --json` |

### 2.2 本轮只读取证的事实（均可复跑）

| 编号 | 事实 | 复跑证据 |
| :--- | :--- | :--- |
| P1 | 中文技能齐备但**零调用方**：三项硬断言写好了，全库没有一处引用它 | `grep -rln verify_chinese` 仅命中其自身 |
| P2 | 我自己的中途叙述写成英文，全库无人拦（用户第 1 条正是指这个） | 判定器实跑命中 `the / final / numbers` 等非白名单拉丁词 |
| P3 | 写入器各自造时间戳备份、**无任何保留策略**，实测堆积 16 份 | `ls /Users/linqiyu/.dsh/profiles/desktop \| grep -c '\.bak'` = 16 |
| P4 | 委员算了漏报维度却**从不落账**：账本一分不记，所以分数永远不掉 | 旧实现只在比较时使用 `missed`，不写 `deduct` 记录 |

### 2.3 三条共同遵守的铁律

1. **有技能不等于有判定**：判定器必须被真实调用并进入某个评分维度，否则等于没有（P1 即为此病）；
2. **永久账本只记真违规**：进行中状态（未提交、回合未完结）不得入账，否则用不可回滚的账本惩罚未完成的工作；
3. **够不到物理层就往下拆**：每条都落到可跑载体，载体清单见 §三。

---

## 三、递归分裂到执行层（物理载体清单）

| 子项 | 执行层形态 | 物理落点 | 判定入口 |
| :--- | :--- | :--- | :--- |
| R1 | CLI 判定器（复用既有技能） | `scripts/chinese_output_audit.mjs` | `--selftest` 5 条用例 |
| R1 | 评分维度接线 | `scripts/audit_execution.sh` 第 9 维（与生僻字同维，不新开） | `./scripts/audit_execution.sh --json` 的 `chinesePass` |
| R2 | 保留策略（Shell 与 Node 双实现，口径唯一） | `scripts/lib/backup_retention.sh` · `scripts/lib/backup_retention.mjs` | 两处写入器实测 |
| R2 | 留存口径：**同一文件的全部后缀共用 3 份预算**（不为每种后缀各留 3 份，避免"每加一种来源就多一摞备份"） | 口径写在巡检器头注与 `--help`；Python 写入器委托同一实现 | `node scripts/backup_gc.mjs --check` |
| R2 | 清理与巡检 CLI | `scripts/backup_gc.mjs` | `--check` / `--apply` / `--selftest` |
| R2 | 写入器接线（4 处） | `scripts/install_host_gate.sh` · `scripts/plugin_sync.sh` · `scripts/market_guard_patch.mjs` · `scripts/restore_skill_pool.mjs` | 各脚本实跑后目录份数不增 |
| R3 | 委员落账 | `scripts/discipline_score.mjs` 的 `bookOfficerFindings` | `verify --json` 的 `bookedMissed` |
| R3 | 不计罚白名单（进行中维度） | 同上 `OFFICER_SKIP_DIMS` | `--selftest` 反例⑨ |
| R1~R3 | 接口契约与索引 | `scripts/interfaces/*.interface.json` · `indexes/capabilities_index.*` | `node scripts/check_layer_interfaces.mjs --check` |
| R1~R3 | 台账与版本 | `docs/requirements.md`（REQ-099）· `ai-control/requirements/req_versions.json` | `node scripts/req_version_audit.mjs --check --req REQ-099` |

---

## 四、查重拦截结果

| 子项 | 同源既有条目 | 处置 |
| :--- | :--- | :--- |
| R1 | `REQ-002` / `REQ-008`（全文档中文化与通俗表达）· 技能 `chinese-end-to-end` / `verify-chinese-output` | **增量演进**：既有只有技能与规约，本轮补“被真实调用的判定器 + 评分维度接线”，不另立语言标准 |
| R2 | `REQ-093`（安装队列有界）· 既有 `market_guard_patch.mjs` 自带的同后缀清理 | **增量演进**：把“有界”这条原则从安装队列扩到备份文件，并抽出唯一保留策略，避免四份重复实现 |
| R3 | `REQ-098`（纪律分系统 R4 自评与独立复核） | **增量演进**：R4 只做到“委员判了”，本轮补“判了要落账”，并划清不得入账的进行中维度 |

---

## 五、验收标准（可复跑）

- [ ] `node scripts/chinese_output_audit.mjs --selftest` 退出码 0（5 条用例，含 3 条反例）；
- [ ] `./scripts/audit_execution.sh --json` 输出含 `chinesePass` 字段，且第 9 维与生僻字同维计分；
- [ ] `node scripts/backup_gc.mjs --selftest` 退出码 0（含“不动活文件/不动无关文件/保留最新 N”反例）；
- [ ] `node scripts/backup_gc.mjs --check --dir /Users/linqiyu/.dsh/profiles/desktop` 在清理后退出码 0；
- [ ] 四处写入器实跑后，目标目录备份份数不超过保留上限；
- [ ] `node scripts/discipline_score.mjs --selftest` 退出码 0（16 条用例，含落账与幂等与“进行中不计罚”）；
- [ ] `node scripts/discipline_score.mjs verify --json` 输出 `bookedMissed`，且账本出现对应 `deduct` 记录；
- [ ] `bash scripts/control_gates.sh check` G0~G7 全过；`node scripts/req_version_audit.mjs --check --req REQ-099` 退出码 0。

---

## 六、诚实缺口

- **R2 的清理是破坏性动作**：留存上限按“最新 3 份”，更旧的删除不可恢复；执行前必须先 `--dry-run` 打印清单并由用户过目；
- **R1 的阈值边界**：中文占比硬门是 0.85，而技术文档里命令与标识符密集，短句极易贴近阈值——本轮实测同一句话 0.8452 与 0.885 之差仅在句长，故业务上鼓励写完整句子，而不是放宽阈值；
- **R3 的不计罚白名单是判断，不是事实**：四维（开工门禁/存量校准/待办常显/输出结构）被列为“进行中”，理由是它们要么由硬门禁实时阻断、要么在回合未完结时必然取不到证据；若用户认为某一维该扣，改 `OFFICER_SKIP_DIMS` 即生效。
