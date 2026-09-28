# merge-search-candidates

L2 工序动作级技能：把四类源的候选合并成同一六字段契约，两级去重 + 全序排序；合并后为空一律退 1。

## 用途

把四类源的候选合并成同一六字段契约，两级去重 + 全序排序；合并后为空一律退 1。

## 使用方式

```bash
python3 skills/merge-search-candidates/scripts/merge_candidates.py --from a.json --from b.json --json
```

## 退出码

| 码 | 含义 |
| --- | --- |
| `0` | 合并后非空 |
| `1` | 合并后为空——空检索不是通过 |
| `2` | 输入不可读 |

## 上下游

上游 `multi-source-search-policy`、四类检索源；下游 `skill-import-pipeline`、`audit-imported-skill`。

## 边界

- 纯数据变换，不联网不写文件；
- 空检索不是通过；
- 缺字段与越界源都必须留痕，不静默丢。
