# Skill池 (Skill Pool)

> 集中管理、版本控制、规范校验与跨环境软链分发的 Agent Skill 资产集合仓库。

## 🎯 定位与核心价值
- **集中归档**：将日常自研或精选的 DSH / Codex Agent Skill 统一放置在 `skills/` 下，由 Git 提供完备的版本追踪与备份能力；
- **契约规范**：每个 Skill 均配有合规的 `SKILL.md`（带标准 Frontmatter）、`README.md` 以及可选的脚本与参考资料；
- **轻量 CLI**：内置零外部依赖的 Python 3 命令行工具 `skill-pool`，支持一键自检、列表与软链发布至本地 AI 运行时环境。

---

## 📂 项目结构

```text
.
├── AGENTS.md                  # 项目规范与入口登记
├── README.md                  # 项目核心说明
├── bin/
│   └── skill-pool             # 本地 Python 管理 CLI
├── skills/                    # Skill 核心资产池
│   ├── _template/             # 新建 Skill 模版
│   └── README.md              # Skill 目录规范说明
└── docs/                      # 工程与研发文档系统
    ├── requirements/          # 需求索引、基线与执行包
    ├── cli/                   # CLI 设计与详细命令手册
    ├── operations/            # 工作流与规范索引
    ├── research/              # 调研与技术决策记录
    ├── knowledge/             # 提炼沉淀的复用知识
    └── problem-log/           # 缺陷与问题排查台账
```

---

## 🚀 快速上手 (CLI)

```bash
# 1. 查看仓库状态概览
./bin/skill-pool status

# 2. 列出仓库内所有 Skill
./bin/skill-pool list

# 3. 校验 Skill 规范完整性
./bin/skill-pool validate

# 4. 基于标准模版创建新 Skill
./bin/skill-pool init <skill-name> --title "My Skill" --description "Routing description"

# 5. 软链接至本地运行环境（默认 ~/.codex/skills/）
./bin/skill-pool link <skill-name>

# 6. 安全解除软链接
./bin/skill-pool unlink <skill-name>
```

---

## 📖 文档导航
- [需求基线 (docs/requirements/)](docs/requirements/index.md)
- [CLI 设计手册 (docs/cli/)](docs/cli/index.md)
- [开发工作流 (docs/operations/)](docs/operations/workflows.md)
- [Skill 资产规范 (skills/README.md)](skills/README.md)
