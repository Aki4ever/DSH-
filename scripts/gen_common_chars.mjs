#!/usr/bin/env node
/**
 * ==============================================================================
 * 常用字表生成器 (Common Chars Generator) —— REQ-090 / R4 的数据来源
 * ==============================================================================
 * 为什么必须"生成"而不是"我手写一份"：
 *   生僻字判定要客观，前提是字表有**外部权威出处**。如果由模型凭语感罗列常用字，
 *   那就是"自行发明阈值"——本工程明令禁止（元规则第二十六条：拒绝二手转述与主观宣称）。
 *
 * 字表出处（可复现、可核对）：
 *   **GB2312-1980《信息交换用汉字编码字符集·基本集》所收录的全部 6763 个汉字**
 *   （一级汉字 3755 个，区位 0xB0A1–0xD7FE；二级汉字 3008 个，区位 0xD8A1–0xF7FE）。
 *   它是中国大陆通用汉字的国家标准集合，也是"通用汉字"最经典、最稳定的口径。
 *
 * 为什么取 6763 而不是只取一级 3755（**实测校准，非拍脑袋**）：
 *   本仓库实测：仅用一级 3755 时，`渲染 / 耦合 / 阈值 / 浏览 / 骨骼 / 啰嗦` 等
 *   **正常技术用词会被误报为生僻字，共 35 个字种**；放宽到 GB2312 全集后降到 **1 个字种**
 *   （`啰`，见 data/common_chars_allowlist.txt 的书面豁免）。
 *   一个天天误报的检测器只会教会人忽略它——这与本工程已修掉的
 *   "G4 把契约标题判成冗余"是同一类假阳性事故。
 *
 * 用法：
 *   node scripts/gen_common_chars.mjs --apply     # 生成 / 覆盖 data/common_chars.txt
 *   node scripts/gen_common_chars.mjs --check     # 只校验磁盘字表与推导结果是否一致（漂移检测）
 *   node scripts/gen_common_chars.mjs --self-test # 反向用例：推导器本身也要能判红
 * 退出码：0 一致 / 通过；1 不一致或自检失败；2 运行环境不支持 GB2312 解码（不伪装成通过）
 * ==============================================================================
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const CHARS_FILE = join(ROOT, 'data', 'common_chars.txt')

/** GB2312 基本集的汉字区：高位 0xB0–0xF7，低位 0xA1–0xFE。 */
export const GB2312_RANGES = [
  { name: '一级汉字（常用）', hiStart: 0xb0, hiEnd: 0xd7, count: 3755 },
  { name: '二级汉字（次常用）', hiStart: 0xd8, hiEnd: 0xf7, count: 3008 },
]

/**
 * 用系统自带的 GB2312 解码器把区位码逐一还原成汉字。
 * 为什么用"解码"而不是硬编码一张表：表是死数据、无法自证；解码是**从国标编码空间推导**，
 * 任何人换台机器跑同一段代码都能得到同一结果——这才是可复现的出处。
 */
export function deriveCommonChars() {
  let dec
  try {
    dec = new TextDecoder('gb2312', { fatal: true })
  } catch {
    return { ok: false, reason: '本机 Node 不支持 GB2312 解码（ICU 不完整），拒绝用近似字表冒充权威字表' }
  }
  const levels = []
  const all = []
  for (const r of GB2312_RANGES) {
    const got = []
    for (let hi = r.hiStart; hi <= r.hiEnd; hi++) {
      for (let lo = 0xa1; lo <= 0xfe; lo++) {
        let ch = ''
        try {
          ch = dec.decode(Buffer.from([hi, lo]))
        } catch {
          continue
        }
        if (ch && ch.length === 1 && /[\u4e00-\u9fa5]/.test(ch)) got.push(ch)
      }
    }
    levels.push({ ...r, chars: got })
    all.push(...got)
  }
  return { ok: true, levels, all, unique: [...new Set(all)] }
}

