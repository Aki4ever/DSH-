# PKG-005 表达量化包执行明细

| 字段 | 值 |
| --- | --- |
| 执行包编号 | PKG-005 |
| 关联需求 | REQ-BUTLER-QUANTIFY-023、REQ-BUTLER-CONCRETIZE-024、REQ-BUTLER-ONESHOT-025 |
| 需求基线版本 | v0.2.0 |
| 实施顺序 | QUANTIFY-023 → CONCRETIZE-024 → ONESHOT-025 |
| 自行拍定方案 | 缺失量化不阻断但须声明假设；词表唯一真相源；提问上限每任务 1 次且须红线+不可逆；假设写入交付 `assumptions` 段 |
| 唯一 Owner Skill | `dsh-butler` (L4) |
| 状态 | 实施中 |

## 1. 范围

- **纳入**：新增 15 个技能（L1 3 / L2 9 / L3 3）、`docs/operations/quantifier-table.json`（场景量化映射表）、全仓模糊词表收敛为唯一真相源、`confirm-before-coding` 作用域收窄裁决。
- **排除**：不追求「全仓所有历史文档一次性量化」——只保证**新产出**与**门禁覆盖路径**符合规约，历史文档按需分批处理。

## 2. 前置条件

| 编号 | 前置条件 | 验证方式 |
| --- | --- | --- |
| PRE-1 | PKG-004 已交付，catalog `total_skills == 126` | 读取 catalog JSON |
| PRE-2 | 执行层树与受管区块可用（`build-execution-tree`） | `verify_tree.py` exit 0 |
| PRE-3 | 反例层可用（`anti-pattern-guard`） | 脚本存在且 exit 0 |
| PRE-4 | `fastlane-redline-policy` 红线清单可用（ONESHOT 例外判据依赖它） | 脚本存在 |

## 3. 授权与权限

- 已确认：写入 `skills/**`、`docs/operations/**`、`docs/requirements/**`、`dsh-butler` 受管区块。
- 未确认即禁止：`git commit` / `git push`；删除既有技能；改动宿主侧文件。

## 4. 有序任务清单

| 任务 ID | 目标 | 产出路径 | 绑定探针 | 依赖 |
| --- | --- | --- | --- | --- |
| T01 | 程度词四要素规约 | `skills/quantify-modifier-policy/` | 正则 | — |
| T02 | 量化映射表生成（含 basis） | `skills/build-quantifier-table/scripts/build_quantifier_table.py` → `docs/operations/quantifier-table.json` | 文件字节 + 幂等 | T01 |
| T03 | 模糊词检测器（**词表唯一真相源**） | `skills/detect-vague-modifier/scripts/detect_vague.py` | 退出码 | T02 |
| T04 | 按场景量化替换 | `skills/quantify-modifier/scripts/quantify.py` | 退出码 | T03 |
| T05 | 未量化断言 | `skills/verify-quantified-output/scripts/verify_quantified.py` | 退出码 | T04 |
| T06 | 量化门禁 | `skills/quantification-guard/` | 退出码 | T05 |
| T07 | 含糊三类规约 | `skills/concretize-ambiguity-policy/` | 正则 | — |
| T08 | 具像化建议 | `skills/concretize-term/scripts/concretize.py` | 退出码 | T07 |
| T09 | 未具像化断言 | `skills/verify-concretized-output/scripts/verify_concretized.py` | 退出码 | T08 |
| T10 | 具像化门禁 | `skills/concretization-guard/` | 退出码 | T09 |
| T11 | 一次性解决规约 | `skills/one-shot-resolution-policy/` | 正则 | — |
| T12 | 决策可逆性判定 | `skills/classify-decision-reversibility/scripts/classify_decision.py` | 退出码 | T11 |
| T13 | 假设留痕 | `skills/record-assumptions/scripts/record_assumptions.py` | 退出码 | T12 |
| T14 | 不必要提问断言 | `skills/verify-no-unnecessary-question/scripts/verify_no_question.py` | 退出码 | T13 |
| T15 | 一次性门禁 | `skills/one-shot-guard/` | 退出码 | T14 |
| T16 | 词表收敛（改造既有两份副本） | `skills/plan-fission/scripts/plan_fission.py`、`skills/dsh-butler/scripts/fission_engine.py` | 退出码 | T03 |
| T17 | `confirm-before-coding` 作用域裁决 | `docs/requirements/product.md` §32.2、`conflict-detector` 记录 | 正则 | T11 |
| T18 | 终局 fan-in | catalog / index / tree / docs | 七门禁全 0 | T01–T17 |

## 5. 精确执行动作（T18）

```bash
python3 skills/dsh-butler/scripts/sync_catalog.py
python3 skills/build-quantifier-table/scripts/build_quantifier_table.py
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
| T02 | 存在缺 `basis` 的条目 | 补依据或删除该条目；**禁止**留空 basis 凑数 |
| T03 | 词表与既有副本不一致 | 以 `detect-vague-modifier` 为唯一真相源，改造调用方引用它；禁止再新增第三份词表 |
| T05 | 合规样本被误判 | 检查该词是否已在映射表中量化；不得放宽「未量化即失败」 |
| T08 | 具像化建议本身仍含糊 | 判为不合格：必须给数量依据 / 实体枚举 / 触发条件+时限 |
| T12 | 可逆决策被判为需提问 | 回退 `one-shot-resolution-policy` 重写判据；提问例外必须同时满足红线与不可逆 |
| T16 | 改造后 `plan-fission` 行为变化 | 先跑 `docs/requirements/execution/fixtures/` 两个夹具回归，行为必须与改造前一致 |
| T18 | 任一命令非 0 | 修复上游后从 T18 重跑 |

## 7. 共享资源键

| 资源键 | 说明 | 串行要求 |
| --- | --- | --- |
| `res:quantifier-table.json` | 场景量化映射表 | 仅 `build_quantifier_table.py` 写入 |
| `res:skill-catalog.json` | 全量编目 | 仅 `sync_catalog.py` 写入 |
| `res:execution-tree.json/md` | 树唯一真相源 | 仅 `build_tree.py` 写入 |
| `res:skill-index.json` | 检索索引 | 仅 `build_index.py` 写入 |
| `res:product.md` | catalog 受管区块 | 仅 `render_docs.py` 写入；正文人工维护 |
| `res:vague-word-list` | 模糊词表（唯一真相源） | 仅 `detect-vague-modifier` 持有 |
