window.__ModuleLoader__.load({ id: "dsh-plugin-restart", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
// dsh-plugin-restart — client half（静态 bundle 形态）。
//
// 契约来源（与已装且可用的 dsh-plugin-usage-bar / dsh-plugin-control-jump 同一套）：
//   * window.__ModuleLoader__.load({ id, factory }) 注册模块；
//   * module.exports = { inject: [...], apply(ctx) {...} }；
//   * React 由 bundle 的 require('react') 提供（seed 模块）；
//   * ctx.effect(fn, label) 注册可回收副作用。
//
// 挂载点：`conversation.session.header.actions`（kind=list / scope=session 的头部动作条，
//   官方 dsh-client-ui-jobs 的 JobsPopover 就挂在这里）。选它的理由：重启是高危动作，
//   放在会话头部动作条而不是输入坞，避免日常打字时误触。
//
// 触发链路（REQ-090 / R6 主推方案 A1，全程走官方插件面）：
//   点按钮 → 模态二次确认 → ctx.remote.commands.execute(sessionId, '/restart-dsh confirm', [])
//   → 宿主半 handler → 分离进程执行「退出应用 → 等旧进程消失 → open -a 重开」
//
// 诚实边界（**不架空**）：
//   1) 本插件**不能**保证重启一定发生：退出确认弹窗是否拦截、分离进程能否存活、
//      第三方插件能否 inject `remote.commands`，都是 README §待实测 里列明的未验证项；
//   2) 宿主未提供 slots 或 React seed 时，本插件**记录诊断后静默退出**，不做 DOM 穿透；
//   3) 按钮点击后若 `remote.commands` 不可用，如实返回失败原因，不假装已重启。
'use strict';

//#region restart-core sha256:3660a5c2e9eaa6ed（由 build_client.py 从 src/restart-core.cjs 内联，勿手改）
'use strict';
/**
 * restart-core.cjs — dsh-plugin-restart 的纯逻辑内核（宿主半与客户端半共用）
 * ==============================================================================
 * 为什么单独一份：客户端 bundle 不能 require 本地文件（宿主只提供 seed 模块），
 * 逻辑必须被内联进 lib/client.js。内联就会产生"两份实现"，
 * 因此由 build_client.py 把本文件整体注入模板，并用 sha256 摘要锁死。
 *
 * 为什么要有这一层（REQ-090 / R6 实测根因）：
 *   生产包里**没有任何可被页面调用的官方重启入口**（已实测）：
 *   `app.relaunch()` 只挂在"致命错误恢复对话框"与"开发期菜单"上，
 *   渲染侧 IPC 清单里没有 restart，`window.dsh` 只暴露 getLocale/onLocaleChange/getAuthToken。
 *   因此只能自建一条链路。本文件把链路上**所有可判定的部分**抽成纯函数，
 *   让它们可以在没有宿主 App 的情况下被单测（verify_restart_button.cjs）。
 *
 * 诚实边界：
 *   · 本内核**不承诺**一定能重启成功 —— 退出确认弹窗、分离进程存活、
 *     第三方插件能否调 remote.commands 都是待实测项（见 README §待实测）。
 *   · 它承诺的是：命令名、确认口令、脚本内容、PID 比对口径**唯一且可验证**。
 * ==============================================================================
 */

/** 斜杠命令名（不含前导 `/`）。 */
const COMMAND_NAME = 'restart-dsh';
/** 二次确认口令：没有它一律拒绝执行（防手滑、防误触）。 */
const CONFIRM_TOKEN = 'confirm';
/** 客户端按钮实际发出的完整命令行。 */
const CONFIRM_LINE = '/' + COMMAND_NAME + ' ' + CONFIRM_TOKEN;
/** 目标应用名（macOS `open -a` / `osascript quit app` 用它定位）。 */
const APP_NAME = 'DeepSeek Harness';
/** 客户端按钮与插槽标识。 */
const BUTTON_ID = 'dsh_restart_button';
const SLOT_NAME = 'conversation.session.header.actions';
const SLOT_ORDER = 90;

/**
 * 解析命令入参，判断是否放行重启。
 * 口径：**必须显式确认**。空输入、拼错、多说一个字都拒绝 —— 重启是不可逆动作。
 * @param {string} rawInput 命令名之后的原文
 * @returns {{ok:boolean, reason:string}}
 */
function parseRestartInput(rawInput) {
  const s = String(rawInput == null ? '' : rawInput).trim().toLowerCase();
  if (s === '') return { ok: false, reason: '缺少确认口令：请使用 /' + COMMAND_NAME + ' ' + CONFIRM_TOKEN };
  if (s !== CONFIRM_TOKEN) return { ok: false, reason: '确认口令不正确：期望 `' + CONFIRM_TOKEN + '`，实际 `' + s + '`' };
  return { ok: true, reason: '' };
}

/**
 * 生成"等旧进程退出后重新打开应用"的分离脚本。
 * 为什么用分离进程：宿主自己执行 `quit` 会被自己杀掉，后面的 `open -a` 就没人跑了。
 *
 * 安全：只接受**正整数 PID**，其余一律抛错。脚本里不做任何字符串拼接用户输入，
 * 因此不存在注入面（这是本文件唯一需要拼 shell 的地方，必须说明白）。
 * @param {number} pid 当前宿主进程号
 * @param {{appName?:string, waitSec?:number}} [opts]
 */
function buildRelaunchScript(pid, opts) {
  const o = opts || {};
  const app = o.appName || APP_NAME;
  const waitSec = Number.isInteger(o.waitSec) && o.waitSec > 0 ? o.waitSec : 30;
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error('buildRelaunchScript 只接受正整数 PID，收到：' + String(pid));
  }
  if (!/^[\w .\-]+$/.test(app)) {
    throw new Error('应用名含非法字符，拒绝拼进脚本：' + app);
  }
  const ticks = waitSec * 2; // 每 0.5 秒探一次
  return [
    '#!/bin/sh',
    '# 由 dsh-plugin-restart 生成 —— 等旧宿主退出后重新打开应用。',
    '# 为什么先等再开：宿主会随应用一起退出，立刻 open -a 只会聚焦到还未退出的旧窗口。',
    'sleep 1',
    "osascript -e 'quit app \"" + app + "\"' >/dev/null 2>&1 || true",
    'i=0',
    'while [ "$i" -lt ' + ticks + ' ]; do',
    '  kill -0 ' + pid + ' 2>/dev/null || break',
    '  sleep 0.5',
    '  i=$((i+1))',
    'done',
    'open -a "' + app + '" >/dev/null 2>&1 || true',
    '',
  ].join('\n');
}

/**
 * PID 比对：这是"点击后真的重启了吗"的**唯一合格证据**。
 * @param {string|number} before 点击前的宿主 PID
 * @param {string|number} after  恢复后的宿主 PID
 */
function pidChanged(before, after) {
  const a = String(before == null ? '' : before).trim();
  const b = String(after == null ? '' : after).trim();
  if (!a || !b) return false;   // 取不到任一侧的数字 → 不算变化（fail-closed）
  if (a === b) return false;
  if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) return false;
  return true;
}

