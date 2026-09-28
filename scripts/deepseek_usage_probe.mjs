#!/usr/bin/env node
/**
 * ==============================================================================
 * DeepSeek 用量探针 CLI  deepseek_usage_probe.mjs
 * ==============================================================================
 * 用法：
 *   node scripts/deepseek_usage_probe.mjs             # 人类可读中文摘要
 *   node scripts/deepseek_usage_probe.mjs --json      # 单个 JSON 对象
 *   node scripts/deepseek_usage_probe.mjs --check     # 判定：时段可判定 + 指纹可用 + JSON 结构完整
 *   node scripts/deepseek_usage_probe.mjs --price-sync# 单独触发一次定价指纹同步
 *
 * 退出码：0 成功 / 1 判定失败·数据不可用 / 2 用法错误。
 * 余额缺失（no-credential）属正常降级，**不**影响退出码。
 *
 * 官方事实（已核实，勿再臆测）：
 *   - 官方**无**时段接口 → 时段本地算（北京时间周一~周五 09:00-12:00、14:00-18:00 为高峰，
 *     其余含周末与法定节假日全天为空闲；空闲价 = 高峰价 × 50%）；
 *   - 官方**无**价格查询 API → 价位表本地维护（本探针只做「文档指纹」监控，不猜价位）；
 *   - 官方**不提供**法定节假日日历 → 本文件内置显式表（来源：国务院办公厅节假日安排，人工维护），
 *     未覆盖年份在 reason 里显式降级，绝不静默。
 *
 * 依赖：仅 node: 内置模块 + 全局 fetch。
 * ==============================================================================
 */

import {
  fetchBalance,
  describeApiKey,
  credentialSourceNames,
  maskSecrets,
} from './lib/deepseek_balance.mjs'
import {
  syncPricingFingerprint,
  pricingStatePath,
  PRICING_URLS,
} from './lib/pricing_fingerprint.mjs'

// ---------------------------------------------------------------------------
// 一、法定节假日显式内置表
// 来源：国务院办公厅《关于2026年部分节假日安排的通知》（国办发明电〔2025〕7号，
//       2025-11-04 发布，https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm）
//       —— 人工维护，官方不提供机器可读日历。
// 说明：表中只列**放假日期**（当天全天判空闲）。周末与法定节假日一律空闲，
//       因此「调休上班日」（2026：1/4、2/14、2/28、5/9、9/20、10/10）落在周末，
//       按官方口径本身就是空闲，不需要单列，也不改变判定结果。
// 未覆盖年份 → reason 追加「（{年份} 节假日表未覆盖，按工作日规则判定）」，不静默。
// ---------------------------------------------------------------------------
export const HOLIDAY_TABLE = {
  2026: {
    source: '国务院办公厅节假日安排（人工维护）·国办发明电〔2025〕7号',
    holidays: [
      // 元旦：1月1日（周四）至3日（周六），共3天
      '2026-01-01', '2026-01-02', '2026-01-03',
      // 春节：2月15日（周日）至23日（周一），共9天
      '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19',
      '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',
      // 清明节：4月4日（周六）至6日（周一），共3天
      '2026-04-04', '2026-04-05', '2026-04-06',
      // 劳动节：5月1日（周五）至5日（周二），共5天
      '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
      // 端午节：6月19日（周五）至21日（周日），共3天
      '2026-06-19', '2026-06-20', '2026-06-21',
      // 中秋节：9月25日（周五）至27日（周日），共3天
      '2026-09-25', '2026-09-26', '2026-09-27',
      // 国庆节：10月1日（周四）至7日（周三），共7天
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
      '2026-10-06', '2026-10-07',
    ],
  },
}

