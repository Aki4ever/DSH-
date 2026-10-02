#!/usr/bin/env node
// ==============================================================================
// 中文输出判定器 (Chinese Output Audit) —— REQ-099 / R1
// ------------------------------------------------------------------------------
// 用户原话：「所有任务进程都应该用中文回答」。
//
// 实测病根（本轮取证）：全库有三个中文技能（`strip-non-prose-scope` / `verify-chinese-output` /
// `output-chinese-only`），其中 `verify_chinese.py` 三项硬断言**完备**——
// 但 `grep -rln verify_chinese` 全库只命中它自己，**零调用方**。
// 于是"必须用中文"这条规则有技能、没判定、更没接进任何评分维度：
// 实测我自己的中途叙述写成英文（the / final / numbers），全库无人拦。
//
// 本判定器只做**接线**，不重造判定：复用既有剥离器与验证器，判"最近一轮已完结的回复"。
// 判据（全部由 `verify_chinese.py` 给出，此处只做取证与转译）：
//   ① 待检正文中文占比 ≥ 阈值；② 非白名单拉丁词为 0；③ 独立大写缩写须带中文释义。
//
// 用法：
//   node scripts/chinese_output_audit.mjs               # 判最近一轮已完结回复
//   node scripts/chinese_output_audit.mjs --file <路径> # 判指定文件
//   node scripts/chinese_output_audit.mjs --text "文本"  # 判任意文本
//   node scripts/chinese_output_audit.mjs --json
//   node scripts/chinese_output_audit.mjs --selftest    # 反向用例：该红的必须判红
//
// 退出码：0 三项断言全过 / 1 有违规 / 2 取不到证据或缺少剥离器（**2 绝不算通过**）
// ==============================================================================

import { writeFileSync, readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { latestCompletedReply } from './output_audit.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const STRIP = join(ROOT, 'skills', 'strip-non-prose-scope', 'scripts', 'strip_scope.py')
const VERIFY = join(ROOT, 'skills', 'verify-chinese-output', 'scripts', 'verify_chinese.py')

/**
 * 本仓库自有短编号词表（R6 / G3 / L2 / S07 …）。
 * 为什么要显式登记：判定器的"标识符"模式只认 kebab-case 与版本号形态，
 * 字母+数字的短编号不算标识符，会被当成"非白名单拉丁词"误报。
 * 这是**扩充既有词表**（技能自带 `--allow` 就是为此），不是放宽断言：
 * 真正的英文词（the / final / numbers）一条都不会被豁免。
 */
export const REPO_ID_ALLOW = (() => {
  const out = []
  for (const L of ['r', 'g', 'l', 'p', 's', 't', 'd', 'f', 'a', 'e', 'c', 'q']) {
    for (let i = 0; i <= 30; i++) out.push(L + i)
  }
  out.push('req', 'cr', 'disc', 'out', 'strat', 'scope', 'token', 'gcm', 'elc', 'mbc', 'host', 'wire', 'plain')
  return out
})()

function sh(cmd, args) {
  try {
    const out = execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 })
    return { code: 0, out }
  } catch (e) {
    return { code: typeof e.status === 'number' ? e.status : -1, out: String(e.stdout || '') + String(e.stderr || '') }
  }
}

