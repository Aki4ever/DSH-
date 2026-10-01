#!/usr/bin/env node
/**
 * ==============================================================================
 * 一键重启端到端判定器  restart_verify.mjs
 * ==============================================================================
 * 解决的问题（REQ-091 / R2）：
 *   用户实测反馈"点重启按钮没执行重启"。可本工程在此之前**没有任何东西能判定
 *   '到底重启了没有'** —— 没有 PID 取数器、没有前后比对、没有留痕。
 *   于是只有两种结局：要么相信按钮的回执文本，要么全靠人肉记忆 PID。
 *
 * 本脚本把 R2 的唯一合格证据落成三步可跑流程：
 *   ① `--record`  记下**点击前**的宿主 PID（连同取数来源）；
 *   ② 人去点按钮（会重启应用，当前会话中断）；
 *   ③ `--compare` 记下**恢复后**的宿主 PID，与基准比对 —— **不同才算重启成功**。
 *
 * 诚实边界（必须写清，不许越界宣称）：
 *   · 本脚本**不能自己点击按钮**，也不能在重启中存活；它只负责取证与判定。
 *   · "取不到 PID" 与 "PID 没变" 在证据上等价，一律判**未证明重启**（fail-closed）。
 *
 * 用法：
 *   node scripts/restart_verify.mjs --record      # 记录重启前基准
 *   node scripts/restart_verify.mjs --status      # 看基准 + 当前 PID 与差异
 *   node scripts/restart_verify.mjs --compare     # 比对并把结论写入台账
 *   node scripts/restart_verify.mjs selftest      # 自检（纯函数反向用例）
 *
 * 退出码：0 已证明重启（PID 确实变了）/ 1 未证明（PID 相同或取不到）/ 2 用法错误
 * ==============================================================================
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  resolveHostPid,
  pidStatePath,
  readPidSnapshot,
  pidChanged,
  candidatePorts,
} from './lib/host_pid.mjs'
import { withLockSync } from './lib/atomic_lock.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const JOURNAL = join(REPO_ROOT, 'ai-control', 'reports', 'state', 'restart_verify.jsonl')

/** 追加一条判定留痕（加锁：可能被多会话/多脚本并发写）。 */
function appendJournal(entry) {
  mkdirSync(dirname(JOURNAL), { recursive: true })
  withLockSync('state:restart_verify', () => {
    const prev = existsSync(JOURNAL) ? readFileSync(JOURNAL, 'utf8') : ''
    writeFileSync(JOURNAL, prev + JSON.stringify(entry) + '\n', 'utf8')
  }, { why: '重启判定留痕', staleMs: 30_000 })
}

function cmdRecord() {
  const r = resolveHostPid()
  const snap = { pid: r.pid, via: r.via, port: r.port, at: new Date().toISOString(), phase: 'before' }
  mkdirSync(dirname(pidStatePath()), { recursive: true })
  withLockSync('state:host_pid', () => {
    writeFileSync(pidStatePath(), `${JSON.stringify(snap, null, 2)}\n`, 'utf8')
  }, { why: '宿主 PID 基准落盘', staleMs: 30_000 })
  console.log('📌 已记录重启前基准')
  console.log(`   宿主 PID：${snap.pid}（取数来源：${snap.via}${snap.port ? ' · 端口 ' + snap.port : ''}）`)
  console.log('   下一步：点界面上的「⏻ 重启」按钮（会中断当前会话）')
  console.log('   恢复后跑：node scripts/restart_verify.mjs --compare')
  return 0
}

function cmdStatus() {
  const snap = readPidSnapshot()
  console.log('🔎 一键重启判定 · 当前状态')
  console.log('-----------------------------------------')
  if (!snap) {
    console.log('基准：⛔ 尚未记录（先跑 --record）')
  } else {
    console.log(`基准：PID ${snap.pid} · ${snap.via} · ${snap.at}`)
  }
  try {
    const now = resolveHostPid()
    console.log(`当前：PID ${now.pid} · ${now.via}${now.port ? ' · 端口 ' + now.port : ''}`)
    if (snap) {
      const changed = pidChanged(snap.pid, now.pid)
      console.log(changed ? '结论：✅ PID 已变化 —— 已证明发生过重启' : '结论：⛔ PID 未变化 —— 未证明重启')
    }
  } catch (err) {
    console.log(`当前：⛔ 取不到 PID（${err.message}）`)
  }
  return 0
}

