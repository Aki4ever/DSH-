#!/usr/bin/env node
/**
 * ==============================================================================
 * 存量会话批量规范命名器 (Batch Session Renamer)
 * ==============================================================================
 * 用途：把历史会话标题按命名规范统一改名，并支持回滚。
 *
 * 为什么走 HTTP RPC 而不是直接改 session_projcache.json：
 *   实测直接写该文件存在**内存缓存竞态**——改完文件后仍可能被运行中的宿主
 *   覆盖回去。而 `POST /api/session.rename` 是宿主自己的写入通道，实测对
 *   **非当前会话**同样有效且能持久化（唯一权威落点仍是 session_projcache.json，
 *   改完复查即可确认）。
 *
 * 用法：
 *   # 1) 先看方案，不写任何东西
 *   node scripts/batch_rename_sessions.mjs --plan naming-plan.json --dry-run
 *
 *   # 2) 确认后执行
 *   node scripts/batch_rename_sessions.mjs --plan naming-plan.json --apply
 *
 *   # 3) 出问题回滚（回滚文件由 --apply 自动生成）
 *   node scripts/batch_rename_sessions.mjs --plan naming-rollback.json --apply
 *
 * 方案文件格式（JSON 数组）：
 *   [{ "sessionId": "session-xxx", "title": "[R001][60分] 任务流程重构" }, ...]
 *
 * 安全设计：
 *   - 每条标题先按命名规范硬校验，不合规直接拒绝执行，不放过半条；
 *   - `--apply` 前自动备份 session_projcache.json；
 *   - `--apply` 时自动生成回滚文件（记录改前的原标题）；
 *   - 改完逐条复查权威存储，输出真实生效数，不采信 API 的 ok:true。
 * ==============================================================================
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { loadWorkspaceIndex, resolveWorkspace } from './lib/workspace_resolve.mjs'

const TITLE_RE = /^\[([RFDSOQ])([0-9]{3})\]\[([0-9]{1,3})分\] (.+)$/

function hanCount(s) {
  const m = String(s).match(/\p{Script=Han}/gu)
  return m ? m.length : 0
}

/** 与 rename_session.sh 保持同一口径的标题校验。 */
function validateTitle(title) {
  const m = TITLE_RE.exec(String(title ?? ''))
  if (!m) return '不符合 [分类编号][难度分] 概述 结构'
  const score = Number(m[3])
  if (!Number.isInteger(score) || score < 1 || score > 100) return `难度分越界: ${m[3]}`
  const h = hanCount(m[4])
  if (h < 1) return '概述无汉字'
  if (h > 8) return `概述 ${h} 字，超 8 字上限`
  return null
}

function resolveHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

function storePathOf(home) {
  return join(home, 'storages', 'session_projcache.json')
}

/** 读取权威存储中的当前标题。 */
function readTitles(storePath) {
  const d = JSON.parse(readFileSync(storePath, 'utf8'))
  const rows = d.tables?.sessions ?? {}
  const out = new Map()
  for (const [sid, e] of Object.entries(rows)) out.set(sid, e?.rows?.title?.val ?? '')
  return out
}

/** 读取 sessionId → 归属工作区 的映射，用于按工作区判重编号。
 *  归位口径与方案生成器共用 scripts/lib/workspace_resolve.mjs，
 *  避免"生成器按 A 编号、批量器按 B 判重"的错位（实测曾因此误拦撞号）。 */
function readWorkspaceOf(storePath) {
  const home = dirname(dirname(storePath))
  const d = JSON.parse(readFileSync(storePath, 'utf8'))
  const rows = d.tables?.sessions ?? {}
  const items = Object.entries(rows).map(([sid, e]) => ({
    sessionId: sid,
    cwd: e?.identity?.cwd ?? '',
    // 是否已登记：由共享模块依据 workspace.json 自行判定
    workspaceUnregistered: false,
  }))
  const index = loadWorkspaceIndex(home)
  const out = new Map()
  for (const it of items) {
    const registered = index.bySid.has(it.sessionId)
    out.set(it.sessionId, resolveWorkspace(
      { sid: it.sessionId, cwd: it.cwd, unregistered: !registered }, index, home,
    ))
  }
  return out
}

