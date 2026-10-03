# 通用能力层命名规范 (Capability Naming Specification)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.29.13`
> - **命名规范版本**：`1.0.0`
> - **文档类型 (Doc Type)**：`[CORE-KNOWLEDGE 核心知识库]`
> - **清理定位 (Retention)**：`[PERMANENT 永久核心白名单 · 严禁删除]`
> - **规范层级**：`【知识库 · 通用公共规范 · 能力层命名唯一权威源】`
> - **需求依据**：`REQ-KB-CAPABILITYNAMING-031、REQ-LAYER-NAMINGAUDIT-032`
> - **生效状态**：`[Release 稳定生效]`

本文档是**能力层命名格式的唯一权威源**：任何执行层（skill / cli / agent / api / mcp / plugin）
叫什么、归谁管、属于哪一层、做什么，一律以本文档为准。其余文件（规则、记忆、脚本）只允许写指针，
**禁止复制本文档的规则表**，避免同一事实出现两种说法。

> 本文档的规则表由脚本 `skills/render-capability-naming/scripts/render_naming_spec.py` 从
> `docs/operations/capability-naming.json` 单向渲染生成，人工编辑会在下一次
> `--check` 时被判为漂移并覆盖。

---

## 🎯 零、与既有命名规范的分工

| 规范 | 管什么 | 唯一权威源 |
| :--- | :--- | :--- |
| [`task_naming_spec.md`](task_naming_spec.md) | **会话 / 任务**标题（`[分类编号][难度分] 概述`） | `task_naming_spec.md` |
| 本文档 | **能力层 / 执行层** id（`<verb>-<object>` 等四种形态） | `capability-naming.json` |

两者互不覆盖：任务标题回答「这次要干什么」，能力层 id 回答「这个能力叫什么」。

<!-- CAPNAMING:BEGIN 受管区块：由 skills/render-capability-naming 自动生成，禁止人工编辑 -->
本文档由 `skills/render-capability-naming/scripts/render_naming_spec.py` 依据 `docs/operations/capability-naming.json` 自动生成，禁止人工编辑受管区块。

能力层命名规范唯一真相源：钉死「归属 / 分类 / 做什么 / 命名」四要素与四种已登记命名形态。知识库文档与本仓文档均由本文件生成受管区块，禁止人工双写。

---

## 一、四要素（缺一不可）

| # | 要素 | 字段 | 它回答的问题 | 判据 |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **归属** | `owner` | 它归谁管？ | L1/L2 必须被至少一条同池 composition 边引用（有人用才叫有归属，孤儿即违规）；L3 必须落在 execution-tree 的七个集群之一；L4 是根，无上位归属。 |
| 2 | **分类** | `layer` | 它是哪一种执行层？ | 必须是六层闭集之一：skill / cli / agent / api / mcp / plugin；且必须与 docs/operations/execution-layers.json 中登记的层名逐字一致。层名不得自创、不得用同义词替代。 |
| 3 | **做什么** | `intent` | 它到底做什么？ | description 必须非空且 ≥ 20 字节，且必须带层级声明前缀，前缀即「做什么」的类别声明。同池技能用层级前缀，外部纳管技能用系统能力前缀；两种都已登记，不得混用、不得省略。 |
| 4 | **命名** | `id` | 它物理上叫什么？ | 由前三要素派生：分类决定允许的命名形态，做什么决定动词与宾语，归属决定修饰前缀。id 必须同时满足语法约束与四条已登记形态中的至少一条。 |

**顺序不可颠倒**：先定归属（谁用），再定分类（哪一层），再定做什么（动词与宾语），最后才派生名字。

---

## 二、执行层分类（六层闭集）

| 层名 `layer` | 中文名 | 它是什么 | 命名附加约束 |
| --- | --- | --- | --- |
| `skill` | 技能 | 可被索引与路由的最小能力单元，本池主体 | 受全部命名形态约束，目录位于 skills/<id>/ |
| `cli` | 命令行入口 | 产品对外的可执行命令入口 | 末段必须是 -cli |
| `agent` | 智能体 | 具备独立上下文的自治执行体 | 末段必须是 -agent |
| `api` | 接口 | 进程间或跨网络的调用契约 | 末段必须是 -api |
| `mcp` | 模型上下文服务 | 以 MCP 协议暴露的工具面 | 末段必须是 -mcp |
| `plugin` | 插件 | 宿主侧可装卸的能力扩展 | 末段必须是 -plugin |

层名不得自创、不得用同义词替代，必须与 `docs/operations/execution-layers.json` 登记项逐字一致。

---

## 三、四种已登记命名形态

