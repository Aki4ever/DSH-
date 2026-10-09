#!/usr/bin/env node
/**
 * ==============================================================================
 * 脚本名称：market_guard_patch.mjs
 * 核心功能：把市场插件 `dshmarket` 的「有任意 agent 在跑就拒绝安装」放宽为「并发受理 + 留痕」
 * 需求依据：REQ-093 / R2「插件安装应允许并发执行，当前经常需要等到任务空闲才可以执行」
 * ------------------------------------------------------------------------------
 * 为什么需要它（实测根因，非推测）：
 *   `dshmarket` 的 4 条会改插件文件的路由（install / update / uninstall / migrate-source）
 *   在临界区开头都先数一遍"有多少 agent 在跑"，非零即回 **409 + agentsBusy**。
 *   而**发起安装的当前会话自己就是一个 running agent** —— 于是 agent 回合内点安装必然被拒；
 *   客户端收到 agentsBusy 后入队，并每 2 秒轮询 /status，**只在全局没有任何 running agent 时才重发**。
 *   两者叠加 = 用户看到的"必须等任务空闲"。
 *   运行留痕：`~/.dsh/profiles/<p>/node_modules/dshmarket/.dsh-market/../../.dsh-market/log.ndjson`
 *   里 `install-blocked … refused while agents are running`。
 *
 * 本工具做的事（守三条纪律）：
 *   ① **可回滚**：改前必留时间戳备份，`--revert` 逐字节还原；
 *   ② **幂等**：已打过就报"已打过"，重复执行不会叠加标记；
 *   ③ **可自证**：`--check` 用"标记数 == 4 且 agentsBusy 残留 == 0 且 `node --check` 可解析"三条判定；
 *      `--self-test` 在**临时副本**上实跑 打补丁→判定→回滚→逐字节比对，证明工具有牙且能还原。
 *
 *   + `--heal`（自愈）：把"插件重装静默覆盖补丁"这条**反复复发的外部成因**从
 *     "靠人记得重跑 --apply"改成"重装路径自动补回"。判定 → 按需重打 → 回读校验 → 落一行留痕，
 *     并挂在 `plugin_sync.sh` / `plugin_reload.sh` 的主流程之后（那正是重装改文件的路径）。
 *
 * 边界（必须显式说清）：
 *   · 改的是 **profile 里的第三方产物**，插件升级会覆盖 → 升级后需重跑 `--apply`，
 *     或让重装路径上的 `--heal` 钩子自动补回（钩子只提示，不改调用方退出码）；
 *   · 放宽的是"忙"这一条前置，**写互斥并未取消**：外层 `withMutationLock` 与宿主
 *     `@deepseek-ai/dsh-plugin-manager` 的 profile 写锁仍然生效（同一 profile 的两次安装天然串行）；
 *   · 运行时生效需**重载 profile / 重启桌面端**（宿主已加载旧模块时不会热更）。
 *
 * 用法：
 *   node scripts/market_guard_patch.mjs --check          # 判定：补丁是否已生效且无残留
 *   node scripts/market_guard_patch.mjs --apply          # 打补丁（自动备份 + 写后回读校验）
 *   node scripts/market_guard_patch.mjs --revert         # 还原到最近一次备份
 *   node scripts/market_guard_patch.mjs --heal           # 自愈：被重装覆盖就自动补回（幂等，可挂重装路径）
 *   node scripts/market_guard_patch.mjs --self-test      # 反向用例：临时副本上验证"能打上、能还原、能自愈"
 *
 * 退出码：0 通过 · 1 判红/未打过 · 2 取不到证据（找不到目标文件）
 *   `--heal` 另加一档：3 = 不适用（本机未安装该市场插件）。
 *   刻意与 2 分开：2 是"本该有证据却取不到"（异常），3 是"这东西本来就没有"（正常），
 *   否则重装钩子会把"没装插件"记成失败，噪声会淹没真故障。
 * ==============================================================================
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
// 备份留存策略（REQ-096 同批）：本工具与另外几个写者共用同一个 profile 目录，
// 各自"改前先备份"却没人负责清理，实测同名备份堆到 8 份，回滚只能靠猜。
// 这里沿用本文件既有的做法（下面 newestBackup 的写法），备份完就按统一口径收敛到最新 3 份。
import { pruneBackups } from './lib/backup_retention.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const REL = 'node_modules/dshmarket/lib/routes.js'
const MARKER = 'PATCHED(REQ-093/R2)'
const GUARD_RE = /const busyAgents = runningAgentsForGuard\(\);/
const EXPECTED_BLOCKS = 4
// 自愈留痕（为什么必须落盘）：`--heal` 的调用方是**重装路径上的钩子**，
// 而钩子的结果刻意不污染调用方退出码（详见 plugin_sync.sh / plugin_reload.sh 的钩子注释）。
// 于是"自愈到底跑没跑、补回没补回"在调用方那里看不见 —— 只能靠这份逐行留痕取证。
// 不落留痕的自愈等于"说自愈已成功"，本工程不认自述。
const HEAL_LOG = path.join(ROOT, 'ai-control/reports/state/market_guard_heal.jsonl')

// ── 目标定位 ────────────────────────────────────────────────────────────────
function resolveTarget(explicit) {
  if (explicit) return fs.existsSync(explicit) ? explicit : null
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  const profiles = path.join(home, 'profiles')
  let dirs = []
  try {
    dirs = fs.readdirSync(profiles)
  } catch {
    return null
  }
  for (const d of dirs) {
    const p = path.join(profiles, d, REL)
    if (fs.existsSync(p)) return p
  }
  return null
}

// ── 花括号配平（跳过字符串与注释，避免把文案里的括号算进去） ──────────────────
function matchBrace(src, openIdx) {
  let depth = 0
  let i = openIdx
  let quote = null
  while (i < src.length) {
    const c = src[i]
    const prev = src[i - 1]
    if (quote) {
      if (c === '\\') {
        i += 2
        continue
      }
      if (c === quote) quote = null
      i++
      continue
    }
    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i)
      i = nl === -1 ? src.length : nl
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i)
      i = end === -1 ? src.length : end + 2
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c
      i++
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return i
    }
    void prev
    i++
  }
  return -1
}

/** 找出全部"忙守卫"块：返回 [{start, end, event, text}]，start/end 为 if 块在原文件中的下标（含）。 */
export function findGuardBlocks(src) {
  const blocks = []
  const re = new RegExp(GUARD_RE.source, 'g')
  let m
  while ((m = re.exec(src)) !== null) {
    const after = src.indexOf('if (busyAgents.length > 0)', m.index)
    if (after === -1) continue
    const open = src.indexOf('{', after)
    if (open === -1) continue
    const close = matchBrace(src, open)
    if (close === -1) continue
    const text = src.slice(after, close + 1)
    const ev = text.match(/logEvent\('warn',\s*'([a-z0-9-]+?)-blocked'/)
    blocks.push({ start: after, end: close + 1, event: ev ? ev[1] : 'unknown', text })
    re.lastIndex = close
  }
  return blocks
}

/** 生成替代块：拒绝 → 留痕放行。缩进沿用原块。 */
function replacement(block, indent) {
  const name = `${block.event}-concurrent`
  return [
    `// ${MARKER} 拒绝改并发受理：原为「有任意 agent 在跑就 409 拒绝」。`,
    '// 根因：发起安装的当前会话自己就是 running agent → agent 回合内点安装必然被拒，只能等回合结束。',
    '// 现放宽为：忙只记一条留痕、不再拒绝；写互斥仍由外层 withMutationLock 与宿主 profile 写锁保证。',
    'if (busyAgents.length > 0) {',
    `${indent}    logEvent('warn', '${name}', \`proceeding while agents are running (REQ-093/R2) — \${busyAgents.join(', ')}\`);`,
    `${indent}}`,
  ].join(`\n${indent}`)
}

function indentOf(src, idx) {
  const lineStart = src.lastIndexOf('\n', idx) + 1
  return src.slice(lineStart, idx).match(/^\s*/)[0]
}

// ── 判定 ────────────────────────────────────────────────────────────────────
export function inspect(target) {
  if (!target || !fs.existsSync(target)) return { ok: false, reason: `目标不在位：${target || '(未解析到 dshmarket)'}` }
  const src = fs.readFileSync(target, 'utf8')
  let syntaxOk = true
  try {
    execFileSync(process.execPath, ['--check', target], { stdio: 'pipe' })
  } catch {
    syntaxOk = false
  }
  const markers = src.split(MARKER).length - 1
  const leftovers = src.split('agentsBusy: true').length - 1
  // 注意：GUARD_RE 不带 g 标志，src.match 只会返回首个命中 —— 计数必须用 split（此坑已实测踩过）
  const guards = src.split('const busyAgents = runningAgentsForGuard();').length - 1
  return {
    ok: true,
    target,
    syntaxOk,
    markers,
    leftovers,
    guards,
    patched: markers === EXPECTED_BLOCKS && leftovers === 0,
  }
}

// ── 打补丁 ──────────────────────────────────────────────────────────────────
/**
 * 打补丁的**静默内核**：只做"读 → 改 → 备份 → 写 → 回读校验 → 失败回滚"，
 * 不打印任何东西、不调 pruneBackups。抽出来的唯一理由是**复用**：
 * `apply`（CLI 契约）与 `--heal` 必须打的是**同一份**补丁，
 * 若自愈另写一套替换逻辑，就会出现"两个写者两套口径"——正是本工程反复踩过的坑。
 */
function applyCore(target) {
  const src = fs.readFileSync(target, 'utf8')
  const blocks = findGuardBlocks(src)
  if (blocks.length !== EXPECTED_BLOCKS) return { rc: 2, blocks: blocks.length }
  let out = src
  for (const b of blocks.reverse()) {
    const indent = indentOf(src, b.start)
    const rep = replacement(b, indent).replace(/\n/g, `\n${indent}`)
    out = out.slice(0, b.start) + rep + out.slice(b.end)
  }
  const bak = `${target}.bak-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)}-market-guard`
  fs.copyFileSync(target, bak)
  fs.writeFileSync(target, out)
  // 写后必读回：不信"我写成功了"，只信磁盘
  const after = inspect(target)
  if (!after.ok || !after.syntaxOk || !after.patched) {
    fs.copyFileSync(bak, target)
    return { rc: 1, bak, after, reason: `写后回读校验未过，已回滚。校验结果：${JSON.stringify(after)}` }
  }
  return { rc: 0, bak, after }
}

function apply(target) {
  const r = applyCore(target)
  if (r.rc === 2) {
    console.log(`⛔ 找到 ${r.blocks} 个忙守卫块，期望 ${EXPECTED_BLOCKS} 个 —— 市场插件版本可能已变，拒绝盲改。`)
    return 2
  }
  if (r.rc !== 0) {
    console.log(`⛔ ${r.reason}`)
    return r.rc
  }
  console.log(`✅ 已打补丁并回读校验通过：${target}`)
  // 校验通过之后才收敛：校验失败时 bak 还要用于回滚，绝不能先删。
  // 只留最新 3 份、且只删本工具自己那种后缀，回滚用的最新一份必然保留。
  const gc = pruneBackups(target, 3)
  console.log(`   补丁标记 ${r.after.markers}/${EXPECTED_BLOCKS} · agentsBusy 残留 ${r.after.leftovers} · 备份 ${path.basename(r.bak)}`)
  if (gc.deleted.length) console.log(`   已清理更旧的备份 ${gc.deleted.length} 份（留存口径：最新 3 份）`)
  console.log('   ⚠️ 运行时生效需重载 profile / 重启桌面端；插件升级会覆盖本补丁，升级后重跑 --apply。')
  return 0
}

/** 最近一次本工具留下的备份绝对路径（无则 null）。 */
function newestBackup(target) {
  const dir = path.dirname(target)
  const base = path.basename(target)
  try {
    const cands = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(`${base}.bak-`) && f.endsWith('-market-guard'))
      .sort()
    return cands.length ? path.join(dir, cands[cands.length - 1]) : null
  } catch {
    return null
  }
}

