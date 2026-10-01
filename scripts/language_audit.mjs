#!/usr/bin/env node
/**
 * ==============================================================================
 * 文字可读性判定器 (Language Audit) —— REQ-090 / R4 的物理载体
 * ==============================================================================
 * 为什么需要它（实测根因，2026-10-01）：
 *   「杜绝生僻字、通俗直白」这条要求在工程里**写了至少 7 处**
 *   （元规则第三条 / 语言标准 §四 / 多处 README），但**脚本里零检测**——
 *   全库检索「生僻」得到的全是散文式要求，没有一行判定代码。
 *   这直接违反元规则第三十六条：「无判定手段的'必须'一律不得写入规则」。
 *   换句话说：这不是"加个新功能"，而是**补一条已有规则的判定缺口**。
 *
 * 判定口径（严格区分"硬判据"与"报告项"，遵循本工程既有铁律）：
 *   · 生僻字     → **硬判据**（基准是国标字表，出处外部、可复现，不是自造阈值）
 *   · 黑话命中   → 报告项（"哪些词算黑话"没有外部权威边界，当硬门等于自行发明阈值）
 *   · 超长句     → 报告项（同上：多少字算"句子太长"因人而异，只报数不判红）
 *
 * 判定基准（唯一出处，禁止在本文件里另写字表）：
 *   · `data/common_chars.txt`            —— GB2312-1980 基本集 6763 字，由生成器推导
 *   · `data/common_chars_allowlist.txt`  —— 逐条书面豁免（如「啰」）
 *
 * 用法：
 *   node scripts/language_audit.mjs --check            # 判最近一轮已完结的助手回复（默认）
 *   node scripts/language_audit.mjs --text "待判文本"   # 判任意文本
 *   node scripts/language_audit.mjs --file <路径>      # 判单个文件
 *   node scripts/language_audit.mjs --root <目录>      # 全量扫描（README/文档等存量对齐用）
 *   node scripts/language_audit.mjs --json             # 机器可读
 *   node scripts/language_audit.mjs --self-test        # 反向用例：必须能判红
 * 退出码：0 达标；1 命中生僻字；2 **取不到证据**（绝不算通过）
 * ==============================================================================
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { latestCompletedReply } from './output_audit.mjs'
import { loadCommonChars } from './gen_common_chars.mjs'
import { readGatesConf, cfg, cfgNum, REPO_ROOT } from './lib/gates_config.mjs'

export const ALLOWLIST_FILE = join(REPO_ROOT, 'data', 'common_chars_allowlist.txt')

/** 判定范围内的汉字（CJK 统一表意文字基本区）。 */
const HANZI = /[\u4e00-\u9fa5]/
const HANZI_G = /[\u4e00-\u9fa5]/g

/** 扫描 root 时纳入的文件后缀（与冗余扫描同一批受管文本类型）。 */
const SCAN_EXTS = new Set(['.md', '.mjs', '.cjs', '.js', '.sh', '.json', '.txt', '.py'])
const SCAN_SKIP_DIRS = new Set(['.git', 'node_modules', '.cache', '.dsh_locks'])

/** 读取豁免清单（`#` 后为理由；每行取第一个汉字）。 */
export function loadAllowlist(file = ALLOWLIST_FILE) {
  const set = new Set()
  if (!existsSync(file)) return set
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const code = line.split('#')[0]
      for (const ch of code) if (HANZI.test(ch)) set.add(ch)
    }
  } catch {
    /* 清单读不到就只认基准字表：宁可严一点，也不能因为读不到清单就放行 */
  }
  return set
}

/** 去掉代码块与行内代码：命令、路径、代码里出现什么字符都不算"文章用字"。 */
export function stripCode(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
}

/**
 * 核心判定（纯函数，可单测）。
 * @param {string} text 待判文本
 * @param {{common:Set<string>, allow:Set<string>, jargon:string[], longSentenceChars:number, rareMax:number}} cfgIn
 */
export function languageChecks(text, cfgIn) {
  const body = stripCode(text)
  const common = cfgIn.common
  const allow = cfgIn.allow
  const jargon = cfgIn.jargon

  // ① 生僻字（硬判据）
  const rareMap = new Map()
  for (const ch of body) {
    if (!HANZI.test(ch)) continue
    if (common.has(ch) || allow.has(ch)) continue
    rareMap.set(ch, (rareMap.get(ch) || 0) + 1)
  }
  const rareChars = [...rareMap.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ char: c, count: n }))
  const rareOk = rareChars.length <= cfgIn.rareMax

  // ② 黑话命中（报告项）
  const jargonHits = jargon
    .map((w) => ({ word: w, count: w ? body.split(w).length - 1 : 0 }))
    .filter((h) => h.count > 0)

  // ③ 超长句（报告项）：以中文句读与换行切段，统计每段汉字数
  const segments = body.split(/[。！？；!?;\n]+/).map((s) => (s.match(HANZI_G) || []).length)
  const longSentences = segments.filter((n) => n > cfgIn.longSentenceChars).length
  const maxSentence = segments.length ? Math.max(...segments) : 0

  return {
    rareChars,
    rareOk,
    rareTotal: rareChars.reduce((n, r) => n + r.count, 0),
    jargonHits,
    longSentences,
    maxSentence,
    bodyHanzi: (body.match(HANZI_G) || []).length,
    gatePass: rareOk,
  }
}

