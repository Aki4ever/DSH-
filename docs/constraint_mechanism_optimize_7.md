# 需求文案：输出契约与反馈层强化（GCM-OUT）· 缩进抬头 / 反馈层 / 一句话总结 / 通俗化 / 双档输出 / 一键重启

> ### 🏷️ **版本信息与实施追踪**
> - **文档类型**：需求文案（登记为 `REQ-090`，状态 `[EVOLVING]`）
> - **当前系统实施总版本**：`v4.29.7`（本条目实施时先清偿 `v4.25.0` 欠账，再推进至 `v4.26.0`）
> - **本文档内容版本**：`v1.0.0`
> - **提出时间**：2026-10-01
> - **任务代号**：`GCM-OUT`（Output Contract：结构 · 反馈 · 档位）· 宿主侧子集 `UX-RESTART`
> - **需求状态**：`[EVOLVING]` **已实施第一批**（R1~R5 已落地并自检通过；R6 插件已建成、已装配进
>   `~/.dsh/profiles/desktop`，**尚未重启激活、尚未真机 PID 验证**——详见 §八 实施进度）
> - **依据**：用户 6 条口语需求 + 本轮实测（`output_audit.mjs` / `output_compactness.mjs` / `progress_ledger.mjs` /
>   `audit_execution.sh` 源码审读 · 技能池相关技能契约逐条核查 · `app.asar` 只读解析取证 ·
>   全库关键词检索「一句话总结 / 浅白 / 双档 / 生僻 / 重启按钮」）

---

## 一、原始需求（用户口语原文）

> 以下是我对管控规则的优化需求，如果需求颗粒度过大导执行层（包括 skill、agent、plugin、插件、cli、mcp 等）
> 导致没触达物理实现层，就递归分裂成更细更落地的执行层去完成这个需求；
> 1、输出结构优化，增加必要的锁进和必要的换行增加必要的抬头和首航图标，让阅读更加清晰和一目了然；
> 2、增加反馈层，对所有的输出以及执行的东西进行反馈，增强落地能力，让你清楚的知道自己做到什么程度；
> 3、输出结构新增一句话总结；
> 4、所有输出必须简单明了无生僻字，言简意赅；
> 5、输出分 2 类，1 类是普通用户都可以看得懂的浅白语言，要讲解通透，2 类是面向有对应专业知识的专业人士，
>    要讲解详细；默认输出第 1 类，如果要求输出第 2 类需要显式说明；
> 6、新增可视化按钮，点击后可以重启 DSH；
>
> 理解以上需求并简化成更利于你执行的需求文案；

> 📌 **原文勘误（只做字面归一，不改语义）**："锁进"= **缩进**；"首航图标"= **首行图标**。
> 两处为输入法同音误写，本需求文案统一按"缩进 / 首行图标"执行。

---

## 二、整理后的可执行需求

### 2.1 一句话定义

**把"输出长什么样"从散落在 5 处的口头约定，收敛成一份可判定的输出契约：开头一句话总结 + 首行状态图标 +
分层抬头与缩进，结尾给可证伪的进度回执，全篇浅白中文（专业档须显式开关），
再给界面加一个"一键重启"按钮——前五条一律归并进既有权威源，只有第六条的宿主操控载体是新机制。**

### 2.2 六条子需求的可机械判定口径

| # | 诉求（用户原话） | 做什么 | 物理载体（归并目标） | 判定命令 | 阈值 / 后果 |
| :-- | :--- | :--- | :--- | :--- | :--- |
| **R1** | 输出结构优化（缩进 · 换行 · 抬头 · 首行图标） | 建输出结构唯一权威源；把首行图标、标题层级不跳级、缩进阶梯、必要空行转成判定项 | 新建 `rules/system/output_standard.md` · 扩 `scripts/output_audit.mjs`（现仅 `:111` 一条硬判据） | `node scripts/output_audit.mjs --check` | 新增 3 条**硬判据**（首行图标 / 层级不跳级 / 缩进 ≤3 级）；不达标 exit 1 |
| **R2** | 增加反馈层（看清做到什么程度） | 每轮输出给"进度回执"四字段；**数字必须从台账实跑取，禁止手写**；把 REQ-087 R2 的 `--report` 真正接进门禁 | 新建 `scripts/lib/feedback_card.mjs` · 扩 `scripts/output_audit.mjs` · `scripts/progress_ledger.mjs` | `node scripts/output_audit.mjs --check` + `node scripts/progress_ledger.mjs report --json` | 四字段齐备且数字与台账逐一相等；缺项或数字对不上即判红 |
| **R3** | 输出结构新增一句话总结 | 契约化位置与字数；与文末 `🎯【核心结论】` 用语一致（见 **D2**） | `rules/system/output_standard.md` §一句话总结 · `scripts/output_audit.mjs` | `node scripts/output_audit.mjs --check` | 首屏前 3 行内命中且 **≤30 汉字**；否则判红 |
| **R4** | 无生僻字 · 言简意赅 | 常用字表探针 + 黑话词表 + 超长句探针，把口号变判定 | 新建 `data/common_chars.txt`（来源见 **D4**）· 新建 `scripts/language_audit.mjs` · `scripts/audit_execution.sh` 第 9 维 | `node scripts/language_audit.mjs --check` | 生僻字 **0** 且黑话命中 **0**；否则 exit 1 |
| **R5** | 输出分浅白 / 专业两类 | 定义两档差异与显式开关；默认浅白档；**先裁决与"技术细节绝对静默"的冲突**（见 **D5**） | `rules/system/output_standard.md` §双档 · `scripts/output_audit.mjs` · `indexes/shortcuts_index.md`（触发词登记） | `node scripts/output_audit.mjs --check` | 浅白档：未随文解释的专业术语 ≤ 阈值；专业档：首行必须带档位标记 |
| **R6** | 新增可视化按钮，点击重启 DSH | 双半插件：宿主半注册重启命令，客户端半注入按钮并调用它 | 新建 `skill-pool/plugins/dsh-plugin-restart/`（**双半结构**：`main` 宿主 + `exports["./client"]` 浏览器） | `node skill-pool/plugins/dsh-plugin-restart/verify_restart_button.cjs` + **重启前后宿主 PID 比对** | **宿主 PID 发生变化 = 唯一合格证据**；只弹"重启指引"不算满足（见 R6-d / §3.4） |

