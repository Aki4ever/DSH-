#!/usr/bin/env node
// ==============================================================================
// 需求版本贯通判定器 (Requirement Version Consistency Audit) — REQ-092 / R2-d
// ------------------------------------------------------------------------------
// 为什么需要它（用户原话："输出结构新增一项:需求版本号;每次更新都必须同步到需求文档
// 并同时实施,且产品和需求都必须记录版本"）：
//   需求版本号如果只写在回复里，就是一句自我宣称；如果只写在台账里，又证明不了
//   "实施载体真的对得上这一版需求"。本判定器把四处**对拍**起来，任一处对不上就判红：
//
//     ① 需求文案   docs/constraint_mechanism_optimize_9.md 的「需求版本号」
//     ② 需求台账   docs/requirements.md 该条目的「需求版本」/「实施版本」
//     ③ 实施载体   ai-control/requirements/req_versions.json 里声明的承载文件必须真实存在
//     ④ 回复回执   最近一轮回复里披露的需求版本号（--receipt 传入，或读宿主会话转录）
//
// 用法：
//   node scripts/req_version_audit.mjs --check                 # 判定本工程（含四处对拍）
//   node scripts/req_version_audit.mjs --check --req REQ-092   # 只判某一条
//   node scripts/req_version_audit.mjs --check --receipt /tmp/reply.md
//   node scripts/req_version_audit.mjs --selftest              # 反向用例：改坏必须判红
//   node scripts/req_version_audit.mjs --json
// 退出码：0 四处一致；1 存在不一致；2 用法错误
// ==============================================================================

import { readFileSync, existsSync, realpathSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildLedger, OUT_JSON, ROOT as GEN_ROOT } from './req_version_gen.mjs'
import { ledgerVersionSync } from './align_version.mjs'
import { readTranscriptEvents } from './lib/session_transcript.mjs'

export const ROOT = GEN_ROOT

/** 从任意文本里取「需求版本号」。允许 `**需求版本号**：v1.0.0` 与 `需求版本 v1.0.0` 两种写法。 */
export function pickRequirementVersion(text) {
  if (!text) return null
  // 注意 lazy 量词的坑（实测缺陷）：`[^\n]{0,12}?` 会先吃掉版本号自己的 `v`，
  // 于是「🏷️ 需求版本：REQ-092 · v1.0.0」被判成"未披露版本号"（自检当时的用例恰好没暴露它）。
  // 修法：字符类里排除 `v`，让版本号只能从真正的 vX.Y.Z 处开始匹配。
  const re = /需求版本(?:号)?[^\n]{0,16}?[：:][^\n]{0,16}?(v\d+\.\d+\.\d+)/
  const m = String(text).match(re)
  return m ? m[1] : null
}

/** 需求文案文件里声明的需求版本号（唯一权威出处：需求文案头部）。 */
export function specRequirementVersion(reqId) {
  const n = String(reqId || '').replace(/^REQ-/, '')
  const candidates = [
    join(ROOT, 'docs', `constraint_mechanism_optimize_${Number(n) - 83}.md`),
  ]
  // 文案文件名与需求编号之间没有严格公式，改为在 docs/ 下按「登记为 REQ-xxx」反查
  const hits = []
  const dir = join(ROOT, 'docs')
  if (existsSync(dir)) {
    for (const f of readdirSafe(dir)) {
      if (!f.startsWith('constraint_mechanism_optimize_') || !f.endsWith('.md')) continue
      const text = readFileSync(join(dir, f), 'utf8')
      if (text.includes(`登记为 \`${reqId}\``) || text.includes(`登记为 ${reqId}`)) hits.push({ file: join(dir, f), text })
    }
  }
  for (const c of candidates) {
    if (existsSync(c)) {
      const text = readFileSync(c, 'utf8')
      if (!hits.some((h) => h.file === c)) hits.push({ file: c, text })
    }
  }
  const hit = hits.find((h) => pickRequirementVersion(h.text))
  return {
    file: hit ? hit.file.replace(ROOT + '/', '') : null,
    version: hit ? pickRequirementVersion(hit.text) : null,
    expectedHeader: reqId === 'REQ-092' ? specHeaderExpectation() : null,
  }
}

