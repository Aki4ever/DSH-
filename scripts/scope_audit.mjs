#!/usr/bin/env node
// ==============================================================================
// 全域管控覆盖审计器 (Domain-wide Control Scope Audit) — REQ-092 / R1-a
// ------------------------------------------------------------------------------
// 为什么需要它（用户原话："必须新增和存量都要服从管控机制（我现在看到 DSH 下的其他工程
// 文件夹并没有完全服从管控机制，修复这个问题）"）：
//   实施前的"合规"判定只有 `normalize_all_projects.mjs`，它按**文本在不在**发绿灯 ——
//   实测 4 个工程被判"完全合规"，而其中 4 个从未出现过任何管控脚本调用。
//   一份只看文档自洽的绿灯，证明不了机制在跑。
//
//   本审计器把"服从管控"降为四类可复算的物理事实，逐工程逐项实跑：
//     ① 入口在位：`scripts/control.sh` 真实存在且可执行，且四个机制子命令齐备；
//     ② 文档可达：`AGENTS.md` 里写的脚本路径**在磁盘上真的存在**（悬空引用=假合规）；
//     ③ 运行留痕：本工程调用入口留下的 `.dsh-control/run-audit.jsonl`，或本工程会话转录里
//        出现过入口调用（两者任一即算"真跑过"；两者皆无 = 脱管）；
//     ④ 版本登记：`docs/requirements.md` 存在且含实施版本条目（需求版本强递增的落点）。
//
// 用法：
//   node scripts/scope_audit.mjs --check            # 判定 + 写机读产物（不达标退 1）
//   node scripts/scope_audit.mjs --check --json     # 只出机读结论
//   node scripts/scope_audit.mjs --check --project DSH股票
//   node scripts/scope_audit.mjs --selftest         # 反向用例：每条判据都要能判红
// 退出码：0 全域已接管；1 存在脱管工程；2 用法错误
// ==============================================================================

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync, realpathSync, chmodSync, rmSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cfg } from './lib/gates_config.mjs'
import { readTranscriptEvents } from './lib/session_transcript.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(__dirname, '..')

/** 管控入口的四个机制子命令（少一个即视为入口不完整）。 */
export const REQUIRED_ACTIONS = ['naming', 'lock', 'todo', 'check']
/** 入口脚本相对各工程的路径。 */
export const SHELL_REL = 'scripts/control.sh'
/** 运行留痕相对各工程的路径。 */
export const AUDIT_REL = '.dsh-control/run-audit.jsonl'
/** 默认排除的一级目录（不参与"工程脱管"判定，理由须写明）。 */
export const DEFAULT_EXCLUDE = [
  '.git', 'node_modules', '全局规则', '_retired_assets_20260923', 'assets',
]

/** 解析 DSH 工作根：显式参数 → 配置项 → 从本仓库向上探测（父目录里含其它工程）。 */
export function resolveDshRoot(explicit) {
  if (explicit) return resolve(explicit)
  const pick = cfg('SCOPE_DSH_ROOT', '', undefined) || process.env.DSH_SCOPE_ROOT
  if (pick) return resolve(pick)
  const parent = resolve(ROOT, '..')
  try {
    const names = readdirSync(parent, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
    if (names.length >= 2) return parent
  } catch { /* 探测失败：回落到本仓库自身 */ }
  return ROOT
}

/** 列出一个工程目录里的受管文件路径候选（用于悬空引用判定）。 */
export function extractScriptPaths(text) {
  const out = new Set()
  const src = String(text || '')
  // 只认行内代码里、以 scripts/ 或 全局规则/scripts/ 开头的路径（其余行内代码是概念词，不是路径）
  for (const m of src.matchAll(/`([^`\n]+)`/g)) {
    const raw = m[1].trim()
    const body = raw.replace(/^(\.\/|bash\s+|node\s+|sh\s+)/, '').split(/\s+/)[0]
    if (/^(\.\/)?scripts\/[A-Za-z0-9_./-]+\.(sh|mjs|cjs|js)$/.test(body)) out.add(body.replace(/^\.\//, ''))
    const abs = raw.match(/(\/[^\s`]*?\/scripts\/[A-Za-z0-9_./-]+\.(sh|mjs|cjs|js))/)
    if (abs) out.add(abs[1])
  }
  return [...out]
}

/** 判定一条引用是否真实可达：工程内存在，或全局规则仓库内存在（绝对路径）。 */
export function refResolvable(ref, projectDir, globalRoot = ROOT) {
  if (ref.startsWith('/')) return existsSync(ref)
  return existsSync(join(projectDir, ref)) || existsSync(join(globalRoot, ref))
}

