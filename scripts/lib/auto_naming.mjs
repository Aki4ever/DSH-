/**
 * ==============================================================================
 * 自动命名核心逻辑（可独立测试的纯模块）
 * ==============================================================================
 * 为什么抽出来：
 *   这段逻辑运行在**宿主进程内**（由 ai-control/plugin/index.mjs 调用）。
 *   宿主里出错会波及整个桌面端，所以必须能在**不重启宿主**的前提下先测通。
 *   抽成独立模块后，`scripts/test_auto_naming.mjs` 与插件导入的是**同一份代码**，
 *   测通了才谈得上"敢让宿主加载"。
 *
 * 实测依据（来自 .dsh-control/agent-probe.txt）：
 *   `agent/pre-step` 的 payload.agent.id 与 payload.agent.session.id
 *   都是精确的 44 字符会话 ID，因此插件能在每步进入前精确改名。
 *
 * 设计要点：
 *   - 幂等：标题已合规时**什么都不做**，绝不与模型按规范起的好名字打架；
 *   - 保守：生成的是"合格底稿"（分类按工作区推断、概述取首条用户消息前 8 个汉字、
 *     难度分取规范中位值 50），模型仍应在首轮按规范优化；
 *   - 零副作用：任何异常都返回 null，绝不抛出到宿主。
 * ==============================================================================
 */

