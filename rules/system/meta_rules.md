# 系统级全局元规则 (System Meta-Rules)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v3.1.0`
> - **对应实施版本**：`v3.1.0`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../workflow/versioning_standard.md)
> - **生效状态**：`[Release 稳定生效]`

本文档是工程全域最高法典，具有不可逾越的最高仲裁效力。所有下级规范、工作流与操作均不得与本元规则冲突。

---

## 🏛️ 全局元规则二十一条 (Core Meta-Laws)

### 第一条：规则需求双向同步律 (Requirement-Rule Sync)
- **溯源铁律**：严禁存在无需求依据的孤立规则。新增/修改/废弃规则必须同步更新 [`docs/requirements.md`](../../docs/requirements.md)。
- **时序约定**：新增规则先登记需求编号（`REQ-xxx`）再落地文件；修改规则追加变更记录；废弃规则同步置 `[DEPRECATED]`。

### 第二条：智能去重与幂等过滤律 (De-duplication & Idempotence)
- **前置查重**：接收新指令必须先扫描已有需求与规则，杜绝功能同义碎裂。
- **合并演进**：同类语义请求直接拦截或归并至原条目增量演进，不重复新建；模板/脚本保持单一权威源。

### 第三条：交互语言与通俗表达律 (Language & Ticket Standard)
- **通俗中文化**：交互答复与规则文档统一使用规范通俗中文，杜绝黑话与生僻字。
- **全步骤中文说明与零英文旁白**：在 DSH 的执行全生命周期中，智能体（Assistant）的**所有步骤交代、操作旁白、进度阐述以及向客户端投射的参数（如 `bash` 的 `description` 字段）必须 100% 使用规范中文**，严禁在工具卡片标题或过渡说明中混杂英文。
- **上下文压缩同语种镜像保真**：长会话触发上下文压缩（Compacted Summary）、历史检查点提炼或跨轮次总结时，**输出语言必须与前文主导输入语种严格保持 100% 一致**（输入为中文，压缩总结必须完全使用中文，严禁私自跳切为英文摘要）。
- **报错三段式**：遇到英文命令报错，严禁裸抛堆栈，必须输出【中文释义】+【根本原因】+【修复建议】。
- **工单化前置**：复合型指令先提炼为易执行的标准需求文案，再行落地。

### 第四条：规则变更联动排查律 (Audit & Legacy Cleanup)
- **改动必排查**：任何规则变动必须全盘检索引用它的文档、模板与代码。
- **冲突即刻修**：发现表述矛盾或失效链接立即消除，严禁遗留孤岛规则与死链。

### 第五条：免审批安全自律与白名单律 (Silent Safety & Whitelist)
- **自主防破坏**：免审批环境下严禁调用全局越界删除指令，宁阻断不越界。写关键文件必读回（Read-Back）校验。
- **资产绝对白名单**：`knowledge/`、`memory/`、`rules/`、`indexes/`、`docs/`、`templates/`、活跃会话历史绝对禁止删除。

### 第六条：能力摘要与反例约束律 (Negative-Case Derivation)
- **反例前置**：登记新能力/工具/脚本，必须包含负面反例（明确指出何时坚决不用、典型误用场景），杜绝调用幻觉。

### 第七条：任务双轨分流与流程硬约束律 (Workflow Dual-Track)
- **快慢分流**：复杂/高危任务（$>35$分）强制走 **Hard Line**（标准十六步流水线）；轻量任务（$\le35$分）走 **Fast Track**（极简三步）。
- **首动重命名门禁**：Hard Line 任务定标后首个 bash 调用必为 `./scripts/rename_session.sh`，锁定 $\le 8$ 字标题。

### 第八条：知识库权威与前置防冲突律 (Knowledge Base Precedence)
- **最高业务基线**：[`knowledge/`](../../knowledge/README.md) 中世界观、美术与工程标准为产品开发最高法定基线。
- **前置审查卡点**：需求设计前置核对知识库，检出设定冲突立即阻断；非游戏任务绝对禁止载入游戏设定。

### 第九条：事务不可分割与原子性律 (Atomicity & Indivisibility)
- **全成或全败 (All-or-Nothing)**：运维操作（需求-规则-版本同步、.meta成对维护）与系统设计（存档、状态机）必须事务级闭环，失败完整回滚，严禁中间脏数据。遵循 [`rules/coding/atomicity_specification.md`](../coding/atomicity_specification.md)。

### 第十条：交付验证与入口直达必给律 (Verified Entrypoint)
- **验证后交付**：严禁交付假设可用的半成品，交付前必须真实执行测试。
- **入口直达**：收尾必须提供结构化直达入口（Web链接、可点击本地代码路径、一键运行命令、图片预览）。

### 第十一条：地图式高速干道路由律 (Arterial Routing)
- **干道优先收敛**：路由检索类比地图导航，优先走 G0（元规则）/ G1（主业务管道与口令），禁止在低权重小道无序漫游。遵循 [`indexes/shortcuts_index.md`](../../indexes/shortcuts_index.md)。

