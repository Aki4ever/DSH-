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
/**
 * 为一个块生成倒排桶键。**采样必须只由内容决定，不能由位置决定。**
 *
 * 踩过的坑（两次实测失败，务必不要改回位置采样）：
 *   ① 等步长采样：前置 8 个字 ⇒ 采样点整体错位，两块 trigram 交集为 0；
 *   ② 固定互质步长遍历：实测仍全不同 —— 步长与文本长度耦合，偏移照样错开。
 * 正解：对全部 trigram 求哈希后**排序取前 N**。哈希分布不随位置平移而变，
 * 因此"一个块是另一个块的超集"时（加前缀/后缀、改名、换目录），两者必然共享大量采样点。
 */
export function bucketKeysOf(text) {
  const s = String(text)
  const n = s.length
  if (n < 3) return []
  const hash = (g) => {
    let hv = 2166136261
    for (let i = 0; i < g.length; i++) {
      hv ^= g.charCodeAt(i)
      hv = Math.imul(hv, 16777619)
    }
    return (hv >>> 0).toString(36)
  }
  const seenGram = new Set()
  const pool = []
  for (let i = 0; i + 3 <= n; i++) {
    const g = s.slice(i, i + 3)
    if (seenGram.has(g)) continue
    seenGram.add(g)
    pool.push([hash(g), g])
  }
  pool.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0))
  return pool.slice(0, 24).map(([h]) => 'g:' + h)
}

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

  // 相似块配对（倒排分桶，避免 O(n²) 全量比较）
  // 分桶键生成见模块级 bucketKeysOf（那里记录了"位置采样导致漏检"的两次踩坑）
  const buckets = new Map()
  blocks.forEach((b, i) => {
    for (const key of bucketKeysOf(b.normalized)) {
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(i)
    }
  })

  const pairs = []
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

  // "空虚下限"：有文件却零实质块 = **不可判定**，不是"健康"。
  // 历史缺陷：清空全库正文后仍判 4/4 通过 —— 只看"配对数为 0"，
  // 而"什么都没扫到"与"扫到且都不重复"给出了同一个 0。二者必须分开。
  const unknowable = kept.length > 0 && blocks.length === 0
  return {
    filesScanned: kept.length,
    blocksScanned: blocks.length,
    duplicatePairs: pairs.length,
    pairs,
    unknowable,
    unknowableReason: unknowable
      ? `扫描到 ${kept.length} 个 Markdown 文件，但零实质块（全部低于 minChars=${minChars} 或被判为元数据块）——无依据判定冗余是否健康`
      : null,
  }
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

  // 7) 分桶召回：**前置若干字不得导致漏检**（防回归关键用例）
  //    历史缺陷：桶键取「词元排序后前 3 个」，前置 7 个字即改变桶键 →
  //    同一内容落入不同桶 → 永不被比较。实测 4 块场景漏检 1 块（漏检率 100%）。
  //    本用例锁死该行为：加前缀后必须仍共享桶键，且相似度仍超阈值。
  const prefixKey = '注意这里前面多出七个字'
  const keysBase = bucketKeysOf(normalize(proseBlock))
  const keysPrefixed = bucketKeysOf(normalize(prefixKey + proseBlock))
  const shared = keysBase.filter((k) => keysPrefixed.includes(k)).length
  cases.push({
    name: '分桶召回：前置文字后仍共享桶键',
    value: shared,
    expect: (v) => v > 0,
  })
  cases.push({
    name: '分桶召回：前置文字后相似度仍超阈值',
    value: e2e(prefixKey + proseBlock, proseBlock),
    expect: (v) => v >= 0.85,
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
  if (result.unknowable) {
    console.log(`\n⚠️ 不可判定：${result.unknowableReason}`)
    console.log('   处置：确认扫描范围是否正确、minChars 阈值是否过高。')
    console.log('   ⚠️ 本结果**不得**被视为"冗余健康"。')
  }
}

// 退出码约定：0 = 已判定且健康；2 = 不可判定（有文件但零实质块）；
//             1 = 检出高相似对（超过 G4_DUP_PAIRS 由门禁内核判定）
if (result.unknowable) process.exit(2)
process.exit(0)
