# SOURCE-002 · 格式塔心理学组织律原始文献

> ### 🏷️ **资产元数据**
> - **来源类型**：学术文献（心理学 / 知觉组织）
> - **主/辅定位**：**主源**（本工程「格式塔七大定律」条款的最高依据）
> - **登记版本**：`v4.24.0`（随 REQ-089 实施；完成后随总版本归位） · **登记日期**：2026-10-01 · **需求依据**：`REQ-089` R1-a
> - **核验状态**：🟡 **文献条目（作者/标题/年份/期刊或出版方）已核 · 起止页码未逐条核对**

---

## 一、为什么这里没有"一本叫《格式塔交互理论》的书"

用户口语中的"格式塔交互理论"**并不是一本书**——它是**格式塔心理学（Gestalt Psychology）**
的知觉组织规律在交互设计上的转译。本工程**不替它编造一本不存在的书**，而是登记其**真实原始文献**。

> 本卡的登记口径（2026-10-01 用户裁决 D1）：**以格式塔心理学原始文献为准**
> （Wertheimer / Köhler / Koffka），现代设计转译类读物（如 *Laws of UX*）与视觉艺术类专著
> （如《艺术与视知觉》）暂**不登记为主源**，如需增补须另开辅源卡。

---

## 二、来源条目（主源）

| # | 文献 | 作者 | 年份 | 出版方 / 载体 | 本工程用途 |
| :-- | :--- | :--- | :---: | :--- | :--- |
| **S1** | *Untersuchungen zur Lehre von der Gestalt II*（《格式塔学说研究 II》） | Max Wertheimer | 1923 | *Psychologische Forschung*（心理学研究）期刊 | **知觉组织律的原始出处**：接近、相似、闭合、连续、共同命运等组织原则，以及 **Prägnanz（简洁/秩序）原则** 的经典表述 |
| **S2** | *Laws of Organization in Perceptual Forms*（知觉形式中的组织律） | Max Wertheimer | 1938 | 收录于 W. D. Ellis 编 *A Source Book of Gestalt Psychology*（英文译文选集） | 上述 1923 年德文原文的**英译可引用版本**，便于非德语读者核对 |
| **S3** | *Gestalt Psychology* | Wolfgang Köhler | 1929 | Liveright（New York） | 格式塔心理学的**理论体系化阐述**；支撑"整体大于部分之和"的方法论前提 |
| **S4** | *Principles of Gestalt Psychology* | Kurt Koffka | 1935 | Harcourt, Brace（New York） | 知觉组织的**系统化整理**；支撑"图形—背景"关系与组织律的相互作用论述 |

> ⚠️ **诚实声明**：上表为公开可查的**文献条目元数据**（作者、标题、年份、载体）。
> 本卡**不给出具体页码**——未逐页核对前一律标 🟡；编造"第 XX 页"违反本工程
> "不采信自述、证据必须可复核"的红线。

---

## 三、被本工程采纳的七条组织律（要点，不复述条款正文）

| # | 组织律 | 原始归属 | 本工程落地位置（条款真相源） |
| :-- | :--- | :--- | :--- |
| 1 | **接近律**（Proximity） | S1 | [`interaction_specification.md`](../common/interaction_specification.md) §一.1 |
| 2 | **相似律**（Similarity） | S1 | 同上 §一.2 |
| 3 | **闭合律**（Closure） | S1 | 同上 §一.3 |
| 4 | **主体与背景分离律**（Figure-Ground） | S1 / S4 | 同上 §一.4 |
| 5 | **对称与秩序律**（Prägnanz） | S1 | 同上 §一.5 |
| 6 | **连续律**（Continuity） | S1 | 同上 §一.6 |
| 7 | **共同命运律**（Common Fate） | S1 | 同上 §一.7 |

---

## 四、口径唯一性铁律（本条由 REQ-089 R1-b 实测缺陷锁定）

**格式塔定律的计数口径（七条）唯一权威出处 = `knowledge/common/interaction_specification.md`。**

- 其他文件（`README.md`、`knowledge/README.md`、`knowledge/common/README.md`、`indexes/rules_index.md` …）
  **只允许引用"格式塔七大定律"这一口径，不得自行写数字**；
- **实测缺陷（2026-10-01 修复）**：此前有 **4 处写"六大定律"**、**2 处写"七大定律"**，
  即"同一事实两种说法"；而当时 `conflict_scan` 报 **0 冲突**——因为它只校验
  "标题自称数 vs 标题下条目数"，**管不了散落在多处叙述文字里的同一事实**。
- **修复动作**：① 四处口径统一为"七大定律"；② 在 `conflict_scan.mjs` 的 C3 指标白名单新增
  `格式塔定律数`，采集范围含 `README.md` / `indexes/` / `knowledge/`，
  并补 3 条自检用例（含**反向验证**：故意造"六 vs 七"必须判冲突）。
- **回归命令**：`node scripts/conflict_scan.mjs --self-test`（29 项全过）与
  `node scripts/conflict_scan.mjs --root .`（0 冲突）。

---

## 五、本工程对原始文献的**转译口径**（转译 = 我们的判断，不是文献原话）

格式塔文献描述的是**人类知觉如何自发组织视觉信息**，其中**没有一条**是写给 UI 工程师的。
本工程做了三处明确转译，此三处属**本工程的解释**，不得回标为"文献规定"：

1. **从知觉律到像素约束**：把"接近律"落成具体间距数字（组内 `4~8px`、组间 `≥16~24px`，组间距为组内的 2~3 倍）；
2. **从组织律到组件规范**：把"闭合律"落成卡片 `1px` 描边或背景色块、禁止裸元素悬浮；
3. **从共同命运律到动效规范**：把"同步运动被感知为整体"落成"折叠/滑动时子项必须同加速度、同时长协同运动"。

---

## 六、引用锚点（谁引用了本卡）

| 引用方 | 引用方式 |
| :--- | :--- |
| [`knowledge/common/interaction_specification.md`](../common/interaction_specification.md) | §一 全部七条定律的出处 |
| [`knowledge/common/readability_specification.md`](../common/readability_specification.md) | §一.1 引用接近律与闭合律 |
| [`knowledge/sources/README.md`](README.md) | §二 已登记来源表 |
| [`scripts/conflict_scan.mjs`](../../scripts/conflict_scan.mjs) | C3 指标白名单 `格式塔定律数`（口径回归） |

---

## 七、维护原则
- 本卡**只写来源与要点索引**；条款正文以 `knowledge/common/interaction_specification.md` 为唯一真相源；
- 新增/改名组织律，必须**同步改本卡第三节与本工程全部引用处**，并跑 `conflict_scan` 回归；
- 升级核验状态为 🟢 需附核对方式，否则不得改状态；
- 保持文档全中文、通俗直白、无生僻字。
