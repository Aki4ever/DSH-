# ai-control 目录说明（管控机制实现目录）

## 📌 目录定位
- 路径: `ai-control/`
- 主要作用: 承载管控机制判定层与拦截层，强制四项必备工序按序完成，进度常显；状态由磁盘实况推导，不采信自述。
- 名称口径: 正式名称"管控机制"（注入层/状态层/判定层/拦截层），出处见 `indexes/rules_index.md`；旧称一律废止。

---

## 📂 结构

```text
ai-control/
├── config/   gates.conf 唯一手改入口 · flow_graph.json 流程管控层权威源
├── plugin/   index.mjs 拦截层 · loader.mjs 安全加载 · selftest.mjs 自检 33 项
├── reports/  latest_status.md 快照 · redundancy.json 结果
└── requirements/  README.md 需求归档 · control_requirements_ledger.md 台账 CR-xxx
```

运行时状态在 `$DSH_HOME/.dsh-control/`：`status.json`、`cache.env`（30 秒秒回）、`physical_locks/`（状态机，阻断越序）。

---

## 🚦 累积门禁 G1~G7

- G1 项目初始化：仓库、骨架、防丢文件齐备
- G2 工程结构化：目录有主、无孤儿、无垃圾
- G3 需求文档同步：台账与 Git 工作树对齐
- G4 冗余检测：重复率健康
- G5 落地与版本一致性：全域覆盖 + 版本贯通 + 无悬空引用（REQ-092）
- G6 执行层并发与载体一致性：树可溯源 + 调度有牙 + 队列有界 + 载体齐备 + 篇幅受管（REQ-093）
- G7 纪律分：纪律账本哈希链自洽 + 当前分在停用阈值之上（REQ-098）

门禁累积：G0→G1→…→G7 全过 `execAllowed` 才为真（G0 会话命名为一票否决，不占 G 编号）；指标口径见 [`../indexes/rules_index.md`](../indexes/rules_index.md)。

---

## 🔍 判定层（双检与存量校准）

- `scripts/redundancy_scan.mjs`：写两遍 → 合权威源
- `scripts/conflict_scan.mjs`：同事实两说法 → 先裁
- `scripts/legacy_align_scan.mjs`：存量未跟新规
- `scripts/channel_audit.mjs`：死链/说法命中/触发词冲突
- `scripts/check_freshness.mjs`：探活/新鲜度
- `scripts/sync_control_requirements.mjs`：管控需求 ↔ 台账
- `scripts/progress_ledger.mjs`：台账（REQ-087）sha256 + 命令 + 退出码 + 回读 → 漂移 0、漏记 0
- `scripts/lib/session_transcript.mjs`：宿主转录 `todo/write`（REQ-087）
- `scripts/flow_control.mjs`：拓扑分层 + 五不变式（REQ-087）
- `scripts/process_supervisor.mjs`：独立重跑判定，不采信自述
- `scripts/output_audit.mjs`：输出体量（REQ-089）正文与五联装 → 2 不算通过；报告 `~/.dsh/.dsh-control/compact/<sid>.json`
- `scripts/check_layer_interfaces.mjs`：接口契约（REQ-089）`<unit>/interface.json` 对拍 `scripts/interfaces/*.interface.json`，两率分报
- `scripts/route_plan.mjs`：路由判定与规划（REQ-089）源真实被读 · 死通道 0 · 反向用例不回显
- `scripts/language_audit.mjs`：文字可读性（REQ-090）GB2312 外生僻字 → 2 不算通过；基准 `data/common_chars.txt`
- `scripts/gen_common_chars.mjs`：字表 GB2312-1980 推导 6763 字（REQ-090）
- `scripts/lib/gates_config.mjs`：阈值读取（REQ-090）`gates.conf` → 对象，缺失即回落

硬要求：检测器不可用一律判"未通过"，**不得以"检测失效"充当通过**；CLI 接口覆盖率 100%。

流程管控层权威源：[ai-control/config/flow_graph.json](config/flow_graph.json)（步骤、依赖边、不变式、顺序唯一出处）；规则层 [rules/workflow/task_execution_flow.md](../rules/workflow/task_execution_flow.md) 只放指针。

---

## 🛠️ 常用命令

```bash
./scripts/control_gates.sh check|card|badge|json   # 看板/缓存/徽标/status.json
./scripts/control_gates.sh advance <id>            # 真实通过才推进
./scripts/control_gates.sh reset                   # 清缓存重算
node scripts/redundancy_scan.mjs --root .          # 冗余扫描（--self-test）
node scripts/conflict_scan.mjs --root .            # 冲突扫描（--self-test 22）
node scripts/legacy_align_scan.mjs --root .        # 存量校准（--self-test 22）
node scripts/channel_audit.mjs --root .            # 通道审计（--self-test 23）
node ai-control/plugin/selftest.mjs                # 插件自检 33 项
./scripts/physical_lock.sh status|sync             # 物理锁状态/同步
node scripts/output_audit.mjs --check              # 输出结构契约（--self-test 16）
node scripts/language_audit.mjs --check            # 生僻字；--root . 全库；--self-test 11
node scripts/gen_common_chars.mjs --check          # 常用字表漂移校验
node scripts/test_physical_lock.mjs                # 物理锁自检 19 项
```

---

## 🔧 调参与开关

| 想改什么 | 改哪里 |
| :--- | :--- |
| 阈值、扫描范围、排除表 | `ai-control/config/gates.conf`（即时生效） |
| 临时关闭硬门禁（全局/单次） | 环境变量 `DSH_CONTROL_GUARD=off`/`DSH_CONTROL_BYPASS=all` |
| 彻底停用插件 | 注释 `$DSH_HOME/profiles/<当前 profile>/cordis.patch.yml` 的 `ai-execution-control` 行并重启（profile 用 `./scripts/install_host_gate.sh verify` 查） |

---

## 📋 设计约束（改动时务必遵守）

1. 绝不因自身故障阻断用户：读不到状态、解析失败、异常抛出一律降级放行。
2. 逃生舱必须常开：触及 `control_gates`/`ai-control` 一律放行。
3. 只读工具永不被拦：`read`/`grep`/`glob` 与 `todo_write` 一律可用。
4. 状态不可证实即失败关闭：缓存过期即拒改动型调用，须重校验，不得静默放行。
5. 禁止凭语法通过上线：判定逻辑改动后必须重跑 `selftest.mjs` 与 `--self-test`。

---

## 🧭 已知边界

- 作用域仅限本工程：门禁只针对本规则库；其他项目按各自惯例。
- 插件改动需重启：改 `plugin/index.mjs` 后重启桌面端生效；`gates.conf` 与脚本即时生效。
- `!!js` 不被 overlay 支持：`cordis.patch.yml` 插件路径须为字面量相对路径。
- 冗余检测有阈值盲区：阈值 0.85 只针对"实质性整段复制"，改写不算。

---

## 🛠️ 维护原则
- 遵循 `rules/system/meta_rules.md` 最高准则；
- 阈值调整必须同步登记 `docs/requirements.md`；
- 保持文档全中文、通俗直白、无生僻字。
