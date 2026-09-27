# emit-search-snippet

L2 工序动作：检索片段生成。

## 用途

为单条检索结果生成 ≤120 字的确定性摘要：以 `description` 为底本，把首个命中词居中开窗，两端补省略号。

## 使用方式

```bash
python3 skills/emit-search-snippet/scripts/emit_snippet.py --skill verify-file-exists --terms "文件,存在"
```

同时可作为库被 `google-style-skill-search-router` 导入（`make_snippet(index, skill_id, terms, max_chars)`）。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 片段生成成功 |
| 1 | 索引不可读，或技能 id 不存在 |

## 上下游

- 上游：`rank-skills-bm25`。
- 下游：`google-style-skill-search-router`。
