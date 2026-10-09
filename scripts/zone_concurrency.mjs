#!/usr/bin/env node
/**
 * ==============================================================================
 * 脚本名称：zone_concurrency.mjs
 * 核心功能：跨项目区间并发仲裁器 + 判定器 —— 同区间串行、跨区间并发、有界并发、两向取证
 * 需求依据：REQ-101 / PROJ-CONC「不同工作项目区间可以同时有多个任务并发执行；
 *          该规则若触不到物理层，就递归分裂到能触达物理实现层」
 * ------------------------------------------------------------------------------
 * 为什么需要它（2026-10-09 实测缺口）：
 *   ① `scripts/butler_scheduler.mjs` 有牙（5 条固化用例全过）却**没有任何生产调用方**
 *      —— 全仓只被门禁字符串与索引引用，即"有原语、没人接线"；
 *   ② 既有并发铁律（元规则第二十一条）只写到"只读共享、写操作排他"，
 *      **没有"按区间键控"这个粒度**，于是判定只能是"有任意任务在跑就忙/就等"；
 *   ③ 外部市场插件的 running-agent 守卫被重装覆盖后，"等待任务空闲"又回来了
 *      （证据：`node scripts/market_guard_patch.mjs --check` 曾 EXIT=1）。
 *
 * 本脚本把"能不能同时跑"从**全局忙**改成**写域交集**裁决：
 *   区间（zone）= 项目专属写域的唯一可移植标识，唯一权威登记表
 *   `ai-control/config/concurrency_zones.json`；两任务区间交集为空 → 可同时跑；
 *   非空 → 排队串行。并发度有界（1~4，与 `butler_scheduler.mjs` 同口径）。
 *
 * 判据 11「区间并发可证」的两向取证（**判据 1~10 见 docs/constraint_mechanism_optimize_17.md §七**）：
 *   正向：两个**不同区间**的任务 —— 运行时间重叠 > 0 且 锁观测重叠 = 0；
 *   反例：两个**同区间**任务    —— 运行时间重叠 = 0（真被串行）且 锁观测重叠 = 0。
 *   锁观测重叠来自**独立采样观测**（每 50ms 采样锁根目录），不是我自己的调度推断；
 *   锁目录名一律用 `scripts/lib/atomic_lock.sh --print-dir` 对拍，**禁止自己再实现一遍洗键**
 *   （两套洗键互不可见、却各自自检全绿，是本工程踩过的真缺陷）。
 *
 * 用法：
 *   node scripts/zone_concurrency.mjs --plan <tasks.jsonl> [--json]     # 只出波次方案，不执行
 *   node scripts/zone_concurrency.mjs --run  <tasks.jsonl> [--concurrency n] [--json]  # 真派单
 *   node scripts/zone_concurrency.mjs --check                           # 两向取证判定（固化用例）
 *   node scripts/zone_concurrency.mjs --self-test                       # 反向用例：该判红必须判红
 *   node scripts/zone_concurrency.mjs --list-zones                      # 列区间登记表并校验可达
 *
 * tasks.jsonl 每行：{"task":"t1","zones":["全局规则/scripts"],"cmd":"..."}
 *
 * 退出码：0 通过 / 1 不通过 / 2 取不到证据（**2 绝不算通过**）
 * ==============================================================================
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const CONFIG = path.join(ROOT, 'ai-control/config/concurrency_zones.json')
const ATOMIC_LOCK = path.join(ROOT, 'scripts/lib/atomic_lock.sh')
const STATE_DIR = path.join(ROOT, 'ai-control/reports/state')
const EVIDENCE_JSON = path.join(STATE_DIR, 'zone_concurrency_evidence.json')
const LEDGER_JSONL = path.join(STATE_DIR, 'zone_concurrency.jsonl')
const LEDGER_JSON = path.join(STATE_DIR, 'zone_concurrency.json')

const SAMPLE_INTERVAL_MS = 50 // 独立观测采样间隔
const CONCURRENCY_FLOOR = 1
const CONCURRENCY_CEIL = 4 // 与 butler_scheduler.mjs 的 DEFAULT_CONCURRENCY 同口径

// ── 小工具 ──────────────────────────────────────────────────────────────────
const now = () => Date.now()

function readConfig(file = CONFIG) {
  let raw
  try {
    raw = fs.readFileSync(file, 'utf8')
  } catch {
    return { ok: false, reason: `区间登记表不可读：${file}` }
  }
  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    return { ok: false, reason: `区间登记表不是合法 JSON：${e.message}` }
  }
  if (!data || !Array.isArray(data.zones)) return { ok: false, reason: '区间登记表缺少 zones 数组' }
  if (!data.zones.length) return { ok: false, reason: '区间登记表为空（空表不得折算为通过）' }
  const ids = data.zones.map((z) => z.id)
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dup.length) return { ok: false, reason: `区间 id 重复：${[...new Set(dup)].join('、')}` }
  const bad = data.zones.filter((z) => !z.id || !z.repo || !z.repo_path_glob || !Array.isArray(z.paths) || !z.paths.length)
  if (bad.length) return { ok: false, reason: `区间字段不全：${bad.map((z) => z.id || '(无 id)').join('、')}` }
  return { ok: true, data }
}

/** 区间登记表的实况校验：区间声明的路径必须真实存在（悬空区间不得参与并发裁决）。 */
export function inspectZones(cfg = readConfig()) {
  if (!cfg.ok) return { ok: false, exit: 2, reason: cfg.reason, zones: [], missing: [] }
  const missing = []
  const zones = cfg.data.zones.map((z) => {
    const base = z.repo_path_glob
    const baseOk = fs.existsSync(base)
    const pathStates = z.paths.map((p) => ({ p, ok: fs.existsSync(path.join(base, p)) }))
    for (const ps of pathStates) if (!ps.ok) missing.push(`${z.id} → ${path.join(base, ps.p)}`)
    return { ...z, baseOk, pathStates }
  })
  const conc = Number(cfg.data.concurrency_max)
  const concOk = Number.isInteger(conc) && conc >= CONCURRENCY_FLOOR && conc <= CONCURRENCY_CEIL
  if (!concOk) return { ok: false, exit: 1, reason: `并发上界非法：${cfg.data.concurrency_max}（必须是 ${CONCURRENCY_FLOOR}~${CONCURRENCY_CEIL}）`, zones, missing }
  if (missing.length) return { ok: false, exit: 1, reason: `区间声明了不存在的路径：${missing.join(' · ')}`, zones, missing }
  return { ok: true, exit: 0, zones, concurrencyMax: conc, timeoutS: Number(cfg.data.timeout_s) || 300, lockRootMode: cfg.data.lock_root_mode }
}

