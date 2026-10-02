#!/usr/bin/env node
/**
 * ==============================================================================
 * 备份留存策略 · Node 侧公共库  scripts/lib/backup_retention.mjs
 * ==============================================================================
 * 为什么需要它（实测事实，不是推测）：
 *   `~/.dsh/profiles/desktop/` 里堆着 16 个带时间戳的备份，
 *   `cordis.patch.yml.bak-*` 8 份 + `package.json.bak-*` 8 份。
 *   写它们的写者互相不认识，但写法一模一样：**改前先备份，没有任何人负责清理**。
 *   后果不是"目录乱"这么轻：回滚靠的是"最近一份备份"，
 *   备份堆到十几份以后，回滚目标只能靠翻文件名猜 —— 可回滚性变成了运气。
 *
 * 本库把留存口径收敛成一处：只保留某文件**最新的 N 份** `<base>.bak-*`（默认 3）。
 *   bash 侧同口径实现在 `scripts/lib/backup_retention.sh`，两边排序口径一致
 *   （修改时间升序，时间相同时按文件名），避免"两个写者两套标准"。
 *
 * 安全边界（三条，写清楚了才敢用在"删文件"上）：
 *   ① 只匹配 `<base>.bak-*` 这一种兄弟名，其它后缀（`.tmp-` `.orig-` 等）一律不碰；
 *   ② 活文件本身永不入选（候选名必须长于 `<base>` 且以 `<base>.bak-` 开头）；
 *   ③ 备份的备份不算备份（`a.bak-x.bak-y` 不归本库管），避免把链式名字当同类清理。
 *
 * 调用方式：
 *   import { pruneBackups } from './lib/backup_retention.mjs'
 *   pruneBackups(profileJsonPath, 3)
 *
 * 降级语义（重要）：本库可能被复制到沙箱里而 `lib/` 不在（仓库已实测过
 *   `control_gates.sh` 被单独复制）。调用方必须允许"加载不到本库"：
 *   加载失败就跳过清理，**只少删东西，绝不让原有流程失败**。
 *
 * 返回值：0 = 已按口径处理（含"本来就没什么可删"的空操作）
 *         1 = 参数不可用或目录不可读（调用方按需忽略即可，不是致命错误）
 * 本库在静默模式下不打印任何内容：清理由调用方决定要不要说，库只管删。
 * ==============================================================================
 */

import fs from 'node:fs'
import path from 'node:path'

/** 留存口径默认值：同一 base 最多留 3 份备份。 */
export const DEFAULT_KEEP = 3

/**
 * 判定一个目录项名是否是 `<baseName>` 的备份。
 * 返回 true 仅当名字严格形如 `<baseName>.bak-<非空后缀>`。
 */
export function isBackupName(fileName, baseName) {
  const prefix = `${baseName}.bak-`
  return fileName.startsWith(prefix) && fileName.length > prefix.length
}

/** 排序键：修改时间升序；时间取不到或相同时退回文件名，保证顺序确定。 */
function sortKey(stat, name) {
  const t = stat && typeof stat.mtimeMs === 'number' ? stat.mtimeMs : 0
  return [t, name]
}

/** 把候选集合按"最旧 → 最新"排好，返回 [{name, full}]。 */
function orderedBackups(dir, baseName, names) {
  return names
    .map((name) => {
      const full = path.join(dir, name)
      let st = null
      try {
        st = fs.statSync(full)
      } catch {
        st = null
      }
      return { name, full, key: sortKey(st, name) }
    })
    .sort((a, b) => (a.key[0] - b.key[0]) || (a.key[1] < b.key[1] ? -1 : a.key[1] > b.key[1] ? 1 : 0))
    .map(({ name, full }) => ({ name, full }))
}

/**
 * 扫描一个 base 文件的备份现状（只读，不删任何东西）。
 * 目录不可读时抛错，由调用方与 CLI 各自决定怎么表达。
 *
 * @param {string} baseFile 活文件（或已消失、只剩备份的历史文件）的路径
 * @param {number} keepN 保留最新几份
 */
export function scanBackups(baseFile, keepN = DEFAULT_KEEP) {
  const dir = path.dirname(baseFile)
  const baseName = path.basename(baseFile)
  const keep = Number.isFinite(Number(keepN)) ? Math.max(0, Math.floor(Number(keepN))) : DEFAULT_KEEP
  const entries = fs.readdirSync(dir)
  const names = entries.filter((n) => isBackupName(n, baseName))
  const ordered = orderedBackups(dir, baseName, names)
  const cut = Math.max(0, ordered.length - keep)
  return {
    dir,
    baseFile,
    baseName,
    liveFileExists: fs.existsSync(baseFile),
    keep,
    total: ordered.length,
    over: cut,
    keepList: ordered.slice(cut),
    pruneList: ordered.slice(0, cut),
  }
}

/**
 * 按留存口径清理一个 base 文件的旧备份。
 *
 * @param {string} baseFile 活文件路径（备份就是它的兄弟文件）
 * @param {number} keepN 保留最新几份，默认 3；负数按 0 处理
 * @param {{dryRun?: boolean}} [opts] dryRun=true 时只算不删
 * @returns {{baseFile:string, ok:boolean, total:number, over:number,
 *            kept:string[], pruned:string[], deleted:string[], errors:string[], dryRun:boolean}}
 */
export function pruneBackups(baseFile, keepN = DEFAULT_KEEP, opts = {}) {
  const dryRun = opts && opts.dryRun === true
  const out = {
    baseFile,
    ok: true,
    total: 0,
    over: 0,
    kept: [],
    pruned: [],
    deleted: [],
    errors: [],
    dryRun,
  }
  if (typeof baseFile !== 'string' || baseFile.length === 0) {
    out.ok = false
    out.errors.push('baseFile 为空')
    return out
  }
  let s
  try {
    s = scanBackups(baseFile, keepN)
  } catch (e) {
    out.ok = false
    out.errors.push(String((e && e.message) || e))
    return out
  }
  out.total = s.total
  out.over = s.over
  out.kept = s.keepList.map((x) => x.name)
  out.pruned = s.pruneList.map((x) => x.name)
  if (dryRun) return out
  for (const item of s.pruneList) {
    try {
      fs.rmSync(item.full, { recursive: true, force: true })
      out.deleted.push(item.name)
    } catch (e) {
      out.ok = false
      out.errors.push(`${item.name}: ${String((e && e.message) || e)}`)
    }
  }
  return out
}

/** 对一批 base 文件逐个清理（dryRun 时只算不删），返回结果数组。 */
export function pruneMany(baseFiles, keepN = DEFAULT_KEEP, opts = {}) {
  return (baseFiles || []).map((b) => pruneBackups(b, keepN, opts))
}

export default { pruneBackups, pruneMany, scanBackups, isBackupName, DEFAULT_KEEP }
