# layer-naming-guard

L3 复合流程门禁：**执行层命名规范门禁**——把「体检 → 整改 → 断言 → 渲染」串成一道不可跳步的放行门禁。

## 用途

放行的唯一合法证据是**三项实数齐备**：

| # | 实数 | 判据 |
| :---: | :--- | :--- |
| 1 | 合规率 | == **1.0000**（必须打印分子分母，禁止「已合规」字样） |
| 2 | 旧名悬空引用 | == **0**（按词边界扫描，不是子串） |
| 3 | 规范文档漂移 | == **0**（`render-capability-naming --check` 退 0） |

**为什么第 3 项也算放行条件**：规则改了口径而文档没跟着刷新时，人读的是一个规则、
机器执行的是另一个规则。这种漂移不会立刻报错，只会在下一次人工按文档操作时静默出错。

## 与相邻门禁的分工

| 门禁 | 判什么 |
| :--- | :--- |
| `execution-tree-guard` | 执行层树与索引是否与 catalog 四方一致 |
| `catalog-consistency-guard` | SKILL.md / catalog / docs 受管区块是否三方一致 |
| `layer-naming-guard` | **名字本身是否合规、旧名是否清干净、规范文档是否同步** |
| `atomic-fission-guard` | 步骤是否可绑定物理探针 |

四者串联而非互相取代：树一致不代表名字合规，名字合规也不代表树一致。

## 使用方式

```bash
# 1) 体检
python3 skills/audit-layer-naming/scripts/audit_naming.py --all --json

# 2) 整改（先干跑，再执行并重建）
python3 skills/rename-execution-layer/scripts/rename_layer.py --plan <plan.json> --dry-run --json
python3 skills/rename-execution-layer/scripts/rename_layer.py --plan <plan.json> --apply --rebuild --json

# 3) 断言三项实数
python3 skills/verify-layer-naming/scripts/verify_naming.py --strict --json

# 4) 渲染并做漂移检测
python3 skills/render-capability-naming/scripts/render_naming_spec.py --write --json
python3 skills/render-capability-naming/scripts/render_naming_spec.py --check --json
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 五环全过 |
| 1 | `target_invalid` / `target_taken` / 合规率 < 1.0 / 悬空引用 > 0 / 登记表违规 / 文档漂移 |
| 2 | 输入不可读或依赖脚本不可用 |

## 上下游

- 上游：`capability-naming-policy`（口径）、`audit-layer-naming`（体检与判据）、`rename-execution-layer`（六处同步整改）、`verify-layer-naming`（三项断言）、`render-capability-naming`（文档渲染）。
- 并列：`execution-tree-guard`、`catalog-consistency-guard`、`atomic-fission-guard`。

## 边界

- 只做裁决与阻断，不体检、不改名、不渲染、不重建；
- 三项实数缺一不可，禁止布尔声称；
- 判据不在本层新增；
- 禁止「记录后继续」：任一环失败即停止，修复后从体检环重跑。
