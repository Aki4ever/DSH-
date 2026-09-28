#!/usr/bin/env node
/**
 * ==============================================================================
 * 执行层 → 索引层 同步引擎 (build_capabilities_index.mjs)
 * ==============================================================================
 * 解决的问题（2026-09-28 实测根因）：
 *   技能池 178 个技能已归位到 `skills/`，但 `indexes/` 全库**一处未提**——
 *   索引层与实际执行层脱钩。用户的原话是"找回的执行层内容必须同步到索引层中"，
 *   而"同步"若靠手工抄一遍表格，下次新增技能必然再次脱钩。
 *
 * 本脚本把同步变成**可重复执行、可判定覆盖率**的动作：
 *   1) 扫描全部执行层：`skills/`（技能）、`skill-pool/agents/`、`skill-pool/plugins/`、
 *      `skill-pool/cli/`（若存在）、`scripts/`（本工程 CLI）；
 *   2) 在 `indexes/capabilities_index.md` 的受管标记区间内**重写**索引表；
 *   3) `--check` 模式判定覆盖率（未收录数必须为 0），可直接接入门禁与审计。
 *
 * 受管区间（只重写这两行标记之间的内容，绝不触碰文档其余部分）：
 *   <!-- SKILL-POOL-INDEX:BEGIN -->
 *   <!-- SKILL-POOL-INDEX:END -->
 *
 * 用法：
 *   node scripts/build_capabilities_index.mjs --check   # 只判覆盖率（退出码 0/1）
 *   node scripts/build_capabilities_index.mjs --apply   # 重写受管区间
 * ==============================================================================
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, lstatSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const INDEX_FILE = join(ROOT, 'indexes', 'capabilities_index.md')
const BEGIN = '<!-- SKILL-POOL-INDEX:BEGIN -->'
const END = '<!-- SKILL-POOL-INDEX:END -->'

/** 从 SKILL.md 里取一行简介（frontmatter description 优先，其次首个非标题段落）。 */
function readDescription(dir) {
  const doc = join(dir, 'SKILL.md')
  if (!existsSync(doc)) return ''
  const text = readFileSync(doc, 'utf8')
  const fm = text.match(/^---\n([\s\S]*?)\n---/)
  if (fm) {
    const desc = fm[1].match(/^description:\s*(.+)$/m)
    if (desc) return desc[1].replace(/^["']|["']$/g, '').slice(0, 120)
  }
  const line = text.split('\n').find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('>'))
  return (line || '').trim().slice(0, 120)
}

/** 扫描技能层：`skills/<name>/SKILL.md`（`_template` 是脚手架模板，不计为技能）。 */
function scanSkills() {
  const dir = join(ROOT, 'skills')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((n) => !n.startsWith('.') && n !== '_template')
    .filter((n) => {
      try { return lstatSync(join(dir, n)).isDirectory() && existsSync(join(dir, n, 'SKILL.md')) } catch { return false }
    })
    .sort()
    .map((name) => ({
      layer: '技能 (Skill)',
      id: `skill.pool.${name}`,
      path: `skills/${name}`,
      desc: readDescription(join(dir, name)),
    }))
}

/** 扫描目录型执行层（agents / plugins / cli）。 */
function scanDirLayer(rel, layerName, idPrefix) {
  const dir = join(ROOT, rel)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((n) => !n.startsWith('.'))
    .filter((n) => { try { return statSync(join(dir, n)).isDirectory() } catch { return false } })
    .sort()
    .map((name) => ({
      layer: layerName,
      id: `${idPrefix}.${name}`,
      path: `${rel}/${name}`,
      desc: (() => {
        for (const f of ['README.md', 'PROMPT.md', 'SKILL.md']) {
          const p = join(dir, name, f)
          if (existsSync(p)) {
            const l = readFileSync(p, 'utf8').split('\n').find((x) => x.trim() && !x.startsWith('#') && !x.startsWith('>'))
            if (l) return l.trim().slice(0, 120)
          }
        }
        return ''
      })(),
    }))
}

function collectAll() {
  return [
    ...scanSkills(),
    ...scanDirLayer('skill-pool/agents', '智能体 (Agent)', 'agent.skillpool'),
    ...scanDirLayer('skill-pool/plugins', '插件 (Plugin)', 'plugin.skillpool'),
    ...scanDirLayer('skill-pool/docs/cli/commands', '脚本 (CLI)', 'cli.skillpool'),
    // 本工程自己的 CLI 也必须入索引（2026-09-28 审计发现的覆盖率自证缺陷：
    // 生成器原先从不扫 scripts/，45 个 CLI 游离于"分子分母"之外，
    // `--check` 恒报"未收录 0"——它度量的是自己定义的集合，不是全部执行层）。
    ...scanScriptLayer(),
  ]
}

/** 扫描本工程 CLI：`scripts/**` 下的可执行脚本（.sh/.mjs/.cjs/.py），排除 lib 内部实现。 */
function scanScriptLayer() {
  const dir = join(ROOT, 'scripts')
  if (!existsSync(dir)) return []
  const out = []
  const walk = (rel) => {
    for (const entry of readdirSync(join(ROOT, rel), { withFileTypes: true })) {
      const childRel = `${rel}/${entry.name}`
      if (entry.isDirectory()) {
        if (entry.name === 'lib') continue          // lib/ 是内部实现，不是对外 CLI
        walk(childRel)
        continue
      }
      if (!/\.(sh|mjs|cjs|py)$/.test(entry.name)) continue
      const id = `cli.rules.${entry.name.replace(/\.[a-z]+$/, '')}`
      out.push({
        layer: '脚本 (CLI)',
        id,
        path: childRel,
        desc: (() => {
          const text = readFileSync(join(ROOT, childRel), 'utf8')
          const line = text.split('\n').slice(0, 30).find((l) => /功能描述|核心功能|作用[:：]|^\s*\*\s*\S/.test(l))
          return (line || '').replace(/^[\s*/#-]+/, '').replace(/功能描述[:：]?|核心功能[:：]?/, '').trim().slice(0, 100)
        })(),
      })
    }
  }
  walk('scripts')
  return out.sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * 读取技能目录真相源（catalog），并**对拍磁盘**。
 *
 * 为什么必须对拍：catalog 记的是"应该有"，磁盘是"真的有"。实测二者已经漂移——
 * catalog 里有 5 个技能在 `skills/` 下根本不存在。若索引只照抄 catalog，
 * 索引会宣称一批不存在的技能可用；这正是"虚无缥缈"的生成方式。
 */
function loadCatalog() {
  const file = join(ROOT, 'skill-pool', 'docs', 'operations', 'skill-catalog.json')
  if (!existsSync(file)) return { entries: [], summary: null, missingOnDisk: [] }
  const data = JSON.parse(readFileSync(file, 'utf8'))
  const entries = Array.isArray(data.skills) ? data.skills : []
  const missingOnDisk = entries
    .filter((e) => e.layer === 'skill' && !existsSync(join(ROOT, 'skills', e.name, 'SKILL.md')))
    .map((e) => e.name)
  return { entries, summary: data.levels_summary || null, missingOnDisk }
}

/** 非条目但属执行层资产的指针（工具链入口与真相源数据），必须在索引里可追溯。 */
const ASSET_POINTERS = [
  { path: 'skill-pool/bin/skill-pool', desc: '技能池 CLI 入口（list/validate/status/link/catalog/consistency）' },
  { path: 'skill-pool/docs/operations/skill-catalog.json', desc: '技能目录真相源（catalog）' },
  { path: 'skill-pool/docs/operations/execution-tree.json', desc: '执行层树真相源' },
  { path: 'skill-pool/docs/operations/execution-layers.json', desc: '非技能执行层登记表（cli/agent/api/mcp/plugin）' },
  { path: 'skill-pool/docs/operations/layer-graph.json', desc: '层间依赖图' },
  { path: 'skill-pool/docs/operations/instance-safety.json', desc: '实例安全声明表（safe_multi / needs_lock / single_only）' },
  { path: 'skill-pool/docs/operations/process-spec.json', desc: '流程合规判定规约（九步 + 物理探针绑定）' },
  { path: 'skill-pool/docs/operations/global-rules-index.md', desc: '技能池侧全局规则索引' },
  { path: 'skill-pool/docs/requirements/index.md', desc: '技能池需求台账（基线）' },
  { path: 'skill-pool/docs/operations/workflows.md', desc: '技能池操作规范与命令入口' },
  { path: 'skill-pool/MIGRATED.md', desc: '合并说明（本目录并入全局规则的记录）' },
]

function renderSection(items) {
  const lines = []
  const cat = loadCatalog()
  const levelOf = new Map(cat.entries.map((e) => [e.name, e.level]))
  const titleOf = new Map(cat.entries.map((e) => [e.name, e.category_title]))
  lines.push(BEGIN)
  lines.push('')
  lines.push('## 🧰 三、技能池执行层索引（由 `scripts/build_capabilities_index.mjs` 生成，请勿手改）')
  lines.push('')
  lines.push('> 数据源：`skills/`（技能唯一权威源）、`skill-pool/agents`、`skill-pool/plugins`、`skill-pool/docs/cli/commands`、`scripts/`（本工程 CLI）。')
  lines.push('> 级别与分类取自真相源 `skill-pool/docs/operations/skill-catalog.json`，并**逐条对拍磁盘**。')
  lines.push('> 覆盖率由 `node scripts/build_capabilities_index.mjs --check` 判定，未收录数必须为 0。')
  lines.push('')
  lines.push(`**执行层条目总数：${items.length}**（技能 ${items.filter((i) => i.layer.includes('Skill')).length} · 其他执行层 ${items.filter((i) => !i.layer.includes('Skill')).length}）`)
  if (cat.summary) {
    lines.push(`**catalog 分级口径**：${Object.entries(cat.summary).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
  }
  lines.push('')
  lines.push('### 3.0 能力分级与集群（真相源口径）')
  lines.push('')
  lines.push('| 级别 | 分类集群 | 能力标识 | 物理路径 |')
  lines.push('| :--- | :--- | :--- | :--- |')
  const skillItems = items.filter((i) => i.layer.includes('Skill'))
  for (const it of skillItems) {
    const name = it.path.replace('skills/', '')
    lines.push(`| ${levelOf.get(name) || '—'} | ${titleOf.get(name) || '—'} | \`${it.id}\` | \`${it.path}\` |`)
  }
  lines.push('')
  lines.push('### 3.1 全量执行层速查（含 agent / plugin / cli）')
  lines.push('')
  lines.push('| 层级 | 能力标识 (Identifier) | 物理路径 | 简介 |')
  lines.push('| :--- | :--- | :--- | :--- |')
  for (const it of items) {
    lines.push(`| ${it.layer} | \`${it.id}\` | \`${it.path}\` | ${it.desc.replace(/\|/g, '\\|') || '—'} |`)
  }
  lines.push('')
  if (cat.missingOnDisk.length) {
    lines.push('### 3.2 ⚠️ catalog 与磁盘漂移（必须处理，禁止当成可用能力）')
    lines.push('')
    lines.push('以下条目在真相源 catalog 中登记，但 `skills/<name>/SKILL.md` **在磁盘上不存在**。')
    lines.push('它们不是本仓技能，必须二选一：补齐文件，或从 catalog 注销。')
    lines.push('')
    for (const n of cat.missingOnDisk) lines.push(`- \`${n}\`（catalog 有、磁盘无）`)
    lines.push('')
  }
  lines.push('### 3.3 执行层资产指针（非能力条目，但必须可追溯）')
  lines.push('')
  lines.push('| 资产 | 物理路径 | 作用 |')
  lines.push('| :--- | :--- | :--- |')
  for (const a of ASSET_POINTERS) {
    const exists = existsSync(join(ROOT, a.path))
    lines.push(`| ${exists ? '✅' : '⛔'} | \`${a.path}\` | ${a.desc} |`)
  }
  lines.push('')
  lines.push(END)
  return lines.join('\n')
}

function check() {
  const items = collectAll()
  const cat = loadCatalog()
  const indexText = existsSync(INDEX_FILE) ? readFileSync(INDEX_FILE, 'utf8') : ''
  const missing = items.filter((it) => !indexText.includes(it.id))
  console.log('🔎 执行层 → 索引层 覆盖率判定')
  console.log('-----------------------------------------')
  console.log(`执行层条目：${items.length}（技能 ${items.filter((i) => i.layer.includes('Skill')).length} · agent/plugin/cli ${items.filter((i) => !i.layer.includes('Skill')).length}）`)
  console.log(`已收录：${items.length - missing.length} · 未收录：${missing.length}`)
  if (missing.length) {
    console.log('未收录样例：' + missing.slice(0, 6).map((m) => m.id).join('、'))
  }
  console.log(`catalog 登记条目：${cat.entries.length}`)
  console.log(`catalog 有但磁盘无（漂移，必须在索引 3.2 显式列出）：${cat.missingOnDisk.length}${cat.missingOnDisk.length ? ' → ' + cat.missingOnDisk.join('、') : ''}`)
  console.log(`受管区间标记：${indexText.includes(BEGIN) && indexText.includes(END) ? '✅ 在位' : '⛔ 缺失（跑 --apply 生成）'}`)
  console.log('-----------------------------------------')
  const driftListed = cat.missingOnDisk.every((n) => indexText.includes(n))
  return missing.length === 0 && indexText.includes(BEGIN) && driftListed
}

function apply() {
  const items = collectAll()
  let text = existsSync(INDEX_FILE) ? readFileSync(INDEX_FILE, 'utf8') : ''
  const section = renderSection(items)
  const b = text.indexOf(BEGIN)
  const e = text.indexOf(END)
  if (b !== -1 && e !== -1 && e > b) {
    text = text.slice(0, b) + section + text.slice(e + END.length)
  } else {
    text = text.trimEnd() + '\n\n---\n\n' + section + '\n'
  }
  writeFileSync(INDEX_FILE, text, 'utf8')
  console.log(`✅ 已重写索引受管区间：indexes/capabilities_index.md（${items.length} 条执行层）`)
}

if (process.argv.includes('--apply')) apply()
else process.exit(check() ? 0 : 1)
