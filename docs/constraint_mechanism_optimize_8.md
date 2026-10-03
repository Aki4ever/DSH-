# 需求文案：常显与自证层强化（GCM-LIVE）· 重启常显真执行 / API 知识库 / 峰谷常显 / 全域指纹 / 原子锁

> ### 🏷️ **版本信息与实施追踪**
> - **文档类型**：需求文案（登记为 `REQ-091`，状态 `[EVOLVING]`）
> - **当前系统实施总版本**：`v4.29.11`（本条目实施完成后推进至 `v4.27.0`）
> - **本文档内容版本**：`v1.0.0`
> - **提出时间**：2026-10-01
> - **任务代号**：`GCM-LIVE`（Live Surface：常显面 · 自证面 · 并发面）· 宿主侧子集 `UX-RESTART-2`
> - **需求状态**：`[EVOLVING]` **已实施第一批（R1/R2/R4/R5/R6 落地并自检通过；R3 见下）**
>   —— 实施明细与未完成项见 §八。**未完成项一律显式列出，不得当作已完成。**
> - **依据**：用户 6 条口语需求 + 本轮实跑取证（`install_host_gate.sh verify` · `deepseek_usage_probe.mjs --check` ·
>   `verify_restart_button.cjs` · `fingerprint_audit.sh` · `control_gates.sh check` · `global_scheduler_lock.sh` 源码审读 ·
>   `app.asar` 只读解析枚举全部 slot 席位 · 官方文档站目录抓取）

---

## 一、原始需求（用户口语原文）

> 以下是我对管控规则的优化需求,如果需求颗粒度过大导执行层(包括 skill、agent、plugin、插件、cli、mcp等)
> 导致没触达物理实现层,就递归分裂成更细更落地的执行层去完成这额个需求;
> 1、当前重启按钮需要在所有页面都常显;
> 2、重启按钮点击后必须执行重启(当前没有执行,修复这个问题);
> 3、把api文档做成知识库,https://api-docs.deepseek.com/zh-cn/;
> 4、根据知识库中的api文档说明,常显空闲时段、高峰时段;这两个阶段作为重要的常显显示,要实时更新;
> 5、新增指纹机制,让所有管控规则布置好指纹,好让你自己快速知道每一个东西的更新情况;
> 6、增加原子锁机制,在必须同时执行或者有异步风险操作的机制下实行原子锁机制,保持数据同步,拒绝脏数据;
>
> 理解以上需求并简化成更利于你执行的需求文案;

> 📌 **原文勘误（只做字面归一，不改语义）**："优化需求,如果" 等半角逗号 = 全角标点；
> "导执行层" = **到执行层**；"这额个需求" = **这个需求**。三处为输入法误写，本需求文案统一按后者执行。

---

## 二、整理后的可执行需求

### 2.1 一句话定义

**把"看不见 / 没生效 / 说不清新旧"的四类东西一次性摆到台面上：重启按钮从"只挂在会话页"改成全域常显并打通真实重启链路；
官方 API 文档落成本地知识库并成为时段规则的唯一出处；高峰/空闲时段做成全页面常显、可复跑的实时读数；
全域受管资产统一发指纹做到"改没改一眼可查"；所有会互相踩脚的写操作统一套原子锁，并发下不产生脏数据。**

### 2.2 六条子需求的可机械判定口径

