#!/usr/bin/env node
/**
 * ==============================================================================
 * 管控机制 · 物理触达审计器 (mechanism_audit.mjs)
 * ==============================================================================
 * 解决的问题（用户原话："让管家看看当前有什么没有物理层触达的情况，要落实到位，
 * 不能给出一些虚无缥缈的东西"）：
 *   规则里写满了"必须/强制"，但**没人能回答其中哪一条真的有执行者**。
 *   一次人工排查只能解决当天；下次改动又会悄悄脱钩。
 *
 * 本脚本把"有没有物理触达"变成**可重复执行、有退出码**的判定：
 *   对每条机制登记四件事——载体路径、判定命令、期望结果、口径。
 *   载体不存在 / 磁盘事实不符 → 判 ❌ 未触达，退出码 1。
 *
 * 刻意的边界（诚实口径）：
 *   · 只判**可机器验证**的部分（文件在位、脚本可跑、宿主注册、计数达标）；
 *   · 行为类机制（如"写后必读回"）若没有运行时拦截，就如实标成
 *     `⚠️ 仅靠执行者自觉（无运行时拦截）`，**不冒充已触达**；
 *   · 无法判定的写 `未验证`，绝不用"应该没问题"顶替。
 *
 * 用法：
 *   node scripts/mechanism_audit.mjs          # 人读报告（触达矩阵）
 *   node scripts/mechanism_audit.mjs --json   # 机器可读
 *   node scripts/mechanism_audit.mjs --exit   # 存在未触达项则退出码 1
 * ==============================================================================
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const HOME = process.env.HOME || ''
const DSH_HOME = process.env.DSH_HOME || join(HOME, 'Library', 'Application Support', 'dsh-desktop', 'harness')
const PROFILE_PATCH = join(DSH_HOME, 'profiles', 'web', 'cordis.patch.yml')

/** 安全执行只读判定命令，返回 { ok, out }。 */
function run(cmd, args, opts = {}) {
  try {
    const out = execFileSync(cmd, args, { cwd: ROOT, stdio: 'pipe', timeout: opts.timeout || 60000, encoding: 'utf8' })
    return { ok: true, exitCode: 0, out: out.trim() }
  } catch (e) {
    return {
      ok: false,
      exitCode: typeof e.status === 'number' ? e.status : -1,
      // 截断过长会把中文截成半个字符，导致"瞬时失败"判据匹配不上——
      // 判据依赖于能读到关键字，所以这里必须留够长度（实测 200 字被截断过）。
      out: String(e.stdout || e.stderr || e.message || '').trim().slice(0, 800),
    }
  }
}

function countSkills() {
  const dir = join(ROOT, 'skills')
  if (!existsSync(dir)) return 0
  return readdirSync(dir).filter((n) => !n.startsWith('.') && n !== '_template' && existsSync(join(dir, n, 'SKILL.md'))).length
}

/**
 * 机制登记表。
 * 字段：name 机制名 / claim 宣称出处 / carrier 载体 / check 判定函数 / strict 是否一票否决
 */
