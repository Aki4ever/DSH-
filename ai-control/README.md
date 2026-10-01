# ai-control 目录说明（管控机制实现目录）

## 📌 目录定位
- **路径**: `ai-control/`
- **主要作用**: 承载**管控机制**的判定层与拦截层，强制四项基础必要性工序按序完成，并把执行进度常显可视化、可量化。**状态由磁盘实况推导，绝不采信模型自我宣称**。
- **名称口径**: 正式名称"管控机制"（四层：注入层 / 状态层 / 判定层 / 拦截层），唯一权威出处见 `indexes/rules_index.md` 第〇章；旧称一律废止。

---

## 📂 结构

```text
ai-control/
├── config/    gates.conf（门禁阈值唯一手改入口）/ flow_graph.json（流程管控层权威源）
├── plugin/    index.mjs 拦截层 · loader.mjs 故障安全加载器 · selftest.mjs 自检 33 项
├── reports/   latest_status.md 最近快照 · redundancy.json 最近冗余结果
└── requirements/  README.md 专项需求归档 · control_requirements_ledger.md 台账 (CR-xxx)
```

运行时状态落在 `$DSH_HOME/.dsh-control/`：`status.json`（门禁状态，供插件消费实现常显看板与硬门禁）、
`cache.env`（看板缓存标记，30 秒内秒回）、`physical_locks/`（底层物理锁会话状态机，阻断越序调用）。

---

## 🚦 四项门禁

| 门禁 | 含义 |
| :--- | :--- |
| **G1 项目初始化** | 仓库、骨架、防丢文件齐备 |
| **G2 工程结构化** | 目录有主、无孤儿、无垃圾 |
| **G3 需求文档同步** | 台账与 Git 工作树对齐 |
| **G4 冗余检测** | 实质重复率健康 |

门禁**累积**：G1→G2→G3→G4 全过 `execAllowed` 才为真。
含义之外的量化指标与门禁口径，权威源为 [`../indexes/rules_index.md`](../indexes/rules_index.md)。

---

## 🔍 判定层（双检与存量校准）

门禁回答"能不能动手"，双检回答"改得对不对、旧账还清没有"：

| 检测器 | 判定什么 → 处置 |
| :--- | :--- |
| `scripts/redundancy_scan.mjs` | 同一内容写了两遍 → 合并为迭代版本，单一权威源 |
| `scripts/conflict_scan.mjs` | 同一事实两样说法（版本/计数/指标/标识/死链五类）→ 先出裁决方案再迭代 |
| `scripts/legacy_align_scan.mjs` | 存量是否跟上新规范（命名/入口/版本/指纹/台账五类），脚本漏登记也能检出 → 待对齐清单清零或书面说明 |
| `scripts/channel_audit.mjs` | 通道表死链 / 说法命中 / 触发词冲突 → 无死链，退役通道删行 |
| `scripts/check_freshness.mjs` | 存量与新增能力健康探活与时效新鲜度 |
| `scripts/sync_control_requirements.mjs` | 管控需求与全局台账双向同步 → 双向台账与版本必须一致 |
| `scripts/progress_ledger.mjs` | 迭代检测台账（REQ-087 R2）：每条改动记「文件 sha256 + 判定命令 + 实跑退出码 + 回读断言」→ 漂移 0 且未记录改动 0 |
| `scripts/lib/session_transcript.mjs` | 宿主会话转录读取（REQ-087 R1-a）：取权威 `todo/write` 记录 → 待办证据不依赖插件加载 |
| `scripts/flow_control.mjs` | 流程管控层判定（REQ-087 R3）：拓扑分层 + 五条不变式 → 退出码 0 |
| `scripts/process_supervisor.mjs` | 独立重跑全部客观判定，不采信自述 → 硬项全绿才许结项 |
| `scripts/output_audit.mjs` | 输出结构与体量判定（REQ-089 R1-c）：从宿主转录取最近一轮正文，度量字数/行数与文末五联装 → 退出码 0/1/2，**2 绝不算通过**；报告落 `~/.dsh/.dsh-control/compact/<sid>.json` |
| `scripts/check_layer_interfaces.mjs` | 执行层接口契约（REQ-089 R4）：按 `<unit>/interface.json` 与 `scripts/interfaces/*.interface.json` 对拍；覆盖率与名字覆盖率**分开报** → CLI 层覆盖率须 100% |
| `scripts/route_plan.mjs` | 路由判定与路线规划（REQ-089 R5）：意图匹配 → 调配决策 → 文档-实现一致性审计；`--check` 须同时满足数据源真实被读 · 死通道 0 · 可达性分开报 · **反向用例**不回显关键词伪造路线 |
| `scripts/language_audit.mjs` | 文字可读性判定（REQ-090 R4）：判 GB2312 基本集之外的生僻字 → 退出码 0/1/2，**2 绝不算通过**；基准 `data/common_chars.txt` |
| `scripts/gen_common_chars.mjs` | 常用字表生成器（REQ-090 R4 数据来源）：从 GB2312-1980 基本集**推导** 6763 字 → `--check` 须与推导逐字一致 |
| `scripts/lib/gates_config.mjs` | 门禁阈值配置读取器（REQ-090）：把 `gates.conf` 读成对象供判定器复用 → 缺失时回落调用方显式默认值 |

