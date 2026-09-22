/**
 * ==============================================================================
 * DSH AI 执行流程管控 · 硬门禁插件 (Execution Control Gate Plugin)
 * ==============================================================================
 * 定位：本插件把"流程管控"从提示词约定升级为**运行时强制**，并提供**常显看板**。
 *
 * 它做两件事：
 *
 *   1) 常显看板（`agent/pre-step`）
 *      每一个步骤进入前，读取 `$DSH_HOME/.dsh-control/status.json`，
 *      把最新进度卡片作为一条带来源的 user 消息注入会话。
 *      → 执行到哪里、卡在哪、还剩几道门禁，全程可见，无需模型自觉。
 *
 *   2) 硬门禁（`ctx.tools.guard`）
 *      门禁未全通过时，拒绝"会改动工程"的工具调用（write/edit/bash 等）。
 *      守卫是**单调**的：注册在 `tools/pre-execute` 瀑布之后，
 *      任何后续监听器都无法把拒绝翻回允许。
 *
 * 设计原则（重要）：
 *   - **绝不因自身故障阻断用户**。读不到状态文件、解析失败、异常抛出，
 *     一律降级为"放行且不注入"，绝不让插件 bug 把会话锁死。
 *   - **逃生舱**：环境变量 `DSH_CONTROL_GUARD=off` 全局关闭硬门禁；
 *     `DSH_CONTROL_BYPASS=all` 单次会话放行；脚本自身路径始终放行。
 *   - **判定权在脚本**：本插件不自己算门禁，只消费 control_gates.sh 产出的
 *     status.json。阈值与规则全在 ai-control/config/gates.conf，改配置即生效。
 * ==============================================================================
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'

/** Cordis 插件名（用于诊断与事件来源标注）。 */
export const name = 'ai-execution-control'

/** 依赖的工具注册表服务；不存在时本插件完全不激活（静默降级）。 */
export const inject = ['tools']

export const Config = {
  /** 状态文件所在目录；默认 `$DSH_HOME/.dsh-control`。 */
  stateDir: '',
  /** `$DSH_HOME`，用于推导默认状态目录。 */
  dshHome: '',
  /**
   * 管控工程根目录。状态文件缺失或过期时，本插件会调用该目录下的
   * `scripts/control_gates.sh` 重新生成状态（自举），避免"冷启动即被拦死"。
   * 留空则自动探测常见位置。
   */
  projectRoot: '',
  /** 是否注入常显看板。 */
  showCard: true,
  /** 是否启用硬门禁（拒绝改动型工具调用）。 */
  enforce: true,
  /**
   * 门禁未通过时，被拦截的工具名清单。
   * 注意：`read` / `grep` / `glob` 等只读工具**始终放行**，否则模型连
   * 诊断与修复都做不到。
   */
  guardedTools: ['write', 'edit', 'bash', 'pwsh', 'str_replace_editor', 'notebook_edit'],
  /**
   * 始终放行的工具名（优先级高于 guardedTools）。
   * `todo_write` 放行是刻意的：进度可视化本身必须在门禁通过前可用。
   */
  alwaysAllowed: ['todo_write', 'read', 'grep', 'glob', 'ask_user_question'],
  /**
   * 参数中出现以下任一子串时放行（大小写不敏感）。
   * 这是"引导逃生舱"：让模型能够运行门禁脚本、读取规则、修复缺失文件，
   * 否则会形成"要修门禁必须先过门禁"的死锁。
   */
  allowSubstrings: ['control_gates', 'redundancy_scan', 'ai-control', '.dsh-control', 'control_'],
  /** 是否在拒绝理由中附带看板摘要。 */
  verbose: false,
}

// ── 内部状态 ─────────────────────────────────────────────────────────────────
let cached = { at: 0, data: null }
const CACHE_MS = 2000          // 每 2 秒最多读一次盘，避免高频工具调用反复 IO
/**
 * 缓存可接受的"陈旧上限"。守卫是同步的，无法在判定时读盘，只能消费缓存。
 * 若缓存过期（例如 status.json 被删除），按"门禁失效"处理：
 * 宁可拦住并要求重新校验，也不放行一个无法证实的状态。
 */
const STALE_MS = 5000

