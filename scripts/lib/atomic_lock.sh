#!/bin/bash
# ==============================================================================
# 物理原子锁 · Shell 侧薄封装  atomic_lock.sh
# ==============================================================================
# 与 `scripts/lib/atomic_lock.mjs` 配套：**同一个锁根**（`.dsh_locks/`），
# 因此 Node 侧与 Shell 侧能互相看见对方的锁，不会出现"两套锁各自为政"。
#
# 互斥语义（与 Node 侧逐字对齐，改一处必须改两处）：
#   锁 = `.dsh_locks/<洗过的锁键>/metadata.json` 这个**文件**被 `noclobber` 原子创建。
#   为什么不用 `mkdir` 当锁（旧版做法，实测有竞态）：
#     `mkdir` 成功与写元数据之间有窗口，对手读到"目录在、元数据无"会把活锁当残留删掉。
#   为什么释放时**不删目录**：对手可能正拿着目录名准备创建元数据文件，
#     删掉目录会让它的创建直接失败（丢动作），而不是被挡住重试。
#
# 用法（Source 进来用）：
#   . "$(dirname "$0")/lib/atomic_lock.sh"
#   atomic_lock_run "state:gates_snapshot" "看板快照落盘" -- do_something
#   # 或手动三段式：
#   atomic_lock_acquire "state:foo" "用途说明" || { echo "抢锁失败"; exit 1; }
#   ...临界区...
#   atomic_lock_release "state:foo"
#
# 退出码：atomic_lock_acquire / atomic_lock_run 抢不到锁 → 非 0（**不静默等待到超时**）
# ==============================================================================

# 锁根：与 Node 侧一致（仓库根/.dsh_locks）
: "${ATOMIC_LOCK_ROOT:=}"
atomic_lock_root() {
  if [ -n "$ATOMIC_LOCK_ROOT" ]; then
    printf '%s' "$ATOMIC_LOCK_ROOT"
    return
  fi
  # 本文件在 scripts/lib/ 下 → 上溯两级为仓库根
  local here
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  printf '%s/.dsh_locks' "$here"
}

# 锁键洗净：**必须与 Node 侧 sanitizeLockKey 产出同一个目录名**，否则两边各锁各的。
# 坑（本脚本第一版踩过）：`tr -c 'a-zA-Z0-9_-' '_'` 会把冒号也洗成下划线 ——
# 同一个键 `state:progress_ledger` 在 Node 侧是 `state:progress_ledger`、
# 在 Bash 侧变成 `state_progress_ledger`，两把锁互相看不见，等于没锁。
# 做法：先把非 `[A-Za-z0-9_:-]` 洗成 `~`（冒号是合法目录字符，原样保留），再把 `~` 换成 `_`。
atomic_lock_sanitize() {
  printf '%s' "$1" | tr -c 'a-zA-Z0-9_:-' '~' | tr '~' '_'
}

atomic_lock_dir() {
  printf '%s/%s' "$(atomic_lock_root)" "$(atomic_lock_sanitize "$1")"
}

# CLI 形态：`atomic_lock.sh --print-dir <锁键>` → 打印锁目录绝对路径。
# 存在的唯一理由：让 Node 侧审计脚本能**对拍两边算出的锁目录**。
# 不对拍会怎样（真踩过）：Node 侧把冒号洗成下划线，Bash 侧保留冒号，
# 同一个键算出两个目录 —— 两把锁互相看不见，等于没锁，而各自的自检都是绿的。
if [ "${1:-}" = "--print-dir" ]; then
  atomic_lock_dir "${2:?用法：atomic_lock.sh --print-dir <锁键>}"
  exit 0
fi

# 持有这把锁的 token（供 release 校验，防误删他人锁）
ATOMIC_LOCK_TOKEN=""

# 抢锁（非阻塞，单次尝试）。成功 0 / 失败 1 / 用法错 2
atomic_lock_acquire() {
  local key="$1" why="${2:-}" stale_ms="${3:-180000}"
  [ -n "$key" ] || { echo "atomic_lock_acquire: 缺少锁键" >&2; return 2; }
  local dir meta
  dir="$(atomic_lock_dir "$key")"
  meta="$dir/metadata.json"
  mkdir -p "$dir" 2>/dev/null || true

  ATOMIC_LOCK_TOKEN="$$-$(date +%s)-$$"
  # noclobber + 重定向 = 原子"创建不存在才成功"（POSIX 语义，等价于 open(O_EXCL)）
  if ( set -C; printf '{"key":"%s","holder":"pid:%s@%s","pid":%s,"at":"%s","why":"%s","token":"%s"}\n' \
        "$(atomic_lock_sanitize "$key")" "$$" "$(hostname 2>/dev/null || echo unknown)" "$$" \
        "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$why" "$ATOMIC_LOCK_TOKEN" > "$meta" ) 2>/dev/null; then
    return 0
  fi

  # 被占：判是否残留锁（持有者已死 或 超过陈旧阈值）
  local owner_pid="" at_raw="" now_s="" at_s="" age_s=0
  owner_pid="$(sed -n 's/.*"pid":\([0-9]*\).*/\1/p' "$meta" 2>/dev/null | head -1)"
  at_raw="$(sed -n 's/.*"at":"\([^"]*\)".*/\1/p' "$meta" 2>/dev/null | head -1)"
  if [ -n "$owner_pid" ] && kill -0 "$owner_pid" 2>/dev/null; then
    : # 持有者还活着
  else
    # 持有者已死 → 残留锁，回收并**留痕**
    echo "⚠️ 原子锁残留回收：$key（原持有者 pid=${owner_pid:-未知} 已不存在）" >&2
    rm -f "$meta" 2>/dev/null || true
    if ( set -C; : > "$meta" ) 2>/dev/null; then
      printf '{"key":"%s","holder":"pid:%s@%s","pid":%s,"at":"%s","why":"%s","token":"%s"}\n' \
        "$(atomic_lock_sanitize "$key")" "$$" "$(hostname 2>/dev/null || echo unknown)" "$$" \
        "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$why" "$ATOMIC_LOCK_TOKEN" > "$meta"
      return 0
    fi
  fi
  # 仍抢不到：**显式报错**，绝不静默等待
  echo "⛔ 原子锁被占用：$key（持有者 pid=${owner_pid:-未知}${at_raw:+ · at=$at_raw}）" >&2
  return 1
}

# 释放（按 token 校验；不删目录）
atomic_lock_release() {
  local key="$1" dir meta
  dir="$(atomic_lock_dir "$key")"
  meta="$dir/metadata.json"
  [ -f "$meta" ] || return 0
  if [ -n "$ATOMIC_LOCK_TOKEN" ]; then
    local tok
    tok="$(sed -n 's/.*"token":"\([^"]*\)".*/\1/p' "$meta" 2>/dev/null | head -1)"
    if [ -n "$tok" ] && [ "$tok" != "$ATOMIC_LOCK_TOKEN" ]; then
      echo "⚠️ 原子锁已易主，拒绝释放他人锁：$key" >&2
      return 1
    fi
  fi
  rm -f "$meta" 2>/dev/null || true
  return 0
}

# 临界区包装：acquire → 跑命令 → **无论成败都 release**
# 用法：atomic_lock_run "<锁键>" "<用途>" -- <命令...>
atomic_lock_run() {
  local key="$1" why="$2"; shift 2
  [ "${1:-}" = "--" ] && shift
  if ! atomic_lock_acquire "$key" "$why"; then
    return 1
  fi
  local rc=0
  "$@" || rc=$?
  atomic_lock_release "$key" || true
  return $rc
}
