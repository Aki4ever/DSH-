#!/usr/bin/env node
/**
 * ==============================================================================
 * 脚本登记表审计与生成判定器 (Script Registry Audit) —— REQ-103 / C6
 * ==============================================================================
 * 解决的问题（审计报告 P1 第五项）：
 *   95+ 管控脚本混在 scripts/，判据、工具、测试地位平等，无登记表；
 *   曾出现把 test_*.mjs / probe_*.mjs 误挂上关键门禁链的问题。
 *
 * 本判定器负责：
 *   --gen       扫描 scripts/ 实体，机械分析引用关系，自动生成覆盖 100% 脚本的登记表
 *   --check     四条判据：
 *               ① 覆盖率 100%：无遗漏脚本，无磁盘上已删除的幽灵脚本
 *               ② role 真实有据：role=judge 必须真被门禁或入口引用；role=legacy 若有引用必须判红
 *               ③ JSON 结构自洽：字段齐全、路径规范
 *               ④ 无重复条目
 *   --selftest  反向用例：构造坏数据必须判红，合法数据判绿
 * ==============================================================================
 */

import { readdirSync, existsSync, readFileSync, writeFileSync, statSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname, relative, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SCRIPTS_DIR = join(ROOT, 'scripts')
const REGISTRY_FILE = join(ROOT, 'ai-control', 'config', 'script_registry.json')

export const ROLES = ['judge', 'tool', 'test', 'legacy']

/** 递归获取 scripts/ 下所有脚本文件 */
export function scanScriptFiles(dir = SCRIPTS_DIR, base = SCRIPTS_DIR) {
  const result = []
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const ent of entries) {
    if (ent.name === '.DS_Store' || ent.name === '.git') continue
    const full = join(dir, ent.name)
    if (ent.isDirectory()) {
      result.push(...scanScriptFiles(full, base))
    } else if (ent.isFile()) {
      const ext = ent.name.split('.').pop()
      if (['mjs', 'sh', 'js', 'cjs', 'py', 'swift'].includes(ext)) {
        result.push(relative(base, full).replace(/\\/g, '/'))
      }
    }
  }
  return result.sort()
}

