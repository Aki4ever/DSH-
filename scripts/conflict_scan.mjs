#!/usr/bin/env node
/**
 * ==============================================================================
 * 冲突检测器 (Conflict Detector) —— 管控机制 · 双检之一
 * ==============================================================================
 * 定位：冗余检测器负责"同一内容写了两遍"，本检测器负责"同一事实说了两样"。
 *       两者是管控机制里互补的两把尺子：
 *         冗余 → 合并为迭代版本（保留单一权威源）
 *         冲突 → 先出裁决方案，再由用户确认后迭代（禁止自行取舍）
 *
 * 五类冲突判定：
 *   C1 版本冲突   文档头部版本号与台账总版本号不一致
 *   C2 计数冲突   标题自称的条款数/步数（支持中文数字）与实际条目数不一致
 *   C3 指标冲突   文档中引用的检测/自检项数互相矛盾
 *   C4 标识冲突   同一需求编号在不同文件对应不同标题
 *   C5 死链冲突   相对链接指向不存在的文件
 *
 * 输出：冲突清单 JSON + 人类可读报告
 * 用法：
 *   node scripts/conflict_scan.mjs --root <项目根> [--json] [--dirs a,b,c] [--top N]
 *   node scripts/conflict_scan.mjs --self-test
 * ==============================================================================
 */

import { readFile, readdir, stat, access } from 'node:fs/promises'
import { join, relative, dirname, resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ── 参数解析 ─────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { root: process.cwd(), json: false, top: 40, dirs: null, selfTest: false }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--root') out.root = argv[++i]
    else if (a === '--json') out.json = true
    else if (a === '--top') out.top = Number(argv[++i]) || 40
    else if (a === '--dirs') out.dirs = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean)
    else if (a === '--self-test') out.selfTest = true
  }
  return out
}

// ── 通用小工具 ───────────────────────────────────────────────────────────────

/** 中文数字 → 阿拉伯数字（覆盖 1~99 的常用写法），识别失败返回 null */
export function cnToNumber(text) {
  if (text == null) return null
  const s = String(text).trim()
  if (/^\d+$/.test(s)) return Number(s)
  const digits = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
  if (!/^[零一二两三四五六七八九十百]+$/.test(s)) return null
  let total = 0
  let section = 0
  let number = 0
  for (const ch of s) {
    if (ch === '百') { section += (number || 1) * 100; number = 0 }
    else if (ch === '十') { section += (number || 1) * 10; number = 0 }
    else { number = digits[ch] ?? 0 }
  }
  total = section + number
  return total > 0 ? total : (s === '零' ? 0 : null)
}

/** 从"全局元规则十七法典""自检六步法"中抽取自称数量 */
export function declaredCount(title) {
  const m = String(title).match(/([零一二两三四五六七八九十百\d]+)\s*(法典|步法|步流水线|步循环|步思考|条|步|项|层)/)
  if (!m) return null
  const n = cnToNumber(m[1])
  return n == null ? null : { value: n, unit: m[2] }
}

/** 从文本抽出文档头部声明的版本文档号（只认"当前文档/模板/台账版本"这类主体声明，不取基线或治理规范行） */
export function headerVersion(text) {
  const m = String(text).match(/\*\*当前(?:文档|模板|台账)版本\*\*[^\n]*?`v?(\d+\.\d+\.\d+)`/)
  return m ? m[1] : null
}

/** 抽取"当前系统实施总版本" */
export function ledgerVersion(text) {
  const m = String(text).match(/当前系统实施总版本[^\n]*?`v?(\d+\.\d+\.\d+)`/)
  return m ? m[1] : null
}

/**
 * 统计 Markdown 中每个标题下的"实际条目数"。
 * 定义：条目 = 编号型并列标题（第X条 / 第X步 / 第一步：…），或列表项（- / * / 数字.），
 *       或表格数据行（不含表头分隔行）。
 * 为什么按"条目形态"而不是"自称数字"：标题里的"六步"可能只是叙述词（例如"走六步循环"），
 * 只有真正并列展开成条目时，才存在"自称数量 vs 实际条目"可比对的冲突。
 */
