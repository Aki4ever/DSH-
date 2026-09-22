#!/usr/bin/env node
// ==============================================================================
// 脚本名称：channel_audit.mjs
// 核心功能：快速通道注册审计器 —— 校验"通道表"是否真的可用（对应 REQ-045）
// ------------------------------------------------------------------------------
// 为什么需要它：快速通道是"一句话调用流程"的入口，但通道表本身过去没有任何校验：
//   ① 通道指向的文件被改名/删除后，通道会变成死通道，但没人发现；
//   ② 用户说法五花八门，没人验证过"换个说法还能不能命中"；
//   ③ 新增通道可能与老通道语义重叠，靠肉眼比对不可靠。
//   本脚本把这三件事变成可执行判定，避免通道表退化成"一份看起来很整齐的清单"。
//
// 判定三类：
//   A1 通道无死链  —— 通道表内所有相对链接必须指向真实存在的文件（复用冲突检测器的判定口径）
//   A2 触发词可命中 —— 用户常用说法必须命中预期通道；"看似像但不应命中"的说法必须不命中
//   A3 触发词不冲突 —— 通道名不得重复；不得一个名字包含另一个（如"门禁看板"与"看板"）
//
// 用法：
//   node scripts/channel_audit.mjs --root .          # 实扫通道表
//   node scripts/channel_audit.mjs --root . --json   # 机器可读输出
//   node scripts/channel_audit.mjs --self-test       # 正反例自检
//
// 设计约束：本脚本只读不写，绝不修改通道表。
// ==============================================================================