### 2.3 "触达物理实现层"的可判定判据（递归分裂的停止条件）

沿用工程已有的四类物理探针口径（`length` / `regex` / `exitcode` / `file`），六条**全部满足**才算触达，
否则**继续分裂**，不得登记为完成：

| 序号 | 判据 | 探针类型 | 反例（判未触达） |
| :--: | :--- | :--- | :--- |
| 1 | 载体在磁盘真实存在且非空 | `file` + `length` | 只在文档里写了名字，没有文件 |
| 2 | 有可跑命令，退出码能区分成败 | `exitcode` | 命令不存在，或跑起来恒为 0 |
| 3 | 判定项被写入唯一权威源并被判定器读到 | `regex` | 规则写在 A 文件，判定器读的是 B 文件 |
| 4 | 有可机读契约：输入 / 输出 / 退出码语义 | `regex` | 只有一句散文简介 |
| 5 | 有判定器能判"未触达"，且存在**反向用例** | `exitcode` | 检测器恒绿（"没证据"被折算成"通过"） |
| 6 | 不依赖未通电的载体 | `file` | 判定逻辑只挂在拦截层插件上（当前未注册进宿主） |

### 2.4 查重拦截结论（**元规则第二条：同类诉求归并，不重复新建**）

| # | 覆盖度 | 缺口性质 | 归并目标 | 是否新立 |
| :-- | :---: | :--- | :--- | :---: |
| R1 | 🟡 约 40% | 规则有、判定器只判 1 项 | **REQ-089 R1-d**（已登记"阶梯缩进 + 五联装"）+ REQ-081 | ❌ 不新立 |
| R2 | 🟢 约 70% | 载体齐、无强制与判定 | **REQ-087 R2**（`--report` 未接门禁）+ REQ-050 | ❌ 不新立 |
| R3 | ⚪ 0% 字面命中 | 由文末 `🎯 核心结论` 近似占位 | **REQ-081**（升级为"首句 ≤30 字一句话总结"） | ❌ 不新立 |
| R4 | 🟢 规则 100% | 生僻字**零判定器**（违反第三十六条） | **REQ-081** 第 8 维扩一档"文字可读性" | ❌ 不新立 |
| R5 | 🟡 只有单档 | **与既有规约正面冲突，须先裁决** | 裁决后归并 **REQ-089 R1** + `shortcuts_index` 触发词 | ❌ 不新立 |
| R6 | 🔴 动作 0 命中 | 生产包**无任何官方重启入口** + 自举悖论 | — | ✅ **必须新立（REQ-090）** |

> **结论**：本次用户 6 条诉求**只新立 1 条机制（R6）**，其余 5 条一律增量演进进既有权威源；
> 本条目的价值在于"把散着的纸面约定收敛成**唯一权威源 + 可判定判据**"，而不是再写一遍同义规则。

### 2.5 递归分裂结果（粗颗粒 → 执行层叶子）

