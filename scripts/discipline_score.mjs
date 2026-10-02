#!/usr/bin/env node
// ==============================================================================
// 纪律分内核 (Discipline Score Kernel) —— REQ-098 / R1~R6
// ------------------------------------------------------------------------------
// 用户原话：「新增纪律分系统；任何 DSH 工程文件夹内只要你不遵循规则就扣分；
//            每条总分 100 分，扣到 60 分以下就停用；扣分怎么扣由你自主规划；
//            新建纪律委员专门负责纪律分；输出新增当前纪律分与完成时纪律分」。
//
// 实测病根（本轮只读取证）：`scripts/audit_execution.sh` 是**每轮从零重算**的成绩单——
//   ① 无记忆：这一轮扣的分，下一轮全忘，漂移趋势无从回溯；
//   ② 无后果：扣到 40 分与满分 100 分的实际处境完全一样，阈值形同虚设；
//   ③ 无否决：用户说"这次评分不对"在物理上无处落笔；
//   ④ 无独立复核：打分者与复核者是同一个（AI 自评自审）。
// 本内核把成绩单升级成**全域一本账**：追加式 + 哈希链 + 证据门 + 停用状态。
//
// 用法：
//   node scripts/discipline_score.mjs open   --task "任务简述" [--session <id>]
//   node scripts/discipline_score.mjs deduct --level L3 --reason "..." --evidence "cmd|exit=0" [--by self|officer|user]
//   node scripts/discipline_score.mjs selfscore --score 92 [--items "自报扣分项"]
//   node scripts/discipline_score.mjs verify  [--score 92] [--json]
//   node scripts/discipline_score.mjs status  [--json]
//   node scripts/discipline_score.mjs resume  --by user --reason "..."
//   node scripts/discipline_score.mjs verify-chain
//   node scripts/discipline_score.mjs --check        # G7 判定入口：账本自洽且未停用
//   node scripts/discipline_score.mjs --selftest     # 反向用例：该拒的拒、该红的红
//
// 退出码：0 通过 / 1 不通过（含停用、链断裂、评分失误）/ 2 取不到证据或用法错误
// ==============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, mkdtempSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { cfg, cfgNum, readGatesConf } from './lib/gates_config.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// 账本落点：默认是**全域唯一一本账**。`DSH_DISCIPLINE_LEDGER` 仅供测试/演练指向临时账本——
// 生产账本只追加、不可回滚，若"停用会不会真的拦人"这类反例必须写进生产账本才能验证，
// 那等于用污染证据的方式换取验证，得不偿失。故开一个显式的隔离入口。
const LEDGER_DIR = process.env.DSH_DISCIPLINE_LEDGER
  ? dirname(process.env.DSH_DISCIPLINE_LEDGER)
  : join(ROOT, 'ai-control', 'reports', 'discipline')
const LEDGER = process.env.DSH_DISCIPLINE_LEDGER || join(LEDGER_DIR, 'ledger.jsonl')
const STATE = join(LEDGER_DIR, 'state.json')

/* ── 稳定序列化与哈希链 ─────────────────────────────────────────────────────
 * 为什么不用 JSON.stringify 直接算哈希：对象键顺序会随写法漂移，
 * 同一份事实算出两个哈希 → 链自检天天误报。故按键名排序后序列化。        */
export function canonical(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj)
  if (Array.isArray(obj)) return '[' + obj.map(canonical).join(',') + ']'
  const keys = Object.keys(obj).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(obj[k])).join(',') + '}'
}

export function sha256(text) {
  return createHash('sha256').update(String(text)).digest('hex')
}

/** 记录指纹：对「除 hash 字段外的全部内容」取哈希，并串联前一条的 hash。 */
export function recordHash(rec) {
  const { hash, ...rest } = rec
  return sha256(canonical(rest))
}

export function readLedger(file = LEDGER) {
  if (!existsSync(file)) return []
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => {
      try { return JSON.parse(l) } catch { return { _broken: l } }
    })
}

