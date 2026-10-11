#!/usr/bin/env node
/** REQ-103: 物理触达证据审计。文件存在不等于执行成功，本地测试不等于宿主隔离。 */
import { readFileSync, writeFileSync, renameSync, existsSync, readdirSync, statSync, realpathSync } from 'node:fs'
import { join, dirname, resolve, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { withLockSync } from './lib/atomic_lock.mjs'

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

/** 缺能力图的纯规划器：只展开显式子能力，不执行或授权任何工具。 */
export function planCapabilities(roots, registry, { maxDepth = 3, maxNodes = 100 } = {}) {
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 8 || !Number.isInteger(maxNodes) || maxNodes < 1 || maxNodes > 1000) throw new Error('能力规划预算非法')
  if (!Array.isArray(roots) || !roots.length || roots.length > maxNodes || roots.some(id => typeof id !== 'string' || !id.trim()) || new Set(roots).size !== roots.length) throw new Error('能力根任务非法')
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) throw new Error('能力注册表非法')
  const nodes = [], omitted = []
  function visit(id, depth, ancestors) {
    if (nodes.length >= maxNodes) { omitted.push({ id, depth, ancestors, reason: '节点预算耗尽，未展开' }); return }
    const node = { id, depth, ancestors, status: 'blocked' }; nodes.push(node)
    if (ancestors.includes(id)) { node.reason = '能力引用循环'; return }
    if (depth >= maxDepth) { node.reason = '能力深度上限'; return }
    if (!Object.hasOwn(registry, id)) { node.reason = '未知能力，缺少可验证落点'; return }
    const spec = registry[id]
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) { node.reason = '能力契约非法'; return }
    if (spec.boundary) { node.reason = '权限或宿主边界；不能通过拆解获得权限'; return }
    if (Object.hasOwn(spec, 'children')) {
      if (!Array.isArray(spec.children) || !spec.children.length || spec.children.length > maxNodes || spec.children.some(x => typeof x !== 'string' || !x.trim()) || new Set(spec.children).size !== spec.children.length || Object.hasOwn(spec, 'landing')) { node.reason = '子能力契约非法或与落点冲突'; return }
      node.status = 'decomposed'
      for (const child of spec.children) visit(child, depth + 1, [...ancestors, id])
      return
    }
    if (typeof spec.landing !== 'string' || !spec.landing.trim()) { node.reason = '缺能力且没有登记子能力或落点'; return }
    node.status = 'pending'; node.landing = spec.landing
    node.reason = '落点仅为登记引用；必须另行验证与授权，规划不算触达'
  }
  for (const id of roots) visit(id, 0, [])
  return { maxDepth, maxNodes, nodes, omitted, complete: false, executionEnabled: false }
}

/** 自动拆解的是缺失的执行条件，不发明权限或未注册 skill。 */
export function planReach(items, { maxDepth = 3, maxNodes = 100 } = {}) {
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 8 || !Number.isInteger(maxNodes) || maxNodes < 1 || maxNodes > 1000) throw new Error('拆解预算非法')
  if (!Array.isArray(items) || items.length > maxNodes || items.some(it => !it || typeof it.id !== 'string' || !it.id.trim()) || new Set(items.map(it => it.id)).size !== items.length) throw new Error('拆解输入非法、重复或超过节点预算')
  const nodes = [], omittedLeaves = []; let exhausted = false
  function visit(id, facet, depth, ancestors) {
    if (nodes.length >= maxNodes) { exhausted = true; omittedLeaves.push({ id, facet, depth, reason: '节点预算耗尽，未展开或执行' }); return }
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
  const omittedIds = []
  for (const item of items) {
    if (nodes.length >= maxNodes) { exhausted = true; omittedIds.push(item.id); continue }
    visit(item.id, 'reach', 0, [])
  }
  return { maxDepth, maxNodes, exhausted, omittedIds, omittedLeaves, nodes, complete: false }
}