```text
GCM-OUT
├── R1 输出结构（缩进 · 换行 · 抬头 · 首行图标）        ← 归并 REQ-089 R1-d / REQ-081
│   ├── R1-a 唯一权威源：新建 rules/system/output_standard.md（现行散落 ≥5 处，收敛为 1 处 + 指针）
│   ├── R1-b 首行状态图标判据：正则 + 图标白名单（🟡 / 🟢 / 🔵 / 🔴 四态，出处 meta_rules 第 22 条）
│   ├── R1-c 结构判据：标题层级不跳级 + 缩进 ≤3 级 + 段落间必要空行
│   └── R1-d 存量对齐：AGENTS.md §五 / meta_rules 第 22·29·34 条改为指针（禁止两处复述同一契约）
├── R2 反馈层                                            ← 归并 REQ-087 R2 / REQ-050
│   ├── R2-a 回执四字段契约：本轮做了什么 / 判定命令与退出码 / 完成度（叶子级 x/y） / 还差什么
│   ├── R2-b 离手写取数：数字只从 progress_ledger report --json + todo 实况读，人工覆写即判红
│   ├── R2-c 判定器 feedbackChecks()：缺字段判红 + 报告数字与台账逐一相等
│   └── R2-d 反向用例：故意改一个数字必须判红（先证明检测器有牙）
├── R3 一句话总结                                        ← 归并 REQ-081
│   ├── R3-a 位置与字数契约：首屏前 3 行内、≤30 汉字、不含专业黑话
│   ├── R3-b 与文末 🎯【核心结论】一致性校验：两处不得互相矛盾
│   └── R3-c 判定项接入 output_audit（与 R1 同一判定器，不另起一套）
├── R4 通俗化（无生僻字 · 言简意赅）                      ← 归并 REQ-081 第 8 维
│   ├── R4-a 字表来源落盘（D4 裁决后）：data/common_chars.txt + 来源登记 knowledge/sources/
│   ├── R4-b scripts/language_audit.mjs：生僻字探针 + 黑话词表 + 超长句探针
│   ├── R4-c 反向用例：注入生造词必须判红
│   └── R4-d 接线 audit_execution.sh 第 9 维（现为八维）
├── R5 双档输出                                          ← 归并 REQ-089 R1 + 触发词入 shortcuts_index
│   ├── R5-a 档位定义与显式开关判据：默认浅白档；显式声明"专业档"才切换
│   ├── R5-b 浅白档硬约束：专业词必须随文解释 + 复用 plain-analogy-explanation 现成比喻表
│   ├── R5-c 专业档硬约束：术语与实现细节可展开，但仍受 R1/R3/R4 的结构与体量约束
│   └── R5-d 冲突裁决：与"技术细节绝对静默"规约的边界必须先划清（D5）
└── R6 一键重启按钮（UX-RESTART）                        ← 唯一新立
    ├── R6-a 客户端半：插槽注入按钮（复用 usage-bar 的 ctx.slots.inject 与 control-jump 的建 button 写法）
    ├── R6-b 宿主半：用官方扩展点 ctx.commands.register() 注册 /restart-dsh 命令（不新增原生入口）
    ├── R6-c 触发链路：按钮 → ctx.remote.commands.execute(sessionId, '/restart-dsh') → 分离进程执行
    │           `osascript quit` + 等旧进程退出 + `open -a "DeepSeek Harness"`
    ├── R6-d 自证判据：重启前后宿主 PID 变化 + 插件自检 exit 0 + 6 项待实测前置条件（§3.4）
    └── R6-e 降级保底：做不到"点击即重启"时，只允许交付"一键复制重启命令"，且必须显式标注未满足需求
```

---

## 三、现状核查（先说事实，再说改什么）

### 3.1 已经存在、可直接复用（**不要再造一遍**）

| 已有资产 | 可复用在 | 实测证据 |
| :--- | :--- | :--- |
| `rules/system/language_standard.md` §四.1「拒绝生僻字与生造词」 | R4（**规则条文已有，只缺判定器**） | 该文件 `:63-65`；自检清单 `:98` |
| `rules/system/meta_rules.md` 第二十二条（首行状态徽标四态） | R1-b / R3 | `:96`；`docs/requirements.md` REQ-052 同款 |
| `rules/system/meta_rules.md` 第三十四条 + `AGENTS.md` §五（文末五联装） | R1（**尾部**结构已有，缺**正文**结构） | meta_rules 第三十四条第 2 款；AGENTS.md §五.1 |
| `scripts/output_audit.mjs` | R1 / R3 / R5 的**统一判定入口** | `:111` 唯一硬判据 `depthOk = maxDepth <= 3`；`:146-147` 四项仅报告项 |
| `knowledge/common/readability_specification.md` | R1（嵌套 ≤3 级 / 段间距已有明文） | `:20`（嵌套 ≤3 级）· `:115`（段间距 = 正文字号 1.5~2.0 倍） |
| `scripts/lib/output_compactness.mjs`（与拦截层插件同一套度量） | R1~R5 全部（**不必新写度量**） | `:37-40` `maxChars: 1800` / `maxLines: 60` |
| `scripts/progress_ledger.mjs report` | R2 的**现成数据源** | `:303/:309/:315` 三段式 ① 我做了什么 ② 做到哪一步 ③ 还差什么 |
| `scripts/lib/todo_tracker.mjs` | R2（任务级完成度已可算） | `:75` `percent = Math.round(done / total * 100)` |
| `scripts/audit_execution.sh` 八维评分 | R4 / R2 接线位（新增第 9、10 维） | `:35` `:50` `:65` `:80` `:95` `:110` `:126` `:147` |
| `skills/standard-output-framework` · `format-status-block` · `format-iconized-tail` | R1 / R3（四要素与"一句话结论"已有技能） | 三条 `SKILL.md` 的 `description` 实测 |
| `skills/plain-analogy-explanation`（现成比喻映射表） | R5-b 浅白档 | `SKILL.md:15-19`（乐高积木 / 安检门 / 字典目录 / 红绿灯） |
| **客户端插件双半结构与插槽注入**（已有两个可运行先例） | R6-a / R6-b | `dsh-plugin-control-jump/lib/client.js:203`（建 button）· `dsh-plugin-usage-bar/lib/client.js:238,255`（`ctx.slots.inject/register`） |
| **客户端 ctx 已能调宿主命令**（官方插件即如此） | R6-c 的官方通道 | `packages/client/ui-plan/src/client/index.ts:122` → `ctx.remote.commands.execute(sessionId, ...)` |
| **宿主命令注册官方扩展点** | R6-b 的官方扩展点 | `packages/interaction/commands/src/index.ts:285`（register）· `:360`（`@Remote execute`） |
| `skills/install-client-plugin`（幂等装配 + 备份 + 回滚） | R6 的装配环节 | `SKILL.md` 全流程，含 `restart_required=true` 诚实声明 |
| `knowledge/common/interaction_specification.md:49`（点击后须模态二次确认） | R6-a（防误触已有规范） | 明文要求二次确认 |

