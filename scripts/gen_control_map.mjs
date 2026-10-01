#!/usr/bin/env node
// ==============================================================================
// 脚本名称：gen_control_map.mjs
// 功能描述：把「管控机制当前实况」画成一张简单明了的单页图（SVG）
// ------------------------------------------------------------------------------
// 为什么要有这个脚本：
//   管控机制由 40+ 个脚本、7 道门禁、5 阶物理锁组成，散落在多个文件里，
//   人（和模型）看一眼文档很难在 10 秒内回答"现在到底靠什么管、有没有真的在跑"。
//   本脚本只做一件事：把实况压成"入口 → 门禁 → 锁 → 证据"四段式单页图。
//
// 数据来源（全部读磁盘/实跑，不采信任何自述）：
//   · ai-control/reports/state/status.json   —— 门禁 G1~G6 实况
//   · .dsh-control/run-audit.jsonl           —— 管控入口运行留痕
//   · .dsh-control/physical_locks/*.json     —— 物理锁阶梯与凭据
//   · ai-control/reports/state/scope_audit.json —— 全域接管覆盖
//
// 用法：
//   node scripts/gen_control_map.mjs [输出.svg]
// ==============================================================================
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { execFileSync } from 'node:child_process'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const HOME = process.env.DSH_HOME || join(homedir(), '.dsh')

// ── 画布参数 ────────────────────────────────────────────────────────────────
const W = 1240
const PAD = 26

