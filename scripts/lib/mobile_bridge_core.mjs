#!/usr/bin/env node
// ==============================================================================
// 模块名称：mobile_bridge_core.mjs
// 功能描述：把"只监听 127.0.0.1 的 DSH 宿主"安全地开放给同网段手机（REQ-094）
// ==============================================================================
// 为什么要这一层（实测根因，非推测）：
//   1) 宿主只绑回环：`lsof` 实测 DeepSeek 宿主进程仅 `TCP 127.0.0.1:19387 (LISTEN)`，
//      手机在同一 Wi-Fi 也连不上；
//   2) 宿主有鉴权：裸 `curl http://127.0.0.1:19387/` 返回 **401**
//      （`dsh web authentication required; reopen the URL printed by dsh web.`），
//      鉴权实现见 app.asar 内 `@deepseek-ai/dsh-client-connection/lib/index.js`：
//      ① `?token=<每进程随机 launchToken>` 换一次 HttpOnly 签名 cookie；
//      ② 此后只认 **authority 绑定 + HMAC-SHA256 签名** 的 cookie，签名密钥持久化在
//         `$DSH_HOME/.credentials.yaml` 的 `records.client-connection/browser-session.secret`。
//      launchToken 只存在内存里，**无法从磁盘复算**；但签名密钥在磁盘上——
//      因此本模块选择"用密钥现签一枚 cookie"，而不是去猜进程令牌。
//   3) 宿主的 /api 还有 Host/Origin 围栏（`isTrustedApiRequest`）：Host 必须是回环或
//      已信任 authority，Origin 必须与 Host 同源。故本代理**转发时把 Host/Origin/Referer
//      改写成回环 authority**，让上游认为请求来自本机浏览器。
//   本模块是**唯一权威实现**：CLI（mobile_bridge.mjs）与判定器（mobile_bridge_audit.mjs）
//   都从这里 import，禁止各自复制一份判定逻辑（工程元规则：一处权威源）。
//
// 安全边界（默认即收紧）：
//   · 只服务私网/回环来源（RFC1918 / 169.254 / fc00:: / ::1），公网来源直接 403；
//   · 手机侧必须持有 PIN（URL `?k=` 或登录页输入），会话 cookie 由本模块 HMAC 签名；
//   · PIN 失败 5 分钟内 8 次即临时封禁该来源；
//   · PIN 与签名密钥落盘 600 权限，且只落 `ai-control/reports/`（该目录在 .gitignore 内，不入库）。
// ==============================================================================

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs'
import { createServer as createHttpServer, request as httpRequest } from 'node:http'
import { connect as netConnect } from 'node:net'
import { networkInterfaces } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 本模块所在仓库根（全局规则仓库）。判定器与 CLI 共用同一份根路径解析。 */
export const GLOBAL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
/** 运行态落盘目录：ai-control/reports/ 已被 .gitignore 忽略，密钥不会入库。 */
export const STATE_DIR = join(GLOBAL_ROOT, 'ai-control', 'reports', 'state', 'mobile_bridge')
export const STATE_FILE = join(STATE_DIR, 'bridge.json')
export const ACCESS_LOG = join(STATE_DIR, 'access.log')
export const DEFAULT_BRIDGE_PORT = 19388
export const DEFAULT_DSH_PORT = 19387
/** 宿主鉴权 cookie 的固定前缀（与 dsh-client-connection 的 COOKIE_PREFIX 同口径）。 */
export const DSH_COOKIE_PREFIX = 'dsh-auth-'
/** 宿主 cookie 有效期上限是配置项 cookieMaxAgeDays（默认 30 天）；本模块每次现签短票，规避上限。 */
export const FORGED_COOKIE_TTL_MS = 12 * 3600 * 1000

// ── 通用小工具 ────────────────────────────────────────────────────────────────

