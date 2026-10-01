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
const DSH_HOME = process.env.DSH_HOME || join(HOME, '.dsh')
/** 降级快照路径（REQ-087 R1-b：宿主控制目录不可写时，门禁把快照落到工程内）。 */
const STATUS_FALLBACK = join(ROOT, 'ai-control', 'reports', 'state', 'status.json')

/**
 * 解析宿主 profile 目录。
 * 历史缺陷（实测）：这里曾把 `profiles/web` 写死，而本机 profile 已迁到 `profiles/desktop`
 * → 判定读的是不存在的文件，`控制跳转插件`/宿主注册类条目得出与事实相反的结论。
 * 现在按「DSH_PROFILE_DIR → DSH_PROFILE → 磁盘上真实含 cordis.patch.yml 的 profile」解析。
 */
function resolveProfileDir() {
  const cands = []
  if (process.env.DSH_PROFILE_DIR) cands.push(process.env.DSH_PROFILE_DIR)
  if (process.env.DSH_PROFILE) cands.push(join(DSH_HOME, 'profiles', process.env.DSH_PROFILE))
  for (const c of cands) if (existsSync(join(c, 'cordis.patch.yml'))) return c
  try {
    const base = join(DSH_HOME, 'profiles')
    for (const n of readdirSync(base)) {
      const d = join(base, n)
      if (existsSync(join(d, 'cordis.patch.yml'))) return d
    }
  } catch { /* 无 profiles 目录 */ }
  return join(DSH_HOME, 'profiles', 'desktop')
}
const PROFILE_DIR = resolveProfileDir()
const PROFILE_PATCH = join(PROFILE_DIR, 'cordis.patch.yml')

