#!/usr/bin/env node
// ==============================================================================
// 门禁注册表 (Gate Registry) —— REQ-103 / CTRL-CONVERGE · C1-a
// ------------------------------------------------------------------------------
// 为什么需要它（实测病根）：
//   同一件事实（门禁叫什么、判据是什么、失败该提示什么、显示几个格子）
//   在本仓库被写了 **四遍**，彼此不同源，于是产生三类可复现缺陷：
//     ① `scripts/control_gates.sh` 的失败提示把判定器名字**写死成常量字符串**，
//        实测 G6 判红真因是 `token_budget_audit.mjs`，提示却指向
//        `control_profiler.sh` / `task_layer_tree.mjs`（把人引去修不需要修的脚本）；
//     ② `ai-control/plugin/index.mjs` 把 `100% (4/4) 🟢 全部门禁通过` 写成**字面量**，
//        与磁盘实况无关，且只展示前 4 项指标（G5~G7 与 G0 不可见）；
//     ③ G0（会话命名）有**一票否决权**却不占槽位（`GATE_IDS` 只有 7 项），
//        看板因此把 G0 的否决渲染成"卡点：G7 会话未合规命名"，
//        并出现 `100% · 7/7 门禁通过` 与 `EXIT=1` 同屏并存的矛盾。
//
// 本文件是上面四件事的**唯一机读来源**。判定逻辑（怎么判）一律不搬进来——
// 这里只回答"叫什么、判据在哪、失败提示什么、入不入分母"。
//
// 使用（三方共同消费，禁止再各写一份）：
//   shell 侧：`. "$ROOT/scripts/lib/gate_registry.sh"` 或直接调本文件的 CLI
//   JS 侧  ：`import { GATES, NAMING_GATE, judgeFailHint } from '.../gates_registry.mjs'`
//   CLI    ：node ai-control/config/gates_registry.mjs --json
//            node ai-control/config/gates_registry.mjs --hint <gate-id> <失败项名,逗号分隔>
//
// 退出码：0 正常输出；2 取不到证据（注册表形状非法）
// ==============================================================================

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** 三态语义（全仓唯一出处）：0 通过 / 1 未达标 / 2 不可判定 */
export const TRI_STATE = Object.freeze({
  PASS: 0,
  FAIL: 1,
  UNDECIDABLE: 2,
})

/**
 * G0：会话命名。**有否决权但可配置是否入分母**。
 * 历史缺陷（D2 / optimize_9.md §7.7）正是"有否决权却不占槽位"，
 * 故此处把 `inDenominator` 显式声明出来，由判定器断言，而不是藏在数组长度里。
 */
export const NAMING_GATE = Object.freeze({
  id: 'naming',
  seq: 0,
  name: '会话命名',
  inDenominator: false,
  note: '一票否决：不合规即 execAllowed=false（不计入 7 项分母，但必须单列展示，禁止渲染成其它门禁）',
  judges: [{ file: 'scripts/check_task_naming.sh', args: ['--exit'], label: '会话命名合规' }],
  hints: {
    fail: '会话命名不合规：标题必须为「[分类编号][难度分] 概述」三段式；修复入口 `./scripts/control.sh naming "<标题>"`',
    undecidable: '会话命名无法判定：标题未记录或宿主转录取不到标题（不得折算为通过）',
    pass: '会话标题符合三段式规范',
  },
})

/**
 * G1~G7：累积门禁。`judges` 为空表示"门禁本体内建判定"（不存在外部判定器文件），
 * 此时 `hint` 由门禁自己给出，注册表只登记名字与是否入分母。
 */
