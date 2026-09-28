# verify-chinese-output

L2 工序动作：中文输出三项硬断言，全部通过才 Exit 0。

## 用途

「全流程中文输出」规约的放行闸门：剥离器不自证合规，合格与否由本门禁对「待检正文」逐项断言。

**设计前提**：本仓库技术文档实测中文占比只有 25%~40%，拉丁字母几乎全是路径、命令、JSON 键与技能 id。
断言必须建立在 `strip-non-prose-scope` 剥离后的正文之上，不能按整体字符占比一刀切。

## 使用方式

```bash
python3 skills/verify-chinese-output/scripts/verify_chinese.py --text "<文本>" \
  [--min-cjk-ratio 0.85] [--allow "额外,名词"] [--json]
python3 skills/verify-chinese-output/scripts/verify_chinese.py --file <文件路径> \
  [--min-cjk-ratio 0.85] [--allow "额外,名词"] [--json]
```

`--text` 与 `--file` 二选一。`--allow` 为追加白名单（逗号分隔），只追加不能删内置项。

## 三项断言

| 断言名 | 内容 | 失败含义 |
| :--- | :--- | :--- |
| `cjk_ratio` | 待检正文 CJK 占比 ≥ `--min-cjk-ratio`（默认 0.85） | 正文仍夹着成句英文 |
| `no_latin_word` | 非白名单拉丁词数量 == 0（严格档，无宽容参数） | 出现了白名单外的英文词 |
| `abbr_gloss` | 独立大写缩写必须有中文释义 | 缩写没给中文全称，读者看不懂 |

### 占比口径

`cjk_ratio = CJK 字符数 / 待检正文中「非空白、非标点、非符号」的字符数`。

中文标点、空白与符号不稀释分母；拉丁字母与数字计入分母，夹英文会立刻拉低占比。
待检正文为空（全部成分被豁免）时无可判内容，占比记为 `1.0`。

### 缩写判据（两个子判据，命中任一即违规）

- **子判据甲**：每次出现的独立大写缩写（≥2 连续大写字母），其后 12 字以内必须有中文；
- **子判据乙**：同一缩写的**首次出现**必须带中文释义结构，例如 `模型上下文协议（MCP）`、`MCP：模型上下文协议`、`MCP 即 模型上下文协议`。

**白名单只豁免断言 2，不豁免断言 3**：`MCP` 是内置白名单词，但「使用 MCP 完成数据同步」仍违规，
因为它没给中文全称。

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `success` | 三项断言是否全部通过 |
| `cjk_ratio` | 待检正文 CJK 占比（四位小数） |
| `scope_len` | 待检正文字符数 |
| `violations` | `[{"kind","token","index","snippet"}]`；`kind` 取 `latin_word` / `cjk_ratio` / `abbr_no_gloss` |
| `checks` | `[{"name","pass","detail"}]` 三项断言的逐项判定 |

`index` 为字符偏移量；`kind=cjk_ratio` 属全文级违规，`index` 固定为 `-1`。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 三项断言全部通过 |
| 1 | 存在违规（占比不达标 / 非白名单拉丁词 / 缩写无中文释义） |
| 2 | 输入缺失、文件不存在不可读，或剥离器不可用 |

## 上下游

- 上游：`strip-non-prose-scope`（以 importlib 进程内加载，提供 `scope_text` 与白名单）。
- 下游：`chinese-output-guard`（L3 交付前门禁的末端断言环节）。