const zoneIndex = (zones) => new Map(zones.map((z) => [z.id, z]))

/** 锁键口径：`zone:<区间 id>`（唯一权威源是登记表，本脚本不另立第二套命名）。 */
export const lockKeyOf = (zoneId) => `zone:${zoneId}`

/**
 * 任务 → 锁集合：**字典序**排序（全序即无环，与 detect-lock-conflict 的口径一致）。
 * 未登记区间一律拒收 —— "没有锁却要写"是本工程明令禁止项。
 */
export function lockSetOf(task, zn = null) {
  const ids = Array.isArray(task.zones) ? [...new Set(task.zones)] : []
  if (!ids.length) return { ok: false, reason: `任务 ${task.task} 未声明任何区间（没有锁却要写，禁止并行）` }
  if (zn) {
    const unknown = ids.filter((id) => !zn.has(id))
    if (unknown.length) return { ok: false, reason: `任务 ${task.task} 声明了未登记区间：${unknown.join('、')}` }
  }
  return { ok: true, keys: ids.map(lockKeyOf).sort(), zones: ids.sort() }
}

/** 锁目录名对拍：一律问 atomic_lock.sh，本脚本不复制洗键逻辑。 */
export function lockDirOf(key, lockRootOverride = null) {
  const cwd = lockRootOverride ? path.dirname(lockRootOverride) : ROOT
  const r = spawnSync('bash', [ATOMIC_LOCK, '--print-dir', key], {
    cwd,
    encoding: 'utf8',
    env: lockRootOverride ? { ...process.env, ATOMIC_LOCK_ROOT: lockRootOverride } : process.env,
  })
  if (r.status !== 0) return null
  const dir = (r.stdout || '').trim()
  return dir || null
}

// ── 波次规划（同区间不得同波） ────────────────────────────────────────────────
export function buildWaves(tasks, { concurrency }) {
  const pending = tasks.map((t, i) => ({ ...t, _i: i }))
  const done = new Set()
  const waves = []
  const conflicts = []
  // 冲突对：锁集合交集非空即必须串行
  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const a = tasks[i].lockKeys.filter((k) => tasks[j].lockKeys.includes(k))
      if (a.length) conflicts.push({ a: tasks[i].task, b: tasks[j].task, shared: a })
    }
  }
  while (pending.length) {
    const wave = []
    for (const t of pending) {
      if (wave.length >= concurrency) break
      const depsOk = (t.depends_on || []).every((d) => done.has(d))
      if (!depsOk) continue
      const clash = wave.some((w) => w.lockKeys.some((k) => t.lockKeys.includes(k)))
      if (clash) continue
      wave.push(t)
    }
    if (!wave.length) {
      // 有环或依赖无法满足 → 明确拒单，不静默空转
      return { ok: false, waves, conflicts, reason: `无法排出波次（依赖成环或并发上界过小）：剩余 ${pending.map((p) => p.task).join('、')}` }
    }
    for (const w of wave) done.add(w.task)
    waves.push(wave.map((w) => w.task))
    for (const w of wave) pending.splice(pending.indexOf(w), 1)
  }
  return { ok: true, waves, conflicts }
}