export const GATES = Object.freeze([
  {
    id: 'init', seq: 1, name: '项目初始化', inDenominator: true,
    desc: '仓库、目录骨架、防丢文件齐备',
    judges: [],
    hints: { fail: '骨架或防丢文件缺失：补齐 11/11 骨架与 12/12 防丢覆盖', pass: '骨架与防丢文件齐备' },
  },
  {
    id: 'structure', seq: 2, name: '工程结构化', inDenominator: true,
    desc: '目录有主、无孤儿目录与散落垃圾',
    judges: [],
    hints: { fail: '结构不合规：见上方孤儿目录 / 垃圾文件 / 重复层级明细', pass: '结构合规、无孤儿目录与散落垃圾' },
  },
  {
    id: 'sync', seq: 3, name: '需求文档同步', inDenominator: true,
    desc: '台账条目数与 Git 工作树对齐',
    judges: [],
    hints: { fail: '台账与工作树未对齐：先提交或修正缺号', pass: '台账与工作树已对齐' },
  },
  {
    id: 'redundancy', seq: 4, name: '冗余检测', inDenominator: true,
    desc: '实质重复率与重复标题在健康区',
    judges: [{ file: 'scripts/redundancy_scan.mjs', args: ['--json'], label: '实质重复率' }],
    hints: { fail: '冗余超标：先跑 `node scripts/redundancy_scan.mjs --root .` 定位高相似块', pass: '无实质冗余' },
  },
  {
    id: 'integrity', seq: 5, name: '落地与版本一致性', inDenominator: true,
    desc: '全域覆盖/需求版本贯通/无悬空引用（REQ-092）',
    // 与 control_gates.sh 的 check_integrity 循环同源；增删判据只改这里
    judges: [
      { file: 'scripts/scope_audit.mjs', args: ['--check'], label: '全域管控覆盖' },
      { file: 'scripts/req_version_audit.mjs', args: ['--check'], label: '需求版本贯通' },
      { file: 'scripts/anti_hallucination_audit.mjs', args: ['--check'], label: '无悬空引用与空架子' },
      { file: 'scripts/mobile_bridge_audit.mjs', args: ['--check'], label: '手机远端操控可达（REQ-094）' },
      { file: 'scripts/session_source_audit.mjs', args: ['--check'], label: '会话消息来源合规（REQ-096）' },
      { file: 'scripts/knowledge_audit.mjs', args: ['--check'], label: '知识库条目与索引双向可达（REQ-097 R3）' },
      { file: 'scripts/cli_plan_audit.mjs', args: ['--check'], label: '立项 CLI 规划在位且真实（REQ-097 R4）' },
      { file: 'scripts/domain_scope_selftest.mjs', args: ['--check'], label: '全域写拦截判定有牙' },
    ],
    hints: {
      fail: '落地与版本一致性未达标：按下方失败项逐个跑对应判定器',
      undecidable: '落地与版本一致性不可判定（判定器缺失或取不到证据）——不得折算为通过',
      pass: '全域已接管 · 需求版本四处一致 · 无悬空引用且机制有运行凭据',
    },
  },
  {
    id: 'concurrency', seq: 6, name: '执行层并发与载体一致性', inDenominator: true,
    desc: '任务层树可溯源/并发调度有牙/安装队列有界/技能载体齐备/管控篇幅受管（REQ-093）',
    judges: [
      { file: 'scripts/task_layer_tree.mjs', args: ['--check'], label: '任务执行层树可溯源' },
      { file: 'scripts/butler_scheduler.mjs', args: ['--check'], label: '并发调度有牙(拒死锁/活锁)' },
      { file: 'scripts/plugin_install_queue.mjs', args: ['--check'], label: '安装队列有界不空等' },
      { file: 'scripts/skill_carrier_audit.mjs', args: ['--check'], label: '技能层载体齐备' },
      { file: 'scripts/token_budget_audit.mjs', args: ['--check'], label: '管控篇幅受管且能力不降' },
      { file: 'scripts/zone_concurrency.mjs', args: ['--check'], label: '区间并发可证(跨区间并发/同区间串行)' },
      { file: 'scripts/control_profiler.sh', args: ['--check'], label: '耗时预算可证(实测整跑在预算内)' },
      { file: 'scripts/gate_registry_audit.mjs', args: ['--check'], label: '门禁注册表自洽且提示引用实际失败项（REQ-103）' },
    ],
    hints: {
      fail: '执行层并发与载体一致性未达标：按下方失败项逐个跑对应判定器',
      undecidable: '执行层并发与载体一致性不可判定（判定器缺失或取不到证据）——不得折算为通过',
      pass: '任务层树可溯源 · 并发调度拒死锁活锁 · 安装队列有界 · 技能载体齐备 · 管控篇幅只减不涨 · 区间并发可证 · 耗时在预算内（REQ-102）',
    },
  },
  {
    id: 'score', seq: 7, name: '纪律分', inDenominator: true,
    desc: '纪律账本哈希链自洽、当前分在阈值之上（REQ-098）',
    judges: [{ file: 'scripts/discipline_score.mjs', args: ['--check', '--json'], label: '纪律分' }],
    hints: {
      fail: '纪律分判定未通过：跑 `node scripts/discipline_score.mjs status` 查扣分构成；停用须用户 `resume --by user`',
      undecidable: '纪律账本不可判定（无输出即不可判定）——不得折算为通过',
      pass: '纪律分正常：账本哈希链自洽且未触发停用',
    },
  },
])

/** 全部门禁（含 G0），按 seq 升序 */
export const ALL_GATES = Object.freeze([NAMING_GATE, ...GATES])

/** 计入分母的门禁数（断言之用；不再靠数组长度隐式表达） */
export const DENOMINATOR_SIZE = ALL_GATES.filter((g) => g.inDenominator).length

export function gateById(id) {
  return ALL_GATES.find((g) => g.id === id) ?? null
}

/**
 * 生成"未达标"提示：**必须引用实际失败项**，禁止写成固定名单。
 * @param {string} gateId
 * @param {string[]} failedLabels 实际判红的判据标签
 * @param {string[]} undecidedLabels 实际不可判定的判据标签
 */
