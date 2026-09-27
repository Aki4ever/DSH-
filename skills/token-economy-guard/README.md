# token-economy-guard

L3 复合流程：token 经济门禁（挂载于管家「② 契约与合规」集群）。

## 用途

把「先测 → 裁剪 → 等价能力断言」串成一道写入前置门禁：
`token-budget-policy`（裁决裁剪顺序）→ `measure-token-budget`（before 基线）→
`prune-redundant-context`（保守语义无损裁剪）→ `verify-token-reduction`（降幅 + 等价能力双断言）。
「同等能力」的唯一判据是 `cases.json` 的 `requires` 证据串在 after 文本中全部存活；
不得为降 token 删除事实、需求编号、`CATALOG:BEGIN/END` 受管区块与验收证据。

## 使用方式

```bash
python3 skills/measure-token-budget/scripts/measure_tokens.py --paths <src...> --json
python3 skills/prune-redundant-context/scripts/prune_context.py --in <src> --out <dst> --json
python3 skills/verify-token-reduction/scripts/verify_reduction.py --before <src> --after <dst> --target 0.40 --cases <cases.json> --json
```

## 输出字段

门禁最终输出为 `verify-token-reduction` 的 JSON，关键字段：

| 字段 | 含义 |
| :--- | :--- |
| `success` | 门禁是否放行 |
| `before_tokens` / `after_tokens` | 裁剪前后估算 token |
| `saved_ratio` | 实际降幅 |
| `target` | 目标降幅（默认 0.40） |
| `capability.cases_total` / `cases_passed` | 证据 case 总数与全存活数 |
| `capability.missing[]` | 缺失证据明细 `{case, needle}`，非空即阻断 |
| `checks[]` | 逐条断言 `{name, ok, detail}` |

## 退出码表

| 退出码 | 含义 |
| :--- | :--- |
| 0 | 降幅达标且证据串全部存活，门禁放行 |
| 1 | 降幅不足、能力缺失、输入不可读，或受管区块被改动 |
| 2 | 参数/文件缺失（缺参、路径不存在、`cases.json` 结构非法） |

## 上下游

- 上游：`token-budget-policy`、`measure-token-budget`、`prune-redundant-context`、`verify-token-reduction`（本技能即四者组装）。
- 下游：`atomic-fission-guard`（粒度门禁）、`catalog-consistency-guard`（口径一致性门禁）、`dsh-butler`「② 契约与合规」集群调度。
