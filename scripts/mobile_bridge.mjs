#!/usr/bin/env node
// ==============================================================================
// 脚本名称：mobile_bridge.mjs（REQ-094 · 手机远端操控 DSH 的唯一物理载体）
// 功能描述：在 Mac 上开一个**只服务私网**的网桥，把只能回环访问的 DSH Web GUI
//           安全地交给 iPhone/iPad 浏览器，手机上就是完整的 DSH 界面（会话/输入/流式输出）。
// ==============================================================================
// 为什么不是"现成方案"就能收工（实测结论，逐条可复跑）：
//   · `lsof -nP -iTCP -sTCP:LISTEN` 实测宿主只绑 `127.0.0.1:19387` → 手机连不上；
//   · 直连尝试返回 **401**（`dsh web authentication required`）→ 光转发端口也没用；
//   · 宿主自带 `dsh web --host 0.0.0.0` 能力（`dsh-host-webserver` 的 host 枚举里确有 0.0.0.0），
//     但桌面端 `dsh-desktop-host` 写死只传 `--no-open --port 19387`，且启动 URL 里带的是
//     **每进程随机 launchToken**（只存内存），换一次启动就失效 —— 所以桌面端这条路不可用。
//   本脚本改用"持久化签名密钥现签 cookie"（密钥在 `$DSH_HOME/.credentials.yaml`，可复算），
//   于是手机端只需要一次 PIN，且**重启 DSH 也不用换链接**。
//
// 用法：
//   node scripts/mobile_bridge.mjs start [--port 19388] [--bind 0.0.0.0] [--pin 123456] [--dsh-port 19387]
//   node scripts/mobile_bridge.mjs status [--json]
//   node scripts/mobile_bridge.mjs url
//   node scripts/mobile_bridge.mjs doctor
//   node scripts/mobile_bridge.mjs stop
//   node scripts/mobile_bridge.mjs serve        # 前台运行（内部由 start 以守护进程方式调用）
// 退出码：0 成功；1 检查未过/操作失败；2 用法或前置条件不可判定
// ==============================================================================

import { spawn } from 'node:child_process'
import { existsSync, openSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ACCESS_LOG,
  DEFAULT_BRIDGE_PORT,
  DEFAULT_DSH_PORT,
  GLOBAL_ROOT,
  STATE_DIR,
  STATE_FILE,
  createBridge,
  detectDshPort,
  generateKey,
  generatePin,
  httpGet,
  lanAddresses,
  probeDshHost,
  readBrowserSessionSecret,
  readState,
  writeState
} from './lib/mobile_bridge_core.mjs'

const SELF = fileURLToPath(import.meta.url)
const OK = '✅'
const BAD = '❌'
const WARN = '⚠️ '

function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (token.startsWith('--')) {
      const key = token.slice(2)
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        out[key] = next
        i++
      } else out[key] = true
    } else out._.push(token)
  }
  return out
}

function say(line = '') {
  process.stdout.write(`${line}\n`)
}

