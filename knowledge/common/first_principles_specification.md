# 第一性原理与实证方法论（通用条款卡）

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.29.9`
> - **对应实施版本**：`v4.29.9`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../../rules/workflow/versioning_standard.md)
> - **规范层级**：`【知识库总纲 · 通用公共规范】`
> - **需求依据**：`REQ-097`（承接 `REQ-057` / `CR-012`，归并演进不另立）
> - **生效状态**：`[Release 稳定生效]`

本条目的作用只有一个：**把“凡事从最底层事实推起”这条原理，放进知识库**，让它从“一份规则文件”变成
“全域工程都要遵守的公共基线”。条款细则不在本文，本文只写“全域怎么用”。

---

## 📌 一、分层与边界（谁写细则，谁写用法）

| 层次 | 文件 | 写什么 |
| :--- | :--- | :--- |
| 元规则 | [`rules/system/meta_rules.md`](../../rules/system/meta_rules.md) 第二十六条 | 原理本身（第一性原理与物理实证律） |
| 规则细则 | [`rules/coding/first_principles_verification.md`](../../rules/coding/first_principles_verification.md) | 三不采信、实证五步法、L1/L2/L3 证据定级 |
| **知识库（本文）** | `knowledge/common/first_principles_specification.md` | **全域统一用法与判定口径**；细则一律指向上表，不复述 |

> 为什么必须进知识库：知识库（`knowledge/`）是工程全域规范的**最高法定基线**（元规则第三十五条）。
> 一条原理若只写在 `rules/` 与需求台账里，跨工程时就没有共同的裁决依据；进了知识库，它才具备
> “业务需求与它冲突时以它为准”的效力。

---

## 🧭 二、全域统一用法（三条硬口径）

1. **结论必须能指到证据档位**：给出结论时标明证据等级——`L1` 物理实证 / `L2` 严密推论 / `L3` 外部转述；
   `L3` 一律不得当作依据，必须先做一次最小实测把它降成 `L1` 或 `L2`。
   （档位定义以规则细则第三节为准，本文不重复列表。）
2. **“没测到”不等于“没问题”**：度量缺失、采集没跑、凭据读不到，一律按未达标处理并显式说明；
   严禁把“没测到”记成“通过”。判定脚本取不到证据时退出码为 `2`，`2` 永远不算通过。
3. **假设必须显式分离**：把“别人说的”和“机器报的”分开写；未经实测的先验假设要单列出来，
   并说明用什么最小探针去撞它。

---

## 🔗 三、与其它机制的接口（可跑判定入口）

| 关系 | 载体 | 判定入口 |
| :--- | :--- | :--- |
| 需求必须有出处、版本必须递增 | `docs/requirements.md` · `scripts/req_new.mjs` | `node scripts/req_new.mjs --check` |
| 规则里写了“引用”就必须真有这个文件（反空架子） | 全域受管文档 | `node scripts/anti_hallucination_audit.mjs --check` |
| 需求版本四处对拍（文案 ↔ 台账 ↔ 载体 ↔ 回执） | `ai-control/requirements/req_versions.json` | `node scripts/req_version_audit.mjs --check` |
| 结论要讲人话、停在策略层 | `rules/system/output_standard.md` | `REQ-097 / R2` 判定器（待落地） |

---

## 🗂️ 四、索引与寻址

- 通用规范矩阵：[`knowledge/common/README.md`](README.md)；
- 规则与知识库分层表：[`indexes/rules_index.md`](../../indexes/rules_index.md) 第四节；
- **来源层说明**：本条目是对工程内既有法条的**归位**（从 `rules/` 提到知识库），不引入新的外部来源，
  因此不新增 `knowledge/sources/` 来源卡。

---

## ✅ 五、验收（可跑命令）

- `grep -rn "第一性原理" knowledge/` 至少 1 处命中（本条目在位）；
- `node scripts/req_new.mjs --check` 退出码 0（需求条目与版本贯通）；
- `node scripts/anti_hallucination_audit.mjs --check` 退出码 0（本文所有引用可达）。
