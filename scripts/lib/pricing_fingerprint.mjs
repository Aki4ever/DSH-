/**
 * ==============================================================================
 * 定价文档指纹机制（共享模块） pricing_fingerprint.mjs
 * ==============================================================================
 * 目标页：https://api-docs.deepseek.com/zh-cn/quick_start/pricing/
 *         （兜底：同址去掉结尾斜杠）
 * 做法：抓取正文 → sha256；同时记录响应头 etag / last-modified（若官方返回）。
 *
 * 状态文件：$DSH_HOME/.dsh-control/pricing_fingerprint.json（DSH_HOME 默认 ~/.dsh）
 *   { schemaVersion, sourceUrl, fingerprint, etag, lastModified,
 *     firstSeenAt, lastCheckedAt, lastChangedAt, changeCount, history, lastFetchedAt }
 *
 * 每日一次语义（日期以 Asia/Shanghai 判定）：
 *   - 同一天内重复运行只刷新 lastCheckedAt，不重复落 history；
 *   - 只有指纹变化才追加 history({at,from,to}) 且 changeCount+1、更新 lastChangedAt；
 *   - history 只保留最近 10 次变化。
 * 抓不到时：绝不伪造指纹，如实返回 error，并**原样保留上次状态**（连 lastCheckedAt 也不更新）。
 *
 * 依赖：仅 node: 内置模块 + 全局 fetch，无第三方依赖。
 * ==============================================================================
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

/** 状态文件 schema 版本（结构变更时递增）。 */
export const SCHEMA_VERSION = 1

/** 目标页（**唯一权威源**，顺序即兜底顺序）。 */
export const PRICING_URLS = [
  'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/',
  'https://api-docs.deepseek.com/zh-cn/quick_start/pricing',
]

/** 历史最多保留条数。 */
const HISTORY_LIMIT = 10

/** DSH_HOME 默认 ~/.dsh。 */
export function resolveDshHome() {
  const h = process.env.DSH_HOME
  return h && h.trim() ? h.trim() : join(homedir(), '.dsh')
}

/** 控制目录 $DSH_HOME/.dsh-control。 */
export function resolveControlDir() {
  return join(resolveDshHome(), '.dsh-control')
}

/** 状态文件绝对路径。 */
export function pricingStatePath() {
  return join(resolveControlDir(), 'pricing_fingerprint.json')
}

/** 取北京时间的日期键 YYYY-MM-DD（**不依赖服务器本地时区**）。 */
export function shanghaiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (t) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** 读状态文件；不存在或损坏一律返回 null（损坏不静默覆盖，交由调用方重建）。 */
export function readPricingState() {
  const p = pricingStatePath()
  if (!existsSync(p)) return null
  try {
    const obj = JSON.parse(readFileSync(p, 'utf8'))
    if (obj && typeof obj === 'object') return obj
    return null
  } catch {
    return null
  }
}

/** 原子写状态文件（临时文件 + rename），保证重复执行不留半截文件。 */
function writeStateAtomic(state) {
  const dir = resolveControlDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const target = pricingStatePath()
  const tmp = `${target}.tmp-${process.pid}`
  try {
    writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    renameSync(tmp, target)
  } catch (err) {
    try {
      if (existsSync(tmp)) unlinkSync(tmp)
    } catch {
      /* 清理失败不影响主错误上报 */
    }
    throw err
  }
}

/** 计算 sha256 十六进制指纹。 */
export function sha256Hex(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/** 空模板（首次创建用）。 */
function emptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: null,
    fingerprint: null,
    etag: null,
    lastModified: null,
    firstSeenAt: null,
    lastCheckedAt: null,
    lastChangedAt: null,
    changeCount: 0,
    lastFetchedAt: null,
    history: [],
  }
}

/**
 * 抓取目标页。返回 { ok, sourceUrl, body, etag, lastModified, httpStatus, error }。
 * 两个 URL 依次尝试，全失败才算失败。
 */
async function fetchPricingPage({ timeoutMs = 20000 } = {}) {
  const errors = []
  for (const url of PRICING_URLS) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/html,application/xhtml+xml' },
        signal: controller.signal,
      })
      const body = await res.text()
      if (!res.ok) {
        errors.push(`${url} → HTTP ${res.status}`)
        continue
      }
      if (!body || body.trim().length === 0) {
        errors.push(`${url} → 响应正文为空`)
        continue
      }
      return {
        ok: true,
        sourceUrl: url,
        body,
        etag: res.headers.get('etag') || null,
        lastModified: res.headers.get('last-modified') || null,
        httpStatus: res.status,
        error: null,
      }
    } catch (err) {
      const isAbort = err && (err.name === 'AbortError' || err.name === 'TimeoutError')
      errors.push(`${url} → ${isAbort ? `超时（${timeoutMs}ms）` : `网络异常 ${String(err?.message ?? err)}`}`)
    } finally {
      clearTimeout(timer)
    }
  }
  return { ok: false, sourceUrl: null, body: null, etag: null, lastModified: null, httpStatus: null, error: errors.join(' | ') }
}