function portIsFree(port, bind = '0.0.0.0') {
  return new Promise((resolve) => {
    const probe = createServer()
    probe.once('error', () => resolve(false))
    probe.once('listening', () => probe.close(() => resolve(true)))
    probe.listen(port, bind)
  })
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

async function waitForBridge(port, timeoutMs = 6000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const res = await httpGet(`http://127.0.0.1:${port}/__bridge/status`, { timeoutMs: 600 })
    if (res.status === 200) return JSON.parse(res.body)
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  return undefined
}

function phoneUrls(port, pin) {
  const list = lanAddresses()
  if (list.length === 0) return [`http://127.0.0.1:${port}/?k=${pin}（未发现局域网 IPv4，请确认 Wi-Fi 已连接）`]
  return list.map((ip) => `http://${ip}:${port}/?k=${pin}`)
}

// ── 子命令 ───────────────────────────────────────────────────────────────────

async function cmdStart(args) {
  const port = Number(args.port ?? DEFAULT_BRIDGE_PORT)
  const bind = String(args.bind ?? '0.0.0.0')
  // 重启默认**沿用**上次的 PIN 与会话密钥：否则手机上已保存的主屏图标/书签每重启一次就失效一次。
  // 这是实测出来的体验缺陷（本轮修复）：stop 后 start 换 PIN，已被手机保存的链接直接 401。
  const previous = readState()
  const reuse = args['new-pin'] !== true && previous?.pin !== undefined
  const pin = String(args.pin ?? (reuse ? previous.pin : generatePin()))
  const key = previous?.key ?? generateKey()

  if (!/^\d{4,12}$/u.test(pin)) {
    say(`${BAD} --pin 必须是 4~12 位数字（当前：${pin}）`)
    return 2
  }
  let secret
  try {
    secret = readBrowserSessionSecret()
  } catch (error) {
    say(`${BAD} 读不到宿主鉴权密钥：${error.message}`)
    say('   · 确认 DSH 桌面端已启动过一次（密钥由宿主首次启动时写入）。')
    return 2
  }
  const found = await detectDshPort(secret.secret, { explicit: args['dsh-port'] })
  if (found.port === undefined) {
    say(`${BAD} 找不到正在运行的 DSH 宿主（已探测端口：${found.tried.join(', ')}）`)
    say('   · 先启动 DeepSeek Harness 桌面端，或显式指定 --dsh-port <端口>。')
    return 2
  }
  const existing = readState()
  if (existing !== undefined && pidAlive(existing.pid)) {
    say(`${WARN} 网桥已在运行（pid ${existing.pid}，端口 ${existing.bridgePort}）。要重启请先 stop。`)
    say(`   手机入口：${phoneUrls(existing.bridgePort, existing.pin)[0]}`)
    return 0
  }
  if (!(await portIsFree(port, bind))) {
    say(`${BAD} 端口 ${port} 已被占用（${bind}）。换一个：--port <其他端口>。`)
    return 1
  }
  const state = {
    pid: null,
    bridgePort: port,
    bind,
    dshPort: found.port,
    pin,
    key,
    startedAt: new Date().toISOString(),
    secretSource: secret.source,
    logFile: join(STATE_DIR, 'serve.log')
  }
  writeState(state)

  const log = openSync(state.logFile, 'a')
  const child = spawn(process.execPath, [SELF, 'serve'], { detached: true, stdio: ['ignore', log, log] })
  child.unref()
  const live = await waitForBridge(port)
  if (live === undefined) {
    say(`${BAD} 网桥启动后 6 秒内无响应，请看日志：${state.logFile}`)
    return 1
  }
  state.pid = child.pid
  writeState(state)
  const probe = await probeDshHost(found.port, secret.secret)
  say(`${OK} 网桥已启动：pid ${child.pid} · 监听 ${bind}:${port} · 上游 127.0.0.1:${found.port}`)
  say(`   · 宿主鉴权：${probe.detail}`)
  say(`   · 手机入口（同一 Wi-Fi 下直接打开，PIN 已带在链接里）：`)
  for (const url of phoneUrls(port, pin)) say(`     ${url}`)
  say(`   · 手动入口（自己输 PIN）：http://${lanAddresses()[0] ?? '<Mac的IP>'}:${port}/  PIN=${pin}`)
  say(`   · 停止：./scripts/mobile_control.sh stop`)
  return 0
}

async function cmdServe() {
  const state = readState()
  if (state === undefined) {
    say(`${BAD} 缺少状态文件 ${STATE_FILE}；请用 start 子命令启动。`)
    return 2
  }
  const { server } = createBridge({
    bridgePort: state.bridgePort,
    bind: state.bind,
    dshPort: state.dshPort,
    pin: state.pin,
    key: state.key,
    onEvent: () => {}
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(state.bridgePort, state.bind, resolve)
  })
  state.pid = process.pid
  writeState(state)
  const shutdown = () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 1500).unref()
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
  say(`[serve] listening ${state.bind}:${state.bridgePort} -> 127.0.0.1:${state.dshPort}`)
  return 0
}

/**
 * 停服时**只摘掉 pid，不删状态文件**。
 * 为什么：PIN 与会话密钥存在状态文件里，删了就等于每次停/起都换 PIN ——
 * 手机上已保存的主屏图标与书签会直接 401（本轮实测的体验缺陷）。
 * 需要彻底换密钥时用 `start --new-pin`。
 */
function markStopped(state) {
  writeState({ ...state, pid: null, stoppedAt: new Date().toISOString() })
}

async function cmdStop() {
  const state = readState()
  if (state === undefined) {
    say(`${WARN} 没有网桥状态文件，视为未运行。`)
    return 0
  }
  if (!pidAlive(state.pid)) {
    markStopped(state)
    say(`${WARN} 记录的 pid ${state.pid ?? '(空)'} 已不存在；已标记停止，PIN 与会话密钥保留。`)
    return 0
  }
  process.kill(state.pid, 'SIGTERM')
  const deadline = Date.now() + 5000
  while (Date.now() < deadline && pidAlive(state.pid)) await new Promise((r) => setTimeout(r, 150))
  const still = pidAlive(state.pid)
  markStopped(state)
  say(still ? `${BAD} pid ${state.pid} 未在 5 秒内退出，请手动 kill。` : `${OK} 网桥已停止（端口 ${state.bridgePort} 已释放；PIN 保留）。`)
  return still ? 1 : 0
}

