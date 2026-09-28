window.__ModuleLoader__.load({ id: "dsh-plugin-control-jump", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
// dsh-plugin-control-jump — client half（静态 bundle 形态）。
//
// 契约来源（照抄自已装且可用的社区插件 dsh-bottom-info-bar 的 client half）：
//   * window.__ModuleLoader__.load({ id, factory }) 注册模块；
//   * factory 返回 module.exports；
//   * module.exports = { inject: [...], async apply(ctx) {...} }；
//   * React 由 bundle 的 require('react') 提供（seed 模块）；
//   * ctx.effect(fn, label) 注册可回收副作用。
//
// 本插件**不使用 React**：注入目标在市场卡片与宿主清单条目内部，不是宿主 slot，
// 因此走 DOM 增强（MutationObserver + 属性锚点）。不依赖 React 也让它在宿主
// seed 模块缺席时依然能加载（灰度桌面端可能不提供）。
'use strict';

//#region inject-core sha256:3ebe322a570faa3d（由 build_client.py 从 src/inject-core.cjs 内联，勿手改）
// inject-core.cjs — 常显调控按钮的纯逻辑内核。
//
// 本文件是**唯一真相源**：client.js 由 build_client.py 把本文件内联进去，
// 探针 verify_plugin_button.py 也直接 require 本文件用 DOM 打桩做运行时验证。
// 一份实现，两处使用，不存在「源码改了但 bundle 没跟上」的可能。
//
// 设计约束（为什么把逻辑切得这么细）：
//   * applyButtons 是**纯函数**：只吃「条目列表 + 造按钮的函数」，不碰真实 DOM，
//     因此可以在 Node 里用打桩对象做真实的运行时验证，而不是只做静态断言；
//   * 幂等去重键 = `容器标识|插件id`：同一次渲染里同一插件只允许一个按钮，
//     重复扫描（MutationObserver 回调抖动）不得增加按钮数；
//   * 没有插件 id 的条目**不注入**：造不出正确的跳转目标，宁可不显示，
//     也绝不显示一个点了没用的按钮。
'use strict';

var BUTTON_ATTR = 'data-control-jump';

function normalizeId(value) {
  if (value === null || value === undefined) { return ''; }
  return String(value).trim();
}

// 从条目元素上解析插件 id。找不到就返回空串（调用方据此跳过注入）。
function resolvePluginId(element) {
  if (!element) { return ''; }
  var direct = normalizeId(element.getAttribute && element.getAttribute('data-plugin-id'));
  if (direct) { return direct; }
  if (typeof element.querySelector === 'function') {
    var carriers = ['[data-plugin-id]', '[data-plugin-name]', '[data-plugin-module]'];
    for (var i = 0; i < carriers.length; i++) {
      var found = element.querySelector(carriers[i]);
      if (!found) { continue; }
      var value = normalizeId(found.getAttribute('data-plugin-id'))
        || normalizeId(found.getAttribute('data-plugin-name'))
        || normalizeId(found.getAttribute('data-plugin-module'));
      if (value) { return value; }
    }
  }
  return '';
}

function containerKey(container, index) {
  if (!container) { return 'root#' + index; }
  var attr = container.getAttribute && (container.getAttribute('data-container-id')
    || container.getAttribute('data-dsh-market-root') !== null && 'market'
    || container.getAttribute('data-plugin-inventory') !== null && 'inventory');
  return attr || ('container#' + index);
}

// 纯函数：对一批条目注入按钮，返回统计。同 (容器, 插件id) 只注入一次。
function applyButtons(items, makeButton) {
  var seen = {};
  var created = 0;
  var skippedExisting = 0;
  var skippedNoId = 0;
  var duplicates = 0;
  var injected = [];

  for (var i = 0; i < items.length; i++) {
    var item = items[i] || {};
    var element = item.element;
    if (!element) { continue; }
    var pluginId = normalizeId(item.pluginId) || resolvePluginId(element);
    if (!pluginId) { skippedNoId++; continue; }

    var key = containerKey(item.container, item.containerIndex || 0) + '|' + pluginId;
    if (Object.prototype.hasOwnProperty.call(seen, key)) { duplicates++; continue; }

    if (typeof element.querySelector === 'function' && element.querySelector('[' + BUTTON_ATTR + ']')) {
      seen[key] = true;
      skippedExisting++;
      continue;
    }

    var button = makeButton(pluginId);
    if (!button) { skippedNoId++; continue; }
    if (button.setAttribute) { button.setAttribute(BUTTON_ATTR, pluginId); }
    if (typeof element.appendChild === 'function') { element.appendChild(button); }
    seen[key] = true;
    created++;
    injected.push({ pluginId: pluginId, button: button, element: element });
  }

  return {
    created: created,
    skippedExisting: skippedExisting,
    skippedNoId: skippedNoId,
    duplicates: duplicates,
    injected: injected,
  };
}

// 收集应注入按钮的条目。选择器全部来自宿主与市场的真实属性（已实测存在）。
var ENTRY_SELECTORS = [
  { selector: '[data-plugin-entry]', containerSelector: '[data-plugin-inventory]' },
  { selector: '[data-plugin-id][data-plugin-entry]', containerSelector: '[data-dsh-market-root]' },
  { selector: '[data-control-jump-host] [data-plugin-id]', containerSelector: '[data-control-jump-host]' }
];

function collectItems(doc) {
  var items = [];
  var containerIndex = 0;
  for (var i = 0; i < ENTRY_SELECTORS.length; i++) {
    var rule = ENTRY_SELECTORS[i];
    var nodes = doc.querySelectorAll(rule.selector);
    var containers = doc.querySelectorAll(rule.containerSelector);
    var container = containers && containers.length ? containers[0] : null;
    for (var j = 0; j < nodes.length; j++) {
      items.push({ element: nodes[j], container: container, containerIndex: containerIndex });
    }
    containerIndex++;
  }
  return items;
}

function createController(options) {
  var doc = options.document;
  var makeButton = options.makeButton;
  var observer = null;
  var last = { created: 0, skippedExisting: 0, skippedNoId: 0, duplicates: 0, injected: [] };

  function scan() {
    last = applyButtons(collectItems(doc), makeButton);
    return last;
  }

  function start() {
    scan();
    var MutationObserverCtor = options.MutationObserver || (typeof MutationObserver !== 'undefined' ? MutationObserver : null);
    if (!MutationObserverCtor || typeof doc.body === 'undefined' || !doc.body) { return; }
    observer = new MutationObserverCtor(function () { scan(); });
    observer.observe(doc.body, { childList: true, subtree: true });
  }

  function dispose() {
    if (observer && typeof observer.disconnect === 'function') { observer.disconnect(); }
    observer = null;
    var injected = last.injected || [];
    for (var i = 0; i < injected.length; i++) {
      var button = injected[i].button;
      if (button && button.parentNode && typeof button.parentNode.removeChild === 'function') {
        button.parentNode.removeChild(button);
      } else if (button && typeof button.remove === 'function') {
        button.remove();
      }
    }
    last = { created: 0, skippedExisting: 0, skippedNoId: 0, duplicates: 0, injected: [] };
  }

  return { scan: scan, start: start, dispose: dispose, stats: function () { return last; } };
}

module.exports = {
  BUTTON_ATTR: BUTTON_ATTR,
  ENTRY_SELECTORS: ENTRY_SELECTORS,
  applyButtons: applyButtons,
  collectItems: collectItems,
  createController: createController,
  resolvePluginId: resolvePluginId,
};
//#endregion inject-core

var CORE = module.exports;
module.exports = {};  // 复位：下面挂插件自身的导出

var HIGHLIGHT_CLASS = 'dsh-control-jump-target';
var STYLE_ID = 'dsh-control-jump-style';
var NAV_TEXT_RE = /插件|插件市场|Plugins?/i;

function injectStyles(doc) {
  if (doc.getElementById && doc.getElementById(STYLE_ID)) { return function () {}; }
  var style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = [
    '[' + CORE.BUTTON_ATTR + ']{margin-left:8px;padding:2px 10px;border-radius:6px;',
    'border:1px solid rgba(127,127,127,.45);background:rgba(127,127,127,.12);',
    'font-size:12px;line-height:1.7;cursor:pointer;white-space:nowrap}',
    '[' + CORE.BUTTON_ATTR + ']:hover{background:rgba(127,127,127,.24)}',
    '.' + HIGHLIGHT_CLASS + '{outline:2px solid #4c9aff;outline-offset:2px;border-radius:6px}'
  ].join('');
  (doc.head || doc.body || doc.documentElement).appendChild(style);
  return function () { if (style.parentNode) { style.parentNode.removeChild(style); } };
}

function makeButton(doc, pluginId) {
  var button = doc.createElement('button');
  button.type = 'button';
  button.textContent = '调控';
  button.title = '打开 ' + pluginId + ' 的详情控制页';
  button.className = 'dsh-control-jump';
  return button;
}

// 三级降级导航：宿主钩子 -> 点原生导航并高亮目标条目 -> 复制 id 并就地提示。
// 第三级永远可用，因此这个按钮在任何宿主版本上都不会「点了没反应」。
function openPluginSettings(doc, win, pluginId) {
  if (win && typeof win.__DSH_OPEN_PLUGIN_SETTINGS__ === 'function') {
    try { win.__DSH_OPEN_PLUGIN_SETTINGS__(pluginId); return 'host-hook'; } catch (err) { /* 落下一级 */ }
  }
  var entries = doc.querySelectorAll('[data-plugin-entry]');
  for (var i = 0; i < entries.length; i++) {
    var text = (entries[i].textContent || '');
    if (text.indexOf(pluginId) === -1) { continue; }
    var current = entries[i];
    while (current && current !== doc.body) {
      if (current.textContent && NAV_TEXT_RE.test(current.textContent)) { break; }
      current = current.parentNode;
    }
    if (typeof entries[i].scrollIntoView === 'function') { entries[i].scrollIntoView(); }
    if (entries[i].classList && entries[i].classList.add) { entries[i].classList.add(HIGHLIGHT_CLASS); }
    return 'locate';
  }
  var navs = doc.querySelectorAll('[role="tab"],[role="menuitem"],button,a');
  for (var j = 0; j < navs.length; j++) {
    var label = (navs[j].textContent || '');
    if (NAV_TEXT_RE.test(label) && typeof navs[j].click === 'function') {
      navs[j].click();
      return 'navigate';
    }
  }
  if (win && win.navigator && win.navigator.clipboard && win.navigator.clipboard.writeText) {
    try { win.navigator.clipboard.writeText(pluginId); } catch (err) { /* 忽略 */ }
  }
  if (win && typeof win.alert === 'function') {
    win.alert('请在「设置 → 插件」中查找并调控：' + pluginId);
  }
  return 'hint';
}

if (typeof module !== 'undefined') {
  // 供 Node 侧验证器直接 require 本 bundle 的逻辑分支（浏览器里不会走到这里）。
  module.exports = { makeButton: makeButton, openPluginSettings: openPluginSettings };
}

function install(doc, win) {
  var disposeStyle = injectStyles(doc);
  var controller = CORE.createController({
    document: doc,
    MutationObserver: win && win.MutationObserver,
    makeButton: function (pluginId) { return makeButton(doc, pluginId); },
  });
  function onClick(event) {
    var target = event.target;
    if (!target || typeof target.getAttribute !== 'function') { return; }
    var pluginId = target.getAttribute(CORE.BUTTON_ATTR);
    if (!pluginId) { return; }
    event.preventDefault();
    event.stopPropagation();
    openPluginSettings(doc, win, pluginId);
  }
  doc.addEventListener('click', onClick, true);
  controller.start();
  return function () {
    doc.removeEventListener('click', onClick, true);
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
        ctx.effect(function () { return dispose; }, 'dsh-plugin-control-jump: buttons');
      }
      return dispose;
    },
  };
}
return module.exports;
} });