function cmdCompare() {
  const snap = readPidSnapshot()
  if (!snap) {
    console.error('⛔ 没有重启前基准：先跑 node scripts/restart_verify.mjs --record')
    return 1
  }
  let now
  try {
    now = resolveHostPid()
  } catch (err) {
    appendJournal({ at: new Date().toISOString(), before: snap.pid, after: null, changed: false, reason: err.message })
    console.error(`⛔ 未证明重启：恢复后取不到宿主 PID（${err.message}）`)
    return 1
  }
  const changed = pidChanged(snap.pid, now.pid)
  appendJournal({
    at: new Date().toISOString(),
    before: snap.pid,
    beforeAt: snap.at,
    beforeVia: snap.via,
    after: now.pid,
    afterVia: now.via,
    changed,
    reason: changed ? 'PID 不同' : 'PID 相同（未证明重启）',
  })
  console.log('🧪 一键重启端到端判定')
  console.log('-----------------------------------------')
  console.log(`重启前：PID ${snap.pid}（${snap.via}）`)
  console.log(`重启后：PID ${now.pid}（${now.via}）`)
  console.log('-----------------------------------------')
  if (changed) {
    console.log('✅ 已证明重启：宿主 PID 确实发生变化（这是 R2 的唯一合格证据）')
    return 0
  }
  console.log('⛔ 未证明重启：PID 相同或不可比 —— 不得声称"已修复"')
  console.log('   排查顺序：① 按钮是否真发出 /restart-dsh confirm？')
  console.log('             ② 宿主半是否注册了该命令（看宿主日志/命令面板）？')
  console.log('             ③ 分离进程是否真退出并重开了应用？')
  return 1
}

/** 自检：纯函数反向用例（不碰真宿主）。 */
function cmdSelftest() {
  let pass = 0, fail = 0
  const chk = (n, c, e = '') => { if (c) { pass++; console.log(`  ✅ ${n}${e ? ' · ' + e : ''}`) } else { fail++; console.log(`  ❌ ${n}${e ? ' · ' + e : ''}`) } }
  console.log('🧪 restart_verify 自检')
  chk('正向：12345 → 67890 判为已变化', pidChanged(12345, 67890) === true)
  chk('反向：同一 PID 判为未变化', pidChanged(100, 100) === false)
  chk('反向：字符串同一 PID 判为未变化', pidChanged('100', '100') === false)
  chk('反向：缺一侧 → 未变化（fail-closed）', pidChanged(100, null) === false)
  chk('反向：空字符串 → 未变化', pidChanged('', '200') === false)
  chk('反向：非数字 → 未变化', pidChanged('abc', '200') === false)
  chk('反向：0/负数 → 未变化', pidChanged(0, 200) === false && pidChanged(-5, 200) === false)

  const ports = candidatePorts({ DSH_WEB_URL: 'http://127.0.0.1:19387' })
  chk('端口解析：优先取 DSH_WEB_URL 的端口', ports[0] === 19387, JSON.stringify(ports))
  const ports2 = candidatePorts({ DSH_WEB_URL: '不是URL' })
  chk('反向：坏 URL 不炸，退回默认候选', Array.isArray(ports2) && ports2.length > 0, JSON.stringify(ports2))
  console.log('-----------------------------------------')
  console.log(`共 ${pass + fail} 项 · ${fail === 0 ? '🎉 全部通过' : `❌ ${fail} 项未过`}`)
  return fail === 0 ? 0 : 1
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes('selftest')) return cmdSelftest()
  if (args.includes('--record')) return cmdRecord()
  if (args.includes('--status')) return cmdStatus()
  if (args.includes('--compare')) return cmdCompare()
  console.error('用法：restart_verify.mjs <--record|--status|--compare|selftest>')
  return 2
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isDirectRun) process.exit(main())
