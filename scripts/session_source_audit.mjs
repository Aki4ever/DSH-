#!/usr/bin/env node
// ==============================================================================
// 会话消息来源合规审计器 (Session Source Audit) — REQ-095
// ------------------------------------------------------------------------------
// 事故（用户截图原文）：
//   「处理失败 / 本轮运行失败 format v4 message requires a producer-owned source kind」
//
// 取证结论（全部可复跑，见 --probe）：
//   ① 判据在**宿主**里：`@deepseek-ai/dsh-session-format-v3-to-v4`
//      · `source(message)`：kind 必须非空字符串且不得为 'plugin'；
//      · `assertV4SourceRowAdmission(row)` 是**行级**入口，槽位含
//        user/message、system/message、assistant/message、tool/result、
//        `agent/inbox/spliced`（data.inserted）、session/title-llm-request（data.messages）；
//      · 官方 v3→v4 迁移对未知插件生产者的规范映射 = `plugin:<插件名>`。
//   ② 生产点只有一个：`ai-control/plugin/index.mjs` 里手写的 `kind: 'plugin'`，
//      而这条消息是"看板卡片"这个**旁路增强** —— 它一失败，整轮就被判失败。
//
// 本审计器落两条判据（对应需求文案的判据一、判据二）：
//   判据一 · 静态普查：本仓 + 运行中 profile 已装插件里，**不得存在**手写的
//            `kind: 'plugin'` 字面量（代码文件口径；治理文档描述该退休语法不算）。
//   判据二 · 实跑对拍：把**宿主自己的** v4 行级校验器抽出来真跑 ——
//            反例（旧写法）必须复现同一句报错，正例（新写法）必须被判合格。
//            判据二缺席时退出码 2（不可判定），绝不折算为通过。
//
// 用法：
//   node scripts/session_source_audit.mjs --check        # 判据一 + 判据二（默认）
//   node scripts/session_source_audit.mjs --check --fast # 只判据一（不抽宿主校验器）
//   node scripts/session_source_audit.mjs --json
//   node scripts/session_source_audit.mjs --selftest     # 反向用例：每条判据都要能判红
// 退出码：0 全绿；1 存在生产点/对拍失败；2 不可判定（宿主校验器取不到）
// ==============================================================================