/** 逐行重算哈希链。返回首个断裂点（不认自述，只认重算）。 */
export function verifyChain(file = LEDGER) {
  const rows = readLedger(file)
  let prev = 'GENESIS'
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (r._broken !== undefined) return { ok: false, entries: rows.length, brokenAt: i + 1, reason: '第 ' + (i + 1) + ' 行不是合法 JSON' }
    if (r.prev !== prev) return { ok: false, entries: rows.length, brokenAt: i + 1, reason: '第 ' + (i + 1) + ' 行 prev 指针与前一行哈希不符' }
    if (r.hash !== recordHash(r)) return { ok: false, entries: rows.length, brokenAt: i + 1, reason: '第 ' + (i + 1) + ' 行内容被改动（重算哈希不符）' }
    prev = r.hash
  }
  return { ok: true, entries: rows.length, brokenAt: null, reason: null }
}

/** 追加一条记录：自动补 prev/hash，保证链不断。 */
export function appendRecord(rec, file = LEDGER) {
  const rows = readLedger(file)
  const prev = rows.length ? rows[rows.length - 1].hash || 'GENESIS' : 'GENESIS'
  const full = { ...rec, prev }
  full.hash = recordHash(full)
  mkdirSync(dirname(file), { recursive: true })
  appendFileSync(file, JSON.stringify(full) + '\n', 'utf8')
  return full
}

/* ── 扣分档位与阈值（一律从 gates.conf 取，改档不改代码）────────────────── */
export function levelTable(conf) {
  const raw = cfg('DISC_LEVELS', 'L1:2 L2:5 L3:10 L4:20 L5:40', conf)
  const out = {}
  for (const part of raw.split(/\s+/).filter(Boolean)) {
    const [k, v] = part.split(':')
    if (k && Number.isFinite(Number(v))) out[k] = Number(v)
  }
  return out
}

export function thresholds(conf) {
  return {
    suspend: cfgNum('DISC_SUSPEND_THRESHOLD', 60, conf),
    gap: cfgNum('DISC_SELF_VERIFY_GAP', 10, conf),
    baseline: cfgNum('DISC_BASELINE', 100, conf),
  }
}

/* ── 证据门：没有证据的扣分不成立 ───────────────────────────────────────────
 * 用户裁定（--by user）豁免证据——用户的话本身就是终局凭据（R5）；
 * 其余来源必须给出「判定命令 | 退出码或哈希」，否则拒收。                    */
export function evidenceGate(by, evidence) {
  const e = String(evidence || '').trim()
  if (by === 'user') {
    return e ? { ok: true, why: '用户裁定（附凭据）' } : { ok: true, why: '用户裁定（用户的话即终局凭据，豁免证据）' }
  }
  if (!e) return { ok: false, why: '缺 --evidence：扣分必须绑定可复跑证据（判定命令 + 退出码/哈希）' }
  if (!/(exit\s*[=:]?\s*\d+)|sha256[:=]?\s*[0-9a-f]{6,}|退出码/i.test(e)) {
    return { ok: false, why: '证据不含可复跑判定结果（需含 exit=N / sha256:xxxxxx / 退出码）' }
  }
  return { ok: true, why: '证据合格' }
}

/* ── 评分失误判定：自评与独立复核的差额超阈即失误 ───────────────────────── */
export function judgeSelfVerify(selfScore, officerScore, gap) {
  const diff = Math.abs(Number(selfScore) - Number(officerScore))
  return { diff, mistaken: diff > gap, reason: diff > gap ? `自评 ${selfScore} 与独立复核 ${officerScore} 相差 ${diff} 分，超阈值 ${gap}` : `相差 ${diff} 分，未超阈值 ${gap}` }
}

