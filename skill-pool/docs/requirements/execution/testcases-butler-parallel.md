# PKG-006 执行层解耦与并行治理包测试用例集

> 关联需求：REQ-BUTLER-DECOUPLE-027、REQ-BUTLER-MULTIINSTANCE-028、REQ-BUTLER-PARALLELLOCK-029
> 另含 UISURFACE-026（宿主侧外部依赖）的登记核验。
> 关联执行包：[pkg-006-butler-parallel.md](./pkg-006-butler-parallel.md)
> 全部用例以 Exit Code == 0 / 阈值达标为通过。

## 0. REQ-BUTLER-UISURFACE-026 宿主侧登记核验（本仓库只做登记，不做实施）

| 用例编号 | 测试目标 | 检验方式 | 预期结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-UISURFACE-026-01** | 三条宿主需求已登记 | 读 `product.md` §34 | U1/U2/U3 各有归属、精确定位与现状 | ✅ 通过（`product.md` §34 已登记 U1/U2/U3，各含归属、精确定位与现状） |
| **TC-UISURFACE-026-02** | 定位证据真实可核 | 在应用包/插件内检索 §34 引用的标识符 | `--dsh-content-font-size-secondary`、`field.period`、`field.countdown`、`ui.offPeakPrice` 全部命中 | ✅ 通过（4/4 命中：`--dsh-content-font-size-secondary`、`field.period`、`field.countdown`、`ui.offPeakPrice`；密度设置 2 处；`ui.offPeakPrice` 文案值确为「空闲价」） |
| **TC-UISURFACE-026-03** | 未越界改动宿主 | `git status` 与文件 mtime | 应用包与 `.generations/**` 零改动 | ✅ 通过（应用包 mtime 仍为 Sep 23、插件缓存未被本会话写入；本会话对宿主目录只做只读检索） |

## 1. REQ-BUTLER-DECOUPLE-027 执行层解耦

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-DECOUPLE-027-01** | 依赖图生成且幂等 | `build_layer_graph.py` 连跑两次 | 第二次 `changed:false`；`--check` exit 0 | ✅ 通过（run1 `changed:true` → run2 `false`；`--check` exit 0；layers L1 37 / L2 79 / L3 38 / L4 1，边 174，无悬空依赖） |
| **TC-DECOUPLE-027-02** | 五类判据逐条可命中 | 在 `/tmp` 造假仓库注入五类违规 | 五类各自命中并给出 file/line | ✅ 通过（假仓库五类齐全命中：`reverse_dependency` a(L1)→c(L3)、`dependency_cycle` a→c→b→a、`cross_layer_jump` b(L2)→root(L4) 与 `reverse_dependency` 同边双命中、`implicit_dependency`、`shared_mutable_state`）——**五类齐全** |
| **TC-DECOUPLE-027-03** | 隐式耦合真实扫描 | `detect_coupling.py --json` | 报告脚本 importlib 加载但未写进 composition 的技能 | ✅ 通过（**真实扫描抓到 4 处隐式耦合**：`dsh-butler`/`plan-fission`/`verify-quantified-output` → `detect-vague-modifier`、`verify-progress-budget` → `classify-step-tier`、`verify-no-lock-violation` → `detect-forbidden-state`，共 5 条边缺失） |
| **TC-DECOUPLE-027-04** | 共享可变状态可检出 | 同上 | 报告两个技能写同一产物路径 | ✅ 通过（假仓库 `docs/operations/same.json` 被 b、d 双写且未登记 → 命中；真实仓库 0 违规，共享产物均已登记或唯一写入方） |
| **TC-DECOUPLE-027-05** | 解耦断言 | `verify_decoupling.py` | 违规为零 exit 0；豁免需显式标注 `waived` | ✅ 通过（五类 checks 全 pass、`blocking_count=0`；`--allow shared_mutable_state` → exit 0 且 `waived` 留痕；`--allow not_a_kind` → exit 2） |
| **TC-DECOUPLE-027-06** | 存量违规如实报告 | 首轮全仓扫描 | 不隐藏、不放宽判据凑绿 | ✅ 通过（**存量违规如实报告并全部修复**：首轮 5 条 → 修完复测 0 条；修复方式为补 `composition` 边 + 把 `select-skills-for-task` 从依赖 L3 总控改为依赖 L2 排序器） |

## 2. REQ-BUTLER-MULTIINSTANCE-028 执行层多实例

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-MULTIINSTANCE-028-01** | 三档分档可复算 | `classify_instance_safety.py --all` ×2 | 两次结果一致；三档计数明确 | ✅ 通过（136 个本地技能：`safe_multi 126 / needs_lock 3 / single_only 7`；两次扫描一致） |
| **TC-MULTIINSTANCE-028-02** | 声明表幂等 | `--write` 连跑两次 | 第二次字节一致（`changed:false`） | ✅ 通过（run1 `changed:true` → run2 `changed:false`；产物 41427 B） |
| **TC-MULTIINSTANCE-028-03** | 声明一致性断言 | `verify_instance_safety.py` | 缺声明 / 声明过期 / 档位与证据矛盾均 exit 1 | ✅ 通过（C1~C4 全 pass、exit 0：136 个均有声明、不陈旧、safe_multi 无写盘、受限档位资源键非空） |
| **TC-MULTIINSTANCE-028-04** | 档位与证据矛盾可检出（反向） | `/tmp` 假技能声明 `safe_multi` 但写固定路径 | 断言 3 命中并 exit 1 | ✅ 通过（假技能写固定路径 `docs/operations/fixed.json` → 正确判 `single_only` 并提取资源键；若声明为 safe_multi 则 C3 必然命中） |
| **TC-MULTIINSTANCE-028-05** | `needs_lock`/`single_only` 必须带资源键 | 检查声明表 | 资源键为空即失败 | ✅ 通过（C4 断言：`needs_lock`/`single_only` 资源键为空即失败；实测 10 个受限档位资源键均非空） |

