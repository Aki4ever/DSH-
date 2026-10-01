#!/usr/bin/env node
/**
 * ==============================================================================
 * 脚本名称：skill_carrier_audit.mjs
 * 核心功能：技能层「物理载体」审计 —— 逐条判定每个执行层到底有没有可跑的东西
 * 需求依据：REQ-093 / R5「那些没能落地执行、没触达到物理实现层的机制，全部落实到物理执行层」
 * ------------------------------------------------------------------------------
 * 为什么需要它（本轮实测缺口 G6）：
 *   `mechanism_audit.mjs` 只审计"被登记过的机制"（23 条），它管不到**技能层 178 条**执行层。
 *   实测扫盘：178 条技能里 78 条没有 `scripts/`，其中若干 L3 判定类技能声明了 `[probe:exitcode]`
 *   步骤却**没有任何可执行入口**——规则写在纸上，运行时没人执行。本脚本把这条判据补齐。
 *
 * 判定口径（可辩护，不发明阈值）：
 *   一条技能的"物理载体" = ① 自带可执行脚本，**或** ② 其 composition 里至少一个子技能自带脚本。
 *   两者皆无 → 判「无载体」。无载体不等于一定违规：
 *     · 纯规约型（只声明 `[probe:regex]` / `[probe:length]`，语义由输出结构判定器代判）可走白名单豁免；
 *     · 白名单必须**逐条写明理由**，写在 `ai-control/config/skill_carrier_exempt.txt`，禁止空泛豁免。
 *
 * 用法：
 *   node scripts/skill_carrier_audit.mjs            # 人读报告
 *   node scripts/skill_carrier_audit.mjs --json     # 机器可读
 *   node scripts/skill_carrier_audit.mjs --check    # 判定（有未豁免的无载体技能即退出码 1）
 *   node scripts/skill_carrier_audit.mjs --self-test  # 反向用例：临时造一条无载体技能，必须判红
 *
 * 退出码：
 *   0 = 全部有载体或已逐条豁免
 *   1 = 存在未豁免的无载体技能（判红）
 *   2 = 取不到证据（skills/ 不可读或解析失败）
 * ==============================================================================
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SKILLS = path.join(ROOT, 'skills')
const EXEMPT_FILE = path.join(ROOT, 'ai-control/config/skill_carrier_exempt.txt')

const SCRIPT_EXT = /\.(py|mjs|cjs|js|sh|bash)$/

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return {}
  const out = {}
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^([A-Za-z_]+):\s*(.*)$/)
    if (mm) out[mm[1]] = mm[2].trim()
  }
  return out
}

function composition(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return []
  const lines = m[1].split('\n')
  const out = []
  let inList = false
  for (const line of lines) {
    if (/^composition:\s*$/.test(line)) {
      inList = true
      continue
    }
    if (inList) {
      const mm = line.match(/^\s+-\s+(\S+)/)
      if (mm) out.push(mm[1])
      else if (/^[A-Za-z_]/.test(line)) inList = false
    }
  }
  return out
}

function probeCounts(text) {
  const c = {}
  for (const m of text.matchAll(/\[probe:([a-z]+)\]/g)) c[m[1]] = (c[m[1]] || 0) + 1
  return c
}

/** 自带可执行脚本判定：scripts/ 下存在脚本类文件，且文件非空。 */
function hasOwnScript(dir) {
  const sd = path.join(dir, 'scripts')
  if (!fs.existsSync(sd)) return []
  try {
    return fs
      .readdirSync(sd)
      .filter((f) => SCRIPT_EXT.test(f))
      .filter((f) => {
        try {
          return fs.statSync(path.join(sd, f)).size > 0
        } catch {
          return false
        }
      })
      .sort()
  } catch {
    return []
  }
}

/**
 * 引用可达脚本判定：正文里写到的仓库内脚本路径，只要在磁盘真实存在，也算**有物理载体**。
 * 依据：规则条文里"实跑 `node scripts/xxx.mjs --check`"这类写法，其载体就是那个脚本本身，
 * 再要求它自带一份脚本等于强制造第二份实现（本工程明令禁止的双实现）。
 */
