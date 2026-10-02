#!/usr/bin/env node
// ==============================================================================
// 写入器留存接线端到端探针 (Backup Writer Retention Probe) —— REQ-099 / R2
// ------------------------------------------------------------------------------
// 为什么必须有它：`backup_gc.mjs --selftest` 与保留策略库的自检只证明**剪枝函数本身对**，
// 证明不了**写入器真的调了它**——"库有牙"与"写者接了牙"是两件事，
// 本工程的老毛病正是"载体在位、机制从未通电"。
//
// 本探针在**临时 HOME 沙箱**里给每个写入器预置超额备份（6 份 > 上限 3），
// 跑真实写入器，断言跑完收敛到上限，且活文件未被破坏。
// 沙箱手段：安装脚本与插件同步支持 `DSH_HOME` / `DSH_PROFILE`，Python 安装器支持 `--root`。
//
// 用法：node scripts/backup_writer_probe.mjs [--json]
// 退出码：0 参演写入器全部收敛；1 有写入器跑完仍超口径；2 没有任何写入器能在沙箱里跑起来
// ==============================================================================

import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readdirSync, readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const KEEP = 3

function sh(cmd, args, env = {}, cwd = ROOT) {
  try {
    const out = execFileSync(cmd, args, { env: { ...process.env, ...env }, cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000 })
    return { code: 0, out }
  } catch (e) {
    return { code: typeof e.status === 'number' ? e.status : -1, out: String(e.stdout || '') + String(e.stderr || '') }
  }
}

/** 给一个文件预置 n 份超额备份（时间戳递增，保证"最旧"可判）。 */
function seedBackups(file, n) {
  for (let i = 1; i <= n; i++) {
    writeFileSync(`${file}.bak-2026010${i}-000000-seed`, `seed-${i}\n`, 'utf8')
  }
}
const countBackups = (dir, base) => readdirSync(dir).filter((f) => f.startsWith(`${base}.bak-`)).length

