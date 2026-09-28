# build-layer-graph

L2 工序动作：层间依赖图生成。

## 用途

把 `composition` 契约变成可计算的图，供检测器与断言共用一份输入。

## 使用方式

```bash
python3 skills/build-layer-graph/scripts/build_layer_graph.py
python3 skills/build-layer-graph/scripts/build_layer_graph.py --check
```

## 输出字段

`nodes`（id/level/layer/scope/composition）/ `edges`（from/to/kind）/ `layers`（各层节点数）/
`edge_count` / `non_skill_nodes` / `dangling_dependencies` / `skipped`。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 写盘成功，或 `--check` 已最新 |
| 1 | 输入缺失/不可读，或 `--check` 陈旧 |
| 2 | catalog 缺少 `skills` 字段 |

## 上下游

- 上游：`layer-decoupling-policy`。
- 下游：`detect-layer-coupling`、`verify-decoupling`。
