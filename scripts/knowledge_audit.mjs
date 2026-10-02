#!/usr/bin/env node
// ==============================================================================
// 知识库条目与索引双向对拍判定器 (Knowledge Base Index Audit) —— REQ-097 / R3
// ------------------------------------------------------------------------------
// 用户原话：「推理过程必须遵循第一性原理；第一性原理纳入知识库中」。
//
// 实测病根（2026-10-02 只读取证）：
//   `knowledge/` 的登记与对拍**全靠人手维护的四张 Markdown 表格**，`scripts/` 下没有任何
//   knowledge 判定器（只有反空架子把它当被扫对象）。结果是实测就有一张规范卡
//   `execution_layer_interface_spec.md` 三处索引全无 —— 条目在磁盘上活着，却没有入口能找到它。
//   "进了知识库"这句话在物理上**无法被证伪**。
//
// 本判定器把"在不在知识库"变成可复跑的两条判据（只判收录与可达，不评判内容质量）：
//   判据一（硬）· 条目必须被索引：规范卡（`knowledge/common/*.md`）至少被三处索引之一引用
//                （`knowledge/common/README.md` 矩阵 / `knowledge/README.md` 拓扑 / `indexes/rules_index.md` 分层表）；
//                来源卡（`knowledge/sources/SOURCE-*.md`）必须出现在 `knowledge/sources/README.md` 登记表；
//   判据二（硬）· 索引必须可达：索引里写出的 `knowledge` 路径必须真实存在（悬空即判红，双向对拍）。
//   报告项 · 层内说明文档（各层 README）不参与判据一（它们是索引本身，不是被索引的条目）。
//
// 用法：
//   node scripts/knowledge_audit.mjs --check      # 判本工程知识库
//   node scripts/knowledge_audit.mjs --json
//   node scripts/knowledge_audit.mjs --selftest   # 反向用例：缺索引/悬空引用必须判红
//
// 退出码：0 两条判据全过 / 1 存在不达标 / 2 取不到证据（**2 绝不算通过**）
// ==============================================================================

import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 三处索引（判据一：任一命中即算已收录）。 */
export const INDEX_FILES = ['knowledge/README.md', 'knowledge/common/README.md', 'indexes/rules_index.md']

/**
 * 从一段文本里抽出所有 **Markdown 链接**目标（判据二只认链接）。
 * 为什么排除行内代码：实测 `knowledge/README.md` 的表格里大量用 `` `readability_specification.md` ``
 * 这样的**行内码当标签**（真正的路径在同行的链接列里），把标签当路径解析会一次误报 71 处——
 * 链接是"可点可达"的导航声明，行内码只是行文标签，二者必须分开。
 */
export function refsOf(text) {
  const out = new Set()
  for (const m of String(text).matchAll(/\]\(([^)\s]+\.md)\)/g)) out.add(m[1])
  return [...out]
}

/**
 * 双向对拍纯函数（便于反向用例直接调用）。
 * @param {{root:string, indexTexts:Record<string,string>}} ctx
 */
export function judge(ctx) {
  const root = ctx.root
  const idx = ctx.indexTexts || {}
  const checks = []
  const read = (rel) => (idx[rel] !== undefined ? idx[rel] : existsSync(join(root, rel)) ? readFileSync(join(root, rel), 'utf8') : null)

  // ── 判据一：条目必须被索引 ────────────────────────────────────────────────
  const commonDir = join(root, 'knowledge', 'common')
  const sourceDir = join(root, 'knowledge', 'sources')
  const commonCards = existsSync(commonDir)
    ? readdirSync(commonDir).filter((f) => f.endsWith('.md') && f !== 'README.md')
    : []
  const sourceCards = existsSync(sourceDir)
    ? readdirSync(sourceDir).filter((f) => /^SOURCE-.*\.md$/.test(f))
    : []

  const threeIndex = INDEX_FILES.map(read).filter(Boolean).join('\n')
  const sourceIndex = read('knowledge/sources/README.md') || ''

  const unindexed = []
  for (const f of commonCards) if (!threeIndex.includes(f)) unindexed.push(`knowledge/common/${f}`)
  for (const f of sourceCards) if (!sourceIndex.includes(f)) unindexed.push(`knowledge/sources/${f}`)

  checks.push({
    name: '判据一 · 条目必须被索引',
    ok: unindexed.length === 0,
    detail:
      unindexed.length === 0
        ? `规范卡 ${commonCards.length} 张 + 来源卡 ${sourceCards.length} 张全部被索引引用`
        : `${unindexed.length} 张条目在索引里找不到入口：${unindexed.join('、')}`,
  })

  // ── 判据二：索引里的路径必须可达 ──────────────────────────────────────────
  const dangling = []
  for (const rel of [...INDEX_FILES, 'knowledge/sources/README.md']) {
    const text = read(rel)
    if (!text) continue
    const base = dirname(join(root, rel))
    for (const raw of refsOf(text)) {
      if (/^https?:/i.test(raw)) continue
      const abs = join(base, raw)
      if (!abs.startsWith(root)) continue // 跳出工程的不算（外链/上级仓库）
      if (!existsSync(abs)) dangling.push(`${rel} → ${raw}`)
    }
  }
  const uniqDangling = [...new Set(dangling)]
  checks.push({
    name: '判据二 · 索引路径可达',
    ok: uniqDangling.length === 0,
    detail: uniqDangling.length === 0 ? '索引中的知识库引用全部可达' : `悬空 ${uniqDangling.length} 处：${uniqDangling.slice(0, 6).join(' · ')}`,
  })

  const failed = checks.filter((c) => !c.ok)
  return { ok: failed.length === 0, commonCards: commonCards.length, sourceCards: sourceCards.length, checks }
}