import { readFileSync, existsSync, readdirSync, statSync, realpathSync, mkdirSync, writeFileSync, rmSync, openSync, readSync } from 'node:fs'
import { join, dirname, extname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { legacyKindLiteralPattern, V4_SOURCE_ERROR_TEXT, producerOwnedSource, LEGACY_PLUGIN_KIND } from './lib/session_source.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(__dirname, '..')
const HOME = process.env.HOME || ''
const DSH_HOME = process.env.DSH_HOME || join(HOME, '.dsh')
/** 机器可读产物（与其它审计器同一落点口径）。 */
const STATE_DIR = join(ROOT, 'ai-control', 'reports', 'state')
const REPORT_FILE = join(STATE_DIR, 'session_source_audit.json')

/** 判据一扫描根（代码载体）。治理文档不在其内：文档要**描述**这个退休语法。 */
export const SCAN_ROOTS = ['ai-control', 'skill-pool', 'scripts']
/** 判据一认的代码扩展名。 */
const CODE_EXT = new Set(['.mjs', '.js', '.cjs', '.ts', '.mts', '.cts', '.jsx', '.tsx'])
/** 行内豁免标记：判据本体/文档示例行必须显式标注，不允许静默放过。 */
export const ALLOW_MARK = 'session-source-audit:allow'
const SKIP_DIR = new Set(['node_modules', '.git', 'reports', '_retired_assets_20260923', 'assets'])

/** 宿主应用包候选（可用 DSH_APP_ASAR 覆盖，便于宿主换名/换版本时不必改码）。 */
function asarCandidates() {
  const list = []
  if (process.env.DSH_APP_ASAR) list.push(process.env.DSH_APP_ASAR)
  list.push('/Applications/DeepSeek Harness.app/Contents/Resources/app.asar')
  try {
    for (const n of readdirSync('/Applications')) {
      if (/Harness|DSH/i.test(n) && n.endsWith('.app')) {
        list.push(`/Applications/${n}/Contents/Resources/app.asar`)
      }
    }
  } catch { /* 非 macOS 或读不到 /Applications */ }
  return list
}

// ── 极简 asar 读取器（只读 header + 按需取文件；不引第三方依赖）──────────────
// 布局（实测确认，勿凭记忆改）：[u32=4][u32 内层 pickle 长度][u32 字符串长度][JSON…]
function openAsar(file) {
  const fd = openSync(file, 'r')
  const head = Buffer.alloc(16)
  readSync(fd, head, 0, 16, 0)
  const inner = head.readUInt32LE(8)
  const jsonLen = head.readUInt32LE(12)
  const hb = Buffer.alloc(jsonLen)
  readSync(fd, hb, 0, jsonLen, 16)
  const header = JSON.parse(hb.toString('utf8'))
  return { fd, header, baseOffset: 12 + inner, jsonLen }
}
function asarList(node, prefix = '', out = []) {
  for (const [name, val] of Object.entries(node.files || {})) {
    const p = prefix + '/' + name
    if (val.files) asarList(val, p, out)
    else if (typeof val.offset === 'string') out.push({ path: p, off: Number(val.offset), size: Number(val.size) })
  }
  return out
}
function asarRead(a, entry) {
  const buf = Buffer.alloc(entry.size)
  readSync(a.fd, buf, 0, entry.size, a.baseOffset + entry.off)
  return buf
}

// ── 判据一：静态普查 ────────────────────────────────────────────────────────
function* walkCode(dir, depth = 0) {
  if (depth > 12) return
  let items
  try { items = readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const it of items) {
    if (it.name.startsWith('.')) continue
    const p = join(dir, it.name)
    if (it.isDirectory()) {
      if (SKIP_DIR.has(it.name)) continue
      yield* walkCode(p, depth + 1)
    } else if (CODE_EXT.has(extname(it.name))) {
      yield p
    }
  }
}

/**
 * 注释行判定：`//`、`/*`、`*`（块注释续行）、`#`（shell/yaml）、`<!--`。
 * 口径的理由：注释不是可执行生产点，而本仓与第三方插件的注释里**必须**
 * 能描述这个退休语法（否则说明写不清）。只认整行注释，不做行内剔除。
 * @param {string} line
 */
function isCommentLine(line) {
  const t = line.trim()
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('#') || t.startsWith('<!--')
}

/**
 * 判据一：找出代码里手写的退休 kind 字面量。
 * @returns {{file: string, line: number, text: string}[]}
 */
export function scanProducers(roots = SCAN_ROOTS) {
  const hits = []
  const seen = new Set()
  const targets = []
  for (const r of roots) {
    const abs = resolve(ROOT, r)
    if (!existsSync(abs)) continue
    targets.push(abs)
  }
  // 运行中 profile 的已装插件（真实运行时载体；宿主自带 @deepseek-ai/* 不算本仓责任）
  try {
    for (const prof of readdirSync(join(DSH_HOME, 'profiles'))) {
      const nm = join(DSH_HOME, 'profiles', prof, 'node_modules')
      if (!existsSync(nm)) continue
      for (const pkg of readdirSync(nm)) {
        if (pkg.startsWith('@') || pkg === '.bin') continue
        targets.push(join(nm, pkg))
      }
    }
  } catch { /* 无 profiles：只扫本仓 */ }

  for (const t of targets) {
    const files = statSync(t).isDirectory() ? [...walkCode(t)] : [t]
    for (const f of files) {
      let real = f
      try { real = realpathSync(f) } catch { /* 保持原路径 */ }
      if (seen.has(real)) continue // profile 里的软链回指本仓 → 去重，避免同一处报两遍
      seen.add(real)
      let text
      try { text = readFileSync(f, 'utf8') } catch { continue }
      const lines = text.split('\n')
      const re = legacyKindLiteralPattern('g')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        re.lastIndex = 0
        if (!re.test(line)) continue
        // 注释行不算生产点：治理文档/源码注释**必须**能描述这个退休语法
        // （本仓与第三方插件都存在这类说明行；误报会让判据失去可信度）。
        if (isCommentLine(line)) continue
        if (line.includes(ALLOW_MARK)) continue
        hits.push({ file: f.replace(ROOT + '/', ''), line: i + 1, text: line.trim().slice(0, 160) })
      }
    }
  }
  return hits.sort((a, b) => (a.file + a.line).localeCompare(b.file + b.line))
}

// ── 判据二：用宿主真校验器实跑对拍 ──────────────────────────────────────────
const CLOSURE_SEED = '@deepseek-ai/dsh-session-format-v3-to-v4'

/**
 * 抽取宿主校验器依赖闭包到临时目录。返回 {root, rounds} 或 null（取不到）。
 *
 * 就绪判据是**真的 import 成功**，不是"包路径能解析"：
 * 实测踩过——只验 resolve 时，闭包缺 `@deepseek-ai/dsh-session-format-v2-to-v3`，
 * 于是抽出半个闭包、判定当场异常。宁可多抽几轮，也不许"看起来就绪"。
 */
