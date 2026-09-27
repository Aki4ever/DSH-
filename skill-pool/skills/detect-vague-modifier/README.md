# detect-vague-modifier

L2 工序动作：扫描文本中的程度类与含糊类词语，输出命中词、类别、位置与是否已有量化映射。
**本技能内置词表是全仓模糊词表的唯一真相源。**

## 用途

「修饰程度词必须量化」（`REQ-BUTLER-QUANTIFY-023`）流水线的检测环节，同时负责词表收敛：
仓库原有两份不一致的 `VAGUE_TERMS` 副本（`plan-fission` 12 词、`dsh-butler/fission_engine` 10 词）
收敛后改为 importlib 加载本模块，并集（13 词）已完整并入 `hedge` 分组，`--list-words`
会输出 `legacy_coverage.missing` 供覆盖率对拍。

词分五类，对外用 `category`（二值）与 `word_class`（五类）两个字段同时暴露：

| word_class | category | 词例 |
| :--- | :--- | :--- |
| `degree` | `degree` | 高 / 大 / 快 / 多 / 好 / 严重 / 频繁 / 明显 / 显著 / 较多 / 较高 / 偏低 / 偏高 / 丰富 / 完善 / 稳定 |
| `hedge` | `ambiguity` | 适当 / 尽量 / 尽可能 / 根据情况 / 视情况 / 差不多 / 差不多就行 / 友好 / 美观 / 大概 / 酌情 / 灵活处理 / 自行判断 |
| `range` | `ambiguity` | 若干 / 一些 / 部分 / 多个 / 等等 |
| `reference` | `ambiguity` | 相关 / 相应 / 等 / 其它 / 之类 |
| `timing` | `ambiguity` | 尽快 / 必要时 / 适时 / 及时 |

## 使用方式

```bash
python3 skills/detect-vague-modifier/scripts/detect_vague.py --text "<文本>" [--domain <场景>] [--json]
python3 skills/detect-vague-modifier/scripts/detect_vague.py --file <路径> [--domain <场景>] [--json]
python3 skills/detect-vague-modifier/scripts/detect_vague.py --list-words      # 打印词表 JSON 后 exit 0
```

`--text` 与 `--file` 二选一。不加 `--json` 时输出人类可读的逐条命中清单。

### 可复用导出（唯一真相源接口）

| 导出 | 类型 | 含义 |
| :--- | :--- | :--- |
| `DEGREE_WORDS` | 元组 | 程度类词表（16 词） |
| `AMBIGUITY_WORDS` | 字典 | `{"hedge": (...), "range": (...), "reference": (...), "timing": (...)}` |
| `AMBIGUITY_WORD_LIST` | 元组 | 含糊类并集（27 词） |
| `LEGACY_VAGUE_TERMS` | 元组 | 既有两份旧词表的并集（13 词），用于覆盖率对拍 |
| `classify_word(w)` | 函数 | 返回 `degree` / `hedge` / `range` / `reference` / `timing`，查不到返回 `None` |
| `ambiguity_kind(w)` | 函数 | 仅返回含糊四类之一，非含糊词返回 `None` |
| `scan(text, domain, table)` | 函数 | 返回 `{"hits": [...], "counts": {...}, "unquantified": n}` |
| `load_quantifier_table()` / `find_mapping()` | 函数 | 映射表读取与场景查表 |

### 匹配纪律

全部词条按「长度降序 + 字典序」排入同一个正则，**单趟左端最长匹配**：
「差不多就行」先于「差不多」、「等等」先于「等」、「多个」先于「多」命中，同一位置不重复计数。

### quantified 的准确含义

`quantified` 只回答「**该词在映射表里有没有场景量化值**」：指定 `--domain` 时查 `(term, domain)`；
未指定时任一场景命中即 `true`，并给出 `matched_domain`。它**不回答**「当前这处文本是否已经落数值」
（那是 `verify-quantified-output` 的判据），也**不回答**「这一句能否给出替换」
（那是 `quantify-modifier` 的判据，场景未声明时落 `unquantifiable`）。

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `success` | 扫描是否完成 |
| `hits` | `[{"term","category","word_class","line","index","quantified","domain","matched_domain","snippet"}]` |
| `counts` | `{"degree","ambiguity","hedge","range","reference","timing"}` |
| `unquantified` | 未量化的**程度词**数量（含糊词不计入，它们由具像化管线承接） |
| `domain` | 调用方传入的场景（未传为 `null`） |
| `table_version` / `table_error` | 映射表版本；映射表不可读时为错误说明（不影响扫描） |

`index` 为命中词在全文中的字符偏移（从 0 开始），`line` 从 1 开始。

`--list-words` 输出：`word_classes` / `categories` / `degree` / `ambiguity`（四分组）/
`words`（逐词的 `category` 与 `word_class`）/ `counts` / `legacy_coverage`。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 扫描完成（命中 0 处或多处均为 0），或 `--list-words` 打印词表 |
| 1 | 输入缺失（既无 `--text` 也无 `--file`），或 `--file` 指向的文件不存在/不可读 |

**退出码与命中数量无关**：检测层不判定合格，判定权在 `verify-quantified-output`。

## 上下游

- 上游：`build-quantifier-table`（提供 `quantifier-table.json` 用于 `quantified` 判定）。
- 下游：`quantify-modifier`（取命中词与映射做替换）、`verify-quantified-output`（断言层）、
  `quantification-guard`（L3 交付门禁）；含糊词分支交 `REQ-BUTLER-CONCRETIZE-024` 的具像化技能。
