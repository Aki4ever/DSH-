# 项目工作流

## 1. 规范流转
1. 从 `docs/requirements/index.md` 获取当前生效需求与基线。
2. 根据 `docs/operations/global-rules-index.md` 指纹决定增量或完整规则审计。
3. 问题诊断或 Bug 修复先用 `manage-problem-log` 检索历史记录。
4. 使用 `dual-lane-router` 判定走快速流程还是完整流程（红线优先，其次加权分阈值 3）。
5. 使用项目适用 Skill 执行并采用最小充分验证。
6. 写入类任务前过 `atomic-fission-guard`（粒度门禁），技能契约变更后过 `catalog-consistency-guard`（口径门禁）。
7. 更新受影响的问题、需求、CLI、界面和操作索引。
8. 提交或推送前使用 `github` 生成并展示非空备注。

## 2. 双流程分流
- **快速流程（≤4 步）**：意图 → 命中既有技能 → 执行 → 回报；不动态造物、不派子智能体。
- **完整流程（5 步）**：意图 → 动态造物 → 多层路由 → 终审门禁 → 标准交付。
- 判定命令：
  ```bash
  python3 skills/score-task-lane/scripts/score_lane.py --task "<任务描述>" [--files N] [--steps N]
  python3 skills/verify-lane-decision/scripts/verify_lane.py --task "<任务描述>" --repeat 10
  ```
- 红线（强制完整流程）：删除/清空、发布/部署/推送、需求文档变更、安装外部依赖、批量改动（≥2 文件）。
  普通单文件编辑不是红线，由加权分判定。

## 3. 常用开发与维护命令
- 查看技能列表：`./bin/skill-pool list`
- 技能规范校验：`./bin/skill-pool validate`
- **口径一致性门禁**：`./bin/skill-pool consistency`（先刷新受管区块，再三方对拍）
- 仅检测漂移不改文件：`./bin/skill-pool consistency --check`
- 状态统计：`./bin/skill-pool status`
- 新建技能脚手架：`./bin/skill-pool init <skill-name>`
- 软链到运行环境：`./bin/skill-pool link <skill-name>`
- 编目同步：`python3 skills/dsh-butler/scripts/sync_catalog.py`
- 粒度门禁：`python3 skills/atomic-fission-guard/scripts/fission_guard.py --target skills/<name>`
- 最小充分自检命令：
  ```bash
  ./bin/skill-pool --version && ./bin/skill-pool status && ./bin/skill-pool validate && ./bin/skill-pool consistency
  ```

## 4. 检索与按需调用（REQ-BUTLER-RETRIEVAL-017 / ONDEMAND-015）
- 索引重建（编目变更后必跑）：`python3 skills/build-inverted-index/scripts/build_index.py`
- 检索（**找技能的唯一推荐入口**，只回灌片段）：
  ```bash
  python3 skills/google-style-skill-search-router/scripts/search_skills.py --query "<任务或查询>" --top-k 5
  python3 skills/google-style-skill-search-router/scripts/search_skills.py --eval      # 命中率评测
  ```
- 按需加载（**技能正文进入上下文的唯一入口**）：
  ```bash
  python3 skills/on-demand-dispatcher/scripts/dispatch_on_demand.py --task "<任务>"            # 只看成本
  python3 skills/on-demand-dispatcher/scripts/dispatch_on_demand.py --task "<任务>" --emit     # 装入正文
  ```
- 硬约束：禁止直接读整份 `skill-catalog.json`；禁止通配读取 `skills/**/SKILL.md`；单任务加载技能 ≤ 5 个、≤ 12 KB。

## 5. 过程输出与 token 预算（REQ-BUTLER-PROGRESS-016 / TOKENBUDGET-018）
- 过程输出只报阶段目标：
  ```bash
  python3 skills/classify-step-tier/scripts/classify_tier.py --text "<一条事件>" --json
  python3 skills/fold-repeated-events/scripts/fold_events.py --file <events.jsonl> --json
  python3 skills/verify-progress-budget/scripts/verify_progress.py --file <events.jsonl> --max-milestones 8
  ```
