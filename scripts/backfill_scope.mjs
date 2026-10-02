#!/usr/bin/env node
// ==============================================================================
// 存量工程管控补课器 (Legacy Project Control Backfill) — REQ-092 / R1-b
// ------------------------------------------------------------------------------
// 为什么需要它（用户原话："必须新增和存量都要服从管控机制……修复这个问题"）：
//   全域覆盖审计实测 4/4 工程**未接管**（carrier / docs / runtime 三类全红）：
//   入口脚本不存在、AGENTS.md 里一条可解析的管控脚本引用都没有、从未调用过任何管控机制。
//   补课必须在**目标工程里落真实体**，而不是在被审计的文档里加一句话 —— 后者只是假合规。
//
//   本脚本对每个存量工程做三件事（幂等，可重复跑）：
//     ① 铺入口：把 `templates/project_control_shell.sh` 复制成该工程 `scripts/control.sh`（0755）；
//        薄壳只转发与留痕，**不复制任何判定逻辑**（判定逻辑唯一权威源仍在全局规则仓库）。
//     ② 正引用：在 `AGENTS.md` 里写入**可解析且真实存在**的管控入口引用（带绝对路径的全局规则命令），
//        消除"文档要求跑 ./scripts/xxx，而该脚本在本工程根本不存在"的悬空引用。
//     ③ 留痕：实跑一次该工程的 `scripts/control.sh selfcheck`，产出真实运行留痕（不认自述）。
//
// 用法：
//   node scripts/backfill_scope.mjs --apply            # 对全域未接管工程补课
//   node scripts/backfill_scope.mjs --apply --project DSH股票
//   node scripts/backfill_scope.mjs --dry-run          # 只打印将要做的事，不写盘
// 退出码：0 全部补课并复核通过；1 仍有工程未接管；2 用法错误
// ==============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, chmodSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { ROOT, SHELL_REL, auditProject, resolveDshRoot, DEFAULT_EXCLUDE } from './scope_audit.mjs'

const TEMPLATE = join(ROOT, 'templates', 'project_control_shell.sh')
const MARK_BEGIN = '<!-- DSH-CONTROL-SCOPE:BEGIN（由 scripts/backfill_scope.mjs 生成，勿手改本段） -->'
const MARK_END = '<!-- DSH-CONTROL-SCOPE:END -->'

/** 生成写进各工程 AGENTS.md 的管控接入段：引用**都是真实存在的路径**，故不会产生悬空引用。 */
export function renderScopeSection(projectName, globalRoot = ROOT) {
  const g = globalRoot
  return `${MARK_BEGIN}
## 〇、管控机制接入（REQ-092 · 全域同权，存量与新增一律生效）

> 本段由全局规则仓库的 \`scripts/backfill_scope.mjs\` 生成；**引用均为真实存在的路径**，
> 判定器 \`node ${g}/scripts/scope_audit.mjs --check\` 会逐条验证其可达性。

本工程受 **DSH 全域管控机制** 与 **底层物理锁 Agent (Physical Lock Agent)** 约束，与主控仓库同权。
开工第一动作与每次改动前的必跑项，统一走本工程入口 \`./scripts/control.sh\`（薄壳，转发全局规则，不复制判定逻辑）：

| 动作 | 本工程入口命令 | 全局规则权威载体（绝对路径，真实存在） |
| :--- | :--- | :--- |
| 首动改名（S05） | \`./scripts/control.sh naming\` | \`${g}/scripts/name_me.sh\` |
| 累积门禁 G0~G7 | \`./scripts/control.sh check\` | \`${g}/scripts/control_gates.sh\` |
| 底层物理锁阶梯 | \`./scripts/control.sh lock\` | \`${g}/scripts/physical_lock.sh\` |
| S07 待办常显 | \`./scripts/control.sh todo\` | \`${g}/scripts/todo_gate.sh\` |
| 需求版本贯通 | \`./scripts/control.sh version\` | \`${g}/scripts/req_version_audit.mjs\` |
| 全域覆盖审计 | \`./scripts/control.sh scope\` | \`${g}/scripts/scope_audit.mjs\` |
| 四入口自证 | \`./scripts/control.sh selfcheck\` | —（本工程内置，逐条实跑并写留痕） |

- **运行留痕**：每次调用都会追加一行到本工程 \`.dsh-control/run-audit.jsonl\`；
  "本工程到底跑没跑过管控"以该文件与会话转录为唯一依据，**不认自述**。
- **改名规范**：三段式 \`[分类编号][难度分] 8字概述\`，规范唯一权威源为
  \`${g}/knowledge/common/task_naming_spec.md\`；本工程需求台账 \`docs/requirements.md\` 记录实施版本与需求版本。
${MARK_END}`
}