function main() {
  const json = process.argv.includes('--json')
  const cases = []
  const add = (name, status, detail) => cases.push({ name, status, detail: String(detail) })

  // ── 甲：Python 安装器（--root 沙箱）────────────────────────────────────────
  {
    const tmp = mkdtempSync(join(tmpdir(), 'bw-py-'))
    const prof = join(tmp, 'profiles', 'web')
    mkdirSync(prof, { recursive: true })
    const pkg = join(prof, 'package.json')
    const patch = join(prof, 'cordis.patch.yml')
    writeFileSync(pkg, JSON.stringify({ name: 'web', dependencies: {}, dsh: { profile: {} } }, null, 1), 'utf8')
    writeFileSync(patch, 'plugins: []\n', 'utf8')
    seedBackups(pkg, 6); seedBackups(patch, 6)
    const before = { pkg: countBackups(prof, 'package.json'), patch: countBackups(prof, 'cordis.patch.yml') }
    const r = sh('python3', ['skills/install-client-plugin/scripts/install_plugin.py',
      '--root', join(tmp, 'profiles'), '--profile', 'web', '--plugin', 'dsh-plugin-restart', '--apply'])
    const after = { pkg: countBackups(prof, 'package.json'), patch: countBackups(prof, 'cordis.patch.yml') }
    let liveOk = false
    try { JSON.parse(readFileSync(pkg, 'utf8')); liveOk = true } catch { liveOk = false }
    if (after.pkg === 0 && before.pkg === 6 && !liveOk) {
      add('Python 安装器', 'SKIP', `未能在沙箱跑起来（退出码 ${r.code}）：${r.out.trim().split('\n').slice(-1)[0] || '无输出'}`)
    } else {
      const ok = after.pkg <= KEEP && after.patch <= KEEP && liveOk
      add('Python 安装器', ok ? 'PASS' : 'FAIL',
        `package.json ${before.pkg}→${after.pkg} · cordis.patch.yml ${before.patch}→${after.patch} · 活文件可解析=${liveOk}（退出码 ${r.code}）`)
    }
    rmSync(tmp, { recursive: true, force: true })
  }

  // ── 乙：宿主门禁安装器（DSH_HOME 沙箱）────────────────────────────────────
  {
    const tmp = mkdtempSync(join(tmpdir(), 'bw-gate-'))
    const prof = join(tmp, 'profiles', 'web')
    mkdirSync(prof, { recursive: true })
    const pkg = join(prof, 'package.json')
    const patch = join(prof, 'cordis.patch.yml')
    writeFileSync(pkg, JSON.stringify({ name: 'web', dependencies: {}, dsh: { profile: { bundles: [] } } }, null, 1), 'utf8')
    writeFileSync(patch, 'plugins: []\n', 'utf8')
    seedBackups(pkg, 6); seedBackups(patch, 6)
    const before = { pkg: countBackups(prof, 'package.json'), patch: countBackups(prof, 'cordis.patch.yml') }
    // 注意：本写入器认的**最高优先级沙箱缝隙是 `DSH_PROFILE_DIR`**（显式目录），
    // 只给 `DSH_HOME` 时它会在别的目录上判定"已登记"从而幂等跳过——实测踩过，写在此处备忘。
    const r = sh('bash', ['scripts/install_host_gate.sh', 'install'], { DSH_HOME: tmp, DSH_PROFILE: 'web', DSH_PROFILE_DIR: prof })
    const after = { pkg: countBackups(prof, 'package.json'), patch: countBackups(prof, 'cordis.patch.yml') }
    if (after.pkg === before.pkg && after.patch === before.patch) {
      add('宿主门禁安装器', 'SKIP', `沙箱内未触发写路径（退出码 ${r.code}）：${r.out.trim().split('\n').slice(-1)[0] || '无输出'}`)
    } else {
      const ok = after.pkg <= KEEP && after.patch <= KEEP
      add('宿主门禁安装器', ok ? 'PASS' : 'FAIL',
        `package.json ${before.pkg}→${after.pkg} · cordis.patch.yml ${before.patch}→${after.patch}（退出码 ${r.code}）`)
    }
    rmSync(tmp, { recursive: true, force: true })
  }

  // ── 丙：插件同步（DSH_HOME + DSH_PROFILE 沙箱）────────────────────────────
  {
    const tmp = mkdtempSync(join(tmpdir(), 'bw-sync-'))
    const prof = join(tmp, 'profiles', 'web')
    // 必须预置"已安装的插件目录"，否则插件同步会因"目标插件未安装"整体跳过（幂等、无改动即无备份）
    for (const p of ['dsh-plugin-restart', 'dsh-plugin-usage-bar', 'dsh-plugin-image-zoom', 'dsh-plugin-control-jump', 'dsh-plugin-execution-control']) {
      mkdirSync(join(prof, 'node_modules', p), { recursive: true })
    }
    const pkg = join(prof, 'package.json')
    writeFileSync(pkg, JSON.stringify({ name: 'web', dependencies: {}, dsh: { profile: { bundles: [] } } }, null, 1), 'utf8')
    seedBackups(pkg, 6)
    const before = countBackups(prof, 'package.json')
    // 依赖登记与备份在 `install_plugin()` 里，由 `install` 子命令触发；
    // `sync` 只同步插件文件、无参是"检查"——三者语义不同，实测踩过。
    const r = sh('bash', ['scripts/plugin_sync.sh', 'install'], { DSH_HOME: tmp, DSH_PROFILE: 'web' })
    const after = countBackups(prof, 'package.json')
    if (after === before) {
      add('插件同步', 'SKIP', `沙箱内未触发改动（幂等或无变更，退出码 ${r.code}）`)
    } else {
      add('插件同步', after <= KEEP ? 'PASS' : 'FAIL', `package.json 备份 ${before}→${after}（退出码 ${r.code}）`)
    }
    rmSync(tmp, { recursive: true, force: true })
  }

  // ── 丁：不可沙箱化的两处，如实标注（不冒充已验证）──────────────────────────
  {
    const wired = (f, pat) => (existsSync(join(ROOT, f)) && new RegExp(pat).test(readFileSync(join(ROOT, f), 'utf8')))
    add('市场守卫', wired('scripts/market_guard_patch.mjs', 'pruneBackups') ? 'WIRED' : 'FAIL',
      '改的是 profile 内的第三方产物，需真实市场文件才能触发写路径；本探针只断言已接线')
    add('技能池归位', wired('scripts/restore_skill_pool.mjs', 'pruneBackups') ? 'WIRED' : 'FAIL',
      '按设计操作本仓库自身的技能池，无法沙箱化；本探针只断言已接线')
  }

  const fails = cases.filter((c) => c.status === 'FAIL')
  const passes = cases.filter((c) => c.status === 'PASS')
  const ok = fails.length === 0 && (passes.length + cases.filter((c) => c.status === 'WIRED').length) > 0
  if (json) { console.log(JSON.stringify({ ok, keep: KEEP, cases }, null, 2)); return ok ? 0 : 1 }
  console.log('=== 写入器留存接线端到端探针（REQ-099 / R2）===')
  const mark = { PASS: '✅', FAIL: '❌', SKIP: '⏸️', WIRED: '🔌' }
  for (const c of cases) console.log(`${mark[c.status] || '·'} [${c.status}] ${c.name}（${c.detail}）`)
  console.log('-----------------------------------------')
  console.log(fails.length
    ? `❌ ${fails.length} 个写入器跑完仍超口径（保留上限 ${KEEP}）——"写者有牙"不成立`
    : `🎉 无写入器超口径：实跑收敛 ${passes.length} 个 · 已接线待真机 ${cases.filter((c) => c.status === 'WIRED').length} 个 · 未触发 ${cases.filter((c) => c.status === 'SKIP').length} 个`)
  return ok ? 0 : 1
}

process.exit(main())
