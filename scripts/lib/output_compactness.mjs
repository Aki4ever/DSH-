/**
 * ==============================================================================
 * 输出压缩与信噪比度量模块 (Output Compactness Meter)
 * ==============================================================================
 * 为什么需要它（2026-09-28 实测根因）：
 *   `meta_rules.md` 第二十五条 / 第二十七条 / 第三十四条 都写了"极简高信噪比、
 *   剔除废话、只答用户所需"，`AGENTS.md` 也把它列为铁律。
 *   但**全库没有任何一处能客观判定一次回复到底啰不啰嗦**：
 *     · control_gates.sh 只数文件与重复块，不看回复；
 *     · audit_execution.sh 六个维度全是"过程合规"，没有一个是"输出有没有废话"。
 *   一句没有判定手段的口号 = 一条从来不会被执行的规则。
 *
 * 本模块把"废话多不多"降为可测的两个客观量：
 *   1) **体量**：本条回复的正文字符数（超阈值扣分）；
 *   2) **结构**：末尾是否带齐文末五联装标头（缺项扣分）。
 *
 * 刻意的边界：
 *   · 它**不评价内容好坏**，只度量体量与结构——任何"语义质量打分"都会变成模型自说自话；
 *   · 阈值可调（ai-control/config/gates.conf），判据永远只有一个：数字。
 * ==============================================================================
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'

/** 文末五联装标头（唯一权威定义见 rules/system/meta_rules.md 第三十四条）。 */
export const TAIL_MARKERS = [
  { key: 'status', label: '🏷️ 【当前状态】' },
  { key: 'conclusion', label: '🎯 【核心结论/输出物】' },
  { key: 'path', label: '📍 【输出物地址】' },
  { key: 'notice', label: '💡 【重要说明】' },
  { key: 'score', label: '🌟 【执行效果】' },
]

/** 默认阈值：正文字符上限与超出即扣分的比例口径。 */
export const COMPACT_DEFAULTS = {
  maxChars: 1800,
  maxLines: 60,
}

/** 从任意事件载荷里尽力抽出正文纯文本（载荷形状随宿主版本演进，故递归兜底）。 */
export function extractText(payload) {
  const out = []
  const seen = new Set()
  const walk = (v, depth) => {
    if (depth > 6 || v == null) return
    if (typeof v === 'string') { out.push(v); return }
    if (typeof v !== 'object') return
    if (seen.has(v)) return
    seen.add(v)
    if (Array.isArray(v)) { for (const item of v) walk(item, depth + 1); return }
    // 只沿着可能的正文键下探，避免把 usage / 元数据也拼进正文
    for (const key of ['text', 'content', 'message', 'blocks', 'value']) {
      if (key in v) walk(v[key], depth + 1)
    }
  }
  walk(payload, 0)
  // 去重相邻重复片段（同一文本可能在 payload 里出现两次）
  const joined = out.join('\n')
  return joined
}

/** 去掉 Markdown 代码块与表格分隔符后统计"有效体量"，避免把工具输出误判成废话。 */
export function normalizeForCount(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, '')      // 代码块不计入（属交付物，不是废话）
    .replace(/^\s*\|.*\|\s*$/gm, '')      // 表格行不计入
    .trim()
}

/**
 * 生成一次回复的压缩度报告（纯函数，可单测）。
 * @param {string} text 回复正文
 * @param {object} [thresholds] 阈值覆盖
 */
export function buildCompactReport(text, thresholds = {}) {
  const cfg = { ...COMPACT_DEFAULTS, ...thresholds }
  const body = normalizeForCount(text)
  const chars = [...body].length
  const lines = body ? body.split('\n').length : 0
  const missing = TAIL_MARKERS.filter((m) => !String(text || '').includes(m.label)).map((m) => m.key)
  const tailOk = missing.length === 0
  const sizeOk = chars <= cfg.maxChars && lines <= cfg.maxLines
  return {
    measuredAt: new Date().toISOString(),
    chars,
    lines,
    maxChars: cfg.maxChars,
    maxLines: cfg.maxLines,
    sizeOk,
    tailOk,
    missingTail: missing,
    pass: sizeOk && tailOk,
  }
}

/** 报告落盘目录（与 status.json、待办证据同根）。 */
export function getCompactDir(dshHome) {
  const home = dshHome || process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, '.dsh-control', 'compact')
}

export function getCompactFilePath(sessionId, dshHome) {
  const sid = String(sessionId || process.env.DSH_SESSION_ID || 'global_session').replace(/[^a-zA-Z0-9_-]/g, '_')
  return join(getCompactDir(dshHome), `${sid}.json`)
}

/** 原子落盘（失败静默：度量失败绝不能影响对话）。 */
export function writeCompactReport(sessionId, report, dshHome) {
  try {
    const file = getCompactFilePath(sessionId, dshHome)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(report, null, 2), 'utf8')
    return true
  } catch {
    return false
  }
}

/** 一行式摘要（拒绝理由 / 审计卡片复用）。 */
export function formatCompactLine(report) {
  if (!report) return '输出压缩：⏸️ 未采集'
  const mark = report.pass ? '✅' : '⛔'
  const tail = report.tailOk ? '五联装齐备' : `缺 ${report.missingTail.join('/')}`
  return `输出压缩：${mark} ${report.chars} 字 / ${report.lines} 行（限 ${report.maxChars}/${report.maxLines}） · ${tail}`
}
