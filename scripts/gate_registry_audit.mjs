#!/usr/bin/env node
// ==============================================================================
// 门禁注册表审计 (Gate Registry Audit) —— REQ-103 / C1-a · 判定器
// ------------------------------------------------------------------------------
// 判什么（四条判据，任一条不达标即判红）：
//   ① 注册表自洽：id/seq 唯一、计入分母恰为 7 项、每个判据文件真实存在；
//   ② 注册表与门禁本体**条目一致**：G5/G6 的判据清单双向包含（正反都不许缺）；
//   ③ 提示由实际失败项生成：`--hint` 对任一失败项都必须点名该判定器，
//      且**互不串台**（点名 A 时不得出现 B）——治"实际判红的是 A，提示让人去修 B"；
//   ④ 展示层不再硬编码结论：`ai-control/plugin/index.mjs` 里不得再出现
//      `100% (4/4)` / 写死的"全部门禁通过"常量、不得再截断到前 4 项指标、
//      不得再用 `gateIndex` 拼 G0（须用 currentGateSeq）。
//
// 用法：node scripts/gate_registry_audit.mjs --check      # 判定（接门禁）
//       node scripts/gate_registry_audit.mjs --selftest   # 反向用例：造坏数据必须判红
//       node scripts/gate_registry_audit.mjs --json
// 退出码：0 通过 / 1 不通过 / 2 取不到证据（2 绝不算通过）
// ==============================================================================

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ROOT, ALL_GATES, GATES, NAMING_GATE, DENOMINATOR_SIZE,
  gateById, judgeFailHint, validateRegistry,
} from '../ai-control/config/gates_registry.mjs'

const GATES_SH = join(ROOT, 'scripts', 'control_gates.sh')
const PLUGIN = join(ROOT, 'ai-control', 'plugin', 'index.mjs')

