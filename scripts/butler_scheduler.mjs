#!/usr/bin/env node
/**
 * ==============================================================================
 * 脚本名称：butler_scheduler.mjs
 * 核心功能：管家侧**有界并发调度器** —— 先证明可并行，再派单；有冲突、有环、有活锁一律拒单
 * 需求依据：REQ-093 / R3「管家可调配执行层并发，处理好调度问题，拒绝死循环和死锁」
 * ------------------------------------------------------------------------------
 * 为什么需要它（本轮实测缺口 G3）：
 *   三把并行锁的原语早就落地了（`declare_lock_set.py` / `detect_lock_conflict.py` /
 *   `verify_no_lock_violation.py`），但全仓检索只有它们自己的文档引用它们——
 *   **没有任何生产调用方**，也就是"有原语、没人接线"。管家文档第 5.8 条写了
 *   "并行派单前过 parallel-lock-guard"，可运行时没有东西执行这条。本脚本就是那条接线。
 *
 * 判据一律复用，不另立第二套（本工程明令禁止同一判据两处实现）：
 *   锁集合归一化     ← skills/declare-lock-set/scripts/declare_lock_set.py
 *   冲突 / 死锁 / 超时 ← skills/detect-lock-conflict/scripts/detect_lock_conflict.py
 *   派单前五项断言   ← skills/verify-no-lock-violation/scripts/verify_no_lock_violation.py
 *   死循环（活锁）   ← 复用 anti-pattern-policy 的 AP-01（同一任务 + 相邻完全相同的锁集合 ≥5 次）
 *   实例安全档位     ← skill-pool/docs/operations/instance-safety.json（single_only 强制串行）
 *
 * 用法：
 *   node scripts/butler_scheduler.mjs --plan <tasks.jsonl> [--json]          # 只出方案（默认，不执行）
 *   node scripts/butler_scheduler.mjs --run  <tasks.jsonl> [--concurrency 4] # 真派单（逐条跑 cmd）
 *   node scripts/butler_scheduler.mjs --check                                # 判定：四类固化用例逐条实跑
 *   node scripts/butler_scheduler.mjs --self-test                            # 反向用例：冲突/环/活锁必须被拒
 *
 * tasks.jsonl 每行：{"task":"t1","locks":["assets:a"],"depends_on":["t0"],"timeout_s":300,"cmd":"..."}
 *
 * 退出码：
 *   0 = 方案成立（--plan/--run 全部任务成功；--check 全过）
 *   1 = 拒单（冲突 / 死锁环 / 超时 / 活锁 AP-01 / 有界并发被破坏）
 *   2 = 取不到证据（输入不可读、依赖脚本不可用）
 * ==============================================================================
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const STATE_DIR = path.join(ROOT, 'ai-control/reports/state')
const LEDGER_JSON = path.join(STATE_DIR, 'butler_scheduler.json')
const LEDGER_JSONL = path.join(STATE_DIR, 'butler_scheduler.jsonl')

const P_DECLARE = path.join(ROOT, 'skills/declare-lock-set/scripts/declare_lock_set.py')
const P_DETECT = path.join(ROOT, 'skills/detect-lock-conflict/scripts/detect_lock_conflict.py')
const P_VERIFY = path.join(ROOT, 'skills/verify-no-lock-violation/scripts/verify_no_lock_violation.py')

const DEFAULT_CONCURRENCY = 4 // 有界并发上界（REQ-093 分歧 4 采用口径）
const DEFAULT_TIMEOUT_S = 300
const AP01_REPEAT = 5 // 复用 anti-pattern-policy AP-01：相邻相同 state ≥5 次即判死循环

// ── 基础工具 ────────────────────────────────────────────────────────────────
function readTasks(file) {
  let txt
  try {
    txt = fs.readFileSync(file, 'utf8')
  } catch {
    return { ok: false, reason: `输入不可读：${file}` }
  }
  const rows = []
  const lines = txt.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (!t || t.startsWith('#')) continue
    let obj
    try {
      obj = JSON.parse(t)
    } catch {
      return { ok: false, reason: `第 ${i + 1} 行不是合法 JSON` }
    }
    if (typeof obj.task !== 'string' || obj.task.length === 0) {
      return { ok: false, reason: `第 ${i + 1} 行缺 task 字段` }
    }
    rows.push(obj)
  }
  if (rows.length === 0) return { ok: false, reason: '任务清单为空' }
  return { ok: true, rows }
}

function runPy(script, args) {
  try {
    const out = execFileSync('python3', [script, ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return { code: 0, json: JSON.parse(out) }
  } catch (error) {
    const out = (error && error.stdout) || ''
    const code = typeof error.status === 'number' ? error.status : 2
    try {
      return { code, json: JSON.parse(out) }
    } catch {
      return { code: 2, json: null, reason: (error && error.message) || '未知错误' }
    }
  }
}

function instanceSafety() {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'skill-pool/docs/operations/instance-safety.json'), 'utf8'))
    const m = new Map()
    for (const s of d.skills || []) m.set(s.id, s)
    return m
  } catch {
    return new Map()
  }
}

// ── AP-01 活锁判据（复用 anti-pattern-policy，不另立） ────────────────────────
/**
 * AP-01：同一 task 连续出现且相邻 locks 完全相同 ≥5 次 → 判死循环。
 * 输入是本次任务序列 + 历史留痕；锁集合就是该步的 state，任务名就是 action。
 */
