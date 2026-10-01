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
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { existsSync, writeFileSync, appendFileSync, readFileSync } from 'node:fs'
import { autoNameOnce, parseTitle as parseNamingTitle } from '../../scripts/lib/auto_naming.mjs'
import { evaluatePhysicalLock, getLockState, advanceLockTo, STAGES } from '../../scripts/lib/physical_lock.mjs'
import { checkTodoGate, recordTodoWriteSync } from '../../scripts/lib/todo_tracker.mjs'
import { buildCompactReport, writeCompactReport } from '../../scripts/lib/output_compactness.mjs'
import { isHostProcess as isHostProcessImpl } from '../lib/host_identity.mjs'

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
   * 逃生舱「结构化白名单」。
   *
   * 为什么要结构性判定：旧实现是"参数 JSON 里含某个子串就放行"，
   * 实测可被 `echo x > /tmp/run_control_log.txt`、写 `src/my_control_logic.js`
   * 等形式轻易穿透（凡名字里带 `control_` 的都算），实测放行过 5.9% 的受控调用。
   * 且 `dsh-control` 这类含连字符的写法反而命不中，该放行的没放行、不该放行的放行了。
   *
   * 现在改为两条明确规则（见 `isEscape`）：
   *   1) bash 命令真正指向管控脚本文件时才放行；
   *   2) write/edit 目标落在管控自身目录内才放行。
   *
   * 逃生舱必须常开：否则"修门禁须先过门禁"会死锁。
   */
  escapeScriptPrefixes: [
    'scripts/control_gates.sh',
    'scripts/redundancy_scan.mjs',
    'scripts/node.sh',
    // 拦截层自身的诊断工具：门禁未过时**正是最需要它**的时刻。
    // 若不列入，就会出现"门禁没过 → 想排查 → 排查脚本被门禁拦住"的自锁。
    // 两者都只做只读检查（源码契约 / 自检 / 门禁实况 / 逃生舱判定），无副作用。
    'scripts/verify_guard_live.sh',
    'scripts/verify_escape_hatch.sh',
    // 命名入口：宿主级 AGENTS.md 的"零、开工第一动作"要求**任何会话开工就先改名**。
    // 若门禁未过时把它拦住，就会出现"规则要求先改名，但改名被门禁挡住"的直接冲突，
    // 且与上面两个诊断脚本同属"自锁"类问题。
    // 只放行这一个入口（不放行 rename_session.sh）：它只改**当前会话的标题**这一条元数据，
    // 不触碰工程实质内容；真正的工程改动仍被门禁严格拦住。
    // 物理锁 CLI 工具：用于查看、推进或重置物理锁
    'scripts/physical_lock.sh',
    'scripts/name_me.sh',
    // 归卷入仓入口：**门禁 G3 自己要求"未提交变更不能超阈值"，而唯一的提交动作
    // 恰好会被门禁拦住**——2026-09-28 实测死锁：68 个待提交文件 > 阈值 30 →
    // execAllowed=false → `git add`/`git_sync_remote.sh` 全被拒 → 永远无法提交。
    // 这与本文件开头 2026-09-23 修掉的那次死锁**是同一类问题**：
    // "门禁要求 X，而做 X 的工具被门禁拦住"。
    // 该脚本只做 add / commit / push，不改工程内容，且其提交信息由调用方显式给出。
    'scripts/git_sync_remote.sh',
    // REQ-092 / R1+R3：三条新判定器同属"门禁没过时最需要它们"的诊断类工具。
    // 不列入的后果与上面几条完全相同：G5 一旦判红，想跑判定器定位原因却被判定器自己的门禁拦住。
    // 三者的 --check 均为只读（不打补丁、不改工程内容，只写自己的状态产物）。
    'scripts/scope_audit.mjs',
    'scripts/anti_hallucination_audit.mjs',
    'scripts/req_version_audit.mjs',
    'scripts/req_version_gen.mjs',
    // 存量补课器：把管控入口铺到各工程（本身就是"修管控"的动作）
    'scripts/backfill_scope.mjs',
  ],
  escapeWritePrefixes: ['ai-control/', 'scripts/', '.dsh-control/'],
  /** 是否在拒绝理由中附带看板摘要。 */
  verbose: false,
  /**
   * ── S07 待办常显硬门禁（REQ-080）────────────────────────────────────────────
   * 为什么需要它：`task_execution_flow.md` 把"任务必须常显在输入框上方"列为防线 3，
   * 但历史上没有任何客观判定——拦截层只看 status.json 与物理锁，从不看待办证据。
   * 于是"必须有任务列表"只是一句 Markdown 愿望（实测：整条拦截层从未被宿主加载）。
   *
   * 现在把它降为运行时硬约束：受控工具（改动型）被调用前，磁盘上必须存在
   * 本会话的待办证据，且其中至少 1 项 in_progress。
   *   · 无列表       → 阻断（防黑盒盲动）
   *   · 全 completed → 阻断（防"全部标完成"式假收尾）
   *
   * 逃生舱：环境变量 `DSH_CONTROL_TODO=off` 关闭本门禁（与全局逃生舱独立）。
   */
  enforceTodo: true,
  /** 需要在挂载任务列表之后才允许调用的工具（改动型 + 交付型）。 */
  todoGuardedTools: ['write', 'edit', 'bash', 'pwsh', 'render_ui', 'present'],
  /** 待办证据阈值：in_progress 至少几项（1 即"执行途中必须有正在推进的步骤"）。 */
  todoMinInProgress: 1,
  /**
   * ── 输出压缩阈值（REQ-081）──────────────────────────────────────────────────
   * 正文字符数与行数上限。超过即判 sizeOk=false，审计维度据此扣分。
   * 口径刻意取宽松值：宁可漏判"略啰嗦"，也不要逼出"为凑字数而砍掉关键信息"。
   */
  compactThresholds: { maxChars: 1800, maxLines: 60 },
}

