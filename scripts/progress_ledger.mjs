#!/usr/bin/env node
/**
 * ==============================================================================
 * 迭代检测台账 (Progress Ledger) — REQ-087 / GCM-PHY · R2（含 R1-c 写后必读回）
 * ==============================================================================
 * 解决的问题（用户原话："给当前机制留有迭代检测机制，方便你自己看自己做了什么
 * 以及做到什么程度，让你清楚了解自己的真实物理进度，而不是空架子瞎吹"）：
 *   进度汇报历来靠"我说我做了"，没有任何东西能证伪。
 *
 * 本台账把"做了什么"降为**可证伪的物理事实**，每条记录四件套：
 *   · 文件物理锚点：改动后**重新从磁盘读回**算出的 sha256 + 行数 + 字节数；
 *   · 判定命令：这次改动凭什么说它成了；
 *   · 实跑退出码：命令**真的跑过**才有数，没跑不许编；
 *   · 回读断言：`--expect` 指定的内容必须能在改动后的文件里读到（S11 写后必读回）。
 *
 * 三个子命令回答三个问题：
 *   record  我做了什么      —— 落盘一条带物理锚点的记录
 *   report  做到哪一步      —— 一屏答完"做了什么 / 到哪一步 / 还差什么"
 *   check   有没有瞎吹      —— 漂移 = 0、未记录改动 = 0、判定全绿，否则退出码 1
 *
 * 判定口径（刻意只认磁盘）：
 *   · 漂移：台账里记的 sha256 ≠ 此刻磁盘上的 sha256（文件被改了却没重新记录）；
 *   · 未记录改动：`git status` 里的改动文件，不在台账任何一条记录里。
 *
 * 用法：
 *   node scripts/progress_ledger.mjs record --files a.md,b.mjs --judge "node x.mjs --check"
 *                                         [--expect "关键字"] [--task "会话标题"] [--note "说明"]
 *                                         [--req REQ-092] [--req-version v1.0.0]
 *   node scripts/progress_ledger.mjs report [--json]
 *   node scripts/progress_ledger.mjs check  [--json]
 *   node scripts/progress_ledger.mjs list   [--limit 20]
 *   node scripts/progress_ledger.mjs selftest
 * 退出码：0 达标；1 判定不过（漂移/未记录/判定失败）；2 用法错误；3 回读断言失败；4 判定命令失败
 * ==============================================================================
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, appendFileSync, readdirSync, rmSync, mkdtempSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const STATE_DIR = join(ROOT, 'ai-control', 'reports', 'state')
const LEDGER = join(STATE_DIR, 'progress_ledger.jsonl')
const LEDGER_VERSION = '1.0.0'
// 原子锁：与 scripts/lib/atomic_lock.mjs 同一把锁（唯一实现，禁止在本文件另写一套）
// eslint-disable-next-line import/no-unresolved
import { withLock } from './lib/atomic_lock.mjs'

// ── 判据防注入（REQ-103 / C3-a，2026-10-10 实测根因）────────────────────────
// 现象（磁盘实证，非推测）：台账 `progress_ledger.jsonl` 中已存在 3 条
//   `"judge":"node scripts/control_gates.sh check > /dev/null 2>&1; true"`
// 之类**恒真判据**——旧实现用 `execFileSync('bash', ['-c', judge])` 执行调用方字符串，
// 只取退出码，于是"判定命令"可以被写成永远成功。本机制最核心的主张
// "不认自述、认实跑证据"在台账层被一句话击穿。
//
// 处置（双闸）：
//   ① **执行侧**：判据不再交给 shell，改为**按空白切分为 argv 数组直调**（不走 `bash -c`）。
//      含 shell 元字符一律拒绝登记（退出码 2），从根上消灭注入面。
//   ② **判定侧**：对**历史已落盘**记录同样横向扫描"绕过式判据"（`; true` / `|| true` /
//      末尾管道吞码 等），命中即计入 `bypassJudges` 并判红——不得因"历史遗留"放行。
const SHELL_METACHARS = /[;&|`$(){}<>\\#\n\r\t"'*?[\]~!]/
/** 绕过式判据特征：能让退出码恒为 0，或把真实退出码吞掉。 */
const BYPASS_JUDGE_PATTERNS = [
  /;\s*(true|:)\s*$/i,            // `... ; true`
  /\|\|\s*(true|:)\s*$/i,         // `... || true`
  /&&\s*(true|:)\s*$/i,           // `... && true`
  /\|\s*(cat|tee)\s*(>\s*\/dev\/null)?\s*$/i, // 末尾管道吞码
  /;\s*exit\s+0\s*$/i,            // 显式改写退出码
  /(^|\s)(true|:)\s*$/i,          // 整条判据就是个恒真命令
]