/* ── 状态推导：从账本原始记录算出「当前分 / 是否停用」──────────────────────── */
export function computeState(file = LEDGER) {
  const rows = readLedger(file)
  const levels = levelTable()
  let taskId = null
  let task = null
  let suspended = false
  let suspendedSince = null
  let suspendTask = null
  const byLevel = {}
  let totalDeducted = 0
  let selfScore = null
  let officerScore = null
  const perTask = {}

  for (const r of rows) {
    if (r._broken !== undefined) continue
    switch (r.kind) {
      case 'open':
        taskId = r.taskId
        task = r.task
        perTask[r.taskId] = { deducted: 0, openedAt: r.at }
        break
      case 'deduct': {
        const pts = Number(r.points) || 0
        if (r.taskId) {
          if (!perTask[r.taskId]) perTask[r.taskId] = { deducted: 0, openedAt: r.at }
          perTask[r.taskId].deducted += pts
        }
        byLevel[r.level] = (byLevel[r.level] || 0) + 1
        totalDeducted += pts
        break
      }
      case 'selfscore':
        selfScore = Number(r.score)
        break
      case 'verify':
        officerScore = Number(r.officerScore)
        break
      case 'resume':
        suspended = false
        suspendedSince = null
        suspendTask = null
        break
      default:
        break
    }
  }

  const currentTask = taskId || (Object.keys(perTask).pop() ?? null)
  const deducted = currentTask && perTask[currentTask] ? perTask[currentTask].deducted : 0
  const base = thresholds().baseline
  const current = Math.max(0, base - deducted)

  // 停用判定：任何历史条目曾跌破阈值且其后没有用户恢复 → 保持停用（不随新任务复活）
  const resumedAt = rows.filter((r) => r.kind === 'resume').length
  const openings = rows.filter((r) => r.kind === 'open')
  for (const o of openings) {
    const ded = perTask[o.taskId] ? perTask[o.taskId].deducted : 0
    if (base - ded < thresholds().suspend) {
      suspended = true
      suspendedSince = suspendedSince || o.at
      suspendTask = o.taskId
    }
  }
  if (resumedAt > 0 && suspendedSince) {
    const last = rows.filter((r) => r.kind === 'resume').pop()
    const lastOpen = openings[openings.length - 1]
    // 恢复只对「恢复之前的条目」生效；恢复之后新开的条目再次跌破则重新停用
    if (lastOpen && last.at && lastOpen.at <= last.at) { suspended = false; suspendTask = null }
  }

  return {
    at: new Date().toISOString(),
    taskId: currentTask,
    task,
    current: currentTask ? current : base,
    baseline: base,
    suspended,
    suspendedSince: suspended ? suspendedSince : null,
    suspendTask: suspended ? suspendTask : null,
    totalDeducted,
    byLevel,
    selfScore,
    officerScore,
    entries: rows.length,
    chain: verifyChain(file),
  }
}

export function writeState(state, file = STATE) {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(state, null, 2) + '\n', 'utf8')
  return file
}

/* ── 独立复核（纪律委员入口）───────────────────────────────────────────────
 * 关键：**不采信自评**。委员从两个独立来源复算：
 *   ① 账本原始扣分记录逐条重算（防算术篡改）；
 *   ② 外部见证 `audit_execution.sh --json` 的失分维度，映射为「漏报违规」。
 * 自评与复核差额超阈 → 记为「评分失误」，按 L4 自动入账。
 * witness 可注入（自检用桩，避免自检依赖真实审计器）。                      */
