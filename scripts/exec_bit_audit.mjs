#!/usr/bin/env node
// ==============================================================================
// 可执行位审计 (Exec Bit Audit) —— REQ-103 / C5 · 判定器
// ------------------------------------------------------------------------------
// 判什么（三条判据，任一条不达标即判红）：
//   ① git 索引模式：`scripts/**/*.sh` 不得出现 100644（须为 100755）；
//   ② 磁盘实况：`scripts/*.sh` 必须真可执行（access X_OK，不是"看着像可执行"）；
//   ③ 磁盘实况：`scripts/lib/*.sh` 同上。
//
// 为什么要有它（实测病根）：
//   Git 只记录 100644/100755 两个模式位。工作区里 `chmod +x` 之后若不做
//   `git update-index --chmod=+x`，**克隆出来的新副本就会丢掉可执行位** ——
//   于是"本机能跑、换台机器就 Permission denied"。只改磁盘、不改索引，
//   等于把缺陷写进版本库：本判定器把"索引模式"与"磁盘实况"**同时**判，
//   两者缺一都不算通过（只判一边必然漏掉另一半）。
//   另：修复动作只允许改模式位，**禁止改文件内容** —— 故本判定器同时落盘
//   每个 .sh 的 sha256 作为证据，供"修位不改内容"的断言复核。
//
// 用法：
//   node scripts/exec_bit_audit.mjs --check      # 判定（接门禁）
//   node scripts/exec_bit_audit.mjs --selftest   # 反向用例：造 644 → 必须判红；修位后判绿
//   node scripts/exec_bit_audit.mjs --json
// 退出码：0 通过 / 1 不通过 / 2 取不到证据（**2 绝不算通过**）
// ==============================================================================

import { readdirSync, existsSync, accessSync, constants, readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, dirname, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 三态语义（全仓唯一出处见 ai-control/config/gates_registry.mjs 的 TRI_STATE） */
export const TRI_STATE = Object.freeze({ PASS: 0, FAIL: 1, UNDECIDABLE: 2 })

const EXEC_MODE = '100755'

// ── 采集 ──────────────────────────────────────────────────────────────────────
/** 递归列出 scripts/ 下全部 .sh（跳过 .git/node_modules）。 */
export function listShellScripts(root = ROOT) {
  const out = []
  const walk = (dir) => {
    let entries = []
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.name === '.git' || e.name === 'node_modules') continue
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.sh')) out.push(p)
    }
  }
  walk(join(root, 'scripts'))
  return out.sort()
}

/**
 * 取 git 索引里的模式位（唯一权威证据：`git ls-files -s`）。
 * @returns {{ok:boolean, reason?:string, modes:Map<string,string>}}
 */
