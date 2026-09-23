#!/usr/bin/env node
/**
 * ==============================================================================
 * 存量会话命名方案生成器 (Batch Naming Plan Generator)
 * ==============================================================================
 * 输入：一条人工给定的「会话 → 分类字母 + 概述」映射（JSON）
 * 输出：可直接喂给 batch_rename_sessions.mjs 的改名方案（含难度分与编号）
 *
 * 为什么难度分由脚本算而不是人工填：
 *   人工逐个拍 40+ 个分数既慢又不可复现，且同类任务的分数会前后不一致。
 *   这里改用量化推导，规则公开、结果可复现、可解释：
 *
 *     难度分 = 60% × 步数分档 + 40% × 输出 token 分档
 *
 *   步数分档（反映"影响范围 + 依赖深度"）：
 *     < 20 步 → 30 分   ·  20~79 步 → 45 分  ·  80~199 步 → 60 分
 *     200~399 步 → 75 分 ·  ≥ 400 步 → 90 分
 *   输出 token 分档（反映"技术复杂度 + 实际产出量"）：
 *     < 5k → 30 分 · 5k~29k → 45 分 · 30k~99k → 60 分
 *     100k~249k → 75 分 · ≥ 250k → 90 分
 *
 *   空会话（0 步 0 token）不给分档下限，直接判 25 分（快速轻量流）。
 *
 * 用法：
 *   node scripts/generate_naming_plan.mjs --brief brief.json --out plan.json
 * ==============================================================================
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { resolveWorkspacesFor } from './lib/workspace_resolve.mjs'

function hanCount(s) {
  const m = String(s).match(/\p{Script=Han}/gu)
  return m ? m.length : 0
}

/** 按分档表把数值映射为分数。thresholds 为 [上界, 分数] 递增序列。 */
function band(value, thresholds) {
  for (const [upper, score] of thresholds) if (value < upper) return score
  return thresholds[thresholds.length - 1][1]
}

const STEP_BANDS = [[20, 30], [80, 45], [200, 60], [400, 75], [Infinity, 90]]
const TOKEN_BANDS = [[5000, 30], [30000, 45], [100000, 60], [250000, 75], [Infinity, 90]]

/** 难度分推导：空会话判 25；否则 0.6×步数分 + 0.4×token 分，取整到整数。 */
function scoreOf(steps, tokens) {
  const s = Number(steps) || 0
  const t = Number(tokens) || 0
  if (s === 0 && t === 0) return 25
  const v = 0.6 * band(s, STEP_BANDS) + 0.4 * band(t, TOKEN_BANDS)
  return Math.max(1, Math.min(100, Math.round(v)))
}

function main() {
  const argv = process.argv.slice(2)
  const briefIdx = argv.indexOf('--brief')
  const outIdx = argv.indexOf('--out')
  const briefPath = briefIdx !== -1 ? argv[briefIdx + 1] : null
  const outPath = outIdx !== -1 ? argv[outIdx + 1] : 'naming-plan.json'

  if (!briefPath || !existsSync(briefPath)) {
    console.error('❌ 必须用 --brief <文件.json> 指定映射文件')
    process.exit(2)
  }

  const brief = JSON.parse(readFileSync(briefPath, 'utf8'))
  const audit = JSON.parse(readFileSync(brief.auditPath, 'utf8'))
  const byId = new Map(audit.items.map(it => [it.sessionId, it]))

  // 归位口径统一走共享模块（与批量改名器完全一致，避免两处判断错位）
  const home = audit.home
  const wsResolved = resolveWorkspacesFor(audit.items, home)
  for (const it of audit.items) it.workspaceResolved = wsResolved.get(it.sessionId)

  // 编号按**工作区**独立分配：不同项目的任务各自从 001 起编，
  // 这样编号在项目内连续可读，也避免跨项目把编号撑成三位数以上。
  // 先收集「工作区 → 字母 → 已用序号」，再为每个工作区独立取起始号。
  const usedByWs = {}
  for (const it of audit.items) {
    const m = /^\[([RFDSOQ])([0-9]{3})\]/.exec(it.currentTitle ?? '')
    if (!m) continue
    const ws = it.workspaceResolved
    ;((usedByWs[ws] ??= {})[m[1]] ??= new Set()).add(Number(m[2]))
  }

  const next = {}
  for (const [sid, spec] of Object.entries(brief.assign)) {
    const it = byId.get(sid)
    if (!it) continue
    const ws = it.workspaceResolved
    const key = `${ws}::${spec.letter}`
    if (next[key] === undefined) {
      const used = usedByWs[ws]?.[spec.letter] ?? new Set()
      let n = 1
      while (used.has(n)) n++
      next[key] = n
    }
  }

  const plan = []
  const skipped = []
  for (const [sid, spec] of Object.entries(brief.assign)) {
    const it = byId.get(sid)
    if (!it) { skipped.push({ sessionId: sid, reason: '审计数据中不存在该会话' }); continue }

    // 子代理会话由宿主 subagent routing 托管，改名会返回 agent-busy，
    // 生成方案时应直接剔除，避免产出"注定执行失败"的条目。
    if (it.isSubSession) { skipped.push({ sessionId: sid, reason: '子会话·宿主限制不可改名' }); continue }

    // 概述硬约束：1~8 个汉字，数字英文字母不计入
    const h = hanCount(spec.summary)
    if (h < 1 || h > 8) { skipped.push({ sessionId: sid, reason: `概述「${spec.summary}」汉字数 ${h}，须在 1~8` }); continue }

    const key = `${it.workspaceResolved}::${spec.letter}`
    const num = next[key]++
    const code = String(num).padStart(3, '0')
    const score = scoreOf(it.steps, it.decodeTokens)
    plan.push({
      sessionId: sid,
      title: `[${spec.letter}${code}][${score}分] ${spec.summary}`,
      _meta: {
        workspace: it.workspaceResolved,
        steps: it.steps,
        decodeTokens: it.decodeTokens,
        oldTitle: it.currentTitle,
        alreadyCompliant: it.compliant,
      },
    })
  }

  const out = plan.map(({ _meta, ...rest }) => rest)
  writeFileSync(outPath, JSON.stringify(out, null, 2))

  console.log(`=== 方案生成完成 ===`)
  console.log(`写入：${outPath}`)
  console.log(`条目：${plan.length} 条${skipped.length ? ` · 跳过 ${skipped.length} 条` : ''}`)
  if (skipped.length) for (const s of skipped) console.log(`   ⏭ ${s.sessionId}: ${s.reason}`)
  console.log('\n=== 明细（按工作区分组） ===')
  const byWs = {}
  for (const p of plan) (byWs[p._meta.workspace] ??= []).push(p)
  for (const [ws, arr] of Object.entries(byWs)) {
    console.log(`\n▸ ${ws}`)
    for (const p of arr) {
      console.log(`  ${p.title}`)
      console.log(`     ← 「${p._meta.oldTitle || '(空)'}」 (${p._meta.steps ?? '?'}步/${p._meta.decodeTokens ?? '?'}tok${p._meta.alreadyCompliant ? ' · 原已合规' : ''})`)
    }
  }
}

main()
