# execution-tree-guard

L3 复合流程：执行层树门禁。

## 用途

执行层变更后强制重建并断言树与索引一致；手写集群表一律阻断。

## 组成

| 组成 | 级别 | 职责 |
| :--- | :--- | :--- |
| `tree-update-mandatory` | L1 | 改能力必须改树的规约 |
| `register-execution-layer` | L2 | 非技能层登记 |
| `build-execution-tree` | L2 | 生成树与受管区块 |
| `verify-execution-tree` | L2 | 六项一致性断言 |

## 使用方式

```bash
python3 skills/build-execution-tree/scripts/build_tree.py
python3 skills/verify-execution-tree/scripts/verify_tree.py
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 登记表合法、树已重建、六项断言全过 |
| 1 | 任一步失败（可定位到文件与行号或对象 id） |

## 上下游

- 上游：`build-execution-tree`、`verify-execution-tree`。
- 下游：所有执行层变更的交付前置。
