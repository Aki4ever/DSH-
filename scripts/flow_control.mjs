#!/usr/bin/env node
/**
 * ==============================================================================
 * 流程管控层判定器 (Flow Control) — REQ-087 / GCM-PHY · R3
 * ==============================================================================
 * 解决的问题（用户原话："新增流程管控层，把现有的流程规划安插在执行效率最高的
 * 排列……每次更新可能都会让整个流程变的完全不一样；确保每次更新后流程的一致性
 * 以及高效性"）：
 *   流程顺序历来写在 Markdown 表格里，靠人肉维护。任何一次机制新增/改名，
 *   表格与实际依赖就会悄悄脱钩，谁也说不清"现在的顺序还是最优的吗、还一致吗"。
 *
 * 本脚本把"流程顺序"变成**可计算、可校验、可留痕**的物理对象：
 *   · 依赖声明唯一权威源：`ai-control/config/flow_graph.json`（规则层只放指针）
 *   · --plan    拓扑分层 → 出"效率最高的排列"（同层并行、关键路径最短）
 *   · --check   一致性硬判定：图合法 / 载体在位 / 不变式成立 / 与规则层同步 /
 *               已批准顺序 == 重算顺序 / 实际轨迹是合法拓扑序
 *   · --diff    机制更新后重算，出"顺序变化提案"（不改文件）
 *   · --graph   输出 Mermaid 依赖图（供信息图资产复用）
 *
 * 铁律：**流程可以重排，不可跳步**。重排只改"非锁步"的先后/并行关系，
 * 六条不变式（I1~I6，I6=流转轨迹可复现，REQ-100）任何情况下不得被破坏。
 *
 * 用法：
 *   node scripts/flow_control.mjs --plan [--json]
 *   node scripts/flow_control.mjs --check [--json]
 *   node scripts/flow_control.mjs --diff
 *   node scripts/flow_control.mjs --graph
 *   node scripts/flow_control.mjs --apply-order      # 批准当前规划（写回 order 字段）
 *   node scripts/flow_control.mjs --mark S11         # 追加一条实际执行轨迹
 *   node scripts/flow_control.mjs --selftest
 * 退出码：0 一致 / 1 不一致 / 2 用法或图非法
 * ==============================================================================
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
// 流转层（REQ-100）的哈希链校验是纯函数，直接复用，避免第二套实现走样。
import { verifyChain as verifyRunChain } from './flow_router.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const GRAPH_FILE = join(ROOT, 'ai-control', 'config', 'flow_graph.json')
const RULE_FILE = join(ROOT, 'rules', 'workflow', 'task_execution_flow.md')
const STATE_DIR = join(ROOT, 'ai-control', 'reports', 'state')
const TRACE_FILE = join(STATE_DIR, 'flow_trace.jsonl')
const BLOCK_BEGIN = '<!-- FLOW-CONTROL-STEPS:BEGIN -->'
const BLOCK_END = '<!-- FLOW-CONTROL-STEPS:END -->'

// ── 纯逻辑（可单测）────────────────────────────────────────────────────────

/** 拓扑分层：Kahn 算法。返回 { layers, error }，同层即"可并行批次"。 */
export function layeredPlan(steps, orderKey = (s) => [-s.estSec, s.id]) {
  const byId = new Map(steps.map((s) => [s.id, s]))
  const indeg = new Map(steps.map((s) => [s.id, 0]))
  const outs = new Map(steps.map((s) => [s.id, []]))
  for (const s of steps) {
    for (const d of s.dependsOn || []) {
      if (!byId.has(d)) return { layers: [], error: `步骤 ${s.id} 依赖了不存在的步骤 ${d}` }
      indeg.set(s.id, indeg.get(s.id) + 1)
      outs.get(d).push(s.id)
    }
  }
  const layers = []
  let ready = steps.filter((s) => indeg.get(s.id) === 0).map((s) => s.id)
  let seen = 0
  while (ready.length) {
    ready.sort((a, b) => {
      const ka = orderKey(byId.get(a))
      const kb = orderKey(byId.get(b))
      for (let i = 0; i < Math.min(ka.length, kb.length); i++) {
        if (ka[i] < kb[i]) return -1
        if (ka[i] > kb[i]) return 1
      }
      return 0
    })
    layers.push([...ready])
    seen += ready.length
    const next = []
    for (const id of ready) {
      for (const o of outs.get(id)) {
        indeg.set(o, indeg.get(o) - 1)
        if (indeg.get(o) === 0) next.push(o)
      }
    }
    ready = next
  }
  if (seen !== steps.length) return { layers, error: '依赖图存在环，无法排出顺序' }
  return { layers, error: null }
}