export function independentVerify(selfScore, opts = {}) {
  const conf = opts.conf || readGatesConf()
  const file = opts.file || LEDGER
  const lv = levelTable(conf)
  const th = thresholds(conf)
  const rows = readLedger(file)

  const deducts = rows.filter((r) => r.kind === 'deduct')
  const confirmed = []
  const refuted = []
  for (const d of deducts) {
    const g = evidenceGate(d.by, d.evidence)
    if (g.ok) confirmed.push(d)
    else refuted.push({ ...d, why: g.why })
  }

  const witness = opts.witness || runWitness
  const w = witness()
  const missed = (w.failedDims || []).filter((dim) => !deducts.some((d) => String(d.reason || '').includes(dim)))
  const missedPoints = missed.length * (lv.L2 || 5)

  const confirmedPoints = confirmed.reduce((s, d) => s + (Number(d.points) || 0), 0)
  const officerScore = Math.max(0, th.baseline - confirmedPoints - missedPoints)
  const self = Number.isFinite(Number(selfScore)) ? Number(selfScore) : computeState(file).current
  const verdict = judgeSelfVerify(self, officerScore, th.gap)

  return {
    officerScore,
    selfScore: self,
    confirmed: confirmed.length,
    refuted: refuted.length,
    missed,
    missedPoints,
    diff: verdict.diff,
    mistaken: verdict.mistaken,
    reason: verdict.reason,
    witness: w,
  }
}

/** 外部见证：跑既有静态审计器，取它的失分维度名。取不到 → 明确报取不到（不算通过）。 */
function runWitness() {
  try {
    const out = execFileSync('bash', [join(ROOT, 'scripts', 'audit_execution.sh'), '--json'], { encoding: 'utf8', timeout: 120000 })
    const j = JSON.parse(out)
    const dims = [
      ['namingPass', '1. 首动命名'],
      ['gatesPass', '2. 开工门禁'],
      ['redundancyPass', '3. 冗余扫描'],
      ['conflictPass', '4. 冲突排查'],
      ['legacyPass', '5. 存量校准'],
      ['syncPass', '6. 台账同步'],
      ['todoPass', '7. 待办常显'],
      ['compactPass', '8. 输出结构契约'],
      ['languagePass', '9. 文字可读性'],
    ]
    const failedDims = dims.filter(([k]) => j[k] === false).map(([, n]) => n)
    return { ok: true, auditScore: j.score, failedDims, reason: null }
  } catch (e) {
    return { ok: false, auditScore: null, failedDims: [], reason: e && e.message ? String(e.message).slice(0, 120) : '见证审计器不可用' }
  }
}

