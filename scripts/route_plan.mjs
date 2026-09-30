#!/usr/bin/env node
/**
 * ==============================================================================
 * 脚本名称：route_plan.mjs
 * 核心功能：路由层可执行载体 —— 命中执行层之后，输出"怎样调配这个执行层更高效"的调配方案
 * 需求依据：REQ-089 / R5「当命中执行层之后需要由路由层决定怎样去调配这个执行层更高效」
 * ------------------------------------------------------------------------------
 * 与历史实现的关系（并存不弃，不修改对方）：
 *   scripts/route_navigate.mjs 只有 3 个硬编码 if 分支，且其 :65 的 capFile 声明之后
 *   从未被读取（死变量）——它是"纸面路由"的历史快照。本脚本是并存的第二个路由层载体，
 *   它的每一条结论都必须能回溯到磁盘证据；查不到就写 `未登记`，禁止编路线。
 *
 * 证据链（每条判定都标注来源，输出里一律带证据文本）：
 *   执行层条目     ← indexes/capabilities_index.json（缺失时回退解析 indexes/capabilities_index.md 的 §3.1 表）
 *   通道 / 触发词  ← indexes/shortcuts_index.md（复用 channel_audit.mjs 的 parseChannels / matchChannel / matchDetail）
 *   技能登记触发词 ← skill-pool/docs/operations/skill-catalog.json 的 triggers 字段
 *   工序依赖与顺序 ← ai-control/config/flow_graph.json（carrier / dependsOn / kind）
 *   组合依赖       ← skill-pool/docs/operations/layer-graph.json（composition 边）
 *   实例安全档位   ← skill-pool/docs/operations/instance-safety.json（safe_multi / needs_lock / single_only）
 *   门禁放行边界   ← scripts/lib/physical_lock.mjs（并用 12 支探针与 evaluatePhysicalLock 逐阶对拍）
 *
 * 用法：
 *   node scripts/route_plan.mjs "<意图或关键词>"      # 输出调配方案
 *   node scripts/route_plan.mjs --check               # 路由层自检（可判红）
 *   node scripts/route_plan.mjs --json "<关键词>"     # 机器可读
 *   node scripts/route_plan.mjs --check --json        # 自检机器可读
 *   node scripts/route_plan.mjs --help
 *
 * 退出码（工程铁律：没有可解析的证据 ≠ 通过）：
 *   0 = 通过（--check 全过 / 关键词命中）
 *   1 = 有问题（--check 有失败项 / 关键词未命中）
 *   2 = 取不到证据（核心或辅助证据源不可解析，拒绝给结论）
 * ==============================================================================
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normalizePhrase,
  parseChannels,
  parseTargets,
  matchDetail,
  CHANNEL_TABLE,
} from './channel_audit.mjs'
import { checkLinks } from './conflict_scan.mjs'
import {
  STAGES,
  STAGE_NAMES,
  evaluatePhysicalLock,
  getLockState,
  getLockFilePath,
  getLockFallbackPath,
} from './lib/physical_lock.mjs'

// ── 唯一权威源路径（每条数据源都是独立常量，便于静态核验"是否真被读取"）──────
const CAPS_JSON_PATH = 'indexes/capabilities_index.json'
const CAPS_MD_PATH = 'indexes/capabilities_index.md'
const SHORTCUTS_PATH = 'indexes/shortcuts_index.md'
const FLOW_GRAPH_PATH = 'ai-control/config/flow_graph.json'
const INSTANCE_SAFETY_PATH = 'skill-pool/docs/operations/instance-safety.json'
const LAYER_GRAPH_PATH = 'skill-pool/docs/operations/layer-graph.json'
const SKILL_CATALOG_PATH = 'skill-pool/docs/operations/skill-catalog.json'
const PHYSICAL_LOCK_PATH = 'scripts/lib/physical_lock.mjs'
const ROUTER_DOC_PATH = 'indexes/navigation_router.md'
const LEGACY_ROUTER_PATH = 'scripts/route_navigate.mjs'
const SCHEDULER_LOCK_PATH = 'scripts/global_scheduler_lock.sh'

const SELF_PATH = path.relative(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  fileURLToPath(import.meta.url),
).split(path.sep).join('/')

const TASK_ID = process.env.DSH_SESSION_ID || 'global_session'

// ── 阻断词黑名单（路由输出里禁止出现无证据的措辞）──────────────────────────
const BANNED_WORDS = ['大概', '可能', '应该', '也许', '估计', '似乎', '大约']

// ── 通用工具 ────────────────────────────────────────────────────────────────

function readTextIf(abs) {
  try {
    return fs.readFileSync(abs, 'utf8')
  } catch {
    return null
  }
}

function readJsonIf(abs) {
  const text = readTextIf(abs)
  if (text === null) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function toRepoRel(root, abs) {
  return path.relative(root, abs).split(path.sep).join('/')
}

/** 去掉注释后的源码：避免"注释里写了路径"被当成真实读取。块注释按行数占位，保证行号与磁盘文件一致 */
function stripCodeComments(src) {
  return String(src)
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split(/\r?\n/)
    .map((line) => line.replace(/(^|[^:'"\\])\/\/.*$/, '$1'))
    .join('\n')
}

/** 该行是否出现某仓库相对路径（兼容 join(ROOT,'a','b') 的分段写法） */
function lineHasPath(line, relPath) {
  const literals = [...String(line).matchAll(/['"`]([^'"`]*)['"`]/g)].map((m) => m[1])
  if (!literals.length) return false
  if (literals.some((s) => s === relPath)) return true
  const joined = literals.join('/')
  if (joined.includes(relPath)) return true
  const parts = relPath.split('/')
  const tail = parts.slice(-2).join('/')
  return literals.length >= 2 && joined.includes(tail) && literals.includes(parts[parts.length - 1])
}

const READ_CALL_RE = /\b(readFileSync|readFile|existsSync|accessSync|access|createReadStream|statSync)\s*\(/

/** 取出 ES import 说明符 */
function importSpecifiers(code) {
  const out = []
  for (const m of String(code).matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) out.push(m[1])
  return out
}

/**
 * 判定"某仓库相对路径是否被某脚本真实读取"。判据必须可证伪，否则会把纸面声明当数据源：
 *   ① 路径字面量出现在读取调用实参里；
 *   ② 路径字面量赋给常量 X，且 X 在声明行之外还被使用（只声明不使用 = 死变量，不算读取）；
 *   ③ 路径以 import 说明符形式被引入（相对脚本目录解析后命中）。
 * route_navigate.mjs 的 `const capFile = path.join(...,'indexes/capabilities_index.md')`
 * 命中 ② 的否定分支：声明之后再无出现 → 判为死变量，不作为数据源。
 */
function readsPath(src, relPath, scriptRel) {
  const code = stripCodeComments(src)
  const scriptDir = path.posix.dirname(scriptRel)
  for (const spec of importSpecifiers(code)) {
    if (!spec.startsWith('.')) continue
    const resolved = path.posix.normalize(path.posix.join(scriptDir, spec))
    if (resolved === relPath) return true
  }
  for (const line of code.split('\n')) {
    if (!lineHasPath(line, relPath)) continue
    if (READ_CALL_RE.test(line)) return true
    const decl = line.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/)
    if (decl) {
      const count = (code.match(new RegExp(`\\b${decl[1]}\\b`, 'g')) || []).length
      if (count > 1) return true
    }
  }
  return false
}

/** 找出"声明了路径但从未读取"的死变量（纸面数据源） */
function deadPathConstants(src, relPaths, scriptRel) {
  const code = stripCodeComments(src)
  const out = []
  for (const rel of relPaths) {
    if (readsPath(src, rel, scriptRel)) continue
    const lines = code.split('\n')
    lines.forEach((line, idx) => {
      if (!lineHasPath(line, rel)) return
      const decl = line.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/)
      if (decl) out.push({ path: rel, variable: decl[1], line: idx + 1 })
    })
  }
  return out
}

/** 最长公共子串长度（用于"未命中"时给近似建议；相似度低的不列） */
function longestCommonSubstring(a, b) {
  const A = [...String(a)]
  const B = [...String(b)]
  let best = 0
  const row = new Array(B.length + 1).fill(0)
  for (let i = 1; i <= A.length; i++) {
    let prev = 0
    for (let j = 1; j <= B.length; j++) {
      const tmp = row[j]
      row[j] = A[i - 1] === B[j - 1] ? prev + 1 : 0
      if (row[j] > best) best = row[j]
      prev = tmp
    }
  }
  return best
}

// ── 证据装载 ────────────────────────────────────────────────────────────────

/**
 * 执行层条目：优先 capabilities_index.json；缺失则回退解析 capabilities_index.md 的 §3.1 表。
 * 两条路径都返回同一形状 { layer, id, path, desc, invoke, invokeKind, interface, source }。
 */
function loadCapabilities(root) {
  const jsonAbs = path.join(root, CAPS_JSON_PATH)
  const json = readJsonIf(jsonAbs)
  const arr = Array.isArray(json) ? json : json?.entries
  if (Array.isArray(arr) && arr.length) {
    const entries = arr
      .map((e) => ({
        layer: e.layer ?? e.层级 ?? null,
        id: e.id ?? e.能力标识 ?? null,
        path: e.path ?? e.物理路径 ?? null,
        desc: e.desc ?? e.简介 ?? '',
        invoke: e.invoke ?? e.调用命令 ?? null,
        invokeKind: e.invokeKind ?? null,
        interface: e.interface ?? e.接口声明 ?? null,
      }))
      .filter((e) => e.id && e.path)
    if (entries.length) {
      return { ok: true, source: CAPS_JSON_PATH, total: arr.length, entries }
    }
  }

  const mdText = readTextIf(path.join(root, CAPS_MD_PATH))
  if (mdText === null) {
    return { ok: false, source: null, error: `执行层索引两种形态都取不到：${CAPS_JSON_PATH} 与 ${CAPS_MD_PATH}` }
  }
  const entries = []
  let inSection = false
  for (const raw of mdText.split(/\r?\n/)) {
    const line = raw.trim()
    if (/^#{2,4}\s/.test(line)) {
      inSection = /3\.1/.test(line) && /执行层速查|速查/.test(line)
      continue
    }
    if (!inSection || !line.startsWith('|')) continue
    const cells = line.split('|')
    if (cells.length && cells[0].trim() === '') cells.shift()
    if (cells.length && cells[cells.length - 1].trim() === '') cells.pop()
    const c = cells.map((x) => x.trim())
    if (c.length < 4) continue
    if (/^:?-{2,}:?$/.test(c[0]) || /^层级$/.test(c[0])) continue
    const clean = (s) => String(s || '').replace(/^`|`$/g, '').trim()
    const layer = c[0]
    const id = clean(c[1])
    const p = clean(c[2])
    // §3.1 表头有两种已见形态：4 列（层级/标识/路径/简介）与 6 列（+接口声明+调用命令）
    const hasInvokeCols = c.length >= 6
    const iface = hasInvokeCols ? c[3] : null
    const invoke = hasInvokeCols ? clean(c[4]) : null
    const desc = hasInvokeCols ? c[5] : c[3]
    if (!id || !p) continue
    entries.push({
      layer,
      id,
      path: p,
      desc,
      invoke: invoke && /未声明/.test(invoke) ? null : invoke,
      invokeKind: 'cli',
      interface: iface && /未声明/.test(iface) ? null : iface,
    })
  }
  if (!entries.length) return { ok: false, source: null, error: `回退解析 ${CAPS_MD_PATH} 的 §3.1 表得到 0 条，判定为取不到证据` }
  return { ok: true, source: CAPS_MD_PATH, total: entries.length, entries }
}

function loadChannels(root) {
  const text = readTextIf(path.join(root, SHORTCUTS_PATH))
  if (text === null) return { ok: false, channels: [], error: `通道表取不到：${SHORTCUTS_PATH}` }
  const channels = parseChannels(text)
  if (!channels.length) return { ok: false, channels: [], error: `通道表解析出 0 条通道（口径：${CHANNEL_TABLE}）` }
  return { ok: true, channels, text }
}

function loadSkillCatalog(root) {
  const json = readJsonIf(path.join(root, SKILL_CATALOG_PATH))
  if (!json || !Array.isArray(json.skills)) return { ok: false, skills: [], error: `技能索引取不到或结构不符：${SKILL_CATALOG_PATH}` }
  return { ok: true, skills: json.skills }
}

function loadFlowGraph(root) {
  const json = readJsonIf(path.join(root, FLOW_GRAPH_PATH))
  if (!json || !Array.isArray(json.steps)) return { ok: false, error: `工序依赖图取不到或结构不符：${FLOW_GRAPH_PATH}` }
  return { ok: true, graph: json }
}

function loadInstanceSafety(root) {
  const json = readJsonIf(path.join(root, INSTANCE_SAFETY_PATH))
  if (!json || !Array.isArray(json.skills)) return { ok: false, error: `实例安全声明表取不到或结构不符：${INSTANCE_SAFETY_PATH}` }
  return { ok: true, table: json }
}

function loadLayerGraph(root) {
  const json = readJsonIf(path.join(root, LAYER_GRAPH_PATH))
  if (!json || !Array.isArray(json.edges)) return { ok: false, error: `层间依赖图取不到或结构不符：${LAYER_GRAPH_PATH}` }
  return { ok: true, graph: json }
}

const INTERFACES_DIR = 'scripts/interfaces'

/**
 * CLI 条目的接口声明盘点（scripts/interfaces/*.json）。
 * 实测：53 份声明的 sideEffects 全部为空、parallel 全部为 exclusive、dependencies 全部为空
 * —— 口径完全一致，对"只读还是写类""依赖谁"没有任何判别力。因此它只能作为
 * "此处有登记但不可用于判定"的说明，不能拿来当"只读可并行"的证据（否则就是拿无区分度的字段充数）。
 */
function interfaceStats(root) {
  const dir = path.join(root, INTERFACES_DIR)
  const stats = { total: 0, parallelValues: {}, emptySideEffects: 0, withDependencies: 0, byPath: new Map() }
  let files = []
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
  } catch {
    files = []
  }
  for (const f of files) {
    const j = readJsonIf(path.join(dir, f))
    if (!j) continue
    stats.total++
    const p = j.parallel ?? '未登记'
    stats.parallelValues[p] = (stats.parallelValues[p] || 0) + 1
    if (!(j.sideEffects || []).length) stats.emptySideEffects++
    if ((j.dependencies || []).length) stats.withDependencies++
    if (j.path) {
      stats.byPath.set(j.path, {
        file: `${INTERFACES_DIR}/${f}`,
        parallel: j.parallel ?? null,
        sideEffects: j.sideEffects || [],
        dependencies: j.dependencies || [],
        verified: j.verified === true,
        source: j.source || '未登记',
      })
    }
  }
  return stats
}

function interfaceDiscriminates(stats) {
  const values = Object.keys(stats.parallelValues)
  return stats.total > 0 && (values.length > 1 || stats.total - stats.emptySideEffects > 0 || stats.withDependencies > 0)
}

// ── 条目视图与匹配 ──────────────────────────────────────────────────────────

const ASCII_STOP = new Set([
  'mjs', 'sh', 'py', 'js', 'ts', 'json', 'md', 'txt', 'yml', 'yaml', 'lock', 'test', 'tests',
  'src', 'lib', 'scripts', 'skills', 'docs', 'pool', 'cli', 'index', 'indexes', 'rules', 'the', 'and',
])
const CN_STOP = new Set(['的能力', '以及', '并且', '用于', '基于', '通过', '包含', '提供', '必须'])

function buildEntryViews(caps, catalog) {
  const skillByPath = new Map((catalog?.skills || []).map((s) => [s.path, s]))
  return caps.entries.map((e) => {
    const skill = skillByPath.get(e.path) || null
    const triggers = (skill?.triggers || []).filter((t) => typeof t === 'string' && t.trim())
    const tokens = new Set()
    for (const seg of String(e.id).split(/[.\-_/\s]+/)) {
      const t = seg.toLowerCase()
      if (t.length >= 3 && !ASCII_STOP.has(t)) tokens.add(t)
    }
    for (const seg of String(e.path).split(/[.\-_/\s]+/)) {
      const t = seg.toLowerCase()
      if (t.length >= 3 && !ASCII_STOP.has(t)) tokens.add(t)
    }
    const descRuns = String(e.desc || '')
      .split(/[^\u4e00-\u9fa5]+/)
      .filter((r) => r.length >= 4 && !CN_STOP.has(r))
    return { ...e, skillId: skill?.id || null, triggers, tokens: [...tokens], descRuns, source: caps.source }
  })
}

/** 关键词 → 执行层条目（四类证据：技能 triggers / 能力标识词元 / 路径词元 / 简介中文词元） */
function matchEntries(query, views, top) {
  const p = normalizePhrase(query)
  const hits = []
  if (!p) return hits
  for (const v of views) {
    let best = 0
    let evidence = []
    const consider = (score, text) => {
      if (score > best) {
        best = score
        evidence = [text]
      } else if (score === best && score > 0) evidence.push(text)
    }
    for (const t of v.triggers) {
      const n = normalizePhrase(t)
      if (n.length >= 2 && p.includes(n)) {
        consider(900 + n.length, `技能索引 triggers「${t}」（来源：${SKILL_CATALOG_PATH}）`)
      }
    }
    for (const t of v.tokens) {
      if (p.includes(t)) consider(700 + t.length, `能力标识/路径词元「${t}」（来源：${v.source}）`)
    }
    for (const t of v.descRuns) {
      if (p.includes(t)) consider(300 + t.length, `简介中文词元「${t}」（来源：${v.source}）`)
    }
    if (best > 0) hits.push({ view: v, score: best, evidence })
  }
  hits.sort((a, b) => b.score - a.score || String(a.view.id).localeCompare(String(b.view.id)))
  return hits.slice(0, top)
}

/** 通道命中 → 其"标准动作与数据源"里的目标链接 → 执行层条目 */
function entriesFromChannel(channel, views, root) {
  const out = []
  const targets = channel.targets.length ? channel.targets : parseTargets(channel.action)
  for (const t of targets) {
    const abs = path.resolve(root, path.dirname(CHANNEL_TABLE), t)
    const rel = toRepoRel(root, abs)
    for (const v of views) {
      const linked = v.path === rel || rel.startsWith(v.path + '/') || v.path.startsWith(rel + '/')
      if (!linked) continue
      out.push({
        view: v,
        score: 1000 + [...channel.name].length,
        evidence: [`通道「${channel.name}」标准动作目标链接 → ${t}（解析为 ${rel}）`],
      })
    }
  }
  return out
}

// ── 依赖 / 裁决 / 回退 ──────────────────────────────────────────────────────

function resolveDependencies(entry, flow, layerGraph, root) {
  const declared = []
  const lines = []
  const steps = (flow?.graph?.steps || []).filter((s) => s.carrier === entry.path)
  for (const s of steps) {
    const deps = (s.dependsOn || []).map((id) => {
      const found = (flow.graph.steps || []).find((x) => x.id === id)
      return found ? `${found.id}（${found.name}）` : `${id}（工序图中未具名）`
    })
    if (deps.length) {
      declared.push(...deps)
      lines.push(`工序依赖（来源：${FLOW_GRAPH_PATH}，本条目是工序 ${s.id} 的 carrier）：${deps.join(' → ')}`)
    } else {
      lines.push(`工序依赖（来源：${FLOW_GRAPH_PATH}，本条目是工序 ${s.id} 的 carrier）：该工序为链路首步，dependsOn 为空`)
    }
  }
  if (entry.skillId) {
    const comp = (layerGraph?.graph?.edges || []).filter((e) => e.from === entry.skillId)
    const rdeps = (layerGraph?.graph?.edges || []).filter((e) => e.to === entry.skillId)
    if (comp.length) {
      declared.push(...comp.map((e) => e.to))
      lines.push(`组合依赖（来源：${LAYER_GRAPH_PATH}，composition 边）：须先具备 ${comp.map((e) => e.to).join(' · ')}`)
    }
    if (rdeps.length) {
      lines.push(`被依赖（来源：${LAYER_GRAPH_PATH}）：${rdeps.map((e) => e.from).join(' · ')} 依赖本条目，改动前须一并复核`)
    }
  }
  if (root) {
    const stats = interfaceStats(root)
    const iface = stats.byPath.get(entry.path)
    if (iface) {
      lines.push(
        `接口声明（来源：${iface.file}，source=${iface.source}，verified=${iface.verified}）：dependencies=[${iface.dependencies.join(' · ')}]` +
          (iface.dependencies.length
            ? ''
            : stats.withDependencies === 0
              ? ` —— 全库 ${stats.total} 份声明的该字段全为空，不构成已登记依赖`
              : ' —— 本条目该字段为空（库内另有登记）'),
      )
    }
  }
  if (!lines.length) {
    return {
      registered: false,
      hasPredecessors: false,
      lines: [`未登记依赖：${FLOW_GRAPH_PATH} 无 carrier=${entry.path} 的工序，${LAYER_GRAPH_PATH} 无该节点，${INTERFACES_DIR} 无该路径的接口声明`],
    }
  }
  if (!declared.length) {
    lines.push(`前置依赖未登记：${FLOW_GRAPH_PATH} 与 ${LAYER_GRAPH_PATH} 均未登记指向本条目的前置依赖（上列证据是"谁依赖本条目"的反向边，不能当作前置顺序）`)
  }
  return { registered: true, hasPredecessors: declared.length > 0, lines }
}

function arbitrate(entry, instanceSafety, flow, root) {
  const is = (instanceSafety?.table?.skills || []).find((s) => s.id === entry.skillId)
  if (is) {
    const parallel = is.instance_safety === 'safe_multi'
    return {
      mode: parallel ? 'parallel' : 'serial',
      readClass: parallel,
      evidence: `实例安全档位（来源：${INSTANCE_SAFETY_PATH}）：${is.id} = ${is.instance_safety}；判据原文「${is.reason}」`,
      resourceKeys: is.resource_keys || [],
    }
  }
  const steps = (flow?.graph?.steps || []).filter((s) => s.carrier === entry.path)
  const gateStep = steps.find((s) => ['lock', 'gate', 'enforce'].includes(s.kind))
  if (gateStep) {
    return {
      mode: 'serial',
      readClass: false,
      evidence: `工序性质（来源：${FLOW_GRAPH_PATH}）：工序 ${gateStep.id} 的 kind=${gateStep.kind}（锁/门禁/强制步），必须串行`,
      resourceKeys: [],
    }
  }
  // 已验证的接口契约才可作为读写/并行证据：verified=false 的是自动抽取的基线占位，
  // 用它下"只读可并行"的结论等于拿没核对过的字段充数。
  if (root) {
    const stats = interfaceStats(root)
    const iface = stats.byPath.get(entry.path)
    if (iface && iface.verified === true && ['readonly', 'shared', 'exclusive'].includes(iface.parallel)) {
      const parallel = iface.parallel !== 'exclusive' && !iface.sideEffects.length
      return {
        mode: parallel ? 'parallel' : 'serial',
        readClass: parallel,
        evidence: `已验证接口契约（来源：${iface.file}，verified=true）：parallel=${iface.parallel}、sideEffects=[${iface.sideEffects.join(' · ')}] → ${parallel ? '只读/共享，可并行' : '声明为独占或含副作用，必须串行'}`,
        resourceKeys: [],
      }
    }
  }
  let ifaceNote = ''
  if (root) {
    const stats = interfaceStats(root)
    const iface = stats.byPath.get(entry.path)
    if (iface) {
      ifaceNote = `；接口声明 ${iface.file}（source=${iface.source}，verified=${iface.verified}）声明 parallel=${iface.parallel}、sideEffects=[${iface.sideEffects.join(' · ')}]，但未经人工核对 → 不作为只读/独占证据（全库 ${stats.total} 份中 source 为 ${[...new Set([...stats.byPath.values()].map((v) => v.source))].join('/')}，verified=true 的 ${[...stats.byPath.values()].filter((v) => v.verified).length} 份）`
    }
  }
  const stepNote = steps.length
    ? `${FLOW_GRAPH_PATH} 中本条目是工序 ${steps.map((s) => `${s.id}(kind=${s.kind})`).join(' · ')} 的 carrier，这些工序的性质不构成串行约束`
    : `${FLOW_GRAPH_PATH} 无 carrier=${entry.path} 的工序`
  return {
    mode: 'serial',
    readClass: false,
    evidence: `未登记实例安全档位：${INSTANCE_SAFETY_PATH} 未覆盖 ${entry.id}，${stepNote}${ifaceNote} → 取保守串行（无证据不得宣称可并行）`,
    resourceKeys: [],
  }
}

function lockNameFor(entry) {
  return `route_plan:${path.basename(entry.path).replace(/[^a-zA-Z0-9._-]/g, '_')}`
}

function rollbackFor(item) {
  if (item.arbitration.readClass) {
    return {
      kind: '只读',
      command: '无需回退（只读，无落盘副作用）',
      evidence: item.arbitration.evidence,
    }
  }
  const lock = lockNameFor(item.view)
  return {
    kind: '写类',
    command: `./${SCHEDULER_LOCK_PATH} --release ${lock} ${TASK_ID}  # 释放排他锁 → git status --porcelain 复核工作树 → 非预期改动用 git restore <路径> 回收`,
    evidence: item.arbitration.evidence,
  }
}

// ── 物理锁门禁：声明口径 + 探针对拍 ─────────────────────────────────────────

/** 十二支探针：覆盖每个阶里"放行/阻断"的代表性调用 */
const PROBES = {
  read: { name: 'read' },
  write: { name: 'write' },
  edit: { name: 'edit' },
  todo_write: { name: 'todo_write' },
  'bash:name_me': { name: 'bash', arguments: { command: "./scripts/name_me.sh '[R089][60分] 探针'" } },
  'bash:control_gates': { name: 'bash', arguments: { command: './scripts/control_gates.sh check' } },
  'bash:physical_lock': { name: 'bash', arguments: { command: './scripts/physical_lock.sh status' } },
  'bash:scheduler': { name: 'bash', arguments: { command: './scripts/global_scheduler_lock.sh --status' } },
  'bash:redundancy': { name: 'bash', arguments: { command: 'node scripts/redundancy_scan.mjs --root .' } },
  'bash:conflict_scan': { name: 'bash', arguments: { command: 'node scripts/conflict_scan.mjs --root .' } },
  'bash:git_push': { name: 'bash', arguments: { command: 'git push origin main' } },
  'bash:git_sync': { name: 'bash', arguments: { command: './scripts/git_sync_remote.sh' } },
}

/**
 * 路由层向使用者承诺的放行边界。它必须与 scripts/lib/physical_lock.mjs 的
 * evaluatePhysicalLock 逐格一致，否则 --check 判红（"文档口径 ≠ 实现口径"）。
 */
const GATE_CONTRACT = {
  [STAGES.INIT]: {
    allow: ['只读工具（read / grep / glob 等）', './scripts/name_me.sh', './scripts/control_gates.sh', './scripts/physical_lock.sh', 'todo_write'],
    deny: ['write / edit', '上述三条之外的 bash'],
    probes: {
      read: 'allow', write: 'deny', edit: 'deny', todo_write: 'allow',
      'bash:name_me': 'allow', 'bash:control_gates': 'allow', 'bash:physical_lock': 'allow',
      'bash:scheduler': 'deny', 'bash:redundancy': 'deny', 'bash:conflict_scan': 'deny',
      'bash:git_push': 'deny', 'bash:git_sync': 'deny',
    },
  },
  [STAGES.SPEC_PASSED]: {
    allow: ['只读工具', 'todo_write', './scripts/global_scheduler_lock.sh', './scripts/physical_lock.sh', 'node scripts/redundancy_scan.mjs', '其余 bash（本阶未阻断）'],
    deny: ['write / edit（需晋升 LOCK-2）'],
    probes: {
      read: 'allow', write: 'deny', edit: 'deny', todo_write: 'allow',
      'bash:name_me': 'allow', 'bash:control_gates': 'allow', 'bash:physical_lock': 'allow',
      'bash:scheduler': 'allow', 'bash:redundancy': 'allow', 'bash:conflict_scan': 'allow',
      'bash:git_push': 'allow', 'bash:git_sync': 'allow',
    },
  },
  [STAGES.PLAN_PASSED]: {
    allow: ['write / edit', '编译与构建命令', '只读工具'],
    deny: ['git push', './scripts/git_sync_remote.sh（需晋升 LOCK-3）'],
    probes: {
      read: 'allow', write: 'allow', edit: 'allow', todo_write: 'allow',
      'bash:name_me': 'allow', 'bash:control_gates': 'allow', 'bash:physical_lock': 'allow',
      'bash:scheduler': 'allow', 'bash:redundancy': 'allow', 'bash:conflict_scan': 'allow',
      'bash:git_push': 'deny', 'bash:git_sync': 'deny',
    },
  },
  [STAGES.VERIFY_PASSED]: {
    allow: ['全部（含提交推送与结项）'],
    deny: [],
    probes: Object.fromEntries(Object.keys(PROBES).map((k) => [k, 'allow'])),
  },
  [STAGES.DELIVERED]: {
    allow: ['全部'],
    deny: [],
    probes: Object.fromEntries(Object.keys(PROBES).map((k) => [k, 'allow'])),
  },
}

function auditGateContract() {
  const problems = []
  let checked = 0
  for (const [stageStr, contract] of Object.entries(GATE_CONTRACT)) {
    const stage = Number(stageStr)
    const lockState = { stage, sessionId: 'probe', proofs: {}, history: [] }
    for (const [label, expect] of Object.entries(contract.probes)) {
      const probe = PROBES[label]
      if (!probe) {
        problems.push({ type: '①b-探针缺失', a: label, b: `阶 LOCK-${stage}`, advice: '探针表与承诺表不对齐，补探针或删承诺。' })
        continue
      }
      const blocked = evaluatePhysicalLock(probe, lockState) !== null
      const actual = blocked ? 'deny' : 'allow'
      checked++
      if (actual !== expect) {
        problems.push({
          type: '①b-门禁口径与实现不一致',
          a: `LOCK-${stage} · 探针 ${label}`,
          b: `路由层承诺 ${expect}，physical_lock.mjs 实测 ${actual}`,
          advice: '以 scripts/lib/physical_lock.mjs 的 evaluatePhysicalLock 为准修正路由层口径，禁止两头各说一套。',
        })
      }
    }
  }
  return { checked, problems }
}

function gateForStage(stage) {
  const c = GATE_CONTRACT[stage] || GATE_CONTRACT[STAGES.VERIFY_PASSED]
  return { allow: c.allow, deny: c.deny, name: STAGE_NAMES[stage] || `STAGE_${stage}` }
}

// ── 调配方案 ────────────────────────────────────────────────────────────────

function buildPlan({ query, top, root, caps, channels, catalog, flow, instanceSafety, layerGraph, lockState }) {
  const views = buildEntryViews(caps, catalog)
  const detail = matchDetail(query, channels.channels)

  const merged = new Map()
  const put = (hit) => {
    const key = hit.view.id
    const prev = merged.get(key)
    if (!prev || hit.score > prev.score) merged.set(key, hit)
    else if (hit.score === prev.score) prev.evidence.push(...hit.evidence)
    else prev.evidence.push(...hit.evidence)
  }
  for (const h of matchEntries(query, views, top)) put(h)
  if (detail.hit) for (const h of entriesFromChannel(detail.hit, views, root)) put(h)

  const items = [...merged.values()]
    .sort((a, b) => b.score - a.score || String(a.view.id).localeCompare(String(b.view.id)))
    .slice(0, top)
    .map((h) => {
      const arbitration = arbitrate(h.view, instanceSafety, flow, root)
      return {
        view: h.view,
        score: h.score,
        evidence: [...new Set(h.evidence)],
        pathExists: fs.existsSync(path.join(root, h.view.path)),
        invoke: h.view.invoke || null,
        dependencies: resolveDependencies(h.view, flow, layerGraph, root),
        arbitration,
      }
    })

  const suggestions = items.length ? [] : suggest(query, channels.channels, views)
  const gate = { stage: lockState.stage, ...gateForStage(lockState.stage) }
  gate.verdicts = items.map((it) => {
    const readClass = it.arbitration.readClass
    if (readClass) return { id: it.view.id, verdict: 'allow', reason: `只读类（依据：${it.arbitration.evidence}）→ 任何阶均放行` }
    if (lockState.stage >= STAGES.PLAN_PASSED) {
      return { id: it.view.id, verdict: 'allow', reason: `写类，当前已过 LOCK-2；但在 LOCK-3 之前仍受 git push / git_sync_remote.sh 禁令约束` }
    }
    return { id: it.view.id, verdict: 'deny', reason: `写类，当前处在 LOCK-${lockState.stage}，申报 LOCK-2 之前禁止 write/edit 与写类调用（依据：${PHYSICAL_LOCK_PATH}）` }
  })

  // 批次：先并行只读批次，再串行写类批次，最后门禁/锁批次
  const parallel = items.filter((it) => it.arbitration.mode === 'parallel')
  const serialWrite = items.filter((it) => it.arbitration.mode === 'serial' && !isGateEntry(it.view, flow))
  const gateItems = items.filter((it) => it.arbitration.mode === 'serial' && isGateEntry(it.view, flow))
  const batches = []
  if (parallel.length) batches.push({ batch: batches.length + 1, mode: '并行', reason: '实例安全档位登记为 safe_multi，无写盘冲突', items: parallel.map((it) => it.view.id) })
  if (serialWrite.length) batches.push({ batch: batches.length + 1, mode: '串行', reason: '写与写互斥，或实例安全档位未登记 → 保守串行并持排他锁', items: serialWrite.map((it) => it.view.id) })
  if (gateItems.length) batches.push({ batch: batches.length + 1, mode: '串行（门禁）', reason: '工序依赖图中的锁/门禁/强制步，必须独占串行', items: gateItems.map((it) => it.view.id) })

  return {
    mode: 'plan',
    query,
    normalized: normalizePhrase(query),
    root,
    generatedAt: new Date().toISOString(),
    hit: items.length > 0,
    channelHit: detail.hit
      ? { name: detail.hit.name, route: detail.hit.route, intent: detail.hit.intent, via: detail.via, score: detail.score, targets: detail.hit.targets }
      : null,
    channelRival: detail.rival || null,
    items,
    suggestions,
    gate,
    batches,
    evidenceSources: {
      capabilities: caps.source,
      channels: SHORTCUTS_PATH,
      dependencies: flow.ok ? FLOW_GRAPH_PATH : null,
      arbitration: instanceSafety.ok ? INSTANCE_SAFETY_PATH : null,
      layerGraph: layerGraph.ok ? LAYER_GRAPH_PATH : null,
      gate: PHYSICAL_LOCK_PATH,
    },
    evidenceWarnings: [
      !flow.ok ? `依赖证据缺失：${flow.error} → 依赖一律记为未登记` : null,
      !instanceSafety.ok ? `裁决证据缺失：${instanceSafety.error} → 并行/串行一律取保守串行` : null,
      !layerGraph.ok ? `组合依赖证据缺失：${layerGraph.error}` : null,
      !catalog.ok ? `技能触发词证据缺失：${catalog.error}` : null,
    ].filter(Boolean),
  }
}

function isGateEntry(view, flow) {
  const step = (flow?.graph?.steps || []).find((s) => s.carrier === view.path)
  return !!step && ['lock', 'gate'].includes(step.kind)
}

function suggest(query, channels, views) {
  const p = normalizePhrase(query)
  if (!p) return []
  const cands = []
  for (const ch of channels) {
    cands.push({ text: ch.name, kind: '通道触发词' })
    for (const a of ch.all) if (a !== ch.name) cands.push({ text: a, kind: '通道别名' })
  }
  for (const v of views) {
    cands.push({ text: v.id, kind: '执行层标识' })
    for (const t of v.triggers) cands.push({ text: t, kind: '技能触发词' })
  }
  const seen = new Set()
  const scored = []
  for (const c of cands) {
    const n = normalizePhrase(c.text)
    if (!n || n === p || seen.has(n)) continue
    seen.add(n)
    const lcs = longestCommonSubstring(p, n)
    if (lcs < 2) continue
    scored.push({ text: c.text, kind: c.kind, similarity: Number((lcs / Math.max([...p].length, [...n].length)).toFixed(3)), common: lcs })
  }
  scored.sort((a, b) => b.common - a.common || b.similarity - a.similarity || a.text.localeCompare(b.text))
  return scored.slice(0, 3).map((s) => ({ ...s, note: '近似建议（非命中，仅供改写关键词）' }))
}

// ── 渲染 ────────────────────────────────────────────────────────────────────

function renderPlan(plan) {
  const L = []
  const say = (s = '') => L.push(s)
  say(`### 🧭 路由层调配方案：【${plan.query}】`)
  say()
  if (!plan.hit) {
    say('- 🚩 **起点**：`' + plan.query + '`（归一化：`' + plan.normalized + '`）')
    say('- ❌ **未命中**：索引、通道表、技能触发词三处证据都没有命中该关键词；**不生成路线，不回显关键词伪造路线**。')
    if (plan.channelRival) say(`- 最接近但未达命中线的通道：${plan.channelRival}`)
    say()
    say('#### 💡 近似建议（非命中，仅供改写关键词）')
    if (!plan.suggestions.length) say('- 无（相似度过低，不给建议）')
    for (const s of plan.suggestions) say(`- 「${s.text}」（${s.kind}，相似度 ${s.similarity}）`)
    say()
    say(`- 📊 **本次使用证据源**：条目 \`${plan.evidenceSources.capabilities}\` · 通道 \`${plan.evidenceSources.channels}\``)
    return L.join('\n')
  }

  say(`- 🚩 **起点**：\`${plan.query}\`（归一化：\`${plan.normalized}\`）`)
  say(`- 🧩 **匹配契约**：通道触发词（\`${SHORTCUTS_PATH}\`）· 技能登记触发词（\`${SKILL_CATALOG_PATH}\`）· 能力标识/路径词元（\`${plan.evidenceSources.capabilities}\`）· 简介中文词元（≥4 字）`)
  if (plan.channelHit) {
    say(`- 🛣️ **通道命中**：通道「${plan.channelHit.name}」（${plan.channelHit.route}）· 依据 ${plan.channelHit.via} · ${plan.channelHit.score} 分 · 意图「${plan.channelHit.intent}」`)
  }
  say(`- 🎯 **命中执行层条目**：${plan.items.length} 条`)
  say()
  say('#### 🎯 命中的执行层条目（id / 层 / 物理路径 / 可直接执行的调用命令）')
  plan.items.forEach((it, i) => {
    const v = it.view
    say(`${i + 1}. \`${v.id}\` · 层=${v.layer} · 路径=\`${v.path}\`（${it.pathExists ? '磁盘存在' : '⚠️ 磁盘不存在'}）`)
    say(`   - **调用命令**：${it.invoke ? '`' + it.invoke + '`' : `索引未登记调用命令（调用形态：${v.invokeKind || '未登记'}）`}`)
    say(`   - **接口声明**：${v.interface ? v.interface : '⛔ 未声明'}`)
    say(`   - **命中证据**：${it.evidence.join('；')}`)
  })

  say()
  say(`#### 🔒 前置门禁（物理锁 LOCK-${plan.gate.stage}）`)
  say(`- **当前阶**：${plan.gate.name}｜证据文件：\`${plan.gate.lockFile || getLockFilePath()}\``)
  say(`- **本阶允许**：${plan.gate.allow.join(' · ')}`)
  say(`- **本阶禁止**：${plan.gate.deny.length ? plan.gate.deny.join(' · ') : '无（本阶为全放行阶）'}`)
  for (const v of plan.gate.verdicts) say(`- **条目放行判定** \`${v.id}\`：${v.verdict === 'allow' ? '✅ 放行' : '⛔ 阻断'} —— ${v.reason}`)

  say()
  say('#### 🔗 依赖与顺序')
  for (const it of plan.items) {
    say(`- \`${it.view.id}\`：`)
    for (const line of it.dependencies.lines) say(`  - ${line}`)
    if (!it.dependencies.registered) say('  - **结论：未登记依赖**（禁止据此臆造串并行关系）')
  }

  say()
  say('#### ⚖️ 并行/串行裁决')
  for (const it of plan.items) {
    say(`- \`${it.view.id}\`：${it.arbitration.mode === 'parallel' ? '可并行' : '必须串行'} —— ${it.arbitration.evidence}`)
    if (it.arbitration.resourceKeys?.length) say(`  - 资源键（来源：instance-safety.json）：${it.arbitration.resourceKeys.join(' · ')}`)
  }

  say()
  say('#### 📦 建议批次')
  if (!plan.batches.length) say('- 无批次（无命中条目）')
  for (const b of plan.batches) {
    say(`- **第${['一', '二', '三', '四', '五'][b.batch - 1] || b.batch}批（${b.mode}）**：${b.items.map((x) => '`' + x + '`').join(' · ')}`)
    say(`  - 分批理由：${b.reason}`)
  }

  say()
  say('#### ↩️ 失败回退命令')
  plan.items.forEach((it, i) => {
    const rb = rollbackFor(it)
    const serial = it.arbitration.mode === 'serial' && !it.arbitration.readClass
    say(`- \`${it.view.id}\`（${rb.kind}）：${rb.command}`)
    if (serial && it.invoke) say(`  - 串行包裹调用：\`./${SCHEDULER_LOCK_PATH} --run ${lockNameFor(it.view)} ${TASK_ID} ${it.invoke}\``)
  })

  const unregistered = []
  for (const it of plan.items) {
    if (!it.dependencies.registered) unregistered.push(`\`${it.view.id}\` 依赖未登记`)
    else if (!it.dependencies.hasPredecessors) unregistered.push(`\`${it.view.id}\` 前置依赖未登记（只有反向边证据）`)
    if (!it.invoke) unregistered.push(`\`${it.view.id}\` 调用命令未登记`)
    if (it.arbitration.evidence.includes('未登记实例安全档位')) unregistered.push(`\`${it.view.id}\` 实例安全档位未登记（已取保守串行）`)
  }
  for (const w of plan.evidenceWarnings) unregistered.push(w)
  if (unregistered.length) {
    say()
    say('#### ⚠️ 未登记项（不得当成已核实）')
    for (const u of unregistered) say(`- ${u}`)
  }
  say()
  say(`- 📊 **证据源**：条目 \`${plan.evidenceSources.capabilities}\` · 通道 \`${plan.evidenceSources.channels}\` · 依赖 \`${plan.evidenceSources.dependencies || '未取到'}\` · 裁决 \`${plan.evidenceSources.arbitration || '未取到'}\` · 门禁 \`${plan.evidenceSources.gate}\``)
  return L.join('\n')
}

// ── 自检 ────────────────────────────────────────────────────────────────────

/**
 * ① 文档-实现一致性：indexes/navigation_router.md 承诺的命令与数据源，
 * 必须在被它点名的实现脚本里真实存在、真实被读取（死变量不算读取）。
 * sourceOf(rel) 返回脚本源码文本（null = 文件不存在），便于用固定样本证明"能判红"。
 */
function auditDocImpl(docText, sourceOf) {
  const problems = []
  const lines = String(docText).split(/\r?\n/)

  // 划定路由工具章节：含 route_plan/route_navigate 的二级章节
  let start = -1
  let end = lines.length
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      if (start >= 0) {
        end = i
        break
      }
      if (/route_plan|route_navigate|导航路由工具|路由工具/.test(lines[i]) && /自动化|工具/.test(lines[i])) start = i
    }
  }
  if (start < 0) {
    return [{ type: '①-未找到路由工具章节', a: ROUTER_DOC_PATH, b: '文档里没有可解析的"自动化导航路由工具"章节', advice: '补回该章节并写明可执行载体与数据源。' }]
  }
  const section = lines.slice(start, end)

  // 声明命令：fenced code block 里的 `node scripts/xxx.mjs ...`
  const commands = []
  let inFence = false
  for (const line of section) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (!inFence) continue
    const m = line.match(/node\s+(scripts\/[\w.\-]+\.mjs)([^\n]*)/)
    if (m) commands.push({ script: m[1], args: m[2] || '' })
  }
  if (!commands.length) {
    problems.push({ type: '①-文档未声明任何可执行载体', a: ROUTER_DOC_PATH, b: '章节内没有 node scripts/*.mjs 命令', advice: '写明路由层可执行载体的调用命令。' })
  }

  // 声明数据源：含"权威源/数据源/基于/取自"的行里的反引号仓库路径
  const declaredSources = new Set()
  for (const line of section) {
    if (!/权威源|数据源|基于|取自/.test(line)) continue
    for (const m of line.matchAll(/`([^`]+)`/g)) {
      const p = m[1].trim()
      if (/^(indexes|rules|ai-control|skill-pool|scripts|docs|skills|knowledge|templates)\/[\w./\-]+\.(md|json|mjs|js|sh|py)$/.test(p)) declaredSources.add(p)
    }
  }
  if (!declaredSources.size) {
    problems.push({ type: '①-文档未声明数据源', a: ROUTER_DOC_PATH, b: '未解析到任何"路由知识基于 X"的声明', advice: '按真实实现写明数据源；没有数据源就等于路由知识无出处。' })
  }

  // 载体存在性 + flag 真实被处理
  for (const cmd of commands) {
    const src = sourceOf(cmd.script)
    if (src === null) {
      problems.push({ type: '①-声明载体不存在', a: cmd.script, b: `文档承诺 ${cmd.script} 可执行，磁盘上取不到该文件`, advice: '删除该命令或补回脚本。' })
      continue
    }
    for (const flag of [...cmd.args.matchAll(/(--[a-z][\w-]*)/g)].map((m) => m[1])) {
      if (!src.includes(flag)) {
        problems.push({ type: '①-声明命令未被实现', a: `${cmd.script} ${flag}`, b: `文档承诺支持 ${flag}，源码中检索不到该开关`, advice: '实现该开关，或从文档删除该命令。' })
      }
    }
  }

  // 主载体：第一条命令的脚本；它必须真实读取每一条声明数据源
  if (commands.length) {
    const mainRel = commands[0].script
    const mainSrc = sourceOf(mainRel)
    if (mainSrc !== null) {
      for (const srcPath of declaredSources) {
        if (!readsPath(mainSrc, srcPath, mainRel)) {
          const dead = deadPathConstants(mainSrc, [srcPath], mainRel)
          const why = dead.length
            ? `该路径在源码第 ${dead.map((d) => d.line).join('/')} 行被赋给 \`${dead[0].variable}\` 之后从未被读取（死变量），不构成数据源`
            : '源码中检索不到对该路径的真实读取'
          problems.push({ type: '①-数据源未被实现读取', a: `${mainRel} ← ${srcPath}`, b: `文档自称路由知识基于 ${srcPath}，但主载体 ${why}`, advice: '让主载体真实读取该数据源，或把文档改成与实现一致（二选一，禁止两头各说一套）。' })
        }
      }
    }
  }

  // 历史实现声明：若文档声称某脚本存在死变量/不读索引，该声明必须为真
  const legacyLine = section.find((l) => /历史实现|不读取任何索引/.test(l))
  if (legacyLine) {
    const legacyRel = (legacyLine.match(/`([^`]+\.mjs)`/) || [])[1] || LEGACY_ROUTER_PATH
    if (legacyRel) {
      const legacySrc = sourceOf(legacyRel)
      if (legacySrc === null) {
        problems.push({ type: '①-历史实现声明失真', a: legacyRel, b: '文档提到该历史实现，磁盘上取不到该文件', advice: '修正文档引用路径，或补回文件。' })
      } else if (/死变量/.test(legacyLine)) {
        const dead = deadPathConstants(legacySrc, [CAPS_MD_PATH, CAPS_JSON_PATH, SHORTCUTS_PATH], legacyRel)
        if (!dead.length) {
          problems.push({ type: '①-历史实现声明失真', a: legacyRel, b: '文档声称它存在"声明后从未读取"的死变量，对拍源码未检出', advice: '按源码实况修正文档，或删除该断言。' })
        }
      }
    }
  }
  return problems
}

/** ①c 判红能力自检：用固定样本证明一致性检测器既能判红、也不误报 */
function selfTestDocImpl() {
  const results = []
  const fixtureDoc = [
    '## 🛠️ 三、自动化导航路由工具',
    '',
    '```bash',
    'node scripts/fixture_router.mjs "<关键词>"',
    '```',
    '- **单一权威源**：路由知识基于 `indexes/ghost_index.md` 动态生成；',
  ].join('\n')
  const badImpl = "const ghost = 'indexes/ghost_index.md'\nconsole.log('route')\n"
  const goodImpl = "import fs from 'node:fs'\nconsole.log(fs.readFileSync('indexes/ghost_index.md', 'utf8'))\n"
  const bad = auditDocImpl(fixtureDoc, (rel) => (rel === 'scripts/fixture_router.mjs' ? badImpl : null))
  const good = auditDocImpl(fixtureDoc, (rel) => (rel === 'scripts/fixture_router.mjs' ? goodImpl : null))
  results.push({
    name: '负例（声明数据源但源码只有死变量）必须被检出',
    pass: bad.some((p) => p.type === '①-数据源未被实现读取'),
    detail: bad.map((p) => p.type).join(' / ') || '未检出任何问题',
  })
  results.push({
    name: '正例（声明数据源且源码真实读取）不得误报',
    pass: good.length === 0,
    detail: good.map((p) => `${p.type}: ${p.b}`).join(' / ') || '无问题',
  })
  return results
}

