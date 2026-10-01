# 需求文案：执行层编排化改造（GCM-ORCH）· 呈现简化 / 图片缩放 / 索引 / 接口 / 路由

> ### 🏷️ **版本信息与实施追踪**
> - **文档类型**：需求文案（登记为 `REQ-089`，状态 `[EVOLVING]`）
> - **当前系统实施总版本**：`v4.26.0`（本条目实施后递增至 `v4.25.0`）
> - **本文档内容版本**：`v1.0.0`
> - **提出时间**：2026-10-01
> - **任务代号**：`GCM-ORCH`（Execution Orchestration：索引 · 接口 · 路由）· 呈现侧子集 `UX-SIMP`
> - **需求状态**：`[文案待拍板]`（**未实施**，未改任何机制载体；本文只做需求翻译与递归分裂）
> - **依据**：用户 5 条口语需求 + 本轮实测（`build_capabilities_index.mjs --check` · `mechanism_audit.mjs` ·
>   `channel_audit.mjs` · `route_navigate.mjs` 源码审读 · `app.asar` 只读解包取证）

---

## 一、原始需求（用户口语原文）

> 以下是我对管控规则的优化需求，如果需求颗粒度过大导致执行层（包括 skill、agent、plugin、插件、cli、mcp 等）
> 没触达物理实现层，就递归分裂成更细更落地的执行层去完成这个需求；
> 1、输出结构精简化，要遵循书籍《Don't Make Me Think》以及格式塔交互理论，输出精简且符合人的阅读习惯；
>    把这两本书放进知识库里然后提取核心要点作为交互的规范；
> 2、输出的图片需要可以可视化的操作放大缩小，新增 +/- 按钮让我可以点击，这个 +/- 按钮是可以多次放大和缩小的；
> 3、新增索引层，用以索引所需的执行层；
> 4、所有执行层都要像面向对象编程一样提供接口以及内部写好详细使用的方法，方便索引以及具体执行；
> 5、新增路由层，当命中执行层之后需要由路由层决定怎样去调配这个执行层更高效；
>
> 理解以上需求并简化成更利于你执行的需求文案；

---

## 二、整理后的可执行需求

### 2.1 一句话定义

**每一层都要能"被点名、被调用、被验证"：输出按书上的认知规律收敛到最小阅读成本；图片可多级缩放；
232 个执行层从"名字清单"升级为"机读索引 + 接口契约"；命中之后由路由层按依赖与成本择优编排，
而不是三个硬编码分支。**

### 2.2 五条子需求的可机械判定口径

| # | 诉求（用户原话） | 做什么 | 物理载体 | 判定命令 | 阈值 / 后果 |
| :-- | :--- | :--- | :--- | :--- | :--- |
| **R1** | 输出结构精简化（DMIT + 格式塔） | 书目来源登记 + 认知要点转可判定条款 + 输出体量离插件判定 | `knowledge/sources/`（新建）· `knowledge/common/interaction_specification.md` · `scripts/output_audit.mjs`（新建） | `node scripts/output_audit.mjs --check` | 五联装齐备 + 体量达标；不达标即扣分并给扣分项 |
| **R2** | 图片可点击 +/- 多级缩放 | 给**已有灯箱**加多级缩放控制（不是从零做放大）；另出保底查看器 | `ImageLightbox`（落点：`packages/client/ui-primitives/src/ImageLightbox.tsx`）· 新建客户端插件 `skill-pool/plugins/dsh-plugin-image-zoom/` · 新建 `assets/viewers/image_viewer.html` | 插件自检 `python3 skill-pool/plugins/dsh-plugin-image-zoom/verify_*.py` + `node scripts/check_image_zoom.mjs --check`（新建） | 三级缩放（100% / 200% / 400%）真机点击可用；自检 exit 0 且带反向用例；任一缺失即未触达 |
| **R3** | 新增索引层索引执行层 | 静态清单升级为机读索引 + 可执行跳转 + 口径归一 | `indexes/capabilities_index.json`（新建）· `indexes/capabilities_index.md` · `scripts/build_capabilities_index.mjs` | `node scripts/build_capabilities_index.mjs --check` | id 唯一 + 路径存在 + 受管区间内 + 三处口径一致；否则未收录数必须显式 >0 |
| **R4** | 执行层像 OOP 一样提供接口与方法 | 统一接口契约 + 逐单元声明 + 接口覆盖率独立判定 | `<unit>/<name>.interface.json`（新建，逐单元）· `skill-pool/docs/operations/execution-layers.json` | `node scripts/check_layer_interfaces.mjs --coverage`（新建） | **接口覆盖率**与**名字覆盖率**分开报；名字 100% 但接口 0% 必须判红 |
| **R5** | 新增路由层决定如何高效调配 | 意图匹配器 + 调配决策器 + 路由审计器 | `scripts/route_plan.mjs`（新建）· `indexes/navigation_router.md` · `scripts/route_navigate.mjs` | `node scripts/route_plan.mjs --check` | 未命中不得伪造路径；死通道 = 0；文档声明与实现一致 |

