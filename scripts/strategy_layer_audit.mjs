#!/usr/bin/env node
// ==============================================================================
// 策略层表达判定器 (Strategy-Layer Output Audit) —— REQ-097 / R2
// ------------------------------------------------------------------------------
// 用户原话：「输出的东西要聚焦算法层面的策略层，输出必须以人为本，以大白话的形式输出，
//            简单明了无生僻字，拒绝输出人看不懂的机器语言」。
//
// 实测病根（2026-10-02 只读取证）：
//   `output_audit.mjs` 七个硬判据全是**形状与字数**；`language_audit.mjs` 唯一硬门是**生僻字**；
//   全库 `grep 策略层|算法层` = 0 命中，`grep 机器语言` = 0 处判据。于是"把机器日志甩给用户"
//   在物理上**无人拦**——规则有文字，没有载体。
//
// 本判定器只做两件**客观可判**的事（语义好坏机器判不了，绝不装判得了）：
//   判据一（硬）· 结论先行：首屏 `STRAT_CONCLUSION_SCAN_LINES` 行内必须有结论行
//                （`一句话总结` 或 `结论`，且该行汉字 ≥4）——与 output_standard 同口径，不另立定义；
//   判据二（硬）· 正文零机器原文：**代码块与行内代码之外**的正文里，不得裸出现机器原文——
//                堆栈行 / JSON 片段行 / `exit code: N` 行 / 日志时间戳行 / 键值对密集行；
//                （用代码标记包起来的是"给机器看的"，明确豁免；裸甩给用户看的才是问题）
//   判据三（报告项，不判红）· 动作层锚点与超长英文：有没有"下一步/建议"这类可照做的信号。
//                为什么只报不判：哪些词算"讲清楚了"没有外部权威边界，硬门即自造阈值。
//
// 用法：
//   node scripts/strategy_layer_audit.mjs --check              # 判最近一轮已完成回复
//   node scripts/strategy_layer_audit.mjs --file <路径>        # 判指定文件
//   node scripts/strategy_layer_audit.mjs --text "待判文本"     # 判任意文本
//   node scripts/strategy_layer_audit.mjs --selftest           # 反向用例：该红的必须判红
//   node scripts/strategy_layer_audit.mjs --json
//
// 退出码：0 两条硬判据全过 / 1 存在不达标 / 2 取不到证据（**2 绝不算通过**）
// ==============================================================================

import { readFileSync, existsSync } from 'node:fs'
import { latestCompletedReply } from './output_audit.mjs'
import { readGatesConf, cfg, cfgNum } from './lib/gates_config.mjs'

const HANZI = /[\u4e00-\u9fa5]/g