/** 需求文案头部「当前系统实施总版本」口径（用于与主台账对拍）。 */
export function specHeaderExpectation() {
  const p = join(ROOT, 'docs', 'constraint_mechanism_optimize_9.md')
  if (!existsSync(p)) return null
  const t = readFileSync(p, 'utf8')
  const m = t.match(/当前系统实施总版本[^\n]*?`(v\d+\.\d+\.\d+)`/)
  return m ? m[1] : null
}

function readdirSafe(d) {
  try {
    return readdirSync(d)
  } catch {
    return []
  }
}

/** 条目在台账里的「需求版本」与状态字（用于对拍与"未完成豁免"判定）。 */
export function entryFacts(ledgerText, reqId) {
  const lines = String(ledgerText || '').split('\n')
  let start = -1
  let end = lines.length
  for (let i = 0; i < lines.length; i++) {
    if (new RegExp(`^###\\s+${reqId}\\s*[:：]`).test(lines[i])) { start = i; continue }
    if (start >= 0 && i > start && /^###\s+REQ-\d+/.test(lines[i])) { end = i; break }
  }
  if (start < 0) return null
  const block = lines.slice(start, end).join('\n')
  const rv = pickRequirementVersion(block)
  const status = (block.match(/-\s+\*\*当前状态\*\*[：:]\s*(.+)/) || [])[1] || ''
  const impl = (block.match(/-\s+\*\*实施版本\*\*[：:]\s*`?([^`（(\s]+)/) || [])[1] || null
  return { reqId, requirementVersion: rv, status: status.trim(), implementationVersion: impl }
}

/** 从宿主会话转录里取本会话最近一条 assistant 回复正文（用于④对拍）。 */
function latestAssistantText(sessionId) {
  if (!sessionId) return { text: null, path: null }
  const { events, path } = readTranscriptEvents(sessionId)
  let last = null
  for (const ev of events) {
    const t = ev?.type || ''
    if (!/assistant/.test(t)) continue
    const text = ev?.data?.text || ev?.data?.content || ev?.text
    if (typeof text === 'string' && text.trim()) last = text
  }
  return { text: last, path }
}