| # | 诉求（用户原话） | 做什么 | 物理载体 | 判定命令 | 阈值 / 后果 |
| :-- | :--- | :--- | :--- | :--- | :--- |
| **R1** | 重启按钮所有页面常显 | 客户端半增加**全域席位**挂载（`sidebar.footer.action`，root scope，全页面常驻），保留会话页头部席位作为次要落点 | `skill-pool/plugins/dsh-plugin-restart/src/restart-core.cjs`（席位常量）· `src/client.template.js` · `lib/client.js` | `node skill-pool/plugins/dsh-plugin-restart/verify_restart_button.cjs` + DOM 常显取证 | 两个席位都要真实注册；**全页面常显须有 DOM/截图证据**，只有源码声明判未触达 |
| **R2** | 点击后必须真的重启 | ① 修复"命令注册成功但点击链路断"的根因；② 点击→确认→命令→分离进程→**PID 变化**全链路闭环 | `src/host-core.cjs` · `lib/index.js` · `scripts/lib/host_pid.mjs`（新建） | `node scripts/restart_verify.mjs --check`（新建，比对重启前后 PID） | 判定只认 **PID 变化**；只弹提示、只记日志、只返回 success 一律判未满足 |
| **R3** | API 文档做成知识库 | 官方 `https://api-docs.deepseek.com/zh-cn/` 目录落成本地知识库：页清单 + 正文镜像 + 逐页指纹 + 同步器 | 新建 `knowledge/api/deepseek/`（`README.md` · `index.json` · `pages/*.md`）· 新建 `scripts/sync_api_docs.mjs` | `node scripts/sync_api_docs.mjs --check` | 页清单覆盖率 100% + 每页 sha256 可复算；**抓不到就如实报错**，禁止手写"大概是这个内容" |
| **R4** | 空闲/高峰时段常显且实时 | 时段读数上常显面（沿用已审计的 `deepseek_usage_probe.mjs`，**不在前端重算**），并更新到知识库口径 | `skill-pool/plugins/dsh-plugin-usage-bar/`（现仅输入坞）· `scripts/deepseek_usage_probe.mjs`（已有 `--json`） | `node scripts/deepseek_usage_probe.mjs --json` + 常显面取证 | 读数与探针 `--json` **逐字相等**且新鲜度 ≤ 阈值；过期读数必须显式标注而不是装作实时 |
| **R5** | 全域资产布置指纹 | 指纹从"事后审计报表"升级为**机读产物 + 查询入口**：全量受管资产发短指纹，台账由生成器重写 | 新建 `indexes/fingerprint_index.json` · 新建 `scripts/fingerprint_index.mjs` · 既有 `scripts/fingerprint_audit.sh` · `memory/asset_fingerprint_ledger.md`（降为指针） | `node scripts/fingerprint_index.mjs --check` | 覆盖受管资产 **≥234** 且覆盖率 100%；漂移项必须显式 >0；**指纹不一致不得折算成通过** |
| **R6** | 加原子锁，拒绝脏数据 | 把已存在但**未被调用**的锁原语接到真实写路径choke point（看板快照 / 进度台账 / 定价指纹 / 插件状态 / 索引重写） | 新建 `scripts/lib/atomic_lock.mjs` + `scripts/lib/atomic_lock.sh`（薄封装）· 既有 `skills/acquire-atomic-lock/scripts/atomic_lock.py`、`scripts/global_scheduler_lock.sh` | `node scripts/atomic_lock_audit.mjs --check`（新建） | 接入点清单 100% 命中 + **无锁对照段必须能测出重叠**（证明检测器有牙）；无锁即写一律判红 |

### 2.3 "触达物理实现层"的可判定判据（递归分裂的停止条件）

**唯一权威出处**：[`docs/constraint_mechanism_optimize_6.md`](constraint_mechanism_optimize_6.md) §2.3
（六条判据：载体非空 / 退出码可分 / id 入索引 / 有接口声明 / 有反向用例 / 不依赖未通电载体）。
本文档**不复述**该表（复述会构成实质冗余，实测被判高相似块对），一律按上指针执行。

### 2.4 递归分裂结果（粗颗粒 → 执行层叶子）

