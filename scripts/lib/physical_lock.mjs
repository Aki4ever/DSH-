/**
 * ==============================================================================
 * 底层物理锁 Agent (Physical Lock Agent / PLA) 核心模块
 * ==============================================================================
 * 定位：
 *   把管控机制的标准流程从"逻辑口头约定"升维为"底层物理串行阻断锁"。
 *   必须完成上一步并产生客观落盘凭据，才可以执行下一步，从物理层级规范化执行流程。
 *   在全域所有项目中通用生效。
 *
 * 核心阶梯 (Strict Monotonic Lock Stages):
 *   STAGE 0: INIT          - 初始探境，未完成首动改名与开工门禁。仅允许只读探查。
 *   STAGE 1: SPEC_PASSED   - 已合规命名且 G0~G4 门禁全绿。进入筹策阶段（必须先 todo_write）。
 *   STAGE 2: PLAN_PASSED   - 已激活 todo_write 任务分解。进入攻坚修改阶段（允许受控写改）。
 *   STAGE 3: VERIFY_PASSED - 已完成写后读回与单测验证。进入归卷阶段（允许提交与结项）。
 *   STAGE 4: DELIVERED     - 已完成全链路强闭环并审计结项。
 * ==============================================================================
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { parseTitle } from './auto_naming.mjs'

export const STAGES = {
  INIT: 0,
  SPEC_PASSED: 1,
  PLAN_PASSED: 2,
  VERIFY_PASSED: 3,
  DELIVERED: 4,
}

export const STAGE_NAMES = {
  [STAGES.INIT]: 'LOCK-0 (初始探境)',
  [STAGES.SPEC_PASSED]: 'LOCK-1 (探境定标达成·待筹策)',
  [STAGES.PLAN_PASSED]: 'LOCK-2 (筹策分解达成·攻坚中)',
  [STAGES.VERIFY_PASSED]: 'LOCK-3 (质检验证达成·待归卷)',
  [STAGES.DELIVERED]: 'LOCK-4 (归卷结项达成·全闭环)',
}

/** 默认存储根目录 */
export function getLockDir(dshHome) {
  const home = dshHome || process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, '.dsh-control', 'physical_locks')
}

/** 获取锁文件路径 */
export function getLockFilePath(sessionId, dshHome) {
  const sid = sessionId || process.env.DSH_SESSION_ID || 'global_session'
  const safeSid = sid.replace(/[^a-zA-Z0-9_-]/g, '_')
  return join(getLockDir(dshHome), `${safeSid}.json`)
}

/** 初始化或读取当前锁状态 */
export async function getLockState(sessionId, dshHome) {
  const file = getLockFilePath(sessionId, dshHome)
  try {
    if (existsSync(file)) {
      const raw = await readFile(file, 'utf8')
      const data = JSON.parse(raw)
      if (typeof data.stage === 'number') {
        return data
      }
    }
  } catch {
    // 降级使用默认
  }

  return {
    version: '1.0.0',
    sessionId: sessionId || process.env.DSH_SESSION_ID || 'global_session',
    stage: STAGES.INIT,
    stageName: STAGE_NAMES[STAGES.INIT],
    updatedAt: new Date().toISOString(),
    proofs: {},
    history: [
      { stage: STAGES.INIT, at: new Date().toISOString(), note: '物理锁初始化' }
    ]
  }
}

/** 持久化锁状态 */
export async function saveLockState(state, dshHome) {
  const file = getLockFilePath(state.sessionId, dshHome)
  try {
    await mkdir(dirname(file), { recursive: true })
    state.updatedAt = new Date().toISOString()
    state.stageName = STAGE_NAMES[state.stage] || `STAGE_${state.stage}`
    await writeFile(file, JSON.stringify(state, null, 2), 'utf8')
    return true
  } catch (err) {
    return false
  }
}

/**
 * 推进锁阶梯（只能向前，不可逆，必须提供客观证据）
 */
export async function advanceLock(sessionId, targetStage, proofData, dshHome) {
  const state = await getLockState(sessionId, dshHome)
  if (targetStage <= state.stage) {
    // 幂等：若已在目标或更高阶段，直接更新证据
    if (proofData) {
      state.proofs[targetStage] = { ...state.proofs[targetStage], ...proofData, at: new Date().toISOString() }
      await saveLockState(state, dshHome)
    }
    return { success: true, stage: state.stage, changed: false }
  }

  // 必须严格一步一步走：目标阶段不能大于当前阶段 + 1
  if (targetStage > state.stage + 1) {
    return {
      success: false,
      stage: state.stage,
      error: `不可跨阶级跳步！当前处于 ${STAGE_NAMES[state.stage]}，必须先完成下一阶，不可直接跳至 ${STAGE_NAMES[targetStage]}`
    }
  }

  state.stage = targetStage
  state.proofs[targetStage] = { ...(proofData || {}), at: new Date().toISOString() }
  state.history.push({ stage: targetStage, at: new Date().toISOString(), note: `阶梯晋升至 ${STAGE_NAMES[targetStage]}` })

  await saveLockState(state, dshHome)
  return { success: true, stage: state.stage, changed: true }
}

