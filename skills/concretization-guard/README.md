# concretization-guard

L3 复合流程门禁：含糊其辞必须具像化（`REQ-BUTLER-CONCRETIZE-024`）。

## 用途

把「规约 → 具像化建议 → 断言」串成一道**不可跳步**的交付放行门禁，挂载于管家「④ 输出规约」集群。
凡交付正文进入输出规约阶段，都必须过这道门禁。本技能无自有脚本，串联调用下游三层。

| 环节 | 承接技能 | 放行条件 |
| :--- | :--- | :--- |
| ① 规约 | `concretize-ambiguity-policy` | 四类判据（范围 / 指代 / 时序 / hedge）已应用 |
| ② 建议 | `concretize-term` | Exit 0，且**没有任何 `weak: true` 的建议** |
| ③ 断言 | `verify-concretized-output` | Exit 0：`hits` 为空、无 `synonym_swap`；`--strict` 追加 `quantity_basis` pass |

两条硬约束：

- **`weak: true` 的建议一律不合格**：建议去掉该词后仍含同类别含糊词，等于用同义词糊过去，必须重写建议；
- **同义替换零容忍**：断言报出 `synonym_swap` 即阻断，不接受「语义相近」辩解。

## 与 quantification-guard 的分工

| 门禁 | 管什么 | 补什么 | 唯一真相源 |
| :--- | :--- | :--- | :--- |
| `quantification-guard` | 程度词（高 / 大 / 快 / 多 / 好 / 严重 / 频繁…） | 补**数值**（场景 + 数值或区间 + 单位 + 依据） | `quantifier-table.json`（由 `build-quantifier-table` 维护） |
| `concretization-guard` | 含糊词（若干 / 相关 / 尽快 / 适当…） | 补**实体与判据**（确切数量 + 计数依据、实体清单、触发条件 + 时限） | `AMBIGUITY_WORDS`（由 `detect-vague-modifier` 维护） |

一句话：**程度词给数，含糊词给物与条件**。两道门禁互不代签，同一段正文可同时命中，需分别过。

## 使用方式

```bash
# ① 规约：读 concretize-ambiguity-policy 的四类判据（纯规约，无 CLI）

# ② 建议：拿到逐条具像化模板，检查 weak:true 的建议一律不合格
python3 skills/concretize-term/scripts/concretize.py --file <交付稿> --json

# ③ 断言：三项 checks 全过才放行（严格模式额外要求数量带依据）
python3 skills/verify-concretized-output/scripts/verify_concretized.py \
  --file <改写后的交付稿> --strict --json
```

门禁串联口径：②③ 任一环退出码非 0，即视为本次交付未过门禁，补齐后整条流水线重跑。

## 输出字段

门禁证据串固定为四段，任一段缺失或为空即证据不成立、不得放行：

| 段 | 来源 | 含义 |
| :--- | :--- | :--- |
| `suggestions` | `concretize-term` | 逐条建议 `term / category / line / snippet / suggestion / example / weak` |
| `counts` | `concretize-term` | 四类命中数 `range` / `reference` / `timing` / `hedge` |
| `violations` | `verify-concretized-output` | 违规明细 `kind`（`unconcretized` / `no_basis` / `synonym_swap`）/ `term` / `line` / `detail` |
| `checks` | `verify-concretized-output` | 三项断言 `name` / `pass` / `detail` |

## 退出码

本技能自身不含脚本，退出码语义由下游两层承载：

| 码 | 含义 |
| :--- | :--- |
| 0 | 门禁通过：无 `weak` 建议，断言三项全过 |
| 1 | 门禁阻断：存在 `weak: true` 建议，或断言报出 `unconcretized` / `no_basis` / `synonym_swap` |
| 2 | 依赖未就绪（`detect-vague-modifier` 缺失）或输入缺失 |

## 上下游

- 上游：`concretize-ambiguity-policy`（L1 判据）、`detect-vague-modifier`（词表唯一真相源）。
- 下游：管家「④ 输出规约」集群的交付放行裁决；与 `quantification-guard` 并列构成修饰词门禁对。
- 相关：`concretize-term`、`verify-concretized-output`（本门禁的两级执行面）。