import { readFile, access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { checkLinks } from './conflict_scan.mjs'

// ── 通道表的权威出处（唯一，禁止在别处复制通道内容） ─────────────────────────
export const CHANNEL_TABLE = 'indexes/shortcuts_index.md'

/** 触发词长度上限（汉字数），超过则不易记、不易说 */
export const MAX_TRIGGER_CHARS = 12

/** 必须存在的通道（用户拍板要落地的两条新通道 + 两条锚点通道） */
export const REQUIRED_CHANNELS = [
  '看看管控机制',
  '生成信息图',
  '门禁看板',
  '查打架',
]

// ── 文本归一化与解析 ─────────────────────────────────────────────────────────

/** 归一化：去掉空白、引号、全角括号等噪声，统一小写，便于"换个说法也能命中" */
export function normalizePhrase(s) {
  return String(s)
    .toLowerCase()
    .replace(/[\s"'“”‘’`（）()【】\[\]，,。.、：:；;！!？?~～·|<>\-—_/\\]/g, '')
}

/** 从一行表格里取出单元格数组（去掉首尾空单元） */
export function splitRow(line) {
  const cells = line.split('|')
  if (cells.length && cells[0].trim() === '') cells.shift()
  if (cells.length && cells[cells.length - 1].trim() === '') cells.pop()
  return cells.map((c) => c.trim())
}

/**
 * 从表格单元格里取出"触发词"。
 * 通道表里触发词的写法是加粗文本，可带别名括号、占位符与外文注记，例如：
 *   **“看看管控机制”**<br>*(或“管控机制/门禁状态”)*
 *   **“生成信息图 <主题>”**<br>*(或“出信息图/画信息图”)*
 * 注意：尖括号占位符（`<主题>`）必须剥离——它是参数说明，不是触发词的一部分，
 * 否则会出现"必备通道「生成信息图」未登记""说法命中不到"这类假问题。
 */
export function parseTrigger(cell) {
  const main = cell.match(/\*\*[“"']?([^”"']+?)[”"']?\*\*/)
  const raw = main ? main[1].trim() : ''
  const name = stripPlaceholder(raw)
  const plain = cell.replace(/\*+/g, ' ')
  const aliases = [...plain.matchAll(/[“"]([^”"]{1,20})[”"]/g)]
    .map((m) => stripPlaceholder(m[1].trim()))
    .flatMap((s) => s.split('/').map((x) => x.trim()))
    .filter(Boolean)
  const all = [...new Set([name, ...aliases].filter(Boolean))]
  return { name, all }
}

/** 剥离尖括号占位符与多余空白 */
export function stripPlaceholder(s) {
  return String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

/** 从"标准动作与数据源"单元格里取出全部 Markdown 链接目标（相对路径） */
export function parseTargets(cell) {
  const out = []
  const re = /\[[^\]]*\]\(([^)]+)\)/g
  let m
  while ((m = re.exec(cell))) {
    const t = m[1].trim().split('#')[0].trim()
    if (t && !/^(https?:|mailto:)/.test(t)) out.push(t)
  }
  return out
}

/** 判断触发词是否形如通道表里的"粗体加引号"写法（用于区分真正的通道行与说明行） */
function looksLikeTrigger(cell) {
  return /\*\*[“"']/.test(cell) || /^\*\*[^*]+\*\*/.test(cell)
}

/**
 * 解析通道表：返回全部通道条目。
 * 三重限定，缺一就会把别的表格误当成通道表（实测踩过：双轨决策表、通道规范说明表都被误判）：
 *   ① **章节作用域**：只解析"快速口令/快速通道"所在章节，遇到下一个同级标题即停止；
 *   ② **路由列校验**：第二格必须是 G0/G1/G2/G3 路网标识（双轨表那一列写的是"难度分"）；
 *   ③ **触发词写法**：第一格必须是加粗的触发词。
 */
export function parseChannels(markdown) {
  const channels = []
  let inChannelSection = false

  for (const raw of String(markdown).split(/\r?\n/)) {
    const line = raw.trim()

    // ① 章节作用域：进入含"快速口令/快速通道"的二级标题章节，遇到下一个二级标题即退出
    if (/^##\s/.test(line)) {
      inChannelSection = /快速口令|快速通道/.test(line)
      continue
    }
    if (!inChannelSection) continue

    if (!line.startsWith('|')) continue
    const cells = splitRow(line)
    if (cells.length < 4) continue
    if (/^:?-{2,}:?$/.test(cells[0])) continue          // 分隔行
    if (/^快速口令/.test(cells[0])) continue            // 表头
    if (!/\bG[0-3]\b|G[0-3]\s*(级|高速|干线|支线|辅道)/.test(cells[1])) continue  // ② 路由列
    if (!looksLikeTrigger(cells[0])) continue           // ③ 触发词写法

    const trigger = parseTrigger(cells[0])
    if (!trigger.name) continue
    const action = cells.slice(3).join(' | ')
    channels.push({
      name: trigger.name,
      all: trigger.all,
      route: cells[1] || '',
      intent: cells[2] || '',
      action,
      targets: parseTargets(action),
    })
  }
  return channels
}

// ── A2：触发词命中判定 ───────────────────────────────────────────────────────

/**
 * 判断用户说法命中的是哪条通道。
 * 计分方式（对每条通道取自身最优分，再比大小）：
 *   ① 说法里直接出现通道**主名称**        → 2000 + 长度（用户在点名这条通道）
 *   ② 说法里出现通道**别名**              → 1500 + 长度
 *   ③ 通道主名称包含该说法（简写）        → 1200
 *   ④ 通道别名包含该说法（简写）          → 800
 *   ⑤ 说法里出现 ≥ 3 字核心关键词片段     → 100 + 长度
 * 两条设计理由：
 *   - **按通道取最优分**：若在全库范围挑最长片段，"帮我看一下管控机制"会因别名里的
 *     "看管控机制"而误命中"门禁看板"——那只是子串巧合，不是通道名。
 *   - **主名称优先于别名**："管控机制"既是通道"看看管控机制"的主名称，又是"门禁看板"的
 *     别名片段；同分并列会让命中结果取决于表格顺序，不可复现。主名称必须压过别名。
 * 关键词要求 ≥ 3 字：单字双字泛词（"机制""信息"）若也触发，就成了"沾边就触发"。
 */
export function matchChannel(phrase, channels) {
  const p = normalizePhrase(phrase)
  if (!p) return null

  let best = null
  let bestScore = 0
  for (const ch of channels) {
    let score = 0
    const primary = normalizePhrase(ch.name)
    if (primary && p.includes(primary)) score = Math.max(score, 2000 + primary.length)
    if (primary && p.length >= 4 && primary.includes(p)) score = Math.max(score, 1200)
    for (const alias of ch.all) {
      const a = normalizePhrase(alias)
      if (!a || a === primary) continue
      if (p.includes(a)) {
        score = Math.max(score, 1500 + a.length)
        continue
      }
      if (p.length >= 4 && a.includes(p)) {
        score = Math.max(score, 800)
        continue
      }
      for (const kw of keywordsOf(a)) {
        if (!p.includes(kw)) continue
        if (/^[看帮查生来个下的出]/.test(kw) && kw.length <= 3) continue
        score = Math.max(score, 100 + kw.length)
      }
    }
    if (score > bestScore) {
      best = ch
      bestScore = score
    }
  }
  return best
}

/**
 * 命中详情：返回命中的通道以及"是哪个名称/片段、以多少分数命中"。
 * 只做诊断用（自检与实扫都会打印），不改变判定结果。
 */
export function matchDetail(phrase, channels) {
  const p = normalizePhrase(phrase)
  const info = { phrase, hit: matchChannel(phrase, channels), via: '', score: 0, rival: '' }
  if (!p) return info
  for (const ch of channels) {
    const primary = normalizePhrase(ch.name)
    let score = 0
    let via = ''
    if (primary && p.includes(primary)) { score = 2000 + primary.length; via = `主名称「${ch.name}」` }
    if (primary && p.length >= 4 && primary.includes(p) && 1200 > score) { score = 1200; via = `主名称包含说法「${ch.name}」` }
    for (const alias of ch.all) {
      const a = normalizePhrase(alias)
      if (!a || a === primary) continue
      if (p.includes(a) && 1500 + a.length > score) { score = 1500 + a.length; via = `别名「${alias}」`; continue }
      if (p.length >= 4 && a.includes(p) && 800 > score) { score = 800; via = `别名包含说法「${alias}」`; continue }
      for (const kw of keywordsOf(a)) {
        if (!p.includes(kw)) continue
        if (/^[看帮查生来个下的出]/.test(kw) && kw.length <= 3) continue
        if (100 + kw.length > score) { score = 100 + kw.length; via = `别名「${alias}」的关键词「${kw}」` }
      }
    }
    if (info.hit && ch.name === info.hit.name) {
      info.via = via
      info.score = score
    } else if (score > 0 && score >= info.score && info.hit && ch.name !== info.hit.name) {
      info.rival = `${ch.name}（${via}，${score} 分）`
    }
  }
  if (!info.hit) {
    let best = 0
    let who = ''
    for (const ch of channels) {
      const d = matchDetail(phrase, [ch])
      if (d.score > best) { best = d.score; who = `${ch.name}（${d.via}，${d.score} 分）` }
    }
    info.rival = who
  }
  return info
}
export function keywordsOf(s) {
  const out = []
  const n = [...s].length
  for (let i = 0; i < n; i++) {
    for (let len = 3; len <= n - i; len++) out.push([...s].slice(i, i + len).join(''))
  }
  return out
}

// ── A3：触发词冲突判定 ───────────────────────────────────────────────────────

/** 找出触发词冲突：完全重复，或一个名称包含另一个（造成指代歧义） */
export function checkTriggerConflicts(channels) {
  const out = []
  const names = channels.map((c) => c.name)
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i]
      const b = names[j]
      if (a === b) {
        out.push({ type: 'A3-触发词重复', a, b, advice: '删除重复行，通道表里一条通道只能出现一次。' })
        continue
      }
      const na = normalizePhrase(a)
      const nb = normalizePhrase(b)
      if (na.includes(nb) || nb.includes(na)) {
        out.push({
          type: 'A3-触发词包含',
          a,
          b,
          advice: `“${a}”与“${b}”互相包含，说法会歧义；请把短的那条改名或合并（参考方案甲：一条看单点、一条看全貌）。`,
        })
      }
    }
  }
  return out
}

/** 触发词过长检查 */
export function checkTriggerLength(channels) {
  const out = []
  for (const ch of channels) {
    if ([...ch.name].length > MAX_TRIGGER_CHARS) {
      out.push({
        type: 'A3-触发词过长',
        a: ch.name,
        b: `${[...ch.name].length} 字`,
        advice: `触发词建议 ≤ ${MAX_TRIGGER_CHARS} 个汉字，太长记不住也说不出。`,
      })
    }
  }
  return out
}

// ── 自检用例（正反例，防止把判定能力改坏） ───────────────────────────────────

export const FIXTURE_MARKDOWN = `# 快速通道指令路由

## 🚀 二、G1 级高速干道快速口令与路由映射表

| 快速口令 (示例) | 路由路网 | 命中意图 | 标准动作与数据源 | 结构化交互交付入口 (必给) |
| :--- | :---: | :--- | :--- | :--- |
| **“门禁看板”**<br>*(或“闸门状态/门禁状态”)* | **G1 干线** | 查看四道门禁是否全过 | 执行 [\`scripts/control_gates.sh\`](../scripts/control_gates.sh) \`check\` | 输出量化看板 |
| **“看看管控机制”**<br>*(或“管控机制全貌/管控机制/机制全貌”)* | **G1 干线** | 查看机制全貌 | 读取 [\`indexes/rules_index.md\`](rules_index.md) | 输出全貌卡 |
| **“生成信息图 <主题>”**<br>*(或“出信息图/画信息图/画机制图”)* | **G1 干线** | 生成教学图 | 读取 [\`docs/diagram_generation_guide.md\`](../docs/diagram_generation_guide.md) | 输出 SVG 与 PNG |

## 🚦 四、双轨决策速查表

| 意图与任务特征 | 难度分 | 路由通道 | 必走/豁免关键点 |
| :--- | :---: | :---: | :--- |
| **纯查询/参数读取/口令检索** | $\\le 20$ 分 | **⚡ Fast Track** | 直出结论 |
`

export const HIT_CASES = [
  { phrase: '看看管控机制', expect: '看看管控机制' },
  { phrase: '帮我看一下管控机制', expect: '看看管控机制' },
  { phrase: '管控机制全貌', expect: '看看管控机制' },
  { phrase: '门禁看板', expect: '门禁看板' },
  { phrase: '闸门状态', expect: '门禁看板' },
  { phrase: '生成信息图', expect: '生成信息图' },
  { phrase: '帮我出信息图', expect: '生成信息图' },
  { phrase: '生成信息图：管控机制', expect: '生成信息图' },
]

// "看似像但不应命中"的反例：避免沾边就触发（例如只是提到"机制现状"这类泛词）
export const MISS_CASES = ['今天天气怎么样', '帮我写一个 Unity 脚本', '机制', '信息']

// ── 主流程 ───────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { root: '.', json: false, selfTest: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--root') args.root = argv[++i]
    else if (a === '--json') args.json = true
    else if (a === '--self-test') args.selfTest = true
  }
  return args
}