### 2.3 "触达物理实现层"的可判定判据（递归分裂的停止条件）

沿用工程已有的四类物理探针口径（`length` / `regex` / `exitcode` / `file`），六条**全部满足**才算触达，
否则**继续分裂**，不得登记为完成：

| 序号 | 判据 | 探针类型 | 反例（判未触达） |
| :--: | :--- | :--- | :--- |
| 1 | 载体在磁盘真实存在且非空 | `file` + `length` | 只在文档里写了名字，没有文件 |
| 2 | 有可跑命令，退出码能区分成败 | `exitcode` | 命令不存在，或跑起来恒为 0 |
| 3 | id 唯一且被索引层收录（受管区间内） | `regex` | 字符串在别处出现过就算收录（`includes()` 式自证） |
| 4 | 有接口声明：`inputs` / `outputs` / `invoke` / `exit_codes` | `regex` | 只有一句散文简介 |
| 5 | 有判定器能判"未触达"，且存在反向用例 | `exitcode` | 检测器恒绿（"没证据"被折算成"通过"） |
| 6 | 不依赖未通电的载体 | `file` | 判定逻辑只挂在拦截层插件上（当前未注册，见 §四） |

### 2.4 递归分裂结果（粗颗粒 → 执行层叶子）

```text
GCM-ORCH
├── R1 输出呈现简化 (UX-SIMP)
│   ├── R1-a 书目来源层：knowledge/sources/ + 2 张来源卡（书名/作者/版次/权威章节/引用锚点）
│   ├── R1-b 计数口径裁决：格式塔定律"六条 vs 七条"两套说法（5 处 vs 2 处）→ 先裁决再统一
│   ├── R1-c 输出体量离插件判定：scripts/output_audit.mjs（改读宿主会话转录）→ 打通审计第 8 维
│   └── R1-d 输出模板落地：五联装 + 阶梯缩进 + 单一主行动 + 表格优先
├── R2 图片多级缩放
│   ├── R2-a 客户端插件 dsh-plugin-image-zoom：注入 UI，+ / − / 重置，三级（100% / 200% / 400%）
│   ├── R2-b 保底载体 assets/viewers/image_viewer.html：零宿主依赖，可判定，App 升级不失效
│   └── R2-c 交付规范：出图同时给「全图 + 分段裁切」，保证不可缩放的场合也读得清
├── R3 索引层
│   ├── R3-a 机读索引产物 capabilities_index.json（生成器同时输出）
│   ├── R3-b 条目升级：id / 路径 / 调用命令 / 接口指针 / 触发词（现仅 4 列）
│   ├── R3-c 口径归一：磁盘扫描为唯一真相源；execution-layers.json 降为补充
│   └── R3-d 判定升级：includes() 字符串判定 → 对拍（唯一性 / 路径存在 / 受管区间 / 接口在位）
├── R4 执行层接口化
│   ├── R4-a 契约格式落地：<unit>/<name>.interface.json（JSON Schema 子集）
│   ├── R4-b 存量补齐：54 个 CLI 先行，178 个技能分批（先保证 CLI 100%）
│   ├── R4-c 覆盖率判定器 scripts/check_layer_interfaces.mjs：接口覆盖率独立成项
│   └── R4-d 四处既有约定冲突裁决（必备文件清单 / 改名六处同步 / 受管区间 / manifest 语义）
└── R5 路由层
    ├── R5-a 意图匹配器：复用 channel_audit.mjs 已导出的 normalizePhrase / matchChannel
    ├── R5-b 调配决策器 scripts/route_plan.mjs：依赖边 + 成本模型 + 串并行裁决 + 锁冲突规避
    ├── R5-c 路由审计器：死通道 / 未命中伪造路径 / 文档-实现一致性
    └── R5-d 与物理锁、全局调度锁串联（LOCK 阶梯参与路由合法序）
```