// ── 内部状态 ─────────────────────────────────────────────────────────────────
let cached = { at: 0, data: null }
const CACHE_MS = 2000          // 每 2 秒最多读一次盘，避免高频工具调用反复 IO
/**
 * 缓存可接受的"陈旧上限"。
 *
 * ⚠️ 语义边界（2026-09-23 修正）：本常量只用于区分
 *   - **无状态**（`status` 为 null：文件缺失、损坏、形状非法）→ **失败关闭**，
 *     因为此时无可证实的依据，必须要求重新校验；
 *   - **状态陈旧**（有状态、只是读盘时间早于 STALE_MS）→ **放行 + 后台刷新**。
 *
 * 为什么陈旧必须放行：实测 4855 次真实受控调用的派发延迟中位 3.93s、p90 16.90s，
 * **38.8% 超过 5 秒**。若陈旧也拒绝，会出现"四项门禁全绿却随机拒绝执行"的行为，
 * 且按 pre-step 刷新缓存的设计，模型思考越久越容易被拒——这不叫管控，叫抽签。
 * 陈旧只代表"扫描结果不是刚出炉的"，不代表"依据不成立"。
 */
const STALE_MS = 5000

/**
 * 解析宿主侧模块（如 `@deepseek-ai/dsh-llm`）。
 *
 * 为什么需要它（真实缺陷，实测确认）：
 *   本插件位于 `~/Documents/DSH/全局规则/`，**不在宿主的 node_modules 解析链上**，
 *   因此 `await import('@deepseek-ai/dsh-llm')` 在真实宿主里必然失败。
 *   后果是看板注入长期失败（代码注释记载"48 个会话 7668 步注入 0 次"），
 *   而失败只打一条 console 警告，界面上什么都看不到。
 *
 * 解法：插件与宿主**同进程**，因此 `process.argv[1]` 就是宿主的入口脚本
 *   （…/runtime/harness/node_modules/@deepseek-ai/dsh/lib/bin.js）。
 *   从中定位 `node_modules` 目录，再按绝对路径导入即可绕开解析链限制。
 *
 * @param {string} name 包名，如 '@deepseek-ai/dsh-llm'
 * @returns {Promise<object|null>} 模块；解析不到返回 null（调用方须兜底）
 */
async function resolveHostModule(name) {
  try {
    return await import(name)
  } catch { /* 不在解析链上，继续按宿主路径推导 */ }
  try {
    const entry = process.argv[1] ?? ''
    const idx = entry.lastIndexOf('node_modules')
    if (idx === -1) return null
    const root = entry.slice(0, idx + 'node_modules'.length)
    // 依次尝试常见的入口文件位置，命中即返回
    for (const rel of ['/lib/index.js', '/index.js', '/dist/index.js']) {
      const p = `${root}/${name}${rel}`
      if (existsSync(p)) return await import(`file://${p}`)
    }
  } catch { /* 推导失败，交由调用方降级 */ }
  return null
}

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

/**
 * 读取并解析 status.json；任何失败都返回 null（绝不抛出）。
 * @param {string} stateDir
 * @param {boolean} [force] 跳过 CACHE_MS 读盘缓存，强制重读（供后台刷新使用）
 */