/** 会话转录里是否出现过管控入口调用（不认自述，只认宿主记录的调用文本）。 */
export function transcriptEvidence(projectDir, dshHome) {
  const sessRoot = join(dshHome || join(process.env.HOME || '', '.dsh'), 'sessions')
  if (!existsSync(sessRoot)) return { found: false, marker: null, scanned: 0 }
  // 会话目录名由宿主按 cwd 转义生成，刻意不重实现其规则：改为扫描全部工程目录，
  // 逐个读会话头里的 cwd 字段做归属判定（宿主改转义规则也不会失效）。
  let scanned = 0
  for (const proj of safeReaddir(sessRoot)) {
    const pdir = join(sessRoot, proj)
    for (const sid of safeReaddir(pdir)) {
      const sdir = join(pdir, sid)
      const files = safeReaddir(sdir).filter((f) => /^session.*\.jsonl\.zstd$/.test(f))
      if (!files.length) continue
      const { events } = readTranscriptEvents(sid, dshHome)
      if (!events.length) continue
      let owner = null
      for (const ev of events) {
        const cwd = ev?.data?.cwd || ev?.cwd || ev?.data?.header?.cwd || ev?.session?.header?.cwd
        if (typeof cwd === 'string' && cwd) { owner = cwd; break }
      }
      if (!owner || !resolve(owner).startsWith(resolve(projectDir))) continue
      scanned++
      const text = readFileSyncSafe(join(sdir, files[0]))
      if (text.includes(SHELL_REL) || text.includes('control.sh')) {
        return { found: true, marker: SHELL_REL, scanned }
      }
    }
  }
  return { found: false, marker: null, scanned }
}

function safeReaddir(d) {
  try { return readdirSync(d) } catch { return [] }
}
function readFileSyncSafe(p) {
  try { return readFileSync(p, 'latin1') } catch { return '' }
}

/** 单工程取证：四类事实逐项判定，任一项不过即"未接管"。 */
export function auditProject(name, projectDir, opts = {}) {
  const globalRoot = opts.globalRoot || ROOT
  const shellPath = join(projectDir, SHELL_REL)
  const shellExists = existsSync(shellPath)
  let executable = false
  let actionsFound = []
  if (shellExists) {
    try { executable = (statSync(shellPath).mode & 0o111) !== 0 } catch { executable = false }
    const txt = readFileSyncSafeText(shellPath)
    actionsFound = REQUIRED_ACTIONS.filter((a) => new RegExp(`(^|\\s)${a}\\)`, 'm').test(txt))
  }
  const carrierOk = shellExists && executable && actionsFound.length === REQUIRED_ACTIONS.length

  const agentsPath = join(projectDir, 'AGENTS.md')
  const agentsText = existsSync(agentsPath) ? readFileSyncSafeText(agentsPath) : null
  const refs = agentsText ? extractScriptPaths(agentsText) : []
  const dangling = refs.filter((r) => !refResolvable(r, projectDir, globalRoot))
  const docsOk = !!agentsText && refs.length > 0 && dangling.length === 0

  const auditFile = join(projectDir, AUDIT_REL)
  const localRun = existsSync(auditFile)
  const transcript = opts.skipTranscript ? { found: false, marker: null, scanned: 0 } : transcriptEvidence(projectDir, opts.dshHome)
  const runtimeOk = localRun || transcript.found

  const reqPath = join(projectDir, 'docs', 'requirements.md')
  const reqOk = existsSync(reqPath) && /实施版本|当前系统实施总版本/.test(readFileSyncSafeText(reqPath))

  const items = {
    carrier: { ok: carrierOk, detail: shellExists ? `${SHELL_REL}${executable ? ' 可执行' : ' 不可执行'} · 子命令 ${actionsFound.length}/4` : `${SHELL_REL} 不存在` },
    docs: { ok: docsOk, detail: agentsText ? `引用 ${refs.length} 条 · 悬空 ${dangling.length} 条` : 'AGENTS.md 缺失' },
    runtime: { ok: runtimeOk, detail: localRun ? `本地留痕 ${AUDIT_REL}` : (transcript.found ? `会话转录留痕（扫 ${transcript.scanned} 个会话）` : '无任何调用留痕') },
    version: { ok: reqOk, detail: reqOk ? 'docs/requirements.md 含版本条目' : 'docs/requirements.md 缺失或无版本条目' },
  }
  const passed = Object.values(items).filter((i) => i.ok).length
  return { name, path: projectDir, items, passed, total: Object.keys(items).length, ok: passed === Object.keys(items).length, dangling }
}