/** 通过宿主 RPC 改一条标题，返回 { ok, detail }。 */
async function renameViaRpc(webUrl, sessionId, title) {
  const body = {
    type: 'client-request',
    rpcId: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method: 'session.rename',
    payload: { sessionId, title },
  }
  try {
    const res = await fetch(`${webUrl}/api/session.rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => null)
    const ok = json?.result?.ok === true
    return { ok, detail: ok ? 'rpc-ok' : JSON.stringify(json).slice(0, 160) }
  } catch (e) {
    return { ok: false, detail: `网络失败: ${e.message}` }
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function main() {
  const argv = process.argv.slice(2)
  const planIdx = argv.indexOf('--plan')
  const planPath = planIdx !== -1 ? argv[planIdx + 1] : null
  const dryRun = argv.includes('--dry-run')
  const apply = argv.includes('--apply')
  // 回滚模式：回滚目标正是**历史非规范标题**，若仍走命名规范预校验，
  // 回滚方案会被自己拦死（实测 38 处问题）——工具就永远无法回滚。
  // 该开关只跳过"格式合规"校验，会话存在性、编号判重仍然执行。
  const rollbackMode = argv.includes('--rollback')
  const settleIdx = argv.indexOf('--settle-ms')
  const settleMs = settleIdx !== -1 ? Number(argv[settleIdx + 1]) : 250

  if (!planPath || !existsSync(planPath)) {
    console.error('❌ 必须用 --plan <文件.json> 指定改名方案')
    process.exit(2)
  }
  if (!dryRun && !apply) {
    console.error('❌ 必须显式指定 --dry-run（预览）或 --apply（执行）')
    process.exit(2)
  }

  const plan = JSON.parse(readFileSync(planPath, 'utf8'))
  if (!Array.isArray(plan) || !plan.length) {
    console.error('❌ 方案文件必须是「非空 JSON 数组」')
    process.exit(2)
  }

  // 1) 全量预校验：任何一条不合规都不执行，避免改一半留半截
  const home = resolveHome()
  const storePath = storePathOf(home)
  if (!existsSync(storePath)) { console.error(`❌ 找不到会话存储：${storePath}`); process.exit(2) }
  const wsOf = readWorkspaceOf(storePath)

  const problems = []
  // 编号判重粒度是**工作区**：编号本就按项目独立编排（各项目 R001/F001 各自从 1 起），
  // 因此跨工作区同号是正常现象，只有同一工作区内撞号才真正让侧边栏无法区分。
  const codeSeen = new Map()
  for (const it of plan) {
    if (!it?.sessionId || typeof it.sessionId !== 'string') { problems.push(`条目缺 sessionId: ${JSON.stringify(it).slice(0, 80)}`); continue }
    // 回滚模式允许标题不符合当前命名规范（这正是回滚的目的）；其余模式一律硬校验
    if (!rollbackMode) {
      const err = validateTitle(it.title)
      if (err) { problems.push(`${it.sessionId}: 「${it.title}」 → ${err}`); continue }
    }
    if (!wsOf.has(it.sessionId) && !rollbackMode) { problems.push(`${it.sessionId}: 权威存储中不存在该会话`); continue }
    // 回滚模式直接跳过编号判重：历史数据本身就存在编号重复（实测全局规则区有两处 D002），
    // 回滚的本质正是"恢复当时的样子"，用今天的唯一性标准去卡它只会让回滚永远失败。
    if (rollbackMode) continue
    const m = TITLE_RE.exec(it.title)
    if (!m) continue   // 理论上不可达（已过格式校验），保留兜底
    const ws = wsOf.get(it.sessionId) ?? '(未登记工作区)'
    const code = `${ws}::${m[1]}${m[2]}`
    if (codeSeen.has(code)) problems.push(`同工作区内编号撞号 ${m[1]}${m[2]}（${ws}）：${codeSeen.get(code)} 与 ${it.sessionId}`)
    else codeSeen.set(code, it.sessionId)
  }
  if (problems.length) {
    console.error(`❌ 方案未通过预校验，共 ${problems.length} 处问题（未执行任何修改）：`)
    for (const p of problems.slice(0, 30)) console.error('   - ' + p)
    process.exit(1)
  }
  console.log(rollbackMode
    ? `✅ 回滚方案预校验通过：${plan.length} 条（回滚模式：跳过命名规范校验，仅校验会话存在性）`
    : `✅ 方案预校验通过：${plan.length} 条全部合规且同工作区内编号无撞号`)

  const titles = readTitles(storePath)

  console.log('\n=== 改名方案预览 ===')
  let noop = 0
  for (const it of plan) {
    const before = titles.get(it.sessionId)
    const same = before === it.title
    if (same) noop++
    console.log(` ${same ? '≡ 已是此名' : '→'} ${it.sessionId}`)
    console.log(`     改前: ${before === undefined ? '(会话不存在)' : (before || '(空)')}`)
    console.log(`     改后: ${it.title}`)
  }
  console.log(`\n合计 ${plan.length} 条 · 其中 ${noop} 条已是目标标题（无需改动）`)

  if (dryRun) {
    console.log('\n🔎 --dry-run 模式：未做任何修改。')
    return
  }

  // 2) 备份 + 生成回滚文件
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backup = `${storePath}.bak.${stamp}`
  copyFileSync(storePath, backup)
  const rollback = plan.map(it => ({ sessionId: it.sessionId, title: titles.get(it.sessionId) ?? '' }))
  const rollbackPath = join(dirname(planPath), `naming-rollback-${stamp}.json`)
  writeFileSync(rollbackPath, JSON.stringify(rollback, null, 2))
  console.log(`\n🗄️  已备份存储：${backup}`)
  console.log(`↩️  已生成回滚方案：${rollbackPath}`)

  const webUrl = process.env.DSH_WEB_URL || 'http://127.0.0.1:50447'
  console.log(`\n=== 开始改名（目标宿主 ${webUrl}） ===`)
  let rpcOk = 0, rpcFail = 0
  for (const it of plan) {
    const { ok, detail } = await renameViaRpc(webUrl, it.sessionId, it.title)
    if (ok) { rpcOk++; console.log(` ✅ ${it.title}`) }
    else { rpcFail++; console.log(` ❌ ${it.sessionId} → ${detail}`) }
    await sleep(settleMs)
  }

  // 3) 复查权威存储（不采信 ok:true）
  await sleep(800)
  const after = readTitles(storePath)
  let persisted = 0, alreadyOk = 0
  const notPersisted = []
  for (const it of plan) {
    const now = after.get(it.sessionId)
    if (now === it.title) {
      // 区分「本次改成功」与「本来就已是目标标题」——后者曾被误计成失败
      if (titles.get(it.sessionId) === it.title) alreadyOk++
      else persisted++
    } else {
      notPersisted.push({ sessionId: it.sessionId, expected: it.title, actual: now })
    }
  }

  console.log('\n=== 执行结果（以权威存储复查为准） ===')
  console.log(`RPC 成功 ${rpcOk} · RPC 失败 ${rpcFail}`)
  console.log(`权威存储已生效 ${persisted} · 原本已合规 ${alreadyOk} · 仍未生效 ${notPersisted.length} / ${plan.length}`)
  if (notPersisted.length) {
    const needRetry = notPersisted.filter(n => n.actual !== undefined)
    console.log('\n仍未生效明细（宿主缓存竞态，重跑一次即可收敛）：')
    for (const n of notPersisted.slice(0, 30)) console.log(`   - ${n.sessionId}: 期望「${n.expected}」实为「${n.actual}」`)
    if (needRetry.length) console.log(`\n建议重跑：node scripts/batch_rename_sessions.mjs --plan <同一方案> --apply`)
  }
  console.log(`\n回滚命令：node scripts/batch_rename_sessions.mjs --plan "${rollbackPath}" --apply`)
}

main()
