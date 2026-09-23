/**
 * ==============================================================================
 * 任务命名看门狗（Naming Watchdog）——不依赖桌面端重启的自动命名
 * ==============================================================================
 * 为什么要有它：
 *   原方案把自动命名放在宿主插件里，逻辑虽已修好，但**插件改动必须重启桌面端
 *   才会加载**；用户明确不再做重启。改名所需的两样东西其实都在宿主进程之外：
 *     · 会话标题 → `$DSH_HOME/storages/session_projcache.json`（磁盘上）
 *     · 改名通道 → 宿主 Web RPC（可用端口反查定位）
 *   所以可以完全绕开插件，用一个独立的看门狗进程完成同一件事。
 *
 * 判定口径与插件版本**完全一致**：共用 scripts/lib/auto_naming.mjs，
 * 避免"两套实现各自演化"。
 *
 * 用法：
 *   node scripts/naming_watchdog.mjs                 # 只报告，不改动（默认 dry-run）
 *   node scripts/naming_watchdog.mjs --apply         # 实际改名
 *   node scripts/naming_watchdog.mjs --apply --loop 60   # 每 60 秒巡一遍，常驻
 *   node scripts/naming_watchdog.mjs --apply --sid session-xxx   # 只处理指定会话
 *
 * 安全性：
 *   - 只动"标题不合规"的**主会话**（子会话由宿主托管，预判跳过）；
 *   - 已合规的会话一次都不碰，绝不与模型按规范起的好名字打架；
 *   - 生成不出合规概述（空会话/无汉字）就跳过，不硬凑；
 *   - 任何异常都被吞掉并记录，绝不中断巡更。
 * ==============================================================================
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  parseTitle, readSessionStore, currentTitle, buildTitle,
  renameViaRpc, waitForTitle, resolveWebUrl, resetWebUrlCache, sessionCwd, letterFor,
} from './lib/auto_naming.mjs'

const HOME = process.env.DSH_HOME
if (!HOME) {
  console.error('缺少 DSH_HOME 环境变量，无法定位会话存储。')
  process.exit(2)
}
const STATE = join(HOME, '.dsh-control')
const LOG = join(STATE, 'naming-watchdog.log')

/**
 * 人工指定 / 豁免清单（可选文件）。
 * 存在的意义：
 *   · 个别会话的首条消息是闲聊或不当言论，自动生成的概述会把那句话搬进标题，
 *     比不改更糟——这类应当**人工指定**一个中性标题，而不是让机器照抄；
 *   · 个别会话确实不该被改名时，可以显式豁免并写明理由。
 * 文件格式：{ "session-xxx": { "title": "[R012][10分] 中性标题" },
 *            "session-yyy": { "skip": true, "reason": "理由" } }
 */
const OVERRIDES_PATH = join(process.cwd(), 'ai-control', 'config', 'naming_overrides.json')

/** 读取人工清单；不存在或损坏都当作空清单。 */
async function readOverrides() {
  try {
    return JSON.parse(await readFile(OVERRIDES_PATH, 'utf8'))
  } catch {
    return {}
  }
}

const APPLY = process.argv.includes('--apply')
const loopIdx = process.argv.indexOf('--loop')
const LOOP_SEC = loopIdx !== -1 ? Number(process.argv[loopIdx + 1]) || 60 : 0
const sidIdx = process.argv.indexOf('--sid')
const ONLY_SID = sidIdx !== -1 ? process.argv[sidIdx + 1] : null

/** 追加一行日志（失败不影响主流程）。 */
async function log(line) {
  const stamp = new Date().toISOString()
  try {
    await mkdir(STATE, { recursive: true })
    await writeFile(LOG, `${stamp} ${line}\n`, { encoding: 'utf8', flag: 'a' })
  } catch { /* 忽略 */ }
}

/** 找宿主进程（不用 pgrep：本机沙箱里 pgrep 不可用）。 */
function hostPid() {
  try {
    const out = String(execFileSync('ps', ['-eo', 'pid,command'], { encoding: 'utf8' }))
    const line = out.split('\n').find((l) => l.includes('dsh/lib/bin.js') && l.includes(' web'))
    return line ? Number(line.trim().split(/\s+/)[0]) : null
  } catch {
    return null
  }
}

/** 解析当前可用的宿主 Web 地址。 */
async function currentWebUrl() {
  const fromEnv = process.env.DSH_WEB_URL
  if (fromEnv) return fromEnv
  const pid = hostPid()
  if (!pid) return null
  resetWebUrlCache()
  return await resolveWebUrl({ env: {}, pid })
}

/**
 * 巡一遍：找出不合规的主会话并改名。
 * @returns {Promise<{checked:number, fixed:number, skipped:number, failed:number}>}
 */
