# search-github-skill

「GitHub 技能引入管线」（REQ-BUTLER-IMPORT-012 / T16）第 1 步：外部技能候选检索与结构化。

## 用途

把外部技能检索结果收敛为统一结构的候选清单 JSON（`name` / `url` / `license` / `has_scripts` / `stars` / `description`），供下游审计脚本直接消费。

**本脚本不联网**：真实检索由智能体侧工具（`find_dsh_plugin`、web 检索、`gh` CLI）完成；脚本只做装载、归一、关键词过滤与截断。

候选来源优先级：`--from-json` 指定文件 → 仓库内 `docs/operations/skill-import-cache.json`（若存在）→ 空。

## 使用方式

```bash
# 无来源：返回合法 JSON，candidates 为空并带 note 指引
python3 skills/search-github-skill/scripts/search_skill.py --query "pdf"

# 传入候选 JSON（对象含 candidates 或裸数组），过滤 + 截断
python3 skills/search-github-skill/scripts/search_skill.py --query "pdf" --limit 2 --from-json /tmp/candidates.json

# 关键词留空返回全部候选
python3 skills/search-github-skill/scripts/search_skill.py --query "" --json
```

| 参数 | 说明 |
| :--- | :--- |
| `--query` | 能力关键词；对 `name + description` 做不区分大小写子串匹配，留空返回全部 |
| `--limit` | 候选上限，默认 8 |
| `--from-json` | 候选 JSON 文件路径 |
| `--json` | 以 JSON 输出（默认行为，保留以兼容脚本化调用） |

## 退出码表

| 退出码 | 语义 |
| :--- | :--- |
| `0` | 正常输出统一结构 JSON；`candidates` 为空数组也是合法结果 |
| `1` | `--from-json` 文件不存在，或不是合法 JSON / 结构非法 |

## 上下游

- **上游**：智能体侧检索工具（`find_dsh_plugin` / web 检索 / `gh` CLI），产出候选 JSON；或 `docs/operations/skill-import-cache.json` 缓存。
- **下游**：`audit-imported-skill`（对候选做许可/安全审计）→ `normalize-skill-contract` → `place-skill-into-cluster`，由 L3 `skill-import-pipeline` 串联。
