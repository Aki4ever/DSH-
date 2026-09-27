# place-skill-into-cluster

「GitHub 技能引入管线」（REQ-BUTLER-IMPORT-012 / T19）第 4 步：定级挂载定位。

## 用途

读取 `docs/operations/skill-catalog.json`，输出该技能的集群归属建议：

- `cluster`：该技能的集群归属。**集群清单以 `docs/operations/execution-tree.json` 为唯一真相源**（本文件不再手写枚举，避免结构性漂移）；
- `level`：catalog 中的级别（可用 `--level` 覆盖判定口径）；
- `suggested_parents`：同级或上一级中触发词重合度最高的候选父级，最多 3 个；
- `composition_ok`：该技能 `composition` 引用的每个技能是否都真实存在于 catalog；
- `issues`：兜底归类、缺失依赖、无候选父级等需人工复核项。

**边界**：本技能**只做定位判定，不写任何文件**（`--dry-run` 与常规运行均如此，`wrote_files` 恒为 `false`）。真正的 composition 接线与集群落盘由人工/管家复核建议后执行。

## 使用方式

```bash
# 输出归属建议（不写盘）
python3 skills/place-skill-into-cluster/scripts/place_skill.py --name qa-gatekeeper --dry-run

# 未纳管技能必须被拒绝
python3 skills/place-skill-into-cluster/scripts/place_skill.py --name not-exist-skill --dry-run; echo "exit=$?"

# 覆盖级别口径
python3 skills/place-skill-into-cluster/scripts/place_skill.py --name qa-gatekeeper --level L3 --dry-run
```

| 参数 | 说明 |
| :--- | :--- |
| `--name` | 技能名，必须已存在于 catalog（必填） |
| `--level` | 级别覆盖 `L1`/`L2`/`L3`/`L4`，缺省取 catalog 级别；非法值退出 1 |
| `--dry-run` | 只输出建议不写文件（本技能任何模式都不写文件） |
| `--json` | 以 JSON 输出（默认行为，保留以兼容脚本化调用） |

## 退出码表

| 退出码 | 语义 |
| :--- | :--- |
| `0` | 定位成功且 composition 合法 |
| `1` | catalog 缺失/不可解析、技能不在 catalog 中、或 composition 引用了不存在的技能 |

## 上下游

- **上游**：`normalize-skill-contract` 完成契约归一的技能；数据源 `docs/operations/skill-catalog.json`。
- **下游**：人工/管家按建议执行 composition 接线；随后由 L3 `skill-import-pipeline` 收敛到 `./bin/skill-pool validate` 与 `./bin/skill-pool consistency` 门禁。
