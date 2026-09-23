/**
 * 自动命名逻辑测试（在**不重启宿主**的前提下验证）。
 *
 * 为什么必须先测再接入插件：
 *   这段逻辑最终跑在宿主进程里，出错会波及整个桌面端。
 *   本测试与插件导入的是**同一份模块**（scripts/lib/auto_naming.mjs），
 *   所以这里测通 = 插件里跑的就是测过的那份代码。
 *
 * 用法：
 *   node scripts/test_auto_naming.mjs            # 只跑纯逻辑与读取（不改任何东西）
 *   node scripts/test_auto_naming.mjs --live     # 追加：对真实未命名会话做一次真改名
 */
import { join } from 'node:path'
import {
  parseTitle, hanCount, letterFor, summarize, buildTitle,
  firstUserMessage, readSessionStore, currentTitle, isRegisteredSession,
  autoNameOnce, nextNumber, sessionCwd, resolveWebUrl, resetWebUrlCache,
} from './lib/auto_naming.mjs'

const HOME = process.env.DSH_HOME
const WEB = process.env.DSH_WEB_URL
const LIVE = process.argv.includes('--live')
// 可指定目标会话：--sid session-xxxx（用于对某个具体会话做实弹验证）
const sidIdx = process.argv.indexOf('--sid')
const forceSid = sidIdx !== -1 ? process.argv[sidIdx + 1] : null

let pass = 0, fail = 0
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

console.log('=== 一、纯逻辑校验 ===')

// 标题解析
check('解析合规标题', parseTitle('[R010][60分] 任务命名自动化')?.letter === 'R')
check('解析 1 位难度分', parseTitle('[F001][5分] 测试')?.score === 5)
check('拒绝缺难度分', parseTitle('[R010] 任务命名自动化') === null)
check('拒绝编号非 3 位', parseTitle('[R10][60分] 任务命名自动化') === null)
check('拒绝字母越界', parseTitle('[X010][60分] 任务命名自动化') === null)
check('拒绝普通句子（首句被抓的典型形态）', parseTitle('1、缠论相关的买点1、2、3和卖') === null)

// 汉字计数
check('汉字计数正确', hanCount('任务命名自动化') === 7)
check('英数不计入汉字', hanCount('abc123任务') === 2)
check('空串得 0', hanCount('') === 0)

// 分类字母推断
check('全局规则 → R', letterFor('/Users/x/Documents/DSH/全局规则') === 'R')
check('DSH股票 → F', letterFor('/Users/x/Documents/DSH/DSH股票') === 'F')
check('注入器 → F', letterFor('/Users/x/Documents/DSH/注入器以及key管理工具') === 'F')
check('日常琐碎 → O', letterFor('/Users/x/日常琐碎') === 'O')
check('未知路径 → R（保守兜底）', letterFor('/tmp/unknown') === 'R')

// 概述提炼
check('提炼 ≤8 汉字', hanCount(summarize('请帮我重构整个知识库的索引体系并补充文档')) <= 8)
check('跳过代码块', !summarize('```js\nconst a=1\n```\n真正的需求在这里').includes('const'))
check('取到实义片段', hanCount(summarize('你现在必须知道杨科就是弱智')) > 0)

console.log('\n=== 一·B、宿主地址自解析（本次自动命名失效的直接修复）===')
// 实测事实：桌面端宿主进程环境里**没有** DSH_WEB_URL，只有 DSH_HOME / DSH_TELEMETRY_DISABLED，
// 而 Web 端口是 --port 0 动态分配的，所以必须能从本进程监听端口反查。
resetWebUrlCache()
const envUrl = await resolveWebUrl({ env: { DSH_WEB_URL: 'http://127.0.0.1:1' }, pid: 999999 })
check('环境变量优先于端口反查', envUrl === 'http://127.0.0.1:1', `实际：${envUrl}`)
resetWebUrlCache()
const badUrl = await resolveWebUrl({ env: {}, pid: 999999 })
check('查不到时返回 null 而不抛错', badUrl === null, `实际：${badUrl}`)
resetWebUrlCache()

console.log('\n=== 二、真实数据读取（只读）===')
const store = await readSessionStore(HOME)
check('读到标题存储', !!store)
const total = Object.keys(store?.tables?.sessions ?? {}).length
console.log(`  ℹ️ 存储内会话数：${total}`)

// 找一个真实未命名的主会话做样本
const samples = []
for (const [sid, e] of Object.entries(store?.tables?.sessions ?? {})) {
  if (!sid.startsWith('session-')) continue
  const t = e?.rows?.title?.val
  if (!parseTitle(t)) samples.push({ sid, t })
}
console.log(`  ℹ️ 未合规主会话数：${samples.length}`)