export function b64url(value) {
  return Buffer.from(value).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

export function fromB64url(text) {
  const normalized = String(text).replaceAll('-', '+').replaceAll('_', '/')
  return Buffer.from(normalized + '='.repeat((4 - (normalized.length % 4)) % 4), 'base64')
}

/** 定时安全比较（长度不同直接 false，不泄露长度信息以外的内容）。 */
export function safeEqual(a, b) {
  const left = Buffer.from(String(a), 'utf8')
  const right = Buffer.from(String(b), 'utf8')
  return left.byteLength === right.byteLength && timingSafeEqual(left, right)
}

/** 只允许私网与回环来源：默认杜绝"顺手把家里电脑暴露到公网"。 */
export function isPrivateAddress(address) {
  if (typeof address !== 'string' || address === '') return false
  const ip = address.startsWith('::ffff:') ? address.slice(7) : address
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.')) return true
  if (/^fc|^fd|^fe80/i.test(ip)) return true
  const octets = ip.split('.').map(Number)
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false
  const [a, b] = octets
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 169 && b === 254) return true
  return false
}

/** 本机所有 IPv4 私网地址（给手机用的候选地址，排除回环）。 */
export function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((iface) => iface !== undefined && iface.family === 'IPv4' && !iface.internal && isPrivateAddress(iface.address))
    .map((iface) => iface.address)
}

export function ensureStateDir() {
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
}

export function writePrivateFile(path, text) {
  ensureStateDir()
  writeFileSync(path, text, { mode: 0o600 })
}

export function appendAccessLog(record) {
  try {
    ensureStateDir()
    writeFileSync(ACCESS_LOG, `${JSON.stringify({ at: new Date().toISOString(), ...record })}\n`, { flag: 'a', mode: 0o600 })
  } catch {
    /* 日志失败不得影响代理主链路 */
  }
}

// ── 宿主鉴权：读取持久化签名密钥 + 现签 cookie ────────────────────────────────

/**
 * 从 `$DSH_HOME/.credentials.yaml` 读出浏览器会话签名密钥。
 * 只做定点抽取，不引入 YAML 依赖（该文件结构由 dsh-credentials-local 固定为 version/records/payload）。
 * @param {string} [dshHome] 覆盖 DSH_HOME（判定器测试用）。
 * @returns {{secret: Buffer, source: string}}
 */
export function readBrowserSessionSecret(dshHome = process.env.DSH_HOME ?? join(process.env.HOME ?? '', '.dsh')) {
  const file = join(dshHome, '.credentials.yaml')
  if (!existsSync(file)) throw new Error(`凭据文件不存在：${file}`)
  const text = readFileSync(file, 'utf8')
  const block = /client-connection\/browser-session:[\s\S]*?(?=\n\s{2}\S|\s*$)/.exec(text)
  if (block === null) throw new Error(`凭据文件缺少 client-connection/browser-session 记录：${file}`)
  const secretMatch = /secret:\s*([A-Za-z0-9_-]+)/.exec(block[0])
  if (secretMatch === null) throw new Error('浏览器会话凭据记录里没有 secret 字段')
  const secret = fromB64url(secretMatch[1])
  if (secret.byteLength !== 32) throw new Error(`浏览器会话密钥长度异常：${secret.byteLength} 字节（应为 32）`)
  return { secret, source: file }
}

/** 宿主鉴权 cookie 名：`dsh-auth-` + base64url(sha256(authority))。 */
export function dshCookieName(authority) {
  return DSH_COOKIE_PREFIX + b64url(createHash('sha256').update(authority).digest())
}

/**
 * 现签一枚宿主认可的浏览器会话 cookie。
 * 载荷与签名算法与宿主 `decodeCookie` 逐字段对齐（version/authority/issuedAt/expiresAt + HMAC(body)）。
 * @param {string} authority 形如 `127.0.0.1:19387`（宿主侧围栏只信回环 authority）。
 * @param {Buffer} secret 32 字节签名密钥。
 * @param {number} [ttlMs] 有效期；默认 12 小时（远小于宿主上限 30 天）。
 * @returns {string} `name=value` 形式的 Cookie 头值。
 */
export function forgeDshCookie(authority, secret, ttlMs = FORGED_COOKIE_TTL_MS) {
  const issuedAt = Date.now()
  const expiresAt = issuedAt + ttlMs
  const body = b64url(Buffer.from(JSON.stringify({ version: 1, authority, issuedAt, expiresAt }), 'utf8'))
  const signature = b64url(createHmac('sha256', secret).update(body).digest())
  return `${dshCookieName(authority)}=v1.${body}.${signature}`
}

