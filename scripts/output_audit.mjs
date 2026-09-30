#!/usr/bin/env node
/**
 * ==============================================================================
 * 输出体量与结构判定器 (Output Audit) —— REQ-089 / R1-c 的物理载体
 * ==============================================================================
 * 为什么需要它（实测根因，2026-10-01）：
 *   `audit_execution.sh` 第 8 维「输出精简与文末五联装」的度量报告，**历史上只有拦截层
 *   插件会写**（`ai-control/plugin/index.mjs` → `writeCompactReport`）。
 *   而拦截层插件至今未注册进宿主（`install_host_gate.sh verify` 报「条目存在 ⛔ 缺失」），
 *   于是 `~/.dsh/.dsh-control/compact/` 目录**在整台机器上从未出现过**，
 *   该维度**结构性恒扣 8 分**，与输出质量毫无关系 —— 一条永远不可能通过的判定。
 *
 * 处置思路（与 REQ-087 R1-a 同源）：

 *   把证据源从「插件运行时」换成 **宿主会话转录**（`scripts/lib/session_transcript.mjs`，
 *   多帧 zstd 逐帧解压），读宿主权威记录的 **上一轮已完结的助手正文**，
 *   用与插件**完全同一套**度量实现（`scripts/lib/output_compactness.mjs`）算分，
 *   并把报告写到插件原本要写的同一路径 —— 于是审计第 8 维不再依赖插件是否通电。
 *
 * 为什么取「上一轮已完结」而不是「本轮」：
 *   判定器永远在本轮回复**产生之前**运行，取本轮只会拿到空。取最近一个 `turn/end`
 *   对应的助手正文，语义稳定、可复现，且真正度量的是"我实际交付出去的东西"。
 *
 * 刻度口径（fail-closed，遵循工程铁律「没有可解析的证据 ≠ 通过」）：
 *   exit 0 = 有证据且通过；exit 1 = 有证据但不达标；exit 2 = **取不到证据**（转录缺失/无可判定回复）
 *   —— exit 2 绝不算通过，但报错文案必须说清"是取不到证据"，不得伪装成"输出很规范"。
 *
 * 用法：
 *   node scripts/output_audit.mjs --check     # 计算并打印，不落盘（退出码 0/1/2）
 *   node scripts/output_audit.mjs --refresh   # 计算、落盘到 compact/<sid>.json，并打印
 *   node scripts/output_audit.mjs --json      # 输出机器可读 JSON
 * ==============================================================================
 */

import { readFileSync, existsSync } from 'node:fs'
import { readTranscriptEvents } from './lib/session_transcript.mjs'
import {
  buildCompactReport,
  writeCompactReport,
  getCompactFilePath,
  formatCompactLine,
  TAIL_MARKERS,
} from './lib/output_compactness.mjs'

const args = new Set(process.argv.slice(2))
const JSON_MODE = args.has('--json')
const REFRESH = args.has('--refresh')

/** 阈值：与拦截层插件的 `compactThresholds` 保持同一口径，避免两套标准。 */
const THRESHOLDS = { maxChars: 1800, maxLines: 60 }

/**
 * 取最近一轮**已完结**的助手正文。
 * @returns {{turn:number|null, text:string, reason:string}}
 */
export function latestCompletedReply(sessionId = process.env.DSH_SESSION_ID) {
  const { path, events } = readTranscriptEvents(sessionId)
  if (!path) return { turn: null, text: '', reason: '找不到该会话的转录文件' }
  if (!events.length) return { turn: null, text: '', reason: '转录文件读不出任何事件（解压失败或为空）' }

  const ended = events
    .filter((e) => e && e.type === 'turn/end' && e.data && typeof e.data.turn === 'number')
    .map((e) => e.data.turn)
  if (!ended.length) return { turn: null, text: '', reason: '转录里没有任何已完结的回合（turn/end）' }
  const turn = Math.max(...ended)

  const texts = events
    .filter((e) => e && e.type === 'assistant/message' && e.data && e.data.turn === turn)
    .flatMap((e) => {
      const content = e.data.message?.content
      if (!Array.isArray(content)) return []
      return content.filter((b) => b && b.type === 'text' && typeof b.text === 'string').map((b) => b.text)
    })

  if (!texts.length) return { turn, text: '', reason: `第 ${turn} 回合没有助手正文文本块` }
  return { turn, text: texts.join('\n\n'), reason: '' }
}

