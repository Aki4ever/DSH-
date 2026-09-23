#!/usr/bin/env node
/**
 * ==============================================================================
 * 存量与新增新鲜度与可用性检测器 (Freshness & Availability Auditor)
 * ==============================================================================
 * 定位：快速检测当前工程内能力层（Plugin/Agent/CLI/MCP/Skill）及规则法典的时效性、
 *       语法完整性与可用状态，确保任何资源是否最新、可用一目了然。
 *
 * 用法：
 *   node scripts/check_freshness.mjs [--root <path>] [--json] [--strict]
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const out = { root: DEFAULT_ROOT, json: false, strict: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') out.root = path.resolve(argv[++i]);
    else if (a === '--json') out.json = true;
    else if (a === '--strict') out.strict = true;
  }
  return out;
}

const args = parseArgs(process.argv);
const root = args.root;

// 获取系统当前总版本
function getSystemVersion() {
  const reqPath = path.join(root, 'docs', 'requirements.md');
  if (!fs.existsSync(reqPath)) return 'unknown';
  const content = fs.readFileSync(reqPath, 'utf8');
  const m = content.match(/\*\*当前系统实施总版本\*\*[：:]\s*`([^`]+)`/);
  return m ? m[1] : 'unknown';
}

const targetVersion = getSystemVersion();

// 1. 检测 CLI 脚本层的可用性与语法新鲜度
function auditCliScripts() {
  const scriptsDir = path.join(root, 'scripts');
  const items = [];
  if (!fs.existsSync(scriptsDir)) return items;

  const files = fs.readdirSync(scriptsDir);
  for (const file of files) {
    const fullPath = path.join(scriptsDir, file);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;

    const item = {
      name: file,
      type: 'CLI Script',
      path: `scripts/${file}`,
      status: 'AVAILABLE', // AVAILABLE | STALE | BROKEN
      reason: '最新可用',
      lastModified: stat.mtime.toISOString().split('T')[0]
    };

    if (file.endsWith('.mjs') || file.endsWith('.js') || file.endsWith('.cjs')) {
      try {
        execSync(`node --check "${fullPath}" 2>&1`, { encoding: 'utf8' });
      } catch (err) {
        item.status = 'BROKEN';
        item.reason = `Node 语法检查失败: ${err.message.split('\n')[0]}`;
      }
    } else if (file.endsWith('.sh')) {
      try {
        execSync(`bash -n "${fullPath}" 2>&1`, { encoding: 'utf8' });
      } catch (err) {
        item.status = 'BROKEN';
        item.reason = `Bash 语法检查失败: ${err.message.split('\n')[0]}`;
      }
    }
    items.push(item);
  }
  return items;
}

// 2. 检测能力层索引文件中的条目连通性
function auditCapabilitiesIndex() {
  const capFile = path.join(root, 'indexes', 'capabilities_index.md');
  const items = [];
  if (!fs.existsSync(capFile)) {
    return [{ name: 'capabilities_index.md', type: 'Index', status: 'BROKEN', reason: '索引文件不存在' }];
  }

  const content = fs.readFileSync(capFile, 'utf8');
  const tableRegex = /\|\s*\*\*([^*]+)\*\*\s*\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*\[([^\]]+)\]/g;
  let match;

  while ((match = tableRegex.exec(content)) !== null) {
    const [_, rawType, name, desc, negCase, link] = match;
    const type = rawType.trim();
    const item = {
      name: name.trim(),
      type: type,
      status: 'AVAILABLE',
      reason: '已登记索引且结构完备'
    };

    if (type.includes('脚本') || type.includes('CLI')) {
      const scriptPath = path.join(root, 'scripts', item.name);
      if (!fs.existsSync(scriptPath)) {
        item.status = 'BROKEN';
        item.reason = `对应物理脚本不存在: scripts/${item.name}`;
      }
    }
    items.push(item);
  }
  return items;
}

// 3. 检测规约法典的版本新鲜度 (与目标实施版本对齐情况)
function auditRulesVersion() {
  const items = [];
  const rulesDir = path.join(root, 'rules');
  if (!fs.existsSync(rulesDir)) return items;

  function walk(dir) {
    const list = fs.readdirSync(dir);
    for (const f of list) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (f.endsWith('.md')) {
        const text = fs.readFileSync(full, 'utf8');
        const verMatch = text.match(/当前文档版本[：:]\s*`([^`]+)`/);
        const relPath = path.relative(root, full);
        const item = {
          name: f,
          type: 'Rule Doc',
          path: relPath,
          status: 'AVAILABLE',
          reason: '版本与系统当前实施版本对齐'
        };

        if (verMatch) {
          const docVer = verMatch[1];
          if (targetVersion !== 'unknown' && docVer !== targetVersion) {
            item.status = 'STALE';
            item.reason = `文档版本 ${docVer} 滞后于系统实施版本 ${targetVersion}`;
          }
        }
        items.push(item);
      }
    }
  }

  walk(rulesDir);
  return items;
}

// 执行全量新鲜度审计
function main() {
  const cliItems = auditCliScripts();
  const capItems = auditCapabilitiesIndex();
  const ruleItems = auditRulesVersion();

  const allItems = [...cliItems, ...capItems, ...ruleItems];

  const total = allItems.length;
  const availableCount = allItems.filter(i => i.status === 'AVAILABLE').length;
  const staleCount = allItems.filter(i => i.status === 'STALE').length;
  const brokenCount = allItems.filter(i => i.status === 'BROKEN').length;

  const freshPercent = total === 0 ? 100 : Math.round((availableCount / total) * 100);

  const report = {
    timestamp: new Date().toISOString(),
    systemVersion: targetVersion,
    summary: {
      total,
      available: availableCount,
      stale: staleCount,
      broken: brokenCount,
      freshPercent
    },
    items: allItems
  };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(brokenCount > 0 ? 1 : 0);
  }

  console.log('\n================================================================');
  console.log('       🛡️  系统能力与规则新鲜度及可用性审计看板                 ');
  console.log('================================================================');
  console.log(`🏷️  系统当前目标实施版本: ${targetVersion}`);
  console.log(`📊  全景健康度指标: [总计 ${total} 项] · 🟢 正常可用: ${availableCount} · 🟡 滞后待刷: ${staleCount} · 🔴 异常失效: ${brokenCount}`);
  console.log(`✨  新鲜可用率: ${freshPercent}%\n`);

  if (brokenCount > 0) {
    console.log('🔴 发现异常失效项 (BROKEN):');
    allItems.filter(i => i.status === 'BROKEN').forEach(i => {
      console.log(`   - [${i.type}] ${i.name}: ${i.reason}`);
    });
    console.log('');
  }

  if (staleCount > 0) {
    console.log('🟡 发现时效滞后项 (STALE):');
    allItems.filter(i => i.status === 'STALE').forEach(i => {
      console.log(`   - [${i.type}] ${i.name}: ${i.reason}`);
    });
    console.log('');
  }

  if (brokenCount === 0 && staleCount === 0) {
    console.log('🎉 全量存量与新增能力运行健康，100% 保持最新可用状态！\n');
  }

  if (args.strict && (brokenCount > 0 || staleCount > 0)) {
    process.exit(1);
  }
}

main();
