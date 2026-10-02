#!/usr/bin/env node
// ==============================================================================
// 需求登记入口与溯源判定器 (Requirement Intake & Provenance Audit) —— REQ-097 / R1
// ------------------------------------------------------------------------------
// 用户原话：「所有需求必须都从需求文档发起，如果有新需求就先把需求整理好再同步到需求文档，
//            需求文档每次更新都必须更新版本号」。
//
// 实测病根（2026-10-02 只读取证）：
//   `scripts/` 下只有需求版本的**生成器**（req_version_gen）与**判定器**（req_version_audit），
//   **没有任何登记入口** —— 于是「先整理、再登记、必升版」只能靠人手改 Markdown，
//   漏一步没人知道。规则有文字、没有载体，就等于没有。
//
// 本脚本只做两件机械事（内容好不好由人判断，机器只守形状）：
//   一、`--add`：分配下一个 REQ 编号 → 查重提示 → 追加结构化卡片 → 台账总版本 PATCH +1
//                → 写入「本次递增说明」→ 读回校验（写后必读回，不靠自称）；
//   二、`--check`：判据四条，任一条不达标即判红（退出码 1）：
//        ① 台账头部有总版本号与「本次递增说明」；
//        ② 台账相对上次提交有改动时，总版本号必须**变大**（不许原地踏步）；
//        ③ 每条 REQ 条目必须有「实施版本」字段，且编号唯一、递增；
//        ④ 条目里声明的「需求文案」指针必须真实存在（反空架子）。
//
// 用法：
//   node scripts/req_new.mjs --check                  # 判定四条判据（接入门禁用）
//   node scripts/req_new.mjs --selftest               # 反向用例：造坏数据必须判红
//   node scripts/req_new.mjs --next                   # 只报下一个可用编号
//   node scripts/req_new.mjs --add --title "标题" [--spec docs/xxx.md] [--dry-run]
//   node scripts/req_new.mjs --json
//
// 退出码：0 通过 / 1 不通过 / 2 取不到证据（**2 绝不算通过**）
// ==============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const LEDGER = join(ROOT, 'docs', 'requirements.md')
const LEDGER_REL = 'docs/requirements.md'

// ── 小工具：版本号解析与比较（只认三段式 vX.Y.Z） ──────────────────────────────
export function parseVersion(v) {
  const m = String(v || '').match(/^v(\d+)\.(\d+)\.(\d+)$/)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

export function compareVersion(a, b) {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  if (!pa || !pb) return null
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1
  }
  return 0
}

export function bumpPatch(v) {
  const p = parseVersion(v)
  if (!p) return null
  return `v${p[0]}.${p[1]}.${p[2] + 1}`
}

/** 台账头部声明的实施总版本号。 */
export function parseTotalVersion(text) {
  const m = String(text).match(/当前系统实施总版本[^\n]*?`(v\d+\.\d+\.\d+)`/)
  return m ? m[1] : null
}

/** 抽取全部 `### REQ-xxx: 标题` 条目（含正文，供逐条判字段）。 */
export function extractEntries(text) {
  const src = String(text)
  const re = /^###\s+(REQ-\d+)\s*[:：]\s*(.+)$/gm
  const marks = []
  let m
  while ((m = re.exec(src)) !== null) marks.push({ id: m[1], title: m[2].trim(), at: m.index })
  return marks.map((mk, i) => ({
    id: mk.id,
    title: mk.title,
    body: src.slice(mk.at, i + 1 < marks.length ? marks[i + 1].at : src.length),
  }))
}