/**
 * REQ-089 R1-d：把《Don't Make Me Think》与格式塔条款落成**逐条可量化的检查**。
 *
 * 为什么必须做成可判定：R1-a 已经把两本书的出处登记进 `knowledge/sources/`，
 * 但"登记了来源"不等于"条款被遵守"——没有判定手段的原则，就是一句不会被执行的废话
 * （本工程已有过两条同类教训：V4 缺陷、审计第 8 维结构性假绿）。
 *
 * 判定口径来源（逐条对应，不自行发明）：
 *   · 嵌套层级 ≤ 3 级        ← `readability_specification.md` §一.1「嵌套层级严禁超过 3 级」→ **判据（gate）**
 *   · 为快速扫视而设计        ← 同上 §一.2（需有标题/表格/列表作为视觉锚点）→ 报告项
 *   · 消除视觉噪点、粗体节制  ← 同上 §一.3「粗体仅用于即时捕捉焦点的关键词」→ 报告项
 *   · 单行字符数受控          ← 同上 §一.2「桌面端单行建议 45~75 个汉字」→ 报告项
 *   · 接近律（组间距 ≥ 组内） ← `interaction_specification.md` §一.1（文本载体上以"段落不粘连"近似）→ 报告项
 *
 * 为什么只有"嵌套层级"升级为判据：它是规范里**写明数字边界的硬性约束**；
 * 其余四项规范给的是"建议/建议区间"，把它们直接当硬门属于**自行发明阈值**，
 * 因此一律只报数、不当硬门（与本工程"报告项不参与判定"的既有口径一致）。
 */
