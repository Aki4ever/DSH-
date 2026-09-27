# verify-quantified-output

L2 工序动作：量化输出三项硬断言，全部通过才 Exit 0。

## 用途

「修饰程度词必须量化」（`REQ-BUTLER-QUANTIFY-023`）流水线的放行闸门：
替换器不自证合规，合格与否由本门禁对正文逐项断言。

| 断言名 | 判据 | 失败含义 |
| :--- | :--- | :--- |
| `no_unquantified_degree` | 每处程度词命中的前 24 字 / 后 40 字窗口内必须有「数值 + 单位」 | 程度词没有数值兜底，无法验收 |
| `no_degree_word_replacement` | 程度强化词（很 / 非常 / 极其 / 特别 / 十分 / 相当 / 格外 / 尤其 / 超级 / 太 / 挺 / 更 / 更加 / 过于）紧邻程度词即违规 | 用另一个程度词替换程度词 |
| `mapping_required`（仅 `--require-mapping`） | 每个命中词都能找到 domain 条目 | 场景量化映射缺失 |

三项断言互补，互不替代：断言 1 看「**正文里落数了没有**」，断言 3 看「**映射侧有没有条目**」——
文本可以带数值而映射空缺，也可以有映射而文本没落数，因此两条都要独立成立。

词表与映射表读写均来自唯一真相源 `detect-vague-modifier`（importlib 进程内加载，不起子进程）。

## 使用方式

```bash
python3 skills/verify-quantified-output/scripts/verify_quantified.py --text "<文本>" \
  [--domain <场景>] [--require-mapping] [--json]
python3 skills/verify-quantified-output/scripts/verify_quantified.py --file <路径> \
  [--domain <场景>] [--require-mapping] [--json]
```

`--text` 与 `--file` 二选一；不加 `--json` 时输出「门禁结论 + 逐项 PASS/FAIL + 未量化清单」的人类可读文本。

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `success` | 全部断言是否通过 |
| `unquantified` | `[{"term","line","snippet"}]`，断言一命中的未量化程度词（词 + 行号 + 片段） |
| `checks` | `[{"name","pass","detail"}]`，逐项断言的判定与证据，`detail` 内含词与行号 |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 三项断言全部通过 |
| 1 | 存在未量化程度词、程度词替换程度词，或缺失 domain 映射 |
| 2 | 输入缺失（既无 `--text` 也无 `--file`、文件不可读），或量化映射表不可读 |

## 上下游

- 上游：`detect-vague-modifier`（词表与扫描，唯一真相源）、`quantify-modifier`（产出替换建议后回跑本门禁）。
- 下游：`quantification-guard`（L3 交付门禁的末端断言环节，退 0 才放行）。