/** 由命令返回值构造给用户看的一行中文回执。 */
function describeResult(parsed, spawnOk) {
  if (!parsed || !parsed.ok) return parsed ? parsed.reason : '未解析入参';
  return spawnOk
    ? '已排定重启：应用将先退出，再自动重新打开。重启后请用 PID 比对确认（旧 PID 与新 PID 必须不同）。'
    : '重启脚本未能派出（spawn 失败），应用未重启。';
}

module.exports = {
  COMMAND_NAME,
  CONFIRM_TOKEN,
  CONFIRM_LINE,
  APP_NAME,
  BUTTON_ID,
  SLOT_NAME,
  SLOT_ORDER,
  parseRestartInput,
  buildRelaunchScript,
  pidChanged,
  describeResult,
};
//#endregion restart-core

var CORE = module.exports;
module.exports = {};  // 复位：下面挂插件自身的导出

/** 二次确认文案（README §安全 里同步登记）。 */
var CONFIRM_MESSAGE = '确定要重启 DeepSeek Harness 吗？\n\n· 重启会中断当前会话；\n· 应用会先退出，再自动重新打开（约 10~30 秒）；\n· 重启后可用 PID 比对确认是否真的重启过。';

var React = null;
try { React = require('react'); } catch (err) { React = null; }

