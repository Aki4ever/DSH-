'use strict';
/**
 * usage-core.cjs — dsh-plugin-usage-bar 的纯函数内核（宿主与客户端共用）。
 *
 * 为什么单独一份：客户端 bundle 不能 require 本地文件（宿主只提供 seed 模块），
 * 所以逻辑必须被内联进 lib/client.js。内联就会产生「两份实现」，
 * 因此用 build_client.py 把这份文件整体注入模板，并断言 sha256 摘要一致。
 *
 * 口径来源（官方，2026-09-29 核实）：
 *   · 高峰时段 = 北京时间周一至周五（不含中国法定节假日）09:00-12:00、14:00-18:00；
 *   · 其余时段（含周末与法定节假日全天）为空闲时段；
 *   · 空闲价 = 高峰价 × 50%；
 *   · 官方**不提供**任何"当前是否优惠时段"的接口或字段 → 必须本地按时区计算。
 */

/** 2026 年中国法定节假日（月-日，含元旦/春节/清明/劳动/端午/国庆与中秋）。
 *  来源：国务院办公厅关于 2026 年部分节假日安排的通知（国办发明电〔2025〕7 号）。
 *  调休上班日（周末被调成工作日）官方口径本身仍属"周末→空闲"，故此处不单列。 */
const HOLIDAYS_2026 = [
  '01-01', '01-02', '01-03',
  '02-15', '02-16', '02-17', '02-18', '02-19', '02-20', '02-21',
  '04-04', '04-05', '04-06',
  '05-01', '05-02', '05-03', '05-04', '05-05',
  '06-19', '06-20', '06-21',
  '10-01', '10-02', '10-03', '10-04', '10-05', '10-06', '10-07', '10-08'
];
const HOLIDAY_YEARS = [2026];

function pad2(n) { return (n < 10 ? '0' : '') + n; }

/** 把绝对毫秒转成北京时间的各字段（用 UTC getter + 8 小时偏移，不依赖 Intl 与本地时区）。 */
function beijingParts(ms) {
  const d = new Date(ms + 8 * 3600 * 1000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: d.getUTCDay(), // 0=周日
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes()
  };
}

function mmdd(p) { return pad2(p.month) + '-' + pad2(p.day); }

function isHoliday(p) {
  if (HOLIDAY_YEARS.indexOf(p.year) === -1) return null; // 该年份未覆盖 → 显式返回 null，不假装知道
  return HOLIDAYS_2026.indexOf(mmdd(p)) !== -1;
}

function isWorkday(p) {
  if (p.weekday === 0 || p.weekday === 6) return false;
  return isHoliday(p) !== true;
}

/** 北京时间某天的 09:00 对应的绝对毫秒。 */
function dayStart9(ms) {
  const p = beijingParts(ms);
  const utcMidnight = Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0) - 8 * 3600 * 1000;
  return utcMidnight + 9 * 3600 * 1000;
}

/** 判定当前时段，并算出下一次切换时刻。 */
function resolvePeriod(nowMs) {
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  const p = beijingParts(now);
  const uncovered = HOLIDAY_YEARS.indexOf(p.year) === -1;
  const suffix = uncovered ? '（' + p.year + ' 节假日表未覆盖，按工作日规则判定）' : '';

  const holiday = isHoliday(p);
  const workday = isWorkday(p);
  const h = p.hour;
  let peak = false;
  let reason = '';
  let next = null;

  if (holiday === true) {
    reason = '法定节假日全天空闲' + suffix;
  } else if (!workday) {
    reason = '周末全天空闲' + suffix;
  } else if (h >= 9 && h < 12) {
    peak = true; reason = '工作日高峰 09:00-12:00' + suffix;
  } else if (h >= 12 && h < 14) {
    reason = '工作日午间空闲 12:00-14:00' + suffix;
  } else if (h >= 14 && h < 18) {
    peak = true; reason = '工作日高峰 14:00-18:00' + suffix;
  } else if (h < 9) {
    reason = '工作日夜间空闲 18:00-次日 09:00' + suffix;
  } else {
    reason = '工作日夜间空闲 18:00-次日 09:00' + suffix;
  }

  // 下一次**价格真正发生变化**的时刻。
  // 首版实现按 09/12/14/18 找"下一个刻度"，实测把周末的 18:00 也算成切换点 ——
  // 可周末全天空闲、价格根本不变，那个倒计时是假的。现在改为按"当前波段的终点"推导。
  const base = dayStart9(now);
  const today9 = base, today12 = base + 3 * 3600 * 1000;
  const today14 = base + 5 * 3600 * 1000, today18 = base + 9 * 3600 * 1000;
  if (peak && h < 12) {
    next = today12;                       // 上午高峰 → 12:00 转空闲
  } else if (peak) {
    next = today18;                       // 下午高峰 → 18:00 转空闲
  } else if (workday && h < 9) {
    next = today9;                        // 夜里 → 今天 09:00 转高峰
  } else if (workday && h >= 12 && h < 14) {
    next = today14;                       // 午间 → 今天 14:00 转高峰
  } else {
    next = nextWorkday9(now);             // 工作日夜里 / 周末 / 节假日 → 下一个工作日 09:00
  }

  return {
    period: peak ? 'peak' : 'offpeak',
    periodLabel: peak ? '高峰时段' : '空闲时段',
    discountFactor: peak ? 1 : 0.5,
    nextSwitchAt: new Date(next).toISOString(),
    nextSwitchAtBeijing: formatBeijing(next),
    nextSwitchInSeconds: Math.max(0, Math.round((next - now) / 1000)),
    reason: reason,
    holidayTableYear: uncovered ? null : p.year
  };
}

/** 从"明天 09:00"起找第一个工作日 09:00（周末与法定节假日整体跳过）。 */
function nextWorkday9(nowMs) {
  let cursor = dayStart9(nowMs) + 24 * 3600 * 1000;
  for (let d = 0; d < 21; d++) {
    const p = beijingParts(cursor);
    if (isWorkday(p) === true) return cursor;
    cursor += 24 * 3600 * 1000;
  }
  return cursor; // 21 天内必有一个工作日；兜底也返回一个确定值，不返回 null
}

function formatBeijing(ms) {
  const p = beijingParts(ms);
  return p.year + '-' + pad2(p.month) + '-' + pad2(p.day) + ' ' + pad2(p.hour) + ':' + pad2(p.minute);
}

function humanizeSeconds(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  if (h > 0) return h + ' 小时 ' + m + ' 分';
  if (m > 0) return m + ' 分 ' + r + ' 秒';
  return r + ' 秒';
}

module.exports = {
  HOLIDAYS_2026: HOLIDAYS_2026,
  HOLIDAY_YEARS: HOLIDAY_YEARS,
  beijingParts: beijingParts,
  isWorkday: isWorkday,
  isHoliday: isHoliday,
  resolvePeriod: resolvePeriod,
  formatBeijing: formatBeijing,
  humanizeSeconds: humanizeSeconds
};
