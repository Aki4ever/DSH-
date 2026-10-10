#!/usr/bin/env bash
# ==============================================================================
# 管控耗时取证器 (control_profiler) — REQ-102 / EFF-NOFLOW
# ------------------------------------------------------------------------------
# 为什么需要它：本工程所有机制都要求"效率提升要有实数证据"，而在此之前，
# "一条受控命令要等多久、时间花在哪一项判定上"没有任何可复跑的载体——
# 人只能凭感觉说"好像有点慢"。没有基线的优化等于没有优化。
#
# 它做什么（只读，绝不改动任何仓库文件）：
#   ① 逐项实跑累积门禁 G0~G7 的判定命令，记录各自耗时与退出码；
#   ② 对 `scripts/control_gates.sh check` 做整跑计时，给出总耗时与占比最高的项；
#   ③ 把结果写成机读 JSON + 人读摘要，落盘到 ai-control/reports/state/。
#
# 用法：
#   bash scripts/control_profiler.sh                 # 全量取样（含整跑）
#   bash scripts/control_profiler.sh --quick         # 只测整跑 + 前三慢项（约 1 分钟）
#   bash scripts/control_profiler.sh --json          # 只出机读 JSON
#   bash scripts/control_profiler.sh --check         # 门禁口径：总耗时未超预算即退出码 0
# 退出码：0 达标（总耗时 <= 预算）；1 超预算；2 用法/环境错误
#
# 预算口径：`ai-control/config/perf_budget.conf` 的 `GATE_TOTAL_BUDGET_MS`
#   （阈值可调，改配置即生效；不允许把预算改大来"变绿"，改预算须在同一提交里写明理由）。
# ==============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT" || { echo "❌ 无法进入工程根：$ROOT" >&2; exit 2; }

. "$SCRIPT_DIR/lib/find_node.sh" 2>/dev/null || true
NODE_BIN="$(find_node 2>/dev/null || true)"; [ -n "$NODE_BIN" ] || NODE_BIN="node"

BUDGET_CONF="$ROOT/ai-control/config/perf_budget.conf"
BUDGET_MS=45000
if [ -f "$BUDGET_CONF" ]; then
  # shellcheck disable=SC1090
  . "$BUDGET_CONF"
  BUDGET_MS="${GATE_TOTAL_BUDGET_MS:-$BUDGET_MS}"
fi

MODE="full"
case "${1:-}" in
  --quick) MODE="quick" ;;
  --json)  MODE="json" ;;
  --check) MODE="check" ;;
  --measure) MODE="measure" ;;
  "")      MODE="full" ;;
  *) echo "用法：bash scripts/control_profiler.sh [--quick|--json|--check|--measure]" >&2; exit 2 ;;
esac

OUT_DIR="$ROOT/ai-control/reports/state"
mkdir -p "$OUT_DIR" 2>/dev/null || true
OUT_JSON="$OUT_DIR/perf_profile.json"

# ── 单项计时：毫秒级，输出 "耗时_毫秒 退出码 标签" ───────────────────────────────
now_ms() { "$NODE_BIN" -e 'process.stdout.write(String(Date.now()))' 2>/dev/null || python3 -c 'import time;print(int(time.time()*1000))'; }

measure() { # measure <标签> <命令...>
  local label="$1"; shift
  local t0 t1 rc
  t0="$(now_ms)"
  "$@" >/dev/null 2>&1
  rc=$?
  t1="$(now_ms)"
  printf '%s\t%s\t%s\n' "$((t1 - t0))" "$rc" "$label" >> "$TMP_ROWS"
}

TMP_ROWS="$(mktemp -t ctrlprof.XXXXXX)"
trap 'rm -f "$TMP_ROWS"' EXIT

# ── 逐项判定命令（与 control_gates.sh 实际调用同源；缺文件记"缺失"不折算通过）──
GATE_SLOW_ITEMS=(
  "全域覆盖：scope_audit.mjs --check|scripts/scope_audit.mjs|--check"
  "会话来源：session_source_audit.mjs --check|scripts/session_source_audit.mjs|--check"
  "区间并发：zone_concurrency.mjs --check|scripts/zone_concurrency.mjs|--check"
  "并发调度：butler_scheduler.mjs --check|scripts/butler_scheduler.mjs|--check"
  "需求版本：req_version_audit.mjs --check|scripts/req_version_audit.mjs|--check"
  "反空架子：anti_hallucination_audit.mjs --check|scripts/anti_hallucination_audit.mjs|--check"
  "知识库：knowledge_audit.mjs --check|scripts/knowledge_audit.mjs|--check"
  "立项规划：cli_plan_audit.mjs --check|scripts/cli_plan_audit.mjs|--check"
  "手机桥：mobile_bridge_audit.mjs --check|scripts/mobile_bridge_audit.mjs|--check"
  "写拦截：domain_scope_selftest.mjs --check|scripts/domain_scope_selftest.mjs|--check"
  "冗余扫描：redundancy_scan.mjs --root .|scripts/redundancy_scan.mjs|--root|."
  "物理触达：mechanism_audit.mjs --exit|scripts/mechanism_audit.mjs|--exit"
  "流程顺序：flow_control.mjs --check|scripts/flow_control.mjs|--check"
  "输出结构：output_audit.mjs --check|scripts/output_audit.mjs|--check"
  "用字合规：language_audit.mjs --check|scripts/language_audit.mjs|--check"
)

