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
