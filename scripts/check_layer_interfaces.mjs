#!/usr/bin/env node
/**
 * ==============================================================================
 * 执行层接口契约判定器 (Execution Layer Interface Contract Checker) —— REQ-089 / R4
 * ==============================================================================
 * 需求原文：「所有执行层都要像面向对象编程一样提供接口以及内部写好详细使用的方法，
 *           方便索引以及具体执行」。
 *
 * 实测病根（2026-10-01）：
 *   · 179 个 `SKILL.md` 的 frontmatter 只有 `name/description/level/composition` 四个键，
 *     **没有入参、没有出参、没有调用方式、没有退出码**；
 *   · 54 个非技能执行层里，只有 6 个 CLI 在 `indexes/tool_interfaces.md` 有人手写的接口；
 *   · 而 `build_capabilities_index.mjs --check` 的判据是 `indexText.includes(id)` ——
 *     它度量的是"**名字**在不在索引里"，于是会出现
 *     「名字覆盖率 100% / 接口覆盖率 0%」这种**看起来全绿、实际上一个都调不起来**的假象。
 *
 * 本判定器的唯一职责：把"**接口覆盖率**"做成**与名字覆盖率并列、可单独判红**的指标，
 * 并给出每个执行层单元缺什么字段 —— 而不是再报一次"100% 通过"。
 *
 * 契约格式（v1，唯一权威定义见 knowledge/common/execution_layer_interface_spec.md）：
 *   · 目录型单元：`<unit>/interface.json`（与 README.md / SKILL.md 并列）
 *   · 文件型单元：`scripts/interfaces/<basename>.interface.json`
 *
 * 用法：
 *   node scripts/check_layer_interfaces.mjs --coverage      # 只报覆盖率（各层分开报）
 *   node scripts/check_layer_interfaces.mjs --check         # 契约校验 + CLI 层覆盖率门槛（退出码 0/1/2）
 *   node scripts/check_layer_interfaces.mjs --scaffold      # 为缺失单元生成基线契约（标注 verified:false）
 *   node scripts/check_layer_interfaces.mjs --json
 *
 * 退出码：0 通过 / 1 不通过 / 2 取不到证据（**2 绝不算通过**，遵循工程铁律）
 * ==============================================================================
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const INDEX_JSON = join(ROOT, 'indexes/capabilities_index.json')

/** 契约必填字段（缺失即判 schema 违规，不允许"以后再补"）。 */
export const REQUIRED_FIELDS = ['id', 'layer', 'path', 'invoke', 'summary', 'inputs', 'outputs', 'exitCodes', 'source']

/** 允许的并行口径（决定路由层怎么编排：只读可并行、独占必须串行）。 */
export const PARALLEL_KINDS = ['readonly', 'shared', 'exclusive']

const args = new Set(process.argv.slice(2))
const JSON_MODE = args.has('--json')

function loadIndex() {
  if (!existsSync(INDEX_JSON)) {
    console.error('⛔ 机读索引缺失：indexes/capabilities_index.json（先跑 node scripts/build_capabilities_index.mjs --apply）')
    process.exit(2)
  }
  try {
    const j = JSON.parse(readFileSync(INDEX_JSON, 'utf8'))
    if (!Array.isArray(j.entries) || !j.entries.length) throw new Error('entries 为空')
    return j
  } catch (e) {
    console.error(`⛔ 机读索引不可解析：${e.message}`)
    process.exit(2)
  }
}