| 形态 | 中文名 | 判据 | 强制层级 | 例 |
| --- | --- | --- | --- | --- |
| `action` | 动作形态 | 首段必须落在动词词汇表内（见 verb_vocabulary），表达「做什么」 | L2 | `verify-layer-naming`、`build-execution-tree`、`rename-execution-layer` |
| `orchestration` | 编排形态 | 末段必须落在编排名词表内，表达「是哪一类总控」 | L3 | `layer-naming-guard`、`intent-detector`、`skill-import-pipeline` |
| `policy` | 规约形态 | 末段为 policy / spec / standard / protocol，表达「这是一条口径基元」 | L1 | `atomic-lock-policy`、`token-budget-policy` |
| `vendor` | 厂商边界形态 | 整名为单段，且必须是已登记的厂商 / 平台名，用于外部工具边界技能；未登记的单段名一律违规 | vendor-boundary | `github` |
| `cli` | 命令行形态 | layer=cli 时：产品主入口允许单段产品名（产品名即入口名）或末段为 -cli；子命令必须写成 <入口id>:<子命令>，冒号两侧各自是 kebab-case | cli | `skill-pool`、`skill-pool:validate`、`skill-pool:catalog` |

### 层级与形态的绑定

| 层级 | 要求 | 为什么 |
| --- | --- | --- |
| L1 | free | L1 是规约层，命名形态自由，只受语法约束、禁词、同义归一与唯一性约束；规约描述的是「什么必须成立」而非「做什么动作」，因此不强制动词开头。 |
| L2 | action | L2 是工序动作层，必须是动词开头的动作形态。 |
| L3 | action|orchestration | L3 必须满足其一：首段是动词（动作形态），或末段是编排名词（编排形态）。 |
| L4 | fixed | L4 是全池唯一中枢，id 固定为 dsh-butler，不参与整改。 |

---

## 四、语法约束

| 项 | 取值 |
| --- | --- |
| 形态 | `<verb>-<object>[-<qualifier>]` |
| 正则 | `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` |
| 字符集 | 仅小写 ASCII 字母、数字与连字符；禁止下划线、空格、大写、中文、连续连字符、首尾连字符 |
| 段数 | 2 ~ 5（单段仅限厂商边界形态） |
| 长度 | 3 ~ 48 字符 |

---

## 五、动词词汇表（64 条，含语义边界）

动作形态的首段必须落在此表内。表中同时钉死易混淆词的**边界**，边界即「什么时候该用哪个词」，避免同一个动作被拆成多个近义动词。

| 动词 | 语义边界 |
| --- | --- |
| `acquire` | 获得占用权（锁、句柄、租约），不产生内容 |
| `arbitrate` | 在互斥规则之间做裁决，产出胜出方 |
| `assert` | 对既成事实做硬断言并给出退出码 |
| `audit` | 遍历全量对象做合规审查，产出违规清单与位置 |
| `build` | 由已有数据源生成产物，必须幂等可重跑 |
| `check` | 单点静态检测，只返回事实不做出放行裁决（与 verify 的边界见 synonym_groups） |
| `classify` | 把对象划入已定义的少数几档之一 |
| `collect` | 按判据从多个来源汇聚证据或数据，只取不改 |
| `compare` | 对不同来源的口径做对拍并列出差异 |
| `concretize` | 把含糊表述补成具体实体与可核对判据 |
| `confirm` | 在动作前取得授权或确认 |
| `declare` | 把隐含信息显式声明成机器可读结构，不做检测 |
| `deploy` | 把产物发布到目标运行环境 |
| `detect` | 扫描并定位符合判据的命中项，产出命中清单 |
| `disambiguate` | 消除候选之间的歧义并收敛到唯一解 |
| `dispatch` | 按判据把任务派发到不同处理路径 |
| `emit` | 按契约产出单条结构化输出 |
| `enforce` | 把规约变成不可绕过的强制约束 |
| `ensure` | 保证某属性成立，不成立即阻断 |
| `extract` | 从混合输入中抽出目标结构 |
| `filter` | 按判据剔除不合格项 |
| `fold` | 把多条同类项折叠成一条汇总表达 |
| `format` | 把内容整理成规定的表现形式 |
| `generate` | 由参数或模板合成新内容（与 build 的边界：build 的输入是既有数据源，generate 的输入是参数） |
| `govern` | 对一类对象施加持续约束与门禁 |
| `index` | 建立可检索的索引结构 |
| `init` | 建立初始骨架与登记项 |
| `install` | 把产物装配进目标运行环境并登记，可回滚（与 load 的区别：load 是按标识载入内存，install 是落到环境里） |
| `link` | 建立挂载关系 |
| `load` | 按精确标识载入单一对象 |
| `log` | 把事件追加写入留痕存储 |
| `manage` | 对一个实体的完整生命周期做增删改查 |
| `match` | 按索引或关键词做候选匹配 |
| `measure` | 用确定性公式测算量化指标 |
| `merge` | 把两个及以上来源合并为一个 |
| `normalize` | 把外部形态改造为本池统一契约 |
| `parse` | 把输入解析成结构化字段 |
| `place` | 依据判据给出归属建议，不写文件 |
| `plan` | 产出待执行的分解清单，不执行 |
| `prune` | 按保守规则裁剪冗余内容 |
| `publish` | 把本地产物推到远端可获取位置 |
| `quantify` | 把程度词替换为可判定的数值区间 |
| `rank` | 对候选按评分做全序排序 |
| `reconcile` | 对拍多个规范并裁定冲突，让它们重新一致 |
| `record` | 把决断结果写成可追溯的四元组留痕 |
| `register` | 把新条目登记进登记表 |
| `release` | 释放占用权 |
| `rename` | 改名并同步全部引用 |
| `render` | 把数据源渲染成受管区块或图表 |
| `resolve` | 把冲突收敛到确定解 |
| `retire` | 让已被替代的对象退出服役，可回滚并留台账 |
| `run` | 执行既有用例或流程并汇总结果 |
| `score` | 按固定维度打分 |
| `search` | 在候选空间中按查询检索（同义组的唯一保留词，见 synonym_groups） |
| `select` | 从候选中收敛到受约束的选中清单 |
| `standardize` | 把形态统一到规定样式 |
| `strip` | 按固定顺序剥离非目标成分 |
| `summarize` | 抽取式压缩内容并保真 |
| `sync` | 让两处及以上状态保持一致 |
| `track` | 持续展示某过程的真实进度 |
| `unlink` | 解除挂载关系 |
| `validate` | 校验结构合法性（字段齐备、类型正确），不判定业务对错 |
| `verify` | 对放行条件做硬断言并以退出码裁决（与 check 的边界见 synonym_groups） |
| `visualize` | 把抽象数据编译成可视化产物 |

