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

node -e '
import { getLockState, advanceLock, resetLock, STAGE_NAMES, STAGES } from "./scripts/lib/physical_lock.mjs"
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
    const statusPath = join(home, ".dsh-control", "status.json")
    let gatesOk = false
    if (existsSync(statusPath)) {
      try {
        const d = JSON.parse(readFileSync(statusPath, "utf8"))
        if (d.execAllowed) gatesOk = true
      } catch {}
    }

    if (gatesOk && s.stage === STAGES.INIT) {
      await advanceLock(sid, STAGES.SPEC_PASSED, { trigger: "auto_sync_gates_ok" })
      console.log("✅ 检测到开工门禁全绿，物理锁已自动推进至 LOCK-1 (探境定标达成)")
    } else {
      console.log(`ℹ️ 当前物理锁状态保持: [${s.stage}] ${s.stageName}`)
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