/** 读门禁快照：宿主机控制目录与工程内降级副本**取新者**（REQ-087 R1-b）。 */
function readStatusSnapshot() {
  const cands = [join(DSH_HOME, '.dsh-control', 'status.json'), STATUS_FALLBACK]
  let best = null
  let bestText = ''
  for (const p of cands) {
    if (!existsSync(p)) continue
    let t
    try { t = readFileSync(p, 'utf8') } catch { continue }
    let j
    try { j = JSON.parse(t) } catch { continue }
    if (!best || String(j.generatedAt || '') >= String(best.generatedAt || '')) { best = j; bestText = t }
  }
  return { status: best, text: bestText, primary: cands[0], fallback: STATUS_FALLBACK }
}

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
    else if (/\.(mjs|cjs|js)$/.test(rel)) cmd = [process.execPath, [rel, ...args]]
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
      name: '判据七 · 通电凭据（机制真跑过）',
      claim: 'docs/constraint_mechanism_optimize_9.md §2.3 · REQ-092 / R3-a',
      check: () => {
        // 为什么单列一条：既有判据只看"载体在不在磁盘"。实测 `isHost=false` 的拦截层插件
        // （从未被加载）在旧口径下也算"载体在位"——在位 ≠ 在跑。
        const p = join(ROOT, 'scripts', 'anti_hallucination_audit.mjs')
        if (!existsSync(p)) return { ok: false, detail: '判定器缺失 scripts/anti_hallucination_audit.mjs', carrier: 'scripts/anti_hallucination_audit.mjs' }
        const r = run(process.execPath, ['scripts/anti_hallucination_audit.mjs', '--check', '--json'], { timeout: 120000 })
        let rows = []
        try { rows = JSON.parse(r.out).powered || [] } catch { rows = [] }
        const unpowered = rows.filter((x) => !x.ok)
        if (!rows.length) return { ok: false, detail: `取不到通电结论（exit=${r.exitCode}）`, carrier: 'scripts/anti_hallucination_audit.mjs' }
        return {
          ok: unpowered.length === 0,
          detail: `通电凭据 ${rows.length - unpowered.length}/${rows.length}${unpowered.length ? ' · 未通电：' + unpowered.map((x) => x.id).join('、') : ''}`,
          carrier: 'scripts/anti_hallucination_audit.mjs',
        }
      },
    },
    {
      name: '判据八 · 引用真实性（无悬空引用）',
      claim: 'docs/constraint_mechanism_optimize_9.md §2.3 · REQ-092 / R3-b',
      check: () => {
        const p = join(ROOT, 'scripts', 'anti_hallucination_audit.mjs')
        if (!existsSync(p)) return { ok: false, detail: '判定器缺失 scripts/anti_hallucination_audit.mjs', carrier: 'scripts/anti_hallucination_audit.mjs' }
        const r = run(process.execPath, ['scripts/anti_hallucination_audit.mjs', '--check', '--json'], { timeout: 120000 })
        let j = null
        try { j = JSON.parse(r.out) } catch { j = null }
        if (!j) return { ok: false, detail: `取不到引用结论（exit=${r.exitCode}）`, carrier: 'scripts/anti_hallucination_audit.mjs' }
        return {
          ok: (j.dangling || []).length === 0,
          detail: `治理文档 ${j.docsScanned} 份 · 校验引用 ${j.checkedRefs} 处 · 悬空 ${(j.dangling || []).length} 处`,
          carrier: 'scripts/anti_hallucination_audit.mjs',
        }
      },
    },
    {
      name: '判据九 · 全域覆盖（无脱管工程）',
      claim: 'docs/constraint_mechanism_optimize_9.md §2.2 R1 · REQ-092 / R1-a',
      check: () => {
        const p = join(ROOT, 'scripts', 'scope_audit.mjs')
        if (!existsSync(p)) return { ok: false, detail: '判定器缺失 scripts/scope_audit.mjs', carrier: 'scripts/scope_audit.mjs' }
        const r = run(process.execPath, ['scripts/scope_audit.mjs', '--check', '--json'], { timeout: 180000 })
        let j = null
        try { j = JSON.parse(r.out) } catch { j = null }
        if (!j) return { ok: false, detail: `取不到覆盖结论（exit=${r.exitCode}）`, carrier: 'scripts/scope_audit.mjs' }
        return {
          ok: !!j.ok,
          detail: `已接管 ${j.covered}/${j.total}${(j.uncovered || []).length ? ' · 未接管：' + j.uncovered.join('、') : ''}`,
          carrier: 'scripts/scope_audit.mjs',
        }
      },
    },
    {
      name: '首动改名（S05）',
      claim: 'AGENTS.md 二 · 第 0 步',
      check: fileExists('scripts/name_me.sh'),
    },
    {
      name: 'G0~G5 累积门禁',
      claim: 'AGENTS.md 一 · 门禁表',
      check: () => {
        // 判定必须读 status.json 的机器字段，不能只看脚本退出码：
        // `control_gates.sh check` 无论门禁是否通过都退出 0（它只负责输出看板），
        // 而门禁失败最常见的成因是"工作树有未提交改动"这类**瞬时**状态。
        // 混在一起报，就会把"马上要提交"误报成"机制坏了"。
        const r = run('bash', ['scripts/control_gates.sh', 'check'])
        const snap = readStatusSnapshot()
        const s = snap.status
        if (!s) return { ok: false, detail: `status.json 两处均不可读（退出码 ${r.exitCode}）`, carrier: 'scripts/control_gates.sh' }
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
      check: () => {
        // REQ-087 R1-a 修复后，证据源不再只依赖拦截层插件：
        // 主源 = 宿主会话转录里的 `todo/write` 事件（宿主自己写，插件不跑也在）。
        const r = run('bash', ['scripts/todo_gate.sh', 'check'])
        let src = '未知'
        try {
          const j = JSON.parse(run('bash', ['scripts/todo_gate.sh', 'json']).out)
          src = j?.evidence?.lastSource === 'host-transcript' ? '宿主转录' : (j?.evidence ? '插件文件' : '无证据')
        } catch { /* 保持未知 */ }
        const first = (r.out.split('\n').filter(Boolean).pop() || '').slice(0, 110)
        return { ok: r.ok, detail: `exit=${r.exitCode} · 证据源 ${src} · ${first}`, carrier: 'scripts/todo_gate.sh' }
      },
    },
    {
      name: 'R1-b 状态快照降级落盘（不静默丢状态）',
      claim: 'REQ-087 R1-b',
      check: () => {
        // 判据：快照必须**至少有一处**真实落盘；宿主目录写不进时，工程内降级副本必须存在。
        const snap = readStatusSnapshot()
        if (!snap.status) {
          return { ok: false, detail: '两处快照均不存在（机制跑过但状态留不下）', carrier: 'ai-control/reports/state/status.json' }
        }
        const hasFallback = existsSync(STATUS_FALLBACK)
        return {
          ok: hasFallback,
          detail: `快照时间 ${snap.status.generatedAt} · 降级副本${hasFallback ? '在位' : '缺失'} · 门禁 ${snap.status.gatePassed}/${snap.status.gateTotal}`,
          carrier: 'ai-control/reports/state/status.json',
        }
      },
    },
    {
      name: 'S11 写后必读回（迭代台账载体）',
      claim: 'task_execution_flow.md 防线 4',
      check: () => {
        // REQ-087 R1-c：S11 从"仅靠自觉"升级为**有物理载体**——
        // `progress_ledger record` 每次改动后重新从磁盘读回、算 sha256、跑回读断言；
        // `selftest` 三态（无漂移 / 改了没重记必检出 / 重记后清零）证明判定逻辑真的活着。
        // 硬判定 = 载体存在且判定逻辑可复现；"当前这轮有多少漂移" 交给软条目与流程监督员。
        const r = run(process.execPath, ['scripts/progress_ledger.mjs', 'selftest'], { timeout: 60000 })
        const first = (r.out.split('\n').filter(Boolean).pop() || '').slice(0, 110)
        return { ok: r.ok, detail: `exit=${r.exitCode} · ${first}`, carrier: 'scripts/progress_ledger.mjs' }
      },
    },
    {
      name: 'R2 迭代检测一致性（漂移 / 未记录改动）',
      claim: 'REQ-087 R2',
      strict: false,
      check: () => {
        const r = run(process.execPath, ['scripts/progress_ledger.mjs', 'check'], { timeout: 90000 })
        const first = (r.out.split('\n').filter(Boolean).pop() || '').slice(0, 130)
        // softKind='judged'：载体**存在且可用**，只是这一轮判定没过（有漂移/未记录改动）。
        // 与"根本没有载体"必须区分——混在一起会把"该登记"误报成"机制不存在"。
        return { ok: r.ok, soft: !r.ok, softKind: r.ok ? undefined : 'judged', detail: `exit=${r.exitCode} · ${first}`, carrier: 'scripts/progress_ledger.mjs' }
      },
    },
    {
      name: 'R3 流程管控层（顺序最优 + 更新后一致）',
      claim: 'REQ-087 R3 / task_execution_flow.md 二之五',
      check: () => {
        const r = run(process.execPath, ['scripts/flow_control.mjs', '--check'], { timeout: 60000 })
        const first = (r.out.split('\n').filter(Boolean).pop() || '').slice(0, 140)
        return { ok: r.ok, detail: `exit=${r.exitCode} · ${first}`, carrier: 'scripts/flow_control.mjs' }
      },
    },
    {
      name: '流程监督员（判定器形态 · 独立复核）',
      claim: 'REQ-087 R1-d（原 process-supervisor-agent 无宿主注册面，改判据器形态）',
      check: () => {
        // 刻意**不**整单跑它：process_supervisor 会回调 mechanism_audit，整跑会递归。
        // 判据 = 载体在位 + 语法可解析 + 复核项清单完整（用 --list 读真实登记，不是读文档）。
        const p = join(ROOT, 'scripts', 'process_supervisor.mjs')
        if (!existsSync(p)) return { ok: false, detail: '载体缺失', carrier: 'scripts/process_supervisor.mjs' }
        const syn = run(process.execPath, ['--check', 'scripts/process_supervisor.mjs'], { timeout: 30000 })
        if (!syn.ok) return { ok: false, detail: `语法自检失败：${syn.out.slice(0, 80)}`, carrier: 'scripts/process_supervisor.mjs' }
        const list = run(process.execPath, ['scripts/process_supervisor.mjs', '--list'], { timeout: 30000 })
        const n = (list.out.match(/^\s*\S+\s/gm) || []).length
        return {
          ok: list.ok && n >= 8,
          detail: `语法 ✅ · 复核项 ${n} 条（硬项需全绿才结项）`,
          carrier: 'scripts/process_supervisor.mjs',
        }
      },
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
        const r1 = run(process.execPath, ['scripts/redundancy_scan.mjs', '--root', '.'])
        const r2 = run(process.execPath, ['scripts/conflict_scan.mjs', '--root', '.'])
        const r3 = run(process.execPath, ['scripts/legacy_align_scan.mjs', '--root', '.'])
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
      name: '控制跳转插件（常显调控按钮）',
      claim: 'skill-pool/plugins/dsh-plugin-control-jump',
      strict: false,
      check: () => {
        const pkg = existsSync(join(ROOT, 'skill-pool', 'plugins', 'dsh-plugin-control-jump', 'package.json'))
        // 注册有两条独立路径，判据必须看**真正决定加载的那一条**：
        //   ① profile 的 dsh.profile.bundles 列表（本机实测就是这条，见 profiles/<当前 profile>/package.json）；
        //   ② cordis.patch.yml 里显式 insert 条目（另一种写法）。
        // 2026-09-28 审计曾只看 ②，于是把"已装且已进 bundles"误判为"未注册"——
        // 判据选错，会得出与事实相反的结论。
        const profilePkg = join(PROFILE_DIR, 'package.json')
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
    {
      // REQ-090 R6：一键重启按钮。判据**不看"装了没"**，而看"自检能不能跑通"——
      // 因为宿主激活凭据要重启一次才有，把它当硬门会让本条长期恒红。
      // 真正的合格证据是重启前后宿主 PID 变化，那只能由人点一次（README §三），机器不能替。
      name: '一键重启按钮（双半插件 · 自检为凭）',
      claim: 'skill-pool/plugins/dsh-plugin-restart · REQ-090 R6',
      strict: false,
      check: () => {
        const dir = join(ROOT, 'skill-pool', 'plugins', 'dsh-plugin-restart')
        const src = join(dir, 'src', 'restart-core.cjs')
        if (!existsSync(src)) return { ok: false, detail: '插件源码缺失', carrier: 'skill-pool/plugins/dsh-plugin-restart' }
        const built = run('python3', ['skill-pool/plugins/dsh-plugin-restart/build_client.py', '--check'], { timeout: 60000 })
        if (!built.ok) return { ok: false, detail: `bundle 陈旧（源码改了没重建）· exit=${built.exitCode}`, carrier: 'skill-pool/plugins/dsh-plugin-restart' }
        const st = run(process.execPath, ['skill-pool/plugins/dsh-plugin-restart/verify_restart_button.cjs'], { timeout: 90000 })
        const last = (st.out.split('\n').filter(Boolean).pop() || '').slice(0, 110)
        return { ok: st.ok, detail: `bundle 未陈旧 · 打桩自检 ${st.ok ? 'exit 0' : 'exit=' + st.exitCode} · ${last}`, carrier: 'skill-pool/plugins/dsh-plugin-restart' }
      },
    },
    {
      // REQ-090 R1/R2/R3/R5：输出结构契约（首行徽标 / 一句话总结 / 层级不跳级 / 缩进 / 进度回执 / 档位）
      // 判据不只看"脚本在不在"，而是**真的跑一次反向自检**：判定器必须先能判红，否则等于没有判定器。
      name: '输出结构契约判定（R1/R2/R3/R5）',
      claim: 'rules/system/output_standard.md · REQ-090',
      check: () => {
        const spec = join(ROOT, 'rules', 'system', 'output_standard.md')
        if (!existsSync(spec)) return { ok: false, detail: '契约权威源缺失 rules/system/output_standard.md', carrier: spec }
        const r = run(process.execPath, ['scripts/output_audit.mjs', '--self-test'], { timeout: 90000 })
        const last = (r.out.split('\n').filter(Boolean).pop() || '').slice(0, 110)
        return { ok: r.ok, detail: `${r.ok ? 'exit 0' : 'exit=' + r.exitCode} · ${last}`, carrier: 'scripts/output_audit.mjs' }
      },
    },
    {
      // REQ-090 R4：文字可读性 = 无生僻字。基准是国标 GB2312 字表，不是模型语感。
      name: '文字可读性判定（无生僻字）',
      claim: 'rules/system/language_standard.md §四 · REQ-090',
      check: () => {
        const tbl = join(ROOT, 'data', 'common_chars.txt')
        const drift = run(process.execPath, ['scripts/gen_common_chars.mjs', '--check'], { timeout: 90000 })
        if (!existsSync(tbl)) return { ok: false, detail: '基准字表缺失 data/common_chars.txt', carrier: tbl }
        if (!drift.ok) return { ok: false, detail: `字表与国标推导不一致（基准已漂移）· exit=${drift.exitCode}`, carrier: 'scripts/gen_common_chars.mjs' }
        const st = run(process.execPath, ['scripts/language_audit.mjs', '--self-test'], { timeout: 90000 })
        const last = (st.out.split('\n').filter(Boolean).pop() || '').slice(0, 110)
        return { ok: st.ok, detail: `字表未漂移 · 判定器自检 ${st.ok ? 'exit 0' : 'exit=' + st.exitCode} · ${last}`, carrier: 'scripts/language_audit.mjs' }
      },
    },
    {
      // REQ-090 R2 的数据来源：进度回执的数字必须能由台账复算，不许手写。
      // 判据为什么不用 `report --json` 实跑：它是**全量 git 状态扫描**，实测在本机
      // 超过 90 秒（spawnSync ETIMEDOUT），把它塞进巡更会让审计本身不可用。
      // 改为两条轻量但真实的证据：① 台账自检跑通（逻辑有效）② `report` 子命令在源码中确有实现。
      name: '进度回执数据源（可复算，禁手写）',
      claim: 'AGENTS.md §五.3 · REQ-090',
      check: () => {
        const p = join(ROOT, 'scripts', 'progress_ledger.mjs')
        if (!existsSync(p)) return { ok: false, detail: '载体缺失 scripts/progress_ledger.mjs', carrier: 'scripts/progress_ledger.mjs' }
        const src = readFileSync(p, 'utf8')
        const hasReport = /case\s+'report'|'report':/.test(src) || src.includes("--report") || src.includes("'report'")
        const st = run(process.execPath, ['scripts/progress_ledger.mjs', 'selftest'], { timeout: 60000 })
        const last = (st.out.split('\n').filter(Boolean).pop() || '').slice(0, 110)
        const ok = hasReport && st.ok
        return {
          ok,
          detail: `report 子命令${hasReport ? '✅在源码中' : '⛔缺失'} · 台账自检 ${st.ok ? 'exit 0' : 'exit=' + st.exitCode} · ${last}`,
          carrier: 'scripts/progress_ledger.mjs',
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
      softKind: outcome.softKind || null,
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
    const verdict = r.ok ? '✅ 已触达'
      : r.softKind === 'judged' ? '⚠️ 判定未过（有载体）'
      : r.soft ? '⚠️ 无物理载体' : '⛔ 未触达'
    console.log(`| ${r.name} | \`${r.carrier}\` | ${r.detail} | ${verdict} |`)
  }
  if (softGaps.length) {
    console.log('')
    const noCarrier = softGaps.filter((r) => r.softKind !== 'judged')
    const judged = softGaps.filter((r) => r.softKind === 'judged')
    if (judged.length) {
      console.log('')
      console.log('**⚠️ 载体在位但本轮判定未过（改完要登记 / 要重跑）**：')
      for (const r of judged) console.log(`- **${r.name}**：${r.detail}`)
    }
    if (noCarrier.length) {
      console.log('')
      console.log('**⚠️ 仅有文字、没有物理载体的项（"虚无缥缈"清单）**：')
      for (const r of noCarrier) console.log(`- **${r.name}**：${r.detail}｜宣称出处：${r.claim}`)
    }
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
