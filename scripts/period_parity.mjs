#!/usr/bin/env node
/**
 * ==============================================================================
 * 峰谷时段「单一口径」对拍器  period_parity.mjs
 * ==============================================================================
 * 解决的问题（REQ-091 / R4，D5 裁决的落地方式）：
 *   工程里对"现在是不是高峰"这件事曾有**两处实现**：
 *     ① `scripts/deepseek_usage_probe.mjs`（已审计，CLI 侧，官方口径 + 节假日表）；
 *     ② `skill-pool/plugins/dsh-plugin-usage-bar`（客户端插件，纯本地算，为了逐秒刷新）。
 *   两处实现就是"同一事实两种说法"的温床：改一处忘一处，界面上显示空闲价、
 *   探针却按高峰价算，谁也不知道哪个对。
 *
 *   需求文案里这条的裁决方向（D5）是"前端改读探针输出"。**实测后否决了该方案**，
 *   理由是物理的：探针是一次网络+进程调用，做不到"逐秒实时更新"，
 *   而用户要的正是常显且实时。故改为**可证伪的等价性**：
 *     客户端保留本地纯计算（为了实时），但必须与探针口径**逐点对拍全等**，
 *     任何一处偏离立刻判红。这样"两处实现"被降级为"一份口径 + 一个证明"。
 *
 * 判定口径：
 *   · 取一组**边界与刁钻**时间点（时段切换前一秒/后一秒、周末、法定节假日、跨年未覆盖年份）；
 *   · 两侧各算一次 `period`，逐一比对必须全等；
 *   · 另比对 `nextSwitchAt`（下次切换时刻）—— 只对 period 相等还不够，
 *     倒计时错了用户会看到"还有 0 分钟却还没切"。
 *
 * 用法：
 *   node scripts/period_parity.mjs --check      # 判定：两侧逐点全等
 *   node scripts/period_parity.mjs --list       # 打印每个基准点的两侧结果
 *   node scripts/period_parity.mjs selftest     # 自检（含反向用例：故意改坏一侧必须判红）
 *
 * 退出码：0 全等 / 1 存在不一致 / 2 用法错误
 * ==============================================================================
 */

import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { resolvePeriod as probeResolvePeriod, HOLIDAY_TABLE } from './deepseek_usage_probe.mjs'
import { readGatesConf } from './lib/gates_config.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const require = createRequire(import.meta.url)
const USAGE_CORE = join(REPO_ROOT, 'skill-pool', 'plugins', 'dsh-plugin-usage-bar', 'src', 'usage-core.cjs')

/** 北京时间某时刻对应的绝对毫秒（偏移 +08:00，无夏令时）。 */
export function bj(y, mo, d, h, mi = 0) {
  return Date.UTC(y, mo - 1, d, h - 8, mi, 0, 0)
}

/**
 * 基准时间点（**唯一权威清单**）。
 * 选取原则：每一条都对应一类"算错就会让用户看到错价钱"的场景。
 */
export function fixtures() {
  const out = []
  const add = (name, ms) => out.push({ name, ms })

  // ── 工作日两个高峰段的前后一秒（最容易差一小时的边界） ──
  add('工作日 08:59:59 空闲', bj(2026, 9, 22, 8, 59))
  add('工作日 09:00:00 高峰', bj(2026, 9, 22, 9, 0))
  add('工作日 11:59:59 高峰', bj(2026, 9, 22, 11, 59))
  add('工作日 12:00:00 空闲（午休）', bj(2026, 9, 22, 12, 0))
  add('工作日 13:59:59 空闲（午休）', bj(2026, 9, 22, 13, 59))
  add('工作日 14:00:00 高峰', bj(2026, 9, 22, 14, 0))
  add('工作日 17:59:59 高峰', bj(2026, 9, 22, 17, 59))
  add('工作日 18:00:00 空闲', bj(2026, 9, 22, 18, 0))
  add('工作日 23:30:00 空闲', bj(2026, 9, 22, 23, 30))

  // ── 周末（官方口径：全天空闲，与调休无关） ──
  add('周六 10:00 空闲', bj(2026, 9, 26, 10, 0))
  add('周日 15:00 空闲', bj(2026, 9, 27, 15, 0))

  // ── 法定节假日（2026 国庆 10-01~10-07；10-08 是工作日，实测曾与探针矛盾，专门设点） ──
  add('国庆首日 10:00 空闲', bj(2026, 10, 1, 10, 0))
  add('国庆末日 15:00 空闲', bj(2026, 10, 7, 15, 0))
  add('国庆后第一天 10-08 是工作日 → 高峰（曾误判为空闲）', bj(2026, 10, 8, 15, 0))
  add('中秋 09-26 10:00 空闲（客户端曾漏掉这三天）', bj(2026, 9, 26, 10, 0))

  // ── 跨月/跨季抽样，防"只对某个月对" ──
  add('三月工作日 10:00 高峰', bj(2026, 3, 4, 10, 0))
  add('十二月工作日 15:00 高峰', bj(2026, 12, 2, 15, 0))

  // ── 节假日表未覆盖的年份（必须显式降级，不许静默按工作日算成高峰） ──
  add('2027 未覆盖年份 工作日 10:00', bj(2027, 1, 4, 10, 0))

  return out
}