/** 剥掉围栏代码块与行内代码：这些是"给机器看的"，判据二明确豁免。 */
export function stripCode(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/`[^`\n]*`/g, ' ')
}

/** 逐行识别"裸机器原文"。返回命中行（含行号与类型）。 */
export function machineResidueLines(text) {
  const hits = []
  const lines = String(text || '').split(/\r?\n/)
  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    const kinds = []
    if (/^at\s+\S+.*\(\S*:\d+:\d+\)/.test(line) || /^(TypeError|ReferenceError|SyntaxError|RangeError|Error)\s*:/.test(line)) kinds.push('堆栈行')
    if (line.length >= 20 && /^[\[{]/.test(line) && /[\]}]$/.test(line)) kinds.push('JSON 片段行')
    if (/(^|\s)exit code\s*[:：]?\s*\d+/i.test(line)) kinds.push('退出码行')
    if (/^\[?\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(line)) kinds.push('日志时间戳行')
    if ((line.match(/"[^"\n]{1,24}"\s*:/g) || []).length >= 2) kinds.push('键值对密集行')
    if (kinds.length) hits.push({ line: i + 1, kinds, text: line.slice(0, 80) })
  })
  return hits
}

/** 判据一：首屏结论行。 */
export function conclusionCheck(text, scanLines) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const window = lines.slice(0, scanLines)
  const hit = window.find((l) => /一句话总结|结论/.test(l) && (l.match(HANZI) || []).length >= 4)
  return {
    ok: Boolean(hit),
    at: hit ? lines.indexOf(hit) + 1 : null,
    detail: hit ? `首屏第 ${lines.indexOf(hit) + 1} 个非空行给出结论` : `前 ${scanLines} 个非空行内没有结论行（一句话总结/结论，且汉字 ≥4）`,
  }
}

/** 判据三：动作层锚点（报告项）与超长英文词行（报告项）。 */
export function reportItems(text, anchors) {
  const bare = stripCode(text)
  const anchorHits = anchors.filter((w) => w && bare.includes(w))
  const longAscii = bare.split(/\r?\n/).filter((l) => /[A-Za-z_][A-Za-z0-9_.-]{23,}/.test(l)).length
  return { anchorHits, longAscii }
}

export function judge(text, conf) {
  const c = conf || readGatesConf()
  const scanLines = cfgNum('STRAT_CONCLUSION_SCAN_LINES', 6, c)
  const maxMachine = cfgNum('STRAT_MACHINE_MAX_LINES', 0, c)
  const anchors = cfg('STRAT_ANCHOR_WORDS', '', c).split(/\s+/).filter(Boolean)

  const bare = stripCode(text)
  const residue = machineResidueLines(bare)
  const concl = conclusionCheck(text, scanLines)
  const report = reportItems(text, anchors)

  const checks = [
    { name: '判据一 · 结论先行', ok: concl.ok, detail: concl.detail },
    {
      name: '判据二 · 正文零机器原文',
      ok: residue.length <= maxMachine,
      detail:
        residue.length === 0
          ? '正文（代码块外）无堆栈/JSON/退出码/日志时间戳/键值对密集行'
          : `${residue.length} 行裸机器原文（上限 ${maxMachine}）：` + residue.map((r) => `第${r.line}行[${r.kinds.join('/')}]`).join('、'),
    },
  ]
  const failed = checks.filter((x) => !x.ok)
  return {
    ok: failed.length === 0,
    machineMax: maxMachine,
    checks,
    report: { ...report, residue },
  }
}

// ── 证据来源 ──────────────────────────────────────────────────────────────────
function pickText(argv) {
  const val = (flag) => {
    const i = argv.indexOf(flag)
    return i >= 0 ? argv[i + 1] : null
  }
  const file = val('--file')
  if (file) {
    if (!existsSync(file)) return { text: '', reason: `文件不存在：${file}` }
    return { text: readFileSync(file, 'utf8'), reason: null, from: file }
  }
  const t = val('--text')
  if (t !== null) return { text: t, reason: null, from: '命令行文本' }
  const r = latestCompletedReply()
  if (!r.text) return { text: '', reason: r.reason }
  return { text: r.text, reason: null, from: `会话转录第 ${r.turn} 回合` }
}

// ── 反向用例：该判红的必须判红 ────────────────────────────────────────────────
function selfTest() {
  const good = [
    '🟢 【实施完成态】',
    '**一句话总结**：三件事都已落盘并跑过判定。',
    '## 一、做了什么',
    '这条改动只碰一个文件，没动别的。',
  ].join('\n')
  const cases = [
    { name: '正例：结论先行且正文干净', text: good, expect: true },
    { name: '反例①：裸堆栈行', text: good + '\nat Object.<anonymous> (/tmp/a.mjs:12:9)', expect: false },
    { name: '反例②：裸 JSON 片段行', text: good + '\n{"verdict":"fail","hits":3,"file":"x.mjs"}', expect: false },
    { name: '反例③：裸退出码行', text: good + '\nexit code: 1', expect: false },
    { name: '反例④：裸日志时间戳行', text: good + '\n2026-10-02T00:10:31.201Z ERROR something failed', expect: false },
    { name: '反例⑤：键值对密集行', text: good + '\n"path": "a.mjs", "sha256": "abc", "bytes": 12', expect: false },
    { name: '反例⑥：结论埋在第 9 行', text: ['第一行说明', '第二行说明', '第三行说明', '第四行说明', '第五行说明', '第六行说明', '第七行说明', '第八行说明', '一句话总结：都在后面才说'].join('\n'), expect: false },
    { name: '正例②：代码块内的机器原文豁免', text: good + '\n```\nat Object.<anonymous> (/tmp/a.mjs:12:9)\n{"verdict":"fail"}\n```', expect: true },
  ]
  let pass = 0
  console.log('=== 反向用例自检（策略层表达判定器）===')
  for (const c of cases) {
    const res = judge(c.text)
    const ok = res.ok === c.expect
    if (ok) pass++
    const bad = res.checks.filter((x) => !x.ok).map((x) => x.name)
    console.log(`${ok ? '✅' : '❌'} ${c.name} → 判定 ${res.ok ? '通过' : '不通过'}${bad.length ? '（命中：' + bad.join('、') + '）' : ''}`)
  }
  console.log(`${pass}/${cases.length} 条用例通过`)
  return pass === cases.length ? 0 : 1
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--selftest')) return selfTest()
  const json = argv.includes('--json')
  const src = pickText(argv)
  if (!src.text) {
    console.error(`⛔ 取不到可判定的证据：${src.reason || '没有待判文本'}（按未达标处理，2 绝不算通过）`)
    return 2
  }
  const res = judge(src.text)
  if (json) {
    console.log(JSON.stringify({ ...res, from: src.from }, null, 2))
    return res.ok ? 0 : 1
  }
  console.log('🧪 策略层表达判定')
  console.log('-----------------------------------------')
  console.log(`判定对象：${src.from}`)
  for (const c of res.checks) console.log(`${c.ok ? '✅' : '❌'} ${c.name}：${c.detail}`)
  console.log(`📊 [报告项] 动作层锚点命中 ${res.report.anchorHits.length} 个${res.report.anchorHits.length ? '（' + res.report.anchorHits.join('、') + '）' : ''} · 超长英文行 ${res.report.longAscii} 行（仅报告，不判红）`)
  console.log('-----------------------------------------')
  console.log(res.ok ? '✅ 通过：结论先行、正文无裸机器原文' : '⛔ 不通过：见上述命中项')
  return res.ok ? 0 : 1
}

if (process.argv[1] && process.argv[1].endsWith('strategy_layer_audit.mjs')) {
  process.exit(main())
}
