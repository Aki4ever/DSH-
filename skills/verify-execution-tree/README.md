# verify-execution-tree

L2 工序动作：执行层树一致性断言。

## 六项检查

| 编号 | 检查 | 失败含义 |
| :--- | :--- | :--- |
| C1 | 树的技能层计数 == catalog 计数 | 树落后于编目 |
| C2 | 每个 L3 技能恰属一个集群（L4 是树根，不参与归属） | 有 L3 未归类 |
| C3 | 无孤儿原子（本地 L1/L2 均有父级） | 存在无人调用的原子 |
| C4 | 无 composition 环 / 缺失依赖 | 依赖图不健康 |
| C5 | `build-execution-tree --check` 通过 | 受管区块或产物陈旧 |
| C6 | 登记表条目 layer 合法、repo 类 path 存在 | 登记表有脏数据 |
| C7 | 受管区块外无手写集群枚举 | 结构性漂移（与口径漂移同族） |

## 使用方式

```bash
python3 skills/verify-execution-tree/scripts/verify_tree.py
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 六项全部通过 |
| 1 | 任一项失败（输出含文件路径与行号或对象 id） |

## 上下游

- 上游：`build-execution-tree`。
- 下游：`execution-tree-guard`。