/** 组装一次判定的运行时基准（字表 + 豁免 + 阈值）。 */
export function buildBench(conf) {
  const c = conf || readGatesConf()
  const table = loadCommonChars()
  if (!table.ok) return { ok: false, reason: table.reason }
  return {
    ok: true,
    common: table.set,
    allow: loadAllowlist(),
    jargon: cfg('LANG_JARGON_BLACKLIST', '', c).split(/\s+/).filter(Boolean),
    longSentenceChars: cfgNum('LANG_LONG_SENTENCE_CHARS', 60, c),
    rareMax: cfgNum('LANG_RARE_CHAR_MAX', 0, c),
    tableSize: table.size,
  }
}

function scanRoot(root) {
  const hits = []
  const walk = (dir) => {
    let entries = []
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (SCAN_SKIP_DIRS.has(e.name)) continue
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        walk(p)
        continue
      }
      if (!SCAN_EXTS.has(extname(e.name))) continue
      let t = ''
      try {
        t = readFileSync(p, 'utf8')
      } catch {
        continue
      }
      const bench = scanRoot.bench
      const rareMap = new Map()
      for (const ch of stripCode(t)) {
        if (!HANZI.test(ch)) continue
        if (bench.common.has(ch) || bench.allow.has(ch)) continue
        rareMap.set(ch, (rareMap.get(ch) || 0) + 1)
      }
      if (rareMap.size) {
        hits.push({ file: p.slice(root.length + 1), chars: [...rareMap.keys()].join(''), count: rareMap.size })
      }
    }
  }
  walk(root)
  return hits
}

/* ── 反向用例：判定器必须先能判红 ───────────────────────────────────────────── */
/* 夹具里的"库外汉字"一律写成 \uXXXX 转义：本文件自身也在 `--root .` 的全库扫描范围内，
 * 直接写实名会让检测器把自己的测试夹具判成违规（自指假阳性）。 */
const FIXTURE = {
  out1: '\u9f98', // 库外
  out2: '\u579a', // 库外
  in1: '\u5570',  // 已书面豁免
  in2: '\u9608',  // 在字表内
}
export function selfTest() {
  const bench = buildBench()
  if (!bench.ok) {
    console.log(`⛔ 无法自检：${bench.reason}`)
    return 2
  }
  const cases = []
  const add = (name, got, expect) => cases.push({ name, got, expect, ok: got === expect })

  add('纯通用字 → 判过', languageChecks('这是一段完全通用的中文说明文字。', bench).rareOk, true)
  add('注入库外字（U+9F98）→ 判红', languageChecks(`这段里有${FIXTURE.out1}字。`, bench).rareOk, false)
  add('注入库外字（U+579A）→ 判红', languageChecks(`名字里有${FIXTURE.out2}。`, bench).rareOk, false)
  add('书面豁免字（U+5570）→ 判过', languageChecks(`这件事说来${FIXTURE.in1}嗦。`, bench).rareOk, true)
  add('技术常字（阈值 U+9608）→ 判过', languageChecks(`阈${FIXTURE.in2}值与渲染、耦合关系。`, bench).rareOk, true)
  add('代码块内出现库外字 → 不计入正文', languageChecks(`正文正常。\n\`\`\`\n${FIXTURE.out1}\n\`\`\`\n`, bench).rareOk, true)
  add('行内代码出现库外字 → 不计入正文', languageChecks(`正文正常 \`${FIXTURE.out1}\` 结束。`, bench).rareOk, true)
  add('黑话命中被报出（但不判红）', languageChecks('我们要对齐一下颗粒度。', bench).jargonHits.length > 0, true)
  add('黑话命中不影响判定结果', languageChecks('我们要对齐一下颗粒度。', bench).gatePass, true)
  add('超长句被报出（但不判红）', languageChecks(`${'字'.repeat(120)}。`, bench).longSentences, 1)
  add('超长句不影响判定结果', languageChecks(`${'字'.repeat(120)}。`, bench).gatePass, true)

  const failed = cases.filter((c) => !c.ok)
  for (const c of cases) console.log(`${c.ok ? '✅' : '❌'} ${c.name}（实际 ${JSON.stringify(c.got)} / 期望 ${JSON.stringify(c.expect)}）`)
  console.log('-----------------------------------------')
  console.log(`基准字表：${bench.tableSize} 字 · 豁免清单 ${bench.allow.size} 字 · 黑话词 ${bench.jargon.length} 个`)
  console.log(`共 ${cases.length} 项 · ${failed.length ? `❌ ${failed.length} 项未过` : '🎉 全部通过'}`)
  return failed.length ? 1 : 0
}

