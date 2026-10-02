# 需求文案：宿主注册双通道接线与"可证实性自锁"清零（HOST-WIRE-1）

> ### 🏷️ **版本信息与实施追踪**
> - **文档类型**：需求文案（登记为 `REQ-095`，状态 `[ACTIVE]`）
> - **当前系统实施总版本**：`v4.29.8`（PATCH 递增：接线与缺陷修复，无架构级重构）
> - **本文档内容版本**：`v1.0.0`
> - **需求版本号**：`v1.0.0`（初版文案即实施批留痕）
> - **提出时间**：2026-10-02
> - **任务代号**：`HOST-WIRE-1`
> - **需求状态**：`[ACTIVE]` 已实施（4 项断点全部落到物理载体；运行时生效仍需重启桌面端）
> - **依据**：用户口语需求 + 本轮只读/实跑取证（`mechanism_audit.mjs` · `todo_panel_audit.mjs` ·
>   `install_host_gate.sh verify` · `ai-control/plugin/selftest.mjs` · profile 磁盘实况）

---

## 一、原始需求（用户口语原文）

> 以下是我对管控规则的优化需求,如果需求颗粒度过大导执行层(包括 skill、agent、plugin、插件、cli、mcp等)
> 导致没触达物理实现层,就递归分裂成更细更落地的执行层去完成这额个需求;
> 你是严谨信息助理。
> 规则：
> 1. 回答优先简短，禁止无意义拉长推理链条，不要为了完整推理强行编造事实。
> 2. 只能使用用户提供的参考资料，资料不存在的信息，直接说明没有相关资料，绝不杜撰数据、文献、案例、出处。
> 3. 推理过程中一旦发现缺少关键信息，立刻停止推导，不要继续向下推演。
> 4. 严禁虚构论文、法条、网址、书名、人名、实验结果。
> 5. 区分事实和推测，所有推测内容必须明确标注，不可当做事实陈述。
> 6. 不要生成看起来逻辑通顺但无依据的内容。
>
> 理解以上需求并简化成更利于你执行的需求文案;

> 📌 **原文勘误（只做字面归一，不改语义）**："导执行层" = **到执行层**；"这额个需求" = **这个需求**。
>
> 📌 **边界口径（用户二次确认）**：本需求所指"管控规则"= 本仓库 `rules/` 与 `ai-control/` 下的
> 管控机制；用户授权"由你来判断就好"，即判定与修复口径由执行方按磁盘实况裁定。

---

## 二、整理后的可执行需求

### 2.1 一句话定义

把管控机制里"判据认、但没有任何动作去写"的物理载体补齐，并清掉"依据不可证实 → 连修依据的命令也被拦"的自锁。

### 2.2 拆分铁律

任一叶子在物理层跑不通或断言不过，就继续分裂到更细载体，**不得登记为完成**；能拆到"一行配置/一条命令"时，
必须真的落到那一行，而不是停在"文档已写明"。

### 2.3 验收三问

1. **有载体**：文件在位、可执行、可解析；
2. **通电**：实跑有退出码与留痕（本机真实跑出的数字），不采信自述；
3. **无悬空**：引用与通道全可达，缺失项必须显式报"缺"而不是静默通过。

### 2.4 事实与推测分离要求

判据必须区分"事实"（实跑输出 / 磁盘文件）与"推测"（推断的根因）；推测一律显式标注，
不得作为验收依据。

---

## 三、物理层实测断点（本轮实跑，非引用旧档）

| 编号 | 断点（事实） | 复跑证据 |
| :--- | :--- | :--- |
| **G1** | 宿主注册动作只写一条通道 | `scripts/install_host_gate.sh` 旧 `install` 仅向 `cordis.patch.yml` 追加条目；而同一脚本的 `has_entry_bundles()` 与 `verify` 早已认可 `dependencies + dsh.profile.bundles` 通道 —— **判据有、写入动作无** |
| **G2** | profile bundle 通道未登记 | `~/.dsh/profiles/desktop/package.json` 的 `dependencies` 有 `dsh-plugin-execution-control`，`dsh.profile.bundles` 只有 4 个 `@deepseek-ai/*`；`todo_panel_audit --check` 判"⛔ profile dsh.profile.bundles 未登记" |
| **G3** | 状态读取失败即抹掉上一份好状态 | `ai-control/plugin/index.mjs` 旧 `readStatus`：任一读/解析失败都执行 `cached = { at: 0, data: null }`。本会话实测踩到：同批命令中 `control_gates.sh check` 成功，紧随其后的普通 `bash` 被拒（"门禁状态不可证实"），只能设 `DSH_CONTROL_BYPASS=all` 手动解围 |
| **G4** | 冷启动自举超时过短 | 旧 `bootstrapStatus` 超时 `8000ms`；本机实测同一命令（`DSH_CONTROL_HOME=<t> DSH_CONTROL_TTL=0 bash scripts/control_gates.sh check`）耗时 **9.9s**（`time` 实测），自举被 kill → 冷启动判"无依据"。`ai-control/plugin/selftest.mjs` 用例"冷启动 · 自举成功产出状态"实测失败 |

