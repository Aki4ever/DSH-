/**
 * 自动命名端到端验收（重启后运行，一次给出结论）。
 *
 * 为什么要有这个脚本：
 *   前两次"重启后验证"都只得到一次沉默——不知道插件没加载、没激活、还是逻辑失败。
 *   本脚本把三种状态分开查证，并**真的造一个不合规会话**去撞它，
 *   让结论落在证据上，而不是落在"应该好了吧"。
 *
 * 用法：
 *   node scripts/verify_auto_naming_e2e.mjs          # 完整验收（会新建一个会话）
 *   node scripts/verify_auto_naming_e2e.mjs --status # 只看状态，不新建会话
 */
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  parseTitle, readSessionStore, currentTitle, renameViaRpc, resolveWebUrl, resetWebUrlCache,
} from './lib/auto_naming.mjs'

const HOME = process.env.DSH_HOME
const STATE = join(HOME, '.dsh-control')
const STATUS_ONLY = process.argv.includes('--status')

let pass = 0, fail = 0
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

/** 读一个小文本文件；不存在返回 null。 */
async function readIf(p) {
  try { return await readFile(p, 'utf8') } catch { return null }
}

/** 找宿主进程（不用 pgrep：实测本机沙箱里 pgrep 不可用）。 */
function hostInfo() {
  const out = String(execFileSync('ps', ['-eo', 'pid,lstart,command'], { encoding: 'utf8' }))
  const line = out.split('\n').find((l) => l.includes('dsh/lib/bin.js') && l.includes(' web'))
  if (!line) return null
  const m = /^\s*(\d+)\s+(.+?)\s+\/Volumes/.exec(line)
  return m ? { pid: Number(m[1]), started: m[2].trim() } : { pid: Number(line.trim().split(/\s+/)[0]), started: '(解析失败)' }
}

console.log('=== 一、宿主进程 ===')
const host = hostInfo()
if (host) console.log(`  宿主 pid=${host.pid} · 启动于 ${host.started}`)
else console.log('  ⚠️ 未找到宿主进程')

console.log('\n=== 二、插件加载与激活状态（三态分离）===')
const loaderMark = await readIf(join(STATE, 'loader-status.txt'))
const pluginMark = await readIf(join(STATE, 'plugin-status.txt'))
const cardMark = await readIf(join(STATE, 'card-status.txt'))

if (loaderMark) {
  console.log('  loader-status.txt:')
  loaderMark.trim().split('\n').forEach((l) => console.log(`    ${l}`))
} else console.log('  ❌ 无 loader-status.txt')

if (pluginMark) {
  console.log('  plugin-status.txt:')
  pluginMark.trim().split('\n').forEach((l) => console.log(`    ${l}`))
} else console.log('  ❌ 无 plugin-status.txt')

// 关键：必须区分"宿主写入"与"测试脚本写入"。
// 实测踩过的假阳性：自检脚本会用 mock ctx 调用 apply，于是标记文件也有，
// 但它由 node selftest.mjs 写入（pid 与宿主不同、argv1 指向自检脚本），
// 若不区分就会被误读成"宿主已激活"。
const isHostMark = (t) => /(^|\n)isHost=true(\n|$)/.test(t ?? '')
check('loader 标记由宿主进程写入', isHostMark(loaderMark),
  loaderMark ? '→ 存在但 isHost=false，是测试脚本留下的，不能作为依据' : '')
check('插件已被宿主激活（apply 已执行）', isHostMark(pluginMark),
  pluginMark ? '→ 存在但 isHost=false，是测试脚本留下的，不能作为依据'
             : '→ 无标记：模块加载了但宿主未激活，典型原因是 inject 声明的服务未解析')
if (pluginMark) {
  const toolLine = pluginMark.split('\n').find((l) => l.startsWith('tools 服务可用='))
  check('tools 服务可用（守卫可注册）', toolLine?.includes('true'), `实际：${toolLine}`)
}
if (cardMark) console.log(`  ℹ️ card-status.txt 存在（看板注入曾失败）：\n    ${cardMark.trim().split('\n')[0]}`)

