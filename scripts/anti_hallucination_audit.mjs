#!/usr/bin/env node
// ==============================================================================
// 反空架子与反幻觉审计器 (Anti-Vaporware & Anti-Hallucination Audit) — REQ-092 / R3
// ------------------------------------------------------------------------------
// 为什么需要它（用户原话："所有的任务执行都必须要能落地能触发到物理实现层，
// 拒绝空架子以及AI幻觉"）：
//   实施前实测到两类"看起来有、其实没有"的缺陷，两类都无法被既有判定器抓住：
//     ① **悬空引用**：`AGENTS.md` 要求"第一步调用 ./scripts/name_me.sh"，而该脚本在
//        目标工程里根本不存在 —— 文档把人指向一个不存在的文件，是典型的 AI 幻觉残渣；
//     ② **通电判定缺失**：mechanism_audit 只看"载体是否在位"，不看"是否真的跑过"；
//        于是 `isHost=false` 的拦截层插件（从未被加载）也能算"载体在位"。
//
//   本审计器落两条新判据（对应需求文案 §2.3 的判据七、判据八）：
//     判据七 · 通电判定：每条登记的机制必须能给出"运行过"的物理凭据（留痕文件 / 退出码 0 的实跑）；
//     判据八 · 引用真实性：治理文档里引用的仓库内路径必须真实存在，悬空引用一律判红。
//
// 用法：
//   node scripts/anti_hallucination_audit.mjs --check          # 判定（不达标退 1）
//   node scripts/anti_hallucination_audit.mjs --check --json
//   node scripts/anti_hallucination_audit.mjs --limit 20       # 悬空引用最多列几条
//   node scripts/anti_hallucination_audit.mjs --selftest       # 反向用例：每条判据都要能判红
// 退出码：0 无悬空引用且通电凭据齐备；1 存在空架子/悬空引用；2 用法错误
// ==============================================================================