/** 关键路径（按 estSec 加权的最长路径）。 */
export function criticalPath(steps) {
  const byId = new Map(steps.map((s) => [s.id, s]))
  const memo = new Map()
  const best = (id) => {
    if (memo.has(id)) return memo.get(id)
    const s = byId.get(id)
    let prev = { cost: 0, path: [] }
    for (const d of s.dependsOn || []) {
      const c = best(d)
      if (c.cost > prev.cost) prev = c
    }
    const r = { cost: prev.cost + (s.estSec || 0), path: [...prev.path, id] }
    memo.set(id, r)
    return r
  }
  let top = { cost: 0, path: [] }
  for (const s of steps) {
    const c = best(s.id)
    if (c.cost > top.cost) top = c
  }
  return top
}

/** 不变式校验。layers 为计算出的批次序列。ctx.trace 为流转层日志实况（I6 用）。 */
export function checkInvariants(graph, layers, ctx = {}) {
  const idx = new Map()
  layers.forEach((batch, i) => batch.forEach((id) => idx.set(id, i)))
  const problems = []
  for (const inv of graph.invariants || []) {
    if (inv.type === 'sequence') {
      const present = inv.seq.filter((s) => idx.has(s))
      for (let i = 1; i < present.length; i++) {
        if (idx.get(present[i]) <= idx.get(present[i - 1])) {
          problems.push(`${inv.id} ${inv.text}：${present[i - 1]} 未先于 ${present[i]}`)
        }
      }
    } else if (inv.type === 'before') {
      for (const a of inv.from || []) {
        for (const b of inv.to || []) {
          if (!idx.has(a) || !idx.has(b)) continue
          if (idx.get(a) >= idx.get(b)) problems.push(`${inv.id} ${inv.text}：${a} 未先于 ${b}`)
        }
      }
    } else if (inv.type === 'first') {
      const first = layers[0] || []
      if (!first.includes(inv.step)) problems.push(`${inv.id} ${inv.text}：第 0 批为 [${first.join(',')}]，不是 ${inv.step}`)
    } else if (inv.type === 'immediate') {
      const i = idx.get(inv.step)
      if (i === undefined) { problems.push(`${inv.id} 步骤 ${inv.step} 不存在`); continue }
      const prev = layers[i - 1] || []
      const isPerWrite = (graph.steps.find((s) => s.id === inv.step) || {}).repeat === 'per-write'
      if (!isPerWrite) problems.push(`${inv.id} ${inv.text}：${inv.step} 未声明 repeat=per-write，会被攒到收尾`)
      if (i === 0 || i === layers.length - 1) problems.push(`${inv.id} 步骤 ${inv.step} 位置异常（第 ${i} 批 / 共 ${layers.length} 批）`)
      void prev
    } else if (inv.type === 'trace') {
      // I6（REQ-100）：流转层日志的哈希链必须自洽；有断链即判不达标。
      // 尚无日志时不冒充通过，也不凭空扣分——如实记为"本轮无流转日志"。
      const t = ctx.trace || null
      if (t && !t.ok) problems.push(`${inv.id} ${inv.text}：${(t.broken || []).join(' · ')}`)
    }
  }
  return problems
}

/** 流转层 run 日志实况：有日志就必须逐行哈希链自洽（REQ-100 / I6）。 */
export function journalState(dir = join(STATE_DIR, 'flow_runs')) {
  if (!existsSync(dir)) return { ok: true, files: 0, broken: [], note: '本轮无流转日志' }
  const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl'))
  const broken = []
  for (const f of files) {
    const recs = readFileSync(join(dir, f), 'utf8').split('\n').filter((l) => l.trim())
      .map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
    const c = verifyRunChain(recs)
    if (!c.ok) broken.push(`${f}：${c.reason}`)
  }
  return { ok: broken.length === 0, files: files.length, broken, note: broken.length ? '' : `${files.length} 份日志哈希链自洽` }
}

/** 已批准顺序 vs 重算顺序：逐批比对成员集合。 */
export function orderDiff(approved, computed) {
  const diffs = []
  const n = Math.max(approved.length, computed.length)
  for (let i = 0; i < n; i++) {
    const a = [...(approved[i] || [])].sort().join(',')
    const b = [...(computed[i] || [])].sort().join(',')
    if (a !== b) diffs.push({ batch: i, approved: a || '(空)', computed: b || '(空)' })
  }
  return diffs
}

/** 从规则层受管区间里取出步骤 id 列表。 */
export function parseRuleBlock(text) {
  const b = text.indexOf(BLOCK_BEGIN)
  const e = text.indexOf(BLOCK_END)
  if (b === -1 || e === -1 || e < b) return null
  const inner = text.slice(b + BLOCK_BEGIN.length, e)
  return (inner.match(/`([A-Za-z0-9_]+)`/g) || []).map((s) => s.slice(1, -1))
}