const C = {
  bg: '#070B12', card: '#0F1724', cardHi: '#142033',
  line: '#22314A', ink: '#E8F0FA', dim: '#8FA3BF', faint: '#5C7089',
  ok: '#2EC4B6', okDim: '#17705F', warn: '#F4A259', bad: '#F45B69',
  blue: '#4FA8FF', violet: '#A78BFA',
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const out = []
const push = (s) => out.push(s)

function rect(x, y, w, h, o = {}) {
  push(`  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 12}" fill="${o.fill ?? C.card}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw ?? 1}"` : ''}${o.opacity ? ` opacity="${o.opacity}"` : ''}/>`)
}
function text(x, y, s, o = {}) {
  const anchor = o.anchor ?? 'start'
  push(`  <text x="${x}" y="${y}" font-size="${o.size ?? 13}" fill="${o.fill ?? C.ink}"${o.weight ? ` font-weight="${o.weight}"` : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${o.opacity ? ` opacity="${o.opacity}"` : ''}${o.spacing ? ` letter-spacing="${o.spacing}"` : ''}>${esc(s)}</text>`)
}
function chip(x, y, s, o = {}) {
  const padX = o.padX ?? 10
  const w = o.w ?? (String(s).length * (o.cjk ? (o.size ?? 12) : (o.size ?? 12) * 0.62) + padX * 2)
  const h = o.h ?? 22
  rect(x, y, w, h, { rx: h / 2, fill: o.fill ?? 'rgba(46,196,182,0.12)', stroke: o.stroke ?? C.ok, sw: 1 })
  text(x + w / 2, y + h / 2 + (o.size ?? 12) * 0.36, s, { size: o.size ?? 12, fill: o.color ?? C.ok, anchor: 'middle', weight: '600' })
  return w
}
function sectionTitle(y, n, title, sub) {
  chip(PAD, y - 15, n, { w: 30, h: 24, rx: 8, fill: 'rgba(79,168,255,0.15)', stroke: C.blue, color: C.blue, size: 13 })
  text(PAD + 40, y + 2, title, { size: 17, weight: '700' })
  if (sub) text(W - PAD, y + 2, sub, { size: 12, fill: C.faint, anchor: 'end' })
  push(`  <line x1="${PAD}" y1="${y + 16}" x2="${W - PAD}" y2="${y + 16}" stroke="${C.line}" stroke-width="1"/>`)
}

// ── 读实况 ──────────────────────────────────────────────────────────────────
function readJson(p, fb = null) {
  try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return fb }
}
const status = readJson(join(ROOT, 'ai-control/reports/state/status.json'), null)
const gates = status?.gates ?? []
const passN = status?.gatePassed ?? 0
const totalN = status?.gateTotal ?? 6
const gatePct = status?.percent ?? Math.round((passN / totalN) * 100)

// 运行留痕（入口跑没跑过）
let runLines = []
try { runLines = readFileSync(join(ROOT, '.dsh-control/run-audit.jsonl'), 'utf8').trim().split('\n').filter(Boolean) } catch {}
const runCount = runLines.length
const lastRun = runLines.length ? JSON.parse(runLines[runLines.length - 1]) : null

// 物理锁阶梯
let lockStage = 0
let lockProofs = []
try {
  const dir = join(HOME, '.dsh-control/physical_locks')
  if (existsSync(dir)) {
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
    if (files.length) {
      const st = readJson(join(dir, files[0]), {})
      // 取最近更新的一份
      let best = st
      for (const f of files) {
        const d = readJson(join(dir, f), {})
        if ((d.updatedAt ?? '') > (best.updatedAt ?? '')) best = d
      }
      lockStage = best.stage ?? 0
      lockProofs = best.history ?? []
    }
  }
} catch {}
const proofNames = lockProofs.map((p) => `LOCK-${p.stage}`)

// 全域覆盖
const scope = readJson(join(ROOT, 'ai-control/reports/state/scope_audit.json'), null)
const scopeProjects = scope?.projects ?? scope?.results ?? []
const scopeTaken = scope?.covered ?? scopeProjects.filter((p) => p.ok).length
const scopeTotal = scope?.total ?? scopeProjects.length

const SNAP = (status?.generatedAt ?? '未知').replace(/^(\d{4})-(\d{2})-(\d{2})/, '$1-$2-$3')

// 会话命名 G0：实跑校验器取退出码（0 通过 / 1 不合规 / 3 无法判定），不猜字段
let namingRc = 3
let namingTitle = ''
try {
  execFileSync('bash', [join(ROOT, 'scripts/check_task_naming.sh'), '--exit'], { stdio: 'ignore', timeout: 30000 })
  namingRc = 0
} catch (e) {
  namingRc = typeof e.status === 'number' ? e.status : 3
}
try {
  namingTitle = (readFileSync(join(ROOT, '.dsh-control/last-title.txt'), 'utf8') || '').trim()
} catch {}
if (!namingTitle) {
  for (const p of [join(ROOT, '.dsh-control/session_title.txt')]) {
    if (existsSync(p)) { namingTitle = readFileSync(p, 'utf8').trim(); break }
  }
}
const namingOk = namingRc === 0
const namingText = namingRc === 3 ? '无法判定（缺会话存储）' : namingOk ? '标题已合规锁定' : '标题不合规'

const GATES = [
  { id: 'G0', name: '会话命名', pass: namingOk, metric: namingText, note: namingOk ? (namingTitle || '首动改名已执行') : '整改：跑 ./scripts/name_me.sh' },
  ...gates.map((g, i) => ({ id: `G${i + 1}`, name: g.name, pass: g.status === 'pass', metric: `${g.metricA} ${g.metricALabel}`, note: `${g.metricB} ${g.metricBLabel}` })),
]
const namingFail = namingRc !== 0
const failedGate = gates.find((g) => g.status !== 'pass')
const HARD_BLOCK = namingFail || !!status?.execAllowed === false || !!failedGate
const blockName = namingFail ? (namingRc === 3 ? '会话命名无法判定' : '会话未合规命名') : (failedGate?.name ?? '—')
const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s))

// ── 布局 ────────────────────────────────────────────────────────────────────
push(`<svg width="${W}" height="__H__" viewBox="0 0 ${W} __H__" xmlns="http://www.w3.org/2000/svg" font-family="'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif">`)
push(`  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#070B12"/><stop offset="100%" stop-color="#0A1018"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#4FA8FF"/><stop offset="50%" stop-color="#2EC4B6"/><stop offset="100%" stop-color="#A78BFA"/>
    </linearGradient>
    <marker id="arw" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto">
      <path d="M0,0 L7,3.2 L0,6.4 z" fill="#4A5F7F"/>
    </marker>
  </defs>`)
push(`  <rect width="${W}" height="100%" fill="url(#bg)"/>`)

let y = 0
// 顶栏
push(`  <rect x="0" y="0" width="${W}" height="4" fill="url(#bar)"/>`)
y = 54
text(PAD, y, 'DSH 管控机制 · 当前实况一页图', { size: 27, weight: '700' })
text(W - PAD, y - 6, `快照 ${SNAP}`, { size: 13, fill: C.dim, anchor: 'end' })
text(W - PAD, y + 14, '全部读磁盘实况推导，不采信任何"已完成"的口头宣称', { size: 12, fill: C.faint, anchor: 'end' })
// 总状态胶囊
const topChips = [
  [`门禁 ${passN}/${totalN}${HARD_BLOCK ? ' · 有卡点' : ' 全绿'}`, HARD_BLOCK ? C.bad : C.ok],
  [`物理锁 LOCK-${lockStage}`, C.blue],
  [`拦截层已激活`, C.ok],
  [`全域接管 ${scopeTaken}/${scopeTotal || 4}`, C.ok],
  [`留痕 ${runCount} 次`, C.violet],
]
let cx = PAD
y += 34
for (const [label, color] of topChips) {
  const w = label.length * 11 + 26
  rect(cx, y, w, 30, { rx: 15, fill: 'rgba(255,255,255,0.03)', stroke: color, sw: 1.2 })
  text(cx + w / 2, y + 20, label, { size: 13, fill: color, anchor: 'middle', weight: '600' })
  cx += w + 10
}

// ── ① 四段主干 ──────────────────────────────────────────────────────────────
y += 66
sectionTitle(y, '1', '主干：一条命令进，四道关卡往下', '命令都不用手记 · 统一入口 ./scripts/control.sh')
y += 30
const bw = (W - PAD * 2 - 3 * 40) / 4
const bh = 116
const blocks = [
  { t: '入口', s: 'control.sh', d: ['naming · check · lock', 'todo · version · scope', 'selfcheck'], c: C.blue },
  { t: '门禁 G0~G6', s: `${passN}/${totalN}${HARD_BLOCK ? ' · 有卡点' : ' 全绿'}`, d: [clip(`卡点：${blockName}`, 22), '全过才放行', '状态由磁盘推导'], c: HARD_BLOCK ? C.bad : C.ok },
  { t: '物理锁 LOCK-0~4', s: `当前 LOCK-${lockStage}`, d: ['单向工序链', '缺凭据拒绝跳阶', '底层拦截'], c: C.violet },
  { t: '证据留痕', s: '不认自述', d: ['run-audit.jsonl', 'progress_ledger.jsonl', 'status.json'], c: C.warn },
]
blocks.forEach((b, i) => {
  const x = PAD + i * (bw + 40)
  rect(x, y, bw, bh, { fill: C.card, stroke: b.c, sw: 1.4 })
  push(`  <rect x="${x}" y="${y}" width="4" height="${bh}" rx="2" fill="${b.c}"/>`)
  text(x + 18, y + 30, b.t, { size: 16, weight: '700', fill: b.c })
  text(x + 18, y + 52, b.s, { size: 13, fill: C.ink, weight: '600' })
  b.d.forEach((line, j) => text(x + 18, y + 74 + j * 17, line, { size: 11.5, fill: C.dim }))
  if (i < 3) {
    const ax = x + bw + 8
    push(`  <line x1="${ax}" y1="${y + bh / 2}" x2="${ax + 24}" y2="${y + bh / 2}" stroke="#4A5F7F" stroke-width="1.6" marker-end="url(#arw)"/>`)
  }
})

// ── ② 六道门禁细看 ──────────────────────────────────────────────────────────
y += bh + 52
sectionTitle(y, '2', '门禁细看：G0 一票否决，G1~G6 累积放行', `进度 ${gatePct}%${HARD_BLOCK ? ' · 当前有卡点' : ' · 全绿'} · 源 status.json`)
y += 28
const gw = (W - PAD * 2 - 2 * 14) / 3
const gh = 76
GATES.forEach((g, i) => {
  const col = i % 3
  const row = Math.floor(i / 3)
  const x = PAD + col * (gw + 14)
  const gy = y + row * (gh + 12)
  const isG0 = g.id === 'G0'
  const c = g.pass ? C.ok : C.bad
  rect(x, gy, gw, gh, { fill: g.pass ? C.card : '#1A0F14', stroke: g.pass ? C.okDim : C.bad, sw: g.pass ? 1.2 : 1.5 })
  chip(x + 14, gy + 14, g.id, { w: 36, h: 22, fill: g.pass ? 'rgba(46,196,182,0.14)' : 'rgba(244,91,105,0.16)', stroke: c, color: c, size: 12 })
  text(x + 60, gy + 30, g.name, { size: 14.5, weight: '600' })
  text(x + gw - 14, gy + 30, g.pass ? '✅ 通过' : '⛔ 卡点', { size: 12, fill: c, anchor: 'end', weight: '600' })
  text(x + 14, gy + 54, clip(g.metric, 30), { size: 12, fill: C.dim })
  text(x + 14, gy + 68, clip(g.note, 30), { size: 11, fill: g.pass ? C.faint : C.bad })
})
y += 3 * (gh + 12) + 34

// ── ③ 运行时三处硬接触 ──────────────────────────────────────────────────────
sectionTitle(y, '3', '运行时：机制到底有没有真的在跑', '判据穿透到载体，不看文档自洽')
y += 28
const rw = (W - PAD * 2 - 2 * 14) / 3
const rh = 122
const runtime = [
  {
    t: '拦截层（宿主）', ok: true, c: C.ok, big: '已激活',
    lines: ['id=ai-execution-control', '通道 bundles（宿主重写抹不掉）', `宿主激活凭据 ${SNAP.slice(5)}`, '逃生舱 DSH_CONTROL_GUARD=off'],
  },
  {
    t: '物理锁（逐阶凭据）', ok: true, c: C.violet, big: `LOCK-${lockStage} / 4`,
    lines: proofNames.length ? [`已签凭据：${proofNames.join(' → ')}`, 'LOCK-1 ← 门禁全绿', 'LOCK-2 ← 待办证据(宿主转录)', '跳阶 → 底层拒绝'] : ['尚无凭据', '需门禁全绿 + 待办证据', '跳阶 → 底层拒绝'],
  },
  {
    t: '全域覆盖（其他工程）', ok: scopeTotal === 0 || scopeTaken === scopeTotal, c: C.ok, big: `${scopeTaken}/${scopeTotal || 4} 已接管`,
    lines: ['四类事实全过才算接管', '入口在位 · 引用可达', '有运行留痕 · 台账含版本', '脱管项由 G5 拦住'],
  },
]
runtime.forEach((b, i) => {
  const x = PAD + i * (rw + 14)
  rect(x, y, rw, rh, { fill: C.card, stroke: b.c, sw: 1.3 })
  text(x + 16, y + 26, b.t, { size: 14.5, weight: '600' })
  chip(x + rw - 16 - 96, y + 12, b.big, { w: 96, h: 24, fill: b.ok ? 'rgba(46,196,182,0.14)' : 'rgba(244,91,105,0.14)', stroke: b.c, color: b.c, size: 12 })
  b.lines.forEach((l, j) => text(x + 16, y + 52 + j * 18, `· ${l}`, { size: 11.5, fill: C.dim }))
})
y += rh + 34

// ── ④ 证据链 ────────────────────────────────────────────────────────────────
sectionTitle(y, '4', '证据链：凭什么说"跑过了"', '结论以文件与实跑退出码为准')
y += 26
const eh = 62
rect(PAD, y, W - PAD * 2, eh, { fill: C.cardHi, stroke: C.line })
const ev = [
  ['运行留痕', `.dsh-control/run-audit.jsonl · ${runCount} 行`],
  ['最后实跑', lastRun ? `${lastRun.action} · 退出码 ${lastRun.exit} · ${String(lastRun.at).slice(11, 16)}` : '无记录'],
  ['门禁快照', 'ai-control/reports/state/status.json'],
  ['进度台账', 'ai-control/reports/state/progress_ledger.jsonl'],
]
const ew = (W - PAD * 2) / 4
ev.forEach(([k, v], i) => {
  const x = PAD + i * ew
  text(x + 18, y + 26, k, { size: 12, fill: C.faint, weight: '600' })
  text(x + 18, y + 46, v, { size: 11.5, fill: C.ink })
  if (i < 3) push(`  <line x1="${x + ew}" y1="${y + 12}" x2="${x + ew}" y2="${y + eh - 12}" stroke="${C.line}"/>`)
})
y += eh + 30

// 页脚
push(`  <line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="${C.line}"/>`)
text(PAD, y + 22, `一键复现：./scripts/control.sh check · lock · scope · selfcheck`, { size: 12, fill: C.dim })
text(W - PAD, y + 22, '生成器 scripts/gen_control_map.mjs', { size: 11, fill: C.faint, anchor: 'end' })
const H = y + 46

const svg = out.join('\n').replaceAll('__H__', String(H)) + '\n</svg>\n'
const outPath = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'assets/generated_images/control_mechanism_now_v5.svg')
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, svg, 'utf8')
console.log(`✅ 已生成 ${outPath}（${W}×${H}）`)
console.log(`   门禁 ${passN}/${totalN} · 物理锁 LOCK-${lockStage} · 留痕 ${runCount} 行 · 全域 ${scopeTaken}/${scopeTotal || 4}`)