import { readFile, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { zstdDecompressSync } from 'node:zlib'

/** 会话标题规范：`[分类字母+3位编号][难度分] 概述`。 */
export const TITLE_RE = /^\[([RFDSOQ])(\d{3})\]\[(\d{1,3})分\]\s+(\S.*)$/

/** 工作区路径 → 分类字母（按业务管道语义，顺序即优先级）。 */
const WORKSPACE_LETTER = [
  [/全局规则|规则/, 'R'],
  [/股票|量化|交易/, 'F'],
  [/注入器|key|密钥|账号|凭证/i, 'F'],
  [/健康/, 'O'],
  [/日常/, 'O'],
]

/** 默认难度分：机器无法可靠判定难度，取规范区间中位值，由模型后续优化。 */
const DEFAULT_SCORE = 50

/** 解析标题；不符合规范返回 null。 */
export function parseTitle(title) {
  const m = TITLE_RE.exec(String(title ?? ''))
  return m ? { letter: m[1], num: Number(m[2]), score: Number(m[3]), summary: m[4] } : null
}

/** 统计汉字数（与脚本侧 `perl \p{Han}` 同口径）。 */
export function hanCount(s) {
  const m = String(s ?? '').match(/\p{Script=Han}/gu)
  return m ? m.length : 0
}

/** 按 cwd 推断分类字母，推断不出时用 R。 */
export function letterFor(cwd) {
  const c = String(cwd ?? '')
  for (const [re, letter] of WORKSPACE_LETTER) if (re.test(c)) return letter
  return 'R'
}

/** 从首条用户消息提炼 ≤8 个汉字的概述；提不出实义片段时返回空串。 */
export function summarize(text, max = 8) {
  const cleaned = String(text ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^\s*[#>*\-\d.、）)]+\s*/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  for (const seg of cleaned.split(/[。！？；\n]/)) {
    const s = seg.trim()
    if (!s) continue
    const han = s.match(/\p{Script=Han}/gu)?.join('') ?? ''
    if (han.length >= 2) return han.slice(0, max)
  }
  const all = cleaned.match(/\p{Script=Han}/gu)?.join('') ?? ''
  return all.slice(0, max)
}

/** 会话是否已登记进 workspace.json（未登记的多为子会话或临时会话）。 */
export async function isRegisteredSession(dshHome, sessionId) {
  try {
    const w = JSON.parse(await readFile(join(dshHome, 'storages', 'workspace.json'), 'utf8'))
    for (const [, ws] of Object.entries(w.tables?.workspaces ?? {})) {
      if (Array.isArray(ws.sessionIds) && ws.sessionIds.includes(sessionId)) return true
    }
  } catch { /* 读不到按未登记处理 */ }
  return false
}

/** 读取标题权威存储。 */
export async function readSessionStore(dshHome) {
  try {
    return JSON.parse(await readFile(join(dshHome, 'storages', 'session_projcache.json'), 'utf8'))
  } catch {
    return null
  }
}

/** 取会话当前标题。 */
export function currentTitle(store, sessionId) {
  return store?.tables?.sessions?.[sessionId]?.rows?.title?.val ?? undefined
}

/**
 * 取会话的真实 cwd（用于推断分类字母）。
 *
 * 为什么不让调用方传：实测踩过——测试时传了空 cwd，结果把 `DSH股票` 的会话
 * 命名成了 `[R001]`（应为 `[F0xx]`）。**分类错误比不改名更糟**，所以这里不信任
 * 调用方，直接从会话文件首帧读权威的 `cwd` 字段。
 */
export async function sessionCwd(dshHome, sessionId) {
  try {
    const root = join(dshHome, 'sessions')
    const dirs = await readdir(root, { withFileTypes: true })
    for (const d of dirs) {
      if (!d.isDirectory()) continue
      const file = join(root, d.name, sessionId, 'session.jsonl.zstd')
      if (!existsSync(file)) continue
      const buf = await readFile(file)
      const magic = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
      const start = buf.indexOf(magic)
      if (start === -1) return null
      const next = buf.indexOf(magic, start + 4)
      const first = zstdDecompressSync(buf.subarray(start, next === -1 ? buf.length : next)).toString('utf8')
      const line = first.split('\n').find((l) => l.trim())
      if (!line) return null
      const ev = JSON.parse(line)
      // 首帧形如 {"type":"session",...,"cwd":"/Users/..."}
      return typeof ev?.cwd === 'string' ? ev.cwd : null
    }
  } catch { /* 读不到就返回 null，由调用方兜底 */ }
  return null
}

/**
 * 逐帧解压会话文件，取**首条真实用户消息**。
 *
 * 两个关键点（都是实测踩过的坑）：
 *   1. 多帧 zstd：`session.jsonl.zstd` 是帧拼接，单帧解压只能拿到会话头；
 *   2. `user/message` 不全是用户输入——宿主注入的工作区约束提醒也是这个类型，
 *      必须用 `data.source.kind === 'user'` 区分。
 *
 * 为性能只扫描前若干帧（会话开头必在其中），找到即返回。
 */
export async function firstUserMessage(dshHome, sessionId, maxFrames = 60) {
  try {
    const root = join(dshHome, 'sessions')
    const dirs = await readdir(root, { withFileTypes: true })
    for (const d of dirs) {
      if (!d.isDirectory()) continue
      const file = join(root, d.name, sessionId, 'session.jsonl.zstd')
      if (!existsSync(file)) continue
      const buf = await readFile(file)
      const magic = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
      const starts = []
      let i = 0
      while ((i = buf.indexOf(magic, i)) !== -1) { starts.push(i); i += 4 }
      if (!starts.length) return null
      const limit = Math.min(starts.length, maxFrames + 1)
      for (let k = 0; k < limit; k++) {
        const end = k + 1 < starts.length ? starts[k + 1] : buf.length
        let text
        try { text = zstdDecompressSync(buf.subarray(starts[k], end)).toString('utf8') } catch { continue }
        for (const line of text.split('\n')) {
          if (!line.trim()) continue
          let ev
          try { ev = JSON.parse(line) } catch { continue }
          if (ev.type !== 'user/message') continue
          if (ev.data?.source?.kind !== 'user') continue
          const txt = (ev.data?.content ?? [])
            .filter((p) => p?.type === 'text').map((p) => p.text).join('\n')
          if (txt.trim()) return txt
        }
      }
      return null
    }
  } catch { /* 读不到就当没有 */ }
  return null
}

/** 在同类字母下选一个未被占用的序号，避免侧边栏撞号。 */
export function nextNumber(store, letter) {
  const used = new Set()
  for (const [, e] of Object.entries(store?.tables?.sessions ?? {})) {
    const p = parseTitle(e?.rows?.title?.val)
    if (p && p.letter === letter) used.add(p.num)
  }
  let n = 1
  while (used.has(n) && n < 999) n++
  return n
}

/**
 * 生成合规底稿标题。
 * @returns {Promise<string|null>} 缺首条消息或无汉字时返回 null
 */
export async function buildTitle({ dshHome, sessionId, cwd, store }) {
  const msg = await firstUserMessage(dshHome, sessionId)
  const summary = summarize(msg)
  if (hanCount(summary) < 1) return null
  // 分类必须以**会话自身的 cwd** 为准；调用方传入的 cwd 只作兜底。
  // 理由见 sessionCwd() 注释：信任调用方曾导致 DSH股票 的会话被分成 R 类。
  const realCwd = (await sessionCwd(dshHome, sessionId)) ?? cwd
  const letter = letterFor(realCwd)
  const n = nextNumber(store, letter)
  const title = `[${letter}${String(n).padStart(3, '0')}][${DEFAULT_SCORE}分] ${summary}`
  // 自校验：生成的标题必须自身合规，否则宁可不改
  return parseTitle(title) ? title : null
}

/** 通过宿主 RPC 改名；绝不抛出。 */
export async function renameViaRpc(webUrl, sessionId, title, timeoutMs = 5000) {
  try {
    const res = await fetch(`${webUrl}/api/session.rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: `autoname-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        method: 'session.rename',
        payload: { sessionId, title },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    const j = await res.json().catch(() => null)
    return j?.result?.ok === true
  } catch {
    return false
  }
}

/**
 * 轮询权威存储，确认改名真的落到盘上。
 *
 * 为什么不能只信 RPC 的 `ok:true`：实测改名后存储**有 3~9 秒延迟**才更新
 * （同一会话连续两次改名，seq 从 108 到 109，中间约 5 秒才可见）。
 * 早期版本"立刻复查"导致把成功误判为失败——这是本模块最容易踩的坑。
 */
export async function waitForTitle(dshHome, sessionId, expect, timeoutMs = 15000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    const store = await readSessionStore(dshHome)
    const cur = currentTitle(store, sessionId)
    if (cur === expect) return true
    await new Promise((r) => setTimeout(r, 800))
  }
  return false
}

/**
 * 自动命名主流程：标题不合规则改名，合规则什么都不做。
 * @param {{dshHome:string, sessionId:string, cwd:string, webUrl:string, stateDir?:string, verifyTimeoutMs?:number}} o
 * @returns {Promise<{status:string, title?:string, current?:string, reason?:string, verified?:boolean}>}
 */
export async function autoNameOnce(o) {
  const { dshHome, sessionId, cwd, webUrl, stateDir } = o
  try {
    if (!sessionId) return { status: 'skip', reason: '无会话 ID' }
    // 子代理会话由宿主 subagent routing 托管，改名会被拒（agent-busy），预先跳过
    if (!String(sessionId).startsWith('session-')) return { status: 'skip', reason: '子会话不可改名' }
    // 刻意**不**要求"已登记进 workspace.json"：实测存在未登记但确实是主会话的情况
    // （52 条会话中只有 41 条登记），它们同样需要命名，且 RPC 对它们有效。
    // 子会话已由上面的前缀判断排除，无需再靠登记表兜底。

    const store = await readSessionStore(dshHome)
    const current = currentTitle(store, sessionId)
    if (parseTitle(current)) return { status: 'already-ok', current }

    // 先把 cwd 读出来（分类正确性依赖它），保证"分类错误"不会发生
    const realCwd = (await sessionCwd(dshHome, sessionId)) ?? cwd
    const title = await buildTitle({ dshHome, sessionId, cwd: realCwd, store })
    if (!title) return { status: 'skip', reason: '无法生成合规概述（缺首条消息或无汉字）' }

    if (!webUrl) return { status: 'fail', reason: 'DSH_WEB_URL 不可用', title }
    const ok = await renameViaRpc(webUrl, sessionId, title)
    // 关键：以**权威存储**为准，而不是 RPC 的自述
    const verified = ok ? await waitForTitle(dshHome, sessionId, title, o.verifyTimeoutMs ?? 15000) : false

    if (stateDir) {
      try {
        await writeFile(
          join(stateDir, 'auto-naming.log'),
          `${new Date().toISOString()} ${verified ? 'OK  ' : 'FAIL'} ${sessionId} 「${String(current ?? '').slice(0, 30)}」 → 「${title}」${ok && !verified ? ' (RPC ok 但存储未确认)' : ''}\n`,
          { encoding: 'utf8', flag: 'a' },
        )
      } catch { /* 记录失败不影响结果 */ }
    }
    if (verified) return { status: 'renamed', title, current, verified: true }
    return {
      status: 'fail',
      reason: ok ? 'RPC 报成功但权威存储未确认（可能仍在校验前）' : 'RPC 调用失败',
      title, current, verified: false,
    }
  } catch (err) {
    return { status: 'fail', reason: `异常：${err?.message || err}` }
  }
}
