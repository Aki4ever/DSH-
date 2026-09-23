#!/bin/bash
# ==============================================================================
# 脚本名称: git_sync_remote.sh
# 核心功能: DSH 工程远程 Git 智能探针、缺地址开页引导、动态摘要提交与强同步引擎
# 适用环境: macOS / Linux (POSIX Shell)
# 脚本自身版本: v2.4.0
# 对齐工程版本: v3.1.0  # 新鲜度比对以此为准（脚本自身版号不参与比对）
# ==============================================================================

set -eo pipefail

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TASK_ID="${1:-REQ-SYNC}"
TASK_TITLE="${2:-工程资产变更同步}"
TASK_SUMMARY="${3:-全量代码与规则资产按最新规范同步至远程 Git 独立仓库}"
REMOTE_NAME="${4:-origin}"

echo "=========================================================="
echo "  DSH 工程远程 Git 强同步与多仓库治理引擎 (v2.4.0)"
echo "=========================================================="
echo "📁 当前受管工程路径: $CURRENT_DIR"
echo "📌 任务代号: $TASK_ID | 概述: $TASK_TITLE"
echo "----------------------------------------------------------"

# 1. 检查是否为 Git 仓库，若不是则自动初始化
if [ ! -d "$CURRENT_DIR/.git" ]; then
  echo "⚠️ 当前目录尚未初始化为 Git 仓库，正在自动初始化..."
  git -C "$CURRENT_DIR" init --quiet
  git -C "$CURRENT_DIR" branch -M main || true
  echo "✅ 本地 Git 仓库初始化完成 (默认分支 main)。"
fi

# 2. 远程地址智能探针 (Remote Probe)
REMOTE_URL=$(git -C "$CURRENT_DIR" remote get-url "$REMOTE_NAME" 2>/dev/null || echo "")

if [ -z "$REMOTE_URL" ]; then
  echo "🚨 【未检测到远程 Git 仓库地址】"
  echo "   当前工程属于独立项目，必须绑定自己专属的远程仓库！"
  echo "----------------------------------------------------------"
  echo "🌐 正在为您打开常用代码托管平台的新建仓库页面..."

  # 根据操作系统尝试自动打开浏览器页面
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open "https://github.com/new" 2>/dev/null || open "https://gitee.com/projects/new" 2>/dev/null || true
  elif [[ "$OSTYPE" == "linux-gnu"* ]] && command -v xdg-open >/dev/null 2>&1; then
    xdg-open "https://github.com/new" 2>/dev/null || true
  fi

  echo ""
  echo "👉 请在打开的浏览器页面中为本工程创建专属独立仓库，或复制已有仓库地址。"
  echo "👉 备用新建仓库直达链接:"
  echo "   • GitHub: https://github.com/new"
  echo "   • Gitee:  https://gitee.com/projects/new"
  echo "   • GitLab: https://gitlab.com/projects/new"
  echo ""
  echo "💡 获取到地址后，请在终端执行绑定口令:"
  echo "   git remote add origin <您的远程仓库地址.git>"
  echo "   然后重新运行本同步脚本: $0 \"$TASK_ID\" \"$TASK_TITLE\" \"$TASK_SUMMARY\""
  echo "----------------------------------------------------------"
  exit 1
fi

echo "🔗 已检测到当前工程专属远端仓库:"
echo "   - 远端标识: $REMOTE_NAME"
echo "   - 远端地址: $REMOTE_URL"
echo "----------------------------------------------------------"

# 3. 检查本地是否有待提交文件变更
STATUS_OUT=$(git -C "$CURRENT_DIR" status --porcelain)

if [ -z "$STATUS_OUT" ]; then
  echo "ℹ️ 本地工作区干净，无新增或修改的文件需要提交。"
else
  echo "🔍 检出工作区存在变更文件，正在暂存..."
  git -C "$CURRENT_DIR" add -A

  # 4. 构造标准动态语义化 Commit Message
  # 格式: <type>(<scope>): [<任务代号>] <任务概述> - <详细变更事实摘要>
  COMMIT_MSG="feat(sync): [$TASK_ID] $TASK_TITLE - $TASK_SUMMARY"
  
  echo "📝 自动合成动态语义化提交说明:"
  echo "   \"$COMMIT_MSG\""
  
  git -C "$CURRENT_DIR" commit -m "$COMMIT_MSG"
  echo "✅ 本地原子化提交完成！"
fi

# 5. 获取当前工作分支
CURRENT_BRANCH=$(git -C "$CURRENT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

echo "🚀 正在强同步推送到远程仓库 [$REMOTE_NAME / $CURRENT_BRANCH]..."

# 6. 推送至远程仓库
if git -C "$CURRENT_DIR" push -u "$REMOTE_NAME" "$CURRENT_BRANCH"; then
  LATEST_HASH=$(git -C "$CURRENT_DIR" rev-parse --short HEAD)
  echo "----------------------------------------------------------"
  echo "🎉 远程 Git 强同步 100% 成功！"
  echo "   - 提交版本哈希 (Commit-Hash): $LATEST_HASH"
  echo "   - 目标远程分支: $REMOTE_NAME/$CURRENT_BRANCH"
  echo "   - 远端追踪链接: $REMOTE_URL"
  echo "=========================================================="
else
  echo "❌ 远程推送失败！请检查网络连通性或远程仓库写权限！"
  exit 1
fi