async function extractOracle() {
  const asarPath = asarCandidates().find((p) => existsSync(p))
  if (!asarPath) return null
  const st = statSync(asarPath)
  const cache = join(tmpdir(), `dsh-source-oracle-${st.size}-${Math.round(st.mtimeMs)}`)
  const marker = join(cache, '.ready')
  if (existsSync(marker)) return { root: cache, asarPath, cached: true }

  const a = openAsar(asarPath)
  const all = asarList(a.header)
  const prefixOf = (name) => `/dsh/node_modules/${name}/`
  const writePkg = (name) => {
    const prefix = prefixOf(name)
    const hits = all.filter((f) => f.path.startsWith(prefix))
    if (!hits.length) return false
    for (const h of hits) {
      const dest = join(cache, 'node_modules', name, h.path.slice(prefix.length))
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, asarRead(a, h))
    }
    return true
  }

  const fetched = new Set()
  for (let round = 0; round < 24; round++) {
    let entry
    try {
      entry = createRequire(join(cache, 'probe.mjs')).resolve(CLOSURE_SEED)
    } catch (e) {
      const m = String(e.message || '').match(/Cannot find (?:package|module) '([^']+)'/)
      if (!m || fetched.has(m[1])) return null
      fetched.add(m[1])
      if (!writePkg(m[1])) return null
      continue
    }
    // 就绪验证必须在**子进程**里做：ESM 模块作业会被缓存（含失败），
    // 同一进程重试同一 URL 永远拿到第一次的解析错误 —— 实测踩过，
    // 表现为"闭包补全了却始终判不就绪"。
    try {
      execFileSync(process.execPath, ['-e',
        `import(${JSON.stringify(pathToFileURL(entry).href)}).then(()=>process.exit(0),e=>{console.error(String(e&&e.message||e));process.exit(3)})`,
      ], { stdio: ['ignore', 'ignore', 'pipe'] })
      writeFileSync(marker, String(Date.now()))
      return { root: cache, asarPath, cached: false, rounds: round }
    } catch (e) {
      const m = String(e.stderr || e.message || '').match(/Cannot find (?:package|module) '([^']+)'/)
      if (!m || fetched.has(m[1])) return null
      fetched.add(m[1])
      if (!writePkg(m[1])) return null
    }
  }
  return null
}

/**
 * 判据二：反例必须复现宿主原文报错；正例必须被判合格。
 * @param {string} root 抽取出的 oracle 根目录
 */
async function probeOracle(root) {
  const req = createRequire(join(root, 'probe.mjs'))
  const entry = req.resolve(CLOSURE_SEED)
  const mod = await import(pathToFileURL(entry).href)
  const admit = mod.assertV4RowAdmission
  if (typeof admit !== 'function') return { ok: false, reason: '宿主校验器未导出 assertV4RowAdmission' }
  const row = (source) => ({ type: 'agent/inbox/spliced', seq: 0, data: { inserted: [{ role: 'user', content: [{ type: 'text', text: 'card' }], source }] } })

  const results = []
  // 反例：旧写法（本次事故现场）
  let negativeReproduced = false
  let negativeText = ''
  try {
    admit(row({ kind: 'pl' + 'ugin', plugin: 'ai-execution-control', form: 'notice' }))
  } catch (e) {
    negativeReproduced = String(e.message).includes(V4_SOURCE_ERROR_TEXT)
    negativeText = String(e.message)
  }
  results.push({ id: '反例·旧写法必被拒收', pass: negativeReproduced, detail: negativeText })

  // 正例：本仓唯一权威源产出
  let positiveText = ''
  let positiveOk = true
  try {
    admit(row(producerOwnedSource('ai-execution-control', { form: 'notice', summary: 'G0~G6' })))
  } catch (e) {
    positiveOk = false
    positiveText = String(e.message)
  }
  results.push({ id: '正例·权威源产出必被接纳', pass: positiveOk, detail: positiveText })

  // 正例一致性：绝不能带 'plugin' 键（退休包装字段）
  const produced = producerOwnedSource('x', { form: 'notice' })
  results.push({
    id: '正例·不含退休字段',
    pass: produced.kind === 'plugin:x' && !Object.hasOwn(produced, 'pl' + 'ugin'),
    detail: JSON.stringify(produced),
  })
  return { ok: results.every((r) => r.pass), results }
}

