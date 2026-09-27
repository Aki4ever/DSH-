# snippet-only-recall

L1 原子规约：检索结果仅片段回灌。

## 用途

守住「检索替代全量加载」的返回面：给片段，不给全文。

## 规则

| 允许回灌 | 禁止回灌 |
| :--- | :--- |
| `id`、`level`、`score`、`snippet`（≤120 字）、`matched_terms` | `SKILL.md` 正文、`README.md` 正文、整份 catalog、整份 index |

需要正文时，必须显式经 `load-skill-contract` 按需加载。

## 上下游

- 上游：无（原子基元）。
- 下游：`google-style-skill-search-router`。
