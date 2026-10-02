#!/usr/bin/env bash
set -e

# 项目初始化快速通道脚本 (Project Initialization Scaffold Script)
# 用法: ./scripts/init_project.sh <项目根目录> [项目名称] [项目描述]

TARGET_DIR="${1:-.}"
PROJECT_NAME="${2:-$(basename "$(cd "$TARGET_DIR" 2>/dev/null && pwd || echo "$TARGET_DIR")")}"
PROJECT_DESC="${3:-标准化工程脚手架项目}"

echo "🚀 [快速通道] 正在执行项目初始化..."
echo "📂 目标路径: $TARGET_DIR"
echo "📦 项目名称: $PROJECT_NAME"

# 1. 创建骨架核心目录
mkdir -p "$TARGET_DIR/rules"
mkdir -p "$TARGET_DIR/docs"
mkdir -p "$TARGET_DIR/scripts"
mkdir -p "$TARGET_DIR/templates"
mkdir -p "$TARGET_DIR/memory"

# 2. 生成各目录防丢占位符
for dir in rules docs scripts templates memory; do
  if [ ! -f "$TARGET_DIR/$dir/.gitkeep" ]; then
    touch "$TARGET_DIR/$dir/.gitkeep"
  fi
done

# 3. 生成基础 .gitignore
if [ ! -f "$TARGET_DIR/.gitignore" ]; then
  cat <<'EOF' > "$TARGET_DIR/.gitignore"
# 临时与缓存文件
.DS_Store
*.tmp
*.log
node_modules/
dist/
build/
.cache/
EOF
  echo "✅ 已生成基础 .gitignore"
fi

# 4. 生成基础 .gitattributes
if [ ! -f "$TARGET_DIR/.gitattributes" ]; then
  cat <<'EOF' > "$TARGET_DIR/.gitattributes"
* text=auto eol=lf
*.sh text eol=lf
*.mjs text eol=lf
*.md text eol=lf
EOF
  echo "✅ 已生成基础 .gitattributes"
fi

# 5. 生成基础需求文档 (带 v1.0.0 基线版本)
REQ_FILE="$TARGET_DIR/docs/requirements.md"
if [ ! -f "$REQ_FILE" ]; then
  DATE_NOW=$(date +%Y-%m-%d)
  cat <<EOF > "$REQ_FILE"
# 需求管理台账 (Requirements Ledger)

> ### 🏷️ **版本信息与实施追踪**
> - **当前系统实施总版本**：\`v1.0.0\`
> - **最后同步时间**：${DATE_NOW}
> - **版本状态**：\`[Release 稳定生效]\`

本文档是本项目的核心需求管理台账。所有功能特性的提出、迭代与验证均在此对齐。

---

## 📋 结构化需求明细表

### REQ-001: 项目标准化结构与基础版本初始化
- **当前状态**：\`[ACTIVE]\` 生效中
- **实施版本**：\`v1.0.0\`
- **提出时间**：${DATE_NOW}
- **核心诉求与目标**：
  1. 初始化标准目录骨架与关键防丢文件；
  2. 固化 v1.0.0 基础版本号与需求台账基线；
  3. 提供后续任务快速调用与敏捷迭代的承载底座。
- **验收标准**：
  - [x] 目录骨架与防丢文件齐备；
  - [x] 初始需求台账与版本号建立完毕。
EOF
  echo "✅ 已生成基础需求管理台账: docs/requirements.md (基线版本: v1.0.0)"
fi

# 6. 生成基础 README.md
README_FILE="$TARGET_DIR/README.md"
if [ ! -f "$README_FILE" ]; then
  cat <<EOF > "$README_FILE"
# ${PROJECT_NAME}

> ${PROJECT_DESC}

## 📌 项目定位
本项目由「项目初始化」快速通道自动化构建，遵循标准化工程规范与语义化版本管理。

## 📁 目录结构
\`\`\`text
rules/       项目规约与执行标准
docs/        需求台账与技术文档 (docs/requirements.md)
scripts/     自动化执行与检查脚本
templates/   模板资产
memory/      经验沉淀与跨会话记忆
\`\`\`

## 🏷️ 版本基线
- 初始版本：\`v1.0.0\`
EOF
  echo "✅ 已生成项目说明文档: README.md"
fi

# 7. 生成 CLI 规划清单（REQ-097 / R4：立项就要把 CLI 规划进去，方便 AI 调用）
# 为什么放在初始化里：事后补 CLI 一定返工；立项时先把"怎么被调用"写下来，
# 后面每加一个能力就往表里补一行，判定器 scripts/cli_plan_audit.mjs 会核对表里路径是否真实存在。
CLI_PLAN_FILE="$TARGET_DIR/CLI_PLAN.md"
if [ ! -f "$CLI_PLAN_FILE" ]; then
  TEMPLATE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/templates/cli_plan_template.md"
  if [ -f "$TEMPLATE_FILE" ]; then
    sed "s/<项目名>/${PROJECT_NAME}/g" "$TEMPLATE_FILE" > "$CLI_PLAN_FILE"
    echo "✅ 已从模板生成 CLI 规划清单: CLI_PLAN.md"
  else
    cat <<EOF > "$CLI_PLAN_FILE"
# CLI 规划清单 (CLI Plan) —— ${PROJECT_NAME}

**需求依据**：\`REQ-097\` / R4（项目开启时把 CLI 规划进去，方便 AI 调用）

## 📋 能力清单（立项先写第一行，后面每加一个能力补一行）

| 能力名 | 一条可跑命令 | 接口契约位置 | 并行口径 | 反例（不许做什么） |
| :--- | :--- | :--- | :--- | :--- |
| 待补 | 待补（必须是一条真能跑的命令） | 待补（目录型 \`<单元>/interface.json\` 或文件型 \`scripts/interfaces/<脚本名>.interface.json\`） | readonly / shared / exclusive | 待补 |

## 🔍 判定入口

\`\`\`bash
node scripts/cli_plan_audit.mjs --project .
\`\`\`

退出码：0 三条全过（清单在位 · 命令真实存在 · 契约在位）· 1 不达标 · 2 取不到证据。
EOF
    echo "✅ 已生成 CLI 规划清单: CLI_PLAN.md"
  fi
fi

echo "🎉 [快速通道] 项目初始化完成！基线版本 v1.0.0 已就绪，已具备快速调用与优化迭代条件。"