run_items() {
  local entry label file rest
  for entry in "${GATE_SLOW_ITEMS[@]}"; do
    label="${entry%%|*}"
    rest="${entry#*|}"
    file="${rest%%|*}"
    if [ ! -f "$ROOT/$file" ]; then
      printf '0\t127\t%s（判定器缺失）\n' "$label" >> "$TMP_ROWS"
      continue
    fi
    local -a args=()
    local IFS='|'
    for a in ${rest#*|}; do args+=("$a"); done
    unset IFS
    measure "$label" "$NODE_BIN" "$ROOT/$file" "${args[@]}"
  done
}

# ── 整跑：control_gates.sh check ────────────────────────────────────────────────
GATE_MS=0
run_gate() {
  local t0 t1
  t0="$(now_ms)"
  bash "$ROOT/scripts/control_gates.sh" check >/dev/null 2>&1
  t1="$(now_ms)"
  GATE_MS=$((t1 - t0))
}

case "$MODE" in
  quick) run_gate ;;
  measure) run_gate ;;
  check)
    # 门禁口径：**读上一次实测产物**判预算，绝不为了判定再整跑一次门禁
    #（那会把"降耗工具"本身变成新的耗时源——自我否定）。
    # 产物缺失/过旧（> 24h）/形状非法 → 退出码 2：取不到证据，绝不折算通过。
    if [ ! -f "$OUT_JSON" ]; then
      echo "⏱️  管控耗时取证 · REQ-102"
      echo "   ⛔ 取不到证据：$OUT_JSON 不存在。"
      echo "   取证：bash scripts/control_profiler.sh --measure（整跑一次并落盘）"
      exit 2
    fi
    "$NODE_BIN" - "$OUT_JSON" "$BUDGET_MS" <<'NODE'
const fs = require('node:fs')
const [p, budgetMs] = process.argv.slice(2)
let d
try { d = JSON.parse(fs.readFileSync(p, 'utf8')) } catch { console.log('   ⛔ 产物不可解析 → 取不到证据，不折算通过'); process.exit(2) }
const age = Date.now() - Date.parse(d.generatedAt || 0)
if (!Number.isFinite(d.gateTotalMs) || !Number.isFinite(age)) { console.log('   ⛔ 产物形状非法（缺 gateTotalMs / generatedAt）→ 不折算通过'); process.exit(2) }
if (age > 24 * 3600 * 1000) { console.log(`   ⛔ 产物过旧（${(age / 3600000).toFixed(1)}h > 24h）→ 请重跑 --measure`); process.exit(2) }
const ok = d.gateTotalMs <= Number(budgetMs)
console.log('⏱️  管控耗时取证 · REQ-102 / EFF-NOFLOW（读实测产物判预算）')
console.log(`   整跑 ${(d.gateTotalMs / 1000).toFixed(1)}s · 预算 ${(Number(budgetMs) / 1000).toFixed(1)}s · 产物时间 ${d.generatedAt}`)
if (Array.isArray(d.slowest) && d.slowest.length) {
  console.log('   最慢三项：' + d.slowest.slice(0, 3).map((r) => `${r.label} ${(r.ms / 1000).toFixed(2)}s`).join(' · '))
}
console.log(ok ? '   ✅ 在预算内' : '   ⛔ 超预算：先定位热点（--measure 看 slowest），或按 perf_budget.conf 注释说明后调预算')
process.exit(ok ? 0 : 1)
NODE
    ;;
  full|json)
    run_gate
    run_items
    ;;
esac

# ── 汇总（JSON 由 node 生成，避免手拼 JSON 出错）────────────────────────────────
"$NODE_BIN" - "$TMP_ROWS" "$GATE_MS" "$BUDGET_MS" "$OUT_JSON" "$MODE" <<'NODE'
const fs = require('node:fs')
const [rowsPath, gateMs, budgetMs, outPath, mode] = process.argv.slice(2)
const rows = fs.existsSync(rowsPath)
  ? fs.readFileSync(rowsPath, 'utf8').trim().split('\n').filter(Boolean).map((l) => {
      const [ms, rc, label] = l.split('\t')
      return { label, ms: Number(ms), rc: Number(rc) }
    })
  : []
const total = Number(gateMs)
const budget = Number(budgetMs)
const slow = [...rows].sort((a, b) => b.ms - a.ms).slice(0, 8)
const failed = rows.filter((r) => r.rc !== 0 && r.rc !== 1)
const doc = {
  requirement: 'REQ-102 / EFF-NOFLOW',
  generatedAt: new Date().toISOString(),
  mode,
  gateTotalMs: total,
  budgetMs: budget,
  withinBudget: total <= budget,
  itemCount: rows.length,
  slowest: slow,
  missingOrBroken: failed,
  note: '只读取证：本器不写仓库任何受管文件（仅写 ai-control/reports/state/perf_profile.json）',
}
fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n', 'utf8')
if (mode === 'json') { console.log(JSON.stringify(doc, null, 2)); process.exit(doc.withinBudget ? 0 : 1) }
console.log('⏱️  管控耗时取证 · REQ-102 / EFF-NOFLOW')
console.log(`   整跑 control_gates.sh check：${(total / 1000).toFixed(1)}s（预算 ${(budget / 1000).toFixed(1)}s · ${doc.withinBudget ? '✅ 达标' : '⛔ 超预算'}）`)
if (rows.length) {
  console.log('   逐项耗时（前 8 慢）：')
  for (const r of slow) console.log(`     ${(r.ms / 1000).toFixed(2).padStart(7)}s  rc=${r.rc}  ${r.label}`)
}
if (failed.length) console.log(`   ⚠️ 判定器缺失/异常 ${failed.length} 项：${failed.map((f) => f.label).join('、')}`)
console.log(`   机读产物：ai-control/reports/state/perf_profile.json`)
process.exit(doc.withinBudget ? 0 : 1)
NODE
