#!/usr/bin/env node
/**
 * check_unique_identifiers.mjs
 * 全域能力 (Agent, MCP, CLI, Skill, Plugin) 唯一标识符与命名空间规范审计器
 * 
 * 规则：
 * 1. 命名必须符合命名空间：agent.*, mcp.*, cli.*, skill.*, plugin.*
 * 2. 全域 ID/Name 必须全局唯一，严禁跨类别或同类别同名冲突
 * 3. 检查 indexes/capabilities_index.md 中的所有已登记能力
 * 
 * 用法:
 *   node scripts/check_unique_identifiers.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE = process.cwd();
const CAP_FILE = path.join(WORKSPACE, 'indexes/capabilities_index.md');

if (!fs.existsSync(CAP_FILE)) {
  console.error(`❌ 未找到能力索引文件: ${CAP_FILE}`);
  process.exit(1);
}

const content = fs.readFileSync(CAP_FILE, 'utf8');
const lines = content.split('\n');

const registry = new Map();
const duplicates = [];
const nonCompliant = [];

const VALID_PREFIXES = ['agent.', 'mcp.', 'cli.', 'skill.', 'plugin.'];

for (const line of lines) {
  // 匹配表格行中的能力名: | **类别** | `name` | ...
  const match = line.match(/^\|\s*\*\*[^*]+\*\*\s*\|\s*`([^`]+)`\s*\|/);
  if (match) {
    const rawId = match[1].trim();
    
    // 检查命名空间前缀
    const hasValidPrefix = VALID_PREFIXES.some(prefix => rawId.startsWith(prefix));
    if (!hasValidPrefix) {
      nonCompliant.push(rawId);
    }

    // 检查全局唯一性
    if (registry.has(rawId)) {
      duplicates.push({ id: rawId, firstSeen: registry.get(rawId) });
    } else {
      registry.set(rawId, line.substring(0, 40));
    }
  }
}

console.log('================================================================');
console.log('       🛡️  全域五大能力唯一标识 (Namespaced ID) 审计报告       ');
console.log('================================================================');
console.log(`📊 登记能力总数: ${registry.size} 项`);

let healthy = true;

if (duplicates.length > 0) {
  healthy = false;
  console.log(`\n🔴 发现重名冲突 (${duplicates.length} 项):`);
  duplicates.forEach(d => console.log(`  - 重复 ID: \`${d.id}\``));
} else {
  console.log('✅ 全局唯一性检测: 100% 满分通过，无任何重名冲突');
}

if (nonCompliant.length > 0) {
  healthy = false;
  console.log(`\n🟡 发现未规范命名空间的能力 (${nonCompliant.length} 项，建议统一补齐前缀):`);
  nonCompliant.forEach(id => console.log(`  - 待前缀化: \`${id}\``));
} else {
  console.log('✅ 命名空间规范: 100% 符合规范前缀 (agent/mcp/cli/skill/plugin)');
}

console.log('================================================================');

if (!healthy) {
  console.log('⚠️ 存在待治理项，请运行规范化更新');
  process.exit(1);
} else {
  console.log('🎉 全域能力标识完全健康且唯一！');
  process.exit(0);
}
