# chinese-output-guard

L3 复合流程：全流程中文输出交付前门禁（规约 → 剥离 → 断言）。

## 用途

「全流程中文输出」的唯一交付出口门禁，挂载于管家**「④ 输出规约」集群**。
把 L1 规约、L2 剥离、L2 断言串成一条可阻断的流水线，保证交付正文是真正的中文书写，
而不是「看着像中文、其实夹着成句英文」。

**设计前提**：本仓库技术文档实测中文占比只有 25%~40%，拉丁字母几乎全是路径、命令、JSON 键与技能 id。
所以门禁判据只能是**剥离非散文成分之后的待检正文占比**，不能按整体字符占比一刀切。

## 使用方式

门禁本身不带脚本，判定由三个环节的脚本物理承载：

```bash
python3 skills/strip-non-prose-scope/scripts/strip_scope.py --file <文件> --json
python3 skills/verify-chinese-output/scripts/verify_chinese.py --file <文件> --json
```

## 组成

| 组成 | 级别 | 职责 |
| :--- | :--- | :--- |
| `chinese-end-to-end` | L1 | 散文一律中文；标识符保留原文但首现必须紧跟中文释义，缩写首现必须给中文全称 |
| `strip-non-prose-scope` | L2 | 按固定顺序剥离代码块、行内代码、URL、文件路径，产出待检正文 |
| `verify-chinese-output` | L2 | 三项硬断言：CJK 占比 ≥ 0.85、非白名单拉丁词 = 0、缩写必须有中文释义 |

## 两条红线

1. **代码块与命令原文豁免**：` ``` ` 围栏内的源码、shell 命令、JSON 载荷不得翻译、不得改写，也不参与占比判定。
2. **白名单外拉丁词零容忍**：断言 2 为严格档，无宽容参数，不存在「少量英文可接受」的口子。

第三条纪律：**不得用机器翻译腔凑中文占比**。缩写该给的是中文全称（如命令行界面（CLI）），
不是把标识符硬译掉或用冗词给分母灌水。

## 输出字段

| 字段 | 来源 | 含义 |
| :--- | :--- | :--- |
| `scope_text` | `strip-non-prose-scope` | 剥离四类非散文成分后的待检正文 |
| `stripped` | `strip-non-prose-scope` | 四类剥离计数 |
| `whitelist_hits` | `strip-non-prose-scope` | 待检正文命中的白名单专有名词 |
| `success` / `cjk_ratio` / `scope_len` | `verify-chinese-output` | 放行结论、中文占比与待检正文长度 |
| `violations` / `checks` | `verify-chinese-output` | 违规明细（`kind` / `token` / `index` / `snippet`）与三项断言逐项判定 |

## 退出码

| 码 | 含义 | 门禁动作 |
| :--- | :--- | :--- |
| 0 | 三项断言全部通过 | 放行交付 |
| 1 | 存在违规（占比不达标 / 非白名单拉丁词 / 缩写无中文释义） | 阻断，按 `violations` 改写后重跑 |
| 2 | 输入缺失、文件不存在不可读，或剥离器不可用 | 阻断，先补齐输入 |

## 上下游

- 上游：`chinese-end-to-end`（L1 规约）、`REQ-BUTLER-ZHFLOW-019`（需求基线）。
- 下游：管家「④ 输出规约」出口，与 `standard-output-framework`、`iconized-output-showcase`、
  `tail-metrics-showcase` 同集群协同。
