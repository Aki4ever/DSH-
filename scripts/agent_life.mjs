#!/usr/bin/env node
/**
 * agent_life.mjs
 * 全局任务流程调度中枢 Agent Life 辅助引擎
 * 负责阶段状态追踪、原子反馈校验、锁状态裁决与下一步工序调度
 * 
 * 用法:
 *   node scripts/agent_life.mjs --status
 *   node scripts/agent_life.mjs --feedback <阶段> <状态:pass/fail> [产出物]
 *   node scripts/agent_life.mjs --next
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const WORKSPACE = process.cwd();
const STATE_FILE = path.join(WORKSPACE, '.dsh-control/agent_life_state.json');

const STAGES = [
  { id: 'S01', name: '探境与环境检查', lock: false },
  { id: 'S02', name: '安全与风险评定', lock: false },
  { id: 'S03', name: '需求对齐与定标', lock: false },
  { id: 'S04', name: '方案筹策与设计', lock: false },
  { id: 'S05', name: '首动握手与会话命名', lock: false },
  { id: 'S06', name: '破土落盘与代码编写', lock: true },
  { id: 'S07', name: '写后即读回校验', lock: true },
  { id: 'S08', name: '质量测试与断言通过', lock: true },
  { id: 'S09', name: '资产指纹与新鲜度刷新', lock: true },
  { id: 'S10', name: '需求主台账原子同步', lock: true },
  { id: 'S11', name: '存量校准与双检排查', lock: true },
  { id: 'S12', name: '版本号全库归位升级', lock: true },
  { id: 'S13', name: 'Git提交并推送远端', lock: true },
  { id: 'S14', name: '显式状态结论置顶', lock: false },
  { id: 'S15', name: '任务流程结构化回溯', lock: false },
  { id: 'S16', name: '交付收尾与释放调度锁', lock: false }
];

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch {}
  return {
    currentStageIndex: 0,
    currentStage: STAGES[0].id,
    lockHeld: false,
    history: []
  };
}

function saveState(s) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2), 'utf8');
  } catch {}
}

const args = process.argv.slice(2);
const state = loadState();

if (args.includes('--status') || args.length === 0) {
  const current = STAGES[state.currentStageIndex] || STAGES[0];
  console.log('🤖 【Agent Life 全局流程中枢状态】');
  console.log(`- 📍 当前掌控阶段: [${current.id}] ${current.name}`);
  console.log(`- 🔒 阶段排他锁要求: ${current.lock ? '🔴 必须独占持锁' : '🟢 共享只读无须锁'}`);
  console.log(`- 🔄 已完成阶段数: ${state.currentStageIndex} / ${STAGES.length}`);
  const nextStage = STAGES[state.currentStageIndex + 1];
  if (nextStage) {
    console.log(`- ⏩ 下一步调度建议: [${nextStage.id}] ${nextStage.name}`);
  } else {
    console.log('- 🏁 流水线状态: 全部工序已达成，可结项');
  }
  process.exit(0);
}

if (args[0] === '--feedback') {
  const stageId = args[1] || STAGES[state.currentStageIndex].id;
  const status = args[2] || 'pass';
  const artifact = args[3] || '无物理产出';

  console.log(`📬 [Agent Life 收到原子阶段回执]`);
  console.log(`- 阶段编号: ${stageId}`);
  console.log(`- 阶段结果: ${status === 'pass' ? '🟢 PASSED' : '🔴 FAILED'}`);
  console.log(`- 交付物: ${artifact}`);

  if (status === 'pass') {
    state.history.push({ stage: stageId, status, artifact, at: new Date().toISOString() });
    if (state.currentStageIndex < STAGES.length - 1) {
      state.currentStageIndex += 1;
      state.currentStage = STAGES[state.currentStageIndex].id;
    }
    saveState(state);
    const next = STAGES[state.currentStageIndex];
    console.log(`✅ 验收通过！Agent Life 调度流转至下一工序: [${next.id}] ${next.name}`);
    if (next.lock) {
      console.log(`⚠️ 注意: 该工序涉及写操作，Agent Life 提示自动申领独占锁: ./scripts/global_scheduler_lock.sh --acquire`);
    }
  } else {
    console.log(`❌ 阶段回执异常，Agent Life 触发时序熔断，禁止推进并保持当前工序等待修复。`);
  }
  process.exit(0);
}

if (args[0] === '--reset') {
  saveState({ currentStageIndex: 0, currentStage: STAGES[0].id, lockHeld: false, history: [] });
  console.log('🔄 Agent Life 状态机已重置至起点 S01');
  process.exit(0);
}
