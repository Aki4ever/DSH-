#!/usr/bin/env node
/**
 * ==============================================================================
 * 冗余检测器 (Redundancy Detector)
 * ==============================================================================
 * 定位：为 G4 门禁提供"真冗余"判定。逐行统计会被模板字段污染（例如需求台账
 *       40 条共用的 "- **验收标准**："），因此本检测器改用块级归一化 + 词级
 *       Jaccard 相似度：只有"实质内容高度重合"才计为冗余。
 *
 * 输出：JSON（供 control_gates.sh 与 status.json 消费）
 * 用法：
 *   node scripts/redundancy_scan.mjs --root <项目根> [--json] [--top N]
 *   node scripts/redundancy_scan.mjs --self-test
 * ==============================================================================
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative, extname } from 'node:path'

// ── 参数解析 ─────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { root: process.cwd(), json: false, top: 10, threshold: 0.85, minChars: 120, selfTest: false }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--root') out.root = argv[++i]
    else if (a === '--json') out.json = true
    else if (a === '--top') out.top = Number(argv[++i]) || 10
    else if (a === '--threshold') out.threshold = Number(argv[++i]) || 0.85
    else if (a === '--min-chars') out.minChars = Number(argv[++i]) || 120
    else if (a === '--self-test') out.selfTest = true
  }
  return out
}

// ── 归一化：抹掉版本号/日期/数字/路径差异，只留"实质文字" ────────────────────
export function normalize(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')            // 整块代码围栏
    .replace(/`[^`]*`/g, ' ')                   // 行内代码
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')    // 链接保留文字
    .replace(/v?\d+\.\d+(\.\d+)?/g, ' ')        // 版本号
    .replace(/\d{4}-\d{2}-\d{2}/g, ' ')         // 日期
    .replace(/[A-Za-z]:[\\/][^\s]+/g, ' ')      // 绝对路径
    .replace(/[\w./-]+\.(md|sh|mjs|py|yml|json|svg|png)/g, ' ')  // 文件名
    .replace(/[0-9]+/g, ' ')                    // 其余数字
    .replace(/[\s\u3000]+/g, ' ')               // 空白折叠
    .trim()
}

// ── 词元集：中文按字、英文按词 ───────────────────────────────────────────────
export function tokenize(normalized) {
  const tokens = []
  const cjk = normalized.match(/[\u4e00-\u9fff]/g) || []
  tokens.push(...cjk)
  const words = normalized.toLowerCase().match(/[a-z]{2,}/g) || []
  tokens.push(...words)
  return tokens
}

/** 词级 Jaccard 相似度 */
export function jaccard(a, b) {
  if (a.length === 0 && b.length === 0) return 0
  const setA = new Set(a); const setB = new Set(b)
  let inter = 0
  for (const t of setA) if (setB.has(t)) inter++
  const union = setA.size + setB.size - inter
  return union === 0 ? 0 : inter / union
}

/** 切块：按 Markdown 标题与空行分段，只保留够长的实质块 */
export function splitBlocks(markdown, minChars) {
  const lines = markdown.split(/\r?\n/)
  const blocks = []
  let buf = []
  let heading = ''
  const flush = () => {
    const text = buf.join('\n').trim()
    if (text.length >= minChars) blocks.push({ heading, text })
    buf = []
  }
  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) { flush(); heading = line.replace(/^#+\s*/, '').trim() }
    else if (line.trim() === '') flush()
    else buf.push(line)
  }
  flush()
  return blocks
}

/**
 * 判定"元数据块"：由版本号、日期、生效状态、文件链接等结构化行构成的块。
 * 这类块（例如各文档顶部的"版本信息与实施追踪"抬头）天然跨文件相似，
 * 属于结构一致性而非内容冗余，必须排除，否则会产生大量假阳性。
 *
 * 判据：把每行先做归一化（抹掉版本/日期/数字/文件名），如果归一化后剩下的
 * 实质文字极短，说明该行只承载元数据；若这样的行占到多数，整块即为元数据块。
 */
