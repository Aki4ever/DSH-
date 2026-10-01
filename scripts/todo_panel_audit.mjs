#!/usr/bin/env node
/**
 * ==============================================================================
 * 脚本名称：todo_panel_audit.mjs
 * 核心功能：任务列表面板（逐条进度 + 完成打钩）的**载体在位判定** —— 真实调用渲染函数并断言输出
 * 需求依据：REQ-083（原机制）· REQ-093 / R5（载体迁移与触达清零）
 * ------------------------------------------------------------------------------
 * 为什么必须写这个判定器（2026-10-02 实测根因）：
 *   该机制的原载体是 `scripts/patch_dsh_todo_progress.cjs` —— 给**宿主前端成品包打补丁**。
 *   两层叠加使其永久失效：① 宿主由 `DSH Desktop.app` 更名为 `DeepSeek Harness.app`；
 *   ② 前端成品由"可写目录"变成塞进 `app.asar`（121 MB 签名产物）。
 *   于是 `mechanism_audit` 长期报「找不到宿主前端产物」，而**没有东西会把机制重新落地**。
 *   本轮按 REQ-089 D4 裁决换载体：改由拦截层插件的常显看板承载。
 *
 * 判定口径（三条全过才算触达，缺一即判红）：
 *   ① 载体在位且可解析：`ai-control/plugin/index.mjs` 存在、语法可解析、导出 `renderTodoPanel`；
 *   ② **行为断言**（不是字符串检查）：真实调用该函数，喂 1 完成 + 1 进行中 + 1 待办，
 *      断言输出含 ✅ / 🔄 / ⬜ 三种打钩、含逐条文字、含百分比；再喂空列表，
 *      断言返回空数组（**不得画假进度条占位**）；
 *   ③ 载体已进宿主：profile 的 `dependencies` + `dsh.profile.bundles` 双登记
 *      （走 bundles 通道，宿主重写层栈补丁抹不掉）。
 *
 * 用法：
 *   node scripts/todo_panel_audit.mjs            # 人读报告
 *   node scripts/todo_panel_audit.mjs --check    # 判定（退出码即结论）
 *   node scripts/todo_panel_audit.mjs --self-test  # 反向用例：把渲染函数换成假实现，必须判红
 *
 * 退出码：0 通过 · 1 判红 · 2 取不到证据
 * ==============================================================================
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PLUGIN = path.join(ROOT, 'ai-control/plugin/index.mjs')
const ENTRY_PKG = 'dsh-plugin-execution-control'
const FIXTURE = [
  { content: '已完成的第一步', status: 'completed' },
  { content: '正在推进的第二步', status: 'in_progress' },
  { content: '尚未开始的第三步', status: 'pending' },
]

/** 入参是 **DSH 家目录**（`$DSH_HOME`，通常为 `~/.dsh`），不是 shell 的 `$HOME`。 */
function resolveProfileDir(dshHome) {
  const root = path.join(dshHome, 'profiles')
  try {
    for (const d of fs.readdirSync(root)) {
      const p = path.join(root, d)
      if (fs.existsSync(path.join(p, 'package.json'))) return p
    }
  } catch {
    /* 没有 profile 目录是"取不到证据"，由调用方判定 */
  }
  return null
}

export function audit(opts = {}) {
  const issues = []
  const facts = {}

  // ① 载体在位且可解析
  facts.pluginExists = fs.existsSync(PLUGIN)
  if (!facts.pluginExists) {
    return { ok: false, exit: 2, reason: `载体不在位：${path.relative(ROOT, PLUGIN)}`, issues }
  }
  try {
    execFileSync(process.execPath, ['--check', PLUGIN], { stdio: 'pipe' })
    facts.syntaxOk = true
  } catch {
    facts.syntaxOk = false
    issues.push('载体语法解析失败 —— 插件无法加载，机制等于不存在')
  }
  const source = fs.readFileSync(PLUGIN, 'utf8')
  facts.exportsRenderer = /export\s+function\s+renderTodoPanel\s*\(/.test(source)
  if (!facts.exportsRenderer) issues.push('载体未导出 renderTodoPanel —— 面板没有可调用的物理实现')

  // ③ 载体已进宿主（双登记）
  const dshHome = opts.dshHome || process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  const profileDir = resolveProfileDir(dshHome)
  facts.dshHome = dshHome
  facts.profileDir = profileDir
  if (!profileDir) {
    issues.push('取不到 profile：无法证明载体已进宿主')
    facts.registered = false
  } else {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(profileDir, 'package.json'), 'utf8'))
      const dep = !!(j.dependencies && j.dependencies[ENTRY_PKG])
      const bundle = !!(j.dsh && j.dsh.profile && Array.isArray(j.dsh.profile.bundles) && j.dsh.profile.bundles.includes(ENTRY_PKG))
      facts.registered = dep && bundle
      if (!dep) issues.push(`profile dependencies 未登记 ${ENTRY_PKG}`)
      if (!bundle) issues.push(`profile dsh.profile.bundles 未登记 ${ENTRY_PKG}`)
    } catch (error) {
      facts.registered = false
      issues.push(`profile package.json 不可读：${error.message}`)
    }
  }

  return { ok: true, exit: issues.length ? 1 : 0, issues, facts, source }
}