```text
GCM-LIVE
├── R1 重启按钮全域常显 (UX-RESTART-2)
│   ├── R1-a 席位升级：主席位从 conversation.session.header.actions 扩到 sidebar.footer.action（root scope）
│   ├── R1-b 双席位共存：会话页头部保留，全域席位新增；两处共用同一注入逻辑，不写两套
│   ├── R1-c 常显自证：新增 DOM/截图取证脚本，证明"路由切到任一页面按钮仍在"（源码声明不算）
│   └── R1-d 视觉降级：按钮在窄侧栏/折叠态下的可读性（图标 + 提示，不硬塞文字）
├── R2 点击真重启 (RESTART-E2E)
│   ├── R2-a 根因定位：命令是否注册成功 / 客户端 remote.commands 是否可达 / spawn 是否真派出（三段分别取证）
│   ├── R2-b 宿主 PID 留痕：新增 scripts/lib/host_pid.mjs，统一"当前宿主 PID"取法（端口反查单一实现）
│   ├── R2-c 端到端判定器：scripts/restart_verify.mjs --check（重启前记录 PID → 点击 → 重启后比对）
│   ├── R2-d 失败可见：链路任一段断开时按钮给出可读原因，绝不静默（现行为已部分满足）
│   └── R2-e 回归防线：把 PID 判定接进 verify_restart_button.cjs 的反向用例（改坏链路必须判红）
├── R3 API 文档知识库 (KB-API)
│   ├── R3-a 页清单：抓取官方侧边导航 → knowledge/api/deepseek/index.json（路径 / 标题 / 分组 / 抓取时间）
│   ├── R3-b 正文镜像：pages/*.md 逐页落地，保留原始 URL 与抓取时间
│   ├── R3-c 逐页指纹：每页 sha256；与 R5 指纹体系同源，不另立第二套算法
│   ├── R3-d 同步器：scripts/sync_api_docs.mjs（--check 只判 / --sync 真抓 / --diff 报变更页）
│   └── R3-e 知识库登记：knowledge/README.md 新增 api 分层 + 防冲突核验口径（不进 common/projects 既有层）
├── R4 峰谷时段常显实时 (PERIOD-LIVE)
│   ├── R4-a 读数唯一源：前端一律读探针输出，禁止在 plugin 内重算时段（现 usage-bar 已本地算 —— 需裁决归并）
│   ├── R4-b 常显面：时段徽标进全域常显席位（与 R1 同一席位体系，避免两套挂载）
│   ├── R4-c 实时性：刷新节拍与新鲜度阈值外置到 ai-control/config/gates.conf
│   ├── R4-d 口径入知识库：峰谷时段定义以 R3 知识库页面为权威出处，探针注释降为指针
│   └── R4-e 反向用例：探针不可用/节假日表未覆盖时，常显面必须显示"未知"而不是沿用旧值
├── R5 全域资产指纹 (FINGERPRINT)
│   ├── R5-a 机读产物：indexes/fingerprint_index.json（路径 / 短指纹 / 全长哈希 / 字节数 / mtime / 声明版本）
│   ├── R5-b 生成器：scripts/fingerprint_index.mjs（扫描口径与 fingerprint_audit.sh 对拍，不许两套算法）
│   ├── R5-c 查询入口：--query <路径> 一眼看"这个文件改没改"
│   ├── R5-d 台账降级：memory/asset_fingerprint_ledger.md 由生成器重写，人不再手改
│   └── R5-e 漂移判定：与上次快照比对，漂移清单非空即 exit 1（可 --allow 显式豁免）
└── R6 原子锁接入 (ATOMIC-WIRE)
    ├── R6-a 薄封装：scripts/lib/atomic_lock.mjs（Node）与 scripts/lib/atomic_lock.sh（Bash），共用同一锁根
    ├── R6-b 接入点清单：看板快照 / 进度台账 / 定价指纹 / 插件状态 / 索引重写 五处 choke point
    ├── R6-c 冲突可见：抢锁失败时**显式报错并给出持有者**，不静默等待到超时
    ├── R6-d 陈旧回收：TTL 回收必须留痕（是谁的残留锁被回收），不静默清理
    └── R6-e 并发自证：atomic_lock_audit.mjs 压测持锁段与无锁对照段，重叠数必须 持锁 0 / 无锁 >0
```

---

## 三、现状核查（先说事实，再说改什么）

### 3.1 已经存在、可直接复用（**不要再造一遍**）

