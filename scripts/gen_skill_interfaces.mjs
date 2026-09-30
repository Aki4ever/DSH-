#!/usr/bin/env node
/**
 * ==============================================================================
 * 技能层接口契约抽取器 (Skill Layer Interface Contract Extractor) —— REQ-089 / R4-b
 * ==============================================================================
 * 需求原文：「所有执行层都要像面向对象编程一样提供接口以及内部写好详细使用的方法，
 *           方便索引以及具体执行」。
 *
 * 实测病根（2026-10-01，见 knowledge/common/execution_layer_interface_spec.md §一）：
 *   178 个 `SKILL.md` 的 frontmatter 只有 `name/description/level/composition` 四个键，
 *   **没有入参、没有出参、没有调用方式、没有退出码**，
 *   于是 `check_layer_interfaces.mjs` 对技能层只能报「已声明接口 0 / 178」。
 *
 * 本脚本的唯一职责：**从 SKILL.md 正文里抽取**接口契约（能抽到就抽真的，抽不到写 `(待补)`），
 * 落盘为 `skills/<name>/interface.json`（位置约定见规范 §二：目录型单元 `<unit>/interface.json`）。
 *
 * 字段口径的唯一权威源：`knowledge/common/execution_layer_interface_spec.md` §三。
 *   必填：id / layer / path / invoke / summary / inputs / outputs / exitCodes / source
 *   本脚本**一律**写 `source: "extracted-from-header"` + `verified: false`
 *   —— 自动抽取的是**基线占位**，证明"有接口这一点"，不证明"接口内容准确"。
 *
 * 严禁编造：任何抽不到语义的字段一律写 `(待补)`，绝不猜测入参形态、绝不臆造退出码含义。
 *
 * 用法：
 *   node scripts/gen_skill_interfaces.mjs --check      # 只报不写（退出码 0=已齐备 / 1=有缺口 / 2=取不到证据）
 *   node scripts/gen_skill_interfaces.mjs --apply      # 写入 skills/<name>/interface.json（幂等）
 *   node scripts/gen_skill_interfaces.mjs --self-test  # 反向用例自证：桩件断言抽取器不编造
 *   node scripts/gen_skill_interfaces.mjs --check --json
 *
 * 退出码：0 已齐备 / 1 有缺口 / 2 取不到证据（**2 绝不算通过**，遵循工程铁律）
 * ==============================================================================
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SKILLS_DIR = join(ROOT, 'skills')
const INDEX_JSON = join(ROOT, 'indexes/capabilities_index.json')
const GENERATOR = 'gen_skill_interfaces.mjs'
const LAYER = '技能 (Skill)'
const PLACEHOLDER = '(待补)'
const MAX_SUMMARY = 120

const args = new Set(process.argv.slice(2))
const JSON_MODE = args.has('--json')

// ---------------------------------------------------------------------------
// 通用文本工具
// ---------------------------------------------------------------------------

const clean = (s = '') => String(s).replace(/\s+/g, ' ').trim()
const stripBt = (s = '') => clean(s).replace(/^`+/, '').replace(/`+$/, '').trim()
const truncate = (s, n = MAX_SUMMARY) => (s.length <= n ? s : s.slice(0, n - 1) + '…')
const uniquePush = (arr, item, key = 'name') => {
  if (!item || !item[key]) return
  if (arr.some((x) => x[key] === item[key])) return
  arr.push(item)
}
const exactPush = (arr, item) => {
  if (!item || !item.name) return
  const k = (o) => `${o.name}|${o.type}|${o.desc}`
  if (arr.some((x) => k(x) === k(item))) return
  arr.push(item)
}

/** 解析 YAML frontmatter（只认本池实际存在的四个键，不越界猜别的）。 */
export function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return { description: '', composition: [], level: '' }
  const body = m[1]
  const descM = body.match(/^description:[ \t]*(.*)$/m)
  const description = descM ? descM[1].trim().replace(/^["']|["']$/g, '') : ''
  const composition = []
  const compM = body.match(/^composition:[ \t]*\r?\n((?:[ \t]+-[ \t]*.+\r?\n?)*)/m)
  if (compM) {
    for (const line of compM[1].split('\n')) {
      const mm = line.match(/^[ \t]*-[ \t]*(.+?)[ \t]*$/)
      if (mm) composition.push(mm[1].replace(/["']/g, '').trim())
    }
  }
  const levelM = body.match(/^level:[ \t]*(.*)$/m)
  return { description, composition, level: levelM ? levelM[1].trim() : '' }
}

/** 按 `##` 切分章节（`###` 归入所属章节正文，不单独成节）。 */
export function sections(md) {
  const out = []
  let cur = null
  for (const line of md.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/)
    if (h) { cur = { title: h[1], body: [] }; out.push(cur); continue }
    if (cur) cur.body.push(line)
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }))
}

const findSection = (secs, re) => secs.find((s) => re.test(s.title)) || null

/** 抽取 fenced bash/sh/shell 代码块。 */
function bashBlocks(text) {
  const out = []
  const re = /```(?:bash|sh|shell)\r?\n([\s\S]*?)```/g
  let m
  while ((m = re.exec(text))) out.push(m[1])
  return out
}

/** 从用法示例里取真实命令行（续行已拼接，注释与空行剔除）。 */
export function commandLines(text) {
  const cmds = []
  for (const block of bashBlocks(text)) {
    const joined = block.replace(/\\\r?\n/g, ' ')
    for (const raw of joined.split('\n')) {
      const line = clean(raw)
      if (!line || line.startsWith('#')) continue
      cmds.push(line)
    }
  }
  return cmds
}

/**
 * 只保留**属于本技能**的命令行。
 * 实测病根：大量门禁/规约技能（`anti-pattern-policy`、`capability-naming-policy`…）
 * 自己的 `## Usage & Script` 里贴的是**下游技能**的调用，例如
 * `python3 skills/detect-forbidden-state/scripts/detect_forbidden.py --events …`。
 * 若照单全收，会把下游脚本的 `--events/--json/--all` 记成**本技能**的入参 —— 张冠李戴。
 * 判据：命令行里出现的 `skills/<别的技能>/` 一律不算本技能的接口。
 */
export function ownCommands(md, dirName) {
  return commandLines(md).filter((c) => {
    const refs = [...c.matchAll(/skills\/([a-z0-9-]+)\//g)].map((m) => m[1])
    return !refs.some((r) => r !== dirName)
  })
}

/** 扫命令行里的 `--flag`，并用"后面是否紧跟取值"判定它吃不吃参数（证据来自实跑例子，不靠猜）。 */
function flagsFromCommands(cmds) {
  const map = new Map()
  for (const cmd of cmds) {
    const toks = cmd.split(/\s+/)
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i]
      if (!/^--[a-z][a-z0-9-]*$/.test(t)) continue
      const next = toks[i + 1]
      const takesValue = !!next && !next.startsWith('-') && !/^[|&;()<>]$/.test(next)
      const e = map.get(t) || { takesValue: false, sample: cmd }
      if (takesValue) e.takesValue = true
      map.set(t, e)
    }
  }
  return map
}

/**
 * 扫描 Markdown 表格块，连同它上面最近的一行非空正文。
 * 为什么需要 prevLine：本池大量技能写的是
 *   `退出码：` 换行 `| 码 | 含义 |` —— 表头里根本没有「退出码」三个字，
 *   只看表头会把这张表误读成普通表，退出码口径就白白丢了。
 */
function scanTables(text) {
  const lines = text.split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    if (/^\s*\|/.test(lines[i])) {
      const start = i
      const block = []
      while (i < lines.length && /^\s*\|/.test(lines[i])) { block.push(lines[i]); i++ }
      if (block.length >= 2) {
        let prevLine = ''
        for (let k = start - 1; k >= 0; k--) {
          if (clean(lines[k])) { prevLine = clean(lines[k]); break }
        }
        out.push({ start, rows: block, header: cells(block[0]).map((c) => stripBt(c)), prevLine })
      }
    } else i++
  }
  return out
}