async function readStatus(stateDir, force = false) {
  const now = Date.now()
  const file = join(stateDir, 'status.json')
  // 缓存必须绑定"读的是哪个文件"，不能只绑时间。
  // 历史缺陷（2026-09-28 自检实测发现）：冷启动自举用例会传一个空的 stateDir，
  // 而模块级缓存在此之前已被真实 DSH_HOME 的 status.json 填满；旧实现只看时间戳，
  // 于是直接返回了**另一个目录**的缓存值，`needsBootstrap()` 判为 false、
  // 自举永不触发，`status.json` 始终不存在 —— 而真实宿主里这会表现为
  // "换了 stateDir 却一直读到旧目录的状态"。多目录场景下这是实质错误，不是测试洁癖。
  if (!force && cached.data && cached.file === file && now - cached.at < CACHE_MS) return cached.data
  try {
    const raw = await readFile(file, 'utf8')
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object' || typeof data.gateTotal !== 'number') return null
    cached = { at: now, data, file }
    return data
  } catch {
    // 状态文件尚不存在（尚未运行过门禁脚本）或损坏
    cached = { at: 0, data: null, file }
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
 * 后台刷新缓存（fire-and-forget，带节流）。
 *
 * 用途：守卫判定为"状态陈旧但存在"时调用。守卫本身是同步的、不能等待读盘，
 * 因此这里只负责"顺手把最新状态捞回来"，判定当场仍然放行——
 * 详见 STALE_MS 处的语义边界说明。
 *
 * 节流：同一秒内最多触发一次，避免一批并行工具调用把读盘打成风暴。
 */
let lastRefreshAt = 0
const REFRESH_THROTTLE_MS = 1000
function fireRefresh(stateDir) {
  const now = Date.now()
  if (now - lastRefreshAt < REFRESH_THROTTLE_MS) return
  lastRefreshAt = now
  readStatus(stateDir, true).catch(() => {})
}

/** 看板注入失败只告警一次，避免每步刷屏。 */
let warnedCardOnce = false

/**
 * 自动命名：已尝试过的会话（幂等，避免每步重复读盘改名）。
 * 为什么要有这层：`agent/pre-step` 每一步都会触发，若不记状态，
 * 一个长任务会把改名请求打成风暴。
 */
const autoNamedTried = new Set()

/** 自动命名结果留档（供诊断；内容很短，不占内存）。 */
const lastAutoName = new Map()

/**
 * 会话标题缓存：用于在每一步快速判断"标题是否已合规"。
 * 独立于看板状态缓存（后者是门禁状态，生命周期与用途都不同）。
 * 故意只在本次进程内有效——重启后重新读取，不会用到陈旧数据。
 */
const titleCache = new Map()
let titleCacheAt = 0
const TITLE_CACHE_TTL_MS = 10_000

/** 读取某会话的当前标题（带短 TTL 缓存）。 */
async function cachedTitle(dshHome, sessionId) {
  const now = Date.now()
  if (now - titleCacheAt > TITLE_CACHE_TTL_MS) {
    titleCache.clear()
    titleCacheAt = now
    try {
      const raw = await readFile(join(dshHome, 'storages', 'session_projcache.json'), 'utf8')
      const d = JSON.parse(raw)
      for (const [sid, e] of Object.entries(d?.tables?.sessions ?? {})) {
        titleCache.set(sid, e?.rows?.title?.val)
      }
    } catch { /* 读不到就当作"未知"，下次再试 */ }
  }
  return titleCache.get(sessionId)
}

/** 从工具参数中取出候选路径字符串（不依赖具体工具的参数名）。 */
function pathsFromArgs(execution) {
  const a = execution?.arguments
  if (!a || typeof a !== 'object') return []
  const out = []
  for (const v of Object.values(a)) {
    if (typeof v === 'string' && v) out.push(v)
  }
  return out
}

/**
 * 规范化路径：去掉首尾空白、统一反斜杠、折叠 `./` 前缀。
 * 这里不做 realpath（同步守卫内不能碰磁盘），只做字符串层面的归一，
 * 足以防止 `./scripts/x` 与 `scripts/x` 被判成两个目标。
 */
function normalizePath(p) {
  return String(p).trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

/**
 * 逃生舱判定（结构化，非文本子串）。
 * @returns {boolean} true = 本次调用属于"修复管控自身"，必须放行
 */
function isEscape(execution, config) {
  const toolName = String(execution?.name || '')
  const escScripts = config.escapeScriptPrefixes || []
  const escWrites = config.escapeWritePrefixes || []

  // 1) bash / pwsh：命令里必须真正"调用"了某个管控脚本
  if (toolName === 'bash' || toolName === 'pwsh') {
    const cmd = String(execution?.arguments?.command ?? '')

    // 按 shell 控制符切分命令段。
    // 为什么必须切分（2026-09-23 修复的真实死锁）：
    // 旧实现只看脚本 token 的**前一个 token**，而 `cd "<工程>" && ./scripts/control_gates.sh check`
    // 里脚本前面是 `&&` —— 不在允许列表 → 逃生舱失效。而这条命令正是被拒消息里
    // **自己推荐的**自救命令；消息推荐的另一条路（设 DSH_CONTROL_GUARD=off）同样需要 bash。
    // 于是门禁一旦未过就彻底死锁：改不动、也修不了。实测复现：门禁未过时
    // `cd x && ./scripts/control_gates.sh check` 被拒，而纯绝对路径形式可以通过。
    const segments = []
    let cur = ''
    let quote = ''
    for (let i = 0; i < cmd.length; i++) {
      const ch = cmd[i]
      if (quote) {
        // 引号内的一切（含 && ; |）都是普通字符，不能当分隔符
        if (ch === quote) quote = ''
        cur += ch
        continue
      }
      if (ch === "'" || ch === '"') { quote = ch; cur += ch; continue }
      const two = cmd.slice(i, i + 2)
      if (two === '&&' || two === '||') { segments.push(cur); cur = ''; i++; continue }
      if (ch === ';' || ch === '|' || ch === '\n') { segments.push(cur); cur = ''; continue }
      cur += ch
    }
    segments.push(cur)

    // 解释器判定要取 basename：实测本机 node 不在 PATH 上，
    // 调用形式是绝对路径（如 `/Volumes/DSH Desktop/DSH Desktop.app/.../runtime/node`），
    // 只比裸命令名会漏掉这种**真实且唯一可用**的调用方式。
    // 词法切分：引号内的内容（含空格）算作**一个** token。
    // 为什么必须这样：本机 node 在 `/Volumes/DSH Desktop/DSH Desktop.app/...`（**路径含空格**），
    // 直接按空白切分会把绝对路径切碎，导致 `node /Volumes/.../runtime/node scripts/x.mjs`
    // 这类**真实且唯一可用**的调用被判为非逃生舱。
    const tokenize = (s) => {
      const out = []
      let b = ''
      let q = ''
      for (let i = 0; i < s.length; i++) {
        const ch = s[i]
        if (q) {
          if (ch === q) q = ''
          else b += ch
          continue
        }
        if (ch === "'" || ch === '"') { q = ch; continue }
        if (/\s/.test(ch)) { if (b) { out.push(b); b = '' } continue }
        b += ch
      }
      if (b) out.push(b)
      return out
    }

    // 解释器判定要取 basename：实测本机 node 不在 PATH 上，
    // 调用形式是绝对路径（如 `/Volumes/DSH Desktop/DSH Desktop.app/.../runtime/node`），
    // 只比裸命令名会漏掉这种**真实且唯一可用**的调用方式。
    const isInterpreter = (t) => /^(bash|sh|zsh|node|npx)$/.test(String(t).split('/').pop())

    /**
     * 该 token 是否指向逃生脚本。
     * @param {string} rawTok
     * @param {boolean} bareOk 是否接受裸相对路径（`scripts/x`）—— 仅当段首是解释器时放开，
     *        因为 `cat scripts/x` / `echo scripts/x` 这类**非执行**用法必须被排除。
     */
    const pointsToEscapeScript = (rawTok, bareOk = false) => {
      const tok = normalizePath(rawTok)
      return escScripts.some((s) => {
        if (!(tok === s || tok.endsWith('/' + s))) return false
        if (tok === s) return true
        // 路径形态即可：`./scripts/x`、`/abs/.../scripts/x`；
        // 裸 `scripts/x` 仅在解释器后放行
        return tok.startsWith('./') || tok.startsWith('/') || bareOk
      })
    }

    for (const seg of segments) {
      const toks = tokenize(seg).map((t) => t.replace(/&+$/, ''))
      if (toks.length === 0) continue
      // (a) 段首 token 就是逃生脚本路径（如 `./scripts/control_gates.sh check`）
      if (pointsToEscapeScript(toks[0])) return true
      // (b) 段首是解释器，其参数里出现逃生脚本
      //     （`bash scripts/control_gates.sh check`、`node scripts/redundancy_scan.mjs ...`）
      //     此处放开裸相对路径：`node scripts/x.mjs` 是标准写法；
      //     而 `cat scripts/x` 段首不是解释器，仍会被拒。
      if (isInterpreter(toks[0]) && toks.slice(1).some((t) => pointsToEscapeScript(t, true))) return true
    }
    return false
  }

  // 2) write / edit / 其它改动型工具：目标必须落在管控自身目录内
  for (const raw of pathsFromArgs(execution)) {
    const p = normalizePath(raw)
    for (const pre of escWrites) {
      if (p.startsWith(pre)) return true
      // 允许绝对路径中包含该前缀（如 /Users/x/.../ai-control/plugin/index.mjs）
      if (p.includes('/' + pre)) return true
    }
  }
  return false
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

/** 渲染面向模型的常显看板（Markdown，DSH GUI 原生渲染）。支持全绿态高密度 Token 压缩。
 *  第二个参数 usage 是"用量常显行"（DeepSeek 时段 + 剩余额度），由本仓已审计的
 *  探针 CLI 产出；取不到时为空串，看板照常渲染，绝不用假数字占位。 */
function renderCard(s, usage = '') {
  const lines = []
  lines.push('<system-reminder>')
  if (s.execAllowed) {
    // 全绿态高密度紧凑输出（节约 ~65% Token）
    lines.push(`**🎛️ 管控看板** \`${progressBar(s.gatePassed, s.gateTotal, 10)}\` **100% (4/4)** 🟢 全部门禁通过`)
    const g = s.gates || []
    const m0 = g[0] ? `${g[0].metricA ?? ''}骨架` : ''
    const m1 = g[1] ? `${g[1].metricA ?? ''}合规` : ''
    const m2 = g[2] ? `${g[2].metricA ?? ''}需求(${g[2].metricB ?? 0}未交)` : ''
    const m3 = g[3] ? `${g[3].metricA ?? ''}冗余` : ''
    lines.push(`> 指标实况：${[m0, m1, m2, m3].filter(Boolean).join(' · ')}`)
    if (usage) lines.push(usage)
    lines.push(`刷新：\`./scripts/control_gates.sh check\`（${s.generatedAt || '最新'}）`)
    lines.push('</system-reminder>')
    return lines.join('\n')
  }

  // 存在卡点时，输出完整排查明细
  lines.push('AI 执行流程管控看板（由磁盘实况推导，非模型自述）。这是每个步骤都会刷新一次的常显状态。')
  lines.push('')
  lines.push(`**进度** \`${progressBar(s.gatePassed, s.gateTotal)}\` **${s.percent}%** · ${s.gatePassed}/${s.gateTotal} 门禁通过`)
  lines.push(`**状态** 🔴 卡点：G${s.gateIndex} ${s.currentGateName} —— 未通过前，改动型工具调用会被硬性拒绝。`)
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
  if (usage) lines.push(usage)
  lines.push('</system-reminder>')
  return lines.join('\n')
}

/* ── 用量常显行（DeepSeek 时段 + 剩余额度）───────────────────────────────────
 * 数据来源刻意做成"只调本仓已审计的探针 CLI"，而不是在本插件里重算一遍：
 * 时段规则、官方余额接口、定价指纹各只有一份实现（`scripts/deepseek_usage_probe.mjs`），
 * 避免"宿主与 CLI 两套口径"这种典型的双实现漂移。
 * 缓存 5 分钟：`agent/pre-step` 每个步骤都会触发，不能每一步都去 spawn 进程。
 * 探针不可用时返回空串 —— 看板照常显示，**绝不用假数字占位**。 */
const USAGE_TTL_MS = 5 * 60 * 1000
const USAGE_PROBE = fileURLToPath(new URL('../../scripts/deepseek_usage_probe.mjs', import.meta.url))
let usageCache = { at: 0, line: '' }
let usageWarned = false

function probeUsage() {
  return new Promise((resolve) => {
    try {
      execFile(process.execPath, [USAGE_PROBE, '--json'], { timeout: 20000, maxBuffer: 4 * 1024 * 1024 },
        (err, stdout) => {
          if (err) return resolve(null)
          try { resolve(JSON.parse(stdout)) } catch { resolve(null) }
        })
    } catch { resolve(null) }
  })
}

/** 组装一行用量文本；取不到就返回空串（不编造）。 */
export async function buildUsageLine() {
  const now = Date.now()
  if (now - usageCache.at < USAGE_TTL_MS) return usageCache.line
  const data = await probeUsage()
  if (!data) {
    if (!usageWarned) {
      usageWarned = true
      console.warn('[ai-execution-control] 用量探针不可用，看板省略用量行（不影响门禁）')
    }
    usageCache = { at: now, line: '' }
    return ''
  }
  let line = ''
  try {
    const label = data.period === 'offpeak' ? '空闲时段' : '高峰时段'
    const off = data.period === 'offpeak' ? '（高峰价 5 折）' : '（高峰价）'
    const mins = Math.max(0, Math.round((data.nextSwitchInSeconds || 0) / 60))
    const eta = mins >= 60 ? `${Math.floor(mins / 60)} 小时 ${mins % 60} 分` : `${mins} 分`
    const b = data.balance || {}
    let bal
    if (b.available && Array.isArray(b.items) && b.items.length > 0) {
      bal = b.items.map((it) => `${it.currency} ${it.totalBalance}（赠金 ${it.grantedBalance} + 充值 ${it.toppedUpBalance}）`).join(' / ')
    } else if (b.errorKind === 'no-credential') {
      bal = '未配置 API Key（跑 `./scripts/deepseek_key_setup.sh` 一键接入）'
    } else {
      bal = `取数失败：${b.errorKind || 'unknown'}`
    }
    line = `> DeepSeek **${label}**${off} · 距切换 ${eta} · 剩余额度 ${bal}`
  } catch {
    line = ''
  }
  usageCache = { at: now, line }
  return line
}

/** 一行式徽标，用于拒绝理由（省 token）。 */
function renderBadge(s) {
  const marks = (s.gates || []).map((g) => MARK[g.status] || '❔').join('')
  return `🎛️ ${progressBar(s.gatePassed, s.gateTotal, 10)} ${s.percent}% (${s.gatePassed}/${s.gateTotal}) ${marks} 卡点:${s.currentGateName}`
}

/**
 * 解析本次调用所属的会话 ID。
 *
 * 为什么不能只读 `process.env.DSH_SESSION_ID`：宿主是多会话进程，环境变量属于
 * 宿主进程而非某个具体会话；一旦有并发会话，用环境变量会把 A 会话的待办证据
 * 判给 B 会话。因此优先取执行对象自带的 agent 身份（dsh-tools 会把 `agent`
 * 挂在 execution 上），环境变量只作为最后兜底。
 */
function resolveSessionId(execution) {
  const a = execution?.agent
  const id = a?.session?.id ?? a?.sessionId ?? a?.id
  if (typeof id === 'string' && id) return id
  return process.env.DSH_SESSION_ID || 'global_session'
}

/**
 * S07 待办常显硬门禁判定（REQ-080）。
 *
 * 判什么：受控工具被调用时，磁盘上必须已有本会话的待办证据，且至少
 * `config.todoMinInProgress` 项处于 in_progress。
 * 判不了什么：它不保证前端 TodoPanel 一定被渲染（那属于宿主 UI 契约），
 * 它保证的是"没有任务列表就动不了工程"——把"过程可见"变成动作前置条件。
 *
 * @returns {string|undefined} 拒绝理由；undefined 表示放行。
 */
function evaluateTodoGate(execution, config) {
  if (config.enforceTodo === false) return undefined
  if (process.env.DSH_CONTROL_TODO === 'off') return undefined
  const toolName = String(execution?.name || '')
  if (!(config.todoGuardedTools || []).includes(toolName)) return undefined

  const sid = resolveSessionId(execution)
  // 必须与"记录证据"时用同一个 dshHome：读写两端若各自回退默认值，
  // 多目录/多环境场景下就会出现"刚写完却读不到"的假阴性（自检实测踩过）。
  const home = config.dshHome || process.env.DSH_HOME
  const verdict = checkTodoGate(sid, home)
  if (verdict.ok) return undefined

  const minInProgress = config.todoMinInProgress ?? 1
  const fix = verdict.code === 'NO_TODO'
    ? '自救动作：先调用 `todo_write` 挂载结构化任务分解（至少 1 项 in_progress），再执行本次动作。'
    : `自救动作：调用 \`todo_write\` 把当前真正在推进的步骤标为 in_progress（至少 ${minInProgress} 项），再执行本次动作。`

  return [
    `⛔ 流程管控硬门禁【S07 待办常显】：拒绝本次 \`${toolName}\` 调用。`,
    `判定依据（磁盘证据，非模型自述）：${verdict.message}`,
    `证据文件：\`~/.dsh-control/todos/${String(sid).replace(/[^a-zA-Z0-9_-]/g, '_')}.json\``,
    fix,
    '只读工具（read/grep/glob）与 todo_write 始终可用；`./scripts/todo_gate.sh status` 可查看实况。',
    '若确需绕过：设置环境变量 DSH_CONTROL_TODO=off（仅关闭本门禁）或 DSH_CONTROL_GUARD=off（关闭全部管控）。',
  ].join('\n')
}

/**
 * 判定是否应拦截该工具调用。
 * 导出以便自检脚本在不启动 DSH 的情况下验证判定逻辑。
 * @returns 拒绝理由字符串；`undefined` 表示放行。
 */
export function evaluate(execution, status, config, cacheAgeMs = 0, lockState = null) {
  const toolName = String(execution?.name || '')
  if (!toolName) return undefined

  // 1) 白名单工具始终放行（含 todo_write：进度可视化必须先于门禁可用）
  if (config.alwaysAllowed.includes(toolName)) return undefined

  // 2) 非受控工具（只读类、子代理、计划、目标等）放行
  if (!config.guardedTools.includes(toolName)) return undefined

  // 3) 逃生舱：本次调用用于"修复管控自身"时放行，避免死锁。
  //    注意：顺序刻意放在"门禁状态判定"之前——修复动作本身必须永远可用。
  //    判定依据是**结构化路径**，不再对参数全文做子串匹配（旧实现可被
  //    `echo x > /tmp/run_control_log.txt` 这类普通命令穿透）。
  if (isEscape(execution, config)) return undefined

  // 4) 依据不可证实 → 失败关闭；状态陈旧 → 放行（详见 STALE_MS 处的语义边界）
  if (!status) {
    return [
      `⛔ 流程管控硬门禁：拒绝本次 \`${toolName}\` 调用 —— 门禁状态不可证实。`,
      '原因：status.json 缺失、损坏或形状非法，尚未取到任何可用依据。',
      '允许的动作：运行 `./scripts/control_gates.sh check` 重新生成状态。',
      '只读工具（read/grep/glob）与 todo_write 始终可用。',
      '若确需绕过：设置环境变量 DSH_CONTROL_GUARD=off（全局）或 DSH_CONTROL_BYPASS=all（单次）。',
    ].join('\n')
  }

  // 4b) 状态存在但形状非法（例如 gates 里混入 null）：同样不可证实，必须失败关闭。
  //     历史缺陷：此处曾因 `g.status` 抛 TypeError 被外层 catch 吞掉 → 畸形状态反而放行，
  //     与"状态不可证实即失败关闭"直接矛盾。
  const usableGates = Array.isArray(status.gates) && status.gates.every((g) => g && typeof g === 'object')
  if (!usableGates) {
    return [
      `⛔ 流程管控硬门禁：拒绝本次 \`${toolName}\` 调用 —— 门禁状态形状非法。`,
      '原因：status.json 的 gates 字段缺失或含有非法条目，无法据此判定。',
      '允许的动作：运行 `./scripts/control_gates.sh check` 重新生成状态。',
    ].join('\n')
  }

  // 5) 底层物理锁判定：若存在物理锁状态，必须完成上一步才允许执行下一步（物理级阻断）
  if (status.execAllowed && lockState) {
    const phys = evaluatePhysicalLock(execution, lockState)
    if (phys) {
      return [
        `🚨 底层物理锁硬阻断：拒绝本次 \`${toolName}\` 调用。`,
        `当前锁阶：${phys.stageName} ➔ 目标要求：${phys.requiredStageName || '下一工序'}`,
        `阻断原因：${phys.message}`,
        '核心规约：在管控机制标准流程中，必须完成上一步才可以执行下一步，从物理层级上规范化执行流程。',
        '自救动作：运行 `./scripts/physical_lock.sh status` 查看工序凭证，依序履约后方可解锁。',
      ].join('\n')
    }
  }

  // 6) 全部门禁通过且物理锁未阻断 → 放行
  if (status.execAllowed) {
    // 6b) S07 待办常显硬门禁（REQ-080）刻意放在这里，而不是最前面：
    //     顺序语义是"先证明自己有资格执行（门禁/物理锁），再证明执行过程可见"。
    //     若放在最前，status.json 缺失时会先报待办缺失，把真正的根因（依据不可证实）
    //     盖掉——历史教训是同类的"错误归因"（见 STALE_MS 那段注释）。
    const todoDenied = evaluateTodoGate(execution, config)
    if (todoDenied) return todoDenied
    return undefined
  }

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
export async function apply(ctx, config = {}) {
  const cfg = { ...Config, ...config }
  const stateDir = resolveStateDir(cfg)

  // ── 加载诊断：把"插件确实被宿主激活"变成可查证的事实 ──────────────────────
  // 为什么要做这件事：本插件出现过"宿主根本没激活它"的情形（inject 未解析），
  // 表现是看板 0 次注入、自动命名 0 次触发，而自检全绿——**完全静默**。
  // 没有这行记录，事后只能靠猜。apply 一执行就落盘，含关键环境事实。
  //
  // 2026-09-28 二次修正：宿主激活证据必须**追加**到独立文件，不能只写覆盖式的
  // plugin-status.txt。实测缺陷：自检脚本（`node ai-control/plugin/selftest.mjs`）
  // 在同一个 stateDir 里 apply 一次，就把宿主真实激活的记录覆盖成 `isHost=false`，
  // 于是 `install_host_gate.sh verify` 会在机制明明活着的时候报"未激活"——
  // 一个会被无关进程抹掉的凭据，等于没有凭据。
  // ── isHost 判定：判据已抽到唯一权威源 ai-control/lib/host_identity.mjs ──────
  // 为什么抽出去：这份判据曾在 index.mjs 与 loader.mjs 各写一份、且两份都错
  // （只认 dsh/lib/bin.js，真实宿主是 Electron NodeService 形态），
  // 导致 isHost 恒 false、宿主激活台账长期空白，只能靠手工回填。
  // 判据唯一的写法见该模块头部注释。
  const isHostProcess = isHostProcessImpl()
  try {
    // 原子锁（REQ-091 / R6）：这份状态文件有**两个写入者** —— 真宿主插件进程与自检脚本，
    // 且是整文件覆盖写。无锁交错时，"宿主激活"这条关键凭据会被测试进程覆盖掉
    // （历史已因此误报"未激活"一次）。加锁后写入串行，谁写谁负责。
    // 锁实现唯一一份：scripts/lib/atomic_lock.mjs（与 shell 侧同锁根）。
    // 注意：插件可能被宿主在**没有仓库路径**的环境下加载，因此这里是**可选依赖** ——
    // 拿不到锁模块时降级为无锁写并在文件里显式留痕，绝不因为加锁失败而拖垮宿主。
    let withLockSyncImpl = null
    try {
      // 用 file URL 定位：插件可能被软链/装配到 profile 下，相对路径不可靠。
      // 拿不到就降级为无锁写（并在下方写进诊断说明），绝不因为加锁失败拖垮宿主。
      const lockUrl = new URL('../../scripts/lib/atomic_lock.mjs', import.meta.url).href
      const mod = await import(lockUrl)
      withLockSyncImpl = typeof mod.withLockSync === 'function' ? mod.withLockSync : null
    } catch { withLockSyncImpl = null }
    const writeStatus = () => {
      writeFileSync(
      join(stateDir, 'plugin-status.txt'),
      [
        `插件已激活（apply 执行）: ${new Date().toISOString()}`,
        `pid=${process.pid}`,
        // 必须区分"宿主激活"与"测试脚本调用 apply"：自检脚本会用 mock ctx 调 apply，
        // 若不区分，测试留下的标记会被误读成"宿主已激活"（实测踩过这个假阳性）。
        `isHost=${isHostProcess}`,
        `argv1=${process.argv[1] ?? ''}`,
        `tools 服务可用=${typeof ctx?.tools === 'object' && ctx.tools !== null}`,
        `showCard=${!!cfg.showCard} enforce=${!!cfg.enforce}`,
        `stateDir=${stateDir}`,
        `DSH_WEB_URL=${process.env.DSH_WEB_URL ?? '(未设置)'}`,
        `DSH_HOME=${process.env.DSH_HOME ?? '(未设置)'}`,
        '',
      ].join('\n'),
      'utf8',
      )
    }
    if (typeof withLockSyncImpl === 'function') {
      withLockSyncImpl('state:plugin_status', writeStatus, { why: '宿主插件状态留痕', staleMs: 30_000 })
    } else {
      writeStatus()
    }
    // 追加式宿主激活台账：只记 isHost=true 的事件，任何测试进程都覆盖不了它。
    if (isHostProcess) {
      appendFileSync(
        join(stateDir, 'host-activation.log'),
        `${new Date().toISOString()} HOST pid=${process.pid} stateDir=${stateDir}\n`,
        'utf8',
      )
    }
  } catch { /* 诊断失败绝不影响主流程 */ }

  // 上下文可用性防御：宿主调用时机异常时静默降级，绝不抛错拖垮宿主。
  if (!ctx || typeof ctx.on !== 'function') {
    console.warn('[ai-execution-control] 上下文不可用，管控未挂载（宿主不受影响）。')
    return
  }

  // ── 每个步骤进入前：自动命名（始终生效）+ 常显看板（可关闭）────────────────
  // 注意：自动命名**刻意不放在 showCard 分支内**。历史缺陷：它曾写在
  // `if (cfg.showCard)` 内部，于是"关掉看板"会连带让自动命名彻底失效——
  // 两个能力本无依赖，耦合在一起只会让故障难以归因。
  {
    try {
      ctx.on('agent/pre-step', async (payload, next) => {
      // ── 自动命名：标题不合规就**当场改名**，不再只是告警 ────────────────────
      // 实现依据：实测探针确认 payload.agent.id 就是精确的 44 字符会话 ID。
      // 此处刻意放在 next() 之前：改名不依赖步骤决策结果，越早生效越好。
      // 幂等由本地的 autoNamedTried 集合保证（每个会话只尝试一次，避免重复写盘）。
      // 真正的命名逻辑在 scripts/lib/auto_naming.mjs —— 与测试脚本共用同一份代码，
      // 保证"测过的就是跑的"。
      try {
        const agent = payload?.agent
        const sid = typeof agent?.id === 'string' ? agent.id : agent?.session?.id
        if (typeof sid === 'string' && sid && !autoNamedTried.has(sid)) {
          autoNamedTried.add(sid)
          const dshHome = cfg.dshHome || process.env.DSH_HOME || join(homedir(), '.dsh')
          const cwd = agent?.session?.header?.cwd ?? agent?.cwd ?? ''
          // 先看当前标题是否已合规：合规就什么都不做（绝不与模型起的好名字打架）。
          // 标题缓存有 10 秒 TTL，所以每步的额外开销只是一次内存查询。
          const t = await cachedTitle(dshHome, sid).catch(() => undefined)
          if (!parseNamingTitle(t)) {
            // 不 await：改名是旁路动作，绝不阻塞步骤进入
            autoNameOnce({ dshHome, sessionId: sid, cwd, webUrl: process.env.DSH_WEB_URL, stateDir })
              .then((r) => lastAutoName.set(sid, r))
              .catch(() => {})
          }
        }
      } catch { /* 自动命名失败绝不影响主流程 */ }
      let decision
      try {
        decision = await next()
      } catch {
        return decision
      }
      // 只在真正要进入步骤时注入；被拒绝的步骤不打扰
      if (!decision || decision.kind !== 'enter') return decision
      if (!cfg.showCard) return decision   // 看板可关闭，自动命名不受影响
      try {
        let status = await readStatus(stateDir)
        // 状态缺失或过期：先自举一次，保证"每个步骤都有可信状态"
        if (!status || needsBootstrap()) {
          const ok = await bootstrapStatus(stateDir, cfg)
          if (ok) status = await readStatus(stateDir)
        }
        if (!status) return decision
        const llm = await resolveHostModule('@deepseek-ai/dsh-llm')
        if (!llm?.createUserMessage) {
          // 解析不到就明确记一笔，避免"看板长期 0 注入而无从得知"
          if (!warnedCardOnce) {
            warnedCardOnce = true
            try {
              writeFileSync(join(stateDir, 'card-status.txt'),
                `看板注入失败：解析不到 @deepseek-ai/dsh-llm\n时间: ${new Date().toISOString()}\n入口: ${process.argv[1] ?? '(未知)'}\n`, 'utf8')
            } catch { /* 记录失败不影响主流程 */ }
            console.warn('[ai-execution-control] 看板注入失败：解析不到 @deepseek-ai/dsh-llm')
          }
          return decision
        }
        const { createUserMessage } = llm
        // 用量行是旁路增强：探针失败/超时都只让这一行消失，不影响看板与门禁。
        const usage = await buildUsageLine().catch(() => '')
        const card = createUserMessage({
          content: [{ type: 'text', text: renderCard(status, usage) }],
          source: { kind: 'plugin', plugin: name, form: 'notice', summary: renderBadge(status) },
        })
        return { kind: 'enter', messages: [...decision.messages, card] }
      } catch (err) {
        // 注入失败绝不影响正常流程，但**必须留下可见信号**。
        // 历史缺陷：这里静默 return，导致看板在真实宿主中长期 0 次注入而无人知晓
        // （实测 48 个会话 7668 步注入 0 次）。只告警一次，避免刷屏。
        if (!warnedCardOnce) {
          warnedCardOnce = true
          console.warn(
            '[ai-execution-control] 看板注入失败（管控降级，宿主不受影响）：',
            err?.message || err,
            '｜若为模块解析失败，说明插件不在宿主 node_modules 解析链上。',
          )
        }
        return decision
      }
      })
    } catch (err) {
      console.warn('[ai-execution-control] 看板注册失败（管控降级，宿主不受影响）：', err?.message || err)
    }
  }

  // ── 输出压缩度量（REQ-081）：订阅会话事件流，给每次回复算体量与结构 ─────────
  // 为什么挂在这里而不是新增一个插件：度量必须与拦截层用同一个 dshHome / stateDir，
  // 否则"度量写到 A、审计读 B"又是一次读写错位（本项目历史上踩过同类坑）。
  // 容错口径：任何解析失败只记一条 warn 一次，绝不影响对话。
  if (cfg.enforce) {
    try {
      ctx.on('session/event', (session, event) => {
        // 诊断计数：把"钩子到底有没有被触发"变成可查事实。
        // 为什么需要：实测 `.dsh-control/compact/` 目录在整台机器上从未出现，
        // 而症状完全相同的原因有三类——钩子没挂上 / 事件没派发 / 载荷取不到正文。
        // 没有计数就只能猜；有了它，一件事一秒可判。
        try {
          const statsFile = join(stateDir, 'compact-stats.json')
          let stats = { seen: 0, assistantMessages: 0, wrote: 0, lastType: '', lastError: '', updatedAt: '' }
          // 修（2026-09-29）：原写法 `try { stats = { ...stats, ...JSON.parse(...) } catch {` 少了**一个闭括号**——
          // 那个 `}` 闭合的是对象字面量，try 块从未闭合，于是整份文件是**语法错误**，
          // `import` 必然抛异常 → loader.mjs 按设计降级为空插件 → **拦截层从来没被成功加载过**，
          // 而外部看到的只是"没有看板、没有拦截"，与"插件没注册"症状完全一样，极难归因。
          try { stats = { ...stats, ...JSON.parse(readFileSync(statsFile, 'utf8')) } } catch { /* 首次运行 */ }
          stats.seen++
          stats.lastType = String(event?.type ?? '(无)')
          if (event?.type !== 'assistant/message') {
            stats.updatedAt = new Date().toISOString()
            writeFileSync(statsFile, JSON.stringify(stats, null, 2), 'utf8')
            return
          }
          stats.assistantMessages++
          const sid = session?.id
          if (typeof sid !== 'string' || !sid) { stats.lastError = 'no_session_id'; throw new Error('no session id') }
          const text = extractText(event.data?.message)
          if (!text) { stats.lastError = 'no_text_extracted'; throw new Error('empty text') }
          const report = buildCompactReport(text, cfg.compactThresholds || {})
          const ok = writeCompactReport(sid, report, cfg.dshHome || process.env.DSH_HOME)
          if (ok) { stats.wrote++; stats.lastError = '' } else { stats.lastError = 'write_failed' }
          stats.updatedAt = new Date().toISOString()
          writeFileSync(statsFile, JSON.stringify(stats, null, 2), 'utf8')
        } catch (e) {
          try {
            const statsFile = join(stateDir, 'compact-stats.json')
            const stats = JSON.parse(readFileSync(statsFile, 'utf8'))
            stats.lastError = String(e?.message || e).slice(0, 120)
            stats.updatedAt = new Date().toISOString()
            writeFileSync(statsFile, JSON.stringify(stats, null, 2), 'utf8')
          } catch { /* 诊断失败绝不影响对话 */ }
        }
      })
    } catch (err) {
      console.warn('[ai-execution-control] 输出压缩度量未挂载（管控降级）：', err?.message || err)
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
        // ── S07 证据落盘 + 物理锁自动晋升（REQ-080）──────────────────────────
        // 为什么必须在守卫里做（而不是另挂一个 hook）：
        //   1) 这是**唯一**能在"工具真正执行前"同步拿到 `execution.arguments` 的地方；
        //   2) `todo_write` 恒定放行（alwaysAllowed），守卫是它唯一会经过的关卡；
        //   3) 历史缺陷：物理锁 STAGE1(SPEC_PASSED) 要求"必须先 todo_write"，
        //      但 todo_write 之后**没有任何代码把它推到 STAGE2(PLAN_PASSED)**，
        //      于是锁永远停在 STAGE1、write/edit 被永久阻断 —— 判定形同死锁。
        //      现在由这里补上自动晋升，让"待办常显"从口号变成解锁条件。
        if (String(execution?.name || '') === 'todo_write') {
          try {
            const sid = resolveSessionId(execution)
            const home = cfg.dshHome || process.env.DSH_HOME || join(homedir(), '.dsh')
            const ev = recordTodoWriteSync(sid, execution.arguments, home, { source: 'guard' })
            if (ev && ev.inProgress > 0 && ev.total > 0) {
              // 物理锁晋升是异步旁路：绝不阻塞守卫（守卫契约是同步的）。
              // 逐阶给凭据：LOCK-1 的凭据是"门禁全绿"（此刻 status.execAllowed 为真），
              // LOCK-2 的凭据就是本次真实落盘的待办证据。两阶都可能在同一次调用里
              // 首次同时成立，因此必须用 advanceLockTo 逐阶带凭据推进，
              // 而不是单次 advanceLock(2)——那会被"不可跨阶"拒绝，锁永远停在 0。
              const gatesGreen = cached.data?.execAllowed === true
              const proofs = {}
              if (gatesGreen) proofs[STAGES.SPEC_PASSED] = { trigger: 'gates_green', source: 'guard' }
              proofs[STAGES.PLAN_PASSED] = {
                trigger: 'todo_write_guard',
                todos: ev.total,
                inProgress: ev.inProgress,
              }
              getLockState(sid, home)
                .then((s) => advanceLockTo(sid, STAGES.PLAN_PASSED, proofs, home))
                .catch(() => {})
            }
          } catch { /* 证据落盘失败绝不影响放行：todo_write 本身无害 */ }
          return undefined
        }

        // 守卫必须是同步的；用缓存值判定。
        const status = cached.data
        const age = Date.now() - cached.at
        // 状态陈旧（有依据、只是不是刚出炉的）→ 顺手把最新状态捞回来，判定当场照常进行。
        if (status && age >= STALE_MS) fireRefresh(stateDir)
        let currentLockState = null
        try {
          // 与待办证据、物理锁晋升共用同一个会话解析：三处若各读各的会话 ID，
          // 会出现"证据记在 A、锁判在 B"的错位（多会话宿主下必然发生）。
          const sid = resolveSessionId(execution)
          const home = cfg.dshHome || process.env.DSH_HOME || join(homedir(), '.dsh')
          const lockFile = join(home, '.dsh-control', 'physical_locks', `${sid.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`)
          if (existsSync(lockFile)) {
            currentLockState = JSON.parse(readFileSync(lockFile, 'utf8'))
          }
        } catch {}
        try {
          return evaluate(execution, status, cfg, age, currentLockState)
        } catch (err) {
          // 判定自身抛错 → 依据不可证实，失败关闭并留下可见原因。
          // 历史行为是 `return undefined`（静默放行），与"状态不可证实即失败关闭"矛盾。
          console.warn('[ai-execution-control] 判定异常，本次调用按失败关闭处理：', err?.message || err)
          return [
            `⛔ 流程管控硬门禁：拒绝本次 \`${execution?.name ?? '未知'}\` 调用 —— 判定过程异常。`,
            '允许的动作：运行 `./scripts/control_gates.sh check` 复查状态，并查看宿主日志中的告警。',
            '若确需绕过：设置环境变量 DSH_CONTROL_GUARD=off（全局）或 DSH_CONTROL_BYPASS=all（单次）。',
          ].join('\n')
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