// ── IO 与命令 ───────────────────────────────────────────────────────────────
function loadGraph() {
  if (!existsSync(GRAPH_FILE)) {
    console.error(`❌ 流程依赖唯一权威源缺失：${GRAPH_FILE}`)
    process.exit(2)
  }
  try {
    return JSON.parse(readFileSync(GRAPH_FILE, 'utf8'))
  } catch (e) {
    console.error(`❌ 流程依赖图 JSON 解析失败：${e.message}`)
    process.exit(2)
  }
}

function computePlan(graph) {
  const { layers, error } = layeredPlan(graph.steps)
  return { layers, error }
}

function renderPlan(graph, layers) {
  const byId = new Map(graph.steps.map((s) => [s.id, s]))
  const cp = criticalPath(graph.steps)
  const serial = graph.steps.reduce((a, s) => a + (s.estSec || 0), 0)
  const makespan = layers.reduce((a, batch) => a + Math.max(...batch.map((id) => byId.get(id).estSec || 0)), 0)
  console.log('🧭 流程管控层 · 效率最优排列（同批 = 可并行）')
  console.log('-----------------------------------------')
  layers.forEach((batch, i) => {
    const label = batch.map((id) => `${id}(${byId.get(id).name})`).join(' ∥ ')
    console.log(`第 ${String(i).padStart(2)} 批 · ${label}`)
  })
  console.log('-----------------------------------------')
  console.log(`批次 ${layers.length} · 串行耗时 ${serial}s → 并行后 ${makespan}s（省 ${serial - makespan}s）`)
  console.log(`关键路径（${cp.cost}s）：${cp.path.join(' → ')}`)
  return { layers, serial, makespan, criticalPath: cp }
}

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const json = has('--json')

const graph = loadGraph()
const { layers, error } = computePlan(graph)

if (has('--plan')) {
  if (error) { console.error('❌ ' + error); process.exit(2) }
  const r = renderPlan(graph, layers)
  if (json) console.log(JSON.stringify(r, null, 2))
  process.exit(0)
}

if (has('--graph')) {
  if (error) { console.error('❌ ' + error); process.exit(2) }
  console.log('```mermaid')
  console.log('flowchart TD')
  for (const s of graph.steps) {
    for (const d of s.dependsOn || []) console.log(`  ${d} --> ${s.id}`)
  }
  console.log('```')
  process.exit(0)
}

if (has('--apply-order')) {
  if (error) { console.error('❌ ' + error); process.exit(2) }
  graph.order = layers
  graph.updatedAt = new Date().toISOString().slice(0, 10)
  writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2) + '\n', 'utf8')
  console.log(`✅ 已批准当前规划：${layers.length} 批 · ${layers.flat().length} 步`)
  process.exit(0)
}

if (has('--mark')) {
  const id = args[args.indexOf('--mark') + 1]
  if (!id || !graph.steps.some((s) => s.id === id)) { console.error(`❌ --mark 需要合法的步骤 id（实得 ${id}）`); process.exit(2) }
  mkdirSync(STATE_DIR, { recursive: true })
  appendFileSync(TRACE_FILE, JSON.stringify({ at: new Date().toISOString(), session: process.env.DSH_SESSION_ID || 'unknown', step: id }) + '\n', 'utf8')
  console.log(`📍 已记录轨迹：${id}`)
  process.exit(0)
}

if (has('--diff')) {
  if (error) { console.error('❌ ' + error); process.exit(2) }
  const diffs = orderDiff(graph.order || [], layers)
  if (!diffs.length) {
    console.log('✅ 已批准顺序与重算顺序一致，无需变更')
    process.exit(0)
  }
  console.log('🔄 顺序变化提案（未确认前不改动流程规则文件）')
  console.log('-----------------------------------------')
  for (const d of diffs) console.log(`第 ${d.batch} 批：已批准 [${d.approved}] → 重算 [${d.computed}]`)
  console.log('-----------------------------------------')
  console.log('▶ 确认后运行：node scripts/flow_control.mjs --apply-order')
  process.exit(0)
}