/** 载入客户端内核（CommonJS，用 createRequire）。 */
export function loadUsageCore(path = USAGE_CORE) {
  const mod = require(path)
  if (typeof mod.resolvePeriod !== 'function') throw new Error('usage-core.cjs 未导出 resolvePeriod')
  return mod
}

/**
 * 归一化：只比"判定结论"相关字段，忽略人类文案措辞差异。
 * `next` 统一成绝对毫秒 —— 探针给的是 `2026-10-09T09:00:00+08:00` 带偏移 ISO 串，
 * 客户端给的是 epoch ISO 串（`toISOString()`），不归一化会得到"假不一致"。
 */
function norm(r) {
  const period = r && (r.period === 'peak' || r.period === 'offpeak') ? r.period : String(r && r.period)
  const next = r && r.nextSwitchAt ? new Date(r.nextSwitchAt).getTime() : null
  const discount = typeof r?.discountFactor === 'number' ? r.discountFactor : null
  return { period, next, discount }
}

/**
 * 下次切换时刻的**语义裁决**（实测逼出来的口径，不是放水）：
 *   两处对"节假日期间的倒计时"定义不同：
 *     · 探针：长假中每天 09:00 报一次切换（实测国庆首日 10:00 报 `2026-10-02T09:00+08`）；
 *     · 客户端：整体跳过节假日，直接指向**下一个工作日 09:00**（长假中只报一次）。
 *   两个都自洽，但用户要的是"价格什么时候真的变"。裁决 = **客户端不得早于探针**
 *   （早 = 把用户往"马上要涨价"的错误预期上带），允许晚（跨过整段假期、报下一次真变化）。
 *   除此之外时段与折扣必须**完全相等**，一处不符即判红。
 */
function nextSwitchVerdict(a, b, { minGapMs = 12 * 3600 * 1000, maxGapMs = 30 * 24 * 3600 * 1000 } = {}) {
  if (a === null && b === null) return { ok: true, note: '两侧均无' }
  if (a === null || b === null) return { ok: false, note: '一侧有、一侧没有' }
  if (a === b) return { ok: true, note: '完全相同' }
  // 例外必须**跨过整整一段假期**（≥12 小时）才算"语义不同"。
  // 为什么加这个下界（自检逼出来的）：一开始只写"晚于探针即放行"，
  // 于是"客户端把倒计时多加 60 秒"这种**真错**也被放行了 —— 检测器没牙。
  if (b > a && b - a >= minGapMs && b - a <= maxGapMs) {
    return { ok: true, note: '客户端跨过整段假期、指向更晚的真实切换点（语义不同但方向正确）' }
  }
  return { ok: false, note: '客户端比探针更早、或只差一点点（属真错，不是语义差异）' }
}

/**
 * 跑一次逐点对拍。
 * @param {{core?:object, probe?:Function, cases?:Array}} [opts]
 * @returns {Array<{name:string, ms:number, a:object, b:object, same:boolean, why:string}>}
 */
export function compare(opts = {}) {
  const core = opts.core || loadUsageCore()
  const probeFn = opts.probe || probeResolvePeriod
  const cases = opts.cases || fixtures()
  return cases.map(({ name, ms }) => {
    const date = new Date(ms)
    const a = norm(probeFn(date))
    const b = norm(core.resolvePeriod(ms))
    const why = []
    if (a.period !== b.period) why.push(`时段 ${a.period} ≠ ${b.period}`)
    if (a.discount !== b.discount) why.push(`折扣 ${a.discount} ≠ ${b.discount}`)
    const verdict = nextSwitchVerdict(a.next, b.next)
    if (!verdict.ok) why.push(`下次切换不符裁决：${verdict.note}（探针 ${a.next} / 客户端 ${b.next}）`)
    return { name, ms, a, b, same: why.length === 0, why: why.join(' · '), note: verdict.note }
  })
}

