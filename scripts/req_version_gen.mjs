#!/usr/bin/env node
// ==============================================================================
// 需求版本台账生成器 (Requirement Version Ledger Generator) — REQ-092 / R2-c
// ------------------------------------------------------------------------------
// 为什么需要它（用户原话："每次更新都必须同步到需求文档并同时实施，且产品和需求都必须记录版本"）：
//   "需求版本号"在实施前**只有一句规则**（meta_rules.md 第三十五条），没有字段、没有产物、
//   没有判定器 —— 于是"需求版本"永远无法被复跑核对，只能靠人嘴说。
//
//   本生成器把主台账 `docs/requirements.md` 里的条目抽成**机读台账**
//   `ai-control/requirements/req_versions.json`，让"某条需求现在是什么版本"变成可查询、
//   可对拍、可判定的事实。
//
// 口径（唯一真相源，刻意不让第二处定义）：
//   · 条目编号与标题：来自 docs/requirements.md 的 `### REQ-xxx:` 标题行；
//   · 实施版本：来自该条目正文的 `- **实施版本**：...`（抽不到一律标 `(待补)`，不编造）；
//   · 需求版本：来自该条目正文的 `- **需求版本**：...`；缺失时沿用该条目的实施版本，
//     并显式标注 `derived: true`（说明这是推导值而非人工声明值，不静默冒充声明值）；
//   · 承载文件：来自该条目正文的 `- **关联文件**/`- **新建**`/`- **改动**` 三个字段里
//     出现的行内代码路径，逐一验存在，写入 `files` / `missing_files`。
//
// 用法：
//   node scripts/req_version_gen.mjs            # 生成/更新机读台账
//   node scripts/req_version_gen.mjs --check    # 只判不写（内容不一致即退出码 1）
//   node scripts/req_version_gen.mjs --json     # 打印机读台账
// 退出码：0 一致/已写入；1 --check 下不一致；2 用法错误
// ==============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync, realpathSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(__dirname, '..')
export const LEDGER_MD = join(ROOT, 'docs', 'requirements.md')
export const OUT_JSON = join(ROOT, 'ai-control', 'requirements', 'req_versions.json')
export const OUT_SCHEMA = 'dsh.req-versions/1'

const PLACEHOLDER = '(待补)'

/** 从一段正文里抽 `- **<字段>**：<值>` 的值（去掉反引号、括号备注）。 */
function fieldOf(block, label) {
  const re = new RegExp(`^-\\s+\\*\\*${label}\\*\\*\\s*[:：]\\s*(.+)$`, 'm')
  const m = block.match(re)
  if (!m) return null
  // 只取第一个反引号值或冒号前的裸值，避免把整句说明当成版本号
  const raw = m[1].trim()
  const tick = raw.match(/`([^`]+)`/)
  const val = (tick ? tick[1] : raw.split(/[（(，,。；;]/)[0]).trim()
  return val || null
}

/** 从条目正文里抽关联文件路径（行内代码里的、看起来像路径的片段）。 */
function filesOf(block) {
  const found = new Set()
  const lines = block.split('\n').filter((l) => /^-\s+\*\*(关联文件|新建|改动)\*\*/.test(l) || /^\s{1,4}[-·]/.test(l))
  for (const l of lines) {
    for (const m of l.matchAll(/`([^`]+)`/g)) {
      const p = m[1].trim()
      if (!p || p.includes(' ') || p.includes('待补')) continue
      if (!/\.(mjs|cjs|js|sh|md|json|yml|yaml|conf|py|html|svg|txt)$/.test(p)) continue
      found.add(p.replace(/^\.\//, ''))
    }
  }
  return [...found]
}

