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

//#region restart-core（由 build_client.py 从 src/restart-core.cjs 内联，勿手改）
__INJECT_CORE__
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