/** 条目正文里的「需求文案」指针路径（行内代码或 Markdown 链接均可）。 */
export function specPointersOf(body) {
  const out = new Set()
  for (const line of String(body).split('\n')) {
    if (!/需求文案|需求文稿/.test(line)) continue
    for (const mm of line.matchAll(/`(docs\/[^`]+\.md)`/g)) out.add(mm[1])
    for (const mm of line.matchAll(/\]\((?:\.\/)?(docs\/[^)]+\.md)\)/g)) out.add(mm[1])
  }
  return [...out]
}

/**
 * 四条判据的核心（纯函数，便于反向用例直接调用）。
 * @param {{ledgerText:string, headText:string|null, changed:boolean, fileExists:(p:string)=>boolean}} ctx
 */
export function judgeLedger(ctx) {
  const ledgerText = ctx.ledgerText || ''
  const checks = []

  const total = parseTotalVersion(ledgerText)
  checks.push({
    name: '头部版本号在位',
    ok: Boolean(total),
    detail: total ? `总版本 ${total}` : '台账头部没有「当前系统实施总版本」',
  })

  const hasBumpNote = /本次\s*(PATCH|MINOR|MAJOR)\s*递增说明/.test(ledgerText)
  checks.push({
    name: '本次递增说明在位',
    ok: hasBumpNote,
    detail: hasBumpNote ? '已写「本次递增说明」' : '台账头部缺「本次 PATCH 递增说明」这一段',
  })

  if (ctx.changed && ctx.headText) {
    const headTotal = parseTotalVersion(ctx.headText)
    const cmp = headTotal && total ? compareVersion(total, headTotal) : null
    checks.push({
      name: '改动必升版本',
      ok: cmp === 1,
      detail:
        cmp === null
          ? `版本号取不到或不合法（本次 ${total} / 上次 ${headTotal}）`
          : cmp === 1
            ? `版本已递增：${headTotal} → ${total}`
            : `版本未递增：上次 ${headTotal} → 本次 ${total}（改了台账就必须升版）`,
    })
  } else {
    checks.push({
      name: '改动必升版本',
      ok: true,
      detail: '台账相对上次提交无改动，本判据跳过（不冒充通过）',
      skipped: true,
    })
  }

  const entries = extractEntries(ledgerText)
  const noVersion = entries.filter((e) => !/^-\s+\*\*实施版本\*\*\s*[:：]/m.test(e.body))
  checks.push({
    name: '条目实施版本齐备',
    ok: entries.length > 0 && noVersion.length === 0,
    detail:
      entries.length === 0
        ? '一条 REQ 条目都抽不到'
        : noVersion.length === 0
          ? `${entries.length} 条条目全部带实施版本`
          : `${noVersion.length} 条缺实施版本：${noVersion.map((e) => e.id).join('、')}`,
  })

  const ids = entries.map((e) => e.id)
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i)
  const nums = ids.map((id) => Number(id.replace('REQ-', '')))
  const ascending = nums.every((n, i) => i === 0 || n > nums[i - 1])
  checks.push({
    name: '编号唯一且递增',
    ok: dup.length === 0 && ascending,
    detail:
      dup.length > 0
        ? `编号重复：${[...new Set(dup)].join('、')}`
        : ascending
          ? `${ids.length} 条编号唯一且递增`
          : '编号未按从小到大排列（有跳序或倒序）',
  })

  const dangling = []
  const exists = typeof ctx.fileExists === 'function' ? ctx.fileExists : () => true
  for (const e of entries) {
    for (const p of specPointersOf(e.body)) {
      if (!exists(p)) dangling.push(`${e.id} → ${p}`)
    }
  }
  checks.push({
    name: '需求文案指针可达',
    ok: dangling.length === 0,
    detail: dangling.length === 0 ? '无悬空指针' : `悬空指针：${dangling.join(' · ')}`,
  })

  const failed = checks.filter((c) => !c.ok)
  return { ok: failed.length === 0, totalVersion: total, entryCount: entries.length, checks }
}

// ── 查重提示（不阻断，除非标题完全重复）：按两字切片算重合度 ──────────────────
function bigrams(s) {
  const t = String(s).replace(/[\s，。、：:（）()「」【】]/g, '')
  const out = new Set()
  for (let i = 0; i + 1 < t.length; i++) out.add(t.slice(i, i + 2))
  return out
}

export function findSimilar(title, entries) {
  const a = bigrams(title)
  if (a.size === 0) return []
  return entries
    .map((e) => {
      const b = bigrams(e.title)
      let hit = 0
      for (const g of a) if (b.has(g)) hit++
      return { id: e.id, title: e.title, score: Math.round((hit / a.size) * 100) }
    })
    .filter((x) => x.score >= 40)
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
}

// ── 台账卡片渲染 ──────────────────────────────────────────────────────────────
export function renderCard({ id, title, version, spec, session }) {
  const today = new Date().toISOString().slice(0, 10)
  const lines = [
    '',
    '---',
    '',
    `### ${id}: ${title}`,
    '> ### 🏷️ **资产元数据与生命周期标记**',
    '> - **文档类型 (Doc Type)**: `[REQUIREMENT 业务需求台账]`',
    '> - **清理定位 (Retention)**: `[PERSISTENT 长期受管]`',
    `> - **生成会话**: \`${session || '未登记'}\``,
    '> - **到期/清理条件**: `[随版本演进]`',
    '',
    '- **当前状态**：`[ACTIVE]` 需求已登记，按验收标准逐步落地',
    `- **实施版本**：\`${version}\`（PATCH 递增：新增需求条目与其判定入口，向下兼容）`,
    '- **需求版本**：`v1.0.0`',
    `- **提出时间**：${today}`,
    `- **最新更新**：${today}`,
    '- **责任归属**：用户（提出与授权判定） / AI 智能体（取证、分裂与实施）',
  ]
  if (spec) lines.push(`- **需求文案**：[\`${spec}\`](${spec.replace(/^docs\//, '')})（唯一权威出处，本条目只放指针不复述细则）`)
  lines.push(
    '',
    '#### 1. 核心诉求与目标',
    '',
    '1. **待补**：由需求文案给出「改什么、判据是什么、怎么复跑」；',
    '',
    '#### 2. 验收标准',
    '',
    '- [ ] 待补：验收标准必须逐条对应可跑命令与期望退出码。',
    '',
  )
  return lines.join('\n')
}

