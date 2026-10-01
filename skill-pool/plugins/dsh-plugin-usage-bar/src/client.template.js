window.__ModuleLoader__.load({ id: "dsh-plugin-usage-bar", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
// dsh-plugin-usage-bar — client half（静态 bundle 形态）。
//
// 契约来源（与已装可用插件 dsh-plugin-control-jump 同一套）：
//   * window.__ModuleLoader__.load({ id, factory }) 注册模块；
//   * module.exports = { inject: [...], async apply(ctx) {...} }；
//   * React 由 bundle 的 require('react') 提供（seed 模块）；
//   * ctx.effect(fn, label) 注册可回收副作用。
//
// 挂载点（REQ-091 / R4 起为**双席位**）：
//   ① `conversation.input.dock`（list 型，按 order 权重并排平铺）—— 会话页输入坞，原有落点；
//   ② `sidebar.footer.action`（list / scope=root）—— **全域常显席位**，挂侧栏底部、
//      不随路由切换卸载。用户诉求"空闲时段/高峰时段要常显、实时更新"，只有 ② 满足。
//      席位选择理由与反例（为什么不选 shell.leading）见 dsh-plugin-restart 的同名注释。
//
// 诚实边界（**不架空**）：
//   1) 时段（高峰/空闲）与下次切换倒计时 = **纯前端本地计算**，不需要任何宿主通道，
//      官方也没有该接口（已核实），所以这部分是真数据；
//   2) 剩余额度需要「宿主侧带 sk- 凭据请求官方 /user/balance 再把结果送给前端」，
//      本机尚无该通道，故额度栏**如实显示「未接入」**，绝不显示假数字；
//   3) 若宿主未提供 slots 插槽或 React seed，本插件**不做 DOM 穿透**，只记录诊断信息后静默退出。
'use strict';

//#region usage-core（由 build_client.py 从 src/usage-core.cjs 内联，勿手改）
__USAGE_CORE__
//#endregion usage-core

var CORE = module.exports;
module.exports = {};  // 复位：下面挂插件自身的导出

var DIAG_KEY = '__DSH_USAGE_BAR_DIAG__';
var SLOT_NAME = 'conversation.input.dock';
var SLOT_ORDER = 20;  // TodoPanel=0 / GoalBar=10 之后
/** 全域常显席位（REQ-091 / R4）：所有页面都能看到峰谷时段。 */
var GLOBAL_SLOT_NAME = 'sidebar.footer.action';
var GLOBAL_SLOT_ORDER = 910;

function diag(patch) {
  try {
    if (typeof window === 'undefined') { return; }
    var current = window[DIAG_KEY] || { plugin: 'dsh-plugin-usage-bar', events: [] };
    for (var k in patch) { if (Object.prototype.hasOwnProperty.call(patch, k)) { current[k] = patch[k]; } }
    current.events = (current.events || []).concat([{ at: new Date().toISOString(), note: patch.note || '' }]);
    window[DIAG_KEY] = current;
  } catch (err) { /* 诊断失败绝不影响宿主 */ }
}

/** 组装一行展示文本：时段 + 折扣 + 倒计时；额度由每轮常显看板承载（本插件无宿主数据通道）。 */
function buildLine(nowMs, balanceText) {
  var r = CORE.resolvePeriod(nowMs);
  var tail = '距切换 ' + CORE.humanizeSeconds(r.nextSwitchInSeconds) + '（' + r.nextSwitchAtBeijing + '）';
  var price = r.period === 'offpeak' ? '空闲价 · 高峰价 5 折' : '高峰价';
  var head = (r.period === 'offpeak' ? '🌙 ' : '🔥 ') + 'DeepSeek ' + r.periodLabel + ' · ' + price;
  // 额度不在本行显示：客户端拿不到宿主数据（投影契约未确认），写个永久「未接入」只会让人以为坏了。
  // 真实额度由 ai-control 拦截层在每轮常显看板里给出（宿主侧调用官方接口）。
  return head + ' · ' + tail + ' · 额度见每轮常显看板' + (balanceText ? '（' + balanceText + '）' : '');
}

/**
 * 组装**全域常显**用的紧凑一行（侧栏底部宽度有限，必须短）。
 * 口径与 `buildLine` 完全同源（同一个 resolvePeriod），只是措辞压缩 ——
 * 不允许在这里换一套算法，否则又变成"同一事实两种说法"。
 */
function buildCompactLine(nowMs) {
  var r = CORE.resolvePeriod(nowMs);
  var head = (r.period === 'offpeak' ? '🌙 ' : '🔥 ') + r.periodLabel;
  return head + ' · ' + CORE.humanizeSeconds(r.nextSwitchInSeconds);
}

/** React 组件：每秒重算一次倒计时（纯本地计算，无网络请求）。 */
function makeComponent(React, balanceText) {
  return function UsageBar() {
    var state = React.useState(function () { return buildLine(Date.now(), balanceText); });
    var text = state[0], setText = state[1];
    React.useEffect(function () {
      var timer = setInterval(function () { setText(buildLine(Date.now(), balanceText)); }, 1000);
      return function () { clearInterval(timer); };
    }, []);
    return React.createElement('div', {
      className: 'dsh-usage-bar',
      title: '数据来源：DeepSeek 官方峰谷定价规则（本地按时区计算）；额度栏需宿主通道，未接入前不显示任何数字',
      style: {
        fontSize: '12px', lineHeight: '1.6', opacity: 0.85,
        padding: '2px 10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
      }
    }, text);
  };
}

/**
 * 全域常显组件（侧栏底部）：紧凑、每秒刷新、可换行不溢出。
 * 为什么单独一个组件而不是复用输入坞那个：两处**宽度与语境不同** ——
 * 输入坞横排放得下整句，侧栏底部只有几十像素宽，塞整句会被裁成省略号（等于看不见）。
 * 但两者数据源同一个 `resolvePeriod`，不存在第二套口径。
 */
function makeGlobalComponent(React) {
  return function UsageBarGlobal() {
    var state = React.useState(function () { return buildCompactLine(Date.now()); });
    var text = state[0], setText = state[1];
    React.useEffect(function () {
      var timer = setInterval(function () { setText(buildCompactLine(Date.now())); }, 1000);
      return function () { clearInterval(timer); };
    }, []);
    return React.createElement('div', {
      className: 'dsh-usage-bar-global',
      title: 'DeepSeek 峰谷时段（本地按时区计算，每秒刷新）· 空闲价 = 高峰价 5 折',
      style: {
        fontSize: '12px', lineHeight: '1.5', opacity: 0.85,
        padding: '2px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
      }
    }, text);
  };
}

if (typeof document !== 'undefined') {
  module.exports = {
    inject: [],
    async apply(ctx) {
      var notes = [];
      try {
        // 1) 记录宿主暴露给插件的上下文能力（只记键名，供后续接额度通道时定契约）
        var ctxKeys = ctx && typeof ctx === 'object' ? Object.keys(ctx).sort() : [];
        var slotApi = !!(ctx && ctx.slots && typeof ctx.slots.inject === 'function' && typeof ctx.slots.register === 'function');
        var React = null;
        try { React = require('react'); } catch (err) { notes.push('require(react) 不可用: ' + (err && err.message)); }
        diag({ ctxKeys: ctxKeys, slotApi: slotApi, reactAvailable: !!React, note: 'client half 已 apply' });

        if (!slotApi) { notes.push('宿主未提供 ctx.slots（inject/register），按红线不做 DOM 穿透'); }
        if (!React) { notes.push('缺少 React seed，无法注册插槽组件'); }
        if (!slotApi || !React) {
          diag({ rendered: false, notes: notes.join('｜') });
          if (typeof console !== 'undefined') {
            console.warn('[dsh-plugin-usage-bar] 未渲染：' + notes.join('｜') + '；诊断见 window.' + DIAG_KEY);
          }
          return undefined;
        }

        // 2) 注册到输入坞插槽（会话页） + 全域常显席位（所有页面，REQ-091 / R4）
        var Component = makeComponent(React, null);
        var GlobalComponent = makeGlobalComponent(React);
        ctx.slots.inject(SLOT_NAME, function () {
          return ctx.slots.register({ name: SLOT_NAME, id: 'dsh_usage_bar', order: SLOT_ORDER }, Component);
        });
        ctx.slots.inject(GLOBAL_SLOT_NAME, function () {
          return ctx.slots.register(
            { name: GLOBAL_SLOT_NAME, id: 'dsh_usage_bar_global', order: GLOBAL_SLOT_ORDER },
            GlobalComponent
          );
        });
        diag({
          rendered: true,
          slots: [SLOT_NAME, GLOBAL_SLOT_NAME],
          orders: [SLOT_ORDER, GLOBAL_SLOT_ORDER],
          notes: notes.join('｜')
        });

        var dispose = function () { diag({ note: 'client half 已销毁' }); };
        if (ctx && typeof ctx.effect === 'function') {
          ctx.effect(function () { return dispose; }, 'dsh-plugin-usage-bar: dock line');
        }
        return dispose;
      } catch (err) {
        // 任何异常都不许冒泡到宿主：底栏插件坏了不能拖垮整个界面
        diag({ rendered: false, notes: 'apply 异常: ' + (err && err.message) });
        if (typeof console !== 'undefined') { console.warn('[dsh-plugin-usage-bar] 渲染异常（已降级）:', err && err.message); }
        return undefined;
      }
    },
  };
}

if (typeof module !== 'undefined') {
  // 供 Node 侧静态验证器 require（浏览器里不会走到这里）
  module.exports.__verify = {
    buildLine: buildLine,
    buildCompactLine: buildCompactLine,
    diagKey: DIAG_KEY,
    slots: [SLOT_NAME, GLOBAL_SLOT_NAME]
  };
}

return module.exports;
} });
