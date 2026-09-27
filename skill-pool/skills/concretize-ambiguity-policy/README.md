# concretize-ambiguity-policy

L1 微观原子规约：含糊词具像化判定基元（`REQ-BUTLER-CONCRETIZE-024`）。

## 用途

定义「含糊其辞必须具像化」的判定基元：把含糊词分成三类 + 一类缓解词，并给每一类钉死
**唯一合法的具像化方式**。本规约只出判据，不含脚本、不检测、不写文件。

| 类别 | 典型词 | 具像化方式 |
| :--- | :--- | :--- |
| 范围含糊 | 若干 / 一些 / 部分 / 多个 / 等等 | 给出确切数量或区间 **+ 计数依据** |
| 指代含糊 | 相关 / 相应 / 等 / 其它 / 之类 | 枚举出**具体实体清单**（可核对） |
| 时序含糊 | 尽快 / 必要时 / 适时 / 及时 | 给出**可判定的触发条件 + 时限** |
| 缓解词 hedge | 适当 / 尽量 / 酌情 / 差不多 | 给出**可核对的判据**（具体阈值或条件取代该词） |

**硬规则**：禁止用另一个含糊词替换含糊词。「尽快」→「尽早」、「若干」→「一些」、
「相关」→「相应」、「适当」→「酌情」全部不合格——替换前后的可判定性完全相同。

**依据优先**：数量与时限都必须带「依据」，没有依据的数字只是把模糊换成了更具体的猜测。

**词表归口**：含糊词清单的唯一真相源是 `skills/detect-vague-modifier/scripts/detect_vague.py`
的模块级常量 `AMBIGUITY_WORDS` 与函数 `classify_word(w)`，本规约与任何下游技能都不得再写第二份词表。

## 使用方式

本规约为纯规约，无 CLI。实际执行由下游技能的探针承载：

```bash
# 1) 检测：命中含糊词、类别、位置（词表唯一真相源）
python3 skills/detect-vague-modifier/scripts/detect_vague.py --text '请尽快处理相关问题' --json

# 2) 具像化建议：按类别给出替换模板与占位示例
python3 skills/concretize-term/scripts/concretize.py --text '请尽快处理相关问题' --json

# 3) 断言：无未具像化含糊词 / 同义替换 / 数量缺依据
python3 skills/verify-concretized-output/scripts/verify_concretized.py --file <交付稿> --strict --json
```

判定顺序固定为「先取类别，再取该类别对应的具像化方式」，不允许跨类别套用
（例如把指代含糊用「数量 + 依据」糊过去）。

## 输出字段

本规约无自有输出，字段口径沿用下游两侧：

| 侧 | 技能 | 字段 |
| :--- | :--- | :--- |
| 建议侧 | `concretize-term` | `suggestions[].term / category / line / snippet / suggestion / example / weak`、`counts.{range,reference,timing,hedge}` |
| 断言侧 | `verify-concretized-output` | `success`、`hits[].term / category / line / snippet`、`violations[].kind / term / line / detail`、`checks[].name / pass / detail` |

`violations[].kind` 取值：`unconcretized`（未具像化）/ `no_basis`（数量缺依据）/ `synonym_swap`（同义替换）。

## 退出码

本规约自身不含脚本，退出码语义由执行代理脚本承载：

| 码 | 含义 |
| :--- | :--- |
| 0 | 正文不含含糊词，或每个含糊词都已按类别具像化 |
| 1 | 存在未具像化的含糊词，或出现「含糊词替换含糊词」 |
| 2 | 输入缺失、文件不可读，或词表唯一真相源 `detect-vague-modifier` 未就绪 |

## 上下游

- 下游：`concretize-term`（L2 具像化建议）、`verify-concretized-output`（L2 断言）、
  `concretization-guard`（L3 交付门禁）、`detect-vague-modifier`（词表唯一真相源，检测侧）。
- 平行：`quantify-modifier-policy`（程度词补**数值**，与含糊词补**实体与判据**分工互补，
  两者共同构成「修饰词不得含糊」的两条腿）。
