# detect-layer-coupling

L2 工序动作：五类耦合检测（DC-01 ~ DC-05）。

## 五类判据

| 类别 | `kind` | 判据 |
| :--- | :--- | :--- |
| 逆向依赖 | `reverse_dependency` | 低层技能的 composition 引用更高层技能 |
| 依赖环 | `dependency_cycle` | composition 有向图成环 |
| 跨层跳跃 | `cross_layer_jump` | L1/L2 直接引用 L4 中枢 |
| 隐式耦合 | `implicit_dependency` | 脚本 importlib 加载 `skills/<V>/scripts/`，但 `<V>` 不在自身 composition 中 |
| 共享可变状态 | `shared_mutable_state` | ≥2 个技能写同一产物路径，且有写入方未登记 `[shared-resource]` |

## 使用方式

```bash
python3 skills/detect-layer-coupling/scripts/detect_coupling.py --json
python3 skills/detect-layer-coupling/scripts/detect_coupling.py --skill qa-gatekeeper
python3 skills/detect-layer-coupling/scripts/detect_coupling.py --root /tmp/fakerepo
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 无违规 |
| 1 | 有违规（`violations` 含 kind/from/to/evidence/file/line） |
| 2 | 输入缺失或不可读 |

## 上下游

- 上游：`build-layer-graph`。
- 下游：`verify-decoupling`、`decoupling-guard`。
