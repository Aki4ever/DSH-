#!/usr/bin/env node
/**
 * ==============================================================================
 * 流程流转层引擎 (Flow Router) —— REQ-100 / FLOW-ROUTER · R2·R3·R4
 * ==============================================================================
 * 用户原话：「新建流程流转层，专门根据这个方案构建对应的 agent 负责管控机制流程的
 * 流转；流程的流转必须高度可复现；流程的流转情况要与纪律委员进行反馈和相互督促」。
 *
 * 它解决的三件事（与既有载体的分工不重叠）：
 *   ① 流转有状态：一次任务 = 一次 run，步骤一步一步推进；**上一步没完成就不能进下一步**
 *      （依赖未满足即拒收），跳步与重复都留下违规事实，不靠人记得。
 *   ② 流转可复现：每一步落一行哈希链日志（不含随机数与时钟判定），
 *      `--replay` 用同一份日志重新推导一遍流转决策，逐行对拍；
 *      日志被改动一行即判「复现失败」，可复现率因此是**算出来的**，不是自称的。
 *   ③ 流转与纪律委员双向督促：
 *      正向（流转 → 委员）：`--findings` 把跳步/乱序/缺步/失败/链断写成
 *      机器可读证据包 `ai-control/reports/discipline/flow_findings.json`，委员据此落账；
 *      反向（委员 → 流转）：流转前读纪律分，已停用或跌破地板分时，
 *      **攻坚/质检/归卷 三个阶段的推进会直接被拒**（拦截而非提醒）。
 *
 * 与相邻载体的边界：
 *   · flow_graph.json / flow_control.mjs —— 管「步骤依赖与批准顺序」，本脚本管「推进与留痕」；
 *   · physical_lock.sh —— 管 LOCK-0~4 四阶粗锁，本脚本管锁内每一步的流转；
 *   · process_supervisor.mjs —— 独立复核者，不采信自述；本脚本只产事实，不自评。
 *
 * 用法：
 *   node scripts/flow_router.mjs --begin [--lane light|standard]
 *   node scripts/flow_router.mjs --advance S11 --cmd "node scripts/progress_ledger.mjs check" --rc 0
 *   node scripts/flow_router.mjs --next
 *   node scripts/flow_router.mjs --status [--json]
 *   node scripts/flow_router.mjs --report [--json]
 *   node scripts/flow_router.mjs --findings [--json]
 *   node scripts/flow_router.mjs --replay [runId] [--json]
 *   node scripts/flow_router.mjs --close [--json]
 *   node scripts/flow_router.mjs --selftest
 * 退出码：0 通过 / 1 不通过（跳步、复现失败、合规率不足、被纪律拦下）/ 2 用法或取不到证据
 * ==============================================================================
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { join, dirname, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const GRAPH_FILE = join(ROOT, 'ai-control', 'config', 'flow_graph.json')
const CONF_FILE = join(ROOT, 'ai-control', 'config', 'flow_router.conf.json')
const DISC_SCRIPT = join(ROOT, 'scripts', 'discipline_score.mjs')

/* ── 纯逻辑（不碰磁盘，可单测）────────────────────────────────────────────── */

export function sha256(s) {
  return createHash('sha256').update(String(s), 'utf8').digest('hex')
}

/** 规范化 JSON：键排序、无空格 —— 同一个对象在任何机器上得到同一个串。 */
export function canonical(obj) {
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') {
      const out = {}
      for (const k of Object.keys(v).sort()) out[k] = walk(v[k])
      return out
    }
    return v
  }
  return JSON.stringify(walk(obj))
}

/** 一条日志的哈希 = sha256(前一条哈希 + 本条规范化正文)。 */
export function digestRecord(prevHash, body) {
  return sha256(`${prevHash}|${canonical(body)}`)
}

/** 追加一条记录：自动补 prevHash 与 hash，形成哈希链。 */
export function chainAppend(records, body) {
  const prevHash = records.length ? records[records.length - 1].hash : 'GENESIS'
  const rec = { ...body, prevHash }
  rec.hash = digestRecord(prevHash, body)
  return [...records, rec]
}

