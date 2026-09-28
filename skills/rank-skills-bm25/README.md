# rank-skills-bm25

L2 工序动作：BM25 技能排序。

## 用途

在 `skill-index.json` 上执行 BM25 排序：字段权重（`id 3.0` / `triggers 2.0` / `category_title 1.5` / `description 1.0`）+ 文档长度归一，支持 top-K、分页与命中率评测。

## 使用方式

```bash
python3 skills/rank-skills-bm25/scripts/rank_skills.py --query "校验交付文件是否存在"
python3 skills/rank-skills-bm25/scripts/rank_skills.py --query "token 统计" --top-k 3 --offset 3
python3 skills/rank-skills-bm25/scripts/rank_skills.py --eval docs/requirements/execution/fixtures/retrieval-queries.json
```

## 固定常量

`k1 = 1.2`、`b = 0.75`、`IDF = ln(1 + (N - df + 0.5) / (df + 0.5))`。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 排序完成，或 `--eval` 命中率达标 |
| 1 | 索引/查询不可读，或 `--eval` 命中率低于阈值 |

## 上下游

- 上游：`parse-query`、`build-inverted-index`。
- 下游：`emit-search-snippet`、`log-query-events`、`google-style-skill-search-router`。
