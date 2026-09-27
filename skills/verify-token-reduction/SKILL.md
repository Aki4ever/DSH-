---
name: verify-token-reduction
level: L2
composition:
  - measure-token-budget
  - prune-redundant-context
description: 工序动作级技能：对裁剪前后文本同时断言 token 降幅达标与等价能力存活（cases.json 的 requires 证据串全部命中），任一条不成立即退 1 阻断放行。
---

# Verify Token Reduction (降幅与等价能力双断言门禁)

## Overview

本技能是 L2 工序动作级门禁，回答「这次裁剪到底省没省、有没有砍掉能力」。
它把 `measure-token-budget` 的数值口径与 `prune-redundant-context` 的裁剪产物合起来检验：
**降幅达标** 与 **等价能力证据全部存活** 两条同时成立才放行。

## When to Use

- `prune-redundant-context` 产出裁剪结果后，需要放行或阻断时；
- 需求 `REQ-BUTLER-TOKENBUDGET-018` 这类「token 结构性下降」任务的验收环节；
- 需要提交「同等能力」物理证据（证据串存活清单）时。

**触发禁区**：本技能只做断言，不裁剪、不改写、不生成修复补丁；证据串本身是否覆盖全部能力由 cases.json 作者负责。

## Assertions (断言判定)

| # | 断言 | 判据 | 不成立时 |
| :--- | :--- | :--- | :--- |
| 1 | 降幅达标 | `after_tokens <= before_tokens * (1 - target)` | 退 1 |
| 2 | 能力不变 | 每条 case 的每个 `requires` 字符串仍出现在 after 拼接文本中 | 退 1 |
| 3 | 证据完整 | 每条缺失证据以 `{case, needle}` 逐条列出，不做归并 | 记入 `capability.missing` |

`cases.json` 结构：`{"cases":[{"id":"...","requires":["必须仍然出现的字符串", ...]}]}`。
token 口径沿用唯一标准公式（汉字约 1 token/字，ASCII 约 4 字节 1 token），与另两个脚本逐字一致；它是**确定性估算**，不是真实分词器。

## Workflow

```mermaid
flowchart TD
    A[--before 与 --after 与 --cases] --> B{参数与文件是否齐备?}
    B -->|否| C[输出 error 并 Exit 2]
    B -->|是| D[解析 cases.json 并校验结构]
    D -->|非法| C
    D --> E[按同一公式测算 before_tokens 与 after_tokens]
    E --> F{after <= before*(1-target)?}
    F -->|否| G[降幅不足: Exit 1]
    F -->|是| H[逐 case 逐 requires 做子串存活检查]
    H --> I{是否存在缺失证据?}
    I -->|是| J[列出 case/needle 并 Exit 1]
    I -->|否| K[输出 success=true: Exit 0]
```

1. `[probe:file]` 校验 `--before`、`--after`、`--cases` 三类路径齐备且全部存在，缺任一即退 2；
2. `[probe:length]` 校验 `--target` 落在 (0, 1) 开区间，越界即退 2；
3. `[probe:regex]` 解析 `cases.json`，断言顶层为对象且 `cases` 为数组、每条 `requires` 为字符串数组，非法即退 2；
4. `[probe:length]` 用同一公式测算 `before_tokens` 与 `after_tokens`，断言 `after_tokens <= before_tokens * (1 - target)`；
5. `[probe:regex]` 逐 case 逐 `requires` 在 after 拼接文本中做子串包含判定，缺失项以 `{case, needle}` 记录；
6. `[probe:length]` 统计 `cases_total` 与 `cases_passed`，断言 `cases_passed + 缺失 case 数 = cases_total`；
7. `[probe:exitcode]` 输出 `success`/`before_tokens`/`after_tokens`/`saved_ratio`/`target`/`capability`/`checks`；两条断言全过退 0，否则退 1。

## Usage & Script

```bash
# 通过：降幅达标且 3 条证据串全部存活（先写 cases.json）
printf '%s' '{"cases":[{"id":"c1","requires":["Token Estimation Formula"]},{"id":"c2","requires":["Exit Code 0"]},{"id":"c3","requires":["token-budget-policy"]}]}' > /tmp/token-cases.json
python3 skills/verify-token-reduction/scripts/verify_reduction.py --before /tmp/prune-sample.md --after /tmp/prune-out-1.md --target 0.40 --cases /tmp/token-cases.json --json

# 阻断：证据串被裁掉时退出码为 1
python3 skills/verify-token-reduction/scripts/verify_reduction.py --before /tmp/prune-sample.md --after /tmp/prune-out-1.md --target 0.40 --cases /tmp/token-cases-bad.json --json
```

## Success Contract

- Exit Code 0：两条断言全部成立（降幅达标 + 全部 `requires` 证据串存活）；
- Exit Code 1：降幅不足，或存在能力缺失（`capability.missing` 非空）；
- Exit Code 2：参数/文件缺失（缺参、路径不存在、`--target` 越界、`cases.json` 结构非法）；
- stdout 恒为合法 JSON，`checks` 逐条给出断言名、布尔结论与判据明细。

## Boundaries & Constraints

- 只读断言：不写任何文件、不修改 before/after、不自动裁剪「补救」；
- 证据串语义等价性由 cases.json 承担，本技能只证明「证据串存活」，不证明「证据串覆盖全部能力」；
- 禁止以「证据串没写」为由放行：缺失即阻断，宁可退 1 也不放行；
- `saved_ratio` 为 `(before - after) / before`，`before_tokens = 0` 时记 0.0。
