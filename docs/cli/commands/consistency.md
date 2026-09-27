# consistency

口径一致性门禁：先刷新 catalog 受管区块，再对 Frontmatter / catalog / docs 做三方对拍。

## 用法

```bash
./bin/skill-pool consistency [--check] [--json]
```

| 参数 | 含义 |
| :--- | :--- |
| `--check` | 只检测漂移，不刷新受管区块 |
| `--json` | 输出底层探针的原始 JSON |

## 行为

1. 运行 `skills/render-catalog-docs/scripts/render_docs.py`，由 `docs/operations/skill-catalog.json` 重新生成
   `docs/requirements/product.md` 的受管区块（标记行以 `CATALOG:BEGIN` / `CATALOG:END` 开头）；
2. 运行 `skills/verify-catalog-consistency/scripts/verify_consistency.py` 做五项检查：

| 检查 | 内容 |
| :--- | :--- |
| C1 | catalog JSON 结构完整 |
| C2 | 每个技能 `SKILL.md` 的 name/level/composition == catalog 条目 |
| C3 | docs 受管区块与本脚本生成结果一致 |
| C4 | docs 正文中手写的组装关系（形如 `` `skill` (L3) = `a` + `b` ``）与 Frontmatter 一致 |
| C5 | `docs/operations/skills-catalog.md` 的总纳管技能数 == catalog `total_skills` |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 受管区块已刷新且五项检查全部通过 |
| 1 | 生成失败，或存在不一致（输出逐条列出 `check` / `file` / `line` / `detail`） |

## 何时运行

- 任何技能新增、修改、删除之后；
- 交付技能池变更之前；
- 怀疑「文档与技能描述不一致」时。

## 相关

- 技能：`catalog-consistency-guard` (L3)、`render-catalog-docs` (L2)、`verify-catalog-consistency` (L2)
- 需求：`REQ-BUTLER-CONSISTENCY-010`