function revert(target) {
  const latest = newestBackup(target)
  if (!latest) {
    console.log('⛔ 没有找到本工具留下的备份，无法还原')
    return 2
  }
  fs.copyFileSync(latest, target)
  console.log(`✅ 已还原：${path.basename(latest)} → ${path.basename(target)}`)
  return 0
}

// ── 自愈：把"被重装覆盖"这条外部成因就地补回（幂等） ─────────────────────────
/** 留痕字段口径见任务书：{at,target,action,before:{markers,leftovers},after:{markers,leftovers},exit} */
function healSnapshot(s) {
  return { markers: s ? s.markers : null, leftovers: s ? s.leftovers : null }
}

/**
 * 落一行自愈留痕。
 * 刻意"绝不因留痕失败而改变自愈结论"：留痕是取证手段，不是自愈的前提；
 * 但它必须**显式**说出来（返回 false 由调用方打印告警），不能静默吞掉 ——
 * 静默写失败的留痕会让人以为"自愈没跑过"。
 */
function recordHeal(entry) {
  try {
    fs.mkdirSync(path.dirname(HEAL_LOG), { recursive: true })
    fs.appendFileSync(HEAL_LOG, `${JSON.stringify(entry)}\n`)
    return true
  } catch (e) {
    console.log(`⚠️ 自愈留痕写入失败（不影响自愈结论）：${String((e && e.message) || e)}`)
    return false
  }
}