/** 用现签 cookie 验活：0=可达且鉴权通过，1=可达但鉴权失败，2=不可达（不可判定）。 */
export async function probeDshHost(port, secret, { timeoutMs = 2000 } = {}) {
  const url = `http://127.0.0.1:${port}/`
  const withCookie = await httpGet(url, { cookie: forgeDshCookie(`127.0.0.1:${port}`, secret), timeoutMs })
  if (withCookie.status === 200) return { code: 0, port, status: withCookie.status, detail: 'cookie 鉴权通过（index 200）' }
  const bare = await httpGet(url, { timeoutMs })
  if (bare.status === 401 && /dsh web authentication required/u.test(bare.body)) {
    return { code: 1, port, status: withCookie.status, detail: `宿主在跑但拒签发的 cookie（index ${withCookie.status}）` }
  }
  if (bare.status === 0) return { code: 2, port, status: 0, detail: `端口 ${port} 无响应：${bare.error ?? '连接失败'}` }
  return { code: 1, port, status: bare.status, detail: `端口 ${port} 有响应但不是 DSH 宿主（status ${bare.status}）` }
}

/** 极简 GET（不引依赖），返回 {status, body, error}；status=0 表示连接层失败。 */
export function httpGet(url, { cookie, timeoutMs = 2000 } = {}) {
  return new Promise((resolve) => {
    const req = httpRequest(url, { method: 'GET', headers: cookie === undefined ? {} : { cookie } }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }))
    })
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`超时 ${timeoutMs}ms`))
    })
    req.on('error', (error) => resolve({ status: 0, body: '', error: error.message }))
    req.end()
  })
}

/**
 * 定位 DSH 宿主端口：先环境变量 DSH_WEB_URL，再配置文件，最后按候选端口逐个验活。
 * 判定标准是**实活特征**（401 + dsh 鉴权文案，或持 cookie 得 200），不是"端口开着就算"。
 */
export async function detectDshPort(secret, { explicit, candidates = [DEFAULT_DSH_PORT, 3000, 8080, 19387], timeoutMs = 1500 } = {}) {
  const tried = []
  const ordered = []
  if (explicit !== undefined && explicit !== null && explicit !== '') ordered.push(Number(explicit))
  const envUrl = process.env.DSH_WEB_URL ?? ''
  const envPort = /:(\d+)/.exec(envUrl)?.[1]
  if (envPort !== undefined) ordered.push(Number(envPort))
  for (const port of candidates) ordered.push(Number(port))
  for (const port of [...new Set(ordered.filter((n) => Number.isInteger(n) && n > 0 && n < 65536))]) {
    const probe = await probeDshHost(port, secret, { timeoutMs })
    tried.push(`${port}:${probe.status}`)
    if (probe.code === 0) return { port, probe, tried }
  }
  return { port: undefined, probe: undefined, tried }
}

// ── 网桥自身会话：PIN 换签名 cookie ──────────────────────────────────────────

export function signBridgeSession(key, ttlMs = 30 * 24 * 3600 * 1000) {
  const expiresAt = Date.now() + ttlMs
  const body = b64url(Buffer.from(JSON.stringify({ v: 1, expiresAt }), 'utf8'))
  return `${body}.${b64url(createHmac('sha256', key).update(body).digest())}`
}

export function verifyBridgeSession(key, value) {
  if (typeof value !== 'string') return false
  const [body, signature] = value.split('.')
  if (body === undefined || signature === undefined) return false
  const expected = b64url(createHmac('sha256', key).update(body).digest())
  if (!safeEqual(signature, expected)) return false
  try {
    const payload = JSON.parse(fromB64url(body).toString('utf8'))
    return payload?.v === 1 && Number.isSafeInteger(payload.expiresAt) && payload.expiresAt > Date.now()
  } catch {
    return false
  }
}

export function readCookie(headerValue, name) {
  if (typeof headerValue !== 'string') return undefined
  for (const segment of headerValue.split(';')) {
    const at = segment.indexOf('=')
    if (at === -1) continue
    if (segment.slice(0, at).trim() === name) return segment.slice(at + 1).trim()
  }
  return undefined
}

export function generatePin() {
  return String(randomBytes(4).readUInt32BE(0) % 1000000).padStart(6, '0')
}