/** 查找文件在全仓中的引用 */
export function findReferences(relScriptPath, rootDir = ROOT) {
  const base = basename(relScriptPath)
  const fullRel = `scripts/${relScriptPath}`
  const refs = new Set()

  try {
    const out = execSync(`git grep --untracked -l -F "${base}" || true`, { cwd: rootDir, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
    for (const line of out.trim().split('\n').filter(Boolean)) {
      if (line !== fullRel) {
        refs.add(line)
      }
    }
  } catch {}

  return Array.from(refs).sort()
}

/** 判断脚本所属 role */
export function classifyRole(relPath, refs) {
  const b = basename(relPath)
  if (b.startsWith('test_') || b.startsWith('verify_') || b.startsWith('probe_')) {
    return 'test'
  }
  const isJudged = refs.some((r) =>
    r === 'scripts/control_gates.sh' ||
    r === 'ai-control/config/gates_registry.mjs' ||
    r === 'scripts/gate_registry_audit.mjs' ||
    r.endsWith('_audit.mjs')
  )
  if (isJudged) return 'judge'
  if (refs.length > 0) return 'tool'
  return 'legacy'
}

/** 生成登记表 */
export function generateRegistry(rootDir = ROOT) {
  const scriptsDir = join(rootDir, 'scripts')
  const files = scanScriptFiles(scriptsDir, scriptsDir)
  const items = []

  for (const f of files) {
    const fullRel = `scripts/${f}`
    const refs = findReferences(f, rootDir)
    const role = classifyRole(f, refs)
    items.push({
      path: fullRel,
      role,
      referencedBy: refs,
    })
  }

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    total: items.length,
    rolesSummary: {
      judge: items.filter((i) => i.role === 'judge').length,
      tool: items.filter((i) => i.role === 'tool').length,
      test: items.filter((i) => i.role === 'test').length,
      legacy: items.filter((i) => i.role === 'legacy').length,
    },
    scripts: items,
  }
}

/** 核心校验器 */
export function validateRegistry(registry, actualFiles) {
  const errors = []
  if (!registry || !Array.isArray(registry.scripts)) {
    return { ok: false, errors: ['登记表结构非法（缺少 scripts 数组）'] }
  }

  const registeredPaths = new Set()
  const duplicatePaths = new Set()

  for (const item of registry.scripts) {
    if (!item.path) {
      errors.push('存在缺少 path 字段的登记项')
      continue
    }
    if (registeredPaths.has(item.path)) {
      duplicatePaths.add(item.path)
    }
    registeredPaths.add(item.path)

    if (!ROLES.includes(item.role)) {
      errors.push(`脚本 ${item.path} 的 role 非法: "${item.role}"（允许: ${ROLES.join(', ')}）`)
    }
    if (!Array.isArray(item.referencedBy)) {
      errors.push(`脚本 ${item.path} 的 referencedBy 必须为数组`)
    }
    // 判据 ② 反例：role=judge 必须真有判定引用
    if (item.role === 'judge') {
      const validJudgeRef = (item.referencedBy || []).some((r) =>
        r === 'scripts/control_gates.sh' ||
        r === 'ai-control/config/gates_registry.mjs' ||
        r === 'scripts/gate_registry_audit.mjs' ||
        r.endsWith('_audit.mjs')
      )
      if (!validJudgeRef) {
        errors.push(`脚本 ${item.path} 声明为 role=judge，但未被任何门禁或判定器引用`)
      }
    }
    // 判据 ② 反例：role=legacy 若真有引用，说明分类错误
    if (item.role === 'legacy' && (item.referencedBy || []).length > 0) {
      errors.push(`脚本 ${item.path} 声明为 role=legacy，但存在 ${item.referencedBy.length} 处实际引用，属于误判`)
    }
  }

  if (duplicatePaths.size > 0) {
    errors.push(`发现重复登记路径: ${Array.from(duplicatePaths).join(', ')}`)
  }

  // 判据 ①：覆盖率 100% 对拍
  const actualSet = new Set(actualFiles.map((f) => `scripts/${f}`))
  const missing = []
  for (const act of actualSet) {
    if (!registeredPaths.has(act)) missing.push(act)
  }
  const phantoms = []
  for (const reg of registeredPaths) {
    if (!actualSet.has(reg)) phantoms.push(reg)
  }

  if (missing.length > 0) errors.push(`存在未登记的磁盘脚本 (${missing.length} 个): ${missing.slice(0, 5).join(', ')}...`)
  if (phantoms.length > 0) errors.push(`存在不存在于磁盘的幽灵脚本 (${phantoms.length} 个): ${phantoms.slice(0, 5).join(', ')}...`)

  return { ok: errors.length === 0, errors, missing, phantoms, total: actualSet.size }
}

/** 自检套件 */
export function runSelftest() {
  let passed = 0
  const total = 4

  // 1. 结构自检
  const mockFiles = ['a.mjs', 'b.sh']
  const mockReg = {
    version: '1.0.0',
    scripts: [
      { path: 'scripts/a.mjs', role: 'tool', referencedBy: ['foo'] },
      { path: 'scripts/b.sh', role: 'test', referencedBy: [] },
    ],
  }
  const v1 = validateRegistry(mockReg, mockFiles)
  if (v1.ok) {
    console.log('✅ 用例1: 合法登记表验证通过')
    passed++
  } else {
    console.error('❌ 用例1 失败:', v1.errors)
  }

  // 2. 反例：缺失文件（覆盖率不足 100%）
  const v2 = validateRegistry(mockReg, ['a.mjs', 'b.sh', 'missing.mjs'])
  if (!v2.ok && v2.missing.includes('scripts/missing.mjs')) {
    console.log('✅ 用例2 (反例): 磁盘有遗漏脚本时必须判红')
    passed++
  } else {
    console.error('❌ 用例2 期望判红，实为:', v2)
  }

  // 3. 反例：role=judge 却零门禁引用
  const badJudgeReg = {
    scripts: [
      { path: 'scripts/a.mjs', role: 'judge', referencedBy: ['docs/readme.md'] },
    ],
  }
  const v3 = validateRegistry(badJudgeReg, ['a.mjs'])
  if (!v3.ok && v3.errors.some((e) => e.includes('声明为 role=judge，但未被任何门禁或判定器引用'))) {
    console.log('✅ 用例3 (反例): role=judge 无门禁依据时必须判红')
    passed++
  } else {
    console.error('❌ 用例3 期望判红，实为:', v3)
  }

  // 4. 反例：重复登记路径
  const dupReg = {
    scripts: [
      { path: 'scripts/a.mjs', role: 'tool', referencedBy: ['foo'] },
      { path: 'scripts/a.mjs', role: 'tool', referencedBy: ['foo'] },
    ],
  }
  const v4 = validateRegistry(dupReg, ['a.mjs'])
  if (!v4.ok && v4.errors.some((e) => e.includes('重复登记路径'))) {
    console.log('✅ 用例4 (反例): 重复登记路径必须判红')
    passed++
  } else {
    console.error('❌ 用例4 期望判红，实为:', v4)
  }

  console.log(`—— 脚本登记表审计自检结果: ${passed}/${total} 通过`)
  return passed === total
}

function main() {
  const isGen = process.argv.includes('--gen')
  const isCheck = process.argv.includes('--check')
  const isSelftest = process.argv.includes('--selftest')

  if (isSelftest) {
    const ok = runSelftest()
    process.exit(ok ? 0 : 1)
  }

  if (isGen) {
    console.log('🔄 正在全仓扫描并生成脚本登记表...')
    const data = generateRegistry(ROOT)
    writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2), 'utf8')
    console.log(`✅ 已写入 ${REGISTRY_FILE} (覆盖 ${data.total} 个脚本)`)
    console.log('   分布:', JSON.stringify(data.rolesSummary))
    process.exit(0)
  }

  if (isCheck) {
    if (!existsSync(REGISTRY_FILE)) {
      console.error(`⛔ 找不到登记表: ${REGISTRY_FILE}（请先运行 --gen 生成）`)
      process.exit(1)
    }
    let data
    try {
      data = JSON.parse(readFileSync(REGISTRY_FILE, 'utf8'))
    } catch (e) {
      console.error(`⛔ 登记表 JSON 解析失败: ${e?.message}`)
      process.exit(1)
    }
    const actual = scanScriptFiles(SCRIPTS_DIR, SCRIPTS_DIR)
    const res = validateRegistry(data, actual)

    console.log('📜 脚本登记表全覆盖审计')
    console.log('-----------------------------------------')
    console.log(`磁盘脚本总数 : ${actual.length}`)
    console.log(`登记脚本总数 : ${data.scripts?.length ?? 0}`)
    console.log(`登记角色分布 :`, JSON.stringify(data.rolesSummary || {}))
    console.log('-----------------------------------------')
    if (res.ok) {
      console.log('✅ 脚本登记表 100% 全覆盖且 role 真实有据')
      process.exit(0)
    } else {
      console.error('⛔ 审计发现缺陷:')
      for (const err of res.errors) console.error(`  · ${err}`)
      process.exit(1)
    }
  }

  console.error('用法：node scripts/script_registry_audit.mjs [--gen|--check|--selftest]')
  process.exit(2)
}

main()