function ap01Livelock(tasks, history = []) {
  const seq = [...history, ...tasks].map((t) => ({ task: t.task, state: JSON.stringify([...(t.locks || [])].sort()) }))
  const hits = []
  let run = 1
  for (let i = 1; i < seq.length; i++) {
    if (seq[i].task === seq[i - 1].task && seq[i].state === seq[i - 1].state) run++
    else run = 1
    if (run >= AP01_REPEAT) hits.push({ task: seq[i].task, state: seq[i].state, repeats: run })
  }
  return hits
}

// ── 调度核心 ────────────────────────────────────────────────────────────────
/**
 * 前置裁决：三把锁原语逐环实跑，任一环不过即**拒单**（返回 ok:false）。
 * 顺序固定：声明 → 检测 → 断言，不可跳步。
 */
export function adjudicate(tasksFile, opts = {}) {
  const conc = opts.concurrency ?? DEFAULT_CONCURRENCY
  if (!Number.isInteger(conc) || conc < 1 || conc > DEFAULT_CONCURRENCY) {
    return { ok: false, exit: 1, stage: 'bounded-concurrency', reason: `并发度 ${conc} 非法：必须在 1~${DEFAULT_CONCURRENCY} 之间（拒绝无界并发）` }
  }

  const read = readTasks(tasksFile)
  if (!read.ok) return { ok: false, exit: 2, stage: 'input', reason: read.reason }

  const decl = runPy(P_DECLARE, ['--from-json', tasksFile, '--json'])
  if (!decl.json) return { ok: false, exit: 2, stage: 'declare', reason: `declare_lock_set 不可用：${decl.reason || '输出不可解析'}` }
  if (decl.code !== 0) {
    return {
      ok: false,
      exit: 1,
      stage: 'declare',
      reason: '锁集合声明不合法（缺锁或非规范顺序）',
      evidence: { missing_locks: decl.json.missing_locks || [], non_canonical: decl.json.non_canonical || [] },
    }
  }

  const det = runPy(P_DETECT, ['--from-json', tasksFile, '--json'])
  if (!det.json) return { ok: false, exit: 2, stage: 'detect', reason: `detect_lock_conflict 不可用：${det.reason || '输出不可解析'}` }

  const conflicts = det.json.conflicts || []
  const cycles = det.json.deadlock_cycles || []
  const timeouts = det.json.timeouts || []
  const groups = det.json.parallel_groups || []
  const serialPlan = det.json.serialization_plan || []

  if (conflicts.length || cycles.length || timeouts.length) {
    return {
      ok: false,
      exit: 1,
      stage: 'detect',
      reason: '存在锁冲突 / 死锁环 / 超时未释放 —— 先证明可并行，再谈派单',
      evidence: { conflicts, deadlock_cycles: cycles, timeouts },
      parallel_groups: groups,
      serialization_plan: serialPlan,
    }
  }

  const ver = runPy(P_VERIFY, ['--from-json', tasksFile, '--json'])
  if (!ver.json) return { ok: false, exit: 2, stage: 'verify', reason: `verify_no_lock_violation 不可用：${ver.reason || '输出不可解析'}` }
  if (ver.code !== 0) {
    return {
      ok: false,
      exit: 1,
      stage: 'verify',
      reason: '派单前五项断言未全过',
      evidence: { violations: ver.json.violations || [], checks: ver.json.checks || [] },
    }
  }

  const safety = instanceSafety()
  const serial = new Set(serialPlan.map((p) => [...p].sort().join('|')))
  for (const t of read.rows) {
    const row = safety.get(t.task)
    if (row && row.instance_safety === 'single_only') {
      // single_only 不得与其他任何任务同批：把它自己加进串行对
      for (const o of read.rows) {
        if (o.task !== t.task) serial.add([t.task, o.task].sort().join('|'))
      }
    }
  }

  const history = opts.history ?? readLedger().slice(-AP01_REPEAT * 4)
  const livelock = ap01Livelock(read.rows, history)
  if (livelock.length) {
    return {
      ok: false,
      exit: 1,
      stage: 'ap-01',
      reason: `命中 AP-01 活锁（同一任务 + 相邻完全相同的锁集合 ≥${AP01_REPEAT} 次）—— 禁止再派单`,
      evidence: { livelock },
    }
  }

  const plan = greedySchedule(read.rows, { concurrency: conc, serial })
  return {
    ok: true,
    exit: 0,
    tasks: read.rows,
    parallel_groups: groups,
    serialization_plan: serialPlan,
    serialPairs: [...serial],
    plan,
    concurrency: conc,
  }
}