/** 校验单个契约文件，返回违规列表。 */
export function validateContract(obj, entry) {
  const errs = []
  for (const f of REQUIRED_FIELDS) {
    if (!(f in obj)) errs.push(`缺字段 ${f}`)
  }
  if (obj.id && entry && obj.id !== entry.id) errs.push(`id 与索引不一致（契约 ${obj.id} / 索引 ${entry.id}）`)
  if (obj.path && entry && obj.path !== entry.path) errs.push(`path 与索引不一致（契约 ${obj.path} / 索引 ${entry.path}）`)
  if (obj.inputs !== undefined && !Array.isArray(obj.inputs)) errs.push('inputs 必须是数组')
  if (obj.outputs !== undefined && !Array.isArray(obj.outputs)) errs.push('outputs 必须是数组')
  if (obj.exitCodes !== undefined && (typeof obj.exitCodes !== 'object' || obj.exitCodes === null || Array.isArray(obj.exitCodes))) {
    errs.push('exitCodes 必须是对象（键=退出码，值=含义）')
  }
  if (obj.exitCodes && typeof obj.exitCodes === 'object' && Object.keys(obj.exitCodes).length === 0) {
    errs.push('exitCodes 为空对象（等于没写退出码口径）')
  }
  if (obj.parallel !== undefined && !PARALLEL_KINDS.includes(obj.parallel)) {
    errs.push(`parallel 取值非法（允许：${PARALLEL_KINDS.join(' / ')}）`)
  }
  if (obj.source !== undefined && !['handwritten', 'extracted-from-header'].includes(obj.source)) {
    errs.push('source 取值非法（handwritten / extracted-from-header）')
  }
  return errs
}

