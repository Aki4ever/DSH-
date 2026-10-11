#!/usr/bin/env node
/** REQ-103: 物理触达证据审计。文件存在不等于执行成功，本地测试不等于宿主隔离。 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, realpathSync } from 'node:fs'
import { join, dirname, resolve, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MATRIX_FILE = join(ROOT, 'ai-control/reports/state/physical_reach_matrix.json')
const EVIDENCE_FILE = join(ROOT, 'ai-control/reports/state/physical_reach_evidence.json')
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const hash = text => createHash('sha256').update(text).digest('hex')
const readJson = file => JSON.parse(readFileSync(file, 'utf8'))

function containedFile(rel) {
  if (typeof rel !== 'string' || !rel || isAbsolute(rel)) return false
  try {
    const p = realpathSync(resolve(ROOT, rel))
    const r = relative(ROOT, p)
    return r && !r.startsWith('..') && !isAbsolute(r) && statSync(p).isFile()
  } catch { return false }
}

// 覆盖实现及配置依赖；状态产物、索引、历史报告不参与，防止采集自身使证据失效。
export function sourceDigest() {
  const files = []
  function walk(rel) {
    for (const entry of readdirSync(join(ROOT, rel), { withFileTypes: true })) {
      const p = join(rel, entry.name)
      if (entry.isDirectory()) walk(p)
      else if (entry.isFile() && /\.(mjs|sh|json|conf)$/.test(p)) files.push(p)
    }
  }
  for (const rel of ['scripts', 'ai-control/plugin', 'ai-control/config']) walk(rel)
  files.push('docs/requirements.md', 'docs/constraint_mechanism_optimize_19.md', 'AGENTS.md')
  if (existsSync(join(ROOT, 'ai-control/reports/state/progress_ledger.jsonl'))) files.push('ai-control/reports/state/progress_ledger.jsonl')
  return hash(files.sort().map(p => `${p}\0${hash(readFileSync(join(ROOT, p)))}\n`).join(''))
}

// 不接收 shell、环境变量前缀、重定向或任意参数；只运行已有仓库判定/自检入口。
export function parseCommand(command) {
  if (typeof command !== 'string') throw new Error('缺少命令')
  const m = command.match(/^(node|bash) ([a-zA-Z0-9_./-]+) (--check|check|--selftest|--self-test)$/)
  if (!m || !containedFile(m[2]) || !/^(scripts\/|ai-control\/plugin\/)/.test(m[2])) {
    // 既有插件自检无参数，单独精确许可。
    if (command === 'node ai-control/plugin/selftest.mjs' && containedFile('ai-control/plugin/selftest.mjs')) {
      return [process.execPath, [join(ROOT, 'ai-control/plugin/selftest.mjs')]]
    }
    throw new Error(`命令不在只读判定/自检契约内: ${command}`)
  }
  if ((m[1] === 'node' && !m[2].endsWith('.mjs')) || (m[1] === 'bash' && !m[2].endsWith('.sh'))) throw new Error('解释器与文件不匹配')
  return [m[1] === 'node' ? process.execPath : '/bin/bash', [join(ROOT, m[2]), m[3]]]
}

/** 自动拆解的是缺失的执行条件，不发明权限或未注册 skill。 */
export function planReach(items, { maxDepth = 3, maxNodes = 100 } = {}) {
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 8 || !Number.isInteger(maxNodes) || maxNodes < 1 || maxNodes > 1000) throw new Error('拆解预算非法')
  const nodes = []; let exhausted = false
  function visit(id, facet, depth, ancestors) {
    if (nodes.length >= maxNodes) { exhausted = true; return }
    if (ancestors.includes(facet) || depth >= maxDepth) {
      nodes.push({ id, facet, depth, status: 'blocked', reason: '循环或深度上限；需要接口/权限，不能判诉求不成立' }); return
    }
    if (facet === 'reach') {
      nodes.push({ id, facet, depth, status: 'decomposed' })
      for (const next of ['entry', 'judge', 'negative-test', 'evidence', 'host-boundary']) visit(id, next, depth + 1, [...ancestors, facet])
    } else {
      const tools = { entry: 'glob/read + 已登记入口', judge: '受限 argv 判定调用', 'negative-test': '既有 selftest 或明确待实现反例', evidence: 'physical_reach_audit --collect', 'host-boundary': '隔离测试会话的真实守卫允许/拒绝测试；缺接口则阻塞' }
      nodes.push({ id, facet, depth, status: facet === 'host-boundary' ? 'blocked' : 'pending', tool: tools[facet], reason: facet === 'host-boundary' ? '本地自检不能证明宿主强制拦截，不能递归获得额外权限' : '需执行并验证，生成计划不算完成' })
    }
  }
  for (const item of items) visit(item.id, 'reach', 0, [])
  return { maxDepth, maxNodes, exhausted, nodes, complete: false }
}