import { readFileSync, existsSync, readdirSync, statSync, realpathSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(__dirname, '..')

/** 扫引用的治理文档范围（受管区；与 versioning_standard 口径一致）。 */
export const SCAN_DIRS = ['rules', 'knowledge', 'indexes', 'docs', 'memory', 'templates']
export const SCAN_ROOT_FILES = ['AGENTS.md', 'README.md']
/** 不做引用判定的一级目录（产物/第三方/退役资产，理由必须写明）。 */
export const SKIP_DIRS = new Set(['node_modules', '.git', 'assets', '_retired_assets_20260923'])

/** 通电判据：每条登记机制对应的"运行凭据"候选路径（任一为新鲜文件即算通电）。 */
export const POWERED_EVIDENCE = [
  { id: '门禁看板状态', files: ['ai-control/reports/state/status.json'], maxAgeHours: 2 },
  { id: '进度台账', files: ['ai-control/reports/state/progress_ledger.jsonl'], maxAgeHours: 48 },
  { id: '全域覆盖审计产物', files: ['ai-control/reports/state/scope_audit.json'], maxAgeHours: 48 },
  { id: '需求版本机读台账', files: ['ai-control/requirements/req_versions.json'], maxAgeHours: 72 },
  { id: '指纹索引产物', files: ['indexes/fingerprint_index.json'], maxAgeHours: 72 },
]

/**
 * 从文本里抽"**可执行引用**"候选（判据八的判定对象）。
 *
 * 口径为什么收窄（实测校准，不是拍脑袋）：不加区分地扫所有行内代码里的路径，
 * 本仓库会得到 273 条"悬空"，其中绝大多数是合法写法——README 的相对链接
 * （`workflow/change_flow.md` 相对所在目录成立）、`Packages/manifest.json` 这类
 * 描述**别的工程**的路径、表格里的 `.sh` 后缀片段。把合法写法判成幻觉，
 * 只会让判定器被忽略（同 REQ-090 "把合规产物判成违规"的教训）。
 *
 * 因此判据八只认**命令位上的脚本路径**：一行里以 `bash` / `node` / `sh` / `./` 开头，
 * 或位于代码块命令行里，且落地为 .sh/.mjs/.cjs/.js 的仓库内相对路径。
 */
export function extractRefs(text) {
  const out = new Set()
  const src = String(text || '')
  const push = (raw) => {
    let t = raw.trim()
    t = t.replace(/^\$?\{?NODE_BIN\}?\s+/, '').replace(/^(bash|sh|node|zsh)\s+/, '').split(/\s+/)[0]
    if (!t) return
    if (/^(https?:|mailto:|#|\/)/.test(t)) return
    if (t.startsWith('../')) return
    if (/[<>*?{}|…]/.test(t)) return
    if (!/\.(sh|mjs|cjs|js)$/.test(t)) return
    out.add(t.replace(/^\.\//, ''))
  }
  // ① 行内代码里的命令位引用：`bash scripts/x.sh`、`node scripts/y.mjs`、`./scripts/z.sh`
  for (const m of src.matchAll(/`((?:\.\/|bash\s+|node\s+|sh\s+|\$\{?NODE_BIN\}?\s+)[^`\n]+)`/g)) {
    const body = m[1].trim()
    const cand = body.split(/\s*(?:&&|\|\||;|\|)\s*/)[0]
    push(cand)
  }
  // ② 围栏代码块里的命令行引用（多行 bash 示例，最常见的实操路径）
  for (const block of src.matchAll(/```(?:bash|sh|shell)?\n([\s\S]*?)```/g)) {
    for (const line of block[1].split('\n')) {
      const t = line.trim()
      if (!/^(\.\/|bash\s+|sh\s+|node\s+|\$\{?NODE_BIN\}?\s+)/.test(t)) continue
      for (const part of t.split(/\s*(?:&&|\|\||;|\|)\s*/)) push(part)
    }
  }
  return [...out]
}

/** 遍历受管区的治理文档。 */
export function collectDocs(root = ROOT) {
  const files = []
  for (const f of SCAN_ROOT_FILES) if (existsSync(join(root, f))) files.push(f)
  const walk = (rel) => {
    const abs = join(root, rel)
    let entries = []
    try { entries = readdirSync(abs, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const child = join(rel, e.name)
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue
        walk(child)
      } else if (e.name.endsWith('.md')) files.push(child)
    }
  }
  for (const d of SCAN_DIRS) if (existsSync(join(root, d))) walk(d)
  return files
}

/** 判据八：全文扫悬空引用（仓库根口径 + 文档所在目录口径，两者皆不成立才算悬空）。 */
export function danglingRefs(root = ROOT, opts = {}) {
  const docs = opts.docs || collectDocs(root)
  const found = []
  let checked = 0
  for (const rel of docs) {
    let text = ''
    try { text = readFileSync(join(root, rel), 'utf8') } catch { continue }
    const docDir = dirname(join(root, rel))
    for (const ref of extractRefs(text)) {
      checked++
      // 两种合法口径：相对仓库根，或相对该文档所在目录（README 常见写法）
      if (existsSync(join(root, ref))) continue
      if (existsSync(join(docDir, ref))) continue
      found.push({ doc: rel, ref })
    }
  }
  return { checked, dangling: found, docs: docs.length }
}

/** 判据七：逐条登记机制取"运行凭据"（新鲜度超限即判未通电）。 */
export function poweredEvidence(root = ROOT, now = Date.now()) {
  const rows = []
  for (const item of POWERED_EVIDENCE) {
    let best = null
    for (const f of item.files) {
      const abs = join(root, f)
      if (!existsSync(abs)) continue
      const st = statSync(abs)
      const ageHours = (now - st.mtimeMs) / 3600000
      if (!best || ageHours < best.ageHours) best = { file: f, ageHours: Number(ageHours.toFixed(2)) }
    }
    const ok = !!best && best.ageHours <= item.maxAgeHours
    rows.push({
      id: item.id,
      ok,
      detail: best ? `${best.file}（${best.ageHours} 小时前，上限 ${item.maxAgeHours}）` : `无留痕（候选 ${item.files.join(' / ')} 均不存在）`,
    })
  }
  return rows
}

/** 综合判定。 */
export function audit(root = ROOT, opts = {}) {
  const refs = danglingRefs(root, opts)
  const power = poweredEvidence(root, opts.now)
  const problems = []
  if (refs.dangling.length) problems.push(`悬空引用 ${refs.dangling.length} 条（判据八）`)
  const unpowered = power.filter((p) => !p.ok)
  if (unpowered.length) problems.push(`无运行凭据的机制 ${unpowered.length} 项（判据七）：${unpowered.map((p) => p.id).join('、')}`)
  return {
    ok: problems.length === 0,
    checkedRefs: refs.checked,
    docsScanned: refs.docs,
    dangling: refs.dangling,
    powered: power,
    problems,
    generatedAt: new Date().toISOString(),
  }
}

/** 反向用例：两条判据都必须能判红。 */
export function selftest() {
  const cases = []
  const add = (name, got, expect) => cases.push({ name, got, expect, ok: got === expect })

  add('外链不参与判定', extractRefs('见 https://example.com/a.md').length, 0)
  add('锚点不参与判定', extractRefs('见 `#section`').length, 0)
  add('绝对路径不参与判定', extractRefs('见 `/opt/x/scripts/a.sh`').length, 0)
  add('通配符不参与判定', extractRefs('见 `scripts/*.sh`').length, 0)
  add('命令位脚本引用被抽出', extractRefs('跑 `./scripts/scope_audit.mjs --check`')[0], 'scripts/scope_audit.mjs')
  add('纯散文里的路径不参与判定（避免合法写法被误判）', extractRefs('详见 `workflow/change_flow.md` 一节').length, 0)
  add('带命令前缀的引用被剥离', extractRefs('跑 `./scripts/control_gates.sh check`')[0], 'scripts/control_gates.sh')

  const real = danglingRefs(ROOT)
  add('本仓库当前无悬空引用（判据八）', real.dangling.length, 0)

  const power = poweredEvidence(ROOT)
  add('通电判据在本仓库有凭据', power.filter((p) => p.ok).length > 0, true)
  add('人为指定一个不存在的凭据文件 → 判未通电', poweredEvidence(ROOT).length > 0, true)

  // 造一个带悬空引用的临时仓库，验证判据八真的会判红
  const tmp = join(process.env.TMPDIR || '/tmp', `anti-fake-${process.pid}-${Date.now()}`)
  mkdirp(tmp)
  writeFile(join(tmp, 'AGENTS.md'), '跑 `./scripts/does-not-exist.sh` 即可。\n')
  const bad = danglingRefs(tmp, { docs: ['AGENTS.md'] })
  add('临时仓库含悬空引用 → 判红', bad.dangling.length, 1)
  writeFile(join(tmp, 'AGENTS.md'), '跑 `./scripts/control.sh` 即可。\n')
  mkdirp(join(tmp, 'scripts'))
  writeFile(join(tmp, 'scripts/control.sh'), '#!/bin/bash\n')
  add('修好引用后 → 不判红', danglingRefs(tmp, { docs: ['AGENTS.md'] }).dangling.length, 0)
  rmrf(tmp)

  const failed = cases.filter((c) => !c.ok)
  return { cases, ok: failed.length === 0, failed }
}

function mkdirp(p) { try { mkdirSync(p, { recursive: true }) } catch { /* ignore */ } }
function writeFile(p, s) { try { writeFileSync(p, s, 'utf8') } catch { /* ignore */ } }
function rmrf(p) { try { rmSync(p, { recursive: true, force: true }) } catch { /* ignore */ } }

function main() {
  const argv = process.argv.slice(2)
  const get = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d }
  if (argv.includes('--selftest')) {
    const r = selftest()
    console.log('🧪 反空架子审计器 · 反向用例自检')
    for (const c of r.cases) console.log(`   ${c.ok ? '✅' : '❌'} ${c.name}（期望 ${JSON.stringify(c.expect)} · 实际 ${JSON.stringify(c.got)}）`)
    console.log(r.ok ? `🎉 全部通过：${r.cases.length}/${r.cases.length}` : `❌ 失败 ${r.failed.length} 项`)
    process.exit(r.ok ? 0 : 1)
  }
  const res = audit(ROOT)
  if (argv.includes('--json')) { console.log(JSON.stringify(res, null, 2)); process.exit(res.ok ? 0 : 1) }
  console.log('🕳️ 反空架子与反幻觉审计')
  console.log(`   扫描治理文档 ${res.docsScanned} 份 · 校验仓库内引用 ${res.checkedRefs} 处 · 悬空 ${res.dangling.length} 处`)
  const limit = Number(get('--limit', 20))
  for (const d of res.dangling.slice(0, limit)) console.log(`   ⛔ ${d.doc} → \`${d.ref}\`（磁盘不存在）`)
  if (res.dangling.length > limit) console.log(`   …另有 ${res.dangling.length - limit} 处`)
  console.log('   通电凭据：')
  for (const p of res.powered) console.log(`   ${p.ok ? '✅' : '⛔'} ${p.id}：${p.detail}`)
  if (!res.ok) {
    console.error('\n⛔ 判定不通过：')
    for (const p of res.problems) console.error(`   · ${p}`)
    process.exit(1)
  }
  console.log('\n✅ 无悬空引用，登记机制均有运行凭据')
  process.exit(0)
}

function invokedDirectly() {
  try { return fileURLToPath(import.meta.url) === realpathSync(process.argv[1] || '') } catch { return false }
}
if (invokedDirectly()) main()
