# verify-catalog-consistency

L2 工序动作：口径三方对拍探针。

## 用途

一次性回答「文档和技能实际契约是否一致」，捕捉手写组装表造成的口径漂移。

## 检查项

| 编号 | 检查 | 失败含义 |
| :--- | :--- | :--- |
| C1 | catalog JSON 结构完整 | 编目文件损坏 |
| C2 | 每个本地技能 Frontmatter 的 name/level/composition == catalog 条目 | 技能改了但没同步编目 |
| C3 | `render_docs.py --check` 一致 | docs 受管区块落后 |
| C4 | docs 正文手写组装行 == catalog | 人工手写表与事实不符（口径漂移） |
| C5 | `skills-catalog.md` 总纳管数 == catalog total | 人机两份编目不同步 |

## 使用方式

```bash
python3 skills/verify-catalog-consistency/scripts/verify_consistency.py
./bin/skill-pool consistency
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 完全一致 |
| 1 | 存在不一致，stdout 的 `issues` 列出文件/行号/原因 |

## 上下游

- 上游：`render-catalog-docs`。
- 下游：`catalog-consistency-guard`、`bin/skill-pool consistency`。
