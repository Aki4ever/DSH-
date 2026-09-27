# concretize-term

L2 工序动作：含糊词具像化建议器（`REQ-BUTLER-CONCRETIZE-024` 的建议环节）。

## 用途

逐个命中正文里的含糊词，按其类别产出一条**可落地的具像化建议模板 + 占位示例**，
并对每条建议做「替换词黑名单」校验，把「含糊词替换含糊词」变成机器可判定的 `weak` 标记。

| `category` | 建议方向 | 占位示例 |
| :--- | :--- | :--- |
| `range` | 补确切数量 + 计数依据 | `若干 → 12 个（依据：本次扫描命中 12 处）` |
| `reference` | 枚举具体实体清单（可逐项核对） | `相关 → SKILL.md、README.md、concretize.py（依据：同目录实际存在的文件名）` |
| `timing` | 给出可判定的触发条件 + 时限 | `尽快 → 在下一个门禁运行前（≤10 分钟）` |
| `hedge` | 给出可核对的判据：该词必须被具体阈值或条件取代 | `适当 → 把上限从 5 提到 8，依据：当前 90% 请求落在 5 以内` |

**词表唯一真相源**：含糊词并集 `AMBIGUITY_WORDS` 与分类函数 `classify_word(w)` 都从
`skills/detect-vague-modifier/scripts/detect_vague.py` 经 `importlib` 动态加载。
**本脚本不内置任何兜底词表**：该文件缺失时以 `exit 2` 明确退出，并在 stderr 说明依赖未就绪。

`--file` 模式下，`reference` 类会**自动枚举同目录下真实存在的文件名**作为候选实体来源
（排序、限 5 个）；`--text` 模式没有目录上下文，只给占位示例，绝不编造实体。

**替换词黑名单校验**：每条建议（`suggestion + example`）去掉触发它的那个词后，若仍命中**同类别**
其它含糊词即标 `weak: true`。黑名单 = 唯一真相源词表内的同类别词 + 运行期推导的**换字变体**
（等长、同位仅差一字，如「尽快」→「尽早」），后者不引入任何词条。

## 使用方式

```bash
# 文本输入
python3 skills/concretize-term/scripts/concretize.py --text '请尽快处理相关问题' --json

# 文件输入（reference 类自动枚举同目录真实文件名）
python3 skills/concretize-term/scripts/concretize.py --file docs/requirements/index.md --json

# 人类可读输出
python3 skills/concretize-term/scripts/concretize.py --file docs/requirements/index.md
```

`--text` 与 `--file` 二选一；同时缺省、或文件不可读为空，都退 `1`。

## 输出字段

| 字段 | 类型 | 含义 |
| :--- | :--- | :--- |
| `success` | 布尔 | 是否完成全量扫描（命中数为 0 时同样为 `true`） |
| `source` | 字符串 | `text`，或实际读取的文件路径 |
| `suggestions[].term` | 字符串 | 命中的含糊词原文 |
| `suggestions[].category` | 字符串 | `range` / `reference` / `timing` / `hedge`（四类之外的分类记 `unknown`） |
| `suggestions[].line` | 整数 | 命中所在行号（1 起，按 `\n` 计数） |
| `suggestions[].snippet` | 字符串 | 命中处的截断上下文片段 |
| `suggestions[].suggestion` | 字符串 | 按类别给出的具像化建议模板 |
| `suggestions[].example` | 字符串 | 占位示例（`reference` 类可能为真实枚举结果） |
| `suggestions[].weak` | 布尔 | 建议去掉该词后仍含同类别含糊词则为 `true`（同义替换嫌疑） |
| `counts` | 对象 | `range` / `reference` / `timing` / `hedge` 四类命中数；出现其它分类时追加 `unknown` |
| `error` | 字符串 | 仅失败时输出 |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 处理完成（含命中数为 0，此时 `suggestions` 为空数组） |
| 1 | 输入缺失：未给 `--text` / `--file`，或文件不可读 / 为空 |
| 2 | 依赖模块 `detect-vague-modifier` 未就绪（`detect_vague.py` 缺失或无法加载），stderr 写明原因 |

## 上下游

- 上游：`concretize-ambiguity-policy`（L1 四类判据与具像化方式）、
  `detect-vague-modifier`（词表唯一真相源 `AMBIGUITY_WORDS` / `classify_word`）。
- 下游：`verify-concretized-output`（对改写结果做 `unconcretized` / `no_basis` / `synonym_swap` 断言）、
  `concretization-guard`（L3 交付门禁）。
- 平行：`quantify-modifier`（程度词补数值），与本技能分工互补。