export function generateKey() {
  return randomBytes(32).toString('hex')
}

export function readState() {
  if (!existsSync(STATE_FILE)) return undefined
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return undefined
  }
}

export function writeState(state) {
  writePrivateFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`)
}

export function clearState() {
  if (existsSync(STATE_FILE)) rmSync(STATE_FILE, { force: true })
}

/** 状态文件权限必须是 600（里面含 PIN 与签名密钥）。 */
export function stateFileMode() {
  if (!existsSync(STATE_FILE)) return undefined
  return statSync(STATE_FILE).mode & 0o777
}

// ── 登录页（手机端唯一需要手输的界面） ──────────────────────────────────────

export function loginPage({ hint = '', port = 0 } = {}) {
  return `<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>DSH 手机接管 · 输入 PIN</title>
<style>
 :root{color-scheme:dark}
 body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:#0b0f14;color:#e6edf3;font:16px/1.5 -apple-system,"PingFang SC",sans-serif}
 .card{width:min(92vw,420px);padding:28px 22px;border-radius:18px;background:#141b24;
       box-shadow:0 12px 40px rgba(0,0,0,.5)}
 h1{margin:0 0 6px;font-size:20px}
 p{margin:0 0 18px;color:#93a4b8;font-size:13px}
 input{width:100%;box-sizing:border-box;padding:16px;font-size:26px;letter-spacing:8px;text-align:center;
       border-radius:12px;border:1px solid #2b3a4b;background:#0b0f14;color:#e6edf3}
 button{width:100%;margin-top:14px;padding:16px;font-size:17px;font-weight:600;border:0;border-radius:12px;
        background:#2f81f7;color:#fff}
 .err{margin-top:12px;color:#ff7b72;font-size:13px;min-height:18px}
 .tip{margin-top:16px;color:#6b7c93;font-size:12px}
</style></head>
<body><div class="card">
 <h1>DSH 手机接管</h1>
 <p>请输入 Mac 上 6 位 PIN（在终端执行 <code>./scripts/mobile_control.sh url</code> 可取）。</p>
 <form method="POST" action="/__bridge/login">
   <input name="pin" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" autofocus placeholder="••••••">
   <button type="submit">进入 DSH</button>
 </form>
 <div class="err">${hint}</div>
 <div class="tip">本页只服务局域网私有地址 · 网桥端口 ${port}</div>
</div></body></html>`
}

// ── 反向代理主体 ─────────────────────────────────────────────────────────────

const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'upgrade'])

/**
 * 手工解析原始 URL，**绝不使用 WHATWG `new URL` 重建转发路径**。
 * 为什么（2026-10-02 实测缺陷，症状是"页面能开、插件全挂"）：
 *   宿主的客户端插件 bundle 走**拼接式 URL**：`/plugins/??a/client.js,b/client.js&rev=xxx`。
 *   一旦把这种 URL 交给 `new URL` 再读 `searchParams`，查询串会被重新序列化并转义成
 *   `/plugins/?%3F%40deepseek-ai%2F...`，宿主按前缀匹配不到 → 404 → 客户端报
 *   `client-modules: HTML did not preload @deepseek-ai/dsh-client-modules/client.js`，整页白屏。
 *   故这里只做**字符串级**处理：取出（并摘掉）网桥自己的 `k` 参数，其余字节原样透传。
 * @param {string|undefined} rawUrl node:http 的 `req.url`（原始、未解码）。
 * @returns {{path:string, queryKey:string|null, proxied:string}}
 */
function parseRawUrl(rawUrl) {
  const raw = typeof rawUrl === 'string' && rawUrl !== '' ? rawUrl : '/'
  const hashAt = raw.indexOf('#')
  const target = hashAt === -1 ? raw : raw.slice(0, hashAt)
  const queryAt = target.indexOf('?')
  const path = queryAt === -1 ? target : target.slice(0, queryAt)
  const query = queryAt === -1 ? '' : target.slice(queryAt + 1)
  let queryKey = null
  const kept = []
  for (const segment of query === '' ? [] : query.split('&')) {
    if (segment === 'k') {
      queryKey = ''
      continue
    }
    if (segment.startsWith('k=')) {
      try {
        queryKey = decodeURIComponent(segment.slice(2))
      } catch {
        queryKey = segment.slice(2)
      }
      continue
    }
    kept.push(segment)
  }
  const rest = kept.join('&')
  return { path, queryKey, proxied: rest === '' ? path : `${path}?${rest}` }
}

/**
 * 创建网桥服务器（HTTP + WebSocket 透传）。
 * @param {{bridgePort:number, bind:string, dshPort:number, pin:string, key:string, allowPublic?:boolean, onEvent?:(e:object)=>void}} options
 * @returns {{server:import('node:http').Server, stats:object}}
 */
export function createBridge(options) {
  const { bridgePort, bind, dshPort, pin, key, allowPublic = false } = options
  const secret = options.secret ?? readBrowserSessionSecret().secret
  const upstreamAuthority = `127.0.0.1:${dshPort}`
  const stats = { startedAt: Date.now(), requests: 0, denied: 0, loginOk: 0, loginFail: 0, lastError: '' }
  const failures = new Map()

  const clientIp = (req) => {
    const raw = req.socket.remoteAddress ?? ''
    return raw.startsWith('::ffff:') ? raw.slice(7) : raw
  }
  const record = (event, extra = {}) => {
    try {
      options.onEvent?.({ event, ...extra })
    } catch {
      /* 回调异常不得影响主链路 */
    }
    appendAccessLog({ event, ...extra })
  }
  const denied = (res, code, message) => {
    stats.denied += 1
    res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
    res.end(`${message}\n`)
  }
  const rateLimited = (ip) => {
    const now = Date.now()
    const list = (failures.get(ip) ?? []).filter((t) => now - t < 5 * 60 * 1000)
    failures.set(ip, list)
    return list.length >= 8
  }
  const noteFailure = (ip) => {
    const list = failures.get(ip) ?? []
    list.push(Date.now())
    failures.set(ip, list)
  }
  /** 会话判定：返回 'cookie' | 'key' | false，供调用点区分"要不要补发会话 cookie"。 */
  const authorize = (req, queryKey) => {
    const cookie = readCookie(req.headers.cookie, 'dsh-bridge')
    if (cookie !== undefined && verifyBridgeSession(key, cookie)) return 'cookie'
    if (queryKey !== null && safeEqual(queryKey, pin)) return 'key'
    return false
  }
  const upstreamHeaders = (req) => {
    const headers = {}
    for (const [name, value] of Object.entries(req.headers)) {
      if (value === undefined || HOP_BY_HOP.has(name.toLowerCase())) continue
      headers[name] = value
    }
    headers.host = upstreamAuthority
    headers.cookie = forgeDshCookie(upstreamAuthority, secret)
    if (headers.origin !== undefined) headers.origin = `http://${upstreamAuthority}`
    if (headers.referer !== undefined) headers.referer = `http://${upstreamAuthority}/`
    return headers
  }
  const rewriteLocation = (value, host) => {
    if (typeof value !== 'string') return value
    return value.replaceAll(`http://${upstreamAuthority}`, `http://${host}`)
  }

  const handle = (req, res) => {
    const ip = clientIp(req)
    if (!allowPublic && !isPrivateAddress(ip)) {
      record('deny-public', { ip, path: req.url })
      denied(res, 403, '本网桥只服务局域网私有地址（如需公网请显式开启 --allow-public 并自担风险）')
      return
    }
    const { path, queryKey, proxied } = parseRawUrl(req.url)

    if (path === '/__bridge/status' && isPrivateAddress(ip) && (ip === '127.0.0.1' || ip === '::1')) {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      res.end(JSON.stringify({ ...stats, uptimeMs: Date.now() - stats.startedAt, dshPort, bridgePort, bind }))
      return
    }
    if (path === '/__bridge/login' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      res.end(loginPage({ port: bridgePort }))
      return
    }
    if (path === '/__bridge/login' && req.method === 'POST') {
      let body = ''
      req.setEncoding('utf8')
      req.on('data', (chunk) => {
        body += chunk
        if (body.length > 4096) req.destroy()
      })
      req.on('end', () => {
        if (rateLimited(ip)) {
          record('login-ratelimited', { ip })
          res.writeHead(429, { 'content-type': 'text/html; charset=utf-8' })
          res.end(loginPage({ hint: '尝试过于频繁，请 5 分钟后再试。', port: bridgePort }))
          return
        }
        const submitted = new URLSearchParams(body).get('pin') ?? ''
        if (!safeEqual(submitted, pin)) {
          noteFailure(ip)
          stats.loginFail += 1
          record('login-fail', { ip })
          res.writeHead(401, { 'content-type': 'text/html; charset=utf-8' })
          res.end(loginPage({ hint: 'PIN 不对，请回到 Mac 执行 mobile_control.sh url 复核。', port: bridgePort }))
          return
        }
        stats.loginOk += 1
        record('login-ok', { ip })
        res.writeHead(303, {
          location: '/',
          'set-cookie': `dsh-bridge=${signBridgeSession(key)}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax`,
          'cache-control': 'no-store'
        })
        res.end()
      })
      return
    }
    const via = authorize(req, queryKey)
    if (via === false) {
      if (queryKey !== null) {
        noteFailure(ip)
        record('key-fail', { ip })
      } else {
        record('need-pin', { ip, path })
      }
      if (path === '/' || path === '/index.html') {
        res.writeHead(401, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
        res.end(loginPage({ hint: queryKey === null ? '' : '链接里的 PIN 不正确。', port: bridgePort }))
        return
      }
      denied(res, 401, '需要 PIN 授权：先打开 http://<Mac的IP>:端口/ 输入 PIN')
      return
    }
    if (via === 'key') stats.loginOk += 1

    stats.requests += 1
    const host = req.headers.host ?? `${bind}:${bridgePort}`
    const upstream = httpRequest({ host: '127.0.0.1', port: dshPort, method: req.method, path: proxied, headers: upstreamHeaders(req) }, (up) => {
      const headers = {}
      for (const [name, value] of Object.entries(up.headers)) {
        if (name.toLowerCase() === 'set-cookie') continue
        headers[name] = value
      }
      if (up.headers.location !== undefined) headers.location = rewriteLocation(up.headers.location, host)
      // 用 ?k= 进来的一次性链接，顺手补发会话 cookie，省得每次都要带密钥
      if (via === 'key') headers['set-cookie'] = [`dsh-bridge=${signBridgeSession(key)}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax`]
      res.writeHead(up.statusCode ?? 502, headers)
      up.pipe(res)
    })
    upstream.on('error', (error) => {
      stats.lastError = error.message
      record('upstream-error', { ip, path, message: error.message })
      if (!res.headersSent) denied(res, 502, `上游 DSH 宿主不可达（127.0.0.1:${dshPort}）：${error.message}`)
      else res.destroy()
    })
    req.pipe(upstream)
  }

  const server = createHttpServer(handle)
  // WebSocket / 其他 upgrade 透传：宿主侧只有 /api 的远端流多路复用会用到，
  // 但一旦漏掉，手机端会出现"页面能开、流式输出不动"的假可用。
  server.on('upgrade', (req, socket, head) => {
    const ip = clientIp(req)
    if (!allowPublic && !isPrivateAddress(ip)) {
      socket.destroy()
      return
    }
    const { path, queryKey, proxied } = parseRawUrl(req.url)
    if (authorize(req, queryKey) === false) {
      record('upgrade-denied', { ip, path })
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
      socket.destroy()
      return
    }
    const headers = upstreamHeaders(req)
    const lines = [`GET ${proxied} HTTP/1.1`]
    for (const [name, value] of Object.entries(headers)) {
      if (name.toLowerCase() === 'connection' || name.toLowerCase() === 'upgrade') continue
      lines.push(`${name}: ${value}`)
    }
    lines.push('Connection: Upgrade')
    lines.push(`Upgrade: ${req.headers.upgrade ?? 'websocket'}`)
    const upstream = netConnect(dshPort, '127.0.0.1', () => {
      upstream.write(`${lines.join('\r\n')}\r\n\r\n`)
      if (head.length > 0) upstream.write(head)
      upstream.pipe(socket)
      socket.pipe(upstream)
    })
    upstream.on('error', () => socket.destroy())
    socket.on('error', () => upstream.destroy())
    socket.on('close', () => upstream.destroy())
  })
  server.on('error', (error) => {
    stats.lastError = error.message
    record('server-error', { message: error.message })
  })
  return { server, stats }
}
