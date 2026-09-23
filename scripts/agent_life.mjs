#!/usr/bin/env node
/**
 * agent_life.mjs
 * 全局任务流程调度中枢 Agent PP & Agent Life(N) 辅助引擎
 * 
 * 核心设计:
 * 1. Agent PP: 单例全局唯一并发编排中枢，负责多分支管理与屏障汇聚
 * 2. Agent Life(N): 短生命周期串行执行体 (life1, life2...)，调用完成并提交回执后即消亡
 * 3. 初始化: 任务结项后全部 Life 实例与状态清空归零
 * 
 * 用法:
 *   node scripts/agent_life.mjs --status                     # 查看 PP 与活跃 Life 状态
 *   node scripts/agent_life.mjs --spawn <subtask_name>       # 由 PP 动态派生一个 life(N) 实例
 *   node scripts/agent_life.mjs --done <life_id> [artifact]  # life 提交回执并宣告消亡
 *   node scripts/agent_life.mjs --teardown                   # 结项初始化，全部清空
 */

import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE = process.cwd();
const STATE_FILE = path.join(WORKSPACE, '.dsh-control/agent_pp_life_state.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch {}
  return {
    pp: { status: 'IDLE', totalSpawned: 0 },
    activeLives: {},
    completedLives: []
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
  console.log('🤖 【Agent PP 单例并发调度中枢】');
  console.log(`- PP 状态: ${state.pp.status} (已派生子任务总数: ${state.pp.totalSpawned})`);
  const activeIds = Object.keys(state.activeLives);
  console.log(`- 活跃中的串行 Life 实例数: ${activeIds.length}`);
  if (activeIds.length > 0) {
    activeIds.forEach(id => {
      const l = state.activeLives[id];
      console.log(`  · [${id}] 负责: ${l.name} (启动时间: ${l.startedAt})`);
    });
  }
  console.log(`- 已消亡并闭环的 Life 实例数: ${state.completedLives.length}`);
  process.exit(0);
}

if (args[0] === '--spawn') {
  const subtaskName = args[1] || `subtask_${Date.now()}`;
  state.pp.totalSpawned += 1;
  const lifeId = `life${state.pp.totalSpawned}`;
  state.pp.status = 'ORCHESTRATING';
  state.activeLives[lifeId] = {
    id: lifeId,
    name: subtaskName,
    startedAt: new Date().toISOString()
  };
  saveState(state);
  console.log(`🚀 [Agent PP] 成功派生短生命周期执行体: 【${lifeId}】`);
  console.log(`- 挂载子任务: ${subtaskName}`);
  console.log(`- 模式: 严格串行执行，完成出具回执后即刻消亡。`);
  process.exit(0);
}

if (args[0] === '--done') {
  const lifeId = args[1];
  const artifact = args[2] || '产出物已落盘';
  if (!state.activeLives[lifeId]) {
    console.error(`❌ 未找到活跃的 Life 实例: ${lifeId}`);
    process.exit(1);
  }
  const completed = state.activeLives[lifeId];
  delete state.activeLives[lifeId];
  state.completedLives.push({
    id: lifeId,
    name: completed.name,
    artifact,
    completedAt: new Date().toISOString()
  });

  if (Object.keys(state.activeLives).length === 0) {
    state.pp.status = 'READY_TO_JOIN';
  }
  saveState(state);
  console.log(`📬 [Stage Receipt 收到] 实例 【${lifeId}】 任务完成: ${completed.name}`);
  console.log(`- 交付物: ${artifact}`);
  console.log(`💀 依据短生命周期铁律，实例 【${lifeId}】 已成功消亡 (TERMINATED) 并释放所有资源！`);
  console.log(`- 当前剩余活跃 Life 数: ${Object.keys(state.activeLives).length}`);
  process.exit(0);
}

if (args[0] === '--teardown' || args[0] === '--reset') {
  saveState({ pp: { status: 'IDLE', totalSpawned: 0 }, activeLives: {}, completedLives: [] });
  console.log('🔄 【全量初始化完成】所有 Life 实例已清空消亡，Agent PP 恢复初始 IDLE 待命态。');
  process.exit(0);
}
