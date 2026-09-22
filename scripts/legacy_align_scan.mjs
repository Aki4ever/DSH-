#!/usr/bin/env node
/**
 * ==============================================================================
 * 存量校准扫描器 (Legacy Alignment Scanner) —— 管控机制 · 遇碰即对齐
 * ==============================================================================
 * 定位：回答"每次更新，存量资产跟上了没有"。
 *       元规则第十九条要求"遇碰即对齐"，但没有可执行的检查手段，
 *       结果就是版本号、命名、引用各处漂移。本脚本把这条要求变成可量化清单。
 *
 * 五项检查（L1~L5）：
 *   L1 命名规范   机制名称必须存在唯一权威出处（索引文件），且全库不得残留旧称
 *   L2 入口覆盖   入口文件（AGENTS/README/索引）必须引用新机制的关键组件
 *   L3 版本对齐   受管文档头部版本与台账总版本一致（与冲突检测器 C1 同口径）
 *   L4 指纹覆盖   受管资产必须登记在指纹台账中
 *   L5 台账留痕   本次迭代的交付物必须在需求台账中有条目
 *
 * 输出：待对齐清单 JSON + 人类可读报告
 * 用法：
 *   node scripts/legacy_align_scan.mjs --root <项目根> [--json] [--top N] [--dirs a,b]
 *   node scripts/legacy_align_scan.mjs --self-test
 * ==============================================================================
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative, extname } from 'node:path'

// ── 机制命名权威口径（唯一真相源，改这里即改全库口径）────────────────────────
export const CANONICAL = {
  /** 机制正式名称 */
  mechanism: '管控机制',
  /** 四层组件名 */
  layers: ['注入层', '状态层', '判定层', '拦截层'],
  /** 名称的权威出处（必须存在） */
  homeFiles: ['indexes/rules_index.md', 'README.md'],
  /** 旧称黑名单：出现即为存量待对齐 */
  legacyNames: [
    'AI 执行流程管控系统',
    'AI执行流程管控系统',
    '门禁内核',
    '管控体系',
    '执行流程管控系统',
  ],
  /** 必须被入口引用的关键组件（新机制的可执行部分） */
  requiredRefs: [
    'scripts/control_gates.sh',
    'scripts/conflict_scan.mjs',
    'scripts/redundancy_scan.mjs',
    'scripts/legacy_align_scan.mjs',
    'ai-control/config/gates.conf',
  ],
  /** 入口文件（相对项目根） */
  entryFiles: ['AGENTS.md', 'README.md', 'indexes/rules_index.md', 'ai-control/README.md'],
}

// ── 参数解析 ─────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { root: process.cwd(), json: false, top: 40, dirs: null, selfTest: false }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--root') out.root = argv[++i]
    else if (a === '--json') out.json = true
    else if (a === '--top') out.top = Number(argv[++i]) || 40
    else if (a === '--dirs') out.dirs = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean)
    else if (a === '--self-test') out.selfTest = true
  }
  return out
}

// ── 纯函数判定（便于自检）────────────────────────────────────────────────────

/**
 * L1：找出旧称出现位置（嵌套旧称只记最长的那个，避免同一处重复计数）。
 * 豁免规则（两条，都是"有意的历史记录"，不算存量待对齐）：
 *   ① 所在行写有"旧称"二字 —— 例如索引里声明废止哪些旧称；
 *   ② 所在行是**历史记录行**（含版本号 `vX.Y.Z` 或日期 `YYYY-MM-DD`）——
 *      版本里程碑表、变更记录天然会保留当时使用的名称，改掉反而篡改历史。
 * 若不设豁免，会变成"逼着人不许写历史"，与透明度要求背道而驰。
 */