export function countItemsUnderHeadings(markdown) {
  const lines = String(markdown).split(/\r?\n/)
  const out = []
  let current = null
  const flush = () => { if (current) out.push(current) }
  for (const line of lines) {
    const h = line.match(/^(#{2,4})\s+(.*)$/)
    if (h) {
      flush()
      current = { level: h[1].length, title: h[2].trim(), items: 0, childHeadings: 0 }
      continue
    }
    if (!current) continue
    const t = line.trim()
    if (t === '') continue
    if (/^#{5,6}\s/.test(t)) { current.items++; continue }         // 五/六级标题也算条目
    if (/^(第\s*[零一二两三四五六七八九十百\d]+\s*(条|步)|第[零一二两三四五六七八九十百\d]+步)/.test(t)) { current.items++; continue }
    if (/^([-*+]|\d+\.)\s+/.test(t)) { current.items++; continue } // 列表项
    if (/^\|/.test(t) && !/^\|[\s:|-]+\|$/.test(t)) { current.items++; continue } // 表格数据行
    if (/^\*\*第[零一二两三四五六七八九十百\d]+(条|步)/.test(t)) { current.items++; continue }
  }
  flush()
  return out
}

/** 去掉 Markdown 装饰，便于比较标题文字 */
export function plainTitle(s) {
  return String(s)
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/[（(].*?[)）]/g, '')
    .replace(/\s+/g, '')
    .trim()
}

/** 收集 Markdown 文件 */
async function collectMarkdown(dir) {
  const out = []
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...await collectMarkdown(full))
    else if (extname(e.name) === '.md') out.push(full)
  }
  return out
}

// ── 五类判定（纯函数，便于自检）──────────────────────────────────────────────

/** C1 版本冲突 */
export function checkVersion(file, docVersion, ledger) {
  if (!docVersion || !ledger) return null
  if (docVersion === ledger) return null
  return {
    type: 'C1-版本冲突',
    level: 'high',
    subject: '文档版本号',
    a: { file, value: `v${docVersion}` },
    b: { file: 'docs/requirements.md', value: `v${ledger}` },
    advice: `按版本治理规范，受管文档头部版本应与台账总版本一致；若该文档本次确有实质修改，将其升版至 v${ledger}，否则同步实施版本号。`,
  }
}

/**
 * C2 计数口径白名单。
 * 为什么需要白名单：正文里"六步闭环""三步走"这类表述是叙述性引用，
 * 并非"标题自称的数量"，全量校验会产生大量假阳性，令门禁失去公信力。
 * 因此只校验真正承担"计数真相源"职责的口径，需要新增时在此登记。
 */
export const COUNT_RULES = [
  { id: '元规则法典数', pattern: /元规则.*法典/, unit: '条' },
  { id: '安全红线数', pattern: /不可违背的红线|安全红线/, unit: '条' },
  { id: '流水线步数', pattern: /(流水线|工序|流程).{0,6}(步|道)/, unit: '步' },
  { id: '自检步骤数', pattern: /自检.{0,4}步法|开箱自检/, unit: '步' },
  { id: '工作循环步数', pattern: /(循环|工作流|变更流程)/, unit: '步' },
]

/** C2 计数冲突：标题自称数量 vs 该标题下实际条目数（仅校验白名单口径） */
export function checkCount(file, title, actualItems, rules = COUNT_RULES) {
  const rule = rules.find((r) => r.pattern.test(title))
  if (!rule) return null
  const dc = declaredCount(title)
  if (!dc) return null
  if (actualItems < 2) return null       // 条目结构尚未成形，无从校验
  if (dc.value === actualItems) return null
  if (Math.abs(dc.value - actualItems) <= 1) return null // 容许差 1（导语行导致的偏移）
  return {
    type: 'C2-计数冲突',
    level: 'high',
    subject: `${rule.id}（${rule.unit}）`,
    a: { file, value: `${title} → 自称 ${dc.value}${dc.unit}` },
    b: { file, value: `实际列出 ${actualItems} ${rule.unit}` },
    advice: '以磁盘上的实际条目为准，修正标题中的数量表述；不得反过来删条目去迁就标题。',
  }
}

