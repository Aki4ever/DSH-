# 需求执行包索引

## 执行包清单

| 执行包编号 | 关联需求 | 目标 | 状态 | 负责人 |
| --- | --- | --- | --- | --- |
| PKG-001 | REQ-SKILLPOOL-001 | 初始化工程基线、规范目录、CLI与远程仓库推送 | 进行中 | Codex |
| PKG-002 | REQ-BUTLER-FISSION-014 → CONSISTENCY-010 → DUALFLOW-013 → VIEWER-011 → IMPORT-012 | 管家演进包：粒度门禁、口径单一真相源、双流程分流、可缩放查看器、GitHub 技能引入（19 个新技能 + 1 个 CLI 子命令） | 已完成 | `dsh-butler` (L4) |
| PKG-003 | REQ-BUTLER-RETRIEVAL-017 → ONDEMAND-015 → TOKENBUDGET-018 → PROGRESS-016 | 管家管控优化包：Google 式检索、按需调用、token 结构性下降 ≥40%、过程输出里程碑化（22 个新技能） | 已交付 | `dsh-butler` (L4) |
| PKG-004 | REQ-BUTLER-TREE-020 → ZHFLOW-019 → ANTIPATTERN-021 → HOTRELOAD-022 | 管家管控强化包：六执行层树状化与单一真相源、全流程中文探针、反例层 AP-01~07、零重启判定（17 个新技能） | 已交付 | `dsh-butler` (L4) |
| PKG-005 | REQ-BUTLER-QUANTIFY-023 → CONCRETIZE-024 → ONESHOT-025 | 表达量化包：程度词四要素量化、含糊词具像化、一次性解决不反复提问（15 个新技能） | 已交付 | `dsh-butler` (L4) |
| PKG-006 | REQ-BUTLER-DECOUPLE-027 → MULTIINSTANCE-028 → PARALLELLOCK-029 | 执行层解耦与并行治理包：依赖图与隐式耦合检测、实例安全准入、并行锁与死锁检测（14 个新技能） | 已交付 | `dsh-butler` (L4) |
| PKG-007 | REQ-BUTLER-ATOMICLOCK-030 → KB-CAPABILITYNAMING-031 → LAYER-NAMINGAUDIT-032 → REPO-MERGE-033 → REPO-GITPUBLISH-034 | 原子锁、能力层命名规范与存量整改、目录合并与任务会话迁移、git 推送（10 个新技能 + 6 项产物） | 已交付 | `dsh-butler` (L4) |
| PKG-008 | REQ-VISUAL-ZOOMLEVELS-035 → VISUAL-DOWNLOAD-037 → SEARCH-MULTISOURCE-038 → PLUGIN-QUICKCONTROL-036 | 可视化多级缩放与下载、四源检索、插件常显调控按钮（11 个新执行层，含全池第一个 plugin 层） | 已交付 | `dsh-butler` (L4) |
| PKG-009 | REQ-GCM-GAPFIX-041 → PROCESS-SUPERVISOR-040 → REPO-MERGE-039 | 缺口修复、流程监督员、迁移收尾（8 个新执行层，含首个 agent 层自定义执行层） | 已交付 | `dsh-butler` (L4) |

## 执行明细

| 执行包 | 明细文件 | 测试用例文件 |
| --- | --- | --- |
| PKG-002 | [pkg-002-butler-evolution.md](./pkg-002-butler-evolution.md) | [testcases-butler-evolution.md](./testcases-butler-evolution.md) |
| PKG-003 | [pkg-003-butler-governance.md](./pkg-003-butler-governance.md) | [testcases-butler-governance.md](./testcases-butler-governance.md) |
| PKG-004 | [pkg-004-butler-hardening.md](./pkg-004-butler-hardening.md) | [testcases-butler-hardening.md](./testcases-butler-hardening.md) |
| PKG-005 | [pkg-005-butler-quantify.md](./pkg-005-butler-quantify.md) | [testcases-butler-quantify.md](./testcases-butler-quantify.md) |
| PKG-006 | [pkg-006-butler-parallel.md](./pkg-006-butler-parallel.md) | [testcases-butler-parallel.md](./testcases-butler-parallel.md) |
| PKG-007 | [pkg-007-naming-merge.md](./pkg-007-naming-merge.md) | [testcases-naming-merge.md](./testcases-naming-merge.md) |
| PKG-008 | [pkg-008-interaction-plugins.md](./pkg-008-interaction-plugins.md) | [testcases-interaction-plugins.md](./testcases-interaction-plugins.md) |
| PKG-009 | [pkg-009-migration-supervisor.md](./pkg-009-migration-supervisor.md) | [testcases-migration-supervisor.md](./testcases-migration-supervisor.md) |
