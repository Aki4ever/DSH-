# prune-redundant-context

L2 工序技能：保守语义无损的上下文裁剪。

## 用途

在 `token-budget-policy` 的裁剪顺序下，物理降低 token 占用：
折叠连续重复行（保留 ` <!-- ×N -->` 计数）、折叠完全相同的重复段落（提示 `<!-- 重复段落已折叠 ×N -->`）、折叠连续空行。
`<!-- CATALOG:BEGIN ... -->` 与 `<!-- CATALOG:END -->` 之间的受管区块、以及 `docs/requirements/` 下的编号行与表格行**逐字节不动**。
对同一输入连跑两次，第二次 `saved_tokens` 必为 0（幂等）。

## 使用方式

```bash
python3 skills/prune-redundant-context/scripts/prune_context.py --in <src.md> --out <dst.md> --json
python3 skills/prune-redundant-context/scripts/prune_context.py --paths <a.md> <b.md> --out <dst.md> --json
```

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `before_tokens` | 裁剪前估算 token |
| `after_tokens` | 裁剪后估算 token |
| `saved_tokens` | 节省 token（`before - after`） |
| `saved_ratio` | 下降比例，4 位小数 |
| `removed_lines` | 减少的物理行数 |
| `rules_applied.dup_line` | 被折叠的重复行组数 |
| `rules_applied.dup_paragraph` | 被折叠的重复段落次数 |
| `rules_applied.blank` | 被折叠的空行数 |

token 口径：汉字约 1 token/字，ASCII 约 4 字节 1 token（确定性估算，非真实分词器）。

## 退出码表

| 退出码 | 含义 |
| :--- | :--- |
| 0 | 裁剪成功（含零改动），输出文件已写出 |
| 1 | 输入不存在（`--in` / `--paths`），或未提供任一输入参数 |

## 上下游

- 上游：`measure-token-budget`（提供 before 基线口径）、`token-budget-policy`（裁剪顺序裁决）。
- 下游：`verify-token-reduction`（对裁剪结果做降幅与等价能力断言）、`token-economy-guard`。
