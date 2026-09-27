# chinese-end-to-end

L1 原子规约：全流程中文输出（`REQ-BUTLER-ZHFLOW-019`）。回复正文、进度播报、报错信息、解释说明、脚本注释一律中文。

## 用途

规定面向用户的机器产物「散文部分一律中文」这条语言纪律，并明确两条互补规则：

1. **技术标识符保留原文**：路径、命令、代码、技能 id、JSON 键照抄，禁止硬译；
2. **保留即须释义**：标识符首次出现紧跟中文释义，英文缩写首现必须给中文全称。

**设计前提**：本仓库技术文档实测中文占比仅 25%~40%（`product.md` 约 40.1%、`workflows.md` 约 25.4%），
拉丁字母几乎全是路径、命令、JSON 键与技能 id。所以「纯中文」判定必须先剥离非散文成分再断言，
不能按整体字符占比一刀切，否则任何一份合格的技术交付都会被误判为违规。

## 使用方式

本技能是纯规约，不带脚本；判定由下游 L2 脚本物理承载：

```bash
python3 skills/strip-non-prose-scope/scripts/strip_scope.py \
  --text "模型上下文协议（MCP）用于连接外部工具，详细用法见 docs/operations/workflows.md。" --json

python3 skills/verify-chinese-output/scripts/verify_chinese.py \
  --text "模型上下文协议（MCP）用于连接外部工具，详细用法见 docs/operations/workflows.md。" --json
```

## 覆盖范围

| 产物形态 | 中文要求 |
| :--- | :--- |
| 回复正文 | 必须中文 |
| 进度播报 | 必须中文 |
| 报错信息 | 必须中文 |
| 解释说明 | 必须中文 |
| 脚本注释 | 必须中文 |

**豁免面**：` ``` ` 围栏代码块、行内反引号内容、URL、文件路径不参与占比判定，也不得被翻译或改写。

## 输出字段

本技能自身无输出字段；判据字段由下游承载：

| 字段 | 来源 | 含义 |
| :--- | :--- | :--- |
| `scope_text` | `strip-non-prose-scope` | 剥离四类非散文成分后的「待检正文」 |
| `stripped` | `strip-non-prose-scope` | 四类剥离计数 `code_blocks` / `inline_code` / `urls` / `paths` |
| `whitelist_hits` | `strip-non-prose-scope` | 待检正文中命中的内置白名单专有名词 |
| `cjk_ratio` / `violations` / `checks` | `verify-chinese-output` | 中文占比、违规明细与三项断言结论 |

## 退出码

本规约无自有退出码，判定结论由 `verify-chinese-output` 承载：

| 码 | 含义 |
| :--- | :--- |
| 0 | 中文占比达标、非白名单拉丁词为 0、缩写均有中文释义 |
| 1 | 存在违规（成句英文、非白名单拉丁词、缩写无中文全称） |
| 2 | 输入缺失或文件不存在不可读 |

## 上下游

- 上游：`REQ-BUTLER-ZHFLOW-019`（全流程中文输出需求）、`output-chinese-only`（纯中文微观规约）。
- 下游：`strip-non-prose-scope`（剥离非散文成分）、`verify-chinese-output`（三项硬断言）、`chinese-output-guard`（交付前门禁，挂载于管家「④ 输出规约」集群）。