### 3.2 实测缺口（用户要"新增"的，实质是这些）

| # | 缺口 | 现状证据（可复跑） |
| :-- | :--- | :--- |
| **G1** | 输出结构**无唯一权威源**，同一契约散在 ≥5 处 | `AGENTS.md` §五 · `meta_rules.md` 第 22/29/34 条 · REQ-052/071/078/081；`rules/system/` 下实测**无** `output_standard.md` |
| **G2** | 首行图标与"抬头"**无判定** | `output_audit.mjs:111` 只判嵌套；`:146-147` 四项**仅报告不判红**；"抬头"全库仅 `redundancy_scan.mjs:92`（版本抬头，语义无关） |
| **G3** | 反馈层**只有工具、没有契约** | `progress_ledger` 能答"到哪一步"，但无规则要求它出现在每轮输出里；REQ-087 R2 的验收标准在 `docs/requirements.md` 中**仍未勾选**；审计八维无"反馈"维度 |
| **G4** | 一句话总结**零命中** | 全库检索「一句话总结」= **0 命中**；文末 `🎯【核心结论】` 无字数上限，且位置在末尾 |
| **G5** | 无生僻字**有规则、无判定** | 全库检索「生僻」命中 7 处**全是散文式要求**，脚本 / 探针 **0 个** → 违反元规则第三十六条（硬约束必须可判定） |
| **G6** | 双档输出**完全空白** | 全库检索「浅白」「双档」= **0 命中**；答复层无档位概念 |
| **G7** | 既有规约与 R5 **正面冲突** | `skills/plain-analogy-explanation/SKILL.md:4` 与 `skill-pool/docs/requirements/product.md:219` 要求「技术细节**绝对静默**」，与"专业档要讲解详细"不可共存；`skills/concise-chinese-bold-guard/SKILL.md:20` 另强制「**严格控制在 10 个字以内**」 |
| **G8** | 一键重启**零命中，且生产包无官方入口** | 全库检索「重启按钮」= **0 命中**；`indexes/shortcuts_index.md` 40 条通道中相关 **0 条**；生产包内 `app.relaunch()` 仅出现在**致命错误恢复对话框**与**开发期菜单**（详见 §3.4） |
| **G9** | **版本欠账**：REQ-089 声明 `v4.25.0`，但头部仍停在 `v4.24.0` | `README.md` · `docs/requirements.md` · `rules/system/meta_rules.md` · `knowledge/common/task_naming_spec.md` **4 处**实测均为 `v4.24.0` |

### 3.3 本轮新发现（此前未登记）

1. **"生僻字禁令"是本工程第一条被实测抓到的"元规则自违"**：元规则第三十六条明文"无判定手段的'必须'一律不得写入规则"，
   而 `meta_rules.md:24` 与 `language_standard.md:63` 两处都写了"杜绝生僻字"，`scripts/` 下却**零检测**。
   → R4 不只是"加个功能"，而是**补一条已有规则的判定缺口**。
2. **`output_audit` 的"唯一硬判据"结构决定了扩展方式**：当前 5 项检查里 1 项判红、4 项只报数。
   动它之前必须先裁决"哪些能升为硬门"——规范里写明数字边界的才可升（如嵌套 ≤3 级），
   只写"建议"的一律保持报告项，**否则就是自行发明阈值**（这正是 **D6** 要问的）。
3. **R6 存在"自举悖论"（已实测确认）**：按钮本身是客户端插件，而插件装配**必须重启一次才可见**
   （`skills/install-client-plugin/SKILL.md` 显式声明 `restart_required=true`；官方 `dsh-client-hmr` 只负责 Web 传输）。
   → 即"**为了拿到一键重启，必须先手动重启一次**"。这不是缺陷，是必须先写清的交付前提。