/**
 * 自愈主逻辑。`label` 只用于留痕里的 target 字段：
 * 自检时目标是临时副本，把真实目标路径一并记下才追得回"这次自愈是为谁跑的"。
 * `opts.scope`：'live' 真实目标 / 'self-test' 临时副本 —— 必须显式标注，
 * 否则自检的往返会把 "reapplied" 行混进真实留痕里，取证时无法区分，
 * 等于用一个"测试噪声"冒充"生产自愈真的跑过"。
 */
function heal(target, label, opts = {}) {
  const scope = opts.scope || 'live'
  const now = () => new Date().toISOString()
  // ① 未装该插件 = **不适用**，不是失败。刻意放在最前：此时连"要不要自愈"都无从谈起。
  //    退出码 3 与 1（判红）/2（取不到证据）分开，重装钩子才能把 3 当正常放过。
  if (!target || !fs.existsSync(target)) {
    recordHeal({ at: now(), scope, target: label || target || '(未解析到 dshmarket)', action: 'skipped', reason: 'target-missing', before: healSnapshot(null), after: healSnapshot(null), exit: 3 })
    console.log('— 自愈不适用：本机 profile 下没有 dshmarket/lib/routes.js（未安装该市场插件）')
    return 3
  }

  const before = inspect(target)
  // ② 已生效 → 幂等 noop。连跑两次第二次必须走这里（任务书的硬判据）。
  if (before.ok && before.patched && before.syntaxOk) {
    recordHeal({ at: now(), scope, target: label || target, action: 'noop', before: healSnapshot(before), after: healSnapshot(before), exit: 0 })
    console.log(`✅ 已生效，无需自愈：补丁标记 ${before.markers}/${EXPECTED_BLOCKS} · agentsBusy 残留 ${before.leftovers} · 语法 ✅`)
    return 0
  }

  // ③ 被覆盖/被打断 → 复用既有 applyCore 重打，并**回读校验**（不信"我写成功了"）
  console.log(`🩹 守卫补丁已被覆盖（标记 ${before.markers}/${EXPECTED_BLOCKS} · agentsBusy 残留 ${before.leftovers}）→ 自动重打`)
  const r = applyCore(target)
  const after = inspect(target)
  const healed = r.rc === 0 && after.ok && after.patched && after.syntaxOk
  const entry = {
    at: now(),
    scope,
    target: label || target,
    action: 'reapplied',
    before: healSnapshot(before),
    after: healSnapshot(after),
    exit: healed ? 0 : (r.rc === 2 ? 2 : 1),
  }
  if (!healed) entry.reason = r.rc === 2 ? `忙守卫块 ${r.blocks} 个，期望 ${EXPECTED_BLOCKS} 个：插件版本可能已变，拒绝盲改` : '重打后回读校验未过（已回滚到重打前状态）'
  recordHeal(entry)

  if (!healed) {
    console.log(`⛔ 自愈失败：${entry.reason}`)
    return entry.exit
  }
  const gc = pruneBackups(target, 3)
  console.log(`✅ 自愈完成并回读校验通过：补丁标记 ${after.markers}/${EXPECTED_BLOCKS} · agentsBusy 残留 ${after.leftovers} · 语法 ✅ · 备份 ${path.basename(r.bak)}${gc.deleted.length ? ` · 已清理旧备份 ${gc.deleted.length} 份` : ''}`)
  console.log('   ⚠️ 运行时生效仍需重载 profile / 重启桌面端（宿主已加载旧模块不会热更）。')
  return 0
}