/* ── 反向用例：该拒的必须拒、该红的必须红 ────────────────────────────────── */
export function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), 'disc-'))
  const file = join(dir, 'ledger.jsonl')
  const cases = []
  const add = (name, ok, detail) => cases.push({ name, ok: !!ok, detail })

  // 用例 1：缺证据的扣分必须被拒
  add('反例①：自评来源缺证据 → 拒收', evidenceGate('self', '').ok === false, evidenceGate('self', '').why)
  // 用例 2：证据不合格（没有退出码/哈希）必须被拒
  add('反例②：证据无判定结果 → 拒收', evidenceGate('officer', '我觉得他错了').ok === false, evidenceGate('officer', '我觉得他错了').why)
  // 用例 3：合格证据放行
  add('正例①：含退出码的证据 → 放行', evidenceGate('self', 'node scripts/x.mjs --check|exit=1').ok === true, '含 exit=1')
  // 用例 4：用户裁定豁免证据
  add('正例②：用户裁定豁免证据 → 放行', evidenceGate('user', '').ok === true, '用户的话即终局凭据')

  // 用例 5：评分失误判定
  add('反例③：自评 100 / 复核 80 → 判评分失误', judgeSelfVerify(100, 80, 10).mistaken === true, judgeSelfVerify(100, 80, 10).reason)
  add('正例③：自评 95 / 复核 92 → 未失误', judgeSelfVerify(95, 92, 10).mistaken === false, judgeSelfVerify(95, 92, 10).reason)

  // 用例 6：正常记账 → 起分 100，扣 10 → 90，未停用
  appendRecord({ kind: 'open', at: new Date().toISOString(), taskId: 'T1', task: '自检用例' }, file)
  appendRecord({ kind: 'deduct', at: new Date().toISOString(), taskId: 'T1', level: 'L3', points: 10, by: 'self', reason: '越权改动', evidence: 'git status --porcelain|exit=0' }, file)
  let st = computeState(file)
  add('正例④：100 扣 10 → 90 且未停用', st.current === 90 && st.suspended === false, `current=${st.current} suspended=${st.suspended}`)
  add('正例⑤：哈希链自洽', verifyChain(file).ok === true, JSON.stringify(verifyChain(file)))

  // 用例 7：跌破 60 → 停用
  appendRecord({ kind: 'deduct', at: new Date().toISOString(), taskId: 'T1', level: 'L5', points: 40, by: 'officer', reason: '伪造凭据', evidence: 'node scripts/discipline_score.mjs --selftest|exit=1' }, file)
  st = computeState(file)
  add('反例④：90 再扣 40 → 50 判停用', st.current === 50 && st.suspended === true, `current=${st.current} suspended=${st.suspended}`)

  // 用例 8：停用不随新任务自动复活
  appendRecord({ kind: 'open', at: new Date().toISOString(), taskId: 'T2', task: '新任务' }, file)
  st = computeState(file)
  add('反例⑤：新任务不自动解除停用', st.suspended === true, `suspended=${st.suspended}`)

  // 用例 9：用户恢复才解除
  appendRecord({ kind: 'resume', at: new Date(Date.now() + 1000).toISOString(), by: 'user', reason: '用户复核后恢复' }, file)
  st = computeState(file)
  add('正例⑥：用户显式恢复 → 解除停用', st.suspended === false, `suspended=${st.suspended}`)

  // 用例 10：篡改历史行 → 链必须判红
  const good = readFileSync(file, 'utf8')
  const rows = good.split('\n').filter(Boolean)
  const tampered = rows.map((l, i) => (i === 1 ? l.replace(/"points":10/, '"points":0') : l)).join('\n') + '\n'
  writeFileSync(file, tampered, 'utf8')
  add('反例⑥：篡改扣分点值 → 哈希链判红', verifyChain(file).ok === false, verifyChain(file).reason)

  // 用例 11：独立复核不采信自评（注入见证桩：漏报 2 维）
  writeFileSync(file, good, 'utf8')
  const iv = independentVerify(100, {
    file,
    conf: {},
    witness: () => ({ ok: true, auditScore: 78, failedDims: ['2. 开工门禁', '7. 待办常显'], reason: null }),
  })
  add('反例⑦：独立复核漏报 2 维 → 判定与自评不符', iv.officerScore < 100 && iv.missed.length === 2, `officer=${iv.officerScore} missed=${iv.missed.length}`)

  rmSync(dir, { recursive: true, force: true })

  const failed = cases.filter((c) => !c.ok)
  console.log('=== 纪律分内核反向用例自检 ===')
  for (const c of cases) console.log(`${c.ok ? '✅' : '❌'} ${c.name}${c.detail ? '（' + c.detail + '）' : ''}`)
  console.log('-----------------------------------------')
  console.log(`共 ${cases.length} 条 · ${failed.length ? '❌ ' + failed.length + ' 条未过' : '🎉 全部通过'}`)
  return failed.length ? 1 : 0
}

/* ── 命令行 ──────────────────────────────────────────────────────────────── */
function val(argv, flag) {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : null
}

