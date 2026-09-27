# measure-token-budget

L2 工序技能：确定性 token 占用测算与来源分区汇总。

## 用途

用唯一标准公式把文件或文本折算为 token 数（汉字约 1 token/字，ASCII 约 4 字节 1 token），
并按 `skill_contract` / `readme` / `catalog` / `docs` / `other` 五个分区汇总，为裁剪与门禁提供可复算基线。
该数值是**确定性估算**，不是真实分词器结果。

## 使用方式

```bash
# 文件测算
python3 skills/measure-token-budget/scripts/measure_tokens.py --paths docs/operations/skill-catalog.json docs/operations/skills-catalog.md --json

# 文本测算
python3 skills/measure-token-budget/scripts/measure_tokens.py --text "上下文预算优先级" --json
```

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `total_tokens` | 全部条目的 token 合计 |
| `total_bytes` | 全部条目的 UTF-8 字节合计 |
| `items[].path` | 条目路径；`--text` 模式为 `<text>` |
| `items[].bytes` | 该条目的 UTF-8 字节数 |
| `items[].tokens` | 该条目的估算 token 数 |
| `items[].type` | 来源类型：`skill_contract` / `readme` / `catalog` / `docs` / `other` |
| `partitions` | 五个分区的 token 合计 |

类型判定顺序：`skills/*/SKILL.md` → `skill_contract`；`skills/*/README.md` → `readme`；
文件名匹配 `skills?-(catalog|index)`（`skill-catalog` / `skills-catalog` / `skill-index` / `skills-index`）→ `catalog`；
路径含 `docs/` → `docs`；其余 → `other`。

## 退出码表

| 退出码 | 含义 |
| :--- | :--- |
| 0 | 测算成功，stdout 为合法 JSON |
| 1 | `--paths` 中存在不存在的路径（或既未给 `--paths` 也未给 `--text`） |

## 上下游

- 上游：`token-budget-policy`（定义优先级，决定测哪些层）。
- 下游：`prune-redundant-context`（裁剪前后对拍）、`verify-token-reduction`（降幅断言）、`token-economy-guard`。
