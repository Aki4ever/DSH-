#!/usr/bin/env node
/**
 * ==============================================================================
 * 原子锁接入审计与并发自证  atomic_lock_audit.mjs
 * ==============================================================================
 * 回答两个问题（REQ-091 / R6）：
 *   ① **接入了没有**：清单里每一个"会互相踩脚的写路径"，代码里真的调了锁吗？
 *   ② **锁真的有用吗**：持锁段并发跑，临界区重叠必须为 0；**无锁对照段必须重叠 > 0**
 *      —— 这一条是"检测器有牙"的证明。只看持锁段 0 重叠是**假阴性风险**：
 *      可能是并发根本没跑起来，而不是锁生效了。
 *
 * 为什么坚持要无锁对照（本工程实测教训）：
 *   `fingerprint_audit.sh`、`control_gates.sh` 都曾出现"检测器恒绿"——
 *   空输出被折算成通过。并发检测同样有这个陷阱，故必须给对照组。
 *
 * 用法：
 *   node scripts/atomic_lock_audit.mjs --check      # 判定：接入覆盖 + 并发自证，不达标退 1
 *   node scripts/atomic_lock_audit.mjs --list       # 只打印接入点清单与命中情况
 *   node scripts/atomic_lock_audit.mjs --stress     # 只跑并发压测（较慢，约 5~15 秒）
 *   node scripts/atomic_lock_audit.mjs selftest     # 自检（含反向用例）
 *
 * 退出码：0 达标 / 1 判定不过（未接入 或 重叠不符预期）/ 2 用法错误
 * ==============================================================================
 */

