#!/usr/bin/env node
/**
 * ==============================================================================
 * 存量会话命名审计与方案导出器 (Session Naming Audit & Plan Exporter)
 * ==============================================================================
 * 只读工具：不修改任何数据，只产出审计报告与改名方案草稿。
 *
 * 为什么需要它：
 *   任务是"存量任务也必须自动命名"，而存量会话的标题散落在两个地方：
 *     - 权威存储：`$DSH_HOME/storages/session_projcache.json`
 *                 → `tables.sessions.<sessionId>.rows.title.val`
 *     - 落盘内容：`$DSH_HOME/sessions/<workspace>/<sessionId>/session.jsonl.zstd`
 *   其中 `.zstd` 是**多帧拼接**（每帧一次追加写入），必须逐帧解压才能读到
 *   真实对话内容——单帧解压只会得到会话头，这是本工具存在的前提。
 *
 * 用法：
 *   node scripts/session_naming_audit.mjs                 # 审计 + 导出方案草稿
 *   node scripts/session_naming_audit.mjs --json          # 输出 JSON 供程序消费
 *   node scripts/session_naming_audit.mjs --limit 10      # 只处理前 N 条
 * ==============================================================================
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { zstdDecompressSync } from 'node:zlib'

/** zstd 帧魔数：0x28B52FFD */
const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

/** 命名规范校验（与 knowledge/common/task_naming_spec.md 的 R1~R7 对齐） */
const TITLE_RE = /^\[([RFDSOQ])([0-9]{3})\]\[([0-9]{1,3})分\] (.+)$/

/** 统计字符串中的汉字个数（Unicode 属性匹配，不受 locale 影响）。 */
function hanCount(s) {
  const m = String(s).match(/\p{Script=Han}/gu)
  return m ? m.length : 0
}

/**
 * 判断是否子代理会话。
 * 实测：子会话（未挂 `session-` 前缀）由宿主的 subagent routing 托管，
 * 对它们调用 `session.rename` 会返回 `agent-busy`（"owned by subagent routing"），
 * 且直接改写存储会被运行时覆盖回滚——故它们**无法改名**，只能标记说明。
 */
function isSubSession(sid) {
  return !String(sid).startsWith('session-')
}

/** 判定标题是否合规，返回 { ok, reason }。 */
function validateTitle(title) {
  if (!title) return { ok: false, reason: '标题为空' }
  const m = TITLE_RE.exec(title)
  if (!m) return { ok: false, reason: '不符合 [分类编号][难度分] 概述 结构' }
  const score = Number(m[3])
  if (!Number.isInteger(score) || score < 1 || score > 100) return { ok: false, reason: `难度分越界: ${m[3]}` }
  const h = hanCount(m[4])
  if (h < 1) return { ok: false, reason: '概述无汉字' }
  if (h > 8) return { ok: false, reason: `概述 ${h} 字，超 8 字上限` }
  return { ok: true, reason: '', code: m[1], num: Number(m[2]), score, summary: m[4] }
}

/** 解析 $DSH_HOME（与管控插件保持同一优先级）。 */
function resolveHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

/**
 * 逐帧解压多帧 zstd 文件。
 * 关键：容器是「帧拼接」而非单帧压缩流，必须按魔数切分逐帧解压，
 * 否则 `zstdDecompressSync` 只能拿到第一帧（即会话头，内容为空）。
 */
function readFramesText(absPath) {
  const buf = readFileSync(absPath)
  const starts = []
  let i = 0
  while ((i = buf.indexOf(ZSTD_MAGIC, i)) !== -1) { starts.push(i); i += 4 }
  const parts = []
  let frames = 0, failed = 0
  for (let k = 0; k < starts.length; k++) {
    const end = k + 1 < starts.length ? starts[k + 1] : buf.length
    try { parts.push(zstdDecompressSync(buf.subarray(starts[k], end))); frames++ }
    catch { failed++ }
  }
  return { text: Buffer.concat(parts).toString('utf8'), frames, failed }
}

/** 从会话事件流中提取首条**真用户**消息正文（用于生成"任务概述"）。
 *  注意：`user/message` 并非全是用户输入——宿主注入的工作区约束提醒同样以
 *  `user/message` 落盘，必须用 `data.source.kind === 'user'` 区分，否则会把
 *  系统提醒当成用户需求，生成出毫无意义的标题。 */
