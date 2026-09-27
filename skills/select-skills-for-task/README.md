# select-skills-for-task

L2 工序动作：选技清单生成。

## 用途

把任务描述转成一份受 top-K 约束的技能 id 清单（**只读检索结果，不读技能正文**）。

## 使用方式

```bash
python3 skills/select-skills-for-task/scripts/select_skills.py --task "校验交付文件是否存在"
python3 skills/select-skills-for-task/scripts/select_skills.py --task "生成可缩放查看器" --top-k 3
```

## 输出字段

`task` / `top_k` / `count` / `truncated` / `selected[{id, level, score}]` / `selected_ids` / `hint` / `reads_skill_body`。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 清单产出完成（可为空清单） |
| 1 | 索引缺失、参数非法，或输出中出现技能正文 |

## 上下游

- 上游：`google-style-skill-search-router`、`lazy-load-policy`。
- 下游：`load-skill-contract`、`on-demand-dispatcher`。
