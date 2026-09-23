#!/usr/bin/env node
/**
 * route_navigate.mjs
 * 地图式能力导航路由器与快速入口提取器
 * 
 * 用法:
 *   node scripts/route_navigate.mjs --entry         # 输出核心入口与当前工作区直达链接
 *   node scripts/route_navigate.mjs --version       # 单行输出系统当前总版本
 *   node scripts/route_navigate.mjs <能力/关键词>    # 规划地图导航路线
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const WORKSPACE = process.cwd();
const args = process.argv.slice(2);

function getVersion() {
  try {
    const reqContent = fs.readFileSync(path.join(WORKSPACE, 'docs/requirements.md'), 'utf8');
    const match = reqContent.match(/当前系统实施总版本[：:]\s*`([^`]+)`/);
    const ver = match ? match[1] : 'v3.5.0';
    let head = 'unknown';
    try {
      head = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch {}
    return { ver, head };
  } catch (e) {
    return { ver: 'v3.5.0', head: 'unknown' };
  }
}

if (args.includes('--version') || args.includes('-v')) {
  const { ver, head } = getVersion();
  console.log(`🏷️ 当前系统实施总版本: \`${ver}\` (HEAD: \`${head}\`)`);
  process.exit(0);
}

if (args.includes('--entry')) {
  let dirtyFiles = [];
  try {
    const gitStatus = execSync('git status -s', { encoding: 'utf8' }).trim();
    if (gitStatus) {
      dirtyFiles = gitStatus.split('\n').map(l => l.trim().split(/\s+/)[1]).filter(Boolean);
    }
  } catch {}

  console.log('📍 系统核心枢纽直达入口:');
  console.log('- 🎛️ 管控机制中枢: `ai-control/README.md`');
  console.log('- 📋 全局需求主台账: `docs/requirements.md`');
  console.log('- 📚 规则法典总索引: `indexes/rules_index.md`');
  console.log('- 🚀 快速通道总览: `indexes/shortcuts_index.md`');
  console.log('- 🗺️ 地图导航路由: `indexes/navigation_router.md`');

  if (dirtyFiles.length > 0) {
    console.log('\n📝 当前任务正在改动的交付物:');
    dirtyFiles.slice(0, 8).forEach(f => console.log(`- \`${f}\``));
    if (dirtyFiles.length > 8) console.log(`- ... 以及其余 ${dirtyFiles.length - 8} 个文件`);
  }
  process.exit(0);
}

const query = args[0] || '门禁';
const capFile = path.join(WORKSPACE, 'indexes/capabilities_index.md');

let routeMap = {
  title: query,
  tier: 'G1 干线',
  origin: '用户意图输入',
  waypoints: [
    '【检查站 1】环境探活：执行 node/bash 语法基准探测',
    '【检查站 2】规则载入：载入 rules/system/meta_rules.md 遵循最高法典',
    '【检查站 3】资源加锁：运行 ./scripts/global_scheduler_lock.sh 避免并发冲突',
    '【检查站 4】门禁校验：执行 ./scripts/control_gates.sh badge 确认 4/4 绿灯'
  ],
  destination: `执行相关目标能力的脚本或核心接口（匹配关键词: ${query}）`,
  hazards: '坚决禁止跨越安全红线，写后必须读回校验，未经验证不得虚报'
};

if (query.includes('门禁') || query.includes('管控')) {
  routeMap.title = '管控门禁系统';
  routeMap.tier = 'G1 干线';
  routeMap.destination = '调用 `./scripts/control_gates.sh check` 刷新量化看板';
  routeMap.hazards = '未全绿严禁执行实质写操作；禁止私自硬编码跳过门禁';
} else if (query.includes('生图') || query.includes('图片') || query.includes('svg')) {
  routeMap.title = '精准绘图与栅格化流水线';
  routeMap.tier = 'G1 干线';
  routeMap.waypoints[1] = '【检查站 2】设计规范：载入 docs/diagram_generation_guide.md 确定选型';
  routeMap.destination = '执行 `python3 scripts/generate_image.py --svg <目标.svg>` 栅格化 PNG';
  routeMap.hazards = '严禁输出写死假数据的静态图，图表数据必须来自现场实跑';
} else if (query.includes('版本') || query.includes('台账')) {
  routeMap.title = '版本升级与双向台账归位';
  routeMap.tier = 'G0 高速';
  routeMap.destination = '更新 `docs/requirements.md`，执行 `scripts/align_version.mjs --to <VER>`';
  routeMap.hazards = '禁止单方面修改规则而不登记需求编号，必须三位一体原子同步';
}

console.log(`### 🗺️ 能力导航路线规划已就绪：【${routeMap.title}】\n`);
console.log(`- 🚩 **起点 (Origin)**：${routeMap.origin}`);
console.log(`- 🛣️ **路线评级 (Route Tier)**：${routeMap.tier}`);
console.log(`- 📍 **途径节点指引 (Turn-by-Turn Waypoints)**：`);
routeMap.waypoints.forEach((wp, idx) => console.log(`  ${idx + 1}. ${wp}`));
console.log(`- 🏁 **终点落地点 (Destination)**：${routeMap.destination}`);
console.log(`- ⚠️ **避坑路况警示 (Road Hazards)**：${routeMap.hazards}`);
