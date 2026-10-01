#!/usr/bin/env node
/**
 * ==============================================================================
 * 脚本名称：task_layer_tree.mjs
 * 核心功能：把「完成一次任务所需的执行层」装配成**可视图树**（对齐 GUI 子智能体面板口径）
 * 需求依据：REQ-093 / R1「如图，可视化输出执行任务所需的执行层树状结构」
 * ------------------------------------------------------------------------------
 * 与既有实现的关系（并存不弃，不复制对方判定逻辑）：
 *   · `route_plan.mjs`      —— 负责「命中哪些执行层、凭什么命中、怎么调配更高效」（本脚本的唯一命中源）
 *   · `build-execution-tree` —— 负责「全域静态资产树」（技能池 Catalog 的七集群归属）
 *   本脚本只做第三件事：**给定一个任务意图，把该任务这一次真正要用到的执行层缝成一棵子树并出图**。
 *   因而不复制任何命中判定：命中一律来自 `route_plan.mjs --json` 的机器可读产物。
 *
 * 证据链（每个节点都必须能指回磁盘实体，禁止凭空造节点）：
 *   命中条目 / 通道 / 触发词 ← scripts/route_plan.mjs --json "<意图>"
 *   组合依赖边               ← skill-pool/docs/operations/layer-graph.json
 *   实例安全档位             ← skill-pool/docs/operations/instance-safety.json
 *   节点实体存在性           ← 磁盘实况（existsSync，逐节点复验，不采信中间产物）
 *
 * 用法：
 *   node scripts/task_layer_tree.mjs "<任务意图>"              # 文本树 + Mermaid
 *   node scripts/task_layer_tree.mjs "<任务意图>" --json       # 机器可读
 *   node scripts/task_layer_tree.mjs "<任务意图>" --svg a.svg  # 出图（再用 scripts/svg2png.sh 栅格化）
 *   node scripts/task_layer_tree.mjs --check                   # 判定（样本意图集，逐条实跑）
 *   node scripts/task_layer_tree.mjs --self-test               # 反向用例：注入悬空节点必须判红
 *
 * 退出码（工程铁律：没有可解析的证据 ≠ 通过）：
 *   0 = 通过（树已装配且每个节点都指回实体）
 *   1 = 判红（任务未命中 / 出现悬空节点 / 命中集与节点集不一致）
 *   2 = 取不到证据（route_plan 不可用或输出不可解析，拒绝给结论）
 * ==============================================================================
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const LAYER_GRAPH = path.join(ROOT, 'skill-pool/docs/operations/layer-graph.json')
const INSTANCE_SAFETY = path.join(ROOT, 'skill-pool/docs/operations/instance-safety.json')

/** --check 使用的样本意图集：**直接从通道表取**（自维护，禁止硬编码"必过"样本）。 */
function sampleIntents(limit = 6) {
  const p = path.join(ROOT, 'indexes/shortcuts_index.md')
  let txt
  try {
    txt = fs.readFileSync(p, 'utf8')
  } catch {
    return []
  }
  const found = []
  for (const line of txt.split('\n')) {
    if (!line.startsWith('|')) continue
    const m = line.match(/\*\*“([^”]+)”\*\*/)
    if (m && !found.includes(m[1])) found.push(m[1])
    if (found.length >= limit) break
  }
  return found
}

// ── 工具 ────────────────────────────────────────────────────────────────────
function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

function exists(rel) {
  if (typeof rel !== 'string' || rel.length === 0) return false
  const abs = path.isAbsolute(rel) ? rel : path.join(ROOT, rel)
  try {
    return fs.existsSync(abs)
  } catch {
    return false
  }
}

/** 命中源：只认 route_plan.mjs 的机器可读产物（单一命中口径，不另写一套匹配）。 */
function hitLayers(intent) {
  let out
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'scripts/route_plan.mjs'), '--json', intent], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    // route_plan 用退出码 1 表示"未命中"，那是有结论的判红，不是取不到证据
    const stdout = (error && error.stdout) || ''
    if (stdout.trim().startsWith('{')) out = stdout
    else return { ok: false, reason: `route_plan 不可解析：${(error && error.message) || '未知错误'}`, hit: false }
  }
  try {
    const parsed = JSON.parse(out)
    return { ok: true, raw: parsed }
  } catch {
    return { ok: false, reason: 'route_plan 输出不是合法 JSON', hit: false }
  }
}