const separatorRow = (r) => /^\s*\|[\s:|-]+\|\s*$/.test(r)
/**
 * 切表格行。
 * 注意：**不在这里剥反引号**——剥了会把 desc 里的代码引用咬掉半边
 * （实测把 "默认 `/tmp/dsh-atomic-locks`" 咬成 "默认 `/tmp/dsh-atomic-locks"）。
 * 需要干净名字的调用点各自 stripBt。
 */
const cells = (row) => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => clean(c))

/** 这张表是不是「退出码表」：表头点名，或表上方那行写着「退出码：」。 */
const isExitTable = (t) =>
  t.header.some((c) => /退出码|状态码|^码$|exit\s*code|^exit$/i.test(c)) || /退出码|状态码|exit\s*code/i.test(t.prevLine)

/** 这张表是不是「输出字段表」：表头必须是字段/名称/键，避免把「实测输出」这类数据快照当产物。 */
const isFieldTable = (t) =>
  t.header.some((c) => /字段|名称|键名|^键$|field|key|property/i.test(c)) ||
  /(?:输出|返回)(?:字段|结构|契约)|字段[:：]|结构[:：]/i.test(t.prevLine)

// ---------------------------------------------------------------------------
// 字段抽取器
// ---------------------------------------------------------------------------

/** inputs：优先 `## Input Contract` 参数表，其次 `## Usage & Script` 里属于本技能的真实 `--flag`。 */
export function inputsFrom(md, secs, dirName) {
  const inputs = []

  // ① 闭集子命令（文档显式点名，如「校验 `action` 落在闭集 `{acquire, release, status, run}`」）
  const pos = positionalFromClosedSet(md)
  if (pos) uniquePush(inputs, pos)

  // ② `## Input Contract` 表格（仅当表头像参数/字段表，或表体出现 `--flag`）
  for (const sec of secs.filter((s) => /Input Contract|输入契约/i.test(s.title))) {
    for (const tbl of scanTables(sec.body)) {
      const body = tbl.rows.slice(1).filter((r) => !separatorRow(r))
      const hasFlag = body.some((r) => /--[a-z]/.test(r))
      const headerLooksParam = tbl.header.some((h) => /参数|字段|选项|名称|argument|option|field/i.test(h))
      if (!hasFlag && !headerLooksParam) continue
      for (const row of body) {
        const cs = cells(row)
        const name = stripBt(cs[0] || '')
        if (!name || name === '---') continue
        const isFlag = /^--/.test(name)
        const isField = /^[A-Za-z_][A-Za-z0-9_.]*$/.test(name)
        if (!isFlag && !isField) continue
        const desc = cs.length >= 3 ? cs[2] : cs.slice(1).join(' · ')
        const required = cs.slice(1).some((c) => /必填|必需|必须|必给/.test(c))
        uniquePush(inputs, { name, type: isFlag ? 'arg' : 'field', required, desc: desc || `${PLACEHOLDER}：表格未给口径` })
      }
    }
  }

  // ③ 用法示例里的 `--flag`（只认本技能自己的命令；表里没有的补上，desc 直接引原文示例，不加工）
  for (const [flag, e] of flagsFromCommands(ownCommands(md, dirName))) {
    if (inputs.some((i) => i.name === flag)) continue
    inputs.push({
      name: flag,
      type: e.takesValue ? 'arg' : 'flag',
      required: false,
      desc: `用法示例中出现：${truncate(e.sample, 90)}`,
    })
  }

  if (!inputs.length) {
    inputs.push({
      name: PLACEHOLDER,
      type: 'unknown',
      required: false,
      desc: '该技能文档未声明入参结构，需人工补齐',
    })
  }
  return inputs
}