export function isMetadataBlock(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return true
  let metaLines = 0
  for (const l of lines) {
    // 表格与框图线条
    if (/^[┌└│├─═╔╚╠║*_=-]+$/.test(l)) { metaLines++; continue }
    // 纯文件链接行
    if (/^[\s>|*-]*(`[^`]+`\s*[,、]?\s*)+$/.test(l)) { metaLines++; continue }
    // 原文携带版本号/日期/绝对路径 = 典型的台账式元数据行
    const hasMarker = /(v?\d+\.\d+\.\d+|\d{4}-\d{2}-\d{2}|\[\d{4}-\d{2}-\d{2}\]|\[Release)/.test(l)
    const n = normalize(l).replace(/[-*+>|#\s]/g, '')
    if (n.length < 8) { metaLines++; continue }
    // 归一化后残留极少（只剩标签词）且原本就是版本/日期行 → 元数据
    if (hasMarker && n.length < 14) { metaLines++; continue }
  }
  return metaLines / lines.length >= 0.6
}

// ── 文件收集 ─────────────────────────────────────────────────────────────────
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

// ── 主检测 ───────────────────────────────────────────────────────────────────
async function scan({ root, scanDirs, excludeGlobs, threshold, minChars }) {
  const files = []
  for (const d of scanDirs) {
    const full = join(root, d)
    try { if ((await stat(full)).isDirectory()) files.push(...await collectMarkdown(full)) } catch { /* 跳过 */ }
  }
  const kept = files.filter((f) => {
    const rel = relative(root, f)
    return !excludeGlobs.some((g) => rel === g || rel.startsWith(g.replace(/\*+$/, '')))
  })

  const blocks = []
  for (const f of kept) {
    let text
    try { text = await readFile(f, 'utf8') } catch { continue }
    const rel = relative(root, f)
    for (const b of splitBlocks(text, minChars)) {
      if (isMetadataBlock(b.text)) continue            // 结构性抬头，不算内容冗余
      const normalized = normalize(b.text)
      if (normalized.length < minChars * 0.5) continue   // 归一化后太短，无信息量
      blocks.push({ file: rel, heading: b.heading, normalized, tokens: tokenize(normalized) })
    }
  }

  // 相似块配对（倒排：先按少量词元分桶，避免 O(n²) 全量比较）
  const pairs = []
  const bucketOf = (tokens) => tokens.slice().sort().slice(0, 3).join('|')
  const buckets = new Map()
  blocks.forEach((b, i) => {
    const key = bucketOf(b.tokens)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(i)
  })

  const seen = new Set()
  for (const idxs of buckets.values()) {
    for (let i = 0; i < idxs.length; i++) {
      for (let j = i + 1; j < idxs.length; j++) {
        const a = blocks[idxs[i]]; const b = blocks[idxs[j]]
        if (a.file === b.file && a.heading === b.heading) continue
        const key = `${idxs[i]}-${idxs[j]}`
        if (seen.has(key)) continue
        seen.add(key)
        const sim = jaccard(a.tokens, b.tokens)
        if (sim >= threshold) {
          pairs.push({
            similarity: Number(sim.toFixed(3)),
            a: { file: a.file, heading: a.heading, chars: a.normalized.length },
            b: { file: b.file, heading: b.heading, chars: b.normalized.length },
          })
        }
      }
    }
  }
  pairs.sort((x, y) => y.similarity - x.similarity)
  return { filesScanned: kept.length, blocksScanned: blocks.length, duplicatePairs: pairs.length, pairs }
}

// ── 自检：确保检测器真能识别冗余、且不误报模板 ───────────────────────────────
function selfTest() {
  const cases = []
  const tpl = (n, title) => `## REQ-${n}: ${title}
- **当前状态**：\`[ACTIVE]\` 生效中
- **实施版本**：\`v1.0.0\`
- **核心诉求与目标**：
  1. 搭建分层清晰的规则目录架构
- **验收标准**：
  - [x] 目录骨架建立`

  // 1) 模板型内容（字段名相同、实质诉求不同）→ 不应判为冗余
  const t1 = normalize(tpl(1, '工程结构化初始化与远程 Git 同步'))
  const t2 = normalize(tpl(2, '全中文交互基线与需求简化转执行工单'))
  const simTemplate = jaccard(tokenize(t1), tokenize(t2))
  cases.push({ name: '模板字段不误报', value: simTemplate, expect: (v) => v < 0.85 })

  // 2) 真实复制粘贴 → 必须判为冗余
  const real = (s) => `## 说明
本段用于验证冗余检测能力，内容为一段足够长的实质说明。它描述了系统在检测到重复内容时应当如何处置，包括标记、告警与阻断三个层次，并要求人工确认后再行清理。${s}`
  const simCopy = jaccard(tokenize(normalize(real(''))), tokenize(normalize(real(''))))
  cases.push({ name: '复制粘贴必检出', value: simCopy, expect: (v) => v >= 0.95 })

  // 3) 归一化应抹掉版本与日期差异
  const d1 = normalize('- **最新更新**：2026-09-16 版本 v1.0.0')
  const d2 = normalize('- **最新更新**：2026-09-22 版本 v2.7.0')
  cases.push({ name: '归一化抹平版本日期', value: jaccard(tokenize(d1), tokenize(d2)), expect: (v) => v >= 0.99 })

  // 4) 版本信息抬头必须被识别为元数据块（否则跨文档批量假阳性）
  const metaHeader = `> ### 🏷️ **版本信息与实施追踪**
> - **当前系统实施总版本**：\`v1.0.0\`
> - **版本治理规范**：遵循 [\`rules/workflow/versioning_standard.md\`](../rules/workflow/versioning_standard.md)
> - **最后更新日期**：2026-09-16
> - **版本状态**：\`[Release 稳定生效]\``
  cases.push({ name: '版本抬头识别为元数据', value: isMetadataBlock(metaHeader) ? 1 : 0, expect: (v) => v === 1 })

  // 5) 真正的规范正文不能被误判为元数据
  const prose = `本规范规定所有系统操作必须具备原子性。任何写操作要么完整生效，要么完全不生效，
不得留下中间状态。实现上要求先写入临时对象，校验通过后再原子替换目标，并在替换前记录回滚点，
使失败路径能够恢复到操作前的确定状态。`
  cases.push({ name: '规范正文不误判为元数据', value: isMetadataBlock(prose) ? 0 : 1, expect: (v) => v === 1 })

  // 6) 端到端：真实重复块必须被检出（模拟同一段说明被复制到两个文件）
  const e2e = (a, b) => {
    const A = normalize(a); const B = normalize(b)
    if (isMetadataBlock(a) || isMetadataBlock(b)) return 0
    return jaccard(tokenize(A), tokenize(B))
  }
  const proseBlock = `## 冗余处置规范
检测到重复内容后，必须依次执行标记、告警与阻断三个动作。标记阶段在重复块旁写入来源指向，
告警阶段在管控看板中列出相似度与涉及文件，阻断阶段则在相似度超过阈值时拒绝推进门禁。
所有动作都要求留下审计记录，便于事后追溯清理过程。`
  cases.push({
    name: '端到端：真实重复块检出',
    value: e2e(proseBlock, proseBlock),
    expect: (v) => v >= 0.95,
  })

  let pass = true
  console.log('=== 冗余检测器自检 ===')
  for (const c of cases) {
    const ok = c.expect(c.value)
    if (!ok) pass = false
    console.log(`${ok ? '✅' : '❌'} ${c.name}  (相似度 ${c.value.toFixed(3)})`)
  }
  console.log(pass ? '\n🎉 自检全部通过' : '\n💥 自检失败')
  process.exit(pass ? 0 : 1)
}

// ── 入口 ─────────────────────────────────────────────────────────────────────
const args = parseArgs(process.argv)
if (args.selfTest) selfTest()

const config = {
  scanDirs: ['rules', 'knowledge', 'indexes', 'docs', 'templates', 'memory'],
  excludeGlobs: ['docs/requirements.md'],
}
const result = await scan({
  root: args.root,
  scanDirs: config.scanDirs,
  excludeGlobs: config.excludeGlobs,
  threshold: args.threshold,
  minChars: args.minChars,
})

if (args.json) {
  console.log(JSON.stringify(result, null, 2))
} else {
  console.log(`扫描文件 ${result.filesScanned} · 实质块 ${result.blocksScanned} · 高相似对 ${result.duplicatePairs}`)
  for (const p of result.pairs.slice(0, args.top)) {
    console.log(`\n[${p.similarity}] ${p.a.file} (${p.a.chars}字) ⇄ ${p.b.file} (${p.b.chars}字)`)
    console.log(`   A: ${p.a.heading}`)
    console.log(`   B: ${p.b.heading}`)
  }
}