// ── 实跑：git 对拍与文件读回 ──────────────────────────────────────────────────
function git(args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
  return { code: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() }
}

function headLedgerText() {
  const r = git(['show', `HEAD:${LEDGER_REL}`])
  return r.code === 0 && r.stdout ? r.stdout : null
}

function ledgerChanged() {
  const r = git(['status', '--porcelain', '--', LEDGER_REL])
  return r.code === 0 && r.stdout.length > 0
}

function runCheck(json) {
  const repo = git(['rev-parse', '--is-inside-work-tree'])
  if (repo.code !== 0) {
    console.error('取不到证据：当前目录不是 Git 仓库，判据②无法对拍（按未达标处理）')
    return 2
  }
  if (!existsSync(LEDGER)) {
    console.error(`取不到证据：找不到 ${LEDGER_REL}`)
    return 2
  }
  const ledgerText = readFileSync(LEDGER, 'utf8')
  const ctx = {
    ledgerText,
    headText: headLedgerText(),
    changed: ledgerChanged(),
    fileExists: (p) => existsSync(join(ROOT, p)),
  }
  const res = judgeLedger(ctx)
  if (json) {
    console.log(JSON.stringify(res, null, 2))
  } else {
    console.log('=== 需求溯源判定（REQ-097 / R1）===')
    for (const c of res.checks) {
      console.log(`${c.ok ? '✅' : '❌'} ${c.name}：${c.detail}`)
    }
    console.log(res.ok ? `✅ 四条判据通过（条目 ${res.entryCount} 条 · 总版本 ${res.totalVersion}）` : '❌ 存在不达标项，需修复后再提交')
  }
  return res.ok ? 0 : 1
}

function runNext() {
  const entries = extractEntries(readFileSync(LEDGER, 'utf8'))
  const max = entries.reduce((acc, e) => Math.max(acc, Number(e.id.replace('REQ-', ''))), 0)
  const next = `REQ-${String(max + 1).padStart(3, '0')}`
  console.log(next)
  return 0
}

