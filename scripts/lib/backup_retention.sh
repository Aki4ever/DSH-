#!/usr/bin/env bash
# ==============================================================================
# 备份留存策略 · bash 侧公共库  scripts/lib/backup_retention.sh
# ==============================================================================
# 为什么需要它（实测事实，不是推测）：
#   `~/.dsh/profiles/desktop/` 里堆了 16 个带时间戳的备份，写它们的**有 5 个互不相识的写者**
#   （install_host_gate.sh / plugin_sync.sh / market_guard_patch.mjs /
#    restore_skill_pool.mjs / install_plugin.py）。
#   每一处都是"改前先备份"，**没有任何一处负责清理** —— 于是备份只增不减，
#   目录里同名文件成堆，人眼再也分不清"哪个才是能回滚的那一份"。
#   这不是洁癖问题：回滚靠的是"最近一份备份"，堆到 16 份之后，
#   回滚目标要靠翻文件名猜，等于把可回滚性变成了运气。
#
# 本库只做一件事：定死一个**留存口径**，让每个写者备份完就地调用它。
#   口径：只保留某文件**最新的 N 份** `<base>.bak-*`（默认 3），更旧的删掉。
#
# 安全边界（三条，写清楚了才敢用在"删文件"上）：
#   ① 只匹配 `<base>.bak-*` 这一种兄弟名，别的后缀（`.tmp-` `.orig-` 等）一律不碰；
#   ② 活文件本身永不入选（候选名必须比 `<base>` 长，且以 `<base>.bak-` 开头）；
#   ③ 备份的备份不算备份（`a.bak-x.bak-y` 不归本库管），避免把链式名字当同类清理。
#
# 用法（被 source，不直接执行）：
#   . "$SCRIPT_DIR/lib/backup_retention.sh"
#   cp "$f" "$f.bak-$(date +%Y%m%d-%H%M%S)-install-gate" && prune_backups_impl "$f" 3
#
# 函数名带 _impl 后缀是**故意**的：调用方若在 `set -e` 下运行，会自己包一层
#   `prune_backups() { prune_backups_impl "$@" || true; }`（见 scripts/install_host_gate.sh）。
#   若本库也叫 prune_backups，那层包装就会自己调自己 —— 这是实测会踩的坑，故在此避开。
#
# 降级语义（重要）：本库可能被**复制到沙箱**里与调用方同处一地而 `lib/` 不在
#   （仓库已实测过 `control_gates.sh` 被这样单独复制）。因此调用方必须允许"找不到本库"：
#   源不到就跳过清理，**只少删东西，绝不报错、绝不中断原有流程**。
#
# 返回值：0 = 已按口径处理（含"本来就没什么可删"的空操作）
#         1 = 参数不可用或目录不可读（调用方按需忽略即可，不是致命错误）
# 本库不打印任何内容：清理由调用方决定要不要说，库只管删。
# ==============================================================================

# prune_backups_impl <base_file> [keep_n]
#   删除 <base_file> 的 `<base>.bak-*` 兄弟中最旧的若干份，只留最新 keep_n 份（默认 3）。
#   排序口径与 Node 侧（scripts/lib/backup_retention.mjs）一致：文件修改时间升序，同名时间时按文件名。
prune_backups_impl() {
  local base="${1:-}"
  local keep="${2:-3}"

  [ -n "$base" ] || return 1
  case "$keep" in
    ''|*[!0-9]*) keep=3 ;;
  esac
  [ "$keep" -ge 0 ] 2>/dev/null || return 1

  local dir name
  dir="$(dirname -- "$base")"
  name="$(basename -- "$base")"
  [ -d "$dir" ] || return 1

  # 候选集合：只认 <base>.bak-*。用 find -maxdepth 1 而非裸通配，
  # 一是不受 nullglob/globstar 设置影响，二是把匹配责任写死在模式里，便于复核。
  local -a cands=()
  local f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    [ "$(basename -- "$f")" = "$name" ] && continue          # 活文件永不入选
    case "$(basename -- "$f")" in
      "$name".bak-*) cands+=("$f") ;;
      *) continue ;;                                          # 备份的备份/别家后缀：不碰
    esac
  done < <(find "$dir" -maxdepth 1 -type f -name "$name.bak-*" 2>/dev/null)

  [ "${#cands[@]}" -gt "$keep" ] || return 0                  # 空操作：没超过口径就不动手

  # 排序键：修改时间（macOS 用 -r，GNU 用 -d，两者都取不到时只按文件名，仍然确定）
  local -a rows=()
  local sortkey
  for f in "${cands[@]}"; do
    sortkey="$(date -r "$f" +%Y%m%d%H%M%S 2>/dev/null || date -r "$f" +%s 2>/dev/null || true)"
    if [ -z "$sortkey" ]; then
      sortkey="$(date -d "@$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0)" +%Y%m%d%H%M%S 2>/dev/null || true)"
    fi
    rows+=("${sortkey:-0}	${f}")
  done

  local -a sorted=()
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    sorted+=("${f#*	}")
  done < <(printf '%s\n' "${rows[@]}" | LC_ALL=C sort)

  # sorted 升序 → 末尾 keep 份是最新的，前 (总数 - keep) 份是最旧的，删掉
  local total="${#sorted[@]}"
  local i
  for ((i = 0; i < total - keep; i++)); do
    rm -f -- "${sorted[$i]}" 2>/dev/null || true                 # 删不掉不报错，留给 GC 复核
  done
  return 0
}

# 直接执行时给一句提示并退出（本库只供 source，不做命令行工具）
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  echo "本文件是公共库，请用 . 或 source 引入；命令行清理入口见 scripts/backup_gc.mjs" >&2
  exit 2
fi