**硬要求**：检测器不可用时一律判"未通过"，**不允许以"检测失效"充当通过**。

**流程管控层权威源**：[`ai-control/config/flow_graph.json`](config/flow_graph.json) —— 步骤、依赖边、不变式、已批准顺序的唯一出处；
规则层（[`rules/workflow/task_execution_flow.md`](../rules/workflow/task_execution_flow.md) §二之五）只放指针与受管步骤清单。

---

## 🛠️ 常用命令

```bash
./scripts/control_gates.sh check|card|badge|json   # 计算看板 / 只读缓存 / 一行徽标 / 输出 status.json
./scripts/control_gates.sh advance <id>            # 仅在真实通过时记账推进
./scripts/control_gates.sh reset                   # 清空缓存，强制重算
node scripts/redundancy_scan.mjs --root .          # 冗余扫描（重复内容）；--self-test 自检
node scripts/conflict_scan.mjs --root .            # 冲突扫描；--self-test 自检（22 项）
node scripts/legacy_align_scan.mjs --root .        # 存量校准（含脚本漏登记）；--self-test 自检（22 项）
node scripts/channel_audit.mjs --root .            # 通道审计；--self-test 自检（23 项）
node ai-control/plugin/selftest.mjs                # 拦截层插件自检（33 项）
./scripts/physical_lock.sh status|sync             # 查看 / 同步底层物理锁与凭据
node scripts/output_audit.mjs --check              # 输出结构契约判定；--self-test（16 项，含反向用例）
node scripts/language_audit.mjs --check            # 生僻字判定；--root . 全库扫描；--self-test（11 项）
node scripts/gen_common_chars.mjs --check          # 常用字表漂移校验（磁盘 vs 国标推导）
node scripts/test_physical_lock.mjs                # 底层物理锁全量自检（19 项）
```

---

## 🔧 调参与开关

| 想改什么 | 改哪里 |
| :--- | :--- |
| 门禁阈值、扫描范围、排除表 | `ai-control/config/gates.conf`（改完即时生效） |
| 临时关闭硬门禁（全局 / 单次） | 环境变量 `DSH_CONTROL_GUARD=off` / `DSH_CONTROL_BYPASS=all` |
| 彻底停用插件 | 注释 `$DSH_HOME/profiles/<当前 profile>/cordis.patch.yml` 中的 `ai-execution-control` 行并重启（profile 目录用 `./scripts/install_host_gate.sh verify` 查） |

---

## 📋 设计约束（改动时务必遵守）

1. **绝不因自身故障阻断用户**：读不到状态、解析失败、异常抛出，一律降级为放行。
2. **逃生舱必须常开**：参数触及 `control_gates` / `ai-control` 等管控路径时始终放行，避免死锁。
3. **只读工具永不被拦**：`read` / `grep` / `glob` 与 `todo_write` 始终可用。
4. **状态不可证实即失败关闭**：缓存过期时拒绝改动型调用，要求重新校验，不得静默放行。
5. **禁止凭语法通过上线**：判定逻辑改动后必须重跑 `selftest.mjs` 与 `--self-test`。

---

## 🧭 已知边界

- **作用域仅限本工程**：门禁针对本规则库；其他项目按各自工程惯例执行。
- **插件改动需重启**：改 `plugin/index.mjs` 后需重启桌面端；`gates.conf` 与脚本改动即时生效。
- **`!!js` 不被 overlay 支持**：`cordis.patch.yml` 中插件路径必须是字面量相对路径。
- **冗余检测有阈值盲区**：相似度阈值 0.85 只针对"实质性整段复制"，改写式抄袭不在范围内。

---

## 🛠️ 维护原则
- 遵循 `rules/system/meta_rules.md` 最高准则；
- 阈值调整必须同步登记 `docs/requirements.md`；
- 保持文档全中文、通俗直白、无生僻字。