function main() {
  const argv = process.argv.slice(2)
  const args = new Set(argv)
  if (args.has('--self-test')) process.exit(selfTest())

  const JSON_MODE = args.has('--json')
  const pick = (flag) => {
    const i = argv.indexOf(flag)
    return i >= 0 ? argv[i + 1] : null
  }

  const bench = buildBench()
  if (!bench.ok) {
    console.log(`⛔ 判定基准不可用：${bench.reason}`)
    process.exit(2)
  }

  // ── 模式 1：全量扫描（存量对齐用）────────────────────────────────────────
  const root = pick('--root')
  if (root) {
    const target = root === '.' ? REPO_ROOT : root
    scanRoot.bench = bench
    const hits = scanRoot(target)
    if (JSON_MODE) {
      console.log(JSON.stringify({ mode: 'root', root: target, files: hits.length, hits, ok: hits.length === 0 }, null, 2))
    } else {
      console.log('🧪 全库生僻字扫描')
      console.log('-----------------------------------------')
      console.log(`基准字表：${bench.tableSize} 字（GB2312 基本集）· 书面豁免 ${bench.allow.size} 字`)
      if (!hits.length) console.log('✅ 全库未发现 GB2312 之外的汉字')
      else {
        console.log(`⛔ ${hits.length} 个文件含 GB2312 之外的汉字：`)
        for (const h of hits.slice(0, 40)) console.log(`   · ${h.file} → ${h.chars}`)
      }
    }
    process.exit(hits.length ? 1 : 0)
  }

  // ── 模式 2/3/4：文本 / 文件 / 最近回复 ──────────────────────────────────
  const textArg = pick('--text')
  const fileArg = pick('--file')
  let text = ''
  let source = ''
  if (textArg !== null) {
    text = textArg
    source = '命令行文本'
  } else if (fileArg) {
    if (!existsSync(fileArg)) {
      console.log(`⛔ 文件不存在：${fileArg}`)
      process.exit(2)
    }
    text = readFileSync(fileArg, 'utf8')
    source = fileArg
  } else {
    const r = latestCompletedReply(process.env.DSH_SESSION_ID)
    if (!r.text) {
      if (JSON_MODE) console.log(JSON.stringify({ ok: false, reason: r.reason }, null, 2))
      else {
        console.log('🧪 文字可读性判定 · 未采集')
        console.log('-----------------------------------------')
        console.log(`⛔ 取不到可判定的证据：${r.reason}`)
        console.log('   处置：这**不算通过**。也可用 --text / --file 直接指定待判对象。')
      }
      process.exit(2)
    }
    text = r.text
    source = `第 ${r.turn} 回合助手回复`
  }

  const res = languageChecks(text, bench)
  if (JSON_MODE) {
    console.log(JSON.stringify({ ok: res.gatePass, source, benchSize: bench.tableSize, ...res }, null, 2))
  } else {
    console.log('🧪 文字可读性判定 · 基准来自国标字表，不采信自述')
    console.log('-----------------------------------------')
    console.log(`判定对象：${source}`)
    console.log(`判定基准：GB2312 基本集 ${bench.tableSize} 字 + 书面豁免 ${bench.allow.size} 字`)
    console.log(
      res.rareOk
        ? `   ✅ [判据] 生僻字 0 个（正文 ${res.bodyHanzi} 汉字）`
        : `   ⛔ [判据] 生僻字 ${res.rareChars.length} 种 / 共 ${res.rareTotal} 次：${res.rareChars.slice(0, 20).map((r) => `${r.char}×${r.count}`).join(' ')}`,
    )
    console.log(
      res.jargonHits.length
        ? `   📊 [报告项] 黑话命中 ${res.jargonHits.length} 词：${res.jargonHits.map((h) => `${h.word}×${h.count}`).join(' ')}（报告项不判红）`
        : '   📊 [报告项] 黑话命中 0 词',
    )
    console.log(`   📊 [报告项] 超长句 ${res.longSentences} 句（最长 ${res.maxSentence} 汉字，阈值 ${bench.longSentenceChars}，报告项不判红）`)
    console.log('-----------------------------------------')
    console.log(res.gatePass ? '✅ 通过：全篇无生僻字' : '⛔ 不通过：正文含 GB2312 之外的汉字')
  }
  process.exit(res.gatePass ? 0 : 1)
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())
if (invokedDirectly) main()
