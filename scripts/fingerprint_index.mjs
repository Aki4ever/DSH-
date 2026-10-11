#!/usr/bin/env node
/**
 * ==============================================================================
 * 全域资产指纹索引  fingerprint_index.mjs
 * ==============================================================================
 * 解决的问题（REQ-091 / R5）：
 *   `scripts/fingerprint_audit.sh` 早就会算全域资产的 sha256，但产物是**一张给人看的
 *   Markdown 表**（`memory/asset_fingerprint_ledger.md`）。于是：
 *     · 机器读不了它 —— 每次想判"某文件改没改"都得重新扫全盘；
 *     · 也没有"上次快照"可比 —— 只能看"版本号新不新鲜"，看不到"字节有没有变"；
 *     · 实测 167/234 个资产根本没声明版本（⚪ TIER-2），对它们而言"新不新鲜"恒不可判。
 *   本脚本补的就是这三件事：**机读产物 + 逐文件漂移 + 查询入口**。
 *
 * 与既有机制的关系（**不许造第二套算法**）：
 *   · 扫描口径（受管目录、排除规则）**复用** `fingerprint_audit.sh` 的定义，
 *     由 `MANAGED_DIRS` / `MANAGED_ROOT_FILES` 逐字解析出来，改那边即改这边；
 *   · 指纹算法只有一种：sha256（短 8 位给人读，全长给机器对拍）；
 *   · 本脚本产生的漂移数据可回喂给 `fingerprint_audit.sh`（它读 JSON 索引，不再自己扫）。
 *
 * 用法：
 *   node scripts/fingerprint_index.mjs --scan            # 重算并写 indexes/fingerprint_index.json
 *   node scripts/fingerprint_index.mjs --check           # 判定：索引在场 + 与磁盘一致（漂移 0）
 *   node scripts/fingerprint_index.mjs --drift           # 只看漂移清单（改了哪些文件）
 *   node scripts/fingerprint_index.mjs --query <相对路径> # 一眼看"这个文件改没改"
 *   node scripts/fingerprint_index.mjs selftest          # 自检（含反向用例）
 *
 * 退出码：0 通过 / 1 判定不过（漂移非空 或 索引缺失）/ 2 用法错误 / 3 查询不到该路径
 * ==============================================================================
 */

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, readdirSync, rmSync, renameSync, realpathSync, openSync, closeSync, fstatSync, constants } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { join, dirname, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { withLockSync } from './lib/atomic_lock.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const AUDIT_SH = join(HERE, 'fingerprint_audit.sh')
const INDEX_PATH = join(REPO_ROOT, 'indexes', 'fingerprint_index.json')
const SCHEMA_VERSION = 1

/**
 * 从 `fingerprint_audit.sh` 里解析受管目录清单。
 * 为什么解析而不是自己写一份：写两份必然是"改一处漏一处"，本工程已有实测教训。
 * 解析失败时**抛错**，绝不静默退化成"只扫几个目录"（那会让覆盖率虚高）。
 */
export function readManagedSpec(auditText = readFileSync(AUDIT_SH, 'utf8')) {
  const grab = (name) => {
    const m = auditText.match(new RegExp(`${name}=\\(([\\s\\S]*?)\\)`, 'm'))
    if (!m) return null
    return m[1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.replace(/^["']|["']$/g, ''))
  }
  const dirs = grab('MANAGED_DIRS')
  const rootFiles = grab('MANAGED_ROOT_FILES')
  if (!dirs || !rootFiles) throw new Error('解析 fingerprint_audit.sh 的受管清单失败（MANAGED_DIRS / MANAGED_ROOT_FILES 找不到）')
  return { dirs, rootFiles }
}

/**
 * 与审计脚本**逐字对齐**的排除规则。
 * 口径来源：`fingerprint_audit.sh` 的 `collect_assets()`：
 *   排除 `assets/*`、`*.png`、`*.svg`、`*.tmp`、`*~`、`ai-control/reports/*`。
 * 为什么必须对齐：两边若各有一套口径，"受管资产数"就会出现两个数字（实测：256 vs 238），
 * 而两个数字都能自证合理 —— 正是本工程最忌讳的"同一事实两种说法"。
 */
const EXCLUDE_DIRS = new Set(['.git', 'node_modules', '.cache', '.dsh_locks', 'dist', 'build'])
// `.DS_Store` 由 macOS 秒级回填（G2 门禁已因此长期闪烁），纳入指纹监控会造成**永久假漂移**；
// 审计脚本的 case 通配 `*~` 并不匹配它（实测 KEPT），故这里是**有意的口径修正**，
// 而不是"抄漏了一条"。两侧必须一致：审计脚本改为消费本索引，不再自己扫盘。
const EXCLUDE_SUFFIX = ['.png', '.svg', '.tmp', '~', '.DS_Store']
const EXCLUDE_PREFIX = [
  'assets/',
  'ai-control/reports/',
  // API 文档正文镜像：由 `scripts/sync_api_docs.mjs` 从官方站抓取生成，
  // 每次同步都会整体变化 —— 纳入指纹监控会造成**永久假漂移**。
  // 它的新鲜度由 `knowledge/api/deepseek/index.json` 的**逐页 sha256** 负责
  // （那是它自己的、更贴切的真相源），此处刻意不重复纳管。
  'knowledge/api/deepseek/pages/',
]
/**
 * 自产物排除（**必须排除，否则永远判不过**）。
 * 为什么：这两个文件是**本脚本的输出**，把输出纳入输入 =
 * "写一次就漂移一次"——`--check` 会永远报过期，指标随即失效、没人再看。
 * 实测：第一版没排除，`--check` 立刻报 2 处漂移（index 自身 + 台账）。
 */
const EXCLUDE_EXACT = ['indexes/fingerprint_index.json', 'memory/asset_fingerprint_ledger.md']

/** 是否属于受管资产（纯函数，便于反向用例）。 */
export function isManaged(relPath, spec = readManagedSpec()) {
  const p = relPath.split(sep).join('/')
  if (p.split('/').some((seg) => EXCLUDE_DIRS.has(seg))) return false
  if (EXCLUDE_SUFFIX.some((s) => p.endsWith(s))) return false
  if (EXCLUDE_PREFIX.some((pre) => p.startsWith(pre))) return false
  if (EXCLUDE_EXACT.includes(p)) return false
  if (spec.rootFiles.includes(p)) return true
  return spec.dirs.some((d) => p === d || p.startsWith(d + '/'))
}

/** 列出受管资产相对路径（排序稳定，便于对拍）。 */
export function collectManaged(spec = readManagedSpec()) {
  const out = []
  const walk = (absDir, relDir) => {
    let entries
    try { entries = readdirSync(absDir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const rel = relDir ? `${relDir}/${e.name}` : e.name
      if (e.isDirectory()) {
        if (EXCLUDE_DIRS.has(e.name)) continue
        walk(join(absDir, e.name), rel)
      } else if (e.isFile()) {
        if (!isManaged(rel, spec)) continue
        out.push(rel)
      }
    }
  }
  for (const d of spec.dirs) walk(join(REPO_ROOT, d), d)
  for (const f of spec.rootFiles) if (existsSync(join(REPO_ROOT, f))) out.push(f)
  return [...new Set(out)].sort()
}

/** 单文件指标（短指纹给人读 / 全长给机器对拍 / 字节数 / mtime）。 */
export function hashFile(relPath) {
  const abs = join(REPO_ROOT, relPath)
  const buf = readFileSync(abs)
  const full = createHash('sha256').update(buf).digest('hex')
  const st = statSync(abs)
  return { path: relPath, short: full.slice(0, 8), sha256: full, bytes: buf.length, mtime: st.mtime.toISOString() }
}

/** 扫描全量受管资产 → 索引对象。 */
export function buildIndex({ at = new Date().toISOString() } = {}) {
  const spec = readManagedSpec()
  const files = collectManaged(spec).map((rel) => hashFile(rel))
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: at,
    tool: 'scripts/fingerprint_index.mjs',
    algorithm: 'sha256',
    shortLength: 8,
    managedDirs: spec.dirs,
    managedRootFiles: spec.rootFiles,
    count: files.length,
    files,
  }
}

/** 读现有索引（不存在或损坏 → null，由调用方决定怎么报）。 */
export function readIndex(path = INDEX_PATH) {
  if (!existsSync(path)) return null
  try {
    const j = JSON.parse(readFileSync(path, 'utf8'))
    if (!j || !Array.isArray(j.files)) return null
    return j
  } catch { return null }
}

/**
 * 对比索引与磁盘实况。
 * @returns {{drift:Array, missing:Array, added:Array, count:number, indexed:number}}
 */
export function diffIndex(index, current = null) {
  const cur = current || buildIndex({ at: index ? index.generatedAt : new Date().toISOString() })
  const byPath = new Map((index ? index.files : []).map((f) => [f.path, f]))
  const curByPath = new Map(cur.files.map((f) => [f.path, f]))
  const drift = []
  const missing = []
  const added = []
  for (const [p, old] of byPath) {
    const now = curByPath.get(p)
    if (!now) { missing.push({ path: p }); continue }
    if (now.sha256 !== old.sha256) drift.push({ path: p, recorded: old.short, now: now.short, bytesBefore: old.bytes, bytesAfter: now.bytes })
  }
  for (const [p, now] of curByPath) if (!byPath.has(p)) added.push({ path: p, short: now.short })
  return { drift, missing, added, count: now_count(cur), indexed: byPath.size }
}
function now_count(cur) { return cur.files.length }

function sameFileSnapshot(a, b) {
  return ['dev', 'ino', 'size', 'mtimeMs', 'ctimeMs'].every(k => a[k] === b[k])
}

/** 固定描述符读取，拒绝末级符号链接与读取期间变动。非恶意同用户的完备隔离。 */
export function stableFingerprint(path) {
  if (typeof path !== 'string' || !isManaged(path) || path.split('/').some(p => !p || p === '..' || p === '.')) throw new Error('指纹路径非法')
  const absolute = join(realpathSync(REPO_ROOT), path)
  const fd = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const before = fstatSync(fd)
    if (!before.isFile()) throw new Error('指纹目标不是普通文件')
    const bytes = readFileSync(fd)
    const after = fstatSync(fd), named = statSync(absolute)
    if (!sameFileSnapshot(before, after) || !sameFileSnapshot(after, named) || bytes.length !== after.size) throw new Error('指纹读取期间文件变化')
    if (relative(realpathSync(REPO_ROOT), realpathSync(absolute)).split(sep).join('/') !== path) throw new Error('指纹路径解析变化')
    const full = createHash('sha256').update(bytes).digest('hex')
    return { path, short: full.slice(0, 8), sha256: full, bytes: bytes.length, mtime: after.mtime.toISOString() }
  } finally { closeSync(fd) }
}

/** 从真实磁盘构造定向增量提案；不写盘、不接受调用方填充哈希。 */
export function proposeMissingFingerprints(index, paths) {
  if (!Array.isArray(paths) || !paths.length || paths.length > 100) throw new Error('增量提案路径预算非法')
  const root = realpathSync(REPO_ROOT)
  const records = paths.map(path => {
    if (typeof path !== 'string' || !isManaged(path) || path.split('/').some(p => !p || p === '..' || p === '.')) throw new Error('增量路径非法')
    const absolute = realpathSync(join(root, path))
    if (relative(root, absolute).split(sep).join('/') !== path || !statSync(absolute).isFile()) throw new Error('增量路径逃逸或符号链接别名')
    return stableFingerprint(path)
  })
  return appendMissingFingerprints(index, records)
}

/** 定向增量登记：仅构造新对象，不写盘、不刷新旧条目、不抹除漂移。 */
export function appendMissingFingerprints(index, records, { at = new Date().toISOString() } = {}) {
  if (!index || !Array.isArray(index.files) || !Array.isArray(records) || !records.length) throw new Error('增量登记输入非法')
  if (index.amendments !== undefined && !Array.isArray(index.amendments)) throw new Error('原索引增量历史非法')
  if (index.files.some(f => !f || typeof f.path !== 'string' || !f.path)) throw new Error('原索引条目非法，拒绝修改')
  if (index.count !== index.files.length) throw new Error('原索引计数不一致，拒绝静默修正')
  const known = new Set(index.files.map(f => f.path))
  if (known.size !== index.files.length) throw new Error('原索引路径重复，拒绝归一化历史')
  for (const row of records) {
    if (!row || typeof row.path !== 'string' || !isManaged(row.path) || row.path.split('/').some(p => p === '..' || p === '.')) throw new Error('路径不属于受管资产')
    if (known.has(row.path)) throw new Error(`不得更新已有锚点或重复登记: ${row.path}`)
    if (!/^[a-f0-9]{64}$/.test(row.sha256) || row.short !== row.sha256.slice(0, 8) || !Number.isSafeInteger(row.bytes) || row.bytes < 0 || !Number.isFinite(Date.parse(row.mtime))) throw new Error('增量指纹指标非法')
    known.add(row.path)
  }
  if (!Number.isFinite(Date.parse(at))) throw new Error('增量登记时间非法')
  const next = JSON.parse(JSON.stringify(index))
  next.files.push(...JSON.parse(JSON.stringify(records)))
  next.count = next.files.length
  next.amendments = [...(next.amendments || []), { at, kind: 'append-missing-only', paths: records.map(r => r.path) }]
  // generatedAt保留原全量扫描时间，追加不是全量重验。
  return next
}

/**
 * ⚠️ 已**停用**（保留函数仅供历史对照，不再被任何命令调用）。
 *
 * 停用原因（冲突裁决，必须留痕）：`scripts/fingerprint_audit.sh --scan` 也会写
 * `memory/asset_fingerprint_ledger.md`，而且它写得更好（带 🟢/🟡/⚪ 新鲜度分级）。
 * 两个生成器写同一个文件 = 谁后跑谁覆盖，是典型的"两套写法抢一个真相源"。
 * 裁决：**人读台账归审计脚本**（分级视图），**机读判定归本脚本的 JSON 索引**；
 * 审计脚本反过来消费本索引取受管清单，两者不再各扫一遍盘。
 *
 * 刷新人读台账 `memory/asset_fingerprint_ledger.md`。
 * 口径：台账表体由本索引生成（**加一条"索引指针"**），不再由人手工维护。
 * 为什么仍保留 Markdown：它是"给人翻"的入口；机读判定一律以 JSON 索引为准（单一真相源）。
 */
export function writeLedger(index, path = join(REPO_ROOT, 'memory', 'asset_fingerprint_ledger.md')) {
  const lines = []
  lines.push('# 全域资产数字指纹与新鲜度审计台账 (Asset Fingerprint Ledger)')
  lines.push('')
  lines.push('> ### 🏷️ **版本信息与实施追踪**')
  lines.push('> - **当前台账版本**：`v4.26.0`')
  lines.push('> - **机读真相源**：[`indexes/fingerprint_index.json`](../indexes/fingerprint_index.json)（**判定以它为准**，本表只是人读视图）')
  lines.push('> - **生成器**：[`scripts/fingerprint_index.mjs`](../scripts/fingerprint_index.mjs)（`--scan` 重算）')
  lines.push(`> - **最后全盘扫描时间**：${index.generatedAt}`)
  lines.push('')
  lines.push('本文档记录工程全域受管资产（规则、知识库、架构索引、工程模板、自动化脚本与需求台账）的 **sha256 指纹**、')
  lines.push('**最后修改时间**与**字节数**，用于"某个文件到底改没改"的快速自查。')
  lines.push('')
  lines.push('```bash')
  lines.push('node scripts/fingerprint_index.mjs --query docs/requirements.md   # 一眼看某文件改没改')
  lines.push('node scripts/fingerprint_index.mjs --drift                       # 全部漂移清单')
  lines.push('node scripts/fingerprint_index.mjs --check                       # 索引与磁盘是否逐字节一致')
  lines.push('```')
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 🧬 全域受管资产指纹表')
  lines.push('')
  lines.push('| 资产相对路径 | 短指纹 (sha256) | 最后修改时间 | 字节数 |')
  lines.push('| :--- | :---: | :---: | ---: |')
  for (const f of index.files) lines.push(`| \`${f.path}\` | \`${f.short}\` | ${f.mtime.replace('T', ' ').slice(0, 16)} | ${f.bytes} |`)
  lines.push('')
  lines.push(`> 共 **${index.count}** 个受管资产 · 算法 sha256 · 短指纹取前 8 位（全长哈希在 JSON 索引里）`)
  lines.push('')
  const tmp = `${path}.tmp-${process.pid}`
  writeFileSync(tmp, lines.join('\n'), 'utf8')
  writeFileSync(path, readFileSync(tmp, 'utf8'), 'utf8')
  rmSync(tmp, { force: true })
  return path
}

/** 原子 + 加锁写索引（整文件重写，必须串行）。 */
export function writeIndex(index, path = INDEX_PATH) {
  mkdirSync(dirname(path), { recursive: true })
  withLockSync('assets:fingerprint_index', () => {
    const tmp = `${path}.tmp-${process.pid}-${Date.now()}`
    if (realpathSync(dirname(tmp)) !== realpathSync(dirname(path)) || !path.endsWith('.json')) throw new Error('指纹发布路径非法')
    const payload = `${JSON.stringify(index, null, 2)}\n`
    writeFileSync(tmp, payload, { encoding: 'utf8', flag: 'wx' })
    if (readFileSync(tmp, 'utf8') !== payload) throw new Error('指纹暂存回读不一致')
    // 不先删除旧索引；同目录原子替换，失败保留旧索引。
    renameSync(tmp, path)
  }, { why: '指纹索引整文件重写', staleMs: 30_000 })
  return path
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function cmdScan() {
  const idx = buildIndex()
  const old = readIndex()
  writeIndex(idx)
  const d = old ? diffIndex(old, idx) : { drift: [], missing: [], added: [], indexed: 0, count: idx.count }
  console.log(`🧬 指纹索引已更新：${idx.count} 个受管资产 → ${relative(REPO_ROOT, INDEX_PATH)}`)
  if (!old) {
    console.log('   （首次生成，无上一次快照可比）')
  } else {
    console.log(`   相对上次快照：漂移 ${d.drift.length} · 消失 ${d.missing.length} · 新增 ${d.added.length}`)
    for (const x of d.drift.slice(0, 20)) console.log(`   ~ ${x.path}  ${x.recorded} → ${x.now}`)
    for (const x of d.missing.slice(0, 10)) console.log(`   - ${x.path}（已不存在）`)
    for (const x of d.added.slice(0, 10)) console.log(`   + ${x.path}  ${x.short}`)
  }
  return 0
}

function cmdCheck() {
  const index = readIndex()
  if (!index) {
    console.error('⛔ 指纹索引不存在：先跑 node scripts/fingerprint_index.mjs --scan')
    return 1
  }
  const d = diffIndex(index)
  console.log('🧬 指纹索引判定')
  console.log('-----------------------------------------')
  console.log(`索引资产：${d.indexed} · 磁盘资产：${d.count}`)
  console.log(`漂移 ${d.drift.length} · 消失 ${d.missing.length} · 新增 ${d.added.length}`)
  for (const x of d.drift.slice(0, 20)) console.log(`  ~ ${x.path}  ${x.recorded} → ${x.now}`)
  for (const x of d.missing.slice(0, 10)) console.log(`  - ${x.path}（磁盘已无）`)
  for (const x of d.added.slice(0, 10)) console.log(`  + ${x.path}（索引未收录）`)
  const clean = d.drift.length === 0 && d.missing.length === 0 && d.added.length === 0
  console.log('-----------------------------------------')
  console.log(clean ? '✅ 通过：索引与磁盘逐字节一致' : '⛔ 不通过：索引已过期（跑 --scan 更新，或说明为何不改）')
  return clean ? 0 : 1
}

function cmdDrift() {
  const index = readIndex()
  if (!index) { console.error('⛔ 指纹索引不存在：先跑 --scan'); return 1 }
  const d = diffIndex(index)
  console.log(JSON.stringify({ drift: d.drift, missing: d.missing, added: d.added }, null, 2))
  return d.drift.length + d.missing.length + d.added.length === 0 ? 0 : 1
}

function cmdQuery(rel) {
  if (!rel) { console.error('用法：fingerprint_index.mjs --query <相对路径>'); return 2 }
  const index = readIndex()
  if (!index) { console.error('⛔ 指纹索引不存在：先跑 --scan'); return 1 }
  const norm = rel.split(sep).join('/')
  const rec = index.files.find((f) => f.path === norm)
  if (!rec) { console.error(`⛔ 索引中没有该资产：${norm}（可能未纳管，或需先 --scan）`); return 3 }
  const abs = join(REPO_ROOT, norm)
  if (!existsSync(abs)) { console.log(`⛔ ${norm}\n   索引有记录，但磁盘上已不存在（被删除或改名）`); return 1 }
  const now = hashFile(norm)
  const same = now.sha256 === rec.sha256
  console.log(`${same ? '✅ 未改动' : '🟡 已改动'}：${norm}`)
  console.log(`   索引指纹：${rec.short}  (${rec.mtime})`)
  console.log(`   磁盘指纹：${now.short}  (${now.mtime})`)
  if (!same) console.log(`   字节：${rec.bytes} → ${now.bytes}`)
  return same ? 0 : 1
}

function cmdSelftest() {
  let pass = 0, fail = 0
  const chk = (n, c, e = '') => { if (c) { pass++; console.log(`  ✅ ${n}${e ? ' · ' + e : ''}`) } else { fail++; console.log(`  ❌ ${n}${e ? ' · ' + e : ''}`) } }
  console.log('🧪 fingerprint_index 自检')
  const spec = readManagedSpec()
  chk('受管目录解析成功', spec.dirs.length > 0, `${spec.dirs.length} 个目录 + ${spec.rootFiles.length} 个根文件`)

  chk('正向：受管目录内文件判为受管', isManaged('scripts/control_gates.sh', spec) === true)
  chk('正向：受管根文件判为受管', isManaged('AGENTS.md', spec) === true)
  chk('反向：node_modules 内文件不受管', isManaged('scripts/node_modules/x.js', spec) === false)
  chk('反向：.git 内文件不受管', isManaged('.git/config', spec) === false)
  chk('反向：.dsh_locks 内文件不受管', isManaged('.dsh_locks/state:x/metadata.json', spec) === false)
  chk('反向：路径前缀伪装不算受管（scriptsXYZ ≠ scripts）', isManaged('scriptsXYZ/a.sh', spec) === false)
  chk('反向：自产物（指纹索引）不受管，否则写完即漂移', isManaged('indexes/fingerprint_index.json', spec) === false)
  chk('反向：自产物（人读台账）不受管', isManaged('memory/asset_fingerprint_ledger.md', spec) === false)
  chk('反向：抓取生成物（API 正文镜像）不受管，否则每次同步都假漂移',
    isManaged('knowledge/api/deepseek/pages/zh-cn__quick_start__pricing.md', spec) === false)

  const cur = buildIndex()
  chk('扫描到资产', cur.count > 100, `${cur.count} 个`)

  // 反向用例：篡改一条记录的指纹 → diff 必须报漂移
  const tampered = JSON.parse(JSON.stringify(cur))
  tampered.files[0].sha256 = 'deadbeef'.repeat(8)
  tampered.files[0].short = 'deadbeef'
  const d1 = diffIndex(tampered, cur)
  chk('反向用例：篡改指纹 → 检出漂移', d1.drift.length === 1, `漂移 ${d1.drift.length}`)

  // 反向用例：删掉一条记录 → diff 必须报"新增"
  const dropped = JSON.parse(JSON.stringify(cur))
  dropped.files = dropped.files.slice(1)
  const d2 = diffIndex(dropped, cur)
  chk('反向用例：索引缺一条 → 检出新增', d2.added.length === 1, `新增 ${d2.added.length}`)

  // 反向用例：索引多条不存在的 → 检出消失
  const ghost = JSON.parse(JSON.stringify(cur))
  ghost.files.push({ path: 'scripts/__ghost__.mjs', short: '00000000', sha256: '0'.repeat(64), bytes: 1, mtime: new Date(0).toISOString() })
  const d3 = diffIndex(ghost, cur)
  chk('反向用例：索引有磁盘无 → 检出消失', d3.missing.length === 1, `消失 ${d3.missing.length}`)

  const base = { generatedAt: cur.generatedAt, files: [cur.files[0]], count: 1 }
  const baseBefore = JSON.stringify(base)
  const appended = appendMissingFingerprints(base, [cur.files[1]])
  chk('增量：原对象不修改', JSON.stringify(base) === baseBefore)
  chk('增量：旧锚点不刷新', JSON.stringify(appended.files[0]) === JSON.stringify(base.files[0]))
  chk('增量：不冒充全盘重验', appended.generatedAt === base.generatedAt && appended.count === 2)
  const rejects = fn => { try { fn(); return false } catch { return true } }
  chk('增量：已有锚点拒绝', rejects(() => appendMissingFingerprints(base, [cur.files[0]])))
  chk('增量：重复新路径拒绝', rejects(() => appendMissingFingerprints(base, [cur.files[1], cur.files[1]])))
  chk('增量：路径逃逸拒绝', rejects(() => appendMissingFingerprints(base, [{ ...cur.files[1], path: 'scripts/../outside.mjs' }])))
  chk('增量：假哈希拒绝', rejects(() => appendMissingFingerprints(base, [{ ...cur.files[1], sha256: 'fake' }])))
  chk('增量：旧计数不一致拒绝', rejects(() => appendMissingFingerprints({ ...base, count: 9 }, [cur.files[1]])))
  chk('增量：旧历史形状非法拒绝', rejects(() => appendMissingFingerprints({ ...base, amendments: 'bad' }, [cur.files[1]])))
  chk('增量：旧空条目拒绝', rejects(() => appendMissingFingerprints({ ...base, files: [null] }, [cur.files[1]])))

  const publicationDir = join(tmpdir(), `dsh-fingerprint-publish-${process.pid}-${Date.now()}`)
  mkdirSync(publicationDir)
  const publicationPath = join(publicationDir, 'index.json')
  writeIndex(base, publicationPath)
  writeIndex(appended, publicationPath)
  chk('原子发布：真实临时索引替换后完整', JSON.stringify(readIndex(publicationPath)) === JSON.stringify(appended))
  console.log(`  ℹ️ 发布测试临时产物保留：${publicationPath}`)
  const snapshot = { dev: 1, ino: 2, size: 3, mtimeMs: 4, ctimeMs: 5 }
  chk('稳定读取：同一快照接受', sameFileSnapshot(snapshot, { ...snapshot }))
  for (const key of Object.keys(snapshot)) chk(`稳定读取：${key}变化拒绝`, !sameFileSnapshot(snapshot, { ...snapshot, [key]: 99 }))
  chk('稳定读取：真实文件哈希一致', stableFingerprint(cur.files[1].path).sha256 === hashFile(cur.files[1].path).sha256)
  const proposed = proposeMissingFingerprints(base, [cur.files[1].path])
  chk('磁盘提案：哈希来自真实文件', proposed.files[1].sha256 === hashFile(cur.files[1].path).sha256)
  chk('磁盘提案：旧对象不修改', JSON.stringify(base) === baseBefore)
  chk('磁盘提案：目录拒绝', rejects(() => proposeMissingFingerprints(base, ['scripts'])))
  chk('磁盘提案：逃逸路径拒绝', rejects(() => proposeMissingFingerprints(base, ['scripts/../AGENTS.md'])))

  console.log('-----------------------------------------')
  console.log(`共 ${pass + fail} 项 · ${fail === 0 ? '🎉 全部通过' : `❌ ${fail} 项未过`}`)
  return fail === 0 ? 0 : 1
}

function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--append-missing') {
    try {
      if (args.length < 2) throw new Error('需显式指定新增路径')
      withLockSync('assets:fingerprint_index', () => {
        const original = readFileSync(INDEX_PATH, 'utf8')
        const index = JSON.parse(original)
        const next = proposeMissingFingerprints(index, args.slice(1))
        const newRows = next.files.slice(index.files.length)
        for (const row of newRows) {
          const current = stableFingerprint(row.path)
          if (JSON.stringify(current) !== JSON.stringify(row)) throw new Error('新增资产在登记期间变化')
        }
        if (readFileSync(INDEX_PATH, 'utf8') !== original) throw new Error('索引在登记期间变化，拒绝覆盖')
        if (JSON.stringify(next.files.slice(0, index.files.length)) !== JSON.stringify(index.files)) throw new Error('旧锚点发生变化，拒绝登记')
        const tmp = `${INDEX_PATH}.append-${process.pid}-${Date.now()}.tmp`
        if (realpathSync(dirname(tmp)) !== realpathSync(dirname(INDEX_PATH))) throw new Error('发布路径非法')
        const payload = JSON.stringify(next, null, 2) + '\n'
        writeFileSync(tmp, payload, { encoding: 'utf8', flag: 'wx' })
        if (readFileSync(tmp, 'utf8') !== payload) throw new Error('暂存回读不一致')
        renameSync(tmp, INDEX_PATH)
        console.log(JSON.stringify({ mode: 'append-missing-only', preserved: index.files.length, appended: newRows.map(r => r.path), generatedAtPreserved: next.generatedAt }, null, 2))
      }, { why: '仅新增缺失指纹，保留旧锚点' })
      return 0
    } catch (e) { console.error(e.message); return 2 }
  }
  if (args[0] === '--propose-missing') {
    try {
      if (args.length < 2) throw new Error('需显式指定缺失路径，不自动追加全部新增资产')
      const index = readIndex()
      if (!index) throw new Error('权威索引不可读，拒绝创建替代索引')
      const next = proposeMissingFingerprints(index, args.slice(1))
      console.log(JSON.stringify({ mode: 'proposal-only', writes: false, originalGeneratedAt: index.generatedAt, preservedCount: index.files.length, proposed: next.files.slice(index.files.length), amendment: next.amendments.at(-1) }, null, 2))
      return 0
    } catch (e) { console.error(e.message); return 2 }
  }
  if (args.includes('selftest')) return cmdSelftest()
  if (args.includes('--scan')) return cmdScan()
  if (args.includes('--drift')) return cmdDrift()
  const qi = args.indexOf('--query')
  if (qi >= 0) return cmdQuery(args[qi + 1])
  if (args.includes('--check')) return cmdCheck()
  console.error('用法：fingerprint_index.mjs <--scan|--check|--drift|--query 路径|selftest>')
  return 2
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isDirectRun) process.exit(main())