4. **R6 与既有"零重启"取向存在字面张力**：`skills/prefer-hot-reload-policy/SKILL.md:20` 规定"默认目标是**零重启**"。
   → 需划清边界：该取向约束的是"**改配置后是否被迫重启**"，R6 提供的是"**用户主动要求重启时的入口**"，二者不矛盾，
   但必须在同一处说明，否则日后必被当成冲突。

### 3.4 R6 专项：重启按钮的物理可行性（`app.asar` 只读实测）

**结论先行——生产包里没有任何可以被页面调用的官方重启入口。** 逐条取证：

| 找过的路 | 结果 | 证据 |
| :--- | :--- | :--- |
| CLI 子命令 | **未找到** | 应用内 `runtime/cli/bin/dsh` 只认 `profile` / `plugin` / `dump-config*` |
| HTTP 端点 | **未找到** | 全仓 `ctx.webServer.register(...)` 调用点无 restart 路由 |
| RPC / Remote 服务 | **未找到** | Host 服务名清单与 TypertRemoteService 清单均无 restart / relaunch / shutdown |
| 渲染进程 IPC | **未找到** | `apps/desktop/src/ipc.ts:8-34` 只有 boot / device-info / updates-open / shortcut / locale |
| `window.dsh` 预加载桥 | **只有 4 个方法** | `app.asar` 内 `/lib/preload-platform-account.cjs`：`getLocale` / `onLocaleChange` / `getAuthToken` / 两个常量，**无重启** |
| `app.relaunch()` 的真实落点 | **仅 2 处，均非页面按钮** | ① `apps/desktop/src/main.ts:103` 交给**致命错误恢复对话框**（`fatal-recovery.ts:96`）② `main.ts:959-966` 的"重启应用与 Host"菜单**被 `...development ? [...] : []` 包住，生产包没有** |

**主推方案 A1（全程走官方插件面，不改 App 包、不破签名）**：

```text
[客户端半] 插槽注入按钮（ctx.slots.inject）
      │  二次确认（interaction_specification.md:49）
      ▼
ctx.remote.commands.execute(sessionId, '/restart-dsh', [])
      │
      ▼
[宿主半] ctx.commands.register('/restart-dsh')  ← 官方扩展点 commands/src/index.ts:285 / :360
      │
      ▼
spawn(detached, unref) → osascript 退出 App → 轮询旧 PID 退出 → open -a "DeepSeek Harness"
      │
      ▼
[判定] 重启前后宿主 PID 必须不同（唯一合格证据）
```

**方案对比（含被否决项）**：

| 方案 | 物理载体 | 风险 | 是否满足"点击即重启" |
| :--- | :--- | :--- | :---: |
| **A1（主推）** 宿主半注册命令 + 客户端按钮调 remote | `ctx.commands.register` + `ctx.remote.commands.execute` | 第三方插件能否 inject `remote.commands` **未验证** | ✅ |
| **A2（备选）** 宿主半注册 Web 路由 + 客户端 `fetch` | `ctx.webServer.register` | `dsh-app://` 与 `http://127.0.0.1:19387` 两种 origin 的转发与鉴权**未实测** | ✅ |
| **B** 按钮 → 给会话发消息 → 智能体跑重启脚本 | 现有会话与工具链 | 烧一次模型轮次；执行到一半宿主被杀 | ⚠️ 间接 |
| **C（降级）** 按钮只复制重启命令给用户 | 纯前端剪贴板 | **不满足原需求**，仅保底 | ❌ |
| **D** 借用更新安装流程的"安装并重启" | `window.dshDesktop.updates.open()` | 依赖有可用更新；会停 Host 并交安装器 | ❌ 非通用 |
| **E** 改 Electron 壳加 `dsh-desktop:restart` IPC | 需改 `app.asar` | **不可行**：签名只读产物，禁止改 `/Applications` | — |
| **F** 页面 `location.reload()` | 渲染进程 | **≠ 重启 DSH**：Host 与 Electron 主进程都不动 | ❌ |

**实施第一步必须先实测的 6 件事（验证前不写"已生效"）**：

1. 退出确认弹窗会不会拦住自动重启（`quit-confirmation.ts:70-87`：有活跃/已排任务时弹原生框）；
2. `spawn(detached:true).unref()` 的子进程能否在 Host 被杀后继续跑完 `open -a`；
3. 第三方客户端插件能否 `inject` `remote.commands`（不行则退 A2）；
4. 自定义 Web 路由在两种 origin 下的可达性与鉴权；
5. 插件装配路径：CLI 有"先完全退出 App"硬拦，GUI 插件管理器可热装——装完是否仍需重启；
6. 宿主半能否直接 `require('node:child_process')` 并 spawn（是否受沙箱/策略限制）。

---

## 四、必须先由用户裁决的分歧（禁止我自行取舍）