function readFileSyncSafeText(p) {
  try { return readFileSync(p, 'utf8') } catch { return '' }
}

/**
 * 判定某个工作目录所属工程是否**未被管控接管**（供宿主硬门禁同步消费）。
 * 口径：以磁盘快照里的未接管名单为准；快照缺失/不可解析 → 返回 null（守卫放行，不误拦）。
 * @returns {{ uncovered: string[], root: string, at: string }|null}
 */
export function readScopeSnapshot(projectRoot) {
  // 优先读高频快照（与门禁同节拍），再回落权威报告
  const candidates = [
    join(projectRoot || ROOT, 'ai-control', 'reports', 'state', 'scope_audit_fast.json'),
    join(projectRoot || ROOT, 'ai-control', 'reports', 'state', 'scope_audit.json'),
    join(ROOT, 'ai-control', 'reports', 'state', 'scope_audit_fast.json'),
    join(ROOT, 'ai-control', 'reports', 'state', 'scope_audit.json'),
  ]
  for (const p of candidates) {
    if (!existsSync(p)) continue
    try {
      const j = JSON.parse(readFileSync(p, 'utf8'))
      if (j && Array.isArray(j.uncovered)) return { uncovered: j.uncovered, root: j.dshRoot, at: j.generatedAt }
    } catch { /* 损坏快照不做数 */ }
  }
  return null
}

/** 全域审计：遍历 DSH 工作根下的一级工程目录，逐工程取证。 */
export function auditDomain(opts = {}) {
  const dshRoot = resolveDshRoot(opts.root)
  const exclude = new Set([...DEFAULT_EXCLUDE, ...(opts.exclude || [])])
  let dirs = []
  try {
    dirs = readdirSync(dshRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !exclude.has(e.name))
      .map((e) => e.name)
  } catch { /* 读不到目录：结论为不可判定，交由调用方按失败处理 */ }
  if (opts.only) dirs = dirs.filter((d) => d === opts.only)

  const projects = dirs.map((d) => auditProject(d, join(dshRoot, d), opts))
  const uncovered = projects.filter((p) => !p.ok)
  const maxUncovered = Number(cfg('SCOPE_MAX_UNCOVERED', 0, undefined))
  return {
    dshRoot,
    generatedAt: new Date().toISOString(),
    projects,
    covered: projects.length - uncovered.length,
    total: projects.length,
    uncovered: uncovered.map((p) => p.name),
    maxUncovered,
    ok: projects.length > 0 && uncovered.length <= maxUncovered,
  }
}

/** 反向用例：每条判据都必须能判红（否则等于没有判定器）。 */
export function selftest() {
  const cases = []
  const add = (name, got, expect) => cases.push({ name, got, expect, ok: got === expect })
  const tmp = mkdtemp()

  // ① 入口判据
  const p1 = join(tmp, 'P1')
  mkdirSync(join(p1, 'scripts'), { recursive: true })
  add('缺入口 → carrier 判红', auditProject('P1', p1, { skipTranscript: true }).items.carrier.ok, false)
  writeFileSync(join(p1, SHELL_REL), '#!/bin/bash\ncase "$1" in naming) ;; lock) ;; todo) ;; check) ;; esac\n')
  const p1b = auditProject('P1', p1, { skipTranscript: true })
  add('入口齐备但不可执行 → carrier 判红', p1b.items.carrier.ok, false)
  chmodSync(join(p1, SHELL_REL), 0o755)
  add('入口齐备且可执行 → carrier 通过', auditProject('P1', p1, { skipTranscript: true }).items.carrier.ok, true)

  // ② 文档路径判据（悬空引用）
  add('无 AGENTS.md → docs 判红', auditProject('P1', p1, { skipTranscript: true }).items.docs.ok, false)
  writeFileSync(join(p1, 'AGENTS.md'), '跑 `./scripts/control.sh check` 与 `./scripts/not-exist.sh`。\n')
  add('引用不存在的脚本 → docs 判红（悬空引用）', auditProject('P1', p1, { skipTranscript: true }).items.docs.ok, false)
  writeFileSync(join(p1, 'AGENTS.md'), '跑 `./scripts/control.sh check`。\n')
  add('引用真实存在的脚本 → docs 通过', auditProject('P1', p1, { skipTranscript: true }).items.docs.ok, true)

  // ③ 运行留痕判据
  add('无任何调用留痕 → runtime 判红', auditProject('P1', p1, { skipTranscript: true }).items.runtime.ok, false)
  mkdirSync(join(p1, '.dsh-control'), { recursive: true })
  writeFileSync(join(p1, AUDIT_REL), '{"action":"check","exit":0}\n')
  add('有本地留痕 → runtime 通过', auditProject('P1', p1, { skipTranscript: true }).items.runtime.ok, true)

  // ④ 版本登记判据
  add('无需求台账 → version 判红', auditProject('P1', p1, { skipTranscript: true }).items.version.ok, false)
  mkdirSync(join(p1, 'docs'), { recursive: true })
  writeFileSync(join(p1, 'docs/requirements.md'), '# 台账\n> 当前系统实施总版本：`v1.0.0`\n')
  add('有需求台账且含版本 → version 通过', auditProject('P1', p1, { skipTranscript: true }).items.version.ok, true)

  // ⑤ 综合：四类全过才算接管
  add('四类全过 → 工程已接管', auditProject('P1', p1, { skipTranscript: true }).ok, true)

  rmrf(tmp)
  const failed = cases.filter((c) => !c.ok)
  return { cases, ok: failed.length === 0, failed }
}