| 已有资产 | 可直接复用在哪条需求 | 实测证据（本轮实跑） |
| :--- | :--- | :--- |
| `skill-pool/plugins/dsh-plugin-restart/` 双半插件 | R1 / R2 | `verify_restart_button.cjs` 实跑 **84/84 通过**（含反向变异：改坏口令后断言确实失败） |
| 已装配进 `~/.dsh/profiles/desktop` | R1 | `package.json` 的 `dsh.profile.bundles` 已含 `dsh-plugin-restart`（8 项），`file:` 依赖已登记 |
| `shell.leading` / `sidebar.footer.action` 全域席位 | R1 主落点 | `app.asar` 解析 `dsh-client-ui-sidebar` 实测：`sidebar.footer.action` = `kind:"list"` / `scope:"root"`，挂在侧栏底部 `footArea`，**不随路由切换卸载** |
| `scripts/deepseek_usage_probe.mjs` 峰谷时段判定 | R4 | `--check` 实跑 exit 0：`空闲时段 · 法定节假日全天空闲（国庆节） · 下次切换 2026-10-08T09:00:00+08:00` |
| `scripts/lib/pricing_fingerprint.mjs` 官方定价页指纹 | R3 / R5 | `--check` 实跑 `定价指纹 : 可用 5a7b183259238734…`；`~/.dsh/.dsh-control/pricing_fingerprint.json` 于 23:08 被真实刷新 |
| `scripts/fingerprint_audit.sh` 全域新鲜度审计 | R5 | 实跑：受管资产 **234 个文件**（新鲜 55 / 落后 12 / 未声明版本 167），退出码 0 |
| `skills/acquire-atomic-lock/scripts/atomic_lock.py` 物理原子锁 | R6 | 技能池已交付；历史压测记录：16 进程 × 20 轮临界区重叠 **0**，无锁对照重叠 318 |
| `scripts/global_scheduler_lock.sh` 全局调度锁 | R6 | 脚本在位（`mkdir` 原子创建 + TTL 自愈），`--acquire/--release/--status/--run/--clean` 齐备 |
| `indexes/shortcuts_index.md` 通道 + `channel_audit.mjs` | R1 / R4 入口 | 已登记「一键重启」通道；通道审计 36 条 · 问题 0 |

### 3.2 实测缺口（用户要"新增/修复"的，实质是这些）

| # | 缺口 | 现状证据（本轮实测，可复跑） |
| :-- | :--- | :--- |
| **G1** | 重启按钮**只挂会话页**，不是全域常显 | `restart-core.cjs` 的 `SLOT_NAME` 单值指向 `conversation.session.header.actions`；全库无 `sidebar.footer.action` 引用 |
| **G2** | 点击**不执行重启**的根因分层 | ① 宿主拦截层插件未通电（见 G3），同族症状；② `spawn` 产物是 shell 脚本，是否真退出应用**无证据链**；③ 全库**没有任何 PID 判定器**，"重启成功了没有"物理上无法判 |
| **G3** | 管控拦截层插件从未被宿主加载 | `bash scripts/install_host_gate.sh verify` 实跑：`条目存在: ⛔ 缺失` · `宿主激活: ⛔ 无宿主激活凭据`；`~/.dsh/profiles/desktop/cordis.patch.yml` 无 `ai-execution-control`；`plugin-status.txt` 仍是 `isHost=false` |
| **G4** | 官方 API 文档**零本地知识库** | 全库检索 `api-docs.deepseek.com` 仅 3 处命中，全在 `pricing_fingerprint.mjs` / `check-deepseek-usage` 技能里，**只监控定价页指纹，不落正文**；`knowledge/` 无 `api/` 层 |
| **G5** | 峰谷时段**未上全域常显面** | 时段当前只在 `dsh-plugin-usage-bar` 的**输入坞**（会话页内）；且该插件**在客户端本地重算时段**，与探针是两套实现（双实现漂移风险） |
| **G6** | 指纹只产出**报表**，无机读产物与查询入口 | `fingerprint_audit.sh` 输出人类可读文本 + 重写 Markdown；全库无 `fingerprint_index.json`，无法"一眼查某个文件改没改" |
| **G7** | 原子锁**有原语、无接入** | `grep` 全仓：`control_gates.sh` / `progress_ledger.mjs` / `fingerprint_audit.sh` / 定价指纹写入 **均无任何加锁调用**；`global_scheduler_lock.sh` 仅被文档和路由提示引用，**无一条自动化脚本调用它** |
| **G8** | 并发写同一文件**风险真实存在** | 同一状态目录 `~/.dsh/.dsh-control/` 被探针、看板、插件、看门狗多方写入（`pricing_fingerprint.json` / `status.json` / `plugin-status.txt` / `todos/`），无锁串行化 |
| **G9** | 受管口径不可见：167 个资产**未声明版本** | `fingerprint_audit.sh` 实跑：`未声明版本 (None): 167 个`，占受管资产 71.4%，"新不新鲜"对它们恒不可判 |