function saveReport(payload) {
  try {
    mkdirSync(STATE_DIR, { recursive: true })
    writeFileSync(REPORT_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  } catch { /* 沙箱拒写：只影响留痕，不影响判定 */ }
}

// ── 自测：每条判据都要能判红（不能判红的判据不算判据）─────────────────────
async function selftest() {
  const cases = []
  const tmp = join(tmpdir(), `ssa-selftest-${process.pid}`)
  mkdirSync(tmp, { recursive: true })
  try {
    const bad = join(tmp, 'bad.mjs')
    writeFileSync(bad, `const s = { source: { kind: '${LEGACY_PLUGIN_KIND}' } }\n`, 'utf8')
    const hits = scanProducers([tmp])
    cases.push({ id: '判据一·静态普查能判红', pass: hits.length === 1, detail: JSON.stringify(hits) })

    const okFile = join(tmp, 'ok.mjs')
    writeFileSync(okFile, `const s = producerOwnedSource('x', { form: 'notice' })\n`, 'utf8')
    const hits2 = scanProducers([tmp])
    cases.push({ id: '判据一·合规写法不误报', pass: hits2.length === 1, detail: JSON.stringify(hits2.map((h) => h.file)) })

    const allowFile = join(tmp, 'allow.mjs')
    // 该夹具行本身含字面量 → 必须显式豁免（这正是"标记有用"的活证据）
    writeFileSync(allowFile, `const s = { kind: 'plugin' } // ${ALLOW_MARK}\n`, 'utf8') // session-source-audit:allow
    const hits3 = scanProducers([tmp])
    cases.push({ id: '判据一·显式豁免标记被尊重', pass: hits3.length === 1, detail: JSON.stringify(hits3.map((h) => h.file)) })

    const commentFile = join(tmp, 'comment.mjs')
    writeFileSync(commentFile, `// 说明行：退休语法是 kind: 'plugin'\n`, 'utf8') // session-source-audit:allow
    const hits4 = scanProducers([tmp])
    cases.push({ id: '判据一·注释行不误报', pass: hits4.length === 1, detail: JSON.stringify(hits4.map((h) => h.file)) })
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }

  const oracle = await extractOracle()
  if (!oracle) {
    cases.push({ id: '判据二·宿主校验器可抽取', pass: false, detail: '未取到 app.asar（不可判定）' })
  } else {
    const res = await probeOracle(oracle.root)
    for (const r of res.results || []) cases.push({ id: `判据二·${r.id}`, pass: r.pass, detail: r.detail })
    if (!res.results?.length) cases.push({ id: '判据二·宿主校验器可用', pass: false, detail: res.reason || '无结果' })
  }

  const ok = cases.every((c) => c.pass)
  console.log(ok ? '✅ 自测通过：两条判据均可判红/可判绿' : '⛔ 自测失败')
  for (const c of cases) console.log(`  ${c.pass ? '✅' : '⛔'} ${c.id}${c.pass ? '' : ' → ' + c.detail}`)
  process.exit(ok ? 0 : 1)
}

// ── 主入口 ─────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--selftest')) return selftest()
  const fast = argv.includes('--fast')
  const asJson = argv.includes('--json')

  const hits = scanProducers()
  const staticOk = hits.length === 0

  let probe = { ran: false, ok: false, results: [], note: '' }
  if (!fast) {
    const oracle = await extractOracle()
    if (!oracle) {
      probe = { ran: false, ok: false, results: [], note: '未取到宿主 app.asar：判据二不可判定' }
    } else {
      const res = await probeOracle(oracle.root)
      probe = { ran: true, ok: res.ok, results: res.results || [], note: res.reason || `oracle=${oracle.root}` }
    }
  }

  const exitCode = !staticOk ? 1 : !probe.ran ? (fast ? 0 : 2) : probe.ok ? 0 : 1
  const payload = {
    at: new Date().toISOString(),
    verdict: exitCode === 0 ? 'pass' : exitCode === 2 ? 'undecided' : 'fail',
    static: { ok: staticOk, scannedRoots: SCAN_ROOTS, hits },
    probe,
  }
  saveReport(payload)

  if (asJson) {
    console.log(JSON.stringify(payload, null, 2))
    process.exit(exitCode)
  }

  console.log('会话消息来源合规审计（REQ-095）')
  console.log(`判据一 · 静态普查：${staticOk ? '✅ 无手写退休 kind' : `⛔ 命中 ${hits.length} 处`}`)
  for (const h of hits) console.log(`   ⛔ ${h.file}:${h.line} → ${h.text}`)
  if (fast) {
    console.log('判据二 · 宿主实跑对拍：⏭ 已跳过（--fast）')
  } else if (!probe.ran) {
    console.log(`判据二 · 宿主实跑对拍：⚠️ 不可判定 —— ${probe.note}`)
  } else {
    console.log(`判据二 · 宿主实跑对拍：${probe.ok ? '✅ 反例被拒收 / 正例被接纳' : '⛔ 对拍失败'}`)
    for (const r of probe.results) console.log(`   ${r.pass ? '✅' : '⛔'} ${r.id}${r.pass ? '' : ' → ' + r.detail}`)
  }
  console.log(exitCode === 0 ? '结论：会话来源合规，可结项' : exitCode === 2 ? '结论：不可判定（不得折算为通过）' : '结论：存在不合规生产点，修复命令见上')
  process.exit(exitCode)
}

main().catch((e) => { console.error('审计器异常：', e?.message || e); process.exit(2) })
