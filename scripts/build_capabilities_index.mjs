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
  ]
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
  lines.push(BEGIN)
  lines.push('')
  lines.push('## 🧰 三、技能池执行层索引（由 `scripts/build_capabilities_index.mjs` 生成，请勿手改）')
  lines.push('')
  lines.push('> 数据源：`skills/`（技能唯一权威源）、`skill-pool/agents`、`skill-pool/plugins`、`skill-pool/cli`。')
  lines.push('> 覆盖率由 `node scripts/build_capabilities_index.mjs --check` 判定，未收录数必须为 0。')
  lines.push('')
  lines.push(`**执行层条目总数：${items.length}**`)
  lines.push('')
  lines.push('| 层级 | 能力标识 (Identifier) | 物理路径 | 简介 |')
  lines.push('| :--- | :--- | :--- | :--- |')
  for (const it of items) {
    lines.push(`| ${it.layer} | \`${it.id}\` | \`${it.path}\` | ${it.desc.replace(/\|/g, '\\|') || '—'} |`)
  }
  lines.push('')
  lines.push('### 3.1 执行层资产指针（非能力条目，但必须可追溯）')
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
  const indexText = existsSync(INDEX_FILE) ? readFileSync(INDEX_FILE, 'utf8') : ''
  const missing = items.filter((it) => !indexText.includes(it.id))
  console.log('🔎 执行层 → 索引层 覆盖率判定')
  console.log('-----------------------------------------')
  console.log(`执行层条目：${items.length}`)
  console.log(`已收录：${items.length - missing.length} · 未收录：${missing.length}`)
  if (missing.length) {
    console.log('未收录样例：' + missing.slice(0, 6).map((m) => m.id).join('、'))
  }
  console.log(`受管区间标记：${indexText.includes(BEGIN) && indexText.includes(END) ? '✅ 在位' : '⛔ 缺失（跑 --apply 生成）'}`)
  console.log('-----------------------------------------')
  return missing.length === 0 && indexText.includes(BEGIN)
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