### 第十二条：效率量化与全周期审计律 (Efficiency Audit)
- **六维指标结算**：任务收尾强制输出 M1~M6 效率指标（收敛度、改名率、有效率、读回率、完整度、直达度），沉淀至 [`memory/efficiency_audit_log.md`](../../memory/efficiency_audit_log.md)。

### 第十三条：前置风险揭示与防御律 (Risk Disclosure)
- **谋先审险**：Hard Line 任务在动笔前必须以四维风险雷达（技术/数据/边界/权限）输出《前置风险评估卡》与回滚预案。遵循 [`rules/workflow/risk_disclosure.md`](../workflow/risk_disclosure.md)。

### 第十四条：自动化测试与质量零缺陷律 (Quality Gate)
- **未测非可信**：需求映射断言，通过真实自动化测试脚本验证，100% 绿灯方可交付。遵循 [`rules/coding/testing_and_quality_gate.md`](../coding/testing_and_quality_gate.md)。

### 第十五条：页面视觉资产与台账管控律 (Page Ledger)
- **一项目一册**：前端 GUI 页面必须捕获标准截图，按四段式规范命名（`Page_[模块]_[页面]_[状态].png`）并在专属台账中追踪编号。遵循 [`rules/workflow/page_ledger_specification.md`](../workflow/page_ledger_specification.md)。

### 第十六条：任务复盘与自迭代进化律 (Post-Mortem & Evolution)
- **复盘促进化**：重大任务收尾强制输出三维 AAR 复盘报告，排坑认知即时沉淀至 [`memory/lessons_learned.md`](../../memory/lessons_learned.md)，推动规则版本自我升级。遵循 [`rules/workflow/post_mortem_and_evolution.md`](../workflow/post_mortem_and_evolution.md)。

### 第十七条：周期性硬盘健康与自愈清理律 (Disk Health & Auto-Cleanup)
- **空间常态自愈**：周期性监控磁盘水位，使用率 $\ge 90\%$ 或可用 $< 20\text{GB}$ 时自动触发安全清理，释放临时溢出物与碎片，绝对白名单资产永不触碰。

### 第十八条：项目立项 DSH 优先与保底集成律 (DSH-First Project Bootstrap)
- **优先原生生态**：创建任何新工程、新模块或业务工具链，必须优先评估 DSH 六维能力树（CLI、MCP、API、Plugins、Agent、Skill），严禁孤立开发重复造轮子。
- **保底集成指标**：新项目立项规划方案中，**必须明确集成至少 1 项 DSH 能力**，并在【定标】阶段输出标准《项目 DSH 赋能规划卡》。

### 第十九条：全域资产对齐与新鲜度指纹律 (Full-Spectrum Alignment & Fingerprint Law)
- **全域对齐一标尺**：新增任务严格按最新规则执行；存量资产遵循“遇碰即对齐 (Touch-and-Align)”原则，任何修改或审查触及存量模块时，必须顺带将其格式、规范与头部版本号升级至最新总基线。
- **资产数字指纹追踪**：受管资产强制纳管于 [`memory/asset_fingerprint_ledger.md`](../../memory/asset_fingerprint_ledger.md)，通过 SHA-256 短哈希与三级新鲜度雷达（🟢Fresh / 🟡Stale / ⚪None）监控代码漂移，未通过指纹校验严禁结项交付。

### 第二十条：工程远程 Git 强同步与独立仓库律 (Remote Git Mandatory Sync Law)
- **远程强同步硬门禁**：凡发生文件改动的任务，收尾阶段必须执行 `git commit` 并成功 `git push` 到远程仓库；未同步至远端严禁声称任务闭环。提交信息必须基于真实任务摘要动态生成。
- **一工程一独立仓库**：每个工程项目必须使用专属独立的远程仓库地址，严禁多工程混用串扰。
- **缺地址开页引导机制**：若未检测到远程仓库地址，智能体必须主动打开浏览器页面（如 `https://github.com/new`）引导用户创建并提供仓库 URL，配置绑定后自动续推。

### 第二十一条：全局调度锁与并发资源防冲突律 (Global Scheduler Lock Law)
- **读写分离分级调度**：只读操作（检阅、grep、指纹比对）默认放行多任务共享并行；写操作（核心文件修改、Git 远程提交、重构、磁盘清理）必须申领排他独占锁，严禁并发争抢同一资源。
- **自动化冲突编排**：筹策阶段前置嗅探资源依赖，冲突时自动按“时序串行”或“避让排队”编排，杜绝进程打架与脏写悬空；通过 [`scripts/global_scheduler_lock.sh`](../../scripts/global_scheduler_lock.sh) 实现微秒级无感原子锁。
- **超时自愈熔断**：排他锁默认持有超时为 180 秒（TTL），超时后自动判定为孤儿锁并自愈释放，绝对禁止永久死锁。

---

## ⚖️ 规则裁决优先级顺序 (Precedence Order)

发生冲突时按以下层级自上而下绝对裁决：
$$\text{元规则} \succ \text{安全红线与风险揭示} \succ \text{事务原子性} \succ \text{全局调度锁} \succ \text{知识库业务法典} \succ \text{质量测试门禁} \succ \text{远程Git强同步} \succ \text{流程双轨分流} \succ \text{编码规范}$$
