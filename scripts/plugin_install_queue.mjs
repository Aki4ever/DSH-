#!/usr/bin/env node
/**
 * ==============================================================================
 * 脚本名称：plugin_install_queue.mjs
 * 核心功能：插件安装**并发受理 + 冲突域排队 + 进度可见**，杜绝"等任务空闲"式无界等待
 * 需求依据：REQ-093 / R2「插件安装应允许并发执行，当前经常需要等到任务空闲才可以执行」
 * ------------------------------------------------------------------------------
 * 实测根因（本轮只读取证，不是猜的）：
 *   真凶不在本仓，而在 profile 内第三方市场插件 `dshmarket` 的路由守卫 ——
 *     · `dshmarket/lib/routes.js:5193-5202`：`runningAgentsForGuard()` 非空即回 409 + `agentsBusy`
 *     · `dshmarket/src/agents.ts:26-42`：忙判据只认 `status === 'running'`，**发起安装的当前会话自己就是 running agent**
 *     · `dshmarket/lib/routes.js:499-518`：第二笔请求**直接 409，不入队**
 *     · `dshmarket/client/client.js:9845-9881`：每 2 秒轮询，**仅当全局无 running 会话**才排空队列
 *   运行留痕：`~/.dsh/profiles/desktop/.dsh-market/log.ndjson:7` = `install-blocked … refused while agents are running`
 *
 * 本脚本管的是**本仓这一侧**：受理口绝不设"全体空闲"前置，排队与等待一律**有界、可见、可终止**。
 * 宿主/市场插件那一侧的守卫改造超出本仓边界，需要用户授权改第三方产物，故此处只做**取证与降级**，
 * 不偷偷改他人文件。
 *
 * 用法：
 *   node scripts/plugin_install_queue.mjs enqueue --spec <包名或 spec> [--profile desktop]
 *   node scripts/plugin_install_queue.mjs list
 *   node scripts/plugin_install_queue.mjs drain [--max-attempts 3] [--cmd-template 'dsh plugin add {spec}']
 *   node scripts/plugin_install_queue.mjs probe           # 读市场日志，量化"被守卫拒了几次"
 *   node scripts/plugin_install_queue.mjs --check         # 判定：无无界等待 / 无缺冲突域 / 状态合法
 *   node scripts/plugin_install_queue.mjs --self-test     # 反向用例：注入无界等待必须判红
 *
 * 退出码：0 通过 · 1 判红 · 2 取不到证据
 * ==============================================================================
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const STATE_DIR = path.join(ROOT, 'ai-control/reports/state')
const QUEUE_FILE = path.join(STATE_DIR, 'plugin_install_queue.json')
const MARKET_LOG = path.join(os.homedir(), '.dsh/profiles/desktop/.dsh-market/log.ndjson')

const STATES = ['queued', 'running', 'done', 'failed', 'blocked']
const DEFAULT_MAX_ATTEMPTS = 3

// ── 队列读写 ────────────────────────────────────────────────────────────────
function emptyQueue() {
  return { version: '1.0.0', updatedAt: new Date().toISOString(), items: [] }
}

export function loadQueue() {
  try {
    const d = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'))
    if (!d || !Array.isArray(d.items)) return emptyQueue()
    return d
  } catch {
    return emptyQueue()
  }
}

function saveQueue(q) {
  fs.mkdirSync(STATE_DIR, { recursive: true })
  q.updatedAt = new Date().toISOString()
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(q, null, 2))
}

/**
 * 冲突域：同一 profile 的插件安装共用 profile `package.json` 与 `node_modules`，
 * 因此**提交**必须串行；但**受理**绝不设前置。跨 profile 则是不同域，可真并发。
 */
function domainOf(profile) {
  return `profile:${profile || 'desktop'}`
}

// ── 判定口径（判定与受理分开，判定可独立复跑） ────────────────────────────────
export function inspect(queue, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const issues = []
  for (const it of queue.items) {
    if (!it.id) issues.push('存在没有 id 的队列项')
    if (!it.domain) issues.push(`队列项 ${it.id} 缺冲突域（无冲突域等于没排队）`)
    if (!STATES.includes(it.state)) issues.push(`队列项 ${it.id} 状态非法：${it.state}`)
    if (it.state === 'queued' || it.state === 'running' || it.state === 'blocked') {
      // 有界性判据：重试次数有上界，且等待必须给出"下次尝试时间 + 上次失败原因"
      if (!Number.isInteger(it.attempts) || it.attempts > maxAttempts) {
        issues.push(`队列项 ${it.id} 处于无界等待：attempts=${it.attempts}（上界 ${maxAttempts}）`)
      }
      if (it.state !== 'running' && (!it.nextAttemptAt || !it.lastError)) {
        issues.push(`队列项 ${it.id} 等待不可见：缺 nextAttemptAt 或 lastError（用户看不到"还要等多久、为什么等"）`)
      }
    }
  }
  // 域内并发守恒：同一冲突域不得有两个 running（等于双写同一 profile）
  const runningByDomain = new Map()
  for (const it of queue.items.filter((x) => x.state === 'running')) {
    runningByDomain.set(it.domain, (runningByDomain.get(it.domain) || 0) + 1)
  }
  for (const [d, n] of runningByDomain) if (n > 1) issues.push(`冲突域 ${d} 同时有 ${n} 个提交者（双写同一 profile）`)
  return { pass: issues.length === 0, issues, maxAttempts }
}