---

## 三、现状核查（先说事实，再说改什么）

### 3.1 已经存在、可直接复用（**不要再造一遍**）

| 已有资产 | 可直接复用在哪条需求 | 实测证据 |
| :--- | :--- | :--- |
| `knowledge/common/interaction_specification.md` | R1（格式塔七定律 + DMIT 四原则已全文落地） | 该文件 §一 已列 7 条定律，§二 已列 DMIT 四原则 |
| `knowledge/common/readability_specification.md` | R1（DMIT 排版三铁律已落地） | 该文件 §一「《Don't Make Me Think》排版三大认知铁律」 |
| `scripts/build_capabilities_index.mjs` | R3（扫盘 + 受管区间重写已完备） | `--check` 退出码 0：执行层 232（技能 178 + agent/plugin/cli 54）· 未收录 0 |
| `scripts/channel_audit.mjs` 导出的匹配函数 | R5-a（意图匹配不必重写） | 已导出 `normalizePhrase` / `parseChannels` / `matchChannel` / `matchDetail`，并带正反例自检 |
| `indexes/shortcuts_index.md` 31 条通道 | R5-a（已含动作命令 + 输出 + 落地条件） | 通道表 31 条，由 `channel_audit.mjs` 守死链 |
| `skill-pool/plugins/dsh-plugin-usage-bar` | R2-a / R4-a（**全工程唯一机器可读带调用方式的载体模板**） | `package.json` 含 `main` / `exports` / `dsh.bundle.patch` / `dsh.client.inject` |
| `indexes/capabilities_index.md` §一/§二 | R4-a（双层接口契约格式已有纸面定义） | §三.2「标准化双层接口声明契约」已定字段要求 |

### 3.2 实测缺口（用户要"新增"的，实质是这些）

