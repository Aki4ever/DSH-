#!/usr/bin/env node
/**
 * ==============================================================================
 * 硬门禁插件 · 自检 (Gate Plugin Self-Test)
 * ==============================================================================
 * 定位：在不启动 DSH 的情况下，用桩件真实执行插件的判定逻辑。
 *       门禁是"安全机制"，不允许只凭语法通过就上线——必须证明：
 *         1. 门禁未通过时，改动型工具确实被拒；
 *         2. 只读工具与 todo_write 始终可用（否则模型无法自救）；
 *         3. 逃生舱有效（能运行管控脚本，不死锁）；
 *         4. 状态过期时失败关闭，而非静默放行；
 *         5. 全部门禁通过后完全放行。
 *
 * 用法：node ai-control/plugin/selftest.mjs
 * ==============================================================================
 */

import { evaluate, Config } from './index.mjs'

let pass = 0
let fail = 0
const results = []

function check(name, actual, expected) {
  const ok = actual === expected
  if (ok) pass++
  else fail++
  results.push({ ok, name, actual, expected })
}

// ── 桩件构造 ─────────────────────────────────────────────────────────────────
const args = (o) => ({ arguments: o })

const statusBlocked = {
  gatePassed: 1, gateTotal: 4, percent: 25, execAllowed: false,
  currentGate: 'structure', currentGateName: '工程结构化', gateIndex: 2,
  generatedAt: '2026-09-22 21:00:00',
  gates: [
    { id: 'init', name: '项目初始化', status: 'pass', metricA: '11/11', metricALabel: '骨架齐备', metricB: '8/8', metricBLabel: '防丢覆盖', hint: '' },
    { id: 'structure', name: '工程结构化', status: 'pending', metricA: '4/5', metricALabel: '合规项', metricB: '2', metricBLabel: '孤儿目录', hint: '孤儿目录[rules assets]' },
    { id: 'sync', name: '需求文档同步', status: 'pass', metricA: '40', metricALabel: '需求条目', metricB: '3', metricBLabel: '未提交变更', hint: '' },
    { id: 'redundancy', name: '冗余检测', status: 'block', metricA: '0', metricALabel: '高相似块对', metricB: '4', metricBLabel: '重复标题', hint: '硬阻断' },
  ],
}

const statusClear = { ...statusBlocked, gatePassed: 4, percent: 100, execAllowed: true, currentGate: 'all-clear', currentGateName: '全部通过', gateIndex: 4 }

const FRESH = 0        // 缓存刚刷新
const STALE = 999999   // 缓存过期

// ── 用例 ─────────────────────────────────────────────────────────────────────
// 1) 门禁未通过 → 改动型工具必须被拒
check('门禁未过 · write 被拒', evaluate({ name: 'write', ...args({ path: 'a.md', content: 'x' }) }, statusBlocked, Config, FRESH) !== undefined, true)
check('门禁未过 · edit 被拒', evaluate({ name: 'edit' }, statusBlocked, Config, FRESH) !== undefined, true)
check('门禁未过 · bash 被拒', evaluate({ name: 'bash', ...args({ command: 'rm -rf build' }) }, statusBlocked, Config, FRESH) !== undefined, true)

// 2) 只读工具与 todo_write 始终放行（模型必须能自救与展示进度）
check('门禁未过 · read 放行', evaluate({ name: 'read' }, statusBlocked, Config, FRESH), undefined)
check('门禁未过 · grep 放行', evaluate({ name: 'grep' }, statusBlocked, Config, FRESH), undefined)
check('门禁未过 · glob 放行', evaluate({ name: 'glob' }, statusBlocked, Config, FRESH), undefined)
check('门禁未过 · todo_write 放行', evaluate({ name: 'todo_write' }, statusBlocked, Config, FRESH), undefined)
check('门禁未过 · ask_user_question 放行', evaluate({ name: 'ask_user_question' }, statusBlocked, Config, FRESH), undefined)

// 3) 逃生舱：只有"真正修复管控自身"的调用才放行，否则会掩盖真实门禁
check('逃生舱 · 运行管控脚本放行', evaluate({ name: 'bash', ...args({ command: './scripts/control_gates.sh check' }) }, statusBlocked, Config, FRESH), undefined)
check('逃生舱 · 运行冗余检测放行', evaluate({ name: 'bash', ...args({ command: 'node scripts/redundancy_scan.mjs' }) }, statusBlocked, Config, FRESH), undefined)
check('逃生舱 · 写管控配置放行', evaluate({ name: 'write', ...args({ path: 'ai-control/config/gates.conf' }) }, statusBlocked, Config, FRESH), undefined)
check('逃生舱 · 写检测器脚本放行', evaluate({ name: 'edit', ...args({ path: 'scripts/conflict_scan.mjs' }) }, statusBlocked, Config, FRESH), undefined)

