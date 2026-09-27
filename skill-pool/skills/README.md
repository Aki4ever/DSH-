# Skills 资产目录

本目录是本仓库的核心资产存储区，统一集中管理所有经规范化沉淀的 Agent Skill。

## 目录结构规范

每个 Skill 必须以独立子目录形式存在，目录名为小写中划线命名（kebab-case），如 `my-awesome-skill`：

```text
skills/
├── _template/             # 新建 Skill 模版（不视作具体技能）
├── <skill-name>/
│   ├── SKILL.md          # 技能核心契约与指令说明（必须）
│   ├── README.md         # 详细使用指南、依赖与示例（强烈推荐）
│   ├── scripts/          # 配套执行脚本或测试用例（可选）
│   └── references/       # 参考文档、Prompt 片段、Schema 定义（可选）
```

## 核心文件规范

### 1. `SKILL.md`（必须）
- 必须包含标准 YAML Frontmatter，声明 `name` 和 `description`。
- `name`：与目录名保持一致的 kebab-case 字符串。
- `description`：简明扼要的一句话意图触发说明（帮助 Agent 在上千技能中准确路由）。
- 正文：包含 Overview（概述）、Workflow/Instructions（详细工作流）、Examples（交互范例）及 Boundaries（边界与约束）。

### 2. `README.md`（推荐）
- 面向人类开发者或用户的文档，说明适用平台（DSH / Codex）、前置条件、依赖项、测试运行方法及已知限制。

## 使用 CLI 管理
你可以使用仓库内置的 `bin/skill-pool` 命令快速管理本目录中的 Skill：
```bash
# 列出所有技能
./bin/skill-pool list

# 校验技能规范
./bin/skill-pool validate

# 基于模版初始化新技能
./bin/skill-pool init <new-skill-name>

# 软链接发布至本地环境
./bin/skill-pool link <skill-name>
```
