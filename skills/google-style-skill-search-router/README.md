# google-style-skill-search-router

L3 复合流程：Google 式技能检索总控。

## 用途

管家「找技能」的唯一推荐入口：一次调用完成 查询解析 → BM25 排序 → 片段生成 → 质量日志，只回灌片段。

## 组成

| 组成 | 级别 | 职责 |
| :--- | :--- | :--- |
| `snippet-only-recall` | L1 | 只回灌片段的返回面规约 |
| `build-inverted-index` | L2 | 倒排索引 |
| `parse-query` | L2 | 查询理解 |
| `rank-skills-bm25` | L2 | 相关度排序 |
| `emit-search-snippet` | L2 | ≤120 字摘要 |
| `log-query-events` | L2 | 质量信号落盘 |

## 使用方式

```bash
python3 skills/google-style-skill-search-router/scripts/search_skills.py --query "校验交付文件是否存在"
python3 skills/google-style-skill-search-router/scripts/search_skills.py --query "统计token消耗" --top-k 3
python3 skills/google-style-skill-search-router/scripts/search_skills.py --eval
```

## 输出字段

`query` / `terms` / `corrections` / `total_hits` / `results[{id, level, category_title, score, snippet, matched_terms}]` / `self_check`。
payload 硬上限 1536 字节，超出即视为违规。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 检索完成且自检通过；或 `--eval` 命中率 ≥ 90% |
| 1 | 索引缺失、参数非法、自检失败，或命中率不达标 |

## 上下游

- 上游：`build-inverted-index`。
- 下游：`select-skills-for-task`、`on-demand-dispatcher`。
