# audit-layer-naming

L2 工序动作：**全量执行层命名体检器**——按四要素与四种命名形态逐条扫描，输出带 `file:line` 的违规清单。

## 用途

`capability-naming-policy` 的物理执行层。只做一件事：**把违规找出来，并说清违规在哪条判据、哪个文件、第几行**。

| 不做 | 归谁 |
| :--- | :--- |
| 改名整改 | `rename-execution-layer` |
| 合规率与悬空引用断言 | `verify-layer-naming` |
| 文档渲染 | `render-capability-naming` |

## 判据实现只有一份

规则引擎在 `skills/audit-layer-naming/scripts/naming_rules.py`，是全池唯一实现。
`verify-layer-naming` 与 `render-capability-naming` 都用 `importlib` 加载这同一份模块。
两份判据必然漂移，漂移之后同一个技能会「体检合规、门禁违规」。

## 使用方式

```bash
# 全量体检
python3 skills/audit-layer-naming/scripts/audit_naming.py --all --json

# 只看形态类违规
python3 skills/audit-layer-naming/scripts/audit_naming.py --all --codes shape_action,shape_orchestration

# 大整改时只看前 10 条
python3 skills/audit-layer-naming/scripts/audit_naming.py --all --limit 10 --json
```

## 违规码闭集

| 违规码 | 判据 |
| :--- | :--- |
| `catalog_id_empty` | catalog 中 id 为空 |
| `syntax_charset` | id 不匹配 `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` |
| `segments` | 段数不在 2~5 且不在单段白名单 |
| `length` | 长度不在 3~48 |
| `banned_word` | 命中禁词表 |
| `synonym_alias` | 首段是同义组别名（应归一为保留词） |
| `shape_action` | L2 首段不在动词表内 |
| `shape_orchestration` | L3 首段非动词且末段非编排名词 |
| `shape_l4` | L4 id 不是 `dsh-butler` |
| `level_prefix` | description 未以登记层级前缀开头 |
| `description_too_short` | description < 20 字节 |
| `owner_missing` | L1/L2 无 composition 引用，或 L3 无集群归属 |
| `dir_missing` | `skills/<id>/` 不存在（仅 local-pool） |
| `frontmatter_mismatch` | SKILL.md `name` 与 catalog id 不一致 |
| `near_duplicate` | 词元集合去重后拼接结果相同 |
| `layer_unknown` | 登记表 layer 不在六层闭集内 |
| `registry_grammar` | 登记 id 既非 kebab-case 也非 `<cli-id>:<subcommand>` |

## 实测基线

| 时点 | 总数 | 合规 | 合规率 | 违规码分布 |
| :--- | ---: | ---: | ---: | :--- |
| 整改前 | 159 | 156 | 0.9811 | `shape_action` 1、`shape_orchestration` 2、`synonym_alias` 1 |
| 整改后 | 160 | 160 | **1.0000** | 无 |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 零违规，`verdict = naming_compliant` |
| 1 | 存在违规，`verdict = naming_violations_found` |
| 2 | 输入不可读（词表 / catalog 缺失或不可解析、判据模块缺失） |

## 上下游

- 上游：`capability-naming-policy`（四要素与四种形态的口径）。
- 下游：`rename-execution-layer`（按清单整改）、`verify-layer-naming`（断言合规率与悬空引用）、`layer-naming-guard`（L3 门禁）。

## 边界

- 只读诊断，不写文件、不改名、不重建索引；
- 不内置兜底词表：真相源 JSON 缺失即退 2；
- 只校验「做什么」的前缀与字节数，不评价描述写得好不好；
- 只依赖 catalog / 磁盘 / 词表 / 登记表四处事实，同输入恒得同结论。