// ── 市场守卫取证 ────────────────────────────────────────────────────────────
export function probeMarketLog() {
  if (!fs.existsSync(MARKET_LOG)) return { ok: false, reason: `市场日志不在位：${MARKET_LOG}` }
  const lines = fs.readFileSync(MARKET_LOG, 'utf8').split('\n').filter((l) => l.trim())
  const blocked = []
  let installs = 0
  for (const l of lines) {
    let e
    try {
      e = JSON.parse(l)
    } catch {
      continue
    }
    if (e.event === 'install' || e.event === 'update') installs++
    if (e.event === 'install-blocked' || e.event === 'update-blocked') blocked.push({ at: e.at, event: e.event, detail: e.detail })
  }
  return { ok: true, total: lines.length, installs, blocked, logPath: MARKET_LOG }
}

// ── 命令实现 ────────────────────────────────────────────────────────────────
function cmdEnqueue(argv) {
  const spec = argv[argv.indexOf('--spec') + 1]
  if (!spec || spec.startsWith('--')) {
    console.log('⛔ 用法：node scripts/plugin_install_queue.mjs enqueue --spec <包名或 spec> [--profile desktop]')
    return 2
  }
  const pIdx = argv.indexOf('--profile')
  const profile = pIdx >= 0 ? argv[pIdx + 1] : 'desktop'
  const q = loadQueue()
  if (q.items.some((i) => i.spec === spec && ['queued', 'running'].includes(i.state))) {
    console.log(`ℹ️ 已在队列中且未结束，未重复入队：${spec}`)
    return 0
  }
  const now = new Date().toISOString()
  const item = {
    id: `inst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    spec,
    profile,
    domain: domainOf(profile),
    state: 'queued',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    nextAttemptAt: now,
    lastError: '',
    history: [{ at: now, event: 'enqueued', detail: '受理即入队，受理口不设"全体会话空闲"前置' }],
  }
  q.items.push(item)
  saveQueue(q)
  console.log(`✅ 已受理并入队：${spec}（冲突域 ${item.domain}）—— 受理不等待任何其他任务`)
  return 0
}

function cmdList() {
  const q = loadQueue()
  if (!q.items.length) {
    console.log('📭 队列为空')
    return 0
  }
  console.log('📋 插件安装队列')
  console.log('-----------------------------------------')
  for (const it of q.items) {
    console.log(`   · ${it.state.padEnd(8)} ${it.spec}  [${it.domain}] 尝试 ${it.attempts} 次`)
    if (it.lastError) console.log(`       上次原因：${it.lastError}`)
    if (it.nextAttemptAt && it.state === 'queued') console.log(`       下次尝试：${it.nextAttemptAt}`)
  }
  console.log('-----------------------------------------')
  return 0
}

function cmdDrain(argv) {
  const tIdx = argv.indexOf('--cmd-template')
  const template = tIdx >= 0 ? argv[tIdx + 1] : 'dsh plugin add {spec}'
  const mIdx = argv.indexOf('--max-attempts')
  const maxAttempts = mIdx >= 0 ? Number(argv[mIdx + 1]) : DEFAULT_MAX_ATTEMPTS
  const q = loadQueue()
  const pending = q.items.filter((i) => i.state === 'queued' || i.state === 'blocked')
  if (!pending.length) {
    console.log('📭 没有待提交的安装请求')
    return 0
  }
  const probe = probeMarketLog()
  let blockedCount = 0
  for (const it of pending) {
    if (it.attempts >= maxAttempts) {
      it.state = 'blocked'
      it.lastError = it.lastError || `已达重试上界 ${maxAttempts} 次，停止等待（不做无界等待）`
      it.history.push({ at: new Date().toISOString(), event: 'gave-up', detail: it.lastError })
      blockedCount++
      continue
    }
    it.state = 'running'
    it.attempts += 1
    it.updatedAt = new Date().toISOString()
    const cmd = template.replace('{spec}', it.spec)
    let status = 'done'
    let detail = ''
    let out = ''
    try {
      out = execFileSync('bash', ['-c', cmd], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600000 })
      detail = '提交成功'
      it.state = 'done'
    } catch (error) {
      out = ((error && error.stdout) || '') + ((error && error.stderr) || '')
      status = 'failed'
      const agentGuard = /agents are running|another install is already running|another plugin operation is running|another desktop pnpm operation/i.test(out)
      detail = agentGuard
        ? '被市场守卫拒绝（agentsBusy / 单飞闸门）—— 见 probe 子命令取证'
        : `提交失败：${(error && error.message) || '未知错误'}`
      it.state = agentGuard ? 'queued' : 'failed'
      if (agentGuard) blockedCount++
    }
    it.lastError = detail ? `${detail}｜${out.trim().slice(-200)}` : ''
    const backoffMs = Math.min(2 ** it.attempts, 60) * 1000
    it.nextAttemptAt = new Date(Date.now() + backoffMs).toISOString()
    it.history.push({ at: new Date().toISOString(), event: status, detail: it.lastError.slice(0, 400), cmd })
    console.log(`   ${it.state === 'done' ? '✅' : it.state === 'failed' ? '⛔' : '🟡'} ${it.spec} → ${it.state}（尝试 ${it.attempts}/${maxAttempts}）`)
    if (it.lastError) console.log(`       ${it.lastError.slice(0, 200)}`)
  }
  saveQueue(q)
  if (blockedCount) {
    console.log('')
    console.log('⚠️ 有请求被市场守卫挡下。这是**已知外部成因**（REQ-093 / G2），不是本脚本的缺陷：')
    console.log('   · 市场插件 `dshmarket` 把"发起安装的当前会话"也算作 running agent，于是必然回 409')
    console.log('   · 本队列的作用是把"无界等待"变成"有界重试 + 进度可见 + 明确原因"')
    console.log(`   · 想看到历史拦截次数：node scripts/plugin_install_queue.mjs probe`)
  }
  return blockedCount ? 1 : 0
}

function cmdProbe() {
  const p = probeMarketLog()
  if (!p.ok) {
    console.log(`⛔ 取不到证据：${p.reason}`)
    return 2
  }
  console.log('🔍 市场插件安装守卫 · 取证')
  console.log('-----------------------------------------')
  console.log(`日志：${p.logPath}（${p.total} 行）`)
  console.log(`安装/更新事件 ${p.installs} 条 · 被守卫拒绝 ${p.blocked.length} 条`)
  for (const b of p.blocked) console.log(`   · ${b.at} ${b.event}：${String(b.detail).slice(0, 140)}`)
  console.log('-----------------------------------------')
  console.log(p.blocked.length ? '⚠️ 存在"因有会话在跑而拒绝安装"的实证留痕' : '✅ 未发现被守卫拒绝的留痕')
  return 0
}

export function cmdCheck(opts = {}) {
  const q = opts.queue || loadQueue()
  const r = inspect(q, opts)
  if (opts.json) {
    console.log(JSON.stringify({ ...r, items: q.items.length }, null, 2))
    return r.pass ? 0 : 1
  }
  console.log('🚦 插件安装队列 · 判定（拒绝无界等待）')
  console.log('-----------------------------------------')
  console.log(`队列项 ${q.items.length} 个 · 重试上界 ${r.maxAttempts} 次`)
  for (const i of r.issues) console.log(`   ⛔ ${i}`)
  console.log('-----------------------------------------')
  console.log(r.pass ? '✅ 队列契约成立：无无界等待、无缺冲突域、无同域双提交' : `⛔ 队列存在 ${r.issues.length} 处违规`)
  return r.pass ? 0 : 1
}

function selfTest() {
  const bad = {
    version: '1.0.0',
    items: [
      { id: 'x1', spec: 'a', domain: '', state: 'queued', attempts: 999, nextAttemptAt: null, lastError: '' },
      { id: 'x2', spec: 'b', domain: 'profile:desktop', state: 'running', attempts: 1 },
      { id: 'x3', spec: 'c', domain: 'profile:desktop', state: 'running', attempts: 1 },
    ],
  }
  const r = inspect(bad)
  const caught =
    !r.pass &&
    r.issues.some((i) => i.includes('缺冲突域')) &&
    r.issues.some((i) => i.includes('无界等待')) &&
    r.issues.some((i) => i.includes('等待不可见')) &&
    r.issues.some((i) => i.includes('双写同一 profile'))
  console.log('🧪 插件安装队列判定器 · 反向用例自检')
  console.log('-----------------------------------------')
  for (const i of r.issues) console.log(`   · 命中：${i}`)
  console.log('-----------------------------------------')
  console.log(caught ? '✅ 反向用例通过：四类违规全部被判红' : '⛔ 反向用例失败：判定器漏判')
  return caught ? 0 : 1
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--self-test')) process.exit(selfTest())
  if (argv.includes('--check')) process.exit(cmdCheck({ json: argv.includes('--json') }))
  const cmd = argv[0]
  if (cmd === 'enqueue') process.exit(cmdEnqueue(argv))
  if (cmd === 'list') process.exit(cmdList())
  if (cmd === 'drain') process.exit(cmdDrain(argv))
  if (cmd === 'probe') process.exit(cmdProbe())
  console.log('用法：node scripts/plugin_install_queue.mjs <enqueue|list|drain|probe> [选项] | --check | --self-test')
  process.exit(2)
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main()