/** 贪心有界并发：三个条件同时满足才可并发启动 —— 依赖已完、并发未满、与在跑任务既无串行对也无锁交集。 */
function greedySchedule(tasks, { concurrency, serial }) {
  const lockSets = new Map(tasks.map((t) => [t.task, new Set(t.locks || [])]))
  const done = new Set()
  const pending = new Set(tasks.map((t) => t.task))
  const waves = []
  let guard = 0
  while (pending.size && guard++ <= tasks.length + 1) {
    const wave = []
    const running = []
    for (const t of tasks) {
      if (!pending.has(t.task) || wave.length >= concurrency) continue
      const depsOk = (t.depends_on || []).every((d) => done.has(d))
      if (!depsOk) continue
      const clash = running.some((r) => {
        if (serial.has([r, t.task].sort().join('|'))) return true
        for (const k of lockSets.get(t.task)) if (lockSets.get(r).has(k)) return true
        return false
      })
      if (clash) continue
      wave.push(t.task)
      running.push(t.task)
    }
    if (wave.length === 0) break // 剩下的互相冲突或依赖成环 → 交由串行化计划排队
    for (const t of wave) {
      pending.delete(t)
      done.add(t)
    }
    waves.push(wave)
  }
  const leftover = [...pending]
  return { waves, leftover }
}

// ── 留痕 ────────────────────────────────────────────────────────────────────
function readLedger() {
  try {
    return fs
      .readFileSync(LEDGER_JSONL, 'utf8')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l))
  } catch {
    return []
  }
}

function writeLedger(entry) {
  fs.mkdirSync(STATE_DIR, { recursive: true })
  fs.appendFileSync(LEDGER_JSONL, JSON.stringify(entry) + '\n')
  fs.writeFileSync(LEDGER_JSON, JSON.stringify(entry, null, 2))
}