function firstUserMessage(text) {
  for (const line of text.split('\n')) {
    if (!line.trim() || !line.includes('user/message')) continue
    let o
    try { o = JSON.parse(line) } catch { continue }
    if (o.type !== 'user/message') continue
    if (o.data?.source?.kind !== 'user') continue
    const c = o.data?.content
    if (typeof c === 'string') return c
    if (Array.isArray(c)) {
      const t = c.filter(p => p && p.type === 'text' && typeof p.text === 'string').map(p => p.text).join(' ')
      if (t) return t
    }
  }
  return ''
}

/** 从会话事件流中提取最后一次标题写入事件（判断历史上是否改过名）。 */
function lastTitleEvent(text) {
  let found = null
  for (const line of text.split('\n')) {
    if (!line.includes('session/title')) continue
    let o
    try { o = JSON.parse(line) } catch { continue }
    if (o.type === 'session/title' && typeof o.data?.title === 'string') found = o.data.title
  }
  return found
}

/**
 * 把用户消息压成 ≤8 汉字的白话短语草稿。
 * 策略：保留原文顺序，按标点/换行切成子句，优先取第一个有实义的子句；
 * 仅在单个子句超长时才硬截到 8 字。目的是产出"像人话"的概述草稿，
 * 最终标题仍由智能体或人工确认，本函数不追求完美。
 */
function draftSummary(msg, max = 8) {
  const body = String(msg)
    .replace(/<[^>]*>/g, ' ')                 // 去标签
    .replace(/```[\s\S]*?```/g, ' ')          // 去代码块
    .replace(/^\s*(请|帮我|麻烦|需要|我要|想要|给我)+/, '')  // 去口语前缀
  const clauses = body
    .split(/[\n。；;！!？?，,、：:]+/)
    .map(s => s.replace(/[^\p{Script=Han}0-9A-Za-z]/gu, ''))
    .filter(s => hanCount(s) >= 2)
  if (!clauses.length) return { summary: '', hanCount: 0 }
  let s = clauses[0]
  if (hanCount(s) > max) {
    // 按汉字逐个累积到 max，避免直接 slice 切断多字节
    let out = '', n = 0
    for (const ch of s) {
      if (/\p{Script=Han}/u.test(ch)) { if (n >= max) break; n++ }
      out += ch
    }
    s = out
  }
  return { summary: s, hanCount: hanCount(s) }
}

