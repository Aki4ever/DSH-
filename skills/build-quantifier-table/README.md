# build-quantifier-table

L2 工序动作：生成并维护场景量化映射表 `docs/operations/quantifier-table.json`（幂等、无时间戳）。

## 用途

「修饰程度词必须量化」（`REQ-BUTLER-QUANTIFY-023`）流水线的建表环节。
把 L1 规约 `quantify-modifier-policy` 的四要素纪律落成一张可被机器查询的表：
`term`（模糊词）/ `domain`（场景）/ `quantified`（数值或区间）/ `unit`（单位）/ `basis`（依据）。

**缺 `basis` 的条目一律不合格**：脚本自检逐条校验五要素，发现空 `basis` 直接 exit 1 并列出问题条目。

**场景优先**：主键是 `(term, domain)`，同一个词在不同场景量化不同——「大」在日志场景是 `>=100 MB`，
在代码库场景是 `>=1 MB`；禁止只按 `term` 建全局映射。

## 使用方式

```bash
python3 skills/build-quantifier-table/scripts/build_quantifier_table.py            # 写入（幂等）
python3 skills/build-quantifier-table/scripts/build_quantifier_table.py --check    # 只检测是否最新
python3 skills/build-quantifier-table/scripts/build_quantifier_table.py --list     # 打印条目数
python3 skills/build-quantifier-table/scripts/build_quantifier_table.py --list --json
```

无参数即写入；写入口径固定为「条目按 `(term, domain)` 排序 + JSON 键排序 + 末尾单换行 + 无时间戳」，
因此连跑两次第二次必为 `changed:false`。

## 内置种子表

覆盖 16 个程度词、52 条映射，每个词至少 3 个场景：

| 词 | 场景数 | 场景示例 |
| :--- | :--- | :--- |
| 高 | 4 | 成年男性身高 `>=180 cm`、服务可用性 `>=99.9 %` |
| 大 | 5 | 日志 `>=100 MB`、代码库 `>=1 MB`、单表数据量 `>=10000000 行` |
| 快 | 3 | 接口响应 `P95<=200 ms`、单元测试 `<=100 ms` |
| 多 | 4 | 单次检索候选 `>=20 条`、批量改动文件 `>=2 个` |
| 好 | 3 | 代码质量 `=0 个严重缺陷`、测试覆盖 `>=80 %` |
| 严重 / 频繁 / 明显 / 显著 / 稳定 | 各 3 | 线上故障、定时任务、指标变化、A-B 指标差异、服务运行 |
| 偏高 / 偏低 / 较高 / 较多 / 丰富 / 完善 | 各 3 | 接口耗时、缓存命中率、上下文占用、依赖数量、知识库案例、技能契约 |

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `success` | 自检通过且写动作成功（`--check` 下表示已是最新） |
| `changed` | 本次是否真的改写了文件；幂等重跑为 `false` |
| `path` | 产物相对路径 `docs/operations/quantifier-table.json` |
| `count` | 条目总数 |
| `table_version` | 表版本号，当前 `1.0.0` |
| `terms` / `by_term` | 仅 `--list --json`：词数与逐词条目数 |
| `problems` | 仅自检失败时：`[{"index","term","domain","field","reason"}]` |

产物 JSON 固定为 `{"table_version": "...", "entries": [...]}`，键排序输出。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 写入成功（含 `changed:false`），或 `--check` 检测到已是最新 |
| 1 | 存在缺 `basis` 或字段为空的条目；或 `--check` 检测到陈旧/缺失 |
| 2 | 输出目录不可写等 I/O 故障 |

## 上下游

- 上游：`quantify-modifier-policy`（L1 四要素规约与场景优先原则）。
- 下游：`detect-vague-modifier`（以本表判定 `quantified`，并作为全仓模糊词表唯一真相源的映射侧）、
  `quantify-modifier`（按 `(term, domain)` 取出量化值）、`verify-quantified-output`（断言层）、
  `quantification-guard`（L3 交付门禁）。
