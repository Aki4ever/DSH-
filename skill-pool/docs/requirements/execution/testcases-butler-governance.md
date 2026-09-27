# PKG-003 管家管控优化包测试用例集

> 关联需求：REQ-BUTLER-RETRIEVAL-017、REQ-BUTLER-ONDEMAND-015、REQ-BUTLER-TOKENBUDGET-018、REQ-BUTLER-PROGRESS-016
> 关联执行包：[pkg-003-butler-governance.md](./pkg-003-butler-governance.md)
> 全部用例以 Exit Code == 0 / 阈值达标为通过。**状态为实施后实跑结果。**

## 1. REQ-BUTLER-RETRIEVAL-017 Google 式检索

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-RETRIEVAL-017-01** | 倒排索引生成且幂等 | `build_index.py` 连跑两次 | 第二次 `changed: false` | ✅ 通过（109 docs / 3289 terms；`--check` exit 0） |
| **TC-RETRIEVAL-017-02** | 检索命中率 | `search_skills.py --eval` | top-3 命中率 ≥ 90% | ✅ 通过（**10/10 = 100%**） |
| **TC-RETRIEVAL-017-03** | 片段回灌体积 | 检索输出的 `payload_bytes` | ≤ 3072 字节 | ✅ 通过（**1971 字节**） |
| **TC-RETRIEVAL-017-04** | 只回灌片段 | `self_check` 字段 | 无 `content`/`body`/`text`，片段 ≤120 字 | ✅ 通过（`self_check.pass = true`） |
| **TC-RETRIEVAL-017-05** | 分页 | `--top-k 3 --offset 0` 与 `--offset 3` | 两页 id 无交集 | ✅ 通过（page1/page2 无重叠） |
| **TC-RETRIEVAL-017-06** | 检索日志落盘 | `--log` 后读 jsonl 末行 | 合法 JSON，含 query/results/top_k/ts | ✅ 通过 |

## 2. REQ-BUTLER-ONDEMAND-015 按需调用

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-ONDEMAND-015-01** | 选技清单受 top-K 约束 | `select_skills.py --top-k 5` | `count ≤ 5` 且 `reads_skill_body == false` | ✅ 通过（count 5） |
| **TC-ONDEMAND-015-02** | 单契约加载拒绝通配 | `load_contract.py --name '*'` / `--name '../etc/passwd'` | 两者 Exit Code == 1 | ✅ 通过 |
| **TC-ONDEMAND-015-03** | 上下文预算断言 | `verify_payload.py --selected a,b --loaded a` | Exit Code == 0 | ✅ 通过 |
| **TC-ONDEMAND-015-04** | 越权加载可检出（反向） | `--selected a --loaded b` | Exit Code == 1，失败项 `loaded_subset_of_selected` | ✅ 通过 |
| **TC-ONDEMAND-015-05** | 端到端分派（补充） | `dispatch_on_demand.py --task ... --top-k 5` | 加载 ≤5 个、≤12 KB、成功 | ✅ 通过（loaded 5 个 / **7102 B** / 1976 tok） |

## 3. REQ-BUTLER-TOKENBUDGET-018 Token 下降

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-TOKENBUDGET-018-01** | 估算公式一致 | 四个脚本对同一样本求 `est_tokens` | 四者结果相同 | ✅ 通过（均为 17） |
| **TC-TOKENBUDGET-018-02** | 裁剪幂等 | `prune_context.py` 连跑两次 | 第二次 `saved_tokens == 0` | ✅ 通过 |
| **TC-TOKENBUDGET-018-03** | 受管区块不被裁剪 | 比对裁剪前后 `CATALOG:BEGIN~END` 哈希 | 逐字节相同 | ✅ 通过 |
| **TC-TOKENBUDGET-018-04** | 降幅达标 | `verify_reduction.py --target 0.40` | 降幅 ≥ 40%，Exit Code == 0 | ✅ 通过（**84.93%**） |
| **TC-TOKENBUDGET-018-05** | 能力不变（反向） | 构造缺失证据字符串的 cases | Exit Code == 1 且给出 `missing` | ✅ 通过 |
| **TC-TOKENBUDGET-018-06** | 端到端降幅 | 典型任务 before/after 对比 | 下降 ≥ 40% | ✅ 通过（**20,376 → 3,071 token，下降 84.9%**；10 条能力证据全存活） |

## 4. REQ-BUTLER-PROGRESS-016 里程碑化输出

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-PROGRESS-016-01** | 三档判定确定性 | `classify_tier.py --text <样本> --json` ×3 | 三次 tier 完全一致 | ✅ 通过（三次结果一致） |
| **TC-PROGRESS-016-02** | micro 原文不泄漏 | `fold_events.py` 的 `rendered` 比对 micro 输入 | 出现次数为 0 | ✅ 通过 |
| **TC-PROGRESS-016-03** | 里程碑覆盖 100% | `verify_progress.py --file <样例>` | Exit Code == 0 | ✅ 通过 |
| **TC-PROGRESS-016-04** | 超预算可检出（反向） | `--max-milestones 1` | Exit Code == 1 | ✅ 通过 |
| **TC-PROGRESS-016-05** | 输出事件数下降 | before/after 事件数 | after < before | ✅ 通过 |
| **TC-PROGRESS-016-06** | 「惠州→北京」场景 | 12 条含上车/下车的样例 | 只保留「到达长沙/武汉/北京」+ `×N` 计数 | ✅ 通过（**「上车/下车」已归属 micro 并折叠为计数**） |

## 5. 终局回归

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-FINAL3-001** | 编目达 109 | `sync_catalog.py` 后读 `total_skills` | 109（L1 27 / L2 53 / L3 28 / L4 1） | ✅ 通过 |
| **TC-FINAL3-002** | 全量合规 | `audit_compliance.py` | 100% 合规 | ✅ 通过（104/104，failed 0） |
| **TC-FINAL3-003** | 口径一致 | `./bin/skill-pool consistency` | Exit Code == 0 | ✅ 通过 |
| **TC-FINAL3-004** | 粒度门禁 | 全池 `atomic-fission-guard` 逐个体检 | 全部 Exit Code == 0 | ✅ 通过（104/104） |
| **TC-FINAL3-005** | CLI 最小自检 | `--version && status && validate && consistency` | 四条 Exit Code 全 0 | ✅ 通过 |

## 6. 实施过程中对需求的修正记录

| 编号 | 原描述 | 实际实现 | 原因 |
| :--- | :--- | :--- | :--- |
| AMEND-5 | 检索 payload ≤ 1.5 KB | 放宽为 **≤ 3 KB**，并改为紧凑 JSON + `terms` 上限 24、`matched_terms` 上限 6 | 5 条结果各带 120 字中文片段时，1.5 KB 在物理上装不下；强行达标只能靠截断片段，反而损害可用性 |
| AMEND-6 | 未规定技能触发词来源 | 必须为每个新技能在 `sync_catalog.py` 补 `triggers` | 新技能默认 `triggers=[id]` 会让 BM25 的 `triggers` 字段权重退化为噪声，Q07 命中率实测从 90% 掉到 80%；补触发词后回到 100% |
| AMEND-7 | 未区分索引与上下文 | `skill-index.json`（545 KB ≈ 14 万 token）明确**不进模型上下文** | 它是脚本侧机器产物；把它计入上下文预算会得出错误结论，故 §23.2 增加口径澄清行 |
| AMEND-8 | 微操作词表未列举标杆样例 | `上车` / `下车` 必须判为 micro | 用户原话以「上车/下车」为例；首轮实现把二者判为 action，已按实测反馈补入词表 |