- token 度量与裁剪：
  ```bash
  python3 skills/measure-token-budget/scripts/measure_tokens.py --paths <文件...>
  python3 skills/prune-redundant-context/scripts/prune_context.py --in <file> --out <file>
  python3 skills/verify-token-reduction/scripts/verify_reduction.py --before <...> --after <...> --target 0.40 --cases <cases.json>
  ```
- 估算公式（唯一标准）：`tokens ≈ ceil(CJK 字符数 + ASCII 字节数 / 4)`。

## 6. 执行层树（REQ-BUTLER-TREE-020）
- 登记非技能执行层：`python3 skills/register-execution-layer/scripts/register_layer.py --list`
- 重建树与受管区块：`python3 skills/build-execution-tree/scripts/build_tree.py`
- 六项一致性断言：`python3 skills/verify-execution-tree/scripts/verify_tree.py`
- 唯一真相源：`docs/operations/execution-tree.json` / `execution-tree.md`；文档中的集群表一律取自受管区块，禁止手写。

## 7. 中文与反例门禁（REQ-BUTLER-ZHFLOW-019 / ANTIPATTERN-021）
- 中文断言：`python3 skills/verify-chinese-output/scripts/verify_chinese.py --file <文件>`
- 反例检测：`python3 skills/detect-forbidden-state/scripts/detect_forbidden.py --events <事件流.jsonl>`
- 反例零命中断言：`python3 skills/verify-no-forbidden-event/scripts/verify_no_forbidden.py --events <事件流.jsonl>`

## 8. 重启判定（REQ-BUTLER-HOTRELOAD-022）
- 处置判定：`python3 skills/classify-change-scope/scripts/classify_scope.py --paths <变更文件...>`
- 重启必要性断言：`python3 skills/verify-no-unnecessary-restart/scripts/verify_no_restart.py --paths <变更文件...> --restarts <重启记录.jsonl>`
- 默认目标是**零重启**：`skills/**`、`docs/**`、`docs/operations/*.json`、`bin/skill-pool` 均为热更；只有宿主 bundle 与 Web 产物需重建并刷新。

## 9. 执行层解耦（REQ-BUTLER-DECOUPLE-027）
- 生成层间依赖图（幂等）：`python3 skills/build-layer-graph/scripts/build_layer_graph.py`
- 五类耦合检测（真实扫描 frontmatter 与脚本源码）：
  ```bash
  python3 skills/detect-layer-coupling/scripts/detect_coupling.py --json
  python3 skills/verify-decoupling/scripts/verify_decoupling.py
  ```
- 五类判据：`reverse_dependency`（低层引用高层）/ `dependency_cycle`（依赖成环）/ `cross_layer_jump`（L1/L2 直引 L4）/ **`implicit_dependency`（脚本 importlib 加载了某技能模块，但该 id 未写进自己的 composition）** / `shared_mutable_state`（多技能写同一产物却未登记为共享资源）。
- 纪律：脚本里加载别人的模块，**必须同时写进自己的 `composition`**；共享产物必须显式登记。

## 10. 执行层多实例（REQ-BUTLER-MULTIINSTANCE-028）
- 分档扫描：`python3 skills/classify-instance-safety/scripts/classify_instance_safety.py --all --json`
- 写声明表：`python3 skills/classify-instance-safety/scripts/classify_instance_safety.py --all --write` → `docs/operations/instance-safety.json`
- 声明一致性断言：`python3 skills/verify-instance-safety/scripts/verify_instance_safety.py`
- 三档：`safe_multi`（无状态幂等，可无锁并发）/ `needs_lock`（同资源键须持锁，必须带 `resource_keys`）/ `single_only`（写固定路径或读全局可变状态，必须串行）。
- 边界：真正起实例是宿主 `subagent` / 后台 job 的能力，本层只做**准入判定**。

