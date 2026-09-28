# strip-non-prose-scope

L2 工序动作：按固定顺序剥离四类非散文成分，产出「待检正文」与白名单命中。

## 用途

`chinese-end-to-end` 规约的判据前置。把技术交付里的**围栏代码块、行内反引号内容、URL、文件路径**
逐类摘掉，只留真正该由人阅读的待检正文，交给 `verify-chinese-output` 断言。

**设计前提**：本仓库技术文档实测中文占比只有 25%~40%，拉丁字母几乎全是路径、命令、JSON 键与技能 id。
按整体字符占比一刀切会让任何一份合格的技术交付都违规，所以必须先剥离再断言。

## 使用方式

```bash
python3 skills/strip-non-prose-scope/scripts/strip_scope.py --text "<文本>" [--json] [--allow "额外,名词"]
python3 skills/strip-non-prose-scope/scripts/strip_scope.py --file <文件路径> [--json] [--allow "额外,名词"]
```

`--text` 与 `--file` 二选一，至少给一个。`--allow` 为追加白名单，逗号分隔（只追加，不能删内置项）。

## 剥离规则（顺序固定，不可交换）

| 序号 | 成分 | 判据 | 计数键 |
| :--- | :--- | :--- | :--- |
| 1 | 围栏代码块 | ` ``` ` 或 `~~~` 起止，含未闭合到文末的围栏 | `code_blocks` |
| 2 | 行内反引号内容 | 单反引号或双反引号包裹 | `inline_code` |
| 3 | URL | `http` / `https` / `ftp` / `mailto` 协议头 | `urls` |
| 4 | 文件路径 | 由 ASCII 路径字符与 `/` 组成、且含 ASCII 字母数字的 token | `paths` |

第 4 类只认 ASCII 路径 token：`docs/x.md`、`bin/skill-pool`、`skills/a/scripts/b.py` 会被剥离，
中文里的「和/或」与孤立斜杠不会。

内置白名单（`--allow` 可追加）：

```
DSH,JSON,YAML,BM25,CLI,API,MCP,HTML,CSS,SVG,PNG,JPEG,README,SKILL,catalog,index,token,agent,plugin,git,GitHub,Python
```

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `scope_text` | 剥离四类非散文成分后的待检正文 |
| `stripped` | `{"code_blocks","inline_code","urls","paths"}` 四类剥离计数 |
| `whitelist_hits` | 待检正文中命中的白名单专有名词，大小写不敏感、去重保序 |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 剥离成功（结果由 stdout 承载） |
| 1 | 输入缺失（既无 `--text` 也无 `--file`），或 `--file` 文件不存在 / 不可读 |

## 上下游

- 上游：`chinese-end-to-end`（L1 全流程中文规约，定义四类豁免面）。
- 下游：`verify-chinese-output`（以 importlib 加载本脚本，用 `scope_text` 做三项硬断言）。