// 独立于可写矩阵声明的最小验收契约；不允许真实台账清查降级为夹具。
export function validateAcceptanceContract(data) {
  const required = [
    ['C1-a', 'scripts/gate_registry_audit.mjs'], ['C2', 'scripts/tristate_sweep.mjs'],
    ['C3-b', 'scripts/lib/physical_lock.mjs'], ['C3-c', 'scripts/bypass_audit.mjs'],
    ['C4', 'scripts/scope_audit.mjs'], ['C5', 'scripts/exec_bit_audit.mjs'], ['C6', 'scripts/script_registry_audit.mjs'],
  ]
  const problems = []
  for (const [id, entry] of required) {
    const matches = data?.items?.filter(it => it?.id === id) ?? []
    if (matches.length !== 1 || matches[0].entry !== entry || matches[0].judgeCmd !== `node ${entry} --check` || matches[0].selftestCmd !== `node ${entry} --selftest`) problems.push(`${id}: 固定验收入口或判据不符`)
  }
  const pluginRows = data?.items?.filter(it => it?.id === 'C1-c') ?? []
  if (pluginRows.length !== 1 || pluginRows[0].entry !== 'ai-control/plugin/index.mjs' || pluginRows[0].judgeCmd !== 'node ai-control/plugin/selftest.mjs' || pluginRows[0].selftestCmd !== 'node ai-control/plugin/selftest.mjs') problems.push('C1-c: 固定插件回归入口不符')
  if (data?.items?.length !== 9) problems.push('验收必须恰好9项，禁止删项或增加未审核调用')
  const row = data?.items?.find(it => it?.id === 'C3-a')
  if (!row || row.entry !== 'scripts/progress_ledger.mjs' || row.judgeCmd !== 'node scripts/progress_ledger.mjs --check' || row.selftestCmd !== 'node scripts/progress_ledger.mjs --selftest') {
    problems.push('C3-a: 正式验收必须检查真实台账，selftest不得替代check；条目不得移除')
  }
  return problems
}

export function auditPhysicalReach(matrixData = null, evidenceData = null, options = {}) {
  let data, evidence
  try { data = matrixData ?? readJson(MATRIX_FILE) } catch (e) { return { ok: false, exit: 2, issues: [`矩阵不可读: ${e.message}`] } }
  if (!Array.isArray(data?.items) || !data.items.length) return { ok: false, exit: 1, issues: ['矩阵条目为空或结构非法'] }
  const issues = validateAcceptanceContract(data), missing = [], leafResults = []; const ids = new Set()
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
    else {
      if (evidence.runs.length !== data.items.length * 2 || evidence.runs.some(r => !r || !data.items.some(it => it?.id === r.id) || !['judge', 'selftest'].includes(r.kind))) missing.push('执行留痕数量或标识非法，拒绝混入未登记调用')
      for (const it of data.items.filter(Boolean)) {
      for (const kind of ['judge', 'selftest']) {
        const cmd = kind === 'judge' ? it.judgeCmd : it.selftestCmd
        const rows = evidence.runs.filter(r => r && typeof r === 'object' && r.id === it.id && r.kind === kind)
        const row = rows[0]
        if (rows.length !== 1 || row.command !== cmd || typeof row.stdout !== 'string' || typeof row.stderr !== 'string' || row.outputDigest !== hash(`${row.stdout}\0${row.stderr}`)) {
          missing.push(`${it.id}/${kind}: 执行留痕缺失/不匹配`); continue
        }
        if (!Number.isInteger(row.exit) || row.exit < 0 || row.exit > 255 || row.error || row.signal || row.exit === 2 || row.exit === 3) missing.push(`${it.id}/${kind}: 超时、异常或不可判定`)
        else if (row.exit !== 0) issues.push(`${it.id}/${kind}: 实际退出码 ${row.exit}`)
      }
      }
    }
  }
  // 仅在整份凭据结构、时效与摘要校验均通过时映射实际叶子结果。
  // 正式失败可以定位为failed；证据损坏时全部undecidable，不能沿用局部绿色。
  for (const it of data.items.filter(Boolean)) for (const kind of ['judge', 'selftest']) {
    const row = Array.isArray(evidence?.runs) ? evidence.runs.find(r => r?.id === it.id && r?.kind === kind) : null
    leafResults.push({ id: it.id, facet: kind === 'selftest' ? 'negative-test' : 'judge',
      status: missing.length ? 'undecidable' : row?.exit === 0 ? 'passed' : 'failed',
      command: kind === 'judge' ? it.judgeCmd : it.selftestCmd,
      exit: missing.length ? null : row?.exit ?? null })
  }
  const carrierResults = []
  for (const it of data.items.filter(Boolean)) {
    carrierResults.push({ id: it.id, facet: 'entry', status: containedFile(it.entry) ? 'passed' : 'failed',
      path: it.entry, scope: 'repository-file-existence; not invocation or host loading' })
    carrierResults.push({ id: it.id, facet: 'evidence', status: missing.length ? 'undecidable' : 'passed',
      scope: 'freshness/digest/run-shape validated; command failure remains separate' })
  }
  const plan = planReach(data.items.filter(Boolean))
  for (const node of plan.nodes) {
    // 只能更新仍待执行的命令叶子；预算/深度阻塞与宿主边界不能被结果覆盖。
    if (node.status !== 'pending') continue
    const result = [...leafResults, ...carrierResults].find(r => r.id === node.id && r.facet === node.facet)
    if (result) Object.assign(node, { ...result,
      reason: result.scope ?? (result.status === 'undecidable' ? '证据无效，不能确认执行结果' : '已核对命令留痕；只证明仓库执行') })
  }
  return { ok: !issues.length && !missing.length, exit: issues.length ? 1 : missing.length ? 2 : 0, issues: [...issues, ...missing], total: data.items.length, leafResults, carrierResults,
    scope: 'repository-command-evidence', hostEnforcement: 'unverified', warning: '只证明仓库命令执行；同用户可写证据不构成可信权限隔离', plan }
}