/** 校验哈希链：逐行重算，任何字段被改动都会在这里断链。 */
export function verifyChain(records) {
  let prev = 'GENESIS'
  for (let i = 0; i < records.length; i++) {
    const rec = records[i]
    const { hash, prevHash, ...body } = rec
    if (prevHash !== prev) return { ok: false, brokenAt: i, reason: `第 ${i} 条的前序哈希对不上（链断）` }
    if (digestRecord(prevHash, body) !== hash) return { ok: false, brokenAt: i, reason: `第 ${i} 条正文与哈希不符（被改动）` }
    prev = hash
  }
  return { ok: true, brokenAt: -1, reason: null }
}

/** 已完成的步骤集合：记录在案且退出码为 0。 */
export function doneSteps(records) {
  const done = new Set()
  for (const r of records) {
    if (r.type === 'step' && Number(r.rc) === 0) done.add(r.step)
  }
  return done
}

/** 依赖已满足、且尚未完成的步骤 = 此刻允许推进的步骤。 */
export function allowedSteps(graph, done) {
  return graph.steps
    .filter((s) => !done.has(s.id))
    .filter((s) => (s.dependsOn || []).every((d) => done.has(d)))
    .map((s) => s.id)
}

/** 本道任务要求的步骤集：standard 走全图，light 走配置清单。 */
export function requiredSteps(conf, graph, lane) {
  const cfg = conf.lanes[lane]
  if (!cfg) return null
  if (cfg.requiredAll) return graph.steps.map((s) => s.id)
  return [...cfg.required]
}

/**
 * 合规度量：必需步骤里「已按退出码 0 完成」的比例。
 * 分母是**任务分道要求的步骤**，不是「我做过的步骤」——否则做得越少越好看。
 */
export function conform(conf, graph, records, lane) {
  const required = requiredSteps(conf, graph, lane)
  if (!required) return { ok: false, reason: `未知任务分道：${lane}`, rate: 0, required: [], missing: [], failed: [] }
  const done = doneSteps(records)
  const failed = records.filter((r) => r.type === 'step' && Number(r.rc) !== 0).map((r) => r.step)
  const missing = required.filter((s) => !done.has(s))
  const rate = required.length ? (required.length - missing.length) / required.length : 1
  const min = Number(conf.closure && conf.closure.minConformance != null ? conf.closure.minConformance : 1)
  return {
    lane,
    required,
    done: required.filter((s) => done.has(s)),
    missing,
    failed: [...new Set(failed)],
    rate: Number(rate.toFixed(4)),
    min,
    ok: rate >= min && (!conf.closure || conf.closure.allowFailedSteps !== false || failed.length === 0),
  }
}

/**
 * 复现校验：拿同一份日志把流转决策**重新推导一遍**。
 * 判据三条：链自洽 / 依赖图未变 / 当时的每一步在那时确实是合法可推进的。
 */
export function replayRun(conf, graph, records, graphHash) {
  const problems = []
  const chain = verifyChain(records)
  if (!chain.ok) problems.push(`哈希链断裂：${chain.reason}`)
  const head = records[0]
  if (!head || head.type !== 'begin') problems.push('日志缺少 begin 头记录（无法确认任务分道）')
  else if (graphHash && head.graphHash !== graphHash) problems.push(`依赖图已变更（日志 ${head.graphHash} ≠ 当前 ${graphHash}），本次运行不可复现`)
  const done = new Set()
  for (let i = 1; i < records.length; i++) {
    const r = records[i]
    if (r.type !== 'step') continue
    const step = graph.steps.find((s) => s.id === r.step)
    if (!step) { problems.push(`第 ${i} 条含未知步骤 ${r.step}`); continue }
    if (done.has(r.step)) { problems.push(`第 ${i} 条重复推进已完成的步骤 ${r.step}`); continue }
    const lack = (step.dependsOn || []).filter((d) => !done.has(d))
    if (lack.length) problems.push(`第 ${i} 条跳步：推进 ${r.step} 时其前序 ${lack.join('、')} 尚未完成`)
    if (Number(r.rc) === 0) done.add(r.step)
  }
  const lane = head && head.lane ? head.lane : conf.defaultLane
  const c = conform(conf, graph, records, lane)
  return {
    ok: problems.length === 0 && chain.ok,
    problems,
    chain,
    lane,
    conform: c,
    steps: records.filter((r) => r.type === 'step').map((r) => r.step),
  }
}