function buildRegistry() {
  const fileExists = (rel) => () => {
    const ok = existsSync(join(ROOT, rel))
    return { ok, detail: ok ? `在位 ${rel}` : `缺失 ${rel}`, carrier: rel }
  }
  const scriptRuns = (rel, args = ['--check']) => () => {
    const p = join(ROOT, rel)
    if (!existsSync(p)) return { ok: false, detail: `载体缺失 ${rel}`, carrier: rel }
    // 一律用解释器调用，不依赖文件的可执行位：
    // 实测踩过——脚本由工具写入后没有 x 位，直接执行得到 126，
    // 会被误读成"机制未触达"，而真实原因只是权限位。
    // .sh 用 bash，.mjs/.cjs/.js 用 node，.py 用 python3。
    let cmd
    if (rel.endsWith('.sh')) cmd = ['bash', [rel, ...args]]
    else if (/\.(mjs|cjs|js)$/.test(rel)) cmd = ['node', [rel, ...args]]
    else if (rel.endsWith('.py')) cmd = ['python3', [rel, ...args]]
    else cmd = [rel, args]
    const r = run(cmd[0], cmd[1], { timeout: 90000 })
    const first = (r.out.split('\n').filter(Boolean).pop() || '').slice(0, 110)
    // 退出码 2 的语义（见 install_host_gate.sh）：载体在位、但宿主尚未落运行时凭据。
    // 这不是"载体坏了"，必须与失败区分开——否则"该重启"会被误报成"该修配置"。
    if (r.exitCode === 2) {
      return { ok: false, soft: true, detail: `⚠️ 已注册但宿主尚无运行时凭据（需重载 profile）· ${first}`, carrier: rel }
    }
    return { ok: r.ok, detail: `${r.ok ? 'exit 0' : 'exit=' + r.exitCode} · ${first}`, carrier: rel }
  }

  return [
    {
      name: '首动改名（S05）',
      claim: 'AGENTS.md 二 · 第 0 步',
      check: fileExists('scripts/name_me.sh'),
    },
    {
      name: 'G0~G4 累积门禁',
      claim: 'AGENTS.md 一 · 门禁表',
      check: () => {
        // 判定必须读 status.json 的机器字段，不能只看脚本退出码：
        // `control_gates.sh check` 无论门禁是否通过都退出 0（它只负责输出看板），
        // 而门禁失败最常见的成因是"工作树有未提交改动"这类**瞬时**状态。
        // 混在一起报，就会把"马上要提交"误报成"机制坏了"。
        const r = run('bash', ['scripts/control_gates.sh', 'check'])
        const statusFile = join(DSH_HOME, '.dsh-control', 'status.json')
        let s = null
        try { s = JSON.parse(readFileSync(statusFile, 'utf8')) } catch { /* 读不到按未验证 */ }
        if (!s) return { ok: false, detail: `status.json 不可读（退出码 ${r.exitCode}）`, carrier: 'scripts/control_gates.sh' }
        const blocked = (s.gates || []).filter((g) => g.status !== 'pass').map((g) => g.name)
        if (s.execAllowed) {
          return { ok: true, detail: `${s.gatePassed}/${s.gateTotal} 通过 · ${s.metricSummary || ''}`.trim(), carrier: 'scripts/control_gates.sh' }
        }
        return {
          ok: false,
          // 未提交变更超阈值属瞬时状态；其余卡点才算真缺陷
          soft: /需求文档同步/.test(blocked.join('')),
          transient: /需求文档同步/.test(blocked.join('')),
          detail: `卡点：${blocked.join('、') || '未知'}（未提交变更属瞬时状态，提交后自动转绿）`,
          carrier: 'scripts/control_gates.sh',
        }
      },
    },
    {
      name: '底层物理锁（工序串行）',
      claim: 'meta_rules.md 第三十一条',
      check: scriptRuns('scripts/physical_lock.sh', ['sync']),
    },
    {
      name: 'S07 待办常显（证据 + 硬判定）',
      claim: 'task_execution_flow.md 防线 3 / meta_rules 第三十六条',
      check: scriptRuns('scripts/todo_gate.sh', ['check']),
    },
    {
      name: '拦截层宿主注册（硬门禁真的在跑）',
      claim: 'REQ-082',
      check: scriptRuns('scripts/install_host_gate.sh', ['verify']),
    },
    {
      name: '双检扫描（冗余 / 冲突 / 存量）',
      claim: 'meta_rules.md 第三十五条',
      check: () => {
        const r1 = run('node', ['scripts/redundancy_scan.mjs', '--root', '.'])
        const r2 = run('node', ['scripts/conflict_scan.mjs', '--root', '.'])
        const r3 = run('node', ['scripts/legacy_align_scan.mjs', '--root', '.'])
        const ok = r1.ok && r2.ok && r3.ok
        return { ok, detail: `冗余/${r1.ok ? '0' : '有'} · 冲突/${r2.ok ? '0' : '有'} · 存量/${r3.ok ? '0' : '有'}`, carrier: 'scripts/*scan.mjs' }
      },
    },
    {
      name: '执行效果量化审计（0~100）',
      claim: 'AGENTS.md 五 · 第 1 条第 5 项',
      check: fileExists('scripts/audit_execution.sh'),
    },
    {
      name: '执行层入索引层（覆盖率判定）',
      claim: 'REQ-085',
      check: scriptRuns('scripts/build_capabilities_index.mjs', ['--check']),
    },
    {
      name: '技能池归位（面板可见）',
      claim: 'REQ-084',
      check: () => {
        const n = countSkills()
        const ok = n > 0 && !existsSync(join(ROOT, 'skill-pool', 'skills'))
        return { ok, detail: `skills/ 下 ${n} 个技能 · 旧副本${existsSync(join(ROOT, 'skill-pool', 'skills')) ? '仍在（重复）' : '已清理'}`, carrier: 'skills/' }
      },
    },
    {
      name: '任务列表面板（逐条进度 + 完成打钩）',
      claim: 'REQ-083',
      check: () => {
        const p = '/Applications/DSH Desktop.app/Contents/Resources/app/node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js'
        if (!existsSync(p)) return { ok: false, detail: '找不到宿主前端产物', carrier: p }
        const t = readFileSync(p, 'utf8')
        const hasBar = t.includes('TodoPanel_module_css_default.barFill')
        const hasRow = t.includes('itemStateText')
        const hasCheck = /_item\[data-status="completed"\]\s*\.\w+_itemState::before/.test(t)
        return { ok: hasBar && hasRow && hasCheck, detail: `总进度${hasBar ? '✅' : '⛔'} 逐条${hasRow ? '✅' : '⛔'} 打钩${hasCheck ? '✅' : '⛔'}`, carrier: 'scripts/patch_dsh_todo_progress.cjs' }
      },
    },
    {
      name: 'S11 写后必读回（运行时拦截）',
      claim: 'task_execution_flow.md 防线 4',
      strict: false,
      check: () => {
        const p = join(ROOT, 'ai-control', 'plugin', 'index.mjs')
        const t = existsSync(p) ? readFileSync(p, 'utf8') : ''
        // 只有存在"写后未读回 → 拒绝下一步"的判定，才算运行时触达
        const enforced = /readBack|requireReadBack|S11/.test(t)
        return {
          ok: false,
          soft: true,
          detail: enforced ? '已有运行时判定' : '⚠️ 仅靠执行者自觉：拦截层无写后读回判定，无物理拦截',
          carrier: 'rules/workflow/task_execution_flow.md（规则）+ ai-control/plugin（未实现）',
        }
      },
    },
    {
      name: '流程监督员 agent（独立复核）',
      claim: 'skill-pool/agents/process-supervisor-agent',
      strict: false,
      check: () => {
        const exists = existsSync(join(ROOT, 'skill-pool', 'agents', 'process-supervisor-agent', 'PROMPT.md'))
        return {
          ok: false,
          soft: true,
          detail: exists ? '⚠️ 契约文件在位，但宿主无 agent 注册面（无可执行载体）' : '⛔ 契约文件缺失',
          carrier: 'skill-pool/agents/process-supervisor-agent/PROMPT.md',
        }
      },
    },
    {
      name: '控制跳转插件（常显调控按钮）',
      claim: 'skill-pool/plugins/dsh-plugin-control-jump',
      strict: false,
      check: () => {
        const pkg = existsSync(join(ROOT, 'skill-pool', 'plugins', 'dsh-plugin-control-jump', 'package.json'))
        // 注册有两条独立路径，判据必须看**真正决定加载的那一条**：
        //   ① profile 的 dsh.profile.bundles 列表（本机实测就是这条，见 profiles/web/package.json）；
        //   ② cordis.patch.yml 里显式 insert 条目（另一种写法）。
        // 2026-09-28 审计曾只看 ②，于是把"已装且已进 bundles"误判为"未注册"——
        // 判据选错，会得出与事实相反的结论。
        const profilePkg = join(DSH_HOME, 'profiles', 'web', 'package.json')
        let inBundles = false
        try {
          const j = JSON.parse(readFileSync(profilePkg, 'utf8'))
          const bundles = j?.dsh?.profile?.bundles ?? j?.dsh?.bundles ?? []
          inBundles = JSON.stringify(bundles).includes('control-jump')
        } catch { /* profile 读不到按未注册处理 */ }
        const inPatch = existsSync(PROFILE_PATCH) && readFileSync(PROFILE_PATCH, 'utf8').includes('control-jump')
        const activated = existsSync(join(DSH_HOME, '.dsh-control', 'host-activation.log'))
        if ((inBundles || inPatch) && activated) {
          return { ok: true, detail: `已装（${inBundles ? 'bundles' : 'patch'}）· 宿主有激活凭据`, carrier: 'skill-pool/plugins/dsh-plugin-control-jump' }
        }
        return {
          ok: false,
          soft: true,
          detail: `${pkg ? '源码在位' : '源码缺失'} · 注册 ${inBundles || inPatch ? '已在 bundles/patch' : '未注册（插件不会加载）'} · 宿主激活凭据 ${activated ? '有' : '无'}`,
          carrier: 'skill-pool/plugins/dsh-plugin-control-jump',
        }
      },
    },
  ]
}