// ── 真派单（--run） ─────────────────────────────────────────────────────────
async function dispatch(adj, opts) {
  const timeoutS = opts.timeoutS ?? DEFAULT_TIMEOUT_S
  const results = []
  for (const wave of adj.plan.waves) {
    const running = wave.map((name) => {
      const t = adj.tasks.find((x) => x.task === name)
      return runOne(t, timeoutS)
    })
    const settled = await Promise.all(running)
    results.push(...settled)
    if (settled.some((r) => r.status !== 'ok')) break // 一环失败即停止后续波次，不放任雪崩
  }
  return results
}

function runOne(task, timeoutS) {
  return new Promise((resolve) => {
    if (!task.cmd) return resolve({ task: task.task, status: 'skipped', detail: '未提供 cmd（规划模式）' })
    const child = spawn('bash', ['-c', task.cmd], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let killed = false
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (out += d))
    const timer = setTimeout(() => {
      killed = true
      child.kill('SIGKILL')
    }, (task.timeout_s ?? timeoutS) * 1000)
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({
        task: task.task,
        status: killed ? 'timeout' : code === 0 ? 'ok' : 'failed',
        code,
        tail: out.slice(-400),
      })
    })
  })
}

// ── 判定与反向用例 ──────────────────────────────────────────────────────────
function fixture(lines) {
  const f = path.join(os.tmpdir(), `butler_scheduler_fixture_${process.pid}_${Math.random().toString(36).slice(2)}.jsonl`)
  fs.writeFileSync(f, lines.join('\n') + '\n')
  return f
}

export function cmdCheck(opts = {}) {
  const cases = [
    {
      name: '可并行（锁两两不相交）',
      lines: [
        JSON.stringify({ task: 't1', locks: ['assets:a'], cmd: 'true' }),
        JSON.stringify({ task: 't2', locks: ['assets:b'], cmd: 'true' }),
      ],
      expect: 'pass',
    },
    {
      name: '锁冲突（同一资源键）→ 必须拒单',
      lines: [
        JSON.stringify({ task: 't1', locks: ['assets:shared'], cmd: 'true' }),
        JSON.stringify({ task: 't2', locks: ['assets:shared'], cmd: 'true' }),
      ],
      expect: 'refuse',
    },
    {
      name: '死锁环（t1→t2→t1）→ 必须拒单',
      lines: [
        JSON.stringify({ task: 't1', locks: ['assets:a'], depends_on: ['t2'], cmd: 'true' }),
        JSON.stringify({ task: 't2', locks: ['assets:b'], depends_on: ['t1'], cmd: 'true' }),
      ],
      expect: 'refuse',
    },
    {
      name: 'AP-01 活锁（历史里同任务 + 相同锁集合已连续 4 次，本次第 5 次）→ 必须拒单',
      lines: [JSON.stringify({ task: 'loop-task', locks: ['assets:a'], cmd: 'true' })],
      history: Array.from({ length: AP01_REPEAT - 1 }, () => ({ task: 'loop-task', locks: ['assets:a'] })),
      expect: 'refuse',
      expectStage: 'ap-01',
    },
    {
      name: '无界并发（--concurrency 0）→ 必须拒单',
      concurrency: 0,
      lines: [JSON.stringify({ task: 't1', locks: ['assets:a'], cmd: 'true' })],
      expect: 'refuse',
    },
  ]

  const results = []
  for (const c of cases) {
    const f = fixture(c.lines)
    let adj
    try {
      adj = adjudicate(f, { concurrency: c.concurrency, history: c.history })
    } finally {
      try {
        fs.rmSync(f, { force: true })
      } catch {
        /* 临时件清理失败不影响判定 */
      }
    }
    const refused = !adj.ok
    const got = refused ? 'refuse' : 'pass'
    const stageOk = !c.expectStage || (adj.stage === c.expectStage)
    const pass = got === c.expect && stageOk
    const detail = refused
      ? `${adj.stage}：${adj.reason}`
      : `waves=${JSON.stringify(adj.plan.waves)} groups=${adj.parallel_groups.length}`
    if (!stageOk) detail += ` ｜ 期望由 ${c.expectStage} 环节拒单，实际由 ${adj.stage} 拒单（判据未被真正触发）`
    results.push({ name: c.name, expect: c.expect, got, pass, detail })
  }

  const passed = results.filter((r) => r.pass).length
  if (opts.json) {
    console.log(JSON.stringify({ results, passed, total: results.length }, null, 2))
    return passed === results.length ? 0 : 1
  }
  console.log('🧵 管家并发调度器 · 判定（触发即拒单，不放任后补）')
  console.log('-----------------------------------------')
  for (const r of results) console.log(`   ${r.pass ? '✅' : '⛔'} ${r.name}｜期望 ${r.expect} 实得 ${r.got}\n        · ${r.detail}`)
  console.log('-----------------------------------------')
  console.log(`固化用例 ${results.length} 条 · 通过 ${passed} 条`)
  console.log(passed === results.length ? '✅ 调度器有牙：冲突/环/活锁/无界并发一律拒单，可并行的真能并行' : '⛔ 调度器判据不成立')
  return passed === results.length ? 0 : 1
}