/** ② 死通道 = 0（复用 channel_audit 的解析口径 + conflict_scan 的死链判定） */
async function auditChannels(root, channels) {
  const problems = []
  const tableAbs = path.join(root, CHANNEL_TABLE)
  const text = readTextIf(tableAbs)
  if (text === null) return { problems: [{ type: '②-通道表取不到', a: CHANNEL_TABLE, b: '磁盘上取不到通道表', advice: '补回通道表。' }], dead: 0 }
  const exists = (abs) => fs.existsSync(abs)
  let dead = 0
  for (const item of await checkLinks(tableAbs, text, exists)) {
    dead++
    problems.push({ type: '②-通道死链', a: item.a.value, b: item.b.value, advice: item.advice })
  }
  for (const ch of channels) {
    if (!ch.targets.length) {
      dead++
      problems.push({ type: '②-通道无可校验目标', a: ch.name, b: '标准动作里没有任何文件链接', advice: '把动作目标写成 Markdown 链接，使其可点击、可校验。' })
    }
  }
  return { problems, dead }
}

/** ③ 可达性覆盖率：有触发词 N / 无触发词 M（分开报，不许把 M 混进 N） */
function auditReachability({ root, caps, channels, catalog }) {
  const problems = []
  const channelTargets = new Map()
  for (const ch of channels.channels) {
    for (const t of ch.targets) {
      const rel = toRepoRel(root, path.resolve(root, path.dirname(CHANNEL_TABLE), t))
      if (!channelTargets.has(rel)) channelTargets.set(rel, [])
      channelTargets.get(rel).push({ channel: ch.name, target: t })
    }
  }
  const skillByPath = new Map((catalog.skills || []).map((s) => [s.path, s]))
  const rawCatalog = readTextIf(path.join(root, SKILL_CATALOG_PATH)) || ''
  const withTrigger = []
  const withoutTrigger = []
  for (const e of caps.entries) {
    const evidence = []
    const skill = skillByPath.get(e.path)
    const triggers = (skill?.triggers || []).filter((t) => typeof t === 'string' && t.trim())
    if (triggers.length) {
      evidence.push({ source: SKILL_CATALOG_PATH, kind: 'catalog.triggers', entryId: skill.id, triggers })
      if (!rawCatalog.includes(skill.id) || !triggers.every((t) => rawCatalog.includes(t))) {
        problems.push({
          type: '③-覆盖证据不可回溯',
          a: e.id,
          b: `登记触发词无法在 ${SKILL_CATALOG_PATH} 原文中回溯`,
          advice: '覆盖统计必须来自磁盘原文；不可回溯的登记不得计入"有触发词"。',
        })
      }
    }
    for (const [rel, hits] of channelTargets) {
      if (rel === e.path || rel.startsWith(e.path + '/') || e.path.startsWith(rel + '/')) {
        evidence.push({ source: SHORTCUT_TABLE_LABEL(), kind: 'channel.target', channels: hits.map((h) => h.channel), target: rel })
      }
    }
    if (evidence.length) {
      withTrigger.push({ id: e.id, path: e.path, evidence })
    } else {
      withoutTrigger.push({ id: e.id, path: e.path })
    }
  }
  const total = caps.entries.length
  if (withTrigger.length + withoutTrigger.length !== total) {
    problems.push({
      type: '③-计数不自洽',
      a: `有触发词 ${withTrigger.length} + 无触发词 ${withoutTrigger.length}`,
      b: `索引条目总数 ${total}`,
      advice: '分类必须完备且互斥，禁止用"没触发词"充数。',
    })
  }
  const overlap = withTrigger.filter((w) => withoutTrigger.some((u) => u.path === w.path))
  if (overlap.length) {
    problems.push({ type: '③-分类重叠', a: overlap.map((o) => o.id).join(' · '), b: '同一条目同时落在两个集合', advice: '修正分类逻辑。' })
  }
  const coverage = total ? withTrigger.length / total : 0
  return {
    problems,
    total,
    withTrigger: withTrigger.length,
    withoutTrigger: withoutTrigger.length,
    coverage: Number(coverage.toFixed(4)),
    covered: withTrigger,
    uncovered: withoutTrigger,
  }
}

