# decoupling-guard

L3 复合流程：执行层解耦门禁。

## 用途

执行层变更后强制建图、检测并断言五类耦合违规为零；契约外耦合一律阻断。

## 组成

| 组成 | 级别 | 职责 |
| :--- | :--- | :--- |
| `layer-decoupling-policy` | L1 | 五类判据与共享资源登记规约 |
| `build-layer-graph` | L2 | 契约依赖图生成 |
| `detect-layer-coupling` | L2 | 五类违规检测（含隐式耦合） |
| `verify-decoupling` | L2 | 零违规断言与显式豁免 |

## 使用方式

```bash
python3 skills/build-layer-graph/scripts/build_layer_graph.py
python3 skills/verify-decoupling/scripts/verify_decoupling.py
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 图最新、零违规、断言通过 |
| 1 | 图陈旧 / 有未豁免违规 / 断言失败 |

## 上下游

- 上游：`layer-decoupling-policy`、`build-layer-graph`、`detect-layer-coupling`、`verify-decoupling`。
- 下游：所有执行层变更的交付前置。