export function findLegacyNames(text, legacyNames) {
  const hits = []
  const spans = []
  const isHistoricalLine = (line) => /旧称/.test(line) || /v?\d+\.\d+\.\d+/.test(line) || /\d{4}-\d{2}-\d{2}/.test(line)
  // 先长后短：短名若落在已记录的长名区间内则跳过
  const ordered = [...legacyNames].sort((a, b) => b.length - a.length)
  for (const name of ordered) {
    let idx = text.indexOf(name)
    while (idx !== -1) {
      const end = idx + name.length
      if (!spans.some((s) => idx >= s[0] && end <= s[1])) {
        const lineStart = text.lastIndexOf('\n', idx) + 1
        const lineEnd = text.indexOf('\n', idx)
        const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd)
        if (!isHistoricalLine(line)) {
          const lineNo = text.slice(0, idx).split(/\r?\n/).length
          hits.push({ name, line: lineNo })
        }
        spans.push([idx, end])
      }
      idx = text.indexOf(name, idx + name.length)
    }
  }
  hits.sort((a, b) => a.line - b.line)
  return hits
}

/** L1：机制名称必须有权威出处 */
export function checkNameHome(fileContents, canonical = CANONICAL) {
  const missing = canonical.homeFiles.filter((f) => {
    const text = fileContents[f]
    return !text || !text.includes(canonical.mechanism)
  })
  return missing.length === 0 ? null : {
    type: 'L1-命名规范',
    level: 'high',
    subject: '机制名称缺少权威出处',
    a: { file: missing.join('、'), value: '未出现机制名称' },
    b: { file: 'indexes/rules_index.md', value: `应在索引中登记“${canonical.mechanism}”及其分层` },
    advice: `在索引文件登记唯一权威名称“${canonical.mechanism}”（含四层：${canonical.layers.join(' / ')}），其余文件一律引用，不复述别名。`,
  }
}

/** L1：四层命名必须齐备 */
export function checkLayers(fileContents, canonical = CANONICAL) {
  const home = canonical.homeFiles.map((f) => fileContents[f] || '').join('\n')
  const missing = canonical.layers.filter((l) => !home.includes(l))
  return missing.length === 0 ? null : {
    type: 'L1-命名规范',
    level: 'medium',
    subject: '机制分层命名缺失',
    a: { file: canonical.homeFiles[0], value: `缺少分层：${missing.join('、')}` },
    b: { file: canonical.homeFiles[0], value: `应有四层：${canonical.layers.join(' / ')}` },
    advice: '在索引中补齐四层命名，使机制各层可被单独指代与优化。',
  }
}

/** L2：入口必须引用关键组件 */
export function checkEntryRefs(entryContents, canonical = CANONICAL) {
  const out = []
  const joined = Object.values(entryContents).join('\n')
  for (const ref of canonical.requiredRefs) {
    if (!joined.includes(ref)) {
      out.push({
        type: 'L2-入口覆盖',
        level: 'medium',
        subject: '关键组件未被入口引用',
        a: { file: canonical.entryFiles.join('、'), value: `未引用 ${ref}` },
        b: { file: ref, value: '该组件存在于磁盘但入口未指向' },
        advice: '在入口文件补上指针，使该组件可被发现与调用；组件本身不要复制内容，只放指针。',
      })
    }
  }
  return out
}

/** L3：版本对齐（与冲突检测器 C1 同口径，便于两处结论一致） */
export function checkVersionAlign(rel, docVersion, ledger) {
  if (!docVersion || !ledger || docVersion === ledger) return null
  return {
    type: 'L3-版本对齐',
    level: 'high',
    subject: '文档版本落后于总版本',
    a: { file: rel, value: `v${docVersion}` },
    b: { file: 'docs/requirements.md', value: `v${ledger}` },
    advice: '按“遇碰即对齐”，将受管文档头部版本升至当前总版本；本次未实质修改的文件也需归位，避免版本孤岛。',
  }
}