async function sweep(webUrl) {
  const stat = { checked: 0, fixed: 0, skipped: 0, failed: 0 }
  const overrides = await readOverrides()
  // 本轮已分配的序号：改名后存储有 3~9 秒回写延迟，不能靠"再读一次存储"避免撞号
  const reserved = new Set()
  const reservedByLetter = new Map()
  let store = await readSessionStore(HOME)
  if (!store) { await log('FAIL 读不到会话存储'); return stat }

  // 收集待处理会话；顺序稳定（按会话 ID），避免每次巡更抖动
  const targets = []
  for (const sid of Object.keys(store?.tables?.sessions ?? {}).sort()) {
    if (ONLY_SID && sid !== ONLY_SID) continue
    if (!sid.startsWith('session-')) continue           // 子会话由宿主托管，跳过
    if (parseTitle(currentTitle(store, sid))) continue  // 已合规：绝不打扰
    targets.push(sid)
  }

  for (const sid of targets) {
    stat.checked++
    const before = currentTitle(store, sid)

    // 人工清单优先：显式豁免，或指定标题
    const ov = overrides?.[sid]
    if (ov?.skip) {
      stat.skipped++
      await log(`SKIP ${sid} 人工豁免 · ${ov.reason ?? '未写明理由'}`)
      continue
    }

    // 重新读一次存储：上一轮改名会让序号占用发生变化
    store = await readSessionStore(HOME)
    let title = null
    if (ov?.title) {
      title = String(ov.title)
      if (!parseTitle(title)) {
        stat.skipped++
        await log(`SKIP ${sid} 人工指定的标题本身不合规：「${title}」`)
        continue
      }
    } else {
      const letter = letterFor((await sessionCwd(HOME, sid)) ?? '')
      title = await buildTitle({
        dshHome: HOME, sessionId: sid, cwd: '', store,
        reserved: reservedByLetter.get(letter) ?? reserved,
      })
      if (title) {
        // 记下本轮已用序号，跨过"存储回写延迟"这段窗口
        const used = new Set(reservedByLetter.get(letter) ?? [])
        used.add(parseTitle(title).num)
        reservedByLetter.set(letter, used)
      }
    }
    if (!title) {
      stat.skipped++
      await log(`SKIP ${sid} 「${String(before ?? '').slice(0, 26)}」 · 生成不出合规概述（空会话或无汉字）`)
      continue
    }
    if (!APPLY) {
      await log(`DRY  ${sid} 「${String(before ?? '').slice(0, 26)}」 → 「${title}」`)
      console.log(`  [dry-run] ${sid}\n            「${String(before ?? '').slice(0, 26)}」 → 「${title}」`)
      continue
    }
    if (!webUrl) {
      stat.failed++
      await log(`FAIL ${sid} 无可用宿主地址`)
      continue
    }
    const ok = await renameViaRpc(webUrl, sid, title)
    // 判定以权威存储为准，不采信 RPC 自述（实测有 3~9 秒回写延迟）
    const verified = ok ? await waitForTitle(HOME, sid, title, 15000) : false
    if (verified) {
      stat.fixed++
      await log(`OK   ${sid} 「${String(before ?? '').slice(0, 26)}」 → 「${title}」`)
      console.log(`  ✅ ${sid} → 「${title}」`)
    } else {
      stat.failed++
      await log(`FAIL ${sid} 「${String(before ?? '').slice(0, 26)}」 → 「${title}」${ok ? ' (RPC ok 但存储未确认)' : ' (RPC 失败)'}`)
      console.log(`  ❌ ${sid} 改名未确认`)
    }
  }
  return stat
}

async function once() {
  const webUrl = await currentWebUrl()
  const stat = await sweep(webUrl)
  await log(`SWEEP 地址=${webUrl ?? '(无)'} 检查=${stat.checked} 改好=${stat.fixed} 跳过=${stat.skipped} 失败=${stat.failed}`)
  console.log(`巡更结果：检查 ${stat.checked} · 改好 ${stat.fixed} · 跳过 ${stat.skipped} · 失败 ${stat.failed}${APPLY ? '' : '（dry-run，未改动）'}`)
  return stat
}

if (LOOP_SEC > 0) {
  console.log(`看门狗常驻：每 ${LOOP_SEC} 秒巡一遍${APPLY ? '（会实际改名）' : '（dry-run）'}，Ctrl+C 退出。`)
  await log(`START 常驻模式 间隔=${LOOP_SEC}s apply=${APPLY}`)
  for (;;) {
    try { await once() } catch (err) { await log(`FAIL 巡更异常：${err?.message || err}`) }
    await new Promise((r) => setTimeout(r, LOOP_SEC * 1000))
  }
} else {
  await once()
}