function usage() {
  console.log(`纪律分内核（REQ-098）
  open     --task "任务简述" [--session <id>]
  deduct   --level L3 --reason "..." [--evidence "cmd|exit=0"] [--by self|officer|user] [--task <id>]
  selfscore --score 92 [--items "自报扣分项"]
  verify   [--score 92] [--json]
  status   [--json]
  resume   --by user --reason "..."
  verify-chain
  --check       G7 判定入口（账本自洽且未停用）
  --selftest    反向用例自检`)
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--selftest')) return selfTest()
  const cmd = argv[0]
  const json = argv.includes('--json')
  const conf = readGatesConf()
  const now = new Date().toISOString()

  if (argv.includes('--check')) {
    const st = computeState()
    writeState(st)
    const bad = []
    if (!st.chain.ok) bad.push(`账本哈希链断裂（第 ${st.chain.brokenAt} 行：${st.chain.reason}）`)
    if (st.suspended) bad.push(`智能体处于停用状态（条目 ${st.suspendTask} 分 ${st.current} < 阈值 ${thresholds(conf).suspend}）`)
    if (json) console.log(JSON.stringify({ ...st, ok: bad.length === 0, bad }, null, 2))
    else {
      console.log('🎯 纪律分门禁判定（G7）')
      console.log(`  当前纪律分：${st.current} / ${st.baseline} · 条目 ${st.taskId || '无'} · 记录 ${st.entries} 条`)
      console.log(`  停用状态：${st.suspended ? '🔴 已停用（须用户 --resume 恢复）' : '🟢 正常'}`)
      console.log(`  哈希链：${st.chain.ok ? '✅ 自洽（' + st.chain.entries + ' 条）' : '❌ ' + st.chain.reason}`)
      for (const b of bad) console.log(`  ⛔ ${b}`)
    }
    return bad.length ? 1 : 0
  }

  switch (cmd) {
    case 'open': {
      const task = val(argv, '--task') || '未命名任务'
      const sid = val(argv, '--session') || process.env.DSH_SESSION_ID || 'unknown'
      const taskId = 'T' + Date.now().toString(36).toUpperCase()
      appendRecord({ kind: 'open', at: now, taskId, task, session: sid })
      const st = computeState(); writeState(st)
      if (json) console.log(JSON.stringify(st, null, 2))
      else console.log(`🆕 已开纪律条目 ${taskId}「${task}」· 起分 ${st.baseline} · 当前 ${st.current}`)
      return 0
    }
    case 'deduct': {
      const by = val(argv, '--by') || 'self'
      const level = (val(argv, '--level') || 'L1').toUpperCase()
      const reason = val(argv, '--reason')
      const evidence = val(argv, '--evidence')
      const lv = levelTable(conf)
      if (!reason) { console.error('⛔ 缺 --reason：扣分必须写明理由'); return 2 }
      if (!(level in lv)) { console.error(`⛔ 未知档位 ${level}（可选：${Object.keys(lv).join(' / ')}）`); return 2 }
      const gate = evidenceGate(by, evidence)
      if (!gate.ok) { console.error(`⛔ 拒收扣分：${gate.why}`); return 2 }
      const st0 = computeState()
      const taskId = val(argv, '--task') || st0.taskId
      const rec = appendRecord({ kind: 'deduct', at: now, taskId, level, points: lv[level], by, reason, evidence: evidence || '', evidenceNote: gate.why })
      const st = computeState(); writeState(st)
      if (json) console.log(JSON.stringify({ record: rec, state: st }, null, 2))
      else console.log(`➖ 已入账：${level} −${lv[level]} 分 · 来源 ${by} · ${reason}\n   当前纪律分：${st.current} / ${st.baseline}${st.suspended ? ' · 🔴 已触发停用' : ''}`)
      return st.suspended ? 1 : 0
    }
    case 'selfscore': {
      const score = Number(val(argv, '--score'))
      if (!Number.isFinite(score)) { console.error('⛔ 缺 --score'); return 2 }
      const items = val(argv, '--items') || ''
      appendRecord({ kind: 'selfscore', at: now, score, items })
      const st = computeState(); writeState(st)
      if (json) console.log(JSON.stringify(st, null, 2))
      else console.log(`📝 自评已入账：${score} 分${items ? '（自报扣分项：' + items + '）' : ''}`)
      return 0
    }
    case 'verify': {
      const self = val(argv, '--score')
      const iv = independentVerify(self === null ? undefined : Number(self), { conf })
      appendRecord({
        kind: 'verify', at: now, selfScore: iv.selfScore, officerScore: iv.officerScore,
        confirmed: iv.confirmed, refuted: iv.refuted, missed: iv.missed,
        diff: iv.diff, mistaken: iv.mistaken, reason: iv.reason,
        witnessOk: iv.witness.ok, witnessScore: iv.witness.auditScore,
        evidence: `node scripts/audit_execution.sh --json|exit=0|witness=${iv.witness.ok}`,
      })
      let auto = null
      if (iv.mistaken) {
        const lv = levelTable(conf)
        auto = appendRecord({ kind: 'deduct', at: now, taskId: computeState().taskId, level: 'L4', points: lv.L4 || 20, by: 'officer', reason: `评分失误：${iv.reason}`, evidence: `node scripts/discipline_score.mjs verify|diff=${iv.diff}` })
      }
      const st = computeState(); writeState(st)
      if (json) console.log(JSON.stringify({ verdict: iv, autoDeduct: auto, state: st }, null, 2))
      else {
        console.log('⚖️ 纪律委员独立复核')
        console.log(`  自评：${iv.selfScore} 分 · 独立复核：${iv.officerScore} 分 · 差额 ${iv.diff} 分`)
        console.log(`  证据确认 ${iv.confirmed} 条 · 证据不足 ${iv.refuted} 条 · 漏报维度 ${iv.missed.length} 条`)
        console.log(`  见证审计器：${iv.witness.ok ? '可用（静态分 ' + iv.witness.auditScore + '）' : '⛔ 不可用：' + iv.witness.reason}`)
        console.log(iv.mistaken ? `  ❌ 判定评分失误 → 自动按 L4 扣分` : `  ✅ 未判评分失误（${iv.reason}）`)
        console.log(`  当前纪律分：${st.current} / ${st.baseline}`)
      }
      return iv.mistaken ? 1 : 0
    }
    case 'resume': {
      const by = val(argv, '--by')
      if (by !== 'user') { console.error('⛔ 仅用户可恢复停用（须 --by user）：停用不可由智能体自行解除'); return 2 }
      const reason = val(argv, '--reason') || '用户恢复'
      appendRecord({ kind: 'resume', at: now, by, reason })
      const st = computeState(); writeState(st)
      if (json) console.log(JSON.stringify(st, null, 2))
      else console.log(`🔓 用户已恢复：${reason} · 当前纪律分 ${st.current} · 停用状态 ${st.suspended ? '仍停用' : '已解除'}`)
      return 0
    }
    case 'verify-chain': {
      const r = verifyChain()
      if (json) console.log(JSON.stringify(r, null, 2))
      else console.log(r.ok ? `✅ 哈希链自洽：${r.entries} 条记录` : `❌ ${r.reason}`)
      return r.ok ? 0 : 1
    }
    case 'status': {
      const st = computeState(); writeState(st)
      if (json) { console.log(JSON.stringify(st, null, 2)); return 0 }
      console.log(`🎯 当前纪律分：${st.current} / ${st.baseline}`)
      console.log(`  条目：${st.taskId || '（尚未开工条目）'}${st.task ? '「' + st.task + '」' : ''}`)
      console.log(`  累计扣分：${st.totalDeducted} · 档位分布：${Object.entries(st.byLevel).map(([k, v]) => k + '×' + v).join(' ') || '无'}`)
      console.log(`  自评：${st.selfScore ?? '未自评'} · 委员复核：${st.officerScore ?? '未复核'}`)
      console.log(`  停用：${st.suspended ? '🔴 已停用（自 ' + st.suspendedSince + '，须用户恢复）' : '🟢 正常'}`)
      console.log(`  记录：${st.entries} 条 · 哈希链：${st.chain.ok ? '✅ 自洽' : '❌ ' + st.chain.reason}`)
      return 0
    }
    default:
      usage()
      return cmd ? 2 : 0
  }
}

if (process.argv[1] && process.argv[1].endsWith('discipline_score.mjs')) {
  process.exit(main())
}
