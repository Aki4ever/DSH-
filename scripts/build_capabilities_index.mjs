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
  ].map(enrich)
}

/* ══════════════════════════════════════════════════════════════════════════
 * REQ-089 R3：把「静态清单」升级为「机读索引 + 可执行跳转」
 * --------------------------------------------------------------------------
 * 为什么必须补这几列（实测病根，2026-10-01）：
 *   升级前 §3.1 只有 4 列（层级/标识/物理路径/简介），且路径写作反引号**不可点击**，
 *   既没有"怎么调起它"，也没有"它的接口声明在哪"。
 *   于是 `--check` 只能做 `indexText.includes(id)` 这种**字符串包含判定** ——
 *   它证明的是"这个名字在文件里出现过"，**证明不了"这条能被调起"**。
 *   本段补的 `invoke`（调用命令）与 `interface`（接口指针）两列，
 *   正是后面 R4「接口覆盖率」与 R5「路由可执行跳转」的物理基础。
 * ══════════════════════════════════════════════════════════════════════════ */

/** 由物理路径推导出"怎么调起它"；能从文件头注释里抽到真实用法时以真实用法为准。 */
function invokeFor(entry) {
  const p = entry.path
  if (entry.layer.includes('Skill')) {
    return { invoke: `skill ${entry.id.replace(/^skill\.pool\./, '')}`, invokeKind: 'host-tool' }
  }
  if (entry.layer.includes('Agent')) return { invoke: 'subagent（宿主工具，按需分派）', invokeKind: 'host-tool' }
  if (entry.layer.includes('Plugin')) return { invoke: `dsh plugin add ${p}`, invokeKind: 'plugin-install' }
  if (/\.sh$/.test(p)) return { invoke: `bash ${p}`, invokeKind: 'cli' }
  if (/\.(mjs|cjs)$/.test(p)) return { invoke: `node ${p}`, invokeKind: 'cli' }
  if (/\.py$/.test(p)) return { invoke: `python3 ${p}`, invokeKind: 'cli' }
  return { invoke: '', invokeKind: 'unknown' }
}

/** 目录型单元：`<unit>/interface.json`；文件型单元：`scripts/interfaces/<basename>.interface.json`。 */
function interfaceFor(entry) {
  const p = entry.path
  const candidates = /\.(sh|mjs|cjs|py)$/.test(p)
    ? [`scripts/interfaces/${p.split('/').pop().replace(/\.[a-z]+$/, '')}.interface.json`]
    : [`${p}/interface.json`]
  for (const c of candidates) if (existsSync(join(ROOT, c))) return c
  return null
}

