# quantify-modifier

L2 工序动作：按场景把程度类修饰词替换为可判定的数值区间，无映射则落 `unquantifiable` 并要求声明假设。

## 用途

「修饰程度词必须量化」（`REQ-BUTLER-QUANTIFY-023`）流水线的替换环节。
把 `detect-vague-modifier` 报出的程度词命中，按 `(term, domain)` 查到四要素条目，
拼装成可直接落笔的量化建议：`快 → P95<=200 ms（依据：行业常见 SLA 区间：P95 不超过 200 ms 属快）`。

三条硬纪律：

1. **场景优先**：只有传入 `--domain` 才查表；未声明场景时**不替用户挑场景**，命中词一律落
   `unquantifiable`，并在建议里列出该词已有的候选场景；
2. **不可量化不得沉默**：无映射时输出 `unquantifiable` 并给出「需显式声明假设」提示，
   **但退出码仍为 0，不阻断交付**；
3. **保留原词、只补数值**：建议保留原词并附数值与单位；出现程度词叠用（很快 / 非常快）时额外标注
   「属用另一个程度词替换程度词，一律不合格」。

替换源是 `docs/operations/quantifier-table.json`（由 `build-quantifier-table` 维护），
词表唯一真相源是 `detect-vague-modifier`（importlib 进程内加载，不起子进程）。

## 使用方式

```bash
python3 skills/quantify-modifier/scripts/quantify.py --text "<文本>" [--domain <场景>] [--json]
python3 skills/quantify-modifier/scripts/quantify.py --file <路径> [--domain <场景>] [--json]
```

`--text` 与 `--file` 二选一；`--domain` 省略时命中词一律落 `unquantifiable`。

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `success` | 处理是否完成 |
| `domain` | 调用方传入的场景（未传为 `null`） |
| `substituted` | `[{"term","from","to","basis","line","suggestion"}]` |
| `unquantifiable` | `[{"term","line","suggestion"}]` |
| `stats` | `{"degree_hits","replaced","unquantifiable"}` |
| `table_version` / `table_error` | 映射表版本；不可读时为错误说明 |

- `from` = 原词；`to` = `quantified` + `unit`（如 `>=1 MB`、`P95<=200 ms`）；
- `suggestion` = 保留原词的完整建议串，含数值、单位与依据三要素。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 处理完成（`unquantifiable` 有多少条都不影响退出码） |
| 1 | 输入缺失（既无 `--text` 也无 `--file`），或 `--file` 指向的文件不存在/不可读 |

## 上下游

- 上游：`detect-vague-modifier`（命中词与位置，唯一真相源）、`build-quantifier-table`（场景量化条目）。
- 下游：`verify-quantified-output`（断言输出中不存在未量化程度词）、`quantification-guard`（L3 交付门禁）。
