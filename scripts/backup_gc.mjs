#!/usr/bin/env node
/**
 * ==============================================================================
 * 备份留存巡检器  scripts/backup_gc.mjs
 * ==============================================================================
 * 核心功能：按统一口径巡检并清理"改前备份"堆积，只保留每个文件最新的 N 份
 *
 * 为什么需要它（用户报障 + 磁盘实测证据）：
 *   `~/.dsh/profiles/desktop/` 里堆着 16 个带时间戳的备份：
 *   `cordis.patch.yml.bak-*` 8 份、`package.json.bak-*` 8 份。
 *   写它们的是 5 个互不相识的写者（scripts/install_host_gate.sh、scripts/plugin_sync.sh、
 *   scripts/market_guard_patch.mjs、scripts/restore_skill_pool.mjs、
 *   skills/install-client-plugin/scripts/install_plugin.py），
 *   写法完全一致：**改前先备份，没有任何人负责清理**。
 *   危害不是"目录乱"这么轻：回滚依赖"最近一份备份"，
 *   堆到十几份以后回滚目标只能靠翻文件名猜 —— 可回滚性变成了运气。
 *
 * 本工具做三件事（守三条纪律）：
 *   ① **只读能判**：`--check` 只报不改，超口径退 1，取不到证据退 2，绝不把"没查成"当"没问题"；
 *   ② **口径唯一**：留存口径收敛在 `scripts/lib/backup_retention.mjs`，
 *      与 bash 侧 `scripts/lib/backup_retention.sh` 同口径（只认 `<base>.bak-*`，
 *      活文件与别家后缀一律不碰），避免"两个写者两套标准"；
 *   ③ **可自证**：`--selftest` 在临时目录里跑反向用例 ——
 *      故意造出超口径的堆积，证明"超口径能判出来、最新的 N 份留得住、
 *      活文件不动、无关文件不动"，而不是只证明"我打印了一行成功"。
 *
 * 用法：
 *   node scripts/backup_gc.mjs --check              # 只巡检：超口径退 1，合规退 0，查不成退 2
 *   node scripts/backup_gc.mjs --dry-run            # 只报"会删哪些、会留哪些"，一个字节都不删
 *   node scripts/backup_gc.mjs --apply              # 真按口径清理（默认目录 = 桌面端 profile）
 *   node scripts/backup_gc.mjs --selftest           # 反向用例（在临时目录内，不碰真实 profile）
 *   node scripts/backup_gc.mjs --check --dir <路径> --keep 3
 *
 * 退出码：0 合规/清理完成 · 1 超口径（--check/--dry-run 未落地时为 1）·
 *         2 取不到证据（参数非法、目录不存在或不可读；**2 绝不算通过**）·
 *         3 清理不完整（--apply 时部分备份删不掉，属第三态，不等于超口径）
 * ==============================================================================
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pruneBackups, DEFAULT_KEEP } from './lib/backup_retention.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 备份命名约定的分界标记：`<base>.bak-<时间戳>[-来源后缀]`。 */
const BAK_MARK = '.bak-'

/** 默认巡检目录：桌面端 profile（复核口径见文件头；可用 --dir 覆盖）。 */
function defaultDir() {
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  return path.join(home, 'profiles', 'desktop')
}

// ── 扫描：把目录里的备份按"归属的活文件"分组 ─────────────────────────────────
/**
 * 从备份文件名反推它归属的活文件名。
 * 做法是"拿真实磁盘条目去对前缀"而不是凭空切字符串：
 * 只有磁盘上真的存在 `<前缀>`（文件或目录）时，那个前缀才算活文件。
 * 找不到任何活文件的，归到"只剩备份"一组，仍然纳入口径清理（孤儿堆积同样是垃圾）。
 * 取**最长**前缀，避免 `a` 与 `a.b` 同时存在时把 `a.b.bak-x` 错判给 `a`。
 */
function resolveBase(name, dir) {
  let idx = -1
  const marks = []
  while ((idx = name.indexOf(BAK_MARK, idx + 1)) !== -1) marks.push(idx)
  for (const i of marks) {
    const pre = name.slice(0, i)
    if (!pre) continue
    const full = path.join(dir, pre)
    let st = null
    try {
      st = fs.statSync(full, { throwIfNoEntry: false })
    } catch {
      st = null
    }
    if (st && (st.isFile() || st.isDirectory())) return pre
  }
  // 没有任何活件可对：取最后一段 `.bak-` 之前的部分当兜底归属
  const last = marks.length ? marks[marks.length - 1] : -1
  if (last > 0) return name.slice(0, last)
  return name
}