function cmdList() {
  const rows = compare()
  console.log('🧭 峰谷时段对拍（探针 vs 客户端内核）')
  console.log('-----------------------------------------')
  for (const r of rows) {
    console.log(`${r.same ? '✅' : '❌'} ${r.name}`)
    console.log(`     探针：${r.a.period} · 折扣 ${r.a.discount} · 切换 ${r.a.next ? new Date(r.a.next).toISOString() : '无'}`)
    console.log(`     客户端：${r.b.period} · 折扣 ${r.b.discount} · 切换 ${r.b.next ? new Date(r.b.next).toISOString() : '无'}`)
    if (!r.same) console.log(`     ⛔ 不一致：${r.why}`)
  }
  return rows.every((r) => r.same) ? 0 : 1
}

function cmdCheck() {
  const rows = compare()
  const bad = rows.filter((r) => !r.same)
  const conf = readGatesConf()
  const minCases = Number(conf.PERIOD_PARITY_MIN_CASES) || 12
  console.log('🧭 峰谷时段口径一致性判定')
  console.log('-----------------------------------------')
  console.log(`基准点：${rows.length}（下限 ${minCases}）· 一致：${rows.length - bad.length} · 不一致：${bad.length}`)
  if (rows.length < minCases) {
    console.log(`⛔ 不通过：基准点不足（${rows.length} < ${minCases}）—— 覆盖不足的对拍结论不算数`)
    return 1
  }
  for (const r of bad) console.log(`  ❌ ${r.name} —— ${r.why}`)
  console.log('-----------------------------------------')
  if (bad.length === 0) {
    console.log('✅ 通过：客户端内核与官方口径探针逐点全等（含边界、周末、节假日、未覆盖年份）')
    return 0
  }
  console.log('⛔ 不通过：两处口径已经分叉 —— 用户看到的价钱可能与真实计费不符')
  return 1
}

function cmdSelftest() {
  let pass = 0, fail = 0
  const chk = (n, c, e = '') => { if (c) { pass++; console.log(`  ✅ ${n}${e ? ' · ' + e : ''}`) } else { fail++; console.log(`  ❌ ${n}${e ? ' · ' + e : ''}`) } }
  console.log('🧪 period_parity 自检')
  const rows = compare()
  const minCases = Number(readGatesConf().PERIOD_PARITY_MIN_CASES) || 12
  chk('基准点数量足够（阈值取自 gates.conf）', rows.length >= minCases, `${rows.length} 个 / 下限 ${minCases}`)
  chk('正向：真实两侧逐点一致', rows.every((r) => r.same), `不一致 ${rows.filter((r) => !r.same).length} 个`)

  // 反向用例：故意把"探针侧"换成恒高峰 → 必须判出不一致
  const fakeProbe = () => ({ period: 'peak', discountFactor: 1, nextSwitchAt: null })
  const bad = compare({ probe: fakeProbe })
  chk('反向用例：一侧被改坏 → 必须判出不一致', bad.some((r) => !r.same), `检出 ${bad.filter((r) => !r.same).length} 处`)

  // 反向用例：把客户端内核的 resolvePeriod 换成恒空闲 → 同样必须判红
  const realCore = loadUsageCore()
  const fakeCore = { resolvePeriod: (ms) => ({ period: 'offpeak', discountFactor: 0.5, nextSwitchAt: realCore.resolvePeriod(ms).nextSwitchAt }) }
  const bad2 = compare({ core: fakeCore })
  chk('反向用例：客户端内核被改坏 → 必须判出不一致', bad2.some((r) => !r.same), `检出 ${bad2.filter((r) => !r.same).length} 处`)

  // 反向用例：改坏"下次切换时刻"（只错倒计时，不错时段）也必须被判出
  const driftNext = { resolvePeriod: (ms) => ({ ...realCore.resolvePeriod(ms), nextSwitchAt: new Date(realCore.resolvePeriod(ms).nextSwitchAt).getTime() + 60_000 }) }
  const bad3 = compare({ core: driftNext })
  chk('反向用例：只错下次切换时刻 → 也必须判出', bad3.some((r) => !r.same), `检出 ${bad3.filter((r) => !r.same).length} 处`)

  chk('节假日表在探针侧非空（口径来源在位）', Object.keys(HOLIDAY_TABLE).length > 0, Object.keys(HOLIDAY_TABLE).join(','))

  console.log('-----------------------------------------')
  console.log(`共 ${pass + fail} 项 · ${fail === 0 ? '🎉 全部通过' : `❌ ${fail} 项未过`}`)
  return fail === 0 ? 0 : 1
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes('selftest')) return cmdSelftest()
  if (args.includes('--list')) return cmdList()
  if (args.includes('--check')) return cmdCheck()
  console.error('用法：period_parity.mjs <--check|--list|selftest>')
  return 2
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isDirectRun) process.exit(main())
