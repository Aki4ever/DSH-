#!/usr/bin/env bash
# ==============================================================================
# 插件装载同步器  plugin_sync.sh
# ==============================================================================
# 解决的问题（2026-10-02 事故实测，**两个独立故障叠加**）：
#
#   故障 A：宿主半写成 CommonJS，而加载器用 import() 加载 → 插件从未被加载
#           → `/restart-dsh` 从未注册 → 重启按钮点了没反应。
#
#   故障 B（本脚本要根治的）：profile 里的插件文件是 pnpm 的**硬链接快照**。
#           只要在仓库里"重写"该文件（编辑器/写工具会换 inode），硬链接就断了，
#           于是**仓库改了、profile 还是旧的**，而运行中的宿主只读 profile。
#           实测：`lib/index.js` 两侧 inode 不同（108731772 vs 108634302）、
#           内容一个是 ESM 一个是 CommonJS，而 package.json 已被硬链接同步成
#           `"type": "module"` —— 组合起来就是"加载必然报错"的最坏状态。
#           更糟的是这个断链**完全静默**：没有任何东西会告诉你 profile 落后了。
#
# 本脚本只做一件事：把仓库里的插件源码**逐文件对齐**到 profile，并逐文件回读校验。
#
# 用法：
#   bash scripts/plugin_sync.sh check    # 判定：profile 与仓库是否逐字节一致（不一致退 1）
#   bash scripts/plugin_sync.sh sync     # 对齐（复制差异文件），并输出改了哪些
#   bash scripts/plugin_sync.sh list     # 列出受管插件的目标路径与差异数
#
# 退出码：0 一致 / 1 存在差异（check 模式）/ 2 用法或环境错误
# ==============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 原子锁（REQ-091 / R6）：本脚本会写仓库**之外**的 profile 目录，
# 两处同时同步会写出"半新半旧"的插件（比不同步更糟：加载形态可能自相矛盾）。
# shellcheck source=lib/atomic_lock.sh
. "$SCRIPT_DIR/lib/atomic_lock.sh"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MODE="${1:-check}"

# 受管插件（仓库相对路径 → 包名）。新增插件必须登记在这里，否则同步不到。
# 条目格式：<仓库相对路径> 或 <仓库相对路径>|<包名>（省略包名时取目录名）。
# 为什么引入包名映射：拦截层实现放在 `ai-control/plugin/`，目录名 "plugin" 不能当包名用。
PLUGIN_DIRS=(
  "skill-pool/plugins/dsh-plugin-restart"
  "skill-pool/plugins/dsh-plugin-usage-bar"
  "skill-pool/plugins/dsh-plugin-image-zoom"
  "skill-pool/plugins/dsh-plugin-control-jump"
  "ai-control/plugin|dsh-plugin-execution-control"
)
# 取条目的包名（无映射时回退目录名）
plugin_name() { local e="$1"; case "$e" in *"|"*) printf '%s' "${e##*|}" ;; *) printf '%s' "$(basename "${e%%|*}")" ;; esac; }
# 取条目的路径（去掉包名映射）
plugin_rel() { printf '%s' "${1%%|*}"; }

DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
PROFILE="${DSH_PROFILE:-desktop}"
DEST_ROOT="$DSH_HOME_DIR/profiles/$PROFILE/node_modules"

# 需要同步的文件（不复制产物目录与无关文件）
SYNC_FILES=(
  "package.json"
  "cordis.patch.yml"
  "index.mjs"
  "loader.mjs"
  "lib/index.js"
  "lib/client.js"
  "verify_restart_button.cjs"
  "verify_click_paths.cjs"
  "verify_stub.cjs"
  "src/restart-core.cjs"
  "src/host-core.cjs"
  "src/usage-core.cjs"
  "src/client.template.js"
  "README.md"
)

diff_count=0
changed_list=()

sync_one() {
  local src="$1" dst="$2" mode="$3"
  [ -f "$src" ] || return 0
  if [ -f "$dst" ] && cmp -s "$src" "$dst"; then
    return 0
  fi
  diff_count=$((diff_count + 1))
  changed_list+=("${dst#$DEST_ROOT/}")
  if [ "$mode" = "sync" ]; then
    mkdir -p "$(dirname "$dst")"
    # 刻意用 cp 而不是 ln：硬链接在"重写源文件"时会断，反而制造静默落后。
    # 复制则每次都把内容对齐；代价是多占几 KB，换来"永远一致"。
    cp -f "$src" "$dst" 2>/dev/null || true
  fi
}

run() {
  local mode="$1"
  diff_count=0
  changed_list=()
  for entry in "${PLUGIN_DIRS[@]}"; do
    rel="$(plugin_rel "$entry")"
    local pkg
    pkg="$(plugin_name "$entry")"
    local dest="$DEST_ROOT/$pkg"
    if [ ! -d "$dest" ]; then
      echo "⚠️ 目标插件未安装：${dest}（跳过；如需安装请用宿主插件管理器）" >&2
      continue
    fi
    for f in "${SYNC_FILES[@]}"; do
      sync_one "$ROOT/$rel/$f" "$dest/$f" "$mode"
    done
  done
}

