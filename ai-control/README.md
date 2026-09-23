# ai-control 目录说明（管控机制实现目录）

## 📌 目录定位
- **路径**: `ai-control/`
- **主要作用**: 承载**管控机制**的判定层与拦截层——强制四项基础必要性工序按序完成，并把执行进度**常显可视化、可量化**。核心设计原则是：**状态由磁盘实况推导，绝不采信模型自我宣称**。
- **名称口径**: 本机制的正式名称是"管控机制"（四层：注入层 / 状态层 / 判定层 / 拦截层），唯一权威出处见 `indexes/rules_index.md` 第〇章。旧称"AI 执行流程管控系统""门禁内核""硬门禁插件"一律废止。

---

## 📂 结构

```text
ai-control/
├── config/
│   └── gates.conf          门禁阈值配置（唯一需要手改的调参入口）
├── plugin/
│   ├── index.mjs           拦截层：常显看板 + 工具调用否决
│   ├── loader.mjs          故障安全加载器（加载失败降级为空插件）
│   └── selftest.mjs        插件自检（33 项，禁止凭语法通过上线）
├── reports/
│   ├── latest_status.md    最近一次管控快照（人类可读）
│   └── redundancy.json     最近一次冗余检测结果
└── requirements/
    ├── README.md           管控机制专项需求同步归档仓
    └── control_requirements_ledger.md 管控专属需求台账 (CR-xxx)
```

运行时状态落在 `$DSH_HOME/.dsh-control/`：
- `status.json` — 门禁状态（供插件消费，实现常显看板与硬门禁）
- `cache.env` — 看板缓存标记（30 秒内秒回，不重复扫描）

---

## 🚦 四项门禁

| 门禁 | 含义 | 量化指标 |
| :--- | :--- | :--- |
| **G1 项目初始化** | 仓库、骨架、防丢文件齐备 | 骨架齐备率 / 防丢覆盖率 |
| **G2 工程结构化** | 目录有主、无孤儿、无垃圾 | 合规项 / 孤儿目录数 |
| **G3 需求文档同步** | 台账与 Git 工作树对齐 | 需求条目数 / 未提交变更数 |
| **G4 冗余检测** | 实质重复率健康 | 高相似块对 / 重复标题数 |

门禁是**累积**的：G1→G2→G3→G4 全部通过，`execAllowed` 才为真。

---

## 🔍 双检与存量校准（判定层）

门禁回答"能不能动手"，双检回答"改得对不对、旧账还清了没有"：

| 检测器 | 判定什么 | 处置方式 |
| :--- | :--- | :--- |
| `scripts/redundancy_scan.mjs` | 同一内容写了两遍（真复制粘贴） | 冗余 → 合并为迭代版本，保留单一权威源 |
| `scripts/conflict_scan.mjs` | 同一事实说了两样（版本/计数/指标/标识/死链五类） | 冲突 → 先出裁决方案，由用户确认后再迭代 |
| `scripts/legacy_align_scan.mjs` | 存量资产是否跟上新规范（命名/入口/版本/指纹/台账五类）；**脚本漏登记也能自动检出** | 待对齐清单必须清零或书面说明原因 |
| `scripts/channel_audit.mjs` | 快速通道表是否可用（死通道/说法能否命中/触发词冲突） | 通道表必须无死链；退役通道必须删行 |
| `scripts/check_freshness.mjs` | 全量存量与新增能力健康探活与时效新鲜度检测 | 确保所有能力 100% 最新可用 |
| `scripts/sync_control_requirements.mjs` | 管控专属需求与全局需求台账双向同步校验 | 双向台账与版本必须完全一致 |

**硬要求**：检测器不可用时一律判"未通过"，**不允许以"检测失效"充当通过**。

---

## 🛠️ 常用命令

```bash
./scripts/control_gates.sh check     # 计算并输出量化看板（写 status.json）
./scripts/control_gates.sh card      # 仅输出看板（自缓存，秒回）
./scripts/control_gates.sh badge     # 一行式进度徽标
./scripts/control_gates.sh json      # 输出 status.json
./scripts/control_gates.sh advance <id>   # 仅在真实通过时允许记账推进
./scripts/control_gates.sh reset     # 清空缓存，强制重算

node scripts/redundancy_scan.mjs --root .        # 冗余扫描（重复内容）
node scripts/redundancy_scan.mjs --self-test     # 冗余检测器自检
node scripts/conflict_scan.mjs --root .          # 冲突扫描（同一事实两种说法）
node scripts/conflict_scan.mjs --self-test       # 冲突检测器自检（22 项）
node scripts/legacy_align_scan.mjs --root .      # 存量校准（遇碰即对齐清单，含脚本漏登记）
node scripts/legacy_align_scan.mjs --self-test   # 存量校准自检（22 项）
node scripts/channel_audit.mjs --root .          # 通道审计（死通道/说法命中/触发词冲突）
node scripts/channel_audit.mjs --self-test       # 通道审计自检（23 项）
node ai-control/plugin/selftest.mjs              # 拦截层插件自检（33 项）
```

---

## 🔧 调参与开关

| 想改什么 | 改哪里 |
| :--- | :--- |
| 门禁阈值、扫描范围、排除表 | `ai-control/config/gates.conf`（改完即时生效） |
| 临时关闭硬门禁（全局） | 环境变量 `DSH_CONTROL_GUARD=off` |
| 临时关闭硬门禁（单次） | 环境变量 `DSH_CONTROL_BYPASS=all` |
| 彻底停用插件 | 注释 `$DSH_HOME/profiles/web/cordis.patch.yml` 中的 `ai-execution-control` 行并重启 |

---

## 📋 设计约束（改动时务必遵守）

1. **绝不因自身故障阻断用户**：读不到状态、解析失败、异常抛出，一律降级为放行，绝不让插件缺陷把会话锁死。
2. **逃生舱必须常开**：参数触及 `control_gates` / `ai-control` 等管控路径时始终放行，避免"修门禁须先过门禁"的死锁。
3. **只读工具永不被拦**：`read` / `grep` / `glob` 与 `todo_write` 始终可用，否则模型失去自救与展示进度的能力。
4. **状态不可证实即失败关闭**：缓存过期时拒绝改动型调用，要求重新校验，而非静默放行。
5. **禁止凭语法通过上线**：任何判定逻辑改动后，必须重跑 `selftest.mjs` 与 `--self-test`。

---

## 🧭 已知边界

- **作用域仅限本工程**：门禁针对本规则库；其他项目目录按各自工程惯例执行。
- **插件改动需重启**：修改 `plugin/index.mjs` 后需重启桌面端才生效；`gates.conf` 与脚本改动即时生效。
- **`!!js` 不被 overlay 支持**：`cordis.patch.yml` 中插件路径必须是字面量相对路径，不能写表达式。
- **冗余检测有阈值盲区**：相似度阈值 0.85 为经验值，针对"实质性整段复制"；改写式抄袭（同义替换）不在检测范围。

---

## 🛠️ 维护原则
- 遵循 `rules/system/meta_rules.md` 最高准则；
- 阈值调整必须同步登记 `docs/requirements.md`；
- 保持文档全中文、通俗直白、无生僻字。
