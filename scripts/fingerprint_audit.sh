#!/bin/bash
# ==============================================================================
# 脚本名称: fingerprint_audit.sh
# 核心功能: DSH 工程全域资产数字指纹计算、新鲜度嗅探与对齐审计引擎
# 适用环境: macOS / Linux (POSIX Shell)
# 当前版本: v2.3.0
# ==============================================================================

set -eo pipefail

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEDGER_FILE="$CURRENT_DIR/memory/asset_fingerprint_ledger.md"
MODE="${1:---freshness}" # --freshness (新鲜度看盘) | --scan (更新台账) | --verify (验证指纹一致性)

# 1. 获取当前系统基线版本
BASELINE_VERSION=$(grep -m1 "当前系统实施总版本" "$CURRENT_DIR/docs/requirements.md" 2>/dev/null | grep -oE "v[0-9]+\.[0-9]+\.[0-9]+" || echo "v2.3.0")

# 2. 受管核心目录定义
MANAGED_DIRS=(
  "rules"
  "knowledge"
  "indexes"
  "templates"
  "scripts"
  "docs"
  "ai-control"
)

# 2.1 受管根级文件定义
#     根级文件不隶属于任何受管目录，必须单独列出，否则会逃出指纹监控
#     （新增目录也需同步登记到 MANAGED_DIRS，这是人工维护点）
MANAGED_ROOT_FILES=(
  "AGENTS.md"
  "README.md"
)

# 辅助函数: 计算单个文件的 SHA-256 短哈希 (8位)
get_short_hash() {
  local file="$1"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print substr($1, 1, 8)}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print substr($1, 1, 8)}'
  else
    cksum "$file" | awk '{print substr($1, 1, 8)}'
  fi
}

# 辅助函数: 获取文件的最后修改时间 (YYYY-MM-DD HH:MM)
get_mtime() {
  local file="$1"
  local mt=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$file" 2>/dev/null)
  if [ -n "$mt" ]; then
    echo "$mt"
  else
    date -r "$file" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "Unknown"
  fi
}

# 辅助函数: 提取文件头部声明的版本号
get_declared_version() {
  local file="$1"
  local ver=$(head -n 25 "$file" 2>/dev/null | grep -E "版本|version" | grep -m1 -oE "v[0-9]+\.[0-9]+\.[0-9]+" || echo "-")
  if [ -z "$ver" ]; then
    echo "-"
  else
    echo "$ver"
  fi
}