function runAdd(args) {
  const title = args.title
  if (!title) {
    console.error('用法：node scripts/req_new.mjs --add --title "需求标题" [--spec docs/xxx.md] [--dry-run]')
    return 2
  }
  const ledgerText = readFileSync(LEDGER, 'utf8')
  const total = parseTotalVersion(ledgerText)
  if (!total) {
    console.error('❌ 台账头部取不到总版本号，拒绝写入（宁可不写，也不写坏）')
    return 1
  }
  const entries = extractEntries(ledgerText)
  for (const e of entries) {
    if (e.title === title) {
      console.error(`❌ 查重拦截：${e.id} 已存在同名标题，请改标题或改为在原条目追加演进记录`)
      return 1
    }
  }
  const similar = findSimilar(title, entries)
  if (similar.length > 0) {
    console.log('⚠️ 查重提示（相似度 ≥ 40%，请确认是「增量演进」还是「全新诉求」）：')
    for (const s of similar) console.log(`   · ${s.id}（${s.score}%）${s.title}`)
  }
  const max = entries.reduce((acc, e) => Math.max(acc, Number(e.id.replace('REQ-', ''))), 0)
  const id = `REQ-${String(max + 1).padStart(3, '0')}`
  const newVersion = bumpPatch(total)
  const card = renderCard({ id, title, version: newVersion, spec: args.spec, session: process.env.DSH_SESSION_TITLE })
  if (args.dryRun) {
    console.log(`— dry-run：将新增 ${id}，总版本 ${total} → ${newVersion} —`)
    console.log(card)
    return 0
  }
  // 头部：总版本 + 本次递增说明（旧「本次」降级为「上一次」）
  let out = ledgerText.replace(/(当前系统实施总版本\*\*：`)v\d+\.\d+\.\d+(`)/, `$1${newVersion}$2`)
  if (out === ledgerText) {
    console.error('❌ 未能改写总版本号（头部格式与预期不符），已中止，未写入任何内容')
    return 1
  }
  const note = `> - **本次 PATCH 递增说明**：\`${total} → ${newVersion}\`，依据 ${id}（${title}）；属规则细化 + 只读判定器与知识库条目接入（向下兼容），故不启用 REQ-093 预留的 \`v4.30.0\`。`
  // 抬头只保留「本次 + 上一次」两段：旧「本次」降级为「上一次」，旧「上一次」整块移除（含缩进续行）。
  // 注意缺陷教训（首次实跑暴露）：只替换标签后半句会留下续行，且旧行自带的 `> ` 会与新行的 `> - ` 叠成 `> > -`。
  const noteRe = /^> - \*\*本次 (?:PATCH|MINOR|MAJOR) 递增说明\*\*：[^\n]*(?:\n> {2,}[^\n]*)*/m
  const prevRe = /^> - \*\*上一次 (?:PATCH|MINOR|MAJOR) 递增说明\*\*：[^\n]*(?:\n> {2,}[^\n]*)*\n?/m
  const old = out.match(noteRe)
  if (old) {
    const oldFirst = old[0].split('\n')[0].replace(/^> - \*\*本次 (?:PATCH|MINOR|MAJOR) 递增说明\*\*：/, '').trim()
    out = out.replace(prevRe, '')
    out = out.replace(noteRe, `${note}\n> - **上一次 PATCH 递增说明**：${oldFirst}`)
  } else {
    out = out.replace(/(- \*\*版本治理规范\*\*[^\n]*\n)/, `$1${note}\n`)
  }
  out = out.replace(/\s*$/, '\n') + card
  writeFileSync(LEDGER, out, 'utf8')

  // 写后读回：确认磁盘真的写进去了（不靠自称）
  const back = readFileSync(LEDGER, 'utf8')
  const okCard = back.includes(`### ${id}: ${title}`)
  const okVer = parseTotalVersion(back) === newVersion
  if (!okCard || !okVer) {
    console.error(`❌ 读回校验失败（卡片 ${okCard ? '在位' : '缺失'} · 版本 ${okVer ? '已更新' : '未更新'}）`)
    return 1
  }
  console.log(`✅ 已登记 ${id}（总版本 ${total} → ${newVersion}），读回校验通过`)
  console.log('   下一步：node scripts/align_version.mjs   # 全库受管文档版本归位')
  console.log('   再复跑：node scripts/req_new.mjs --check')
  return 0
}