# ── 装配：把"依赖 + bundles + 文件"三件事一次做齐（幂等） ─────────────────────
# 为什么需要它：实测 profile 里只装了 restart 与 image-zoom，**usage-bar 从未装配**，
# 于是 R4 要求的"峰谷时段全域常显"在物理上根本没有载体 —— 而没有任何东西会提示这一点。
# 手工改 profile 的 package.json（在仓库外）风险高，故收敛到本脚本一处，并逐项复核。
install_plugin() {
  local rel="$1" pkg="$2" src="$ROOT/$1"
  local profile_dir="$DSH_HOME_DIR/profiles/$PROFILE"
  local pkgjson="$profile_dir/package.json"
  local dest="$DEST_ROOT/$pkg"
  [ -d "$src" ] || { echo "⛔ 源目录不存在：$src" >&2; return 1; }

  local node_bin
  node_bin="${DSH_NODE_BIN:-node}"

  # ① 依赖 + bundles（幂等；只在真的改变时备份并写回）
  local changed
  changed="$("$node_bin" -e '
const fs=require("node:fs");
const [file, name, src] = process.argv.slice(1);
const j = JSON.parse(fs.readFileSync(file, "utf8"));
j.dependencies = j.dependencies || {};
const changed = [];
if (j.dependencies[name] !== "file:" + src) { j.dependencies[name] = "file:" + src; changed.push("dependencies"); }
j.dsh = j.dsh || {}; j.dsh.profile = j.dsh.profile || {};
j.dsh.profile.bundles = j.dsh.profile.bundles || [];
if (!j.dsh.profile.bundles.includes(name)) { j.dsh.profile.bundles.push(name); changed.push("bundles"); }
if (changed.length) {
  const bak = file + ".bak-" + new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15) + "-plugin-sync";
  fs.copyFileSync(file, bak);
  fs.writeFileSync(file, JSON.stringify(j, null, 1) + "\n", "utf8");
  process.stdout.write("（已更新：" + changed.join(" + ") + "，备份已留存）");
}
' "$pkgjson" "$pkg" "$src" 2>/dev/null)" || { echo "⛔ 写 profile package.json 失败：$pkgjson" >&2; return 1; }

  # ② 文件对齐（只复制内容不同的文件，避免 cp 噪声淹没真错误）
  mkdir -p "$dest"
  local n=0
  for f in "${SYNC_FILES[@]}"; do
    [ -f "$src/$f" ] || continue
    mkdir -p "$(dirname "$dest/$f")"
    if ! cmp -s "$src/$f" "$dest/$f" 2>/dev/null; then
      cp -f "$src/$f" "$dest/$f" || { echo "⛔ 复制失败：$dest/$f" >&2; return 1; }
      n=$((n + 1))
    fi
  done
  echo "✅ 已装配 ${pkg}（文件更新 $n 个）${changed} → $dest"
}

case "$MODE" in
  install)
    if ! atomic_lock_acquire "assets:plugin_profile_sync" "装配插件进 profile"; then
      echo "⛔ 未装配：原子锁被占用" >&2
      exit 1
    fi
    rc=0
    for entry in "${PLUGIN_DIRS[@]}"; do
      install_plugin "$(plugin_rel "$entry")" "$(plugin_name "$entry")" || rc=1
    done
    atomic_lock_release "assets:plugin_profile_sync" || true
    echo "⚠️ 装配只改磁盘；**需重载 profile 才生效**（宿主启动时读取 bundles 列表）。"
    exit "$rc"
    ;;
  list)
    for entry in "${PLUGIN_DIRS[@]}"; do
      rel="$(plugin_rel "$entry")"; pkg="$(plugin_name "$entry")"
      dest="$DEST_ROOT/$pkg"
      [ -d "$dest" ] || { echo "⛔ 未安装  $pkg"; continue; }
      d=0
      for f in "${SYNC_FILES[@]}"; do
        [ -f "$ROOT/$rel/$f" ] || continue
        cmp -s "$ROOT/$rel/$f" "$dest/$f" || d=$((d + 1))
      done
      if [ "$d" -eq 0 ]; then echo "✅ 已一致  $pkg"; else echo "🟡 待同步 ($d 个文件)  $pkg"; fi
    done
    exit 0
    ;;
  check)
    run check
    if [ "$diff_count" -eq 0 ]; then
      echo "✅ 插件装载已对齐：profile 与仓库逐字节一致"
      exit 0
    fi
    echo "⛔ 插件装载未对齐：$diff_count 个文件 profile 落后于仓库"
    for c in "${changed_list[@]}"; do echo "   · $c"; done
    echo "   处置：bash scripts/plugin_sync.sh sync（然后重载 profile 才生效）"
    exit 1
    ;;
  sync)
    # 抢不到锁就显式报错，不做"无锁照写"
    if ! atomic_lock_acquire "assets:plugin_profile_sync" "插件源码对齐进 profile"; then
      echo "⛔ 未同步：原子锁被占用（另一个同步/装配进程正在写 profile）" >&2
      exit 1
    fi
    run sync
    atomic_lock_release "assets:plugin_profile_sync" || true
    if [ "$diff_count" -eq 0 ]; then
      echo "✅ 无需同步：profile 已是最新"
      exit 0
    fi
    echo "🔄 已同步 $diff_count 个文件到 profile（${DEST_ROOT}）"
    for c in "${changed_list[@]}"; do echo "   · $c"; done
    echo "⚠️ 同步只改磁盘文件；**运行中的宿主仍持有旧模块**，需重载 profile / 重启应用才生效。"
    exit 0
    ;;
  *)
    echo "用法：plugin_sync.sh <check|sync|list|install>" >&2
    exit 2
    ;;
esac