/**
 * 违规事实提取（委员的证据来源）。
 * 只列**能用日志复算**的事实，不写主观评价。
 */
export function findViolations(conf, graph, records, graphHash) {
  const out = []
  const rep = replayRun(conf, graph, records, graphHash)
  const head = records[0]
  const lane = head && head.lane ? head.lane : conf.defaultLane
  const done = doneSteps(records)
  for (const p of rep.problems) {
    const type = /跳步/.test(p) ? 'INVALID_TRANSITION' : /哈希链/.test(p) ? 'CHAIN_BROKEN' : /重复/.test(p) ? 'OUT_OF_ORDER' : 'CHAIN_BROKEN'
    out.push({ type, detail: p })
  }
  for (const r of records) {
    if (r.type === 'step' && Number(r.rc) !== 0) out.push({ type: 'STEP_FAILED', step: r.step, detail: `步骤 ${r.step} 退出码 ${r.rc}，未通过` })
  }
  const required = requiredSteps(conf, graph, lane) || []
  const missing = required.filter((s) => !done.has(s))
  const closed = records.some((r) => r.type === 'close')
  if (closed && missing.length) out.push({ type: 'MISSING_REQUIRED', detail: `收口时仍有必需步骤未完成：${missing.join('、')}` })
  for (const r of records) {
    if (r.type === 'step' && r.discipline === 'blocked') out.push({ type: 'DISCIPLINE_BLOCKED', step: r.step, detail: `步骤 ${r.step} 触及纪律红线` })
  }
  return out
}

/** runId 只由「会话 + 任务分道」推导 —— 不用随机数、不用时钟，同一会话同一道必然同名（可复现）。 */
export function makeRunId(sessionId, lane) {
  return `run-${sha256(`${sessionId}|${lane}`).slice(0, 12)}`
}

/* ── 磁盘 IO ─────────────────────────────────────────────────────────────── */

function loadJson(file, what) {
  if (!existsSync(file)) {
    console.error(`❌ ${what} 缺失：${file}`)
    process.exit(2)
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    console.error(`❌ ${what} 解析失败：${e.message}`)
    process.exit(2)
  }
}

function journalDir(conf) {
  const d = process.env.FLOW_ROUTER_JOURNAL_DIR || join(ROOT, conf.journal.dir)
  return isAbsolute(d) ? d : join(ROOT, d)
}

function findingsPath(conf) {
  const d = process.env.FLOW_ROUTER_FINDINGS || join(ROOT, conf.journal.findingsFile)
  return isAbsolute(d) ? d : join(ROOT, d)
}

function runFile(conf, runId) {
  return join(journalDir(conf), `${runId}.jsonl`)
}

function readRecords(file) {
  if (!existsSync(file)) return []
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => { try { return JSON.parse(l) } catch { return null } })
    .filter(Boolean)
}

function appendLine(file, rec) {
  mkdirSync(dirname(file), { recursive: true })
  appendFileSync(file, JSON.stringify(rec) + '\n', 'utf8')
}

function graphHashOf() {
  return sha256(readFileSync(GRAPH_FILE, 'utf8'))
}

/** 纪律分来源：不采信自述，直接问账本判定器；取不到就如实标 unknown（不冒充通过）。 */
export function readDiscipline() {
  if (process.env.FLOW_ROUTER_DISC === 'off') return { source: 'disabled', score: null, suspended: false }
  if (!existsSync(DISC_SCRIPT)) return { source: 'unavailable', score: null, suspended: false }
  const r = spawnSync(process.execPath, [DISC_SCRIPT, 'status', '--json'], { encoding: 'utf8', timeout: 30000 })
  if (r.status !== 0 || !r.stdout) return { source: 'unavailable', score: null, suspended: false }
  try {
    const j = JSON.parse(r.stdout)
    const st = j.state || j
    return { source: 'ledger', score: Number(st.current), suspended: Boolean(st.suspended) }
  } catch {
    return { source: 'unavailable', score: null, suspended: false }
  }
}