/** 组合依赖边：只取两端都在本次命中集内的边（跨任务引用的边不画，避免树失真）。 */
function compositionEdges(ids) {
  const g = readJson(LAYER_GRAPH)
  const set = new Set(ids)
  const edges = []
  if (!g || !Array.isArray(g.edges)) return edges
  for (const e of g.edges) {
    const from = e.from ?? e.source ?? e.parent
    const to = e.to ?? e.target ?? e.child
    if (set.has(from) && set.has(to)) edges.push({ from, to })
  }
  return edges
}

function instanceSafetyIndex() {
  const d = readJson(INSTANCE_SAFETY)
  const map = new Map()
  if (d && Array.isArray(d.skills)) for (const s of d.skills) map.set(s.id, s)
  return map
}

// ── 装配 ────────────────────────────────────────────────────────────────────
/**
 * 把一次任务的执行层装配成树。
 * 结构：任务 → 命中通道（若有） → 执行层节点（按层级分组，组内按 id 排序）
 * 每个节点携带：层级 / id / 实体路径 / 调用方式 / 实例安全档位 / 实体是否真实存在
 */
export function buildTree(intent, opts = {}) {
  const hit = hitLayers(intent)
  if (!hit.ok) return { ok: false, exit: 2, reason: hit.reason, intent }
  const raw = hit.raw
  const strip = (x) => String(x ?? '').replace(/\*\*/g, '').trim()
  const channel = raw.channelHit
    ? { name: strip(raw.channelHit.name), route: strip(raw.channelHit.route), targets: raw.channelHit.targets || [] }
    : null
  const itemList = raw.items || []
  // 未命中口径：既没有通道命中，也没有执行层条目命中 —— 那才是真的"不生成路线"。
  // 只有通道命中而没有执行层条目（如"查看规则全景"这类纯文档通道）是**合法结果**：
  // 该任务所需的执行层就是"读那份文档"，因此落成文档型节点，而不是判红。
  if (raw.hit !== true && !channel) {
    return { ok: false, exit: 1, reason: '未命中任何执行层（route_plan 显式声明不生成路线）', intent, normalized: raw.normalized }
  }

  const safety = instanceSafetyIndex()
  const nodes = []
  for (const item of itemList) {
    const v = item.view || {}
    const realEntity = opts.injectMissing === v.id ? '___悬空开关___' : v.path || ''
    const safetyRow = safety.get(v.skillId || '') || null
    nodes.push({
      kind: 'layer',
      id: v.id || '(未登记 id)',
      layer: v.layer || '(未登记层级)',
      path: realEntity,
      invoke: v.invoke || '',
      interfacePath: v.interface || '',
      arbitration: (item.arbitration && item.arbitration.mode) || 'unknown',
      resourceKeys: (item.arbitration && item.arbitration.resourceKeys) || [],
      instanceSafety: safetyRow ? safetyRow.instance_safety : '未覆盖',
      exists: exists(realEntity),
      interfaceExists: exists(v.interface || ''),
      score: item.score ?? 0,
    })
  }
  if (channel) {
    const seen = new Set()
    for (const t of channel.targets) {
      const rel = path.normalize(path.join('indexes', String(t)))
      if (seen.has(rel) || exists(rel) === false && /^https?:/.test(String(t))) continue
      seen.add(rel)
      nodes.push({
        kind: 'doc',
        id: `doc.${rel.replace(/[^a-zA-Z0-9]+/g, '.')}`,
        layer: '文档 (Doc)',
        path: rel,
        invoke: `读取 ${rel}`,
        interfacePath: '',
        arbitration: 'readonly',
        resourceKeys: [],
        instanceSafety: 'safe_multi',
        exists: exists(rel),
        interfaceExists: false,
        score: 0,
      })
    }
  }
  nodes.sort((a, b) => (a.layer === b.layer ? a.id.localeCompare(b.id) : a.layer.localeCompare(b.layer)))

  const nodeIds = nodes.map((n) => n.id).sort()
  const layerNodeIds = nodeIds.filter((id) => !id.startsWith('doc.'))
  const hitIds = itemList.map((i) => (i.view && i.view.id) || '').sort()
  const edges = compositionEdges(nodeIds)

  const dangling = nodes.filter((n) => !n.exists).map((n) => ({ id: n.id, path: n.path }))
  // 命中集一致性只对**执行层条目**判：文档节点是通道产物，另有其自身的存在性判据
  const setMismatch =
    layerNodeIds.length !== hitIds.length || hitIds.some((id) => !layerNodeIds.includes(id))

  return {
    ok: true,
    exit: 0,
    intent,
    normalized: raw.normalized,
    channel,
    nodes,
    edges,
    dangling,
    setMismatch,
    root: path.basename(ROOT),
  }
}