/** 扫描目录，返回按归属分组的现状（每个 base 一条），以及无备份的 base 数量。 */
export function scanDir(dir, keepN = DEFAULT_KEEP) {
  let names
  try {
    names = fs.readdirSync(dir)
  } catch (e) {
    const err = new Error(`目录不可读：${dir}（${String((e && e.message) || e)}）`)
    err.code = 'ENODIR'
    throw err
  }
  const byBase = new Map()
  for (const name of names) {
    if (!name.includes(BAK_MARK)) continue
    if (name.startsWith(BAK_MARK)) continue
    const base = resolveBase(name, dir)
    if (!base) continue
    if (!byBase.has(base)) byBase.set(base, [])
    byBase.get(base).push(name)
  }
  const groups = []
  let clean = 0
  for (const [base, list] of byBase) {
    const full = path.join(dir, base)
    const keep = Number.isFinite(Number(keepN)) ? Math.max(0, Math.floor(Number(keepN))) : DEFAULT_KEEP
    // 用库里的排序口径（修改时间升序，同名按文件名），保证与真正删的时候完全一致
    const probe = pruneBackups(full, keep, { dryRun: true })
    const ordered = [...probe.pruned, ...probe.kept]
    if (probe.over === 0) clean++
    groups.push({
      base,
      baseFile: full,
      liveFileExists: fs.existsSync(full),
      found: list.length,
      keepList: probe.kept,
      pruneList: probe.pruned,
      over: probe.over,
      ordered,
      probeError: probe.ok ? null : probe.errors.join('; '),
    })
  }
  groups.sort((a, b) => (b.over - a.over) || (a.base < b.base ? -1 : a.base > b.base ? 1 : 0))
  const totalBackups = groups.reduce((n, g) => n + g.found, 0)
  const totalOver = groups.reduce((n, g) => n + g.over, 0)
  return { dir, keep: keepN, groups, clean, totalBackups, totalOver }
}

// ── 输出 ────────────────────────────────────────────────────────────────────
function printReport(res, mode) {
  const keep = res.keep
  console.log('🧹 备份留存巡检 · ' + mode)
  console.log('-----------------------------------------')
  console.log(`目录：${res.dir}`)
  console.log(`口径：同一文件只留最新 ${keep} 份 <文件>.bak-*（更旧的删；活文件与别家后缀一律不碰）`)
  console.log(`实况：可清理对象 ${res.groups.length} 组 · 备份合计 ${res.totalBackups} 份 · 超口径 ${res.totalOver} 份`)
  console.log('-----------------------------------------')
  if (res.groups.length === 0) {
    console.log('✅ 本目录没有发现任何 .bak-* 备份，无需清理')
    return
  }
  for (const g of res.groups) {
    const flag = g.over > 0 ? `⚠️ 超口径 ${g.over} 份` : '✅ 合规'
    console.log(`${flag} · ${g.base}（活文件${g.liveFileExists ? '在位' : '已不在，只剩备份'} · 备份 ${g.found} 份）`)
    if (g.pruneList.length) console.log(`   待清理（最旧 ${g.pruneList.length} 份）：${g.pruneList.join('、')}`)
    if (g.keepList.length) console.log(`   保留（最新 ${g.keepList.length} 份）：${g.keepList.join('、')}`)
    if (g.probeError) console.log(`   ⚠️ 该组判定异常：${g.probeError}`)
  }
  console.log('-----------------------------------------')
}

function printApplyResult(results) {
  let deleted = 0
  let failed = 0
  let already = 0
  console.log('🧹 备份留存清理 · 落地结果')
  console.log('-----------------------------------------')
  for (const r of results) {
    if (r.deleted.length) {
      deleted += r.deleted.length
      console.log(`🗑️ ${path.basename(r.baseFile)}：已删最旧 ${r.deleted.length} 份 → 保留 ${r.kept.length} 份`)
      console.log(`   已删：${r.deleted.join('、')}`)
    } else if (r.over === 0) {
      already++
    }
    if (r.errors.length) {
      failed += r.errors.length
      for (const e of r.errors) console.log(`⛔ 删除失败：${e}`)
    }
  }
  if (!deleted) console.log(`ℹ️ 没有可删的备份（${already} 组本来就合规）`)
  console.log('-----------------------------------------')
  console.log(`合计：已删 ${deleted} 份 · 未删需人工处理 ${failed} 份`)
  return failed
}