/* ── 命令行 ───────────────────────────────────────────────────────────────── */

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const valueOf = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined)
const json = has('--json')

function loadAll() {
  const graph = loadJson(GRAPH_FILE, '流程依赖图')
  const conf = loadJson(CONF_FILE, '流转层配置')
  return { graph, conf, graphHash: graphHashOf() }
}

function currentRunId(conf, lane) {
  return makeRunId(process.env.DSH_SESSION_ID || 'unknown', lane || conf.defaultLane)
}

function cmdBegin(graph, conf) {
  const lane = valueOf('--lane') || conf.defaultLane
  if (!conf.lanes[lane]) { console.error(`❌ 未知任务分道：${lane}`); return 2 }
  const runId = makeRunId(process.env.DSH_SESSION_ID || 'unknown', lane)
  const file = runFile(conf, runId)
  const records = readRecords(file)
  if (records.length) {
    const head = records[0]
    if (head.lane !== lane || head.graphHash !== graphHashOf()) {
      console.error(`❌ 同一会话同一分道已存在 run（${runId}），且分道或依赖图不一致，拒绝覆盖；请换会话或先归档`)
      return 1
    }
    console.log(`📍 复用既有 run：${runId}（已有 ${records.filter((r) => r.type === 'step').length} 步留痕）`)
    return 0
  }
  const rec = chainAppend([], {
    type: 'begin', runId, lane, taskCode: conf.taskCode, req: conf.req,
    session: process.env.DSH_SESSION_ID || 'unknown', graphHash: graphHashOf(),
    at: new Date().toISOString(),
  })
  appendLine(file, rec[0])
  console.log(`🚩 已开启流转 run：${runId}（分道 ${lane} · ${conf.lanes[lane].name}）`)
  return 0
}

function cmdAdvance(graph, conf) {
  const id = valueOf('--advance')
  if (!id) { console.error('用法：--advance <步骤id> [--cmd "..." --rc 0]'); return 2 }
  const s = graph.steps.find((x) => x.id === id)
  if (!s) { console.error(`❌ 未知步骤：${id}`); return 2 }
  const lane = valueOf('--lane') || conf.defaultLane
  const runId = currentRunId(conf, lane)
  const file = runFile(conf, runId)
  let records = readRecords(file)
  if (!records.length) { console.error('❌ 尚未开启 run：先跑 node scripts/flow_router.mjs --begin'); return 2 }
  const done = doneSteps(records)
  if (done.has(id)) { console.error(`❌ 重复推进：${id} 已完成，日志不重复记账`); return 1 }
  const allowed = allowedSteps(graph, done)
  if (!allowed.includes(id)) {
    const lack = (s.dependsOn || []).filter((d) => !done.has(d))
    console.error(`⛔ 跳步被拒：${id} 的前序 [${lack.join('、')}] 尚未完成；此刻允许推进的是 [${allowed.join('、')}]`)
    console.error('   本节事实已可由 --findings 复算，纪律委员据此可落账。')
    return 1
  }
  const disc = readDiscipline()
  const scoreFloor = Number(conf.discipline.scoreFloor)
  const blocked = (conf.discipline.blockedPhases || []).includes(s.phase)
  if (blocked && (disc.suspended || (disc.score !== null && disc.score < scoreFloor))) {
    console.error(`⛔ 纪律拦截：${s.phase} 阶段要求纪律分不低于 ${scoreFloor}（实得 ${disc.score === null ? '取不到' : disc.score}${disc.suspended ? ' · 已停用' : ''}），推进被拒`)
    return 1
  }
  const cmd = valueOf('--cmd') || ''
  const rc = Number(valueOf('--rc') != null ? valueOf('--rc') : 0)
  const evPath = valueOf('--evidence')
  let evidence = null
  let evidenceSha = null
  if (evPath) {
    const abs = isAbsolute(evPath) ? evPath : join(ROOT, evPath)
    if (!existsSync(abs)) { console.error(`❌ 证据文件不存在：${evPath}`); return 2 }
    evidence = evPath
    evidenceSha = sha256(readFileSync(abs))
  } else {
    evidence = `${cmd || s.judge || s.carrier}|rc=${rc}`
    evidenceSha = sha256(evidence)
  }
  records = chainAppend(records, {
    type: 'step', seq: records.filter((r) => r.type === 'step').length + 1, step: id, phase: s.phase,
    cmd: cmd || s.judge || '', rc, evidence, evidenceSha,
    discipline: disc.source === 'unavailable' ? 'unknown' : disc.suspended ? 'blocked' : 'ok',
    at: new Date().toISOString(),
  })
  appendLine(file, records[records.length - 1])
  const c = conform(conf, graph, records, lane)
  console.log(`📍 流转留痕：${id}（${s.phase}）rc=${rc} · 合规率 ${(c.rate * 100).toFixed(0)}% (${c.done.length}/${c.required.length})`)
  const nxt = allowedSteps(graph, doneSteps(records))
  if (nxt.length) console.log(`▶ 此刻可推进：${nxt.join('、')}`)
  else console.log('▶ 已无待推进步骤（可跑 --close 收口）')
  return rc === 0 ? 0 : 1
}

