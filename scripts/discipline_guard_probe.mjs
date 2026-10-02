#!/usr/bin/env node
// ==============================================================================
// 纪律停用物理阻断探针 (Discipline Suspension Guard Probe) —— REQ-098 / R6
// ------------------------------------------------------------------------------
// 为什么必须有它：R6 说"扣到 60 分以下就停用"。若只证明"账本能算出 suspended=true"，
// 那证明的是**算术**，不是**后果**——"算出来该停用"与"真的被拦住"是两件事，
// 本工程的既有教训正是"看板全绿而机制从未通电"。
//
// 本探针把整条传导链**实跑**一遍，逐环取真实凭据：
//   ① 临时账本扣到 50 分（不污染生产账本）
//   ② `--check` 判不通过（退出码 1）
//   ③ 累积门禁把纪律分列为卡点 → 写入状态快照的 execAllowed 变假
//   ④ 直接调用宿主拦截层的 `evaluate()`（**真函数，非桩件**）
//      → 改动型调用被拒、只读调用放行、逃生舱仍开
//   ⑤ 满分账本对照组：纪律这一维不产生卡点、write 放行（证明不是"一律拦"）
//
// 隔离手段：`DSH_DISCIPLINE_LEDGER` 指向临时账本，`DSH_CONTROL_HOME` 指向临时状态目录。
//
// 用法：node scripts/discipline_guard_probe.mjs [--json]
// 退出码：0 全部环节成立；1 任一环节不成立（停用只是措辞）；2 取不到证据
// ==============================================================================

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { evaluate, Config } from '../ai-control/plugin/index.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SCORE = join(ROOT, 'scripts', 'discipline_score.mjs')
const GATES = join(ROOT, 'scripts', 'control_gates.sh')
const PROD_LEDGER = join(ROOT, 'ai-control', 'reports', 'discipline', 'ledger.jsonl')

/** 跑一条命令并原样保留退出码（失败不抛，退出码就是证据）。 */
function sh(cmd, args, env, cwd = ROOT) {
  try {
    const out = execFileSync(cmd, args, { env, cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000 })
    return { code: 0, out }
  } catch (e) {
    return { code: typeof e.status === 'number' ? e.status : -1, out: String(e.stdout || '') + String(e.stderr || '') }
  }
}

const lineCount = (p) => (existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).length : 0)
const readJson = (p) => {
  try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null }
}