function resolveStateDir(config) {
  if (config.stateDir) return config.stateDir
  // 与 scripts/control_gates.sh 保持完全一致的解析优先级：
  //   显式配置 → DSH_CONTROL_HOME → DSH_HOME → ~/.dsh
  // 这个顺序必须一致，否则"脚本写到哪里"与"插件读哪里"会错位，
  // 表现为看板空转（读到陈旧或缺失的状态）。
  const explicit = process.env.DSH_CONTROL_HOME
  if (explicit) return explicit
  const home = config.dshHome || process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, '.dsh-control')
}

/** 读取并解析 status.json；任何失败都返回 null（绝不抛出）。 */
async function readStatus(stateDir) {
  const now = Date.now()
  if (cached.data && now - cached.at < CACHE_MS) return cached.data
  try {
    const raw = await readFile(join(stateDir, 'status.json'), 'utf8')
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object' || typeof data.gateTotal !== 'number') return null
    cached = { at: now, data }
    return data
  } catch {
    // 状态文件尚不存在（尚未运行过门禁脚本）或损坏
    cached = { at: 0, data: null }
    return null
  }
}

/** 解析管控工程根目录：显式配置 → 常见位置探测。 */
function resolveProjectRoot(config, stateDir) {
  if (config.projectRoot) return config.projectRoot
  // 状态目录位于 `<projectRoot>` 之外，因此只能按约定的常见位置探测
  const candidates = [
    join(homedir(), 'Documents', 'DSH', '全局规则'),
    process.env.DSH_CONTROL_PROJECT ?? '',
  ]
  return candidates.find((c) => c && existsSyncSafe(join(c, 'scripts', 'control_gates.sh'))) ?? ''
}

function existsSyncSafe(p) {
  try {
    return existsSync(p)
  } catch {
    return false
  }
}

/** 是否需要对状态进行自举（缺失或已过期）。 */
function needsBootstrap() {
  if (!cached.data) return true
  return (Date.now() - cached.at) >= STALE_MS
}

/**
 * 自举：调用管控脚本重新生成 status.json。
 *
 * 为什么必须自举：守卫是同步的，只能消费缓存。若首次使用（从未跑过门禁脚本）
 * 就采取"失败关闭"，则 `write`/`bash` 全被拦，而唯一解法恰好是被拦的那条命令，
 * 形成死锁。因此在冷启动时主动生成一次状态，既保住"不采信自我宣称"的原则，
 * 又不产生死锁。
 *
 * @returns {Promise<boolean>} 是否成功取得可用状态
 */
async function bootstrapStatus(stateDir, config) {
  const projectRoot = resolveProjectRoot(config, stateDir)
  if (!projectRoot) return false
  const script = join(projectRoot, 'scripts', 'control_gates.sh')
  if (!existsSyncSafe(script)) return false
  try {
    await new Promise((resolve) => {
      execFile('/bin/bash', [script, 'check'], {
        cwd: projectRoot,
        timeout: 8000,
        env: {
          ...process.env,
          // 关键：强制脚本把状态写到本插件正在读取的目录。
          // 若只依赖 DSH_HOME，脚本与插件各自的解析优先级可能错位，
          // 表现为"自举成功但插件读不到"，进而冷启动被拦死。
          DSH_CONTROL_HOME: stateDir,
          DSH_CONTROL_TTL: '0',
        },
      }, () => resolve())     // 退出码无关紧要：成功与否以能否读到状态为准
    })
  } catch {
    return false
  }
  return (await readStatus(stateDir)) !== null
}

const MARK = { pass: '✅', pending: '⏸️', block: '⛔' }

function progressBar(passed, total, width = 16) {
  const filled = total > 0 ? Math.round((passed * width) / total) : 0
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled))
}

