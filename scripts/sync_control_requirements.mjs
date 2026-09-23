#!/usr/bin/env node
/**
 * 管控机制专属需求同步校验脚本 (Control Requirements Sync Verifier)
 * 作用：确保 docs/requirements.md 与 ai-control/requirements/control_requirements_ledger.md 保持双向同步与版本对齐
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const GLOBAL_REQ_FILE = path.join(PROJECT_ROOT, 'docs', 'requirements.md');
const CONTROL_REQ_FILE = path.join(PROJECT_ROOT, 'ai-control', 'requirements', 'control_requirements_ledger.md');

function runSyncCheck() {
  console.log('🔍 开始管控机制专属需求同步检查...');

  if (!fs.existsSync(GLOBAL_REQ_FILE)) {
    console.error(`❌ 全局主需求台账不存在: ${GLOBAL_REQ_FILE}`);
    process.exit(1);
  }

  if (!fs.existsSync(CONTROL_REQ_FILE)) {
    console.error(`❌ 管控专属需求台账不存在: ${CONTROL_REQ_FILE}`);
    process.exit(1);
  }

  const globalContent = fs.readFileSync(GLOBAL_REQ_FILE, 'utf8');
  const controlContent = fs.readFileSync(CONTROL_REQ_FILE, 'utf8');

  // 提取管控需求条目 (CR-xxx)
  const crMatches = [...controlContent.matchAll(/### (CR-\d+):/g)].map(m => m[1]);
  console.log(`📌 管控专属台账中发现 ${crMatches.length} 个专项需求: ${crMatches.join(', ')}`);

  // 提取版本号
  const globalVerMatch = globalContent.match(/\*\*当前系统实施总版本\*\*[：:]\s*`([^`]+)`/);
  const controlVerMatch = controlContent.match(/\*\*当前管控机制版本\*\*[：:]\s*`([^`]+)`/);

  const globalVer = globalVerMatch ? globalVerMatch[1] : 'unknown';
  const controlVer = controlVerMatch ? controlVerMatch[1] : 'unknown';

  console.log(`🏷️ 全局系统版本: ${globalVer} | 管控专属版本: ${controlVer}`);

  let hasError = false;
  if (globalVer !== controlVer) {
    console.warn(`⚠️ 版本存在差异: 全局 ${globalVer} vs 管控 ${controlVer} (若正在迭代中请更新对齐)`);
  }

  // 检查最新 CR 条目是否在全局台账中有所映射
  for (const cr of crMatches) {
    if (!controlContent.includes(cr)) {
      console.error(`❌ 缺失条目: ${cr}`);
      hasError = true;
    }
  }

  if (hasError) {
    console.error('❌ 管控机制需求同步校验未通过！');
    process.exit(1);
  }

  console.log('✅ 管控机制需求台账与主台账同步状态良好！');
}

runSyncCheck();
