#!/usr/bin/env node
// ==============================================================================
// 判定器：mobile_bridge_audit.mjs（REQ-094 · 手机远端操控是否真的能通）
// ==============================================================================
// 为什么需要一个"判定器"而不是靠自述"我做好了"：
//   本工程已有实测教训（REQ-087/REQ-092）：文档写满、看板 100%，而机制从未被加载。
//   手机接管这条链路的物理事实只有三条能证伪：
//     ① 载体在不在（脚本存在且可执行）；
//     ② 宿主认不认我们现签的 cookie（拿真宿主实活取证，认不出就是 401）；
//     ③ 代理有没有把 Host/Origin 改写成回环（否则 /api 会被 403 围栏拦掉）。
//   本判定器把这三条做成两条命令：
//     --check  结构 + 实活（宿主没开时明确降级为 SKIP，不静默算通过）
//     --e2e    真起一个网桥进程内的实例，走完 PIN→index→/api 全链路，逐项断言
// 退出码：0 通过；1 未达标（真缺陷）；2 不可判定（前置条件不满足）
// ==============================================================================

import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'
import {
  GLOBAL_ROOT,
  STATE_FILE,
  createBridge,
  detectDshPort,
  forgeDshCookie,
  generateKey,
  generatePin,
  httpGet,
  probeDshHost,
  readBrowserSessionSecret,
  stateFileMode
} from './lib/mobile_bridge_core.mjs'

const args = new Set(process.argv.slice(2))
const MODE_E2E = args.has('--e2e')
const ok = []
const bad = []
const skip = []
const say = (line) => process.stdout.write(`${line}\n`)

function checkCarriers() {
  const carriers = [
    'scripts/mobile_control.sh',
    'scripts/mobile_bridge.mjs',
    'scripts/mobile_bridge_audit.mjs',
    'scripts/lib/mobile_bridge_core.mjs'
  ]
  for (const rel of carriers) {
    const abs = join(GLOBAL_ROOT, rel)
    if (!existsSync(abs)) {
      bad.push(`载体缺失：${rel}`)
      continue
    }
    // 库文件（lib/）只要求可读；入口（.sh 与带 shebang 的 .mjs）必须可执行，否则"有文件但没有可跑入口"
    const isLibrary = rel.includes('/lib/')
    if (!isLibrary && (statSync(abs).mode & 0o111) === 0) {
      bad.push(`入口不可执行：${rel}（缺 x 权限）`)
      continue
    }
    ok.push(`载体在位${isLibrary ? '可读' : '可执行'}：${rel}`)
  }
}

