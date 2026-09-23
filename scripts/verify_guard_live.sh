#!/usr/bin/env bash
# ==============================================================================
# 拦截层上线验证 · 重启桌面端后运行
# ==============================================================================
# 用途：验证「重启后守卫是否真的在拦、看板是否真的在注入」。
#
# 为什么必须有这个脚本：`ai-control/plugin/*.mjs` 的改动**必须重启 DSH 桌面端**才生效。
# 重启前跑任何验证都只能证明"源码按契约写对了"，证明不了"宿主真的在用"。
# 而本轮修的核心缺陷（`loader.mjs` 导出 `inject = []`）恰恰就是一类
# **自检全绿但宿主根本没加载**的问题 —— 所以只有重启后的真实宿主行为才算证据。
#
# 用法（在规则库目录下）：
#   ./scripts/verify_guard_live.sh
#
# 退出码：0 = 全部通过；1 = 有项目失败（会指出是哪项）
# ==============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PASS=0; FAIL=0

ok()   { printf '  ✅ %s\n' "$1"; PASS=$((PASS+1)); }
bad()  { printf '  ❌ %s\n' "$1"; FAIL=$((FAIL+1)); }
info() { printf '     %s\n' "$1"; }

echo "═══════════════════════════════════════════════════════════"
echo " 拦截层上线验证 · 重启后检查"
echo " 工程：$ROOT"
echo "═══════════════════════════════════════════════════════════"
echo

# ── 0. 前置：确认真的重启过 ────────────────────────────────────────────────────
echo "【0】前置确认"
info "请确认你**刚刚重启过 DSH 桌面端**。"
info "若没有重启，下面第 2、3 项必然失败 —— 那是「没生效」而不是「有 bug」。"
echo

# ── 1. 源码契约层（重启前后都该通过，属基线）────────────────────────────────────
echo "【1】源码契约（基线，与重启无关）"
LOADER="$ROOT/ai-control/plugin/loader.mjs"
INDEX="$ROOT/ai-control/plugin/index.mjs"

if grep -qE "export const inject\s*=\s*\[\s*'tools'\s*\]" "$LOADER" 2>/dev/null; then
  ok "loader.mjs 导出 inject = ['tools']"
else
  bad "loader.mjs 的 inject 不是 ['tools']（这是本轮修的核心缺陷，请先检查文件）"
fi

# 契约一致性：loader 与 index 的 inject 必须一致，不一致就是又埋了同一个坑
# 只比数组**内容**，不比前缀（曾经因为拿 "export const inject=[...]" 跟
# "inject=[...]" 直接比字符串而误报失败 —— 比较方式本身也会造假阳性）
norm() { printf '%s' "$1" | grep -oE '\[[^]]*\]' | head -1 | tr -d " \t'\""; }
L_INJ=$(norm "$(grep -m1 -E "export const inject" "$LOADER" 2>/dev/null)")
I_INJ=$(norm "$(grep -m1 -E "inject[[:space:]]*=" "$INDEX" 2>/dev/null)")
if [ -n "$L_INJ" ] && [ -n "$I_INJ" ]; then
  if [ "$L_INJ" = "$I_INJ" ]; then
    ok "loader 与 index 的 inject 一致（$L_INJ）"
  else
    bad "loader 与 index 的 inject 不一致（宿主只读模型自己导出的那个）"
    info "loader: $L_INJ"
    info "index : $I_INJ"
  fi
else
  bad "无法解析 inject 声明"
fi
echo

# ── 2. 插件自检（48 项）────────────────────────────────────────────────────────
echo "【2】插件自检"
NODE_BIN=""
for c in "$(command -v node 2>/dev/null)" \
         "/Volumes/DSH Desktop/DSH Desktop.app/Contents/Resources/runtime/node" \
         "$(ls -d /Volumes/DSH*/DSH*.app/Contents/Resources/runtime/node 2>/dev/null | head -1)"; do
  [ -n "$c" ] && [ -x "$c" ] && { NODE_BIN="$c"; break; }
done

if [ -z "$NODE_BIN" ]; then
  bad "未找到 Node 运行时（快照里 node 不在 PATH，需用桌面端内置路径）"
else
  info "Node：$NODE_BIN"
  OUT=$("$NODE_BIN" "$ROOT/ai-control/plugin/selftest.mjs" 2>&1)
  RC=$?
  if [ $RC -eq 0 ]; then
    ok "插件自检通过（$(printf '%s' "$OUT" | grep -oE '通过 [0-9]+ / [0-9]+' | tail -1)）"
  else
    bad "插件自检失败"
    printf '%s\n' "$OUT" | tail -20 | sed 's/^/     /'
  fi
fi
echo

# ── 3. 门禁当前实况（守卫放行/拦截的判据来源）────────────────────────────────────
echo "【3】门禁实况（守卫据此决定放行还是拦截）"
if [ -x "$ROOT/scripts/control_gates.sh" ]; then
  BADGE=$(cd "$ROOT" && ./scripts/control_gates.sh badge 2>&1)
  info "$BADGE"
  if printf '%s' "$BADGE" | grep -q "4/4"; then
    ok "门禁 4/4 —— 守卫此时应【放行】普通改动"
  else
    ok "门禁未满 —— 守卫此时应【拦截】普通改动（这也是需要验证的状态）"
  fi
else
  bad "control_gates.sh 不可执行"
fi
echo

# ── 4. 重启后真实行为：需要人机配合 ────────────────────────────────────────────
cat <<'EOF'
【4】重启后真实行为验证（需要你在新会话里配合观察）

  这一项**脚本无法自动判定**：守卫是否真的注册、看板是否真的注入，
  证据在 DSH 宿主行为里，不在文件里。请在新会话中按下面两步看：

  4.1 看板注入
      ─ 现象：新会话中，每轮对话会**自动出现管控看板卡片**（四道门 + 量化数字）。
      ─ 判据：本轮修复前是「0 次注入」（48 会话 / 7668 步实测），
              修复后应每轮可见。
      ─ 若仍不注入：看 DSH 日志里是否有一次告警（本轮已把静默失败改为告警一次，
        文案含「看板」与「dsh-llm」）。有告警 = 修复生效但依赖仍缺失；无告警 = 没加载。

  4.2 守卫真实拦截
      ─ 方法：在**门禁未全通过**的状态下，试着改一个工程内的普通文件。
      ─ 期望：被拒绝，并给出理由（哪道门没过）。
      ─ 反例验证（必须做，防止"死锁"）：
          运行 `./scripts/control_gates.sh check` —— **这条命令必须始终可用**，
          否则门禁未过时你将无法自救。这属"逃生舱"设计，不是漏洞。
      ─ 若普通改动被放行：说明守卫仍未注册（回到第 1 项查契约）。

  4.3 记录结论
      ─ 请把 4.1 / 4.2 的实际观察结果告诉 AI，由其写入
        `docs/constraint_mechanism_optimize_3.md` 的「未验证项声明」，
        把该项从未验证改为已验证（或记录失败现象）。

EOF

echo "═══════════════════════════════════════════════════════════"
printf ' 自动检查结果：通过 %d 项 · 失败 %d 项\n' "$PASS" "$FAIL"
if [ "$FAIL" -eq 0 ]; then
  echo " ✅ 自动部分全部通过；第 4 项需人工观察后回报。"
else
  echo " ❌ 存在失败项，先修失败项再谈第 4 项。"
fi
echo "═══════════════════════════════════════════════════════════"
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