/** 渲染字表文件正文（含出处抬头；每行 100 字，便于 diff 与人工抽查）。 */
export function renderCharsFile(derived) {
  const lines = []
  lines.push('# 通用汉字表（生僻字判定基准）—— REQ-090 / R4')
  lines.push('#')
  lines.push('# 出处：GB2312-1980《信息交换用汉字编码字符集·基本集》基本集全部汉字 6763 个')
  lines.push('#   一级汉字（常用）3755 个 · 二级汉字（次常用）3008 个')
  lines.push('# 生成器：node scripts/gen_common_chars.mjs --apply（**请勿手改本文件**）')
  lines.push('# 校验：node scripts/gen_common_chars.mjs --check（磁盘字表与推导结果不一致即退出码 1）')
  lines.push('# 判定器：node scripts/language_audit.mjs --check')
  lines.push('#')
  lines.push('# 为什么是 6763 而不是 3500/3755：实测本仓库仅用一级汉字时，')
  lines.push('# 「渲染/耦合/阈值/浏览/骨骼/啰嗦」等正常用词会被误报为生僻字（35 个字种）；')
  lines.push('# 采用基本集全集后误报降到 1 个字种（啰，已书面豁免见 common_chars_allowlist.txt）。')
  lines.push('#')
  for (const lv of derived.levels) {
    lines.push(`# ── ${lv.name}（${lv.chars.length} 个，实测与国标应录数 ${lv.count} ${lv.chars.length === lv.count ? '一致' : '不一致 ⚠️'}）`)
    for (let i = 0; i < lv.chars.length; i += 100) lines.push(lv.chars.slice(i, i + 100).join(''))
  }
  return lines.join('\n') + '\n'
}

/** 从字表文件里反解出字符集合（忽略 `#` 注释行与空白）。 */
export function parseCharsFile(text) {
  const out = new Set()
  for (const line of String(text || '').split('\n')) {
    if (!line || line.startsWith('#')) continue
    for (const ch of line) if (/[\u4e00-\u9fa5]/.test(ch)) out.add(ch)
  }
  return out
}

export function loadCommonChars(file = CHARS_FILE) {
  if (!existsSync(file)) return { ok: false, reason: `字表文件不存在：${file}` }
  const set = parseCharsFile(readFileSync(file, 'utf8'))
  if (!set.size) return { ok: false, reason: `字表文件为空或格式不可解析：${file}` }
  return { ok: true, set, size: set.size }
}

/* 反向用例里要用的"库外汉字"一律写成 \uXXXX 转义。
 * 为什么：本文件自身也在 `language_audit.mjs --root .` 的全库扫描范围内，
 * 直接写实名会让检测器把自己的测试夹具判成违规（**自指假阳性**）——
 * 这类假阳性本工程已踩过多次（G4 把契约标题判成冗余、G2 把 .DS_Store 判成垃圾）。 */
const OUT_OF_TABLE = { gong: '\u9f98', ben: '\u7287', biao: '\u730b', jiong: '\u56e7', yao: '\u579a' }
const IN_TABLE = { xuan: '\u6e32', yu: '\u9608', yan: '\u7131', han: '\u7113', shang: '\u71b5' }