import { readFileSync, existsSync, writeFileSync, appendFileSync, rmSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { withLock, lockDirFor } from './lib/atomic_lock.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const SELF = fileURLToPath(import.meta.url)

/**
 * 接入点清单（**唯一权威**）。
 * 每项：写路径责任人（文件） · 锁键 · 为什么必须锁 · 判定用的正则。
 * 新增 choke point 时改这里，`--check` 会立刻发现"清单改了但代码没改"。
 */
export const LOCK_POINTS = [
  {
    file: 'scripts/progress_ledger.mjs',
    key: 'state:progress_ledger',
    why: '看板/审计/收尾三方并发追加 JSONL，无锁会撕行',
    probe: /withLock\(|withLockSync\(/,
  },
  {
    file: 'scripts/lib/pricing_fingerprint.mjs',
    key: 'state:pricing_fingerprint',
    why: '探针、插件、看门狗都会触发定价指纹同步，写同一份 state',
    probe: /withLock\(|withLockSync\(/,
  },
  {
    file: 'scripts/control_gates.sh',
    key: 'state:gates_snapshot',
    why: '看板快照被多个门禁调用方并发重写，会留下半截 JSON',
    probe: /atomic_lock\.sh|withLock/,
  },
  {
    file: 'scripts/fingerprint_audit.sh',
    key: 'assets:fingerprint_ledger',
    why: '台账是整文件重写，两个扫描同时跑会互相截断',
    probe: /atomic_lock\.sh|withLock/,
  },
  {
    file: 'ai-control/plugin/index.mjs',
    key: 'state:plugin_status',
    why: '宿主插件与自检脚本都会写 plugin-status.txt',
    probe: /withLock|atomic_lock/,
  },
  {
    file: 'scripts/sync_api_docs.mjs',
    key: 'assets:api_docs_index',
    why: 'API 文档索引是整文件重写，两个同步器同时跑会互相截断',
    probe: /withLockSync\(|withLock\(/,
  },
  {
    file: 'scripts/plugin_sync.sh',
    key: 'assets:plugin_profile_sync',
    why: '把插件源码对齐进 profile（写仓库外文件），两处同时同步会写出半新半旧的插件',
    probe: /atomic_lock\.sh|withLock/,
  },
]

/** 单个接入点的命中判定（纯函数，便于反向用例）。 */
export function evaluatePoint(point, readFile = (p) => readFileSync(p, 'utf8')) {
  const abs = join(ROOT, point.file)
  if (!existsSync(abs)) return { ...point, exists: false, hit: false, detail: '文件不存在' }
  let text
  try { text = readFile(abs) } catch (err) { return { ...point, exists: true, hit: false, detail: `读不到：${err.message}` } }
  const hit = point.probe.test(text)
  return { ...point, exists: true, hit, detail: hit ? '已接入' : '未接入（文件里找不到加锁调用）' }
}

/**
 * 对拍 Node 侧与 Bash 侧算出的锁目录是否完全一致。
 * 不对拍的自检是"用自己证明自己"——本工程明令禁止的那类假阳性。
 */
export function checkLockDirParity(key = 'state:progress_ledger') {
  try {
    const nodeDir = lockDirFor(key)
    const bashDir = execFileSync('bash', [join(ROOT, 'scripts/lib/atomic_lock.sh'), '--print-dir', key], { encoding: 'utf8' }).trim()
    return { checked: true, ok: nodeDir === bashDir, key, nodeDir, bashDir }
  } catch (err) {
    return { checked: false, ok: false, key, reason: err && err.message ? err.message : String(err) }
  }
}

/**
 * 载具对齐判定：调用 `scripts/plugin_sync.sh check`。
 * 返回 { ok, lines }；脚本不在或执行失败一律判**未对齐**（fail-closed）：
 * "查不出来"与"确实不一致"在证据上等价，都不能当作通过。
 */
export function checkPluginAlignment() {
  try {
    execFileSync('bash', [join(ROOT, 'scripts/plugin_sync.sh'), 'check'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return { ok: true, lines: [] }
  } catch (err) {
    const out = String((err && err.stdout) || '') + String((err && err.stderr) || '')
    return { ok: false, lines: out.split('\n').map((l) => l.trim()).filter(Boolean) }
  }
}

// ── 并发压测 ────────────────────────────────────────────────────────────────
/**
 * 压测工作进程：以 `--worker <锁键|none> <文件> <轮数>` 被拉起。
 * 每轮：进入临界区 → 给计数器文件 +1（读-改-写）→ 退出。
 * 无锁时读-改-写会互相覆盖，最终计数必然 < 轮数×进程数，这就是"脏数据"。
 */
async function runWorker(lockKey, counterFile, rounds) {
  /**
   * 持锁段用"追加一行"，对照组用"读-改-写一个数"。
   * 为什么两段动作不同（这是实测逼出来的，不是随意设计）：
   *   · 追加（`O_APPEND`）在 POSIX 上**本身就原子**，拿它当对照组会得到"无锁也不丢"，
   *     检测器就成了睁眼瞎 —— 实测确实出现了"无锁段零丢失"。
   *   · 读-改-写（read → write）才是真实业务里最容易丢数据的形态（看板快照、台账都是它），
   *     拿它当对照组才**必然**测出竞态。
   *   · 持锁段用追加，是为了让"进入临界区的次数"可被精确计数（不受读缓存影响）。
   * 两段动作不同不影响结论：要证的只有一件事 —— 同一把锁下互斥是否成立、检测器是否看得见竞态。
   */
  const spin = () => { const t = Date.now() + 3; while (Date.now() < t) { /* 制造竞态窗口 */ } }
  const append = () => { spin(); appendFileSync(counterFile, `${process.pid}\n`, 'utf8') }
  const readModifyWrite = () => {
    const cur = existsSync(counterFile) ? Number(readFileSync(counterFile, 'utf8')) || 0 : 0
    spin()
    writeFileSync(counterFile, String(cur + 1), 'utf8')
  }
  for (let i = 0; i < rounds; i++) {
    if (lockKey === 'none') { readModifyWrite(); continue }
    await withLock(lockKey, async () => {
      // 持锁自证：进去以后再读一次锁元数据，必须还是"我持有"。
      // 若读到别人的 pid，说明互斥被击穿 —— 那才是真正的"锁失效"，
      // 而不是"行数少 1"这种只能间接推断的现象（间接现象会被误判成脚本 bug）。
      const { readLockMeta } = await import('./lib/atomic_lock.mjs')
      const meta = readLockMeta(lockKey)
      if (meta && meta.pid !== process.pid) {
        appendFileSync(`${counterFile}.violations`, `${process.pid} saw ${meta.pid}\n`, 'utf8')
      }
      append()
    }, { timeoutMs: 30_000, why: '压测' })
  }
  return rounds
}

/**
 * 跑一次并发对照实验。
 * @param {{procs?:number, rounds?:number, useLock?:boolean}} opts
 * @returns {{ok:boolean, expected:number, actual:number, lost:number}}
 */
export function runStress({ procs = 8, rounds = 10, useLock = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'lock-stress-'))
  const counterFile = join(dir, 'counter.txt')
  writeFileSync(counterFile, '0', 'utf8')
  // 锁键必须**所有子进程一致**，否则各锁各的，等于没锁。
  // 实测踩坑：一开始把父 PID 拼进锁键 → 6 个子进程各拿一把锁，持锁段照样丢 3 条。
  const lockKey = useLock ? 'stress:atomic_lock_audit' : 'none'
  const readCount = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).length : 0)
  return Promise.all(
    Array.from({ length: procs }, () =>
      execFileSyncAsync(process.execPath, [SELF, '--worker', lockKey, counterFile, String(rounds)]),
    ),
  ).then(() => {
    const expected = procs * rounds
    // 持锁段是"追加行数"，对照组是"计数值" —— 两者都表示"进入临界区的次数"
    const raw = existsSync(counterFile) ? readFileSync(counterFile, 'utf8') : ''
    const actual = useLock ? raw.split('\n').filter(Boolean).length : (Number(raw) || 0)
    const violations = existsSync(counterFile + '.violations')
      ? readFileSync(counterFile + '.violations', 'utf8').split('\n').filter(Boolean).length
      : 0
    return { ok: actual === expected && violations === 0, expected, actual, lost: expected - actual, violations, dir }
  })
}

function execFileSyncAsync(cmd, args) {
  return new Promise((resolve, reject) => {
    import('node:child_process').then(({ spawn }) => {
      const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
      let err = ''
      child.stderr.on('data', (d) => { err += d })
      child.on('error', reject)
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err || `子进程退出码 ${code}`))))
    })
  })
}

// ── 主流程 ──────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const has = (f) => args.includes(f)

  // 工作进程模式
  if (has('--worker')) {
    const i = args.indexOf('--worker')
    const [, lockKey, counterFile, rounds] = args.slice(i)
    await runWorker(lockKey, counterFile, Number(rounds) || 1)
    return 0
  }

  if (has('selftest')) return selftest()

  const points = LOCK_POINTS.map((p) => evaluatePoint(p))

  if (has('--list')) {
    console.log('🔒 原子锁接入点清单')
    for (const p of points) {
      console.log(`  ${p.hit ? '✅' : '⛔'} ${p.file}  [${p.key}]  ${p.detail}`)
    }
    return points.every((p) => p.hit) ? 0 : 1
  }

  // ── Node 侧 / Bash 侧锁目录对拍 ──────────────────────────────────────────
  // 为什么必须对拍：两侧各自算锁目录，一旦算法分叉（历史缺陷：Node 把冒号洗成下划线），
  // 同一个锁键会指向两个目录 → 两把锁互不可见 → **等于没锁，而两边自检都是绿的**。
  const parity = checkLockDirParity()
  if (parity.checked) {
    console.log(`锁根对拍：${parity.ok ? '✅ Node 与 Bash 算出同一锁目录' : '⛔ 两侧锁目录不一致'} · ${parity.key}`)
    if (!parity.ok) console.log(`   node=${parity.nodeDir}\n   bash=${parity.bashDir}`)
  } else {
    console.log(`锁根对拍：⚠️ 未执行（${parity.reason}）`)
  }

  const missing = points.filter((p) => !p.hit)

  if (!has('--check') && !has('--stress')) {
    console.error('用法：atomic_lock_audit.mjs <--check|--list|--stress|selftest>')
    return 2
  }

  // ── 载具对齐判定（2026-10-02 事故后新增）────────────────────────────────
  // 为什么放在这份审计里：这次事故的本质是"**载具断了**"——插件源码在仓库里是对的，
  // 但 profile 里是旧版（硬链接断裂），于是宿主加载到的完全是另一份代码。
  // 载具不对齐时，一切逻辑判定都是自欺欺人，所以必须与并发自证并列摆在最前面。
  const align = checkPluginAlignment()
  console.log(`载具对齐：${align.ok ? '✅ profile 与仓库逐字节一致' : '⛔ profile 落后于仓库'}`)
  if (!align.ok) for (const l of align.lines.slice(0, 8)) console.log('   ' + l)

  console.log('🧪 原子锁接入与并发自证')
  console.log('-----------------------------------------')
  console.log(`接入点：${points.length - missing.length}/${points.length} 已加锁`)
  for (const p of missing) console.log(`  ⛔ 未接入：${p.file}（${p.why}）`)

  if (has('--check') || has('--stress')) {
    const procs = Number((args.find((a) => a.startsWith('--procs=')) || '').split('=')[1]) || 8
    const rounds = Number((args.find((a) => a.startsWith('--rounds=')) || '').split('=')[1]) || 10
    const locked = await runStress({ procs, rounds, useLock: true })
    const free = await runStress({ procs, rounds, useLock: false })
    console.log(`持锁段：期望 ${locked.expected} · 实得 ${locked.actual} · 丢失 ${locked.lost} · 互斥被击穿 ${locked.violations} 次`)
    console.log(`无锁段：期望 ${free.expected} · 实得 ${free.actual} · 丢失 ${free.lost}`)
    const lockOk = locked.lost === 0 && locked.violations === 0
    const controlOk = free.lost > 0 // 对照组必须"出事"，否则说明并发没真跑起来 → 检测器无牙
    console.log(lockOk ? '✅ 持锁段零丢失（临界区互斥生效）' : '⛔ 持锁段仍有丢失 —— 锁没起作用')
    console.log(controlOk ? '✅ 无锁段确实丢失数据（证明检测器看得见竞态）' : '⛔ 无锁段零丢失 —— 并发没真跑起来，本次结论不可信')
    try { rmSync(locked.dir, { recursive: true, force: true }) } catch { /* ignore */ }
    try { rmSync(free.dir, { recursive: true, force: true }) } catch { /* ignore */ }
    const pass = missing.length === 0 && lockOk && controlOk && (!parity.checked || parity.ok) && align.ok
    console.log('-----------------------------------------')
    console.log(pass ? '✅ 通过：接入覆盖 100% + 持锁 0 丢失 + 对照组可测出竞态' : '⛔ 未通过')
    return pass ? 0 : 1
  }
  return missing.length === 0 ? 0 : 1
}

/** 自检：核心正确性 + 反向用例。 */
async function selftest() {
  const { withLock, acquireLock, releaseLock, acquireLockWait, lockDirFor } = await import('./lib/atomic_lock.mjs')
  let pass = 0
  let fail = 0
  const chk = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`  ✅ ${name}${extra ? ' · ' + extra : ''}`) }
    else { fail++; console.log(`  ❌ ${name}${extra ? ' · ' + extra : ''}`) }
  }
  console.log('🧪 atomic_lock 自检')
  const k = `selftest:${process.pid}`

  const a = acquireLock(k, { why: '自检' })
  chk('首次获取成功', a.acquired === true)
  chk('返回 token', typeof a.token === 'string' && a.token.length > 0)
  const b = acquireLock(k, { why: '自检' })
  chk('重复获取被拒（互斥）', b.acquired === false, b.reason)
  const wrong = releaseLock(k, 'wrong-token')
  chk('反向用例：错 token 不得释放他人锁', wrong.released === false && existsSync(lockDirFor(k)))
  const rel = releaseLock(k, a.token)
  chk('正确 token 释放成功', rel.released === true)
  // 判"锁没了"要看**metadata.json**（互斥真相源），不是外层目录 ——
  // 外层目录刻意保留（删它会让对手正在进行的创建直接失败，见 atomic_lock.mjs 注释）
  chk('释放后锁文件消失（metadata.json 不在）', !existsSync(join(lockDirFor(k), 'metadata.json')))

  const t0 = Date.now()
  let threw = false
  try {
    await acquireLockWait(k, { timeoutMs: 150, why: '自检-超时' })
    acquireLock(k, { why: '占用' }) // 占住不放
    await acquireLockWait(k, { timeoutMs: 150, why: '自检-超时' })
  } catch (err) {
    threw = err && err.code === 'ELOCKTIMEOUT'
  } finally {
    releaseLock(k)
  }
  chk('超时未获取 → 抛 ELOCKTIMEOUT（不静默）', threw, `耗时 ${Date.now() - t0}ms`)

  // 陈旧回收：写一个死人 PID 的锁，应被回收且留痕
  const k2 = `selftest-stale:${process.pid}`
  const got = acquireLock(k2)
  const metaPath = join(lockDirFor(k2), 'metadata.json')
  writeFileSync(metaPath, JSON.stringify({ key: k2, holder: 'ghost', pid: 999999, at: new Date(0).toISOString(), token: got.token }), 'utf8')
  const r2 = acquireLock(k2, { why: '自检-回收' })
  chk('陈旧锁（持有者已死）被回收', r2.acquired === true)
  chk('回收留痕（reclaimed 非空）', r2.reclaimed !== null && typeof r2.reclaimed === 'object', JSON.stringify(r2.reclaimed))
  releaseLock(k2, r2.token)

  // withLock 异常路径必须释放
  const k3 = `selftest-throw:${process.pid}`
  let caught = false
  try {
    await withLock(k3, async () => { throw new Error('故意失败') })
  } catch { caught = true }
  chk('临界区抛错被透出', caught)
  chk('临界区抛错后锁仍被释放', !existsSync(join(lockDirFor(k3), 'metadata.json')))

  // 反向用例：持有者刚死、但**还没到陈旧阈值** → 必须**不回收**（宁可多等，不可误收）。
  // 这条是"假击穿"根因的回归锁：曾经因为"只要持有者死了就回收"，
  // 在释放与再获取的窗口里误收活锁，导致两个进程同时进临界区（实测击穿 1 次）。
  const k4 = `selftest-fresh-dead:${process.pid}`
  const g4 = acquireLock(k4, { why: '回归锁' })
  writeFileSync(join(lockDirFor(k4), 'metadata.json'),
    JSON.stringify({ key: k4, holder: 'just-died', pid: 999999, at: new Date().toISOString(), token: g4.token }), 'utf8')
  const r4 = acquireLock(k4, { why: '回归锁', staleMs: 600000 })
  chk('回归：持有者刚死但未超时 → 拒绝回收（防假击穿）', r4.acquired === false, r4.reason)
  releaseLock(k4)

  // 反向用例：检测器确实看得见"未接入"。
  // 注意：哨兵串必须**运行时拼**，不能以字面量写在本文件里 —— 否则正则会在本文件自身命中，
  // 变成"用自己证明自己"的假阳性（本工程反复踩过的自证陷阱）。
  const sentinel = ['__NEVER', '_LOCK', '_MARKER__'].join('')
  const fake = evaluatePoint({ file: 'scripts/atomic_lock_audit.mjs', probe: new RegExp(sentinel) })
  chk('反向用例：probe 不命中即判未接入', fake.hit === false, fake.detail)
  const missingFile = evaluatePoint({ file: 'scripts/绝不存在_XYZ.mjs', probe: /withLock/ })
  chk('反向用例：文件不存在即判未接入', missingFile.hit === false, missingFile.detail)

  const par = checkLockDirParity()
  chk('Node 与 Bash 算出同一锁目录（防两把锁互不可见）', par.checked && par.ok, par.ok ? par.nodeDir : JSON.stringify(par))

  console.log('-----------------------------------------')
  console.log(`共 ${pass + fail} 项 · ${fail === 0 ? '🎉 全部通过' : `❌ ${fail} 项未过`}`)
  return fail === 0 ? 0 : 1
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isDirectRun) {
  main().then((c) => process.exit(c)).catch((e) => { console.error('⛔ 审计异常：' + (e && e.message ? e.message : e)); process.exit(1) })
}