// ── 渲染 ────────────────────────────────────────────────────────────────────
function renderText(tree) {
  const L = []
  L.push(`### 🧭 任务执行层树：【${tree.intent}】`)
  L.push('')
  if (tree.channel) {
    L.push(`- 🚩 命中通道：\`${tree.channel.name}\`（${tree.channel.route}）`)
    L.push('')
  } else {
    L.push('- 🚩 命中通道：未命中通道表（仅按执行层条目命中）')
    L.push('')
  }
  L.push('```text')
  L.push(`${tree.intent}  (任务根)`)
  const byLayer = new Map()
  for (const n of tree.nodes) {
    if (!byLayer.has(n.layer)) byLayer.set(n.layer, [])
    byLayer.get(n.layer).push(n)
  }
  const layers = [...byLayer.keys()]
  layers.forEach((layer, li) => {
    const lastLayer = li === layers.length - 1
    L.push(`${lastLayer ? '└── ' : '├── '}${layer}`)
    const arr = byLayer.get(layer)
    arr.forEach((n, ni) => {
      const lastNode = ni === arr.length - 1
      const prefix = lastLayer ? '    ' : '│   '
      const mark = n.exists ? '✓' : '✗ 悬空'
      const par = n.arbitration === 'serial' ? '串行' : n.arbitration === 'parallel' ? '可并行' : n.arbitration
      L.push(`${prefix}${lastNode ? '└── ' : '├── '}[${mark}] ${n.id} · ${par} · 实例档 ${n.instanceSafety}`)
    })
  })
  L.push('```')
  L.push('')
  return L.join('\n')
}

function renderMermaid(tree) {
  const L = []
  L.push('```mermaid')
  L.push('flowchart TD')
  L.push(`  ROOT["任务：${tree.intent.replace(/"/g, "'")}"]`)
  if (tree.channel) L.push(`  CH["通道：${tree.channel.name.replace(/"/g, "'")}"]`)
  const byLayer = new Map()
  for (const n of tree.nodes) {
    if (!byLayer.has(n.layer)) byLayer.set(n.layer, [])
    byLayer.get(n.layer).push(n)
  }
  const idx = new Map()
  let i = 0
  for (const [layer, arr] of byLayer) {
    const gid = `G${i++}`
    L.push(`  subgraph ${gid}["${layer}"]`)
    for (const n of arr) {
      const nid = `N${idx.size}`
      idx.set(n.id, nid)
      L.push(`    ${nid}["${n.id}${n.exists ? '' : ' ⚠悬空'}"]`)
    }
    L.push('  end')
  }
  if (tree.channel) L.push('  ROOT --> CH')
  for (const [id, nid] of idx) {
    if (tree.channel) L.push(`  CH --> ${nid}`)
    else L.push(`  ROOT --> ${nid}`)
  }
  for (const e of tree.edges) {
    const a = idx.get(e.from)
    const b = idx.get(e.to)
    if (a && b) L.push(`  ${a} -.组合.-> ${b}`)
  }
  L.push('```')
  return L.filter((x) => x !== '').join('\n')
}