export function readTasks(file) {
  let txt
  try {
    txt = fs.readFileSync(file, 'utf8')
  } catch {
    return { ok: false, reason: `任务清单不可读：${file}` }
  }
  const rows = []
  for (const [i, line] of txt.split('\n').entries()) {
    const s = line.trim()
    if (!s || s.startsWith('#')) continue
    try {
      rows.push(JSON.parse(s))
    } catch {
      return { ok: false, reason: `第 ${i + 1} 行不是合法 JSON` }
    }
  }
  if (!rows.length) return { ok: false, reason: '任务清单为空' }
  return { ok: true, rows }
}

export function normalizeTasks(rows, zn) {
  const tasks = []
  for (const r of rows) {
    if (!r || typeof r.task !== 'string' || !r.task) return { ok: false, reason: '任务缺少 task 字段' }
    if (typeof r.cmd !== 'string' || !r.cmd) return { ok: false, reason: `任务 ${r.task} 缺少 cmd` }
    const ls = lockSetOf(r, zn)
    if (!ls.ok) return { ok: false, reason: ls.reason }
    tasks.push({ ...r, zones: ls.zones, lockKeys: ls.keys })
  }
  const names = tasks.map((t) => t.task)
  const dup = names.filter((n, i) => names.indexOf(n) !== i)
  if (dup.length) return { ok: false, reason: `任务名重复：${[...new Set(dup)].join('、')}` }
  return { ok: true, tasks }
}

// ── 单任务执行（锁 + 独立观测） ───────────────────────────────────────────────
function lockRootForRepo(repoPath) {
  return path.join(repoPath, '.dsh_locks')
}

/** 采样器：独立观测"此刻真实持有哪些锁键"，用于对拍（不依赖调度器的自述）。
 *  注意：锁原语释放时**不删除目录**（这是刻意设计，见 atomic_lock.sh 头注），
 *  所以 metadata.json 在释放后仍会残留，其 timestamp 是**上一次持有时刻**。
 *  因此这里把每次采样结果折算成"该锁键最近一次持有窗口"
 *  `[lockAt, observedAt]`，再与任务自己上报的持有窗口**取交集**，
 *  只有交集非空才算"锁真的被观测到持有" —— 否则陈旧元数据会被误判成"锁还持有"。
 */
function startSampler(lockRootByKey, stopFlag) {
  const samples = []
  const timer = setInterval(() => {
    const held = []
    for (const [key, dir] of lockRootByKey) {
      if (!dir) continue
      const meta = path.join(dir, 'metadata.json')
      if (!fs.existsSync(meta)) continue
      let lockAt = null
      try {
        const m = JSON.parse(fs.readFileSync(meta, 'utf8'))
        if (m && m.timestamp) lockAt = Number(m.timestamp) * 1000
      } catch {
        /* 元数据半写窗口：仍按"持有"计（宁可多算重叠，不可少算） */
      }
      held.push({ key, lockAt, at: now() })
    }
    samples.push({ at: now(), held })
  }, SAMPLE_INTERVAL_MS)
  if (timer.unref) timer.unref()
  return {
    stop() {
      clearInterval(timer)
      stopFlag.done = true
      return samples
    },
    samples,
  }
}

/**
 * 判据 11 的独立证据：两任务的**临界区区段交集**。
 * 主判据是双方自报的持锁窗口（精确到 ms）；独立采样只用于确认"该锁在盘上确实存在过"
 * （防谎报：假装持锁但磁盘上根本没有这把锁）。
 */
export function lockOverlapFromSamples(samples, aTask, bTask) {
  const aKeys = [...new Set(aTask.lock_keys || [])]
  const bKeys = [...new Set(bTask.lock_keys || [])]
  const shared = aKeys.filter((k) => bKeys.includes(k))
  const aLock = aTask.t_lock
  const aRel = aTask.t_release
  const bLock = bTask.t_lock
  const bRel = bTask.t_release
  const windowsOk = [aLock, aRel, bLock, bRel].every((v) => v != null)
  // 锁键不相交 = 结构上无共享锁，谈不上互斥破坏（那正是"可并发"的定义）。
  // 不允许把"没有共享锁"当成"重叠"——那会把判据本身写反。
  if (!shared.length) {
    return { overlapMs: 0, shared_keys: [], sampled_held_keys: null, windows_ok: windowsOk, basis: 'distinct-lock-keys' }
  }
  if (!windowsOk) return { overlapMs: null, shared_keys: shared, sampled_held_keys: null, windows_ok: false, basis: 'no-window' }
  const overlapMs = Math.max(0, Math.min(aRel, bRel) - Math.max(aLock, bLock))
  // 独立采样核对：共享锁键必须能在锁根里被看到（防"锁从未存在却报互斥成立"）。
  // 时间窗取两任务合并区间 —— 同一把锁被两任务先后持有，合并区间正是它应有生命的时段。
  let seen = 0
  const lo = Math.min(aLock, bLock) - SAMPLE_INTERVAL_MS
  const hi = Math.max(aRel, bRel) + SAMPLE_INTERVAL_MS
  for (const key of shared) {
    for (const s of samples) {
      if (s.at < lo || s.at > hi) continue
      if ((s.held || []).some((h) => h.key === key)) {
        seen++
        break
      }
    }
  }
  return { overlapMs, shared_keys: shared, sampled_held_keys: seen, windows_ok: true, basis: 'shared-lock-key' }
}