## 11. 并行调控锁（REQ-BUTLER-PARALLELLOCK-029）
- 声明并归一化锁集合：`python3 skills/declare-lock-set/scripts/declare_lock_set.py --from-json <tasks.jsonl> --json`
- 冲突 / 死锁 / 超时检测：`python3 skills/detect-lock-conflict/scripts/detect_lock_conflict.py --from-json <tasks.jsonl> --json`
- 派单前断言：`python3 skills/verify-no-lock-violation/scripts/verify_no_lock_violation.py --from-json <tasks.jsonl>`
- 四条硬规则：锁粒度 = **共享资源键**；加锁顺序 = **字典序**（防死锁）；超时 **300 秒**；**无锁共享写为禁止项**。
- 死循环判定**复用 `anti-pattern-policy` 的 AP-01**（连续同 action 同 state ≥5 次），禁止另立判据。

## 12. 物理原子锁（REQ-BUTLER-ATOMICLOCK-030）
- 真获取锁（lease 模式，跨命令存活）：`python3 skills/acquire-atomic-lock/scripts/atomic_lock.py acquire --key <资源键> --timeout 300`
- 按 token 释放：`python3 skills/acquire-atomic-lock/scripts/atomic_lock.py release --key <资源键> --token "<pid:start_ticks>"`
- 包住一条命令（live 模式，自动强制，退出码透传）：`python3 skills/acquire-atomic-lock/scripts/atomic_lock.py run --key <资源键> -- <命令…>`
- 锁体检：`python3 skills/acquire-atomic-lock/scripts/atomic_lock.py status --lock-root /tmp/dsh-atomic-locks`
- 互斥压测（三段证据，放行判据）：`python3 skills/verify-atomic-mutual-exclusion/scripts/verify_mutual_exclusion.py --workers 16 --rounds 20 --json`
- 七条硬口径：载体 = `mkdir` 原子目录 / 锁键 = `realpath` 绝对路径 / 加锁顺序 = 字典序 / 持有者 = `pid` + `start_ticks` / 超时 = 300 秒 / 陈旧可回收 / 释放必达。
- 两种锁模式：`lease`（默认，跨命令存活）与 `live`（`run` 强制，与进程同生共死）——**陈旧判据按模式分档，混用会让互斥失效**。
- **放行判据是三项实数**：持锁段重叠 0 + 无锁对照段看得见并发 + 陈旧锁可回收。缺对照段则重叠 0 不构成证据。

## 13. 能力层命名（REQ-KB-CAPABILITYNAMING-031）
- 唯一真相源：`docs/operations/capability-naming.json`
- 规范人读文档（受管区块）：`docs/operations/capability-naming.md` 与 `全局规则/knowledge/common/capability_naming_spec.md`
- 渲染：`python3 skills/render-capability-naming/scripts/render_naming_spec.py --write --json`
- 漂移检测：`python3 skills/render-capability-naming/scripts/render_naming_spec.py --check --json`
- 四要素：**归属**（谁用它）→ **分类**（六层闭集）→ **做什么**（描述带层级前缀）→ **命名**（由前三者派生）。
- 四种形态：`action`（L2 强制）/ `orchestration`（L3 二者取一）/ `policy`（L1 允许）/ `vendor`（单段厂商名）。
- **禁止双写**：规则表只由 JSON 渲染，人工编辑会在下一次 `--check` 被判漂移。

## 14. 执行层命名体检与整改（REQ-LAYER-NAMINGAUDIT-032）
- 全量体检（含 `file:line`）：`python3 skills/audit-layer-naming/scripts/audit_naming.py --all --json`
- 干跑看影响面：`python3 skills/rename-execution-layer/scripts/rename_layer.py --plan docs/requirements/execution/renames-pkg007.json --dry-run --json`
- 执行整改并重建派生产物：`python3 skills/rename-execution-layer/scripts/rename_layer.py --plan <plan.json> --apply --rebuild --json`
- 三项实数断言：`python3 skills/verify-layer-naming/scripts/verify_naming.py --strict --json`
- 改名**六处同步**：目录名 → catalog id → Frontmatter name → 组装边 → 树与索引五件产物 → docs 与登记表。漏一处即悬空引用。
- 旧名必须按**词边界**扫描：`(?<![a-z0-9-])旧名(?![a-z0-9-])`；子串扫描会把追加后缀式改名的新名误报为残留。
- 改名台账：`docs/operations/retired-names.json`（含 `allowed_contexts` 显式允许清单，逐文件带理由）。
- 重建链唯一真相源：`docs/operations/rebuild-chain.json`（整改器不硬编码 `skills/<id>/scripts/` 路径）。

