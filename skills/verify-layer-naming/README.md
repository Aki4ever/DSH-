# verify-layer-naming

L2 工序动作：**执行层命名整改断言器**——合规率、旧名残留、登记表三项硬断言。

## 用途

回答一个只能用实数回答的问题：**整改之后，命名真的全合规、旧名真的清干净了吗？**

| # | 断言 | 判据 |
| :---: | :--- | :--- |
| 1 | `naming_compliant` | 合规率 == 1.0000 且 `violations` 为空 |
| 2 | `no_dangling_ref` | `retired-names.json` 每个旧名的全仓**词边界**命中数 == 0 |
| 3 | `registry_clean` | `execution-layers.json` 零违规 |

## 为什么旧名扫描必须按词边界

追加后缀式改名会让新名把旧名整体包含为自己的前缀。第 2 项若按子串扫描，
会把已经合规的新名全部误报成残留引用——实测中这一条在没有词边界时误报了 **47 个文件**，
加词边界后归零。一个会把合规产物报成违规的检测器比没有检测器更糟：它会逼人忽略它的输出。

正则：`(?<![a-z0-9-])旧名(?![a-z0-9-])`。

## 使用方式

```bash
python3 skills/verify-layer-naming/scripts/verify_naming.py --strict --json
```

## 实测基线

| 时点 | `naming_compliant` | `no_dangling_ref` | `registry_clean` | 退出码 |
| :--- | :--- | :--- | :--- | ---: |
| 整改前 | ❌ 0.9811（156/159） | ✅ 0 个旧名 | ✅ 0 条 | 1 |
| 整改后 | ✅ **1.0000（160/160）** | ✅ 3 个旧名 / 残留 0 | ✅ 0 条 | **0** |

**可证伪性**：人为在 `docs/operations/workflows.md` 注入一行含旧名的注释后重跑，
`no_dangling_ref` 立刻转 ❌、`dangling_total` 由 0 变 1；删除后恢复 ✅。

## 输出字段

```json
{"success":true,"verdict":"naming_verified",
 "compliance":{"total":160,"compliant":160,"violations":0,"compliance_rate":1.0},
 "retired_names":["..."],"dangling_total":0,
 "checks":[{"name":"naming_compliant","pass":true,"detail":"合规率 1.0000（160/160）"}]}
```

`checks[].name` 闭集：`naming_compliant` / `no_dangling_ref` / `registry_clean`。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 三项断言全过，`verdict = naming_verified` |
| 1 | 任一断言失败，`verdict = naming_not_verified` |
| 2 | 输入不可读（判据模块缺失、catalog / 词表 / 登记表缺失或不可解析） |

## 上下游

- 上游：`capability-naming-policy`（口径）、`audit-layer-naming`（判据实现 `naming_rules.py`）。
- 下游：`layer-naming-guard`（L3 门禁把它作为放行前置）。

## 边界

- 只断言不整改，不写任何文件；
- 判据复用不另抄；
- 旧名必须按词边界扫描；
- 断言的是实数不是声称（必须打印分子分母）；
- 零旧名不判失败（从未整改过的仓库自动成立）。
