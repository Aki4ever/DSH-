#!/usr/bin/env node
/**
 * ==============================================================================
 * 物理原子锁 · Node 侧薄封装  atomic_lock.mjs
 * ==============================================================================
 * 解决的问题（REQ-091 / R6 实测根因）：
 *   本工程早就有两套锁原语 —— `skills/acquire-atomic-lock/scripts/atomic_lock.py`（技能侧）
 *   与 `scripts/global_scheduler_lock.sh`（调度侧）—— 但**没有任何自动化脚本调用它们**。
 *   实测：`control_gates.sh` / `progress_ledger.mjs` / `fingerprint_audit.sh` /
 *   `pricing_fingerprint.mjs` 全部直接写文件，而它们写的还是**同一个状态目录**
 *   `~/.dsh/.dsh-control/`（看板快照、进度台账、定价指纹、插件状态、待办）。
 *   两个进程同时写 = 后写的把先写的吃掉 = 脏数据。
 *
 * 本模块只做一件小事：把"原子目录锁"包成 **Node 可直接 await 的三个函数**，
 * 让改造一条写路径只需加三行。刻意不做的事：
 *   · 不引入任何第三方依赖（只用 node:fs 的 mkdirSync —— POSIX 上目录创建是原子的）；
 *   · 不自己发明锁语义（口径对齐 skills/atomic-lock-policy：锁键 / 持有者 / 超时 / 陈旧回收 / 释放必达）；
 *   · 不静默失败（抢不到锁就抛错并带持有者信息，绝不"等一会儿偷偷过"）。
 *
 * 锁根：`<repo>/.dsh_locks/`（与 `global_scheduler_lock.sh` 同一个根，避免两套锁互相看不见）。
 * 每个锁 = 一个目录：`mkdir` 返回即拿到锁，抛 EEXIST 即锁被占。
 * 目录内 `metadata.json` 记录：锁键 / 持有者 / PID / 时间戳 / 用途。
 *
 * 用法：
 *   import { withLock, acquireLock, releaseLock, lockStatus } from './lib/atomic_lock.mjs'
 *   await withLock('state:pricing', async () => { ...写文件... }, { why: '定价指纹落盘' });
 *
 * 退出码（CLI 形态，供 shell 侧与压测调用）：
 *   0 成功 / 1 抢锁失败（他人持有）· 释放失败 / 2 用法错误
 * ==============================================================================
 */

import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, statSync, readdirSync, openSync, writeSync, closeSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hostname } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = join(HERE, '..', '..')
export const LOCK_ROOT = join(REPO_ROOT, '.dsh_locks')

/** 默认超时（毫秒）：等不到就抛错，绝不无限阻塞。 */
export const DEFAULT_TIMEOUT_MS = 10_000
/** 默认陈旧阈值（毫秒）：超过它且持有者进程已消失 → 判为残留锁，回收并留痕。 */
export const DEFAULT_STALE_MS = 180_000

/** 锁键 → 合法目录名。必须与 `scripts/lib/atomic_lock.sh` 的 atomic_lock_sanitize 逐字一致。
 *  冒号**保留**（它是合法目录字符，且是锁键的命名空间分隔符）；
 *  历史缺陷：Node 侧第一版把冒号洗成下划线，于是 `state:progress_ledger` 在 Bash 侧变成
 *  `state_progress_ledger`，两把锁互不可见 —— 等于没锁。已对齐并加了对拍自检。 */
export function sanitizeLockKey(key) {
  const s = String(key == null ? '' : key).trim()
  if (!s) throw new Error('锁键不能为空')
  return s.replace(/[^a-zA-Z0-9_:-]/g, '_')
}

/** 锁目录绝对路径。 */
export function lockDirFor(key) {
  return join(LOCK_ROOT, sanitizeLockKey(key))
}

/** 读锁元数据；目录不存在或无 metadata 时返回 null。 */
export function readLockMeta(key) {
  const dir = lockDirFor(key)
  const meta = join(dir, 'metadata.json')
  if (!existsSync(meta)) return null
  try {
    return JSON.parse(readFileSync(meta, 'utf8'))
  } catch {
    // 元数据坏了也不能让调用方崩：当成"未知持有者"，交给陈旧回收处理
    return { key, holder: 'unknown', reason: 'metadata 不可解析' }
  }
}

/**
 * 进程是否还活着。用于陈旧锁判定。
 * 只信任"信号 0 能送达"这一件事；权限不足（EPERM）视为活着（保守，宁可不回收）。
 */
function isProcessAlive(pid) {
  const n = Number(pid)
  if (!Number.isInteger(n) || n <= 0) return false
  try {
    process.kill(n, 0)
    return true
  } catch (err) {
    return err && err.code === 'EPERM'
  }
}

/**
 * 尝试获取锁（**非阻塞**）。
 * @param {string} key 锁键，例如 `state:pricing_fingerprint`
 * @param {{why?:string, holder?:string, ttlMs?:number, staleMs?:number, now?:number}} [opts]
 * @returns {{acquired:boolean, token?:string, holder?:string, reason?:string, reclaimed?:object|null}}
 */