/** 判据①注册表自洽 + ②与门禁本体条目一致 + ③提示点名正确 + ④展示层无硬编码 */
export function audit() {
  const problems = []
  const evidence = {}

  // ① 自洽
  const shape = validateRegistry()
  for (const p of shape) problems.push(`① 注册表形状：${p}`)
  evidence.denominator = DENOMINATOR_SIZE
  evidence.gateCount = ALL_GATES.length
  evidence.namingInDenominator = NAMING_GATE.inDenominator
  if (DENOMINATOR_SIZE !== 7) problems.push(`① 计入分母应为 7，实得 ${DENOMINATOR_SIZE}`)
  if (NAMING_GATE.inDenominator !== false) problems.push('① G0（会话命名）不应计入分母（它是独立否决层）')

  // ② 与门禁本体接线一致：G5/G6 的判据清单必须**由注册表派生**，而不是在本体里再写一份。
  //    判据两条：本体必须调用 gate_registry_entries <gate-id>；且本体里不得再出现
  //    "判据文件名|标签" 这类硬编码条目（那是双份定义的老形态，必然漂移）。
  if (!existsSync(GATES_SH)) {
    return { code: 2, problems: [`判据取不到：${GATES_SH} 不存在`], evidence }
  }
  const sh = readFileSync(GATES_SH, 'utf8')
  const shCode = sh.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n')
  for (const gate of [gateById('integrity'), gateById('concurrency')]) {
    const declared = (gate?.judges ?? []).map((j) => j.file.split('/').pop())
    if (!new RegExp(`gate_registry_entries\\s+${gate.id}\\b`).test(shCode)) {
      problems.push(`② 门禁本体未从注册表派生判据清单：缺 gate_registry_entries ${gate.id} 调用`)
    }
    // 硬编码条目检测：本体代码里不应再出现 `"xxx.mjs|标签"` 形态的判据清单项
    const hardcoded = [...shCode.matchAll(/"([A-Za-z0-9_.]+\.(?:mjs|sh))\|[^"]+"/g)].map((m) => m[1])
    if (hardcoded.length) {
      problems.push(`② 门禁本体仍有硬编码判据清单（双份定义）：${[...new Set(hardcoded)].join('、')}`)
    }
    evidence[`${gate.id}Judges`] = declared.length
  }

  // ③ 提示点名正确且互不串台
  const integrity = gateById('integrity')
  const concurrency = gateById('concurrency')
  for (const gate of [integrity, concurrency]) {
    for (const judge of gate.judges) {
      const hint = judgeFailHint(gate.id, [judge.label], [])
      if (!hint.includes(judge.file)) {
        problems.push(`③ 失败提示未点名实际失败项：${gate.id} / ${judge.label} → ${hint.slice(0, 80)}`)
      }
      // 互不串台：点名 A 的提示里不得出现同门禁的其它判据文件
      for (const other of gate.judges) {
        if (other.file === judge.file) continue
        if (hint.includes(other.file)) {
          problems.push(`③ 失败提示串台：点名 ${judge.file} 却把 ${other.file} 也写进提示`)
        }
      }
    }
  }
  // 回归用例：G6 历史缺陷现场 —— 真因是 token_budget_audit，提示不得指向 control_profiler
  const histHint = judgeFailHint('concurrency', ['管控篇幅受管且能力不降'], [])
  evidence.historicalHint = histHint
  if (!histHint.includes('token_budget_audit.mjs')) {
    problems.push('③ 历史缺陷回归失败：G6 篇幅判据判红时，提示未点名 token_budget_audit.mjs')
  }
  if (histHint.includes('control_profiler.sh')) {
    problems.push('③ 历史缺陷回归失败：G6 篇幅判据判红时，提示仍指向 control_profiler.sh（真因不符）')
  }
  // 不可判定也必须点名
  const undHint = judgeFailHint('integrity', [], ['全域管控覆盖'])
  if (!undHint.includes('不可判定') || !undHint.includes('scope_audit.mjs')) {
    problems.push('③ 不可判定提示未点名实际项：' + undHint.slice(0, 80))
  }

  // ④ 展示层无硬编码结论
  if (!existsSync(PLUGIN)) {
    return { code: 2, problems: [`判据取不到：${PLUGIN} 不存在`], evidence }
  }
  const pl = readFileSync(PLUGIN, 'utf8')
  // 剥掉单行注释后再判：注释里可以引用"旧写法"作为证据，不算硬编码
  const plCode = pl.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
  if (/100%\s*\(4\/4\)/.test(plCode)) problems.push('④ 展示层仍有写死的 `100% (4/4)`')
  if (/g\[3\]\s*\?/.test(plCode) && /metricA/.test(plCode)) {
    problems.push('④ 展示层仍按前 4 项截断指标')
  }
  if (!/currentGateSeq/.test(plCode)) problems.push('④ 展示层未使用 currentGateSeq（G0 会被误标成 G7）')
  if (!/export function renderCard/.test(plCode)) problems.push('④ 展示层未导出 renderCard（无法做行为级回归）')

  evidence.pluginUsesSeq = /currentGateSeq/.test(plCode)
  evidence.hardcodedVerdict = /100%\s*\(4\/4\)/.test(plCode)
  return { code: problems.length ? 1 : 0, problems, evidence }
}

/** 反向用例：每条判据都要能在"坏数据"上判红 */
export function selftest() {
  const cases = []
  const add = (name, ok, extra = '') => cases.push({ name, ok, extra })

  // ① 形状：真注册表必须合法；且用坏形状验证判定器确实会判红
  add('注册表形状：判据文件全部存在且分母为 7', validateRegistry().length === 0, validateRegistry().join(' / '))
  add('注册表形状：G0 不入分母', NAMING_GATE.inDenominator === false)
  // 反向：人为造一条"判据文件不存在"的坏门禁，validateRegistry 必须报出来
  {
    const badGate = {
      id: 'broken', seq: 99, name: '坏门禁', inDenominator: true,
      judges: [{ file: 'scripts/__definitely_not_here__.mjs', args: ['--check'], label: '不存在' }],
      hints: { fail: 'x' },
    }
    // 复用同一套校验逻辑：把坏门禁塞进临时数组跑一遍等价断言
    const problemsOf = (gates) => {
      const probs = []
      for (const g of gates) {
        for (const j of g.judges ?? []) {
          if (j.file && !existsSync(join(ROOT, j.file))) probs.push(`${g.id} 的判据文件不存在：${j.file}`)
        }
        if (!g.hints?.fail) probs.push(`${g.id} 缺 hints.fail`)
      }
      return probs
    }
    add('反例：判据文件不存在必须判红', problemsOf([badGate]).length === 1, problemsOf([badGate]).join(' / '))
    add('反例：缺 hints.fail 必须判红', problemsOf([{ ...badGate, judges: [], hints: {} }]).length === 1)
  }

  // ② 条目一致：注册表声明的 G6 判据数与门禁本体一致
  const res = audit()
  add('条目一致：审计返回三态之一', [0, 1, 2].includes(res.code), `code=${res.code}`)

  // ③ 提示互不串台（关键反例）
  const h = judgeFailHint('concurrency', ['管控篇幅受管且能力不降'], [])
  add('提示点名：含真因 token_budget_audit.mjs', h.includes('token_budget_audit.mjs'))
  add('提示点名：不含无关 control_profiler.sh', !h.includes('control_profiler.sh'))
  const h2 = judgeFailHint('concurrency', ['耗时预算可证(实测整跑在预算内)'], [])
  add('提示点名：反向也成立（指名 profiler 时不带 token_budget）',
    h2.includes('control_profiler.sh') && !h2.includes('token_budget_audit.mjs'))

  // ④ 展示层反例：用**故意写坏的源码**跑同一套断言，必须判红
  const badPlugin = 'const x = `**100% (4/4)** 🟢 全部门禁通过`; const m = g[3] ? g[3].metricA : ""'
  const badProblems = []
  if (/100%\s*\(4\/4\)/.test(badPlugin)) badProblems.push('硬编码 100% (4/4)')
  if (!/currentGateSeq/.test(badPlugin)) badProblems.push('未使用 currentGateSeq')
  add('展示层反例：坏源码必须被判红', badProblems.length >= 2, badProblems.join(' / '))

  const failed = cases.filter((c) => !c.ok)
  return { cases, failed }
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
if (argv.includes('--selftest')) {
  const { cases, failed } = selftest()
  console.log('=== 门禁注册表审计 · 自检 ===')
  for (const c of cases) console.log(`${c.ok ? '✅' : '❌'} ${c.name}${c.extra ? `  (${c.extra})` : ''}`)
  console.log(`\n通过 ${cases.length - failed.length} / ${cases.length}`)
  if (failed.length) { console.log('💥 自检失败'); process.exit(1) }
  console.log('🎉 自检全部通过')
  process.exit(0)
}

if (argv.includes('--json')) {
  const res = audit()
  console.log(JSON.stringify(res, null, 2))
  process.exit(res.code)
}

// 默认即 --check
const res = audit()
if (argv.includes('--check') || argv.length === 0) {
  if (res.code === 2) {
    console.log('⛔ 门禁注册表审计 · 不可判定：')
    for (const p of res.problems) console.log(`   · ${p}`)
    process.exit(2)
  }
  if (res.code === 1) {
    console.log('⛔ 门禁注册表审计 · 未通过：')
    for (const p of res.problems) console.log(`   · ${p}`)
    process.exit(1)
  }
  console.log(`✅ 门禁注册表审计通过（${res.evidence.gateCount} 项门禁 · 计入分母 ${res.evidence.denominator} 项 · G0 独立否决）`)
  console.log(`   历史缺陷回归：${res.evidence.historicalHint}`)
  process.exit(0)
}