function SHORTCUT_TABLE_LABEL() {
  return SHORTCUTS_PATH
}

/** ④ 反向用例：必然无意义的关键词必须未命中，且不得回显关键词伪造路线 */
const REVERSE_CASE = 'zzz-不存在的能力-9999'

// ── 主流程 ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { query: null, check: false, json: false, root: null, top: 5, minCoverage: null, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--check') args.check = true
    else if (a === '--json') args.json = true
    else if (a === '--help' || a === '-h') args.help = true
    else if (a === '--root') args.root = argv[++i]
    else if (a === '--top') args.top = Number(argv[++i]) || 5
    else if (a.startsWith('--min-coverage=')) args.minCoverage = Number(a.split('=')[1])
    else if (a === '--min-coverage') args.minCoverage = Number(argv[++i])
    else if (!a.startsWith('-')) args.query = args.query === null ? a : `${args.query} ${a}`
  }
  return args
}

function helpText() {
  return [
    '路由层可执行载体（REQ-089 / R5）—— 命中执行层后输出"怎样调配这个执行层更高效"的调配方案',
    '',
    '用法：',
    '  node scripts/route_plan.mjs "<意图或关键词>"      # 输出调配方案',
    '  node scripts/route_plan.mjs --check               # 路由层自检（文档一致性/死通道/覆盖率/反向用例）',
    '  node scripts/route_plan.mjs --json "<关键词>"     # 机器可读',
    '  node scripts/route_plan.mjs --check --json [--min-coverage 0.9]',
    '',
    '退出码：0 = 通过；1 = 有问题（含未命中）；2 = 取不到证据',
  ].join('\n')
}