/** 出图：手写坐标排版的自包含 SVG（与既有 control_mechanism_*.svg 同法），再交 svg2png.sh 栅格化。 */
function renderSvg(tree, opts = {}) {
  const W = opts.width || 1120
  const nodeH = 46
  const gap = 12
  const layerHeaderH = 34
  const byLayer = new Map()
  for (const n of tree.nodes) {
    if (!byLayer.has(n.layer)) byLayer.set(n.layer, [])
    byLayer.get(n.layer).push(n)
  }
  const rows = [...byLayer.entries()]
  const contentH = rows.reduce((acc, [, arr]) => acc + layerHeaderH + arr.length * (nodeH + gap), 0)
  const H = 150 + contentH + 60
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const parts = []
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif">`)
  parts.push(`<rect width="${W}" height="${H}" fill="#0f1420"/>`)
  parts.push(`<text x="40" y="52" fill="#e8eefc" font-size="26" font-weight="700">任务执行层树 · ${esc(tree.intent)}</text>`)
  parts.push(`<text x="40" y="82" fill="#8fa3c8" font-size="14">${esc(tree.root)} · 节点 ${tree.nodes.length} 个 · 悬空 ${tree.dangling.length} 个 · 组合边 ${tree.edges.length} 条 · 生成于 REQ-093/R1</text>`)
  if (tree.channel) {
    parts.push(`<rect x="40" y="100" width="${W - 80}" height="34" rx="8" fill="#16233a" stroke="#2f4a75"/>`)
    parts.push(`<text x="56" y="122" fill="#7fd1ff" font-size="14">命中通道：${esc(tree.channel.name)}　${esc(tree.channel.route)}</text>`)
  } else {
    parts.push(`<rect x="40" y="100" width="${W - 80}" height="34" rx="8" fill="#16233a" stroke="#2f4a75"/>`)
    parts.push(`<text x="56" y="122" fill="#7fd1ff" font-size="14">命中通道：未命中通道表（仅按执行层条目命中）</text>`)
  }
  let y = 150
  const palette = ['#7fd1ff', '#9fe6a0', '#ffd479', '#ff9fb2', '#c3a6ff', '#7fe3d4', '#f0a97f', '#b8c7e0']
  rows.forEach(([layer, arr], li) => {
    const color = palette[li % palette.length]
    parts.push(`<text x="40" y="${y + 20}" fill="${color}" font-size="15" font-weight="700">${esc(layer)}（${arr.length}）</text>`)
    y += layerHeaderH
    arr.forEach((n) => {
      const ok = n.exists
      const stroke = ok ? '#2f4a75' : '#c0392b'
      const fill = ok ? '#16233a' : '#3a1a1a'
      parts.push(`<rect x="40" y="${y}" width="${W - 80}" height="${nodeH}" rx="8" fill="${fill}" stroke="${stroke}"/>`)
      parts.push(`<circle cx="62" cy="${y + nodeH / 2}" r="5" fill="${ok ? '#4cd964' : '#ff4d4f'}"/>`)
      parts.push(`<text x="80" y="${y + 20}" fill="#e8eefc" font-size="14" font-weight="600">${esc(n.id)}</text>`)
      const par = n.arbitration === 'serial' ? '串行' : n.arbitration === 'parallel' ? '可并行' : n.arbitration
      parts.push(`<text x="80" y="${y + 37}" fill="#8fa3c8" font-size="12">${esc(n.path || '(无实体路径)')} · ${esc(par)} · 实例档 ${esc(n.instanceSafety)}</text>`)
      parts.push(`<text x="${W - 60}" y="${y + nodeH / 2 + 5}" fill="${ok ? '#4cd964' : '#ff4d4f'}" font-size="13" text-anchor="end">${ok ? '实体在位' : '悬空'}</text>`)
      y += nodeH + gap
    })
  })
  parts.push(`<text x="40" y="${H - 24}" fill="#5f7396" font-size="12">判定入口：node scripts/task_layer_tree.mjs --check　·　节点一律来自 route_plan.mjs --json 的命中产物，本脚本不自行判定命中</text>`)
  parts.push('</svg>')
  return parts.join('\n')
}

// ── 判定 ────────────────────────────────────────────────────────────────────
function judge(tree, opts = {}) {
  const issues = []
  if (tree.exit !== 0) {
    issues.push(tree.reason)
    return { pass: false, issues }
  }
  for (const d of tree.dangling) issues.push(`悬空节点：${d.id} → ${d.path || '(空路径)'}`)
  if (tree.setMismatch) issues.push('命中集与节点集不一致（装配过程丢节点或多节点）')
  if (tree.nodes.length === 0) issues.push('树为空：命中为真但没有任何执行层节点')
  if (opts.requireChannel && !tree.channel) issues.push('未命中通道表（样本意图本应命中通道）')
  return { pass: issues.length === 0, issues }
}

function cmdCheck(opts = {}) {
  const results = []
  const samples = sampleIntents()
  if (samples.length === 0) {
    console.log('⛔ 取不到证据：无法从 indexes/shortcuts_index.md 解析出任何通道样本')
    return 2
  }
  for (const intent of samples) {
    const tree = buildTree(intent, opts)
    const j = judge(tree)
    results.push({ intent, nodes: (tree.nodes || []).length, dangling: (tree.dangling || []).length, ...j })
  }
  const passed = results.filter((r) => r.pass).length
  console.log('🌲 任务执行层树 · 判定')
  console.log('-----------------------------------------')
  for (const r of results) {
    console.log(`   ${r.pass ? '✅' : '⛔'} 【${r.intent}】节点 ${r.nodes} · 悬空 ${r.dangling}`)
    for (const i of r.issues) console.log(`        · ${i}`)
  }
  console.log('-----------------------------------------')
  console.log(`样本 ${results.length} 条 · 通过 ${passed} 条`)
  console.log(passed === results.length ? '✅ 任务执行层树契约成立：命中可溯源、节点全在位' : '⛔ 任务执行层树存在不可溯源节点')
  if (opts.json) console.log(JSON.stringify({ results, passed, total: results.length }, null, 2))
  return passed === results.length ? 0 : 1
}