export function auditPhysicalReach(matrixData = null, evidenceData = null, options = {}) {
  let data, evidence
  try { data = matrixData ?? readJson(MATRIX_FILE) } catch (e) { return { ok: false, exit: 2, issues: [`矩阵不可读: ${e.message}`] } }
  if (!Array.isArray(data?.items) || !data.items.length) return { ok: false, exit: 1, issues: ['矩阵条目为空或结构非法'] }
  const issues = [], missing = []; const ids = new Set()
  for (const it of data.items) {
    if (!it || typeof it.id !== 'string' || ids.has(it.id)) { issues.push('矩阵 id 缺失/重复'); continue }
    ids.add(it.id)
    if (it.status !== 'passed' || it.undecidable) issues.push(`${it.id}: 声明未通过（不得用 not-applicable 隐去阻塞）`)
    if (![it.hasEntry, it.hasJudge, it.hasSelftest, it.hasLedger].every(x => x === true)) issues.push(`${it.id}: 四件套声明不齐`)
    if (!containedFile(it.entry)) issues.push(`${it.id}: 入口缺失、越界或不是文件`)
    for (const cmd of [it.judgeCmd, it.selftestCmd]) { try { parseCommand(cmd) } catch (e) { issues.push(`${it.id}: ${e.message}`) } }
  }
  try { evidence = evidenceData ?? readJson(EVIDENCE_FILE) } catch { missing.push('缺少真实命令执行证据') }
  if (evidence) {
    const now = options.now ?? Date.now(), digest = options.digest ?? sourceDigest()
    const age = now - Date.parse(evidence.generatedAt)
    if (!Number.isFinite(age) || age < -60000 || age > MAX_AGE_MS) missing.push('执行证据过期/时间非法')
    if (evidence.sourceDigest !== digest || evidence.matrixDigest !== hash(JSON.stringify(data))) missing.push('实现/配置/矩阵变化，须重新采集证据')
    if (!Array.isArray(evidence.runs)) missing.push('证据 runs 结构非法')
    else for (const it of data.items.filter(Boolean)) {
      for (const kind of ['judge', 'selftest']) {
        const cmd = kind === 'judge' ? it.judgeCmd : it.selftestCmd
        const rows = evidence.runs.filter(r => r && typeof r === 'object' && r.id === it.id && r.kind === kind)
        const row = rows[0]
        if (rows.length !== 1 || row.command !== cmd || typeof row.stdout !== 'string' || typeof row.stderr !== 'string' || row.outputDigest !== hash(`${row.stdout}\0${row.stderr}`)) {
          missing.push(`${it.id}/${kind}: 执行留痕缺失/不匹配`); continue
        }
        if (row.exit === null || row.error || row.signal || row.exit === 2 || row.exit === 3) missing.push(`${it.id}/${kind}: 超时、异常或不可判定`)
        else if (row.exit !== 0) issues.push(`${it.id}/${kind}: 实际退出码 ${row.exit}`)
      }
    }
  }
  return { ok: !issues.length && !missing.length, exit: issues.length ? 1 : missing.length ? 2 : 0, issues: [...issues, ...missing], total: data.items.length,
    scope: 'repository-command-evidence', hostEnforcement: 'unverified', warning: '只证明仓库命令执行；同用户可写证据不构成可信权限隔离', plan: issues.length || missing.length ? planReach(data.items.filter(Boolean)) : null }
}

export function collectEvidence() {
  const data = readJson(MATRIX_FILE), before = sourceDigest(), runs = []
  if (!Array.isArray(data.items) || !data.items.length || data.items.length > 100) throw new Error('矩阵为空或超过100项采集预算')
  if (data.items.some(it => [it.judgeCmd, it.selftestCmd].some(cmd => String(cmd).includes('physical_reach_audit.mjs')))) throw new Error('拒绝自引用采集循环')
  for (const it of data.items) for (const kind of ['judge', 'selftest']) {
    const command = kind === 'judge' ? it.judgeCmd : it.selftestCmd
    let row = { id: it.id, kind, command, exit: null, stdout: '', stderr: '' }
    try {
      const [exe, argv] = parseCommand(command)
      const started = Date.now()
      const result = spawnSync(exe, argv, { cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 })
      row = { ...row, exit: result.status, signal: result.signal, error: result.error?.message ?? null, durationMs: Date.now() - started, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
    } catch (e) { row.error = e.message }
    row.outputDigest = hash(`${row.stdout}\0${row.stderr}`); runs.push(row)
    console.error(`${it.id}/${kind}: exit=${row.exit}${row.error ? ` (${row.error})` : ''}`)
  }
  const evidence = { version: 2, generatedAt: new Date().toISOString(), sourceDigest: before, matrixDigest: hash(JSON.stringify(data)), runs, hostEnforcement: 'unverified' }
  if (sourceDigest() !== before) throw new Error('采集期间实现变化，拒绝发布过时证据')
  writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + '\n')
  return auditPhysicalReach(data, readJson(EVIDENCE_FILE))
}

