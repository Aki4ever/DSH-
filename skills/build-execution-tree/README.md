# build-execution-tree

L2 工序动作：执行层树生成。

## 用途

合并 `skill-catalog.json`（技能层）与 `execution-layers.json`（其余五层），生成：

- `docs/operations/execution-tree.json` —— 机器可读的唯一真相源
- `docs/operations/execution-tree.md` —— 人读视图
- `skills/dsh-butler/SKILL.md` 的 `TREE:BEGIN~TREE:END` 受管集群区块

集群归属表**内置于脚本**，是集群归属的唯一判据。

## 使用方式

```bash
python3 skills/build-execution-tree/scripts/build_tree.py
python3 skills/build-execution-tree/scripts/build_tree.py --check
```

## 输出与 issues

`counts`（六层计数）、`cluster_map`、`layers`、`skill_forest`、`edges`、`issues`。

`issues` 类型：`unassigned_l3`（L3 未归集群）、`orphan_atom`（本地 L1/L2 无父级）、
`composition_cycle`（依赖成环）、`missing_dependency`（引用不存在）、`max_depth`。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 生成成功，或 `--check` 时已最新 |
| 1 | 输入缺失/非法，或 `--check` 检测到陈旧 |

## 上下游

- 上游：`register-execution-layer`。
- 下游：`verify-execution-tree`、`execution-tree-guard`。