console.log('\n=== 三、宿主地址自解析 ===')
resetWebUrlCache()
const webUrl = host ? await resolveWebUrl({ env: {}, pid: host.pid }) : await resolveWebUrl()
console.log(`  解析结果：${webUrl ?? '(失败)'}`)
check('能从宿主端口反查到 Web 地址', typeof webUrl === 'string' && webUrl.startsWith('http://'))
if (webUrl) {
  const alive = await renameViaRpc(webUrl, '__probe__', '__probe__').catch(() => false)
  console.log(`  ℹ️ 端点可达（该探测本身会失败，属预期）：${alive}`)
}

console.log('\n=== 四、自动命名日志 ===')
const logPath = join(STATE, 'auto-naming.log')
const logTxt = await readIf(logPath)
if (logTxt) {
  const lines = logTxt.trim().split('\n')
  console.log(`  共 ${lines.length} 条，最近 5 条：`)
  lines.slice(-5).forEach((l) => console.log(`    ${l}`))
  // 只用"日期相同"判断会被旧记录骗到——实测踩过：手工 CLI 测试留下的当天旧记录
  // 被误读成"钩子已被调用"。改为要求记录时间**晚于宿主启动时刻**。
  const startedAt = host?.started && host.started !== '(解析失败)' ? new Date(host.started) : null
  const fresh = startedAt && !Number.isNaN(startedAt.getTime())
    ? lines.filter((l) => {
      const t = new Date(l.slice(0, 24))
      return !Number.isNaN(t.getTime()) && t > startedAt
    })
    : []
  for (const l of fresh.slice(-4)) console.log(`    ↑ 本次宿主启动后的记录：${l}`)
  check('本次宿主启动后已有判定记录（说明钩子被真正调用过）', fresh.length > 0,
    startedAt ? `→ 宿主启动于 ${startedAt.toISOString()}，之后的记录为 0` : '→ 宿主启动时刻未知，无法判断')
} else console.log('  ⚠️ 无 auto-naming.log')

if (STATUS_ONLY) {
  console.log(`\n=== 状态检查汇总：通过 ${pass} / 失败 ${fail} ===`)
  process.exit(fail ? 1 : 0)
}

console.log('\n=== 五、实弹：造一个不合规会话来撞它 ===')
if (!webUrl) {
  console.log('  ⚠️ 没有可用地址，跳过实弹')
} else {
  // 新建会话
  const mk = await fetch(`${webUrl}/api/session.create`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: `e2e-create-${Date.now()}`, method: 'session.create', payload: {} }),
    signal: AbortSignal.timeout(8000),
  }).then((r) => r.json()).catch(() => null)
  const sid = mk?.result?.value?.sessionId
  console.log(`  新建会话：${sid ?? '(失败)'}`)
  check('能新建会话', !!sid)

  if (sid) {
    const before = currentTitle(await readSessionStore(HOME), sid)
    console.log(`  发送前的标题：「${String(before ?? '(空)')}」`)
    // 发一条真实中文消息，让 agent 跑起来（pre-step 才会触发）
    const sent = await fetch(`${webUrl}/api/session.prompt`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request', rpcId: `e2e-prompt-${Date.now()}`, method: 'session.prompt',
        payload: { sessionId: sid, mode: 'queue', content: [{ type: 'text', text: '请用一句话说明缠论三类买点的区别' }] },
      }),
      signal: AbortSignal.timeout(10000),
    }).then((r) => r.json()).catch(() => null)
    console.log(`  消息已投递：${sent?.result?.value?.accepted === true ? '是' : '否'}`)
    check('消息被接受（agent 将开始运行）', sent?.result?.value?.accepted === true)

    console.log('  等待自动命名（最多 90 秒）…')
    let finalTitle
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 3000))
      finalTitle = currentTitle(await readSessionStore(HOME), sid)
      if (parseTitle(finalTitle)) break
    }
    console.log(`  最终标题：「${String(finalTitle ?? '(空)')}」`)
    check('★ 自动命名在真实宿主中生效', !!parseTitle(finalTitle), `实际：${finalTitle}`)

    const log2 = await readIf(logPath)
    if (log2) {
      const hit = log2.split('\n').filter((l) => l.includes(sid))
      console.log(`  该会话的日志记录（${hit.length} 条）：`)
      hit.forEach((l) => console.log(`    ${l}`))
      check('该会话在日志中留痕', hit.length > 0)
    }
  }
}

console.log(`\n=== 验收汇总：通过 ${pass} / 失败 ${fail} ===`)
process.exit(fail ? 1 : 0)