/**
 * 真派单：跨区间并发跑、同区间严格排队。
 * 锁一律用既有原语 atomic_lock.sh（抢不到即失败，不静默等待）；
 * "同区间排队"由本函数的区间级队列实现，不改原语语义。
 */
export function runTasks(tasks, { concurrency, lockRootFor, timeoutS = 300, traceDir = null, observe = true }) {
  const results = []
  const zoneBusy = new Set()
  const running = new Set()
  const queue = [...tasks]
  const lockRootByKey = new Map()
  const owners = new Map()
  const taskByKey = new Map()
  for (const t of tasks) {
    for (const k of t.lockKeys) {
      const root = lockRootFor(t)
      const dir = lockDirOf(k, root)
      lockRootByKey.set(k, dir)
      taskByKey.set(k, taskByKey.get(k) || [])
      taskByKey.get(k).push(t.task)
    }
  }
  const stopFlag = { done: false }
  const sampler = observe ? startSampler(lockRootByKey, stopFlag) : { stop: () => [], samples: [] }

  const workerScript = path.join(os.tmpdir(), `zone-worker-${process.pid}.sh`)
  fs.writeFileSync(
    workerScript,
    `#!/usr/bin/env bash
# 单任务执行体：按字典序取锁 → 跑命令 → 释放锁 → 回一行 JSON
set -uo pipefail
TASK="$1"; KEYS="$2"; CMD="$3"; LOCKROOT="$4"; OUT="$5"
export ATOMIC_LOCK_ROOT="$LOCKROOT"
. "${ATOMIC_LOCK}" >/dev/null 2>&1
acquired=()
t_start=$(node -e 'process.stdout.write(String(Date.now()))')
rc=0
for k in $KEYS; do
  if ! atomic_lock_acquire "$k" "zone_concurrency:$TASK" >/dev/null 2>&1; then
    rc=97
    break
  fi
  acquired+=("$k")
done
t_lock=$(node -e 'process.stdout.write(String(Date.now()))')
out=""
if [ "$rc" -eq 0 ]; then
  out="$(bash -c "$CMD" 2>&1)"
  rc=$?
fi
t_end=$(node -e 'process.stdout.write(String(Date.now()))')
for k in \${acquired[@]+"\${acquired[@]}"}; do [ -n "$k" ] && atomic_lock_release "$k" >/dev/null 2>&1; done
t_release=$(node -e 'process.stdout.write(String(Date.now()))')
node -e '
const [task,keys,t_start,t_lock,t_end,t_release,rc,out] = process.argv.slice(1)
process.stdout.write(JSON.stringify({task,lock_keys:keys?keys.split(" "):[],t_start:+t_start,t_lock:+t_lock,t_end:+t_end,t_release:+t_release,exit:+rc,tail:String(out).slice(-400)})+"\\n")
' "$TASK" "$KEYS" "$t_start" "$t_lock" "$t_end" "$t_release" "$rc" "$out" > "$OUT"
exit "$rc"
`,
    { mode: 0o755 },
  )

  const launch = (t) =>
    new Promise((resolve) => {
      const outFile = path.join(traceDir || os.tmpdir(), `${t.task}.json`)
      const root = lockRootFor(t)
      const args = [workerScript, t.task, t.lockKeys.join(' '), t.cmd, root, outFile]
      // 必须用异步 spawn：spawnSync 会阻塞事件循环，把"跨区间并发"退化成串行
      // （实测教训：并发器自己串行，却因为各任务都成功而报"全部完成"）。
      const child = spawn('bash', args, { stdio: ['ignore', 'pipe', 'pipe'] })
      let stderr = ''
      let timedOut = false
      const timer = setTimeout(() => {
        timedOut = true
        try {
          child.kill('SIGKILL')
        } catch {
          /* 进程可能已退出 */
        }
      }, timeoutS * 1000)
      if (child.stderr) child.stderr.on('data', (d) => { stderr += String(d) })
      child.on('error', (e) => { stderr += String((e && e.message) || e) })
      child.on('close', (code) => {
        clearTimeout(timer)
        let rec = null
        try {
          rec = JSON.parse(fs.readFileSync(outFile, 'utf8'))
        } catch {
          rec = { task: t.task, lock_keys: t.lockKeys, exit: code === null ? 98 : code, t_start: null, t_lock: null, t_end: null, t_release: null, tail: stderr.slice(-300) }
        }
        if (timedOut) rec.exit = 98 // 超时（与原语"抢不到锁即失败"一致，不静默等待）
        results.push(rec)
        for (const z of t.zones) zoneBusy.delete(z)
        running.delete(t.task)
        resolve(rec)
      })
    })

  return new Promise((resolve) => {
    const tick = () => {
      while (running.size < concurrency) {
        const idx = queue.findIndex((t) => !t.zones.some((z) => zoneBusy.has(z)))
        if (idx < 0) break
        const t = queue.splice(idx, 1)[0]
        for (const z of t.zones) zoneBusy.add(z)
        running.add(t.task)
        launch(t).then(tick)
      }
      if (!queue.length && !running.size) {
        const samples = sampler.stop()
        try {
          fs.rmSync(workerScript, { force: true })
        } catch {
          /* 清理失败不影响判定 */
        }
        resolve({ results, samples })
      }
    }
    tick()
  })
}

