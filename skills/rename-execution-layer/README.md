# rename-execution-layer

L2 工序动作：**执行层命名整改器**——一次改名同步六处，幂等可重跑，旧名留痕供悬空引用扫描。

## 用途

`capability-naming-policy`「改名六处同步契约」的物理执行层。

**改名不是只改目录名。** 只改目录名会在下一个门禁立刻被判悬空引用——没有解决问题，只是把问题推给未来。

| # | 同步对象 | 位置 |
| :---: | :--- | :--- |
| 1 | 目录名 | `skills/<from>/` → `skills/<to>/`，配套脚本 `<from_>.py` → `<to_>.py` |
| 2 | 技能 ID | `skill-catalog.json` 的 `id` 与 `name`，以及全部派生产物 |
| 3 | 契约头 | `SKILL.md` 的 Frontmatter `name` |
| 4 | 组装边 | 全池 `composition` / `depends_on` |
| 5 | 树与索引 | `execution-tree.json/.md`、`skill-index.json`、`layer-graph.json`、`instance-safety.json` |
| 6 | 文档与登记 | `docs/**`、`execution-layers.json` |

## 换代按词边界，不按子串

追加后缀式改名会让新名把旧名整体包含为自己的前缀。纯子串替换会在第二次运行时
把已改好的新名再改一遍，产生双重后缀。因此扫描与替换都用
`(?<![a-z0-9-])旧名(?![a-z0-9-])`。

## 使用方式

```bash
# 1) 干跑：只看影响面，不写任何文件
python3 skills/rename-execution-layer/scripts/rename_layer.py \
  --plan docs/requirements/execution/renames-pkg007.json --dry-run --json

# 2) 执行整改并重建全部派生产物
python3 skills/rename-execution-layer/scripts/rename_layer.py \
  --plan docs/requirements/execution/renames-pkg007.json --apply --rebuild --json

# 3) 单条临时改名
python3 skills/rename-execution-layer/scripts/rename_layer.py \
  --rename "old-skill-id=new-skill-id" --apply --rebuild

# 4) 非法目标名必须被拦
python3 skills/rename-execution-layer/scripts/rename_layer.py \
  --rename "find-duplicate-rules=helper-util-stuff" --dry-run
# → blocked / target_invalid / banned_word: 命中禁词：helper、stuff、util
```

## 状态闭集

`would_rename`（干跑可改）/ `renamed`（已整改）/ `already_applied`（幂等命中）/
`target_invalid`（目标名非法）/ `target_taken`（目标被占用）/ `source_missing`（源不存在）。

## 实测基线（PKG-007）

| 旧名 | 新名 | 命中文件数 |
| :--- | :--- | ---: |
| `find-duplicate-rules` | `search-duplicate-rules` | 14 |
| `concise-chinese-bold` | `concise-chinese-bold-guard` | 19 |
| `google-style-skill-search` | `google-style-skill-search-router` | 28 |

合计改写 61 个文件；五件派生产物全部重建成功；二次运行 `changed_files_total = 0`。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 干跑完成 / 整改成功 / 已是目标状态 |
| 1 | `target_invalid` / `target_taken` / `source_missing` / 重建失败 |
| 2 | 输入不可读（计划非法、判据模块缺失、catalog 缺失） |

## 上下游

- 上游：`capability-naming-policy`（六处同步契约）、`audit-layer-naming`（违规清单与判据实现）。
- 下游：`verify-layer-naming`（悬空引用断言）、`layer-naming-guard`（L3 门禁）。

## 边界

- 六处一次改完，只改目录名的改名一律不接受；
- 目标名落地前必须过 `check_identifier`；
- 幂等：重复执行必须 `changed_files_total = 0`；
- 不改层级、不改功能；不覆盖已有执行层；
- `--rebuild` 的五件产物任一非 0 即判整改未成立。