/** 节假日名称（仅用于人类可读/原因描述，缺失时不编造）。 */
const HOLIDAY_NAME_HINTS = [
  { name: '元旦', dates: ['2026-01-01', '2026-01-02', '2026-01-03'] },
  { name: '春节', dates: ['2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23'] },
  { name: '清明节', dates: ['2026-04-04', '2026-04-05', '2026-04-06'] },
  { name: '劳动节', dates: ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05'] },
  { name: '端午节', dates: ['2026-06-19', '2026-06-20', '2026-06-21'] },
  { name: '中秋节', dates: ['2026-09-25', '2026-09-26', '2026-09-27'] },
  { name: '国庆节', dates: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'] },
]

// ---------------------------------------------------------------------------
// 二、北京时间（Asia/Shanghai）取数工具 —— 不依赖服务器本地时区
// ---------------------------------------------------------------------------

/** 取北京时间的民用日期与时刻分量。 */
export function shanghaiParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '00'
  const y = Number(get('year'))
  const m = Number(get('month'))
  const d = Number(get('day'))
  const hh = Number(get('hour')) % 24
  const mm = Number(get('minute'))
  const ss = Number(get('second'))
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0=周日
  return { y, m, d, hh, mm, ss, weekday, dateKey: `${get('year')}-${get('month')}-${get('day')}`, minutesOfDay: hh * 60 + mm }
}

/** 民用日期 + 天数偏移（纯 UTC 运算，避免夏令时/本地时区干扰）。 */
function addDays({ y, m, d }, delta) {
  const t = new Date(Date.UTC(y, m - 1, d) + delta * 86400000)
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

/** 民用日期 → 日期键。 */
function keyOf({ y, m, d }) {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** 民用日期 → 星期（0=周日）。 */
function weekdayOf({ y, m, d }) {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** 北京时刻 → 绝对时间戳（北京时间固定 +08:00，无夏令时）。 */
function shanghaiInstant({ y, m, d }, hh, mm) {
  return Date.UTC(y, m - 1, d, hh - 8, mm, 0, 0)
}

/** 绝对时间戳 → 带 +08:00 偏移的 ISO 串。 */
function toShanghaiIso(instantMs) {
  const t = new Date(instantMs + 8 * 3600000)
  const p = (n) => String(n).padStart(2, '0')
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}T${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())}+08:00`
}

/** Date → 带 +08:00 偏移的 ISO 串。 */
export function dateToShanghaiIso(date) {
  return toShanghaiIso(date.getTime())
}

// ---------------------------------------------------------------------------
// 三、时段判定
// ---------------------------------------------------------------------------

/** 是否为法定节假日（含「年份未覆盖」标记）。 */
export function holidayInfo(dateKey) {
  const year = dateKey.slice(0, 4)
  const table = HOLIDAY_TABLE[year]
  if (!table) return { covered: false, isHoliday: false, year, source: null }
  const isHoliday = table.holidays.includes(dateKey)
  const hint = isHoliday ? HOLIDAY_NAME_HINTS.find((h) => h.dates.includes(dateKey)) : null
  return { covered: true, isHoliday, year, source: table.source, name: hint ? hint.name : null }
}

/** 是否为工作日（周一~周五且非法定节假日；**不含**调休上班日的特殊处理，官方口径周末即空闲）。 */
export function isWorkday(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const wd = weekdayOf({ y, m, d })
  if (wd === 0 || wd === 6) return false
  if (holidayInfo(dateKey).isHoliday) return false
  return true
}

/**
 * 判定当前时段。
 * @returns {{
 *   period: 'peak'|'offpeak', periodLabel: string, discountFactor: number,
 *   reason: string, nextSwitchAt: string, nextSwitchInSeconds: number, dateKey: string
 * }}
 */
export function resolvePeriod(date = new Date()) {
  const now = shanghaiParts(date)
  const todayKey = now.dateKey
  const hm = now.minutesOfDay
  const hol = holidayInfo(todayKey)
  const covered = hol.covered
  const wd = now.weekday
  const isWeekend = wd === 0 || wd === 6
  const isHoliday = hol.covered && hol.isHoliday

  const BOUNDS = {
    morningStart: 9 * 60,
    morningEnd: 12 * 60,
    afternoonStart: 14 * 60,
    afternoonEnd: 18 * 60,
  }

  /** 未覆盖年份的降级后缀（不静默）。 */
  const degradeSuffix = covered ? '' : `（${hol.year} 节假日表未覆盖，按工作日规则判定）`

  /** 找下一个工作日 09:00（严格往后找，跳过周末与法定节假日）。 */
  function nextWorkdayMorning(fromCivil) {
    let civil = fromCivil
    for (let i = 0; i < 400; i += 1) {
      civil = addDays(civil, 1)
      if (isWorkday(keyOf(civil))) return shanghaiInstant(civil, 9, 0)
    }
    // 理论上到不了这里（表未覆盖时最多连续 2 天周末）。
    return shanghaiInstant(addDays(fromCivil, 1), 9, 0)
  }

  const civil = { y: now.y, m: now.m, d: now.d }
  let period
  let reason
  let nextSwitchMs

  if (isWeekend) {
    period = 'offpeak'
    reason = '周末全天空闲'
    nextSwitchMs = nextWorkdayMorning(civil)
  } else if (isHoliday) {
    period = 'offpeak'
    reason = hol.name ? `法定节假日全天空闲（${hol.name}）` : '法定节假日全天空闲'
    nextSwitchMs = nextWorkdayMorning(civil)
  } else if (hm < BOUNDS.morningStart) {
    period = 'offpeak'
    reason = '工作日夜间空闲 18:00-次日 09:00'
    nextSwitchMs = shanghaiInstant(civil, 9, 0)
  } else if (hm < BOUNDS.morningEnd) {
    period = 'peak'
    reason = '工作日高峰 09:00-12:00'
    nextSwitchMs = shanghaiInstant(civil, 12, 0)
  } else if (hm < BOUNDS.afternoonStart) {
    period = 'offpeak'
    reason = '工作日午间空闲 12:00-14:00'
    nextSwitchMs = shanghaiInstant(civil, 14, 0)
  } else if (hm < BOUNDS.afternoonEnd) {
    period = 'peak'
    reason = '工作日高峰 14:00-18:00'
    nextSwitchMs = shanghaiInstant(civil, 18, 0)
  } else {
    period = 'offpeak'
    reason = '工作日夜间空闲 18:00-次日 09:00'
    nextSwitchMs = nextWorkdayMorning(civil)
  }

  const nextSwitchInSeconds = Math.round((nextSwitchMs - date.getTime()) / 1000)
  return {
    period,
    periodLabel: period === 'peak' ? '高峰时段' : '空闲时段',
    discountFactor: period === 'peak' ? 1 : 0.5,
    reason: `${reason}${degradeSuffix}`,
    nextSwitchAt: toShanghaiIso(nextSwitchMs),
    nextSwitchInSeconds,
    dateKey: todayKey,
  }
}

// ---------------------------------------------------------------------------
// 四、用量探针结果组装
// ---------------------------------------------------------------------------

const SCHEMA_KEYS = [
  'generatedAt', 'period', 'periodLabel', 'discountFactor', 'nextSwitchAt',
  'nextSwitchInSeconds', 'reason', 'balance', 'pricing',
]

/** 组装固定字段的探针结果对象（字段顺序固定，便于 diff）。 */
export async function buildProbeResult({ now = new Date(), timeoutMs = 20000 } = {}) {
  const period = resolvePeriod(now)
  const cred = describeApiKey()
  const bal = await fetchBalance({ timeoutMs })
  const fp = await syncPricingFingerprint({ timeoutMs, now })

  // 余额不可用时 `available=false` 且 source/errorKind 如实反映，禁止编造 items。
  const balance = {
    available: bal.ok,
    source: bal.source ?? (cred.found ? cred.source : null),
    isAvailable: bal.ok ? bal.isAvailable : null,
    items: bal.ok
      ? bal.balances.map((b) => ({
        currency: b.currency,
        totalBalance: b.totalBalance,
        grantedBalance: b.grantedBalance,
        toppedUpBalance: b.toppedUpBalance,
      }))
      : [],
    errorKind: bal.ok ? null : bal.errorKind,
    errorMessage: bal.ok ? null : bal.errorMessage,
  }

  const pricing = {
    fingerprint: fp.fingerprint,
    fetchedAt: fp.lastFetchedAt,
    changedToday: fp.changedToday,
    lastCheckedAt: fp.lastCheckedAt,
    sourceUrl: fp.sourceUrl ?? PRICING_URLS[0],
  }

  return {
    result: {
      generatedAt: dateToShanghaiIso(now),
      period: period.period,
      periodLabel: period.periodLabel,
      discountFactor: period.discountFactor,
      nextSwitchAt: period.nextSwitchAt,
      nextSwitchInSeconds: period.nextSwitchInSeconds,
      reason: period.reason,
      balance,
      pricing,
    },
    meta: {
      credential: cred,
      pricingOk: fp.ok,
      pricingError: fp.error,
      statePath: pricingStatePath(),
      pricingChanged: fp.changed,
      pricingInitialized: fp.initialized,
      changeCount: fp.changeCount,
      historyCount: fp.historyCount,
      etag: fp.etag,
      lastModified: fp.lastModified,
      errorKinds: [balance.errorKind].filter(Boolean),
    },
  }
}

// ---------------------------------------------------------------------------
// 五、判定（--check）
// ---------------------------------------------------------------------------
export function checkResult(result) {
  const failures = []
  // 判定 1：JSON 结构完整
  for (const k of SCHEMA_KEYS) {
    if (!(k in result)) failures.push(`JSON 结构缺失字段：${k}`)
  }
  if (typeof result.balance !== 'object' || result.balance === null) failures.push('balance 不是对象')
  if (typeof result.pricing !== 'object' || result.pricing === null) failures.push('pricing 不是对象')
  // 判定 2：时段可判定
  if (result.period !== 'peak' && result.period !== 'offpeak') failures.push(`时段不可判定：period=${String(result.period)}`)
  if (!result.reason || typeof result.reason !== 'string') failures.push('时段依据（reason）缺失')
  if (!Number.isFinite(result.nextSwitchInSeconds)) failures.push('nextSwitchInSeconds 不是有限数值')
  if (Number.isNaN(Date.parse(String(result.nextSwitchAt)))) failures.push('nextSwitchAt 不是合法 ISO 时间')
  // 判定 3：指纹可用
  if (!/^[0-9a-f]{64}$/.test(String(result.pricing.fingerprint ?? ''))) failures.push('定价指纹不可用（sha256 未取到）')
  return failures
}

// ---------------------------------------------------------------------------
// 六、人类可读输出
// ---------------------------------------------------------------------------
function humanDuration(seconds) {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const parts = []
  if (h) parts.push(`${h} 小时`)
  if (m) parts.push(`${m} 分`)
  parts.push(`${sec} 秒`)
  return parts.join(' ')
}

function printHuman(result, meta) {
  const b = result.balance
  console.log('==================== DeepSeek 用量探针 ====================')
  console.log(`生成时间(北京)   : ${result.generatedAt}`)
  console.log(`当前时段         : ${result.periodLabel}（${result.period}，折扣系数 ${result.discountFactor}）`)
  console.log(`判定依据         : ${result.reason}`)
  console.log(`下次切换         : ${result.nextSwitchAt}（还有 ${humanDuration(result.nextSwitchInSeconds)}）`)
  console.log('-----------------------------------------------------------')
  if (b.available) {
    console.log(`额度信息         : is_available=${String(b.isAvailable)}（来源 ${b.source}）`)
    for (const it of b.items) {
      console.log(`  · ${it.currency}  总余额 ${it.totalBalance} = 赠送 ${it.grantedBalance} + 充值 ${it.toppedUpBalance}`)
    }
  } else {
    console.log(`额度信息         : 不可用（errorKind=${b.errorKind}）`)
    console.log(`  · 原因         : ${b.errorMessage}`)
    const c = meta.credential
    console.log(`  · 凭据探测     : ${c.found ? `已找到（来源 ${c.source}，长度 ${c.length}）` : '未找到'}；已尝试 ${credentialSourceNames().join(' / ')}`)
    console.log('  · 说明         : 未配置 Key 属正常降级，不影响 --check 退出码，也绝不编造余额数字')
  }
  console.log('-----------------------------------------------------------')
  if (meta.pricingOk) {
    console.log(`定价指纹         : ${result.pricing.fingerprint}`)
    console.log(`  来源页         : ${result.pricing.sourceUrl}`)
    console.log(`  etag           : ${meta.etag ?? '(官方未返回)'}`)
    console.log(`  last-modified  : ${meta.lastModified ?? '(官方未返回)'}`)
    console.log(`  本次是否变化   : ${meta.pricingChanged ? '是（已追加 history）' : meta.pricingInitialized ? '否（首跑建立基线）' : '否'} · 今日是否变化：${result.pricing.changedToday ? '是' : '否'}`)
    console.log(`  最近校验       : ${result.pricing.lastCheckedAt} · 累计变化 ${meta.changeCount} 次 · history ${meta.historyCount} 条`)
    console.log(`  状态文件       : ${meta.statePath}`)
  } else {
    console.log(`定价指纹         : 不可用（抓取失败，保留上次状态，不伪造指纹）`)
    console.log(`  原因           : ${meta.pricingError}`)
    console.log(`  状态文件       : ${meta.statePath}`)
  }
  console.log('===========================================================')
}

// ---------------------------------------------------------------------------
// 七、CLI 入口
// ---------------------------------------------------------------------------
function usage() {
  console.log('用法：node scripts/deepseek_usage_probe.mjs [--json|--check|--price-sync]')
  console.log('  （无参数）     人类可读中文摘要：当前时段 + 倒计时 + 额度 + 定价指纹状态')
  console.log('  --json         输出单个 JSON 对象（字段固定）')
  console.log('  --check        判定「时段可判定 + 指纹可用 + JSON 结构完整」；余额缺失不算失败')
  console.log('  --price-sync   单独触发一次定价文档指纹同步，打印「有更新 / 无更新」')
  console.log('  --help         显示本帮助')
  console.log('退出码：0 成功 / 1 判定失败·数据不可用 / 2 用法错误')
}

async function main() {
  const args = process.argv.slice(2)
  const known = ['--json', '--check', '--price-sync', '--help', '-h']
  const unknown = args.filter((a) => !known.includes(a))
  if (unknown.length) {
    console.error(`用法错误：未知参数 ${unknown.join(' ')}`)
    usage()
    return 2
  }
  if (args.includes('--help') || args.includes('-h')) {
    usage()
    return 0
  }
  const modes = ['--json', '--check', '--price-sync'].filter((m) => args.includes(m))
  if (modes.length > 1) {
    console.error(`用法错误：${modes.join(' 与 ')} 互斥，一次只能用一个`)
    usage()
    return 2
  }

  // --price-sync：单独触发一次同步，只打印「有更新 / 无更新」，不重复跑余额探测。
  if (modes[0] === '--price-sync') {
    const now = new Date()
    const fp = await syncPricingFingerprint({ now })
    if (!fp.ok) {
      console.error(`❌ 定价指纹同步失败（数据不可用，已保留上次状态）：${fp.error}`)
      console.error(`   状态文件：${fp.statePath}（lastCheckedAt 未更新）`)
      return 1
    }
    const verb = fp.changed ? '有更新' : fp.initialized ? '无更新（首跑建立基线）' : '无更新'
    console.log(`定价指纹同步：${verb}`)
    console.log(`  来源页         : ${fp.sourceUrl}`)
    console.log(`  指纹(sha256)   : ${fp.fingerprint}`)
    console.log(`  etag           : ${fp.etag ?? '(官方未返回)'}`)
    console.log(`  last-modified  : ${fp.lastModified ?? '(官方未返回)'}`)
    console.log(`  本次校验时间   : ${fp.lastCheckedAt}（北京时间日期 ${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)}）`)
    console.log(`  累计变化次数   : ${fp.changeCount} · history ${fp.historyCount} 条 · 今日是否已变化：${fp.changedToday ? '是' : '否'}`)
    console.log(`  状态文件       : ${fp.statePath}`)
    return 0
  }

  if (modes[0] === '--check') {
    const { result, meta } = await buildProbeResult({})
    const failures = checkResult(result)
    const b = result.balance
    console.log('---- DeepSeek 用量探针判定 (--check) ----')
    console.log(`时段判定   : ${result.periodLabel} · ${result.reason} · 下次切换 ${result.nextSwitchAt}`)
    if (b.available) {
      console.log(`余额判定   : 已取到（来源 ${b.source}，is_available=${String(b.isAvailable)}，${b.items.length} 条币种记录）`)
    } else {
      console.log(`余额判定   : 缺失 · errorKind=${b.errorKind}（按约定不算失败，显式标注）`)
      console.log(`             原因：${b.errorMessage}`)
    }
    console.log(`定价指纹   : ${result.pricing.fingerprint ? `可用 ${result.pricing.fingerprint.slice(0, 16)}…` : '不可用'}`)
    if (!meta.pricingOk) console.log(`             抓取失败：${meta.pricingError}`)
    if (failures.length === 0) {
      console.log('判定结果   : 通过（时段可判定 + 指纹可用 + JSON 结构完整）')
      return 0
    }
    console.log('判定结果   : 失败')
    for (const f of failures) console.log(`  ✗ ${f}`)
    return 1
  }

  const { result, meta } = await buildProbeResult({})
  if (modes[0] === '--json') {
    console.log(JSON.stringify(result, null, 2))
  } else {
    printHuman(result, meta)
  }
  // 数据不可用（指纹取不到）→ 1；余额缺失不影响退出码。
  return meta.pricingOk ? 0 : 1
}

// 仅在被直接执行时跑 main（被 import 时只导出纯函数，便于单测/复用）。
const isDirectRun = process.argv[1] && process.argv[1].endsWith('deepseek_usage_probe.mjs')
if (isDirectRun) {
  main()
    .then((code) => {
      process.exitCode = code
    })
    .catch((err) => {
      console.error(`内部错误：${maskSecrets(String(err?.stack ?? err))}`)
      process.exitCode = 1
    })
}
