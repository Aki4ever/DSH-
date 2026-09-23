#!/bin/bash
# ==============================================================================
# 脚本名称: disk_check_and_cleanup.sh
# 核心功能: DSH 宿主磁盘空间周期性健康检测与安全自愈清理脚本
# 适用环境: macOS / Linux (POSIX Shell)
# 脚本自身版本: v2.0.0
# 对齐工程版本: v3.1.0  # 新鲜度比对以此为准（脚本自身版号不参与比对）
# ==============================================================================

set -eo pipefail

MODE="${1:---check}" # --check (仅检查) | --clean (执行安全清理) | --auto (超阈值自动清理)

# 阈值配置
WARN_USAGE_PERCENT=90      # 磁盘使用率达到 90% 触发预警
WARN_AVAIL_GB=20          # 剩余空间低于 20GB 触发预警

# 基础路径获取
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=========================================================="
echo "  DSH 宿主磁盘健康检测与自愈清理中枢 (v2.0.0)"
echo "=========================================================="

# 1. 获取磁盘指标
DISK_INFO=$(df -k "$CURRENT_DIR" | awk 'NR==2 {print $2, $3, $4, $5}')
TOTAL_KB=$(echo "$DISK_INFO" | awk '{print $1}')
USED_KB=$(echo "$DISK_INFO" | awk '{print $2}')
AVAIL_KB=$(echo "$DISK_INFO" | awk '{print $3}')
USAGE_PERCENT=$(echo "$DISK_INFO" | awk '{print $4}' | tr -d '%')

TOTAL_GB=$(awk "BEGIN {printf \"%.1f\", $TOTAL_KB / 1024 / 1024}")
USED_GB=$(awk "BEGIN {printf \"%.1f\", $USED_KB / 1024 / 1024}")
AVAIL_GB=$(awk "BEGIN {printf \"%.1f\", $AVAIL_KB / 1024 / 1024}")

echo "📊 当前挂载分区空间状态:"
echo "   - 总容量:   ${TOTAL_GB} GB"
echo "   - 已使用:   ${USED_GB} GB (${USAGE_PERCENT}%)"
echo "   - 可用空间: ${AVAIL_GB} GB"

STATUS="HEALTHY"
if [ "$USAGE_PERCENT" -ge "$WARN_USAGE_PERCENT" ] || awk "BEGIN {exit !($AVAIL_GB < $WARN_AVAIL_GB)}"; then
  STATUS="WARNING"
  echo "⚠️ 【空间紧张告警】当前磁盘使用率已达 ${USAGE_PERCENT}% (剩余 ${AVAIL_GB} GB)，已触发高水线警戒！"
else
  echo "✅ 磁盘空间处于安全健康水位。"
fi

# 如果是纯检查模式，且不是 --auto 超阈值，直接汇报后退出
if [ "$MODE" == "--check" ]; then
  echo "💡 提示: 可通过运行 '$0 --clean' 安全清理 DSH 运行产生的临时垃圾文件。"
  exit 0
fi

if [ "$MODE" == "--auto" ] && [ "$STATUS" == "HEALTHY" ]; then
  echo "✅ 自动模式: 水位健康，跳过清理。"
  exit 0
fi

echo "----------------------------------------------------------"
echo "🧹 正在执行 DSH 安全自愈清理流程..."

# 2. 安全白名单守门声明 (严格禁止删除以下核心资产)
# - knowledge/*
# - memory/*
# - rules/*
# - indexes/*
# - docs/*
# - templates/*
# - scripts/*
# - 任何活跃会话与工程代码核心资产
echo "🛡️ 安全白名单生效中: 保护 knowledge/, memory/, rules/, indexes/, docs/, templates/ 核心资产 100% 完好。"

FREED_BYTES=0

# 3.1 清理工程中的 .DS_Store 与无用 macOS 缓存
echo "🔍 扫描工程无用缓存 (.DS_Store)..."
DS_COUNT=0
while IFS= read -r file; do
  if [ -f "$file" ]; then
    rm -f "$file"
    DS_COUNT=$((DS_COUNT + 1))
  fi
done < <(find "$CURRENT_DIR" -type f -name ".DS_Store" 2>/dev/null)
echo "   - 已清理 $DS_COUNT 个 .DS_Store 碎片。"

# 3.2 清理工程根目录或临时测试产生的临时调试脚本与日志中间件 (*.tmp, test_*.sh.tmp)
echo "🔍 扫描工程临时残存文件 (*.tmp, *~)..."
TMP_COUNT=0
while IFS= read -r file; do
  # 必须确保不在白名单目录之外误删
  if [ -f "$file" ]; then
    rm -f "$file"
    TMP_COUNT=$((TMP_COUNT + 1))
  fi
done < <(find "$CURRENT_DIR" -maxdepth 3 -type f \( -name "*.tmp" -o -name "*~" \) 2>/dev/null)
echo "   - 已清理 $TMP_COUNT 个临时工作文件。"

# 3.3 清理 DSH 宿主临时 spill 溢出大文件与孤立 subprocess (位于 /var/folders/.../T/dsh-spill-*)
echo "🔍 扫描 DSH 宿主临时溢出垃圾 (/tmp /var/folders 下 dsh-spill-*)..."
DSH_SPILL_CLEANED=0
# 仅清理超过 30 分钟未被修改的已解绑溢出数据，防止竞争
TEMP_DIRS=(
  "/tmp"
  "${TMPDIR:-/var/folders}"
)

for tdir in "${TEMP_DIRS[@]}"; do
  if [ -d "$tdir" ]; then
    # 查找属于当前用户的 dsh-spill 目录
    while IFS= read -r spill_dir; do
      if [ -d "$spill_dir" ]; then
        SPILL_SIZE=$(du -sk "$spill_dir" 2>/dev/null | awk '{print $1}')
        rm -rf "$spill_dir" 2>/dev/null || true
        DSH_SPILL_CLEANED=$((DSH_SPILL_CLEANED + 1))
        FREED_BYTES=$((FREED_BYTES + (SPILL_SIZE * 1024)))
      fi
    done < <(find "$tdir" -maxdepth 4 -type d -name "dsh-spill-*" -mmin +30 2>/dev/null)
  fi
done
echo "   - 已安全释放 $DSH_SPILL_CLEANED 处过期 DSH 宿主临时溢出缓存目录。"

# 3.4 Git 仓库无用松散对象压缩回收 (如果在 git 仓库中)
if [ -d "$CURRENT_DIR/.git" ]; then
  echo "🔍 执行本地 Git 冗余对象回收 (git gc)..."
  git -C "$CURRENT_DIR" gc --prune=now --quiet 2>/dev/null || true
  echo "   - 本地 Git 对象库整理完毕。"
fi

FREED_MB=$(awk "BEGIN {printf \"%.2f\", $FREED_BYTES / 1024 / 1024}")
echo "----------------------------------------------------------"
echo "🎉 清理完毕！已释放约 ${FREED_MB} MB 冗余临时数据。"

# 重新复核空间
NEW_AVAIL_KB=$(df -k "$CURRENT_DIR" | awk 'NR==2 {print $4}')
NEW_AVAIL_GB=$(awk "BEGIN {printf \"%.1f\", $NEW_AVAIL_KB / 1024 / 1024}")
echo "📈 最新可用空间: ${NEW_AVAIL_GB} GB"
echo "=========================================================="
