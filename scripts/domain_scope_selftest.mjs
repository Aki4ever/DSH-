#!/usr/bin/env node
// ==============================================================================
// 全域写拦截判定自检 (Domain Write-Interception Audit Selftest) — REQ-092 / R1-d
// ==============================================================================
// 为什么需要它：拦截层此前只判"本仓库门禁过没过"。实测 4 个工程长期脱管，
// 而门禁永远 100% —— 因为门禁从不问"这个工作区属于谁、有没有被接管"。
// 新加的 `evaluateDomainScope` 若没有反向用例，就只是又一盏常亮绿灯：
// 必须证明"该拒的真能拒、不该拒的绝不误伤"。
//
// 用法：node scripts/domain_scope_selftest.mjs
// 退出码：0 全部用例符合预期；1 有用例不符
// ==============================================================================

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { evaluateDomainScope, evaluate, Config } from '../ai-control/plugin/index.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const cases = []
const add = (name, got, expect) => cases.push({ name, got: !!got, expect, ok: !!got === expect })

const exec = (cwd, name = 'write') => ({ name, arguments: { file_path: `${cwd}/x.md` }, agent: { session: { header: { cwd } } } })
const snapUncovered = { uncovered: ['DSH股票'], root: '/Users/linqiyu/Documents/DSH', at: '2026-10-02T00:00:00Z' }
const snapEmpty = { uncovered: [], root: '/Users/linqiyu/Documents/DSH', at: '2026-10-02T00:00:00Z' }

// ① 该拒的真能拒
add('未接管工程的工作区 → 拒绝', evaluateDomainScope(exec('/Users/linqiyu/Documents/DSH/DSH股票'), snapUncovered), true)
add('拒绝理由含补课命令 → 可自救', /backfill_scope\.mjs --apply/.test(evaluateDomainScope(exec('/Users/linqiyu/Documents/DSH/DSH股票'), snapUncovered) || ''), true)

// ② 不该拒的绝不误伤
add('已接管工程的工作区 → 放行', evaluateDomainScope(exec('/Users/linqiyu/Documents/DSH/日常琐碎'), snapUncovered), false)
add('未接管名单为空 → 放行', evaluateDomainScope(exec('/Users/linqiyu/Documents/DSH/DSH股票'), snapEmpty), false)
add('主控仓库自身 → 放行（否则修管控会死锁）', evaluateDomainScope(exec(ROOT), snapUncovered, ROOT), false)
add('取不到工作目录 → 放行（不制造误伤）', evaluateDomainScope(exec(''), snapUncovered), false)
add('快照不可用 → 放行（不制造误伤）', evaluateDomainScope(exec('/Users/linqiyu/Documents/DSH/DSH股票'), null), false)
add('只读工具不受影响（不在受控清单）', evaluate(exec('/Users/linqiyu/Documents/DSH/DSH股票', 'read'), { execAllowed: true, gates: [] }, Config, 0, null, snapUncovered, ROOT), false)

// ③ 与既有门禁的先后关系：门禁未过时本项不参与判定（由门禁本身拒绝）
const stBlocked = { execAllowed: false, gates: [{ id: 'sync', name: '需求文档同步', status: 'pending', hint: 'x' }] }
add('门禁未过 → 仍由门禁拒绝（不越权代判）', evaluate(exec('/Users/linqiyu/Documents/DSH/日常琐碎'), stBlocked, Config, 0, null, snapUncovered, ROOT), true)

const failed = cases.filter((c) => !c.ok)
console.log('🧪 全域写拦截判定 · 反向用例自检')
for (const c of cases) console.log(`   ${c.ok ? '✅' : '❌'} ${c.name}（期望 ${c.expect ? '拒绝' : '放行'} · 实际 ${c.got ? '拒绝' : '放行'}）`)
console.log(failed.length ? `❌ 失败 ${failed.length} 项` : `🎉 全部通过：${cases.length}/${cases.length}`)
process.exit(failed.length ? 1 : 0)