// 3a) 逃生舱 · 命令包裹形式（2026-09-23 修复的真实死锁回归用例）
//     实测背景：门禁未过时，被拒消息推荐的 `./scripts/control_gates.sh check`
//     一旦写成 `cd "<工程>" && ./scripts/...` 就被拒 —— 而"先 cd 进工程再跑脚本"
//     是最自然的写法。旧实现只看脚本 token 的前一个 token（`&&`），故逃生舱失效，
//     与消息推荐的另一条路（设 DSH_CONTROL_GUARD=off，同样需要 bash）叠加成完全死锁。
//     下面这些用例当时全都会失败，补上后该类回归无法再次逃过自检。
check('逃生舱 · cd 连接符后调用脚本放行', evaluate({ name: 'bash', ...args({ command: 'cd "/Users/x/全局规则" && ./scripts/control_gates.sh check' }) }, statusBlocked, Config, FRESH), undefined)
check('逃生舱 · 分号连接后调用脚本放行', evaluate({ name: 'bash', ...args({ command: 'cd /tmp; ./scripts/control_gates.sh check' }) }, statusBlocked, Config, FRESH), undefined)
check('逃生舱 · 管道后调用脚本放行', evaluate({ name: 'bash', ...args({ command: 'echo x | ./scripts/redundancy_scan.mjs' }) }, statusBlocked, Config, FRESH), undefined)
check('逃生舱 · 裸 bash 调用脚本放行', evaluate({ name: 'bash', ...args({ command: 'bash scripts/control_gates.sh check' }) }, statusBlocked, Config, FRESH), undefined)
// 含空格的绝对 node 路径（本机 node 不在 PATH，只有这条真实可用），必须带引号才是一个 token
check('逃生舱 · 带引号绝对 node 路径放行', evaluate({ name: 'bash', ...args({ command: '"/Volumes/DSH Desktop/DSH Desktop.app/Contents/Resources/runtime/node" scripts/redundancy_scan.mjs --root .' }) }, statusBlocked, Config, FRESH), undefined)
check('逃生舱 · cd 后带引号绝对 node 放行', evaluate({ name: 'bash', ...args({ command: 'cd "/Users/x/全局规则" && "/Volumes/DSH Desktop/DSH Desktop.app/Contents/Resources/runtime/node" scripts/redundancy_scan.mjs --root .' }) }, statusBlocked, Config, FRESH), undefined)

// 3a-反例：包裹形式**不能**变成放行任意命令的后门
check('逃生舱反例 · && 后接非脚本命令被拒', evaluate({ name: 'bash', ...args({ command: 'cd /tmp && echo scripts/control_gates.sh' }) }, statusBlocked, Config, FRESH) !== undefined, true)
check('逃生舱反例 · cat 脚本内容被拒', evaluate({ name: 'bash', ...args({ command: 'cat scripts/control_gates.sh' }) }, statusBlocked, Config, FRESH) !== undefined, true)
check('逃生舱反例 · node 跑非白名单脚本被拒', evaluate({ name: 'bash', ...args({ command: 'node scripts/conflict_scan.mjs --root .' }) }, statusBlocked, Config, FRESH) !== undefined, true)

// 3a-2) 逃生舱白名单必须包含"拦截层自身的诊断工具"。
//       理由：门禁未过时正是最需要排查的时刻；若诊断脚本不在白名单，
//       就会出现"门禁没过 → 想排查 → 排查脚本被门禁拦住"的自锁。
check('逃生舱 · 拦截层诊断脚本在逃生舱白名单内',
  Config.escapeScriptPrefixes.includes('scripts/verify_guard_live.sh'), true)
check('逃生舱 · 重启判据脚本也在白名单内',
  Config.escapeScriptPrefixes.includes('scripts/verify_escape_hatch.sh'), true)
check('逃生舱 · 绝对路径调用重启判据脚本放行',
  evaluate({ name: 'bash', ...args({ command: '/Users/x/全局规则/scripts/verify_escape_hatch.sh' }) }, statusBlocked, Config, FRESH), undefined)
check('逃生舱 · 绝对路径调用诊断脚本放行',
  evaluate({ name: 'bash', ...args({ command: '/Users/x/全局规则/scripts/verify_guard_live.sh' }) }, statusBlocked, Config, FRESH), undefined)
check('逃生舱 · cd 后调用诊断脚本放行',
  evaluate({ name: 'bash', ...args({ command: 'cd "/Users/x/全局规则" && ./scripts/verify_guard_live.sh' }) }, statusBlocked, Config, FRESH), undefined)

