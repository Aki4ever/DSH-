#!/usr/bin/env node
/**
 * ==============================================================================
 * 应用层重启入口（不依赖界面、不依赖插件链路）  app_restart.mjs
 * ==============================================================================
 * 为什么需要它（REQ-091 / R2 的最后一块）：
 *   界面按钮那条链路一旦在**界面侧**出问题（客户端 bundle 陈旧、页面没刷新、
 *   点击反馈被吞），人就被卡住 —— 明明宿主半已经注册好命令，却没办法从外部驱动它。
 *   本脚本把"重启这台机器上的 DSH 应用"变成一个**可复跑、可干跑、可留痕**的命令行动作。
 *
 * 单一真相源（**不重写第二套重启脚本**）：
 *   任务脚本本身由 `skill-pool/plugins/dsh-plugin-restart/src/restart-core.cjs` 的
 *   `buildRelaunchScript()` 生成 —— 与界面按钮走的是**同一份内核**。
 *   这里只负责：取 PID、落留痕、以宿主子进程身份**分离**派出（必须分离，
 *   否则派出者随应用一起被杀，脚本就没人接着跑了）。
 *
 * 为什么要有 --delay：
 *   本脚本经常被"正在这个应用里说话的人"调用。若立刻退出应用，对话回执还没送出就断了。
 *   延迟若干秒再动作，回执先送达、应用随后重启，用户不会只看到一片黑。
 *
 * 用法：
 *   node scripts/app_restart.mjs --dry-run             # 只打印将要执行的动作与脚本全文，不动作
 *   node scripts/app_restart.mjs --delay 40            # 40 秒后退出并重开应用
 *   node scripts/app_restart.mjs                       # 立即（默认 2 秒缓冲）
 *   node scripts/app_restart.mjs --probe               # 只探测三条通道是否可用，不动作
 *
 * 退出码：0 已派出 / 1 环境不具备（取不到 PID 或通道不可用）/ 2 用法错误
 * ==============================================================================
 */

import { spawn, execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { resolveHostPid } from './lib/host_pid.mjs'
import CORE from '../skill-pool/plugins/dsh-plugin-restart/src/restart-core.cjs'  // CJS 内核：ESM 侧取 default 即可

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const CONTROL_DIR = join(process.env.DSH_HOME || join(homedir(), '.dsh'), '.dsh-control')
const LOG_FILE = join(CONTROL_DIR, 'restart-relaunch.log')

function parseArgs(argv) {
  const out = { delay: 2, dryRun: false, probe: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--probe') out.probe = true
    else if (a === '--delay') out.delay = Number(argv[++i])
  }
  return out
}

/** 三条通道的就地探测（都不产生副作用：只问名字、只解析打开、只看文件在不在）。 */
function probeChannels(appName) {
  const results = []
  try {
    const name = execFileSync('osascript', ['-e', `tell application "${appName}" to get name`], { encoding: 'utf8' }).trim()
    results.push({ channel: 'osascript quit', ok: name === appName, detail: name })
  } catch (err) {
    results.push({ channel: 'osascript quit', ok: false, detail: (err && err.message) || '调用失败' })
  }
  try {
    execFileSync('open', ['-a', appName], { stdio: 'ignore' })
    results.push({ channel: 'open -a', ok: true, detail: 'LaunchServices 可解析' })
  } catch (err) {
    results.push({ channel: 'open -a', ok: false, detail: (err && err.message) || '打开失败' })
  }
  const exe = `/Applications/${appName}.app/Contents/MacOS/${appName}`
  results.push({ channel: '可执行路径兜底', ok: existsSync(exe), detail: exe })
  return results
}

function record(line) {
  try {
    mkdirSync(CONTROL_DIR, { recursive: true })
    appendFileSync(LOG_FILE, `${new Date().toISOString()} ${line}\n`, 'utf8')
  } catch { /* 留痕失败不阻断 */ }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!Number.isFinite(args.delay) || args.delay < 0) {
    console.error('用法：app_restart.mjs [--delay 秒] [--dry-run] [--probe]')
    return 2
  }

  const appName = CORE.APP_NAME
  const probes = probeChannels(appName)
  if (args.probe) {
    console.log('🔎 重启通道探测（无副作用）')
    for (const p of probes) console.log(`  ${p.ok ? '✅' : '⛔'} ${p.channel} · ${p.detail}`)
    return probes.every((p) => p.ok) ? 0 : 1
  }

  let pid
  try {
    pid = resolveHostPid().pid
  } catch (err) {
    console.error(`⛔ 取不到宿主 PID：${err.message}`)
    console.error('   处置：先运行 node scripts/lib/host_pid.mjs 看是哪条通道失效。')
    return 1
  }

  const script = CORE.buildRelaunchScript(pid, { waitSec: 60, logFile: LOG_FILE })
  if (args.dryRun) {
    console.log(`🔎 干跑（不动作）· 目标宿主 PID ${pid} · 延迟 ${args.delay}s`)
    for (const p of probes) console.log(`  通道 ${p.channel}：${p.ok ? '可用' : '不可用'} · ${p.detail}`)
    console.log('---- 将要分离执行的脚本 ----')
    console.log(script)
    return 0
  }

  // 先落留痕：万一重启后没人接着说，也能查出"谁在什么时候派的、旧 PID 是多少"
  record(`派出重启脚本 old_pid=${pid} delay=${args.delay}s app=${appName}`)
  mkdirSync(join(REPO_ROOT, 'ai-control', 'reports', 'state'), { recursive: true })
  writeFileSync(
    join(REPO_ROOT, 'ai-control', 'reports', 'state', 'host_pid.json'),
    `${JSON.stringify({ pid, via: 'app_restart.mjs', at: new Date().toISOString(), phase: 'before' }, null, 2)}\n`,
    'utf8',
  )

  // 延迟 + 分离：延迟保证本轮回执先送达；分离保证脚本不随应用退出而被杀。
  const wrapped = args.delay > 0 ? `sleep ${args.delay}\n${script}` : script
  const child = spawn('/bin/sh', ['-c', wrapped], { detached: true, stdio: 'ignore' })
  child.unref()

  console.log(`🚀 已派出重启脚本（分离进程 pid=${child.pid}）`)
  console.log(`   旧宿主 PID：${pid}`)
  console.log(`   生效延迟：${args.delay} 秒（先让回执送达，再退出应用）`)
  console.log(`   留痕：${LOG_FILE}`)
  console.log('   恢复后跑：node scripts/restart_verify.mjs --compare  → 必须显示 PID 已变化')
  return 0
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isDirectRun) process.exit(main())
