#!/usr/bin/env bash
# ==============================================================================
# 逃生舱 · 重启后宿主级验证指引
# ==============================================================================
# ⚠️ 本脚本**只做只读检查**，不制造任何"门禁未过"状态，不修改任何文件。
#
# 为什么不做"实弹测试"（一个重要且容易搞错的设计说明）：
#   守卫检查的是**AI/用户发起的那一条 bash 调用**，不是脚本内部的每一行命令。
#   所以"在脚本里修改状态、再在脚本里跑自救命令"**证明不了**逃生舱是否生效 ——
#   那些内部命令压根不经过守卫判定。
#   真正有效的证据只能是：**在门禁未过的状态下，让守卫去判定一条自救命令**。
#   而这必须由 AI 或用户直接发起（不能包在脚本里），且一旦判定为"拒绝"
#   就会把自己锁住 —— 所以本脚本不代劳，而是把"该跑什么、怎么判读"讲清楚。
#
# 本脚本给出的三项：
#   0. 宿主是否已重启（客观判据，不靠猜）
#   1. 逃生舱判定逻辑（纯函数级，静态可判）
#   2. 重启后该手动跑哪条命令、如何判读
#
# 用法：./scripts/verify_escape_hatch.sh
# 退出码：0 = 检查项通过；1 = 有失败
# ==============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PASS=0; FAIL=0
ok()   { printf '  ✅ %s\n' "$1"; PASS=$((PASS+1)); }
bad()  { printf '  ❌ %s\n' "$1"; FAIL=$((FAIL+1)); }
info() { printf '     %s\n' "$1"; }
note() { printf '  ⏭️  %s\n' "$1"; }

echo "═══════════════════════════════════════════════════════════"
echo " 逃生舱 · 重启后宿主级验证"
echo " 工程：$ROOT"
echo "═══════════════════════════════════════════════════════════"
echo

# ── 0. 宿主是否已加载最新代码（客观判据）──────────────────────────────────────
echo "【0】宿主是否已重启（决定下面结果的解读方式）"
PLUGIN_MTIME=$(stat -f "%m" "$ROOT/ai-control/plugin/index.mjs" 2>/dev/null || stat -c "%Y" "$ROOT/ai-control/plugin/index.mjs" 2>/dev/null)
PLUGIN_HUMAN=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$ROOT/ai-control/plugin/index.mjs" 2>/dev/null)

HOST_LINE=$(ps -eo pid,lstart,command 2>/dev/null | grep -i "deepseek-harness-desktop" | grep -v grep | head -1)
HOST_START_HUMAN=$(printf '%s' "$HOST_LINE" | awk '{print $2" "$3" "$4" "$5" "$6}')
HOST_EPOCH=$(printf '%s' "$HOST_LINE" | awk '{print $2" "$3" "$4" "$5" "$6}' | xargs -I{} date -j -f "%a %b %d %T %Y" "{}" "+%s" 2>/dev/null)

info "桌面端进程启动：${HOST_START_HUMAN:-（未取到）}"
info "插件文件改动时间：${PLUGIN_HUMAN:-（未取到）}"

if [ -n "$HOST_EPOCH" ] && [ -n "$PLUGIN_MTIME" ]; then
  if [ "$HOST_EPOCH" -ge "$PLUGIN_MTIME" ] 2>/dev/null; then
    ok "宿主启动**晚于**插件改动 → 已加载最新代码"
    RESTARTED=1
  else
    bad "宿主启动**早于**插件改动 → 仍在跑旧代码"
    info "请重启 DSH 桌面端后重跑本脚本。"
    info "（这不代表修复失效，只代表"还没生效"）"
    RESTARTED=0
  fi
else
  note "无法比较时间（跳过，不判失败）"
  RESTARTED=unknown
fi
echo

# ── 1. 逃生舱判定逻辑（纯函数级）───────────────────────────────────────────────
echo "【1】逃生舱判定逻辑（isEscape 纯函数，静态可判）"
NODE_BIN=""
for c in "$(command -v node 2>/dev/null)" \
         "/Volumes/DSH Desktop/DSH Desktop.app/Contents/Resources/runtime/node" \
         "$(ls -d /Volumes/DSH*/DSH*.app/Contents/Resources/runtime/node 2>/dev/null | head -1)"; do
  [ -n "$c" ] && [ -x "$c" ] && { NODE_BIN="$c"; break; }
