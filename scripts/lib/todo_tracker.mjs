/**
 * ==============================================================================
 * 待办常显追踪库 (Todo Tracker — S07 物理证据层)
 * ==============================================================================
 * 为什么需要这一层（2026-09-28 实测根因）：
 *   `rules/workflow/task_execution_flow.md` 把「S07 待办常显」列为防线 3，
 *   判定口径写的是"todo_write 调用记录（清单非空且包含推进状态）"。
 *   但物理层从来没有记录过任何 todo_write 证据：
 *     · 拦截层 ai-control/plugin/index.mjs 只读 status.json 与物理锁，不碰待办；
 *     · 判定脚本一个都没有，无客观判定 → 无阻断 → 该防线等于不存在。
 *   于是"任务必须常显"只是一句写在 Markdown 里的愿望。
 *
 * 本模块把该愿望降为**可落盘的物理事实**：
 *   每次 todo_write 都被记录成一条带时间戳的证据，任何一方（拦截层 / 审计脚本 /
 *   人工排查）都能在不采信模型自述的前提下回答两个问题：
 *     1) 本次会话到底有没有挂过任务列表？（防黑盒盲动）
 *     2) 列表里有没有 in_progress 项？（防"全部标完成"式假收尾）
 *
 * 存储：`$DSH_HOME/.dsh-control/todos/<safeSessionId>.json`
 * 与 status.json / physical_locks 同根，解析优先级完全一致，避免读写错位。
 * ==============================================================================
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { latestTodoWrite } from './session_transcript.mjs'

/** 允许的待办状态（与 DSH 原生 todo_write 契约一致）。 */
export const TODO_STATUSES = ['pending', 'in_progress', 'completed']

/** 默认存储根目录（与物理锁、status.json 同一根）。 */
export function getTodoDir(dshHome) {
  const home = dshHome || process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, '.dsh-control', 'todos')
}

/** 单会话证据文件路径。会话 ID 做字符白名单化，避免路径穿越。 */
export function getTodoFilePath(sessionId, dshHome) {
  const sid = sessionId || process.env.DSH_SESSION_ID || 'global_session'
  const safeSid = String(sid).replace(/[^a-zA-Z0-9_-]/g, '_')
  return join(getTodoDir(dshHome), `${safeSid}.json`)
}

/** 归一化一条待办：只保留 content 与 status，丢弃渲染用字段。 */
function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const content = typeof raw.content === 'string' ? raw.content : ''
  const status = TODO_STATUSES.includes(raw.status) ? raw.status : 'pending'
  if (!content) return null
  return { content, status }
}

/** 从任意入参形状中取出待办数组（兼容 `{todos:[...]}` 与裸数组）。 */
export function extractTodos(args) {
  const raw = Array.isArray(args) ? args : args?.todos
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeItem).filter(Boolean)
}

/** 统计口径：与前端 TodoPanel 的总进度口径一致（进行中按半步计）。 */
export function summarize(items) {
  const list = Array.isArray(items) ? items : []
  const total = list.length
  const completed = list.filter((i) => i.status === 'completed').length
  const inProgress = list.filter((i) => i.status === 'in_progress').length
  const pending = list.filter((i) => i.status === 'pending').length
  const done = completed + inProgress * 0.5
  return {
    total,
    completed,
    inProgress,
    pending,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  }
}

/**
 * 记录一次 todo_write 调用（拦截层每次调用都写；幂等且容错）。
 * @returns {Promise<object|null>} 落盘后的证据对象；失败返回 null（绝不抛错）
 */
export async function recordTodoWrite(sessionId, args, dshHome, extra = {}) {
  try {
    const items = extractTodos(args)
    const now = new Date().toISOString()
    const prev = await readTodoEvidence(sessionId, dshHome)
    const evidence = {
      version: '1.0.0',
      sessionId: sessionId || process.env.DSH_SESSION_ID || 'global_session',
      firstWrittenAt: prev?.firstWrittenAt || now,
      updatedAt: now,
      writes: (prev?.writes || 0) + 1,
      items,
      ...summarize(items),
      lastSource: extra.source || 'todo_write',
    }
    const file = getTodoFilePath(sessionId, dshHome)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify(evidence, null, 2), 'utf8')
    return evidence
  } catch {
    return null
  }
}

/**
 * 同步落盘一次证据。
 *
 * 为什么必须提供同步版：拦截层的 `ctx.tools.guard` 契约明确是**同步**的
 * （dsh-tools：`@param guard - synchronous check`）。若在守卫里 await 落盘，
 * 证据可能在下一个写动作之后才可见，判定就会读到过期状态。
 * 单文件 JSON 写入在守卫路径上开销可接受（约 1ms）。
 */
export function recordTodoWriteSync(sessionId, args, dshHome, extra = {}) {
  try {
    const items = extractTodos(args)
    const now = new Date().toISOString()
    const prev = readTodoEvidenceSync(sessionId, dshHome)
    const evidence = {
      version: '1.0.0',
      sessionId: sessionId || process.env.DSH_SESSION_ID || 'global_session',
      firstWrittenAt: prev?.firstWrittenAt || now,
      updatedAt: now,
      writes: (prev?.writes || 0) + 1,
      items,
      ...summarize(items),
      lastSource: extra.source || 'todo_write',
    }
    const file = getTodoFilePath(sessionId, dshHome)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(evidence, null, 2), 'utf8')
    return evidence
  } catch {
    return null
  }
}

