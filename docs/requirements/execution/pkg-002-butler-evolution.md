# PKG-002 管家演进包执行明细

| 字段 | 值 |
| --- | --- |
| 执行包编号 | PKG-002 |
| 关联需求 | REQ-BUTLER-FISSION-014、REQ-BUTLER-CONSISTENCY-010、REQ-BUTLER-DUALFLOW-013、REQ-BUTLER-VIEWER-011、REQ-BUTLER-IMPORT-012 |
| 需求基线版本 | v0.2.0 |
| 实施顺序 | FISSION-014 → CONSISTENCY-010 → DUALFLOW-013 → VIEWER-011 → IMPORT-012 |
| 已拍板方案 | 查看器走本地单文件 HTML（A）；检索走 `find_dsh_plugin`（A）；分流红线优先 + 加权分阈值 3 |
| 唯一 Owner Skill | `dsh-butler` (L4) |
| 状态 | 待开发 |

## 1. 范围

- **纳入**：新增 19 个技能（L1 3 / L2 11 / L3 5）、`bin/skill-pool` 新增 `consistency` 子命令、修正 `product.md` §7.2 两处组装关系漂移。
- **排除**：修改 DSH 宿主 GenUI 插件（超出本仓库边界）；引入技能的**具体候选**在其审计通过前不预先确定。

## 2. 前置条件

| 编号 | 前置条件 | 验证方式 |
| --- | --- | --- |
| PRE-1 | `docs/requirements/index.md` 基线为 v0.2.0 且 5 条新需求状态为「生效」 | 读取 index.md 基线行 |
| PRE-2 | `atomic-fission-guard` 就位（T03 完成） | 任务前置于所有其他任务 |
| PRE-3 | `skills/dsh-butler/scripts/fission_engine.py` 可用 | 文件存在且可执行 |
| PRE-4 | 当前 catalog 基线为 68 技能 | `python3 -c` 读取 `skill-catalog.json` 的 `total_skills` |

## 3. 授权与权限

- 已确认：写入 `docs/requirements/**`、`skills/**`、`bin/skill-pool`、`docs/operations/**`。
- 未确认即禁止：`git commit` / `git push`（需单独确认）、删除任何既有技能目录。
- 网络：允许只读检索 GitHub（`find_dsh_plugin`）；禁止在未审计前安装任何外部技能。

## 4. 有序任务清单

| 任务 ID | 目标 | 产出路径 | 绑定探针 | 依赖 | 并行安全 |
| --- | --- | --- | --- | --- | --- |
| T01 | L1 粒度规约：每步必须声明探针类型 | `skills/enforce-atomic-granularity/` | 正则排他（探针声明缺失即拒） | — | 否 |
| T02 | L2 分裂规划：复用 `fission_engine.py` 输出分裂清单 | `skills/plan-fission/scripts/plan_fission.py` | 退出码 + 正则 | T01 | 否 |
| T03 | L3 分裂门禁总控 | `skills/atomic-fission-guard/` | 退出码 | T02 | 否 |
| T04 | L2 docs 受管区块生成器 | `skills/render-catalog-docs/scripts/render_docs.py` | 文件字节 + 幂等性 | T03 | 与 T05 冲突（同写 product.md） |
| T05 | L2 三方对拍探针 | `skills/verify-catalog-consistency/scripts/verify_consistency.py` | 退出码 | T04 | 与 T04 串行 |
| T06 | L3 口径门禁总控 | `skills/catalog-consistency-guard/` | 退出码 | T05 | 否 |
| T07 | CLI 接入 `consistency` 子命令 | `bin/skill-pool` | 退出码 | T06 | 与 T04/T05 串行（同文件域） |
| T08 | L1 红线硬规约 | `skills/fastlane-redline-policy/` | 正则排他 | T03 | 是 |
| T09 | L2 分流打分脚本 | `skills/score-task-lane/scripts/score_lane.py` | 退出码恒 0 + stdout JSON | T08 | 是 |
| T10 | L2 判定复算探针 | `skills/verify-lane-decision/scripts/verify_lane.py` | 退出码 | T09 | 是 |
| T11 | L3 双轨路由总控 | `skills/dual-lane-router/` | 退出码 | T10 | 否 |
| T12 | L1 可缩放可视化规约 | `skills/format-zoomable-visual/` | 正则排他 | T03 | 是 |
| T13 | L2 单文件交互查看器生成器 | `skills/build-image-viewer/scripts/build_viewer.py` | 文件字节 | T12 | 是 |
| T14 | L2 交互 HTML DOM 探针 | `skills/verify-interactive-html/scripts/verify_html.py` | 正则 + 退出码 | T13 | 是 |
| T15 | L3 查看器总控 | `skills/interactive-image-viewer/` | 退出码 | T14 | 否 |
| T16 | L2 GitHub 技能检索 | `skills/search-github-skill/scripts/search_skill.py` | 文件字节（候选 JSON） | T03 | 是 |
| T17 | L2 引入审计（许可/依赖/安全） | `skills/audit-imported-skill/scripts/audit_skill.py` | 退出码 | T16 | 是 |
| T18 | L2 契约归一（幂等） | `skills/normalize-skill-contract/scripts/normalize_skill.py` | 文件字节 + 幂等性 | T17 | 否 |
| T19 | L2 定级挂载（写 composition） | `skills/place-skill-into-cluster/scripts/place_skill.py` | 退出码 + 正则 | T18 | 否 |
| T20 | L3 引入管线总控 | `skills/skill-import-pipeline/` | 退出码 | T19 | 否 |
| T21 | 终局 fan-in：编目同步 + 全量门禁 | `docs/operations/skill-catalog.json`、`docs/operations/skills-catalog.md` | 退出码全 0 | T01–T20 | 否（必须最后） |

