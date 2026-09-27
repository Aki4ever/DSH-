# CLI 架构与命令设计

## 1. 核心定位
提供纯本地、零外部依赖的轻量 CLI，支持开发者对 `skills/` 下的 Agent Skill 进行规范检查、状态统计、脚手架初始化以及与本地 Codex / DSH 运行时环境的软链发布。

## 2. 设计原则
- **零额外依赖**：全量使用 Python 3 标准库，开箱即用。
- **机器可读**：所有子命令均提供 `--json` 选项，方便其他脚本或 Agent 工具调用解析。
- **安全第一**：在 `link` / `unlink` 涉及目标环境文件系统写操作时，严格只处理软链接，禁止未经用户显式确认删除用户原有的非软链实体文件。
- **命名契约**：严格要求 Skill 目录命名为规范的 kebab-case，且与 `SKILL.md` frontmatter 中的 `name` 严格一致。

## 3. 核心命令矩阵

| 命令 | 核心功能 | 对应设计文档 |
| --- | --- | --- |
| `skill-pool list` | 列出仓库内所有 Skill 及同步状态 | [commands/list.md](./commands/list.md) |
| `skill-pool validate` | 校验 Skill 规范完整性与合法性 | [commands/validate.md](./commands/validate.md) |
| `skill-pool status` | 显示仓库与本地环境的整体统计数据 | [commands/status.md](./commands/status.md) |
| `skill-pool init` | 从 `_template/` 复制并初始化新技能 | [commands/init.md](./commands/init.md) |
| `skill-pool link` | 建立软链至指定目标运行环境 | [commands/link.md](./commands/link.md) |
| `skill-pool unlink` | 解除指定技能的软链 | [commands/unlink.md](./commands/unlink.md) |

## 4. 远期规划能力 (Out of Scope for MVP)
- `skill-pool pull <url>`：从远程 GitHub 仓库直接下载单个 Skill 到本地；
- `skill-pool publish`：将本地自研 Skill 发布至组织中心或 SkillHub。
- 排除理由：MVP 优先保障本地归档、规范校验与本地运行环境同步，远程生态集成留待后续演进。