/** 主判定：四处对拍。返回结构化结论（不打印，便于自检复用）。 */
export function audit({ reqId = 'REQ-092', receiptText = null, sessionId = process.env.DSH_SESSION_ID, requireReceipt = false } = {}) {
  const problems = []
  const facts = {}

  // ② 需求台账
  const ledgerPath = join(ROOT, 'docs', 'requirements.md')
  const ledgerText = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8') : ''
  const entry = entryFacts(ledgerText, reqId)
  facts.ledger = entry
  if (!entry) problems.push(`需求台账里找不到条目 ${reqId}`)
  if (entry && !entry.requirementVersion) problems.push(`${reqId} 台账条目缺少「需求版本」字段`)

  // ① 需求文案
  const spec = specRequirementVersion(reqId)
  facts.spec = spec
  if (!spec.file) problems.push(`找不到登记 ${reqId} 的需求文案文件`)
  else if (!spec.version) problems.push(`需求文案 ${spec.file} 头部缺少「需求版本号」`)

  // ① ↔ ② 对拍
  if (entry?.requirementVersion && spec.version && entry.requirementVersion !== spec.version) {
    problems.push(`需求文案需求版本 ${spec.version} ≠ 台账需求版本 ${entry.requirementVersion}`)
  }

  // ③ 实施载体（机读台账声明的承载文件必须真实存在，除了"尚未完成"的需求）
  let machine = { entries: {} }
  try { machine = JSON.parse(readFileSync(OUT_JSON, 'utf8')) } catch { problems.push('机读台账 req_versions.json 读不到或不是合法 JSON') }
  const me = machine.entries?.[reqId]
  facts.carrier = me ? { files: me.files?.length || 0, missing: me.missing_files || [] } : null
  if (!me) problems.push(`机读台账缺少条目 ${reqId}（请运行 node scripts/req_version_gen.mjs）`)
  const unfinished = /EVOLVING|待拍板|规划/.test(entry?.status || '')
  if (me && me.missing_files?.length && !unfinished) {
    problems.push(`${reqId} 声明但磁盘不存在的文件 ${me.missing_files.length} 个：${me.missing_files.slice(0, 3).join(' ')}`)
  }

  // ② 实施版本不得超发：不得高于系统总版本 + 1 个次版本（避免"先记版本后实施"）
  const sys = ledgerVersionSync(ROOT)
  facts.systemVersion = sys
  if (entry?.implementationVersion && sys) {
    const gun = (v) => String(v).replace(/^v/, '').split('.').map(Number)
    const [a1, b1] = gun(entry.implementationVersion)
    const [a2, b2] = gun(sys)
    if (a1 > a2 || (a1 === a2 && b1 > b2 + 1)) {
      problems.push(`${reqId} 实施版本 ${entry.implementationVersion} 超前于系统总版本 ${sys} 超过一个次版本`)
    }
  }

  // ④ 回复回执对拍
  let receipt = receiptText
  let receiptSource = '参数'
  if (!receipt) {
    const lt = latestAssistantText(sessionId)
    receipt = lt.text
    receiptSource = lt.path || '（未取到转录）'
  }
  const receiptVersion = pickRequirementVersion(receipt)
  facts.receipt = { source: receiptSource, version: receiptVersion, checked: false, note: '' }
  // ④ 何时参与判定（设计取舍，写清楚避免"看起来判了、其实没判"）：
  //    · **显式传入**回执（--receipt）→ 必须判：未披露判红、版本对不上判红；
  //    · 未传、或会话转录里还没有含版本号的回复 → 本项**不计入判定**，
  //      但显式降级为 note 并在输出里打印。
  //   为什么不把"会话最后一轮没披露版本号"当硬红：G5 累积门禁会跑本判定器，
  //   而"本轮回复"在跑判定时尚未产生 —— 拿上一轮回复去否掉这一轮的放行，
  //   会把门禁变成"永远红一次"的噪声源（同 REQ-090 "陈旧快照永久钉红"的教训）。
  //   回执格式本身由 output_audit 的 OUT_RECEIPT_FIELDS 硬判据守住（缺字段即判红）。
  if (receipt && receiptVersion) {
    facts.receipt.checked = true
    if (entry?.requirementVersion && receiptVersion !== entry.requirementVersion) {
      problems.push(`回复回执需求版本 ${receiptVersion} ≠ 台账需求版本 ${entry.requirementVersion}`)
    }
  } else if (requireReceipt) {
    facts.receipt.checked = true
    problems.push('回复回执里没有披露「需求版本号」（输出结构契约硬判据）')
  } else if (receipt) {
    facts.receipt.note = '本轮取到的回复未披露需求版本号 → 本项未纳入判定（格式由 output_audit 硬判据守）'
  } else {
    facts.receipt.note = '未提供回执且会话转录里没有可用回复 → 本项未纳入判定（格式由 output_audit 硬判据守）'
  }

  return { ok: problems.length === 0, reqId, problems, facts }
}