| # | 缺口 | 现状证据 |
| :-- | :--- | :--- |
| **G1** | 索引是 Markdown 表格，**无机读产物** | `capabilities_index.md` §3.1 全表 4 列；`--check` 只做 `indexText.includes(id)` 字符串判定 |
| **G2** | 条目无调用命令 / 无入参 / 无链接（路径写作反引号，不可点击） | `capabilities_index.md` §3.1 表头仅「层级 / 标识 / 物理路径 / 简介」 |
| **G3** | 意图匹配只覆盖 31 条通道，对 232 条能力**无匹配入口** | `shortcuts_index.md` 全表对 `skills/` 路径引用 **0 处** |
| **G4** | 路由无任何调配逻辑 | `route_navigate.mjs` 仅 1 个默认 routeMap + 3 个 `if/else`；`:65` 的 `capFile` 是**死变量**，索引文件从未被读取 |
| **G5** | 路由文档无校验器，文档与实现脱钩无人发现 | 全仓无脚本 `readFileSync` 该文件；`navigation_router.md:68` 自称"动态生成"，与实现不符 |
| **G6** | 统一登记口径打架（四处数字不一致） | `execution-layers.json` 15 条 vs 生成器扫盘 54 条 vs `execution-tree.md` 198 条 vs `capabilities_index.md` 232 条 |
| **G7** | 接口覆盖几乎为空 | 179 个 `SKILL.md` frontmatter 实测仅 `name`/`description`/`level`/`composition` 四键；`tool_interfaces.md` 只覆盖 6 个 CLI |
| **G8** | 分类口径冲突：六层 vs 五层 | `execution-tree.md` 定六层（含 api/mcp），`capabilities_index.md:10` 只认五层；api/mcp 两层 **0 个物理载体** |
| **G9** | 生成器存在"恒产 0 条"的空转数据源 | `build_capabilities_index.mjs:73-75` 的 `scanDirLayer()` 按 `isDirectory` 过滤，而 `skill-pool/docs/cli/commands/` 是 7 个 `.md`、0 个目录 |
| **G10** | 输出精简维度**结构性不可得分** | 度量报告只由拦截层插件写入（`ai-control/plugin/index.mjs:919`），而 `~/.dsh/.dsh-control/compact/` 目录**从未生成**；审计第 8 维恒扣 8 分 |
| **G11** | 格式塔定律计数两套说法 | "六大定律" 5 处（`README.md:42`、`knowledge/README.md:28`、`knowledge/common/README.md:17`、`indexes/rules_index.md:114`、`docs/requirements.md:652`）vs "七大定律" 2 处（`interaction_specification.md:13`、`docs/requirements.md:1737`）；`conflict_scan` 实测报 **0 冲突**（检测盲区） |

### 3.3 本轮新发现（此前未登记）

1. **宿主前端载体已整体迁移，一整类机制静默失效**：`scripts/patch_dsh_todo_progress.cjs` 的 `RUNTIME_ROOTS`
   只认 `/Applications/DSH Desktop.app/...`（旧应用名）与 `runtime/harness/...`（旧布局）；
   当前应用为 **`DeepSeek Harness.app`**，且前端成品包已**打进 `app.asar`**（121MB，非目录）。
   → 该补丁**永远找不到目标**，与 `mechanism_audit` 报「任务列表面板 ⛔ 找不到宿主前端产物」是同一根因。
2. **图片灯箱已存在，缺的只是缩放**（本轮只读解包 + 源码双证）：
   - 聊天内 Markdown 图片走 `packages/client/ui-primitives/src/markdown/render.tsx:641` 的 `LoadedMarkdownImage`，
     `:656-661` 已把它包进 `<button className={imageButton}>`，点击即打开 `<ImageLightbox>`；
   - **缩放件本体 = `packages/client/ui-primitives/src/ImageLightbox.tsx`**，内部只有
     `div.backdrop / div.mask / img.image / button.close`，**没有任何 zoom / scale / +/- 控件**；
   - 例外：纯图片**文件链接**（`render.tsx:605`）走 `ImagePreview.tsx`，其注释明确写"刻意不引入第二个激活目标"，不可点击；
   - 旁证：`dsh-client-ui-sidebar-documentpreview` 已内置缩放能力（`zoom` 出现 198 次），是同款交互的现成先例。
   → **需求不是"从零做放大"，而是"给已有灯箱加多级 +/- 缩放"**。
3. **本机存在真实 DSH 源码检出**：`/Users/linqiyu/Documents/GitHub/deepseek-harness`
   （版本 `0.2.0-rc.2`，与 `app.asar` 内包版本一致，HEAD `639ed01539`）。
   同时 `app.asar` 是**签名只读产物**：直接 patch 会破签名，且每次升级被覆盖。