function main() {
  const argv = process.argv.slice(2)
  const asJson = argv.includes('--json')
  const limitIdx = argv.indexOf('--limit')
  const limit = limitIdx !== -1 ? Number(argv[limitIdx + 1]) : Infinity

  const home = resolveHome()
  const storePath = join(home, 'storages', 'session_projcache.json')
  const wsPath = join(home, 'storages', 'workspace.json')
  const sessRoot = join(home, 'sessions')

  if (!existsSync(storePath)) {
    console.error(`❌ 找不到会话存储：${storePath}`)
    process.exit(2)
  }

  const store = JSON.parse(readFileSync(storePath, 'utf8'))
  const rows = store.tables?.sessions ?? {}

  // 建立 sessionId → 工作区 的映射
  const wsOf = new Map()
  if (existsSync(wsPath)) {
    const ws = JSON.parse(readFileSync(wsPath, 'utf8'))
    for (const [, w] of Object.entries(ws.tables?.workspaces ?? {})) {
      for (const sid of w.sessionIds ?? []) wsOf.set(sid, { title: w.title, path: w.path })
    }
  }

  // 建立 sessionId → session.jsonl.zstd 绝对路径 的索引
  const fileOf = new Map()
  if (existsSync(sessRoot)) {
    for (const wsDir of readdirSync(sessRoot)) {
      const abs = join(sessRoot, wsDir)
      let entries = []
      try { entries = readdirSync(abs) } catch { continue }
      for (const e of entries) {
        const f = join(abs, e, 'session.jsonl.zstd')
        if (existsSync(f)) fileOf.set(e, f)
      }
    }
  }

  // 已用编号统计（用于规划新编号，避免撞号）
  const usedCodes = new Map()
  for (const e of Object.values(rows)) {
    const t = e?.rows?.title?.val
    const m = t ? TITLE_RE.exec(t) : null
    if (m) {
      if (!usedCodes.has(m[1])) usedCodes.set(m[1], new Set())
      usedCodes.get(m[1]).add(Number(m[2]))
    }
  }

  const items = []
  let okCount = 0, badCount = 0, unreadable = 0, subCount = 0

  for (const [sid, entry] of Object.entries(rows)) {
    if (items.length >= limit) break
    const sub = isSubSession(sid)
    if (sub) subCount++
    const title = entry?.rows?.title?.val ?? ''
    const stats = entry?.rows?.sessionStats?.val ?? {}
    const v = validateTitle(title)
    // 工作区归属：优先取 workspace.json 登记；未登记时回退到会话自身的 cwd
    // （实测存在 8 条会话未登记进任何工作区，回退后可读性远好于"(未知工作区)"）
    const cwd = entry?.identity?.cwd ?? ''
    const ws = wsOf.get(sid) ?? { title: cwd ? cwd.split('/').pop() : '(无 cwd)', path: cwd, unregistered: true }
    const item = {
      sessionId: sid,
      currentTitle: title,
      compliant: v.ok,
      isSubSession: sub,
      reason: v.ok ? '' : (sub ? `子会话·宿主限制不可改名（${v.reason}）` : v.reason),
      workspace: ws.title,
      workspaceUnregistered: Boolean(ws.unregistered),
      cwd: ws.path,
      turns: stats.turns ?? null,
      steps: stats.steps ?? null,
      decodeTokens: stats.decodeTokens ?? null,
      firstUserMessage: '',
      draftSummary: '',
      hasFile: fileOf.has(sid),
    }
    if (v.ok) { okCount++; } else { badCount++ }

    const f = fileOf.get(sid)
    if (f) {
      try {
        const { text } = readFramesText(f)
        const msg = firstUserMessage(text)
        item.firstUserMessage = msg.slice(0, 200)
        if (!v.ok && msg) {
          const d = draftSummary(msg)
          item.draftSummary = d.summary
        }
      } catch (e) {
        unreadable++
        item.firstUserMessage = `<读取失败: ${e.message}>`
      }
    } else {
      unreadable++
      item.firstUserMessage = '<无落盘文件>'
    }
    items.push(item)
  }

  const mainItems = items.filter(x => !x.isSubSession)
  const report = {
    generatedAt: new Date().toISOString(),
    home,
    total: Object.keys(rows).length,
    audited: items.length,
    subSessions: subCount,
    mainSessions: mainItems.length,
    compliant: okCount,
    nonCompliant: badCount,
    unreadable,
    unregisteredWorkspace: items.filter(x => x.workspaceUnregistered).length,
    complianceRate: mainItems.length ? +(mainItems.filter(x => x.compliant).length / mainItems.length * 100).toFixed(1) : 0,
    usedCodes: Object.fromEntries([...usedCodes].map(([k, s]) => [k, [...s].sort((a, b) => a - b)])),
    items,
  }

  if (asJson) { console.log(JSON.stringify(report, null, 2)); return }

  console.log('=== 存量会话命名审计 ===')
  console.log(`存储位置：${storePath}`)
  console.log(`总会话 ${report.total}（主会话 ${report.mainSessions} + 子会话 ${report.subSessions}）`)
  console.log(`主会话合规 ${mainItems.filter(x => x.compliant).length} / ${report.mainSessions} · 主会话合规率 ${report.complianceRate}%`)
  console.log(`子会话（宿主限制不可改名）${report.subSessions} 条 · 未登记工作区 ${report.unregisteredWorkspace} · 内容读取失败 ${report.unreadable}`)
  console.log('\n=== 待改名清单（含首条用户消息，供生成概述）===')
  for (const it of items.filter(x => !x.compliant && !x.isSubSession)) {
    console.log(`\n▸ ${it.sessionId}`)
    console.log(`  工作区   : ${it.workspace}${it.workspaceUnregistered ? '  ⚠️ 未登记进 workspace.json' : ''}`)
    console.log(`  现标题   : 「${it.currentTitle || '(空)'}」  → ${it.reason}`)
    console.log(`  规模     : ${it.steps ?? '?'} 步 / ${it.turns ?? '?'} 轮 / ${it.decodeTokens ?? '?'} 输出 token`)
    console.log(`  首条消息 : ${it.firstUserMessage.replace(/\s+/g, ' ').slice(0, 110) || '(无)'}`)
    console.log(`  概述草稿 : ${it.draftSummary || '(无法生成)'}`)
  }
  if (report.subSessions) {
    console.log('\n=== 子会话（不可改名，仅记录） ===')
    for (const it of items.filter(x => x.isSubSession)) {
      console.log(`  · ${it.sessionId}  「${String(it.currentTitle || '(空)').slice(0, 40)}」`)
    }
  }
  console.log('\n=== 已占用编号 ===')
  for (const [k, arr] of Object.entries(report.usedCodes)) console.log(`  ${k}: ${arr.join(', ')}`)
}

main()
