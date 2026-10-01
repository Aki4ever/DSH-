#!/usr/bin/env node
/**
 * ==============================================================================
 * 宿主进程身份解析  host_pid.mjs
 * ==============================================================================
 * 解决的问题（REQ-091 / R2）：
 *   "重启按钮点下去到底重启了没有" —— 在本工程里**物理上无法判定**。
 *   全库检索：没有任何脚本能回答"当前宿主进程是哪一个、PID 是多少"。
 *   于是无论按钮做了什么，都只能靠嘴说"应该重启了吧"。
 *
 *   R2 定的唯一合格证据是：**重启前后宿主 PID 必须不同**。
 *   本模块就是这条证据的取数器：把"当前宿主进程"解析成一个确定的数字。
 *
 * 解析口径（优先级从高到低，取到即返回，并**记录来源**）：
 *   ① 显式环境变量 `DSH_HOST_PID`（人工/脚本注入，测试用）；
 *   ② 监听宿主 Web 端口的进程（`lsof -nP -iTCP:<port> -sTCP:LISTEN`）—— 最贴近"当前会话连着谁"；
 *   ③ 进程表里命令行含 `dsh-desktop-host` 的最早一个（Electron NodeService 形态）；
 *   ④ 进程表里命令行含应用可执行名（默认 `DeepSeek Harness`）的最早一个。
 * 全部取不到 → 抛错（fail-closed）。**绝不返回 0 或 undefined 让调用方误判成"没变化"**。
 *
 * 用法：
 *   import { resolveHostPid } from './lib/host_pid.mjs'
 *   const { pid, via } = resolveHostPid()
 *
 * CLI：
 *   node scripts/lib/host_pid.mjs            # 打印 { pid, via, port }
 *   node scripts/lib/host_pid.mjs --plain    # 只打印 PID（取不到时退 1）
 * 退出码：0 取到 / 1 取不到 / 2 用法错误
 * ==============================================================================
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = join(HERE, '..', '..')

/** 候选端口：环境变量优先，其次本工程实测在用的 19387，再兜几个常见值。 */
export function candidatePorts(env = process.env) {
  const out = []
  const push = (v) => {
    const n = Number(v)
    if (Number.isInteger(n) && n > 0 && n < 65536 && !out.includes(n)) out.push(n)
  }
  if (env.DSH_WEB_URL) {
    try { push(new URL(env.DSH_WEB_URL).port) } catch { /* 忽略坏 URL */ }
  }
  if (env.DSH_PORT) push(env.DSH_PORT)
  for (const p of [19387, 19388, 8787]) push(p)
  return out
}

/** 静默执行命令，失败返回空串（不抛错、不打印）。 */
function tryExec(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

/** 监听某端口的进程 PID（取第一个）；取不到返回 null。 */
export function pidByPort(port) {
  const out = tryExec('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'])
  if (!out) return null
  const first = out.split('\n').map((s) => s.trim()).filter(Boolean)[0]
  return /^\d+$/.test(first) ? Number(first) : null
}

/** 在进程表里按命令行关键字找 PID（取最早的一个，通常是主进程而非 helper）。 */
export function pidByCommand(keyword) {
  if (!keyword) return null
  const out = tryExec('ps', ['-eo', 'pid=,command='])
  if (!out) return null
  for (const line of out.split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(.*)$/)
    if (!m) continue
    if (m[2].includes(keyword)) return Number(m[1])
  }
  return null
}

/**
 * 解析当前宿主 PID。
 * @param {{env?:object, appName?:string}} [opts]
 * @returns {{pid:number, via:string, port:number|null, tried:Array<{via:string, ok:boolean}>}}
 */
export function resolveHostPid(opts = {}) {
  const env = opts.env || process.env
  const appName = opts.appName || 'DeepSeek Harness'
  const tried = []

  // ① 显式注入
  if (env.DSH_HOST_PID && /^\d+$/.test(String(env.DSH_HOST_PID))) {
    tried.push({ via: 'env:DSH_HOST_PID', ok: true })
    return { pid: Number(env.DSH_HOST_PID), via: 'env:DSH_HOST_PID', port: null, tried }
  }
  tried.push({ via: 'env:DSH_HOST_PID', ok: false })

  // ② 端口
  for (const port of candidatePorts(env)) {
    const pid = pidByPort(port)
    tried.push({ via: `lsof:Tcp:${port}`, ok: pid !== null })
    if (pid) return { pid, via: `lsof:Tcp:${port}`, port, tried }
  }

  // ③ 命令行含 dsh-desktop-host
  const byHost = pidByCommand('dsh-desktop-host')
  tried.push({ via: 'ps:dsh-desktop-host', ok: byHost !== null })
  if (byHost) return { pid: byHost, via: 'ps:dsh-desktop-host', port: null, tried }

  // ④ 命令行含应用名
  const byApp = pidByCommand(appName)
  tried.push({ via: `ps:${appName}`, ok: byApp !== null })
  if (byApp) return { pid: byApp, via: `ps:${appName}`, port: null, tried }

  const err = new Error('取不到宿主 PID（端口与进程表都没命中）—— 无法判定是否重启，按 fail-closed 处理')
  err.code = 'ENOHOSTPID'
  err.tried = tried
  throw err
}

/** 宿主 PID 快照文件路径（工程内，跨会话可读）。 */
export function pidStatePath() {
  return join(REPO_ROOT, 'ai-control', 'reports', 'state', 'host_pid.json')
}

/** 读上次记录的快照；不存在或坏掉返回 null。 */
export function readPidSnapshot(path = pidStatePath()) {
  if (!existsSync(path)) return null
  try {
    const j = JSON.parse(readFileSync(path, 'utf8'))
    return j && Number.isInteger(j.pid) ? j : null
  } catch { return null }
}

/**
 * PID 差异判定（R2 的唯一合格证据）。
 * 口径：两侧都必须是正整数，且不相等才算"变了"。取不到 → 判未变化（**fail-closed**），
 * 因为"没取到"和"没变化"在证据上完全等价，都不足以证明重启发生。
 */
export function pidChanged(before, after) {
  const a = Number(before), b = Number(after)
  if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) return false
  return a !== b
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2)
  try {
    const r = resolveHostPid()
    if (args.includes('--plain')) { console.log(String(r.pid)); return 0 }
    console.log(JSON.stringify(r, null, 2))
    return 0
  } catch (err) {
    console.error(`⛔ ${err.message}`)
    if (err.tried) for (const t of err.tried) console.error(`   · ${t.via} → ${t.ok ? '命中' : '未命中'}`)
    return 1
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isDirectRun) process.exit(main())