4. **客户端插件注入机制可用，但当前一个都没装**：
   - 契约权威出处 `@deepseek-ai/dsh-client-modules/lib/index.js`：扫描宿主 Loader entries 中声明 `dsh.client` 的包，
     按模块图序组装 `window.__DSH_BOOT__`；必填 `dsh.client.platform`，入口由 `exports["./client"]` 解析
     （缺失抛 `MissingClientBundleError`）；
   - 注册位置：插件装进 `$DSH_HOME/profiles/<name>/node_modules`，由该 profile 的 `cordis.patch.yml` 的 `insert` 插入插件树；
   - **`~/.dsh/profiles/desktop/node_modules` 实测不存在** → 当前桌面 profile **未安装任何客户端插件**，
     `dsh-plugin-control-jump` / `dsh-plugin-usage-bar` 只躺在工程 `skill-pool/` 里，从未落地；
   - 生效条件：HMR（`dsh-client-hmr`，500ms 轮询）**只负责 Web 传输**，官方 README 明确"Electron 的安装和后端重启流程不使用此 SSE 路径"
     → **首次安装插件仍属安装/重启流程**，不能指望热重载。
5. **`ImageLightbox` 是共享件**：`ui-attachment` 的附件图同样用它，做在插件里可一并受益。

---

## 四、必须先由用户裁决的分歧（禁止我自行取舍）

| # | 分歧点 | 事实 | 备选方案 | 我的默认建议 |
| :-- | :--- | :--- | :--- | :--- |
| **D1** | **「格式塔交互理论」不是一本书** | 知识库里"提取后的规则"已有两处；但用户要求"把这两本书放进去"，而书目来源必须真实可考 | ①《Laws of UX》(Jon Yablonski) ② 格式塔心理学原始文献（Wertheimer / Köhler / Koffka）③《艺术与视知觉》(鲁道夫·阿恩海姆) | **请你指定权威书目**。我不会替你编造一本书的作者与章节——那正好违反本工程"不采信自述"的红线 |
| **D2** | R2 图片缩放的物理落点 | 落点唯一：`ImageLightbox.tsx`；但它在**签名只读的 `app.asar`** 内。GUI **已有点击放大，缺的只是缩放** | ①客户端插件 DOM 增强（推荐：不改宿主签名、升级不丢）②改源码重建重打包（破签名、每次升级被覆盖、须同步改两处测试）③工程内自建 HTML 查看器（零风险，但不在 GUI 内，不满足原需求） | **主推 ①**；③ 作为降级保底同时保留 |
| **D3** | R2-a 需要写宿主 profile | 客户端插件必须装进 `~/.dsh/profiles/desktop/node_modules`（**当前不存在**），再经 `cordis.patch.yml` 的 `insert` 注册；首次安装**不在 HMR 覆盖范围内**，需重启/刷新 | 授权 / 不授权；若授权，还需定"重启桌面端"的时机 | 等你在实施前点头，并接受"需重启一次" |
| **D4** | 已失效的 `patch_dsh_todo_progress.cjs` 怎么办 | `RUNTIME_ROOTS` 只认旧应用名与旧布局，当前为 `DeepSeek Harness.app` + `app.asar` 打包 → 该补丁**永远找不到目标** | ①改路径适配 asar ②废弃并改走客户端插件 ③保留但标 `[DEPRECATED]` | **②优先**：与 R2 共用同一套"客户端插件"载体，一次把宿主侧载体换血 |
| **D5** | 两个待实测项（实施前必须补证） | ① `dsh plugin add` 能否直接吃本地目录/绝对路径（决定交付形态）② 桌面端装完插件到底是重启 App 还是 Cmd-R 刷新即可 | — | 实施第一步先做这两项实机验证，**验证前不写"已生效"** |

---

## 五、验收标准（实施后逐条勾选）