/** 文档显式写出的闭集子命令（抽不到返回 null，绝不编一个）。 */
function positionalFromClosedSet(md) {
  const re1 = /`([a-z][a-z0-9_]*)`\s*(?:落在|取值|∈|属于)?\s*闭集\s*`?\{([^}]+)\}`?/i
  const re2 = /`([a-z][a-z0-9_]*)`\s*落在\s*`?\{([^}]+)\}`?/i
  const m = md.match(re1) || md.match(re2)
  if (!m) return null
  const values = m[2].split(/[,\s]+/).map((s) => stripBt(s)).filter(Boolean)
  if (values.length < 2) return null
  return {
    name: m[1],
    type: 'positional',
    required: true,
    values,
    desc: `文档声明的闭集取值（原文：${truncate(clean(m[0]), 80)}）`,
  }
}

/** outputs：只认 `Success Contract` / `Output Contract` 章节里写出来的产物声明。 */
export function outputsFrom(md, secs) {
  const out = []
  const scopes = []
  const sc = findSection(secs, /Success Contract/i)
  if (sc) scopes.push(sc.body)
  const oc = findSection(secs, /Output Contract|输出契约|输出字段/i)
  if (oc) scopes.push(oc.body)
  const body = scopes.join('\n')

  // ① 输出字段表（`| 字段 | 类型 | 含义 |` 这类表头；退出码表排除在外）
  for (const t of scanTables(body)) {
    if (isExitTable(t) || !isFieldTable(t)) continue
    for (const row of t.rows.slice(1)) {
      if (separatorRow(row)) continue
      const cs = cells(row)
      const name = stripBt(cs[0] || '')
      if (!name || name === '---') continue
      const hasType = cs.length >= 3
      const type = hasType ? cs[1] : 'field'
      const desc = (hasType ? cs.slice(2) : cs.slice(1)).join(' · ')
      exactPush(out, { name, type: type || 'field', desc: desc || `${PLACEHOLDER}：表格未给口径` })
    }
  }

  // ② 正文里点名的 stdout / 输出 / 产物
  for (const line of body.split('\n')) {
    const l = clean(line)
    if (!l) continue
    if (/JSON\s*契约|JSON\s*contract/i.test(l)) {
      exactPush(out, { name: 'stdout', type: 'json', desc: truncate(l.replace(/[；;]$/, ''), 160) })
    } else if (/stdout/i.test(l)) {
      exactPush(out, { name: 'stdout', type: /json/i.test(l) ? 'json' : 'text', desc: truncate(l.replace(/^[-*]\s*/, ''), 160) })
    } else if (/^[-*]\s*(?:`?stdout`?|输出|产物)/i.test(l)) {
      exactPush(out, { name: 'stdout', type: /json/i.test(l) ? 'json' : 'text', desc: truncate(l.replace(/^[-*]\s*/, ''), 160) })
    } else if (/^(?:输出|产物|结果)[^\n]{0,10}[:：]\s*$/.test(l)) {
      exactPush(out, { name: 'stdout', type: /json/i.test(l) ? 'json' : 'text', desc: `文档给出的输出结构（原文标题：${l}）` })
    }
  }

  // ③ 输出章节里的 ```json 代码块（文档亲手写下的输出结构，非推测）
  const re = /```json\r?\n([\s\S]*?)```/g
  let m
  while ((m = re.exec(body))) {
    const content = clean(m[1])
    if (content) exactPush(out, { name: 'stdout', type: 'json', desc: truncate(`文档给出的输出结构：${content}`, 160) })
  }

  if (!out.length) {
    out.push({ name: PLACEHOLDER, type: 'unknown', desc: '该技能文档未声明出参/产物结构，需人工补齐' })
  }
  return out
}