### 3.3 本轮新发现（非重复登记，登记前请勿当旧账）

| # | 新发现 | 影响 |
| :-- | :--- | :--- |
| **N1** | `shell.leading` 席位**只在 macOS 且侧栏折叠时挂载** | 它不能承担"所有页面常显"——`sidebar.footer.action` 才是全状态常显席位；若按 `shell.leading` 落点做，会得到"时有时无"的假常显 |
| **N2** | 官方文档站**没有** `/llms.txt` | 实测 `https://api-docs.deepseek.com/llms.txt` 返回的是英文首页 HTML（非索引文件）→ R3 的页清单必须**从侧边导航抓**，不能指望官方给机器可读清单 |
| **N3** | 官方中文目录结构已实测到手 | 五个主分区（快速开始 / API 指南 / API 文档 / 新闻 / 更新日志）+ 快速开始 8 页（含 `quick_start/pricing` 峰谷价口径页）+ Agent 接入 9 页，可据此建 `index.json` |
| **N4** | `install_host_gate.sh verify` 与 `control_gates.sh check` **结论互相打架** | 看板显示 `4/4 门禁通过 · 100%`，而拦截层实际 `isHost=false`。这是 REQ-087 已登记过的坑的**同族复现**：看板只证明"工程内文件对不对"，证明不了"机制在不在跑" |

---

## 四、必须成立的不变式（实施期间不得违反）

1. **不采信自我宣称**：任何一条 R1~R6 的完成，都必须给出退出码与可复跑命令；
   "我改了源码"不构成证据，"命令实跑 + 反向用例可判红"才算。
2. **不制造第二套同义实现**：时段只在探针里算、指纹只有一套算法、锁只有一个锁根；
   发现重复实现时先裁决归并，再继续。
3. **不静默失败**：抓不到 API 文档、取不到 PID、抢不到锁、指纹算不出——一律显式报错并保留上次状态，
   禁止用旧值/假值顶替。
4. **不依赖未通电载体**：R2 的判定器与 R1 的常显自证**不得**挂在拦截层插件上（当前 `isHost=false`），
   否则会重演"看板 100% 而机制不存在"。

---

## 五、待裁决分歧（实施前请逐条拍板，未裁决按括号内默认执行）

| 编号 | 分歧 | 选项 | 默认建议 |
| :--- | :--- | :--- | :--- |
| **D1** | R1 主席位选哪个 | ① `sidebar.footer.action`（全页面常显，但在侧栏底部）② `shell.leading`（靠窗控，但仅 macOS 折叠态） | ①（N1 实测） |
| **D2** | R2 是否允许"自动重启" | ① 保持二次确认 ② 一键直接重启 | ①（重启会中断会话，不可逆动作必须确认） |
| **D3** | R3 知识库镜像深度 | ① 全站镜像（含 9 页 Agent 接入）② 只镜像 API 相关页 | ②（Agent 接入页与 DSH 无关，避免知识库噪音） |
| **D4** | R3 同步方式 | ① 手动跑 `--sync` ② 接进常跑门禁自动抓 | ①（自动抓会把网络故障注入门禁，先手动） |
| **D5** | R4 时段实现归并方向 | ① 前端改读探针输出 ② 探针改为调用前端算法 | ①（探针已被审计且有节假日表） |
| **D6** | R5 指纹算法口径 | ① sha256 短 8 位 + 全长 ② 只存短指纹 | ①（短指纹便于人读，全长便于对拍） |
| **D7** | R6 锁粒度 | ① 文件级 ② 目录级（资源组） | ①（现锁原语为 `mkdir`，文件级最直接） |
| **D8** | 是否顺带修 G3（拦截层未通电） | ① 本轮一并 install ② 另立条目 | ②（改宿主 profile 需重启桌面端，会中断会话，须用户在场） |

---

## 六、验收标准（全部满足才算本条闭环）