/**
 * 点击处理（**抽成纯函数以便无宿主单测**）。
 * @param {object} ctx 客户端插件上下文
 * @param {string} sessionId 当前会话 ID（由插槽注入）
 * @param {function} [confirmFn] 二次确认实现（测试时可注入桩）
 * @returns {Promise<{ok:boolean, reason?:string, result?:any}>}
 */
function handleRestartClick(ctx, sessionId, confirmFn) {
  var confirmImpl = confirmFn;
  if (!confirmImpl) {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      confirmImpl = function (msg) { return window.confirm(msg); };
    }
  }
  if (confirmImpl && !confirmImpl(CONFIRM_MESSAGE)) {
    return Promise.resolve({ ok: false, reason: 'cancelled' });
  }
  var exec = ctx && ctx.remote && ctx.remote.commands && ctx.remote.commands.execute;
  if (typeof exec !== 'function') {
    return Promise.resolve({ ok: false, reason: '宿主未提供 remote.commands.execute' });
  }
  return Promise.resolve(exec(sessionId, CORE.CONFIRM_LINE, []))
    .then(function (result) { return { ok: true, result: result }; })
    .catch(function (err) {
      return { ok: false, reason: (err && err.message) ? err.message : String(err) };
    });
}

/** 构造注入给按钮的参数（官方插槽的 inject 回调按 sessionId 取参）。 */
function buildInjected(ctx) {
  return function (sessionId) {
    return {
      label: '⏻ 重启',
      title: '重启 DeepSeek Harness（会中断当前会话）',
      onClick: function () { return handleRestartClick(ctx, sessionId); },
    };
  };
}

/** 按钮组件（React 缺失时返回 null，由 apply 提前拦下）。 */
function buildComponent(ctx) {
  if (!React) return null;
  return function RestartButton(props) {
    var injected = props && props.injected ? props.injected : {};
    return React.createElement(
      'button',
      {
        type: 'button',
        className: 'dsh-restart-button',
        'data-restart-button': CORE.BUTTON_ID,
        title: injected.title || '重启 DeepSeek Harness',
        style: { marginLeft: '8px', cursor: 'pointer' },
        onClick: injected.onClick || function () {},
      },
      injected.label || '⏻ 重启'
    );
  };
}

function apply(ctx) {
  var notes = [];
  var slotApi = !!(ctx && ctx.slots && typeof ctx.slots.inject === 'function' && typeof ctx.slots.register === 'function');
  if (!slotApi) notes.push('宿主未提供 ctx.slots（inject/register），按红线不做 DOM 穿透');
  if (!React) notes.push('宿主未提供 react seed 模块，无法渲染按钮');
  if (ctx && ctx.remote && ctx.remote.commands) {
    notes.push('remote.commands 可用（已注入）');
  } else {
    notes.push('remote.commands 不可用 —— 按钮点下去只会如实报错，不会假装已重启');
  }

  if (!slotApi || !React) {
    // 静默退出但要留痕：把诊断挂到模块导出上，便于后续排查（不抛异常打断宿主）
    module.exports.__diagnostics = notes;
    return;
  }

  var dispose = ctx.slots.inject(CORE.SLOT_NAME, function () {
    return ctx.slots.register(
      { name: CORE.SLOT_NAME, id: CORE.BUTTON_ID, order: CORE.SLOT_ORDER, inject: buildInjected(ctx) },
      buildComponent(ctx)
    );
  });

  if (ctx && typeof ctx.effect === 'function') {
    ctx.effect(function () { return dispose; }, 'dsh-plugin-restart: header action button');
  }
  module.exports.__diagnostics = notes;
}

module.exports.inject = ['slots', 'remote', 'remote.commands'];
module.exports.apply = apply;
module.exports.__internal = {
  handleRestartClick: handleRestartClick,
  buildInjected: buildInjected,
  buildComponent: buildComponent,
  CONFIRM_MESSAGE: CONFIRM_MESSAGE,
  CORE: CORE,
};

if (typeof module !== 'undefined') {
  // 供 Node 侧静态验证器 require（浏览器里不会走到这里）
  module.exports.__verify = { handleRestartClick: handleRestartClick, CORE: CORE };
}

return module.exports;
} });
