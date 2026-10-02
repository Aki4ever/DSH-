# 需求文案：会话消息来源合规与"整轮判失败"清零（SESSION-SOURCE-1）

> ### 🏷️ **版本信息与实施追踪**
> - **文档类型**：需求文案（登记为 `REQ-096`，状态 `[ACTIVE]`）
> - **当前系统实施总版本**：`v4.29.5`（PATCH 递增：缺陷修复 + 只读判定器接入，向下兼容）
> - **本文档内容版本**：`v1.0.0`
> - **需求版本号**：`v1.0.0`（初版文案即实施批留痕）
> - **提出时间**：2026-10-02
> - **任务代号**：`SESSION-SOURCE-1`
> - **需求状态**：`[ACTIVE]` 已实施并**运行时生效**（宿主自证 `pluginPath` 指向仓库文件；无需重启应用）
> - **依据**：用户口语需求 + 本轮取证（宿主 `app.asar` 内真实校验器实跑 · 本机真实落盘会话 ·
>   `session_source_audit.mjs` · `plugin_sync.sh`）

---

## 一、原始需求（用户口语原文）

> 以下是我对管控规则的优化需求,如果需求颗粒度过大导执行层(包括 skill、agent、plugin、插件、cli、mcp等)
> 导致没触达物理实现层,就递归分裂成更细更落地的执行层去完成这额个需求;
> 你是严谨信息助理。
> 规则：
> 1. 如图,系统性的修复这个问题;
>
> 理解以上需求并简化成更利于你执行的需求文案;

> 📌 **随文截图原文**：`处理失败` / `本轮运行失败  format v4 message requires a producer-owned source kind`
>
> 📌 **原文勘误（只做字面归一，不改语义）**："导执行层" = **到执行层**；"这额个需求" = **这个需求**。
>
> 📌 **口径**：用户授权按磁盘实况自行判定与分级；本文只写"改什么、判据是什么、怎么复跑"。

---

## 二、整理后的可执行需求

### 2.1 一句话定义

**把"插件自己产出的会话消息来源字段"从已退休写法改成宿主 v4 认可的生产者自有写法，
并让"谁在产出这种字段"从"没人看着"变成"有静态普查 + 有宿主级实跑对拍"的常驻判据。**

### 2.2 拆分铁律

1. **判据必须来自宿主真实实现**，不许本仓复述规则充当判据（复述得再准也只是"我们以为"）；
2. **要能判红**：每条判据必须有反向用例（旧写法必须被抓到/被拒收），不能判红的判据不算判据；
3. **只改一处权威源**：来源字段由唯一函数产出，禁止各写各的字面量；
4. **旁路增强不得杀死主流程**：看板卡片是增强项，它的任何不合格都必须降级为"不注入"，绝不判整轮失败；
5. **不可判定就说不确定**：取不到宿主校验器时退出码 2，不折算为通过。

### 2.3 判据（判定器：`scripts/session_source_audit.mjs`）

| 判据 | 内容 | 判定方式 | 反例 |
| :--- | :--- | :--- | :--- |
| 判据一 · 静态普查 | 本仓代码 + 运行中 profile 已装插件里，不得存在手写的 `kind: 'plugin'` | 逐行扫描（注释行与显式豁免标记除外） | `--selftest` 造一个含字面量的临时文件，必须命中 |
| 判据二 · 宿主实跑对拍 | 旧写法必须被**宿主自己的**校验器拒收（且报错文案一致）；新写法必须被接纳 | 从 `app.asar` 抽出 `@deepseek-ai/dsh-session-format-v3-to-v4` 依赖闭包，真跑 `assertV4RowAdmission` | 反例必抛、正例必过，二者缺一即判红 |

退出码：`0` 全绿 · `1` 存在生产点/对拍失败 · `2` 不可判定（取不到宿主校验器）。

---

## 三、根因取证（全部可复跑）