## 5. 精确执行动作

1. 每个技能目录统一结构：`SKILL.md`（YAML Frontmatter：`name` / `level` / `composition` / `description`）+ `README.md` + `scripts/`（L2 必需，L1/L3 可选）。
2. 每个 `SKILL.md` 必须含 `## When to Use`（正触发 + 触发禁区）与 `## Workflow`（Mermaid + 有序步骤）。
3. L2 脚本一律 Python 3 标准库、零 pip 依赖、`chmod +x`、成功返回 0、失败返回 1。
4. T21 依次执行并全部要求退出码 0：

```bash
python3 skills/dsh-butler/scripts/sync_catalog.py
python3 skills/render-catalog-docs/scripts/render_docs.py
./bin/skill-pool validate
./bin/skill-pool consistency
python3 skills/verify-catalog-consistency/scripts/verify_consistency.py
python3 skills/audit-all-skills-compliance/scripts/audit_compliance.py
```

## 6. 失败处理与恢复

| 失败任务 | 判定 | 恢复动作 |
| --- | --- | --- |
| T04 / T05 | 受管区块标记缺失或对拍不一致 | 检查 `<!-- CATALOG:BEGIN/END -->` 标记是否成对；重跑 T04 幂等生成 |
| T07 | CLI 退出码异常 | 回滚 `bin/skill-pool` 到上一 Git 版本后重改，禁止半成品提交 |
| T09 / T10 | 同样本判定结果抖动 | 判定必须是纯确定性计算（禁随机/时间依赖）；修正后重跑 10 次一致性验证 |
| T13 / T14 | HTML 缺缩放控制器 | 补齐 `data-zoom-in` / `data-zoom-out` / `data-zoom-reset` 三标识后重跑探针 |
| T17 | 候选许可非白名单 | 拒绝该候选并记录理由，不静默跳过，改选下一候选 |
| T21 | 任一命令非 0 | 视为整体未完成，修复对应上游任务后从 T21 重跑 |

## 7. 共享资源键

| 资源键 | 说明 | 串行要求 |
| --- | --- | --- |
| `res:product.md` | `docs/requirements/product.md` 受管区块 | T04、T05 必须串行 |
| `res:skill-catalog.json` | 全量编目数据 | 仅 T21 与 `sync_catalog.py` 写入 |
| `res:bin/skill-pool` | CLI 入口 | T07 独占 |
| `res:skills/*/SKILL.md` | 各技能契约文件 | 一技能一文件，无跨任务共享 |