/** exitCodes：表头或表上方点名「退出码」的表格 + `- Exit Code N：…` 条目 + 正文里的成对口径。 */
export function exitCodesFrom(md) {
  const codes = {}
  const put = (k, v) => {
    const key = String(k)
    const val = truncate(clean(v).replace(/[；;。]$/, ''), 160)
    if (!val) return
    if (!(key in codes)) codes[key] = val
  }

  // ① 退出码表格（表头 `退出码/码/Exit Code`，或表上方那行写着「退出码：」）
  for (const t of scanTables(md)) {
    if (!isExitTable(t)) continue
    for (const row of t.rows.slice(1)) {
      if (separatorRow(row)) continue
      const cs = cells(row)
      const m = cs[0] && cs[0].match(/^`?(\d{1,3})`?$/)
      if (m && cs.length >= 2) put(m[1], cs.slice(1).filter(Boolean).join(' · '))
    }
  }

  // ② `- Exit Code 0：…` / `- 退出码 1：…`（含「恒为 0」这类写法）
  const bulRe = /^[\s>*]*[-*]\s*(?:Exit\s*Code|退出码|Exit|状态码)\s*(?:恒定为|恒为|恒定|恒|为|=)?\s*`?(\d{1,3})`?\s*[:：]\s*(.+)$/gim
  for (const m of md.matchAll(bulRe)) put(m[1], m[2])

  // ③ 正文成对口径：`退出码 0 成功 / 1 判定失败`
  const pairRe = /(?:退出码|Exit\s*Code)[^\n]{0,16}?[（(]?\s*(\d{1,3})\s+([^\s/）)、，,；;|]{1,12})\s*\/\s*(\d{1,3})\s+([^\s/）)、，,；;|]{1,12})/g
  for (const m of md.matchAll(pairRe)) { put(m[1], m[2]); put(m[3], m[4]) }

  // ④ 正文单行：`退出码 0：含义`
  const proseRe = /(?:退出码|Exit\s*Code|状态码)\s*(?:恒定为|恒为|恒定|恒|为|=|是)?\s*`?(\d{1,3})`?\s*[:：=]\s*([^\n；;。|]{2,120})/g
  for (const m of md.matchAll(proseRe)) put(m[1], m[2])

  if (!Object.keys(codes).length) codes[PLACEHOLDER] = '该技能未声明退出码口径'
  return codes
}

/**
 * parallel：**默认 exclusive（保守）**。
 * 只有文档给出**明确针对自身**的「只读/无写盘/可并发」原文证据才升格，证据原文一并落 `parallelEvidence`。
 *
 * 为什么口径收得这么紧（都是实测踩出来的）：
 *   ① `acquire-atomic-lock` 的「触发禁区：只读访问不加锁」会被宽松式 `只读.{0,6}访问` 误判 readonly，
 *      而它恰恰要写锁目录；
 *   ② `rename-execution-layer` / `retire-legacy-workspace` / `install-client-plugin` 的
 *      「干跑模式……**不写任何文件**」只描述 dry-run 分支，会被误判成整技能只读；
 *   ③ `atomic-lock-guard` 等 5 个技能的「后者证明『方案可并行』」说的是**别的技能**，
 *      会被 `可并行` 误判成自身并发安全。
 * 误判 readonly/shared 会让路由层把两个互斥写任务并发起来，代价远大于少抽一个升格证据。
 */
const QUALIFIED = /(干跑|dry-?run|--apply|--check 模式|模式下|唯一写入|除非|仅当|只在|仅限该模式)/