/** 解析主台账，导出全部条目的事实。 */
export function parseLedger() {
  const text = readFileSync(LEDGER_MD, 'utf8')
  const lines = text.split('\n')
  const entries = []
  let cur = null
  for (const l of lines) {
    const h = l.match(/^###\s+(REQ-\d+)\s*[:：]\s*(.*)$/)
    if (h) {
      if (cur) entries.push(cur)
      cur = { id: h[1], title: h[2].trim(), body: [] }
      continue
    }
    if (cur) cur.body.push(l)
  }
  if (cur) entries.push(cur)

  const map = {}
  for (const e of entries) {
    const block = e.body.join('\n')
    const impl = fieldOf(block, '实施版本')
    const declared = fieldOf(block, '需求版本')
    const files = filesOf(block)
    const existing = files.filter((p) => existsSync(join(ROOT, p)))
    const missing = files.filter((p) => !existsSync(join(ROOT, p)))
    map[e.id] = {
      title: e.title,
      requirement_version: declared || impl || PLACEHOLDER,
      requirement_version_derived: !declared,
      implementation_version: impl || PLACEHOLDER,
      files: existing,
      missing_files: missing,
    }
  }
  return map
}

/** 生成完整机读台账对象（与磁盘上已有产物做合并，保住人工补充的字段）。 */
export function buildLedger() {
  const parsed = parseLedger()
  let prev = {}
  if (existsSync(OUT_JSON)) {
    try {
      const old = JSON.parse(readFileSync(OUT_JSON, 'utf8'))
      if (old && typeof old.entries === 'object') prev = old.entries
    } catch { /* 旧产物损坏：重算，不静默沿用 */ }
  }
  const entries = {}
  for (const id of Object.keys(parsed).sort()) {
    const p = parsed[id]
    const old = prev[id] || {}
    entries[id] = {
      title: p.title,
      requirement_version: old.requirement_version_override || p.requirement_version,
      requirement_version_derived: !old.requirement_version_override && p.requirement_version_derived,
      implementation_version: p.implementation_version,
      files: p.files,
      missing_files: p.missing_files,
      // 需求版本变更留痕（人工维护，生成器不覆盖）
      change_log: Array.isArray(old.change_log) ? old.change_log : [],
    }
  }
  const overrideCount = Object.keys(entries).filter((k) => prev[k]?.requirement_version_override).length
  return {
    schema: OUT_SCHEMA,
    note: '机读需求版本台账：由 scripts/req_version_gen.mjs 从 docs/requirements.md 生成；人工只维护 requirement_version_override 与 change_log 两个字段。',
    source: 'docs/requirements.md',
    generated_by: 'scripts/req_version_gen.mjs',
    requirement_count: Object.keys(entries).length,
    override_count: overrideCount,
    entries,
  }
}

function stable(o) {
  return JSON.stringify({
    schema: o.schema,
    note: o.note,
    source: o.source,
    generated_by: o.generated_by,
    requirement_count: o.requirement_count,
    override_count: o.override_count,
    entries: o.entries,
  })
}

function main() {
  const argv = process.argv.slice(2)
  const check = argv.includes('--check')
  const json = argv.includes('--json')
  const unknown = argv.filter((a) => !['--check', '--json'].includes(a))
  if (unknown.length) {
    console.error(`❌ 未知参数：${unknown.join(' ')}`)
    process.exit(2)
  }

  const built = buildLedger()
  const prevText = existsSync(OUT_JSON) ? readFileSync(OUT_JSON, 'utf8') : ''
  let prevObj = null
  if (prevText) { try { prevObj = JSON.parse(prevText) } catch { prevObj = null } }
  const same = prevObj ? stable(prevObj) === stable(built) : false

  if (json) { console.log(JSON.stringify(built, null, 2)); process.exit(0) }

  const missingTotal = Object.values(built.entries).reduce((n, e) => n + e.missing_files.length, 0)
  const derivedTotal = Object.values(built.entries).filter((e) => e.requirement_version_derived).length
  console.log('📒 需求版本机读台账')
  console.log(`   条目 ${built.requirement_count} 个 · 人工声明需求版本 ${built.requirement_count - derivedTotal} 个 · 推导值 ${derivedTotal} 个 · 人工覆盖 ${built.override_count} 个`)
  console.log(`   关联文件缺失引用 ${missingTotal} 个${missingTotal ? '（悬空引用，见 missing_files）' : ''}`)

  if (check) {
    if (!prevObj) { console.error(`❌ --check 失败：产物 ${OUT_JSON.replace(ROOT + '/', '')} 不存在，请先运行不带参数的本脚本。`); process.exit(1) }
    if (!same) { console.error('❌ --check 失败：机读台账与 docs/requirements.md 不一致（台账改过但未重生成机读产物）。'); process.exit(1) }
    console.log('✅ 机读台账与主台账一致')
    process.exit(0)
  }

  mkdirSync(dirname(OUT_JSON), { recursive: true })
  writeFileSync(OUT_JSON, JSON.stringify(built, null, 2) + '\n', 'utf8')
  console.log(`✅ 已写入 ${OUT_JSON.replace(ROOT + '/', '')}（${same ? '内容未变，幂等重写' : '内容已更新'}）`)
}

// 仅在被直接执行时跑 main（被 import 时只导出纯函数，便于判定器复用同一解析口径）
function invokedDirectly() {
  try {
    return fileURLToPath(import.meta.url) === realpathSync(process.argv[1] || '')
  } catch {
    return false
  }
}
if (invokedDirectly()) main()