// ── 反向用例：证明"判得出、留得住、不乱动" ───────────────────────────────────
function selfTest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-gc-selftest-'))
  const checks = []
  const ok = (name, cond, extra = '') => checks.push({ name, pass: !!cond, extra })

  const fresh = (sub) => {
    const d = path.join(tmp, sub)
    fs.mkdirSync(d, { recursive: true })
    return d
  }

  try {
    // 用例 1：超口径必须判得出，且只判该判的那一组
    const d1 = fresh('over')
    fs.writeFileSync(path.join(d1, 'live.yml'), 'LIVE\n')
    for (let i = 1; i <= 6; i++) {
      fs.writeFileSync(path.join(d1, `live.yml${BAK_MARK}2026010${i}-000000-x`), `OLD${i}\n`)
      fs.utimesSync(path.join(d1, `live.yml${BAK_MARK}2026010${i}-000000-x`), 1700000000 + i * 60, 1700000000 + i * 60)
    }
    fs.writeFileSync(path.join(d1, 'calm.json'), 'LIVE2\n')
    fs.writeFileSync(path.join(d1, 'calm.json.bak-1-a'), 'A\n')
    fs.writeFileSync(path.join(d1, 'calm.json.bak-2-a'), 'B\n')
    fs.writeFileSync(path.join(d1, 'calm.json.tmp-9-notmine'), 'TMP\n')
    const r1 = scanDir(d1, 3)
    const g1 = r1.groups.find((g) => g.base === 'live.yml')
    const g1c = r1.groups.find((g) => g.base === 'calm.json')
    ok('超口径被检出（6 份留 3 → 超 3）', g1 && g1.over === 3 && g1.found === 6, `over=${g1 && g1.over} found=${g1 && g1.found}`)
    ok('合规组不误报（2 份留 3 → 超 0）', g1c && g1c.over === 0 && g1c.found === 2, `over=${g1c && g1c.over}`)
    ok('别家后缀 .tmp- 不进候选', r1.totalBackups === 8, `合计=${r1.totalBackups}`)

    // 用例 2：保留的必须是最新的 N 份，删除的必须是最旧的
    const probe = pruneBackups(path.join(d1, 'live.yml'), 3, { dryRun: true })
    const expectKeep = ['live.yml.bak-20260104-000000-x', 'live.yml.bak-20260105-000000-x', 'live.yml.bak-20260106-000000-x']
    const expectDel = ['live.yml.bak-20260101-000000-x', 'live.yml.bak-20260102-000000-x', 'live.yml.bak-20260103-000000-x']
    ok('保留最新 N 份', JSON.stringify(probe.kept) === JSON.stringify(expectKeep), probe.kept.join('、'))
    ok('待删为最旧若干份', JSON.stringify(probe.pruned) === JSON.stringify(expectDel), probe.pruned.join('、'))

    // 用例 3：dryRun 只算不删（临时的"预案"必须零副作用）
    const before = fs.readdirSync(d1).length
    const probe2 = pruneBackups(path.join(d1, 'live.yml'), 3, { dryRun: true })
    ok('--dry-run 不删任何字节', probe2.deleted.length === 0 && fs.readdirSync(d1).length === before, `dir=${fs.readdirSync(d1).length}/${before}`)

    // 用例 4：落地删除 —— 活文件不动、无关文件不动、别家后缀不动
    const liveHashBefore = fs.readFileSync(path.join(d1, 'live.yml'), 'utf8')
    const applied = pruneBackups(path.join(d1, 'live.yml'), 3)
    const afterNames = fs.readdirSync(d1)
    ok('落地只删待删的 3 份', applied.deleted.length === 3 && applied.errors.length === 0, applied.deleted.join('、'))
    ok('活文件从未被触碰', fs.readFileSync(path.join(d1, 'live.yml'), 'utf8') === liveHashBefore && afterNames.includes('live.yml'))
    ok('最新的 3 份仍在位', expectKeep.every((n) => afterNames.includes(n)), afterNames.join('、'))
    ok('无关文件未被误伤', afterNames.includes('calm.json') && afterNames.includes('calm.json.bak-1-a'))
    ok('别家后缀未被误伤', afterNames.includes('calm.json.tmp-9-notmine'))

    // 用例 5：没有备份时必须空操作、绝不报错
    const d2 = fresh('empty')
    fs.writeFileSync(path.join(d2, 'alone.txt'), 'x\n')
    const r2 = pruneBackups(path.join(d2, 'alone.txt'), 3)
    ok('无备份时空操作', r2.total === 0 && r2.deleted.length === 0 && r2.ok === true)
    const r2d = scanDir(d2, 3)
    ok('无备份目录判定为合规', r2d.groups.length === 0 && r2d.totalOver === 0)

    // 用例 6：活文件本身永远不是候选（哪怕它名字里带 .bak-）
    const d3 = fresh('chain')
    fs.writeFileSync(path.join(d3, 'a.bak-x'), 'X\n')
    fs.writeFileSync(path.join(d3, 'a.bak-x.bak-old'), 'Y\n')
    const r3 = pruneBackups(path.join(d3, 'a.bak-x'), 0)
    const after3 = fs.readdirSync(d3)
    ok('备份的备份归其活文件管，不被当成活文件自己', r3.total === 1 && r3.deleted.includes('a.bak-x.bak-old'))
    ok('带 .bak- 的活文件未被删', after3.includes('a.bak-x'))

    // 用例 7：keep=0 时全部可清（边界值不能崩）
    const d4 = fresh('zero')
    fs.writeFileSync(path.join(d4, 'z.conf'), 'z\n')
    fs.writeFileSync(path.join(d4, 'z.conf.bak-1'), '1\n')
    const r4 = pruneBackups(path.join(d4, 'z.conf'), 0)
    ok('keep=0 时全部清掉（活文件仍在）', r4.deleted.length === 1 && fs.existsSync(path.join(d4, 'z.conf')))
  } catch (e) {
    ok('自检过程未抛异常', false, String((e && e.message) || e))
  }

  console.log('🧪 备份留存巡检器 · 反向用例自检')
  console.log('-----------------------------------------')
  for (const c of checks) console.log(`${c.pass ? '✅' : '⛔'} ${c.name}${c.extra ? `  [${c.extra}]` : ''}`)
  const failed = checks.filter((c) => !c.pass)
  console.log('-----------------------------------------')
  console.log(`用例 ${checks.length} 条 · 通过 ${checks.length - failed.length} 条 · 失败 ${failed.length} 条`)
  console.log(failed.length === 0
    ? '✅ 反向用例全部通过：超口径判得出、最新 N 份留得住、活文件与无关文件都不动'
    : '⛔ 反向用例失败：留存口径不可信，禁止用于真实目录')
  try {
    fs.rmSync(tmp, { recursive: true, force: true })
  } catch {
    console.log('⚠️ 临时目录清理失败：' + tmp)
  }
  return failed.length === 0 ? 0 : 1
}