// ── 反向用例：造桩件，该红的必须判红 ─────────────────────────────────────────
function selfTest() {
  const dir = join(tmpdir(), `knowledge_audit_selftest_${process.pid}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(join(dir, 'knowledge', 'common'), { recursive: true })
  mkdirSync(join(dir, 'knowledge', 'sources'), { recursive: true })
  mkdirSync(join(dir, 'indexes'), { recursive: true })
  writeFileSync(join(dir, 'knowledge', 'common', 'card_a.md'), '# 卡 A\n')
  writeFileSync(join(dir, 'knowledge', 'common', 'README.md'), '# 矩阵\n| [`card_a.md`](card_a.md) |\n| [`ghost.md`](ghost.md) |\n')
  writeFileSync(join(dir, 'knowledge', 'README.md'), '# 拓扑\n')
  writeFileSync(join(dir, 'indexes', 'rules_index.md'), '# 索引\n')
  writeFileSync(join(dir, 'knowledge', 'sources', 'README.md'), '# 来源\n')
  writeFileSync(join(dir, 'knowledge', 'sources', 'SOURCE-001-x.md'), '# 源 1\n')

  const cases = []
  const good = judge({ root: dir })
  // 桩件里 ghost.md 悬空 → 判据二必须判红；card_a 已索引、SOURCE-001 未索引 → 判据一必须判红
  cases.push({ name: '反例①：来源卡未被索引 → 判红', value: good.checks[0].ok, expect: false })
  cases.push({ name: '反例②：索引悬空引用 → 判红', value: good.checks[1].ok, expect: false })

  // 修好后必须转绿
  writeFileSync(join(dir, 'knowledge', 'common', 'README.md'), '# 矩阵\n| [`card_a.md`](card_a.md) |\n')
  writeFileSync(join(dir, 'knowledge', 'sources', 'README.md'), '# 来源\n| [`SOURCE-001-x.md`](SOURCE-001-x.md) |\n')
  const fixed = judge({ root: dir })
  cases.push({ name: '正例：条目已索引且路径可达 → 判绿', value: fixed.ok, expect: true })

  // 再抽掉一张卡的索引 → 判据一必须重新判红
  writeFileSync(join(dir, 'knowledge', 'common', 'README.md'), '# 矩阵\n| 没了 |\n')
  const broken = judge({ root: dir })
  cases.push({ name: '反例③：规范卡丢了索引 → 判红', value: broken.checks[0].ok, expect: false })

  rmSync(dir, { recursive: true, force: true })

  let pass = 0
  console.log('=== 反向用例自检（知识库索引判定器）===')
  for (const c of cases) {
    const ok = c.value === c.expect
    if (ok) pass++
    console.log(`${ok ? '✅' : '❌'} ${c.name} → 实测 ${c.value ? '判绿' : '判红'}`)
  }
  console.log(`${pass}/${cases.length} 条用例通过`)
  return pass === cases.length ? 0 : 1
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--selftest')) return selfTest()
  if (!existsSync(join(ROOT, 'knowledge'))) {
    console.error('⛔ 取不到证据：本工程没有 knowledge/ 目录')
    return 2
  }
  const res = judge({ root: ROOT })
  if (argv.includes('--json')) {
    console.log(JSON.stringify(res, null, 2))
    return res.ok ? 0 : 1
  }
  console.log('📚 知识库条目与索引双向对拍')
  console.log('-----------------------------------------')
  for (const c of res.checks) console.log(`${c.ok ? '✅' : '❌'} ${c.name}：${c.detail}`)
  console.log('-----------------------------------------')
  console.log(res.ok ? '✅ 通过：条目都有入口、索引都指向真实文件' : '⛔ 不通过：见上述命中项')
  return res.ok ? 0 : 1
}

if (process.argv[1] && process.argv[1].endsWith('knowledge_audit.mjs')) {
  process.exit(main())
}
