# quantification-guard

L3 复合流程：量化交付门禁。把「规约 → 建表 → 检测 → 量化 → 断言」串成一道出口门禁，
挂载于管家「④ 输出规约」集群。

## 用途

「修饰程度词必须量化」（`REQ-BUTLER-QUANTIFY-023`）的唯一交付出口门禁。
五块能力积木按依赖顺序串联：

| 环节 | 组成技能 | 级别 | 职责 |
| :--- | :--- | :--- | :--- |
| ① 规约 | `quantify-modifier-policy` | L1 | 四要素齐备、场景优先、不可量化不得沉默、禁止程度词替换程度词 |
| ② 建表 | `build-quantifier-table` | L2 | 生成 `docs/operations/quantifier-table.json`，缺 `basis` 即不合格 |
| ③ 检测 | `detect-vague-modifier` | L2 | 全仓模糊词表唯一真相源；报出命中词、类别与行号 |
| ④ 量化 | `quantify-modifier` | L2 | 按 `(term, domain)` 产出保留原词的量化建议 |
| ⑤ 断言 | `verify-quantified-output` | L2 | 三项硬断言全过才退 0 |

三条不可让渡的红线：

- **缺失映射不阻断，但必须声明假设**：无 `(term, domain)` 条目时交付须带 `unquantifiable` 与
  「需显式声明假设」（取值 / 单位 / 依据）；**沉默交付**不通过，**缺映射本身不阻断**；
- **禁止同义词替换糊过去**：「很快」→「非常快」不合格，唯一合法方向是引入数值与单位；
- **场景优先**：同一个词在不同场景量化不同，场景未声明时不得替调用方挑场景。

## 使用方式

```bash
# ② 建表自检：缺 basis 退 1；--check 退 1 表示映射表陈旧
python3 skills/build-quantifier-table/scripts/build_quantifier_table.py --check

# ③ 检测
python3 skills/detect-vague-modifier/scripts/detect_vague.py --file <路径> [--domain <场景>] --json

# ④ 量化
python3 skills/quantify-modifier/scripts/quantify.py --file <路径> [--domain <场景>] --json

# ⑤ 断言（门禁判定点）
python3 skills/verify-quantified-output/scripts/verify_quantified.py --file <路径> [--domain <场景>] --json
```

## 输出字段

门禁结论由 `verify-quantified-output` 的三字段 JSON 承载：

| 字段 | 含义 |
| :--- | :--- |
| `success` | 全部断言是否通过 |
| `unquantified` | `[{"term","line","snippet"}]`，未量化程度词与行号 |
| `checks` | `[{"name","pass","detail"}]`，逐项断言的判定与证据 |

## 退出码

| 码 | 含义 | 门禁动作 |
| :--- | :--- | :--- |
| 0 | 建表自检通过、检测完成、量化建议非空或已声明假设、三项断言全过 | 放行交付 |
| 1 | 映射表缺 `basis` 条目、存在未量化程度词、程度词替换程度词，或缺失 domain 映射 | 阻断，改写后重跑 |
| 2 | 输入缺失、文件不可读，或量化映射表不可读 | 阻断，先补齐输入或重建映射表 |

## 上下游

- 上游：`quantify-modifier-policy` → `build-quantifier-table` → `detect-vague-modifier` →
  `quantify-modifier` → `verify-quantified-output`（组合即本技能的 `composition` 依赖链）。
- 下游：管家 `dsh-butler` 的「④ 输出规约」出口；同集群的 `chinese-output-guard` 等门禁与之并列执行。
- 并列分工：含糊词（范围 / 指代 / 时序）由 `REQ-BUTLER-CONCRETIZE-024` 的具像化门禁承接，本门禁只管程度词。