- [ ] R1-a `knowledge/sources/` 在磁盘在位，2 张来源卡可被 `knowledge/README.md` 与索引层双向寻址；
- [ ] R1-b 格式塔定律计数全库唯一口径，`conflict_scan` 能检出该口径冲突（补盲区用例）；
- [ ] R1-c `scripts/output_audit.mjs --check` 跑出退出码，`audit_execution.sh` 第 8 维不再结构性扣分；
- [ ] R2 `+` / `−` / 重置三级缩放真机点击可用，附点击验证证据（截图或探针）；
- [ ] R2-b `assets/viewers/image_viewer.html` 双开可用，且不依赖宿主是否加载插件；
- [ ] R3-a `indexes/capabilities_index.json` 生成成功，条目数 == 磁盘实测执行层条目数；
- [ ] R3-c G6 的四处数字收敛为**唯一真相源**，`legacy_align_scan` / `conflict_scan` 复扫为 0；
- [ ] R3-d `--check` 升级为对拍式判定，并带**反向用例**（故意删路径 / 造重复 id 必须判红）；
- [ ] R4-c 接口覆盖率与名字覆盖率**分开报**，"名字 100% / 接口 0%"必须判红；
- [ ] R5 `route_plan.mjs --check` 退出码 0；未命中时**必须显式报未命中**，不得回显关键词伪装成路线；
- [ ] 全量复跑：`control_gates.sh check` 4/4 · `gate_selftest.sh` 9/9 · `mechanism_audit` 硬性未触达清零 ·
      `process_supervisor --fast` 硬项全绿 · `progress_ledger check` 漂移 0 / 未记录改动 0。

---

## 六、实施顺序建议（依赖驱动，非拍脑袋）

```text
第一批（零宿主风险，可立刻做）
  R1-a 书目来源层 → R1-b 口径裁决 → R1-c output_audit.mjs → R2-b HTML 查看器
第二批（工程内，不动宿主）
  R3-a 机读索引 → R3-d 对拍判定 → R4-a 契约格式 → R4-b CLI 54 个补接口 → R4-c 覆盖率判定器
第三批（路由与技能层，量最大）
  R5-a 意图匹配器 → R5-b 调配决策器 → R5-c 路由审计器 → R4-b 技能 178 个补接口
第四批（需要你授权改宿主）
  D5 两项实机验证（dsh plugin add 能否吃本地路径 · 装完是重启还是刷新）
   → R2-a 客户端插件 → D4 宿主侧载体换血
```

---

## 七、实施进度（2026-10-01 · 第一批已落地）

> 口径：**只认磁盘上的物理载体与可跑退出码**，不认"已经做了"的口头宣称。

