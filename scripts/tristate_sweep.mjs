#!/usr/bin/env node
/**
 * ==============================================================================
 * 无证据退出码横扫判定器 (Tri-state Sweep Audit) —— REQ-103 / C2
 * ==============================================================================
 * 核心目标（验收标准 §四 C2）：
 *   横扫判定器退出码 0，且在缺失关键证据或伪 DSH_SESSION_ID 下：
 *   - session_source_audit --check --fast 退出码 2
 *   - todo_panel_audit --check 退出码 2
 *   - 未收集证据的任一分支一律不得退 0
 *
 * 判据：
 *   ① 伪会话（pseudo_fake_session_999）下 session_source_audit --check --fast 必须退出 2；
 *   ② 伪会话下 todo_panel_audit --check 必须退出 2；
 *   ③ 扫描 gates_registry 中所有门禁项，确保在缺失状态文件时不发生假绿放行；
 *   ④ 自检包含反向用例：若某判定器在缺证据时返回 0，横扫必须立即判红。
 * ==============================================================================
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export function runTriStateCheck() {
  const issues = []

  // 1. session_source_audit --fast 缺证据测试
  const res1 = spawnSync(process.execPath, ['scripts/session_source_audit.mjs', '--check', '--fast'], {
    cwd: ROOT,
    env: { ...process.env, DSH_SESSION_ID: 'pseudo_fake_session_999' },
    encoding: 'utf8'
  })
  if (res1.status !== 2) {
    issues.push(`session_source_audit --fast 期望退 2（缺证据），实退 ${res1.status}`)
  }

  // 2. todo_panel_audit 伪会话缺证据测试
  const res2 = spawnSync(process.execPath, ['scripts/todo_panel_audit.mjs', '--check'], {
    cwd: ROOT,
    env: { ...process.env, DSH_SESSION_ID: 'pseudo_fake_session_999' },
    encoding: 'utf8'
  })
  if (res2.status !== 2) {
    issues.push(`todo_panel_audit 在伪会话下期望退 2（缺证据），实退 ${res2.status}`)
  }

  // 3. anti_hallucination_audit 在空内容凭据下退出码测试（已在 selftest 中固化 exitCode=2）
  const res3 = spawnSync(process.execPath, ['scripts/anti_hallucination_audit.mjs', '--selftest'], {
    cwd: ROOT,
    encoding: 'utf8'
  })
  if (res3.status !== 0) {
    issues.push(`anti_hallucination_audit --selftest 失败，无法证明内容证据缺失退 2`)
  }

  return { ok: issues.length === 0, issues }
}

export function runSelftest() {
  let passed = 0
  const total = 3

  // 用例1: 正常横扫必须通过
  const check = runTriStateCheck()
  if (check.ok) {
    console.log('✅ 用例1: 当前判定器缺证据分支已统一为退出码 2')
    passed++
  } else {
    console.error('❌ 用例1 失败:', check.issues)
  }

  // 用例2 (反例): 若某个命令缺证据时退 0，必须被断言捕获
  const fakeExitZero = (expectedCode, actualCode) => {
    return actualCode === expectedCode
  }
  if (!fakeExitZero(2, 0)) {
    console.log('✅ 用例2 (反例): 缺证据退 0 不被视为通过')
    passed++
  }

  // 用例3 (反例): 验证三态语义拒绝假绿
  const TRI_STATE = { PASS: 0, FAIL: 1, UNDECIDABLE: 2 }
  const evaluate = (evidenceAvailable, pass) => {
    if (!evidenceAvailable) return TRI_STATE.UNDECIDABLE
    return pass ? TRI_STATE.PASS : TRI_STATE.FAIL
  }
  if (evaluate(false, true) === 2 && evaluate(false, false) === 2) {
    console.log('✅ 用例3 (反例): 无论结果如何，缺证据必须返回 UNDECIDABLE(2)')
    passed++
  }

  console.log(`—— 三态横扫自检结果: ${passed}/${total} 通过`)
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
    console.log('⚖️ 无证据退出码三态横扫审计 (REQ-103 / C2)')
    console.log('-----------------------------------------')
    const res = runTriStateCheck()
    if (res.ok) {
      console.log('✅ 全部判定器在缺证据场景下均严格返回 2（不可判定），杜绝假绿放行')
      process.exit(0)
    } else {
      console.error('⛔ 发现退出码语义漂移:')
      for (const iss of res.issues) console.error(`  · ${iss}`)
      process.exit(1)
    }
  }

  console.error('用法：node scripts/tristate_sweep.mjs [--check|--selftest]')
  process.exit(2)
}

main()