/**
 * 判断一条判据是否为"绕过式"（永远成功 / 吞掉退出码）。
 * @param {unknown} judge 判据字符串
 * @returns {boolean}
 */
export function isBypassJudge(judge) {
  const s = String(judge ?? '').trim()
  if (!s) return true
  return BYPASS_JUDGE_PATTERNS.some((re) => re.test(s))
}

/**
 * 把判据解析为直调 argv；不合法即抛错（由调用方退 2）。
 * 只允许 `node|bash|sh|./scripts/xxx` 这类**无元字符**的命令行。
 * @param {string} judge
 * @returns {string[]}
 */
export function parseJudgeArgv(judge) {
  const s = String(judge ?? '').trim()
  if (!s) throw new Error('判据为空')
  if (isBypassJudge(s)) throw new Error(`判据为绕过式（含 shell 结构或恒真结尾），拒绝登记：${s}`)
  const argv = s.split(/\s+/).filter(Boolean)
  for (const tok of argv) {
    if (SHELL_METACHARS.test(tok)) throw new Error(`判据含 shell 元字符，拒绝登记：\`${tok}\``)
  }
  const [cmd] = argv
  if (!['node', 'bash', 'sh', 'python3', './scripts/'].some((p) => cmd === p || cmd.startsWith('scripts/'))) {
    // 允许 node/bash/sh 与仓库内脚本；其余一律拒绝（防止 `true`/`echo` 之类冒充判据）
    if (!/^\.?\/?(scripts|node_modules\/\.bin)\//.test(cmd)) {
      throw new Error(`判据首词不是受支持的判定入口：\`${cmd}\`（只允许 node/bash/sh 或 scripts/ 内脚本）`)
    }
  }
  return argv
}

// ── 参数解析 ────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) out[key] = true
      else { out[key] = next; i++ }
    } else out._.push(a)
  }
  return out
}

// ── 物理锚点 ────────────────────────────────────────────────────────────────
/** 从磁盘**重新读回**一个文件并算锚点；读不到返回 null（不编造）。 */
export function anchor(absPath) {
  try {
    const buf = readFileSync(absPath)
    const st = statSync(absPath)
    return {
      sha256: createHash('sha256').update(buf).digest('hex'),
      bytes: buf.length,
      lines: buf.toString('utf8').split('\n').length,
      mtimeMs: Math.round(st.mtimeMs),
      text: buf.toString('utf8'),
    }
  } catch {
    return null
  }
}

function toRel(p) {
  if (!p) return p
  const abs = p.startsWith('/') ? p : join(ROOT, p)
  return relative(ROOT, abs) || '.'
}

function toAbs(p) {
  return p.startsWith('/') ? p : join(ROOT, p)
}

/** 收集 git 工作树里的改动文件（相对路径）。 */
function gitDirty() {
  try {
    // ⚠️ 必须带 `-uall`（REQ-089 实测缺陷，2026-10-01）：
    // 默认 `--porcelain` 会把**整个未跟踪目录折叠成一行**（`?? knowledge/sources/`），
    // 而 progress_ledger 只能登记**文件**（登记时要读回算 sha256，目录读不了）。
    // 结果：任何新建目录（哪怕里面每个文件都已登记）都会被报成"未记录改动"，
    // 台账永远清不干净 —— 一个把正确操作判成违规的假阳性。
    // `-uall` 让 git 逐个列出未跟踪文件，与本工具的登记颗粒度对齐。
    const out = execFileSync('git', ['status', '--porcelain', '-uall'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    return out
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => l.slice(3).trim())
      .map((l) => (l.includes(' -> ') ? l.split(' -> ').pop() : l))
      .map((l) => l.replace(/^"(.*)"$/, '$1'))   // git 对含特殊字符的路径会加引号
      .filter((l) => !l.endsWith('.DS_Store'))
  } catch {
    return []
  }
}

/** 读台账全部记录（坏行跳过）。 */
export function readLedger(file = LEDGER) {
  if (!existsSync(file)) return []
  const recs = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try { recs.push(JSON.parse(line)) } catch { /* 坏行跳过 */ }
  }
  return recs
}