// ── 反向用例：造坏数据，四条判据都必须能判红 ──────────────────────────────────
function runSelftest() {
  const HEAD = (v) =>
    '# 台账\n> - **当前系统实施总版本**：`' + v + '`\n> - **本次 PATCH 递增说明**：说明一段\n\n' +
    '### REQ-001: 甲\n- **实施版本**：`' + v + '`\n- **需求文案**：[`docs/a.md`](a.md)\n\n' +
    '### REQ-002: 乙\n- **实施版本**：`' + v + '`\n'
  const cases = [
    { name: '正例：字段齐备且版本递增', ledgerText: HEAD('v1.2.3'), headText: HEAD('v1.2.2'), changed: true, fileExists: () => true, expect: true },
    { name: '反例①：台账改了但版本没动', ledgerText: HEAD('v1.2.3'), headText: HEAD('v1.2.3'), changed: true, fileExists: () => true, expect: false },
    { name: '反例②：版本号倒退', ledgerText: HEAD('v1.2.3'), headText: HEAD('v1.2.4'), changed: true, fileExists: () => true, expect: false },
    {
      name: '反例③：条目缺实施版本',
      ledgerText: '# 台账\n> - **当前系统实施总版本**：`v1.2.3`\n> - **本次 PATCH 递增说明**：说明一段\n\n### REQ-001: 甲\n- **需求文案**：[`docs/a.md`](a.md)\n',
      headText: HEAD('v1.2.2'),
      changed: true,
      fileExists: () => true,
      expect: false,
    },
    { name: '反例④：需求文案指针悬空', ledgerText: HEAD('v1.2.3'), headText: HEAD('v1.2.2'), changed: true, fileExists: () => false, expect: false },
    {
      name: '反例⑤：编号重复且倒序',
      ledgerText: HEAD('v1.2.3') + '\n### REQ-002: 丙\n- **实施版本**：`v1.2.3`\n',
      headText: HEAD('v1.2.2'),
      changed: true,
      fileExists: () => true,
      expect: false,
    },
    {
      name: '反例⑥：缺「本次递增说明」',
      ledgerText: HEAD('v1.2.3').replace(/> - \*\*本次 PATCH 递增说明\*\*：[^\n]*\n/, ''),
      headText: HEAD('v1.2.2'),
      changed: true,
      fileExists: () => true,
      expect: false,
    },
    { name: '正例：台账未改动时跳过版本递增判据', ledgerText: HEAD('v1.2.3'), headText: HEAD('v1.2.3'), changed: false, fileExists: () => true, expect: true },
  ]
  let pass = 0
  console.log('=== 反向用例自检（需求溯源判定器）===')
  for (const c of cases) {
    const res = judgeLedger({ ledgerText: c.ledgerText, headText: c.headText, changed: c.changed, fileExists: c.fileExists })
    const ok = res.ok === c.expect
    if (ok) pass++
    const bad = res.checks.filter((x) => !x.ok).map((x) => x.name)
    console.log(`${ok ? '✅' : '❌'} ${c.name} → 判定 ${res.ok ? '通过' : '不通过'}${bad.length ? '（命中：' + bad.join('、') + '）' : ''}`)
  }
  console.log(`${pass}/${cases.length} 条用例通过`)
  return pass === cases.length ? 0 : 1
}

// ── 命令行解析 ────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { mode: 'check', json: false, dryRun: false }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--check') out.mode = 'check'
    else if (a === '--selftest') out.mode = 'selftest'
    else if (a === '--next') out.mode = 'next'
    else if (a === '--add') out.mode = 'add'
    else if (a === '--json') out.json = true
    else if (a === '--dry-run') out.dryRun = true
    else if (a === '--title') out.title = argv[++i]
    else if (a === '--spec') out.spec = argv[++i]
    else if (a === '--help' || a === '-h') out.mode = 'help'
  }
  return out
}

function main() {
  const args = parseArgs(process.argv)
  if (args.mode === 'help') {
    console.log('用法：node scripts/req_new.mjs [--check|--selftest|--next|--add --title "标题" [--spec docs/x.md] [--dry-run]] [--json]')
    return 0
  }
  if (args.mode === 'selftest') return runSelftest()
  if (args.mode === 'next') return runNext()
  if (args.mode === 'add') return runAdd(args)
  return runCheck(args.json)
}

if (process.argv[1] && process.argv[1].endsWith('req_new.mjs')) {
  process.exit(main())
}
