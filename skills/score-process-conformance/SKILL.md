---
name: score-process-conformance
level: L2
composition:
  - process-conformance-policy
description: 工序动作级技能(L2)：流程合规打分器。按权重计算分子与分母（na 权重从分母扣除），输出逐项 pass/fail/na 与得分；通过条件为得分 ≥ 85 且全部必需项 pass（必需项一票否决）；输出必须打印分子/分母/na 扣除项，禁止只给一个百分数；返回退出码 0/1/2。
---

# Score Process Conformance (流程合规打分器)

## Overview

本技能把证据包变成**一个分数 + 逐项判定**。它不做取证、不写整改。

**输出必须打印分子 / 分母 / na 扣除项。** 只给一个百分数的打分不可复核——
分数是算出来的，算式的每一项都必须看得见。

## When to Use

- 需要回答「这次流程合规打几分」时；
- 需要判断某一步是否属于「必需项未过」时。

**触发禁区**：不取证、不整改、不改证据包。

## Workflow

```mermaid
flowchart TD
    A[evidence-bundle.json] --> B{可解析?}
    B -->|否| C[Exit 2]
    B -->|是| D{steps 非空?}
    D -->|否| E[Exit 2]
    D -->|是| F[遍历: 累加 total 与 na 权重]
    F --> G{status?}
    G -->|pass| H[numerator += weight]
    G -->|na| I[na_weight += weight]
    G -->|fail| J[记入 failed 与 required_failed]
    H --> K[denominator = total - na_weight]
    I --> K
    J --> K
    K --> L[score = round(numerator/denominator*100)]
    L --> M{score >= 85 且 required 全过?}
    M -->|是| N[Exit 0]
    M -->|否| O[Exit 1 并列出失败项]
```

1. `[probe:file]` 读取证据包，缺失或不可解析即退 2；
2. `[probe:length]` 断言 `steps` 非空，空即退 2（**空证据不可能合规**）；
3. `[probe:length]` 累加总权重并断言等于 100，不等于 100 即判步骤表与本体不一致；
4. `[probe:length]` 累加 `na` 权重并从分母扣除，断言分母 = 总权重 − na 权重；
5. `[probe:length]` 计算分子（pass 权重和）与得分，三者必须同时打印；
6. `[probe:regex]` 收集 `fail` 项并断言其带 `unverifiable` 标记；
7. `[probe:regex]` 收集 `required_failed`，断言必需项一票否决生效（有必需项失败即不通过）；
8. `[probe:exitcode]` 通过 = 得分 ≥ `pass_score` **且** 必需项全过；任一不满足即退 1；
9. `[probe:regex]` 输出 `arithmetic` 字段（形如 `80 / 95 = 84%（总权重 100，na 扣除 5）`）；
10. `[probe:length]` 断言同输入连跑两次得分与逐项判定逐字节相同。

## Usage & Script

```bash
python3 skills/score-process-conformance/scripts/score_conformance.py --bundle <证据包> --json
```

实测：空证据 → `20 / 100 = 20%`、必需项未过 `['S4','S6','S7','S8']`、退 1；
合规证据 → `100 / 100 = 100%`、必需项全过、退 0。

## Success Contract

| 退出码 | 含义 |
| :--- | :--- |
| 0 | 通过（`process_conformant`） |
| 1 | 未通过（附逐项明细） |
| 2 | 输入不可读（证据包缺失/不可解析、steps 为空） |

## Boundaries & Constraints

- **只打分**：不取证、不整改、不改文件；
- **算式必须公开**：分子、分母、na 扣除项缺一不可；
- **必需项一票否决**：不接受加权摊平；
- **确定性**：同输入逐字节同输出。
