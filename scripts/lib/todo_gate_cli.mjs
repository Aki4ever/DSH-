#!/usr/bin/env node
/**
 * ==============================================================================
 * 待办常显判定 CLI (scripts/lib/todo_gate_cli.mjs)
 * ==============================================================================
 * 由 `scripts/todo_gate.sh` 薄封装调用；也可直接 `node scripts/lib/todo_gate_cli.mjs <动作>`。
 *
 * 动作：
 *   status     人读状态看板（排查用）
 *   check      机器判定：合规退出 0，不合规退出 1（审计与物理锁消费）
 *   json       输出证据 JSON
 *   record X   落盘一次证据（X 为 JSON 字符串）
 *   selftest   判定逻辑三态自检
 *
 * 为什么做成独立 .mjs 而不是塞进 bash -e 字符串：
 *   历史踩坑——把判定逻辑写进 shell 的 heredoc 里，引号转义一层套一层，
 *   既无法单测也无法读回校验。判定逻辑必须是可 import、可单测的纯代码。
 * ==============================================================================
 */

import { checkTodoGate, formatTodoLine, recordTodoWrite, resolveTodoEvidenceSync } from './todo_tracker.mjs'

const action = process.argv[2] || 'status'
const arg2 = process.argv[3] || ''
const sid = process.env.DSH_SESSION_ID || 'global_session'

async function status() {
  console.log('🧾 待办常显状态看板 (S07)')
  console.log('-----------------------------------------')
  console.log(`会话标识: ${sid}`)
  console.log(formatTodoLine(sid))
  const ev = resolveTodoEvidenceSync(sid)
  if (ev) {
    console.log(`证据时间: ${ev.updatedAt} · 落盘次数: ${ev.writes}`)
    for (const it of ev.items) {
      const mark = it.status === 'completed' ? '✅' : it.status === 'in_progress' ? '🔄' : '⏸️'
      console.log(`  ${mark} ${it.content}`)
    }
  }
  console.log('-----------------------------------------')
}

async function json() {
  const r = checkTodoGate(sid)
  const ev = r.evidence || resolveTodoEvidenceSync(sid)
  console.log(JSON.stringify({ pass: r.ok, code: r.code, message: r.message, evidence: ev }, null, 2))
}

async function record() {
  if (!arg2) {
    console.error("❌ record 需要一段 JSON，例如 '{\"todos\":[{\"content\":\"x\",\"status\":\"in_progress\"}]}'")
    process.exit(2)
  }
  let parsed
  try {
    parsed = JSON.parse(arg2)
  } catch (e) {
    console.error('❌ JSON 解析失败: ' + e.message)
    process.exit(2)
  }
  const ev = await recordTodoWrite(sid, parsed, undefined, { source: 'cli_record' })
  console.log(ev ? `✅ 证据已落盘：${ev.total} 项，进行中 ${ev.inProgress} 项` : '❌ 落盘失败')
  process.exit(ev ? 0 : 1)
}

/** 三态自检：把判定逻辑的三条分支各跑一遍，任何环境可复现。 */
async function selftest() {
  const tmpHome = process.env.DSH_TODO_SELFTEST_HOME
  if (!tmpHome) {
    console.error('❌ selftest 需要 DSH_TODO_SELFTEST_HOME 指向一个临时目录')
    process.exit(2)
  }
  const fakeSid = 'selftest-session'
  let passed = 0
  const total = 3

  // 态 1：从未写入 → NO_TODO
  const r1 = checkTodoGate(fakeSid, tmpHome)
  if (!r1.ok && r1.code === 'NO_TODO') { console.log('✅ 态1 无证据 → NO_TODO 阻断'); passed++ }
  else console.error('❌ 态1 期望 NO_TODO，实得 ' + r1.code)

  // 态 2：全部 completed（假收尾）→ NO_IN_PROGRESS
  await recordTodoWrite(fakeSid, { todos: [
    { content: '步骤一', status: 'completed' },
    { content: '步骤二', status: 'completed' },
  ] }, tmpHome, { source: 'selftest' })
  const r2 = checkTodoGate(fakeSid, tmpHome)
  if (!r2.ok && r2.code === 'NO_IN_PROGRESS') { console.log('✅ 态2 全部完成 → NO_IN_PROGRESS 阻断'); passed++ }
  else console.error('❌ 态2 期望 NO_IN_PROGRESS，实得 ' + r2.code)

  // 态 3：含 in_progress → PASS
  await recordTodoWrite(fakeSid, { todos: [
    { content: '步骤一', status: 'completed' },
    { content: '步骤二', status: 'in_progress' },
  ] }, tmpHome, { source: 'selftest' })
  const r3 = checkTodoGate(fakeSid, tmpHome)
  if (r3.ok && r3.code === 'PASS') { console.log(`✅ 态3 有进行中项 → PASS（${r3.evidence.percent}%）`); passed++ }
  else console.error('❌ 态3 期望 PASS，实得 ' + r3.code)

  console.log(`—— 自检结果：${passed}/${total} 通过`)
  process.exit(passed === total ? 0 : 1)
}

const actions = { status, json, record, selftest, check: async () => {
  const r = checkTodoGate(sid)
  console.log((r.ok ? '✅ ' : '⛔ ') + r.message)
  process.exit(r.ok ? 0 : 1)
} }

const fn = actions[action]
if (!fn) {
  console.error('❌ 未知动作: ' + action)
  process.exit(2)
}
fn().catch((e) => {
  console.error('❌ 判定异常: ' + (e?.message || e))
  process.exit(2)
})