| 环节 | 事实 | 复跑方式 |
| :--- | :--- | :--- |
| 判据在宿主 | `@deepseek-ai/dsh-session-format-v3-to-v4` 的 `source()`：kind 必须非空且**不得为 `plugin`**；行级入口 `assertV4SourceRowAdmission` 覆盖 `user/message`、`system/message`、`assistant/message`、`tool/result`、`agent/inbox/spliced`(`data.inserted`)、`session/title-llm-request`(`data.messages`) | 读 `app.asar` 内该包 |
| 正解形态 | 官方迁移器 `producerKind()` 对未知插件生产者的规范映射 = `plugin:<插件名>`；本机真实落盘 v4 会话存在 `kind=plugin:hindsight`，而全机 0 条 `kind:"plugin"` | 解压 `~/.dsh/sessions/*/*/session.v4.jsonl.zstd` 统计 |
| 生产点 | `ai-control/plugin/index.mjs` 手写 `{ kind: 'plugin', plugin: name, … }`（看板卡片），是**唯一**生产点 | `session_source_audit.mjs --check` |
| 事故机理 | 卡片消息进入 `agent/inbox/spliced` → 行级接纳拒收 → **整个回合**判失败（旁路增强杀死主流程） | `--probe` 反例复现同一句报错 |
| 载体风险 | profile 内同名插件是**独立副本**（非软链），内容会落后于仓库；本次实测该副本仍停在旧代码 | `bash scripts/plugin_sync.sh check` |

---

## 四、递归分裂到执行层（物理载体清单）

| 层 | 载体 | 落点 |
| :--- | :--- | :--- |
| 唯一权威源 | `scripts/lib/session_source.mjs` | `producerOwnedSource()` / `auditSource()` / 判据常量 |
| 生产者 | `ai-control/plugin/index.mjs` | 卡片 `source` 改由权威源产出；注入前先过"本仓纯函数 + 宿主校验器"两段自检，不合格则不注入 |
| 判定器 | `scripts/session_source_audit.mjs` | `--check`（判据一+二）· `--fast` · `--json` · `--selftest` |
| 门禁 | `scripts/control_gates.sh`（G5 列表） | 未过则 G5 判红，参与放行 |
| 逃生舱白名单 | `ai-control/plugin/index.mjs` | 判定器只读，门禁红时最需要它上场 |
| 登记 | `docs/requirements.md`（本条）· `ai-control/requirements/req_versions.json` | 需求 ↔ 台账 ↔ 载体 ↔ 回执对拍 |
| 运行载体 | `~/.dsh/profiles/desktop/node_modules/dsh-plugin-execution-control/` | `plugin_sync.sh sync` 对齐并逐字节回读 |

---

## 五、验收标准

- [x] `node scripts/session_source_audit.mjs --check` 退出码 0（判据一 0 命中 · 判据二 3/3）；
- [x] `node scripts/session_source_audit.mjs --selftest` 退出码 0（7 条反向/正向用例全过）；
- [x] 仓库与运行载体两侧 `md5` 一致（`plugin_sync.sh check` 判"逐字节一致"）；
- [x] `node scripts/control_gates.sh check` G5 含本判据且不因本判据判红；
- [x] `node --check` 三个改动文件语法通过；
- [x] **宿主进程内生效**（2026-10-02 07:46 取证）：`plugin-status.txt` 自报 `pluginPath=…/ai-control/plugin/index.mjs` ·
  `pluginSize=48888B`（= 仓库文件字符数）· `isHost=true` · `pid=77744`；宿主内留痕 `card-status.txt` 记
  「通过：宿主 v4 行级接纳判定合格」；**无需重启应用**（patch 层可热重载）。

---

## 六、诚实缺口

1. **宿主热重载已实测，且推翻了一个旧结论**：改插件**不必重启桌面端**——`install_host_gate.sh install`
  写入 profile 的层栈插入行后，同一宿主进程在 1 秒内重新 `apply` 成功。另由此拿到此前只能推断的事实：
  宿主加载的是**仓库**那份 `index.mjs`（`pluginPath` 自证），`profile/node_modules` 下的同名副本是遗留副本、不参与加载
  （本轮已顺带做成可加载，消除"改 A 跑 B"的静默风险）。
2. **判据二依赖本机 App 路径**：用 `DSH_APP_ASAR` 可覆盖；取不到即退出码 2，不冒充通过。
3. **第三方插件口径**：运行中 profile 里的 `dsh-better-sidebar` 注释中描述了该退休语法（已按注释行排除，非生产点）；
   其是否存在真实生产点未逐行人工复核，判定以判据一为准。