function cmdStatus(graph, conf) {
  const lane = valueOf('--lane') || conf.defaultLane
  const runId = valueOf('--run') || currentRunId(conf, lane)
  const records = readRecords(runFile(conf, runId))
  const chain = verifyChain(records)
  const c = conform(conf, graph, records, records[0] ? records[0].lane : lane)
  const disc = readDiscipline()
  const nxt = allowedSteps(graph, doneSteps(records))
  const payload = {
    runId, lane, hasRun: records.length > 0, steps: records.filter((r) => r.type === 'step').length,
    conform: c, chain, next: nxt,
    discipline: { score: disc.score, suspended: disc.suspended, source: disc.source, floor: conf.discipline.scoreFloor },
  }
  if (json) { console.log(JSON.stringify(payload, null, 2)); return c.ok && chain.ok ? 0 : 1 }
  console.log('🧩 流程流转层 · 本次运行状态')
  console.log('-----------------------------------------')
  console.log(`run ${runId} · 分道 ${lane} · 留痕 ${payload.steps} 步 · 哈希链 ${chain.ok ? '自洽' : '已断(' + chain.reason + ')'}`)
  console.log(`合规率 ${(c.rate * 100).toFixed(0)}%（${c.done.length}/${c.required.length}）· 缺 ${c.missing.length ? c.missing.join('、') : '无'}`)
  console.log(`纪律分 ${disc.score === null ? '取不到' : disc.score}（来源 ${disc.source}${disc.suspended ? ' · 已停用' : ''}）· 地板 ${conf.discipline.scoreFloor}`)
  console.log(`▶ 此刻可推进：${nxt.length ? nxt.join('、') : '无'}`)
  return 0
}

function cmdReplay(graph, conf, graphHash) {
  const runId = valueOf('--replay') || args[args.indexOf('--replay') + 1] || currentRunId(conf, conf.defaultLane)
  const records = readRecords(runFile(conf, runId))
  if (!records.length) { console.error(`❌ 取不到证据：run ${runId} 无日志`); return 2 }
  const rep = replayRun(conf, graph, records, graphHash)
  if (json) { console.log(JSON.stringify({ runId, ...rep }, null, 2)); return rep.ok ? 0 : 1 }
  console.log('🔁 流程流转层 · 复现校验')
  console.log('-----------------------------------------')
  console.log(`run ${runId} · 步骤序列 [${rep.steps.join(' → ')}]`)
  console.log(`哈希链 ${rep.chain.ok ? '自洽（逐行重算一致）' : '断裂：' + rep.chain.reason}`)
  console.log(`依赖图哈希对拍 ${rep.problems.some((p) => /依赖图已变更/.test(p)) ? '不一致' : '一致'}`)
  console.log(`合规率 ${(rep.conform.rate * 100).toFixed(0)}%（${rep.conform.done.length}/${rep.conform.required.length}）`)
  if (rep.ok) { console.log('✅ 可复现：同一份日志重推出的流转决策与实际留痕完全一致'); return 0 }
  for (const p of rep.problems) console.log(`   ⛔ ${p}`)
  console.log('-----------------------------------------')
  console.log('⛔ 不可复现：按 --findings 报委员落账')
  return 1
}

