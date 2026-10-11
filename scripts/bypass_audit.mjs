#!/usr/bin/env node
/**
 * ==============================================================================
 * 逃生舱绕过留痕审计判定器 (Bypass Audit) — REQ-103 / C3-c
 * ==============================================================================
 * 解决的问题（审计缺陷 D12 / 致命）：
 *   历史上 `DSH_CONTROL_GUARD=off` 与 `DSH_CONTROL_BYPASS=all` 直接 return，
 *   静默放行且零留痕。看板上"真过"与"被绕过"完全同形，人眼与审计无法分辨。
 *
 * 本判定器负责：
 *   1) 检验 `bypass.jsonl` 结构化日志规范性（存在记录时逐行验 schema）；
 *   2) 自检验证：设 `DSH_CONTROL_BYPASS=all` 后必须自动落盘留痕记录；
 *   3) 看板验真：绕过态下看板必须显式标注"本次管控已被绕过"。
 *
 * 用法：
 *   node scripts/bypass_audit.mjs --check
 *   node scripts/bypass_audit.mjs --selftest
 * 退出码：0 达标；1 判定不通过；2 参数错误
 * ==============================================================================
 */

import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { isBypassActive, recordBypass, renderCard } from '../ai-control/plugin/index.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const STATE_DIR = join(ROOT, 'ai-control', 'reports', 'state')
const BYPASS_FILE = join(STATE_DIR, 'bypass.jsonl')
const HOST_BYPASS_FILE = join(homedir(), '.dsh', '.dsh-control', 'bypass.jsonl')

export function auditBypassLogs() {
  const files = [BYPASS_FILE, HOST_BYPASS_FILE].filter(existsSync)
  let totalRecords = 0
  const malformed = []

  for (const f of files) {
    try {
      const content = readFileSync(f, 'utf8').trim()
      if (!content) continue
      const lines = content.split('\n').filter(Boolean)
      for (const [idx, l] of lines.entries()) {
        totalRecords++
        try {
          const rec = JSON.parse(l)
          if (!rec.at || !rec.reason || typeof rec.env !== 'object') {
            malformed.push({ file: f, line: idx + 1, err: '缺少关键字段 at/reason/env' })
          }
        } catch (e) {
          malformed.push({ file: f, line: idx + 1, err: 'JSON解析失败: ' + e?.message })
        }
      }
    } catch {}
  }

  return { ok: malformed.length === 0, totalRecords, malformed, filesChecked: files }
}

export function runSelftest() {
  let passed = 0
  const total = 5

  // 1. 正常环境不判定为绕过
  if (!isBypassActive({})) {
    console.log('✅ 用例1: 干净环境 isBypassActive 返回 false')
    passed++
  } else {
    console.error('❌ 用例1 失败')
  }

  // 2. DSH_CONTROL_BYPASS=all 识别为绕过
  if (isBypassActive({ DSH_CONTROL_BYPASS: 'all' })) {
    console.log('✅ 用例2: DSH_CONTROL_BYPASS=all 识别为绕过')
    passed++
  } else {
    console.error('❌ 用例2 失败')
  }

  // 3. DSH_CONTROL_GUARD=off 识别为绕过
  if (isBypassActive({ DSH_CONTROL_GUARD: 'off' })) {
    console.log('✅ 用例3: DSH_CONTROL_GUARD=off 识别为绕过')
    passed++
  } else {
    console.error('❌ 用例3 失败')
  }

  // 4. 反例用例：触发绕过动作必须写入 bypass.jsonl（不能静默丢弃）
  const tmp = mkdtempSync(join(tmpdir(), 'bypass-test-'))
  const origGuard = process.env.DSH_CONTROL_GUARD
  try {
    process.env.DSH_CONTROL_GUARD = 'off'
    recordBypass('selftest_bypass', { selftest: true }, tmp)
    const logPath = join(tmp, 'bypass.jsonl')
    if (existsSync(logPath)) {
      const lines = readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean)
      const last = JSON.parse(lines[lines.length - 1])
      if (last.reason === 'selftest_bypass' && last.env.DSH_CONTROL_GUARD === 'off') {
        console.log('✅ 用例4 (反例): 触发绕过时客观落盘 bypass.jsonl 且包含 reason 与 env 证据')
        passed++
      } else {
        console.error('❌ 用例4 内容不符:', last)
      }
    } else {
      console.error('❌ 用例4 期望生成日志文件但不存在:', logPath)
    }
  } finally {
    if (origGuard !== undefined) process.env.DSH_CONTROL_GUARD = origGuard
    else delete process.env.DSH_CONTROL_GUARD
    rmSync(tmp, { recursive: true, force: true })
  }

  // 5. 看板真实渲染：绕过态下看板必须明确输出警示，不得冒充全绿正常通过
  const mockStatus = {
    gatePassed: 7, gateTotal: 7, percent: 100, execAllowed: true,
    gates: [{ name: '项目初始化', status: 'pass' }]
  }
  const rendered = renderCard(mockStatus, '', [], true)
  if (rendered.includes('本次管控已被绕过') && rendered.includes('bypass.jsonl')) {
    console.log('✅ 用例5: 绕过态下看板显式输出警示标签与证据指向')
    passed++
  } else {
    console.error('❌ 用例5 看板未按预期渲染警示:', rendered)
  }

  console.log(`—— 绕过审计自检结果: ${passed}/${total} 通过`)
  return passed === total
}

function main() {
  const isCheck = process.argv.includes('--check')
  const isSelftest = process.argv.includes('--selftest')

  if (isSelftest) {
    const ok = runSelftest()
    process.exit(ok ? 0 : 1)
  }

  if (isCheck) {
    const res = auditBypassLogs()
    console.log('🛡️ 逃生舱绕过审计')
    console.log('-----------------------------------------')
    console.log(`检查文件数   : ${res.filesChecked.length}`)
    console.log(`历史绕过记录 : ${res.totalRecords} 条`)
    console.log(`非法格式记录 : ${res.malformed.length} 条`)
    if (res.malformed.length > 0) {
      for (const m of res.malformed) console.error(`  ❌ ${m.file}:${m.line} ${m.err}`)
    }
    console.log('-----------------------------------------')
    console.log(res.ok ? '✅ 绕过日志合法自洽（无畸形或静默破坏）' : '⛔ 绕过日志存在格式异常')
    process.exit(res.ok ? 0 : 1)
  }

  console.error('用法：node scripts/bypass_audit.mjs [--check|--selftest]')
  process.exit(2)
}

main()