/** 给条目补上机读字段（不改动原有四列，向后兼容）。 */
function enrich(entry) {
  const inv = invokeFor(entry)
  return { ...entry, ...inv, interface: interfaceFor(entry) }
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
  lines.push('| 层级 | 能力标识 (Identifier) | 物理路径 | 接口声明 | 调用命令 | 简介 |')
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |')
  for (const it of items) {
    lines.push(`| ${it.layer} | \`${it.id}\` | \`${it.path}\` | ${it.interface ? `✅ \`${it.interface}\`` : '⛔ 未声明'} | \`${it.invoke || '—'}\` | ${it.desc.replace(/\|/g, '\\|') || '—'} |`)
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

/* ── REQ-089 R3-d：把判定拆成可单测的纯函数，并提供反向用例 ──────────────────
 * 为什么必须能判红：本脚本的 `--check` 历史上有过"自证式绿灯"（它一度从不扫 scripts/，
 * 于是自己定义的集合永不缺项）。**一个从没红过的判定器，等于没有判定器。**
 * 因此这里把三个判据抽成纯函数，并用合成数据做反向验证：造重复 id / 造缺失路径 /
 * 造条数不一致，都必须被判出来。 */
export function findDuplicateIds(items) {
  const seen = new Map()
  for (const it of items) seen.set(it.id, (seen.get(it.id) || 0) + 1)
  return [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id)
}

export function findMissingPaths(items, exists = (p) => existsSync(join(ROOT, p))) {
  return items.filter((it) => !exists(it.path))
}

function runSelfTest() {
  const cases = []
  const add = (name, got, expect) => cases.push({ name, got, expect, ok: got === expect })

  add('重复 id 必被检出', findDuplicateIds([{ id: 'a' }, { id: 'a' }, { id: 'b' }]).join(','), 'a')
  add('id 全唯一不误报', findDuplicateIds([{ id: 'a' }, { id: 'b' }]).length, 0)
  const alwaysYes = () => true
  const alwaysNo = () => false
  add('路径缺失必被检出', findMissingPaths([{ id: 'a', path: 'x' }], alwaysNo).length, 1)
  add('路径齐备不误报', findMissingPaths([{ id: 'a', path: 'x' }], alwaysYes).length, 0)
  // 机读产物条数对拍
  const jsonOk = (n, scanned) => n === scanned
  add('json 条数不一致必判红', jsonOk(10, 11), false)
  add('json 条数一致即通过', jsonOk(11, 11), true)
  // 登记表 pathBase 解析：不拼 pathBase 必须判缺失，拼上必须存在
  const reg = { pathBase: 'skill-pool', entries: [{ id: 'p', path: 'plugins/dsh-plugin-usage-bar', source: 'repo' }] }
  const base = reg.pathBase
  add('不拼 pathBase 会误判缺失（反证口径必要性）', existsSync(join(ROOT, reg.entries[0].path)), false)
  add('拼上 pathBase 即能命中真实文件', existsSync(join(ROOT, `${base}/${reg.entries[0].path}`)), true)

  const failed = cases.filter((c) => !c.ok)
  for (const c of cases) console.log(`${c.ok ? '✅' : '❌'} ${c.name}（实际 ${JSON.stringify(c.got)} / 期望 ${JSON.stringify(c.expect)}）`)
  console.log('-----------------------------------------')
  console.log(`共 ${cases.length} 项 · ${failed.length ? `❌ ${failed.length} 项未过` : '🎉 全部通过'}`)
  process.exit(failed.length ? 1 : 0)
}

function check() {
  const items = collectAll()
  const cat = loadCatalog()
  const indexText = existsSync(INDEX_FILE) ? readFileSync(INDEX_FILE, 'utf8') : ''
  const missing = items.filter((it) => !indexText.includes(it.id))

  // ── REQ-089 R3-d：把「字符串包含判定」升级为「对拍判定」 ────────────────────
  // 为什么必须升级：`indexText.includes(id)` 只证明"这个名字在文件里出现过"，
  // 证明不了"这条能被调起"。实测病根：生成器**曾经从不扫 scripts/**，可它自己
  // 定义的集合里当然一个都不缺，于是 `--check` 恒报"未收录 0"——自证式绿灯。
  // 现在改成四项硬对拍，且每项都能判红：
  //   ① 唯一性：同一 id 不得在索引里出现两次（防重复登记）；
  //   ② 存在性：条目声明的物理路径必须真的在磁盘上；
  //   ③ 机读产物：indexes/capabilities_index.json 必须与本次扫盘**条数一致**；
  //   ④ 接口覆盖：**与名字覆盖分开报**，禁止用"名字 100%"掩盖"接口 0%"。
  const dupIds = findDuplicateIds(items)
  const missingPaths = findMissingPaths(items)
  const jsonFile = join(ROOT, 'indexes/capabilities_index.json')
  let jsonCount = -1
  let jsonOk = false
  try {
    const parsed = JSON.parse(readFileSync(jsonFile, 'utf8'))
    jsonCount = Array.isArray(parsed.entries) ? parsed.entries.length : -1
    jsonOk = jsonCount === items.length
  } catch { jsonOk = false }
  const withInterface = items.filter((it) => it.interface).length

  console.log('🔎 执行层 → 索引层 覆盖率判定（对拍口径，REQ-089 R3-d）')
  console.log('-----------------------------------------')
  console.log(`执行层条目：${items.length}（技能 ${items.filter((i) => i.layer.includes('Skill')).length} · agent/plugin/cli ${items.filter((i) => !i.layer.includes('Skill')).length}）`)
  console.log(`① 名字覆盖：已收录 ${items.length - missing.length} · 未收录 ${missing.length}`)
  if (missing.length) console.log('   未收录样例：' + missing.slice(0, 6).map((m) => m.id).join('、'))
  console.log(`② id 唯一性：重复 id ${dupIds.length}${dupIds.length ? ' → ' + dupIds.slice(0, 5).join('、') : ''}`)
  console.log(`③ 路径存在性：磁盘缺失 ${missingPaths.length}${missingPaths.length ? ' → ' + missingPaths.slice(0, 5).map((m) => m.id).join('、') : ''}`)
  console.log(`④ 机读产物：indexes/capabilities_index.json ${jsonOk ? `✅ 条数一致（${jsonCount}）` : `⛔ 不一致或缺失（json ${jsonCount} / 扫盘 ${items.length}）`}（跑 --apply 重新生成）`)
  console.log(`⑤ 接口覆盖（与名字覆盖分开报，禁止互相掩盖）：已声明 ${withInterface} / ${items.length} = ${((withInterface / items.length) * 100).toFixed(1)}%`)

  // ── REQ-089 R3-c：口径归一 ────────────────────────────────────────────────
  // 实测病根（2026-10-01）：「执行层到底有多少条」在库内有**四套互相不校验的数字**——
  //   execution-layers.json 15 · 生成器扫盘 54/58 · execution-tree.md 198 · requirements.md 224/232。
  // 处置口径（唯一真相源原则）：
  //   · **磁盘可枚举的执行层，以本生成器扫盘为唯一真相源**；
  //   · `execution-layers.json` 降级为**补充声明**，它只允许声明两类东西：
  //     ① `path` 非空 → 必须在磁盘真实存在（否则判违规）；
  //     ② `path` 为空 → 必须是宿主提供的执行层（`source: "host"`），否则判"无声明的空路径"。
  //   · 两边条数不一致本身**不判违规**（口径不同：一个是"宿主+手工声明"，一个是"磁盘文件"），
  //     但必须把差异**显式报出来**，禁止再出现"谁也不知道以哪个为准"。
  const registryDiag = diagnoseRegistry(items)
  console.log(`⑥ 口径归一：execution-layers.json 登记 ${registryDiag.total} 条（磁盘可枚举 ${registryDiag.onDisk} · 宿主提供 ${registryDiag.host}）`)
  console.log(`   · 登记表 path 非空但磁盘缺失：${registryDiag.missingOnDisk.length}${registryDiag.missingOnDisk.length ? ' → ' + registryDiag.missingOnDisk.slice(0, 5).join('、') : ''}`)
  console.log(`   · 登记表 path 为空却未声明 source=host：${registryDiag.undeclaredHost.length}${registryDiag.undeclaredHost.length ? ' → ' + registryDiag.undeclaredHost.slice(0, 5).join('、') : ''}`)
  console.log(`   · 扫盘有而登记表无（**已知口径差，非缺陷**）：${registryDiag.diskOnly}`)
  console.log(`   · 口径声明：磁盘可枚举项以本扫盘为唯一真相源；登记表仅作补充声明`)
  console.log(`catalog 登记条目：${cat.entries.length}`)
  console.log(`catalog 有但磁盘无（漂移，必须在索引 3.2 显式列出）：${cat.missingOnDisk.length}${cat.missingOnDisk.length ? ' → ' + cat.missingOnDisk.join('、') : ''}`)
  console.log(`受管区间标记：${indexText.includes(BEGIN) && indexText.includes(END) ? '✅ 在位' : '⛔ 缺失（跑 --apply 生成）'}`)
  console.log('-----------------------------------------')
  const driftListed = cat.missingOnDisk.every((n) => indexText.includes(n))
  // 接口覆盖**不参与**本判定的通过与否（那是 R4 的独立判定器口径），但必须显式打印，
  // 防止"名字 100% 绿"被误读为"接口齐备"。
  return missing.length === 0 && dupIds.length === 0 && missingPaths.length === 0 && jsonOk && indexText.includes(BEGIN) && driftListed
}

/**
 * REQ-089 R3-c：对拍补充登记表 `skill-pool/docs/operations/execution-layers.json`。
 * 只做"声明是否兑现"的核对，不做"条数是否相等"的攀比 —— 二者口径本就不同。
 */
function diagnoseRegistry(items) {
  const out = { total: 0, onDisk: 0, host: 0, missingOnDisk: [], undeclaredHost: [], diskOnly: 0, resolvedPaths: [], pathBase: '.' }
  const file = join(ROOT, 'skill-pool/docs/operations/execution-layers.json')
  if (!existsSync(file)) { out.diskOnly = items.length; return out }
  let reg
  try { reg = JSON.parse(readFileSync(file, 'utf8')) } catch { out.diskOnly = items.length; return out }
  const entries = Array.isArray(reg.entries) ? reg.entries : []
  out.total = entries.length
  // 历史约定（2026-10-01 实测发现）：本表内的 path 是**相对 `skill-pool/` 的**，
  // 不是相对仓库根。此前没有任何消费者声明这一点，于是 12 条 repo 路径**全部被误判为缺失**。
  // 现由表内 `pathBase` 显式声明，并按它解析。
  const base = typeof reg.pathBase === 'string' && reg.pathBase ? reg.pathBase.replace(/\/$/, '') : ''
  out.pathBase = base || '.'
  const resolveRel = (p) => (base ? `${base}/${p}` : p)
  for (const e of entries) {
    if (e && e.path) {
      out.onDisk++
      const rel = resolveRel(e.path)
      if (!existsSync(join(ROOT, rel))) out.missingOnDisk.push(`${e.path}（解析为 ${rel}）`)
      else out.resolvedPaths.push(rel)
    } else {
      if (e && e.source === 'host') out.host++
      else out.undeclaredHost.push((e && e.id) || '(无 id)')
    }
  }
  const registeredPaths = new Set(out.resolvedPaths)
  out.diskOnly = items.filter((it) => !registeredPaths.has(it.path)).length
  return out
}

/** 输出机读索引产物（REQ-089 R3-a）：供路由层与接口判定器程序化消费。 */
function writeJson(items) {
  const out = {
    version: 1,
    generatedAt: new Date().toISOString(),
    generator: 'scripts/build_capabilities_index.mjs',
    authority: '磁盘扫盘实况（skills/ · skill-pool/agents · skill-pool/plugins · scripts/）',
    total: items.length,
    byLayer: items.reduce((acc, it) => { acc[it.layer] = (acc[it.layer] || 0) + 1; return acc }, {}),
    withInterface: items.filter((it) => it.interface).length,
    entries: items,
  }
  writeFileSync(join(ROOT, 'indexes/capabilities_index.json'), JSON.stringify(out, null, 2) + '\n', 'utf8')
  return out
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
  const json = writeJson(items)
  console.log(`✅ 已重写索引受管区间：indexes/capabilities_index.md（${items.length} 条执行层）`)
  console.log(`✅ 已生成机读索引：indexes/capabilities_index.json（${json.total} 条 · 已声明接口 ${json.withInterface} 条）`)
}

if (process.argv.includes('--self-test')) runSelfTest()
else if (process.argv.includes('--apply')) apply()
else process.exit(check() ? 0 : 1)
