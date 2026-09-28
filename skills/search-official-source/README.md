# search-official-source

L2 工序动作级技能：从官方站点自声明的 sitemap 检索执行层入口，产出统一六字段候选（source=official-site）。

## 用途

从官方站点自声明的 sitemap 检索执行层入口，产出统一六字段候选（source=official-site）。

## 使用方式

```bash
# 联网
python3 skills/search-official-source/scripts/search_official.py --query <词> --domain <域名>

# 离线夹具
python3 skills/search-official-source/scripts/search_official.py --query <词> \
  --from-file docs/requirements/execution/fixtures/sitemap-official-sample.xml
```

## 退出码

| 码 | 含义 |
| --- | --- |
| `0` | 正常输出 |
| `1` | 全源不可达且零候选——失败，不是没找到 |
| `2` | 输入不可读 |

## 上下游

上游 `multi-source-search-policy`（四源与失败语义口径）；下游 `merge-search-candidates`（去重归一）、`skill-import-pipeline`（引入管线）。

## 边界

- 只读，不下载正文、不携带凭据；
- 只走站点自声明 sitemap；
- 失败必须显式，禁止静默返空。
