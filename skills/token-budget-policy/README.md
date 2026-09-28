# token-budget-policy

L1 原子规约：上下文预算优先级与超预算裁剪顺序。

## 用途

回答「上下文超预算时先保谁、先砍谁」：索引/检索片段（P0）> 选中技能正文（P1）> 参考文档（P2）；
超预算裁剪先砍参考文档，再砍技能正文，P0 永不砍；README 不进上下文，`docs/**` 长文只以片段入上下文。
本技能无脚本，只出优先级裁决。

## 使用方式

```bash
# 规约本身无命令；按裁决执行下游三条命令
python3 skills/measure-token-budget/scripts/measure_tokens.py --paths docs/operations/skill-catalog.json --json
python3 skills/prune-redundant-context/scripts/prune_context.py --in <src.md> --out <dst.md> --json
python3 skills/verify-token-reduction/scripts/verify_reduction.py --before <src.md> --after <dst.md> --target 0.40 --cases <cases.json> --json
```

## 输出字段

规约裁决以分层清单表达，字段固定：

| 字段 | 含义 |
| :--- | :--- |
| `layer` | 层级：P0 索引/检索片段、P1 选中技能正文、P2 参考文档 |
| `source` | 物理来源路径或检索片段标识 |
| `prune_allowed` | 是否允许在超预算时裁剪（P0 恒为 false） |
| `prune_order` | 裁剪序号：P2 先裁、P1 后裁、P0 不裁 |

## 退出码表

本技能无脚本，退出码由执行代理脚本承载：

| 退出码 | 含义 |
| :--- | :--- |
| 0 | 预算内，或裁剪后复算通过 |
| 1 | 超出预算且 P0 触顶不可裁剪，或下游脚本判定输入不可读 / 降幅不足 / 能力缺失 |
| 2 | 校验脚本参数缺失（缺 `--before` / `--after` / `--cases`） |

## 上下游

- 上游：无（原子基元）。
- 下游：`measure-token-budget`、`prune-redundant-context`、`verify-token-reduction`、`token-economy-guard`。
