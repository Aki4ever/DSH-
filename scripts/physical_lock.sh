#!/usr/bin/env bash
# ==============================================================================
# 底层物理锁 Agent CLI 工具 (scripts/physical_lock.sh)
# 用法：
#   ./scripts/physical_lock.sh status              # 查看当前会话的物理锁阶梯与凭据
#   ./scripts/physical_lock.sh advance <stage_num> # 推进物理锁至指定阶梯
#   ./scripts/physical_lock.sh reset               # 重置物理锁为初始态
#   ./scripts/physical_lock.sh sync                # 根据磁盘实况自适应同步推进物理锁
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ACTION="${1:-status}"
ARG2="${2:-}"

# Node 运行时解析（REQ-087 R1 修复）：裸 `node` 在 PATH 缺失时会让判定静默降级
# （实测 audit_execution 误报 36/100、todo_gate 直接 command not found）。
. "$SCRIPT_DIR/lib/find_node.sh"
NODE_BIN="$(find_node || true)"
if [ -z "$NODE_BIN" ]; then echo "❌ 找不到 Node 运行时（可设 DSH_NODE_BIN 指定）" >&2; exit 2; fi

"$NODE_BIN" -e '
import { getLockState, advanceLock, advanceLockTo, resetLock, STAGE_NAMES, STAGES } from "./scripts/lib/physical_lock.mjs"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

const sid = process.env.DSH_SESSION_ID || "global_session"
const action = process.argv[1] || "status"
const arg2 = process.argv[2] || ""

async function main() {
  if (action === "status") {
    const s = await getLockState(sid)
    console.log("🔒 底层物理锁状态看板")
    console.log("-----------------------------------------")
    console.log(`会话标识: ${s.sessionId}`)
    console.log(`当前锁阶: [${s.stage}] ${s.stageName}`)
    console.log(`更新时间: ${s.updatedAt}`)
    console.log("已签署凭据:")
    for (const [stage, p] of Object.entries(s.proofs || {})) {
      console.log(`  - ${STAGE_NAMES[stage] || stage}: ${JSON.stringify(p)}`)
    }
    console.log("-----------------------------------------")
  } else if (action === "advance") {
    const target = Number(arg2)
    if (isNaN(target)) {
      console.error("❌ 请提供合法的阶梯数字: 1(定标), 2(筹策), 3(质检), 4(结项)")
      process.exit(1)
    }
    const res = await advanceLock(sid, target, { trigger: "cli_advance", user: "system" })
    if (res.success) {
      console.log(`✅ 物理锁已成功推进至: [${res.stage}] ${STAGE_NAMES[res.stage]}`)
    } else {
      console.error(`❌ 推进失败: ${res.error}`)
      process.exit(1)
    }
  } else if (action === "reset") {
    await resetLock(sid)
    console.log("🔄 物理锁已重置为初始状态 LOCK-0 (初始探境)")
  } else if (action === "sync") {
    // 根据磁盘实况自动判定并推进
    const s = await getLockState(sid)
    const home = process.env.DSH_HOME || join(homedir(), ".dsh")
    // 双源取门禁快照：宿主控制目录写不进时，门禁会降级落到工程内（REQ-087 R1-b）。
    // 旧实现只读宿主那一份，于是"门禁其实全绿但状态没落进宿主目录"被判成无凭据。
    const statusCands = [
      join(home, ".dsh-control", "status.json"),
      join(process.cwd(), "ai-control", "reports", "state", "status.json"),
    ]
    let gatesOk = false
    for (const sp of statusCands) {
      if (!existsSync(sp)) continue
      try {
        const d = JSON.parse(readFileSync(sp, "utf8"))
        if (d.execAllowed) { gatesOk = true; break }
      } catch {}
    }

    // 逐阶凭据：LOCK-1 = 门禁全绿；LOCK-2 = 磁盘上真实存在且含进行中项的待办证据。
    // 为什么不只看门禁：门禁全绿只证明"有资格动手"，不证明"过程可见"。
    const proofs = {}
    if (gatesOk) proofs[STAGES.SPEC_PASSED] = { trigger: "sync_gates_ok" }
    let todoEvidence = null
    try {
      // 双源取待办证据：REQ-087 R1-a 后主源是**宿主会话转录**（不依赖拦截层插件），
      // 插件文件仅作较新者兜底；两者都读不到才算"无证据"。
      const { resolveTodoEvidenceSync } = await import("./scripts/lib/todo_tracker.mjs")
      const t = resolveTodoEvidenceSync(sid, home)
      if (t && t.total > 0 && t.inProgress > 0) {
        todoEvidence = t
        proofs[STAGES.PLAN_PASSED] = { trigger: "sync_todo_evidence", source: t.lastSource || "unknown", todos: t.total, inProgress: t.inProgress }
      }
    } catch {}

    const target = proofs[STAGES.PLAN_PASSED] ? STAGES.PLAN_PASSED
      : proofs[STAGES.SPEC_PASSED] ? STAGES.SPEC_PASSED
      : STAGES.INIT
    const res = await advanceLockTo(sid, target, proofs, home)
    if (res.advanced && res.advanced.length > 0) {
      console.log(`✅ 依据磁盘实况逐阶晋升：${res.advanced.map((n) => `LOCK-${n}`).join(" → ")}（当前 [${res.stage}] ${STAGE_NAMES[res.stage]}）`)
      if (!gatesOk) console.log("ℹ️ 门禁未全绿：LOCK-1 凭据不足，暂不晋升。")
      if (!todoEvidence) console.log("ℹ️ 待办证据缺失或无进行中项：LOCK-2 凭据不足，暂不晋升。")
    } else {
      console.log(`ℹ️ 当前物理锁状态保持: [${res.stage}] ${STAGE_NAMES[res.stage]}`)
      if (!gatesOk) console.log("   · 缺少 LOCK-1 凭据：门禁未全绿")
      if (!todoEvidence) console.log("   · 缺少 LOCK-2 凭据：待办证据缺失或无进行中项")
    }
  } else {
    console.error(`❌ 未知动作: ${action}`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error("物理锁执行异常:", err)
  process.exit(1)
})
' "$ACTION" "$ARG2"