export function parallelFrom(md) {
  const READONLY = /(不写(?:入)?任何文件|不修改任何文件|不改动任何文件|不创建、不修改、不删除任何文件|不写文件|零写入|只读不写|只读检测|不产生任何副作用|无副作用|只写 ?stdout|本(?:技能|规约|脚本|工具|层)只读|不做任何写入|不写入任何业务文件|不写任何业务文件)/
  const SHARED = /(本(?:技能|规约|脚本|工具|层)可(?:以)?(?:并发|并行)|可安全并发|并发安全|允许并发执行|可并发执行|可并行运行)/
  const pick = (re) => {
    for (const raw of md.split('\n')) {
      const l = clean(raw.replace(/^[-*>#\s]+/, ''))
      if (!l || QUALIFIED.test(l)) continue
      const m = l.match(re)
      if (m) return truncate(l, 160)
    }
    return null
  }
  const sharedEv = pick(SHARED)
  if (sharedEv) return { parallel: 'shared', parallelEvidence: sharedEv }
  const roEv = pick(READONLY)
  if (roEv) return { parallel: 'readonly', parallelEvidence: roEv }
  return { parallel: 'exclusive', parallelEvidence: null }
}

/** sideEffects：只有文档显式写了副作用口径才落该字段，否则整个键省略（不宣称"无副作用"）。 */
export function sideEffectsFrom(md) {
  const out = []
  for (const raw of md.split('\n')) {
    const l = clean(raw.replace(/^[-*>#\s]+/, ''))
    if (!l) continue
    if (/(?:产生|有|无)(?:任何)?副作用|副作用[:：]/.test(l)) out.push(truncate(l, 160))
    if (out.length >= 3) break
  }
  return out
}

/**
 * 主抽取函数：给定技能目录名 + SKILL.md 全文，返回契约对象。
 * 纯函数（不碰磁盘），`--self-test` 直接拿桩件文本调它。
 */
export function extractContract(dirName, md) {
  const fm = parseFrontmatter(md)
  const secs = sections(md)
  const inputs = inputsFrom(md, secs, dirName)
  const outputs = outputsFrom(md, secs)
  const exitCodes = exitCodesFrom(md)
  const { parallel, parallelEvidence } = parallelFrom(md)
  const sideEffects = sideEffectsFrom(md)

  const summary = fm.description
    ? truncate(clean(fm.description), MAX_SUMMARY)
    : `${PLACEHOLDER}：frontmatter 无 description，需人工补齐`

  const obj = {
    id: `skill.pool.${dirName}`,
    layer: LAYER,
    path: `skills/${dirName}`,
    invoke: `skill ${dirName}`,
    summary,
    inputs,
    outputs,
    exitCodes,
    dependencies: fm.composition.map((c) => `skill.pool.${c}`),
    parallel,
    examples: ownCommands(md, dirName).slice(0, 5),
    source: 'extracted-from-header',
    verified: false,
    generator: GENERATOR,
  }
  if (sideEffects.length) obj.sideEffects = sideEffects
  if (parallelEvidence) obj.parallelEvidence = parallelEvidence
  return obj
}

/** 占位统计：哪些字段是「抽不到」而不是「抽到了」。 */
export function statsOf(contract) {
  const isPh = (arr) => !Array.isArray(arr) || (arr.length === 1 && arr[0].name === PLACEHOLDER)
  return {
    inputs: !isPh(contract.inputs),
    outputs: !isPh(contract.outputs),
    exitCodes: !(PLACEHOLDER in contract.exitCodes),
    summary: !String(contract.summary).startsWith(PLACEHOLDER),
    dependencies: Array.isArray(contract.dependencies) && contract.dependencies.length > 0,
    examples: Array.isArray(contract.examples) && contract.examples.length > 0,
  }
}

// ---------------------------------------------------------------------------
// 磁盘视图
// ---------------------------------------------------------------------------

function loadIndex() {
  if (!existsSync(INDEX_JSON)) return null
  try {
    const j = JSON.parse(readFileSync(INDEX_JSON, 'utf8'))
    if (!Array.isArray(j.entries)) return null
    return j
  } catch { return null }
}

function collectSkills() {
  if (!existsSync(SKILLS_DIR)) return { error: `技能目录不存在：${SKILLS_DIR}` }
  const idx = loadIndex()
  if (!idx) return { error: '机读索引缺失或不可解析：indexes/capabilities_index.json（先跑 node scripts/build_capabilities_index.mjs --apply）' }

  const byPath = new Map()
  for (const e of idx.entries) if (String(e.layer).includes('Skill')) byPath.set(e.path, e)

  const rows = []
  const skipped = []
  for (const d of readdirSync(SKILLS_DIR).sort()) {
    const abs = join(SKILLS_DIR, d)
    try { if (!existsSync(join(abs, 'SKILL.md'))) continue } catch { continue }
    const rel = `skills/${d}`
    const entry = byPath.get(rel)
    if (!entry) { skipped.push({ dir: d, why: '不在 capabilities_index.json 的技能层条目里（模板/未登记）' }); continue }
    rows.push({ dir: d, rel, entry, mdPath: join(abs, 'SKILL.md'), contractPath: join(abs, 'interface.json') })
  }
  return { rows, skipped, error: null }
}

// ---------------------------------------------------------------------------
// 子命令
// ---------------------------------------------------------------------------

function cmdCheck() {
  const view = collectSkills()
  if (view.error) {
    console.error(`⛔ 取不到证据：${view.error}`)
    process.exit(2)
  }
  const { rows, skipped } = view
  if (!rows.length) {
    console.error('⛔ 取不到证据：skills/ 下没有任何已登记技能')
    process.exit(2)
  }

  const agg = { inputs: 0, outputs: 0, exitCodes: 0, summary: 0, dependencies: 0, examples: 0 }
  const par = { readonly: 0, shared: 0, exclusive: 0 }
  let existing = 0
  let stale = 0
  let foreign = 0
  const missingList = []
  const staleList = []
  const phList = []
  let phSkills = 0
  let phOutputsWithScript = 0

  for (const r of rows) {
    const md = readFileSync(r.mdPath, 'utf8')
    const c = extractContract(r.dir, md)
    const s = statsOf(c)
    for (const k of Object.keys(agg)) if (s[k]) agg[k]++
    par[c.parallel]++
    const missing = ['inputs', 'outputs', 'exitCodes', 'summary'].filter((k) => !s[k])
    if (missing.length) { phSkills++; phList.push(`${r.dir}（${missing.join('/')}）`) }
    if (!s.outputs && s.examples) phOutputsWithScript++
    const expected = JSON.stringify(c, null, 2) + '\n'
    if (existsSync(r.contractPath)) {
      existing++
      const cur = readFileSync(r.contractPath, 'utf8')
      let parsed = null
      try { parsed = JSON.parse(cur) } catch { parsed = null }
      if (!parsed || parsed.generator !== GENERATOR) foreign++
      else if (cur !== expected) { stale++; staleList.push(r.dir) }
    } else {
      missingList.push(r.dir)
    }
  }

  const n = rows.length
  const pct = (x) => `${((x / n) * 100).toFixed(1)}%`
  const ph = (k) => n - agg[k]
  const totalPh = (n - agg.inputs) + (n - agg.outputs) + (n - agg.exitCodes) + (n - agg.summary)
  const missingContracts = n - existing

  if (JSON_MODE) {
    console.log(JSON.stringify({
      skills: n,
      existing, missingContracts, stale, foreign,
      extracted: agg, placeholders: { inputs: ph('inputs'), outputs: ph('outputs'), exitCodes: ph('exitCodes'), summary: ph('summary') },
      totalPlaceholders: totalPh,
      parallel: par,
      skipped,
      skillsWithPlaceholders: phSkills,
      outputsPlaceholderButHasScript: phOutputsWithScript,
      missingContracts: missingList,
      contentDrift: staleList,
      placeholderSkills: phList,
    }, null, 2))
  } else {
    console.log('🔎 技能层接口契约抽取判定（只报不写）')
    console.log('-----------------------------------------')
    console.log(`技能总数：${n}（来自 indexes/capabilities_index.json 的技能层条目）`)
    console.log(`已存在契约：${existing} / ${n}（${pct(existing)}）· 缺契约 ${missingContracts}`)
    console.log(`既有契约来源：本工具生成且内容一致 ${existing - stale - foreign} / 本工具生成但内容漂移 ${stale} / 非本工具生成(跳过不覆盖) ${foreign}`)
    console.log('字段抽取成功数（抽到真值，非占位）：')
    console.log(`  inputs    ：${agg.inputs} / ${n}（${pct(agg.inputs)}）· 待补 ${ph('inputs')}`)
    console.log(`  outputs   ：${agg.outputs} / ${n}（${pct(agg.outputs)}）· 待补 ${ph('outputs')}`)
    console.log(`   └ 其中 ${phOutputsWithScript} 个技能**有真实命令行却完全没有 outputs 声明**（是文档缺出参口径，不是抽取失败）`)
    console.log(`  exitCodes ：${agg.exitCodes} / ${n}（${pct(agg.exitCodes)}）· 待补 ${ph('exitCodes')}`)
    console.log(`  summary   ：${agg.summary} / ${n}（${pct(agg.summary)}）`)
    console.log(`  dependencies(composition)：${agg.dependencies} / ${n}（${pct(agg.dependencies)}）`)
    console.log(`  examples(真实命令行)：${agg.examples} / ${n}（${pct(agg.examples)}）`)
    console.log(`parallel 证据：readonly ${par.readonly} / shared ${par.shared} / exclusive(默认保守) ${par.exclusive}`)
    console.log(`待补字段总数：${totalPh} 处（inputs+outputs+exitCodes+summary 四类）· 涉及技能 ${phSkills} / ${n}`)
    if (skipped.length) console.log(`跳过目录：${skipped.map((s) => `${s.dir}（${s.why}）`).join('；')}`)
    console.log('-----------------------------------------')
    const ok = missingContracts === 0 && stale === 0 && totalPh === 0 && foreign === 0
    if (ok) console.log('✅ 已齐备：每个技能都有契约，且四类字段全部抽到真值')
    else {
      console.log(`⛔ 有缺口：缺契约 ${missingContracts} · 内容漂移 ${stale} · 非本工具生成 ${foreign} · 待补字段 ${totalPh}`)
      console.log('   （待补是**如实标记**，不是失败；但它意味着这些字段必须人工补齐后才能升 verified:true）')
      if (missingList.length) console.log(`   缺契约技能（前 10）：${missingList.slice(0, 10).join('、')}${missingList.length > 10 ? ` …共 ${missingList.length}` : ''}`)
      if (staleList.length) console.log(`   内容漂移（需重跑 --apply）（前 10）：${staleList.slice(0, 10).join('、')}${staleList.length > 10 ? ` …共 ${staleList.length}` : ''}`)
      if (phList.length) console.log(`   带待补字段的技能（前 10）：${phList.slice(0, 10).join('、')}${phList.length > 10 ? ` …共 ${phList.length}` : ''}`)
    }
  }
  process.exit(missingContracts === 0 && stale === 0 && totalPh === 0 && foreign === 0 ? 0 : 1)
}

function cmdApply() {
  const view = collectSkills()
  if (view.error) {
    console.error(`⛔ 取不到证据：${view.error}`)
    process.exit(2)
  }
  const { rows, skipped } = view
  let created = 0, updated = 0, unchanged = 0, foreign = 0
  let phSkills = 0, phFields = 0

  for (const r of rows) {
    const md = readFileSync(r.mdPath, 'utf8')
    const c = extractContract(r.dir, md)
    const s = statsOf(c)
    const ph = ['inputs', 'outputs', 'exitCodes', 'summary'].filter((k) => !s[k])
    if (ph.length) { phSkills++; phFields += ph.length }
    const content = JSON.stringify(c, null, 2) + '\n'
    if (existsSync(r.contractPath)) {
      const cur = readFileSync(r.contractPath, 'utf8')
      let parsed = null
      try { parsed = JSON.parse(cur) } catch { parsed = null }
      if (!parsed || parsed.generator !== GENERATOR) { foreign++; continue } // 人工/他人契约，绝不覆盖
      if (cur === content) { unchanged++; continue }
      writeFileSync(r.contractPath, content, 'utf8')
      updated++
    } else {
      writeFileSync(r.contractPath, content, 'utf8')
      created++
    }
  }

  console.log('🛠 写入技能层接口契约（skills/<name>/interface.json）')
  console.log('-----------------------------------------')
  console.log(`  技能总数：${rows.length}`)
  console.log(`  新增：${created}`)
  console.log(`  更新（本工具生成、内容有变）：${updated}`)
  console.log(`  未变化（幂等命中）：${unchanged}`)
  console.log(`  跳过（非本工具生成，绝不覆盖）：${foreign}`)
  console.log(`  带 (待补) 标记的契约：${phSkills} 个技能 / ${phFields} 处字段`)
  if (skipped.length) console.log(`  跳过目录：${skipped.map((s) => s.dir).join('、')}`)
  console.log('-----------------------------------------')
  console.log('⚠️ 全部契约 source=extracted-from-header / verified=false —— 它们是**基线占位**，')
  console.log('   证明"有接口这一点"，不证明"接口内容准确"；抽查核对后才允许升 verified:true。')
  process.exit(0)
}

// ---------------------------------------------------------------------------
// 反向用例自证：抽取器不编造
// ---------------------------------------------------------------------------

const STUB_EMPTY = `---
name: stub-empty
level: L1
description: 桩件：这份技能文档完全没有 Usage 段、没有 Input Contract 段、也没有任何退出码口径表述，唯一的用途是证明抽取器在无证据时只会写待补标记而不是空数组或者自己编一个像模像样的入口参数出来。
---

# Stub Empty

## Overview

本规约只出判据，不做检测。

## Boundaries & Constraints

- 不做任何检测，也不改名。
`

const STUB_RICH = `---
name: stub-rich
level: L2
composition:
  - atomic-lock-policy
description: 桩件：结构完整的技能。
---

# Stub Rich

## Overview

它只做三件事：

1. **\`apply\`**：落盘；
2. **\`check\`**：只报不写；
3. **\`status\`**：看状态。

## Input Contract

| 参数 | 适用 action | 口径 |
| :--- | :--- | :--- |
| \`--target\` | \`apply\` | 目标路径，必填 |
| \`--dry-run\` | 全部 | 干跑不落盘 |

## Usage & Script

\`\`\`bash
node scripts/stub.mjs apply --target docs/x.md
node scripts/stub.mjs status --json
\`\`\`

## Success Contract

| 退出码 | 含义 |
| :--- | :--- |
| 0 | 全部通过 |
| 1 | 存在违规 |
| 2 | 输入不可读 |

JSON 契约：\`{"ok":bool,"checked":int}\`
`

const STUB_FOREIGN = `---
name: stub-foreign
level: L3
description: 桩件：自己的用法段里贴的全是下游技能的调用。
---

# Stub Foreign

## Overview

本门禁串联下游检测器。

## Usage & Script

\`\`\`bash
python3 skills/detect-forbidden-state/scripts/detect_forbidden.py --events /tmp/e.jsonl --json
python3 skills/other-skill/scripts/other.py --all --limit 10
\`\`\`

## Boundaries & Constraints

- 本技能不写任何文件。
`

function cmdSelfTest() {
  let pass = 0
  const fails = []
  const t = (name, cond) => { if (cond) pass++; else fails.push(name) }

  // ---- 桩件 A：完全没有 Usage / ExitCode 段 → 必须产出 (待补)，且不得编造 ----
  const a = extractContract('stub-empty', STUB_EMPTY)
  t('A.id 形态正确', a.id === 'skill.pool.stub-empty')
  t('A.layer 固定', a.layer === LAYER)
  t('A.path 正确', a.path === 'skills/stub-empty')
  t('A.invoke 为宿主调用命令', a.invoke === 'skill stub-empty')
  t('A.source 标为自动抽取', a.source === 'extracted-from-header')
  t('A.verified 必须为 false', a.verified === false)
  t('A.summary 截断到 ≤120 字', a.summary.length <= MAX_SUMMARY && a.summary.length > 0)
  t('A.inputs 是数组', Array.isArray(a.inputs))
  t('A.inputs 非空数组（不许留空）', a.inputs.length === 1)
  t('A.inputs 打 (待补) 标记', a.inputs[0] && a.inputs[0].name === PLACEHOLDER)
  t('A.inputs 未编造参数类型', a.inputs[0] && a.inputs[0].type === 'unknown')
  t('A.outputs 是数组且打 (待补)', Array.isArray(a.outputs) && a.outputs.length === 1 && a.outputs[0].name === PLACEHOLDER)
  t('A.exitCodes 是对象且打 (待补)', a.exitCodes && typeof a.exitCodes === 'object' && !Array.isArray(a.exitCodes) && PLACEHOLDER in a.exitCodes)
  t('A.exitCodes 未编造数字退出码', !Object.keys(a.exitCodes).some((k) => /^\d+$/.test(k)))
  t('A.exitCodes 非空对象（判定器会判违规）', Object.keys(a.exitCodes).length > 0)
  t('A.dependencies 无可组合边则为空数组', Array.isArray(a.dependencies) && a.dependencies.length === 0)
  t('A.parallel 无证据时保守取 exclusive', a.parallel === 'exclusive')
  t('A 无 parallelEvidence 时不落该键', !('parallelEvidence' in a))
  t('A 必填字段齐备', ['id', 'layer', 'path', 'invoke', 'summary', 'inputs', 'outputs', 'exitCodes', 'source'].every((k) => k in a))

  // ---- 桩件 B：结构完整 → 必须抽到真值 ----
  const b = extractContract('stub-rich', STUB_RICH)
  const names = b.inputs.map((i) => i.name)
  t('B.inputs 抽到 --target', names.includes('--target'))
  t('B.inputs 抽到 --dry-run', names.includes('--dry-run'))
  t('B.inputs 未出现 (待补)', !names.includes(PLACEHOLDER))
  t('B.--target 必填被判出', (b.inputs.find((i) => i.name === '--target') || {}).required === true)
  t('B.--dry-run 非常规必填', (b.inputs.find((i) => i.name === '--dry-run') || {}).required === false)
  t('B.exitCodes 抽到 0/1/2', ['0', '1', '2'].every((k) => k in b.exitCodes))
  t('B.exitCodes 含义为原文', b.exitCodes['0'] === '全部通过' && b.exitCodes['1'] === '存在违规' && b.exitCodes['2'] === '输入不可读')
  t('B.exitCodes 无 (待补)', !(PLACEHOLDER in b.exitCodes))
  t('B.outputs 抽到 JSON 产物', b.outputs.some((o) => o.type === 'json') && !b.outputs.some((o) => o.name === PLACEHOLDER))
  t('B.dependencies 由 composition 派生', JSON.stringify(b.dependencies) === JSON.stringify(['skill.pool.atomic-lock-policy']))
  t('B.examples 抽到真实命令行', b.examples.length >= 2 && b.examples.every((e) => e.includes('scripts/stub.mjs')))
  t('B.summary 取 frontmatter description', b.summary === '桩件：结构完整的技能。')
  t('B.source/verified 仍是基线占位', b.source === 'extracted-from-header' && b.verified === false)

  // ---- 桩件 C：用法段全是**下游技能**的命令 → 绝不允许张冠李戴 ----
  const cForeign = extractContract('stub-foreign', STUB_FOREIGN)
  const fNames = cForeign.inputs.map((i) => i.name)
  t('C. 不把下游技能的 --events/--json/--all/--limit 记成本技能入参', !fNames.some((n) => ['--events', '--json', '--all', '--limit'].includes(n)))
  t('C. 无自有命令时 inputs 落 (待补)', fNames.length === 1 && fNames[0] === PLACEHOLDER)
  t('C. examples 不得混入下游技能命令', cForeign.examples.every((e) => !e.includes('skills/detect-forbidden-state/')))
  t('C. 自身「不写任何文件」仍判 readonly', cForeign.parallel === 'readonly')

  // ---- 反向断言：真实池子里抽出来的契约形状必须能被判定器接受 ----
  const view = collectSkills()
  if (view.rows) {
    const sample = view.rows.slice(0, 20).map((r) => extractContract(r.dir, readFileSync(r.mdPath, 'utf8')))
    t('真实样本 20 份：inputs/outputs 恒为数组', sample.every((c) => Array.isArray(c.inputs) && Array.isArray(c.outputs)))
    t('真实样本 20 份：exitCodes 恒为非空对象', sample.every((c) => c.exitCodes && typeof c.exitCodes === 'object' && !Array.isArray(c.exitCodes) && Object.keys(c.exitCodes).length > 0))
    t('真实样本 20 份：summary 恒 ≤120 字', sample.every((c) => c.summary.length <= MAX_SUMMARY))
    t('真实样本 20 份：必填字段无缺失', sample.every((c) => ['id', 'layer', 'path', 'invoke', 'summary', 'inputs', 'outputs', 'exitCodes', 'source'].every((k) => k in c)))
  }

  const total = pass + fails.length
  if (fails.length === 0) {
    console.log(`✅ ${total}/${total} 通过`)
    console.log('   桩件 A（无 Usage/ExitCode 段）：产出 (待补) 标记，未编造入参、未编造数字退出码。')
    console.log('   桩件 B（结构完整）：抽到 --target/--dry-run、退出码 0/1/2 原文含义、JSON 产物、composition 依赖。')
    process.exit(0)
  }
  console.log(`⛔ ${pass}/${total} 通过（失败 ${fails.length} 项）`)
  for (const f of fails) console.log(`   ✗ ${f}`)
  process.exit(1)
}

// ---------------------------------------------------------------------------

function main() {
  if (args.has('--self-test')) return cmdSelfTest()
  if (args.has('--apply')) return cmdApply()
  if (args.has('--check')) return cmdCheck()
  console.log(`技能层接口契约抽取器（REQ-089 R4-b）

用法：
  node scripts/gen_skill_interfaces.mjs --check      # 只报不写：技能总数/已存在契约数/各字段抽取成功数/待补数
  node scripts/gen_skill_interfaces.mjs --apply      # 写入 skills/<name>/interface.json（幂等；非本工具生成的不覆盖）
  node scripts/gen_skill_interfaces.mjs --self-test  # 反向用例自证：无证据桩件必须产出 (待补) 而不是编造
  node scripts/gen_skill_interfaces.mjs --check --json

退出码：0=已齐备 / 1=有缺口（缺契约、内容漂移、或仍有 (待补) 字段）/ 2=取不到证据

字段口径唯一权威源：knowledge/common/execution_layer_interface_spec.md §三
落盘位置约定：目录型单元 <unit>/interface.json（同规范 §二），与 scripts/check_layer_interfaces.mjs 一致。`)
}

// 直接运行时才进 main；被 import 时只导出纯函数（供自检/其它工具复用，不产生副作用）。
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
