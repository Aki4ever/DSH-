window.__ModuleLoader__.load({ id: "dsh-plugin-image-zoom", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
// dsh-plugin-image-zoom — client half（静态 bundle 形态）。
//
// 契约来源（照抄自已装且可用的社区插件 dsh-bottom-info-bar 的 client half，
// 与本仓 dsh-plugin-control-jump / dsh-plugin-usage-bar 完全同构）：
//   * window.__ModuleLoader__.load({ id, factory }) 注册模块；
//   * factory 返回 module.exports；
//   * module.exports = { inject: [], async apply(ctx) {...} }；
//   * ctx.effect(fn, label) 注册可回收副作用。
//
// 本插件**不使用 React**，也**不 require 任何 seed 模块**：注入目标是宿主
// ui-primitives 的 ImageLightbox —— 它 createPortal 到 document.body，不在任何
// slot 里，因此只能走 DOM 增强（MutationObserver + ARIA 锚点）。
// 不依赖 React 也让它在本宿主 seed 模块缺席时依然能加载。
//
// 目标 DOM（生产包实测，`cn.createPortal(jsxs("div",{className:Di.backdrop,
// role:"dialog","aria-modal":"true","aria-label":labels.dialog,children:[
//   jsx("div",{className:Di.mask,"aria-hidden":"true",onMouseDown:onClose}),
//   jsx("img",{className:Di.image,src,alt}),
//   jsx("button",{className:Di.close,"aria-label":labels.close,...})]}),document.body)`）：
//   宿主用 CSS module，类名是哈希（`._backdrop_1hos8_1` 这种），**绝不能**用类名
//   选择器锚定；只认 `[role="dialog"][aria-modal="true"]` 里**恰好一张 img** 的那个。
//   设置面板 / 风险确认弹窗同样带 role=dialog + aria-modal，但它们没有 img，
//   因此天然被排除；本控件条自身只放文本按钮、不含 img，不会破坏该不变式。
'use strict';

//#region inject-core（由 build_client.py 从 src/inject-core.cjs 内联，勿手改）
__INJECT_CORE__
//#endregion inject-core

var CORE = module.exports;
module.exports = {};  // 复位：下面挂插件自身的导出

var BAR_ID = 'dsh-image-zoom-bar';
var BAR_CSS = [
  // 半透明深底 + 圆角 + 白字，贴合 DSH 暗色主题；放在底边居中，不挡原图中心。
  '#' + BAR_ID + '{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);',
  'z-index:2;display:flex;align-items:center;gap:2px;padding:4px 6px;border-radius:999px;',
  'background:rgba(24,24,28,.82);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);',
  'border:.5px solid rgba(255,255,255,.16);box-shadow:0 8px 24px rgba(0,0,0,.38);',
  'color:#fff;font:500 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;',
  'user-select:none;-webkit-user-select:none}',
  '#' + BAR_ID + ' button{min-width:28px;height:28px;padding:0 8px;border:0;border-radius:999px;',
  'background:transparent;color:#fff;font:inherit;font-size:14px;line-height:1;cursor:pointer;',
  'transition:background-color .12s ease}',
  '#' + BAR_ID + ' button:hover:not(:disabled){background:rgba(255,255,255,.16)}',
  '#' + BAR_ID + ' button:focus-visible{outline:2px solid #4c9aff;outline-offset:1px}',
  '#' + BAR_ID + ' button:disabled{opacity:.35;cursor:not-allowed}',
  '#' + BAR_ID + ' [' + CORE.PERCENT_ATTR + ']{min-width:46px;text-align:center;',
  'font-variant-numeric:tabular-nums;opacity:.92}',
  '@media (prefers-reduced-motion:reduce){#' + BAR_ID + ' button{transition:none}}'
].join('');

function injectStyles(doc) {
  if (doc.getElementById && doc.getElementById(CORE.STYLE_ID)) { return function () {}; }
  var style = doc.createElement('style');
  style.setAttribute('id', CORE.STYLE_ID);
  style.textContent = BAR_CSS;
  (doc.head || doc.body || doc.documentElement).appendChild(style);
  return function () {
    if (style.parentNode && typeof style.parentNode.removeChild === 'function') {
      style.parentNode.removeChild(style);
    }
  };
}

function removeNode(node) {
  if (!node) { return; }
  if (node.parentNode && typeof node.parentNode.removeChild === 'function') {
    node.parentNode.removeChild(node);
  } else if (typeof node.remove === 'function') {
    node.remove();
  }
}

/**
 * 造控件条：`−` / 百分比读数 / `+` / `1:1`。
 * 全部是文本节点、**不含 img**（否则会破坏 findLightbox 的「唯一 img」不变式）。
 * @returns {{bar: Element, setState: (percent: number) => number}}
 */
function makeBar(doc) {
  var bar = doc.createElement('div');
  bar.setAttribute('id', BAR_ID);
  bar.setAttribute(CORE.BAR_ATTR, '1');
  bar.setAttribute('role', 'group');
  var buttons = {};

  function addButton(action, text, accessibleName) {
    var button = doc.createElement('button');
    button.setAttribute('type', 'button');
    button.setAttribute(CORE.ACTION_ATTR, action);
    button.setAttribute('aria-label', accessibleName);
    button.setAttribute('title', accessibleName);
    button.textContent = text;
    bar.appendChild(button);
    buttons[action] = button;
    return button;
  }

  addButton('out', '\u2212', '缩小');

  var readout = doc.createElement('span');
  readout.setAttribute(CORE.PERCENT_ATTR, String(CORE.MIN_PERCENT));
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = CORE.label(CORE.MIN_PERCENT);
  bar.appendChild(readout);

  addButton('in', '+', '放大');
  addButton('reset', '1:1', '重置为原始大小');

  function setState(percent) {
    var resolved = CORE.normalizePercent(percent);
    buttons.out.disabled = CORE.isDisabled(resolved, 'out');
    buttons.in.disabled = CORE.isDisabled(resolved, 'in');
    readout.textContent = CORE.label(resolved);
    readout.setAttribute(CORE.PERCENT_ATTR, String(resolved));
    bar.setAttribute('data-image-zoom-state', String(resolved));
    bar.setAttribute('aria-label', '图片缩放，当前 ' + resolved + '%');
    return resolved;
  }

  setState(CORE.MIN_PERCENT);
  return { bar: bar, setState: setState };
}

/** 从点击目标沿 parentNode 上溯取动作；走到控件条即止。 */
function resolveAction(target, bar) {
  var node = target;
  while (node && node !== bar) {
    if (typeof node.getAttribute === 'function') {
      var action = node.getAttribute(CORE.ACTION_ATTR);
      if (action) { return action; }
    }
    node = node.parentNode;
  }
  return '';
}

/** 宿主灯箱的关闭按钮：灯箱内、控件条外、带 aria-label 的第一个 button。 */
function findCloseButton(root, bar) {
  if (!root || typeof root.querySelectorAll !== 'function') { return null; }
  var buttons = root.querySelectorAll('button');
  if (!buttons) { return null; }
  for (var i = 0; i < buttons.length; i++) {
    var node = buttons[i];
    var walk = node;
    var inBar = false;
    while (walk) {
      if (walk === bar) { inBar = true; break; }
      walk = walk.parentNode;
    }
    if (inBar) { continue; }
    if (typeof node.getAttribute === 'function' && node.getAttribute('aria-label')) { return node; }
  }
  return null;
}

/**
 * 键盘可达性桥：宿主灯箱自带 Tab 陷阱（`window` **捕获阶段**无条件
 * `preventDefault()` 并把焦点钉回关闭按钮），控件条光有 `<button>` 也永远
 * Tab 不到。
 *
 * 为什么挂在**冒泡阶段**：宿主是在灯箱挂载时注册捕获监听的，比我们晚注册；
 * 同一个 target 同一个阶段按注册顺序执行，所以「都在捕获阶段」时我们会被
 * 宿主的 `close.focus()` 覆盖掉。改挂冒泡阶段后，事件先走宿主的捕获处理器，
 * 再冒泡回 window 触发我们 —— 我们读到的是宿主刚钉好的焦点，再把它移进环内。
 * 冒泡监听不调用任何 stopPropagation，因此不干扰宿主的 Escape 与页面其他键。
 *
 * 焦点环 = `− → + → 1:1 → 关闭 → − …`：关闭按钮**永远在环上**，不会把用户
 * 困在控件条里。只在「焦点已经在灯箱内」时接管；宿主将来放开 Tab 也不会被
 * 本插件截胡（此时我们直接放行，让浏览器走原生顺序）。
 */
function installTabBridge(doc, win, controller) {
  if (!win || typeof win.addEventListener !== 'function') { return function () {}; }
  var cursor = -1;

  function ring() {
    var current = controller.current();
    if (!current || !current.bar) { return []; }
    var items = [];
    if (typeof current.bar.querySelectorAll === 'function') {
      var buttons = current.bar.querySelectorAll('button:not([disabled])');
      for (var i = 0; i < buttons.length; i++) { items.push(buttons[i]); }
    }
    var close = findCloseButton(current.root, current.bar);
    if (close) { items.push(close); }
    return items;
  }

  function onKeyDown(event) {
    if (!event || event.key !== 'Tab') { return; }
    var current = controller.current();
    if (!current) { cursor = -1; return; }
    var items = ring();
    if (!items.length) { return; }
    var active = doc.activeElement;
    var inside = false;
    for (var i = 0; i < items.length; i++) {
      if (items[i] === active) { inside = true; break; }
    }
    if (!inside && active && typeof current.root.contains === 'function'
      && current.root.contains(active)) {
      inside = true;
    }
    if (!inside) { cursor = -1; return; }
    var next = CORE.nextFocusIndex(cursor, items.length, !!event.shiftKey);
    if (next < 0) { return; }
    cursor = next;
    if (typeof event.preventDefault === 'function') { event.preventDefault(); }
    if (items[next] && typeof items[next].focus === 'function') { items[next].focus(); }
  }

  // capture=false：必须晚于宿主的捕获处理器执行（见上方注释）。
  win.addEventListener('keydown', onKeyDown);
  return function () { win.removeEventListener('keydown', onKeyDown); };
}

function install(doc, win) {
  var disposeStyle = injectStyles(doc);
  var controller = CORE.createController({
    document: doc,
    MutationObserver: win && win.MutationObserver,
    makeBar: function () { return makeBar(doc); },
  });

  function onClick(event) {
    var current = controller.current();
    if (!current || !event || !event.target) { return; }
    if (typeof current.bar.contains === 'function' && !current.bar.contains(event.target)) { return; }
    var action = resolveAction(event.target, current.bar);
    if (CORE.ACTIONS.indexOf(action) === -1) { return; }
    if (typeof event.preventDefault === 'function') { event.preventDefault(); }
    controller.setPercent(CORE.applyAction(current.percent, action));
  }

  doc.addEventListener('click', onClick, true);
  var disposeKeyboard = installTabBridge(doc, win, controller);
  controller.start();

  return function dispose() {
    doc.removeEventListener('click', onClick, true);
    disposeKeyboard();
    controller.dispose();
    disposeStyle();
  };
}

if (typeof document !== 'undefined') {
  module.exports = {
    inject: [],
    async apply(ctx) {
      var dispose = install(document, window);
      if (ctx && typeof ctx.effect === 'function') {
        ctx.effect(function () { return dispose; }, 'dsh-plugin-image-zoom: lightbox zoom bar');
      }
      return dispose;
    },
  };
}
return module.exports;
} });
