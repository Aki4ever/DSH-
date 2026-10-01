#!/usr/bin/env node
/**
 * ==============================================================================
 * 脚本名称：token_budget_audit.mjs
 * 核心功能：管控机制**篇幅与 token 预算**审计 —— 能减不能涨，且减了不许掉能力
 * 需求依据：REQ-093 / R4「让管控机制在保持同等执行水准的情况下去优化 token 使用量，压缩篇幅」
 * ------------------------------------------------------------------------------
 * 为什么需要它：
 *   `token-economy-guard` 技能把"先测 → 裁剪 → 等价能力断言"的门禁链条写得很完整，
 *   三个原子脚本也都在位，但**没有任何受管对象**：管控机制本体（AGENTS.md / rules/ / indexes/ /
 *   ai-control/）从未被测量过，更没有基线，于是"这次改动是精简还是膨胀"根本无从判定。
 *   本脚本补上这条：给出基线、给出降幅、给出能力存活断言，并把"只许减不许涨"变成硬判据。
 *
 * 判据分两层（不混为一谈）：
 *   硬判据（--check 恒判）：
 *     ① 能力等价：`token_budget_cases.json` 里每条 requires 证据串必须全部存活（缺一即判红）；
 *     ② 篇幅不涨：任一受管文件不得超出基线（容差见配置 TOKEN_GROWTH_TOLERANCE），超了必须有豁免。
 *   目标项（--check --enforce-target 才判）：总降幅是否达到 TOKEN_TARGET_RATIO。
 *     —— 目标未达成时如实显示缺口，**不折算为通过**；但也不会伪装成"已达标"。
 *
 * 用法：
 *   node scripts/token_budget_audit.mjs --measure   # 测量并写入基线（首次或有意重置时用）
 *   node scripts/token_budget_audit.mjs --report    # 只看数字
 *   node scripts/token_budget_audit.mjs --check     # 判定（硬判据）
 *   node scripts/token_budget_audit.mjs --check --enforce-target   # 连目标降幅一起判
 *
 * 退出码：0 通过 · 1 判红 · 2 取不到证据
 * ==============================================================================
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const CONF = path.join(ROOT, 'ai-control/config/token_budget.conf')
const GROWTH_EXEMPT = path.join(ROOT, 'ai-control/config/token_budget_growth_exempt.txt')
const MEASURE = path.join(ROOT, 'skills/measure-token-budget/scripts/measure_tokens.py')
const VERIFY = path.join(ROOT, 'skills/verify-token-reduction/scripts/verify_reduction.py')

function loadConf() {
  const out = {}
  let txt = ''
  try {
    txt = fs.readFileSync(CONF, 'utf8')
  } catch {
    return null
  }
  for (const line of txt.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const m = t.match(/^([A-Z_]+)\s*=\s*"?([^"#]*)"?\s*$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

function measure(files) {
  try {
    const out = execFileSync('python3', [MEASURE, '--paths', ...files, '--json'], { cwd: ROOT, encoding: 'utf8' })
    return { ok: true, data: JSON.parse(out) }
  } catch (error) {
    return { ok: false, reason: (error && error.message) || '测量脚本不可用' }
  }
}

/**
 * 篇幅增长豁免：新增能力天然会让索引变长，但"变长"必须**书面说明**，不得静默放行。
 * 格式：<受管文件路径>|<为什么这次增长是合理的>
 */
function loadGrowthExempt() {
  const map = new Map()
  try {
    for (const line of fs.readFileSync(GROWTH_EXEMPT, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const [p, ...rest] = t.split('|')
      const reason = rest.join('|').trim()
      if (p && reason) map.set(p.trim(), reason)
    }
  } catch {
    /* 没有豁免文件就是"零豁免"，不是取不到证据 */
  }
  return map
}

function loadCases(file) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'))
    return Array.isArray(d.cases) ? d.cases : []
  } catch {
    return null
  }
}

/**
 * 反向用例自证：能力等价判据必须**有牙**。
 * 做法：故意把 after 语料换成"只剩标题、证据串全无"的文本，跑同一个判定器，
 * 若它仍然报"证据串全部存活"，说明这盏灯是恒亮的，本判定器不合格。
 */