---

## 六、编排名词表与规约尾段

**编排名词表**（L3 编排形态的末段必须落在此表内）：`guard`、`router`、`detector`、`dispatcher`、`pipeline`、`framework`、`gatekeeper`、`auditor`、`reporter`、`viewer`、`showcase`、`governance`、`topology`、`registry`、`butler`、`supervisor`

**规约尾段**（L1 规约形态的末段）：`policy`、`spec`、`standard`、`protocol`

---

## 七、禁词表（出现即违规）

`util`、`utils`、`helper`、`helpers`、`misc`、`temp`、`tmp`、`new`、`old`、`bak`、`final`、`copy`、`test2`、`data2`、`stuff`、`thing`、`misc2`、`v2`

这些都是**信息量为零**的词：它们不说明能力做什么，只说明它相对于什么而存在（新旧、备份、临时、杂项）。一个名字一旦带 `util`，它就会变成什么东西都往里塞的垃圾桶。

---

## 八、同义归一

| 保留词 | 别名（需归一） | 理由 |
| --- | --- | --- |
| `search` | `find`、`query`、`lookup`、`seek` | 四词在检索语义上不可区分，全池只允许 search 作为首段出现，避免同一动作出现四种命名 |
| `verify` | （无别名，独立登记） | verify 保留为「断言 + 退出码裁决」；check 不列为别名而是独立登记词，其边界是「单点静态检测，只返回事实不裁决」 |
| `build` | （无别名，独立登记） | build 保留为「由既有数据源生成幂等产物」；generate 与 create 不列为别名，各自独立登记并写明边界 |

---

## 九、单段厂商边界白名单

| id | 厂商 | 理由 |
| --- | --- | --- |
| `github` | GitHub | 外部平台边界技能，名称即平台名，复数化或加后缀反而降低可识别性 |

---

## 十、改名的六处同步契约

改名不是只改目录名。一次改名必须同时同步下列六处，漏一处即判悬空引用。

| # | 同步对象 | 位置 |
| --- | --- | --- |
| 1 | 目录名 | `skills/<id>/` |
| 2 | 技能 ID | `docs/operations/skill-catalog.json 的 id 与 name 字段` |
| 3 | 契约头 | `skills/<id>/SKILL.md 的 YAML Frontmatter name 字段` |
| 4 | 组装边 | `全池 composition 与 depends_on 引用` |
| 5 | 树与索引 | `execution-tree.json / execution-tree.md / skill-index.json / layer-graph.json / instance-safety.json` |
| 6 | 文档与登记 | `docs/** 受管区块与正文提及、docs/operations/execution-layers.json` |

---

## 十一、当前合规快照（实数，非声称）

| 指标 | 数值 |
| --- | --- |
| 执行层总数 | 182 |
| 合规数 | 180 |
| 违规数 | 2 |
| 合规率 | 0.9890 |
| 按层级分布 | L1 43 / L2 95 / L3 43 / L4 1 |
| 快照来源 | `docs/operations/skill-catalog.json` |
<!-- CAPNAMING:END -->