## 15. 派生产物重建链
- 顺序：`sync_catalog` → `build_layer_graph` → `build_inverted_index` → `classify_instance_safety` → `build_execution_tree`
- 任何执行层新增 / 删除 / 改名之后必须按序全跑一遍，否则树与索引会与 catalog 漂移。

## 16. 可视化交互四件套（REQ-VISUAL-ZOOMLEVELS-035 / REQ-VISUAL-DOWNLOAD-037）
- 生成（自带 13 档档位表与下载按钮）：`python3 skills/build-image-viewer/scripts/build_viewer.py --image a.png --out viewer.html`
- 放行判据（26 项断言）：`python3 skills/verify-interactive-html/scripts/verify_html.py --file viewer.html --json`
- 唯一口径源：`skills/zoom-level-policy/SKILL.md`（档位表 / 吸附 / 三段降级 / 白名单）
- 档位：`0.25 0.33 0.50 0.67 0.75 1.00 1.25 1.50 2.00 3.00 4.00 6.00 8.00`，默认 **100%**；`+`/`-` 跳相邻档，滚轮连续微调后按**对数距离**吸附。
- 下载三段降级：`showSaveFilePicker` → Blob + `<a download>` → 就地提示（**禁止静默无反应**）。
- 白名单按产物类型二分：图片型 `png/jpg/jpeg/svg/webp`；HTML 海报型 `html`。
- 机器可读属性：`data-zoom-level` / `data-zoom-levels` / `data-zoom-default` / `data-zoom-snap` / `data-zoom-current` / `data-download` / `data-download-name`。

## 17. 插件常显调控按钮（REQ-PLUGIN-QUICKCONTROL-036）
- 构建 bundle（内联注入内核）：`python3 plugins/dsh-plugin-control-jump/build_client.py`
- 干跑装配：`python3 skills/install-client-plugin/scripts/install_plugin.py --profile web`
- 装配：`python3 skills/install-client-plugin/scripts/install_plugin.py --profile web --apply --json`
- 回滚：`python3 skills/install-client-plugin/scripts/install_plugin.py --profile web --rollback`
- 放行判据（静态 13 + 运行时 18 = 31 项）：`python3 skills/verify-plugin-control-button/scripts/verify_plugin_button.py --all --json`
- 按钮契约：`data-control-jump="<plugin-id>"`；去重键 `容器标识|插件 id`；**无 id 绝不注入**。
- 导航三级降级：宿主钩子 → 定位/点击原生导航 + 高亮 → 复制 id 并就地提示（第三级永远可用）。
- **生效条件**：新增插件的 bundle 注册表在宿主启动时读取 → **需重启宿主，只刷新页面不够**。
- 唯一口径源：`skills/plugin-control-jump-policy/SKILL.md`。

## 18. 执行层多源检索（REQ-SEARCH-MULTISOURCE-038）
- 四源调度（本地优先，推荐默认）：`python3 skills/dispatch-skill-search/scripts/dispatch_search.py --query "<词>" --json`
- 本地未命中且确需外呼：加 `--allow-network`（未认证 GitHub Search API 实测 **10 次/分钟**）
- GitHub 源：`python3 skills/search-github-skill/scripts/search_skill.py --online --query "<词>" --probe-scripts`
- 官网源：`python3 skills/search-official-source/scripts/search_official.py --query "<词>" --domain <官方域名>`
- 去重归一：`python3 skills/merge-search-candidates/scripts/merge_candidates.py --from a.json --from b.json`
- 源顺序：`local` → `github` → `official-site` → `awesome-list`；**本地命中即短路**并留痕 `skipped_sources`。
- 失败语义：**空检索不是通过**（合并后为空退 1）；**检索失败不是没找到**（限流/网络错误必须显式失败）。
- 唯一口径源：`skills/multi-source-search-policy/SKILL.md`。

