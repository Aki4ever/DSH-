# SOURCE-001 · 《Don't Make Me Think, Revisited》(3rd Edition)

> ### 🏷️ **资产元数据**
> - **来源类型**：专著（可用性设计）
> - **主/辅定位**：**主源**（本工程「零思考直觉设计」条款的最高依据）
> - **登记版本**：`v4.24.0`（随 REQ-089 实施；完成后随总版本归位） · **登记日期**：2026-10-01 · **需求依据**：`REQ-089` R1-a
> - **核验状态**：🟡 **书目元数据已核 · 页码未逐条核对**

---

## 一、书目元数据

| 字段 | 值 |
| :--- | :--- |
| 原书名 | *Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability* |
| 中文书名 | 《点石成金：访客至上的 Web 和移动可用性设计秘笈》 |
| 作者 | Steve Krug（史蒂夫·克鲁格） |
| 版次 | 第 3 版（Revisited Edition） |
| 出版年 | 2014 |
| 出版方 | New Riders（Pearson Education） |
| 篇幅口径 | 全书以「三秒直觉 / 扫视而非研读 / 省略多余文字」为骨架 |

> ⚠️ **诚实声明**：上表为**公开可查的出版元数据**。本卡**不给出具体页码与章节编号**——
> 在未逐页核对原书之前，编造"第 X 章第 Y 页"正是本工程明令禁止的"不采信自述"反面。
> 需要精确页码时，须由人打开原书核对后把 🟡 升级为 🟢。

---

## 二、被本工程采纳的核心要点（只列要点，不复述条款正文）

| # | 原书要点 | 本工程落地位置（条款真相源） |
| :-- | :--- | :--- |
| 1 | **第一法则：别让我思考** —— 页面应自解释，用户不该为"这是什么、点哪里"消耗脑力 | [`interaction_specification.md`](../common/interaction_specification.md) §二 引语 |
| 2 | **用户是"扫视"而非"研读"** —— 满足化策略（satisficing）、凑合着用（muddling through） | [`readability_specification.md`](../common/readability_specification.md) §一（为快速扫视而设计） |
| 3 | **建立清晰的视觉层次** —— 越重要越显著；逻辑相关的内容视觉上也相关 | [`readability_specification.md`](../common/readability_specification.md) §一.1 |
| 4 | **省略多余的文字** —— 去掉"自吹自擂的废话"与"指示说明型废话" | [`readability_specification.md`](../common/readability_specification.md) §一.3（消除视觉噪点与多余格式） |
| 5 | **三秒直觉** —— 用户应在极短时间内识别"我在哪 / 这页讲什么 / 下一步点哪" | [`interaction_specification.md`](../common/interaction_specification.md) §二.1 |
| 6 | **主行动唯一性** —— 同屏只留一个高亮主按钮，避免注意力竞争 | [`interaction_specification.md`](../common/interaction_specification.md) §二.2 |
| 7 | **防呆与不可逆确认** —— 破坏性操作二次校验，不可用即置灰 | [`interaction_specification.md`](../common/interaction_specification.md) §二.3 |
| 8 | **可用性即基本礼貌** —— 不让用户为系统的懒惰买单 | [`interaction_specification.md`](../common/interaction_specification.md) §二.4（物理反馈与零空白等待） |

---

## 三、本工程对原书的**工程化转译口径**（转译 = 我们的判断，不是原书原话）

原书是**面向人类设计师**的可用性读物，不含可执行判定。本工程做了两处明确转译，
此二处属**本工程的解释**，不得回标为"原书规定"：

1. **可量化**：把"清晰视觉层次"落成字号阶梯、`1.5~1.6` 行高、单行 45~75 汉字等**数字约束**
   （见 `readability_specification.md`）；
2. **可判定**：把"别让我思考 / 省略多余文字"落成**输出体量 + 文末结构**两个客观量，
   由 [`scripts/output_audit.mjs`](../../scripts/output_audit.mjs) 判定（体量阈值与五联装标头齐备性），
   超出阈值即扣分——**这是本工程把软原则变硬判定的关键一步**。

---

## 四、引用锚点（谁引用了本卡）

| 引用方 | 引用方式 |
| :--- | :--- |
| [`knowledge/common/interaction_specification.md`](../common/interaction_specification.md) | §二 全部四条原则的出处 |
| [`knowledge/common/readability_specification.md`](../common/readability_specification.md) | §一 全部三条认知铁律的出处 |
| [`knowledge/sources/README.md`](README.md) | §二 已登记来源表 |
| [`docs/constraint_mechanism_optimize_6.md`](../../docs/constraint_mechanism_optimize_6.md) | R1 需求依据 |

---

## 五、维护原则
- 本卡**只写来源与要点索引**，任何工程条款一律以 `knowledge/common/` 为唯一真相源；
- 升级为 🟢 需附核对方式（谁、何时、依据哪个版本的哪一页），否则不得改状态；
- 保持文档全中文、通俗直白、无生僻字。
