/**
 * ==============================================================================
 * 宿主会话转录读取器 (Session Transcript Reader)
 * ==============================================================================
 * 为什么需要这一层（REQ-087 / GCM-PHY · R1-a 实测根因）：
 *   S07「待办常显」的判定证据，原先**唯一**的运行时写入者是
 *   `ai-control/plugin/index.mjs:965`（拦截层插件）。实测该插件未被宿主加载
 *   （profile 条目丢失 + 无 isHost 凭据）→ 没人写证据 → 判定器永远判 `NO_TODO`，
 *   于是"挂载任务列表"这件事在物理层是**只显示、不落盘**的空架子。
 *
 *   而宿主自己其实一直在记：每次 `todo_write` 都会在会话转录里落一条
 *   `{"type":"todo/write","seq":N,"time":...,"data":{"todos":[...]}}` 事件。
 *   这条通道**不依赖任何插件**，只要会话在跑就存在。
 *
 * 本模块把这条宿主通道变成可读的物理事实来源，供 S07 判定直接消费。
 *
 * 存储形态（实测）：
 *   `$DSH_HOME/sessions/<转义后的 cwd>/<会话ID>/session.v4.jsonl.zstd`
 *   该文件是**多帧拼接**的 zstd（每次追加一个独立帧，实测 276 KB / 209 帧）。
 *   Node 的 `zstdDecompressSync` 只解第一帧 → 必须逐帧切分后再解，
 *   否则会静默拿到 213 字节（只有 session 头），把"有证据"误判成"没证据"。
 * ==============================================================================
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { zstdDecompressSync } from 'node:zlib'

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

/** 会话根目录：`$DSH_HOME/sessions`。 */
export function getSessionsRoot(dshHome) {
  const home = dshHome || process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'sessions')
}

/**
 * 在 `$DSH_HOME/sessions/<任意工程目录>/<会话ID>/` 下定位转录文件。
 * 刻意**不**重实现 cwd→目录名的转义规则（那是宿主的内部实现，会随版本变），
 * 改为按会话 ID 直接扫一层子目录，宿主改转义规则也不会失效。
 */
export function findTranscript(sessionId, dshHome) {
  if (!sessionId) return null
  const root = getSessionsRoot(dshHome)
  if (!existsSync(root)) return null
  let projDirs = []
  try {
    projDirs = readdirSync(root).filter((n) => !n.startsWith('.'))
  } catch {
    return null
  }
  for (const proj of projDirs) {
    const dir = join(root, proj, sessionId)
    if (!existsSync(dir)) continue
    let files = []
    try {
      files = readdirSync(dir).filter((f) => /^session.*\.jsonl\.zstd$/.test(f))
    } catch {
      continue
    }
    if (!files.length) continue
    // 同名多版本时取最大者（v4 > v3……按修改时间兜底）
    files.sort((a, b) => {
      try {
        return statSync(join(dir, b)).mtimeMs - statSync(join(dir, a)).mtimeMs
      } catch {
        return 0
      }
    })
    return join(dir, files[0])
  }
  return null
}

/**
 * 把多帧拼接的 zstd 缓冲解成文本。
 * 逐帧切分：以魔数为界切片，每片单独解压；坏片（写入中被截断的尾帧）跳过而不抛错。
 * @returns {{text:string, frames:number, badFrames:number}}
 */
export function decompressFrames(buf) {
  const offsets = []
  let i = 0
  while ((i = buf.indexOf(ZSTD_MAGIC, i)) !== -1) {
    offsets.push(i)
    i += 4
  }
  if (!offsets.length) {
    // 单帧无魔数（极小概率）时退回整体解压
    try {
      return { text: zstdDecompressSync(buf).toString('utf8'), frames: 1, badFrames: 0 }
    } catch {
      return { text: '', frames: 0, badFrames: 1 }
    }
  }
  const parts = []
  let bad = 0
  for (let k = 0; k < offsets.length; k++) {
    const end = k + 1 < offsets.length ? offsets[k + 1] : buf.length
    try {
      parts.push(zstdDecompressSync(buf.subarray(offsets[k], end)).toString('utf8'))
    } catch {
      bad++ // 尾帧常因"正在追加"而截断，属正常现象
    }
  }
  return { text: parts.join(''), frames: offsets.length, badFrames: bad }
}

/**
 * 读取一个会话的全部转录事件。
 * @returns {{path:string|null, events:Array<object>, frames:number, badFrames:number}}
 */
export function readTranscriptEvents(sessionId, dshHome) {
  const path = findTranscript(sessionId, dshHome)
  if (!path) return { path: null, events: [], frames: 0, badFrames: 0 }
  let buf
  try {
    buf = readFileSync(path)
  } catch {
    return { path, events: [], frames: 0, badFrames: 0 }
  }
  const { text, frames, badFrames } = decompressFrames(buf)
  const events = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    try {
      events.push(JSON.parse(line))
    } catch {
      /* 坏行跳过：转录是追加写的，最后一行可能不完整 */
    }
  }
  return { path, events, frames, badFrames }
}

/** 从转录事件流中取最后一次 `todo/write` 的待办数组（宿主权威记录）。 */
export function latestTodoWrite(sessionId, dshHome) {
  const { path, events, frames } = readTranscriptEvents(sessionId, dshHome)
  let latest = null
  for (const ev of events) {
    if (ev && ev.type === 'todo/write' && ev.data && Array.isArray(ev.data.todos)) latest = ev
  }
  if (!latest) return null
  return {
    seq: latest.seq,
    time: latest.time,
    todos: latest.data.todos,
    transcriptPath: path,
    frames,
  }
}