/** C3 指标冲突：同一指标名被写成不同数字 */
export function checkMetric(subject, claims) {
  const values = [...new Set(claims.map((c) => c.value))]
  if (values.length <= 1) return null
  return {
    type: 'C3-指标冲突',
    level: 'medium',
    subject,
    a: claims[0],
    b: claims[1],
    advice: '先实跑该指标得到真值，再将所有引用处统一为真值；禁止只改声明不跑实测。',
  }
}

/** C4 标识冲突：同一需求编号对应不同标题 */
export function checkIdTitles(id, entries) {
  const groups = new Map()
  for (const e of entries) {
    const key = plainTitle(e.title)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(e)
  }
  if (groups.size <= 1) return null
  const list = [...groups.values()].map((g) => ({ file: g[0].file, value: g[0].title }))
  return {
    type: 'C4-标识冲突',
    level: 'high',
    subject: `${id} 标题不一致`,
    a: list[0],
    b: list[1],
    advice: '同一需求编号必须指向同一标题：以台账中的条目为准，其余文件改为引用台账编号而不复述标题。',
  }
}

/** 剥离代码围栏与行内代码，避免示例文本里的方括号被当成真链接 */
export function stripCode(text) {
  return String(text)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
}

/** C5 死链冲突：相对链接指向不存在的文件 */
export function checkLinks(file, text, existsFn) {
  const out = []
  const re = /\[[^\]]*\]\(([^)]+)\)/g
  let m
  while ((m = re.exec(stripCode(text)))) {
    let target = m[1].trim()
    if (/^(https?:|mailto:|#)/.test(target)) continue
    target = target.split('#')[0].trim()
    if (!target) continue
    let abs
    if (target.startsWith('/')) abs = target
    else abs = resolve(dirname(file), target)
    if (!existsFn(abs)) {
      out.push({
        type: 'C5-死链冲突',
        level: 'medium',
        subject: '相对链接失效',
        a: { file, value: `链接指向 ${target}` },
        b: { file, value: '目标文件不存在' },
        advice: '修正链接指向真实存在的文件；若目标已迁移，改为新路径并同步索引。',
      })
    }
  }
  return out
}

// ── 主扫描 ───────────────────────────────────────────────────────────────────
async function scan({ root, dirs }) {
  const ledgerPath = join(root, 'docs/requirements.md')
  let ledgerText = ''
  try { ledgerText = await readFile(ledgerPath, 'utf8') } catch { /* 台账缺失 */ }
  const ledger = ledgerVersion(ledgerText)

  const scanDirs = dirs && dirs.length ? dirs : ['rules', 'knowledge', 'indexes', 'docs', 'templates', 'memory']
  const files = []
  for (const d of scanDirs) {
    const full = join(root, d)
    try { if ((await stat(full)).isDirectory()) files.push(...await collectMarkdown(full)) } catch { /* 跳过 */ }
  }
  // 根级说明文件同样受管
  for (const f of ['AGENTS.md', 'README.md']) {
    const full = join(root, f)
    try { if ((await stat(full)).isFile()) files.push(full) } catch { /* 跳过 */ }
  }

  const existsSet = new Map()
  /** 真实磁盘存在性判定（带缓存）：目录与文件都算存在；被链接的图片/脚本也在此列 */
  const existsFn = (abs) => {
    if (existsSet.has(abs)) return existsSet.get(abs)
    return false // 由下方预扫描填充
  }
  const prefillExists = async (abs) => {
    if (existsSet.has(abs)) return
    existsSet.set(abs, true) // 先置真避免循环
    let ok = false
    try { await access(abs); ok = true } catch { ok = false }
    existsSet.set(abs, ok)
  }
  await seedLinks(files, existsSet)

  async function seedLinks(fileList, cache) {
    const re = /\[[^\]]*\]\(([^)]+)\)/g
    for (const full of fileList) {
      let text = ''
      try { text = await readFile(full, 'utf8') } catch { continue }
      text = stripCode(text)
      let m
      while ((m = re.exec(text))) {
        let target = m[1].trim()
        if (/^(https?:|mailto:|#)/.test(target)) continue
        target = target.split('#')[0].trim()
        if (!target) continue
        const abs = target.startsWith('/') ? target : resolve(dirname(full), target)
        await prefillExists(abs)
      }
    }
  }

  const conflicts = []
  const idMap = new Map()
  const metricClaims = new Map([
    ['插件自检项数', []],
    ['冗余检测自检项数', []],
  ])

  for (const full of files) {
    const rel = relative(root, full)
    let text
    try { text = await readFile(full, 'utf8') } catch { continue }

    // C1
    const dv = headerVersion(text)
    const c1 = checkVersion(rel, dv, ledger)
    if (c1) conflicts.push(c1)

    // C2
    for (const h of countItemsUnderHeadings(text)) {
      const c2 = checkCount(rel, h.title, h.items)
      if (c2) conflicts.push(c2)
    }

    // C4：收集需求编号 → 标题
    const reReq = /^#{2,4}\s*REQ-(\d+)\s*[:：]\s*(.+)$/gm
    let m
    while ((m = reReq.exec(text))) {
      const id = `REQ-${m[1]}`
      if (!idMap.has(id)) idMap.set(id, [])
      idMap.get(id).push({ file: rel, title: m[2].trim() })
    }

    // C3：收集指标声明。
    // 口径说明（三道闸门，缺一就会产生假阳性）：
    //   ① **只认权威出处**：指标真值只由"说明文档"（ai-control/README.md、README.md、indexes/*）
    //      对外声明；需求台账与复盘文档属于**记录**，可以合法写出"旧文档称 X、实测 Y"的对比，
    //      不参与判定。否则复盘写得越清楚，越会被自己报成冲突。
    //   ② 匹配不得跨越表格竖线与换行，否则会把相邻单元格的数字与指标名错配。
    //   ③ 同一文件内逐条全部采集，由 checkMetric 汇总，避免只取首个匹配。
    const isMetricAuthority = /^(ai-control\/README\.md|README\.md|indexes\/)/.test(rel)
    if (isMetricAuthority) {
      const pluginRe = /插件自检[^\n|]{0,24}?(?:(\d+)\s*\/\s*(\d+)\s*(?:通过|项)|(\d+)\s*项)/g
      let pm
      while ((pm = pluginRe.exec(text))) {
        const value = pm[2] || pm[3]
        if (value) metricClaims.get('插件自检项数').push({ file: rel, value: String(value) })
      }
    }
    const mRed = text.match(/自检\s*(\d+)\s*\/\s*(\d+)\s*通过/)
    if (mRed) metricClaims.get('冗余检测自检项数').push({ file: rel, value: `${mRed[1]}/${mRed[2]}` })

    // C5
    conflicts.push(...checkLinks(full, text, existsFn))
  }

  for (const [id, entries] of idMap) {
    const c4 = checkIdTitles(id, entries)
    if (c4) conflicts.push(c4)
  }
  for (const [subject, claims] of metricClaims) {
    const c3 = checkMetric(subject, claims)
    if (c3) conflicts.push(c3)
  }

  // 去重（同类型+同主语+同 a.value 只留一条）
  const seen = new Set()
  const unique = conflicts.filter((c) => {
    const key = `${c.type}|${c.subject}|${c.a?.file}|${c.a?.value}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  unique.sort((x, y) => {
    const order = { high: 0, medium: 1, low: 2 }
    return (order[x.level] - order[y.level]) || x.type.localeCompare(y.type)
  })

  return { filesScanned: files.length, ledgerVersion: ledger, conflictCount: unique.length, conflicts: unique }
}

// ── 自检：既要不漏报真冲突，也要不误报同义内容 ───────────────────────────────
function selfTest() {
  const cases = []
  const add = (name, got, expectFn) => cases.push({ name, got, expectFn })

  // 1) 真版本冲突必检出
  add('真版本冲突必检出', !!checkVersion('rules/system/meta_rules.md', '2.7.0', '2.8.0'), (v) => v === true)
  // 2) 版本一致不误报
  add('版本一致不误报', checkVersion('a.md', '2.8.0', '2.8.0') === null, (v) => v === true)

  // 3) 中文数字计数冲突（十七 vs 实际 21）
  add('中文数字计数冲突必检出', !!checkCount('a.md', '全局元规则十七法典 (Core Meta-Laws)', 21), (v) => v === true)
  // 4) 计数一致不误报
  add('计数一致不误报', checkCount('a.md', '四条不可违背的红线', 4) === null, (v) => v === true)
  // 5) 差 1 容忍（导语行导致的偏移）
  add('计数差一容忍', checkCount('a.md', '任务启动自检六步法', 7) === null, (v) => v === true)
  // 5b) 白名单之外的口径不做校验（防止叙述性"三步走"被误报）
  add('白名单外不校验', checkCount('a.md', '轻量三步走极简流程', 5) === null, (v) => v === true)

  // 6) 中文数字解析正确性
  add('中文数字解析', cnToNumber('二十一') === 21 && cnToNumber('六') === 6 && cnToNumber('十六') === 16, (v) => v === true)
  // 7) 非数字文本不误判
  add('非数字标题不误判', declaredCount('全局元规则总纲') === null, (v) => v === true)

  // 8) 指标冲突必检出（23 项 vs 33 项）
  add('指标冲突必检出', !!checkMetric('插件自检项数', [
    { file: 'ai-control/README.md', value: '23' },
    { file: 'docs/requirements.md', value: '33/33' },
  ]), (v) => v === true)
  // 9) 指标一致不误报
  add('指标一致不误报', checkMetric('插件自检项数', [
    { file: 'a.md', value: '33' }, { file: 'b.md', value: '33' },
  ]) === null, (v) => v === true)
  // 9b) 表格跨界不误配：说明行里的"插件自检"不得与相邻单元格的数字配成一对
  const tableSample = `| 指标 | 现状 | 校准后 |
| :--- | :--- | :--- |
| 插件自检（实测真值） | 旧文档只写字面数 | 实测 33/33 通过 |`
  const m9b = tableSample.match(/插件自检[^\n|]{0,24}?(?:(\d+)\s*\/\s*(\d+)\s*(?:通过|项)|(\d+)\s*项)/)
  add('指标匹配不跨表格单元格', !m9b, (v) => v === true)
  // 9c) 权威出处判定：说明文档算声明，需求台账/复盘文档算记录
  const isAuthority = (p) => /^(ai-control\/README\.md|README\.md|indexes\/)/.test(p)
  add('指标权威出处判定正确', isAuthority('ai-control/README.md') && isAuthority('README.md') && isAuthority('indexes/tool_interfaces.md') && !isAuthority('docs/requirements.md') && !isAuthority('docs/constraint_mechanism_spec.md'), (v) => v === true)

  // 10) 编号标题冲突必检出
  add('编号标题冲突必检出', !!checkIdTitles('REQ-041', [
    { file: 'docs/requirements.md', title: 'AI 执行流程管控系统' },
    { file: 'indexes/rules_index.md', title: '管控系统建设' },
  ]), (v) => v === true)
  // 11) 同编号同标题不误报（仅格式差异）
  add('编号同标题不误报', checkIdTitles('REQ-041', [
    { file: 'a.md', title: '**AI 执行流程管控系统**（门禁内核）' },
    { file: 'b.md', title: 'AI 执行流程管控系统' },
  ]) === null, (v) => v === true)

  // 12) 死链必检出
  const dead = checkLinks('/tmp/a.md', '见 [细则](./not_exist_file.md)', () => false)
  add('死链必检出', dead.length === 1, (v) => v === true)
  // 13) 有效链接不误报
  const alive = checkLinks('/tmp/a.md', '见 [细则](./real.md) 与 [外链](https://x.com/a)', (p) => p === '/tmp/real.md')
  add('有效链接不误报', alive.length === 0, (v) => v === true)
  // 14) 锚点链接不误报
  const anchor = checkLinks('/tmp/a.md', '见 [小节](#三-命名)', () => false)
  add('锚点链接不误报', anchor.length === 0, (v) => v === true)
  // 14b) 代码块与行内代码里的写法示例不误报（避免模板占位符被当死链）
  const fenced = checkLinks('/tmp/a.md', '用法示例：\n```bash\n见 [细则](路径) 与 [模板](占位/路径.md)\n```\n以及 `[样例](例子.md)` 这种行内示例', () => false)
  add('代码内示例不误报', fenced.length === 0, (v) => v === true)

  // 15) 条目计数：表格与列表都算条目
  const md = `### 第一步：探境
- 动作甲
- 动作乙

### 第二步：定标
| 列 | 说明 |
| :--- | :--- |
| A | 甲 |
| B | 乙 |
`
  const counts = countItemsUnderHeadings(md)
  const ok15 = counts.length === 2 && counts[0].items === 2 && counts[1].items === 3
  add('条目计数覆盖列表与表格', ok15, (v) => v === true)

  // 16) 加粗编号型条目（**第一步：**）必须计入
  const md2 = `### 四、规则变动必须走六步循环
**第一步**：接收意图
**第二步**：查重拦截
**第三步**：登记台账
`
  const c2b = countItemsUnderHeadings(md2)[0]
  add('加粗编号条目计数为 3', c2b.items === 3, (v) => v === true)
  add('六步循环实为三步必检出', !!checkCount('a.md', '四、规则变动必须走六步循环', c2b.items), (v) => v === true)

  // 17) 六步循环确实列出六步时不误报
  const six = countItemsUnderHeadings(`### 六步循环
**第一步**：甲
**第二步**：乙
**第三步**：丙
**第四步**：丁
**第五步**：戊
**第六步**：己
`)[0]
  add('六步齐全不误报', checkCount('a.md', '六步循环', six.items) === null, (v) => v === true)

  let pass = true
  console.log('=== 冲突检测器自检 ===')
  for (const c of cases) {
    const ok = c.expectFn(c.got)
    if (!ok) pass = false
    console.log(`${ok ? '✅' : '❌'} ${c.name}`)
  }
  console.log(`\n共 ${cases.length} 项 · ${pass ? '🎉 全部通过' : '💥 存在失败'}`)
  process.exit(pass ? 0 : 1)
}

// ── 入口 ─────────────────────────────────────────────────────────────────────
// ── 入口 ─────────────────────────────────────────────────────────────────────
// 只有"被当作主程序直接运行"时才执行扫描与输出；被其它脚本 import 时
// 只提供可复用的判定函数（例如通道注册审计器复用 checkLinks 的死链判定口径），
// 否则一旦被导入就会顺带跑一遍全库扫描并打印报告，污染调用方输出。
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))

if (isMain) {
  const args = parseArgs(process.argv)
  if (args.selfTest) selfTest()

  const result = await scan({ root: args.root, dirs: args.dirs })

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log('=== 管控机制 · 冲突检测报告 ===')
    console.log(`基准总版本：${result.ledgerVersion ? `v${result.ledgerVersion}` : '未识别'} · 扫描文件 ${result.filesScanned} · 冲突 ${result.conflictCount} 项`)
    const high = result.conflicts.filter((c) => c.level === 'high').length
    console.log(`其中：高危 ${high} 项 · 中危 ${result.conflictCount - high} 项`)
    for (const c of result.conflicts.slice(0, args.top)) {
      console.log(`\n[${c.type}] ${c.subject}`)
      console.log(`   A: ${c.a.file} → ${c.a.value}`)
      console.log(`   B: ${c.b.file} → ${c.b.value}`)
      console.log(`   裁决建议：${c.advice}`)
    }
    if (result.conflictCount > args.top) console.log(`\n…… 其余 ${result.conflictCount - args.top} 项已省略（--top 调整）`)
    console.log(result.conflictCount === 0 ? '\n✅ 未发现冲突' : '\n⚠️ 存在冲突，须先出裁决方案再迭代（禁止自行取舍）')
  }
}
