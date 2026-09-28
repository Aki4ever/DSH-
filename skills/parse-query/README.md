# parse-query

L2 工序动作：查询解析（Google 检索链的查询理解环节）。

## 用途

把自然语言查询变成倒排索引能算分的 term 集合：归一化 → 分词 → 停用词剔除 → 同义词扩展 → ASCII 拼写纠错。

## 使用方式

```bash
python3 skills/parse-query/scripts/parse_query.py --query "校验交付文件是否存在"
python3 skills/parse-query/scripts/parse_query.py --query "vaidate file" --vocab docs/operations/skill-index.json
```

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `normalized` | 归一化后的查询串 |
| `base_terms` | 分词后未扩展的 term |
| `terms` | 扩展后的最终 term 列表（去重保序） |
| `dropped_stopwords` | 被剔除的停用词 |
| `corrections` | 拼写纠错明细 `{from, to}` |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 解析完成（terms 可为空） |
| 1 | 缺少查询输入，或 `--vocab` 不可读 |

## 上下游

- 上游：`build-inverted-index`（复用其分词器）。
- 下游：`rank-skills-bm25`、`google-style-skill-search-router`。