/** 自愈接线探测：某脚本主流程后是否真的调了 `--heal`（供 probe 报"接线可证"，不改任何判定）。 */
export function healWiredIn(scriptPath) {
  try {
    const src = fs.readFileSync(scriptPath, 'utf8')
    // 必须容忍路径被引号包住：本仓两条钩子的真实写法是
    // `node "$SCRIPT_DIR/market_guard_patch.mjs" --heal` —— 引号在 .mjs 之后、
    // `--heal` 之前。第一版正则漏了这段引号，实测 probe 把已接的线报成"未接线"
    // （假阴性：探测口径比真实写法窄，就会把装好的机制判成不存在）。
    const hits = (src.match(/market_guard_patch\.mjs["']?\s+--heal/g) || []).length
    return { ok: true, wired: hits > 0, hits }
  } catch (e) {
    return { ok: false, wired: false, hits: 0, reason: String((e && e.message) || e) }
  }
}

// ── 反向用例：临时副本上验证"能打上、能还原" ────────────────────────────────
function selfTest(target) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'market-guard-selftest-'))
  const copy = path.join(dir, 'routes.js')
  // 反向用例必须从**未打补丁的原始件**出发：
  // 若目标此刻已打过补丁，直接拿它做副本会得到"0 个守卫块 → apply 拒绝"，自检必然误报失败
  // （这是本工具第一版实测踩到的真缺陷）。故已打过时改从最近一次备份取原始件。
  const state = inspect(target)
  const backup = newestBackup(target)
  if (state.ok && state.patched) {
    if (!backup) {
      console.log('⛔ 反向用例无法构造：目标已打补丁且找不到原始备份')
      return 2
    }
    fs.copyFileSync(backup, copy)
  } else {
    fs.copyFileSync(target, copy)
  }
  const before = fs.readFileSync(copy)
  console.log('🧪 市场守卫补丁工具 · 反向用例自检')
  console.log('-----------------------------------------')
  const rc = apply(copy)
  const mid = inspect(copy)
  // 基准：首次 apply 的产物字节。它就是"patched 状态"的**独立定义**——
  // 后面的自愈若与之逐字节相同，才叫"真的把文件重置回 patched"。
  // 若只比 "4 个标记 + 0 残留"，一个放宽得不对的自愈（例如整段删掉守卫）也可能凑出同样的数字。
  const patchedBytes = fs.readFileSync(copy)
  const reverted = revert(copy)
  const after = fs.readFileSync(copy)
  const identical = before.equals(after)
  const caught = rc === 0 && mid.patched && reverted === 0 && identical
  console.log(`   临时副本：打补丁退出码 ${rc} · 判定 patched=${mid.patched} · 回滚退出码 ${reverted} · 还原后逐字节一致=${identical}`)

  // ── 新增：自愈反向用例（破坏 → 自愈，必须真的复位）─────────────────────────
  // 此刻副本已被 revert 成"未打补丁"（上面那一步），正是重装覆盖后的真实形态。
  const brokenState = inspect(copy)
  const rcHeal1 = heal(copy, target, { scope: 'self-test' })
  const healedBytes = fs.readFileSync(copy)
  const healedState = inspect(copy)
  const rcHeal2 = heal(copy, target, { scope: 'self-test' })
  const afterSecond = fs.readFileSync(copy)
  const byteEqualPatched = healedBytes.equals(patchedBytes)   // 逐字节等价于 apply 产物
  const differsFromOrig = !healedBytes.equals(before)          // 且确实不是原始件（防"什么都没做"）
  const idempotentStable = afterSecond.equals(healedBytes)     // 再跑一次字节不变
  const healCaught =
    brokenState.patched === false &&   // 起点确实是"被破坏"
    rcHeal1 === 0 &&
    healedState.patched && healedState.syntaxOk &&
    byteEqualPatched && differsFromOrig &&
    rcHeal2 === 0 && idempotentStable
  console.log(`   自愈用例：起点 patched=${brokenState.patched}（故意破坏）· 首次自愈退出码 ${rcHeal1} · 自愈后 patched=${healedState.patched}`)
  console.log(`   自愈产物逐字节等价于打补丁产物=${byteEqualPatched} · 与原始未打补丁件不同=${differsFromOrig} · 再跑自愈（幂等）退出码 ${rcHeal2} · 二次后字节稳定=${idempotentStable}`)
  console.log('-----------------------------------------')
  console.log(caught ? '✅ 反向用例通过：能打上、判定认得出、能逐字节还原' : '⛔ 反向用例失败：补丁或回滚不可靠')
  console.log(healCaught ? '✅ 自愈反向用例通过：破坏后自愈真的把文件重置回 patched 且逐字节等价' : '⛔ 自愈反向用例失败：自愈没有真的把文件重置回 patched')
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch {
    console.log('⚠️ 临时目录清理失败：' + dir)
  }
  return caught && healCaught ? 0 : 1
}

