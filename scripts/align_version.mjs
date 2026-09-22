#!/usr/bin/env node
// ==============================================================================
// 脚本名称：align_version.mjs
// 核心功能：全库受管文档版本归位（把受管文档头部版本统一改到当前总版本）
// ------------------------------------------------------------------------------
// 为什么需要它：版本升级时若靠手改，必然会漏几个文件，于是产生"版本孤岛"——
//   各文档自称的版本号互相不一致，既无法比较也无法追责（REQ-044 实测漏了 33 个文件）。
//   本脚本把"全库归位"变成一条命令，并可 --dry-run 预览改动。
//
// 用法：
//   node scripts/align_version.mjs                 # 归位到台账总版本（会写文件）
//   node scripts/align_version.mjs --dry-run       # 只预览，不写
//   node scripts/align_version.mjs --to 3.0.0      # 指定目标版本
//
// 归位范围（只动头部元数据区那两行，不碰正文）：
//   **当前文档版本** / **当前模板版本** / **当前台账版本**：`vX.Y.Z`
//   **对应实施版本** / **实施版本**：`vX.Y.Z`
// 明确不改的：代码块内的示例版本号、版本里程碑表里的历史行（那是历史记录）。
// ==============================================================================

import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, relative, extname } from 'node:path'

/** 受管文档范围（与 versioning_standard 的受管定义一致） */
export const MANAGED_DIRS = ['rules', 'knowledge', 'indexes', 'docs', 'memory', 'templates']
export const MANAGED_ROOT_FILES = ['AGENTS.md', 'README.md']

function parseArgs(argv) {
  const out = { root: process.cwd(), to: null, dryRun: false, json: false }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--root') out.root = argv[++i]
    else if (a === '--to') out.to = argv[++i]
    else if (a === '--dry-run') out.dryRun = true
    else if (a === '--json') out.json = true
  }
  return out
}

const VERSION_LINE = /^(\s*>\s*-\s*\*\*(当前(?:文档|模板|台账)版本|对应实施版本|实施版本)\*\*：\s*`v)(\d+\.\d+\.\d+)(`.*)$/

async function collectMarkdown(dir, root, out) {
  let entries = []
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) await collectMarkdown(full, root, out)
    else if (extname(e.name) === '.md') out.push(relative(root, full))
  }
  return out
}

/**
 * 替换头部版本行：只在**文件前 12 行**内生效（版本元数据区就在开头），
 * 避免误改正文里引用的历史版本号。
 */
export function alignText(text, to) {
  const lines = text.split(/\r?\n/)
  let changed = 0
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const m = lines[i].match(VERSION_LINE)
    if (!m) continue
    if (m[3] === to) continue
    lines[i] = `${m[1]}${to}${m[4]}`
    changed++
  }
  return { text: lines.join('\n'), changed }
}

/** 读取台账总版本 */
export async function ledgerVersion(root) {
  const text = await readFile(join(root, 'docs/requirements.md'), 'utf8')
  const m = text.match(/\*\*当前系统实施总版本\*\*：\s*`v(\d+\.\d+\.\d+)`/)
  return m ? m[1] : null
}

const args = parseArgs(process.argv)
const root = args.root

const to = args.to || (await ledgerVersion(root))
if (!to) {
  console.error('❌ 无法确定目标版本：既没传 --to，台账里也没读到总版本')
  process.exit(1)
}

const files = [...MANAGED_ROOT_FILES]
for (const d of MANAGED_DIRS) await collectMarkdown(join(root, d), root, files)

const changed = []
const skipped = []
for (const rel of files) {
  const full = join(root, rel)
  let text
  try {
    text = await readFile(full, 'utf8')
  } catch {
    continue
  }
  const { text: next, changed: n } = alignText(text, to)
  if (n === 0) {
    skipped.push(rel)
    continue
  }
  if (!args.dryRun) await writeFile(full, next, 'utf8')
  changed.push({ file: rel, lines: n })
}

if (args.json) {
  console.log(JSON.stringify({ to, dryRun: args.dryRun, changed, unchanged: skipped.length }, null, 2))
} else {
  console.log(`=== 受管文档版本归位${args.dryRun ? '（预览，未写入）' : ''} ===`)
  console.log(`目标版本：v${to} · 受管文档 ${files.length} 个 · 需改动 ${changed.length} 个 · 已一致 ${skipped.length} 个`)
  for (const c of changed) console.log(`  · ${c.file}（${c.lines} 行）`)
  console.log(changed.length === 0 ? '\n✅ 全库已一致，无需归位' : `\n${args.dryRun ? '⚠️ 预览模式未写入；去掉 --dry-run 才会落盘' : '✅ 归位完成'}`)
}
