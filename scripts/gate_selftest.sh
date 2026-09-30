#!/usr/bin/env bash
set -uo pipefail

# ==============================================================================
# 门禁"证据可证性"行为级回归自检 — scripts/gate_selftest.sh
# ==============================================================================
# 为什么必须存在这个脚本（缺陷出处）：
#   docs/constraint_mechanism_optimize_3.md 3.2 的 **V4**：
#     「检测器『退出码 0 + 空输出』即算通过」——`control_gates.sh` 用 `${x:-0}` 兜底为 0。
#   实测复现（修复前）：把 redundancy_scan.mjs 换成 `process.exit(0)`（零输出），
#   门禁照报 `✅ G4 通过 · 0 高相似块对 · 扫描 1 文件/0 实质块`。
#   即：**检测器根本没产出证据，看板反而是绿的**。
#
# 为什么不用"grep 源码有没有 `:-0`"来做回归：
#   那是**文字级**判定，改个写法（`x=${x-0}` / `x=$((x+0))` / 换个变量名）就绕过去了，
#   而且会随重构产生假阳性。本脚本做的是**行为级**判定：真的把桩检测器换成各种
#   "没证据"的形态，跑真门禁，断言它**不许通过**。改实现也能被抓住，改写法抓不住才怪。
#
# 用法：
#   ./scripts/gate_selftest.sh          # 跑全部用例，退出码 0=全过 / 1=有失败
#   ./scripts/gate_selftest.sh --list   # 只列用例名
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 允许指向任意版本的被测件（用于反证："把旧实现放进来，这套用例必须挂"）
GATES="${DSH_GATE_UNDER_TEST:-$SCRIPT_DIR/control_gates.sh}"

PASS_N=0; FAIL_N=0; TOTAL_N=0; FAILED_NAMES=()

c_ok()  { printf '\033[32m%s\033[0m' "$1"; }
c_bad() { printf '\033[31m%s\033[0m' "$1"; }

if [ "${1:-}" = "--list" ]; then
  cat <<'EOF'
T1  检测器退出码 0 + 空输出            → G4 必须 ⛔ 硬阻断（V4 本体）
T2  检测器退出码 0 + 输出 {}           → G4 必须 ⛔ 硬阻断（缺键）
T3  检测器退出码 0 + 键在但值为 null   → G4 必须 ⛔ 硬阻断（非数值）
T4  检测器退出码 0 + 自报 0 实质块     → G4 必须 ⛔ 硬阻断（与外壳文件数自相矛盾）
T5  检测器退出码 2 + unknowable        → G4 必须 ⛔ 硬阻断（原语义不许退化）
T6  检测器输出合法且非空               → G4 必须 ✅ 通过（反向验证：不误伤真通过）
T7  git 不可用（退出码非 0）           → G3 必须 ⛔ 硬阻断（故障不得伪装成待前序）
T8  git 正常但工作树干净（空输出）     → G3 必须 ✅ 通过（反向验证：空输出≠失败）
T9  快照被截断（门禁条目数不自洽）     → 不得采信快照，必须回退重算
EOF
  exit 0
fi

report() { # $1=用例号 $2=说明 $3=期望 $4=实际
  local name="[$1] $2"
  if [ "$3" = "$4" ]; then
    PASS_N=$((PASS_N+1)); TOTAL_N=$((TOTAL_N+1))
    printf '  %s %s\n' "$(c_ok '✅')" "$name"
    printf '      期望 %s · 实际 %s\n' "$3" "$4"
  else
    FAIL_N=$((FAIL_N+1)); TOTAL_N=$((TOTAL_N+1)); FAILED_NAMES+=("$name")
    printf '  %s %s\n' "$(c_bad '❌')" "$name"
    printf '      期望 %s · 实际 %s\n' "$3" "$4"
  fi
}