/** L4：指纹覆盖 */
export function checkFingerprintCoverage(managedFiles, ledgerText) {
  const out = []
  for (const f of managedFiles) {
    // 指纹台账以路径片段或文件名登记，命中任一即视为已纳管
    const base = f.split('/').pop()
    if (!ledgerText.includes(f) && !ledgerText.includes(base)) {
      out.push({
        type: 'L4-指纹覆盖',
        level: 'low',
        subject: '受管资产未登记指纹',
        a: { file: f, value: '未在指纹台账中出现' },
        b: { file: 'memory/asset_fingerprint_ledger.md', value: '应有该资产的追踪记录' },
        advice: '将该资产登记进指纹台账（路径 + 短哈希 + 新鲜度），使漂移可被发现。',
      })
    }
  }
  return out
}

/** L5：台账留痕 */
export function checkLedgerTrace(deliverables, ledgerText) {
  const out = []
  for (const d of deliverables) {
    if (!ledgerText.includes(d)) {
      out.push({
        type: 'L5-台账留痕',
        level: 'medium',
        subject: '本次交付物未登记台账',
        a: { file: d, value: '台账中无该交付物记录' },
        b: { file: 'docs/requirements.md', value: '规则要求“无需求依据的规则一律不成立”' },
        advice: '先在台账登记需求条目，再落地文件；本次迭代的产出必须能追溯到需求编号。',
      })
    }
  }
  return out
}

// ── 工具 ─────────────────────────────────────────────────────────────────────
async function collectFiles(dir, ext) {
  const out = []
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...await collectFiles(full, ext))
    else if (extname(e.name) === ext) out.push(full)
  }
  return out
}

async function readOr(path) {
  try { return await readFile(path, 'utf8') } catch { return '' }
}

function headerVersion(text) {
  const m = String(text).match(/\*\*当前(?:文档|模板|台账)版本\*\*[^\n]*?`v?(\d+\.\d+\.\d+)`/)
  return m ? m[1] : null
}

function ledgerVersion(text) {
  const m = String(text).match(/当前系统实施总版本[^\n]*?`v?(\d+\.\d+\.\d+)`/)
  return m ? m[1] : null
}