| 叶子 | 状态 | 物理载体 | 实跑判定 |
| :--- | :---: | :--- | :--- |
| R1-a 书目来源层 | ✅ 已落地 | `knowledge/sources/`（README + SOURCE-001 + SOURCE-002） | 三文件在位非空；`legacy_align_scan` 待对齐 = 0 |
| R1-b 口径裁决 | ✅ 已落地 | `conflict_scan.mjs` 新增 C3 指标 `格式塔定律数` + 3 条自检用例 | 自检 **29/29 全过**；**反向验证**（临时造"六 vs 七"）实测判出 1 项 C3 冲突 ✅ |
| R1-c 输出体量判定 | ✅ 已落地 | `scripts/output_audit.mjs` + `audit_execution.sh` 第 8 维接线 | 实跑取证成功：读第 3 回合正文 **2469 字/54 行**，五联装齐备（**真实判负**，非"未采集"） |
| R2-b HTML 保底查看器 | ✅ 已落地 | `assets/viewers/image_viewer.html`（28,288 字节 · 单文件零外链） | 10 档缩放 `[0.25…8]`；自测 17/17；外链 `http(s)://` 计数 = 0 |
| R3 机读索引 + 对拍判定 | ✅ 已落地 | `indexes/capabilities_index.json`（234 条）+ `build_capabilities_index.mjs` 五维对拍 | `--check` exit 0：名字覆盖 234/234 · 重复 id 0 · 路径缺失 0 · JSON 条数一致 · **接口覆盖 0/234 = 0.0% 已显式暴露** |
| R4-a 契约格式 | ✅ 已落地 | `knowledge/common/execution_layer_interface_spec.md` | 字段口径与判定器 `REQUIRED_FIELDS` 一一对应 |
| R4-c 覆盖率独立判定 | ✅ 已落地 | `scripts/check_layer_interfaces.mjs` | CLI 层 52/52 = **100% 达标**；总接口覆盖 56/234 = 23.9%；**已声明 ≠ 已核对**分开报 |
| R4-b CLI 补接口 | ✅ 基线完成 | `scripts/interfaces/*.interface.json`（52 份） | `source=extracted-from-header` / `verified=false`，属**基线占位**；人工核对待办 |
| R4-b 技能补接口 | ⏳ 未开始 | — | 178 个技能接口覆盖 0%（判定器**只报数不判红**，按批次推进） |
| R5 路由层 | ✅ 已落地 | `scripts/route_plan.mjs`（1355 行）· `indexes/navigation_router.md`（修正虚假声明） | `--check` exit 0：① 文档-实现一致 0 问题（含**负例自检**：声明数据源但源码只有死变量必须被检出）· ①b 物理锁门禁对拍 60 格 · ② 死通道 0 · ③ 可达性 **有触发词 196 / 无触发词 39 = 83.4%**（分开报）· ④ **反向用例**「zzz-不存在的能力-9999」→ 未命中 + 3 条近似建议（全标"非命中"） |
| R2-a 客户端插件 | ✅ 已落地并装配 | `skill-pool/plugins/dsh-plugin-image-zoom/` + 已装配进 `~/.dsh/profiles/desktop` | `node verify_image_zoom.cjs` **73/73 通过**（含反向变异自证：故意破坏 `zoomed` → 59/73 失败）；装配回执 `status: installed` · `restart_required: true` |
| D4 失效补丁处置 | ✅ 已落地 | `scripts/patch_dsh_todo_progress.cjs` 头部加 `[DEPRECATED]` 退役说明 | 头部含失效两层根因与替代路线；入口引用仍在（未删除文件） |
| **R1-d** 逐条可判定化 | ✅ 已落地（第二轮） | `scripts/output_audit.mjs` 新增 `cognitiveChecks()` | 唯一硬判据 = **标题嵌套 ≤3 级**（规范明文硬性边界）；其余 4 项（扫视锚点率/加粗占比/超长行/段落墙）为**报告项不参与判定**。实跑：1376 字/40 行 · 嵌套 2 级 ✅ · 锚点率 91.7% |
| **R3-c** 口径归一 | ✅ 已落地（第二轮） | `execution-layers.json` 增 `pathBase`/`truthSource`；`--check` 增第 ⑥ 项对拍 | 实测揪出**真缺陷**：登记表 12 条路径一直是**相对 `skill-pool/` 的**却无人声明，按仓库根解析的消费者会误判"全部缺失"。修复后 `path 非空但磁盘缺失 = 0`；口径差（扫盘 236 vs 登记 15）显式报出且不当硬门 |
| **R4-d** 约定冲突裁决 | ✅ 已裁决（第二轮） | `skills/README.md` 增「标准伴随文件 `interface.json`」；改名同步契约**维持六处不改** | 裁决理由：`interface.json` 的 id/path 一致性由**判定器强制**（不一致即退出码 1），属"机器守住的第 7 处"；扩人工清单会引发全库 5 处引用的**计数级联**，低收益高风险。原则：**凡判定器能守的，不塞进人工清单** |
| **R4-b** 技能层接口 | ✅ 已落地（第二轮） | `scripts/gen_skill_interfaces.mjs` + **178 份** `skills/<id>/interface.json` | 技能层声明覆盖率 **0% → 100%**；`--self-test` **40/40 通过**（含反向桩件：无 Usage/ExitCode 段必须产出 `(待补)` 而**不是**编造）；`--apply` 二次实跑幂等（新增 0 / 未变化 178）；`check_layer_interfaces --check` 契约违规 **0** |

### 7.1 第一批实测新发现（连带缺陷，已顺手清零）