# ── 沙箱构造 ──────────────────────────────────────────────────────────────────
# 刻意复制**真的** control_gates.sh 到沙箱里跑，只替换检测器桩件：
# 断言的是真实现的真行为，而不是另写一份"参考实现"来自证。
make_sandbox() { # $1=检测器桩体(JS)
  local body="$1" dir
  dir="$(mktemp -d "${TMPDIR:-/tmp}/dsh-gate-selftest.XXXXXX")" || return 1
  mkdir -p "$dir/scripts" "$dir/ai-control/config" "$dir/rules" "$dir/docs"
  cp "$GATES" "$dir/scripts/control_gates.sh"
  chmod +x "$dir/scripts/control_gates.sh" 2>/dev/null
  printf '%s\n' "$body" > "$dir/scripts/redundancy_scan.mjs"
  # 至少一个受扫文件：让"外壳扫到文件数 > 0"这一交叉校验真的有输入
  printf '# a\n\n这是一段足够长的实质内容行，用于让外壳至少扫到一个文件。\n' > "$dir/rules/a.md"
  printf '# 台账\n\n### REQ-001 首条需求\n\n> - **当前系统实施总版本**：`v1.0.0`\n' > "$dir/docs/requirements.md"
  printf '%s' "$dir"
}

# 伪 git：$1 = 想返回的退出码（标准输出一律为空）
make_fake_git() { # $1=沙箱目录 $2=退出码
  local dir="$1" rc="$2"
  mkdir -p "$dir/fakebin"
  printf '#!/bin/sh\nexit %s\n' "$rc" > "$dir/fakebin/git"
  chmod +x "$dir/fakebin/git"
}

gate_status() { # $1=沙箱 $2=门禁id [$3=额外 PATH 前置]
  local dir="$1" id="$2" prefix="${3:-}" out
  out="$( cd "$dir" && PATH="${prefix:+$prefix:}$PATH" DSH_CONTROL_HOME="$dir/.state" \
          DSH_CONTROL_TTL=0 ./scripts/control_gates.sh json 2>/dev/null )"
  printf '%s\n' "$out" | grep -F "\"id\": \"$id\"" | head -1 \
    | sed -E 's/.*"status": "([a-z]+)".*/\1/'
}

card_output() { # $1=沙箱 [$2=PATH 前置]
  local dir="$1" prefix="${2:-}"
  ( cd "$dir" && PATH="${prefix:+$prefix:}$PATH" DSH_CONTROL_HOME="$dir/.state" \
    DSH_CONTROL_TTL=0 ./scripts/control_gates.sh card 2>/dev/null )
}

echo "🧪 门禁证据可证性回归自检（V4 缺陷锁定）"
echo "   被测对象：$GATES"
echo

# ── T1：V4 本体 ───────────────────────────────────────────────────────────────
d="$(make_sandbox 'process.exit(0)')"
report T1 "检测器退出码 0 + 空输出 → 不得算通过" "block" "$(gate_status "$d" redundancy)"
rm -rf "$d"

# ── T2：输出是合法 JSON 但缺必需键 ────────────────────────────────────────────
d="$(make_sandbox 'process.stdout.write("{}\n"); process.exit(0)')"
report T2 "检测器退出码 0 + 输出 {} → 缺键即无证据" "block" "$(gate_status "$d" redundancy)"
rm -rf "$d"

# ── T3：键在，值是 null（旧实现的 grep -oE '[0-9]+' 会静默给出空）─────────────
d="$(make_sandbox 'process.stdout.write(JSON.stringify({duplicatePairs:null,blocksScanned:12},null,2)+"\n"); process.exit(0)')"
report T3 "检测器输出值非法（null）→ 不得折算为 0" "block" "$(gate_status "$d" redundancy)"
rm -rf "$d"

# ── T4：JSON 全合法，但自报"什么都没看" ───────────────────────────────────────
# 这是最隐蔽的一种：光校验"字段存在且是数字"仍会放行，必须与外壳自己的文件数交叉校验。
d="$(make_sandbox 'process.stdout.write(JSON.stringify({duplicatePairs:0,blocksScanned:0},null,2)+"\n"); process.exit(0)')"
report T4 "自报 0 实质块而外壳扫到文件 → 证据自相矛盾" "block" "$(gate_status "$d" redundancy)"
rm -rf "$d"

