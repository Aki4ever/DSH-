# 全局规则工程 (Global Rules Project)

本项目用于集中管理、统一维护智能体与系统运行的各类规则、工作流程、模板资产以及需求台账。

---

## 📁 目录与核心规则速查

```text
.
├── rules/                           # 核心规则目录
│   ├── system/                      # 系统级基础规则
│   │   ├── meta_rules.md            # 系统最高元规则（双向同步/查重/全中文/联动排查/安全自律/优先级）
│   │   ├── thinking_framework.md    # 搜索引擎逻辑映射与智能体六步思考决策管道
│   │   ├── language_standard.md     # 全文档中文化与通俗直白表达规范
│   │   └── initialization_protocol.md # 会话自检与目录一键初始化协议
│   ├── workflow/                    # 流程协同规范
│   │   ├── change_flow.md           # 规则与需求变更六步工作流
│   │   ├── audit_and_cleanup.md     # 规则更新联动排查与存量资源治理规范
│   │   └── component_naming.md      # 标准组件中文指代与架构命名规范
│   ├── coding/                      # 代码与工程规范
│   └── security/                    # 安全防护与红线准则
├── docs/                            # 项目说明与核心台账
│   ├── requirements.md              # 独立核心需求管理台账（REQ-xxx 卡片记录）
│   └── rules_tutorial.md            # 全局规则运转教学指南与图解
├── templates/                       # 标准模板资产
│   ├── requirement_template.md      # 结构化需求标准卡片模板
│   └── directory_readme_template.md # 目录专属说明标准模板
├── scripts/                         # 自动化辅助工具
│   └── init_dir.sh                  # 目录一键自动化初始化脚本
├── .gitignore                       # 版本管理忽略规则
├── .gitattributes                   # 文本换行与格式配置
└── README.md                        # 工程主说明文档
```

---

## 🚀 核心工作规程与快速上手

### 1. 每次开始任务时的“自检四步法”
无论何时开启会话或打开文档，第一步均执行：
1. **查权限**：核对沙箱读写权限与当前免审批状态；
2. **看元规**：阅读 `rules/system/meta_rules.md` 确认最高约束；
3. **查台账**：查看 `docs/requirements.md` 了解需求当前进展；
4. **查版本**：核对 Git 状态，保证在干净的 main 分支工作。

### 2. 规则变动六步循环
遵循 `rules/workflow/change_flow.md` 开展任何规则操作：
`接收意图 ➔ 查重拦截 ➔ 登记台账 ➔ 编写规则 ➔ 联动排查 ➔ 提交推送`

### 3. 新建目录一键初始化
新建文件夹后，只需输入 `初始化 <目录路径>`（或直接运行 `./scripts/init_dir.sh <目录路径> [说明]`），系统会自动创建占位符 `.gitkeep`、生成标准 `README.md` 并完成结构登记。

### 4. 表达风格准则
依据 `rules/system/language_standard.md`，所有交付汇报与工程文档必须使用规范中文，语言通俗直白、结构简单，坚决杜绝生僻字与故弄玄虚的黑话。