function cmdFindings(graph, conf, graphHash, write) {
  const lane = valueOf('--lane') || conf.defaultLane
  const runId = valueOf('--run') || currentRunId(conf, lane)
  const records = readRecords(runFile(conf, runId))
  const violations = records.length ? findViolations(conf, graph, records, graphHash) : []
  const disc = readDiscipline()
  const c = records.length ? conform(conf, graph, records, records[0].lane) : { rate: 0, required: [], done: [], missing: [], ok: false }
  const pack = {
    generatedBy: 'scripts/flow_router.mjs',
    req: 'REQ-100', runId, lane,
    at: new Date().toISOString(),
    conformRate: c.rate, missing: c.missing,
    disciplineScore: disc.score, suspended: disc.suspended,
    violations,
    counts: violations.reduce((acc, v) => { acc[v.type] = (acc[v.type] || 0) + 1; return acc }, {}),
  }
  if (write) {
    const f = findingsPath(conf)
    mkdirSync(dirname(f), { recursive: true })
    writeFileSync(f, JSON.stringify(pack, null, 2) + '\n', 'utf8')
    const back = JSON.parse(readFileSync(f, 'utf8'))
    if (back.runId !== runId) { console.error('❌ 写后读回失败：证据包未落盘'); return 1 }
  }
  if (json) { console.log(JSON.stringify(pack, null, 2)); return violations.length ? 1 : 0 }
  console.log('📮 流转层 → 纪律委员 · 违规事实证据包')
  console.log('-----------------------------------------')
  console.log(`run ${runId} · 违规 ${violations.length} 条 · 合规率 ${(c.rate * 100).toFixed(0)}%`)
  for (const v of violations) console.log(`   · [${v.type}] ${v.detail}`)
  if (!violations.length) console.log('   （本次无违规事实）')
  return violations.length ? 1 : 0
}

function cmdClose(graph, conf, graphHash) {
  const lane = valueOf('--lane') || conf.defaultLane
  const runId = currentRunId(conf, lane)
  const file = runFile(conf, runId)
  let records = readRecords(file)
  if (!records.length) { console.error('❌ 尚未开启 run，无法收口'); return 2 }
  const c = conform(conf, graph, records, records[0].lane)
  const chain = verifyChain(records)
  const rep = replayRun(conf, graph, records, graphHash)
  const ok = c.ok && chain.ok && rep.ok && (!conf.closure.requireChainOk || chain.ok)
  if (!ok) {
    console.error(`⛔ 收口被拒：合规率 ${(c.rate * 100).toFixed(0)}%（要求 ${(c.min * 100).toFixed(0)}%）${chain.ok ? '' : ' · 哈希链断裂'}${rep.ok ? '' : ' · 不可复现'}${c.missing.length ? ' · 缺 ' + c.missing.join('、') : ''}`)
    return 1
  }
  records = chainAppend(records, { type: 'close', runId, lane, conformRate: c.rate, steps: c.done.length, at: new Date().toISOString() })
  appendLine(file, records[records.length - 1])
  console.log(`🔒 已收口 run ${runId}：合规率 ${(c.rate * 100).toFixed(0)}% · 哈希链自洽 · 复现校验通过`)
  return 0
}

/* ── 反向用例：造坏日志，判定必须判红 ─────────────────────────────────────── */