export function gitIndexModes(root = ROOT) {
  const repo = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' })
  if (repo.status !== 0) return { ok: false, reason: '当前目录不是 Git 工作树（索引模式取不到证据）', modes: new Map() }
  const ls = spawnSync('git', ['ls-files', '-s'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (ls.status !== 0) {
    return { ok: false, reason: `git ls-files 取不到证据（退出码 ${ls.status}）：${(ls.stderr || '').trim().slice(0, 120)}`, modes: new Map() }
  }
  const modes = new Map()
  for (const line of String(ls.stdout || '').split('\n')) {
    // 形如：100755 <sha1> 0\tscripts/foo.sh
    const m = line.match(/^(\d{6})\s+[0-9a-f]+\s+(\d+)\t(.+)$/)
    if (!m) continue
    modes.set(m[3], m[1])
  }
  return { ok: true, modes }
}

export function sha256File(p) {
  try { return createHash('sha256').update(readFileSync(p)).digest('hex') } catch { return null }
}

export function canExec(p) {
  try { accessSync(p, constants.X_OK); return true } catch { return false }
}

/**
 * 纯判定核心（便于反向用例直接喂夹具，不开真实仓库）。
 * @param {Array<{path:string, tracked:boolean, gitMode:string|null, diskExec:boolean, onDisk:boolean}>} entries
 * @returns {{code:number, problems:string[], undecidable:string[]}}
 */
export function judgeExecBits(entries) {
  const problems = []
  const undecidable = []
  if (!Array.isArray(entries) || entries.length === 0) {
    undecidable.push('scripts/ 下一个 .sh 都找不到（判据取不到证据，不得折算为通过）')
    return { code: TRI_STATE.UNDECIDABLE, problems, undecidable }
  }
  for (const e of entries) {
    const tag = e.path.startsWith('scripts/lib/') ? '③' : '②'
    if (!e.onDisk) {
      undecidable.push(`磁盘上不存在：${e.path}（磁盘实况取不到证据）`)
    } else if (!e.diskExec) {
      problems.push(`${tag} 磁盘不可执行：${e.path}（修复：chmod +x ${e.path}，只改模式位、不改内容）`)
    }
    if (!e.tracked) {
      undecidable.push(`① ${e.path} 未纳入 git 索引（模式位取不到证据；修复：git add ${e.path}）`)
    } else if (e.gitMode !== EXEC_MODE) {
      problems.push(`① git 索引模式为 ${e.gitMode}（须 ${EXEC_MODE}）：${e.path}（修复：git update-index --chmod=+x ${e.path}）`)
    }
  }
  const code = undecidable.length ? TRI_STATE.UNDECIDABLE : problems.length ? TRI_STATE.FAIL : TRI_STATE.PASS
  return { code, problems, undecidable }
}

/** 实跑判定：索引模式 × 磁盘实况 × 内容 sha256 证据 */
export function audit(root = ROOT) {
  const files = listShellScripts(root)
  const evidence = { shellCount: files.length, execMode: EXEC_MODE, gitModes: {}, sha256: {} }
  const gi = gitIndexModes(root)
  if (!gi.ok) {
    return { code: TRI_STATE.UNDECIDABLE, problems: [], undecidable: [`取不到证据：${gi.reason}`], evidence }
  }
  const entries = files.map((abs) => {
    const rel = relative(root, abs).split(sep).join('/')
    const onDisk = existsSync(abs)
    evidence.gitModes[rel] = gi.modes.get(rel) ?? null
    const sha = onDisk ? sha256File(abs) : null
    if (sha) evidence.sha256[rel] = sha
    return { path: rel, tracked: gi.modes.has(rel), gitMode: gi.modes.get(rel) ?? null, diskExec: onDisk && canExec(abs), onDisk }
  })
  const res = judgeExecBits(entries)
  evidence.shellCount = entries.length
  evidence.gitMode644 = entries.filter((e) => e.gitMode === '100644').map((e) => e.path)
  evidence.diskNotExec = entries.filter((e) => !e.diskExec).map((e) => e.path)
  return { ...res, evidence }
}

// ── 反向用例：真的造一个 644 的 .sh（临时 git 仓库），必须判红；修位后判绿 ──────
function tempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-execbit-'))
  mkdirSync(join(dir, 'scripts', 'lib'), { recursive: true })
  const r = spawnSync('git', ['init', '-q'], { cwd: dir, encoding: 'utf8' })
  return { dir, gitOk: r.status === 0 }
}

export function selftest() {
  const cases = []
  const add = (name, ok, extra = '') => cases.push({ name, ok, extra })
  const cleanup = []

  // ── 夹具（纯函数）反例 ──────────────────────────────────────────────────────
  const f = (over) => ({ path: 'scripts/a.sh', tracked: true, gitMode: EXEC_MODE, diskExec: true, onDisk: true, ...over })
  add('反例：git 模式 100644 必须判红', judgeExecBits([f({ gitMode: '100644' })]).code === TRI_STATE.FAIL)
  add('反例：磁盘不可执行必须判红', judgeExecBits([f({ diskExec: false })]).code === TRI_STATE.FAIL)
  add('反例：索引模式取不到必须退 2（不得算通过）', judgeExecBits([f({ tracked: false })]).code === TRI_STATE.UNDECIDABLE)
  add('正例：模式 100755 + 磁盘可执行判绿', judgeExecBits([f({})]).code === TRI_STATE.PASS)
  add('反例：空集不得算通过', judgeExecBits([]).code === TRI_STATE.UNDECIDABLE)

  // ── 真实文件反例：临时 git 仓库里造一个 644 的 .sh ───────────────────────────
  const t = tempRepo()
  if (!t.gitOk) {
    add('真实文件反例：临时 git 仓库可用', false, 'git init 失败（无法取到证据）')
  } else {
    cleanup.push(t.dir)
    const sh = join(t.dir, 'scripts', 'tmp_case.sh')
    writeFileSync(sh, '#!/usr/bin/env bash\necho ok\n', 'utf8')
    chmodSync(sh, 0o644)
    const addR = spawnSync('git', ['add', '-A'], { cwd: t.dir, encoding: 'utf8' })
    const shaBefore = sha256File(sh)
    const red = audit(t.dir)
    add('真实反例①：索引 100644 的 .sh → 判红（退出码 1）', red.code === TRI_STATE.FAIL, `code=${red.code} · ${red.problems[0] ?? ''}`)
    add('真实反例①：判红必须点名该文件', red.problems.some((p) => p.includes('scripts/tmp_case.sh')))
    add('真实反例①：证据里能读到 100644 模式位', (red.evidence.gitMode644 || []).includes('scripts/tmp_case.sh'))
    add('真实反例①：git add 成功（模式位来自索引而非猜测）', addR.status === 0)

    // 修复动作 = 只改模式位（磁盘 + 索引），然后必须判绿
    chmodSync(sh, 0o755)
    const upd = spawnSync('git', ['update-index', '--chmod=+x', '--', 'scripts/tmp_case.sh'], { cwd: t.dir, encoding: 'utf8' })
    const green = audit(t.dir)
    add('真实反例②：修位后必须判绿（退出码 0）', green.code === TRI_STATE.PASS, `code=${green.code} · ${(green.problems || []).join(' / ')}`)
    add('真实反例②：git update-index --chmod=+x 生效', upd.status === 0 && green.evidence.gitModes['scripts/tmp_case.sh'] === EXEC_MODE)
    const shaAfter = sha256File(sh)
    add('真实断言：修位前后内容 sha256 不变（只改模式位、不改内容）', Boolean(shaBefore) && shaBefore === shaAfter, `${String(shaBefore).slice(0, 12)}… → ${String(shaAfter).slice(0, 12)}…`)

    // 证据缺失反例：非 git 目录 → 退 2
    const plain = mkdtempSync(join(tmpdir(), 'dsh-execbit-plain-'))
    cleanup.push(plain)
    mkdirSync(join(plain, 'scripts'), { recursive: true })
    writeFileSync(join(plain, 'scripts', 'x.sh'), '#!/usr/bin/env bash\n', 'utf8')
    add('反例：非 git 目录取不到索引模式 → 退 2', audit(plain).code === TRI_STATE.UNDECIDABLE)
  }

  // ── 真实仓库取证（只读）：证据必须取得到（0 或 1，绝不允许静默退 2） ────────
  const real = audit(ROOT)
  add('真仓库：证据可取（退出码 0 或 1，非不可判定）', [TRI_STATE.PASS, TRI_STATE.FAIL].includes(real.code), `code=${real.code} · .sh ${real.evidence.shellCount} 个`)
  add('真仓库：每个 .sh 都落了 sha256 证据', real.evidence.shellCount > 0 && Object.keys(real.evidence.sha256).length === real.evidence.shellCount)

  for (const d of cleanup) rmSync(d, { recursive: true, force: true })
  return { cases, failed: cases.filter((c) => !c.ok) }
}

// ── CLI ──────────────────────────────────────────────────────────────────────
function main(argv) {
  if (argv.includes('--selftest')) {
    const { cases, failed } = selftest()
    console.log('=== 可执行位审计 · 自检（REQ-103 / C5）===')
    for (const c of cases) console.log(`${c.ok ? '✅' : '❌'} ${c.name}${c.extra ? `  (${c.extra})` : ''}`)
    console.log(`\n通过 ${cases.length - failed.length} / ${cases.length}`)
    if (failed.length) { console.log('💥 自检失败'); return TRI_STATE.FAIL }
    console.log('🎉 自检全部通过')
    return TRI_STATE.PASS
  }
  const res = audit(ROOT)
  if (argv.includes('--json')) { console.log(JSON.stringify(res, null, 2)); return res.code }
  if (res.code === TRI_STATE.UNDECIDABLE) {
    console.log('⛔ 可执行位审计 · 不可判定：')
    for (const p of res.undecidable) console.log(`   · ${p}`)
    return TRI_STATE.UNDECIDABLE
  }
  if (res.code === TRI_STATE.FAIL) {
    console.log('⛔ 可执行位审计 · 未通过：')
    for (const p of res.problems) console.log(`   · ${p}`)
    console.log(`   修复只改模式位（chmod +x / git update-index --chmod=+x），**禁止改文件内容**。`)
    return TRI_STATE.FAIL
  }
  console.log(`✅ 可执行位审计通过：${res.evidence.shellCount} 个 .sh 索引模式均为 ${EXEC_MODE}，磁盘全部可执行（sha256 证据全落盘）`)
  return TRI_STATE.PASS
}

if (process.argv[1] && process.argv[1].endsWith('exec_bit_audit.mjs')) {
  process.exit(main(process.argv.slice(2)))
}
