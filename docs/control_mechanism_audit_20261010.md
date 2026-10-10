# 管控机制结构审计报告（2026-10-10）

> 判定模式：只读取证 + 实跑复现。所有结论均带物理证据（文件行号 / 命令实测输出 / git 模式位）。
> 审计期间工作树被外部进程改写，涉及该部分的结论均标注取样时刻。

## 一、受审对象规模

| 维度 | 实测值 |
| :--- | :--- |
| 管控脚本 | 95 个（`scripts/*.sh` + `scripts/*.mjs` + `scripts/lib/*`） |
| 代码行数 | 31190 行 |
| 文档化入口 | AGENTS.md(HEAD) 32 条命令 |
| 门禁 | G0 + check_init/check_structure/check_sync/check_redundancy/check_integrity/check_concurrency/check_score 共 8 项 |
| 整跑耗时 | 16.9s（`control_profiler` 实测产物 `perf_profile.json`） |
| 宿主拦截层 | 已加载（`install_host_gate.sh verify`：宿主激活台账 2026-10-09T06:57:45Z HOST pid=1210） |
| 全域覆盖 | 5/5 工程已接管（`scope_audit.mjs --check`） |

## 二、缺陷清单（实测复现）

### D1 · 门禁失败提示与实际失败项不符（已复现）

现象：G6 判红时，看板给出
`未达标 1 项：逐条修复命令见 node scripts/task_layer_tree.mjs --check 等七条判定器输出（含 …control_profiler.sh --check…）`

真相：`bash -x` 逐项追踪显示唯一判红项是 **`管控篇幅受管且能力不降:⛔`**（`token_budget_audit.mjs --check` 退出码 1），
`control_profiler.sh` 与 `task_layer_tree.mjs` 实际全部 ✅。

证据：
- `scripts/control_gates.sh:702` —— HINT 把七条判定器的名字**硬编码为常量字符串**，不引用 `detail` 里的实际失败项。
- `scripts/control_gates.sh:633` —— G5 同样硬编码三条判定器名字。
- 实测：`bash -x scripts/control_gates.sh check 2>&1 | grep 'detail='` → 仅 `管控篇幅受管且能力不降:⛔`。

影响：提示文本无法定位真因，使用者被引导去修不需要修的脚本；门禁"有牙"但"指错方向"。

### D2 · 证据串丢失时打印 `[object Object]`（已复现，后被外部修复）

现象：
`⛔ 能力被削减：3 条证据串丢失 → [object Object] · [object Object] · [object Object]`

真因：`scripts/token_budget_audit.mjs:385` 对 `capability.missing` 数组直接 `.join(' · ')`，
而该数组元素是**对象** `{case, needle}`（实测原始结构）：
```json
[{"case":"AGENTS.md","needle":"scripts/build_capabilities_index.mjs"},
 {"case":"AGENTS.md","needle":"scripts/gen_skill_interfaces.mjs"},
 {"case":"AGENTS.md","needle":"scripts/restore_skill_pool.mjs"}]
```
影响：判红信息完全不可读，丢失"哪条证据、在哪个文件"这一最关键维度。

时间线（如实记录）：审计中该 3 条证据串对应的三个命令于 15:37 左右被补回 `AGENTS.md`（46 行 → 47 行），
`token_budget_audit.mjs --check` 由退出码 1 转为 0，G6 随之转绿。**`[object Object]` 的打印缺陷本身未修**，
只是不再被触发。

### D3 · 紧凑看板把"全绿"写成硬编码（已复现）

