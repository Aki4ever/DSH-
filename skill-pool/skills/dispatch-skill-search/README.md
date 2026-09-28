# dispatch-skill-search

L2 工序动作级技能：四源检索调度器：本地优先、命中即短路并留痕；未命中才在显式许可下外呼 GitHub。

## 用途

四源检索调度器：本地优先、命中即短路并留痕；未命中才在显式许可下外呼 GitHub。

## 使用方式

```bash
python3 skills/dispatch-skill-search/scripts/dispatch_search.py --query "信息图" --json
python3 skills/dispatch-skill-search/scripts/dispatch_search.py --query "<词>" --allow-network
```

## 退出码

| 码 | 含义 |
| --- | --- |
| `0` | 产出非空候选 |
| `1` | 零候选（未完成检索或外呼失败） |
| `2` | 输入不可读 |

## 上下游

上游 `multi-source-search-policy`、`search-github-skill`、`search-official-source`；下游 `merge-search-candidates`、`skill-import-pipeline`。

## 边界

- 本地优先是硬规则，命中即短路；
- 未完成检索与没找到严格区分；
- 外呼串行，受限流约束。