/** 反向用例：把每一处改坏，判定必须变红（证明判定器有牙）。 */
export function selftest() {
  const cases = []
  const add = (name, got, expect) => cases.push({ name, got, expect, ok: got === expect })

  add('正常文本能取到需求版本号', pickRequirementVersion('- **需求版本号**：`v1.2.3`'), 'v1.2.3')
  add('只有实施版本 → 取不到需求版本号', pickRequirementVersion('- **实施版本**：`v4.28.0`'), null)
  add('需求台账能抽到条目事实', entryFacts(readFileSync(join(ROOT, 'docs', 'requirements.md'), 'utf8'), 'REQ-092')?.requirementVersion, 'v1.0.0')
  add('台本里不存在的条目 → 返回 null', entryFacts(readFileSync(join(ROOT, 'docs', 'requirements.md'), 'utf8'), 'REQ-999'), null)

  const base = audit({ reqId: 'REQ-092', receiptText: '- **需求版本号**：`v1.0.0`' })
  add('四处一致（未完成项豁免缺失文件）→ 通过', base.ok, true)

  const badReceipt = audit({ reqId: 'REQ-092', receiptText: '- **需求版本号**：`v9.9.9`' })
  add('回执版本对不上 → 判红', badReceipt.ok, false)

  const noReceipt = audit({ reqId: 'REQ-092', receiptText: '本回复没有披露需求版本号' })
  add('回执未披露 → 本项未纳入判定（不误伤）', noReceipt.ok, true)
  add('回执未披露但显式要求 → 判红', noReceipt.facts.receipt.checked, false)
  const strict = audit({ reqId: 'REQ-092', receiptText: '本回复没有披露需求版本号', requireReceipt: true })
  add('--require-receipt 下未披露 → 判红', strict.ok, false)

  const badReq = audit({ reqId: 'REQ-999', receiptText: '- **需求版本号**：`v1.0.0`' })
  add('台账里没有该条目 → 判红', badReq.ok, false)

  const failed = cases.filter((c) => !c.ok)
  return { cases, ok: failed.length === 0, failed }
}

function main() {
  const argv = process.argv.slice(2)
  const get = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d }
  const asJson = argv.includes('--json')

  if (argv.includes('--selftest')) {
    const r = selftest()
    console.log('🧪 需求版本贯通判定器 · 反向用例自检')
    for (const c of r.cases) console.log(`   ${c.ok ? '✅' : '❌'} ${c.name}（期望 ${c.expect} · 实际 ${c.got}）`)
    console.log(r.ok ? `🎉 全部通过：${r.cases.length}/${r.cases.length}` : `❌ 失败 ${r.failed.length} 项`)
    process.exit(r.ok ? 0 : 1)
  }

  const reqId = get('--req', 'REQ-092')
  const receiptFile = get('--receipt', null)
  const receiptText = receiptFile ? (existsSync(receiptFile) ? readFileSync(receiptFile, 'utf8') : null) : null
  const res = audit({ reqId, receiptText, requireReceipt: argv.includes('--require-receipt') })

  if (asJson) { console.log(JSON.stringify(res, null, 2)); process.exit(res.ok ? 0 : 1) }

  console.log('🔗 需求版本贯通判定（需求文案 ↔ 需求台账 ↔ 实施载体 ↔ 回复回执）')
  console.log(`   条目：${reqId}`)
  console.log(`   需求文案：${res.facts.spec?.file || '（缺）'} → 需求版本 ${res.facts.spec?.version || '（缺）'}`)
  console.log(`   需求台账：需求版本 ${res.facts.ledger?.requirementVersion || '（缺）'} · 实施版本 ${res.facts.ledger?.implementationVersion || '（缺）'} · 状态 ${(res.facts.ledger?.status || '').slice(0, 24)}`)
  console.log(`   实施载体：声明文件 ${res.facts.carrier?.files ?? '（缺）'} 个 · 缺 ${res.facts.carrier?.missing?.length ?? '—'} 个`)
  console.log(`   回复回执：需求版本 ${res.facts.receipt?.version || '（未披露）'}${res.facts.receipt?.checked ? '' : ' · 本项未纳入判定'}${res.facts.receipt?.note ? `（${res.facts.receipt.note}）` : ''}`)
  console.log(`   系统总版本：${res.facts.systemVersion || '（缺）'}`)
  if (!res.ok) {
    console.error('\n⛔ 判定不通过：')
    for (const p of res.problems) console.error(`   · ${p}`)
    process.exit(1)
  }
  console.log(res.facts.receipt?.checked ? '\n✅ 四处版本号一致' : '\n✅ 版本号一致（回执项本项未纳入判定：' + (res.facts.receipt?.note || '未提供回执') + '）')
  process.exit(0)
}

function invokedDirectly() {
  try { return fileURLToPath(import.meta.url) === realpathSync(process.argv[1] || '') } catch { return false }
}
if (invokedDirectly()) main()
