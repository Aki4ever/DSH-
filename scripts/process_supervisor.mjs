#!/usr/bin/env node
/**
 * ==============================================================================
 * 流程监督员（判定器形态）· Process Supervisor — REQ-087 / GCM-PHY · R1-d
 * ==============================================================================
 * 背景（"拒绝空架子"的实测结论）：
 *   `skill-pool/agents/process-supervisor-agent/` 只有一份契约 Markdown，
 *   而**宿主没有 agent 注册面** —— 谁也调不起它，`mechanism_audit` 判它"无物理载体"。
 *   按"禁止虚无缥缈"的口径，本轮**不假装它有载体**，而是把它降级/升级为
 *   一个真正能跑的独立复核判定器：一条命令、一个退出码、一份可粘贴的复核回执。
 *
 * 它与执行者的关系：
 *   · 执行者说"我做完了" → 本器**不采信**，独立重跑全部客观判定；
 *   · 只认退出码与磁盘事实，任何一项不过即整单驳回。
 *
 * 用法：
 *   node scripts/process_supervisor.mjs            # 全量复核（人读回执）
 *   node scripts/process_supervisor.mjs --fast     # 只跑轻判定（跳过审计/指纹）
 *   node scripts/process_supervisor.mjs --list     # 只列复核项清单（不执行，供上层审计核验）
 *   node scripts/process_supervisor.mjs --json
 * 退出码：0 全过；1 有硬判定不过；2 用法错误
 * ==============================================================================
 */

import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const args = process.argv.slice(2)
const json = args.includes('--json')
const fast = args.includes('--fast')

/**
 * 复核项登记表。
 * hard=true 的项不过即整单驳回；soft 只提示（如"需重启宿主"这类非执行者可解决的）。
 */
const CHECKS = [
  { id: 'G0', name: '会话命名合规', cmd: 'bash scripts/check_task_naming.sh --exit', hard: true },
  { id: 'G1-4', name: '累积门禁 G0~G7', cmd: 'bash scripts/control_gates.sh check', hard: true, grep: '门禁通过' },
  { id: 'S07', name: '待办常显（宿主转录证据）', cmd: 'bash scripts/todo_gate.sh check', hard: true },
  { id: 'S11', name: '写后必读回 + 迭代台账', cmd: 'node scripts/progress_ledger.mjs check', hard: true },
  { id: 'R3', name: '流程管控层一致性', cmd: 'node scripts/flow_control.mjs --check', hard: true },
  { id: 'S13a', name: '冗余双检', cmd: 'node scripts/redundancy_scan.mjs --root .', hard: true, grep: '高相似对 0' },
  { id: 'S13b', name: '冲突双检', cmd: 'node scripts/conflict_scan.mjs --root .', hard: true, grep: '未发现冲突' },
  { id: 'S13c', name: '存量对齐', cmd: 'node scripts/legacy_align_scan.mjs --root .', hard: true, grep: '存量已与新规范对齐' },
  { id: 'R1b', name: '执行层 100% 入索引', cmd: 'node scripts/build_capabilities_index.mjs --check', hard: true },
  { id: 'S16', name: '执行效果审计（≥85）', cmd: 'bash scripts/audit_execution.sh', hard: true, score: /(\d+)\s*\/\s*100/ },
  { id: 'HOST', name: '拦截层宿主激活', cmd: 'bash scripts/install_host_gate.sh verify', hard: false },
  { id: 'R1', name: '机制物理触达审计', cmd: 'node scripts/mechanism_audit.mjs --exit', hard: false },
]

// --list：只列复核项清单，不执行任何判定。
// 存在的理由：上层审计器（mechanism_audit）需要一个**非递归**的功能性判据来证明本载体真的可用；
// 若让审计器整单跑复核，本器又会回调审计器，形成无限递归。
if (args.includes('--list')) {
  for (const c of CHECKS) console.log(`${c.id} ${c.hard ? 'hard' : 'soft'} ${c.name}`)
  console.log(`合计 ${CHECKS.length} 项（硬项 ${CHECKS.filter((c) => c.hard).length}）`)
  process.exit(0)
}

function runCheck(c) {
  let out = ''
  let exit = 0
  try {
    out = execFileSync('bash', ['-c', c.cmd], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 300000 })
  } catch (e) {
    exit = typeof e.status === 'number' ? e.status : -1
    out = String(e.stdout || '') + '\n' + String(e.stderr || '')
  }
  let ok = exit === 0
  let extra = ''
  if (c.grep) {
    const g = out.includes(c.grep)
    ok = ok && g
    if (!g) extra = `未见关键判据「${c.grep}」`
  }
  if (c.score) {
    const m = out.match(c.score)
    if (m) {
      const s = Number(m[1])
      ok = ok && s >= 85
      extra = `得分 ${s}`
    } else if (!/执行效果/.test(out)) {
      ok = false
      extra = '未取得量化得分'
    }
  }
  const last = out.split('\n').map((s) => s.trim()).filter(Boolean).pop() || ''
  return { ok, exit, extra, last: last.slice(0, 120) }
}

const results = []
for (const c of CHECKS) {
  if (fast && ['S16', 'R1', 'HOST'].includes(c.id)) continue
  const r = runCheck(c)
  results.push({ ...c, ...r })
}

const hardFails = results.filter((r) => r.hard && !r.ok)
const softFails = results.filter((r) => !r.hard && !r.ok)

if (json) {
  console.log(JSON.stringify({ ok: hardFails.length === 0, results }, null, 2))
  process.exit(hardFails.length ? 1 : 0)
}

console.log('🕵️ 流程监督员 · 独立复核回执（不采信执行者自述，只认退出码与磁盘）')
console.log('════════════════════════════════════════════════════════')
console.log('| 复核项 | 判定 | 实况 |')
console.log('| :--- | :---: | :--- |')
for (const r of results) {
  const mark = r.ok ? '✅ 通过' : (r.hard ? '⛔ 驳回' : '⚠️ 软项')
  console.log(`| **${r.id} ${r.name}** | ${mark} | ${r.extra ? r.extra + ' · ' : ''}${r.last.replace(/\|/g, '/')} |`)
}
console.log('════════════════════════════════════════════════════════')
if (hardFails.length === 0) {
  console.log(`✅ 独立复核通过：硬项 ${results.filter((r) => r.hard).length}/${results.filter((r) => r.hard).length} 全绿${softFails.length ? ` · 软项待办 ${softFails.map((r) => r.id).join('/')}` : ''}`)
  process.exit(0)
}
console.log(`⛔ 独立复核驳回：${hardFails.map((r) => r.id + ' ' + r.name).join('、')} → 禁止结项`)
process.exit(1)