function checkLedgerAndDocs() {
  const ledger = join(GLOBAL_ROOT, 'docs', 'requirements.md')
  const docRel = 'docs/mobile_control_dsh.md'
  const docAbs = join(GLOBAL_ROOT, docRel)
  if (!existsSync(ledger)) {
    bad.push('需求台账缺失：docs/requirements.md')
    return
  }
  const text = readFileSync(ledger, 'utf8')
  if (!/###\s+REQ-094/u.test(text)) bad.push('台账没有 REQ-094 条目（无需求依据的载体一律不成立）')
  else ok.push('台账含 REQ-094 条目')
  if (!text.includes(docRel)) bad.push(`台账未指向需求文案 ${docRel}`)
  else ok.push(`台账指向需求文案 ${docRel}`)
  if (!existsSync(docAbs)) {
    bad.push(`需求文案不存在：${docRel}`)
    return
  }
  ok.push(`需求文案在位：${docRel}`)
  // 悬空引用检查：文案里以 scripts/ 或 docs/ 开头的相对路径必须真实存在
  const doc = readFileSync(docAbs, 'utf8')
  const refs = [...doc.matchAll(/`((?:scripts|docs|indexes|rules|ai-control)\/[A-Za-z0-9_./-]+)`/gu)].map((m) => m[1])
  const dangling = [...new Set(refs)].filter((rel) => !existsSync(join(GLOBAL_ROOT, rel)))
  if (dangling.length > 0) bad.push(`需求文案存在悬空引用：${dangling.join(', ')}`)
  else ok.push(`需求文案引用可达（${new Set(refs).size} 条路径全部存在）`)
}

function checkStatePermissions() {
  if (!existsSync(STATE_FILE)) {
    skip.push('网桥状态文件不存在（尚未 start 过，权限项按不适用处理）')
    return
  }
  const mode = stateFileMode()
  if (mode !== 0o600) bad.push(`状态文件权限过宽：${STATE_FILE} 是 ${mode?.toString(8)}（含 PIN/密钥，必须 600）`)
  else ok.push('状态文件权限 600（PIN/密钥不外泄）')
}

async function checkLiveSecretAndHost() {
  let secret
  try {
    const found = readBrowserSessionSecret()
    secret = found.secret
    ok.push(`宿主鉴权密钥可读：${found.source}`)
  } catch (error) {
    bad.push(`宿主鉴权密钥不可读：${error.message}`)
    return
  }
  const located = await detectDshPort(secret)
  if (located.port === undefined) {
    skip.push(`未发现运行中的 DSH 宿主（探测 ${located.tried.join(', ')}）——实活取证不可判定，降级为结构判定`)
    return
  }
  const probe = await probeDshHost(located.port, secret)
  if (probe.code === 0) ok.push(`宿主 127.0.0.1:${located.port} 认下现签 cookie（${probe.detail}）`)
  else bad.push(`宿主 ${located.port} 实活取证失败：${probe.detail}（否则手机端会卡在 401）`)
}

function portFree(port) {
  return new Promise((resolve) => {
    const probe = createServer()
    probe.once('error', () => resolve(false))
    probe.once('listening', () => probe.close(() => resolve(true)))
    probe.listen(port, '127.0.0.1')
  })
}

/** 端到端：进程内起真网桥 → PIN 闸门 → index → /api 围栏与鉴权，逐项断言。 */
async function runE2E() {
  let secret
  try {
    secret = readBrowserSessionSecret().secret
  } catch (error) {
    say(`不可判定：读不到宿主鉴权密钥（${error.message}）`)
    return 2
  }
  const located = await detectDshPort(secret)
  if (located.port === undefined) {
    say(`不可判定：未发现运行中的 DSH 宿主（探测 ${located.tried.join(', ')}），请先启动桌面端`)
    return 2
  }
  const port = 19390 + Math.floor(Math.random() * 50)
  if (!(await portFree(port))) {
    say(`不可判定：测试端口 ${port} 被占用`)
    return 2
  }
  const pin = generatePin()
  const key = generateKey()
  const { server } = createBridge({ bridgePort: port, bind: '127.0.0.1', dshPort: located.port, pin, key })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })
  const base = `http://127.0.0.1:${port}`
  const results = []
  const expect = async (label, actual, want) => {
    const pass = actual === want
    results.push({ label, actual, want, pass })
    say(`   ${pass ? '✅' : '❌'} ${label}：实际 ${actual}，期望 ${want}`)
  }
  try {
    expect('无 PIN 访问 index 被拒', (await httpGet(`${base}/`)).status, 401)
    const raw = await rawFetch(`${base}/?k=${pin}`)
    expect('带 PIN 访问 index 成功', raw.status, 200)
    const cookie = (raw.headers['set-cookie'] ?? '').split(';')[0]
    expect('带 PIN 时下发网桥会话 cookie', cookie.startsWith('dsh-bridge='), true)

    const noAuth = await rawPost(`${base}/api/nope/nope`, undefined)
    expect('无会话访问 /api 被拒', noAuth.status, 401)
    const authed = await rawPost(`${base}/api/nope/nope`, cookie)
    expect('/api 通过围栏与鉴权（404=已进 RPC 层）', authed.status, 404)
    const authedRpc = await rawPost(`${base}/api/workspace/list`, cookie)
    expect('真实端点不被 Host/Origin 围栏拦（≠401/403）', [401, 403].includes(authedRpc.status) ? 0 : 1, 1)

    // 直接验证"现签 cookie 被宿主接受"（不经网桥），把失败面锁到具体一层
    const direct = await rawFetch(`http://127.0.0.1:${located.port}/`, {
      cookie: forgeDshCookie(`127.0.0.1:${located.port}`, secret)
    })
    expect('现签 cookie 被宿主直接接受', direct.status, 200)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
  const failed = results.filter((r) => !r.pass)
  say(`端到端：${results.length - failed.length}/${results.length} 项通过`)
  return failed.length === 0 ? 0 : 1
}

/** 取完整响应（含响应头），用于断言 Set-Cookie。 */
async function rawFetch(url, { cookie, method = 'GET', body } = {}) {
  const headers = {}
  if (cookie !== undefined) headers.cookie = cookie
  if (body !== undefined) headers['content-type'] = 'application/json'
  const response = await fetch(url, { method, headers, body, redirect: 'manual' })
  const responseHeaders = {}
  response.headers.forEach((value, name) => {
    responseHeaders[name] = value
  })
  return { status: response.status, headers: responseHeaders, text: await response.text() }
}

function rawPost(url, cookie) {
  return rawFetch(url, {
    method: 'POST',
    cookie,
    body: JSON.stringify({ type: 'client-request', rpcId: 'audit-1', method: 'nope/nope', payload: {} })
  })
}

// ── 主流程 ───────────────────────────────────────────────────────────────────

if (MODE_E2E) {
  say('【手机接管 · 端到端实跑】')
  process.exitCode = await runE2E()
} else {
  checkCarriers()
  checkLedgerAndDocs()
  checkStatePermissions()
  await checkLiveSecretAndHost()
  say('【手机操控 DSH · 落地判定】')
  for (const line of ok) say(`   ✅ ${line}`)
  for (const line of skip) say(`   ⏭️  ${line}`)
  for (const line of bad) say(`   ❌ ${line}`)
  say(`   通过 ${ok.length} · 跳过 ${skip.length} · 未达标 ${bad.length}`)
  process.exitCode = bad.length > 0 ? 1 : 0
}
