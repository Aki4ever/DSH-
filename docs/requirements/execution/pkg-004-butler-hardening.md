# PKG-004 管家管控强化包执行明细

| 字段 | 值 |
| --- | --- |
| 执行包编号 | PKG-004 |
| 关联需求 | REQ-BUTLER-TREE-020、REQ-BUTLER-ZHFLOW-019、REQ-BUTLER-ANTIPATTERN-021、REQ-BUTLER-HOTRELOAD-022 |
| 需求基线版本 | v0.2.0 |
| 实施顺序 | TREE-020 → ZHFLOW-019 → ANTIPATTERN-021 → HOTRELOAD-022 |
| 已拍板方案 | 中文严格档（白名单外拉丁词 = 0）；无反馈 20 步 / 120 秒；死循环 ≥5 次；宿主 bundle 列入必重启 |
| 唯一 Owner Skill | `dsh-butler` (L4) |
| 状态 | 实施中 |

## 1. 范围

- **纳入**：新增 17 个技能（L1 4 / L2 9 / L3 4）、`docs/operations/execution-layers.json`（五层登记表）、`docs/operations/execution-tree.json/md`（唯一真相源）、catalog 新增 `layer` 字段、`dsh-butler` 与 `place-skill-into-cluster` 的手写集群表改为受管区块/指针。
- **排除**：宿主侧重启机制本身（DSH 应用 bundle 与 Web 产物不在本仓库内）；本次验收口径限定为「仓库可见范围内的不必要重启」。

## 2. 前置条件

| 编号 | 前置条件 | 验证方式 |
| --- | --- | --- |
| PRE-1 | PKG-003 已交付，catalog `total_skills == 109` | 读取 catalog JSON |
| PRE-2 | 口径门禁可用（`catalog-consistency-guard`） | `./bin/skill-pool consistency` exit 0 |
| PRE-3 | 粒度门禁可用（`atomic-fission-guard`） | 脚本存在且 exit 0 |
| PRE-4 | 集群归属表由 `build-execution-tree` 独占持有 | 集群枚举无第二份手写副本 |

## 3. 授权与权限

- 已确认：写入 `skills/**`、`docs/operations/**`、`docs/requirements/**`、`skills/dsh-butler/SKILL.md` 受管区块。
- 未确认即禁止：`git commit` / `git push`；删除既有技能；改动宿主侧文件。

## 4. 有序任务清单

| 任务 ID | 目标 | 产出路径 | 绑定探针 | 依赖 |
| --- | --- | --- | --- | --- |
| T01 | 树同步强制规约 | `skills/tree-update-mandatory/` | 正则 | — |
| T02 | 非技能执行层登记 | `skills/register-execution-layer/scripts/register_layer.py` → `docs/operations/execution-layers.json` | 文件字节 + 幂等 | T01 |
| T03 | 执行层建树（含受管区块注入） | `skills/build-execution-tree/scripts/build_tree.py` → `execution-tree.json/md`、`dsh-butler/SKILL.md` | 文件字节 + 幂等 | T02 |
| T04 | 树一致性六项断言 | `skills/verify-execution-tree/scripts/verify_tree.py` | 退出码 | T03 |
| T05 | 树门禁总控 | `skills/execution-tree-guard/` | 退出码 | T04 |
| T06 | catalog 增 `layer` 字段 | `skills/dsh-butler/scripts/sync_catalog.py` | 退出码 | T03 |
| T07 | 全流程中文规约 | `skills/chinese-end-to-end/` | 正则 | — |
| T08 | 非散文成分剥离 | `skills/strip-non-prose-scope/scripts/strip_scope.py` | 退出码 | T07 |
| T09 | 中文三项断言 | `skills/verify-chinese-output/scripts/verify_chinese.py` | 退出码 | T08 |
| T10 | 中文输出门禁 | `skills/chinese-output-guard/` | 退出码 | T09 |
| T11 | 反例清单规约 | `skills/anti-pattern-policy/` | 正则 | — |
| T12 | 七条反例检测 | `skills/detect-forbidden-state/scripts/detect_forbidden.py` | 退出码 | T11 |
| T13 | 零命中断言 | `skills/verify-no-forbidden-event/scripts/verify_no_forbidden.py` | 退出码 | T12 |
| T14 | 反例门禁 | `skills/anti-pattern-guard/` | 退出码 | T13 |
| T15 | 热更优先规约 | `skills/prefer-hot-reload-policy/` | 正则 | — |
| T16 | 变更处置判定 | `skills/classify-change-scope/scripts/classify_scope.py` | 退出码 | T15 |
| T17 | 重启必要性断言 | `skills/verify-no-unnecessary-restart/scripts/verify_no_restart.py` | 退出码 | T16 |
| T18 | 零重启门禁 | `skills/zero-restart-guard/` | 退出码 | T17 |
| T19 | 终局 fan-in | catalog / index / tree / docs | 五门禁全 0 | T01–T18 |

## 5. 精确执行动作（T19）

```bash
python3 skills/dsh-butler/scripts/sync_catalog.py
python3 skills/build-inverted-index/scripts/build_index.py
python3 skills/build-execution-tree/scripts/build_tree.py
python3 skills/verify-execution-tree/scripts/verify_tree.py
python3 skills/render-catalog-docs/scripts/render_docs.py
./bin/skill-pool validate
./bin/skill-pool consistency
python3 skills/audit-all-skills-compliance/scripts/audit_compliance.py
```

## 6. 失败处理与恢复

| 失败任务 | 判定 | 恢复动作 |
| --- | --- | --- |
| T02 | 登记条目 path 不存在 | 修正 path 或改 `source=host`；不允许登记幽灵条目 |
| T03 | 受管区块重复注入或新起一段 | 检查 `TREE:BEGIN/END` 是否行锚定成对；修复后重建 |
| T04 | C3 孤儿原子 | 把该原子接入合适的父级 `composition`，或降级为 `@system`；**不允许**把 C3 改成警告 |
| T04 | C7 手写集群枚举漂移 | 删除手写表并改由受管区块承载，不要逐行改对 |
| T09 | 合规中文样本被判违规 | 检查白名单是否覆盖必要的专有名词；不得放宽「白名单外拉丁词 = 0」 |
| T12 | 某条 AP 无法命中 | 该条反例的判据不合格，回退到 `anti-pattern-policy` 重写判据 |
| T17 | 出现不必要重启 | 改判定表或改变更方式；不允许给重启补一个假命令 |
| T19 | 任一命令非 0 | 修复上游后从 T19 重跑 |

## 7. 共享资源键

| 资源键 | 说明 | 串行要求 |
| --- | --- | --- |
| `res:skill-catalog.json` | 全量编目（含 `layer` 字段） | 仅 `sync_catalog.py` 写入 |
| `res:execution-layers.json` | 五层登记表 | 仅 `register_layer.py` 写入 |
| `res:execution-tree.json/md` | 树唯一真相源 | 仅 `build_tree.py` 写入 |
| `res:dsh-butler/SKILL.md` | 受管集群区块 | 仅 `build_tree.py` 写入；其余内容人工维护 |
| `res:skill-index.json` | 检索索引 | 仅 `build_index.py` 写入 |
| `res:product.md` | catalog 受管区块 | 仅 `render_docs.py` 写入 |