> **留痕（未处置）**：`skill-pool/plugins/dsh-plugin-control-jump` 仍是"源码在位、注册未注册"，
> `verify` 报"无物理载体"。本轮不动它（属另一条需求线），在此显式记录，避免被当成已解决。

---

## 四、递归分裂结果（需求 → 执行层 → 物理实现）

| 层级 | 内容 |
| :--- | :--- |
| 需求层 | 管控机制必须触达物理实现层，缺失即继续分裂 |
| 执行层 ① | `cli`：`scripts/install_host_gate.sh`（层栈补丁通道） |
| 执行层 ② | `plugin` + profile 清单：`ai-control/plugin/package.json` 声明 `dsh.bundle.patch` |
| 执行层 ③ | `plugin` 拦截层自身：`ai-control/plugin/index.mjs`（状态读取 / 自举 / 逃生舱） |
| **物理实现层（本次真正落点）** | profile `package.json` 的 `dsh.profile.bundles` 数组 + 脚本内的写入/回滚动作 + `readStatus` 失败计数与超时值 |

---

## 五、本轮修法（四项）

1. **双通道接线**：`install` 在保留层栈补丁写入的同时，向 profile `package.json` 的
   `dependencies` 与 `dsh.profile.bundles` 补登记（逐项幂等 + 时间戳备份 + 写后读回校验），
   `uninstall` 支持两通道回滚；
2. **逃生舱补位**：把 `install_host_gate.sh` / `progress_ledger.mjs` / `output_audit.mjs` / `todo_gate.sh`
   加入拦截层逃生舱白名单 —— 这四条正是"门禁没过时最需要它们"的修复与自证入口，否则形成
   "要求自证却禁止自证"的死锁；
3. **状态读取容错**：`readStatus` 失败时保留上一份好状态（走"陈旧放行 + 后台刷新"），
   仅连续失败达 3 次才判"无依据"，把"瞬时可证实性问题"与"依据真的不存在"分开；
4. **自举超时放宽**：`bootstrapStatus` 超时 8000ms → 30000ms（后台异步执行，不阻塞宿主对话）。

---

## 六、关联文件与影响范围

- **改动**：`scripts/install_host_gate.sh`（双通道写入/回滚）· `ai-control/plugin/index.mjs`（逃生舱 + 状态读取 + 自举超时）
- **登记**：`docs/requirements.md`（REQ-095 条目）· `ai-control/requirements/req_versions.json`（机读台账）
- **接口契约**：`scripts/interfaces/install_host_gate.interface.json`（原为 `(待补)` 占位）
- **索引与路由**：`indexes/capabilities_index.md` / `.json`、`indexes/execution-layers.json`（执行层同步）
- **宿主侧（不在仓库内）**：`~/.dsh/profiles/desktop/package.json`（bundle 登记实际落点）
- **边界外（本轮不动）**：宿主 `app.asar`（已签名，改动需重装/重启桌面端）；
  `skill-pool/plugins/dsh-plugin-control-jump` 的注册（另一条需求线）

---

## 七、验收标准

- [x] `bash scripts/install_host_gate.sh install` 退出码 0，且输出两通道逐项结果与写后读回校验；
- [x] profile `package.json` 的 `dependencies` + `dsh.profile.bundles` 双登记成立（磁盘读回为证）；
- [x] `bash scripts/install_host_gate.sh verify` 退出码 0，通道显示"层栈补丁 + bundles 双通道"；
- [x] `node scripts/todo_panel_audit.mjs --check` 退出码 0，不再报 bundles 未登记；
- [x] `node ai-control/plugin/selftest.mjs` 通过 69/69（含"冷启动 · 自举成功产出状态"）；
- [x] `node --check ai-control/plugin/index.mjs` 与 `bash -n scripts/install_host_gate.sh` 双语法通过；
- [x] `node scripts/mechanism_audit.mjs` 硬性未触达 0 条（S07 项按"至少 1 项 in_progress"实况判定）；
- [ ] **运行时生效**：重启 DSH 桌面端后由宿主加载 bundles 通道（未做，属人工/宿主侧动作，不得谎称已完成）。

---

## 八、实施记录

- **2026-10-02 [实施 · 单批]**：接收用户需求（简化 + 授权判定），读盘取证定位 4 项断点（G1~G4），
  递归分裂到物理实现层并逐项落地：`install` 双通道化（含幂等、备份、写后读回、`uninstall` 回滚）、
  逃生舱白名单补 4 条、`readStatus` 容错、自举超时放宽。
  **实测复跑**：`install` exit 0（dependencies 幂等 / bundles 补登记 / 写后读回通过）；
  `verify` exit 0（双通道）；`todo_panel_audit --check` exit 0；`mechanism_audit` 硬性未触达 0；
  `selftest` 69/69；`bash -n` 与 `node --check` 双绿。
  **一处诚实缺口**：运行时是否真的加载，必须重启桌面端后才能由 `verify` 的 `isHost` 证据回答；
  本轮**不宣称已生效**。
- **未验证项**：`~/.dsh/profiles/desktop/cordis.patch.yml` 在被宿主整文件重写（本轮实测 07:18:32、07:24:03 两次），
  本仓只保证"双通道都登记过、且 bundles 通道重写不掉"；宿主为何重写该文件**属推测范围**，未取证确认。
