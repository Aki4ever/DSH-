#!/usr/bin/env node
/** 独立夹具原型：不接线、不写事故状态、不证明宿主或人工认可来源。 */
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
export const digest = value => createHash('sha256').update(value).digest('hex')
export function evaluateIncident(pack, context = {}) {
  try { return evaluateIncidentUnsafe(pack, context) }
  catch { return { exit: 2, eligible: false, issues: ['证据形状非法或独立验证器异常'], productionEnabled: false } }
}
function evaluateIncidentUnsafe(pack, context = {}) {
  const missing = [], invalid = []
  if (!pack || typeof pack !== 'object') return { exit: 2, eligible: false, issues: ['证据包缺失'], productionEnabled: false }
  const required = ['incidentId', 'rawRecord', 'recordDigest', 'files', 'runs', 'generatedAt', 'implementationDigest']
  for (const key of required) if (pack[key] == null) missing.push(`缺少${key}`)
  if (missing.length) return { exit: 2, eligible: false, issues: missing, productionEnabled: false }
  let original
  try { original = JSON.parse(pack.rawRecord) } catch { missing.push('原记录不可解析') }
  if (typeof pack.rawRecord !== 'string' || digest(String(pack.rawRecord)) !== pack.recordDigest) invalid.push('原始记录摘要不匹配')
  if (pack.incidentId !== pack.recordDigest) invalid.push('事故ID未绑定原记录')
  if (!Array.isArray(original?.files) || !original.files.length) missing.push('原影响范围缺失')
  if (!Array.isArray(pack.files) || !pack.files.length || !Array.isArray(pack.runs) || !pack.runs.length) missing.push('文件或复验缺失')
  const files = Array.isArray(pack.files) ? pack.files : []
  const paths = files.map(f => f?.path)
  if (new Set(paths).size !== paths.length) invalid.push('重复文件')
  for (const old of original?.files || []) {
    const f = files.find(f => f?.path === old.path)
    if (!f || typeof f.before !== 'string' || typeof f.after !== 'string') { missing.push('影响文件原内容或当前内容缺失'); continue }
    if (digest(f.before) !== old.sha256 || f.beforeDigest !== old.sha256 || digest(f.after) !== f.afterDigest) invalid.push('文件锚点不匹配')
    if (context.currentFiles?.[f.path] !== f.afterDigest) missing.push('当前文件独立锚点未匹配')
    if (!f.historicalSource || !f.diffReviewed) missing.push('历史来源或差异审查缺失')
  }
  for (const f of files) if (!original?.files?.some(o => o.path === f?.path)) invalid.push('未定义派生影响文件；原型不支持扩展')
  const covered = new Set()
  for (const run of Array.isArray(pack.runs) ? pack.runs : []) {
    if (!run || typeof run.command !== 'string' || !/^node scripts\/[a-zA-Z0-9_/-]+\.mjs --check$/.test(run.command)) { invalid.push('复验命令契约非法'); continue }
    if (run.exit !== 0 || run.error || run.signal) invalid.push('复验失败或异常')
    if (typeof run.stdout !== 'string' || typeof run.stderr !== 'string' || run.outputDigest !== digest(`${run.stdout}\0${run.stderr}`)) invalid.push('输出摘要不匹配')
    if (context.verifyRun?.(run, pack) !== true) missing.push('缺独立真实复验验证器')
    if (!Array.isArray(run.files)) missing.push('复验覆盖缺失')
    else for (const path of run.files) covered.add(path)
  }
  for (const path of paths) if (!covered.has(path)) missing.push('复验未覆盖全部文件')
  const age = (context.now ?? Date.now()) - Date.parse(pack.generatedAt)
  if (!Number.isFinite(age) || age < 0 || age > 86400000) missing.push('过期或非法时间')
  if (!context.implementationDigest || pack.implementationDigest !== context.implementationDigest) missing.push('实现摘要失效')
  if (context.verifyRemediation?.(pack) !== true) missing.push('根因修复及反例未独立验证')
  // 包内approved:true永远无效。宿主必须提供独立来源验证，当前未实现生产适配器。
  if (context.verifyHumanAcceptance?.(digest(JSON.stringify(pack)), pack.incidentId) !== true) missing.push('无绑定证据包的独立人工认可')
  return { exit: invalid.length ? 1 : missing.length ? 2 : 0, eligible: !invalid.length && !missing.length,
    issues: [...invalid, ...missing], productionEnabled: false, scope: 'pure-validator-prototype', warning: '注入回调仅是验证接口，夹具回调不构成真实执行或人工认可证明' }
}
export function selftest() {
  const before = 'old', after = 'new', now = Date.now()
  const rawRecord = JSON.stringify({ judge: 'node scripts/x.mjs --check; true', files: [{ path: 'a', sha256: digest(before) }] })
  const pack = { incidentId: digest(rawRecord), rawRecord, recordDigest: digest(rawRecord), generatedAt: new Date(now).toISOString(), implementationDigest: 'fixture',
    files: [{ path: 'a', before, after, beforeDigest: digest(before), afterDigest: digest(after), historicalSource: 'fixture-only', diffReviewed: true }],
    runs: [{ command: 'node scripts/x.mjs --check', exit: 0, stdout: 'fixture', stderr: '', outputDigest: digest('fixture\0'), files: ['a'] }] }
  const context = { now, implementationDigest: 'fixture', currentFiles: { a: digest(after) }, verifyRun: () => true, verifyRemediation: () => true, verifyHumanAcceptance: () => true }
  const check = (p = pack, c = context) => evaluateIncident(p, c)
  const cases = [
    ['合法夹具只验证原型', () => { assert.equal(check().exit, 0); assert.equal(check().productionEnabled, false) }],
    ['缺包不可判定', () => assert.equal(check(null).exit, 2)],
    ['畸形原文件列表失败关闭', () => { const raw = JSON.stringify({ files: {} }); assert.equal(check({ ...pack, rawRecord: raw, recordDigest: digest(raw), incidentId: digest(raw) }).exit, 2) }],
    ['验证器异常失败关闭', () => assert.equal(check(pack, { ...context, verifyRun: () => { throw new Error('fixture') } }).exit, 2)],
    ['Promise不算验证成功', () => assert.equal(check(pack, { ...context, verifyRun: () => Promise.resolve(true) }).exit, 2)],
    ['字符串认可不算true', () => assert.equal(check(pack, { ...context, verifyHumanAcceptance: () => 'approved' }).exit, 2)],
    ['自填认可不可信', () => assert.equal(check({ ...pack, approved: true }, { ...context, verifyHumanAcceptance: undefined }).exit, 2)],
    ['篡改原记录', () => assert.equal(check({ ...pack, rawRecord: '{}' }).exit, 1)],
    ['遗漏影响文件', () => assert.notEqual(check({ ...pack, files: [] }).exit, 0)],
    ['当前锚点变化', () => assert.equal(check(pack, { ...context, currentFiles: {} }).exit, 2)],
    ['失败复验', () => assert.equal(check({ ...pack, runs: [{ ...pack.runs[0], exit: 1 }] }).exit, 1)],
    ['输出篡改', () => assert.equal(check({ ...pack, runs: [{ ...pack.runs[0], stdout: 'fake' }] }).exit, 1)],
    ['禁止shell吞码', () => assert.equal(check({ ...pack, runs: [{ ...pack.runs[0], command: 'node scripts/x.mjs --check; true' }] }).exit, 1)],
    ['拒绝自检代生产', () => assert.equal(check({ ...pack, runs: [{ ...pack.runs[0], command: 'node scripts/x.mjs --selftest' }] }).exit, 1)],
    ['过期', () => assert.equal(check({ ...pack, generatedAt: new Date(now - 86400001).toISOString() }).exit, 2)],
    ['无根因反例', () => assert.equal(check(pack, { ...context, verifyRemediation: undefined }).exit, 2)],
    ['无真实执行来源', () => assert.equal(check(pack, { ...context, verifyRun: undefined }).exit, 2)],
    ['覆盖缺失', () => assert.equal(check({ ...pack, runs: [{ ...pack.runs[0], files: [] }] }).exit, 2)],
  ]
  for (const [name, fn] of cases) { fn(); console.log(`✅ ${name}`) }
  console.log(`独立事故证据原型：${cases.length}/${cases.length}（仅夹具）`)
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--selftest') { try { selftest() } catch (e) { console.error(e); process.exitCode = 1 } }
  else { console.error('仅支持 --selftest；没有生产结清或写入入口'); process.exitCode = 2 }
}