/** 每个文件的最新一条记录（漂移判定只看最新）。 */
export function latestByFile(records) {
  const map = new Map()
  for (const r of records) {
    for (const f of r.files || []) {
      const prev = map.get(f.path)
      if (!prev || r.at >= prev.at) map.set(f.path, { at: r.at, ...f, record: r })
    }
  }
  return map
}

// ── 判定核心（纯函数，可单测）───────────────────────────────────────────────
/**
 * 台账一致性判定。
 * @param {Array} records 台账记录
 * @param {Array<string>} dirty git 工作树改动文件（相对 ROOT）
 * @param {(rel:string)=>object|null} anchorFn 磁盘锚点读取函数（可注入，便于单测）
 */
/**
 * 漂移的**书面豁免**（REQ-092 / R2-c）。
 *
 * 为什么必须有这个通道（实测场景，不是假想）：本机同时存在**多个并发会话**
 * 在同一个仓库上工作。实测本轮期间 `skill-pool/plugins/dsh-plugin-restart/src/restart-core.cjs`
 * 被另一个会话持续改写，其 bundle 尚未重建 —— 该文件的"台账哈希 ≠ 磁盘哈希"
 * 是**另一个会话的在途工作**，既不该被我登记成"我这轮的成果"，也不该把
 * 整个工程的 S11 判定永久钉红（那会让机制退化成噪声）。
 *
 * 因此设为**显式、需书面说明、进 git 版本控制**的豁免（与 legacy_align_exempt.txt 同一原则）：
 *   · 豁免必须写理由与登记时间，可被审计与追溯；
 *   · 豁免只作用于"哈希漂移"，**不豁免判定失败**（judgeExit≠0 仍然判红）；
 *   · 不写进豁免文件的漂移，照旧判红。
 */
export const DRIFT_EXEMPT_FILE = join(ROOT, 'ai-control', 'config', 'ledger_drift_exempt.txt')

export function readDriftExemptions(file = DRIFT_EXEMPT_FILE) {
  const map = new Map()
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const parts = t.split('|').map((x) => x.trim())
      if (parts.length < 2) continue
      map.set(parts[0], { reason: parts[1], at: parts[2] || '' })
    }
  } catch { /* 文件不存在 = 无豁免 */ }
  return map
}

export function evaluate(records, dirty, anchorFn = (rel) => anchor(toAbs(rel)), opts = {}) {
  const latest = latestByFile(records)
  const drifts = []
  const driftExempt = []
  const judgeFails = []
  const bypassJudges = []
  const missing = []
  const exempt = opts.driftExempt || readDriftExemptions()

  for (const [rel, info] of latest) {
    const now = anchorFn(rel)
    if (!now) { missing.push(rel); continue }
    if (now.sha256 !== info.sha256) {
      const row = { path: rel, recorded: info.sha256.slice(0, 12), now: now.sha256.slice(0, 12) }
      if (exempt.has(rel)) driftExempt.push({ ...row, reason: exempt.get(rel).reason })
      else drifts.push(row)
    }
    if (info.record && typeof info.record.judgeExit === 'number' && info.record.judgeExit !== 0) {
      judgeFails.push({ path: rel, judge: info.record.judge, exit: info.record.judgeExit, at: info.record.at })
    }
  }

  // 绕过式判据横扫（REQ-103 / C3-a）：**逐条历史记录**扫描，不只看每个文件的最后一条。
  // 为什么必须横扫历史：`latestByFile` 只留每个文件的最新记录，而 3 条恒真判据
  // 正是"当时记成通过"的历史污点——只看最新一条会把它洗掉。
  // 口径：命中即判红，**不得因"历史遗留"放行**（用户明确要求）。
  for (const r of records) {
    const j = r?.judge
    if (typeof j === 'string' && isBypassJudge(j)) {
      bypassJudges.push({
        at: r.at, judge: j, judgeExit: r.judgeExit,
        files: (r.files || []).map((f) => f.path).slice(0, 4),
      })
    }
  }

  // 未记录改动：台账自身体系内的文件、以及降级快照目录，本身就会常变，排除
  const recordedFiles = new Set(latest.keys())
  const unrecorded = dirty.filter((f) => {
    const rel = toRel(f)
    if (rel.startsWith('ai-control/reports/state/')) return false
    return !recordedFiles.has(rel)
  })

  return { drifts, driftExempt, judgeFails, bypassJudges, missing, unrecorded, fileCount: latest.size, recordCount: records.length }
}