// ── 主扫描 ───────────────────────────────────────────────────────────────────
async function scan({ root, dirs }) {
  const scanDirs = dirs && dirs.length ? dirs : ['rules', 'knowledge', 'indexes', 'docs', 'templates', 'memory']
  const files = []
  for (const d of scanDirs) {
    const full = join(root, d)
    try { if ((await stat(full)).isDirectory()) files.push(...await collectFiles(full, '.md')) } catch { /* 跳过 */ }
  }
  for (const f of ['AGENTS.md', 'README.md']) {
    const full = join(root, f)
    try { if ((await stat(full)).isFile()) files.push(full) } catch { /* 跳过 */ }
  }

  const ledgerText = await readOr(join(root, 'docs/requirements.md'))
  const ledger = ledgerVersion(ledgerText)
  const legacyLedger = await readOr(join(root, 'memory/asset_fingerprint_ledger.md'))

  const items = []
  const fileContents = {}
  for (const full of files) {
    const rel = relative(root, full)
    const text = await readOr(full)
    fileContents[rel] = text

    // L1 旧称残留
    for (const hit of findLegacyNames(text, CANONICAL.legacyNames)) {
      items.push({
        type: 'L1-命名规范',
        level: 'medium',
        subject: '残留旧称',
        a: { file: rel, value: `第 ${hit.line} 行出现旧称“${hit.name}”` },
        b: { file: 'indexes/rules_index.md', value: `统一改称“${CANONICAL.mechanism}”` },
        advice: `改为正式名称“${CANONICAL.mechanism}”；确需保留历史语境时，标注“旧称”二字。`,
      })
    }

    // L3 版本对齐
    const c = checkVersionAlign(rel, headerVersion(text), ledger)
    if (c) items.push(c)
  }

  // L1 名称权威出处与分层
  const homeContents = {}
  for (const f of CANONICAL.homeFiles) homeContents[f] = await readOr(join(root, f))
  const homeMiss = checkNameHome(homeContents)
  if (homeMiss) items.push(homeMiss)
  const layerMiss = checkLayers(homeContents)
  if (layerMiss) items.push(layerMiss)

  // L2 入口覆盖
  const entryContents = {}
  for (const f of CANONICAL.entryFiles) entryContents[f] = await readOr(join(root, f))
  items.push(...checkEntryRefs(entryContents))

  // L4 指纹覆盖（只查规则法典与脚本，这两类最容易漂移）
  const managed = []
  for (const d of ['rules', 'scripts']) {
    const full = join(root, d)
    try {
      if ((await stat(full)).isDirectory()) {
        const list = await collectFiles(full, d === 'rules' ? '.md' : '.sh')
        const mjs = d === 'scripts' ? await collectFiles(full, '.mjs') : []
        managed.push(...[...list, ...mjs].map((f) => relative(root, f)))
      }
    } catch { /* 跳过 */ }
  }
  items.push(...checkFingerprintCoverage(managed, legacyLedger))

  // L5 台账留痕（本次关键交付物）
  const deliverables = [
    'scripts/conflict_scan.mjs',
    'scripts/legacy_align_scan.mjs',
    'docs/constraint_mechanism_spec.md',
  ]
  items.push(...checkLedgerTrace(deliverables, ledgerText))

  // 去重
  const seen = new Set()
  const unique = items.filter((i) => {
    const key = `${i.type}|${i.subject}|${i.a?.file}|${i.a?.value}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const order = { high: 0, medium: 1, low: 2 }
  unique.sort((x, y) => (order[x.level] - order[y.level]) || x.type.localeCompare(y.type))

  const summary = {}
  for (const i of unique) summary[i.type] = (summary[i.type] || 0) + 1

  return { filesScanned: files.length, ledgerVersion: ledger, itemCount: unique.length, summary, items: unique }
}

// ── 自检 ─────────────────────────────────────────────────────────────────────
function selfTest() {
  const cases = []
  const add = (name, got, fn) => cases.push({ name, got, fn })

  // 1) 旧称必须被找出
  const hits = findLegacyNames('本文档由 AI 执行流程管控系统 提供\n另有 门禁内核 一处', CANONICAL.legacyNames)
  add('旧称必被检出（2 处）', hits.length === 2, (v) => v === true)
  add('旧称行号可定位', hits[0].line === 1 && hits[1].line === 2, (v) => v === true)
  // 1b) 嵌套旧称不重复计数（“执行流程管控系统”是“AI 执行流程管控系统”的子串，只报一次）
  add('嵌套旧称不重复计数', findLegacyNames('AI 执行流程管控系统', CANONICAL.legacyNames).length === 1, (v) => v === true)
  // 1c) 写明“旧称”的历史说明行豁免（否则声明废止的文档本身会被报成问题）
  add('旧称说明行豁免', findLegacyNames('不再使用"门禁内核"等旧称', CANONICAL.legacyNames).length === 0, (v) => v === true)
  // 1d) 版本里程碑行豁免（历史记录里保留当时名称属正常，改掉等于篡改历史）
  add('版本里程碑行豁免', findLegacyNames('| **`v2.8.0`** | 2026-09-22 | REQ-032 | 落地门禁内核与真冗余检测器 |', CANONICAL.legacyNames).length === 0, (v) => v === true)
  // 1e) 普通正文里的旧称仍必须检出（豁免不能把检出能力一起豁免掉）
  add('普通正文旧称仍检出', findLegacyNames('本工程由门禁内核统一管控所有写操作。', CANONICAL.legacyNames).length === 1, (v) => v === true)
  // 2) 正式名称不误报
  add('正式名称不误报', findLegacyNames('管控机制负责闸门判定', CANONICAL.legacyNames).length === 0, (v) => v === true)

  // 3) 名称出处缺失必检出
  const miss = checkNameHome({ 'indexes/rules_index.md': '无相关内容', 'README.md': '管控机制在此' })
  add('名称出处缺失必检出', !!miss, (v) => v === true)
  // 4) 出处齐备不误报
  add('名称出处齐备不误报', checkNameHome({
    'indexes/rules_index.md': '管控机制：注入层/状态层/判定层/拦截层',
    'README.md': '管控机制说明',
  }) === null, (v) => v === true)

  // 5) 分层缺失必检出
  add('分层缺失必检出', !!checkLayers({ 'indexes/rules_index.md': '管控机制', 'README.md': '管控机制' }), (v) => v === true)
  // 6) 分层齐备不误报
  add('分层齐备不误报', checkLayers({
    'indexes/rules_index.md': '管控机制 注入层 状态层 判定层 拦截层',
    'README.md': '管控机制',
  }) === null, (v) => v === true)

  // 7) 入口漏引组件必检出
  const refs = checkEntryRefs({ 'README.md': '只有 scripts/control_gates.sh 一个' })
  add('入口漏引组件必检出', refs.length === CANONICAL.requiredRefs.length - 1, (v) => v === true)
  // 8) 入口引用齐备不误报
  const full = CANONICAL.requiredRefs.join(' ')
  add('入口引用齐备不误报', checkEntryRefs({ 'README.md': full }).length === 0, (v) => v === true)

  // 9) 版本落后必检出
  add('版本落后必检出', !!checkVersionAlign('a.md', '1.0.0', '2.8.0'), (v) => v === true)
  // 10) 版本一致不误报
  add('版本一致不误报', checkVersionAlign('a.md', '2.8.0', '2.8.0') === null, (v) => v === true)

  // 11) 指纹漏登记必检出
  const fp = checkFingerprintCoverage(['rules/a.md', 'rules/b.md'], '台账里有 rules/a.md 的记录')
  add('指纹漏登记必检出', fp.length === 1 && fp[0].a.file === 'rules/b.md', (v) => v === true)
  // 12) 指纹已登记不误报
  add('指纹已登记不误报', checkFingerprintCoverage(['rules/a.md'], 'rules/a.md').length === 0, (v) => v === true)

  // 13) 交付物无台账留痕必检出
  add('交付物无留痕必检出', checkLedgerTrace(['scripts/x.mjs'], '台账里没提这个文件').length === 1, (v) => v === true)
  // 14) 有留痕不误报
  add('交付物有留痕不误报', checkLedgerTrace(['scripts/x.mjs'], '已交付 scripts/x.mjs').length === 0, (v) => v === true)

  let pass = true
  console.log('=== 存量校准扫描器自检 ===')
  for (const c of cases) {
    const ok = c.fn(c.got)
    if (!ok) pass = false
    console.log(`${ok ? '✅' : '❌'} ${c.name}`)
  }
  console.log(`\n共 ${cases.length} 项 · ${pass ? '🎉 全部通过' : '💥 存在失败'}`)
  process.exit(pass ? 0 : 1)
}

// ── 入口 ─────────────────────────────────────────────────────────────────────
const args = parseArgs(process.argv)
if (args.selfTest) selfTest()

const result = await scan({ root: args.root, dirs: args.dirs })

if (args.json) {
  console.log(JSON.stringify(result, null, 2))
} else {
  console.log('=== 管控机制 · 存量待对齐清单 ===')
  console.log(`基准总版本：${result.ledgerVersion ? `v${result.ledgerVersion}` : '未识别'} · 扫描文件 ${result.filesScanned} · 待对齐 ${result.itemCount} 项`)
  for (const [k, v] of Object.entries(result.summary)) console.log(`  · ${k}：${v} 项`)
  const high = result.items.filter((i) => i.level === 'high').length
  console.log(`高危 ${high} 项 · 其余 ${result.itemCount - high} 项`)
  for (const i of result.items.slice(0, args.top)) {
    console.log(`\n[${i.type}] ${i.subject}`)
    console.log(`   现状：${i.a.file} → ${i.a.value}`)
    console.log(`   应对：${i.advice}`)
  }
  if (result.itemCount > args.top) console.log(`\n…… 其余 ${result.itemCount - args.top} 项已省略`)
  console.log(result.itemCount === 0 ? '\n✅ 存量已与新规范对齐' : '\n⚠️ 存在待对齐项，须在本次迭代内清零或书面说明原因')
}