/** 真实存在的路径判定表（相对仓库根），供链接检查使用；避免"只在文档集合里找"造成的假死链 */
async function buildExistsFn(root) {
  const cache = new Map()
  return async (abs) => {
    if (cache.has(abs)) return cache.get(abs)
    let ok = true
    try {
      await access(abs)
    } catch {
      ok = false
    }
    cache.set(abs, ok)
    return ok
  }
}

async function scan({ root }) {
  const tablePath = join(resolve(root), CHANNEL_TABLE)
  let text
  try {
    text = await readFile(tablePath, 'utf8')
  } catch {
    return { ok: false, error: `通道表不存在：${CHANNEL_TABLE}`, items: [] }
  }

  const channels = parseChannels(text)
  const exists = await buildExistsFn(resolve(root))

  // A1：通道表内的相对链接必须真实存在（复用冲突检测器的死链判定口径）
  const deadLinks = []
  for (const item of await checkLinks(tablePath, text, exists)) {
    deadLinks.push({ type: 'A1-通道死链', a: item.a.value, b: item.b.value, advice: item.advice })
  }

  // A1b：通道行的"标准动作"必须带至少一个可校验的目标（文件链接）
  const noTarget = []
  for (const ch of channels) {
    if (ch.targets.length === 0) {
      noTarget.push({
        type: 'A1-通道无可校验目标',
        a: ch.name,
        b: '标准动作里没有任何文件链接',
        advice: '把动作目标写成 Markdown 链接（例如 [`scripts/control_gates.sh`](../scripts/control_gates.sh)），使其可点击、可校验。',
      })
    }
  }

  // A2：触发词命中自检
  const hitFail = []
  for (const c of HIT_CASES) {
    const d = matchDetail(c.phrase, channels)
    if (!d.hit || d.hit.name !== c.expect) {
      hitFail.push({
        type: 'A2-说法未命中预期通道',
        a: c.phrase,
        b: d.hit ? `命中“${d.hit.name}”（依据 ${d.via}，${d.score} 分）` : '未命中任何通道',
        advice: `预期命中“${c.expect}”，请检查该通道的触发词与别名写法（命中判定为按通道取最优分，主名称优先于别名）。`,
      })
    }
  }
  for (const phrase of MISS_CASES) {
    const hit = matchChannel(phrase, channels)
    if (hit) {
      hitFail.push({
        type: 'A2-泛词误触发',
        a: phrase,
        b: `误命中“${hit.name}”`,
        advice: '触发词过于宽泛会"沾边就触发"，请改用动宾结构的完整短语。',
      })
    }
  }

  // A2b：必备通道是否在册且真的有目标
  const missing = []
  for (const need of REQUIRED_CHANNELS) {
    const found = channels.find((c) => normalizePhrase(c.name) === normalizePhrase(need))
    if (!found) {
      missing.push({
        type: 'A2-必备通道缺失',
        a: need,
        b: '通道表中未登记',
        advice: `在 ${CHANNEL_TABLE} 登记该通道（触发词 + 路由 + 动作目标链接）。`,
      })
    }
  }

  // A3：触发词冲突与长度
  const conflicts = [...checkTriggerConflicts(channels), ...checkTriggerLength(channels)]

  const items = [...deadLinks, ...noTarget, ...hitFail, ...missing, ...conflicts]
  return {
    ok: true,
    channelCount: channels.length,
    channels: channels.map((c) => ({ name: c.name, route: c.route, targets: c.targets })),
    itemCount: items.length,
    summary: items.reduce((acc, i) => {
      const k = i.type.split('-')[0]
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {}),
    items,
  }
}

// ── 自检 ─────────────────────────────────────────────────────────────────────

function selfTest() {
  const results = []
  const add = (name, pass, detail) => results.push({ name, pass: !!pass, detail })

  const channels = parseChannels(FIXTURE_MARKDOWN)
  add('能解析出三条通道', channels.length === 3, `实际 ${channels.length} 条（双轨决策表不应被计入）`)
  add('触发词解析正确', channels[1]?.name === '看看管控机制', `实际 ${channels[1]?.name}`)
  add('占位符已剥离', channels[2]?.name === '生成信息图', `实际 ${channels[2]?.name}`)
  add('斜杠别名已拆分', (channels[2]?.all || []).includes('出信息图') && (channels[2]?.all || []).includes('画机制图'), JSON.stringify(channels[2]?.all))
  add('别名解析正确', (channels[1]?.all || []).includes('管控机制全貌'), JSON.stringify(channels[1]?.all))
  add('动作目标解析正确', (channels[1]?.targets || []).includes('rules_index.md'), JSON.stringify(channels[1]?.targets))

  for (const c of HIT_CASES) {
    const d = matchDetail(c.phrase, channels)
    add(`说法命中：${c.phrase} → ${c.expect}`, d.hit?.name === c.expect, d.hit ? `命中「${d.hit.name}」依据 ${d.via}（${d.score} 分）` : '未命中任何通道')
  }
  for (const p of MISS_CASES) {
    add(`泛词不误触发：${p}`, matchChannel(p, channels) === null, '不应命中任何通道')
  }

  // 冲突判定
  const dup = checkTriggerConflicts([
    { name: '门禁看板', all: ['门禁看板'] },
    { name: '看板', all: ['看板'] },
  ])
  add('触发词包含必被检出', dup.length === 1 && dup[0].type === 'A3-触发词包含', JSON.stringify(dup))
  add('互不相关不误报', checkTriggerConflicts(channels).length === 0, JSON.stringify(checkTriggerConflicts(channels)))
  add('触发词过长必被检出', checkTriggerLength([{ name: '这是一条特别特别长的触发词说法' }]).length === 1, '应报过长')

  // 归一化
  add('归一化忽略引号空格', normalizePhrase('“看看 管控机制”') === '看看管控机制', normalizePhrase('“看看 管控机制”'))
  add('归一化忽略全角括号', normalizePhrase('门禁看板（或闸门状态）') === '门禁看板或闸门状态', normalizePhrase('门禁看板（或闸门状态）'))

  const failed = results.filter((r) => !r.pass)
  return { results, failed }
}

// ── 入口 ─────────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2))

if (args.selfTest) {
  const { results, failed } = selfTest()
  if (!args.json) {
    console.log('=== 通道注册审计器 · 自检 ===\n')
    for (const r of results) console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.pass ? '' : ` → ${r.detail}`}`)
    console.log(`\n共 ${results.length} 项 · ${failed.length === 0 ? '🎉 全部通过' : `❌ ${failed.length} 项失败`}`)
  } else {
    console.log(JSON.stringify({ total: results.length, failed: failed.length, results }, null, 2))
  }
  process.exit(failed.length === 0 ? 0 : 1)
}

const result = await scan(args)

if (args.json) {
  console.log(JSON.stringify(result, null, 2))
} else {
  console.log('=== 管控机制 · 快速通道注册审计 ===')
  if (!result.ok) {
    console.log(`❌ ${result.error}`)
    process.exit(1)
  }
  console.log(`通道表：${CHANNEL_TABLE} · 通道 ${result.channelCount} 条 · 问题 ${result.itemCount} 项`)
  if (result.itemCount) {
    console.log(`其中：${Object.entries(result.summary).map(([k, v]) => `${k} ${v} 项`).join(' · ')}`)
    console.log('')
    for (const it of result.items) {
      console.log(`[${it.type}]`)
      console.log(`   A：${it.a}`)
      console.log(`   B：${it.b}`)
      console.log(`   应对：${it.advice}`)
    }
    console.log('')
    console.log('⚠️ 通道表存在问题，须修正后再迭代（禁止留着死通道）')
    process.exit(1)
  }
  console.log('')
  console.log('✅ 通道表健康：无死链、说法可命中、触发词无冲突')
}
process.exit(0)