function main() {
  const argv = process.argv.slice(2)
  const json = argv.includes('--json')

  if (argv.includes('--check') || argv.includes('--self-test')) process.exit(cmdCheck({ json }))

  const planIdx = argv.indexOf('--plan')
  const runIdx = argv.indexOf('--run')
  const file = planIdx >= 0 ? argv[planIdx + 1] : runIdx >= 0 ? argv[runIdx + 1] : null
  if (!file) {
    console.log('用法：node scripts/butler_scheduler.mjs --plan|--run <tasks.jsonl> [--concurrency 4] [--json] | --check | --self-test')
    process.exit(2)
  }
  const cIdx = argv.indexOf('--concurrency')
  const concurrency = cIdx >= 0 ? Number(argv[cIdx + 1]) : DEFAULT_CONCURRENCY

  const adj = adjudicate(path.isAbsolute(file) ? file : path.join(ROOT, file), { concurrency })
  const entry = {
    at: new Date().toISOString(),
    mode: runIdx >= 0 ? 'run' : 'plan',
    input: path.relative(ROOT, path.isAbsolute(file) ? file : path.join(ROOT, file)),
    concurrency,
    adjudication: adj.ok ? 'pass' : `refuse:${adj.stage}`,
    reason: adj.ok ? '' : adj.reason,
    waves: adj.ok ? adj.plan.waves : [],
  }

  if (json) {
    console.log(JSON.stringify({ ...adj, ledger: entry }, null, 2))
  } else if (!adj.ok) {
    console.log(`⛔ 拒单（${adj.stage}）：${adj.reason}`)
    if (adj.evidence) console.log(JSON.stringify(adj.evidence, null, 2))
  } else {
    console.log('🧵 管家并发调度方案')
    console.log('-----------------------------------------')
    console.log(`任务 ${adj.tasks.length} 个 · 并发上界 ${adj.concurrency} · 波次 ${adj.plan.waves.length}`)
    adj.plan.waves.forEach((w, i) => console.log(`   第 ${i + 1} 波（${w.length} 个并发）：${w.join(' · ')}`))
    if (adj.plan.leftover.length) console.log(`   ⚠️ 未能排入（互相冲突或依赖未满足）：${adj.plan.leftover.join(' · ')}`)
    if (adj.serialization_plan.length) console.log(`   强制串行对：${adj.serialization_plan.map((p) => p.join('↔')).join(' · ')}`)
    console.log('-----------------------------------------')
  }

  if (adj.ok && runIdx >= 0) {
    dispatch(adj, {}).then((results) => {
      entry.results = results
      writeLedger(entry)
      console.log('')
      for (const r of results) console.log(`   ${r.status === 'ok' ? '✅' : '⛔'} ${r.task} · ${r.status}${r.code !== undefined ? ` (exit ${r.code})` : ''}`)
      const bad = results.filter((r) => r.status !== 'ok').length
      process.exit(bad === 0 ? 0 : 1)
    })
    return
  }

  writeLedger(entry)
  process.exit(adj.exit)
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main()