function runSelftest() {
  const graph = {
    steps: [
      { id: 'A', phase: '定标', estSec: 1, dependsOn: [] },
      { id: 'B', phase: '攻坚', estSec: 1, dependsOn: ['A'] },
      { id: 'C', phase: '归卷', estSec: 1, dependsOn: ['B'] },
    ],
  }
  const conf = {
    defaultLane: 'std',
    lanes: { std: { name: '标准', requiredAll: true }, lt: { name: '轻量', required: ['A', 'C'] } },
    closure: { minConformance: 1, requireChainOk: true, allowFailedSteps: false },
    discipline: { scoreFloor: 60, blockedPhases: ['攻坚'] },
  }
  let pass = 0
  const total = 6
  const add = (name, ok, detail) => {
    if (ok) pass++
    console.log(`${ok ? '✅' : '❌'} ${name}${detail ? '：' + detail : ''}`)
  }
  const begin = (lane) => chainAppend([], { type: 'begin', runId: 'r1', lane, graphHash: 'G1', at: 'T0' })
  const step = (recs, id, rc) => chainAppend(recs, { type: 'step', step: id, phase: 'x', cmd: 'c', rc, evidence: 'e', evidenceSha: 's', at: 'T' })

  const good = step(step(step(begin('std'), 'A', 0), 'B', 0), 'C', 0)
  add('正例：合法顺序 + 全步通过', replayRun(conf, graph, good, 'G1').ok && conform(conf, graph, good, 'std').rate === 1)

  const jump = step(step(begin('std'), 'B', 0), 'C', 0)
  add('反例①：跳步被复现校验抓出', replayRun(conf, graph, jump, 'G1').problems.some((p) => /跳步/.test(p)))

  const tampered = JSON.parse(JSON.stringify(good))
  tampered[1].step = 'B'
  add('反例②：日志被改动一行即链断', !verifyChain(tampered).ok)

  const partial = step(step(begin('std'), 'A', 0), 'B', 0)
  const c1 = conform(conf, graph, partial, 'std')
  add('反例③：必需步骤缺失判不达标', !c1.ok && c1.missing.join(',') === 'C')

  const failed = step(step(step(begin('std'), 'A', 0), 'B', 1), 'C', 0)
  const c2 = conform(conf, graph, failed, 'std')
  add('反例④：退出码非 0 不计完成且判不达标', !c2.ok && c2.missing.includes('B'))

  const graphChanged = replayRun(conf, graph, good, 'G2')
  add('反例⑤：依赖图变更后旧日志不可复现', !graphChanged.ok && graphChanged.problems.some((p) => /依赖图已变更/.test(p)))

  console.log(`—— 自检结果：${pass}/${total} 通过`)
  return pass === total ? 0 : 1
}

/* ── 入口 ─────────────────────────────────────────────────────────────────── */

function main() {
  if (has('--selftest')) return runSelftest()
  const { graph, conf, graphHash } = loadAll()
  if (has('--begin')) return cmdBegin(graph, conf)
  if (has('--advance')) return cmdAdvance(graph, conf)
  if (has('--replay')) return cmdReplay(graph, conf, graphHash)
  if (has('--findings')) {
    const r = cmdFindings(graph, conf, graphHash, true)
    return r
  }
  if (has('--report')) return cmdFindings(graph, conf, graphHash, false)
  if (has('--close')) return cmdClose(graph, conf, graphHash)
  if (has('--next')) {
    const lane = valueOf('--lane') || conf.defaultLane
    const records = readRecords(runFile(conf, currentRunId(conf, lane)))
    const nxt = allowedSteps(graph, doneSteps(records))
    if (json) console.log(JSON.stringify({ lane, next: nxt }, null, 2))
    else console.log(nxt.length ? nxt.join('\n') : '(无待推进步骤)')
    return 0
  }
  if (has('--status') || args.length === 0) return cmdStatus(graph, conf)
  console.error('用法：--begin [--lane light|standard] | --advance <id> [--cmd "..." --rc N] | --next | --status | --report | --findings | --replay [runId] | --close | --selftest')
  return 2
}

if (process.argv[1] && process.argv[1].endsWith('flow_router.mjs')) {
  process.exit(main())
}
