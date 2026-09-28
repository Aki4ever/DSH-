# verify-token-reduction

L2 工序技能：token 降幅 + 等价能力双断言门禁。

## 用途

对裁剪前后的文本同时断言两件事：**降幅达标**（`after_tokens <= before_tokens * (1 - target)`）
与**能力不变**（`cases.json` 中每条 case 的每个 `requires` 字符串仍出现在 after 文本中）。
两条同时成立才放行，任一条不成立即退 1；它同时是「同等能力」这一主张的唯一物理证据来源。

## 使用方式

```bash
python3 skills/verify-token-reduction/scripts/verify_reduction.py \
  --before <before.md> --after <after.md> --target 0.40 --cases <cases.json> --json
```

`cases.json` 结构：

```json
{"cases": [{"id": "c1", "requires": ["必须仍然出现的字符串", "另一条证据串"]}]}
```

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `success` | 两条断言是否全部通过 |
| `before_tokens` / `after_tokens` | 裁剪前后估算 token |
| `saved_ratio` | 实际降幅，4 位小数 |
| `target` | 目标降幅（由 `--target` 给定） |
| `capability.cases_total` | case 总数 |
| `capability.cases_passed` | 全部 `requires` 存活的 case 数 |
| `capability.missing[]` | 缺失证据明细 `{case, needle}` |
| `checks[]` | 逐条断言：`{name, ok, detail}` |

token 口径：汉字约 1 token/字，ASCII 约 4 字节 1 token（确定性估算，非真实分词器）。

## 退出码表

| 退出码 | 含义 |
| :--- | :--- |
| 0 | 降幅达标且能力证据全部存活 |
| 1 | 降幅不足，或存在能力缺失（`capability.missing` 非空） |
| 2 | 参数/文件缺失：缺参、路径不存在、`--target` 越界、`cases.json` 结构非法 |

## 上下游

- 上游：`measure-token-budget`（数值口径）、`prune-redundant-context`（裁剪产物）。
- 下游：`token-economy-guard`（把本断言作为门禁放行条件）、`token-budget-policy`（裁剪裁决闭环）。