# 扫描并收集所有文件指标
collect_assets() {
  local files=()
  for dir in "${MANAGED_DIRS[@]}"; do
    if [ -d "$CURRENT_DIR/$dir" ]; then
      while IFS= read -r f; do
        if [ -f "$f" ]; then
          # 排除图片二进制与临时文件
          local rel_path="${f#$CURRENT_DIR/}"
          # 排除图片二进制、临时文件与自动生成物
          # （生成物每次运行都变化，纳入指纹监控会造成永久性假漂移）
          if [[ "$rel_path" != assets/* ]] && [[ "$rel_path" != *.png ]] && [[ "$rel_path" != *.svg ]] && [[ "$rel_path" != *.tmp ]] && [[ "$rel_path" != *~ ]] && [[ "$rel_path" != ai-control/reports/* ]]; then
            files+=("$rel_path")
          fi
        fi
      done < <(find "$CURRENT_DIR/$dir" -type f | sort)
    fi
  done
  # 根级受管文件（不隶属任何目录）
  for f in "${MANAGED_ROOT_FILES[@]}"; do
    if [ -f "$CURRENT_DIR/$f" ]; then
      files+=("$f")
    fi
  done
  echo "${files[@]}"
}

# 运行新鲜度统计
run_freshness_report() {
  echo "=========================================================="
  echo "  DSH 工程全域资产新鲜度与数字指纹嗅探引擎 (v2.3.0)"
  echo "=========================================================="
  echo "🎯 当前系统实施总基线版本: ${BASELINE_VERSION}"
  echo "----------------------------------------------------------"

  local all_files=($(collect_assets))
  local total_count=${#all_files[@]}
  local fresh_count=0
  local stale_count=0
  local unversioned_count=0

  local stale_list=()

  for rel_path in "${all_files[@]}"; do
    local full_path="$CURRENT_DIR/$rel_path"
    local decl_ver=$(get_declared_version "$full_path")

    if [ "$decl_ver" == "$BASELINE_VERSION" ]; then
      fresh_count=$((fresh_count + 1))
    elif [ "$decl_ver" != "-" ]; then
      stale_count=$((stale_count + 1))
      stale_list+=("$rel_path ($decl_ver ➔ 待升至 $BASELINE_VERSION)")
    else
      unversioned_count=$((unversioned_count + 1))
    fi
  done

  local fresh_percent=$(awk "BEGIN {printf \"%.1f\", ($fresh_count / $total_count) * 100}")

  echo "📊 全域受管资产新鲜度统计看板:"
  echo "   - 受管资产总数:     $total_count 个文件"
  echo "   - 🟢 完全新鲜 (Fresh): $fresh_count 个 (${fresh_percent}%)"
  echo "   - 🟡 存量落后 (Stale): $stale_count 个"
  echo "   - ⚪ 未声明版本 (None): $unversioned_count 个"
  echo "----------------------------------------------------------"

  if [ "$stale_count" -gt 0 ]; then
    echo "⚠️ 存量落后资产清单 (遵循遇碰即对齐 Touch-and-Align 原则):"
    for item in "${stale_list[@]}"; do
      echo "   • $item"
    done
    echo "----------------------------------------------------------"
    echo "💡 提示: 执行任何任务触碰上述文件时，请顺带将其头版本升级至 ${BASELINE_VERSION}。"
  else
    echo "🎉 完美！工程所有受管资产 100% 对齐当前最新基线 ${BASELINE_VERSION}！"
  fi
  echo "=========================================================="
}

# 生成全量持久化指纹台账
run_scan_and_update_ledger() {
  echo "🔍 正在扫描工程全量受管资产并更新指纹台账..."
  local all_files=($(collect_assets))
  local now=$(date "+%Y-%m-%d %H:%M")

  mkdir -p "$(dirname "$LEDGER_FILE")"

  cat <<EOF > "$LEDGER_FILE"
# 全域资产数字指纹与新鲜度审计台账 (Asset Fingerprint Ledger)

> ### 🏷️ **版本信息与实施追踪**
> - **当前台账版本**：\`${BASELINE_VERSION}\`
> - **基线对齐版本**：\`${BASELINE_VERSION}\`
> - **最后全盘扫描时间**：${now}
> - **自动化引擎**：遵循 [\`scripts/fingerprint_audit.sh\`](../scripts/fingerprint_audit.sh)

本文档记录工程全域受管资产（规则、知识库、架构索引、工程模板、自动化脚本与需求台账）的**数字指纹（SHA-256 8位短哈希）**、**最后修改时间**与**新鲜度等级**，为全域资产对齐与防止暗中代码漂移提供唯一客观事实依据。

---

## 📊 一、新鲜度评级标准与判定矩阵

| 新鲜度评级 | 标识 | 判定准则 | 处置与对齐策略 |
| :--- | :---: | :--- | :--- |
| **完全新鲜 (Fresh)** | 🟢 \`TIER-0\` | 声明版本与系统最新总基线完全一致 (\`${BASELINE_VERSION}\`) | 资产处于最优生效态，免修改直接运行 |
| **存量落后 (Stale)** | 🟡 \`TIER-1\` | 属于正常受管资产，但版本落后于最新基线 | **遇碰即对齐 (Touch-and-Align)**，涉及该模块时顺带升级 |
| **未版本化 (None)** | ⚪ \`TIER-2\` | 无头部版本元数据区，或属于纯代码/脚本辅助文件 | 保持指纹追踪，必要时补充标准版本头部 |

---

## 🧬 二、全域受管资产数字指纹详细记录表

| 资产相对路径 | 短指纹 (SHA-256) | 最后修改时间 | 声明版本 | 新鲜度评级 | 对齐状态 |
| :--- | :---: | :---: | :---: | :---: | :---: |
EOF

  local fresh_count=0
  local stale_count=0
  local none_count=0

  for rel_path in "${all_files[@]}"; do
    local full_path="$CURRENT_DIR/$rel_path"
    local hash=$(get_short_hash "$full_path")
    local mtime=$(get_mtime "$full_path")
    local decl_ver=$(get_declared_version "$full_path")
    local tier=""
    local status=""

    if [ "$decl_ver" == "$BASELINE_VERSION" ]; then
      tier="🟢 TIER-0"
      status="最新基线"
      fresh_count=$((fresh_count + 1))
    elif [ "$decl_ver" != "-" ]; then
      tier="🟡 TIER-1"
      status="待升级对齐"
      stale_count=$((stale_count + 1))
    else
      tier="⚪ TIER-2"
      status="指纹监控中"
      none_count=$((none_count + 1))
    fi

    echo "| \`$rel_path\` | \`$hash\` | $mtime | \`$decl_ver\` | $tier | $status |" >> "$LEDGER_FILE"
  done

  cat <<EOF >> "$LEDGER_FILE"

---

## 🛡️ 三、资产漂移校验与自动化口令

- **一键扫描更新台账**：
  \`\`\`bash
  ./scripts/fingerprint_audit.sh --scan
  \`\`\`
- **一键输出新鲜度雷达看盘**：
  \`\`\`bash
  ./scripts/fingerprint_audit.sh --freshness
  \`\`\`
- **全域资产指纹校验**：
  \`\`\`bash
  ./scripts/fingerprint_audit.sh --verify
  \`\`\`
EOF

  echo "✅ 指纹台账更新完毕！共记录 ${#all_files[@]} 个受管资产 (Fresh: $fresh_count, Stale: $stale_count, None: $none_count)。"
  echo "📄 台账路径: $LEDGER_FILE"
}

# 指纹校验模式
run_verify() {
  echo "🔍 正在执行全域受管资产指纹一致性校验..."
  if [ ! -f "$LEDGER_FILE" ]; then
    echo "⚠️ 未找到台账文件，请先运行 '$0 --scan' 初始化台账。"
    exit 1
  fi

  local drifted=0
  local checked=0

  while IFS='|' read -r empty path hash mtime ver tier status rest; do
    # 清除空格与反引号
    local clean_path=$(echo "$path" | tr -d ' `')
    local clean_hash=$(echo "$hash" | tr -d ' `')

    if [ -n "$clean_path" ] && [ "$clean_path" != "资产相对路径" ] && [ ! -z "$clean_hash" ]; then
      local full_path="$CURRENT_DIR/$clean_path"
      if [ -f "$full_path" ]; then
        local current_hash=$(get_short_hash "$full_path")
        checked=$((checked + 1))
        if [ "$current_hash" != "$clean_hash" ]; then
          echo "🚨 [指纹漂移警告] $clean_path: 台账指纹=$clean_hash, 实际指纹=$current_hash"
          drifted=$((drifted + 1))
        fi
      else
        echo "❌ [文件丢失] $clean_path: 文件已在磁盘不存在！"
        drifted=$((drifted + 1))
      fi
    fi
  done < <(grep "^| \`" "$LEDGER_FILE" | grep -v ":---")

  echo "----------------------------------------------------------"
  if [ "$drifted" -eq 0 ]; then
    echo "✅ 校验通过！全量 $checked 个文件指纹与台账 100% 强一致，无未授权漂移。"
  else
    echo "⚠️ 检出 $drifted 处资产与台账不一致，请核对是否发生了未经记录的改动！"
    exit 1
  fi
  echo "=========================================================="
}

# 模式路由
case "$MODE" in
  --scan)
    run_scan_and_update_ledger
    ;;
  --freshness)
    run_freshness_report
    ;;
  --verify)
    run_verify
    ;;
  *)
    echo "❌ 未知模式: $MODE (可用模式: --freshness | --scan | --verify)"
    exit 1
    ;;
esac