function main() {
  const argv = process.argv.slice(2)
  const ti = argv.indexOf('--target')
  const explicit = ti >= 0 ? argv[ti + 1] : null
  const target = resolveTarget(explicit)
  // `--heal` 的"未装插件"是**正常**情形（退出码 3），不能沿用下面那句
  // "取不到证据 → exit 2"：那会把"本来就没有这东西"记成故障，
  // 挂在重装路径上的钩子就会被自己的噪声淹没。故单独前置。
  if (argv.includes('--heal')) process.exit(heal(target, explicit || (target ?? undefined)))
  if (!target) {
    console.log('⛔ 取不到证据：未在该机 profile 下找到 dshmarket/lib/routes.js')
    process.exit(2)
  }
  if (argv.includes('--self-test')) process.exit(selfTest(target))
  if (argv.includes('--apply')) process.exit(apply(target))
  if (argv.includes('--revert')) process.exit(revert(target))

  const r = inspect(target)
  if (!r.ok) {
    console.log(`⛔ 取不到证据：${r.reason}`)
    process.exit(2)
  }
  console.log('🛡️ 市场守卫补丁 · 判定')
  console.log('-----------------------------------------')
  console.log(`目标：${r.target}`)
  console.log(`  忙碌守卫块 ${r.guards} 个 · 补丁标记 ${r.markers}/${EXPECTED_BLOCKS} · agentsBusy 残留 ${r.leftovers} · 语法 ${r.syntaxOk ? '✅' : '⛔'}`)
  console.log('-----------------------------------------')
  if (r.patched && r.syntaxOk) {
    console.log('✅ 已生效：忙不再拒绝安装，只留痕放行（写互斥仍由 mutation lock 与 profile 写锁保证）')
    process.exit(0)
  }
  console.log('⛔ 未生效：安装仍会在有 agent 运行时被 409 拒绝（补课命令：node scripts/market_guard_patch.mjs --apply）')
  process.exit(1)
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main()