function cmdSelfTest() {
  // 反向用例：把样本头一个任务的某个节点实体路径改成不存在 → 必须判红
  const samples = sampleIntents()
  if (samples.length === 0) {
    console.log('⛔ 取不到证据：无法解析通道样本，反向用例无法构造')
    return 2
  }
  const intent = samples[0]
  const probe = buildTree(intent)
  if (probe.exit !== 0 || !probe.nodes.length) {
    console.log('⛔ 反向用例无法构造：样本意图本身未命中')
    return 2
  }
  const victimId = probe.nodes[0].id
  const broken = buildTree(intent, { injectMissing: victimId })
  const j = judge(broken)
  const caught = !j.pass && j.issues.some((i) => i.includes('悬空节点'))
  console.log('🧪 任务执行层树判定器 · 反向用例自检')
  console.log('-----------------------------------------')
  console.log(`   注入悬空节点：${victimId}`)
  console.log(`   判定结果：${j.pass ? '仍判通过（❌ 判定器无牙）' : '已判红（✅）'}`)
  console.log('-----------------------------------------')
  console.log(caught ? '✅ 反向用例通过：悬空节点必被判红' : '⛔ 反向用例失败：判定器是恒亮绿灯')
  return caught ? 0 : 1
}

// ── 入口 ────────────────────────────────────────────────────────────────────
function main() {
  const argv = process.argv.slice(2)
  const opts = { json: argv.includes('--json'), svg: null }
  const svgIdx = argv.indexOf('--svg')
  if (svgIdx >= 0) opts.svg = argv[svgIdx + 1]
  const pngIdx = argv.indexOf('--png')
  if (pngIdx >= 0) opts.png = argv[pngIdx + 1]
  const consumed = new Set([svgIdx + 1, pngIdx + 1].filter((i) => i > 0))
  const positional = argv.filter((a, i) => !a.startsWith('--') && !consumed.has(i))

  if (argv.includes('--self-test')) process.exit(cmdSelfTest())
  if (argv.includes('--check')) process.exit(cmdCheck({ json: opts.json }))

  const intent = positional[0]
  if (!intent) {
    console.log('用法：node scripts/task_layer_tree.mjs "<任务意图>" [--json] [--svg out.svg | --png 基名] | --check | --self-test')
    process.exit(2)
  }

  const tree = buildTree(intent)
  if (tree.exit !== 0) {
    console.log(`⛔ ${tree.reason}`)
    if (tree.exit === 1) console.log('   （未命中即未命中，不生成伪造路线）')
    process.exit(tree.exit)
  }
  const j = judge(tree)

  if (opts.json) {
    console.log(JSON.stringify({ ...tree, judge: j }, null, 2))
  } else {
    console.log(renderText(tree))
    console.log(renderMermaid(tree))
    console.log('')
    console.log(`📊 节点 ${tree.nodes.length} 个 · 悬空 ${tree.dangling.length} 个 · 组合边 ${tree.edges.length} 条 · 判定 ${j.pass ? '✅ 通过' : '⛔ 判红'}`)
    for (const i of j.issues) console.log(`   · ${i}`)
  }

  if (opts.svg && opts.png) {
    console.log('⛔ --svg 与 --png 互斥：出图请只用 --png <基名>（会同时产出 .svg 与 .png）')
    process.exit(2)
  }
  if (opts.svg || opts.png) {
    const raw = opts.png || opts.svg
    const base = path.isAbsolute(raw) ? raw.replace(/\.svg$/, '') : path.join(ROOT, raw.replace(/\.svg$/, ''))
    fs.mkdirSync(path.dirname(base), { recursive: true })
    const svgPath = base.endsWith('.svg') ? base : `${base}.svg`
    fs.writeFileSync(svgPath, renderSvg(tree))
    console.log(`🖼️ 已写出 SVG：${path.relative(ROOT, svgPath)}`)
    if (opts.png) {
      execFileSync('bash', [path.join(ROOT, 'scripts/svg2png.sh'), svgPath], { cwd: ROOT, stdio: 'pipe' })
      const produced = `${svgPath}.png`
      if (fs.existsSync(produced)) {
        fs.renameSync(produced, `${base}.png`)
        console.log(`🖼️ 已写出 PNG：${path.relative(ROOT, `${base}.png`)}`)
      } else {
        console.log('⛔ 栅格化未产出 PNG（svg2png.sh 未成功），SVG 仍在位')
      }
    }
  }

  process.exit(j.pass ? 0 : 1)
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main()
