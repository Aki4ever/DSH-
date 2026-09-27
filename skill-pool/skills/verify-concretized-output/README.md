# verify-concretized-output

L2 工序动作：含糊词具像化断言器（`REQ-BUTLER-CONCRETIZE-024` 的断言环节）。

## 用途

对改写后的正文做三项硬断言，**全过才退 0**；任一条不通过即退 `1` 并给出逐条违规明细。
它是「禁止用另一个含糊词替换含糊词」这条硬规则的物理判据。

| # | 断言名 | 判据 | 违规 kind |
| :--- | :--- | :--- | :--- |
| 1 | `no_unconcretized` | `AMBIGUITY_WORDS` 命中数 == 0 | `unconcretized` |
| 2 | `quantity_basis`（`--strict`） | 数量表述必须带依据，如 `12 个（依据：…）` | `no_basis` |
| 3 | `no_synonym_swap` | 命中词右侧 6 字内不得出现替换词 | `synonym_swap` |

- 第 2 条只在 `--strict` 下生效；非严格模式记为通过，并在 `checks[].detail` 明示「未启用」。
- 第 3 条按三级判定替换词：① 词表内同类别词；② 窗口 2~4 字切片经 `classify_word` 判为同类别者；
  ③ **换字变体**（等长、同位仅差一字，如「尽快」→「尽早」）。第三级由命中词在运行期推导，不含任何词条。
- **词表唯一真相源**：`AMBIGUITY_WORDS` / `classify_word` 只从
  `skills/detect-vague-modifier/scripts/detect_vague.py` 经 `importlib` 加载，本脚本不内置任何兜底词表。

## 使用方式

```bash
# 断言：无未具像化含糊词 + 无同义替换
python3 skills/verify-concretized-output/scripts/verify_concretized.py --text '<正文>' --json

# 严格断言：任何数量表述必须带依据
python3 skills/verify-concretized-output/scripts/verify_concretized.py --text '本次扫描命中 12 处' --strict --json

# 同义替换：必须 exit 1 且含 synonym_swap
python3 skills/verify-concretized-output/scripts/verify_concretized.py --text '请尽快处理，尽早反馈' --json

# 文件输入 + 人类可读输出
python3 skills/verify-concretized-output/scripts/verify_concretized.py --file <交付稿> --strict
```

## 输出字段

| 字段 | 类型 | 含义 |
| :--- | :--- | :--- |
| `success` | 布尔 | 三项断言全过且 `violations` 为空 |
| `strict` | 布尔 | 是否启用 `--strict` |
| `source` | 字符串 | `text`，或实际读取的文件路径 |
| `hits[].term / category / line / snippet` | 数组 | 命中的含糊词、类别、行号与上下文片段 |
| `violations[].kind` | 字符串 | `unconcretized` / `no_basis` / `synonym_swap` |
| `violations[].term / line / detail` | — | 违规词、行号与人类可读理由 |
| `checks[].name / pass / detail` | 数组 | 三项断言的判定结果与依据 |
| `error` | 字符串 | 仅失败时输出 |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 三项断言全过 |
| 1 | 存在违规：`unconcretized` / `no_basis` / `synonym_swap` 任一命中 |
| 2 | 依赖模块 `detect-vague-modifier` 未就绪，或输入缺失（未给 `--text` / `--file`、文件不可读或为空） |

## 上下游

- 上游：`concretize-term`（建议环节，产出待断言对象的改写口径）、
  `detect-vague-modifier`（词表唯一真相源 `AMBIGUITY_WORDS` / `classify_word`）。
- 下游：`concretization-guard`（L3 交付门禁，把本断言作为放行最后一环）。
- 平行：`verify-quantified-output`（断言程度词已量化），与本技能分工互补。
