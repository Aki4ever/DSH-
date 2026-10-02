#!/usr/bin/env node
// ==============================================================================
// 立项 CLI 规划判定器 (Project CLI Plan Audit) —— REQ-097 / R4
// ------------------------------------------------------------------------------
// 用户原话：「项目开启的时候要把 CLI 规划进去，以方便 AI 调用」。
//
// 实测病根（2026-10-02 只读取证）：
//   `rules/system/initialization_protocol.md` 全文 **0 处**提到 CLI；
//   `scripts/init_project.sh` 只建目录与台账，**不生成任何 CLI 与接口契约骨架**；
//   元规则第十八条与立项赋能规划卡里"CLI 命令行基座"只是**六选一勾选项，零判定器**。
//   于是"项目开启时把 CLI 规划进去"物理上**无人核对**，新工程照样可以裸跑。
//
// 本判定器把这句话变成三条可复跑判据（判"有没有规划且规划是真的"，不评判能力设计好坏）：
//   判据一（硬）· 清单在位：项目根 `CLI_PLAN.md`（或 `docs/cli_plan.md`）存在，且至少写了一条可跑命令；
//   判据二（硬）· 命令可达：清单里的命令所指向的脚本必须真实存在（写了跑不起来的等于没写）；
//   判据三（硬）· 契约在位：清单里至少要写一个接口契约路径，且该契约文件真实存在。
//
// 用法：
//   node scripts/cli_plan_audit.mjs --check                  # 判本工程
//   node scripts/cli_plan_audit.mjs --project <项目路径>      # 判指定工程
//   node scripts/cli_plan_audit.mjs --selftest               # 反向用例：该红的必须判红
//   node scripts/cli_plan_audit.mjs --json
//
// 退出码：0 三条全过 / 1 存在不达标 / 2 取不到证据（**2 绝不算通过**）
// ==============================================================================

import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const PLAN_CANDIDATES = ['CLI_PLAN.md', 'docs/cli_plan.md']

/** 占位符命令（模板里的示例行）不算"真实命令"。 */
export function isPlaceholder(cmd) {
  return /[<>]|xxx|XXX|示例|放置|TODO/.test(cmd)
}

/** 抽出清单里的可跑命令（`node scripts/x.mjs --check` 这种）。 */
export function commandsOf(text) {
  const out = []
  for (const m of String(text).matchAll(/`((?:node|bash|sh|python3|pnpm|npm)\s+[^`\n]+)`/g)) {
    const cmd = m[1].trim()
    if (isPlaceholder(cmd)) continue
    const file = (cmd.match(/\s(\S+\.(?:mjs|cjs|js|sh|py))/) || [])[1]
    if (!file) continue
    out.push({ cmd, file })
  }
  return out
}

/** 抽出清单里的接口契约路径。 */
export function contractsOf(text) {
  const out = new Set()
  for (const m of String(text).matchAll(/`([^`\n]*\.interface\.json)`/g)) {
    if (!isPlaceholder(m[1])) out.add(m[1])
  }
  return [...out]
}

/** 三条判据（纯函数，便于反向用例直接调用）。 */
export function judge(projectDir) {
  const checks = []
  const planRel = PLAN_CANDIDATES.find((p) => existsSync(join(projectDir, p)))
  const text = planRel ? readFileSync(join(projectDir, planRel), 'utf8') : ''
  const cmds = commandsOf(text)
  const contracts = contractsOf(text)

  checks.push({
    name: '判据一 · CLI 规划清单在位',
    ok: Boolean(planRel) && cmds.length > 0,
    detail: !planRel
      ? `没有找到 CLI 规划清单（${PLAN_CANDIDATES.join(' 或 ')}）`
      : cmds.length === 0
        ? `${planRel} 里一条可跑命令都没写（只有空表头等于没规划）`
        : `${planRel} 在 · 已写 ${cmds.length} 条可跑命令`,
  })

  const ghostCmds = cmds.filter((c) => !existsSync(join(projectDir, c.file)))
  checks.push({
    name: '判据二 · 命令指向的脚本真实存在',
    ok: cmds.length > 0 && ghostCmds.length === 0,
    detail:
      cmds.length === 0
        ? '没有可核对命令'
        : ghostCmds.length === 0
          ? `${cmds.length} 条命令全部指向真实脚本`
          : `${ghostCmds.length} 条命令指向不存在的脚本：${ghostCmds.map((c) => c.file).join('、')}`,
  })

  const ghostContracts = contracts.filter((c) => !existsSync(join(projectDir, c)))
  checks.push({
    name: '判据三 · 接口契约在位且可达',
    ok: contracts.length > 0 && ghostContracts.length === 0,
    detail:
      contracts.length === 0
        ? '清单里没有写任何接口契约路径'
        : ghostContracts.length === 0
          ? `${contracts.length} 份接口契约全部在位`
          : `${ghostContracts.length} 份契约文件不存在：${ghostContracts.join('、')}`,
  })

  const failed = checks.filter((c) => !c.ok)
  return { ok: failed.length === 0, project: projectDir, plan: planRel, commands: cmds.length, contracts: contracts.length, checks }
}

