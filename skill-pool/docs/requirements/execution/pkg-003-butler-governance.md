# PKG-003 管家管控优化包执行明细

| 字段 | 值 |
| --- | --- |
| 执行包编号 | PKG-003 |
| 关联需求 | REQ-BUTLER-RETRIEVAL-017、REQ-BUTLER-ONDEMAND-015、REQ-BUTLER-TOKENBUDGET-018、REQ-BUTLER-PROGRESS-016 |
| 需求基线版本 | v0.2.0 |
| 实施顺序 | RETRIEVAL-017 → ONDEMAND-015 → TOKENBUDGET-018 → PROGRESS-016 |
| 已拍板方案 | top-K = 5；单任务里程碑 ≤ 8；token 下降目标 ≥ 40%；检索日志默认开启 |
| 唯一 Owner Skill | `dsh-butler` (L4) |
| 状态 | 实施中 |

## 1. 范围

- **纳入**：新增 22 个技能（L1 4 / L2 14 / L3 4）、`docs/operations/skill-index.json`（倒排索引）、`docs/operations/skill-query-log.jsonl`（检索日志）、token 估算与裁剪管线。
- **排除**：宿主 DSH 侧的 `available_skills` 注入机制（不在本仓库内，无法修改）；本次验收口径限定为「仓库可见的上下文 token」。

## 2. 前置条件

| 编号 | 前置条件 | 验证方式 |
| --- | --- | --- |
| PRE-1 | PKG-002 已交付，catalog `total_skills == 87` | 读取 catalog JSON |
| PRE-2 | `atomic-fission-guard` 可用（粒度门禁） | 脚本存在且 exit 0 |
| PRE-3 | `render-catalog-docs` / `verify-catalog-consistency` 可用（口径门禁） | `./bin/skill-pool consistency` exit 0 |
| PRE-4 | token 估算公式统一为 `ceil(CJK + ASCII/4)` | 三个度量脚本实现一致 |

## 3. 授权与权限

- 已确认：新增 `skills/**`、写入 `docs/operations/**`、更新 `docs/**` 索引。
- 未确认即禁止：`git commit` / `git push`；删除任何既有技能；改动宿主侧配置。

## 4. 有序任务清单

| 任务 ID | 目标 | 产出路径 | 绑定探针 | 依赖 |
| --- | --- | --- | --- | --- |
| T01 | 倒排索引生成 | `skills/build-inverted-index/scripts/build_index.py` → `docs/operations/skill-index.json` | 文件字节 + 幂等 | PRE-1 |
| T02 | 查询解析 | `skills/parse-query/scripts/parse_query.py` | 退出码 + 正则 | T01 |
| T03 | BM25 排序（含 top-K / offset） | `skills/rank-skills-bm25/scripts/rank_skills.py` | 退出码 | T01, T02 |
| T04 | 片段生成（≤120 字） | `skills/emit-search-snippet/scripts/emit_snippet.py` | 长度 | T03 |
| T05 | 检索日志 | `skills/log-query-events/scripts/log_query.py` | 文件字节 | T03 |
| T06 | 片段回灌规约 | `skills/snippet-only-recall/` | 正则 | — |
| T07 | 检索总控（进程内组装 T02~T05） | `skills/google-style-skill-search-router/scripts/search_skills.py` | 退出码 | T02–T06 |
| T08 | 按需加载规约 | `skills/lazy-load-policy/` | 正则 | T07 |
| T09 | 选技清单 | `skills/select-skills-for-task/scripts/select_skills.py` | 退出码 | T07 |
| T10 | 单契约加载 | `skills/load-skill-contract/scripts/load_contract.py` | 文件字节 | T08 |
| T11 | 上下文预算断言 | `skills/verify-context-payload/scripts/verify_payload.py` | 退出码 | T09, T10 |
| T12 | 按需分派总控 | `skills/on-demand-dispatcher/` | 退出码 | T11 |
| T13 | token 预算规约 | `skills/token-budget-policy/` | 正则 | — |
| T14 | token 度量 | `skills/measure-token-budget/scripts/measure_tokens.py` | 退出码 | T13 |
| T15 | 冗余裁剪（幂等） | `skills/prune-redundant-context/scripts/prune_context.py` | 文件字节 + 幂等 | T14 |
| T16 | 降幅与能力断言 | `skills/verify-token-reduction/scripts/verify_reduction.py` | 退出码 | T15 |
| T17 | token 门禁总控 | `skills/token-economy-guard/` | 退出码 | T16 |
| T18 | 里程碑规约 | `skills/milestone-only-progress/` | 正则 | — |
| T19 | 事件分档 | `skills/classify-step-tier/scripts/classify_tier.py` | 退出码 | T18 |
| T20 | 事件折叠 | `skills/fold-repeated-events/scripts/fold_events.py` | 退出码 | T19 |
| T21 | 进度预算断言 | `skills/verify-progress-budget/scripts/verify_progress.py` | 退出码 | T20 |
| T22 | 里程碑输出总控 | `skills/milestone-progress-reporter/` | 退出码 | T21 |
| T23 | 终局 fan-in | catalog / index / docs | 四门禁全 0 | T01–T22 |

## 5. 精确执行动作（T23）

```bash
python3 skills/dsh-butler/scripts/sync_catalog.py
python3 skills/build-inverted-index/scripts/build_index.py
python3 skills/render-catalog-docs/scripts/render_docs.py
./bin/skill-pool validate
./bin/skill-pool consistency
python3 skills/audit-all-skills-compliance/scripts/audit_compliance.py
```

## 6. 失败处理与恢复

| 失败任务 | 判定 | 恢复动作 |
| --- | --- | --- |
| T01 / T15 | 重复运行产物哈希变化 | 移除时间戳与随机量，保证幂等后重跑 |
| T03 / T07 | top-3 命中率 < 90% | 调整字段权重与同义词表；不得通过给测试答案打补丁的方式刷分 |
| T09 / T11 | 加载技能数 > K | 检查选技脚本是否越权加载正文；正文加载只允许经 T10 |
| T16 | 降幅不足或有证据缺失 | 先补裁剪规则；**禁止**通过删除证据字符串达标 |
| T21 | micro 原文泄漏或 milestone 丢失 | 修正折叠规则；milestone 只增不删是硬约束 |
| T23 | 任一命令非 0 | 修复上游后从 T23 重跑 |

## 7. 共享资源键

| 资源键 | 说明 | 串行要求 |
| --- | --- | --- |
| `res:skill-catalog.json` | 全量编目数据 | 仅 `sync_catalog.py` 写入 |
| `res:skill-index.json` | 倒排索引 | 仅 T01 写入 |
| `res:skill-query-log.jsonl` | 检索日志（追加写） | T05 / T07 追加，不重写 |
| `res:product.md` | 受管区块 | 仅 `render_docs.py` 写入 |
| `res:docs/**` | 文档层 | T23 独占 |