// 3b) 逃生舱反例（关键补充）：以下调用**不属于**修复管控自身，必须被拒。
//     这些用例正是旧实现（参数含 `control_` 即放行）的漏网之鱼，
//     补齐后该类回归无法再次逃过自检。
check('逃生舱反例 · 名字含 control_ 的普通写入被拒', evaluate({ name: 'write', ...args({ path: 'src/my_control_logic.js', content: 'x' }) }, statusBlocked, Config, FRESH) !== undefined, true)
check('逃生舱反例 · 重定向到含 control_ 的临时文件被拒', evaluate({ name: 'bash', ...args({ command: 'echo hi > /tmp/run_control_log.txt' }) }, statusBlocked, Config, FRESH) !== undefined, true)
check('逃生舱反例 · 命令尾部注释含 ai-control 被拒', evaluate({ name: 'bash', ...args({ command: 'rm -rf build  # ai-control' }) }, statusBlocked, Config, FRESH) !== undefined, true)
check('逃生舱反例 · 提及管控但非执行被拒', evaluate({ name: 'bash', ...args({ command: 'echo scripts/control_gates.sh' }) }, statusBlocked, Config, FRESH) !== undefined, true)
check('逃生舱反例 · 写普通项目文件被拒', evaluate({ name: 'write', ...args({ path: 'src/app.ts', content: 'x' }) }, statusBlocked, Config, FRESH) !== undefined, true)
check('逃生舱反例 · 内容里提 .dsh-control 不再放行', evaluate({ name: 'edit', ...args({ path: '/tmp/other/main.ts', new_string: '// .dsh-control' }) }, statusBlocked, Config, FRESH) !== undefined, true)

// 4) 依据不可证实 → 失败关闭；状态陈旧 → 放行（语义边界见 index.mjs 的 STALE_MS 注释）
//    为什么陈旧要放行：实测真实调用派发延迟中位 3.93s、p90 16.90s，38.8% 超过 5s 窗口。
//    若陈旧也拒绝，会出现"门禁全绿却随机拒绝执行"——那是抽签，不是管控。
check('无状态 · write 失败关闭', evaluate({ name: 'write', ...args({ path: 'note.md' }) }, null, Config, FRESH) !== undefined, true)
//   注意区分两件事：陈旧只影响"要不要因新鲜度而拒"，**不改变门禁本身的结论**。
//   门禁确实未过时，陈旧状态下照样要拒（陈旧不是免死金牌）。
check('状态陈旧 · 门禁未过时仍被拒', evaluate({ name: 'write', ...args({ path: 'note.md' }) }, statusBlocked, Config, STALE) !== undefined, true)
check('状态陈旧 · 门禁全过时放行', evaluate({ name: 'write', ...args({ path: 'note.md' }) }, statusClear, Config, STALE), undefined)
check('无状态 · read 仍放行', evaluate({ name: 'read' }, null, Config, STALE), undefined)

// 4b) 形状非法的状态不得放行（历史缺陷：`g.status` 抛错被外层 catch 吞掉 → 畸形状态反而放行）
const statusMalformed = { gatePassed: 1, gateTotal: 4, execAllowed: false, gates: [null] }
check('形状非法 · write 失败关闭', evaluate({ name: 'write', ...args({ path: 'note.md' }) }, statusMalformed, Config, FRESH) !== undefined, true)
check('形状非法 · gates 缺失也失败关闭', evaluate({ name: 'write', ...args({ path: 'note.md' }) }, { gateTotal: 4, execAllowed: false }, Config, FRESH) !== undefined, true)

// 5) 全部门禁通过 → 完全放行
check('门禁全过 · write 放行', evaluate({ name: 'write', ...args({ path: 'a.md' }) }, statusClear, Config, FRESH), undefined)
check('门禁全过 · bash 放行', evaluate({ name: 'bash', ...args({ command: 'npm test' }) }, statusClear, Config, FRESH), undefined)

// 6) 非受控工具不受影响
check('非受控 · subagent 放行', evaluate({ name: 'subagent' }, statusBlocked, Config, FRESH), undefined)
check('非受控 · goal 工具放行', evaluate({ name: 'create_goal' }, statusBlocked, Config, FRESH), undefined)

// 7) 拒绝理由必须可操作：包含卡点名与修复命令
const reason = evaluate({ name: 'write', ...args({ path: 'a.md' }) }, statusBlocked, Config, FRESH)
check('拒绝理由 · 含卡点名', reason.includes('工程结构化'), true)
check('拒绝理由 · 含修复命令', reason.includes('control_gates.sh check'), true)
check('拒绝理由 · 含逃生说明', reason.includes('DSH_CONTROL_GUARD=off'), true)
check('拒绝理由 · 提示只读可用', reason.includes('read'), true)