// ── 反向用例：造桩件，该红的必须判红 ─────────────────────────────────────────
function selfTest() {
  const dir = join(tmpdir(), `cli_plan_audit_selftest_${process.pid}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(join(dir, 'scripts', 'interfaces'), { recursive: true })
  writeFileSync(join(dir, 'scripts', 'check.mjs'), '// 桩件\n')
  writeFileSync(join(dir, 'scripts', 'interfaces', 'check.interface.json'), '{"id":"x"}\n')

  const cases = []
  cases.push({ name: '反例①：完全没有规划清单 → 判红', value: judge(dir).ok, expect: false })

  writeFileSync(join(dir, 'CLI_PLAN.md'), '# 清单\n| 能力 | 命令 | 契约 |\n| :-- | :-- | :-- |\n| 体检 | `node scripts/check.mjs --check` | `scripts/interfaces/check.interface.json` |\n')
  cases.push({ name: '正例：清单、命令、契约都真实 → 判绿', value: judge(dir).ok, expect: true })

  writeFileSync(join(dir, 'CLI_PLAN.md'), '# 清单\n| 体检 | `node scripts/ghost.mjs --check` | `scripts/interfaces/check.interface.json` |\n')
  const r2 = judge(dir)
  cases.push({ name: '反例②：命令指向不存在的脚本 → 判红', value: r2.checks[1].ok, expect: false })

  writeFileSync(join(dir, 'CLI_PLAN.md'), '# 清单\n| 体检 | `node scripts/check.mjs --check` | `scripts/interfaces/ghost.interface.json` |\n')
  const r3 = judge(dir)
  cases.push({ name: '反例③：契约路径悬空 → 判红', value: r3.checks[2].ok, expect: false })

  writeFileSync(join(dir, 'CLI_PLAN.md'), '# 清单\n\n| 能力 | 命令 |\n| :-- | :-- |\n')
  const r4 = judge(dir)
  cases.push({ name: '反例④：只有空表头没有命令 → 判红', value: r4.checks[0].ok, expect: false })

  rmSync(dir, { recursive: true, force: true })

  let pass = 0
  console.log('=== 反向用例自检（立项 CLI 规划判定器）===')
  for (const c of cases) {
    const ok = c.value === c.expect
    if (ok) pass++
    console.log(`${ok ? '✅' : '❌'} ${c.name} → 实测 ${c.value ? '判绿' : '判红'}`)
  }
  console.log(`${pass}/${cases.length} 条用例通过`)
  return pass === cases.length ? 0 : 1
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--selftest')) return selfTest()
  const i = argv.indexOf('--project')
  const project = i >= 0 && argv[i + 1] ? argv[i + 1] : ROOT
  if (!existsSync(project)) {
    console.error(`⛔ 取不到证据：项目路径不存在 ${project}`)
    return 2
  }
  const res = judge(project)
  if (argv.includes('--json')) {
    console.log(JSON.stringify(res, null, 2))
    return res.ok ? 0 : 1
  }
  console.log('💻 立项 CLI 规划判定')
  console.log('-----------------------------------------')
  console.log(`判定对象：${project}`)
  for (const c of res.checks) console.log(`${c.ok ? '✅' : '❌'} ${c.name}：${c.detail}`)
  console.log('-----------------------------------------')
  console.log(res.ok ? '✅ 通过：CLI 规划在位，且命令与接口契约都真实可达' : '⛔ 不通过：见上述命中项')
  return res.ok ? 0 : 1
}

if (process.argv[1] && process.argv[1].endsWith('cli_plan_audit.mjs')) {
  process.exit(main())
}