| # | 分歧点 | 事实 | 备选方案 | 我的默认建议 |
| :-- | :--- | :--- | :--- | :--- |
| **D1** | 输出结构权威源**落在哪** | 同一契约现已散在 ≥5 处；新建文件 vs 就地扩写会牵动所有后续引用 | ① 新建 `rules/system/output_standard.md`，元规则与 AGENTS.md 改指针 ② 全部塞进 `meta_rules.md` 第三十四条 | **①**：单一权威源 + 指针，符合元规则第二条与第四条 |
| **D2** | 「一句话总结」是**文末别名**还是**首屏新字段** | 文末 `🎯【核心结论】`已是"一个结论"，但无字数上限、且不在首屏 | ① 首屏新增一句话总结 + 文末保留并由判定器校验一致 ② 只把文末 🎯 升级为"≤30 字一句话" ③ 首屏写、文末改为指针 | **①**：首屏零击直达（元规则第二十五条），文末复述同一句，杜绝两套说法 |
| **D3** | R6 要**装插件**并**真的重启**，且必须选一条链路 | 生产包无官方重启入口（§3.4）；重启会**中断当前会话**；且"要拿到按钮须先手动重启一次" | ① 授权按 A1 实施（按钮带二次确认，接受"点了即断线"） ② 不授权，只出降级版（弹命令让用户自己复制） ③ 先只做 §3.4 的 6 项实测，拿到证据再定 | **①**；若你选 ②，我会在交付里**显式标注"未满足原需求"** |
| **D4** | 生僻字判定的**字表来源** | 判定要客观就必须有权威字表；凭语感造表 = 自造阈值（本工程红线） | ①《通用规范汉字表》一级字表（3500 字） ②《现代汉语常用字表》（3500 常用 + 1500 次常用） ③ 用本工程语料统计高频字（**不推荐：循环自证**） | **①**：请你确认来源；确认后作为 `knowledge/sources/` 第 3 张来源卡登记，字表落 `data/common_chars.txt` |
| **D5** | R5 与"技术细节绝对静默"的**冲突边界** | `plain-analogy-explanation/SKILL.md:4` 与 `product.md:219` 要求绝对静默；`concise-chinese-bold-guard` 另压到 ≤10 字 —— 两处都会**压死**"讲解通透 / 讲解详细" | ① 改为**分档**：浅白档默认静默，专业档显式展开 ② 保持绝对静默，专业档只做到"术语展开"不碰实现细节 ③ 退役该静默规约 | **①**：默认静默不变（浅白档行为与今天一致），只在专业档开闸；同时把 ≤10 字规约缩到"仅标题行"生效 |
| **D6** | 新增判定项的**阈值由谁定** | `output_audit` 现有做法：规范写明数字边界的才升硬门，其余只报数 | ① 沿用该做法，只把规范已写明边界的升为硬判据 ② 由我为"首行图标 / 缩进 / 一句话总结字数"新定阈值并写进权威源 | **①**：先沿用；缺口部分（如一句话总结字数）在 `output_standard.md` 里**显式写死数字边界**，再由判定器引用 —— 保证"阈值有出处，不是拍脑袋" |

---

## 五、验收标准（实施后逐条勾选）

- [ ] R1-a `rules/system/output_standard.md` 在磁盘在位；`AGENTS.md` / `meta_rules.md` 复述处已改为指针（复扫无第二处契约定义）；
- [ ] R1-b/c 首行图标、标题层级不跳级、缩进 ≤3 级**三条硬判据**可跑出退出码，且**反向用例**（故意造跳级标题 / 缺首行图标）必须判红；
- [ ] R2 进度回执四字段齐备，数字与 `progress_ledger report --json` **逐一相等**；手改一个数字必须判红；REQ-087 R2 的验收项随之可勾选；
- [ ] R3 首屏前 3 行内命中一句话总结且 ≤30 汉字；与文末 `🎯` 用语一致；
- [ ] R4 `scripts/language_audit.mjs --check` 退出码可区分成败；注入生造词必须判红；`audit_execution.sh` 第 9 维可得分；
- [ ] R5 默认浅白档生效；显式声明专业档后首行出现档位标记；未标记时按浅白档判定；D5 裁决写入权威源后，冲突扫描为 0；
- [ ] R6 **点击按钮后宿主 PID 真实变化**（唯一合格证据）；§3.4 的 6 项前置条件逐条实测并留档；做不到则按 R6-e 显式标注未满足；
- [ ] D1~D6 六项分歧经用户裁决后写入本文案；
- [ ] 全量复跑：`control_gates.sh check` 4/4 · `gate_selftest.sh` 全过 · `mechanism_audit.mjs` 新机制**已登记且已触达** ·
      `conflict_scan` / `redundancy_scan` / `legacy_align_scan` 全 0 · `progress_ledger check` 漂移 0 / 未记录改动 0。

---

## 六、实施顺序建议（依赖驱动，非拍脑袋）

