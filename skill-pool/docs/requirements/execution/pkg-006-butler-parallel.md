# PKG-006 执行层解耦与并行治理包执行明细

| 字段 | 值 |
| --- | --- |
| 执行包编号 | PKG-006 |
| 关联需求 | REQ-BUTLER-DECOUPLE-027、REQ-BUTLER-MULTIINSTANCE-028、REQ-BUTLER-PARALLELLOCK-029（另有 UISURFACE-026 为宿主侧外部依赖，不在本包实施） |
| 需求基线版本 | v0.2.0 |
| 实施顺序 | DECOUPLE-027 → MULTIINSTANCE-028 → PARALLELLOCK-029 |
| 自行拍定方案 | 锁粒度=共享资源键；加锁顺序=字典序；超时 300 秒；死循环复用 AP-01；A 组只登记不打补丁 |
| 唯一 Owner Skill | `dsh-butler` (L4) |
| 状态 | 实施中 |

## 1. 范围

- **纳入**：新增 14 个技能（L1 3 / L2 8 / L3 3）、产物 `docs/operations/layer-graph.json` 与 `instance-safety.json`、`dsh-butler` 的解耦/实例/并行三道门禁接线。
- **排除**：宿主侧 U1~U3（状态栏字体 / 空闲价模块 / 任务列表常显）——落点在已签名应用包与社区插件 `dsh-bottom-info-bar`，本仓库只登记与定义契约。

## 2. 前置条件

| 编号 | 前置条件 | 验证方式 |
| --- | --- | --- |
| PRE-1 | PKG-005 已交付，catalog `total_skills == 141` | 读 catalog JSON |
| PRE-2 | 执行层树可用（`execution-tree.json`） | `verify_tree.py` exit 0 |
| PRE-3 | 反例层可用（AP-01 判据） | `anti-pattern-policy` 存在 |
| PRE-4 | 实例安全与依赖图产物可写 | `docs/operations/` 可写 |

## 3. 授权与权限

- 已确认：写 `skills/**`、`docs/operations/**`、`docs/requirements/**`、`dsh-butler` 受管区块。
- 未确认即禁止：`git commit` / `git push`；改动宿主应用包与插件生成缓存。

## 4. 有序任务清单

| 任务 ID | 目标 | 产出路径 | 绑定探针 | 依赖 |
| --- | --- | --- | --- | --- |
| T01 | 解耦规约（五类判据） | `skills/layer-decoupling-policy/` | 正则 | — |
| T02 | 层间依赖图生成（幂等） | `skills/build-layer-graph/scripts/build_layer_graph.py` → `layer-graph.json` | 文件字节 + 幂等 | T01 |
| T03 | 五类耦合检测（真扫描） | `skills/detect-layer-coupling/scripts/detect_coupling.py` | 退出码 | T02 |
| T04 | 解耦断言 | `skills/verify-decoupling/scripts/verify_decoupling.py` | 退出码 | T03 |
| T05 | 解耦门禁 | `skills/decoupling-guard/` | 退出码 | T04 |
| T06 | 实例安全规约（三档） | `skills/instance-pool-policy/` | 正则 | T05 |
| T07 | 实例安全分档扫描 | `skills/classify-instance-safety/scripts/classify_instance_safety.py` → `instance-safety.json` | 文件字节 + 幂等 | T06 |
| T08 | 声明一致性断言 | `skills/verify-instance-safety/scripts/verify_instance_safety.py` | 退出码 | T07 |
| T09 | 实例准入门禁 | `skills/instance-pool-guard/` | 退出码 | T08 |
| T10 | 并行锁四条硬规则 | `skills/parallel-lock-policy/` | 正则 | T09 |
| T11 | 锁集合声明与规范化 | `skills/declare-lock-set/scripts/declare_lock_set.py` | 退出码 | T10 |
| T12 | 冲突 / 死锁 / 超时检测 | `skills/detect-lock-conflict/scripts/detect_lock_conflict.py` | 退出码 | T11 |
| T13 | 锁违规断言（含 AP-01） | `skills/verify-no-lock-violation/scripts/verify_no_lock_violation.py` | 退出码 | T12 |
| T14 | 并行派单门禁 | `skills/parallel-lock-guard/` | 退出码 | T13 |
| T15 | 终局 fan-in | catalog / tree / docs | 七门禁全 0 | T01–T14 |

## 5. 精确执行动作（T15）

```bash
python3 skills/dsh-butler/scripts/sync_catalog.py
python3 skills/build-layer-graph/scripts/build_layer_graph.py
python3 skills/classify-instance-safety/scripts/classify_instance_safety.py --all --write
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
| T03 | 检出存量隐式耦合 | **如实报告**并逐个补进 composition 或改为显式契约；禁止放宽判据凑绿 |
| T03 | 检出共享可变状态 | 把该产物登记为共享资源键，或改为各自独立产物 |
| T07 | 某技能被判 `single_only` 但其写入其实是参数化的 | 修正判据（区分字面量路径与参数路径），不得整体降级 |
| T08 | 声明与实际不一致 | 重跑 `--write` 刷新声明；声明过期即失败是设计意图 |
| T12 | 死锁环误报 | 检查等待图构造：只有「持有 + 等待」才能成边，单方向依赖不算环 |
| T13 | AP-01 分支未命中 | 确认判据取自 `anti-pattern-policy` AP-01（≥5 次同 action 同 state），不得自改阈值 |
| T15 | 任一命令非 0 | 修复上游后从 T15 重跑 |

## 7. 共享资源键

| 资源键 | 说明 | 串行要求 |
| --- | --- | --- |
| `res:layer-graph.json` | 层间依赖图 | 仅 `build_layer_graph.py` 写入 |
| `res:instance-safety.json` | 实例安全声明表 | 仅 `classify_instance_safety.py --write` 写入 |
| `res:skill-catalog.json` | 全量编目 | 仅 `sync_catalog.py` 写入 |
| `res:execution-tree.json/md` | 树唯一真相源 | 仅 `build_tree.py` 写入 |
| `res:skill-index.json` | 检索索引 | 仅 `build_index.py` 写入 |
| `res:product.md` | catalog 受管区块 | 仅 `render_docs.py` 写入 |
