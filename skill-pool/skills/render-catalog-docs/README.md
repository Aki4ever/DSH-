# render-catalog-docs

L2 工序动作：catalog 受管区块生成器。

## 用途

把 `docs/operations/skill-catalog.json` 里的组装关系，单向注入 `docs/requirements/product.md` 的受管区块，
取消人工手写组装表这一漂移源头。

## 使用方式

```bash
python3 skills/render-catalog-docs/scripts/render_docs.py            # 写入
python3 skills/render-catalog-docs/scripts/render_docs.py --check    # 只检测
```

## 受管标记

```text
<!-- CATALOG:BEGIN ... -->
（自动生成内容）
<!-- CATALOG:END -->
```

标记之外的文字一律不动。标记缺失时会在文末补齐整个受管章节。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 写入成功，或 `--check` 一致 |
| 1 | catalog JSON 缺失/非法，或 `--check` 检测到漂移 |

## 上下游

- 上游：`sync_catalog.py`（先生成 catalog JSON）。
- 下游：`verify-catalog-consistency`、`catalog-consistency-guard`。