if (has('--check')) {
  const problems = []
  if (error) problems.push(error)

  // ① 载体在位（每条步骤的判定命令所依赖的载体必须真实存在）
  const missingCarriers = graph.steps.filter((s) => s.carrier && !existsSync(join(ROOT, s.carrier)))
  for (const s of missingCarriers) problems.push(`步骤 ${s.id} 的载体不存在：${s.carrier}`)

  // ② 不变式（I6 需要流转层日志实况）
  if (!error) problems.push(...checkInvariants(graph, layers, { trace: journalState() }))

  // ③ 与规则层同步（受管区间逐 id 一致）
  if (existsSync(RULE_FILE)) {
    const ids = parseRuleBlock(readFileSync(RULE_FILE, 'utf8'))
    if (!ids) problems.push('规则层缺少受管区间 FLOW-CONTROL-STEPS:BEGIN/END（流程管控层章节未落地）')
    else {
      const a = [...ids].sort().join(',')
      const b = graph.steps.map((s) => s.id).sort().join(',')
      if (a !== b) problems.push(`规则层步骤清单与依赖图不一致：规则层 [${a}] ≠ 图 [${b}]`)
    }
  } else {
    problems.push(`规则层文件不存在：rules/workflow/task_execution_flow.md`)
  }

  // ④ 已批准顺序 == 重算顺序（机制更新后必须重算并重新批准）
  if (!error) {
    const diffs = orderDiff(graph.order || [], layers)
    if ((graph.order || []).length === 0) problems.push('依赖图缺少 order 字段（尚未批准任何顺序）')
    else for (const d of diffs) problems.push(`第 ${d.batch} 批顺序不一致：已批准 [${d.approved}] ≠ 重算 [${d.computed}]`)
  }

  // ⑤ 实际执行轨迹（若存在）必须是合法拓扑序
  if (existsSync(TRACE_FILE)) {
    const idx = new Map()
    layers.forEach((batch, i) => batch.forEach((id) => idx.set(id, i)))
    let last = -1
    const lines = readFileSync(TRACE_FILE, 'utf8').split('\n').filter((l) => l.trim())
    for (const l of lines) {
      let t
      try { t = JSON.parse(l) } catch { continue }
      const i = idx.get(t.step)
      if (i === undefined) { problems.push(`轨迹含未知步骤 ${t.step}`); continue }
      if (i < last) problems.push(`轨迹乱序：${t.step}（第 ${i} 批）出现在第 ${last} 批之后`)
      last = Math.max(last, i)
    }
  }

  if (json) {
    console.log(JSON.stringify({ ok: problems.length === 0, problems, layers }, null, 2))
    process.exit(problems.length ? 1 : 0)
  }
  console.log('🧭 流程管控层 · 一致性判定')
  console.log('-----------------------------------------')
  console.log(`步骤 ${graph.steps.length} · 批次 ${layers.length} · 不变式 ${(graph.invariants || []).length}`)
  if (problems.length === 0) {
    console.log('✅ 图合法 · 载体在位 · 六条不变式成立 · 规则层同步 · 顺序一致 · 轨迹合法')
    process.exit(0)
  }
  for (const p of problems) console.log(`   ⛔ ${p}`)
  console.log('-----------------------------------------')
  console.log('⛔ 流程不一致：先跑 --diff 出提案，确认后 --apply-order 重新批准')
  process.exit(1)
}

if (has('--selftest')) {
  let passed = 0
  const total = 4
  const g = {
    steps: [
      { id: 'A', estSec: 1, dependsOn: [] },
      { id: 'B', estSec: 1, dependsOn: ['A'] },
      { id: 'C', estSec: 1, dependsOn: ['A'] },
      { id: 'D', estSec: 1, dependsOn: ['B', 'C'] },
    ],
    invariants: [{ id: 'I3', text: '首步 A', type: 'first', step: 'A' }],
  }
  const p1 = layeredPlan(g.steps)
  if (!p1.error && p1.layers.length === 3 && p1.layers[1].length === 2) { console.log('✅ 态1 拓扑分层正确（A ∥ 无 · B,C ∥ · D）'); passed++ }
  else console.error('❌ 态1 分层错误：' + JSON.stringify(p1.layers))

  const cyc = layeredPlan([{ id: 'X', dependsOn: ['Y'] }, { id: 'Y', dependsOn: ['X'] }])
  if (cyc.error && /环/.test(cyc.error)) { console.log('✅ 态2 环依赖被拒'); passed++ }
  else console.error('❌ 态2 期望检出环')

  const bad = JSON.parse(JSON.stringify(g))
  bad.invariants = [{ id: 'I4', text: '写后必读回紧跟写', type: 'immediate', step: 'C' }]
  const probs = checkInvariants(bad, p1.layers)
  if (probs.length >= 1) { console.log('✅ 态3 不变式违背被检出'); passed++ }
  else console.error('❌ 态3 期望检出不变式违背')

  const traceBad = checkInvariants({ ...g, invariants: [{ id: 'I6', text: '流转轨迹必须可复现', type: 'trace' }] }, p1.layers, { trace: { ok: false, broken: ['run-x.jsonl：第 2 条正文与哈希不符（被改动）'] } })
  if (traceBad.length >= 1) { console.log('✅ 态4 流转轨迹断链被检出（I6）'); passed++ }
  else console.error('❌ 态4 期望检出流转轨迹断链')

  console.log(`—— 自检结果：${passed}/${total} 通过`)
  process.exit(passed === total ? 0 : 1)
}

console.error('用法：--plan | --check | --diff | --graph | --apply-order | --mark <id> | --selftest')
process.exit(2)
