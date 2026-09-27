---
name: verify-layer-naming
level: L2
composition:
  - capability-naming-policy
  - audit-layer-naming
description: 工序动作级技能(L2)：执行层命名整改后的三项硬断言器——合规率必须为 1.0000、旧名残留引用必须为 0（按词边界扫描，避免把新名误判为旧名残留）、执行层登记表零违规；判据复用 audit-layer-naming 的 naming_rules.py，返回退出码 0/1/2。
---

# Verify Layer Naming (执行层命名整改断言器)

## Overview

本技能回答一个只能用实数回答的问题：**「整改之后，命名真的全合规、旧名真的清干净了吗？」**

它只做断言，不做整改、不做体检、不渲染文档。三项断言必须同时成立：

| # | 断言 | 判据 | 不成立的后果 |
| :---: | :--- | :--- | :--- |
| 1 | `naming_compliant` | 合规率 == 1.0000 且 `violations` 为空 | 还有执行层不合规 |
| 2 | `no_dangling_ref` | `retired-names.json` 里每个旧名的全仓词边界命中数 == 0 | 有引用还指向已经不存在的能力 |
| 3 | `registry_clean` | `execution-layers.json` 零违规 | 非技能执行层的层名或登记语法不合规 |

### 为什么旧名扫描必须按词边界

追加后缀式改名会让**新名把旧名整体包含为自己的前缀**。
第 2 项断言若按子串扫描，会把已经合规的新名全部误报成残留引用——
实测中这一条在没有词边界时误报了 **47 个文件**，加词边界后归零。
一个会把合规产物报成违规的检测器，比没有检测器更糟：它会逼人忽略它的输出。

### 判据实现复用，不另抄

第 1 项断言直接复用 `skills/audit-layer-naming/scripts/naming_rules.py`。
另抄一份判据必然漂移，漂移之后同一个技能会「体检合规、门禁违规」。

## When to Use

- 执行完一次命名整改，需要给出「整改成立」的可复算证据时；
- 交付验收需要同时给出合规率与悬空引用两项实数时；
- 作为 `layer-naming-guard` 门禁的最后一环，为放行提供依据时。

**触发禁区**：本技能只断言，**不改名、不体检出清单、不重建索引**；不负责判断某个旧名该改成什么（归 `rename-execution-layer`）。

## Workflow

```mermaid
flowchart TD
    A[技能池根目录] --> B{判据模块可读?}
    B -->|否| C[输出 rules_missing 并 Exit 2]
    B -->|是| D[复用 naming_rules.evaluate 全量判定]
    D --> E{合规率 == 1.0000?}
    E -->|否| F[记 naming_compliant 失败]
    E -->|是| G[读 retired-names.json 取旧名清单]
    G --> H[编译词边界正则 (?<![a-z0-9-])旧名(?![a-z0-9-])]
    H --> I[全仓扫描, 跳过 retired-names.json 自身]
    I --> J{旧名词边界命中数 == 0?}
    J -->|否| K[记 no_dangling_ref 失败并给出 file:line]
    J -->|是| L{登记表违规 == 0?}
    L -->|否| M[记 registry_clean 失败]
    L -->|是| N[三项全过: Exit 0 naming_verified]
    F --> O[Exit 1 naming_not_verified]
    K --> O
    M --> O
```

1. `[probe:file]` 加载 `skills/audit-layer-naming/scripts/naming_rules.py`，缺失即输出 `rules_missing` 并退 2（**绝不内置兜底判据**）；
2. `[probe:exitcode]` 调 `naming_rules.evaluate` 做一次全量判定，取回 `compliance` 与 `violations`，构成第 1 项断言的输入；
3. `[probe:length]` 断言 `compliance.violations == 0` 且 `compliance_rate == 1.0000`，输出实数合规率而非「已合规」字样；
4. `[probe:file]` 读 `docs/operations/retired-names.json` 取旧名清单；文件不存在即视为零旧名（尚未整改过），不断言失败；
5. `[probe:regex]` 为每个旧名编译词边界正则 `(?<![a-z0-9-])旧名(?![a-z0-9-])`，**禁止子串匹配**；
6. `[probe:length]` 遍历全仓文本文件（跳过 `.git` / `__pycache__` / `node_modules` 与 `retired-names.json` 自身），逐文件统计词边界命中数；
7. `[probe:regex]` 任一旧名命中即记 `no_dangling_ref` 失败，并给出 `文件:首行` 便于直接跳转修复；
8. `[probe:length]` 断言 `registry_violations` 为空，构成第 3 项断言；
9. `[probe:exitcode]` 三项全过输出 `verdict = naming_verified` 并退 0，任一失败输出 `naming_not_verified` 并退 1；
10. `[probe:exitcode]` `--strict` 与默认行为在断言集合上一致，差别只在是否把「零违规」作为放行前置；无论成败都不写任何文件。

## Usage & Script

```bash
# 标准断言（整改后放行前必跑）
python3 skills/verify-layer-naming/scripts/verify_naming.py --strict --json
```

实测输出（PKG-007 整改前 → 整改后）：

| 时点 | `naming_compliant` | `no_dangling_ref` | `registry_clean` | 退出码 |
| :--- | :--- | :--- | :--- | ---: |
| 整改前 | ❌ 合规率 0.9811（156/159） | ✅ 0 个旧名 | ✅ 0 条 | 1 |
| 整改后 | ✅ 合规率 1.0000（160/160） | ✅ 3 个旧名 / 残留 0 个 | ✅ 0 条 | **0** |

反向验证（可证伪）：人为在 `docs/operations/workflows.md` 末尾注入一行含旧名的注释后重跑，
`no_dangling_ref` 立刻转 ❌ 且 `dangling_total` 由 0 变 1；删除注入行后恢复 ✅。

## Success Contract

| 退出码 | 含义 |
| :--- | :--- |
| 0 | 三项断言全过（`verdict = naming_verified`） |
| 1 | 任一断言失败（`verdict = naming_not_verified`），`checks[]` 给出逐条实数证据 |
| 2 | 输入不可读（判据模块缺失、catalog / 词表 / 登记表缺失或不可解析） |

JSON 契约：`{"success","verdict","compliance":{...},"violation_codes":{},"violations":[],"retired_names":[],"dangling_references":{},"dangling_total","checks":[{"name","pass","detail"}]}`；
`checks[].name` 闭集为 `naming_compliant` / `no_dangling_ref` / `registry_clean`。

## Boundaries & Constraints

- **只断言不整改**：不写文件、不改名、不重建索引；
- **判据复用不另抄**：规则实现只来自 `naming_rules.py`，本技能不含第二份判据；
- **旧名必须按词边界扫描**：子串扫描会把追加后缀式改名的新名误报为残留，制造无法消除的假失败；
- **断言的是实数不是声称**：合规率必须打印分子分母，禁止只输出「已合规」；
- **零旧名不判失败**：从未整改过的仓库 `retired-names.json` 不存在，此时第 2 项断言自动成立；
- **确定性**：只依赖 catalog / 磁盘 / 词表 / 登记表四处事实，同输入恒得同结论。