export function judgeFailHint(gateId, failedLabels = [], undecidedLabels = []) {
  const gate = gateById(gateId)
  if (!gate) return `未知门禁：${gateId}`
  const parts = []
  if (failedLabels.length) {
    parts.push(`未达标 ${failedLabels.length} 项：${failedLabels.map((l) => `「${l}」`).join('、')}`)
  }
  if (undecidedLabels.length) {
    parts.push(`不可判定 ${undecidedLabels.length} 项：${undecidedLabels.map((l) => `「${l}」`).join('、')}`)
  }
  const head = parts.length ? parts.join('；') : (gate.hints.fail ?? '未达标')
  const cmds = (gate.judges ?? [])
    .filter((j) => [...failedLabels, ...undecidedLabels].includes(j.label))
    .map((j) => `\`${j.file.endsWith('.sh') ? 'bash' : 'node'} ${j.file} ${j.args.join(' ')}\``)
  return cmds.length ? `${head} —— 定向复跑：${cmds.join('、')}` : head
}

/** 形状自检：注册表自身非法时返回问题清单（空数组=合法） */
export function validateRegistry() {
  const problems = []
  if (ALL_GATES.length === 0) problems.push('门禁全集为空')
  const ids = ALL_GATES.map((g) => g.id)
  if (new Set(ids).size !== ids.length) problems.push('门禁 id 有重复')
  const seqs = ALL_GATES.map((g) => g.seq)
  if (new Set(seqs).size !== seqs.length) problems.push('门禁 seq 有重复')
  for (const g of ALL_GATES) {
    for (const k of ['id', 'seq', 'name', 'inDenominator', 'judges', 'hints']) {
      if (!(k in g)) problems.push(`门禁 ${g.id ?? '?'} 缺字段 ${k}`)
    }
    if (typeof g.inDenominator !== 'boolean') problems.push(`门禁 ${g.id} 的 inDenominator 不是布尔`)
    if (!g.hints?.fail) problems.push(`门禁 ${g.id} 缺 hints.fail（失败提示不可为空）`)
    for (const j of g.judges ?? []) {
      if (!j.file) problems.push(`门禁 ${g.id} 有判据缺 file`)
      // 判据文件必须真实存在：注册表是"引用即须可达"的受管对象
      if (j.file && !existsSync(join(ROOT, j.file))) problems.push(`门禁 ${g.id} 的判据文件不存在：${j.file}`)
    }
  }
  if (DENOMINATOR_SIZE !== 7) problems.push(`计入分母的门禁数应为 7，实得 ${DENOMINATOR_SIZE}`)
  return problems
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
if (argv[0] === '--json') {
  const problems = validateRegistry()
  if (problems.length) {
    console.log(JSON.stringify({ ok: false, problems }, null, 2))
    process.exit(TRI_STATE.UNDECIDABLE)
  }
  console.log(JSON.stringify({
    ok: true,
    denominatorSize: DENOMINATOR_SIZE,
    namingInDenominator: NAMING_GATE.inDenominator,
    gates: ALL_GATES.map((g) => ({
      id: g.id, seq: g.seq, name: g.name, inDenominator: g.inDenominator,
      judges: (g.judges ?? []).map((j) => j.file), hints: g.hints,
    })),
  }, null, 2))
  process.exit(TRI_STATE.PASS)
}

if (argv[0] === '--judges') {
  // 供 shell 侧派生判据清单：输出 "判据文件名|标签" 逐行（唯一机读来源）
  const gate = gateById(argv[1] ?? '')
  if (!gate) {
    console.error(`未知门禁：${argv[1] ?? '(空)'}`)
    process.exit(TRI_STATE.UNDECIDABLE)
  }
  for (const j of gate.judges ?? []) {
    console.log(`${j.file.split('/').pop()}|${j.label}`)
  }
  process.exit(TRI_STATE.PASS)
}

if (argv[0] === '--hint') {
  const [, gateId, failedRaw = '', undecidedRaw = ''] = argv
  const split = (s) => String(s).split(',').map((x) => x.trim()).filter(Boolean)
  console.log(judgeFailHint(gateId, split(failedRaw), split(undecidedRaw)))
  process.exit(TRI_STATE.PASS)
}

if (argv[0] === '--verify') {
  const problems = validateRegistry()
  if (problems.length) {
    console.error('⛔ 门禁注册表形状非法：')
    for (const p of problems) console.error(`   · ${p}`)
    process.exit(TRI_STATE.FAIL)
  }
  console.log(`✅ 门禁注册表合法：${ALL_GATES.length} 项（G0 + G1~G7，计入分母 ${DENOMINATOR_SIZE} 项）`)
  process.exit(TRI_STATE.PASS)
}

// 被 import 时不执行任何副作用；直接运行时给用法
if (process.argv[1] && process.argv[1].endsWith('gates_registry.mjs')) {
  console.log('用法：node ai-control/config/gates_registry.mjs [--json|--verify|--hint <gate-id> <失败项,...>]')
}
