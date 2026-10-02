#!/usr/bin/env node
/**
 * ==============================================================================
 * 技能池 · 归位与索引同步脚本 (restore_skill_pool.mjs)
 * ==============================================================================
 * 解决的问题（2026-09-28 实测根因）：
 *   Skill池 通过**子树合并**进了本仓库，但落点是 `skill-pool/skills/`。
 *   而 DSH 技能面板只扫描项目根目录下的固定路径（`<projectRoot>/skills`），
 *   于是 178 个技能**在磁盘上存在、在面板里为 0** ——
 *   用户看到的是"100 多个技能都不见了"。
 *
 *   物理事实（三条独立证据）：
 *     ① `ls skill-pool/skills | wc -l` → 178，且每个目录都有 `SKILL.md`；
 *     ② 技能面板数据源 `@michengai/dsh-skills-manager` 的 PROJECT_SOURCES
 *        只含 `.dsh / .agents / skills / .codex / …`，**不含 skill-pool**；
 *     ③ 本仓 `indexes/` 全库无一处提及 skill-pool —— 索引层完全没收录。
 *
 * 本脚本做三件事（幂等、可校验、可回退）：
 *   1) 把 `skill-pool/skills/*` 归位到 `<root>/skills/*`（唯一权威源）；
 *   2) 校验归位完整性（数量 + 逐文件字节比对），不一致就**拒绝删除源目录**；
 *   3) 生成机器可读清单 `skills/.skill-pool-manifest.json`，供索引层同步消费。
 *
 * 用法：
 *   node scripts/restore_skill_pool.mjs --check    # 只体检：源/目标/索引三层现状
 *   node scripts/restore_skill_pool.mjs --apply    # 归位 + 校验 + 清理源目录
 *   node scripts/restore_skill_pool.mjs --apply --keep-source   # 归位但保留源目录
 * ==============================================================================
 */

import { existsSync, readdirSync, statSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, lstatSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
// 备份留存策略（REQ-096 同批）：本脚本覆盖技能目录前会先备份，旧版**只备份不清理**，
// 反复归位就会在 skills/ 下堆出一串同名备份。备份完就地按统一口径收敛到最新 3 份。
import { pruneBackups } from './lib/backup_retention.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'skill-pool', 'skills')
const DST = join(ROOT, 'skills')
const MANIFEST = join(DST, '.skill-pool-manifest.json')

/** 列出一个目录下的技能包（含 SKILL.md 的子目录）与其文件清单。 */
function scanSkills(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name)
    try { if (!lstatSync(p).isDirectory()) continue } catch { continue }
    if (name.startsWith('.')) continue          // 隐藏/元数据目录不算技能
    if (name === '_template') continue          // 脚手架模板不是技能（CLI 同样排除，保证口径一致）
    if (!existsSync(join(p, 'SKILL.md'))) continue
    out.push({ name, path: p })
  }
  return out
}

/** 递归列出目录内全部相对文件路径。 */
function listFiles(dir, base = dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) listFiles(p, base, acc)
    else acc.push(p.slice(base.length + 1))
  }
  return acc.sort()
}

/** 逐文件字节比对，返回不一致清单（空 = 完全一致）。 */
function diffDirs(a, b) {
  const fa = listFiles(a)
  const fb = existsSync(b) ? listFiles(b) : []
  const bad = []
  if (fa.length !== fb.length) bad.push(`文件数不同：源 ${fa.length} / 目标 ${fb.length}`)
  for (const rel of fa) {
    const pb = join(b, rel)
    if (!existsSync(pb)) { bad.push(`缺少：${rel}`); continue }
    if (!readFileSync(join(a, rel)).equals(readFileSync(pb))) bad.push(`内容不同：${rel}`)
  }
  return bad
}

