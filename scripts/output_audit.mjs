#!/usr/bin/env node
/**
 * ==============================================================================
 * 输出体量与结构判定器 (Output Audit) —— REQ-089 / R1-c 的物理载体
 * ==============================================================================
 * 为什么需要它（实测根因，2026-10-01）：
 *   `audit_execution.sh` 第 8 维「输出精简与文末五联装」的度量报告，**历史上只有拦截层
 *   插件会写**（`ai-control/plugin/index.mjs` → `writeCompactReport`）。
 *   而拦截层插件至今未注册进宿主（`install_host_gate.sh verify` 报「条目存在 ⛔ 缺失」），
 *   于是 `~/.dsh/.dsh-control/compact/` 目录**在整台机器上从未出现过**，
 *   该维度**结构性恒扣 8 分**，与输出质量毫无关系 —— 一条永远不可能通过的判定。
 *
 * 处置思路（与 REQ-087 R1-a 同源）：

 *   把证据源从「插件运行时」换成 **宿主会话转录**（`scripts/lib/session_transcript.mjs`，
 *   多帧 zstd 逐帧解压），读宿主权威记录的 **上一轮已完结的助手正文**，
 *   用与插件**完全同一套**度量实现（`scripts/lib/output_compactness.mjs`）算分，
 *   并把报告写到插件原本要写的同一路径 —— 于是审计第 8 维不再依赖插件是否通电。
 *
 * 为什么取「上一轮已完结」而不是「本轮」：
 *   判定器永远在本轮回复**产生之前**运行，取本轮只会拿到空。取最近一个 `turn/end`
 *   对应的助手正文，语义稳定、可复现，且真正度量的是"我实际交付出去的东西"。
 *
 * 刻度口径（fail-closed，遵循工程铁律「没有可解析的证据 ≠ 通过」）：
 *   exit 0 = 有证据且通过；exit 1 = 有证据但不达标；exit 2 = **取不到证据**（转录缺失/无可判定回复）
 *   —— exit 2 绝不算通过，但报错文案必须说清"是取不到证据"，不得伪装成"输出很规范"。
 *
 * 用法：
 *   node scripts/output_audit.mjs --check     # 计算并打印，不落盘（退出码 0/1/2）
 *   node scripts/output_audit.mjs --refresh   # 计算、落盘到 compact/<sid>.json，并打印
 *   node scripts/output_audit.mjs --json      # 输出机器可读 JSON
 * ==============================================================================
 */

import { readFileSync, existsSync } from 'node:fs'
import { readTranscriptEvents } from './lib/session_transcript.mjs'
import {
  buildCompactReport,
  writeCompactReport,
  getCompactFilePath,
  formatCompactLine,
  TAIL_MARKERS,
} from './lib/output_compactness.mjs'

const args = new Set(process.argv.slice(2))
const JSON_MODE = args.has('--json')
const REFRESH = args.has('--refresh')

/** 阈值：与拦截层插件的 `compactThresholds` 保持同一口径，避免两套标准。 */
const THRESHOLDS = { maxChars: 1800, maxLines: 60 }

/**
 * 取最近一轮**已完结**的助手正文。
 * @returns {{turn:number|null, text:string, reason:string}}
 */
export function latestCompletedReply(sessionId = process.env.DSH_SESSION_ID) {
  const { path, events } = readTranscriptEvents(sessionId)
  if (!path) return { turn: null, text: '', reason: '找不到该会话的转录文件' }
  if (!events.length) return { turn: null, text: '', reason: '转录文件读不出任何事件（解压失败或为空）' }

  const ended = events
    .filter((e) => e && e.type === 'turn/end' && e.data && typeof e.data.turn === 'number')
    .map((e) => e.data.turn)
  if (!ended.length) return { turn: null, text: '', reason: '转录里没有任何已完结的回合（turn/end）' }
  const turn = Math.max(...ended)

  const texts = events
    .filter((e) => e && e.type === 'assistant/message' && e.data && e.data.turn === turn)
    .flatMap((e) => {
      const content = e.data.message?.content
      if (!Array.isArray(content)) return []
      return content.filter((b) => b && b.type === 'text' && typeof b.text === 'string').map((b) => b.text)
    })

  if (!texts.length) return { turn, text: '', reason: `第 ${turn} 回合没有助手正文文本块` }
  return { turn, text: texts.join('\n\n'), reason: '' }
}

function main() {
  const sessionId = process.env.DSH_SESSION_ID || 'global_session'
  const { turn, text, reason } = latestCompletedReply(sessionId)

  if (!text) {
    // fail-closed：取不到证据 ≠ 通过
    if (JSON_MODE) console.log(JSON.stringify({ ok: false, reason, turn, sessionId }, null, 2))
    else {
      console.log('🧪 输出体量与结构判定 · 未采集')
      console.log('-----------------------------------------')
      console.log(`⛔ 取不到可判定的证据：${reason}`)
      console.log('   处置：这**不算通过**。请确认 DSH_SESSION_ID 有效且会话已有完结回合。')
    }
    process.exit(2)
  }

  const report = buildCompactReport(text, THRESHOLDS)
  if (REFRESH) {
    const wrote = writeCompactReport(sessionId, report)
    if (!JSON_MODE) {
      console.log(`💾 报告已落盘：${getCompactFilePath(sessionId)} ${wrote ? '' : '（写入失败，已降级为仅打印）'}`)
    }
  }

  if (JSON_MODE) {
    console.log(JSON.stringify({ ok: report.pass, turn, sessionId, file: getCompactFilePath(sessionId), ...report }, null, 2))
  } else {
    console.log('🧪 输出体量与结构判定 · 不采信自述，只读宿主转录')
    console.log('-----------------------------------------')
    console.log(`会话：${sessionId}`)
    console.log(`取证：第 ${turn} 回合（最近一轮已完结的助手正文）`)
    console.log(formatCompactLine(report))
    console.log(
      report.sizeOk
        ? `  · 体量合规：${report.chars} 字 / ${report.lines} 行（限 ${report.maxChars} / ${report.maxLines}）`
        : `  · 体量超标：${report.chars} 字 / ${report.lines} 行（限 ${report.maxChars} / ${report.maxLines}）`,
    )
    console.log(
      report.tailOk
        ? '  · 文末五联装标头齐备'
        : `  · 文末五联装缺失：${report.missingTail.join(' / ')}（应含 ${TAIL_MARKERS.length} 项标头）`,
    )
    console.log('-----------------------------------------')
    console.log(report.pass ? '✅ 通过：体量与结构均达标' : '⛔ 不通过：存在超标项或缺失标头')
  }
  process.exit(report.pass ? 0 : 1)
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())
if (invokedDirectly) main()
