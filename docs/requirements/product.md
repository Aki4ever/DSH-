# 产品需求规范 (REQ-SKILLPOOL-001)

## 1. 产品形态与定位
- **产品名称**：Skill池 (Skill Pool)
- **定位**：DSH / Codex 本地 Skill 资产与集合管理仓库
- **形态**：Git 驱动的规范化 Skill 资产集合仓库 + 轻量级管理 CLI (`bin/skill-pool`)
- **当前版本**：v0.1.0 (MVP)

## 2. 目标用户与核心价值
- **目标用户**：使用 DSH (DeepSeek Harness) 或 Codex 进行智能体开发、使用自定义 Skill 的开发者。
- **核心问题**：
  - 本地 Skill 分散在 `~/.codex/skills/` 或各项目临时目录中，缺乏统一版本控制与备份；
  - 缺乏统一的标准规范检测，Skill 结构不一、容易缺少描述或关键文件；
  - 缺乏跨环境（如从本仓库一键软链/同步至 Codex/DSH）的轻量管理工具。
- **核心价值**：
  - 集中归档：统一存储在 `skills/<skill-name>/`，由 Git 跟踪迭代；
  - 规范统一：遵循标准 Skill 目录结构规范（`SKILL.md`、`README.md`、`scripts/` 等）；
  - 快速分发：提供 `skill-pool` CLI 工具，支持一键列表、规范校验、软链同步与状态自检。

## 3. 核心功能与模块规划 (MVP)

### 3.1 资产目录结构 (skills/)
- 标准 Skill 目录格式：
  ```text
  skills/
  └── <skill-name>/
      ├── SKILL.md       # 技能元数据与核心 System Prompt 引导规范（必需）
      ├── README.md      # 使用说明、入参示例与依赖环境（推荐）
      ├── scripts/       # 脚本目录（可选）
      └── references/    # 附带参考文档或模板资产（可选）
  ```
- 提供一个标准的 Skill 模板 `skills/_template/`，方便快速新建 Skill。

### 3.2 管理 CLI (bin/skill-pool)
- **实现语言**：Python 3（零额外 pip 依赖，纯标准库）。
- **核心命令**：
  - `list`：列出仓库内所有已登记的 Skill 及其标题与描述简况。
  - `validate [skill-name]`：校验指定或全部 Skill 是否符合标准结构与命名规范。
  - `status`：显示当前仓库 Skill 统计以及本地环境（如 `~/.codex/skills/`）的链接同步状态。
  - `link <skill-name>`：将指定的 Skill 以软链接 (symlink) 形式发布到目标运行环境目录（支持 `--target`，默认 `~/.codex/skills`）。
  - `unlink <skill-name>`：安全解除软链接。
  - `init <skill-name>`：根据标准模板初始化一个新的 Skill 目录。

### 3.3 交付验收标准
1. Git 仓库已正确初始化并具备完整的工程规范骨架（requirements, cli, operations, research, knowledge, problem-log）。
2. `skills/` 具备标准化说明与 `_template/` 样例。
3. `bin/skill-pool` 可执行且通过单元自测（list / validate / status / init / link 均可正常响应）。
4. `docs/cli/` 具备详尽的命令设计文档与使用范例。
5. 代码与文档通过 Git 首个规范提交，并成功推送到 GitHub 远程私有仓库（需确认 gh 认证）。