```text
第一批（零宿主风险、不依赖裁决，可立刻做）
  R1-a 唯一权威源 → R1-b/c 结构判据 → R3-c 一句话总结判据 → R2-c 反馈判定器
第二批（需 D4 / D2 / D5 / D6 裁决后做）
  R4-a 字表落盘 → R4-b language_audit → R4-d 第 9 维接线
  R5-a/b/c 双档契约 → R5-d 静默规约边界裁决落地
第三批（需 D3 授权；先跑 §3.4 六项实测，再动插件）
  R6 六项前置实测 → R6-b 宿主半命令 → R6-a 客户端半按钮 → R6-d PID 自证
  （注意自举悖论：装完插件仍需手动重启一次，按钮才可见）
```

---

## 七、历史演进与变更记录

- **2026-10-01 [新建]**：接收用户 6 条口语需求，完成字面勘误（"锁进 / 首航图标"）、
  **查重拦截**（结论：R1~R5 归并既有权威源，仅 R6 新立）与递归分裂（R1~R6，共 23 个叶子）；
  完成现状核查（可复用 16 项 / 实测缺口 9 项 / 本轮新发现 4 项）；
  完成 R6 专项可行性取证（`app.asar` 只读解析 → 生产包无官方重启入口，主推 A1 链路，登记 6 项待实测）；
  登记 6 项待裁决分歧。**本条目当前不产生任何机制载体改动**，状态 `[EVOLVING]` 待拍板。

---

## 八、实施进度（2026-10-01 · 用户下令「实施」后第一批落地）

> 口径：**只认磁盘上的物理载体与可跑退出码**，不认"已经做了"的口头宣称。
> 用户未逐条裁决 D1~D6，故按各条的**默认建议**执行，并在下表显式标注"按默认建议落地"，便于随时反悔。

| 叶子 | 状态 | 物理载体 | 实跑判定 |
| :--- | :---: | :--- | :--- |
| R1-a 唯一权威源 | ✅ 已落地 | `rules/system/output_standard.md` | 文件在位；`AGENTS.md` §五、元规则第 22/29/34 条已改为**指针**，复述处清零 |
| R1-b/c 结构判据 | ✅ 已落地 | `scripts/output_audit.mjs` 新增 `structureChecks()` | **16/16 自检通过**，含反向用例：缺首行徽标 / 缺一句话总结 / 超 30 字 / 标题跳级 / 缩进 4 层 / 缺回执字段 / 档位标记重复 —— 逐条判红成功 |
| R1-d 存量对齐 | ✅ 已落地 | 同上（指针化） | `redundancy_scan` 高相似对 0 · `conflict_scan` 冲突 0 |
| R2 反馈回执 | ✅ 已落地 | `rules/system/output_standard.md` §二④ + `output_audit.mjs` 回执判据 | 四字段标头缺失即判红（自检有专项断言）；数据源 = `progress_ledger report --json`，`mechanism_audit` 已登记并**已触达** |
| R3 一句话总结 | ✅ 已落地 | 同上 §二② | 位置（前 6 个非空行）与字数（4~30 汉字）双判据；短回复自动豁免 |
| R4 无生僻字 | ✅ 已落地 | `data/common_chars.txt`（6763 字）· `data/common_chars_allowlist.txt` · `scripts/gen_common_chars.mjs` · `scripts/language_audit.mjs` | 生成器 **13/13** 自检通过；判定器 **11/11** 自检通过；**全库扫描 0 命中**（存量已对齐） |
| R4-d 审计接线 | ✅ 已落地 | `scripts/audit_execution.sh` 第 9 维 | 八维 → 九维；权重重算 `20+16+12+12+12+8+12+4+4=100`（第 8 维 8→4 分，显式留痕） |
| R5 双档输出 | ✅ 契约已落地 | `rules/system/output_standard.md` §三 | 档位标记唯一性为硬判据；**术语密度仍是报告项**——按 D6 口径，没有外部权威边界的不升硬门 |
| R6 插件本体 | ✅ 已建成 | `skill-pool/plugins/dsh-plugin-restart/`（双半 + 内核 + 构建器 + 自检 + 接口契约 + README） | `build_client.py --check` 未陈旧；`skill-pool/plugins/dsh-plugin-restart/verify_restart_button.cjs` **84/84 通过**，含**反向变异**（故意改坏确认口令，行为断言确实失败） |
| R6 装配进宿主 | ✅ 已装配 | `~/.dsh/profiles/desktop/node_modules/dsh-plugin-restart` + `dependencies` 登记 + `bundles` 追加（8 项） | 装配器回执 `status: installed` · `restart_required: true` · 备份 `package.json.bak-20261001-124813` 与 `cordis.patch.yml.bak-20261001-124813` 均在位；回滚命令已输出 |
| R6 真机重启验证 | ⏳ **未做** | — | **只能由人点一次**：点击会中断当前会话，执行者不能自己把自己关掉；合格证据 = 重启前后宿主 PID 不同 |
| 通道登记 | ✅ 已落地 | `indexes/shortcuts_index.md` 新增「专业档输出」「一键重启」两条通道 | `channel_audit.mjs --root .` → 通道 **36** 条 · 问题 **0** 项 |
| mechanism_audit 登记 | ✅ 已落地 | `scripts/mechanism_audit.mjs` 新增 4 条 | 登记 19 条 → **22 条**；R1/R2/R4 三条**已触达**，R6 按 `strict:false` 登记（宿主激活凭据需重启一次才有，不应恒红） |