// ── 子命令 ──────────────────────────────────────────────────────────────────
async function cmdRecord(args) {
  const filesArg = args.files
  if (!filesArg || filesArg === true) {
    console.error('❌ record 需要 --files <a,b>（至少一个改动文件）')
    process.exit(2)
  }
  const rels = String(filesArg).split(',').map((s) => s.trim()).filter(Boolean).map(toRel)
  const judge = typeof args.judge === 'string' ? args.judge : null
  if (!judge) {
    console.error('❌ record 需要 --judge "<判定命令>"：每条改动必须自带判据，禁止无判据登记')
    process.exit(2)
  }

  // ⓪ 需求版本锚（REQ-092 / R2-c）：每次改动都必须挂到**哪一版需求**上。
  //    不传则从机读需求版本台账按 --req 反查；反查不到一律显式标 (未声明)，不静默编造。
  const reqId = typeof args.req === 'string' ? args.req : null
  let reqVersion = typeof args['req-version'] === 'string' ? args['req-version'] : null
  if (reqId && !reqVersion) {
    try {
      const j = JSON.parse(readFileSync(join(ROOT, 'ai-control', 'requirements', 'req_versions.json'), 'utf8'))
      reqVersion = j?.entries?.[reqId]?.requirement_version || '(待补)'
    } catch {
      reqVersion = '(待补)'
    }
  }
  if (reqId && !/^v\d+\.\d+\.\d+$/.test(String(reqVersion))) {
    console.error(`❌ 需求版本格式非法：${reqId} → ${reqVersion}（须为 vX.Y.Z；请先跑 node scripts/req_version_gen.mjs）`)
    process.exit(2)
  }

  // ① 写后必读回（S11 的物理载体）：改动后**重新从磁盘读**，算哈希、取内容
  const anchors = []
  for (const rel of rels) {
    const a = anchor(toAbs(rel))
    if (!a) {
      console.error(`❌ 回读失败：${rel} 在磁盘上读不到（写后必读回 S11 判定不通过）`)
      process.exit(3)
    }
    anchors.push({ path: rel, sha256: a.sha256, bytes: a.bytes, lines: a.lines, mtimeMs: a.mtimeMs, _text: a.text })
  }

  // ② 回读断言：--expect 指定的内容必须真的读得到
  if (typeof args.expect === 'string') {
    const hit = anchors.find((f) => f._text.includes(args.expect))
    if (!hit) {
      console.error(`❌ 回读断言失败：没有文件包含期望内容 "${args.expect}"（写后必读回 S11 判定不通过）`)
      process.exit(3)
    }
    console.log(`🔎 回读断言命中：${hit.path} 含 "${args.expect}"`)
  }

  // ③ 实跑判定命令，记录**真实**退出码。
  //    REQ-103 / C3-a：判据**不再经 shell**（旧实现 `bash -c` 使 `...; true` 恒真）。
  //    解析失败（含元字符 / 恒真结尾）一律退 2，不落盘。
  let judgeArgv
  try {
    judgeArgv = parseJudgeArgv(judge)
  } catch (e) {
    console.error(`❌ 判据不合法，拒绝登记：${e?.message || e}`)
    process.exit(2)
  }
  let judgeExit = -1
  let judgeOut = ''
  try {
    const [cmd, ...rest] = judgeArgv
    judgeOut = execFileSync(cmd, rest, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 300000 })
    judgeExit = 0
  } catch (e) {
    judgeExit = typeof e.status === 'number' ? e.status : -1
    judgeOut = String(e.stdout || '') + String(e.stderr || '')
  }
  const lastLine = judgeOut.split('\n').map((s) => s.trim()).filter(Boolean).pop() || ''

  const rec = {
    version: LEDGER_VERSION,
    at: new Date().toISOString(),
    task: typeof args.task === 'string' ? args.task : (process.env.DSH_TASK_TITLE || process.env.DSH_SESSION_ID || 'unknown'),
    session: process.env.DSH_SESSION_ID || 'unknown',
    // REQ-092 / R2-c：需求版本锚 —— 让「改了哪些文件」能反查到「凭哪一版需求改的」
    requirement: reqId,
    requirementVersion: reqVersion,
    note: typeof args.note === 'string' ? args.note : '',
    judge,
    judgeArgv,
    judgeExit,
    judgeLastLine: lastLine.slice(0, 200),
    readBack: true,
    expect: typeof args.expect === 'string' ? args.expect : null,
    files: anchors.map(({ _text, ...rest }) => rest),
  }

  mkdirSync(STATE_DIR, { recursive: true })
  // 原子锁（REQ-091 / R6）：JSONL 追加虽在多数场景下原子，但"读整本再判定"的并发读者
  // （看板、审计、收尾三方）会与写入者交错；且同一份台账还会被 report/check 读取判定。
  // 加锁后：写入串行，读者永远看不到半行。
  await withLock('state:progress_ledger', async () => {
    appendFileSync(LEDGER, JSON.stringify(rec) + '\n', 'utf8')
  }, { why: '进度台账追加', timeoutMs: 15000 })

  console.log(`📝 已登记 ${rec.files.length} 个文件 · 判定「${judge}」退出码 ${judgeExit}`)
  for (const f of rec.files) console.log(`   · ${f.path}  sha256:${f.sha256.slice(0, 12)} ${f.lines} 行 ${f.bytes} 字节`)
  if (judgeExit !== 0) {
    console.error(`⚠️ 判定命令未通过（退出码 ${judgeExit}），已如实登记；台账 check 会因此判不通过`)
    process.exit(4)
  }
}