- [ ] R1~R6 每条都有可跑判定命令且退出码能区分成败，**每条都带反向用例**；
- [ ] 递归分裂的 27 个叶子逐一按 §2.3 六条物理触达判据过检，未触达者**显式列为未完成**；
- [ ] R2 以"重启前后宿主 PID 变化"为唯一合格证据；做不到时按降级方案**显式标注未满足**；
- [ ] R3 页清单覆盖率 100%，每页可复算 sha256，抓取失败有显式报错路径；
- [ ] R4 常显读数与 `deepseek_usage_probe.mjs --json` 逐字相等，过期即标注；
- [ ] R5 覆盖受管资产 ≥234 且漂移判定可判红；
- [ ] R6 接入点 100% 命中，并发压测 持锁段重叠 0 且 **无锁对照段重叠 >0**；
- [ ] D1~D8 分歧经用户裁决后写入文案；
- [ ] 全量复跑 `control_gates.sh` · `gate_selftest.sh` · `mechanism_audit` · `process_supervisor` ·
      `progress_ledger` · `redundancy_scan` · `conflict_scan` · `legacy_align_scan` 全绿，且推送远程。

---

## 七、实施顺序建议（依赖驱动，非拍脑袋排序）

```text
第 0 步  R5 指纹机读产物      ← 没有它，后面每一步"改了哪些文件"都说不清
第 1 步  R6 原子锁接入        ← 先保证写操作不互相踩，再谈改内容
第 2 步  R2 重启真执行        ← 独立链路，可与 R3 并行
第 3 步  R1 按钮全域常显      ← 依赖 R2 的链路判定器复用
第 4 步  R3 API 知识库        ← 网络依赖，独立推进
第 5 步  R4 峰谷常显          ← 依赖 R3（口径出处）与 R1（席位体系）
```

**理由**：R5/R6 是"度量与底座"，先上；R6 未上就动写入路径，等于在无锁状态下改并发敏感文件。
R4 依赖 R3 提供权威口径，R1 依赖 R2 提供"点了真有用"的可信度。

---

## 八、历史演进与变更记录

- **2026-10-02 [实施 · 第三批 · 第二次事故]**：用户重启后反馈「两个按钮点了都没效果」，并附图
  （一个在侧栏底部、一个在会话头部 —— 说明**客户端半确实注入了两个席位**，载具通了）。
  取证与结论：
  - **宿主半已确认加载并注册成功**：`~/.dsh/.dsh-control/restart-plugin-boot.jsonl` 留下
    `{"pid":92725,"hasCommands":true,"stage":"registered","command":"/restart-dsh confirm"}`
    —— 上一批修的根因 A/B/C 确实生效，宿主是真的认这条命令了；
  - **真正的第二个静默点：命令通道失败时返回的是"正常结果对象"，不是异常。**
    实测官方语义（`dsh-client-ui-commands` 源码）：
    `{ ok:true, value:{result:{kind,text}} }`（成功）／`{ ok:false, error:{code,message} }`（被拒）
    ／`{ ok:true, value: undefined }`（命令名不认识）。
    旧客户端实现**只写了 `.catch`**，于是后两种"其实出事了"的返回值被当成成功，
    **一点提示都不给** —— 用户看到的就是"点了没反应"。这与上一批的"插件没加载"症状完全一样，
    但根因完全不同，靠自检永远区分不出来（旧断言的检查面根本没覆盖返回值形状）。
  - **修法**：客户端点击链路重写为**逐一识别这三种返回值**并给明确文案；
    同步抛错也接住（此前属性访问抛错会绕过 catch）；`alert` 本身包 try/catch 并降级到控制台
    （弹窗被禁止时不能让"报错"再抛一次错）；成功时也给回执，避免"成功"与"没反应"视觉上无法区分。
  - **新增判据**：`skill-pool/plugins/dsh-plugin-restart/verify_click_paths.cjs` ——
    六种结果逐一断言**必须有用户可见回执**，且**都不许把异常抛给宿主**（17/17 通过）。
    这是本次事故的正解判定器：它测的不是"逻辑对不对"，而是"出事时用户看不看得见"。
  - **仍未证明的一步**：真机 PID 比对（重启会中断会话，只能由人执行）。
    现在点击后**无论成败都会弹窗**：成功弹「已排定重启…」，失败弹具体原因 —— 不会再静默。