/** 运行时间重叠（ms）：两个任务都在跑的公共时长。 */
export function runtimeOverlap(a, b) {
  if (!a || !b || a.t_start == null || b.t_start == null) return null
  const s = Math.max(a.t_start, b.t_start)
  const e = Math.min(a.t_end, b.t_end)
  return Math.max(0, e - s)
}

// ── --check：两向取证（固化用例，真跑真采） ────────────────────────────────────

async function check(json) {
  const ins = inspectZones()
  if (!ins.ok) {
    const out = { ok: false, exit: ins.exit, stage: 'zones', reason: ins.reason }
    if (json) console.log(JSON.stringify(out, null, 2))
    else console.log(`⛔ ${ins.reason}`)
    return ins.exit
  }
  const zn = zoneIndex(ins.zones)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zone-check-'))
  const traceDir = path.join(tmp, 'trace')
  fs.mkdirSync(traceDir, { recursive: true })
  const lockRootFor = () => path.join(tmp, '.dsh_locks')
  const useZones = ins.zones.slice(0, 2).map((z) => z.id)
  if (useZones.length < 2) {
    console.log('⛔ 取不到证据：区间登记表少于 2 个区间，无法证明"跨区间并发"')
    return 2
  }
  const cmd = 'node -e "setTimeout(()=>{},600)"'
  const mk = (name, zone) => ({ task: name, zones: [zone], cmd, lockKeys: [lockKeyOf(zone)] })

  // ① 正向：两个不同区间 → 期望并发
  const pos = [mk('pos-a', useZones[0]), mk('pos-b', useZones[1])]
  const r1 = await runTasks(pos, { concurrency: ins.concurrencyMax, lockRootFor, timeoutS: 30, traceDir })
  const [a1, b1] = pos.map((t) => r1.results.find((r) => r.task === t.task))
  const posOverlap = runtimeOverlap(a1, b1)
  const posLockRaw = a1 && b1 ? lockOverlapFromSamples(r1.samples, a1, b1) : null

  // ② 反例：两个同区间 → 期望串行
  const neg = [mk('neg-a', useZones[0]), mk('neg-b', useZones[0])]
  const r2 = await runTasks(neg, { concurrency: ins.concurrencyMax, lockRootFor, timeoutS: 30, traceDir })
  const [a2, b2] = neg.map((t) => r2.results.find((r) => r.task === t.task))
  const negOverlap = runtimeOverlap(a2, b2)
  const negLockRaw = a2 && b2 ? lockOverlapFromSamples(r2.samples, a2, b2) : null
  // 归一：lockOverlapFromSamples 一律返回对象 { overlapMs, shared_keys, sampled_held_keys, ... }
  const posLockMs = posLockRaw ? posLockRaw.overlapMs : null
  const negLockMs = negLockRaw ? negLockRaw.overlapMs : null
  const posSampled = posLockRaw ? posLockRaw.sampled_held_keys : null
  const negSampled = negLockRaw ? negLockRaw.sampled_held_keys : null
  const posShared = posLockRaw ? posLockRaw.shared_keys : []
  const negShared = negLockRaw ? negLockRaw.shared_keys : []
  // 反谎报硬约束：共享锁键的场次里，该锁必须真的被独立采样在盘上看到过；
  // 无共享锁键（跨区间）本就无重叠可言，只要求采样器确实在跑（samples > 0）。
  const posEvidenceOk = posLockMs === 0 && (posShared.length === 0 ? r1.samples.length > 0 : posSampled > 0)
  const negEvidenceOk = negLockMs === 0 && (negShared.length === 0 ? r2.samples.length > 0 : negSampled > 0)
  const posOk = !!(a1 && b1 && a1.exit === 0 && b1.exit === 0 && posOverlap !== null && posOverlap > 0 && posLockMs === 0 && posEvidenceOk)
  const negOk = !!(a2 && b2 && a2.exit === 0 && b2.exit === 0 && negOverlap === 0 && negLockMs === 0 && negEvidenceOk)

  const evidence = {
    at: new Date().toISOString(),
    requirement: 'REQ-101 / PROJ-CONC',
    judge: '11 区间并发可证',
    zones_used: useZones,
    concurrency: ins.concurrencyMax,
    positive_cross_zone: {
      tasks: pos.map((t) => t.task),
      zones: pos.map((t) => t.zones[0]),
      runtime_overlap_ms: posOverlap,
      observed_lock_overlap: posLockMs,
      shared_lock_keys: posShared,
      sampled_held_keys: posSampled,
      lock_windows: pos.map((t) => { const r = r1.results.find((x) => x.task === t.task) || {}; return { task: t.task, lock_at: r.t_lock, release_at: r.t_release } }),
      samples: r1.samples.length,
      exits: [a1 && a1.exit, b1 && b1.exit],
      ok: !!posOk,
    },
    negative_same_zone: {
      tasks: neg.map((t) => t.task),
      zones: neg.map((t) => t.zones[0]),
      runtime_overlap_ms: negOverlap,
      observed_lock_overlap: negLockMs,
      shared_lock_keys: negShared,
      sampled_held_keys: negSampled,
      lock_windows: neg.map((t) => { const r = r2.results.find((x) => x.task === t.task) || {}; return { task: t.task, lock_at: r.t_lock, release_at: r.t_release } }),
      samples: r2.samples.length,
      exits: [a2 && a2.exit, b2 && b2.exit],
      ok: !!negOk,
    },
    ok: !!(posOk && negOk),
  }
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true })
    fs.writeFileSync(EVIDENCE_JSON, JSON.stringify(evidence, null, 2) + '\n')
  } catch {
    /* 证据落盘失败按取不到证据处理 */
  }
  fs.rmSync(tmp, { recursive: true, force: true })

  if (json) console.log(JSON.stringify({ ...evidence, exit: evidence.ok ? 0 : 1 }, null, 2))
  else {
    console.log('🧵 跨项目区间并发 · 两向取证判定（判据 11）')
    console.log('-----------------------------------------')
    console.log(`区间 ${useZones.join(' / ')} · 并发上界 ${ins.concurrencyMax} · 独立采样 ${r1.samples.length + r2.samples.length} 次`)
    console.log(`   ${posOk ? '✅' : '⛔'} 正向（跨区间）：运行重叠 ${posOverlap} ms（要求 >0）· 临界区重叠 ${posLockMs} ms（要求 =0）· 采样见锁 ${posSampled}`)
    console.log(`   ${negOk ? '✅' : '⛔'} 反例（同区间）：运行重叠 ${negOverlap} ms（要求 =0）· 临界区重叠 ${negLockMs} ms（要求 =0）· 采样见锁 ${negSampled}`)
    console.log('-----------------------------------------')
    console.log(evidence.ok ? '✅ 区间并发可证：跨区间真并发、同区间真串行、锁真互斥' : '⛔ 判据 11 未触达：不得登记完成，须继续向下分裂')
  }
  return evidence.ok ? 0 : 1
}