function cmdCheck(args) {
  const records = readLedger()
  const res = evaluate(records, gitDirty())
  const ok = res.drifts.length === 0 && res.unrecorded.length === 0 && res.judgeFails.length === 0 && res.missing.length === 0 && res.bypassJudges.length === 0

  if (args.json) {
    console.log(JSON.stringify({ ok, ...res }, null, 2))
    process.exit(ok ? 0 : 1)
  }

  console.log('🧾 迭代检测台账 · 一致性判定')
  console.log('-----------------------------------------')
  console.log(`记录 ${res.recordCount} 条 · 受管文件 ${res.fileCount} 个`)
  console.log(`哈希漂移      : ${res.drifts.length}${res.driftExempt?.length ? `（另有 ${res.driftExempt.length} 项已书面豁免）` : ''}`)
  console.log(`未记录改动    : ${res.unrecorded.length}`)
  console.log(`判定失败      : ${res.judgeFails.length}`)
  console.log(`绕过式判据    : ${res.bypassJudges.length}`)
  console.log(`文件已消失    : ${res.missing.length}`)
  for (const d of res.drifts) console.log(`   ⚠️ 漂移 ${d.path}：台账 ${d.recorded} ≠ 磁盘 ${d.now}（改了没重新登记）`)
  for (const d of (res.driftExempt || [])) console.log(`   📝 豁免漂移 ${d.path}：${d.reason}`)
  for (const u of res.unrecorded) console.log(`   ⚠️ 未记录 ${u}`)
  for (const j of res.judgeFails) console.log(`   ⚠️ 判定失败 ${j.path}：「${j.judge}」退出码 ${j.exit}`)
  for (const b of res.bypassJudges) {
    console.log(`   🚨 绕过式判据（恒真，退出码被吞）：${b.at} · 记成 judgeExit=${b.judgeExit} · 「${b.judge}」`)
    if (b.files?.length) console.log(`      └ 涉及 ${b.files.join(', ')}`)
  }
  for (const m of res.missing) console.log(`   ⚠️ 已消失 ${m}`)
  console.log('-----------------------------------------')
  if (res.bypassJudges.length) {
    console.log(`⛔ 台账存在 ${res.bypassJudges.length} 条绕过式判据：判据可被写成永远成功 = "认实跑证据"被击穿`)
    console.log('   → 不得因"历史遗留"放行；需重跑真实判据并重新登记该文件')
  }
  console.log(ok ? '✅ 台账与磁盘一致：改动都有记录、记录都对得上、判定都跑过' : '⛔ 台账与磁盘不一致（见上）')
  process.exit(ok ? 0 : 1)
}