- **2026-10-02 [实施 · 第二批 · 事故根因修复]**：用户实测「重启后按钮依然无效」，逐层取证后
  定位到**两个互相叠加的独立故障**，二者都属于"仓库里代码是对的、但跑的根本不是这份代码"：

  | 编号 | 根因 | 物理证据 | 修法 |
  | :--- | :--- | :--- | :--- |
  | **A** | **宿主半是 CommonJS，而加载器用 `import()` 加载** —— 插件**从未被加载** | 应用内自带技能 `cordis-plugin-development/references/host-plugin.md` 原文要求 ESM 形态：`export function apply(ctx, config)` + 可选 `export const inject`；官方 `dsh-command-compact` 实测声明 `const inject = ["commands", "compaction"]`。我们两者都没有 → `ctx.commands` 为 undefined → `/restart-dsh` 从未注册 → 点按钮宿主不认识该命令 → **什么都不会发生** | `package.json` 补 `"type": "module"`；`lib/index.js` 改 `export`；显式 `export const inject = ['commands']`；注册走 `ctx.effect(function*(){ yield ctx.commands.register(...) })` |
  | **B** | **profile 里的插件文件是硬链接快照，重写源文件后链接断裂** —— 宿主读到的仍是旧版 | `stat` 实测：仓库 `lib/index.js` inode 108731772、profile 同一个文件 inode 108634302（内容一个是 ESM、一个是 CommonJS）；而 `package.json` 已被硬链接同步成 `"type": "module"` —— 组合成"加载必然报错"的最坏状态，且**完全静默** | 新建 `scripts/plugin_sync.sh`（`check`/`sync`/`list`/`install`）：逐文件 `cmp` 对齐 + 逐文件回读校验；把 `plugin_sync.sh check` 接进 `atomic_lock_audit --check` 作为**载具对齐硬判据** |
  | **C** | **`dsh-plugin-usage-bar` 与 `dsh-plugin-control-jump` 从未装配进 profile** | profile `package.json` 的 `dependencies` 与 `dsh.profile.bundles` 实测只有 image-zoom / dmarket / restart → R4 要求的"峰谷时段全域常显"**物理上没有载体** | `plugin_sync.sh install` 幂等补齐依赖 + bundles + 文件；已装配 4 个插件并复核 |
  | **D** | **shell 脚本里 `$var` 紧跟中文（全角括号）导致 bash 把中文并入变量名** | 实测：`atomic_lock.sh` 的两条残留锁告警路径全部崩溃（`key（…: unbound variable`）→ 锁库**在报错路径上自己出错**，把真实原因盖掉；`plugin_sync.sh` 同族 | 全仓 shell 扫描该模式并统一改为 `${var}`（1 文件 2 处；`plugin_sync.sh` 2 处） |

  **追加的可见性改造（让下一次失败不必再靠猜）**：
  - 客户端按钮失败时**弹出明确原因**（"宿主未提供 remote.commands.execute"＋排查提示），
    不再静默 —— 这次事故里"没反应"与"客户端异常"外观完全相同，是拖长排查的主因；
  - 宿主半每次 `apply` 追加一行到 `~/.dsh/.dsh-control/restart-plugin-boot.jsonl`
    （含 PID、`hasCommands`、`hasEffect`、阶段），"插件到底有没有被加载"从此有据可查；
  - 插件自检加 **4 条事故回归锁**：`type: module` / ESM 导出 / `inject['commands']` / 启动留痕，
    任一缺失即判红（旧断言在事故期间**全是绿的**，所以才被瞒过去）。