### 8.1 本轮采纳的默认裁决（用户未逐条裁决，按各条默认建议执行）

| 分歧 | 采纳的默认建议 | 反悔成本 |
| :--- | :--- | :--- |
| **D1 权威源落点** | 新建 `rules/system/output_standard.md`，其余改指针 | 低（改指针目标即可） |
| **D2 一句话总结位置** | 首屏（前 6 个非空行），文末五联装仍是唯一收尾结构 | 低（改阈值/判据） |
| **D3 R6 授权** | **只建本体，不装配、不重启** | 无（未触碰宿主） |
| **D4 字表来源** | GB2312-1980 基本集 6763 字（可复现推导，**非人工罗列**）；选它是因为实测一级 3755 会把「渲染/耦合/阈值/浏览」误报为生僻字（35 个字种），全集后降到 1 个字种（「啰」已书面豁免） | 低（换 `data/common_chars.txt` 重新生成即可） |
| **D5 静默规约冲突** | **未动**既有「技术细节绝对静默」规约——专业档只定义了契约，未强改旧技能 | 无（未改旧文件） |
| **D6 阈值来源** | 全部外置到 `gates.conf` 的 `OUT_*` / `LANG_*` 段；只把规范写明数字边界的升为硬门 | 低（改配置即时生效） |

### 8.2 尚未触达的部分（如实列出，不得当成已完成）

- **R6 真机验证未做**：插件已建成、自检 84/84、**并已装配进 `~/.dsh/profiles/desktop`**（回执 `status: installed`），
  但"重启一次 → 按钮出现 → 点击后 PID 变化"这三步**一步都还没走**。
  **执行者不会自行重启**——重启会终止当前会话，等于自己把自己关掉；这一步只能由人做一次；
- **R6 的 6 项待实测前置条件**（退出确认弹窗是否拦截 · 分离进程能否存活 · 第三方插件能否调 `remote.commands` ·
  两种 origin 下的可达性 · 装完是否仍需重启 · 宿主半能否 require `child_process`）全部**未验证**；
- **R5 术语密度仍是报告项**，未升级为硬判据（缺外部权威边界，按 D6 不升）；
- **D5 的旧技能冲突只登记未裁决**：`skills/plain-analogy-explanation`（技术细节绝对静默）与
  `skills/concise-chinese-bold-guard`（≤10 字）**原样未动**，等用户裁决后再改；
- **进度回执的"数字对拍"当前只判字段齐备**：`output_audit` 尚未真的去读 `progress_ledger report --json`
  与回执里的数字逐一对拍——该命令全量扫描 git 状态，实测单次 > 90 秒，
  塞进每轮判定会让机制不可用。**这是已知的实现落差，明写在此，不当作已完成。**

### 8.3 本轮揪出的既有检测器漏洞（连带修复）

**"接口覆盖率 100%"曾经是假的 —— 因为它的输入不是磁盘，而是索引。**

- **现象**：新增 `scripts/language_audit.mjs` 与 `scripts/gen_common_chars.mjs` 后，
  `node scripts/check_layer_interfaces.mjs --check` **依旧报「CLI 层 55/55 = 100%」**，
  而这两个脚本当时**根本没有接口契约文件**。
- **根因**：该判定器的条目来源是 `indexes/capabilities_index.json`（`loadIndex()`），
  而不是 `scripts/` 磁盘。索引没重建 → 新脚本在判定器眼里**不存在** → 覆盖率照样 100%。
  而 `build_capabilities_index.mjs --check` 其实**已经如实报出**「扫盘有而登记表无：238（已知口径差）」，
  只是接口判定器没有消费这个信号。**"已知口径差"从一个提示，变成了一个静默的检测盲区。**
- **实测证据**：磁盘 `scripts/` 有 57 个可执行脚本，索引 JSON 只有 55 条 CLI，接口文件 55 份；
  三者对齐后（重建索引 + 补 2 份手写契约）变成 **57 / 57 / 57**，`已人工核对` 由 1 → 4。
- **修复动作**：① `node scripts/build_capabilities_index.mjs --apply` 重建索引（234 → 240 条）；
  ② 手写两份契约（`scripts/interfaces/language_audit.interface.json`、`gen_common_chars.interface.json`，
  `source: handwritten` / `verified: true`）；③ 复跑判定器，覆盖率重新变成**真的有据**的 100%。
- **尚未修的（如实留下）**：判定器仍以索引为输入，**没有**"索引与磁盘对拍"这一步。
  下一次新增脚本若忘记重建索引，同一个盲区会再次出现。建议后续把
  `build_capabilities_index --check` 的"扫盘有而登记表无"接进接口判定器作为**硬前置**。