/** 重置锁状态 */
export async function resetLock(sessionId, dshHome) {
  const state = {
    version: '1.0.0',
    sessionId: sessionId || process.env.DSH_SESSION_ID || 'global_session',
    stage: STAGES.INIT,
    stageName: STAGE_NAMES[STAGES.INIT],
    updatedAt: new Date().toISOString(),
    proofs: {},
    history: [
      { stage: STAGES.INIT, at: new Date().toISOString(), note: '物理锁被重置' }
    ]
  }
  await saveLockState(state, dshHome)
  return state
}

/**
 * 核心判定：评估一次工具调用是否被物理锁阻断
 * @param {Object} execution - 工具调用对象 { name, arguments }
 * @param {Object} lockState - 当前物理锁状态
 * @returns {Object|null} - 阻断信息对象，若放行则返回 null
 */
export function evaluatePhysicalLock(execution, lockState) {
  if (!lockState) return null
  const toolName = String(execution?.name || '')
  if (!toolName) return null

  const currentStage = lockState.stage ?? STAGES.INIT

  // 1. 只读探查与辅助工具任何阶段始终放行
  const readOnlyTools = ['read', 'grep', 'glob', 'ask_user_question', 'job_output', 'job_list', 'list_agents', 'render_ui', 'validate_dsh_ui']
  if (readOnlyTools.includes(toolName)) {
    return null
  }

  // 2. STAGE 0 (INIT)：未完成探境定标
  //    在此阶段，严禁任何业务代码改动或攻坚工具调用
  if (currentStage === STAGES.INIT) {
    // 允许调用改名脚本或门禁检查
    if (toolName === 'bash' || toolName === 'pwsh') {
      const cmd = String(execution?.arguments?.command || '')
      if (cmd.includes('name_me.sh') || cmd.includes('control_gates.sh') || cmd.includes('physical_lock.sh')) {
        return null
      }
    }
    // 其它改动型操作全部物理拦截
    if (['write', 'edit', 'bash', 'pwsh'].includes(toolName)) {
      return {
        stage: currentStage,
        stageName: STAGE_NAMES[currentStage],
        toolName,
        requiredStage: STAGES.SPEC_PASSED,
        requiredStageName: STAGE_NAMES[STAGES.SPEC_PASSED],
        message: `🚨 [物理锁阻断] 当前处于 ${STAGE_NAMES[currentStage]}！在执行任何实质改动前，必须先完成第〇步首动改名 (name_me.sh) 与 G0~G4 门禁检查！`
      }
    }
  }

  // 3. STAGE 1 (SPEC_PASSED)：探境定标已过，但未完成筹策分解
  //    必须先调用 todo_write 激活任务分解，严禁直接调用 write/edit 修改代码
  if (currentStage === STAGES.SPEC_PASSED) {
    if (toolName === 'todo_write') {
      return null // 放行 todo_write，这是本阶段必须完成的动作！
    }
    if (toolName === 'bash' || toolName === 'pwsh') {
      const cmd = String(execution?.arguments?.command || '')
      if (cmd.includes('global_scheduler_lock.sh') || cmd.includes('physical_lock.sh') || cmd.includes('redundancy_scan.mjs')) {
        return null
      }
    }
    if (['write', 'edit'].includes(toolName)) {
      return {
        stage: currentStage,
        stageName: STAGE_NAMES[currentStage],
        toolName,
        requiredStage: STAGES.PLAN_PASSED,
        requiredStageName: STAGE_NAMES[STAGES.PLAN_PASSED],
        message: `🚨 [物理锁阻断] 当前处于 ${STAGE_NAMES[currentStage]}！必须先调用 todo_write 激活结构化任务分解，才允许进入攻坚修改代码阶段！`
      }
    }
  }

  // 4. STAGE 2 (PLAN_PASSED)：筹策分解完成，允许攻坚修改代码
  //    放行 write / edit 与编译命令；但严禁在未质检的情况下执行 git push 归卷
  if (currentStage === STAGES.PLAN_PASSED) {
    if (toolName === 'bash' || toolName === 'pwsh') {
      const cmd = String(execution?.arguments?.command || '')
      if (cmd.includes('git push') || cmd.includes('git_sync_remote.sh')) {
        return {
          stage: currentStage,
          stageName: STAGE_NAMES[currentStage],
          toolName,
          requiredStage: STAGES.VERIFY_PASSED,
          requiredStageName: STAGE_NAMES[STAGES.VERIFY_PASSED],
          message: `🚨 [物理锁阻断] 攻坚修改尚未经过质检验证！必须完成写后读回校验、运行测试命令与双检扫描后，才允许提交推送与归卷！`
        }
      }
    }
    return null
  }

  // 5. STAGE 3 (VERIFY_PASSED) & STAGE 4 (DELIVERED)：放行
  return null
}
