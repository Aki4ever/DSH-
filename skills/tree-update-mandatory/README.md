# tree-update-mandatory

L1 原子规约：执行层树与索引同步强制。

## 用途

规定「改完能力必须改树」是交付的一部分：任何执行层条目新增或优化后，
必须刷新 `skill-catalog.json`、`execution-layers.json` 与 `execution-tree.json`。

## 三条硬规则

| 编号 | 规则 |
| :--- | :--- |
| 1 | 树与索引刷新失败 = 交付失败 |
| 2 | 禁止手写树；文档展示必须来自受管区块 |
| 3 | 出现新执行层形态时先登记层定义，再挂条目 |

## 上下游

- 上游：无（原子基元）。
- 下游：`register-execution-layer`、`build-execution-tree`、`execution-tree-guard`。