// 样本必须优先选「已登记」会话：未登记者会被 autoNameOnce 正常跳过，
// 但那测的是"跳过逻辑"，不是我们要验证的"自动命名逻辑"。
let probe = null
for (const s of samples) {
  if (await isRegisteredSession(HOME, s.sid)) {
    const m = await firstUserMessage(HOME, s.sid)
    if (m) { probe = s; break }   // 还要有首条消息，否则生成不出标题
  }
}
if (!probe) probe = samples[0]
if (forceSid) {
  const t = currentTitle(store, forceSid)
  probe = { sid: forceSid, t }
  console.log(`  ℹ️ 按 --sid 指定目标会话：${forceSid}`)
}
if (probe) {
  console.log(`\n  样本会话：${probe.sid}`)
  console.log(`  当前标题：「${String(probe.t ?? '').slice(0, 40)}」`)
  const msg = await firstUserMessage(HOME, probe.sid)
  console.log(`  首条用户消息：${String(msg ?? '(取不到)').replace(/\s+/g, ' ').slice(0, 80)}`)
  const tid = await buildTitle({ dshHome: HOME, sessionId: probe.sid, cwd: '', store })
  console.log(`  将生成标题：${tid ?? '(无法生成)'}`)
  check('生成的标题自身合规', tid === null || parseTitle(tid) !== null, `实际：${tid}`)
  // 分类正确性：必须按会话自身的 cwd 推断，不能依赖调用方传参
  const rc = await sessionCwd(HOME, probe.sid)
  console.log(`  会话真实 cwd：${rc ?? '(读不到)'}`)
  check('能从会话文件读出 cwd', typeof rc === 'string' && rc.length > 0)
  if (rc && tid) {
    const expectLetter = letterFor(rc)
    check(`分类字母与 cwd 一致（期望 ${expectLetter}）`, parseTitle(tid)?.letter === expectLetter,
      `实际：${parseTitle(tid)?.letter}`)
  }
  if (tid && parseTitle(tid)) {
    check('概述 ≤8 汉字', hanCount(parseTitle(tid).summary) <= 8)
  }
} else {
  console.log('  ℹ️ 没有未合规样本可测')
}

// 集成验证：用真实宿主 pid 反查端口（模拟插件在宿主进程内的处境）
resetWebUrlCache()
try {
  const { execFileSync } = await import('node:child_process')
  // 不用 pgrep：实测本机沙箱里 pgrep 不可用，会让这条测试被静默跳过（假通过）。
  // 改用 ps 全量列出后自行筛选，结果更可控。
  const psOut = String(execFileSync('ps', ['-eo', 'pid,command'], { encoding: 'utf8' }))
  const line = psOut.split('\n').find((l) => l.includes('dsh/lib/bin.js') && l.includes(' web'))
  const hostPid = line ? Number(line.trim().split(/\s+/)[0]) : 0
  if (hostPid) {
    const found = await resolveWebUrl({ env: {}, pid: hostPid })
    console.log(`  ℹ️ 宿主 pid=${hostPid} → 反查地址：${found}`)
    check('能从真实宿主端口反查到 Web 地址', typeof found === 'string' && found.startsWith('http://127.0.0.1:'))
  } else {
    console.log('  ℹ️ 未找到宿主进程，跳过反查集成测试')
  }
} catch { console.log('  ℹ️ pgrep 不可用，跳过反查集成测试') }
resetWebUrlCache()

console.log('\n=== 三、幂等与边界（不写任何东西）===')
if (probe) {
  // 用已合规会话验证"不会乱动"
  const okSid = Object.entries(store?.tables?.sessions ?? {})
    .find(([sid, e]) => sid.startsWith('session-') && parseTitle(e?.rows?.title?.val))?.[0]
  if (okSid) {
    const r = await autoNameOnce({ dshHome: HOME, sessionId: okSid, cwd: '', webUrl: '' })
    check('已合规会话 → already-ok（不动它）', r.status === 'already-ok', JSON.stringify(r))
  }
  const reg = await isRegisteredSession(HOME, probe.sid)
  console.log(`  ℹ️ 样本是否已登记 workspace.json：${reg}`)
  const r2 = await autoNameOnce({ dshHome: HOME, sessionId: 'not-a-session', cwd: '', webUrl: '' })
  check('非 session- 前缀 → skip', r2.status === 'skip', JSON.stringify(r2))
}

if (LIVE) {
  console.log('\n=== 四、实弹：对真实未命名会话执行一次自动命名 ===')
  if (!probe) { console.log('  ⚠️ 无样本，跳过') }
  else {
    console.log(`  目标：${probe.sid}`)
    console.log(`  改前：「${String(probe.t ?? '').slice(0, 40)}」`)
    const r = await autoNameOnce({ dshHome: HOME, sessionId: probe.sid, cwd: '', webUrl: WEB, stateDir: join(HOME, '.dsh-control') })
    console.log(`  结果：${JSON.stringify(r)}`)
    const after = currentTitle(await readSessionStore(HOME), probe.sid)
    console.log(`  改后（以权威存储复查）：「${after}」`)
    check('自动命名真实生效', !!parseTitle(after), `实际：${after}`)
  }
}

console.log('\n=== 三·B、留痕可观测性（本次静默失败的修复）===')
{
  const { mkdtemp, readFile: rf } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const tmp = await mkdtemp(join(tmpdir(), 'autoname-'))
  const r = await autoNameOnce({ dshHome: HOME, sessionId: 'sub-xyz', cwd: '', stateDir: tmp })
  check('skip 分支也返回结果', r.status === 'skip', JSON.stringify(r))
  let logged = ''
  try { logged = await rf(join(tmp, 'auto-naming.log'), 'utf8') } catch { }
  check('提前返回也必须写日志（否则失败完全静默）', logged.includes('sub-xyz'), `日志：${JSON.stringify(logged)}`)
  check('日志含判定标签', /(SKIP|FAIL|OK)/.test(logged), `日志：${JSON.stringify(logged)}`)
}

console.log(`\n=== 汇总：通过 ${pass} / 失败 ${fail} ===`)
process.exit(fail ? 1 : 0)