function selfTest() {
  const conf = loadConf()
  if (!conf) {
    console.log('⛔ 取不到证据：token_budget.conf 不可读')
    return 2
  }
  const scope = conf.TOKEN_SCOPE.split(/\s+/).filter(Boolean)
  const casesFile = path.join(ROOT, conf.TOKEN_CASES_FILE || 'ai-control/config/token_budget_cases.json')
  const tmp = path.join(os.tmpdir(), `token_budget_selftest_${process.pid}.md`)
  fs.writeFileSync(tmp, '# 被掏空的语料\n\n证据串全部消失。\n', 'utf8')
  let out = null
  try {
    out = JSON.parse(execFileSync('python3', [VERIFY, '--before', ...scope, '--after', tmp, '--target', '0.0001', '--cases', casesFile, '--json'], { cwd: ROOT, encoding: 'utf8' }))
  } catch (error) {
    const raw = (error && error.stdout) || ''
    try {
      out = JSON.parse(raw)
    } catch {
      out = null
    }
  } finally {
    try { fs.rmSync(tmp, { force: true }) } catch { /* 清理失败不影响判定 */ }
  }
  const missing = (out && out.capability && out.capability.missing) || []
  const caught = missing.length > 0
  console.log('🧪 管控篇幅判定器 · 反向用例自检')
  console.log('-----------------------------------------')
  console.log(`   注入"被掏空的语料"（证据串全无）→ capability.missing = ${missing.length} 条`)
  console.log(`   判定结果：${caught ? '已判红（✅ 能力判据有牙）' : '未判红（❌ 能力判据是恒亮绿灯）'}`)
  console.log('-----------------------------------------')
  console.log(caught ? '✅ 反向用例通过：削减能力必被判红' : '⛔ 反向用例失败')
  return caught ? 0 : 1
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--self-test')) process.exit(selfTest())
  const conf = loadConf()
  if (!conf || !conf.TOKEN_SCOPE) {
    console.log(`⛔ 取不到证据：${path.relative(ROOT, CONF)} 缺失或未声明 TOKEN_SCOPE`)
    process.exit(2)
  }
  const scope = conf.TOKEN_SCOPE.split(/\s+/).filter(Boolean)
  const target = Number(conf.TOKEN_TARGET_RATIO ?? 0.3)
  const tol = Number(conf.TOKEN_GROWTH_TOLERANCE ?? 0.05)
  const baselineFile = path.join(ROOT, conf.TOKEN_BASELINE_FILE || 'ai-control/reports/state/token_budget.json')
  const casesFile = conf.TOKEN_CASES_FILE || 'ai-control/config/token_budget_cases.json'

  const m = measure(scope)
  if (!m.ok) {
    console.log(`⛔ 取不到证据：${m.reason}`)
    process.exit(2)
  }
  const current = m.data
  const perFile = new Map(current.items.map((i) => [i.path, i.tokens]))

  let baseline = null
  try {
    baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'))
  } catch {
    baseline = null
  }

  if (argv.includes('--measure')) {
    const next = {
      version: '1.0.0',
      at: new Date().toISOString(),
      note: '管控机制篇幅基线（REQ-093 / R4）。--check 以此判"只许减不许涨"。',
      targetRatio: target,
      total_tokens: current.total_tokens,
      total_bytes: current.total_bytes,
      items: current.items,
    }
    fs.mkdirSync(path.dirname(baselineFile), { recursive: true })
    fs.writeFileSync(baselineFile, JSON.stringify(next, null, 2))
    console.log(`📏 已记录篇幅基线：${current.total_tokens} tokens（${current.items.length} 个受管文件）`)
    console.log(`   目标降幅 ${(target * 100).toFixed(0)}% · 容差 ${(tol * 100).toFixed(0)}%`)
    process.exit(0)
  }

  const growthExempt = loadGrowthExempt()
  const cases = loadCases(casesFile)
  if (cases === null) {
    console.log(`⛔ 取不到证据：能力证据串文件不可读或结构非法：${casesFile}`)
    process.exit(2)
  }

  const issues = []
  const reports = []

  // 硬判据①：能力等价 —— 复跑既有判定器，不自己重写一遍证据串比对
  let verifyOut = null
  try {
    const beforeList = baseline ? baseline.items.map((i) => i.path) : scope
    verifyOut = JSON.parse(
      execFileSync('python3', [VERIFY, '--before', ...beforeList, '--after', ...scope, '--target', '0.0001', '--cases', path.join(ROOT, casesFile), '--json'], {
        cwd: ROOT,
        encoding: 'utf8',
      }),
    )
  } catch (error) {
    // verify_reduction 判红时退出码非 0，但 stdout 仍是合法 JSON —— 那是有结论的判红，不是取不到证据
    const out = (error && error.stdout) || ''
    try {
      verifyOut = JSON.parse(out)
    } catch {
      console.log(`⛔ 取不到证据：verify_reduction 输出不可解析：${(error && error.message) || ''}`)
      process.exit(2)
    }
  }
  if (!verifyOut || !verifyOut.capability || !Array.isArray(verifyOut.capability.missing)) {
    console.log(`⛔ 取不到证据：能力等价判定器没有真的跑起来（${(verifyOut && verifyOut.error) || '缺少 capability.missing 字段'}）`)
    console.log('   处置：这**不算通过** —— 恒绿的能力判据等于没有判据。')
    process.exit(2)
  }
  const missing = verifyOut.capability.missing
  if (missing.length) issues.push(`能力被削减：${missing.length} 条证据串丢失 → ${missing.slice(0, 8).join(' · ')}`)
  else reports.push(`能力等价：${cases.length} 条能力用例 · ${verifyOut.capability.cases_passed ?? cases.length}/${verifyOut.capability.cases_total ?? cases.length} 通过 · 证据串丢失 0 条`)

  // 硬判据②：篇幅不涨
  if (baseline) {
    for (const it of current.items) {
      const base = baseline.items.find((b) => b.path === it.path)
      if (!base) {
        reports.push(`🆕 新纳入受管：${it.path}（${it.tokens} tokens）—— 需重新 --measure 才纳入基线`)
        continue
      }
      const ratio = base.tokens === 0 ? 0 : (it.tokens - base.tokens) / base.tokens
      if (ratio > tol) {
        const why = growthExempt.get(it.path)
        const line = `篇幅膨胀：${it.path} ${base.tokens} → ${it.tokens} tokens（+${(ratio * 100).toFixed(1)}%，容差 ${(tol * 100).toFixed(0)}%）`
        if (why) reports.push(`📝 ${line} —— 已书面豁免：${why}`)
        else issues.push(line)
      }
    }
    const saved = (baseline.total_tokens - current.total_tokens) / baseline.total_tokens
    reports.push(`总降幅：${baseline.total_tokens} → ${current.total_tokens} tokens（${saved >= 0 ? '减' : '增'} ${Math.abs(saved * 100).toFixed(1)}%）`)
    if (saved + 1e-9 < target) {
      const gap = ((target - saved) * 100).toFixed(1)
      const line = `目标降幅 ${(target * 100).toFixed(0)}% 未达成：当前 ${(saved * 100).toFixed(1)}%，还差 ${gap} 个百分点`
      if (argv.includes('--enforce-target')) issues.push(line)
      else reports.push(`🎯 ${line}（未启用 --enforce-target，本项只报不判）`)
    } else {
      reports.push(`✅ 已达目标降幅 ${(target * 100).toFixed(0)}%`)
    }
  } else {
    reports.push('⚠️ 尚无基线：先跑 --measure 记录基线，否则"只许减不许涨"无从判定')
  }

  console.log('📐 管控机制篇幅与 token 预算审计')
  console.log('-----------------------------------------')
  console.log(`受管文件 ${current.items.length} 个 · 当前 ${current.total_tokens} tokens / ${current.total_bytes} 字节`)
  for (const it of current.items) {
    const base = baseline ? baseline.items.find((b) => b.path === it.path) : null
    const d = base ? it.tokens - base.tokens : null
    console.log(`   ${it.tokens.toString().padStart(6)} tok  ${d === null ? '   —   ' : (d > 0 ? `+${d}` : `${d}`).padStart(7)}  ${it.path}`)
  }
  console.log('')
  for (const r of reports) console.log(`   ${r}`)
  for (const i of issues) console.log(`   ⛔ ${i}`)
  console.log('-----------------------------------------')
  const pass = issues.length === 0
  console.log(pass ? '✅ 能力等价且篇幅未膨胀' : `⛔ 管控机制瘦身判红：${issues.length} 项`)
  process.exit(pass ? 0 : 1)
}

main()