export function validateCollectionBudget(data) {
  if (!Array.isArray(data?.items) || !data.items.length || data.items.length * 2 > 100) throw new Error('矩阵为空或超过100次命令采集预算（最多50项）')
  return data.items.length * 2
}

// 从递归拆解结果派生受限命令队列。预算不完整时拒绝部分执行，避免静默漏验。
export function commandLeaves(data, budget = {}) {
  validateCollectionBudget(data)
  const plan = planReach(data.items, budget)
  if (plan.exhausted || plan.omittedIds.length || plan.omittedLeaves.length) throw new Error('拆解预算不足，拒绝部分命令采集')
  const queue = []
  for (const node of plan.nodes) {
    if (!['judge', 'negative-test'].includes(node.facet)) continue
    if (node.status !== 'pending') throw new Error('命令叶子被深度或循环阻塞，拒绝采集')
    const item = data.items.find(it => it.id === node.id)
    const kind = node.facet === 'judge' ? 'judge' : 'selftest'
    const command = kind === 'judge' ? item.judgeCmd : item.selftestCmd
    parseCommand(command)
    if (command.includes('physical_reach_audit.mjs')) throw new Error('拒绝自引用采集循环')
    queue.push({ id: item.id, kind, command })
  }
  if (queue.length !== data.items.length * 2) throw new Error('命令叶子覆盖不完整')
  return queue
}

export function collectEvidence() {
  return withLockSync('state:physical_reach_evidence', collectEvidenceLocked, { why: '真实触达证据采集', timeoutMs: 1000 })
}