export function acquireLock(key, opts = {}) {
  const dir = lockDirFor(key)
  const now = Number.isFinite(opts.now) ? opts.now : Date.now()
  const holder = opts.holder || `pid:${process.pid}@${hostname()}`
  const ttlMs = Number.isFinite(opts.ttlMs) && opts.ttlMs > 0 ? opts.ttlMs : DEFAULT_STALE_MS
  const staleMs = Number.isFinite(opts.staleMs) && opts.staleMs > 0 ? opts.staleMs : ttlMs
  mkdirSync(LOCK_ROOT, { recursive: true })
  mkdirSync(dir, { recursive: true }) // 外层目录只是容器，**不承担互斥语义**

  let reclaimed = null
  const token = `${process.pid}-${now}-${Math.random().toString(36).slice(2, 8)}`
  const metaPath = join(dir, 'metadata.json')
  const meta = { key: sanitizeLockKey(key), holder, pid: process.pid, at: new Date(now).toISOString(), why: opts.why || '', token }

  /**
   * 抢锁 = 用 `wx` 原子创建 metadata.json。
   * 为什么不用 `mkdir` 当锁、metadata 事后写（这是第一版的真缺陷，实测丢 2 条）：
   *   mkdir 成功与 metadata 落盘之间有**竞态窗口**；此时对手读到"目录在、metadata 无"，
   *   会把 age 算成 +∞ → 判为残留 → 把**活人正在用的锁**删掉 → 两人同时进临界区。
   *   改成"谁原子创建了 metadata 文件谁持有"，就不存在"持有者身份未知"的窗口了。
   */
  const tryClaim = () => {
    try {
      // 先 open('wx') 抢到文件，再一次性写入完整内容。
      // 为什么不是 open 后再分多次 write：分次写会留下"文件已存在但内容不全"的窗口，
      // 对手读到一个残缺 metadata 就会把它当成陌生锁 —— 互斥仍然成立，但诊断信息会失真。
      const payload = `${JSON.stringify(meta, null, 2)}\n`
      const fd = openSync(metaPath, 'wx')
      try { writeSync(fd, payload) } finally { closeSync(fd) }
      return true
    } catch (err) {
      if (err && err.code === 'EEXIST') return false
      throw err
    }
  }

  if (!tryClaim()) {
    // 锁被占：先判它是不是"死人留下的残留锁"，是就回收（但要留痕，不静默）
    const prev = readLockMeta(key)
    const age = prev && prev.at ? now - Date.parse(prev.at) : Number.POSITIVE_INFINITY
    const ownerPid = prev && typeof prev.pid === 'number' ? prev.pid : null
    const ownerAlive = ownerPid ? isProcessAlive(ownerPid) : false
    const expired = Number.isFinite(age) && age >= staleMs
    // 关键：metadata 读不到时**不回收**（可能是对手刚创建、我抢在写盘前读到），
    // 一律当作"活的陌生人"，等下一次轮询 —— 宁可多等，不可误删别人的锁。
    //
    // 回收条件 = **持有者确实死了** 且 **已过陈旧阈值**（两个都要，不能只要一个）。
    // 为什么不是"或"（本实现第三版踩的坑）：
    //   "只要持有者死了就立刻回收"会产生**假击穿**——进程 A 释放锁（删 metadata）之后、
    //   下一次 acquire 之前，有极短的一瞬它是"活进程但没举牌"。对手此时读到 A 上一轮的
    //   残留 metadata → 判 A 已死 → 立刻回收 → 两个进程同时进临界区（实测击穿 1 次）。
    //   加上"必须真的超时"这一条，就把这个窗口彻底关掉：宁可多等一个 TTL，也不误收。
    const reclaimable = prev !== null && expired && !ownerAlive
    if (reclaimable) {
      reclaimed = { holder: prev.holder, pid: ownerPid, ageMs: Number.isFinite(age) ? age : null, why: expired ? 'ttl 超时' : '持有者进程已不存在' }
      try { rmSync(metaPath, { force: true }) } catch { /* 竞态：对手可能同时也回收了 */ }
      if (!tryClaim()) {
        return { acquired: false, holder: prev.holder, reason: '回收后仍被他人抢先获取', reclaimed }
      }
    } else {
      return {
        acquired: false,
        holder: prev ? prev.holder : 'unknown',
        reason: `锁已被持有（${prev && prev.holder ? prev.holder : '刚被他人抢占'}${prev && prev.why ? ' · ' + prev.why : ''}）`,
        reclaimed: null,
      }
    }
  }

  return { acquired: true, token, holder, reclaimed }
}

/**
 * 释放锁（**释放必达**）。
 * 为什么按 token 校验：防止"我的锁已被陈旧回收、别人拿到手，我再去删"把别人的锁删掉。
 * @returns {{released:boolean, reason?:string}}
 */
