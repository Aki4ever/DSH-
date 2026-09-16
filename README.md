# 全局规则工程 (Global Rules Project)

本项目用于集中管理、统一维护智能体与系统运行的各类规则、工作流程、模板资产、能力索引以及需求台账。

---

## 📁 目录与核心架构全景速查

```text
.
├── rules/                           # 核心规则目录
│   ├── system/                      # 【系统级基础规则】
│   │   ├── meta_rules.md            # 系统最高元规则（双向同步/查重/全中文/联动排查/安全自律/双轨分流）
│   │   ├── thinking_framework.md    # 搜索引擎逻辑映射与智能体六步思考决策管道
│   │   ├── language_standard.md     # 全文档中文化与通俗直白表达规范
│   │   └── initialization_protocol.md # 会话开箱自检与目录一键初始化协议
│   ├── workflow/                    # 【流程协同规范】
│   │   ├── task_execution_flow.md   # 快慢双轨分流、100分制打分、8字标题与自动重命名规范
│   │   ├── change_flow.md           # 规则与需求变更六步工作流
│   │   ├── audit_and_cleanup.md     # 联动排查、存量资源治理与结构冗余去重规范
│   │   └── component_naming.md      # 标准组件中文指代与架构命名规范
│   ├── coding/                      # 代码与工程规范
│   └── security/                    # 安全防护与红线准则
├── indexes/                         # 【能力与接口索引层】
│   ├── dsh_capabilities.md          # DSH 宿主基座全景能力与系统机制索引
│   ├── tool_interfaces.md           # 全量插件与工具标准接口矩阵封装
│   ├── rules_index.md               # 全局规则体系与流程全景总索引
│   └── README.md                    # 索引层专属说明文档
├── memory/                          # 【长短期记忆中枢】
│   ├── context_memory.md            # 全局上下文约定、用户偏好与运行基线
│   ├── lessons_learned.md           # 实战排查沉淀的避坑指南与底层机制认知
│   └── README.md                    # 记忆层专属说明文档
├── docs/                            # 【说明与核心台账】
│   ├── requirements.md              # 独立核心需求管理台账（REQ-001 ~ REQ-015 闭环记录）
│   └── rules_tutorial.md            # 全局规则运转教学指南与图解
├── templates/                       # 【标准模板资产】
│   ├── requirement_template.md      # 结构化需求标准卡片模板
│   └── directory_readme_template.md # 目录专属说明标准模板
├── scripts/                         # 【自动化辅助工具】
│   ├── rename_session.sh            # 会话一键重命名并锁定 RPC 脚本
│   └── init_dir.sh                  # 目录一键自动化初始化脚本
├── .gitignore                       # 版本管理忽略规则
├── .gitattributes                   # 文本换行与格式配置
└── README.md                        # 工程主说明文档
```

---

## 🚀 核心工作规程与快速上手

### 1. 任务启动自检六步法
每次开启任务或新会话，第一步按顺序自检：
1. **查权限**：核对沙箱读写模式与免审批状态（`Approval: never`）；
2. **看元规**：阅读 `rules/system/meta_rules.md` 明确最高准则与双轨分流；
3. **查台账**：检索 `docs/requirements.md` 了解需求当前进展与边界；
4. **读记忆**：读取 `memory/` 目录继承跨会话偏好与避坑经验；
5. **定轨道**：依据 100 分制打分判定走快速轻量流还是标准完备流；
6. **查版本**：核对 Git 状态，保证在干净的 main 分支工作。

### 2. 快慢双轨分流与会话重命名
依据 `rules/workflow/task_execution_flow.md` 执行任务：
- **快速轻量流 (≤35分)**：单点文字微调、查阅问答走轻量三步（【探】➔【攻】➔【归】），快速交付；
- **标准完备流 (>35分)**：复杂重构与规则研发严格走标准六步闭环，首轮定标立即调用 `./scripts/rename_session.sh "[分类编号][难度分] 8字概述"` 锁死标题，并开启视口吸顶组件；
- **任务分类与 8 字概述**：`[R/F/D/S/O/Q 编号][100分制打分] 概述(≤8字)`。

### 3. 插件调用与能力索引
- 查询 DSH 宿主机制请看 [`indexes/dsh_capabilities.md`](indexes/dsh_capabilities.md)；
- 查阅所有工具入参和返回值规范请看 [`indexes/tool_interfaces.md`](indexes/tool_interfaces.md)；
- 规则速查请看 [`indexes/rules_index.md`](indexes/rules_index.md)。

### 4. 规则变动六步循环与去重
遵循 `rules/workflow/change_flow.md` 开展任何规则操作：
`接收意图 ➔ 查重拦截 ➔ 登记台账 ➔ 编写规则 ➔ 联动排查 ➔ 提交推送`
若有同类规则或模板，遵循 `rules/workflow/audit_and_cleanup.md` 严格执行增量合并，杜绝碎片化冗余。

### 5. 新建目录一键初始化
新建文件夹后输入 `初始化 <目录路径>`（或直接运行 `./scripts/init_dir.sh <目录路径> [说明]`），系统会自动生成 `.gitkeep`、标准 `README.md` 并完成结构登记。

### 6. 表达风格准则
依据 `rules/system/language_standard.md`，所有交付汇报与工程文档必须使用规范中文，通俗直白、结构简单，坚决杜绝生僻字与故弄玄虚的黑话。