/** 渲染面向模型的常显看板（Markdown，DSH GUI 原生渲染）。 */
function renderCard(s) {
  const lines = []
  lines.push('<system-reminder>')
  lines.push('AI 执行流程管控看板（由磁盘实况推导，非模型自述）。这是每个步骤都会刷新一次的常显状态。')
  lines.push('')
  lines.push(`**进度** \`${progressBar(s.gatePassed, s.gateTotal)}\` **${s.percent}%** · ${s.gatePassed}/${s.gateTotal} 门禁通过`)
  if (s.execAllowed) {
    lines.push('**状态** 🟢 全部门禁通过，可进入实质执行。')
  } else {
    lines.push(`**状态** 🔴 卡点：G${s.gateIndex} ${s.currentGateName} —— 未通过前，改动型工具调用会被硬性拒绝。`)
  }
  lines.push('')
  lines.push('| 门禁 | 状态 | 量化指标 |')
  lines.push('| :--- | :--- | :--- |')
  for (const [i, g] of (s.gates || []).entries()) {
    const mark = MARK[g.status] || '❔'
    lines.push(`| G${i + 1} ${g.name} | ${mark} | ${g.metricA ?? '-'} ${g.metricALabel ?? ''} · ${g.metricB ?? '-'} ${g.metricBLabel ?? ''} |`)
  }
  lines.push('')
  const blocked = (s.gates || []).filter((g) => g.status !== 'pass')
  if (blocked.length > 0) {
    lines.push('待办：')
    for (const g of blocked) lines.push(`- **${g.name}**：${g.hint || g.detail || '未达标'}`)
  }
  lines.push('')
  lines.push(`刷新方式：\`./scripts/control_gates.sh check\`（快照时间 ${s.generatedAt || '未知'}）`)
  lines.push('</system-reminder>')
  return lines.join('\n')
}

/** 一行式徽标，用于拒绝理由（省 token）。 */
function renderBadge(s) {
  const marks = (s.gates || []).map((g) => MARK[g.status] || '❔').join('')
  return `🎛️ ${progressBar(s.gatePassed, s.gateTotal, 10)} ${s.percent}% (${s.gatePassed}/${s.gateTotal}) ${marks} 卡点:${s.currentGateName}`
}

/** 提取工具调用的参数文本（用于逃生舱子串匹配）。 */
function argsText(execution) {
  try {
    const a = execution?.arguments
    if (a === undefined || a === null) return ''
    if (typeof a === 'string') return a
    return JSON.stringify(a)
  } catch {
    return ''
  }
}

/**
 * 判定是否应拦截该工具调用。
 * 导出以便自检脚本在不启动 DSH 的情况下验证判定逻辑。
 * @returns 拒绝理由字符串；`undefined` 表示放行。
 */
export function evaluate(execution, status, config, cacheAgeMs = 0) {
  const toolName = String(execution?.name || '')
  if (!toolName) return undefined

  // 1) 白名单工具始终放行（含 todo_write：进度可视化必须先于门禁可用）
  if (config.alwaysAllowed.includes(toolName)) return undefined

  // 2) 非受控工具（只读类、子代理、计划、目标等）放行
  if (!config.guardedTools.includes(toolName)) return undefined

  // 3) 逃生舱：参数触及管控自身路径时放行，避免"修门禁须先过门禁"的死锁
  //    注意：顺序刻意放在"门禁状态判定"之前——修复动作本身必须永远可用。
  const text = argsText(execution)
  const lower = text.toLowerCase()
  for (const sub of config.allowSubstrings) {
    if (lower.includes(String(sub).toLowerCase())) return undefined
  }

  // 4) 状态不可证实（缓存过期 / 从未生成）：失败关闭，要求重新校验
  const fresh = status && cacheAgeMs < STALE_MS
  if (!fresh) {
    return [
      `⛔ 流程管控硬门禁：拒绝本次 \`${toolName}\` 调用 —— 门禁状态不可证实。`,
      '原因：status.json 缺失、损坏或已过期（超过 5 秒未刷新）。',
      '允许的动作：运行 `./scripts/control_gates.sh check` 重新生成状态。',
      '只读工具（read/grep/glob）与 todo_write 始终可用。',
      '若确需绕过：设置环境变量 DSH_CONTROL_GUARD=off（全局）或 DSH_CONTROL_BYPASS=all（单次）。',
    ].join('\n')
  }

  // 5) 全部门禁通过 → 放行
  if (status.execAllowed) return undefined

  // 6) 拒绝，并给出可执行的修复路径
  const blockedGate = (status.gates || []).find((g) => g.status !== 'pass')
  const hardBlock = (status.gates || []).some((g) => g.status === 'block')
  const reason = [
    `⛔ 流程管控硬门禁：拒绝本次 \`${toolName}\` 调用。`,
    renderBadge(status),
    blockedGate ? `当前卡点【${blockedGate.name}】：${blockedGate.hint || blockedGate.detail || '未达标'}` : '',
    hardBlock ? '该门禁为硬阻断级别（⛔），不可忽略，必须实际修复后重跑校验。' : '',
    '允许的动作：先运行 `./scripts/control_gates.sh check` 查看详情并修复门禁；',
    '只读工具（read/grep/glob）与 todo_write 始终可用。',
    '若确需绕过：设置环境变量 DSH_CONTROL_GUARD=off（全局）或 DSH_CONTROL_BYPASS=all（单次）。',
  ].filter(Boolean).join('\n')
  return reason
}