function mkdtemp() {
  const base = join(process.env.TMPDIR || '/tmp', `scope-audit-${process.pid}-${Date.now()}`)
  mkdirSync(base, { recursive: true })
  return base
}
function rmrf(p) {
  try { rmSync(p, { recursive: true, force: true }) } catch { /* 清理失败不影响判定 */ }
}

function main() {
  const argv = process.argv.slice(2)
  const get = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d }
  if (argv.includes('--selftest')) {
    const r = selftest()
    console.log('🧪 全域覆盖审计器 · 反向用例自检')
    for (const c of r.cases) console.log(`   ${c.ok ? '✅' : '❌'} ${c.name}（期望 ${c.expect} · 实际 ${c.got}）`)
    console.log(r.ok ? `🎉 全部通过：${r.cases.length}/${r.cases.length}` : `❌ 失败 ${r.failed.length} 项`)
    process.exit(r.ok ? 0 : 1)
  }

  // --fast：跳过会话转录扫描（那是秒级开销），只认各工程本地留痕文件。
  // 为什么需要它：宿主硬门禁要按节拍消费"全域覆盖"结论，若每次都扫全部会话转录，
  // 会把插件拖慢到不可用（守卫是同步契约，不能被拖住）。
  const fast = argv.includes('--fast')
  const res = auditDomain({
    root: get('--root'),
    only: get('--project'),
    globalRoot: ROOT,
    skipTranscript: fast,
  })
  // 产物分两份，**禁止互相覆盖**（实测缺陷：--fast 曾把不带转录证据的弱口径结果
  // 写进权威产物，等于让高频调用静默拉低审计强度）：
  //   · scope_audit.json      权威报告（含会话转录证据，人读/结项用）
  //   · scope_audit_fast.json 高频快照（仅本地留痕，供门禁与守卫按节拍消费）
  const outPath = join(ROOT, 'ai-control', 'reports', 'state', fast ? 'scope_audit_fast.json' : 'scope_audit.json')
  try {
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, JSON.stringify(res, null, 2) + '\n', 'utf8')
  } catch { /* 写不进产物不影响判定结论 */ }

  if (argv.includes('--json')) { console.log(JSON.stringify(res, null, 2)); process.exit(res.ok ? 0 : 1) }

  console.log('🌐 全域管控覆盖审计')
  console.log(`   工作根：${res.dshRoot}`)
  for (const p of res.projects) {
    const flag = p.ok ? '✅' : '❌'
    console.log(`   ${flag} ${p.name}  ${p.passed}/${p.total}`)
    for (const [k, v] of Object.entries(p.items)) {
      console.log(`        ${v.ok ? '·' : '⛔'} ${k}：${v.detail}`)
    }
  }
  console.log(`   已接管 ${res.covered}/${res.total} · 未接管 ${res.uncovered.length} 个${res.uncovered.length ? `（${res.uncovered.join('、')}）` : ''}`)
  if (!res.ok) {
    console.error(`\n⛔ 判定不通过：存在脱管工程（允许上限 ${res.maxUncovered}）。`)
    console.error('   补课：在各工程根目录跑 `./scripts/control.sh selfcheck`，并修正 AGENTS.md 的悬空引用。')
    process.exit(1)
  }
  console.log('\n✅ 全域工程均已接管')
  process.exit(0)
}

function invokedDirectly() {
  try { return fileURLToPath(import.meta.url) === realpathSync(process.argv[1] || '') } catch { return false }
}
if (invokedDirectly()) main()