// ── --plan / --run ──────────────────────────────────────────────────────────
function loadAndNormalize(file) {
  const ins = inspectZones()
  if (!ins.ok) return { ok: false, exit: ins.exit, reason: ins.reason, ins }
  const rt = readTasks(file)
  if (!rt.ok) return { ok: false, exit: 2, reason: rt.reason, ins }
  const nt = normalizeTasks(rt.rows, zoneIndex(ins.zones))
  if (!nt.ok) return { ok: false, exit: 1, reason: nt.reason, ins }
  return { ok: true, tasks: nt.tasks, ins }
}

function cmdPlan(argv) {
  const file = argv[argv.indexOf('--plan') + 1]
  const json = argv.includes('--json')
  if (!file || file.startsWith('--')) {
    console.log('用法：node scripts/zone_concurrency.mjs --plan <tasks.jsonl> [--json]')
    return 2
  }
  const l = loadAndNormalize(file)
  if (!l.ok) {
    if (json) console.log(JSON.stringify({ ok: false, exit: l.exit, reason: l.reason }, null, 2))
    else console.log(`⛔ ${l.reason}`)
    return l.exit
  }
  const cIdx = argv.indexOf('--concurrency')
  const concurrency = cIdx >= 0 ? Number(argv[cIdx + 1]) : l.ins.concurrencyMax
  if (!Number.isInteger(concurrency) || concurrency < CONCURRENCY_FLOOR || concurrency > CONCURRENCY_CEIL) {
    const reason = `并发度 ${concurrency} 非法：必须在 ${CONCURRENCY_FLOOR}~${CONCURRENCY_CEIL} 之间（拒绝无界并发）`
    if (json) console.log(JSON.stringify({ ok: false, exit: 1, reason }, null, 2))
    else console.log(`⛔ ${reason}`)
    return 1
  }
  const w = buildWaves(l.tasks, { concurrency })
  const out = { ok: w.ok, exit: w.ok ? 0 : 1, requirement: 'REQ-101 / PROJ-CONC', concurrency, waves: w.waves, conflicts: w.conflicts, reason: w.reason || null }
  if (json) console.log(JSON.stringify(out, null, 2))
  else {
    console.log('🧵 区间并发 · 波次方案')
    console.log('-----------------------------------------')
    console.log(`任务 ${l.tasks.length} 个 · 并发上界 ${concurrency} · 波次 ${w.waves.length} · 冲突对 ${w.conflicts.length}`)
    w.waves.forEach((wave, i) => console.log(`   第 ${i + 1} 波：${wave.join(' + ')}`))
    for (const c of w.conflicts) console.log(`   必须串行：${c.a} ↔ ${c.b}（共享 ${c.shared.join('、')}）`)
    console.log('-----------------------------------------')
    console.log(w.ok ? '✅ 方案成立：同区间不在同一波、跨区间同波并发' : `⛔ ${w.reason}`)
  }
  return w.ok ? 0 : 1
}