async function cmdStatus(args) {
  const state = readState()
  const secret = (() => {
    try {
      return readBrowserSessionSecret()
    } catch {
      return undefined
    }
  })()
  const report = { state: state ?? null, running: false, upstream: null, stats: null }
  if (state !== undefined && pidAlive(state.pid)) {
    report.running = true
    report.stats = await waitForBridge(state.bridgePort, 2000)
    report.upstream = secret === undefined ? null : await probeDshHost(state.dshPort, secret.secret)
  }
  if (args.json === true) {
    say(JSON.stringify(report, null, 2))
    return report.running ? 0 : 1
  }
  if (!report.running) {
    say(`${WARN} 网桥未运行。启动：./scripts/mobile_control.sh start`)
    return 1
  }
  say(`${OK} 网桥运行中`)
  say(`   · pid ${state.pid} · 监听 ${state.bind}:${state.bridgePort} · 上游 127.0.0.1:${state.dshPort}`)
  say(`   · 上游自证：${report.upstream === null ? '未取得' : report.upstream.detail}`)
  say(`   · 会话统计：请求 ${report.stats?.requests ?? 0} · 拒绝 ${report.stats?.denied ?? 0} · PIN 成功 ${report.stats?.loginOk ?? 0} · PIN 失败 ${report.stats?.loginFail ?? 0}`)
  say(`   · 手机入口：${phoneUrls(state.bridgePort, state.pin)[0]}`)
  say(`   · 访问日志：${ACCESS_LOG}`)
  return 0
}

async function cmdUrl() {
  const state = readState()
  if (state === undefined || !pidAlive(state.pid)) {
    say(`${BAD} 网桥未运行。先执行：./scripts/mobile_control.sh start`)
    return 1
  }
  for (const url of phoneUrls(state.bridgePort, state.pin)) say(url)
  say(`PIN: ${state.pin}`)
  return 0
}

async function cmdDoctor() {
  let bad = 0
  let undecided = 0
  say('【手机操控 DSH · 体检】')
  const nodeMajor = Number(process.versions.node.split('.')[0])
  say(`${nodeMajor >= 20 ? OK : BAD} Node ${process.versions.node}（需 ≥ 20 才有稳定的 fetch/http 行为）`)
  if (nodeMajor < 20) bad++

  let secret
  try {
    secret = readBrowserSessionSecret()
    say(`${OK} 宿主鉴权密钥可读：${secret.source}`)
  } catch (error) {
    say(`${BAD} 宿主鉴权密钥不可读：${error.message}`)
    bad++
  }

  const found = secret === undefined ? { port: undefined, tried: [] } : await detectDshPort(secret.secret, { explicit: undefined })
  if (found.port !== undefined) {
    const probe = await probeDshHost(found.port, secret.secret)
    say(`${probe.code === 0 ? OK : BAD} DSH 宿主 127.0.0.1:${found.port} — ${probe.detail}`)
    if (probe.code !== 0) bad++
  } else {
    say(`${WARN} 未发现 DSH 宿主（探测：${found.tried.join(', ')}）—— 桌面端没开时不算故障，但手机现在连上也看不到界面`)
    undecided++
  }

  const ips = lanAddresses()
  say(`${ips.length > 0 ? OK : WARN} 局域网 IPv4：${ips.join(', ') || '无（未连 Wi-Fi？）'}`)
  if (ips.length > 0) {
    const port = Number(readState()?.bridgePort ?? DEFAULT_BRIDGE_PORT)
    const free = await portIsFree(port, '0.0.0.0')
    say(`${free || readState() !== undefined ? OK : BAD} 网桥端口 ${port} ${free ? '空闲' : '被占用（若正是本网桥则正常）'}`)
  }
  const state = readState()
  say(`${state !== undefined ? OK : WARN} 网桥状态：${state === undefined ? '未启动（./scripts/mobile_control.sh start）' : `pid ${state.pid} · ${state.startedAt}`}`)
  say(`   · 防火墙提示：首次运行若弹"是否允许 node 接受传入连接"，需要点【允许】，否则手机连不上。`)
  if (bad > 0) return 1
  return undecided > 0 ? 0 : 0
}

// ── 主入口 ───────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2))
const command = args._[0] ?? 'status'
const table = {
  start: () => cmdStart(args),
  serve: () => cmdServe(),
  stop: () => cmdStop(),
  status: () => cmdStatus(args),
  url: () => cmdUrl(),
  doctor: () => cmdDoctor(),
  help: () => {
    say('用法：start | serve | stop | status [--json] | url | doctor')
    say('  start [--port 19388] [--bind 0.0.0.0] [--pin 123456] [--dsh-port 19387]')
    return 0
  }
}
if (table[command] === undefined) {
  say(`${BAD} 未知子命令：${command}（可用：start / serve / stop / status / url / doctor）`)
  process.exit(2)
}
if (!existsSync(GLOBAL_ROOT)) {
  say(`${BAD} 仓库根不存在：${GLOBAL_ROOT}`)
  process.exit(2)
}
try {
  process.exitCode = await table[command]()
} catch (error) {
  say(`${BAD} ${command} 失败：${error?.stack ?? error}`)
  process.exitCode = 1
}