function cmdList(args) {
  const records = readLedger()
  const limit = args.limit && args.limit !== true ? Number(args.limit) : 20
  const tail = records.slice(-limit)
  console.log(`🧾 迭代台账 · 最近 ${tail.length} / ${records.length} 条`)
  for (const r of tail) {
    const files = (r.files || []).map((f) => f.path).join(', ')
    console.log(`${r.at} · [${r.task}] ${r.judgeExit === 0 ? '✅' : '⛔'} ${r.judge} · ${files}`)
  }
}

function cmdReport(args) {
  const records = readLedger()
  const res = evaluate(records, gitDirty())
  const ok = res.drifts.length === 0 && res.unrecorded.length === 0 && res.judgeFails.length === 0 && res.missing.length === 0 && res.bypassJudges.length === 0

  // 还差什么：直接问物理触达审计器（唯一权威口径，不在这里重算）
  let audit = null
  try {
    const out = execFileSync('node', ['scripts/mechanism_audit.mjs', '--json'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 300000 })
    audit = JSON.parse(out)
  } catch (e) {
    try { audit = JSON.parse(String(e.stdout || '')) } catch { audit = null }
  }

  if (args.json) {
    console.log(JSON.stringify({ ledger: { ok, ...res }, audit, records: records.slice(-20) }, null, 2))
    process.exit(ok ? 0 : 1)
  }

  console.log('════════════════════════════════════════════════════')
  console.log('📊 真实物理进度报告（只认磁盘哈希与退出码）')
  console.log('════════════════════════════════════════════════════')
  console.log(`① 我做了什么：台账 ${records.length} 条记录 · 受管文件 ${res.fileCount} 个`)
  for (const r of records.slice(-8)) {
    const files = (r.files || []).map((f) => f.path).join(', ')
    console.log(`   ${r.judgeExit === 0 ? '✅' : '⛔'} ${r.at} [${r.task}] ${r.judge}`)
    console.log(`      └ ${files}`)
  }
  console.log(`② 做到哪一步：漂移 ${res.drifts.length} · 未记录改动 ${res.unrecorded.length} · 判定失败 ${res.judgeFails.length} · 文件消失 ${res.missing.length}`)
  for (const b of res.bypassJudges) console.log(`   🚨 绕过式判据 ${b.at}：「${b.judge}」`)
  if (audit) {
    console.log(`   机制触达：登记 ${audit.total ?? '?'} 条 · 已触达 ${audit.reached ?? '?'} · 硬性未触达 ${audit.strictMiss ?? '?'} · 无载体 ${audit.noCarrier ?? '?'}`)
  } else {
    console.log('   机制触达：审计器不可用（如实标注，不用估计值顶替）')
  }
  console.log('③ 还差什么：')
  if (audit && Array.isArray(audit.items)) {
    const bad = audit.items.filter((i) => i.verdict && i.verdict !== 'ok')
    if (!bad.length) console.log('   ✅ 无未触达项')
    for (const i of bad) console.log(`   ${i.verdict === 'no-carrier' ? '⚠️ 无载体' : '⛔ 未触达'} ${i.name}：${String(i.detail || '').slice(0, 90)}`)
  }
  for (const d of res.drifts) console.log(`   ⚠️ 漂移待重记 ${d.path}`)
  for (const u of res.unrecorded) console.log(`   ⚠️ 改动待登记 ${u}`)
  console.log('────────────────────────────────────────────────────')
  console.log(ok ? '✅ 台账自洽：进度可证伪、无漂浮宣称' : '⛔ 台账不自洽：存在"说得比做得多"的项')
  process.exit(ok ? 0 : 1)
}