/**
 * 同步一次定价文档指纹。
 *
 * @param {{ timeoutMs?: number, now?: Date }} [options]
 * @returns {Promise<{
 *   ok: boolean, error: string | null, statePath: string,
 *   sourceUrl: string | null, fingerprint: string | null,
 *   etag: string | null, lastModified: string | null,
 *   firstSeenAt: string | null, lastCheckedAt: string | null, lastChangedAt: string | null,
 *   lastFetchedAt: string | null,
 *   changeCount: number, historyCount: number,
 *   changed: boolean, initialized: boolean, changedToday: boolean
 * }>}
 */
export async function syncPricingFingerprint({ timeoutMs = 20000, now = new Date() } = {}) {
  const statePath = pricingStatePath()
  const prev = readPricingState()
  const fetched = await fetchPricingPage({ timeoutMs })

  const at = now.toISOString()
  const today = shanghaiDateKey(now)

  if (!fetched.ok) {
    // 铁律：抓不到 → 不伪造指纹、不写盘、连 lastCheckedAt 都不更新；保留上次状态。
    return {
      ok: false,
      error: fetched.error || '抓取失败',
      statePath,
      sourceUrl: prev?.sourceUrl ?? null,
      fingerprint: prev?.fingerprint ?? null,
      etag: prev?.etag ?? null,
      lastModified: prev?.lastModified ?? null,
      firstSeenAt: prev?.firstSeenAt ?? null,
      lastCheckedAt: prev?.lastCheckedAt ?? null,
      lastChangedAt: prev?.lastChangedAt ?? null,
      lastFetchedAt: prev?.lastFetchedAt ?? null,
      changeCount: prev?.changeCount ?? 0,
      historyCount: Array.isArray(prev?.history) ? prev.history.length : 0,
      changed: false,
      initialized: false,
      changedToday: Boolean(prev?.lastChangedAt && shanghaiDateKey(new Date(prev.lastChangedAt)) === today),
    }
  }

  const fingerprint = sha256Hex(fetched.body)
  const base = prev ? { ...emptyState(), ...prev } : emptyState()
  const history = Array.isArray(base.history) ? base.history.slice() : []

  let changed = false
  let initialized = false
  let firstSeenAt = base.firstSeenAt
  let lastChangedAt = base.lastChangedAt
  let changeCount = Number.isFinite(base.changeCount) ? base.changeCount : 0

  if (!base.fingerprint) {
    // 首跑：建立基线，**不算一次变化**（没有 from 可写）。
    initialized = true
    firstSeenAt = at
  } else if (base.fingerprint !== fingerprint) {
    changed = true
    const lastEntry = history[history.length - 1]
    const alreadyToday = lastChangedAt && shanghaiDateKey(new Date(lastChangedAt)) === today
    // 每日一次：同一天内同一次变化不重复落历史（同一 to 值且当天已记过则跳过）。
    const duplicate = lastEntry && lastEntry.to === fingerprint && lastEntry.at === lastChangedAt
    if (!duplicate && !alreadyToday) {
      history.push({ at, from: base.fingerprint, to: fingerprint })
      while (history.length > HISTORY_LIMIT) history.shift()
      changeCount += 1
      lastChangedAt = at
    } else {
      // 指纹确实变了但当天已记过一次：仍更新内容，不再重复计数。
      lastChangedAt = lastChangedAt || at
    }
  }

  const next = {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: fetched.sourceUrl,
    fingerprint,
    etag: fetched.etag,
    lastModified: fetched.lastModified,
    firstSeenAt,
    lastCheckedAt: at, // 每次成功抓取都刷新
    lastChangedAt,
    changeCount,
    lastFetchedAt: at,
    history,
  }
  writeStateAtomic(next)

  return {
    ok: true,
    error: null,
    statePath,
    sourceUrl: next.sourceUrl,
    fingerprint: next.fingerprint,
    etag: next.etag,
    lastModified: next.lastModified,
    firstSeenAt: next.firstSeenAt,
    lastCheckedAt: next.lastCheckedAt,
    lastChangedAt: next.lastChangedAt,
    lastFetchedAt: next.lastFetchedAt,
    changeCount: next.changeCount,
    historyCount: next.history.length,
    changed,
    initialized,
    changedToday: Boolean(next.lastChangedAt && shanghaiDateKey(new Date(next.lastChangedAt)) === today),
  }
}