/** 从脚本头部注释里尽力抽取"用法"，抽不到就如实留空（不编）。 */
function extractUsage(absPath) {
  let text = ''
  try { text = readFileSync(absPath, 'utf8').slice(0, 4000) } catch { return null }
  const lines = text.split('\n')
  const inputs = []
  const exitCodes = {}
  let summary = ''
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (!summary) {
      const m = l.match(/(?:功能描述|核心功能|作用)[:：]?\s*(.+)/)
      if (m) summary = m[1].replace(/[*#/]/g, '').trim().slice(0, 120)
    }
    const u = l.match(/^\s*[*#/\s]*(\S+\.(?:sh|mjs|cjs|py)|node\s+\S+)\s+(--?[\w-]+|\[[^\]]+\])/)
    if (u) inputs.push({ name: u[2], type: 'arg', required: false, desc: l.replace(/^\s*[*#/\s]+/, '').trim().slice(0, 100) })
    const e = l.match(/退出码[:：]?\s*(.+)/)
    if (e) exitCodes.raw = e[1].trim().slice(0, 120)
  }
  return { summary, inputs, exitCodes }
}

function contractPathFor(entry) {
  const p = entry.path
  return /\.(sh|mjs|cjs|py)$/.test(p)
    ? `scripts/interfaces/${p.split('/').pop().replace(/\.[a-z]+$/, '')}.interface.json`
    : `${p}/interface.json`
}

function scaffold(entries) {
  let made = 0
  for (const e of entries) {
    const rel = contractPathFor(e)
    const abs = join(ROOT, rel)
    if (existsSync(abs)) continue
    // 只给 CLI / 插件 / 智能体层做基线（技能层量大，按 REQ-089 R4-b 分批，不在这里造假齐备）
    if (e.layer.includes('Skill')) continue
    const usage = extractUsage(join(ROOT, e.path))
    const obj = {
      id: e.id,
      layer: e.layer,
      path: e.path,
      invoke: e.invoke,
      summary: usage?.summary || e.desc || '(待补：从头部注释里没抽到功能描述)',
      inputs: usage?.inputs?.length ? usage.inputs : [{ name: '(待补)', type: 'unknown', required: false, desc: 'header 注释里未声明入参，需人工补齐' }],
      outputs: [{ name: 'stdout', type: 'text', desc: '标准输出（待人工细化）' }],
      exitCodes: { 0: '成功', 1: '失败/不通过' },
      sideEffects: [],
      dependencies: [],
      parallel: 'exclusive',
      examples: [e.invoke],
      source: 'extracted-from-header',
      verified: false,
    }
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, JSON.stringify(obj, null, 2) + '\n', 'utf8')
    made++
  }
  return made
}

function collect(entries) {
  const rows = []
  for (const e of entries) {
    const rel = e.interface || contractPathFor(e)
    const abs = join(ROOT, rel)
    if (!existsSync(abs)) { rows.push({ entry: e, rel, ok: false, errs: ['未声明接口契约（文件不存在）'], verified: false }); continue }
    let obj
    try { obj = JSON.parse(readFileSync(abs, 'utf8')) } catch (err) {
      rows.push({ entry: e, rel, ok: false, errs: [`契约不可解析：${err.message}`], verified: false }); continue
    }
    const errs = validateContract(obj, e)
    rows.push({ entry: e, rel, ok: errs.length === 0, errs, verified: obj.verified === true })
  }
  return rows
}

function main() {
  const idx = loadIndex()
  const entries = idx.entries

  if (args.has('--scaffold')) {
    const made = scaffold(entries)
    console.log(`🧱 已生成基线接口契约 ${made} 份（只覆盖 CLI / 插件 / 智能体层；技能层按 R4-b 分批）`)
    console.log('   ⚠️ 基线契约 source=extracted-from-header、verified=false —— 它们是"占位不是齐备"，不得当成已完工。')
  }

  const rows = collect(entries)
  const byLayer = {}
  for (const r of rows) {
    const L = r.entry.layer
    byLayer[L] = byLayer[L] || { total: 0, declared: 0, verified: 0, invalid: 0 }
    byLayer[L].total++
    if (r.ok || r.errs[0]?.startsWith('未声明')) {
      if (!r.errs[0]?.startsWith('未声明')) { byLayer[L].declared++; if (r.verified) byLayer[L].verified++ }
    }
    if (!r.ok && !r.errs[0]?.startsWith('未声明')) byLayer[L].invalid++
  }
  const total = rows.length
  const declared = rows.filter((r) => r.ok).length
  const verified = rows.filter((r) => r.ok && r.verified).length
  const invalid = rows.filter((r) => !r.ok && !r.errs[0]?.startsWith('未声明')).length
  const undeclared = rows.filter((r) => r.errs[0]?.startsWith('未声明')).length

  // CLI 层门槛：REQ-089 R4-b 明确"54 个 CLI 先行"，故 CLI 层要求 100% 声明；
  // 技能层量大，本判定器**只报门槛不判红**，避免用一句"未完成"把整条链路卡死。
  const cliRow = Object.entries(byLayer).find(([k]) => k.includes('CLI'))
  const cliCoverage = cliRow ? cliRow[1].declared / cliRow[1].total : 1
  const pass = invalid === 0 && cliCoverage === 1

  const out = { total, declared, verified, invalid, undeclared, cliCoverage, byLayer, pass, offenders: rows.filter((r) => !r.ok).slice(0, 20).map((r) => ({ id: r.entry.id, file: r.rel, errs: r.errs })) }

  if (JSON_MODE) { console.log(JSON.stringify(out, null, 2)) }
  else {
    console.log('🧩 执行层接口契约判定（接口覆盖率与名字覆盖率**分开报**）')
    console.log('-----------------------------------------')
    console.log('| 执行层 | 条目 | 已声明接口 | 已人工核对 | 契约违规 | 声明覆盖率 |')
    console.log('| :--- | ---: | ---: | ---: | ---: | ---: |')
    for (const [L, v] of Object.entries(byLayer)) {
      console.log(`| ${L} | ${v.total} | ${v.declared} | ${v.verified} | ${v.invalid} | ${((v.declared / v.total) * 100).toFixed(1)}% |`)
    }
    console.log('-----------------------------------------')
    console.log(`合计：条目 ${total} · 已声明接口 ${declared}（${((declared / total) * 100).toFixed(1)}%）· 已人工核对 ${verified} · 未声明 ${undeclared} · 契约违规 ${invalid}`)
    console.log(`CLI 层门槛（R4-b 要求先行 100%）：${(cliCoverage * 100).toFixed(1)}% → ${cliCoverage === 1 ? '✅ 达标' : '⛔ 未达标'}`)
    console.log('⚠️ 已声明 ≠ 已核对：`verified:false` 的契约是从文件头自动抽取的**基线占位**，')
    console.log('   它证明"有接口这一点"，不证明"接口内容准确"——两个数必须分开读。')
    console.log('-----------------------------------------')
    console.log(pass ? '✅ 通过：契约无违规且 CLI 层声明覆盖率 100%' : `⛔ 不通过：契约违规 ${invalid} 项 / CLI 覆盖率未达标`)
  }
  process.exit(pass ? 0 : 1)
}

main()