/** 落入口脚本（幂等：内容不一致才覆盖，覆盖前先备份到同目录 .bak）。 */
function installShell(projectDir, dryRun) {
  const dst = join(projectDir, SHELL_REL)
  const src = readFileSync(TEMPLATE, 'utf8')
  const cur = existsSync(dst) ? readFileSync(dst, 'utf8') : null
  if (cur === src) return { action: 'unchanged', dst }
  if (dryRun) return { action: cur ? 'update' : 'create', dst }
  mkdirSync(dirname(dst), { recursive: true })
  if (cur) writeFileSync(dst + '.bak', cur, 'utf8')
  writeFileSync(dst, src, 'utf8')
  chmodSync(dst, 0o755)
  return { action: cur ? 'update' : 'create', dst }
}

/** 在 AGENTS.md 里注入/替换管控接入段（标记块，幂等）。 */
function installAgentsSection(projectDir, projectName, globalRoot, dryRun) {
  const dst = join(projectDir, 'AGENTS.md')
  const section = renderScopeSection(projectName, globalRoot)
  const cur = existsSync(dst) ? readFileSync(dst, 'utf8') : ''
  let next
  if (cur.includes(MARK_BEGIN) && cur.includes(MARK_END)) {
    next = cur.replace(new RegExp(`${MARK_BEGIN}[\\s\\S]*?${MARK_END}`), section)
  } else {
    // 插到标题与首个二级标题之间（保持 README 风格：先约束后细节）
    const idx = cur.indexOf('\n## ')
    next = idx >= 0 ? cur.slice(0, idx + 1) + '\n' + section + '\n' + cur.slice(idx + 1) : (cur ? cur + '\n\n' + section + '\n' : section + '\n')
  }
  const changed = next !== cur
  if (changed && !dryRun) writeFileSync(dst, next, 'utf8')
  return { action: changed ? (cur.includes(MARK_BEGIN) ? 'update' : 'inject') : 'unchanged', dst }
}

/** 实跑一次入口自证，产出运行留痕（真实退出码原样打印，不美化）。 */
function runSelfcheck(projectDir) {
  const shell = join(projectDir, SHELL_REL)
  if (!existsSync(shell)) return { ok: false, code: -1, out: '入口不存在' }
  try {
    const out = execFileSync('bash', [shell, 'selfcheck'], { cwd: projectDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 })
    return { ok: true, code: 0, out }
  } catch (e) {
    return { ok: false, code: typeof e.status === 'number' ? e.status : -1, out: String(e.stdout || '') + String(e.stderr || '') }
  }
}

function main() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const apply = argv.includes('--apply')
  const onlyIdx = argv.indexOf('--project')
  const only = onlyIdx >= 0 ? argv[onlyIdx + 1] : null
  if (!dryRun && !apply) {
    console.error('用法：node scripts/backfill_scope.mjs --apply|--dry-run [--project 名称]')
    process.exit(2)
  }

  const dshRoot = resolveDshRoot(null)
  let names = readdirSync(dshRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !DEFAULT_EXCLUDE.includes(e.name))
    .map((e) => e.name)
  if (only) names = names.filter((n) => n === only)

  console.log(`🔧 存量工程管控补课${dryRun ? '（预览，不写盘）' : ''}`)
  console.log(`   工作根：${dshRoot} · 全局规则：${ROOT}`)
  const results = []
  for (const name of names) {
    const dir = join(dshRoot, name)
    const before = auditProject(name, dir, { globalRoot: ROOT, skipTranscript: true })
    const shell = installShell(dir, dryRun)
    const agents = installAgentsSection(dir, name, ROOT, dryRun)
    const run = dryRun ? { ok: false, code: -1, out: '（预览未实跑）' } : runSelfcheck(dir)
    const after = auditProject(name, dir, { globalRoot: ROOT, skipTranscript: false })
    results.push({ name, before: before.passed, after: after.passed, total: after.total, ok: after.ok, shell: shell.action, agents: agents.action, run })
    console.log(`\n📦 ${name}`)
    console.log(`   入口：${shell.action} · AGENTS.md：${agents.action} · 自证：${run.ok ? '✅ 退出码 0' : `❌ 退出码 ${run.code}`}`)
    console.log(`   覆盖：${before.passed}/${before.total} → ${after.passed}/${after.total}${after.ok ? ' ✅ 已接管' : ' ❌ 仍未接管'}`)
    for (const [k, v] of Object.entries(after.items)) if (!v.ok) console.log(`      ⛔ ${k}：${v.detail}`)
    if (run.out) for (const line of run.out.trim().split('\n').slice(0, 5)) console.log(`      │ ${line}`)
  }

  const still = results.filter((r) => !r.ok)
  console.log(`\n${still.length === 0 ? '🎉 全部工程已接管' : `⛔ 仍有 ${still.length} 个工程未接管：${still.map((s) => s.name).join('、')}`}`)
  process.exit(still.length === 0 ? 0 : 1)
}

main()
