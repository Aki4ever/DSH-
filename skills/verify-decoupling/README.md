# verify-decoupling

L2 工序动作：解耦零违规断言。

## 五项断言

`no_reverse_dependency` / `no_dependency_cycle` / `no_cross_layer_jump` /
`no_implicit_dependency` / `no_shared_mutable_state`。

## 使用方式

```bash
python3 skills/verify-decoupling/scripts/verify_decoupling.py
python3 skills/verify-decoupling/scripts/verify_decoupling.py --allow shared_mutable_state
```

## 输出字段

`blocking_count` / `waived_count` / `checks` / `violations` / `waived`。

**豁免必须留痕**：被 `--allow` 放过的条目进入 `waived` 数组原样输出，不被隐藏。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 无未豁免违规 |
| 1 | 存在未豁免违规 |
| 2 | `--allow` 含未知类别，或检测器/输入缺失 |

## 上下游

- 上游：`detect-layer-coupling`。
- 下游：`decoupling-guard`。