- **2026-10-01 [实施 · 第一批]**：用户下令「实施」后开工，落地 R1/R2/R4/R5/R6：
  - **R5 指纹索引**：新建 `scripts/fingerprint_index.mjs`（自检 14/14）+ `indexes/fingerprint_index.json`（234 条）。
    受管清单改由索引作为**唯一真相源**，`scripts/fingerprint_audit.sh` 改为消费它 ——
    实测两侧口径曾分叉（审计 239 vs 索引 235，差的是 4 个 macOS 秒级回填的 `.DS_Store`），现归零。
    自产物（索引自身、人读台账、API 正文镜像）**显式排除**，否则写完即漂移、指标永久失效。
  - **R6 原子锁**：新建 `scripts/lib/atomic_lock.mjs` + `scripts/lib/atomic_lock.sh`（同一锁根与同一锁键口径），
    接入 5 处写路径（进度台账 / 定价指纹 / 看板快照 / 指纹台账 / 插件状态留痕）。
    新建 `scripts/atomic_lock_audit.mjs`（自检 15/15 · 压测"持锁段丢失 0 / 无锁对照段丢失 60+"）。
    **实测揪出并修掉三个真缺陷**（每个都是"自检全绿但机制无效"型）：
    ① 锁键洗净口径两侧不一致（`state:a` 在 Node 侧是 `state_a`、Bash 侧是 `state:a`）→ 两把锁互不可见 = 没锁；
       已加"两侧锁目录对拍"进自检，防复发；
    ② `mkdir` 建锁 + 事后写元数据之间有竞态窗口，对手会把**活锁当残留删掉** → 改为原子创建 `metadata.json`；
    ③ "持有者进程已死就立刻回收"产生**假击穿** → 改为"确实超时 **且** 持有者已死"才回收，并加回归锁。
  - **R2 真重启判定**：新建 `scripts/lib/host_pid.mjs`（四路取数，实测命中 `lsof:Tcp:19387`）
    + `scripts/restart_verify.mjs`（`--record/--status/--compare`，自检 9/9）。
    已记录重启前基准 **PID 84747**；宿主半与客户端半已同步改造，插件自检 **96/96**。
  - **R1 全域常显**：重启按钮客户端半从单席位扩为**双席位**（`conversation.session.header.actions` +
    `sidebar.footer.action`）。席位清单的唯一真相源在内核 `SLOT_NAMES`，模板不再硬编码第二个名字。
    **未验证项（不得当作已完成）**：当前宿主进程（PID 84747）是在本次改动**之前**启动的，
    浏览器加载的仍是旧 bundle；"所有页面常显"必须由人在**页面刷新后**做 DOM 取证。
  - **R4 时段常显 + 口径归一**：客户端半同样扩为双席位，峰谷时段徽标上全域常显面（每秒刷新）。
    新建 `scripts/period_parity.mjs`（18 个基准点逐点对拍 + 自检 6/6）。
    **本轮由此揪出一处真实错价**：客户端节假日表与探针表**互相矛盾** ——
    客户端多了 `10-08`（实为工作日）、漏了中秋 `09-25`~`09-27`，
    即同一天界面显示"空闲价 5 折"而计费按高峰算。已按权威源（探针表）对齐并加对拍守死。
    `PERIOD_*` 阈值已外置到 `ai-control/config/gates.conf`。
- **2026-10-01 [新建]**：接收 6 条口语需求，完成字面勘误与递归分裂（R1~R6，共 27 个叶子）；
  完成现状核查（可复用 9 项 / 实测缺口 9 项 / 本轮新发现 4 项）；登记 8 项待裁决分歧。
  本轮**未改任何机制载体**，状态为 `[EVOLVING]` 待拍板。

---

> ### 📎 附：本轮取证命令清单（均可复跑，数字即上文引用）
>
> ```bash
> bash scripts/install_host_gate.sh verify              # 条目存在:⛔缺失 · 宿主激活:⛔无凭据
> node scripts/deepseek_usage_probe.mjs --check         # 空闲时段 · 法定节假日全天空闲（国庆节） · exit 0
> node skill-pool/plugins/dsh-plugin-restart/verify_restart_button.cjs   # 共 84 项 · 全部通过
> bash scripts/fingerprint_audit.sh                     # 受管 234（新鲜 55 / 落后 12 / 未声明 167）
> ./scripts/control_gates.sh check                      # 4/4 门禁通过 · 100%（与上一条 verify 结论冲突，见 N4）
> lsof -nP -iTCP:19387 -sTCP:LISTEN                     # 当前宿主 PID 84747（R2 判定基线取法）
> ```