/* ── 反向用例：生成器也要能判红（否则"字表对了"只是自我宣称）──────────────── */
export function selfTest() {
  const d = deriveCommonChars()
  if (!d.ok) {
    console.log(`⛔ 无法自检：${d.reason}`)
    return 2
  }
  const l1 = d.levels[0].chars.length
  const l2 = d.levels[1].chars.length
  const set = parseCharsFile(renderCharsFile(d))
  const cases = []
  const add = (name, got, expect) => cases.push({ name, got, expect, ok: got === expect })

  add('一级汉字数 = 3755', l1, 3755)
  add('二级汉字数 = 3008', l2, 3008)
  add('去重后总数 = 6763', d.unique.length, 6763)
  add('渲染 → 反解 不丢字', set.size, 6763)
  add('含常用字 U+6E32 渲 / U+9608 阈', set.has(IN_TABLE.xuan) && set.has(IN_TABLE.yu), true)
  // 「焱 U+7131 / 焓 U+7113 / 熵 U+71B5」实测**属于** GB2312（常被误当成生僻字），
  // 故反向锁定它们必须在表内，防止将来有人把字表改窄导致误伤。
  add('含 U+7131 焱（实测在表内，防误伤）', set.has(IN_TABLE.yan), true)
  add('含 U+7113 焓 / U+71B5 熵（科技术语，在表内）', set.has(IN_TABLE.han) && set.has(IN_TABLE.shang), true)
  add('不含库外 U+9F98', set.has(OUT_OF_TABLE.gong), false)
  add('不含库外 U+7287', set.has(OUT_OF_TABLE.ben), false)
  add('不含库外 U+730B', set.has(OUT_OF_TABLE.biao), false)
  add('不含库外 U+56E7', set.has(OUT_OF_TABLE.jiong), false)
  add('不含库外 U+579A', set.has(OUT_OF_TABLE.yao), false)
  add('注释行不被当成字表内容', parseCharsFile('# 啊阿埃\n埃').size, 1)

  const failed = cases.filter((c) => !c.ok)
  for (const c of cases) console.log(`${c.ok ? '✅' : '❌'} ${c.name}（实际 ${JSON.stringify(c.got)} / 期望 ${JSON.stringify(c.expect)}）`)
  console.log('-----------------------------------------')
  console.log(`共 ${cases.length} 项 · ${failed.length ? `❌ ${failed.length} 项未过` : '🎉 全部通过'}`)
  return failed.length ? 1 : 0
}

function main() {
  const args = new Set(process.argv.slice(2))
  if (args.has('--self-test')) process.exit(selfTest())

  const derived = deriveCommonChars()
  if (!derived.ok) {
    console.log(`⛔ ${derived.reason}`)
    process.exit(2)
  }
  const wanted = renderCharsFile(derived)

  if (args.has('--apply')) {
    mkdirSync(dirname(CHARS_FILE), { recursive: true })
    writeFileSync(CHARS_FILE, wanted, 'utf8')
    console.log(`💾 字表已写入：${CHARS_FILE}`)
    console.log(`   · 一级汉字 ${derived.levels[0].chars.length} 个 · 二级汉字 ${derived.levels[1].chars.length} 个 · 合计 ${derived.unique.length} 个`)
    process.exit(0)
  }

  // 默认即 --check：磁盘字表必须与现场推导逐字一致，否则判定基准已经漂移
  const onDisk = existsSync(CHARS_FILE) ? readFileSync(CHARS_FILE, 'utf8') : ''
  const diskSet = parseCharsFile(onDisk)
  const wantSet = new Set(derived.unique)
  const missing = [...wantSet].filter((c) => !diskSet.has(c))
  const extra = [...diskSet].filter((c) => !wantSet.has(c))
  if (!missing.length && !extra.length && onDisk === wanted) {
    console.log(`✅ 字表与国标推导一致：${diskSet.size} 个通用汉字（一级 ${derived.levels[0].chars.length} + 二级 ${derived.levels[1].chars.length}）`)
    process.exit(0)
  }
  console.log('⛔ 字表与 GB2312 推导不一致（判定基准已漂移）')
  console.log(`   · 磁盘 ${diskSet.size} 个 · 应录 ${wantSet.size} 个 · 缺 ${missing.length} 个 · 多 ${extra.length} 个`)
  if (missing.length) console.log(`   · 缺失示例：${missing.slice(0, 20).join('')}`)
  if (extra.length) console.log(`   · 多余示例：${extra.slice(0, 20).join('')}`)
  if (!missing.length && !extra.length) console.log('   · 字集一致但文本有差异（抬头/换行被改动）——请重新 --apply 生成')
  process.exit(1)
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())
if (invokedDirectly) main()
