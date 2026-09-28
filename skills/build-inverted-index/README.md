# build-inverted-index

L2 工序动作：技能倒排索引生成。

## 用途

把 `docs/operations/skill-catalog.json` 编译成 `docs/operations/skill-index.json`：
`term → [doc_idx, field_idx, tf]`，附带 `df`、字段权重与文档长度，供 BM25 排序使用。

同时导出确定性分词器 `tokenize()`（ASCII 词 + CJK 一元/二元 + 停用词过滤），
供 `parse-query` 与 `rank-skills-bm25` 复用，保证索引侧与查询侧切词一致。

## 使用方式

```bash
python3 skills/build-inverted-index/scripts/build_index.py
python3 skills/build-inverted-index/scripts/build_index.py --check
```

## 输出字段

`index_version` / `doc_count` / `field_weights` / `avg_doc_len` / `df` / `postings` / `docs`

字段权重：`id 3.0` > `triggers 2.0` > `category_title 1.5` > `description 1.0`。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 重建成功，或 `--check` 时索引已最新 |
| 1 | catalog 缺失/非法，或 `--check` 检测到陈旧 |

## 上下游

- 上游：`docs/operations/skill-catalog.json`（由 `sync_catalog.py` 生成）。
- 下游：`parse-query`、`rank-skills-bm25`、`google-style-skill-search-router`。