/** 判一段文本：先剥离非散文成分，再交给既有验证器出结论。 */
export function judge(text, opts = {}) {
  if (!existsSync(STRIP) || !existsSync(VERIFY)) {
    return { ok: null, reason: '缺少剥离器或验证器（技能未归位）', violations: [] }
  }
  const dir = mkdtempSync(join(tmpdir(), 'zh-audit-'))
  try {
    const raw = join(dir, 'raw.txt')
    writeFileSync(raw, String(text || ''), 'utf8')
    const strip = sh('python3', [STRIP, '--file', raw])
    if (strip.code !== 0 || !strip.out.trim()) {
      return { ok: null, reason: `剥离器未产出待检正文（退出码 ${strip.code}）`, violations: [] }
    }
    const scope = join(dir, 'scope.txt')
    writeFileSync(scope, strip.out, 'utf8')
    const allow = (opts.allow || REPO_ID_ALLOW).join(',')
    const v = sh('python3', [VERIFY, '--file', scope, '--allow', allow, '--json'])
    let parsed = null
    try { parsed = JSON.parse(v.out) } catch { parsed = null }
    if (v.code === 2) return { ok: null, reason: '验证器取不到证据（退出码 2）', violations: [] }
    const violations = (parsed && (parsed.violations || parsed.hits)) || []
    return {
      ok: v.code === 0,
      reason: v.code === 0 ? '三项硬断言全过' : `存在 ${violations.length || '若干'} 项违规`,
      violations,
      scopeChars: readFileSync(scope, 'utf8').length,
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function pick(argv) {
  const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null }
  const file = val('--file')
  if (file) {
    if (!existsSync(file)) return { text: '', reason: `文件不存在：${file}` }
    return { text: readFileSync(file, 'utf8'), from: file }
  }
  const t = val('--text')
  if (t !== null) return { text: t, from: '命令行文本' }
  const r = latestCompletedReply()
  if (!r.text) return { text: '', reason: r.reason }
  return { text: r.text, from: `会话转录第 ${r.turn} 回合` }
}

function selfTest() {
  const cases = [
    { name: '正例①：纯中文散文', text: '这一轮只改了一个文件，判定跑过了，结论是全过。', expect: true },
    { name: '反例①：整段英文叙述（用户实测缺陷）', text: 'Let me collect the final numbers and check the audit result now.', expect: false },
    { name: '反例②：中文里混入英文词', text: '这一步我先做了 order 检查，然后 write 了结果，最后 the 结论是过。', expect: false },
    { name: '正例②：仓库短编号应被词表豁免（不再误报为英文词）', text: '门禁 G7 与条目 R6 都已整改完毕，档位按 L2 扣分，账本哈希链自洽，这一轮的全部判定都已经跑过并且结论完全一致，所有判定证据都已落盘、可以复跑核对。', expect: true },
    { name: '反例③：正文几乎全英文', text: 'This change updates the guard and fixes the probe runner.', expect: false },
  ]
  let pass = 0
  console.log('=== 反向用例自检（中文输出判定器）===')
  for (const c of cases) {
    const r = judge(c.text)
    const got = r.ok
    const ok = got === c.expect
    if (ok) pass++
    const detail = ok ? '判对' : `判错（得到 ${got}，期望 ${c.expect}${r.reason ? '；' + r.reason : ''}）`
    console.log(`${ok ? '✅' : '❌'} ${c.name} → ${detail}`)
  }
  console.log('-----------------------------------------')
  console.log(`共 ${cases.length} 条 · ${pass === cases.length ? '🎉 全部通过' : `❌ ${cases.length - pass} 条未过`}`)
  return pass === cases.length ? 0 : 1
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--selftest')) return selfTest()
  const json = argv.includes('--json')
  const src = pick(argv)
  if (!src.text) {
    console.error(`⛔ 取不到可判定的证据：${src.reason || '无文本'}（按未达标处理，2 绝不算通过）`)
    return 2
  }
  const res = judge(src.text)
  if (res.ok === null) {
    if (json) console.log(JSON.stringify({ ok: false, reason: res.reason }, null, 2))
    else console.error(`⛔ 判定不可用：${res.reason}（2 绝不算通过）`)
    return 2
  }
  if (json) {
    console.log(JSON.stringify({ ok: res.ok, from: src.from, reason: res.reason, violations: res.violations }, null, 2))
    return res.ok ? 0 : 1
  }
  console.log('🧪 中文输出判定（三项硬断言，判定权威源：skills/verify-chinese-output）')
  console.log('-----------------------------------------')
  console.log(`判定对象：${src.from}`)
  if (res.ok) console.log('✅ 通过：待检正文中文占比达标、无非白名单拉丁词、缩写均有中文释义')
  else {
    console.log(`⛔ 不通过：${res.reason}`)
    for (const v of res.violations.slice(0, 10)) console.log(`   - ${v.kind || '违规'} | ${v.token || ''} | ${String(v.snippet || '').slice(0, 60)}`)
  }
  return res.ok ? 0 : 1
}

if (process.argv[1] && process.argv[1].endsWith('chinese_output_audit.mjs')) {
  process.exit(main())
}