function collectEvidenceLocked() {
  const data = readJson(MATRIX_FILE), before = sourceDigest(), runs = []
  validateCollectionBudget(data)
  const contractIssues = validateAcceptanceContract(data)
  if (contractIssues.length) throw new Error(contractIssues.join('; '))
  const queue = commandLeaves(data)
  for (const { id, kind, command } of queue) {
    let row = { id, kind, command, exit: null, stdout: '', stderr: '' }
    try {
      const [exe, argv] = parseCommand(command)
      const started = Date.now()
      const result = spawnSync(exe, argv, { cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 })
      row = { ...row, exit: result.status, signal: result.signal, error: result.error?.message ?? null, durationMs: Date.now() - started, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
    } catch (e) { row.error = e.message }
    row.outputDigest = hash(`${row.stdout}\0${row.stderr}`); runs.push(row)
    console.error(`${id}/${kind}: exit=${row.exit}${row.error ? ` (${row.error})` : ''}`)
  }
  if (sourceDigest() !== before || hash(JSON.stringify(readJson(MATRIX_FILE))) !== hash(JSON.stringify(data))) throw new Error('采集期间实现或矩阵变化，拒绝发布过时证据')
  const evidence = { version: 2, generatedAt: new Date().toISOString(), sourceDigest: before, matrixDigest: hash(JSON.stringify(data)), runs, hostEnforcement: 'unverified' }
  publishEvidence(evidence)
  return auditPhysicalReach(data, readJson(EVIDENCE_FILE))
}

// 可注入IO仅供同一发布算法的故障夹具；CLI不能指定路径或IO。
function publishEvidence(evidence, io = { writeFileSync, readFileSync, renameSync }) {
  const staging = `${EVIDENCE_FILE}.${process.pid}.${Date.now()}.tmp`
  if (dirname(staging) !== dirname(EVIDENCE_FILE) || resolve(EVIDENCE_FILE) !== join(ROOT, 'ai-control/reports/state/physical_reach_evidence.json')) throw new Error('证据发布目标非法')
  const payload = JSON.stringify(evidence, null, 2) + '\n'
  io.writeFileSync(staging, payload, { flag: 'wx' })
  const reread = io.readFileSync(staging, 'utf8')
  if (reread !== payload) throw new Error('暂存证据字节不一致，拒绝替换')
  JSON.parse(reread)
  io.renameSync(staging, EVIDENCE_FILE)
}

export function runSelftest() {
  const item = { id: 'C3-a', status: 'passed', entry: 'scripts/progress_ledger.mjs', hasEntry: true, hasJudge: true, hasSelftest: true, hasLedger: true, judgeCmd: 'node scripts/progress_ledger.mjs --check', selftestCmd: 'node scripts/progress_ledger.mjs --selftest' }
  const data = readJson(MATRIX_FILE), now = Date.now()
  const evidence = { generatedAt: new Date(now).toISOString(), sourceDigest: 'fixture', matrixDigest: hash(JSON.stringify(data)), runs: data.items.flatMap(row => ['judge', 'selftest'].map(kind => ({ id: row.id, kind, command: kind === 'judge' ? row.judgeCmd : row.selftestCmd, exit: 0, stdout: 'fixture only', stderr: '', outputDigest: hash('fixture only\0') }))) }
  const run = (d = data, e = evidence) => auditPhysicalReach(d, e, { now, digest: 'fixture' })
  const tests = [
    ['生产默认参数拒绝旧源码证据', () => assert.equal(auditPhysicalReach(data, evidence).exit, 2)],
    ['能力图递归到登记落点但不冒充执行', () => { const p = planCapabilities(['a'], { a: { children: ['b'] }, b: { children: ['c'] }, c: { landing: 'registered-tool:c' } }); assert.deepEqual(p.nodes.map(n => n.status), ['decomposed', 'decomposed', 'pending']); assert.equal(p.executionEnabled, false); assert.equal(p.complete, false) }],
    ['能力未知与权限边界均显式阻塞', () => { const p = planCapabilities(['a', 'missing'], { a: { boundary: true, children: ['b'] } }); assert(p.nodes.every(n => n.status === 'blocked')); assert.equal(p.nodes.length, 2) }],
    ['能力循环不可无限拆解', () => { const p = planCapabilities(['a'], { a: { children: ['b'] }, b: { children: ['a'] } }); assert.equal(p.nodes.at(-1).reason, '能力引用循环') }],
    ['能力预算省略显式留痕', () => { const p = planCapabilities(['a'], { a: { children: ['b', 'c'] }, b: { landing: 'b' }, c: { landing: 'c' } }, { maxNodes: 2 }); assert.equal(p.nodes.length, 2); assert.equal(p.omitted[0].id, 'c') }],
    ['能力深度上限停止展开', () => { const p = planCapabilities(['a'], { a: { children: ['b'] }, b: { landing: 'b' } }, { maxDepth: 1 }); assert.equal(p.nodes.at(-1).reason, '能力深度上限') }],
    ['能力契约冲突不可选一个假绿', () => { const p = planCapabilities(['a'], { a: { children: ['b'], landing: 'a' } }); assert.equal(p.nodes[0].status, 'blocked') }],
    ['全部九项合法契约', () => assert.deepEqual(validateAcceptanceContract(data), [])],
    ...data.items.map(row => [`契约拒绝单项降级 ${row.id}`, () => {
      const bad = { ...data, items: data.items.map(it => it.id === row.id ? { ...it, judgeCmd: 'node scripts/progress_ledger.mjs --selftest' } : it) }
      assert.ok(validateAcceptanceContract(bad).length > 0)
    }]),
    ['采集预算按命令计数', () => assert.equal(validateCollectionBudget({ items: Array(50).fill(item) }), 100)],
    ['采集预算101以上拒绝', () => assert.throws(() => validateCollectionBudget({ items: Array(51).fill(item) }))],
    ['计划命令队列只包含登记叶子且顺序稳定', () => assert.deepEqual(commandLeaves(data), data.items.flatMap(it => ['judge', 'selftest'].map(kind => ({ id: it.id, kind, command: kind === 'judge' ? it.judgeCmd : it.selftestCmd }))))],
    ['计划预算不足不得部分执行', () => assert.throws(() => commandLeaves({ items: [item] }, { maxNodes: 2 }))],
    ['深度阻塞命令不得执行', () => assert.throws(() => commandLeaves({ items: [item] }, { maxDepth: 1 }))],
    ['计划自引用不得执行', () => assert.throws(() => commandLeaves({ items: [{ ...item, judgeCmd: 'node scripts/physical_reach_audit.mjs --collect' }] }))],
    ['空采集拒绝', () => assert.throws(() => validateCollectionBudget({ items: [] }))],
    ['正式验收不能替换成自检', () => assert.equal(validateAcceptanceContract({ items: [{ ...item, judgeCmd: item.selftestCmd }] }).length > 0, true)],
    ['正式验收条目不能删除', () => assert.equal(validateAcceptanceContract({ items: [] }).length > 0, true)],
    ['正式验收条目不能改名规避', () => assert.equal(validateAcceptanceContract({ items: [{ ...item, id: 'C3-renamed' }] }).length > 0, true)],
    ...['success', 'write-error', 'corrupt-read', 'rename-error'].map(mode => [`发布故障夹具 ${mode}`, () => {
      let old = 'old-valid-evidence', staged = '', renamed = false
      const io = {
        writeFileSync(path, text, options) { assert.equal(options.flag, 'wx'); assert.notEqual(path, EVIDENCE_FILE); if (mode === 'write-error') throw new Error('injected write'); staged = text },
        readFileSync() { return mode === 'corrupt-read' ? '{}' : staged },
        renameSync(from, to) { assert.equal(to, EVIDENCE_FILE); assert.equal(dirname(from), dirname(to)); if (mode === 'rename-error') throw new Error('injected rename'); old = staged; renamed = true },
      }
      if (mode === 'success') { publishEvidence(evidence, io); assert.equal(renamed, true); assert.deepEqual(JSON.parse(old), evidence) }
      else { assert.throws(() => publishEvidence(evidence, io)); assert.equal(old, 'old-valid-evidence'); assert.equal(renamed, false) }
    }]),
    ['采集锁拒绝重入并释放', () => {
      const key = `test:physical_reach:${process.pid}`
      withLockSync(key, () => assert.throws(() => withLockSync(key, () => assert.fail('不得重入'), { timeoutMs: 1 })))
      assert.equal(withLockSync(key, () => 'released'), 'released')
    }],
    ['载体叶子独立核验且不替代宿主', () => { const r = run(); assert.equal(r.carrierResults.length, data.items.length * 2); assert(r.carrierResults.every(n => n.status === 'passed')); assert(r.plan.nodes.filter(n => ['entry', 'evidence'].includes(n.facet)).every(n => n.status === 'passed')); assert.equal(r.hostEnforcement, 'unverified'); assert.equal(r.plan.complete, false) }],
    ['失效证据载体不沿用绿色', () => { const r = run(data, { ...evidence, sourceDigest: 'bad' }); assert(r.carrierResults.filter(n => n.facet === 'evidence').every(n => n.status === 'undecidable')) }],
    ['合法夹具仅证明判定器', () => assert.equal(run().exit, 0)],
    ['命令通过仍保留未完成宿主计划', () => { const p = run().plan; assert.equal(p.complete, false); assert.ok(p.nodes.some(n => n.facet === 'host-boundary' && n.status === 'blocked')); assert.ok(p.nodes.filter(n => ['judge', 'negative-test'].includes(n.facet)).every(n => n.status === 'passed')) }],
    ['失效证据回填计划为不可判定', () => assert.ok(run(data, { ...evidence, sourceDigest: 'old' }).plan.nodes.filter(n => n.facet === 'judge').every(n => n.status === 'undecidable'))],
    ['有效证据映射命令叶子', () => { assert.equal(run().leafResults.length, data.items.length * 2); assert.ok(run().leafResults.every(r => r.status === 'passed')) }],
    ['失败叶子不得映射通过', () => assert.ok(run(data, { ...evidence, runs: evidence.runs.map(r => ({ ...r, exit: 1 })) }).leafResults.every(r => r.status === 'failed'))],
    ['失效证据叶子全部不可判定', () => assert.ok(run(data, { ...evidence, sourceDigest: 'old' }).leafResults.every(r => r.status === 'undecidable'))],
    ...[null, {}, { find: 'not callable' }, 'bad'].map(runs => ['非法runs结构叶子失败关闭 ' + JSON.stringify(runs), () => { const result = run(data, { ...evidence, runs }); assert.equal(result.exit, 2); assert.ok(result.leafResults.every(r => r.status === 'undecidable')) }]),
    ['缺留痕不能假绿', () => assert.equal(run(data, { ...evidence, runs: [] }).exit, 2)],
    ['空记录不抛异常且不可判定', () => assert.equal(run(data, { ...evidence, runs: [null, false, 'bad'] }).exit, 2)],
    ['重复执行凭据不可判定', () => assert.equal(run(data, { ...evidence, runs: [...evidence.runs, evidence.runs[0]] }).exit, 2)],
    ['失败命令不能假绿', () => assert.equal(run(data, { ...evidence, runs: evidence.runs.map(r => ({ ...r, exit: 1 })) }).exit, 1)],
    ['过期证据', () => assert.equal(run(data, { ...evidence, generatedAt: new Date(now - MAX_AGE_MS - 1).toISOString() }).exit, 2)],
    ['源码失效', () => assert.equal(run(data, { ...evidence, sourceDigest: 'old' }).exit, 2)],
    ['多余执行记录拒绝', () => assert.equal(run(data, { ...evidence, runs: [...evidence.runs, { ...evidence.runs[0], id: 'unregistered' }] }).exit, 2)],
    ...[undefined, '0', -1, 256, 0.5].map(exit => [`非法退出码 ${String(exit)}`, () => assert.equal(run(data, { ...evidence, runs: evidence.runs.map((r, i) => i ? r : { ...r, exit }) }).exit, 2)]),
    ['日志篡改', () => assert.equal(run(data, { ...evidence, runs: evidence.runs.map(r => ({ ...r, stdout: 'fake' })) }).exit, 2)],
    ['四件缺台账', () => assert.equal(run({ items: [{ ...item, hasLedger: false }] }).exit, 1)],
    ['未知状态不能通过', () => assert.equal(run({ items: [{ ...item, status: 'not-applicable' }] }).exit, 1)],
    ['目录不算入口', () => assert.equal(run({ items: [{ ...item, entry: 'scripts' }] }).exit, 1)],
    ['shell 注入拒绝', () => assert.throws(() => parseCommand(item.judgeCmd + '; true'))],
    ['超时不可判定', () => assert.equal(run(data, { ...evidence, runs: evidence.runs.map(r => ({ ...r, exit: null, error: 'timeout' })) }).exit, 2)],
    ['部分展开预算不得丢叶子', () => { const p = planReach([item], { maxNodes: 2 }); assert.deepEqual(p.omittedLeaves.map(n => n.facet), ['judge', 'negative-test', 'evidence', 'host-boundary']); assert.equal(p.nodes.length + p.omittedLeaves.length, 6); assert.equal(p.complete, false) }],
    ['完整展开没有省略叶子', () => assert.deepEqual(planReach([item]).omittedLeaves, [])],
    ['拆解节点有界', () => { const p = planReach([item], { maxNodes: 2 }); assert.equal(p.nodes.length, 2); assert.equal(p.exhausted, true) }],
    ['拆解拒绝空标识或重复', () => { assert.throws(() => planReach([item, item])); assert.throws(() => planReach([{ id: '' }])); assert.throws(() => planReach(null)) }],
    ['拆解输入预算也有界', () => assert.throws(() => planReach(Array.from({ length: 101 }, (_, i) => ({ id: String(i) }))))],
    ['预算耗尽不得静默丢任务', () => { const p = planReach([item, { id: 'later' }], { maxNodes: 2 }); assert.deepEqual(p.omittedIds, ['later']); assert.equal(p.complete, false) }],
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