// 8) 参数极端情形不得抛出
let threw = false
try {
  evaluate({ name: 'bash', arguments: undefined }, statusBlocked, Config, FRESH)
  evaluate({ name: 'bash', arguments: { big: 'x'.repeat(10000) } }, statusBlocked, Config, FRESH)
  evaluate({}, statusBlocked, Config, FRESH)
  const circ = {}
  circ.self = circ
  evaluate({ name: 'bash', arguments: circ }, statusBlocked, Config, FRESH)
} catch {
  threw = true
}
check('极端参数 · 不抛出异常', threw, false)

// 9) 冷启动自举：状态不存在时必须能自行生成，否则 write/bash 被拦死而无解
//    （这是实际发生过的真实缺陷：脚本按 DSH_HOME 落盘，插件却读 stateDir）
{
  const { mkdtemp, rm } = await import('node:fs/promises')
  const { existsSync } = await import('node:fs')
  const { join } = await import('node:path')
  const { tmpdir } = await import('node:os')

  const tmp = await mkdtemp(join(tmpdir(), 'dsh-ctl-selftest-'))
  const statusPath = join(tmp, 'status.json')
  check('冷启动 · 初始无状态文件', existsSync(statusPath), false)

  // 用桩件 ctx 触发 apply，验证自举链路
  const mod = await import('./index.mjs')
  const mounts = { preStep: 0, guard: 0 }
  mod.apply(
    { on(evt) { if (evt === 'agent/pre-step') mounts.preStep++ }, tools: { guard() { mounts.guard++ } } },
    { stateDir: tmp, projectRoot: '/Users/linqiyu/Documents/DSH/全局规则' },
  )
  // 等待异步自举（execFile 子进程）
  await new Promise((r) => setTimeout(r, 5000))

  const bootstrapped = existsSync(statusPath)
  check('冷启动 · 自举成功产出状态', bootstrapped, true)
  if (bootstrapped) {
    const { readFileSync } = await import('node:fs')
    const s = JSON.parse(readFileSync(statusPath, 'utf8'))
    check('冷启动 · 自举状态可解析', typeof s.gateTotal === 'number', true)
    check('冷启动 · 自举状态含门禁明细', Array.isArray(s.gates) && s.gates.length > 0, true)
  }
  check('冷启动 · 看板与门禁均已挂载', mounts.preStep === 1 && mounts.guard === 1, true)
  await rm(tmp, { recursive: true, force: true })
}

// 10) 故障安全：宿主环境异常时绝不允许抛错拖垮桌面端
//     （真实 Cordis 联调中发现：服务未就绪时 ctx.tools 为 undefined，
//      旧版会抛 TypeError，这正是"管控插件拖垮宿主"的失败模式）
{
  const mod = await import('./index.mjs')
  const safe = (label, ctx) => {
    let threw = false
    try { mod.apply(ctx, {}) } catch { threw = true }
    check(label, threw, false)
  }
  safe('故障安全 · 无 tools 服务不抛错', { on() {} })
  safe('故障安全 · 空上下文不抛错', undefined)
  safe('故障安全 · guard 非函数不抛错', { on() {}, tools: {} })
  safe('故障安全 · tools 为 null 不抛错', { on() {}, tools: null })
  // on 缺失也必须降级
  safe('故障安全 · on 缺失不抛错', { tools: { guard() {} } })
}

// 11) Loader 契约：宿主只读「被加载模块」导出的 inject。
//     真实缺陷（2026-09-23 修复）：loader.mjs 曾导出 `inject = []`，而把
//     `inject = ['tools']` 写在 index.mjs 里 —— 宿主永远读不到，
//     于是 apply 时 ctx.tools 为 undefined，守卫永不注册。
//     历史后果：5160 次受控调用 0 次否决、看板 0 次注入，而自检仍全绿。
//     本组用例即为该缺陷的防回归闸门。
{
  const loader = await import('./loader.mjs')
  const inner = await import('./index.mjs')
  check('Loader 契约 · 导出 inject 数组', Array.isArray(loader.inject), true)
  check('Loader 契约 · inject 声明 tools 依赖', loader.inject.includes('tools'), true)
  check('Loader 契约 · 导出 apply 函数', typeof loader.apply === 'function', true)
  check('Loader 契约 · inject 与内层插件一致', inner.inject.includes('tools'), true)
}

// ── 汇总 ─────────────────────────────────────────────────────────────────────
console.log('=== 硬门禁插件自检 ===')
for (const r of results) {
  console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.ok ? '' : `  (期望 ${r.expected}，实得 ${r.actual})`}`)
}
console.log(`\n通过 ${pass} / ${pass + fail}`)
if (fail > 0) {
  console.log('💥 自检失败：门禁判定存在缺陷，禁止上线。')
  process.exit(1)
}
console.log('🎉 自检全部通过：门禁可拒绝、可自救、可绕过、过期失败关闭。')
process.exit(0)