1. **`progress_ledger` 的未跟踪目录假阳性**：`git status --porcelain` 会把整个未跟踪目录**折叠成一行**（`?? knowledge/sources/`），
   而台账只能登记**文件**（登记要读回算 sha256，目录读不了）→ 任何新建目录都会被报"未记录改动"，
   台账永远清不干净。修法：改用 `git status --porcelain -uall` 逐个列出未跟踪文件，与登记颗粒度对齐。
2. **`audit_execution.sh` 第 8 维的结构性死结**：度量报告只由拦截层插件写，而插件未注册 →
   该目录从未生成 → **恒扣 8 分且与输出质量无关**。修法：审计在读取前先调 `output_audit.mjs --refresh`
   从宿主转录取证（同 REQ-087 R1-a 的"离插件化"思路）。

### 7.2 尚未触达的部分（如实列出，不得当成已完成）

- **R2-a 需要你手动重启桌面端一次**：插件已装配进 `~/.dsh/profiles/desktop`（回执 `status: installed`），
  但新插件的 bundle 注册表**在宿主启动时读取**，`dsh-client-hmr` 官方 README 明确"Electron 的安装与后端重启流程不使用该 SSE 路径"
  → **只刷新页面不够，必须重启桌面端**才能看到控件条；
- **R2-a 已知边界（不掩盖）**：缩放用 `transform: scale()`、**不改布局盒**，而宿主灯箱 `.backdrop` 没有 overflow 滚动条
  → **400%~800% 时只能看到视口正中一块、无法拖动看边角**。改宿主 overflow 会干扰蒙层点击关闭，故未越权修改，留作后续独立需求；
- **R4-b 技能层 178 个**：契约已 100% 生成，但 **`verified:true` 的只有 1 份**（`route_plan`，人工核对过）。
  抽取成功率的真实分布（可复跑 `node scripts/gen_skill_interfaces.mjs --check`）：
  `summary` 100% · `exitCodes` 60.7% · `examples` 58.4% · `dependencies` 57.9% · `inputs` 51.7% · **`outputs` 仅 23.6%**；
  共 **292 处 `(待补)`**，涉及 136 个技能。
- **`parallel`（并发档位）最不可信，已收紧到保守值**：178 个技能里 145 个落 `exclusive`，33 个 `readonly` **全部只是文档自称**，
  `shared` 经核查**全是误判已归零**——即**全池没有任何技能给出针对自身的并发安全证据**。
  路由层只把 `verified:true` 的契约当并行依据（今日仅 1 份），因此对技能层一律取保守串行；
  **在人工抽查升 `verified` 之前，不得据现成的 `readonly` 直接并发**。
- **62 个技能"有脚本却完全没写出参口径"**——这是**文档缺陷**而非抽取器缺陷，已如实计入待补，未用推测填充。
- **R1-d 输出模板落地**：当前由 `output_audit.mjs` 以"体量 + 五联装齐备性"判定，
  **尚未**把格式塔/DMIT 的条款转成逐条可判定项（本轮只完成"书目来源 + 度量载体"）。

---

## 八、历史演进与变更记录

- **2026-10-01 [新建]**：接收用户 5 条口语需求，完成口径翻译与递归分裂（R1~R5，共 18 个叶子）；
  完成现状核查（复用 7 项 / 缺口 11 项 / 新发现 3 项），提出 4 项待裁决分歧。
  **本条目当前不产生任何机制载体改动**，旨在先获批"做什么、怎么判"再进入实施。
- **2026-10-01 [实施 · 第一批]**：用户裁决 D1（格式塔以原始文献为准）/ D3（授权改宿主）/ D4（废弃旧补丁）后开工。
  落地 R1-a/b/c、R2-b、R3、R4-a/c、R4-b(CLI)、D4；连带修复 2 处既有缺陷（见 §7.1）。
  未完成项已在 §7.2 如实列出，**不得视为已闭环**。
