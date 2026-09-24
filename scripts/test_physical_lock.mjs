#!/usr/bin/env node
/**
 * ==============================================================================
 * 底层物理锁 Agent (Physical Lock Agent) 全量自检套件
 * ==============================================================================
 */

import {
  getLockState,
  advanceLock,
  resetLock,
  evaluatePhysicalLock,
  STAGES,
  STAGE_NAMES,
} from './lib/physical_lock.mjs'
import { evaluate, Config } from '../ai-control/plugin/index.mjs'

let pass = 0
let fail = 0
const results = []

function check(name, actual, expected) {
  const ok = actual === expected
  if (ok) {
    pass++
    console.log(`✅ ${name}`)
  } else {
    fail++
    console.error(`❌ ${name} | 期望: ${expected} | 实际: ${actual}`)
  }
  results.push({ ok, name, actual, expected })
}

console.log('=== 底层物理锁 Agent 核心自检 ===\n')

const testSid = 'test_session_physlock_' + Date.now()

// 1. 初始化测试
const s0 = await resetLock(testSid)
check('初始阶段为 LOCK-0 (INIT)', s0.stage, STAGES.INIT)

// 2. STAGE 0 下的物理阻断
const blockWrite0 = evaluatePhysicalLock({ name: 'write', arguments: { file_path: 'a.js' } }, s0)
check('STAGE 0 下 write 被物理阻断', blockWrite0 !== null, true)

const blockEdit0 = evaluatePhysicalLock({ name: 'edit', arguments: { file_path: 'a.js' } }, s0)
check('STAGE 0 下 edit 被物理阻断', blockEdit0 !== null, true)

const allowRead0 = evaluatePhysicalLock({ name: 'read', arguments: { file_path: 'a.js' } }, s0)
check('STAGE 0 下 read 始终放行', allowRead0, null)

const allowNameMe0 = evaluatePhysicalLock({ name: 'bash', arguments: { command: './scripts/name_me.sh "[新需001][30分] 测试"' } }, s0)
check('STAGE 0 下改名脚本放行', allowNameMe0, null)

// 3. 严格禁止跳步测试
const skipRes = await advanceLock(testSid, STAGES.PLAN_PASSED, { note: '尝试跳步' })
check('STAGE 0 禁止直接跳至 STAGE 2', skipRes.success, false)

// 4. 正确单步推进至 STAGE 1 (SPEC_PASSED)
const adv1 = await advanceLock(testSid, STAGES.SPEC_PASSED, { token: 'title_and_gates_ok' })
check('合法推进至 STAGE 1 成功', adv1.success, true)
const s1 = await getLockState(testSid)
check('当前阶段为 STAGE 1', s1.stage, STAGES.SPEC_PASSED)

// 5. STAGE 1 下的筹策锁定
const blockWrite1 = evaluatePhysicalLock({ name: 'write', arguments: { file_path: 'src/main.js' } }, s1)
check('STAGE 1 下未分解任务直接 write 被阻断', blockWrite1 !== null, true)

const allowTodo1 = evaluatePhysicalLock({ name: 'todo_write', arguments: { todos: [] } }, s1)
check('STAGE 1 下放行 todo_write', allowTodo1, null)

// 6. 推进至 STAGE 2 (PLAN_PASSED)
const adv2 = await advanceLock(testSid, STAGES.PLAN_PASSED, { token: 'todo_initialized' })
check('合法推进至 STAGE 2 成功', adv2.success, true)
const s2 = await getLockState(testSid)
check('当前阶段为 STAGE 2', s2.stage, STAGES.PLAN_PASSED)

// 7. STAGE 2 下的攻坚放行与质检前阻断
const allowWrite2 = evaluatePhysicalLock({ name: 'write', arguments: { file_path: 'src/main.js' } }, s2)
check('STAGE 2 下放行代码 write 攻坚', allowWrite2, null)

const blockPush2 = evaluatePhysicalLock({ name: 'bash', arguments: { command: 'git push origin main' } }, s2)
check('STAGE 2 下质检未完成阻断 git push', blockPush2 !== null, true)

// 8. 推进至 STAGE 3 (VERIFY_PASSED)
const adv3 = await advanceLock(testSid, STAGES.VERIFY_PASSED, { token: 'tests_and_scans_ok' })
check('合法推进至 STAGE 3 成功', adv3.success, true)
const s3 = await getLockState(testSid)
check('当前阶段为 STAGE 3', s3.stage, STAGES.VERIFY_PASSED)

const allowPush3 = evaluatePhysicalLock({ name: 'bash', arguments: { command: 'git push origin main' } }, s3)
check('STAGE 3 质检完成后放行 git push', allowPush3, null)

// 9. 插件 evaluate 联动测试（门禁全绿 + 物理锁 STAGE 1 阻断 write）
const statusClear = {
  gatePassed: 4, gateTotal: 4, percent: 100, execAllowed: true,
  currentGate: 'all-clear', currentGateName: '全部通过', gateIndex: 4,
  gates: []
}
const pluginBlocked = evaluate({ name: 'write', arguments: { file_path: 'a.js' } }, statusClear, Config, 0, s1)
check('门禁全绿时，若物理锁处于 STAGE 1，write 依然被插件物理阻断', pluginBlocked !== undefined && pluginBlocked.includes('底层物理锁硬阻断'), true)

// 10. 重置测试
await resetLock(testSid)
const sReset = await getLockState(testSid)
check('重置后恢复到 STAGE 0', sReset.stage, STAGES.INIT)

console.log(`\n通过 ${pass} / ${pass + fail}`)
if (fail > 0) {
  process.exit(1)
} else {
  console.log('🎉 底层物理锁自检全部通过！')
}
