#!/bin/bash
# ==============================================================================
# 脚本名称: global_scheduler_lock.sh
# 核心功能: DSH 全自动轻量级全局调度锁中枢与并发资源防冲突引擎
# 机制说明: 基于 POSIX 目录原子创建 (mkdir)、读写分离、超时自愈熔断 (TTL)
# 适用环境: macOS / Linux (POSIX Shell)
# 当前版本: v2.6.0
# ==============================================================================

set -eo pipefail

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_ROOT_DIR="$CURRENT_DIR/.dsh_locks"
DEFAULT_TTL=180 # 锁默认超时时间 (秒)，超过此时间自动判定为孤儿锁自愈释放

mkdir -p "$LOCK_ROOT_DIR"

# 辅助函数: 清理锁名称（转为合法目录名）
sanitize_lock_name() {
  local name="$1"
  printf '%s' "$name" | tr -c 'a-zA-Z0-9_-' '_'
}

# 辅助函数: 检查锁是否过期
is_lock_expired() {
  local lock_dir="$1"
  local ttl="${2:-$DEFAULT_TTL}"
  local meta_file="$lock_dir/metadata.json"

  if [ ! -f "$meta_file" ]; then
    return 0
  fi

  local created_at=$(grep '"timestamp"' "$meta_file" 2>/dev/null | awk -F': ' '{print $2}' | tr -d ' ,' || echo 0)
  if [ -z "$created_at" ] || [ "$created_at" -eq 0 ] 2>/dev/null; then
    return 0
  fi

  local now=$(date +%s)
  local elapsed=$((now - created_at))

  if [ "$elapsed" -ge "$ttl" ]; then
    return 0 # 已过期
  else
    return 1 # 未过期
  fi
}

# 1. 申领排他独占锁 (Acquire Exclusive Lock)
acquire_lock() {
  local raw_name="${1:-global_default}"
  local task_id="${2:-TASK-UNKNOWN}"
  local ttl="${3:-$DEFAULT_TTL}"
  local lock_name=$(sanitize_lock_name "$raw_name")
  local target_lock="$LOCK_ROOT_DIR/${lock_name}.lock"

  # 检查并处理过期锁 (超时自愈机制)
  if [ -d "$target_lock" ]; then
    if is_lock_expired "$target_lock" "$ttl"; then
      echo "⚠️ [自愈触发] 检测到锁 [$lock_name] 已超时 (> ${ttl}s)，原持有者可能异常终止，正在强制自愈释放..."
      rm -rf "$target_lock"
    fi
  fi

  # 利用 mkdir 的 POSIX 原子性尝试加锁
  if mkdir "$target_lock" 2>/dev/null; then
    local now=$(date +%s)
    local now_str=$(date "+%Y-%m-%d %H:%M:%S")
    cat <<EOF > "$target_lock/metadata.json"
{
  "lock_name": "$raw_name",
  "task_id": "$task_id",
  "pid": $$,
  "timestamp": $now,
  "created_at": "$now_str",
  "ttl": $ttl
}
EOF
    echo "🔒 [加锁成功] 任务 [$task_id] 已成功获得独占锁: $raw_name (PID: $$)"
    return 0
  else
    local meta_file="$target_lock/metadata.json"
    local holder="未知任务"
    local created="未知时间"
    if [ -f "$meta_file" ]; then
      holder=$(grep '"task_id"' "$meta_file" | awk -F'"' '{print $4}' || echo "未知任务")
      created=$(grep '"created_at"' "$meta_file" | awk -F'"' '{print $4}' || echo "未知时间")
    fi
    echo "🚨 [资源冲突阻断] 目标资源已被独占锁锁定！"
    echo "   - 锁名称: $raw_name"
    echo "   - 当前持有任务: $holder"
    echo "   - 加锁时间: $created"
    echo "   - 防打架调度策略: 请等待该任务完成或待其超时 (${ttl}s) 自动释放。"
    return 1
  fi
}

# 2. 释放独占锁 (Release Lock)
release_lock() {
  local raw_name="${1:-global_default}"
  local task_id="${2:-}"
  local lock_name=$(sanitize_lock_name "$raw_name")
  local target_lock="$LOCK_ROOT_DIR/${lock_name}.lock"

  if [ ! -d "$target_lock" ]; then
    echo "ℹ️ [无需释放] 锁 [$raw_name] 当前不存在或已被释放。"
    return 0
  fi

  # 可选：校验是否为当前任务所持有的锁
  if [ -n "$task_id" ]; then
    local meta_file="$target_lock/metadata.json"
    if [ -f "$meta_file" ]; then
      local holder=$(grep -o '"task_id":"[^"]*' "$meta_file" | cut -d'"' -f4 || echo "")
      if [ -n "$holder" ] && [ "$holder" != "$task_id" ]; then
        echo "⚠️ [越权告警] 任务 [$task_id] 试图释放任务 [$holder] 所持有的锁，已阻断！"
        return 1
      fi
    fi
  fi

  rm -rf "$target_lock"
  echo "🔓 [解锁成功] 锁 [$raw_name] 已安全释放！"
  return 0
}