done

if [ -n "$NODE_BIN" ] && [ -f "$ROOT/ai-control/plugin/index.mjs" ]; then
  OUT=$("$NODE_BIN" --input-type=module -e "
import { evaluate, Config } from '$ROOT/ai-control/plugin/index.mjs'
const st = { gatePassed: 2, gateTotal: 4, percent: 50, execAllowed: false,
             gates: [{ id: 'sync', name: '需求文档同步', status: 'pending', hint: 'x' }] }
const bash = (command) => ({ name: 'bash', arguments: { command } })
const cases = [
  ['cd && 脚本 check（旧逻辑下被拒的核心场景）', 'cd \\"$ROOT\\" && ./scripts/control_gates.sh check', true],
  ['分号连接',                                  'cd /tmp; ./scripts/control_gates.sh check', true],
  ['管道后',                                    'echo x | ./scripts/redundancy_scan.mjs', true],
  ['裸 bash 调用',                              'bash scripts/control_gates.sh check', true],
  ['绝对路径调用验证脚本',                       '$ROOT/scripts/verify_guard_live.sh', true],
  ['反例:普通写入（应拒）',                      'echo probe > probe_outside.txt', false],
  ['反例:cat 脚本（应拒）',                      'cat scripts/control_gates.sh', false],
]
let pass = 0, fail = 0
for (const [n, c, want] of cases) {
  const allowed = evaluate(bash(c), st, Config, 0) === undefined
  if (allowed === want) pass++
  else { fail++; console.log('  ✗ ' + n + ' → ' + (allowed ? '放行' : '拒绝') + '（期望' + (want ? '放行' : '拒绝') + '）') }
}
console.log(pass + '/' + (pass + fail) + ' ' + (fail === 0 ? 'OK' : 'FAIL'))
" 2>&1)
  if printf '%s' "$OUT" | grep -q 'OK$'; then
    ok "判定逻辑正确（$(printf '%s' "$OUT" | tail -1 | cut -d' ' -f1)）"
  else
    bad "判定逻辑有误 —— 门禁未过时可能无法自救"
    printf '%s\n' "$OUT" | sed 's/^/     /'
  fi
else
  bad "无法运行判定（缺 Node 或插件文件）"
fi
echo

# ── 2. 下一步该手动跑什么 ──────────────────────────────────────────────────────
echo "【2】宿主级实弹证据（必须由 AI 或你直接发起，不能包在脚本里）"
cat <<EOF

  为什么脚本不代劳：守卫判定的是**发起的那一条 bash 调用**。
  包在脚本内部的命令不经过守卫，测了也不算数。

  正确做法（两步，注意顺序）：

    第 1 步 · 制造门禁未过
      在工程内留一个未提交的改动即可让 G3 不过，例如：
        echo x >> README.md
      （跑完记得 git checkout -- README.md 还原）

    第 2 步 · 直接发起这条自救命令，看守卫放不放行
        cd "$ROOT" && ./scripts/control_gates.sh check

      ─ 放行 → ✅ 逃生舱已修好（这正是旧逻辑下被拒的那条）
      ─ 拒绝 → ❌ 修复未生效，或又出现新的判定缺口

  ⚠️ 顺序警告：请在【0 项显示已加载最新代码】之后再跑第 2 步。
     若仍是旧代码，第 2 步必然被拒，而且会把本次会话锁死
     （那时只能靠修改状态文件解套）。

  兜底：万一被锁死，改状态文件即可解套（只读工具与 edit 始终可用）：
        $HOME/.dsh/.dsh-control/status.json 里的 "execAllowed" 改成 true
EOF
echo

echo "═══════════════════════════════════════════════════════════"
printf ' 检查结果：通过 %d 项 · 失败 %d 项\n' "$PASS" "$FAIL"
if [ "$RESTARTED" = "0" ]; then
  printf ' ⏳ 尚未重启，宿主级证据待补\n'
elif [ "$FAIL" -eq 0 ]; then
  printf ' ✅ 已就绪，可按【2】执行宿主级实弹验证\n'
else
  printf ' ⚠️ 有失败项，见上方明细\n'
fi
echo "═══════════════════════════════════════════════════════════"
[ "$FAIL" -eq 0 ]
