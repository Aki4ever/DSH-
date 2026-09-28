# quantify-modifier-policy

L1 微观原子规约：程度类修饰词的量化判定基元（四要素 + 场景优先 + 不可量化不得沉默 + 禁止程度词替换程度词）。

## 用途

程度类修饰词不是修辞，而是**未落地的指标**。「大文件」「响应要快」「数据量大」这类表述在机器看来
没有真值条件——多大算大、多快算快，无法判定，也就无法验收。本规约给出唯一判定纪律：

| 要素 | 字段 | 含义 | 反例 |
| :--- | :--- | :--- | :--- |
| 场景 | `domain` | 该词出现在哪个可判定的场景里 | 只说「大文件」，不说日志场景还是代码库场景 |
| 数值或区间 | `quantified` | 可比较的阈值或区间，如 `>=180`、`P95<=200` | 写「比较大」「偏大」 |
| 单位 | `unit` | 数值的物理量纲，如 `cm`、`ms`、`行`、`%` | 只写 `>=180`，不写 `cm` |
| 依据 | `basis` | 公开统计、国家标准、行业惯例或本项目既有基线 | 拍脑袋给一个数，说不出出处 |

**缺 `basis` 的条目一律不合格**。三条派生纪律：

1. **场景优先**：同一个词在不同场景量化不同（「大」在日志场景 `>=100 MB`、在代码库场景 `>=1 MB`）；
   场景未声明时**不得替用户挑场景**，只能要求先声明场景与假设；
2. **不可量化不得沉默**：查不到映射时输出 `unquantifiable` 并强制显式声明假设
   （取值 / 单位 / 依据 / 回滚方式），**不阻断交付**；
3. **禁止程度词替换程度词**：「很快」→「非常快」、「严重」→「极其严重」、「多」→「较多」
   全部不合格，唯一合法方向是引入数值与单位。

### 程度类修饰词清单

| 类型 | 词条 |
| :--- | :--- |
| 单字程度词 | 高、大、快、多、好 |
| 复合程度词 | 严重、频繁、明显、显著、较多、较高、偏低、偏高、丰富、完善、稳定 |

含糊类（范围 / 指代 / 时序）不在本规约范围，由 `REQ-BUTLER-CONCRETIZE-024` 的具像化管线承接；
但两份清单**共用同一个唯一真相源** `detect-vague-modifier`。

## 使用方式

本技能为纯规约，**无脚本**；判据的物理执行由下游四个探针承载：

```bash
# ② 建表：缺 basis 即退 1
python3 skills/build-quantifier-table/scripts/build_quantifier_table.py --check

# ③ 检测：命中词、类别、行号与映射命中情况
python3 skills/detect-vague-modifier/scripts/detect_vague.py --text '接口响应要快' --domain 接口响应 --json

# ④ 量化：有映射给数值与依据，无映射落 unquantifiable
python3 skills/quantify-modifier/scripts/quantify.py --text '接口响应要快' --domain 接口响应 --json

# ⑤ 断言：三项硬断言全过才退 0
python3 skills/verify-quantified-output/scripts/verify_quantified.py --text '接口响应 P95 ≤ 200 ms' --json
```

## 输出字段

本规约本身不产出 JSON；下游产物的字段口径如下：

| 环节 | 关键字段 |
| :--- | :--- |
| 建表 | `{"table_version","entries":[{"term","domain","quantified","unit","basis"}]}` |
| 检测 | `{"success","hits":[{"term","category","word_class","line","index","quantified","domain","matched_domain","snippet"}],"counts","unquantified"}` |
| 量化 | `{"success","domain","substituted":[{"term","from","to","basis","line","suggestion"}],"unquantifiable":[{"term","line","suggestion"}],"stats"}` |
| 断言 | `{"success","unquantified":[{"term","line","snippet"}],"checks":[{"name","pass","detail"}]}` |

## 退出码

本规约不含脚本，退出码语义由执行代理脚本承载：

| 码 | 含义 |
| :--- | :--- |
| 0 | 程度词已量化，或未命中程度词；`unquantifiable` 项已显式声明假设 |
| 1 | 存在未量化且未声明假设的程度词，或出现程度词替换程度词 |
| 2 | 输入缺失、文件不可读，或量化映射表不可读 |

## 上下游

- 下游：`build-quantifier-table`（按四要素建表）、`detect-vague-modifier`（词表唯一真相源与检测）、
  `quantify-modifier`（按场景替换）、`verify-quantified-output`（断言）、`quantification-guard`（L3 交付门禁）。
- 并列分工：含糊词的具像化规约（`REQ-BUTLER-CONCRETIZE-024`）复用同一检测器，但替换动作不同——
  程度词补数值，含糊词补实体与判据。
