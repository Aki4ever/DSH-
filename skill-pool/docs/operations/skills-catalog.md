# DSH 全局 Skill Catalog (四级能力模型与积木式映射表)

> 本文档由 DSH 管家统一调度维护。严格遵循 **L1 原子规约 → L2 工序动作 → L3 复合流程 → L4 中枢编排** 四级能力模型，并基于微观原子操作做加法（Composition）。

- **最后同步时间**：2026-09-29 02:33:05
- **总纳管技能数**：183 个

---

## 1. 技能四级能力分级总览

| 级别 | Skill ID | 类别名称 | 触发关键词 | 加法依赖 (Composition) | 路径 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **L1** | `anti-pattern-policy` | 原子规约-反例清单 | `反例层`、`禁止事件`、`死循环` | *(原子基元)* | `skills/anti-pattern-policy` |
| **L1** | `arbitrate-priority-resolver` | 原子规约-仲裁准则 | `优先级仲裁`、`冲突裁决`、`裁定优先级` | *(原子基元)* | `skills/arbitrate-priority-resolver` |
| **L1** | `atomic-lock-policy` | 原子规约-物理原子锁 | `原子锁`、`物理互斥`、`mkdir原子目录` | *(原子基元)* | `skills/atomic-lock-policy` |
| **L1** | `capability-naming-policy` | 原子规约-能力层命名 | `能力层命名`、`命名四要素`、`命名形态` | *(原子基元)* | `skills/capability-naming-policy` |
| **L1** | `chinese-end-to-end` | 原子规约-全流程中文 | `全流程中文`、`中文回复`、`技术标识符释义` | *(原子基元)* | `skills/chinese-end-to-end` |
| **L1** | `concise-focused-output` | 原子规约-简短聚焦 | `简短输出`、`聚焦重点`、`拒绝冗长` | *(原子基元)* | `skills/concise-focused-output` |
| **L1** | `concretize-ambiguity-policy` | 原子规约-含糊具像化 | `含糊具像化`、`具像化`、`避免含糊` | *(原子基元)* | `skills/concretize-ambiguity-policy` |
| **L1** | `conditional-deliverable-router` | 原子规约-分支路由 | `条件分支`、`产物路由`、`核心结论` | *(原子基元)* | `skills/conditional-deliverable-router` |
| **L1** | `enforce-atomic-granularity` | 原子规约-粒度物理化 | `粒度原子化`、`探针绑定`、`不可断言不得实施` | *(原子基元)* | `skills/enforce-atomic-granularity` |
| **L1** | `enforce-contract-completeness` | 原子规约-契约完整性 | `契约完整`、`头体规范`、`场景规范` | *(原子基元)* | `skills/enforce-contract-completeness` |
| **L1** | `fastlane-redline-policy` | 原子规约-快车道红线 | `红线规约`、`不可逆动作`、`红线优先` | *(原子基元)* | `skills/fastlane-redline-policy` |
| **L1** | `fastpath-dispatch-guide` | 原子规约-快捷路由指引 | `快捷路由指引`、`直调卡片`、`秒级触达` | *(原子基元)* | `skills/fastpath-dispatch-guide` |
| **L1** | `filter-conversational-noise` | 原子规约-噪音过滤 | `过滤噪音`、`去口癖`、`过滤语气词` | *(原子基元)* | `skills/filter-conversational-noise` |
| **L1** | `format-iconized-tail` | 原子规约-图标尾部 | `尾部图标`、`特异化图标`、`集中输出` | *(原子基元)* | `skills/format-iconized-tail` |
| **L1** | `format-status-block` | 原子规约-状态规范 | `当前状态`、`状态标记`、`状态输出` | *(原子基元)* | `skills/format-status-block` |
| **L1** | `format-visual-inspection` | 原子规约-可视化规约 | `可视化规约`、`强制图表`、`拒绝纯文本` | *(原子基元)* | `skills/format-visual-inspection` |
| **L1** | `format-zoomable-visual` | 原子规约-可缩放可视化 | `可缩放`、`点击放大`、`复位交互` | *(原子基元)* | `skills/format-zoomable-visual` |
| **L1** | `high-relevance-notes-only` | 原子规约-说明过滤 | `重要说明`、`高相关说明`、`操作指南` | *(原子基元)* | `skills/high-relevance-notes-only` |
| **L1** | `instance-pool-policy` | 原子规约-多实例准入 | `实例多开`、`并发安全`、`资源键` | *(原子基元)* | `skills/instance-pool-policy` |
| **L1** | `layer-decoupling-policy` | 原子规约-执行层解耦 | `执行层解耦`、`契约通信`、`禁止逆向依赖` | *(原子基元)* | `skills/layer-decoupling-policy` |
| **L1** | `lazy-load-policy` | 原子规约-按需加载 | `按需加载`、`未命中不加载`、`禁止通配` | *(原子基元)* | `skills/lazy-load-policy` |
| **L1** | `limit-words-under-10` | 原子规约-长度基元 | `10字内`、`不超过10字`、`简短` | *(原子基元)* | `skills/limit-words-under-10` |
| **L1** | `markdown-bold-only` | 原子规约-排版基元 | `全黑体`、`全加粗`、`Markdown粗体` | *(原子基元)* | `skills/markdown-bold-only` |
| **L1** | `milestone-only-progress` | 原子规约-里程碑输出 | `里程碑`、`阶段目标`、`只报阶段` | *(原子基元)* | `skills/milestone-only-progress` |
| **L1** | `multi-source-search-policy` | 原子规约-多源检索 | `检索源`、`本地优先`、`候选契约` | *(原子基元)* | `skills/multi-source-search-policy` |
| **L1** | `no-conversational-filler` | 原子规约-风格基元 | `不要废话`、`零寒暄`、`免开场白` | *(原子基元)* | `skills/no-conversational-filler` |
| **L1** | `one-shot-resolution-policy` | 原子规约-一次性解决 | `一次性解决`、`不反复提问`、`自行决断` | *(原子基元)* | `skills/one-shot-resolution-policy` |
| **L1** | `output-chinese-only` | 原子规约-语言基元 | `纯中文`、`中文输出`、`不要英文` | *(原子基元)* | `skills/output-chinese-only` |
| **L1** | `parallel-lock-policy` | 原子规约-并行调控锁 | `并行锁`、`锁粒度`、`字典序加锁` | *(原子基元)* | `skills/parallel-lock-policy` |
| **L1** | `plain-analogy-explanation` | 原子规约-通俗比喻 | `通俗易懂`、`生活比喻`、`常识解释` | *(原子基元)* | `skills/plain-analogy-explanation` |
| **L1** | `plugin-control-jump-policy` | 原子规约-插件调控入口 | `常显按钮`、`幂等去重`、`降级导航` | *(原子基元)* | `skills/plugin-control-jump-policy` |
| **L1** | `prefer-hot-reload-policy` | 原子规约-不重启优先 | `能不重启就不重启`、`热更优先`、`重启证据` | *(原子基元)* | `skills/prefer-hot-reload-policy` |
| **L1** | `process-conformance-policy` | 原子规约-流程合规 | `流程合规`、`九步流程`、`必需项否决` | *(原子基元)* | `skills/process-conformance-policy` |
| **L1** | `prune-bloated-prompts` | 原子规约-防膨胀 | `防膨胀`、`裁剪提示词`、`去同义反复` | *(原子基元)* | `skills/prune-bloated-prompts` |
| **L1** | `quantify-modifier-policy` | 原子规约-程度词量化 | `程度词量化`、`高大量化`、`四要素` | *(原子基元)* | `skills/quantify-modifier-policy` |
| **L1** | `snippet-only-recall` | 原子规约-片段回灌 | `只回灌片段`、`不回灌全文`、`检索返回面` | *(原子基元)* | `skills/snippet-only-recall` |
| **L1** | `standardize-when-to-use` | 原子规约-场景规范 | `场景规范`、`触发场景`、`When to Use` | *(原子基元)* | `skills/standardize-when-to-use` |
| **L1** | `standardize-workflow-sop` | 原子规约-SOP规范 | `SOP规范`、`状态机流程`、`运作SOP` | *(原子基元)* | `skills/standardize-workflow-sop` |
| **L1** | `strip-markdown-fence` | 原子规约-结构基元 | `去代码块`、`去围栏`、`纯净输出` | *(原子基元)* | `skills/strip-markdown-fence` |
| **L1** | `strip-whitespace-newlines` | 原子规约-排版基元 | `去空白`、`折叠空行`、`剥离空格` | *(原子基元)* | `skills/strip-whitespace-newlines` |
| **L1** | `token-budget-policy` | 原子规约-token预算 | `token预算`、`上下文预算`、`裁剪顺序` | *(原子基元)* | `skills/token-budget-policy` |
| **L1** | `tree-update-mandatory` | 原子规约-树同步强制 | `改能力必改树`、`同步索引`、`树及时更新` | *(原子基元)* | `skills/tree-update-mandatory` |
| **L1** | `zoom-level-policy` | 原子规约-可视化交互 | `多级缩放`、`缩放档位`、`吸附` | *(原子基元)* | `skills/zoom-level-policy` |
| **L2** | `acquire-atomic-lock` | 工序动作-物理原子锁 | `获取锁`、`释放锁`、`陈旧锁回收` | `atomic-lock-policy` | `skills/acquire-atomic-lock` |
| **L2** | `assert-zero-exitcode` | 工序动作-退出码断言 | `退出码0`、`命令断言`、`执行成功断言` | *(原子基元)* | `skills/assert-zero-exitcode` |
| **L2** | `audit-all-skills-compliance` | 工序动作-全量合规审计 | `全量审计`、`存量合规`、`契约体检` | *(原子基元)* | `skills/audit-all-skills-compliance` |
| **L2** | `audit-imported-skill` | 工序动作-引入审计 | `引入审计`、`许可白名单`、`供应链风险` | *(原子基元)* | `skills/audit-imported-skill` |
| **L2** | `audit-layer-naming` | 工序动作-命名体检 | `命名体检`、`违规清单`、`命名合规率` | `capability-naming-policy` | `skills/audit-layer-naming` |
| **L2** | `build-execution-tree` | 工序动作-执行层建树 | `执行层树`、`树状结构`、`集群归属` | `register-execution-layer` | `skills/build-execution-tree` |
| **L2** | `build-image-viewer` | 工序动作-查看器生成 | `生成查看器`、`单文件HTML`、`内联图片` | `format-zoomable-visual` | `skills/build-image-viewer` |
| **L2** | `build-inverted-index` | 工序动作-倒排索引 | `倒排索引`、`建索引`、`term检索` | *(原子基元)* | `skills/build-inverted-index` |
| **L2** | `build-layer-graph` | 工序动作-层间依赖图 | `层间依赖图`、`建图`、`层级关系` | `layer-decoupling-policy` | `skills/build-layer-graph` |
| **L2** | `build-quantifier-table` | 工序动作-量化映射表 | `量化映射表`、`建量化表`、`场景阈值` | `quantify-modifier-policy` | `skills/build-quantifier-table` |
| **L2** | `check-deepseek-usage` | 业务定制技能 | `check-deepseek-usage` | `multi-source-search-policy` | `skills/check-deepseek-usage` |
| **L2** | `check-python-syntax` | 工序动作-语法编译 | `Python语法`、`编译校验`、`代码检查` | *(原子基元)* | `skills/check-python-syntax` |
| **L2** | `check-script-executable` | 工序动作-脚本可执行检测 | `执行权限检测`、`可执行检查`、`脚本存在` | *(原子基元)* | `skills/check-script-executable` |
| **L2** | `classify-change-scope` | 工序动作-变更处置判定 | `变更判定`、`热更判定`、`是否需要重启` | `prefer-hot-reload-policy` | `skills/classify-change-scope` |
| **L2** | `classify-decision-reversibility` | 工序动作-决策可逆判定 | `可逆判定`、`自行决断还是提问`、`红线不可逆` | `one-shot-resolution-policy` | `skills/classify-decision-reversibility` |
| **L2** | `classify-instance-safety` | 工序动作-实例安全分档 | `实例分档`、`并发安全判定`、`safe_multi` | `instance-pool-policy` | `skills/classify-instance-safety` |
| **L2** | `classify-step-tier` | 工序动作-事件分档 | `事件分档`、`milestone判定`、`micro识别` | `milestone-only-progress` | `skills/classify-step-tier` |
| **L2** | `collect-process-evidence` | 工序动作-流程取证 | `流程取证`、`证据包`、`无证据即fail` | `process-conformance-policy` | `skills/collect-process-evidence` |
| **L2** | `concretize-term` | 工序动作-含糊词具像化 | `具像化词汇`、`把若干变具体`、`实体枚举` | `concretize-ambiguity-policy` + `detect-vague-modifier` | `skills/concretize-term` |
| **L2** | `confirm-before-coding` | 安全准入-变更审批 | `代码修改`、`破坏性操作`、`写入前确认` | *(原子基元)* | `@system/confirm-before-coding` |
| **L2** | `declare-lock-set` | 工序动作-锁集合声明 | `锁集合`、`锁键归一`、`加锁顺序` | `parallel-lock-policy` | `skills/declare-lock-set` |
| **L2** | `detect-action-verb` | 工序动作-动词识别 | `动作词`、`动词判定`、`指令动作` | *(原子基元)* | `skills/detect-action-verb` |
| **L2** | `detect-forbidden-state` | 工序动作-反例检测 | `反例检测`、`禁止状态`、`事件流检测` | `anti-pattern-policy` | `skills/detect-forbidden-state` |
| **L2** | `detect-layer-coupling` | 工序动作-耦合检测 | `耦合检测`、`依赖违规`、`隐式耦合` | `build-layer-graph` | `skills/detect-layer-coupling` |
| **L2** | `detect-lock-conflict` | 工序动作-锁冲突检测 | `锁冲突`、`死锁检测`、`超时未释放` | `declare-lock-set` | `skills/detect-lock-conflict` |
| **L2** | `detect-rule-conflicts` | 工序动作-冲突对拍 | `冲突检测`、`互斥检测`、`规则冲突` | *(原子基元)* | `skills/detect-rule-conflicts` |
| **L2** | `detect-target-entity` | 工序动作-实体提取 | `实体识别`、`操作对象`、`目标实体` | *(原子基元)* | `skills/detect-target-entity` |
| **L2** | `detect-vague-modifier` | 工序动作-模糊词检测 | `模糊词检测`、`含糊词检测`、`程度词检测` | `build-quantifier-table` | `skills/detect-vague-modifier` |
| **L2** | `disambiguate-candidates` | 工序动作-消歧打分 | `消除歧义`、`消歧`、`候选打分` | *(原子基元)* | `skills/disambiguate-candidates` |
| **L2** | `dispatch-skill-search` | 工序动作-四源检索调度 | `四源调度`、`本地优先`、`短路留痕` | `multi-source-search-policy` + `search-github-skill` + `search-official-source` + `merge-search-candidates` | `skills/dispatch-skill-search` |
| **L2** | `emit-search-snippet` | 工序动作-摘要片段 | `摘要片段`、`snippet`、`命中片段` | `rank-skills-bm25` | `skills/emit-search-snippet` |
| **L2** | `ensure-utf8-encoding` | 工序动作-编码检测 | `UTF8检测`、`编码断言`、`防乱码` | *(原子基元)* | `skills/ensure-utf8-encoding` |
| **L2** | `extract-catalog-topology` | 工序动作-拓扑提取 | `提取拓扑`、`读取Catalog`、`拓扑数据` | *(原子基元)* | `skills/extract-catalog-topology` |
| **L2** | `extract-core-objective` | 工序动作-目标提取 | `提取意图`、`动宾提取`、`实体识别` | *(原子基元)* | `skills/extract-core-objective` |
| **L2** | `extract-json-payload` | 工序动作-数据抽取 | `提取JSON`、`正则提取`、`JSON解析` | *(原子基元)* | `skills/extract-json-payload` |
| **L2** | `fold-repeated-events` | 工序动作-事件折叠 | `事件折叠`、`计数折叠`、`重复合并` | `classify-step-tier` | `skills/fold-repeated-events` |
| **L2** | `generate-fastpath-route` | 工序动作-快捷路由生成 | `快捷路由`、`提取直调命令`、`直达原子` | *(原子基元)* | `skills/generate-fastpath-route` |
| **L2** | `install-client-plugin` | 工序动作-客户端插件装配 | `插件装配`、`幂等`、`备份回滚` | `plugin-control-jump-policy` | `skills/install-client-plugin` |
| **L2** | `load-skill-contract` | 工序动作-单契约加载 | `加载技能`、`按需读取`、`单契约` | `lazy-load-policy` | `skills/load-skill-contract` |
| **L2** | `log-query-events` | 工序动作-质量信号 | `检索日志`、`质量信号`、`query日志` | `rank-skills-bm25` | `skills/log-query-events` |
| **L2** | `match-intent-keywords` | 工序动作-关键词索引 | `匹配关键词`、`检索技能`、`初筛候选` | *(原子基元)* | `skills/match-intent-keywords` |
| **L2** | `measure-routing-metrics` | 工序动作-路由耗时测算 | `测算耗时`、`路由时长`、`索引命中测算` | *(原子基元)* | `skills/measure-routing-metrics` |
| **L2** | `measure-token-budget` | 工序动作-token度量 | `统计token`、`token消耗`、`上下文统计` | `token-budget-policy` | `skills/measure-token-budget` |
| **L2** | `merge-search-candidates` | 工序动作-候选去重归一 | `候选去重`、`统一契约`、`全序排序` | `multi-source-search-policy` | `skills/merge-search-candidates` |
| **L2** | `normalize-skill-contract` | 工序动作-契约归一 | `契约归一`、`补齐Frontmatter`、`统一SOP` | *(原子基元)* | `skills/normalize-skill-contract` |
| **L2** | `parse-query` | 工序动作-查询解析 | `查询解析`、`分词`、`同义词` | `build-inverted-index` | `skills/parse-query` |
| **L2** | `place-skill-into-cluster` | 工序动作-定级挂载 | `定级挂载`、`集群归属`、`依赖边校验` | *(原子基元)* | `skills/place-skill-into-cluster` |
| **L2** | `plan-fission` | 工序动作-分裂规划 | `分裂规划`、`粒度评估`、`分裂清单` | `enforce-atomic-granularity` + `detect-vague-modifier` | `skills/plan-fission` |
| **L2** | `plan-process-rectification` | 工序动作-流程整改 | `整改清单`、`可执行命令`、`空话判不合格` | `process-conformance-policy` | `skills/plan-process-rectification` |
| **L2** | `prune-redundant-context` | 工序动作-上下文裁剪 | `裁剪上下文`、`去重复`、`冗余裁剪` | `measure-token-budget` | `skills/prune-redundant-context` |
| **L2** | `quantify-modifier` | 工序动作-程度词量化 | `量化程度词`、`把高量化`、`给出数值区间` | `detect-vague-modifier` | `skills/quantify-modifier` |
| **L2** | `rank-skills-bm25` | 工序动作-相关度排序 | `BM25`、`相关度排序`、`排序` | `parse-query` + `build-inverted-index` | `skills/rank-skills-bm25` |
| **L2** | `reconcile-knowledge-specs` | 工序动作-规范对照仲裁 | `规范对照`、`知识库规范`、`规范对拍` | *(原子基元)* | `skills/reconcile-knowledge-specs` |
| **L2** | `record-assumptions` | 工序动作-假设留痕 | `假设留痕`、`记录假设`、`假设清单` | `classify-decision-reversibility` | `skills/record-assumptions` |
| **L2** | `register-execution-layer` | 工序动作-执行层登记 | `登记执行层`、`cli登记`、`mcp登记` | `tree-update-mandatory` | `skills/register-execution-layer` |
| **L2** | `rename-execution-layer` | 工序动作-命名整改 | `改名整改`、`六处同步`、`幂等重跑` | `capability-naming-policy` + `audit-layer-naming` + `build-layer-graph` + `build-inverted-index` + `classify-instance-safety` + `build-execution-tree` | `skills/rename-execution-layer` |
| **L2** | `render-capability-naming` | 工序动作-命名文档渲染 | `命名规范文档`、`受管区块渲染`、`漂移检测` | `capability-naming-policy` + `audit-layer-naming` | `skills/render-capability-naming` |
| **L2** | `render-catalog-docs` | 工序动作-受管区块生成 | `生成受管区块`、`刷新组装表`、`禁止手写` | `enforce-atomic-granularity` | `skills/render-catalog-docs` |
| **L2** | `render-governance-mermaid` | 工序动作-图谱编译 | `渲染Mermaid`、`编译图表`、`生成拓扑图` | *(原子基元)* | `skills/render-governance-mermaid` |
| **L2** | `retire-legacy-workspace` | 工序动作-工作区退役 | `工作区退役`、`不丢文件`、`摘注册` | `verify-workspace-retirement` | `skills/retire-legacy-workspace` |
| **L2** | `run-test-cases-gate` | 工序动作-测试用例门禁 | `测试用例`、`测试门禁`、`自动化测试` | *(原子基元)* | `skills/run-test-cases-gate` |
| **L2** | `score-process-conformance` | 工序动作-流程打分 | `流程打分`、`权重分子分母`、`必需项否决` | `process-conformance-policy` | `skills/score-process-conformance` |
| **L2** | `score-task-lane` | 工序动作-分流判定 | `分流判定`、`快车道`、`完整流程` | `fastlane-redline-policy` | `skills/score-task-lane` |
| **L2** | `search-duplicate-rules` | 工序动作-重复比对 | `检测重复`、`冗余规则`、`相似度比对` | *(原子基元)* | `skills/search-duplicate-rules` |
| **L2** | `search-github-skill` | 工序动作-外部技能检索 | `检索技能`、`GitHub候选`、`候选清单` | *(原子基元)* | `skills/search-github-skill` |
| **L2** | `search-official-source` | 工序动作-官网源检索 | `官网检索`、`sitemap`、`来源可追溯` | `multi-source-search-policy` | `skills/search-official-source` |
| **L2** | `select-skills-for-task` | 工序动作-选技清单 | `选技`、`技能清单`、`命中技能` | `rank-skills-bm25` + `lazy-load-policy` | `skills/select-skills-for-task` |
| **L2** | `strip-non-prose-scope` | 工序动作-非散文剥离 | `剥离代码`、`剥离路径`、`剥离URL` | `chinese-end-to-end` | `skills/strip-non-prose-scope` |
| **L2** | `sync-requirements-lifecycle` | 工序动作-需求生命周期同步 | `需求同步`、`需求版本`、`图纸检查` | *(原子基元)* | `skills/sync-requirements-lifecycle` |
| **L2** | `track-task-progress` | 执行监控-进度追踪 | `进度`、`步骤跟踪`、`任务看板` | *(原子基元)* | `@system/track-task-progress` |
| **L2** | `validate-header-triggers` | 工序动作-头部校验 | `头部校验`、`Frontmatter校验`、`元数据检查` | *(原子基元)* | `skills/validate-header-triggers` |
| **L2** | `validate-icon-syntax` | 工序动作-图标正则校验 | `校验图标`、`尾部正则`、`图标断言` | *(原子基元)* | `skills/validate-icon-syntax` |
| **L2** | `verify-atomic-mutual-exclusion` | 工序动作-互斥压测断言 | `互斥压测`、`临界区重叠`、`多进程并发` | `atomic-lock-policy` + `acquire-atomic-lock` | `skills/verify-atomic-mutual-exclusion` |
| **L2** | `verify-catalog-consistency` | 工序动作-口径对拍 | `口径对拍`、`三方一致`、`漂移检测` | `render-catalog-docs` | `skills/verify-catalog-consistency` |
| **L2** | `verify-chinese-output` | 工序动作-中文断言 | `中文占比`、`拉丁词零容忍`、`缩写释义` | `strip-non-prose-scope` | `skills/verify-chinese-output` |
| **L2** | `verify-concretized-output` | 工序动作-具像化断言 | `具像化断言`、`含糊词校验`、`同义替换检测` | `concretize-term` | `skills/verify-concretized-output` |
| **L2** | `verify-context-payload` | 工序动作-上下文预算断言 | `上下文预算`、`加载量断言`、`越权加载` | `select-skills-for-task` + `load-skill-contract` | `skills/verify-context-payload` |
| **L2** | `verify-decoupling` | 工序动作-解耦断言 | `解耦断言`、`零违规`、`显式豁免` | `detect-layer-coupling` | `skills/verify-decoupling` |
| **L2** | `verify-deliverable-paths` | 工序动作-地址探针 | `校验路径`、`输出地址`、`地址物理检测` | *(原子基元)* | `skills/verify-deliverable-paths` |
| **L2** | `verify-execution-contract` | 工序动作-契约脚本验证 | `执行契约`、`验证脚本`、`白盒运作` | *(原子基元)* | `skills/verify-execution-contract` |
| **L2** | `verify-execution-tree` | 工序动作-树一致性断言 | `树一致性`、`结构漂移`、`孤儿原子` | `build-execution-tree` | `skills/verify-execution-tree` |
| **L2** | `verify-file-exists` | 工序动作-文件探针 | `文件检测`、`落地验证`、`文件存在` | *(原子基元)* | `skills/verify-file-exists` |
| **L2** | `verify-instance-safety` | 工序动作-实例声明断言 | `声明一致性`、`实例安全断言`、`声明陈旧检测` | `classify-instance-safety` | `skills/verify-instance-safety` |
| **L2** | `verify-interactive-html` | 工序动作-交互HTML探针 | `交互探针`、`缩放控件断言`、`零外链校验` | `format-zoomable-visual` | `skills/verify-interactive-html` |
| **L2** | `verify-lane-decision` | 工序动作-判定复算 | `判定复算`、`分流确定性`、`lane抖动` | `score-task-lane` | `skills/verify-lane-decision` |
| **L2** | `verify-layer-naming` | 工序动作-命名断言 | `合规率断言`、`悬空引用`、`词边界扫描` | `capability-naming-policy` + `audit-layer-naming` | `skills/verify-layer-naming` |
| **L2** | `verify-mermaid-syntax` | 工序动作-流程图语法校验 | `Mermaid校验`、`流程图语法`、`图表合法性` | *(原子基元)* | `skills/verify-mermaid-syntax` |
| **L2** | `verify-no-forbidden-event` | 工序动作-反例零命中断言 | `零命中`、`反例断言`、`事件流合规` | `detect-forbidden-state` | `skills/verify-no-forbidden-event` |
| **L2** | `verify-no-lock-violation` | 工序动作-锁违规断言 | `锁违规断言`、`并行派单门禁`、`死循环体检` | `detect-lock-conflict` + `detect-forbidden-state` | `skills/verify-no-lock-violation` |
| **L2** | `verify-no-unnecessary-question` | 工序动作-反问检测断言 | `反问检测`、`提问次数断言`、`挤牙膏追问` | `record-assumptions` | `skills/verify-no-unnecessary-question` |
| **L2** | `verify-no-unnecessary-restart` | 工序动作-重启必要性断言 | `不必要重启`、`重启证据`、`重建命令` | `classify-change-scope` | `skills/verify-no-unnecessary-restart` |
| **L2** | `verify-plugin-control-button` | 工序动作-调控按钮断言 | `按钮断言`、`DOM打桩`、`幂等验证` | `plugin-control-jump-policy` + `install-client-plugin` | `skills/verify-plugin-control-button` |
| **L2** | `verify-progress-budget` | 工序动作-进度预算断言 | `进度预算`、`里程碑覆盖`、`micro泄漏` | `fold-repeated-events` + `classify-step-tier` | `skills/verify-progress-budget` |
| **L2** | `verify-quantified-output` | 工序动作-量化断言 | `未量化断言`、`量化门禁`、`同义替换拦截` | `quantify-modifier` + `detect-vague-modifier` | `skills/verify-quantified-output` |
| **L2** | `verify-token-reduction` | 工序动作-降幅断言 | `降幅断言`、`token下降`、`能力不变` | `measure-token-budget` + `prune-redundant-context` | `skills/verify-token-reduction` |
| **L2** | `verify-workspace-retirement` | 工序动作-退役断言 | `退役断言`、`源已消失`、`会话完整` | *(原子基元)* | `skills/verify-workspace-retirement` |
| **L3** | `anti-pattern-guard` | 复合流程-反例门禁 | `反例门禁`、`禁止事件门禁`、`死循环阻断` | `anti-pattern-policy` + `detect-forbidden-state` + `verify-no-forbidden-event` | `skills/anti-pattern-guard` |
| **L3** | `atomic-fastpath-router` | 复合流程-快捷路由总控 | `快捷路由总控`、`原子直达`、`路由引擎` | `fastpath-dispatch-guide` + `generate-fastpath-route` | `skills/atomic-fastpath-router` |
| **L3** | `atomic-fission-guard` | 复合流程-粒度分裂门禁 | `粒度门禁`、`不可断言阻断`、`递归分裂门禁` | `enforce-atomic-granularity` + `plan-fission` | `skills/atomic-fission-guard` |
| **L3** | `atomic-lock-guard` | 复合流程-物理原子锁门禁 | `原子锁门禁`、`物理互斥证明`、`同时处理放行` | `atomic-lock-policy` + `acquire-atomic-lock` + `verify-atomic-mutual-exclusion` | `skills/atomic-lock-guard` |
| **L3** | `catalog-consistency-guard` | 复合流程-口径一致性门禁 | `口径门禁`、`一致性门禁`、`消除漂移` | `render-catalog-docs` + `verify-catalog-consistency` | `skills/catalog-consistency-guard` |
| **L3** | `chinese-output-guard` | 复合流程-中文输出门禁 | `中文门禁`、`全中文交付`、`中文校验门禁` | `chinese-end-to-end` + `strip-non-prose-scope` + `verify-chinese-output` | `skills/chinese-output-guard` |
| **L3** | `concise-chinese-bold-guard` | 复合流程-极简加粗 | `极简中文加粗`、`10个字以内全加粗中文` | `output-chinese-only` + `limit-words-under-10` + `markdown-bold-only` + `no-conversational-filler` | `skills/concise-chinese-bold-guard` |
| **L3** | `concretization-guard` | 复合流程-具像化门禁 | `具像化门禁`、`含糊词门禁`、`实体化交付` | `concretize-ambiguity-policy` + `concretize-term` + `verify-concretized-output` | `skills/concretization-guard` |
| **L3** | `conflict-detector` | 复合流程-冲突检测 | `冲突检测`、`冲突仲裁`、`解决冲突` | `arbitrate-priority-resolver` + `detect-rule-conflicts` | `skills/conflict-detector` |
| **L3** | `decoupling-guard` | 复合流程-解耦门禁 | `解耦门禁`、`依赖合法性门禁`、`契约通信门禁` | `layer-decoupling-policy` + `build-layer-graph` + `detect-layer-coupling` + `verify-decoupling` | `skills/decoupling-guard` |
| **L3** | `dual-lane-router` | 复合流程-双流程分流总控 | `双流程`、`快慢分流`、`流程选择` | `fastlane-redline-policy` + `score-task-lane` + `verify-lane-decision` | `skills/dual-lane-router` |
| **L3** | `execution-tree-guard` | 复合流程-执行层树门禁 | `树门禁`、`结构一致性门禁`、`执行层树维护` | `tree-update-mandatory` + `register-execution-layer` + `build-execution-tree` + `verify-execution-tree` | `skills/execution-tree-guard` |
| **L3** | `full-spectrum-skill-auditor` | 复合流程-全量审计门禁 | `全量体检`、`合规门禁`、`全盘审计` | `enforce-contract-completeness` + `audit-all-skills-compliance` | `skills/full-spectrum-skill-auditor` |
| **L3** | `github` | 代码协同-Git/PR | `git commit`、`push`、`pr` | *(原子基元)* | `@system/github` |
| **L3** | `google-style-skill-search-router` | 复合流程-技能检索总控 | `技能检索`、`搜索技能`、`找技能` | `snippet-only-recall` + `build-inverted-index` + `parse-query` + `rank-skills-bm25` + `emit-search-snippet` + `log-query-events` | `skills/google-style-skill-search-router` |
| **L3** | `iconized-output-showcase` | 复合流程-图标展示总控 | `图标展示`、`尾部图标总控`、`图标输出` | `format-iconized-tail` + `validate-icon-syntax` | `skills/iconized-output-showcase` |
| **L3** | `index-body-contract` | 复合流程-主体契约 | `索引主体`、`主体契约`、`运作机制` | `standardize-workflow-sop` + `verify-mermaid-syntax` + `check-script-executable` + `verify-execution-contract` | `skills/index-body-contract` |
| **L3** | `index-header-contract` | 复合流程-头部契约 | `索引头部`、`头部契约`、`场景契约` | `standardize-when-to-use` + `validate-header-triggers` | `skills/index-header-contract` |
| **L3** | `instance-pool-guard` | 复合流程-实例准入门禁 | `实例准入门禁`、`多开许可`、`并发准入` | `instance-pool-policy` + `classify-instance-safety` + `verify-instance-safety` | `skills/instance-pool-guard` |
| **L3** | `intent-detector` | 复合流程-意图检测 | `意图识别`、`意图检测`、`检测目的` | `filter-conversational-noise` + `strip-whitespace-newlines` + `detect-action-verb` + `detect-target-entity` + `extract-core-objective` | `skills/intent-detector` |
| **L3** | `interactive-image-viewer` | 复合流程-可缩放查看器总控 | `查看器总控`、`图片放大`、`缩放交付` | `format-zoomable-visual` + `build-image-viewer` + `verify-interactive-html` | `skills/interactive-image-viewer` |
| **L3** | `layer-naming-guard` | 复合流程-命名规范门禁 | `命名规范门禁`、`命名放行`、`三项实数` | `capability-naming-policy` + `audit-layer-naming` + `rename-execution-layer` + `verify-layer-naming` + `render-capability-naming` | `skills/layer-naming-guard` |
| **L3** | `manage-problem-log` | 质量运维-问题归档 | `bug`、`问题`、`报错` | *(原子基元)* | `@system/manage-problem-log` |
| **L3** | `manage-requirements` | 系统协同-需求管理 | `需求`、`REQ-`、`需求变更` | *(原子基元)* | `@system/manage-requirements` |
| **L3** | `milestone-progress-reporter` | 复合流程-里程碑输出总控 | `里程碑输出`、`进度播报`、`阶段汇报` | `milestone-only-progress` + `classify-step-tier` + `fold-repeated-events` + `verify-progress-budget` | `skills/milestone-progress-reporter` |
| **L3** | `on-demand-dispatcher` | 复合流程-按需调用总控 | `按需调用`、`派发下属`、`上下文成本` | `lazy-load-policy` + `select-skills-for-task` + `load-skill-contract` + `verify-context-payload` | `skills/on-demand-dispatcher` |
| **L3** | `one-shot-guard` | 复合流程-一次性解决门禁 | `一次性门禁`、`不反复提问门禁`、`假设门禁` | `one-shot-resolution-policy` + `classify-decision-reversibility` + `record-assumptions` + `verify-no-unnecessary-question` | `skills/one-shot-guard` |
| **L3** | `parallel-lock-guard` | 复合流程-并行锁门禁 | `并行锁门禁`、`派单前门禁`、`并行安全性` | `parallel-lock-policy` + `declare-lock-set` + `detect-lock-conflict` + `verify-no-lock-violation` | `skills/parallel-lock-guard` |
| **L3** | `plugin-control-guard` | 复合流程-插件调控门禁 | `插件调控门禁`、`装配放行`、`31项断言` | `plugin-control-jump-policy` + `install-client-plugin` + `verify-plugin-control-button` | `skills/plugin-control-guard` |
| **L3** | `process-supervisor` | 复合流程-流程监督员 | `流程监督员`、`出口自检`、`独立复核` | `process-conformance-policy` + `collect-process-evidence` + `score-process-conformance` + `plan-process-rectification` | `skills/process-supervisor` |
| **L3** | `qa-gatekeeper` | 复合流程-质量门禁 | `交付`、`终审`、`质量门禁` | `verify-file-exists` + `check-python-syntax` + `ensure-utf8-encoding` + `assert-zero-exitcode` | `skills/qa-gatekeeper` |
| **L3** | `quantification-guard` | 复合流程-量化门禁 | `量化门禁`、`程度词门禁`、`交付前量化` | `quantify-modifier-policy` + `build-quantifier-table` + `detect-vague-modifier` + `quantify-modifier` + `verify-quantified-output` | `skills/quantification-guard` |
| **L3** | `redundancy-detector` | 复合流程-冗余检测 | `冗余检测`、`去冗余`、`保持简洁` | `prune-bloated-prompts` + `search-duplicate-rules` | `skills/redundancy-detector` |
| **L3** | `schema-guard` | 复合流程-格式守卫 | `纯JSON`、`严格YAML`、`Schema契约` | `no-conversational-filler` + `strip-markdown-fence` + `extract-json-payload` | `skills/schema-guard` |
| **L3** | `skill-import-pipeline` | 复合流程-技能引入管线 | `技能引入`、`外部技能纳管`、`引入即纳管` | `search-github-skill` + `audit-imported-skill` + `normalize-skill-contract` + `place-skill-into-cluster` + `dispatch-skill-search` + `search-official-source` + `merge-search-candidates` | `skills/skill-import-pipeline` |
| **L3** | `skill-index-router` | 复合流程-索引控制 | `控制索引`、`快速索引`、`技能路由` | `match-intent-keywords` + `disambiguate-candidates` | `skills/skill-index-router` |
| **L3** | `spec-driven-governance` | 复合流程-规范驱动总控 | `规范驱动`、`需求驱动`、`测试闭环` | `sync-requirements-lifecycle` + `reconcile-knowledge-specs` + `run-test-cases-gate` | `skills/spec-driven-governance` |
| **L3** | `standard-output-framework` | 复合流程-输出总控 | `输出框架`、`交付规范`、`标准输出` | `format-status-block` + `conditional-deliverable-router` + `verify-deliverable-paths` + `high-relevance-notes-only` | `skills/standard-output-framework` |
| **L3** | `tail-metrics-showcase` | 复合流程-量化指标总控 | `量化指标`、`通俗交付`、`指标总控` | `output-chinese-only` + `concise-focused-output` + `plain-analogy-explanation` + `measure-routing-metrics` + `format-iconized-tail` + `validate-icon-syntax` | `skills/tail-metrics-showcase` |
| **L3** | `token-economy-guard` | 复合流程-token门禁 | `token门禁`、`省token`、`token优化` | `token-budget-policy` + `measure-token-budget` + `prune-redundant-context` + `verify-token-reduction` | `skills/token-economy-guard` |
| **L3** | `visual-interaction-guard` | 复合流程-可视化交互门禁 | `交互四件套`、`档位门禁`、`下载门禁` | `format-zoomable-visual` + `zoom-level-policy` + `build-image-viewer` + `verify-interactive-html` + `interactive-image-viewer` | `skills/visual-interaction-guard` |
| **L3** | `visualize-governance-topology` | 复合流程-可视化透视 | `可视化`、`查看索引`、`调用链路` | `format-visual-inspection` + `extract-catalog-topology` + `render-governance-mermaid` + `check-deepseek-usage` | `skills/visualize-governance-topology` |
| **L3** | `zero-restart-guard` | 复合流程-零重启门禁 | `零重启门禁`、`重启审批`、`热更门禁` | `prefer-hot-reload-policy` + `classify-change-scope` + `verify-no-unnecessary-restart` | `skills/zero-restart-guard` |
| **L4** | `dsh-butler` | 中枢编排-全局管家 | `管家`、`统筹`、`调度` | `detect-vague-modifier` + `retire-legacy-workspace` | `skills/dsh-butler` |

---

## 2. 经典积木加法配方 (Addition Recipes)

管家在调度时，通过微观原子操作的叠加来构建确定性：

- **配方 1: 极简中文加粗 (`concise-chinese-bold-guard`)**
  `output-chinese-only (L1)` + `limit-words-under-10 (L1)` + `markdown-bold-only (L1)` + `no-conversational-filler (L1)`
- **配方 2: 严格数据守卫 (`schema-guard`)**
  `no-conversational-filler (L1)` + `strip-markdown-fence (L1)` + `extract-json-payload (L2)`
- **配方 3: 交付终审门禁 (`qa-gatekeeper`)**
  `verify-file-exists (L2)` + `check-python-syntax (L2)`

---

## 3. 编目维护说明
- 任何新增或修改 Skill 时，运行 `python3 skills/dsh-butler/scripts/sync_catalog.py` 自动更新本文件与 `skill-catalog.json`；
- CLI 查询支持分级检索：`bin/skill-pool catalog --level L1`。
