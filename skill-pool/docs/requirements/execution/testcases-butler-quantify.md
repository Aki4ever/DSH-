# PKG-005 表达量化包测试用例集

> 关联需求：REQ-BUTLER-QUANTIFY-023、REQ-BUTLER-CONCRETIZE-024、REQ-BUTLER-ONESHOT-025
> 关联执行包：[pkg-005-butler-quantify.md](./pkg-005-butler-quantify.md)
> 全部用例以 Exit Code == 0 / 阈值达标为通过。

## 1. REQ-BUTLER-QUANTIFY-023 程度词量化

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-QUANTIFY-023-01** | 映射表四要素齐全 | `build_quantifier_table.py --check` | 每条含 term/domain/quantified/unit/basis，含 `basis` 缺失即 exit 1 | ✅ 通过（**52 条**，缺 `basis` 条目 **0**） |
| **TC-QUANTIFY-023-02** | 建表幂等 | 连跑两次 | 第二次 `changed:false` | ✅ 通过（第二次 `changed:false`；`--check` exit 0） |
| **TC-QUANTIFY-023-03** | 真实未量化样本可检出 | `verify_quantified.py --file`（「本次交付完成了一次大量重构」） | exit 1 并列出词与行号 | ✅ 通过（未量化项 `大` @ 第 1 行，exit 1） |
| **TC-QUANTIFY-023-04** | 有映射场景可量化 | `quantify.py --text "接口响应要快" --domain 接口响应` | 命中并给出数值 + 依据 | ✅ 通过（`快` → `P95<=200 ms`） |
| **TC-QUANTIFY-023-05** | 场景优先 | 同词不同 `--domain` | 量化结果不同 | ✅ 通过（「很大文件」在**日志** → `>=100 MB`，在**代码库** → `>=1 MB`） |
| **TC-QUANTIFY-023-06** | 无映射不沉默 | `quantify.py --text "这个方案很好"` | 落 `unquantifiable` 并给声明假设提示 | ✅ 通过（`好` → `unquantifiable`，附 suggestion） |
| **TC-QUANTIFY-023-07** | 同义替换被拦（反向） | 文本含「很快」「尽快」 | 断言 2 命中，exit 1 | ✅ 通过（`no_unquantified_degree` 与 `no_degree_word_replacement` 均 False，exit 1） |
| **TC-QUANTIFY-023-08** | 词表收敛 | `plan-fission` / `fission_engine` 引用唯一真相源 | 两份旧表被移除，行为与夹具回归一致 | ✅ 通过（两处字面量已删；均加载 `detect-vague-modifier` 的 `hedge` 类 **13 词**且两者一致；夹具 `sop-unbound` exit 1 / `sop-bound` exit 0；全池粒度 **132/132** 零退化） |

## 2. REQ-BUTLER-CONCRETIZE-024 含糊词具像化

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-CONCRETIZE-024-01** | 范围含糊被检出 | 含「若干」的样本 | 命中 `range` 类 | ✅ 通过（`若干` → `range`，建议「补确切数量 + 计数依据」） |
| **TC-CONCRETIZE-024-02** | 指代含糊被检出 | 含「相关」的样本 | 命中 `reference` 类 | ✅ 通过（`相关` → `reference`，建议「枚举具体实体清单」） |
| **TC-CONCRETIZE-024-03** | 时序含糊被检出 | 含「尽快」的样本 | 命中 `timing` 类 | ✅ 通过（`尽快` → `timing`，建议「触发条件 + 时限」） |
| **TC-CONCRETIZE-024-04** | 具像化建议可核对 | `concretize.py` 输出 | 数量带依据 / 实体可枚举 / 时序带时限 | ✅ 通过（四类建议均指向可核对形式；`hedge` 类明确「该词不得原样保留」） |
| **TC-CONCRETIZE-024-05** | 同义替换判不合格（反向） | 「请尽快处理，尽早反馈结果。」 | exit 1 | ✅ 通过（exit 1；命中 `unconcretized(尽快)`——「尽早」仍是含糊词，未具像化，处置结果正确） |
| **TC-CONCRETIZE-024-06** | 未具像化断言 | `verify_concretized_output.py` | 违规样本 exit 1，合规样本 exit 0 | ✅ 通过（违规样本命中 `相关/reference`、`尽快/timing`、`若干/range` → exit 1；合规样本 0 命中 → exit 0） |
| **TC-CONCRETIZE-024-07** | 依赖缺失不兜底（补充） | 临时移走 `detect-vague-modifier` 后跑 `concretize.py` | exit 2 且明确拒绝内置兜底词表 | ✅ 通过（exit 2，stderr：「本脚本不内置兜底词表」；依赖已还原 12688 B） |

