'use strict';
/**
 * host-core.cjs — dsh-plugin-restart 宿主半的**可单测内核**
 * ==============================================================================
 * 为什么把这一层单独拆出来（而不是全写在 lib/index.js 里）：
 *   重启的 handler 一旦真的跑，就会 `spawn` 一个"退出应用"的分离进程 —— 自检脚本
 *   绝不可能调用真的那个。所以把"要 spawn 什么"做成**可注入依赖**：
 *   生产路径注入真的 `child_process.spawn`，自检路径注入桩件，
 *   于是**同一段判定逻辑**既能被测，又不会在测试里把用户的应用关掉。
 *
 * 本文件不含任何 cordis 依赖，纯函数 + 显式依赖注入。
 * ==============================================================================
 */

const CORE = require('./restart-core.cjs');

/**
 * 执行一次重启请求（纯逻辑，所有副作用都来自注入的 deps）。
 * @param {string} rawInput 命令名之后的原文（必须显式 `confirm`）
 * @param {{spawn:Function, pid:number}} deps 依赖注入
 * @returns {{kind:'success'|'error', text:string}}
 */
function runRestart(rawInput, deps) {
  const parsed = CORE.parseRestartInput(rawInput);
  if (!parsed.ok) return { kind: 'error', text: parsed.reason };

  const spawnImpl = deps && deps.spawn;
  const pid = deps && deps.pid;
  if (typeof spawnImpl !== 'function') {
    // 宿主没给出 spawn 能力时如实报错，**绝不返回成功**（本工程的 fail-closed 口径）
    return { kind: 'error', text: '宿主未提供 spawn 能力，应用未重启。' };
  }

  let child;
  try {
    const script = CORE.buildRelaunchScript(pid);
    child = spawnImpl('/bin/sh', ['-c', script], { detached: true, stdio: 'ignore' });
    if (child && typeof child.unref === 'function') child.unref();
  } catch (err) {
    return {
      kind: 'error',
      text: '重启脚本派出失败：' + (err && err.message ? err.message : String(err)),
    };
  }
  return { kind: 'success', text: CORE.describeResult(parsed, !!child && child.pid !== undefined) };
}

/**
 * 构造注册给宿主命令面的定义对象（形状对齐 `CommandDefinition`）。
 * @param {{spawn:Function, pid:number}} deps
 */
function createCommandDefinition(deps) {
  return {
    name: CORE.COMMAND_NAME,
    description: '重启 DeepSeek Harness（先退出应用，再自动重新打开；需显式确认）',
    recordInput: false,
    handler: async (invocation) => runRestart(invocation && invocation.rawInput, deps),
  };
}

module.exports = { runRestart, createCommandDefinition };