/**
 * 插件入口。注册常显看板与硬门禁。
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {Partial<typeof Config>} [config]
 */
export function apply(ctx, config = {}) {
  const cfg = { ...Config, ...config }
  const stateDir = resolveStateDir(cfg)

  // 上下文可用性防御：宿主调用时机异常时静默降级，绝不抛错拖垮宿主。
  if (!ctx || typeof ctx.on !== 'function') {
    console.warn('[ai-execution-control] 上下文不可用，管控未挂载（宿主不受影响）。')
    return
  }

  // ── 常显看板：每个步骤进入前注入最新进度 ──────────────────────────────────
  if (cfg.showCard) {
    try {
      ctx.on('agent/pre-step', async (_payload, next) => {
      let decision
      try {
        decision = await next()
      } catch {
        return decision
      }
      // 只在真正要进入步骤时注入；被拒绝的步骤不打扰
      if (!decision || decision.kind !== 'enter') return decision
      try {
        let status = await readStatus(stateDir)
        // 状态缺失或过期：先自举一次，保证"每个步骤都有可信状态"
        if (!status || needsBootstrap()) {
          const ok = await bootstrapStatus(stateDir, cfg)
          if (ok) status = await readStatus(stateDir)
        }
        if (!status) return decision
        const { createUserMessage } = await import('@deepseek-ai/dsh-llm')
        const card = createUserMessage({
          content: [{ type: 'text', text: renderCard(status) }],
          source: { kind: 'plugin', plugin: name, form: 'notice', summary: renderBadge(status) },
        })
        return { kind: 'enter', messages: [...decision.messages, card] }
      } catch {
        // 注入失败绝不影响正常流程
        return decision
      }
      })
    } catch (err) {
      console.warn('[ai-execution-control] 看板注册失败（管控降级，宿主不受影响）：', err?.message || err)
    }
  }

  // ── 硬门禁：拒绝门禁未通过时的改动型调用 ──────────────────────────────────
  if (cfg.enforce) {
    if (process.env.DSH_CONTROL_GUARD === 'off') return
    if (process.env.DSH_CONTROL_BYPASS === 'all') return

    // 防御性检查：服务必须真实可用。若宿主在 tools 尚未就绪时调用了 apply，
    // 这里绝不能抛错 —— 否则管控插件会拖垮宿主启动，违背"故障安全"原则。
    if (!ctx || !ctx.tools || typeof ctx.tools.guard !== 'function') {
      console.warn('[ai-execution-control] tools 服务尚不可用，硬门禁未挂载（管控降级，宿主不受影响）。')
      return
    }

    try {
      ctx.tools.guard((execution) => {
        // 守卫必须是同步的；用缓存值判定，未就绪则失败关闭
        const status = cached.data
        try {
          return evaluate(execution, status, cfg, Date.now() - cached.at)
        } catch {
          return undefined      // 判定异常 → 放行，绝不锁死会话
        }
      })
    } catch (err) {
      console.warn('[ai-execution-control] 门禁注册失败（管控降级，宿主不受影响）：', err?.message || err)
      return
    }

    // 预热缓存：让守卫在首次调用前就有可用状态；缺失则自举一次，
    // 避免"首次使用因状态不存在而被拦死"的冷启动死锁。
    readStatus(stateDir)
      .then((s) => (s ? undefined : bootstrapStatus(stateDir, cfg)))
      .catch(() => {})
  }
}