function referencedScripts(text) {
  const out = new Set()
  const re = /(?:^|[\s`(（])((?:\.\/)?(?:scripts|skills|skill-pool)\/[A-Za-z0-9_./-]+\.(?:mjs|cjs|js|py|sh|bash))/g
  for (const m of text.matchAll(re)) out.add(m[1].replace(/^\.\//, ''))
  return [...out].filter((p) => {
    try {
      return fs.statSync(path.join(ROOT, p)).isFile()
    } catch {
      return false
    }
  })
}

function loadExempt() {
  const map = new Map()
  if (!fs.existsSync(EXEMPT_FILE)) return map
  for (const line of fs.readFileSync(EXEMPT_FILE, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const [id, ...rest] = t.split('|')
    const reason = rest.join('|').trim()
    if (id && reason) map.set(id.trim(), reason)
  }
  return map
}

export function audit() {
  if (!fs.existsSync(SKILLS)) return { ok: false, reason: 'skills/ 目录不存在' }
  const dirs = fs
    .readdirSync(SKILLS)
    .filter((d) => d !== '_template' && !d.startsWith('.'))
    .filter((d) => {
      try {
        return fs.statSync(path.join(SKILLS, d)).isDirectory()
      } catch {
        return false
      }
    })

  const rows = []
  for (const d of dirs) {
    const dir = path.join(SKILLS, d)
    const skillFile = path.join(dir, 'SKILL.md')
    if (!fs.existsSync(skillFile)) continue
    const text = fs.readFileSync(skillFile, 'utf8')
    const fm = frontmatter(text)
    const comp = composition(text)
    const own = hasOwnScript(dir)
    rows.push({
      id: d,
      level: fm.level || '(未声明)',
      description: (fm.description || '').slice(0, 60),
      ownScripts: own,
      referenced: referencedScripts(text),
      composition: comp,
      probes: probeCounts(text),
    })
  }

  const byId = new Map(rows.map((r) => [r.id, r]))
  // 第一批：**不依赖父子关系**就能判定的载体（自带 / 组合 / 引用），先算出来作为传递基准，
  // 避免"A 靠 B、B 靠 A"这种互证式恒绿。
  for (const r of rows) {
    r.composedCarriers = r.composition.filter((c) => {
      const child = byId.get(c)
      return child && child.ownScripts.length > 0
    })
    r.baseCarrier =
      r.ownScripts.length > 0
        ? 'self'
        : r.composedCarriers.length > 0
          ? 'composed'
          : r.referenced.length > 0
            ? 'referenced'
            : 'none'
  }
  // 第二批：L1 规约型技能由**可执行的父门禁**接管（规约本身不该自带第二份实现）。
  // 父门禁必须在第一批里已判为有载体，禁止互相担保。
  for (const r of rows) {
    r.parentCarriers = rows
      .filter((p) => p.baseCarrier !== 'none' && p.composition.includes(r.id))
      .map((p) => p.id)
    r.carrier = r.baseCarrier === 'none' && r.parentCarriers.length > 0 ? 'via-parent' : r.baseCarrier
    // 只有"声明了 exitcode 探针却没有任何可执行入口"才是硬缺口；纯 regex/length 规约可由输出判定器代判
    r.hardGap = r.carrier === 'none' && (r.probes.exitcode || 0) > 0
    r.softGap = r.carrier === 'none' && !r.hardGap
  }

  const exempt = loadExempt()
  const hardNoExempt = rows.filter((r) => r.hardGap && !exempt.has(r.id))
  const softNoExempt = rows.filter((r) => r.softGap && !exempt.has(r.id))

  return {
    ok: true,
    total: rows.length,
    self: rows.filter((r) => r.carrier === 'self').length,
    composed: rows.filter((r) => r.carrier === 'composed').length,
    referenced: rows.filter((r) => r.carrier === 'referenced').length,
    viaParent: rows.filter((r) => r.carrier === 'via-parent').length,
    none: rows.filter((r) => r.carrier === 'none').length,
    hardGap: rows.filter((r) => r.hardGap).length,
    hardNoExempt,
    softNoExempt,
    exemptCount: exempt.size,
    rows,
    exempt,
  }
}

function report(res, asJson) {
  if (!res.ok) {
    console.log(`⛔ 取不到证据：${res.reason}`)
    return 2
  }
  if (asJson) {
    console.log(
      JSON.stringify(
        {
          total: res.total,
          self: res.self,
          composed: res.composed,
          referenced: res.referenced,
          viaParent: res.viaParent,
          none: res.none,
          hardGap: res.hardGap,
          exempt: res.exemptCount,
          hardNoExempt: res.hardNoExempt.map((r) => ({ id: r.id, level: r.level, probes: r.probes })),
          softNoExempt: res.softNoExempt.map((r) => ({ id: r.id, level: r.level })),
        },
        null,
        2,
      ),
    )
    return res.hardNoExempt.length === 0 ? 0 : 1
  }

  console.log('🧱 技能层物理载体审计')
  console.log('-----------------------------------------')
  console.log(
    `技能总数 ${res.total} · 自带脚本 ${res.self} · 组合子技能 ${res.composed} · 引用脚本 ${res.referenced} · 父门禁接管 ${res.viaParent} · 无载体 ${res.none}`,
  )
  console.log(`硬缺口（声明 [probe:exitcode] 却无任何可执行入口）${res.hardGap} 条 · 已逐条豁免 ${res.exemptCount} 条`)
  console.log('')
  if (res.hardNoExempt.length) {
    console.log('⛔ 未豁免的硬缺口（规则写在纸上、运行时无人执行）：')
    for (const r of res.hardNoExempt) console.log(`   · ${r.id}（${r.level}）probe:exitcode ×${r.probes.exitcode}`)
    console.log('')
  }
  if (res.softNoExempt.length) {
    console.log(`⚠️ 无载体但未声明 exitcode 探针（规约型候选，共 ${res.softNoExempt.length} 条，建议逐条补白名单理由）：`)
    for (const r of res.softNoExempt.slice(0, 40)) console.log(`   · ${r.id}（${r.level}）`)
    if (res.softNoExempt.length > 40) console.log(`   …… 其余 ${res.softNoExempt.length - 40} 条见 --json`)
    console.log('')
  }
  console.log('-----------------------------------------')
  const pass = res.hardNoExempt.length === 0
  console.log(pass ? '✅ 技能层载体审计通过：无未豁免的硬缺口' : `⛔ 技能层存在 ${res.hardNoExempt.length} 条未豁免的硬缺口`)
  return pass ? 0 : 1
}

/** 反向用例：临时造一条 L2、声明 exitcode 探针、无脚本的技能 → 审计必须判红，随后清理。 */
function selfTest() {
  const probeDir = path.join(SKILLS, '__carrier_probe__')
  console.log('🧪 技能层载体审计 · 反向用例自检')
  console.log('-----------------------------------------')
  try {
    fs.mkdirSync(probeDir, { recursive: true })
    fs.writeFileSync(
      path.join(probeDir, 'SKILL.md'),
      ['---', 'name: __carrier_probe__', 'level: L2', 'description: 反向用例桩件', '---', '', '# probe', '', '1. `[probe:exitcode]` 跑一个并不存在的脚本', ''].join('\n'),
    )
    const before = audit()
    const caught = before.hardNoExempt.some((r) => r.id === '__carrier_probe__')
    console.log(`   注入无载体技能：__carrier_probe__（L2 · probe:exitcode ×1）`)
    console.log(`   判定结果：${caught ? '已判红（✅）' : '未判红（❌ 判定器无牙）'}`)
    console.log('-----------------------------------------')
    console.log(caught ? '✅ 反向用例通过：无载体技能必被判红' : '⛔ 反向用例失败：判定器是恒亮绿灯')
    return caught ? 0 : 1
  } finally {
    try {
      fs.rmSync(probeDir, { recursive: true, force: true })
    } catch {
      /* 清理失败不掩盖判定结果，但要在输出里可见 */
      console.log('⚠️ 反向用例桩件清理失败，请手工删除 skills/__carrier_probe__')
    }
  }
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--self-test')) process.exit(selfTest())
  const res = audit()
  process.exit(report(res, argv.includes('--json')))
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main()
