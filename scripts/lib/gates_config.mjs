/**
 * ==============================================================================
 * 门禁阈值配置读取器 (Gates Config Reader) —— REQ-090 / R1~R5
 * ==============================================================================
 * 为什么需要它：
 *   `ai-control/config/gates.conf` 在本工程的定位是**唯一调参入口**
 *   （见 `rules/system/output_standard.md` §六与 `rules/README.md` 收纳规范第 4 条）。
 *   但在此之前，只有 shell 侧（`control_gates.sh`）会读它，JS 判定器里的阈值是**写死的**
 *   —— 于是"规范里写的数字"和"判定器用的数字"可以各自漂移而无人发现，
 *   这正是本工程反复强调的"同一事实两种说法"。
 *
 * 本模块只做一件很小的事：把 gates.conf 读成对象。刻意不做的事：
 *   · 不做类型推断魔法（一律先给字符串，调用方按需 toNumber）；
 *   · 不缓存（配置文件改动要立即生效，读一次文件代价极低）；
 *   · 找不到文件或键时**返回调用方给的默认值**，绝不抛异常打断判定流程。
 * ==============================================================================
 */

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
/** 仓库根：scripts/lib/ → 上溯两级。 */
export const REPO_ROOT = join(HERE, '..', '..')
export const GATES_CONF = join(REPO_ROOT, 'ai-control', 'config', 'gates.conf')

/**
 * 解析 `KEY=VALUE` 形式的配置文件。
 * 规则（与 gates.conf 的实际写法一致）：
 *   · 以 `#` 开头或空白的行 → 注释，跳过；
 *   · 值可用双引号包裹，引号内允许空格（如 `"🟡 🟢 🔵 🔴"`）；
 *   · 行内 `#` 之后视为注释（仅当不在引号内）。
 * @param {string} text
 * @returns {Record<string,string>}
 */
export function parseGatesConf(text) {
  const out = {}
  for (const rawLine of String(text || '').split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    let value = line.slice(eq + 1).trim()
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1)
    } else {
      const hash = value.indexOf('#')
      if (hash >= 0) value = value.slice(0, hash).trim()
    }
    out[key] = value
  }
  return out
}

/** 读取并解析 gates.conf；文件缺失时返回空对象（由调用方走默认值）。 */
export function readGatesConf(file = GATES_CONF) {
  try {
    if (!existsSync(file)) return {}
    return parseGatesConf(readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

/**
 * 取一个配置项。
 * @param {string} key
 * @param {string} fallback 缺省值（**必须由调用方显式给定**，避免隐式魔法默认）
 * @param {Record<string,string>} [conf] 复用已读到的配置，省一次磁盘读取
 */
export function cfg(key, fallback, conf) {
  const c = conf || readGatesConf()
  const v = c[key]
  return v === undefined || v === '' ? fallback : v
}

/** 同上，但返回数字。 */
export function cfgNum(key, fallback, conf) {
  const n = Number(cfg(key, String(fallback), conf))
  return Number.isFinite(n) ? n : fallback
}

/* ── 反向用例：解析器也要能判红（否则配置读错了会静默走默认值）────────────── */
export function selfTest() {
  const cases = []
  const add = (name, got, expect) => cases.push({ name, got, expect, ok: JSON.stringify(got) === JSON.stringify(expect) })

  const parsed = parseGatesConf(`
# 注释行
OUT_SUMMARY_MAX_CHARS=30
OUT_BANNER_ICONS="🟡 🟢 🔵 🔴"
G3_DIRTY_LIMIT=30   # 行内注释
不合法行
=空键
`)
  add('普通键解析', parsed.OUT_SUMMARY_MAX_CHARS, '30')
  add('引号内空格保留', parsed.OUT_BANNER_ICONS, '🟡 🟢 🔵 🔴')
  add('行内注释被剥离', parsed.G3_DIRTY_LIMIT, '30')
  add('非法键不进入结果', parsed['不合法行'], undefined)
  add('空键不进入结果', parsed[''], undefined)
  add('注释行不进入结果', Object.keys(parsed).length, 3)

  const failed = cases.filter((c) => !c.ok)
  for (const c of cases) console.log(`${c.ok ? '✅' : '❌'} ${c.name}（实际 ${JSON.stringify(c.got)} / 期望 ${JSON.stringify(c.expect)}）`)
  console.log('-----------------------------------------')
  console.log(`共 ${cases.length} 项 · ${failed.length ? `❌ ${failed.length} 项未过` : '🎉 全部通过'}`)
  return failed.length ? 1 : 0
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())
if (invokedDirectly) {
  if (process.argv.includes('--self-test')) process.exit(selfTest())
  console.log(JSON.stringify(readGatesConf(), null, 2))
}