function main() {
  const json = process.argv.includes('--json')
  const cases = []
  const add = (name, ok, detail) => cases.push({ name, ok: !!ok, detail: String(detail) })

  const prodBefore = lineCount(PROD_LEDGER)
  const ex = (name, args) => ({ name, arguments: args })

  // ── 甲组：低分账本（应停用）─────────────────────────────────────────────────
  const tmpA = mkdtempSync(join(tmpdir(), 'disc-probe-low-'))
  const ctlA = join(tmpA, 'ctl')
  mkdirSync(ctlA, { recursive: true })
  const envA = { ...process.env, DSH_DISCIPLINE_LEDGER: join(tmpA, 'ledger.jsonl'), DSH_CONTROL_HOME: ctlA }

  sh('node', [SCORE, 'open', '--task', '探针：停用演练'], envA)
  sh('node', [SCORE, 'deduct', '--level', 'L5', '--by', 'officer', '--reason', '探针：致命违规', '--evidence', 'probe|exit=1'], envA)
  sh('node', [SCORE, 'deduct', '--level', 'L3', '--by', 'officer', '--reason', '探针：较重违规', '--evidence', 'probe|exit=1'], envA)
  const chain = sh('node', [SCORE, 'verify-chain'], envA)
  add('甲1 临时账本扣至 50 分且哈希链自洽', chain.code === 0, `verify-chain 退出码 ${chain.code}`)

  const chk = sh('node', [SCORE, '--check', '--json'], envA)
  const stA = (() => { try { return JSON.parse(chk.out) } catch { return null } })()
  add('甲2 判定器：--check 退出码 1（判不通过）', chk.code === 1, `退出码 ${chk.code}`)
  add('甲3 判定器：suspended=true 且 current=50', !!stA && stA.suspended === true && stA.current === 50,
    stA ? `current=${stA.current} suspended=${stA.suspended}` : '无输出')

  // 门禁：把临时状态目录与临时账本喂给真门禁引擎
  const gateA = sh('bash', [GATES, 'check'], envA)
  const gsA = readJson(join(ctlA, 'status.json'))
  const scoreGate = gsA && Array.isArray(gsA.gates) ? gsA.gates.find((g) => g.id === 'score') : null
  add('甲4 门禁引擎：纪律分列为卡点（非 pass）', !!scoreGate && scoreGate.status !== 'pass',
    scoreGate ? `G7 状态 ${scoreGate.status}` : '未取到门禁快照')
  add('甲5 门禁引擎：execAllowed=false（停用的传导点）', !!gsA && gsA.execAllowed === false,
    gsA ? `execAllowed=${gsA.execAllowed}` : '未取到门禁快照')

  if (gsA) {
    const cfg = Config
    // 卡点清单：门禁引擎按顺序取"第一个非 pass"作为展示卡点，若此刻别的门禁也红（例如工作树未提交导致 G3 红），
    // 展示卡点就未必是纪律分。所以本项判据必须**不依赖顺序**：要证明的是"纪律分确实在非 pass 清单里"，
    // 而不是"它恰好排在第一"。这正是探针自己抓出来的一处顺序依赖缺陷。
    const nonPass = Array.isArray(gsA.gates) ? gsA.gates.filter((g) => g.status !== 'pass').map((g) => g.name) : []
    const w = evaluate(ex('write', { file_path: '/tmp/probe_target.txt', content: 'x' }), gsA, cfg)
    add('甲6 拦截层 evaluate()：write 被拒', typeof w === 'string' && w.includes('硬门禁'),
      typeof w === 'string' ? '已拒并给出理由' : '被放行（停用没有牙）')
    add('甲7 卡点清单包含纪律分，且拒绝理由如实点名卡点', typeof w === 'string' && w.includes('当前卡点') && nonPass.includes('纪律分'),
      typeof w === 'string' ? `非 pass 门禁：${nonPass.join('／') || '无'}` : '无理由')
    const e1 = evaluate(ex('edit', { file_path: '/tmp/probe_target.txt' }), gsA, cfg)
    const b1 = evaluate(ex('bash', { command: 'echo hello' }), gsA, cfg)
    add('甲8 拦截层：edit / bash 一并被拒', typeof e1 === 'string' && typeof b1 === 'string',
      `edit=${typeof e1} bash=${typeof b1}`)
    const ro = [
      evaluate(ex('read', { file_path: '/tmp/x' }), gsA, cfg),
      evaluate(ex('grep', { pattern: 'x' }), gsA, cfg),
      evaluate(ex('glob', { pattern: '*' }), gsA, cfg),
      evaluate(ex('todo_write', { todos: [] }), gsA, cfg),
    ]
    add('甲9 只读与汇报不被停用（read/grep/glob/todo_write 放行）', ro.every((v) => v === undefined),
      ro.map((v) => (v === undefined ? '放行' : '被拒')).join('／'))
    const esc = evaluate(ex('bash', { command: './scripts/control_gates.sh check' }), gsA, cfg)
    add('甲10 逃生舱保留：修复管控自身的调用仍放行', esc === undefined,
      esc === undefined ? '放行（避免修门禁须先过门禁）' : '被拒（会形成死锁）')
  }

  // ── 乙组：满分账本（对照组，证明"纪律这一维"不是一律拦）────────────────────
  // 判据必须**只落在纪律这一维**上：整仓 execAllowed 由所有门禁共同决定
  // （例如工作树有未提交文件时 G3 也会红），拿它当对照组等于把无关变量当结论——
  // 这正是本探针自己抓出的第二处缺陷。
  const tmpB = mkdtempSync(join(tmpdir(), 'disc-probe-ok-'))
  const ctlB = join(tmpB, 'ctl')
  mkdirSync(ctlB, { recursive: true })
  const envB = { ...process.env, DSH_DISCIPLINE_LEDGER: join(tmpB, 'ledger.jsonl'), DSH_CONTROL_HOME: ctlB }
  sh('bash', [GATES, 'check'], envB)
  const gsB = readJson(join(ctlB, 'status.json'))
  const scoreGateB = gsB && Array.isArray(gsB.gates) ? gsB.gates.find((g) => g.id === 'score') : null
  add('乙1 对照组：满分账本下纪律分门禁为 pass（不产生卡点）', !!scoreGateB && scoreGateB.status === 'pass',
    scoreGateB ? `G7 状态 ${scoreGateB.status}` : '未取到门禁快照')
  const chkB = sh('node', [SCORE, '--check'], envB)
  add('乙2 对照组：判定器 --check 退出码 0（未触发停用）', chkB.code === 0, `退出码 ${chkB.code}`)
  if (gsB) {
    // 只把"纪律维之外的门禁"这一无关变量固定掉（execAllowed 置真），再看纪律不拦人；
    // 甲组已经用**未加工的真实快照**证明了停用会拦人，两组不冲突。
    const isolated = { ...gsB, execAllowed: true }
    const wB = evaluate(ex('write', { file_path: '/tmp/probe_target.txt', content: 'x' }), isolated, { ...Config, enforceTodo: false })
    add('乙3 对照组：write 放行（纪律这一维不拦人）', wB === undefined, wB === undefined ? '放行' : '被拒')
  }

  // ── 丙组：隔离与不污染 ────────────────────────────────────────────────────
  const prodAfter = lineCount(PROD_LEDGER)
  add('丙1 生产账本零污染（临时账本隔离生效）', prodBefore === prodAfter, `记录数 ${prodBefore} → ${prodAfter}`)

  rmSync(tmpA, { recursive: true, force: true })
  rmSync(tmpB, { recursive: true, force: true })
  // 探针跑过门禁会把"停用"快照写进降级副本，收尾立刻用真实状态覆盖回健康值，
  // 否则探针自己会短暂顶掉线上看板（这就是"测试不能反噬生产"）。
  const envClean = { ...process.env }
  delete envClean.DSH_DISCIPLINE_LEDGER
  delete envClean.DSH_CONTROL_HOME
  sh('bash', [GATES, 'check'], envClean)

  const failed = cases.filter((c) => !c.ok)
  if (json) {
    console.log(JSON.stringify({ ok: failed.length === 0, cases }, null, 2))
    return failed.length ? 1 : 0
  }
  console.log('=== 纪律停用物理阻断探针（REQ-098 / R6）===')
  for (const c of cases) console.log(`${c.ok ? '✅' : '❌'} ${c.name}（${c.detail}）`)
  console.log('-----------------------------------------')
  console.log(failed.length
    ? `❌ ${failed.length}/${cases.length} 个环节不成立 —— "低于 60 分停用"目前只是措辞`
    : `🎉 ${cases.length}/${cases.length} 个环节全部成立 —— 停用是可观测的物理后果`)
  return failed.length ? 1 : 0
}

process.exit(main())