export function releaseLock(key, token) {
  const dir = lockDirFor(key)
  const metaPath = join(dir, 'metadata.json')
  if (!existsSync(metaPath)) return { released: true, reason: '锁本就不存在（幂等释放）' }
  const meta = readLockMeta(key)
  if (token && meta && meta.token && meta.token !== token) {
    return { released: false, reason: `锁已易主（当前 token ${meta.token}），拒绝删除他人锁` }
  }
  try {
    rmSync(metaPath, { force: true })
    // ⚠️ 刻意**不删外层目录**（第二版把目录一起删了，实测丢 1 条）：
    //   对手此刻可能正拿着 readdir 拿到的名字准备 open(metaPath,'wx')；
    //   我方把目录删掉，它的 open 就因**父目录不存在**失败（ENOENT/EINVAL），
    //   这条 +1 就**直接丢了**，而不是被挡住重试。
    //   目录本身不承担互斥语义、只是容器，留着零成本（空目录）。清理见 lockStatus/--clean。
    return { released: true }
  } catch (err) {
    return { released: false, reason: err && err.message ? err.message : String(err) }
  }
}

/**
 * 等待式获取（带超时）。抢不到时**抛错**，不返回 null —— 让调用方必须显式处理。
 */
export async function acquireLockWait(key, opts = {}) {
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : DEFAULT_TIMEOUT_MS
  const intervalMs = 50
  const deadline = Date.now() + Math.max(0, timeoutMs)
  let last = null
  for (;;) {
    last = acquireLock(key, { ...opts, now: undefined })
    if (last.acquired) return last
    if (Date.now() >= deadline) {
      const err = new Error(`获取锁失败（${sanitizeLockKey(key)}）：${last.reason || '未知原因'}（已等待 ${timeoutMs}ms）`)
      err.code = 'ELOCKTIMEOUT'
      throw err
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
}

/**
 * 临界区包装：拿到锁 → 跑 fn → **无论成败都释放**。
 * 这是本模块的主入口 —— 写路径改造只需包一层。
 * @template T
 * @param {string} key
 * @param {() => (T|Promise<T>)} fn
 * @param {{why?:string, timeoutMs?:number, ttlMs?:number}} [opts]
 * @returns {Promise<T>}
 */
export async function withLock(key, fn, opts = {}) {
  const got = await acquireLockWait(key, opts)
  try {
    return await fn()
  } finally {
    const rel = releaseLock(key, got.token)
    if (!rel.released) {
      // 释放失败必须可见：否则锁会残留，下一次调用会莫名超时
      console.error(`⚠️ 原子锁释放未达：${sanitizeLockKey(key)} · ${rel.reason}`)
    }
  }
}

/** 同步版临界区（用于无法 await 的纯同步写路径）。 */
export function withLockSync(key, fn, opts = {}) {
  const got = acquireLock(key, opts)
  if (!got.acquired) {
    const err = new Error(`获取锁失败（${sanitizeLockKey(key)}）：${got.reason || '未知原因'}`)
    err.code = 'ELOCKBUSY'
    throw err
  }
  try {
    return fn()
  } finally {
    releaseLock(key, got.token)
  }
}

/** 当前锁状态总览（供审计脚本与人工排查）。 */
export function lockStatus() {
  const out = { root: LOCK_ROOT, exists: existsSync(LOCK_ROOT), locks: [] }
  if (!out.exists) return out
  try {
    for (const name of readdirSync(LOCK_ROOT)) {
      const dir = join(LOCK_ROOT, name)
      let isDir = false
      try { isDir = statSync(dir).isDirectory() } catch { isDir = false }
      if (!isDir) continue
      const meta = readLockMeta(name)
      out.locks.push({ dir: name, meta, ageMs: meta && meta.at ? Date.now() - Date.parse(meta.at) : null })
    }
  } catch { /* 读不到就当空 */ }
  return out
}

// ── CLI 形态（供 shell 侧与压测脚本调用） ────────────────────────────────────
export async function cliMain(argv) {
  const [cmd, key, ...rest] = argv
  const pick = (name) => {
    const i = rest.indexOf(name)
    return i >= 0 ? rest[i + 1] : undefined
  }
  if (cmd === 'acquire') {
    if (!key) { console.error('用法：atomic_lock.mjs acquire <锁键> [--why 说明]'); return 2 }
    const got = acquireLock(key, { why: pick('--why') || '' })
    console.log(JSON.stringify(got))
    return got.acquired ? 0 : 1
  }
  if (cmd === 'release') {
    if (!key) { console.error('用法：atomic_lock.mjs release <锁键> [--token t]'); return 2 }
    const rel = releaseLock(key, pick('--token'))
    console.log(JSON.stringify(rel))
    return rel.released ? 0 : 1
  }
  if (cmd === 'status') {
    console.log(JSON.stringify(lockStatus(), null, 2))
    return 0
  }
  console.error('用法：atomic_lock.mjs <acquire|release|status> [锁键] [--why 说明] [--token t]')
  return 2
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isDirectRun) {
  const code = await cliMain(process.argv.slice(2))
  process.exit(code)
}