# 3. 查看当前全局锁状态 (Status)
show_status() {
  echo "=========================================================="
  echo "  DSH 全局调度锁与并发资源状态大盘 (v2.6.0)"
  echo "=========================================================="
  local locks=("$LOCK_ROOT_DIR"/*.lock)
  local count=0

  for lk in "${locks[@]}"; do
    if [ -d "$lk" ]; then
      count=$((count + 1))
      local meta="$lk/metadata.json"
      local name=$(basename "$lk" .lock)
      local task="未知"
      local pid="未知"
      local created="未知"
      local is_exp="🟢 生效中"

      if [ -f "$meta" ]; then
        name=$(grep '"lock_name"' "$meta" | awk -F'"' '{print $4}' || echo "$name")
        task=$(grep '"task_id"' "$meta" | awk -F'"' '{print $4}' || echo "未知")
        pid=$(grep '"pid"' "$meta" | awk -F': ' '{print $2}' | tr -d ' ,' || echo "未知")
        created=$(grep '"created_at"' "$meta" | awk -F'"' '{print $4}' || echo "未知")
        if is_lock_expired "$lk"; then
          is_exp="🔴 已超时 (待自愈)"
        fi
      fi

      echo "🔹 活跃排他锁 #$count:"
      echo "   • 资源名称: $name"
      echo "   • 持有任务: $task (PID: $pid)"
      echo "   • 加锁时间: $created"
      echo "   • 状态判定: $is_exp"
      echo "----------------------------------------------------------"
    fi
  done

  if [ "$count" -eq 0 ]; then
    echo "🎉 当前系统无任何活跃排他锁，全域资源自由可用 (0 竞争冲突)！"
  else
    echo "📊 当前共有 $count 个资源正处于排他互斥保护状态。"
  fi
  echo "=========================================================="
}

# 4. 一键包装运行 (Run with Auto-Lock & Release)
run_wrapped() {
  local lock_name="$1"
  local task_id="$2"
  shift 2
  local cmd="$@"

  if [ -z "$lock_name" ] || [ -z "$task_id" ] || [ -z "$cmd" ]; then
    echo "❌ 参数不足！用法: $0 --run <lock_name> <task_id> <command...>"
    return 1
  fi

  echo "🛡️ 正在申请独占资源锁: $lock_name (任务: $task_id)..."
  if ! acquire_lock "$lock_name" "$task_id"; then
    return 1
  fi

  # 捕获退出信号确保必释放
  trap 'release_lock "$lock_name" "$task_id"' EXIT INT TERM

  echo "⚡ 成功持有锁，开始执行受保护的任务命令: $cmd"
  echo "----------------------------------------------------------"
  eval "$cmd"
  local ret=$?
  echo "----------------------------------------------------------"
  echo "✅ 受保护任务执行完毕 (退出码: $ret)。"

  trap - EXIT INT TERM
  release_lock "$lock_name" "$task_id"
  return $ret
}

# 5. 清理所有孤儿锁 / 全量重置 (Clean)
clean_all() {
  echo "🧹 正在清理全域调度锁缓存..."
  rm -rf "$LOCK_ROOT_DIR"/*
  echo "✅ 全域调度锁已全部安全清空！"
}

# 命令行路由
MODE="${1:---status}"

case "$MODE" in
  --acquire)
    acquire_lock "$2" "$3" "$4"
    ;;
  --release)
    release_lock "$2" "$3"
    ;;
  --status)
    show_status
    ;;
  --run)
    shift
    run_wrapped "$@"
    ;;
  --clean)
    clean_all
    ;;
  *)
    echo "❌ 未知指令: $MODE"
    echo "用法:"
    echo "  $0 --status                                          (查看大盘)"
    echo "  $0 --acquire <lock_name> <task_id> [ttl]             (申请独占锁)"
    echo "  $0 --release <lock_name> [task_id]                   (释放独占锁)"
    echo "  $0 --run <lock_name> <task_id> <command...>          (安全包装执行)"
    echo "  $0 --clean                                           (清空全部锁)"
    exit 1
    ;;
esac
