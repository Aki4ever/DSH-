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
// 挂载点（REQ-091 / R1 起为**双席位**，唯一真相源是内核的 CORE.SLOT_NAMES）：
//   ① `conversation.session.header.actions`（kind=list / scope=session）—— 会话页头部动作条；
//   ② `sidebar.footer.action`（kind=list / scope=root）—— **全域常显席位**，挂在侧栏底部，
//      不随路由切换卸载，这是"所有页面都能看到重启按钮"的物理落点。
//   用户口径："重启按钮需要在所有页面都常显" —— 只有 ② 满足；
//   ① 保留是因为它离会话上下文最近，日常使用顺手（两处共用同一套注入逻辑，不写两套）。
//   为什么不用 `shell.leading`：实测它只在 macOS 折叠侧栏时挂载，会变成"时有时无"的假常显。
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
    return finish({ ok: false, reason: 'cancelled' });
  }
  var exec = ctx && ctx.remote && ctx.remote.commands && ctx.remote.commands.execute;
  if (typeof exec !== 'function') {
    return finish({
      ok: false,
      reason: '宿主未提供 remote.commands.execute',
      hint: '这一条通常意味着宿主半没被加载（或版本太旧）。可看 ~/.dsh/.dsh-control/restart-plugin-boot.jsonl 有无新记录。',
    });
  }
  return Promise.resolve(exec(sessionId, CORE.CONFIRM_LINE, []))
    .then(function (result) { return { ok: true, result: result }; })
    .catch(function (err) {
      return finish({ ok: false, reason: (err && err.message) ? err.message : String(err) });
    });
}

/**
 * 收尾：**把结果显式告诉用户**，而不是静默吞掉。
 *
 * 🔴 为什么必须加（2026-10-02 用户实测）：按钮点下去"没有效果"这句话，
 *   在两种完全不同的故障下长得一模一样：
 *     ① 宿主半没加载 → 命令不存在 → 请求被拒；
 *     ② 客户端异常 → 请求根本没发出去。
 *   没有可见反馈时，只能靠人猜，而猜错方向的代价是**又一次重启**。
 *   所以这里把成败与原因直接弹给用户 —— 出错也要错得看得见。
 */
function finish(outcome) {
  if (!outcome || outcome.ok) return Promise.resolve(outcome);
  var text = '重启未执行：' + (outcome.reason || '未知原因') + (outcome.hint ? '\n\n' + outcome.hint : '');
  try {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(text);
    else if (typeof console !== 'undefined') console.warn('[dsh-plugin-restart] ' + text);
  } catch (err) { /* 提示失败绝不影响主流程 */ }
  return Promise.resolve(outcome);
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

  // 逐个席位注册。席位清单来自内核（唯一真相源），此处不硬编码第二个名字 ——
  // 否则"加席位"这件事又会在模板与内核两处各写一份。
  var slots = (CORE.SLOT_NAMES && CORE.SLOT_NAMES.length ? CORE.SLOT_NAMES : [CORE.SLOT_NAME]);
  var disposers = [];
  slots.forEach(function (slotName, index) {
    var order = slotName === CORE.GLOBAL_SLOT_NAME ? CORE.GLOBAL_SLOT_ORDER : (CORE.SLOT_ORDER + index);
    var dispose = ctx.slots.inject(slotName, function () {
      return ctx.slots.register(
        {
          name: slotName,
          // 席位不同 → id 必须不同，否则宿主注册表会判"重复注册"直接抛错
          id: CORE.BUTTON_ID + (slotName === CORE.GLOBAL_SLOT_NAME ? '_global' : ''),
          order: order,
          inject: buildInjected(ctx),
        },
        buildComponent(ctx)
      );
    });
    disposers.push(dispose);
    notes.push('已注入席位：' + slotName);
  });

  if (ctx && typeof ctx.effect === 'function') {
    ctx.effect(function () {
      return function () { disposers.forEach(function (d) { if (typeof d === 'function') d(); }); };
    }, 'dsh-plugin-restart: header + global action buttons');
  }
  module.exports.__diagnostics = notes;
  module.exports.__slots = slots;
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