# ── T5：原有 unknowable 语义不许在本次修复中退化 ──────────────────────────────
d="$(make_sandbox 'process.stdout.write(JSON.stringify({unknowable:true,duplicatePairs:0,blocksScanned:0},null,2)+"\n"); process.exit(2)')"
report T5 "检测器明确报不可判定（退出码 2）→ 硬阻断" "block" "$(gate_status "$d" redundancy)"
rm -rf "$d"

# ── T6：反向验证——真证据必须照常通过，不能"一刀切全堵死"────────────────────
d="$(make_sandbox 'process.stdout.write(JSON.stringify({duplicatePairs:0,blocksScanned:12},null,2)+"\n"); process.exit(0)')"
report T6 "检测器输出合法完整 → 照常通过（不误伤）" "pass" "$(gate_status "$d" redundancy)"
rm -rf "$d"

# ── T7：git 挂掉 → 不能显示成"已同步" ─────────────────────────────────────────
d="$(make_sandbox 'process.stdout.write(JSON.stringify({duplicatePairs:0,blocksScanned:12},null,2)+"\n"); process.exit(0)')"
make_fake_git "$d" 1
report T7 "git 退出码非 0 → 未提交数不可证实（硬阻断）" "block" "$(gate_status "$d" sync "$d/fakebin")"
rm -rf "$d"

# ── T8：反向验证——git 正常且工作树干净（空输出 + 退出码 0）必须通过 ──────────
d="$(make_sandbox 'process.stdout.write(JSON.stringify({duplicatePairs:0,blocksScanned:12},null,2)+"\n"); process.exit(0)')"
make_fake_git "$d" 0
report T8 "git 退出码 0 且输出为空（真的 0 个变更）→ 通过" "pass" "$(gate_status "$d" sync "$d/fakebin")"
rm -rf "$d"

# ── T9：半截快照不得被当作依据 ────────────────────────────────────────────────
# 旧实现只校验 gates 数组"非空"，于是 gateTotal=4 而实际只写了 2 条时，
# 依旧会拿它渲染看板（显示 4/4 通过，却只列得出 2 道门）。
d="$(make_sandbox 'process.stdout.write(JSON.stringify({duplicatePairs:0,blocksScanned:12},null,2)+"\n"); process.exit(0)')"
mkdir -p "$d/.state"
{
  printf '{\n  "version": 1,\n  "gatePassed": 4,\n  "gateTotal": 4,\n  "percent": 100,\n'
  printf '  "execAllowed": true,\n  "currentGate": "all-clear",\n  "currentGateName": "全部通过",\n'
  printf '  "gateIndex": 4,\n  "generatedAt": "2000-01-01 00:00:00",\n  "gates": [\n'
  printf '    { "id": "init", "name": "项目初始化", "status": "pass", "detail": "", "hint": "", "metricA": "0", "metricALabel": "-", "metricB": "0", "metricBLabel": "-" },\n'
  printf '    { "id": "structure", "name": "工程结构化", "status": "pass", "detail": "", "hint": "", "metricA": "0", "metricALabel": "-", "metricB": "0", "metricBLabel": "-" }\n'
  printf '  ]\n}\n'
} > "$d/.state/status.json"
touch "$d/.state/cache.env"      # 让缓存"看起来是新鲜的"，逼实现必须校验快照内容
out="$(card_output "$d")"
if printf '%s' "$out" | grep -q '4/4'; then
  report T9 "截断快照（4 声明 / 2 条目）不得被采信" "不采信" "采信了残快照"
else
  report T9 "截断快照（4 声明 / 2 条目）不得被采信" "不采信" "不采信"
fi
rm -rf "$d"

echo
if (( FAIL_N == 0 )); then
  printf '🎉 证据可证性自检全通过：%s/%s\n' "$PASS_N" "$TOTAL_N"
  exit 0
fi
printf '💥 存在失败：%s/%s（失败项：%s）\n' "$FAIL_N" "$TOTAL_N" "${FAILED_NAMES[*]}"
exit 1