`ai-control/plugin/index.mjs:652`：
```js
lines.push(`**🎛️ 管控看板** \`${progressBar(s.gatePassed, s.gateTotal, 10)}\` **100% (4/4)** 🟢 全部门禁通过`)
```
`100% (4/4)` 与 `全部门禁通过` 是**字面量**，只有进度条是真算的。实际门禁数为 8 项，
`:653-658` 也只取 `s.gates[0..3]` 四项指标（骨架/合规/需求/冗余），G5/G6/G7 在紧凑态**不可见**。

影响：该分支以 `s.execAllowed` 为条件，即"全绿才走紧凑态"，所以不是撒谎；但它使**"全绿"这一结论
无法在紧凑态自证**——模型与用户看到的"7 个门禁全过"其实只由 4 个指标支撑，G5~G7 的真实取值被丢弃。
这与同仓 REQ-093/REQ-102 主张的"压缩不得削减能力"直接冲突。

### D4 · 全域覆盖审计不校验管控接入段（盲区）

`scripts/scope_audit.mjs:182-198` 的 `docs` 判据只做两件事：
① `AGENTS.md` 存在；② 其中引用的脚本路径**在磁盘上存在**（悬空引用=0）。

它**不校验** `backfill_scope.mjs` 生成的 `<!-- DSH-CONTROL-SCOPE:BEGIN -->` 标记块是否存在。

实证：本仓库（主控仓库本身）的 `AGENTS.md` 在审计期间一度被替换为**不含该标记块**的版本
（`grep -c "DSH-CONTROL-SCOPE" AGENTS.md` → 0），而 `scope_audit.mjs --check` 仍报
`已接管 5/5 · 未接管 0 个`。即：**"已接管"的判据穿透不到"接入段是否在位"**，
只要引用不悬空就给绿灯。

### D5 · 走 `.sh` 判定器时绕过了可执行位语义（设计不一致）

`scripts/control_gates.sh:677`：
```sh
*.sh) ( cd "$PROJECT_ROOT" && bash "$script_dir/$name" --check >/dev/null 2>&1 ) ;;
```
判定一律用 `bash 脚本` 调用，**因此可执行位坏了也判不出来**。而仓库同时把可执行位当作契约使用。

实测权限分布不一致：

| 文件 | 磁盘模式 | git 模式 |
| :--- | :--- | :--- |
| `scripts/control_profiler.sh` | `-rw-------` | `100644` |
| `scripts/plugin_reload.sh` | `-rw-------` | `100644` |
| `scripts/plugin_sync.sh` | `-rw-------` | `100644` |
| `scripts/lib/atomic_lock.sh` | `-rw-------` | `100644` |
| `scripts/lib/backup_retention.sh` | `-rw-------` | `100644` |
| `scripts/lib/find_node.sh` | `-rw-------` | `100644` |
| `scripts/gate_selftest.sh` | `-rwx--x--x` | `100755` |

后果：① 直接 `./scripts/control_profiler.sh --check` 会 `Permission denied`（本审计首轮计时即撞上）；
② `scripts/lib/find_node.sh` 被 `. "$SCRIPT_DIR/lib/find_node.sh"` source，**权限无碍**，
但同名可执行位缺失会让"入口可跑"的人肉核验得出错误结论；
③ 宽松模式 `-rwx--x--x`（711）在 `git clone` 后依赖 umask，模式位不保证复现。

### D6 · 看板把 G0 报成 G7

卡点态由 `ai-control/plugin/index.mjs:670` 渲染：
```js
`**状态** 🔴 卡点：G${s.gateIndex} ${s.currentGateName}`
```
实测输出为 `卡点：G7 会话未合规命名`，而会话命名为 **G0**；同一渲染里进度条为 `100% · 7/7 门禁通过`，
与"存在卡点"自相矛盾。根因是 `s.gates` 数组只含 G1~G7（7 项），G0 不在其中，
`gateIndex`/`gateTotal` 未把 G0 计入（与历史记录中的"D2 G0不进分母"缺陷同源，未收敛）。

### D7 · 每步刷新都把整跑门禁挂上（成本结构）

`ai-control/plugin/index.mjs`：`bootstrapStatus()`（`:583`）以 `DSH_CONTROL_TTL='0'` 调用
`bash scripts/control_gates.sh check`（`timeout: 30000`），刷新节流 `REFRESH_THROTTLE_MS = 1000`（`:390`）。
即最坏情况下**每秒可触发一次 16.9s 的门禁整跑**（含全库扫描）。该成本与对话无关联，
却由"常显看板"这一展示需求承担。同仓 `perf_budget.conf` 已把预算从 45s 收紧到目标 25s——
省下的时间会被刷新频率原样吃掉。

### D8 · 纪律分与停用阈值的安全边际只剩 5 分

实测：`当前纪律分：65 / 100`，`DISC_SUSPEND_THRESHOLD=60`（`ai-control/config/gates.conf:176`）。
`累计扣分 35 · 档位分布 L3×1 L2×5`，`自评 85 · 委员复核 65`。
停用后**仅用户可恢复**（`scripts/discipline_score.mjs:627` 强制 `--by user`），不随新任务复活。

结构风险：管控机制对"改动型调用"的拦截权限，挂在一个**单调磨损、且只扣不补**的计分器上。
一旦跌破，连"修机制"这个动作本身也被拦。需要一条与纪律分**解耦**的恢复通道。

### D9 · 权威源漂移（本轮实测）

`indexes/rules_index.md` 三处（`:22/:24/:30`）把 `AGENTS.md §一` 声明为门禁定义的
**"唯一权威清单"**；而审计期间工作树版本一度完全不含该清单。同时
`rules/workflow/task_execution_flow.md:173` 写"`control_gates.sh check` 输出 4/4 通过"，
`ai-control/README.md:24` 写"累积门禁 G1~G7"——同一事实三种口径。

### D10 · 留痕判据是可注入的 bash 字符串（🔴 致命）

`scripts/progress_ledger.mjs:266` 用 `execFileSync('bash', ['-c', judge])` 执行调用方传入的 `--judge` 字符串，
`scripts/progress_ledger.mjs:194-197` 判红条件只有 `judgeExit !== 0`。

于是 `--judge "node scripts/control_gates.sh check > /dev/null 2>&1; true"` 使 `judgeExit` 恒为 0。
**磁盘上 129 条记录中已有 3 条这样的写法**，且全被记为"判定通过"；
其中一条甚至用 `node` 跑 `.sh`（必然失败），仍被记成 `judgeExit: 0`。

后果：本机制最核心的主张"不认自述、认实跑证据"在台账层被一句话击穿——
每条改动确实带了一条判定命令，但那条命令可以被写成永远成功。

### D11 · 物理锁凭据无签名，CLI 自带凭据伪造口（🔴 致命）

- 状态存放：`~/.dsh/.dsh-control/physical_locks/<sid>.json`，降级副本 `ai-control/reports/state/physical_locks/`；
  读取端**双源取大**（`scripts/lib/physical_lock.mjs:84`）。
- 校验强度：`JSON.parse` + `typeof data.stage === 'number'`（`scripts/lib/physical_lock.mjs:82-83`），
  `proofs` 字段**从不校验**，无签名、无 HMAC、无哈希链、无宿主绑定。
- 放行判定：只读 `lockState.stage` 这个数字（`scripts/lib/physical_lock.mjs:242`）。
- CLI 自带后门：`scripts/physical_lock.sh:60` 以 `{trigger:"cli_advance", user:"system"}` 直接签署凭据，
  连敲 `advance 1`、`advance 2`… 即可逐阶走完；`reset` 无任何门槛（`scripts/physical_lock.sh:67-69`）。
- 跳阶本身确实被拒（`scripts/lib/physical_lock.mjs:142-148`），但等价路径全开。
- 路径判定用**子串匹配**（`scripts/lib/physical_lock.mjs:256,302`）：
  `cmd.includes('control_gates.sh')` 即放行 ⇒ `cat scripts/control_gates.sh; <真正的改动>` 可绕过。

结论："底层物理锁"实为**逻辑层的一个可编辑数字**，与物理无关。

### D12 · 逃生舱静默放行且零留痕（🔴 致命）

`ai-control/plugin/index.mjs:1192-1193`：`DSH_CONTROL_GUARD=off` 与 `DSH_CONTROL_BYPASS=all` 直接 `return`。
代码里两者**与全局等价**（文档称 BYPASS 是"单次"，实为无会话/次数绑定）。

实测：`ls ai-control/reports/state/ | grep -i "bypass|escape|guard"` **无任何命中**；
`status.json` 的字段里**没有"本次是否被绕过"这一列**。

**最强证据**：看板实测同时输出 `gatePassed 7/7 · percent 100 · execAllowed False`——
7 个格子全绿而物理上执行被拒。也就是说，**"真过"与"被绕过"在看板上完全同形**，人眼无法分辨。

### D13 · 白名单把"改判定器本体"列入免检（🟠 高）

`ai-control/plugin/index.mjs:137`：`escapeWritePrefixes: ['ai-control/', 'scripts/', '.dsh-control/']`
⇒ 修改 `control_gates.sh`、`physical_lock.sh`、任何判定器**永不被拦**——被判定者可以改判定器。
`escapeScriptPrefixes`（`:91-136`，18 条）含 `git_sync_remote.sh`（`:114`）⇒ 受控期可直接 push。

## 三、结构性优化方案（按性价比排序）

### P0 · 消除"判据与提示分离"（治 D1/D3/D6 同一根因）

根因：门禁的**名称、指标、提示、渲染**四处各写一遍，无单一来源。
建议：新增 `ai-control/config/gates_registry.mjs`（唯一机读定义：id/名称/判定命令/指标标签/失败提示模板），
由 `control_gates.sh`、`ai-control/plugin/index.mjs`、文档生成器统一消费。
收益：D1（提示自动等于实际失败项）、D3（紧凑态由注册表派生，无法硬编码）、D6（G0 是否计入分母由注册表声明）。
代价：一次重构，约 1 个门禁函数量级。

### P0 · 统一三态语义：缺证据必须退 2（不是 0）

现状（严格复验，不经管道取退出码）：

| 判定器 | 缺证据时退出码 | 语义 |
| :--- | :--- | :--- |
| `output_audit.mjs` | **2** | fail-closed ✅ |
| `language_audit.mjs` | **2** | fail-closed ✅ |
| `strategy_layer_audit.mjs` | **2** | fail-closed ✅ |
| `session_source_audit.mjs` | **0** | ⛔ `--fast` 时 `!probe.ran → 0` |
| `todo_panel_audit.mjs` | **0** | ⛔ 用离线夹具冒充载体触达 |
| `anti_hallucination_audit.mjs` | **0** | ⛔ 只查产物 mtime 新鲜度，不查内容 |

建议：全判定器统一 `0/1/2`（通过/判红/不可判定），并新增一条横扫：**任何"未采集"分支不得以 0 退出**。
三处缺口的具体位置：`scripts/session_source_audit.mjs:368`（全仓唯一把三态写成二态的地方）、
`scripts/todo_panel_audit.mjs:42-46,115`（证据是硬编码 FIXTURE，与真实会话无关）、
`scripts/anti_hallucination_audit.mjs:261-277`（`touch` 即永绿）。

### P1 · 覆盖审计穿透到接入段

`scope_audit.mjs` 的 `docs` 判据增加一条：`AGENTS.md` 必须含 `DSH-CONTROL-SCOPE:BEGIN/END` 标记块，
且标记块内引用的路径零悬空。收益：堵 D4 盲区；本仓库自身的接入段丢失也能被判红。
配套应加 `backfill_scope.mjs --check`（当前只有 `--apply`，无法在门禁里判"该注入却没注入"）。

### P1 · 入口收敛：从"多脚本"到"一个入口 + 子命令"

现状：32 条文档入口映射到 95 个脚本，命名类一个职责散成 10 个脚本
（`name_me.sh`/`rename_session.sh`/`check_task_naming.sh`/`naming_watchdog.mjs`/`session_naming_audit.mjs`/
`generate_naming_plan.mjs`/`test_auto_naming.mjs`/`verify_auto_naming_e2e.mjs`/`batch_rename_sessions.mjs`/
`batch_fix_sidebar_titles.mjs`）。
建议：`./scripts/control.sh <子命令>` 作为唯一人用入口（已具雏形），把命名簇收敛为
`control.sh naming {lock,check,plan,watch,batch}`；脚本层保留但明确"内部实现"地位，不再进文档入口表。
收益：文档入口数从 32 降到 ~10，降低"记不清该跑哪条"的漏执行概率。

### P1 · 建立脚本登记表，区分"判据 / 工具 / 测试"

现状：无登记表，95 个脚本地位平等。实测全仓引用扫描仅发现 1 个近零引用脚本（`gate_probe.sh`，0 处引用），
说明"死脚本"不多，但**判据与工具混在一起**（如 `test_*.mjs`/`verify_*.mjs` 混在 `scripts/` 判据目录）。
建议：登记 `{path, 角色: judge|tool|test|legacy, 被谁调用}`，门禁只引用 `judge`。
收益：新增门禁判据时不会误把测试脚本挂上门禁链。

### P2 · 刷新成本与展示解耦

建议：门禁整跑结果**落盘快照**（已有 `state` 目录），插件每步只读快照；
"实跑"改由独立节流触发（如 TTL ≥ 60s 或仅在改动后触发）。
收益：D7 的每秒 16.9s 风险消除；展示与判定彻底分离。

### P2 · 纪律分的解耦恢复通道

建议：纪律分停用时，**只保留**"读取 + 修复 + 复跑判定器"三类只读/白名单动作，
使机制可在无人值守下恢复到阈值以上；`--by user` 仍是解除停用的唯一途径（不放开该约束）。
收益：消除 D8 的自锁死。

### P2 · 可执行位与跨平台基线

建议：① `chmod +x` 六个 `100644` 的 `.sh` 并 `git update-index --chmod=+x`；
② 模式位统一 `755`（当前 `711` 混杂）；
③ 门禁增加 `scripts/*.sh` 可执行位断言（判据而非人肉约定）。
另：本仓脚本大量使用 `timeout`（macOS 无此命令）等 GNU 假设，建议增加一份"外部命令依赖"断言。

## 四、取证与反取证（独立复验台账）

本报告结论分两类，来源严格标注，**不把转述当事实**。

### 4.1 Lead 直接实测证实（可直接采信）

| 结论 | 复验方式 | 实测值 |
| :--- | :--- | :--- |
| G6 真实判红项是篇幅/能力判据，非提示所指脚本 | `bash -x` 逐项追踪 | `管控篇幅受管且能力不降:⛔`，其余 6 项 ✅ |
| 台账判据可注入 | 读 `progress_ledger.jsonl` 129 条 | 3 条 `…; true`，均记 `judgeExit:0` |
| 物理锁凭据无签名 | 读真实锁文件字段 | 字段 `version,sessionId,stage,stageName,updatedAt,proofs,history`，无签名 |
| `find_node()` 副本漂移 | `grep -c dsh-runtimes` | `lib/find_node.sh`=1，`control_gates.sh`=0，`check_task_naming.sh`=0 |
| G0 不进分母 | 读 `GATE_IDS` | 7 项，无 naming |
| 阈值潜在翻转 | seed vs conf vs 实测 | seed=45 / conf=65 / 实测重复标题=47 ⇒ **conf 丢失即判红** |
| 回归锁未接线 | `grep -n gate_selftest control_gates.sh` | 仅 2 处，均为 `#` 注释 |
| 可执行位缺失 | `git ls-files -s` | 6 个 `.sh` 为 `100644` |
| 简版看板硬编码 | 读 `index.mjs:652` | 与磁盘实况无关的字面量 |

### 4.2 复验中被推翻的结论（如实留痕，避免写入报告）

| 被推翻的说法 | 谁提出 | 实测反证 |
| :--- | :--- | :--- |
| `output_audit.mjs`/`language_audit.mjs` 缺证据时退出码 **0** | Lead 首轮（误用管道取 `$?`） | 实为 **2**（fail-closed）。改用 `out=$(cmd); rc=$?` 复验 |
| 命名闸接受无空格标题 `[新需008][90]xx` | 子代理 a56a9324 | 用 `grep -E`（闸的真实执行器）实跑 → **REJECT** |
| 命名闸拒绝 `[新需008][90分]` | 子代理 a56a9324 | 闸先剥「分」再匹配 → **ACCEPT** |
| `scripts/gate_probe.sh` 是零引用脚本 | Lead 首轮 grep | 它是**残留目录名**，非文件 |
| 全仓仅 1 个孤儿脚本 | Lead 首轮 grep | `scripts/interfaces/*.interface.json`（97 个生成壳）使每个脚本都"有引用"，污染了引用图 |

> 上表 5 条均为审计过程中真实发生的自证错误，保留在此是为了说明：
> 本机制的"证据可证性"要求是对的，但**取证方法本身也会错**——管道取退出码、生成物污染引用图、
> POSIX 字符类误用于 JS 正则，都是本轮踩到并纠正的坑。

### 4.3 采信但标注来源（子代理实测，Lead 未逐条复现）

命名簇 10 个成员 / 5 份正则实现、`G4_TOP_DUP_LIMIT` 之外 4 个阈值无 conf 键、
`OUT_RECEIPT_FIELDS` 兜底漏 `🏷️ 需求版本`、
`control_gates.sh` 承担 13 类职责、`route_plan.mjs` 承担 10 类职责：
来源为并行子代理的只读审计，Lead 已复验其中"阈值漂移"与"脚本数量"两项，其余为转述。

## 五、诚实缺口（本轮未取证的项）

1. 三个并行深挖子任务（门禁编排 / 证据链与逃生舱 / 冗余与死代码）**已回传**，其结论见 4.3；
   其中两条经复验被推翻、已列入 4.2，未写入正文结论。
2. `AGENTS.md` 在审计期间被外部进程改写多次（27 → 46 → 47 行），
   "权威源漂移"D9 的证据为快照，不排除仍在变动。
3. `control_profiler.sh --check` 的预算判据读的是**上一次**实测产物（设计如此，避免自我否定），
   故 16.9s 是历史值，非本轮同时刻 A/B。
4. D10~D13 中"手工伪造锁文件即放行""设 `DSH_CONTROL_GUARD=off` 即放行"两条，
   由**代码路径 + 磁盘文件实况**推出，未做实弹验证（本轮不写盘、不重载宿主守卫）。
5. 本报告未提交、未登记台账（用户诉求为"看有什么可优化"，非立项实施）。
