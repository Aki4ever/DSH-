# verify-context-payload

L2 工序动作：上下文载荷预算断言。

## 用途

回答「这次到底往上下文塞了多少技能正文」，并把 `lazy-load-policy` 的四条硬规则变成断言。

## 四项断言

| 断言 | 内容 |
| :--- | :--- |
| `loaded_subset_of_selected` | `loaded` 必须是 `selected` 的子集（防越权加载） |
| `within_top_k` | `len(loaded) ≤ max-skills`（默认 5） |
| `no_missing_contract` | 每个 loaded 技能的 `SKILL.md` 都存在 |
| `within_byte_budget` | 累计字节 ≤ `max-bytes`（默认 12288） |

## 使用方式

```bash
python3 skills/verify-context-payload/scripts/verify_payload.py --selected a,b,c --loaded a,b
python3 skills/verify-context-payload/scripts/verify_payload.py --manifest /tmp/manifest.json
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 四项断言全部通过 |
| 1 | 任一项失败 |

## 上下游

- 上游：`select-skills-for-task`、`load-skill-contract`。
- 下游：`on-demand-dispatcher`。
