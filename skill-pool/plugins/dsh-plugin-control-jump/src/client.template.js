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

//#region inject-core（由 build_client.py 从 src/inject-core.cjs 内联，勿手改）
__INJECT_CORE__
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