export function cognitiveChecks(text) {
  const raw = String(text || '')
  const body = raw
    .replace(/```[\s\S]*?```/g, '')      // 代码块是交付物，不计入正文排版度量

  const lines = body.split('\n')
  const nonEmpty = lines.filter((l) => l.trim())

  // ① 标题嵌套层级
  let maxDepth = 0
  for (const l of nonEmpty) {
    const m = l.match(/^(#{1,6})\s+\S/)
    if (m) maxDepth = Math.max(maxDepth, m[1].length)
  }
  const depthOk = maxDepth <= 3

  // ② 扫视锚点率：标题 / 表格行 / 列表项 / 加粗小标题 占非空行的比例
  const anchorLines = nonEmpty.filter((l) => /^\s*(#{1,6}\s|\||[-*+]\s|\d+\.\s|>\s)|^\s*\*\*[^*]+\*\*/.test(l)).length
  const anchorRate = nonEmpty.length ? anchorLines / nonEmpty.length : 0

  // ③ 粗体占比：**…** 内的字符数占正文（去代码块）字符数的比例
  // 口径修正（由 --self-test 抓到）：分母必须**去掉 `**` 标记本身** —— 标记渲染后不可见，
  // 把它们算进"正文面积"会把占比系统性压低（`**全部加粗**` 会算成 50% 而不是 100%）。
  const bodyChars = [...body.replace(/\*\*/g, '').replace(/\s/g, '')].length
  const boldChars = (body.match(/\*\*[^*]+\*\*/g) || []).reduce((n, s) => n + [...s.replace(/\*\*/g, '')].length, 0)
  const boldRate = bodyChars ? boldChars / bodyChars : 0

  // ④ 超长行：规范建议 45~75 汉字，这里取"远超建议上限"的 120 字为报告阈值
  const longLines = nonEmpty.filter((l) => [...l].length > 120).length

  // ⑤ 段落墙：连续非结构行 ≥ 6 行视为一段"墙"（接近律在文本载体上的近似）
  let wall = 0
  let run = 0
  for (const l of nonEmpty) {
    const structural = /^\s*(#{1,6}\s|\||[-*+]\s|\d+\.\s|>\s)/.test(l)
    run = structural ? 0 : run + 1
    if (run >= 6) wall++
  }

  return {
    maxHeadingDepth: maxDepth,
    depthOk,                                   // ← 唯一判据
    anchorLines,
    nonEmptyLines: nonEmpty.length,
    anchorRate: Number(anchorRate.toFixed(3)),
    boldChars,
    bodyChars,
    boldRate: Number(boldRate.toFixed(3)),
    longLines,
    paragraphWalls: wall,
    gatePass: depthOk,
  }
}

/* ── 反向用例（REQ-089：判定器必须能判红，否则等于没有判定器）──────────────
 * 本判定器在引入 `--refresh` 之前，曾因"报告只由未通电插件写"而**永远取不到证据**，
 * 换成读转录后又出现过"报告只算一次、陈旧快照永久钉住"的假红。
 * 两种都是"判定器不会跟着事实变"。因此这里用合成正文做双向断言：
 * 该红的必须红，该绿的必须绿。 */
export function selfTest() {
  const tail = TAIL_MARKERS.map((m) => `**${m.label}**：占位`).join('\n')
  const cases = []
  const add = (name, got, expect) => cases.push({ name, got, expect, ok: got === expect })

  const short = `## 标题\n正文很短。\n${tail}`
  add('短正文 + 五联装齐备 → 通过', buildCompactReport(short, THRESHOLDS).pass, true)
  add('短正文但缺五联装 → 判红', buildCompactReport('## 标题\n正文。', THRESHOLDS).pass, false)
  const long = `## 标题\n${'这是一段很长的正文用来触发体量判据。'.repeat(200)}\n${tail}`
  add('超长正文 → 判红', buildCompactReport(long, THRESHOLDS).pass, false)
  add('嵌套 2 级 → 认知判据过', cognitiveChecks('## 一级\n### 二级\n内容').gatePass, true)
  add('嵌套 4 级 → 认知判据判红', cognitiveChecks('## 一级\n### 二级\n#### 三级\n##### 四级').gatePass, false)
  add('无标题纯段落 → 锚点率为 0', cognitiveChecks('一段话。\n又一段话。').anchorRate, 0)
  add('全篇加粗 → 加粗占比接近 1', cognitiveChecks('**全部加粗**').boldRate > 0.9, true)

  const failed = cases.filter((c) => !c.ok)
  for (const c of cases) console.log(`${c.ok ? '✅' : '❌'} ${c.name}（实际 ${JSON.stringify(c.got)} / 期望 ${JSON.stringify(c.expect)}）`)
  console.log('-----------------------------------------')
  console.log(`共 ${cases.length} 项 · ${failed.length ? `❌ ${failed.length} 项未过` : '🎉 全部通过'}`)
  process.exit(failed.length ? 1 : 0)
}

function main() {
  const sessionId = process.env.DSH_SESSION_ID || 'global_session'
  const { turn, text, reason } = latestCompletedReply(sessionId)

  if (!text) {
    // fail-closed：取不到证据 ≠ 通过
    if (JSON_MODE) console.log(JSON.stringify({ ok: false, reason, turn, sessionId }, null, 2))
    else {
      console.log('🧪 输出体量与结构判定 · 未采集')
      console.log('-----------------------------------------')
      console.log(`⛔ 取不到可判定的证据：${reason}`)
      console.log('   处置：这**不算通过**。请确认 DSH_SESSION_ID 有效且会话已有完结回合。')
    }
    process.exit(2)
  }

  const report = buildCompactReport(text, THRESHOLDS)
  // REQ-089 R1-d：并入认知合规判据（唯一硬判据 = 标题嵌套 ≤ 3 级，其余为报告项）
  const cog = cognitiveChecks(text)
  report.cognitive = cog
  report.pass = report.pass && cog.gatePass
  if (REFRESH) {
    const wrote = writeCompactReport(sessionId, report)
    if (!JSON_MODE) {
      console.log(`💾 报告已落盘：${getCompactFilePath(sessionId)} ${wrote ? '' : '（写入失败，已降级为仅打印）'}`)
    }
  }

  if (JSON_MODE) {
    console.log(JSON.stringify({ ok: report.pass, turn, sessionId, file: getCompactFilePath(sessionId), ...report }, null, 2))
  } else {
    console.log('🧪 输出体量与结构判定 · 不采信自述，只读宿主转录')
    console.log('-----------------------------------------')
    console.log(`会话：${sessionId}`)
    console.log(`取证：第 ${turn} 回合（最近一轮已完结的助手正文）`)
    console.log(formatCompactLine(report))
    console.log(
      report.sizeOk
        ? `  · 体量合规：${report.chars} 字 / ${report.lines} 行（限 ${report.maxChars} / ${report.maxLines}）`
        : `  · 体量超标：${report.chars} 字 / ${report.lines} 行（限 ${report.maxChars} / ${report.maxLines}）`,
    )
    console.log(
      report.tailOk
        ? '  · 文末五联装标头齐备'
        : `  · 文末五联装缺失：${report.missingTail.join(' / ')}（应含 ${TAIL_MARKERS.length} 项标头）`,
    )
    console.log('  · 认知合规（来源：readability_specification.md §一 / interaction_specification.md §一）')
    console.log(`      ${cog.depthOk ? '✅' : '⛔'} [判据] 标题嵌套 ${cog.maxHeadingDepth} 级（规范硬性边界 ≤ 3 级）`)
    console.log(`      📊 [报告项] 扫视锚点率 ${(cog.anchorRate * 100).toFixed(1)}%（${cog.anchorLines}/${cog.nonEmptyLines} 行是标题/表格/列表）`)
    console.log(`      📊 [报告项] 加粗占比 ${(cog.boldRate * 100).toFixed(1)}%（粗体应仅用于关键词，严禁全篇加粗）`)
    console.log(`      📊 [报告项] 超长行 ${cog.longLines} 行（>120 字，规范建议单行 45~75 汉字）`)
    console.log(`      📊 [报告项] 段落墙 ${cog.paragraphWalls} 处（连续 ≥6 行无结构锚点）`)
    console.log('-----------------------------------------')
    console.log(report.pass ? '✅ 通过：体量、结构与认知判据全部达标' : '⛔ 不通过：存在超标项、缺失标头或认知判据未过')
  }
  process.exit(report.pass ? 0 : 1)
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())
if (invokedDirectly && process.argv.includes('--self-test')) selfTest()
else if (invokedDirectly) main()
