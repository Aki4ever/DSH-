# render-capability-naming

L2 工序动作：**命名规范文档渲染器**——把 JSON 真相源单向渲染成本仓文档与知识库文档两份受管区块。

## 用途

| 目标 | 路径 |
| :--- | :--- |
| 本仓文档 | `docs/operations/capability-naming.md` |
| 知识库文档 | `<全局规则>/knowledge/common/capability_naming_spec.md` |

**单一真相源是 `docs/operations/capability-naming.json`。** 规则表不允许人工手写：
同一事实有两处写法必然漂移，漂移之后 audit 脚本与门禁脚本会对同一个技能给出两种结论。

## 知识库路径自动探测

| 序 | 候选 | 适用布局 |
| :---: | :--- | :--- |
| 1 | `$DSH_GLOBAL_RULES_DIR/knowledge/common` | 显式指定 |
| 2 | `<repo>/../全局规则/knowledge/common` | 合并前（`Skill池` 与 `全局规则` 平级） |
| 3 | `<repo>/../knowledge/common` | 合并后（仓库位于 `全局规则/skills`） |

全部不可用时只渲染本仓文档并告警，退出码仍为 0。

## 受管区块

文档 = 头部（版本块与分工说明）+ `<!-- CAPNAMING:BEGIN -->` 受管区块 + `<!-- CAPNAMING:END -->`。
重渲染只替换受管区块内部，**标记之外的人工内容保留**。

## 使用方式

```bash
# 渲染两份文档
python3 skills/render-capability-naming/scripts/render_naming_spec.py --write --json

# 漂移检测（CI / 门禁用）
python3 skills/render-capability-naming/scripts/render_naming_spec.py --check --json
```

## 实测基线

| 目标 | 字节 |
| :--- | ---: |
| `docs/operations/capability-naming.md` | 11906 |
| `全局规则/knowledge/common/capability_naming_spec.md` | 12874 |

第二次 `--check` → `verdict = in_sync`、`drift = 0`、退出码 0（幂等）。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 写盘成功，或 `--check` 下与真相源一致 |
| 1 | `--check` 下存在漂移（逐目标给出期望与实际字节数） |
| 2 | 输入不可读（真相源缺失/字段不全/受管标记为空、写盘失败） |

## 上下游

- 上游：`capability-naming-policy`（口径）、`audit-layer-naming`（合规快照的判据实现）。
- 下游：知识库与 `docs/operations/` 的人读入口。

## 边界

- 禁止双写：规则表只由 JSON 生成；
- 只替换受管区块，标记之外的人工内容必须保留；
- 知识库不可达不阻断；
- 不做命名判定、不改名；
- 快照必须是实时实数，不得写死；
- 幂等：连续两次渲染第二次必须 `drift = 0`。
