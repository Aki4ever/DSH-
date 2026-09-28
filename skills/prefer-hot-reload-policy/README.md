# prefer-hot-reload-policy

L1 原子规约：能不重启就不重启——三级处置判定 + 重启证据三要素。

## 用途

回答「一次变更到底需不需要重启」。默认目标是**零重启**：
`hot_reload`（热更）＞ `incremental`（增量重载）＞ `restart`（重启），
只有命中「不可热更边界」白名单才允许 `restart`，且必须同时给出「路径 + 边界 + 重建命令」三要素。

实测事实（判定表底座）：新增技能后宿主即时刷新技能目录，无需重启；
`skills/**`、`docs/**`、`docs/operations/*.json`、`bin/skill-pool` 均为「下次读取 / 下次调用即生效」；
真正需要重启或重建刷新的只有宿主侧：DSH 应用 bundle、Web 产物、宿主注入的 system prompt 结构。

## 使用方式

本技能无脚本，判定口径由下游 `classify-change-scope` 脚本落地：

```bash
# 只改仓库内可热更路径：不应出现任何 restart
python3 skills/classify-change-scope/scripts/classify_scope.py --paths skills/dsh-butler/SKILL.md docs/operations/skill-catalog.json --json

# 改宿主 bundle：必须 restart 且带非空 boundary
python3 skills/classify-change-scope/scripts/classify_scope.py \
  --paths "/Applications/DSH Desktop.app/Contents/Resources/app/package.json" --json
```

## 判定表（最长前缀匹配）

| 序 | 路径模式 | 处置 | 依据 |
| :--- | :--- | :--- | :--- |
| 1 | `/Applications/DSH Desktop.app/**` | restart | 宿主应用 bundle 不可热更 |
| 2 | `apps/web/**` | restart | Web 产物需重建并刷新页面 |
| 3 | `dist/**` | restart | 构建产物需重建并刷新页面 |
| 4 | `*.bundle.js` | restart | 打包产物需重建后刷新页面 |
| 5 | `docs/operations/*.json`（catalog/index/tree） | hot_reload | 由脚本重建后立即生效 |
| 6 | `skills/**` | hot_reload | 技能契约下次调用即生效 |
| 7 | `docs/**` | hot_reload | 文档下次读取即生效 |
| 8 | `bin/skill-pool` | hot_reload | 下次调用即生效 |
| 9 | 其它未识别路径 | incremental | 保守：先尝试增量重载 |

## 输出字段

本技能无脚本输出。判定结果由下游脚本以 `path` / `disposition` / `reason` / `boundary` 四字段承载：

| 字段 | 含义 |
| :--- | :--- |
| `disposition` | `hot_reload` / `incremental` / `restart` |
| `boundary` | 命中的「不可热更边界」白名单模式；非 `restart` 时为空串 |
| `reason` | 人类可读依据（对应判定表「依据」列） |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 每个变更路径都有唯一处置，且无缺三要素的 restart 声明 |
| 1 | 存在不必要重启（路径未变更或判定非 restart 却重启）或无证据重启（boundary / command 为空） |

## 上下游

- 上游：无（本技能是重启处置规约链的根）。
- 下游：`classify-change-scope`（把判定表落成确定性脚本）、`verify-no-unnecessary-restart`（重启证据断言）、`zero-restart-guard`（L3 写入门禁）。