// ── 参数与主流程 ─────────────────────────────────────────────────────────────
function usage() {
  console.log('用法：node scripts/backup_gc.mjs [--check|--apply|--dry-run|--selftest] [--dir <路径>] [--keep N]')
}

function main() {
  const argv = process.argv.slice(2)
  const takeValue = (flag) => {
    const i = argv.indexOf(flag)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const selftest = argv.includes('--selftest')
  const apply = argv.includes('--apply')
  const dryRun = argv.includes('--dry-run')
  const check = argv.includes('--check')

  const dir = takeValue('--dir') || defaultDir()
  const keepRaw = takeValue('--keep')
  const keep = keepRaw === undefined ? DEFAULT_KEEP : Number(keepRaw)
  if (!Number.isInteger(keep) || keep < 0) {
    console.log(`⛔ 取不到证据：--keep 必须是 0 或正整数（收到 ${JSON.stringify(keepRaw)}）`)
    return 2
  }

  if (argv.includes('-h') || argv.includes('--help')) {
    usage()
    return 0
  }

  if (!apply && !dryRun && !check && !selftest) {
    // 默认只读巡检，绝不因为"没写参数"就动手删东西
    console.log('ℹ️ 未指定动作，按只读巡检处理（要真清理请显式加 --apply）')
  }

  if (selftest) return selfTest()

  let res
  try {
    res = scanDir(dir, keep)
  } catch (e) {
    console.log(`⛔ 取不到证据：${String((e && e.message) || e)}`)
    return 2
  }

  if (dryRun || (check && !apply)) {
    const mode = dryRun ? '预案（--dry-run，未删任何字节）' : '只读巡检（--check）'
    printReport(res, mode)
    if (res.groups.length === 0) {
      console.log('✅ 结论：无备份可管，判定合规')
      return 0
    }
    if (res.totalOver > 0) {
      console.log(`⛔ 结论：${res.groups.length} 组中共 ${res.totalOver} 份超出留存口径（保留 ${keep} 份），需清理`)
      console.log(`   清理命令：node scripts/backup_gc.mjs --apply --dir ${dir} --keep ${keep}`)
      return 1
    }
    console.log(`✅ 结论：全部在留存口径之内（每组不超过 ${keep} 份）`)
    return 0
  }

  if (apply) {
    printReport(res, '清理（--apply）')
    const results = res.groups.map((g) => pruneBackups(g.baseFile, keep))
    const failed = printApplyResult(results)
    const left = results.reduce((n, r) => n + r.pruned.length - r.deleted.length, 0)
    if (failed > 0 || left > 0) {
      console.log(`⛔ 结论：清理不完整，仍有 ${failed + left} 份未删（磁盘权限或占用），请人工复核`)
      return 3
    }
    console.log('✅ 结论：全部已按留存口径收敛，且未触碰活文件与无关文件')
    return 0
  }

  return 2
}

if (process.argv[1] && path.basename(process.argv[1]) === path.basename(fileURLToPath(import.meta.url))) {
  process.exit(main())
}