## 3. REQ-BUTLER-ONESHOT-025 一次性解决

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-ONESHOT-025-01** | 可逆决策自行决断 | `classify_decision.py --item "阈值取 0.85 还是 0.9"` | `decide_now` | ✅ 通过（`decide_now`，默认值「取偏保守一侧」） |
| **TC-ONESHOT-025-02** | 命名/路径类自行决断 | `--item "命名风格"` / `--item "输出放哪个目录"` | `decide_now` | ✅ 通过（两项均 `decide_now`） |
| **TC-ONESHOT-025-03** | 红线不可逆才提问 | `--item "删除旧日志目录" --redline R1` | `ask_once` | ✅ 通过 |
| **TC-ONESHOT-025-04** | 推送类判提问 | `--item "推送到远端" --redline R2` | `ask_once` | ✅ 通过 |
| **TC-ONESHOT-025-05** | 假设留痕要素齐全 | `record_assumptions.py --from-decisions <上一步>` | 输出含 项/取值/依据/回滚方式；缺 basis 即 exit 1 | ✅ 通过（Markdown 表格四列齐全） |
| **TC-ONESHOT-025-06** | 默认零提问 | `verify_no_question.py --questions <空>` | exit 0 | ✅ 通过 |
| **TC-ONESHOT-025-07** | 未授权提问被拦 | 1 条合法提问但不带 `--allow-ask` | exit 1 | ✅ 通过 |
| **TC-ONESHOT-025-08** | 挤牙膏式追问被拦 | 2 条提问 或 单条 `batch=false` | exit 1（`too_many` / `not_batched`） | ✅ 通过（2 条 → `too_many`） |
| **TC-ONESHOT-025-09** | 无红线提问被拦 | 1 条无 `redline` 的提问 + `--allow-ask` | exit 1（`no_redline`） | ✅ 通过 |

## 4. 终局回归

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-FINAL5-001** | 编目达 141 | `sync_catalog.py` 后读 `total_skills` | 141（L1 34 / L2 71 / L3 35 / L4 1） | ✅ 通过（**141**：L1 34 / L2 71 / L3 35 / L4 1） |
| **TC-FINAL5-002** | 全量合规 | `audit_compliance.py` | 100% 合规 | ✅ 通过（136/136，failed 0） |
| **TC-FINAL5-003** | 口径一致 | `./bin/skill-pool consistency` | Exit Code == 0 | ✅ 通过（exit 0） |
| **TC-FINAL5-004** | 树六项一致 | `verify_tree.py` | Exit Code == 0 | ✅ 通过（C1~C7 全 pass） |
| **TC-FINAL5-005** | 检索未退化 | `search_skills.py --eval` | top-3 命中率 ≥ 90% | ✅ 通过（10/10 = 100%） |
| **TC-FINAL5-006** | 粒度门禁 | 全池 `atomic-fission-guard` | 全部 Exit Code == 0 | ✅ 通过（136/136） |
| **TC-FINAL5-007** | 夹具回归 | `plan-fission` 对两份夹具 | `sop-unbound` exit 1、`sop-bound` exit 0 | ✅ 通过（`sop-unbound` exit 1 / `sop-bound` exit 0，收敛后零退化） |

## 5. 实施过程中对需求的修正记录

| 编号 | 原描述 | 实际实现 | 原因 |
| :--- | :--- | :--- | :--- |
| AMEND-13 | 需求 1、2 分列两条 | 共用同一检测器 `detect-vague-modifier`（唯一真相源），差别只在替换动作 | 硬拆两套会产生第三份词表，而现有两份副本本就不一致（12 项 vs 10 项） |
| AMEND-14 | 「含糊词」未分类 | 明确四类：`hedge`（遗留缓解词）/ `range` / `reference` / `timing` | 原两份旧词表（适当/尽量/酌情…）既非程度词也非明确的范围词，必须归入 `hedge` 才能收敛且不丢覆盖 |
| AMEND-15 | 缺失量化如何处置未定义 | **不阻断交付**，输出 `unquantifiable` 并强制声明假设 | 阻断会惩罚「公开基准确实不存在」的合法场景 |
| AMEND-16 | 提问上限未定义 | 每任务 ≤ 1 次，且必须同时满足「红线 + 不可逆 + 已批量合并」 | 与 `fastlane-redline-policy` 复用同一红线定义，避免第二份红线清单 |

## 6. 交付后追加修复与核验（子智能体回报触发的两项）

| 编号 | 触发 | 处置 | 复核证据 |
| :--- | :--- | :--- | :--- |
| FIX-01 | `verify-concretized-output` 的同义替换判定拿不到词表依据——`detect_vague.py` 的 `timing` 只有 `尽快/必要时/适时/及时`，而验收样本用的是「尽早」，子智能体只能临时加一条「换字变体」运行期启发式 | 把 `尽早`、`早日` 补进唯一真相源的 `timing` 词表，**判定第一依据回到词表**，启发式降为兜底 | `timing` 现为 6 词；`classify_word('尽早') = timing`；替换样本 `hits` 同时含 `尽快`/`尽早`（均 timing），`violations` 含 `synonym_swap(尽快→尽早)`，exit 1 |
| FIX-02 | 核实子智能体自述的越权 `chmod 644 skills/*/SKILL.md skills/*/README.md` | 逐项核验**未留下痕迹**，无需回滚 | 137 个 `SKILL.md` 与 137 个 `README.md` 全为 `0o600`；`skills/` 下仅 3 个 tracked 文件且均为 `100644`；`bin/skill-pool` 仍为 `100755` |
| FIX-03 | 核验过程中发现的**既有缺陷**（非本次引入）：`audit-all-skills-compliance/scripts/audit_compliance.py` 权限为 `0o600`，缺可执行位 | 补 `chmod 711`，与其余脚本一致 | `scripts/*.py` 权限分布现为 `{'0o711': 77}`，无例外 |

> 词表规模随之从 27 词增至 **29 词**（`hedge` 13 / `range` 5 / `reference` 5 / `timing` 6），`ALL_WORDS` 45；`hedge` 类未变，故 T16 收敛结论与全池粒度门禁不受影响（复跑 136/136）。
>
> 上述三项修复后**七门禁已全部复跑通过**：validate / consistency / audit / verify_tree / 检索 / 粒度 136/136 / 夹具回归全部 exit 0，编目 141、执行层树 141。