function check() {
  const src = scanSkills(SRC)
  const dst = scanSkills(DST)
  const srcNames = new Set(src.map((s) => s.name))
  const dstNames = new Set(dst.map((s) => s.name))
  const missing = [...srcNames].filter((n) => !dstNames.has(n))
  const indexHits = existsSync(join(ROOT, 'indexes'))
    ? readdirSync(join(ROOT, 'indexes')).filter((f) => readFileSync(join(ROOT, 'indexes', f), 'utf8').includes('skill-pool'))
    : []

  console.log('🧰 技能池归位体检')
  console.log('-----------------------------------------')
  console.log(`源目录   skill-pool/skills : ${src.length} 个技能 ${existsSync(SRC) ? '' : '（不存在）'}`)
  console.log(`目标目录 skills/          : ${dst.length} 个技能 ${existsSync(DST) ? '' : '（不存在）'}`)
  console.log(`未归位   : ${missing.length ? missing.slice(0, 8).join('、') + (missing.length > 8 ? ` …共 ${missing.length} 个` : '') : '无'}`)
  console.log(`索引层收录 skill-pool 的索引文件 : ${indexHits.length ? indexHits.join('、') : '⛔ 无（索引层完全未收录）'}`)
  console.log(`执行层入索引覆盖率 : ${(() => {
    try {
      execFileSync('node', [join(__dirname, 'build_capabilities_index.mjs'), '--check'], { stdio: 'pipe' })
      return '✅ 全部已收录（check 退出码 0）'
    } catch { return '⛔ 未达标（跑 build_capabilities_index.mjs --apply）' }
  })()}`)
  console.log(`清单文件 : ${existsSync(MANIFEST) ? '存在' : '缺失（跑 --apply 生成）'}`)
  console.log('-----------------------------------------')
  // 归位已完成的标准：源目录已清空 + 目标非空 + 索引已收录。
  // 注意不再要求"源非空"——源被清理正是归位成功的证据，不是失败。
  const inPlace = src.length === 0 && dst.length > 0
  return inPlace && indexHits.length > 0
}

function apply(keepSource) {
  const src = scanSkills(SRC)
  if (src.length === 0) {
    console.error('❌ 源目录没有可归位的技能包：' + SRC)
    process.exit(1)
  }
  mkdirSync(DST, { recursive: true })

  let copied = 0
  let already = 0
  for (const skill of src) {
    const target = join(DST, skill.name)
    if (existsSync(target)) {
      const diff = diffDirs(skill.path, target)
      if (diff.length === 0) { already++; continue }
      // 目标已存在且内容不同：不静默覆盖，先备份再覆盖，并记录
      const bak = `${target}.bak-${Date.now()}`
      rmSync(bak, { recursive: true, force: true })
      cpSync(target, bak, { recursive: true })
      cpSync(skill.path, target, { recursive: true })
      // 技能备份是**目录**（不是文件），留存口径同样适用：只留最新 3 份，更旧的整棵删掉
      pruneBackups(target, 3)
      console.log(`♻️ ${skill.name}：目标已存在且内容不同 → 已备份为 ${bak.split('/').pop()} 后覆盖`)
      copied++
      continue
    }
    cpSync(skill.path, target, { recursive: true })
    copied++
  }

  // ── 完整性校验：源与目标必须逐文件字节一致，否则**拒绝删除源** ─────────────
  const dst = scanSkills(DST)
  const dstNames = new Set(dst.map((s) => s.name))
  const missing = src.filter((s) => !dstNames.has(s.name)).map((s) => s.name)
  const mismatched = []
  for (const s of src) {
    if (!dstNames.has(s.name)) continue
    const diff = diffDirs(s.path, join(DST, s.name))
    if (diff.length > 0) mismatched.push(`${s.name}(${diff[0]})`)
  }

  console.log('')
  console.log('── 归位结果 ──')
  console.log(`新复制 ${copied} 个 · 已存在且一致 ${already} 个 · 目标现有 ${dst.length} 个`)
  if (missing.length || mismatched.length) {
    console.error(`❌ 完整性校验未通过：缺失 ${missing.length} 个${missing.length ? '（' + missing.slice(0, 5).join('、') + '）' : ''} · 不一致 ${mismatched.length} 个${mismatched.length ? '（' + mismatched.slice(0, 5).join('、') + '）' : ''}`)
    console.error('   已保留源目录 skill-pool/skills，未做任何删除。请修复后重跑。')
    process.exit(1)
  }
  console.log('✅ 完整性校验通过：源与目标逐文件字节一致')

  // ── 生成机器可读清单（索引层同步的唯一消费源）─────────────────────────────
  const manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    source: 'skill-pool/skills',
    target: 'skills',
    total: dst.length,
    skills: dst.map((s) => ({
      name: s.name,
      path: `skills/${s.name}`,
      hasSkillDoc: existsSync(join(s.path, 'SKILL.md')),
      hasReadme: existsSync(join(s.path, 'README.md')),
      files: listFiles(s.path).length,
    })),
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8')
  console.log(`📄 已生成清单：skills/.skill-pool-manifest.json（${manifest.total} 个技能）`)

  // ── 清理源目录：只在有 --keep-source 时保留 ────────────────────────────────
  if (keepSource) {
    console.log('ℹ️ --keep-source：保留 skill-pool/skills（注意：会造成同一技能两份副本，索引与检索必须以 skills/ 为准）')
  } else {
    rmSync(SRC, { recursive: true, force: true })
    console.log('🧹 已移除重复副本 skill-pool/skills（git 历史仍保留全部提交，可随时回退）')
  }
}

const args = process.argv.slice(2)
if (args.includes('--apply')) apply(args.includes('--keep-source'))
else {
  const ok = check()
  process.exit(ok ? 0 : 1)
}