/**
 * 输出文本禁用词守门：路由输出里不得出现无证据措辞。
 * 注意：问题描述里**不得回显**命中的词本身，否则守门问题自己又成了新的违规文本。
 */
function printBannedWordGuard(text, where) {
  const hits = BANNED_WORDS.filter((w) => String(text).includes(w))
  if (!hits.length) return []
  return [{
    type: '①-输出含无证据措辞',
    a: where,
    b: `命中无证据措辞黑名单 ${hits.length} 项（词表见 ${SELF_PATH} 的 BANNED_WORDS，共 ${BANNED_WORDS.length} 项）`,
    advice: '删除无证据措辞，改写为"未登记"，或补上可回溯的证据。',
  }]
}

async function runCheck(args, root, caps, channels, catalog, flow, instanceSafety, layerGraph, docText) {
  const problems = []
  const evidence = []

  // 证据盘点
  evidence.push({ key: 'capabilities', path: caps.source || CAPS_JSON_PATH, status: caps.ok ? 'ok' : 'missing', detail: caps.ok ? `${caps.entries.length} 条执行层条目` : caps.error })
  evidence.push({ key: 'shortcuts', path: SHORTCUTS_PATH, status: channels.ok ? 'ok' : 'missing', detail: channels.ok ? `${channels.channels.length} 条通道` : channels.error })
  evidence.push({ key: 'skillCatalog', path: SKILL_CATALOG_PATH, status: catalog.ok ? 'ok' : 'missing', detail: catalog.ok ? `${catalog.skills.length} 条技能登记` : catalog.error })
  evidence.push({ key: 'flowGraph', path: FLOW_GRAPH_PATH, status: flow.ok ? 'ok' : 'missing', detail: flow.ok ? `${flow.graph.steps.length} 道工序` : flow.error })
  evidence.push({ key: 'instanceSafety', path: INSTANCE_SAFETY_PATH, status: instanceSafety.ok ? 'ok' : 'missing', detail: instanceSafety.ok ? `${instanceSafety.table.skills.length} 条档位登记` : instanceSafety.error })
  evidence.push({ key: 'layerGraph', path: LAYER_GRAPH_PATH, status: layerGraph.ok ? 'ok' : 'missing', detail: layerGraph.ok ? `${layerGraph.graph.edges.length} 条依赖边` : layerGraph.error })
  evidence.push({ key: 'routerDoc', path: ROUTER_DOC_PATH, status: docText ? 'ok' : 'missing', detail: docText ? '可解析' : '磁盘上取不到该文档' })
  evidence.push({ key: 'physicalLock', path: PHYSICAL_LOCK_PATH, status: 'ok', detail: '模块已装载（evaluatePhysicalLock 可用）' })
  const ifaceStats = interfaceStats(root)
  evidence.push({
    key: 'interfaces',
    path: `${INTERFACES_DIR}/*.json`,
    status: 'ok',
    detail: ifaceStats.total
      ? `${ifaceStats.total} 份接口声明；parallel 取值 ${JSON.stringify(ifaceStats.parallelValues)} · sideEffects 为空 ${ifaceStats.emptySideEffects}/${ifaceStats.total} · dependencies 非空 ${ifaceStats.withDependencies}/${ifaceStats.total} → ${interfaceDiscriminates(ifaceStats) ? '可用于读写/依赖判别' : '读写与依赖均无判别力，只作为"已登记但不可判定"的说明'}`
      : '磁盘上无接口声明文件 → 本条不参与判定（路由层改用 instance-safety 与流程图的登记档位）',
  })

  const evidenceMissing = evidence.filter((e) => e.status !== 'ok')

  // ① 文档-实现一致性
  const sourceOf = (rel) => {
    const abs = path.join(root, rel)
    return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null
  }
  const docProblems = docText ? auditDocImpl(docText, sourceOf) : []
  const implText = renderPlanDocProbe
  const bannedFromSelf = printBannedWordGuard(implText(), SELF_PATH)
  for (const p of [...docProblems, ...bannedFromSelf]) problems.push(p)

  // ①b 门禁口径对拍
  const gate = auditGateContract()
  for (const p of gate.problems) problems.push(p)

  // ①c 判红能力自检
  const docSelfTest = selfTestDocImpl()
  for (const r of docSelfTest) {
    if (!r.pass) problems.push({ type: '①c-一致性检测器自检失败', a: r.name, b: r.detail, advice: '检测器判定能力被改坏，先修复检测器再谈自检通过。' })
  }

  // ② 死通道
  const channelResult = await auditChannels(root, channels.channels)
  for (const p of channelResult.problems) problems.push(p)

  // ③ 可达性覆盖率
  const reach = auditReachability({ root, caps, channels, catalog })
  for (const p of reach.problems) problems.push(p)
  if (args.minCoverage !== null && reach.coverage < args.minCoverage) {
    problems.push({
      type: '③-覆盖率低于阈值',
      a: `实测覆盖率 ${(reach.coverage * 100).toFixed(2)}%`,
      b: `阈值 ${(args.minCoverage * 100).toFixed(2)}%（--min-coverage 显式开启）`,
      advice: '为无触发词条目补登触发词，或下调阈值（下调须在报告里写明理由）。',
    })
  }

  // ④ 反向用例断言
  const lockState = await getLockState()
  const reversePlan = buildPlan({
    query: REVERSE_CASE, top: args.top, root, caps, channels, catalog, flow, instanceSafety, layerGraph, lockState,
  })
  const reverseProblems = []
  if (reversePlan.hit) reverseProblems.push({ type: '④-反向用例被误命中', a: REVERSE_CASE, b: `命中 ${reversePlan.items.length} 条条目：${reversePlan.items.map((i) => i.view.id).join(' · ')}`, advice: '匹配口径过宽，收紧到有真实证据的词元。' })
  for (const s of reversePlan.suggestions) {
    if (normalizePhrase(s.text) === normalizePhrase(REVERSE_CASE)) reverseProblems.push({ type: '④-近似建议回显关键词', a: s.text, b: '建议项等于关键词本身，等于伪造路线', advice: '建议必须是索引里真实存在的候选。' })
  }
  for (const line of renderPlan(reversePlan).split('\n')) {
    if (line.includes(REVERSE_CASE) && /调用命令|路径=`/.test(line)) {
      reverseProblems.push({ type: '④-未命中却输出路线字段', a: line.trim(), b: '未命中分支不得出现"调用命令/路径"字段', advice: '修正渲染分支。' })
    }
  }
  if (!reversePlan.hit && reversePlan.suggestions.length === 0) {
    reverseProblems.push({ type: '④-未命中但无近似建议', a: REVERSE_CASE, b: '无任何近似建议输出', advice: '未命中必须给近似建议（标注非命中）。' })
  }
  for (const p of reverseProblems) problems.push(p)

  // 输出文本禁用词守门
  const planSampleQueries = ['门禁看板', '反例层']
  for (const q of planSampleQueries) {
    const plan = buildPlan({ query: q, top: args.top, root, caps, channels, catalog, flow, instanceSafety, layerGraph, lockState })
    for (const p of printBannedWordGuard(renderPlan(plan), `plan(${q})`)) problems.push(p)
  }

  const result = {
    mode: 'check',
    root,
    generatedAt: new Date().toISOString(),
    exitCode: 0,
    evidence,
    evidenceMissing: evidenceMissing.map((e) => `${e.path}：${e.detail}`),
    checks: [
      { id: '①', name: '文档-实现一致性', pass: docProblems.length === 0, itemCount: docProblems.length },
      { id: '①b', name: '物理锁门禁口径对拍', pass: gate.problems.length === 0, probes: gate.checked, itemCount: gate.problems.length },
      { id: '①c', name: '一致性检测器判红能力自检', pass: docSelfTest.every((r) => r.pass), results: docSelfTest },
      { id: '②', name: '死通道', pass: channelResult.dead === 0, dead: channelResult.dead, itemCount: channelResult.problems.length },
      {
        id: '③',
        name: '可达性覆盖率',
        pass: reach.problems.length === 0 && (args.minCoverage === null || reach.coverage >= args.minCoverage),
        total: reach.total,
        withTrigger: reach.withTrigger,
        withoutTrigger: reach.withoutTrigger,
        coverage: reach.coverage,
        itemCount: reach.problems.length,
        gateMode: args.minCoverage === null ? '指标（未设阈值，默认不当硬门）' : `硬门（阈值 ${args.minCoverage}）`,
      },
      { id: '④', name: '反向用例', pass: reverseProblems.length === 0, probe: REVERSE_CASE, suggestions: reversePlan.suggestions, itemCount: reverseProblems.length },
    ],
    indicators: {
      reachability: {
        total: reach.total,
        withTrigger: reach.withTrigger,
        withoutTrigger: reach.withoutTrigger,
        coverage: reach.coverage,
        uncovered: reach.uncovered,
        coveredWithEvidence: reach.covered,
      },
    },
    problems,
  }

  // 自检文本自己也要干净：对渲染后的自检正文再跑一次禁用词守门
  for (const p of printBannedWordGuard(renderCheck(result), 'check-render')) result.problems.push(p)
  result.exitCode = evidenceMissing.length ? 2 : result.problems.length ? 1 : 0
  return result
}

function renderCheck(result) {
  const L = []
  const say = (s = '') => L.push(s)
  say('=== 路由层自检 · scripts/route_plan.mjs（REQ-089 / R5）===')
  say('')
  say('证据源盘点：')
  for (const e of result.evidence) say(`  ${e.status === 'ok' ? '✅' : '⛔'} ${e.path} —— ${e.detail}`)
  if (result.evidenceMissing.length) {
    say('')
    say('❌ 取不到证据（按铁律"没有可解析的证据 ≠ 通过"，退出码 2）：')
    for (const m of result.evidenceMissing) say(`  - ${m}`)
    return L.join('\n')
  }
  say('')
  for (const c of result.checks) {
    const icon = c.pass ? '✅' : '❌'
    if (c.id === '③') {
      say(`${icon} ③ 可达性覆盖率：有触发词 ${c.withTrigger} / 无触发词 ${c.withoutTrigger}（总计 ${c.total}，覆盖率 ${(c.coverage * 100).toFixed(2)}%）`)
      say(`     - 口径：${c.gateMode}；触发词来源 = 通道表触发词（${SHORTCUTS_PATH}）∪ 技能登记触发词（${SKILL_CATALOG_PATH}）`)
      const un = result.indicators.reachability.uncovered
      if (un.length) {
        say(`     - 无触发词条目（前端 ${Math.min(un.length, 20)} 条，全量见 --json）：${un.slice(0, 20).map((u) => u.id).join(' · ')}`)
      }
      continue
    }
    say(`${icon} ${c.id} ${c.name}${c.itemCount !== undefined ? `（问题 ${c.itemCount} 项${c.probes ? ` · 探针 ${c.probes} 格` : ''}${c.dead !== undefined ? ` · 死通道 ${c.dead} 条` : ''}）` : ''}`)
    if (c.id === '①c') for (const r of c.results) say(`     - ${r.pass ? '✅' : '❌'} ${r.name} → ${r.detail}`)
    if (c.id === '④') {
      say(`     - 探针关键词「${c.probe}」→ 未命中 ✔；近似建议 ${c.suggestions.length} 条（全部标注"非命中"）`)
      for (const s of c.suggestions) say(`       · 「${s.text}」（${s.kind}，相似度 ${s.similarity}）`)
    }
  }
  say('')
  if (result.problems.length) {
    say(`问题清单（${result.problems.length} 项）：`)
    for (const p of result.problems) {
      say(`  [${p.type}]`)
      say(`     A：${p.a}`)
      say(`     B：${p.b}`)
      say(`     应对：${p.advice}`)
    }
  }
  say('')
  say(`结论：${result.exitCode === 0 ? '✅ 全过' : result.exitCode === 1 ? '❌ 有问题' : '⛔ 取不到证据'} → 退出码 ${result.exitCode}`)
  return L.join('\n')
}

function renderPlanDocProbe() {
  return 'route_plan.mjs 输出样本：命中执行层条目 · 前置门禁 · 依赖与顺序 · 并行串行裁决 · 建议批次 · 失败回退命令 · 未登记项'
}

// ── 入口 ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(helpText())
    return 0
  }
  const root = path.resolve(args.root || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))

  const caps = loadCapabilities(root)
  const channels = loadChannels(root)

  if (!caps.ok || !channels.ok) {
    const missing = [caps.ok ? null : caps.error, channels.ok ? null : channels.error].filter(Boolean)
    if (args.json) {
      console.log(JSON.stringify({ mode: args.check ? 'check' : 'plan', root, exitCode: 2, evidenceMissing: missing }, null, 2))
    } else {
      console.log('⛔ 取不到核心证据，拒绝给出结论（铁律：没有可解析的证据 ≠ 通过）')
      for (const m of missing) console.log(`  - ${m}`)
    }
    return 2
  }

  const catalog = loadSkillCatalog(root)
  const flow = loadFlowGraph(root)
  const instanceSafety = loadInstanceSafety(root)
  const layerGraph = loadLayerGraph(root)
  const lockState = await getLockState()
  const docText = readTextIf(path.join(root, ROUTER_DOC_PATH))

  if (args.check) {
    const result = await runCheck(args, root, caps, channels, catalog, flow, instanceSafety, layerGraph, docText)
    if (args.json) console.log(JSON.stringify(result, null, 2))
    else console.log(renderCheck(result))
    return result.exitCode
  }

  const query = args.query
  if (!query) {
    if (args.json) console.log(JSON.stringify({ mode: 'plan', exitCode: 1, error: '缺少关键词' }, null, 2))
    else console.log('⚠️ 缺少关键词。用法：node scripts/route_plan.mjs "<意图或关键词>"（详见 --help）')
    return 1
  }

  const plan = buildPlan({ query, top: args.top, root, caps, channels, catalog, flow, instanceSafety, layerGraph, lockState })
  plan.gate.lockFile = fs.existsSync(getLockFilePath()) ? getLockFilePath() : (fs.existsSync(getLockFallbackPath()) ? getLockFallbackPath() : getLockFilePath())
  if (args.json) console.log(JSON.stringify(plan, null, 2))
  else console.log(renderPlan(plan))
  return plan.hit ? 0 : 1
}

// 退出码用 process.exitCode 而不是 process.exit()：
// 大 JSON（超过管道缓冲 64KB）时 process.exit() 会把尚未写完的 stdout 直接截断，
// 调用方拿到的是**残缺的非法 JSON**——机器可读产物宁可慢收尾，也不能静默少一半。
process.exitCode = await main()