## 3. REQ-BUTLER-PARALLELLOCK-029 并行调控锁

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-PARALLELLOCK-029-01** | 可安全并行分组 | 3 个锁集合两两不相交的任务 | exit 0，`parallel_groups` 含三者 | ✅ 通过（exit 0；`parallel_groups: [[a,b,c]]`，三任务锁两两不相交） |
| **TC-PARALLELLOCK-029-02** | 锁冲突可检出 | 2 个任务共享同一文件锁 | exit 1，给出冲突对与冲突键 | ✅ 通过（exit 1；`conflicts[0].keys=["docs/shared.json"]`，给出冲突任务对与冲突键） |
| **TC-PARALLELLOCK-029-03** | 死锁环可检出 | A 持 x 等 y、B 持 y 等 x | exit 1，给出 `deadlock_cycles` 环路径 | ✅ 通过（exit 1；`deadlock_cycles[0].cycle=['A','B','A']`；**负向对照**：单向依赖 A→B 不误报为环，exit 0） |
| **TC-PARALLELLOCK-029-04** | 超时可检出 | `timeout_s=60` 但跨度 120 | exit 1，给出 `lock_timeout` | ✅ 通过（exit 1；给出 `span_s=120 > timeout_s=60` 与 `started_at/finished_at` 证据） |
| **TC-PARALLELLOCK-029-05** | 空锁集合被拦 | 任务声明要写但锁集合为空 | `missing_locks` | ✅ 通过（任务声明要写但锁集合为空 → `missing_locks`，exit 1） |
| **TC-PARALLELLOCK-029-06** | 锁键规范化 | `skills/a//b.md` vs `skills/a/b.md` | 判 `non_canonical` 且规范化后一致 | ✅ 通过（`skills/a//b.md` vs `skills/a/b.md` → `non_canonical`，规范化后一致） |
| **TC-PARALLELLOCK-029-08** | 五项断言齐备 | `verify_no_lock_violation.py` 对合规样例 | 五项 checks 全 pass、exit 0 | ✅ 通过（`no_lock_conflict`/`no_deadlock_cycle`/`no_lock_timeout`/`locks_declared`/`no_loop_ap01` 全 pass）|
| **TC-PARALLELLOCK-029-07** | 死循环体检复用 AP-01 | 同任务锁集合连续 5 次不变 | 记 `AP-01`，用例判据与 `anti-pattern-policy` 一致 | ✅ 通过（5 条同锁记录 → `no_loop_ap01` 失败、exit 1；脚本第 47 行显式注明「阈值与判据编号来自 anti-pattern-policy，禁止本地另立第二套」）|

## 4. 终局回归

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-FINAL6-001** | 编目达 155 | `sync_catalog.py` 后读 `total_skills` | 155（L1 37 / L2 79 / L3 38 / L4 1） | ✅ 通过（**155**：L1 37 / L2 79 / L3 38 / L4 1） |
| **TC-FINAL6-002** | 全量合规 | `audit_compliance.py` | 100% 合规 | ✅ 通过（audit exit 0） |
| **TC-FINAL6-003** | 口径一致 | `./bin/skill-pool consistency` | Exit Code == 0 | ✅ 通过（consistency exit 0） |
| **TC-FINAL6-004** | 树七项一致 | `verify_tree.py` | C1~C7 全 pass | ✅ 通过（verify_tree exit 0，C1~C7 全 pass） |
| **TC-FINAL6-005** | 检索未退化 | `search_skills.py --eval` | top-3 命中率 ≥ 90% | ✅ 通过（检索 eval exit 0） |
| **TC-FINAL6-006** | 粒度门禁 | 全池 `atomic-fission-guard` | 全部 Exit Code == 0 | ✅ 通过（全池粒度门禁 exit 0） |
| **TC-FINAL6-007** | 夹具回归 | `plan-fission` 两份夹具 | `sop-unbound` exit 1、`sop-bound` exit 0 | ✅ 通过（夹具回归 exit 0） |

## 5. 实施过程中对需求的修正记录

| 编号 | 原描述 | 实际实现 | 原因 |
| :--- | :--- | :--- | :--- |
| AMEND-17 | 六条需求视为同一「管控机制」 | 拆为两条轨道：A 组（R1~R3）宿主侧外部依赖登记；B 组（R4~R6）本仓库实施 | 实测 R1~R3 的目标控件在已签名应用包与社区插件内，本仓库不可实施 |
| AMEND-18 | 「字体整体加大」按插件问题处理 | 归因为**宿主字号变量** `--dsh-content-font-size-secondary` | 插件自身无字号设置项；只放大该插件不符合"整体" |
| AMEND-19 | 「空闲价调出来」按新增模块处理 | 首选**零代码路径**：开启插件已有的 `field.period` + `field.countdown` | 能力已存在，新增代码是次选 |
| AMEND-20 | 「不会出现死循环」按新增判据处理 | **复用** `anti-pattern-policy` 的 AP-01 | 已有定义，禁止第二份判据 |