export function runSelftest() {
  const item = { id: 'fixture', status: 'passed', entry: 'scripts/control.sh', hasEntry: true, hasJudge: true, hasSelftest: true, hasLedger: true, judgeCmd: 'node scripts/gate_registry_audit.mjs --check', selftestCmd: 'node scripts/gate_registry_audit.mjs --selftest' }
  const data = { items: [item] }, now = Date.now()
  const evidence = { generatedAt: new Date(now).toISOString(), sourceDigest: 'fixture', matrixDigest: hash(JSON.stringify(data)), runs: ['judge', 'selftest'].map(kind => ({ id: item.id, kind, command: kind === 'judge' ? item.judgeCmd : item.selftestCmd, exit: 0, stdout: 'fixture only', stderr: '', outputDigest: hash('fixture only\0') })) }
  const run = (d = data, e = evidence) => auditPhysicalReach(d, e, { now, digest: 'fixture' })
  const tests = [
    ['合法夹具仅证明判定器', () => assert.equal(run().exit, 0)],
    ['缺留痕不能假绿', () => assert.equal(run(data, { ...evidence, runs: [] }).exit, 2)],
    ['空记录不抛异常且不可判定', () => assert.equal(run(data, { ...evidence, runs: [null, false, 'bad'] }).exit, 2)],
    ['重复执行凭据不可判定', () => assert.equal(run(data, { ...evidence, runs: [...evidence.runs, evidence.runs[0]] }).exit, 2)],
    ['失败命令不能假绿', () => assert.equal(run(data, { ...evidence, runs: evidence.runs.map(r => ({ ...r, exit: 1 })) }).exit, 1)],
    ['过期证据', () => assert.equal(run(data, { ...evidence, generatedAt: new Date(now - MAX_AGE_MS - 1).toISOString() }).exit, 2)],
    ['源码失效', () => assert.equal(run(data, { ...evidence, sourceDigest: 'old' }).exit, 2)],
    ['日志篡改', () => assert.equal(run(data, { ...evidence, runs: evidence.runs.map(r => ({ ...r, stdout: 'fake' })) }).exit, 2)],
    ['四件缺台账', () => assert.equal(run({ items: [{ ...item, hasLedger: false }] }).exit, 1)],
    ['未知状态不能通过', () => assert.equal(run({ items: [{ ...item, status: 'not-applicable' }] }).exit, 1)],
    ['目录不算入口', () => assert.equal(run({ items: [{ ...item, entry: 'scripts' }] }).exit, 1)],
    ['shell 注入拒绝', () => assert.throws(() => parseCommand(item.judgeCmd + '; true'))],
    ['超时不可判定', () => assert.equal(run(data, { ...evidence, runs: evidence.runs.map(r => ({ ...r, exit: null, error: 'timeout' })) }).exit, 2)],
    ['拆解节点有界', () => { const p = planReach([item], { maxNodes: 2 }); assert.equal(p.nodes.length, 2); assert.equal(p.exhausted, true) }],
    ['拆解深度有界', () => assert.ok(planReach([item], { maxDepth: 1 }).nodes.some(n => n.status === 'blocked'))],
    ['宿主证据不能由本地自检冒充', () => assert.equal(run().hostEnforcement, 'unverified')],
  ]
  let passed = 0
  for (const [name, fn] of tests) { try { fn(); passed++; console.log(`✅ ${name}`) } catch (e) { console.error(`❌ ${name}: ${e.message}`) } }
  console.log(`物理触达审计自检: ${passed}/${tests.length}`)
  return passed === tests.length
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2]
  try {
    if (mode === '--selftest') process.exitCode = runSelftest() ? 0 : 1
    else if (mode === '--plan') console.log(JSON.stringify(planReach(readJson(MATRIX_FILE).items), null, 2))
    else if (mode === '--check' || mode === '--collect') {
      const result = mode === '--collect' ? collectEvidence() : auditPhysicalReach()
      console.log(JSON.stringify(result, null, 2)); process.exitCode = result.exit
    } else { console.error('用法: node scripts/physical_reach_audit.mjs --check|--selftest|--collect|--plan'); process.exitCode = 2 }
  } catch (e) { console.error(`不可判定: ${e.message}`); process.exitCode = 2 }
}
