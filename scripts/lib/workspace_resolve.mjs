/**
 * ==============================================================================
 * 会话工作区归位（共享模块）
 * ==============================================================================
 * 为什么单独抽出来：改名方案生成器与批量改名器必须用**同一套**归位口径，
 * 否则会出现"生成器按 A 工作区编号、批量器按 B 工作区判重"的错位——
 * 实测这就导致过一次同工作区编号撞号被误拦。
 *
 * 实测背景：`workspace.json` 只登记了 41 条会话，另有 8 条（多为子代理会话）
 * 未登记。若一律并入"未登记"桶，会让**不同项目**的会话落进同一编号空间。
 *
 * 归位优先级：
 *   1) workspace.json 精确登记；
 *   2) 未登记时，按 cwd 的**最长路径前缀**匹配已知工作区路径；
 *   3) 仍不匹配时，落在"其他项目"桶（同一桶内的会话按位置天然属同一片区域，
 *      桶内编号仍保持唯一）。
 * ==============================================================================
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/** 从 workspace.json 读出 { bySid, byPath } 两张表。 */
export function loadWorkspaceIndex(home) {
  const bySid = new Map()
  const byPath = new Map()
  const f = join(home, 'storages', 'workspace.json')
  if (existsSync(f)) {
    const w = JSON.parse(readFileSync(f, 'utf8'))
    for (const [, ws] of Object.entries(w.tables?.workspaces ?? {})) {
      for (const sid of ws.sessionIds ?? []) bySid.set(sid, ws.title)
      if (ws.path) byPath.set(ws.path, ws.title)
    }
  }
  return { bySid, byPath }
}

/**
 * 解析单个会话的归属工作区名。
 * @param {{sid:string, cwd:string, unregistered:boolean}} input
 * @param {{bySid:Map, byPath:Map}} index
 * @param {string} home - DSH_HOME（用于判断是否落在宿主目录，仅作兜底标记，不充当项目根）
 */
export function resolveWorkspace(input, index, home) {
  const { sid, cwd, unregistered } = input
  if (!unregistered) return index.bySid.get(sid) ?? '(未知工作区)'
  if (cwd) {
    let best = null
    for (const [p, title] of index.byPath) {
      if (cwd === p || cwd.startsWith(p + '/')) {
        if (!best || p.length > best[0].length) best = [p, title]
      }
    }
    if (best) return best[1]
  }
  return '其他项目'
}

/**
 * 为一批会话批量算出「会话 → 工作区」映射。
 * @param {Array<{sessionId:string, cwd:string, workspaceUnregistered:boolean}>} items
 */
export function resolveWorkspacesFor(items, home) {
  const index = loadWorkspaceIndex(home)
  const out = new Map()
  for (const it of items) {
    out.set(it.sessionId, resolveWorkspace({
      sid: it.sessionId, cwd: it.cwd, unregistered: it.workspaceUnregistered,
    }, index, home))
  }
  return out
}