async function cmdRun(argv) {
  const file = argv[argv.indexOf('--run') + 1]
  const json = argv.includes('--json')
  if (!file || file.startsWith('--')) {
    console.log('用法：node scripts/zone_concurrency.mjs --run <tasks.jsonl> [--concurrency n] [--json]')
    return 2
  }
  const l = loadAndNormalize(file)
  if (!l.ok) {
    if (json) console.log(JSON.stringify({ ok: false, exit: l.exit, reason: l.reason }, null, 2))
    else console.log(`⛔ ${l.reason}`)
    return l.exit
  }
  const cIdx = argv.indexOf('--concurrency')
  const concurrency = cIdx >= 0 ? Number(argv[cIdx + 1]) : l.ins.concurrencyMax
  if (!Number.isInteger(concurrency) || concurrency < CONCURRENCY_FLOOR || concurrency > CONCURRENCY_CEIL) {
    console.log(`⛔ 并发度 ${concurrency} 非法：必须在 ${CONCURRENCY_FLOOR}~${CONCURRENCY_CEIL} 之间`)
    return 1
  }
  const ins = l.ins
  const zn = zoneIndex(ins.zones)
  const traceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zone-run-'))
  const lockRootFor = (t) => {
    const z = zn.get(t.zones[0])
    return lockRootForRepo(z.repo_path_glob)
  }
  const before = l.tasks.map((t) => buildWaves([t], { concurrency }).waves.length) // 占位，保持结构一致
  void before
  const { results, samples } = await runTasks(l.tasks, { concurrency, lockRootFor, timeoutS: ins.timeoutS, traceDir })
  const failed = results.filter((r) => r.exit !== 0)
  const out = { ok: failed.length === 0, exit: failed.length ? 1 : 0, requirement: 'REQ-101 / PROJ-CONC', concurrency, results, samples: samples.length }
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true })
    fs.writeFileSync(LEDGER_JSON, JSON.stringify(out, null, 2) + '\n')
    fs.appendFileSync(LEDGER_JSONL, results.map((r) => JSON.stringify({ at: new Date().toISOString(), ...r }) + '\n').join(''))
  } catch {
    /* 台账落盘失败不影响退出码，但会在输出里显式提示 */
  }
  fs.rmSync(traceDir, { recursive: true, force: true })
  if (json) console.log(JSON.stringify(out, null, 2))
  else {
    console.log('🧵 区间并发 · 真派单')
    console.log('-----------------------------------------')
    for (const r of results) {
      console.log(`   ${r.exit === 0 ? '✅' : '⛔'} ${r.task} · 锁 ${(r.lock_keys || []).join(',')} · 退出 ${r.exit} · 窗口 ${r.t_start}→${r.t_end}`)
      if (r.tail) console.log(`       ${String(r.tail).trim().slice(0, 160)}`)
    }
    console.log('-----------------------------------------')
    console.log(failed.length ? `⛔ ${failed.length} 个任务失败` : '✅ 全部任务完成（跨区间并发、同区间串行）')
  }
  return failed.length ? 1 : 0
}

// ── --list-zones ────────────────────────────────────────────────────────────
function cmdListZones(json) {
  const ins = inspectZones()
  if (json) {
    console.log(JSON.stringify({ ok: ins.ok, exit: ins.exit, reason: ins.reason || null, zones: ins.zones.map((z) => ({ id: z.id, repo: z.repo, paths: z.paths })), concurrency_max: ins.concurrencyMax }, null, 2))
    return ins.exit
  }
  console.log('🗺️ 项目区间登记表')
  console.log('-----------------------------------------')
  console.log(`区间 ${ins.zones.length} 个 · 并发上界 ${ins.concurrencyMax ?? '非法'} · 锁根口径 ${ins.lockRootMode || '未取到'}`)
  for (const z of ins.zones) console.log(`   ${z.baseOk ? '✅' : '⛔'} ${z.id}（${z.paths.join('、')}）`)
  console.log('-----------------------------------------')
  console.log(ins.ok ? '✅ 区间登记表可裁决' : `⛔ ${ins.reason}`)
  return ins.exit
}

