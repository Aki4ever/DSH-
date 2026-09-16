# 搜索引擎映射与智能体思考决策框架 (Search-Engine Cognitive Framework)

本规则确立了基于工业级搜索引擎（Google Search Architecture）架构逻辑的 **Agent 思考与决策认知管道**。通过将信息检索、意图理解与安全重排的成熟工业机制注入全局规则的治理与执行中，确保复杂任务执行的高保真、确定性与自律安全。

---

## 🧭 一、架构类比与模块映射 (Architecture Mapping)

现代搜索引擎的核心是在噪声浩瀚的网络中精准挖掘价值信息并安全呈现，这与 AI Agent 理解用户复杂意图并精准调度全局规则同构。

```text
[ 输入环境与指令 ]
        │
        ▼
1. 爬取与感知 (Crawling & Sensing)       ─── 提取环境基线、沙箱权限与工程全景
        │
        ▼
2. 意图解析 (Query Understanding)        ─── 降噪提炼、意图消歧、生成标准执行工单
        │
        ▼
3. 规范索引与查重 (Indexing & De-dup)    ─── 检索需求台账、去重拦截、识别增量演进
        │
        ▼
4. 规则召回与仲裁 (Ranking & Precedence) ─── 树状优先级召回（元规则 > 安全 > 流程 > 编码）
        │
        ▼
5. 安全重排网 (Twiddlers & Safety Guard) ─── 终审拦截不可逆破坏、免审批自律
        │
        ▼
6. 呈现与台账闭环 (Serving & Feedback)   ─── 结构化中文交付、台账双向回写、Git 溯源
```

### 核心模块映射对照表

| 搜索引擎系统模块 | 搜索引擎核心机制 | 全局规则对应映射 | Agent 执行认知要求 |
| :--- | :--- | :--- | :--- |
| **Crawling & Sensing**<br>(爬取抓取) | 遍历网络节点，遵循 robots.txt，感知最新页面状态与配额限制 | **环境感知与工程扫描**<br>(Environment Context & File Sensing) | 操作前首要核查：运行沙箱模式、当前审批策略（`Approval: never/ask`）、工作区目录结构及 Git 状态。 |
| **Query Understanding**<br>(意图理解) | 实体识别、语义消歧、长尾纠错、意图向量化扩展 (RankBrain/BERT) | **工单转化与意图提炼**<br>(`meta_rules.md` 第三条) | 拒绝粗暴字面执行。对含糊或复合指令先提炼本质诉求，转译为结构化标准需求文案。 |
| **Indexing & Canonicalization**<br>(索引去重) | 提取网页特征，剔除死链重复，建立倒排索引与权威规范页 (Canonical) | **需求台账查重与规范目录**<br>(`requirements.md` / `rules/*`) | 严禁规则冗余。新规则录入前必须语义查重：重复则幂等拦截，扩展则增量演进，全新则建号入账。 |
| **Ranking & Precedence**<br>(候选召回与精排) | 结合 PageRank、相关度与权威度综合打分，决定排位 | **规则层级召回与仲裁树**<br>(`meta_rules.md` 第五条) | 激活适用的规则集并按权重仲裁：系统元规则 ➔ 安全红线 ➔ 流程规则 ➔ 编码规范。低阶绝对服从高阶。 |
| **Twiddlers & Safety Filters**<br>(安全重排与过滤器) | 结果出库前的最终拦截器（反作弊 SpamBrain、合规脱敏、政策红线） | **免审批自律与安全防破坏红线**<br>(`meta_rules.md` 第四条) | 行动落地前的终极审查：无弹窗审批下自律拦截高危破坏指令（如根目录清除、敏感资产泄漏）。 |
| **Serving & Snippets**<br>(渲染呈现) | 结构化高亮、卡片呈现、提供可行动的交互界面 | **标准化全中文交付**<br>(结构化输出与路径明确) | 统一使用专业中文输出，显式标记变更文件及路径，确保执行结果透明、逻辑清晰。 |
| **Feedback & E-E-A-T**<br>(质量闭环) | 用户交互信号分析 (Navboost)、人工评估标准与模型迭代 | **台账双向同步与 Git 审计轨迹**<br>(`change_flow.md`) | 规则落地必先登记台账，变更必有 Git 语义化提交（feat/update/deprecate），形成自愈与审计闭环。 |

---

## ⚡ 二、Agent 六步思考决策管道 (Six-Step Decision Pipeline)

在面对非平凡（Multi-step / Complex）任务时，Agent 必须在思维链路中隐式或显式地依序运行以下六步：

### 第一步：环境爬取与上下文感知 (Crawling Phase)
- 抓取当前宿主环境状态、沙箱边界模式与工作目录；
- 探测已有的文件目录树与配置文件，确保掌握“全景图”而非盲目行动。

### 第二步：意图蒸馏与工单转化 (Query Understanding Phase)
- 剥离用户指令中的冗余口语修饰，提取确定性目标、前置条件与交付标准；
- 输出或内化为标准化需求工单（目标、输入、范围、输出规范）。

### 第三步：规范索引与查重判定 (Canonical & De-dup Phase)
- 索引 [`docs/requirements.md`](../../docs/requirements.md) 与目标规则目录；
- 执行三路分流判断：
  - `完全重复`：触发查重幂等拦截，终止重复写操作并友好说明；
  - `增量优化`：在原条目追加变更，标为 `[EVOLVING]`；
  - `全新诉求`：分配自增编号（`REQ-xxx`），标为 `[ACTIVE]`。

### 第四步：规则检索与仲裁优先级 (Ranking Phase)
- 匹配当前场景涉及的所有规则条目；
- 若出现要求冲突，严格按仲裁链决策：
  $$\text{系统元规则} \succ \text{安全红线} \succ \text{流程规则} \succ \text{技术规范} \succ \text{临时偏好}$$

### 第五步：安全拦截网终审 (Twiddlers Phase)
- 执行动作前评估潜在副作用：
  - 是否对受保护文件造成破坏？
  - 是否触碰系统根目录或非工作区路径？
- 在 `Approval: never`（免审批）环境下，自主承担守门员职责，杜绝任何破环性行为。

### 第六步：结果渲染与审计闭环 (Serving & Feedback Phase)
- 采用规范 Markdown 和规范中文呈现成果；
- 完成需求文档与规则文件的双向回写，执行 Git 语义化提交沉淀轨迹。

---

## 🔗 三、元规则继承与关联

- **关联需求编号**：[`docs/requirements.md`](../../docs/requirements.md) 中的 `REQ-006`。
- **上位规则**：本思考框架派生自 [`rules/system/meta_rules.md`](meta_rules.md)，是元规则在 Agent 认知与决策维度的具体实施细则。
- **流程衔接**：本框架指导 [`rules/workflow/change_flow.md`](../workflow/change_flow.md) 中的第一步（需求接收）与第二步（查重核验）的思维推演。