/** 三态自检：在临时目录里跑，绝不污染真实台账。 */
function cmdSelftest() {
  const tmp = mkdtempSync(join(tmpdir(), 'ledger-selftest-'))
  let passed = 0
  const total = 7
  const f = join(tmp, 'a.txt')
  writeFileSync(f, 'hello v1\n', 'utf8')

  // 态 1：登记后无改动 → 无漂移
  const recs = []
  const a1 = anchor(f)
  recs.push({ at: new Date().toISOString(), judge: 'node scripts/progress_ledger.mjs selftest', judgeExit: 0, files: [{ path: f, sha256: a1.sha256 }] })
  let r = evaluate(recs, [], (rel) => anchor(rel === f ? f : rel))
  if (r.drifts.length === 0) { console.log('✅ 态1 记录与磁盘一致 → 无漂移'); passed++ }
  else console.error('❌ 态1 期望无漂移，实得 ' + r.drifts.length)

  // 态 2：改动后未重新登记 → 检出漂移
  writeFileSync(f, 'hello v2\n', 'utf8')
  r = evaluate(recs, [], (rel) => anchor(rel === f ? f : rel))
  if (r.drifts.length === 1) { console.log('✅ 态2 改了没重记 → 检出漂移'); passed++ }
  else console.error('❌ 态2 期望 1 处漂移，实得 ' + r.drifts.length)

  // 态 3：重新登记后 → 漂移清零
  const a2 = anchor(f)
  recs.push({ at: new Date(Date.now() + 1000).toISOString(), judge: 'node scripts/progress_ledger.mjs selftest', judgeExit: 0, files: [{ path: f, sha256: a2.sha256 }] })
  r = evaluate(recs, [], (rel) => anchor(rel === f ? f : rel))
  if (r.drifts.length === 0) { console.log('✅ 态3 重新登记 → 漂移清零'); passed++ }
  else console.error('❌ 态3 期望零漂移，实得 ' + r.drifts.length)

  // 态 4/5：绕过式判据必须被识别（REQ-103 / C3-a 的核心反例）
  const bypassCases = [
    "node scripts/control_gates.sh check > /dev/null 2>&1; true",
    "node scripts/foo.mjs --check || true",
  ]
  for (const [i, j] of bypassCases.entries()) {
    const rec2 = [{ at: new Date().toISOString(), judge: j, judgeExit: 0, files: [{ path: f, sha256: anchor(f).sha256 }] }]
    r = evaluate(rec2, [], (rel) => anchor(rel === f ? f : rel))
    if (r.bypassJudges.length === 1) { console.log(`✅ 态${4 + i} 绕过式判据被识别并判红：${j}`); passed++ }
    else console.error(`❌ 态${4 + i} 期望识别 1 条绕过式判据，实得 ${r.bypassJudges.length}`)
  }
  // 态 6：parseJudgeArgv 对 "; true" 判据必须抛错拒绝登记
  let rejected = false
  try {
    parseJudgeArgv('node scripts/control_gates.sh check > /dev/null 2>&1; true')
  } catch {
    rejected = true
  }
  if (rejected) { console.log('✅ 态6 登记侧拒绝 "; true" 注入判据'); passed++ }
  else console.error('❌ 态6 期望登记侧抛错拒绝 "; true" 判据')

  // 态 7：反向：正常判据不得被误判为绕过
  const goodJudge = "node scripts/progress_ledger.mjs selftest"
  if (!isBypassJudge(goodJudge) && Array.isArray(parseJudgeArgv(goodJudge))) { console.log(`✅ 态7 反向 正常判据未被误判：${goodJudge}`); passed++ }
  else console.error("❌ 态7 反向 正常判据被误判为绕过")

  rmSync(tmp, { recursive: true, force: true })
  console.log(`—— 自检结果：${passed}/${total} 通过`)
  process.exit(passed === total ? 0 : 1)
}

const args = parseArgs(process.argv.slice(2))
let action = args._[0]
if (!action) {
  if (args.selftest) action = 'selftest'
  else if (args.check) action = 'check'
  else if (args.report) action = 'report'
  else if (args.list) action = 'list'
  else if (args.record) action = 'record'
  else action = 'report'
}
const actions = { record: cmdRecord, check: cmdCheck, list: cmdList, report: cmdReport, selftest: cmdSelftest }
const fn = actions[action]
if (!fn) {
  console.error(`❌ 未知动作: ${action}（可用：record / check / list / report / selftest）`)
  process.exit(2)
}
try {
  // 入口统一 await：`record` 内部要用原子锁（async），其余动作 await 一个同步函数也无害。
  await fn(args)
} catch (e) {
  console.error('❌ 台账异常: ' + (e?.message || e))
  process.exit(2)
}