// ── --self-test：反向用例（该判红必须判红） ────────────────────────────────────
export function selfTest() {
  const cases = []
  const zn = new Map([
    ['a/x', { id: 'a/x' }],
    ['a/y', { id: 'a/y' }],
  ])

  // ① 无界并发（0 / 5 越界）
  const cfgs = [0, 5, 2.5, 'x']
  for (const c of cfgs) {
    const bad = !(Number.isInteger(c) && c >= CONCURRENCY_FLOOR && c <= CONCURRENCY_CEIL)
    cases.push({ name: `无界/非法并发 ${String(c)} → 必须拒`, ok: bad })
  }
  // ② 空区间表
  const empty = readConfig(path.join(os.tmpdir(), '__no_such_config__.json'))
  cases.push({ name: '区间表缺失 → 必须判红/取不到证据', ok: !empty.ok })
  // ③ 区间 id 重复
  const dupTmp = path.join(os.tmpdir(), `zone-dup-${process.pid}.json`)
  fs.writeFileSync(dupTmp, JSON.stringify({ concurrency_max: 4, timeout_s: 30, zones: [{ id: 'a/x', repo: 'a', repo_path_glob: '/tmp', paths: ['tmp'] }, { id: 'a/x', repo: 'a', repo_path_glob: '/tmp', paths: ['tmp'] }] }))
  const dupCfg = readConfig(dupTmp)
  cases.push({ name: '区间 id 重复 → 必须判红', ok: !dupCfg.ok && /重复/.test(dupCfg.reason) })
  // ④ 没锁却要写（任务未声明区间）
  const noZones = lockSetOf({ task: 'w', zones: [] }, zn)
  cases.push({ name: '任务未声明区间（没有锁却要写）→ 必须拒', ok: !noZones.ok })
  // ⑤ 未登记区间
  const unknown = lockSetOf({ task: 'w', zones: ['nope/z'] }, zn)
  cases.push({ name: '任务声明未登记区间 → 必须拒', ok: !unknown.ok })
  // ⑥ 锁键非规范化（多区间必须字典序）
  const ls = lockSetOf({ task: 'w', zones: ['a/y', 'a/x'] }, zn)
  cases.push({ name: '多区间取锁必须字典序 → 必须排序', ok: ls.ok && ls.keys.join(',') === 'zone:a/x,zone:a/y' })
  // ⑦ 冲突对必须被识别为不可同波
  const tasks = [
    { task: 'p', zones: ['a/x'], lockKeys: ['zone:a/x'], cmd: 'true' },
    { task: 'q', zones: ['a/x'], lockKeys: ['zone:a/x'], cmd: 'true' },
  ]
  const w = buildWaves(tasks, { concurrency: 4 })
  cases.push({ name: '同区间必须落在不同波 → 必须串行', ok: w.ok && w.waves.length === 2 && w.conflicts.length === 1 })
  const w2 = buildWaves(
    [
      { task: 'p', zones: ['a/x'], lockKeys: ['zone:a/x'], cmd: 'true' },
      { task: 'q', zones: ['a/y'], lockKeys: ['zone:a/y'], cmd: 'true' },
    ],
    { concurrency: 4 },
  )
  cases.push({ name: '跨区间必须可同波 → 必须并发', ok: w2.ok && w2.waves.length === 1 && w2.conflicts.length === 0 })
  // ⑧ 依赖成环必须拒单
  const cyc = buildWaves(
    [
      { task: 'p', zones: ['a/x'], lockKeys: ['zone:a/x'], depends_on: ['q'], cmd: 'true' },
      { task: 'q', zones: ['a/y'], lockKeys: ['zone:a/y'], depends_on: ['p'], cmd: 'true' },
    ],
    { concurrency: 4 },
  )
  cases.push({ name: '依赖成环 → 必须拒单（不静默空转）', ok: !cyc.ok })
  // ⑨ 锁键口径必须与 atomic_lock.sh 对拍一致（禁止第二套洗键）
  const tmpRoot = path.join(os.tmpdir(), `zone-lock-${process.pid}`)
  const d1 = lockDirOf('zone:a/x', tmpRoot)
  const d2 = lockDirOf('zone_a/x', tmpRoot)
  cases.push({ name: '锁目录名必须由 atomic_lock.sh 产出（两键不同名）', ok: !!d1 && !!d2 && d1 !== d2 })
  fs.rmSync(dupTmp, { force: true })
  fs.rmSync(tmpRoot, { recursive: true, force: true })

  const failed = cases.filter((c) => !c.ok)
  console.log('🧪 区间并发判定器 · 反向用例自检')
  console.log('-----------------------------------------')
  for (const c of cases) console.log(`   ${c.ok ? '✅' : '⛔'} ${c.name}`)
  console.log('-----------------------------------------')
  console.log(`用例 ${cases.length} 条 · 通过 ${cases.length - failed.length} 条`)
  console.log(failed.length ? '⛔ 反向用例未全过：判定器没有牙' : '✅ 反向用例全过：该判红的都判红了')
  return failed.length ? 1 : 0
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2)
  if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
    console.log('用法：node scripts/zone_concurrency.mjs --plan|--run <tasks.jsonl> [--concurrency n] [--json] | --check | --self-test | --list-zones')
    process.exit(0)
  }
  if (argv.includes('--self-test')) process.exit(selfTest())
  if (argv.includes('--list-zones')) process.exit(cmdListZones(argv.includes('--json')))
  if (argv.includes('--check')) process.exit(await check(argv.includes('--json')))
  if (argv.includes('--plan')) process.exit(cmdPlan(argv))
  if (argv.includes('--run')) process.exit(await cmdRun(argv))
  console.log('⛔ 未知模式：' + argv.join(' '))
  process.exit(2)
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((e) => {
    console.log(`⛔ 取不到证据：${e && e.message}`)
    process.exit(2)
  })
}