/** 读取证据（同步版，供拦截层守卫使用——守卫必须同步）。 */
export function readTodoEvidenceSync(sessionId, dshHome) {
  try {
    const file = getTodoFilePath(sessionId, dshHome)
    if (!existsSync(file)) return null
    const data = JSON.parse(readFileSync(file, 'utf8'))
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) return null
    return data
  } catch {
    return null
  }
}

/** 读取证据（异步版，供脚本与审计使用）。 */
export async function readTodoEvidence(sessionId, dshHome) {
  try {
    const file = getTodoFilePath(sessionId, dshHome)
    if (!existsSync(file)) return null
    const data = JSON.parse(await readFile(file, 'utf8'))
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) return null
    return data
  } catch {
    return null
  }
}

/**
 * 从**宿主会话转录**里取证据（REQ-087 R1-a 新增的独立证据源）。
 *
 * 与插件落盘文件的区别（这是本次修复的核心）：
 *   · 插件文件：由 `ai-control/plugin/index.mjs` 在守卫里同步写；
 *     拦截层未加载时**一个字节都不会有** → 判定器永远 `NO_TODO`；
 *   · 会话转录：由宿主核心在每次 `todo_write` 时自己写，
 *     **不依赖任何插件**，只要会话在跑就存在。
 *
 * 自检隔离：设置了 `DSH_TODO_SELFTEST_HOME` 时一律不读宿主转录，
 * 保证 `todo_gate.sh selftest` 的三态判定不受真实会话干扰。
 *
 * @returns {object|null} 与文件证据同构的对象；无记录返回 null。
 */
export function evidenceFromTranscript(sessionId, dshHome) {
  if (process.env.DSH_TODO_SELFTEST_HOME) return null
  let hit
  try {
    hit = latestTodoWrite(sessionId, dshHome)
  } catch {
    return null
  }
  if (!hit) return null
  const items = hit.todos.map(normalizeItem).filter(Boolean)
  const updatedAt = hit.time ? new Date(hit.time).toISOString() : new Date().toISOString()
  return {
    version: '1.0.0',
    sessionId: sessionId || process.env.DSH_SESSION_ID || 'global_session',
    firstWrittenAt: updatedAt,
    updatedAt,
    updatedAtMs: hit.time || 0,
    writes: items.length ? 1 : 0,
    items,
    ...summarize(items),
    lastSource: 'host-transcript',
    transcriptSeq: hit.seq,
  }
}

/**
 * 证据源合一：插件文件与宿主转录取**较新**者。
 *
 * 为什么不是"转录优先"：守卫在 `todo_write` 的**同一次调用内**要读证据，
 * 此刻宿主可能尚未把事件刷进转录，插件文件反而更新；反过来，
 * 插件没加载时转录是唯一来源。按时间戳取新者，两种形态都对。
 */
export function resolveTodoEvidenceSync(sessionId, dshHome) {
  const fileEv = readTodoEvidenceSync(sessionId, dshHome)
  const trEv = evidenceFromTranscript(sessionId, dshHome)
  if (!trEv) return fileEv
  if (!fileEv) return trEv
  const tFile = Date.parse(fileEv.updatedAt) || 0
  const tTr = trEv.updatedAtMs || 0
  return tFile >= tTr ? fileEv : trEv
}

/**
 * S07 待办常显硬判定（纯函数，可单测）。
 *
 * 判定分两级，刻意区分"完全没有列表"与"列表假收尾"：
 *   · 无列表 / 空列表   → 阻断：必须先 todo_write 挂载多步任务分解，杜绝黑盒盲动；
 *   · 有列表但无进行中  → 阻断：全 pending 等于没开始、全 completed 等于宣告收尾，
 *                          收尾需由用户确认，因此执行中途必须至少留一项 in_progress。
 *
 * @returns {{ok:boolean, code:string, message:string, evidence:object|null}}
 */
export function checkTodoGate(sessionId, dshHome) {
  const evidence = resolveTodoEvidenceSync(sessionId, dshHome)
  if (!evidence || evidence.total === 0) {
    return {
      ok: false,
      code: 'NO_TODO',
      message:
        '本次会话尚无任务列表证据（未调用过 todo_write，或清单为空）。' +
        '在改动任何文件之前，必须先 todo_write 挂载结构化任务分解。',
      evidence: evidence || null,
    }
  }
  if (evidence.inProgress === 0) {
    return {
      ok: false,
      code: 'NO_IN_PROGRESS',
      message:
        `任务列表共有 ${evidence.total} 项，但没有一项处于 in_progress（完成 ${evidence.completed} / 待办 ${evidence.pending}）。` +
        '执行途中必须保留至少 1 项 in_progress；宣告收尾前也需用户确认。',
      evidence,
    }
  }
  return {
    ok: true,
    code: 'PASS',
    message: `任务列表常显合规：${evidence.completed}/${evidence.total} 完成，进行中 ${evidence.inProgress} 项，总进度 ${evidence.percent}%。`,
    evidence,
  }
}

/** 一行式状态串（终端与审计卡片复用）。 */
export function formatTodoLine(sessionId, dshHome) {
  const evidence = resolveTodoEvidenceSync(sessionId, dshHome)
  if (!evidence) return '待办常显：⛔ 无证据（未挂载任务列表）'
  if (evidence.total === 0) return '待办常显：⛔ 清单为空'
  const mark = evidence.inProgress > 0 ? '✅' : '⛔'
  const src = evidence.lastSource === 'host-transcript' ? '宿主转录' : '插件文件'
  return `待办常显：${mark} ${evidence.percent}% (${evidence.completed + evidence.inProgress * 0.5}/${evidence.total}) · 进行中 ${evidence.inProgress} 项 · 证据源 ${src}`
}