/** ② 行为断言：真实调用渲染函数，不检查字符串。 */
export async function behaviorCheck(opts = {}) {
  const issues = []
  const mod = await import(pathToFileURL(PLUGIN).href)
  const fn = opts.renderer || mod.renderTodoPanel
  if (typeof fn !== 'function') {
    return { issues: ['renderTodoPanel 不是函数，无法做行为断言'], rendered: [] }
  }
  const rendered = fn(FIXTURE) || []
  const text = rendered.join('\n')
  const wants = [
    ['完成打钩 ✅', text.includes('✅')],
    ['进行中标记 🔄', text.includes('🔄')],
    ['待办标记 ⬜', text.includes('⬜')],
    ['逐条文字（3 条）', FIXTURE.every((f) => text.includes(f.content))],
    ['总进度百分比', /\d+%/.test(text)],
    ['进度条', /[█░]{5,}/.test(text)],
  ]
  for (const [name, ok] of wants) if (!ok) issues.push(`行为断言未过：${name}`)

  // 空列表必须返回空 —— 宁可什么都不画，也不许画假进度条
  const empty = fn([]) || []
  if (!Array.isArray(empty) || empty.length !== 0) issues.push('空列表时未返回空数组（画了假进度条占位）')

  return { issues, rendered, text }
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--self-test')) {
    // 反向用例：用一个"永远返回空 + 不画打钩"的假实现，行为断言必须判红
    const fake = () => []
    const r = await behaviorCheck({ renderer: fake })
    const caught = r.issues.some((i) => i.includes('完成打钩')) && r.issues.some((i) => i.includes('逐条文字'))
    console.log('🧪 任务列表面板判定器 · 反向用例自检')
    console.log('-----------------------------------------')
    console.log(`   注入假实现（永远返回空数组）：判定 ${caught ? '已判红（✅）' : '未判红（❌）'}`)
    for (const i of r.issues.slice(0, 3)) console.log(`   · ${i}`)
    console.log('-----------------------------------------')
    console.log(caught ? '✅ 反向用例通过：假载体必被判红' : '⛔ 反向用例失败：判定器是恒亮绿灯')
    process.exit(caught ? 0 : 1)
  }

  const res = audit()
  if (!res.ok) {
    console.log(`⛔ 取不到证据：${res.reason}`)
    process.exit(2)
  }
  const beh = await behaviorCheck()
  const issues = [...res.issues, ...beh.issues]

  console.log('📋 任务列表面板（逐条进度 + 完成打钩）· 载体判定')
  console.log('-----------------------------------------')
  console.log(`载体：${path.relative(ROOT, PLUGIN)}`)
  console.log(`  ${res.facts.pluginExists ? '✅' : '⛔'} 文件在位 · ${res.facts.syntaxOk ? '✅' : '⛔'} 语法可解析 · ${res.facts.exportsRenderer ? '✅' : '⛔'} 导出 renderTodoPanel`)
  console.log(`  ${res.facts.registered ? '✅' : '⛔'} 已进宿主（dependencies + bundles 双登记）`)
  console.log('行为断言（真实调用，不查字符串）：')
  for (const line of beh.rendered || []) console.log(`  ${line}`)
  console.log('-----------------------------------------')
  if (issues.length) {
    for (const i of issues) console.log(`   ⛔ ${i}`)
    console.log(`⛔ 未触达物理实现层：${issues.length} 项未过`)
    process.exit(1)
  }
  console.log('✅ 已触达：载体在位 · 逐条打钩与总进度可复算 · 空列表不画假进度 · 已进宿主 bundles 通道')
  process.exit(0)
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main()