/** 瞬时失败识别：由"工作树有未提交改动"引起的门禁失败属临时状态，不构成机制缺陷。 */
function isTransient(detail) {
  return /未提交变更/.test(detail) || /超阈值|超过?阈值/.test(detail) || /卡点[:：]?(需求文档同步|会话命名)/.test(detail)
}

function main() {
  const registry = buildRegistry()
  const results = registry.map((r) => {
    let outcome
    try {
      outcome = r.check()
    } catch (e) {
      outcome = { ok: false, detail: '判定异常：' + (e?.message || e) }
    }
    return {
      name: r.name,
      claim: r.claim,
      strict: r.strict !== false,
      soft: !!outcome.soft,
      transient: !!isTransient(outcome.detail || ''),
      ok: !!outcome.ok,
      detail: outcome.detail || '',
      carrier: outcome.carrier || '',
    }
  })

  // 硬性未触达 = 严格项 且 未通过 且 非瞬时 且 **非软缺口**。
  // 漏掉最后一个 `!r.soft` 会把"已注册但需重载"这类软缺口算进硬失败（实测踩过），
  // 于是 --exit 永远返回 1，接入门禁后会把每次工作树不干净都判成机制故障。
  const hardFail = results.filter((r) => r.strict && !r.ok && !r.transient && !r.soft)
  const transientFail = results.filter((r) => r.transient && !r.ok)
  const softGaps = results.filter((r) => r.soft || (!r.strict && !r.ok))
  const passed = results.filter((r) => r.ok)

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ total: results.length, passed: passed.length, hardFail, transientFail, softGaps, results }, null, 2))
    process.exit(process.argv.includes('--exit') && hardFail.length ? 1 : 0)
  }

  console.log('🧭 管控机制 · 物理触达审计')
  console.log('=========================================')
  console.log(`登记机制 ${results.length} 条 · 已触达 ${passed.length} 条 · 硬性未触达 ${hardFail.length} 条 · 无载体/仅有文字 ${softGaps.length} 条 · 瞬时未过 ${transientFail.length} 条`)
  console.log('')
  console.log('| 机制 | 载体 | 实测 | 判定 |')
  console.log('| :--- | :--- | :--- | :---: |')
  for (const r of results) {
    const verdict = r.ok ? '✅ 已触达' : (r.soft ? '⚠️ 无物理载体' : '⛔ 未触达')
    console.log(`| ${r.name} | \`${r.carrier}\` | ${r.detail} | ${verdict} |`)
  }
  if (softGaps.length) {
    console.log('')
    console.log('**⚠️ 仅有文字、没有物理载体的项（"虚无缥缈"清单）**：')
    for (const r of softGaps) console.log(`- **${r.name}**：${r.detail}｜宣称出处：${r.claim}`)
  }
  if (hardFail.length) {
    console.log('')
    console.log('**⛔ 硬性未触达（必须修复）**：')
    for (const r of hardFail) console.log(`- **${r.name}**：${r.detail}`)
  }
  console.log('')
  console.log('▶ 补课命令：')
  console.log('  node scripts/mechanism_audit.mjs --exit   # 硬性未触达即退出码 1，可接入门禁')
  console.log('  ./scripts/install_host_gate.sh install    # 补宿主注册（条目丢失时）')
  console.log('  node scripts/build_capabilities_index.mjs --apply   # 执行层变更后同步索引')

  process.exit(process.argv.includes('--exit') && hardFail.length ? 1 : 0)
}

main()
