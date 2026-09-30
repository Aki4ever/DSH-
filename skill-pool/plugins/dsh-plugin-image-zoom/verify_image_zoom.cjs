#!/usr/bin/env node
/**
 * verify_image_zoom.cjs — dsh-plugin-image-zoom 的打桩实测（不需要宿主 App 即可运行）
 *
 * 为什么必须有这一层：客户端半体只在宿主里才会被加载，等重启 App 才发现
 * 「控件条没挂上 / 档位算错 / 图片被 scale(undefined) 抹掉」代价太高。
 * 本脚本分三层，一层比一层更接近真实：
 *
 *   ① 静态契约：包结构必须符合宿主 client 插件契约（dsh.client.platform=web、
 *      exports["./client"]、cordis.patch.yml、bundle 逐字内联内核、零外链）；
 *   ② 纯逻辑内核：直接 require src/inject-core.cjs，断言档位/钳制/禁用判定，
 *      含**反向用例**（-999 / NaN / 'abc' / null / Infinity 一律不得返回 undefined）；
 *   ③ 端到端打桩：用最小 DOM 桩 + MutationObserver 桩真的跑一遍
 *      「灯箱出现 → 注入控件条 → 点 +/−/1:1 → 灯箱消失 → 清理还原」。
 *
 * 判定口径（任一不满足即退 1）：
 *   1) 包结构与宿主契约逐项相符，bundle 与 src/inject-core.cjs 逐字一致；
 *   2) zoomed(100,+1)=150、zoomed(800,+1)=800、zoomed(100,-1)=100；
 *   3) 100% 时 − 禁用、800% 时 + 禁用；
 *   4) 非法档位被钳制到 LEVELS 中的合法值，绝不返回 undefined；
 *   5) 灯箱出现即注入、重复扫描幂等、灯箱消失即清理并还原 img 样式；
 *   6) 非灯箱弹窗（role=dialog 但无 img）不得被注入。
 *
 * Exit Code: 0 全部通过 / 1 任一项失败 / 2 输入缺失
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const HERE = __dirname;
const CORE = path.join(HERE, 'src', 'inject-core.cjs');
const TEMPLATE = path.join(HERE, 'src', 'client.template.js');
const BUNDLE = path.join(HERE, 'lib', 'client.js');
const MANIFEST = path.join(HERE, 'package.json');
const PATCH = path.join(HERE, 'cordis.patch.yml');
const INDEX = path.join(HERE, 'lib', 'index.js');
for (const file of [CORE, TEMPLATE, BUNDLE, MANIFEST, PATCH, INDEX]) {
  if (!fs.existsSync(file)) {
    console.error('❌ 缺少输入文件：' + file + '（先跑 build_client.py）');
    process.exit(2);
  }
}

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail === undefined ? '' : String(detail) });
}

// ───────────────────────────────────────────────────────────────────────────
// ① 静态契约
// ───────────────────────────────────────────────────────────────────────────
const pkg = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const patchText = fs.readFileSync(PATCH, 'utf8');
const bundle = fs.readFileSync(BUNDLE, 'utf8');
const coreText = fs.readFileSync(CORE, 'utf8').replace(/\n+$/, '');
const indexText = fs.readFileSync(INDEX, 'utf8');

check('package.json name 为 dsh-plugin-image-zoom', pkg.name === 'dsh-plugin-image-zoom', pkg.name);
check('main 指向 lib/index.js', pkg.main === 'lib/index.js', pkg.main);
check('exports["./client"] 存在且指向 ./lib/client.js',
  pkg.exports && pkg.exports['./client'] === './lib/client.js',
  pkg.exports && pkg.exports['./client']);
check('dsh.bundle.patch = ./cordis.patch.yml',
  !!(pkg.dsh && pkg.dsh.bundle && pkg.dsh.bundle.patch === './cordis.patch.yml'),
  pkg.dsh && pkg.dsh.bundle && pkg.dsh.bundle.patch);
check('dsh.client.platform = web', !!(pkg.dsh && pkg.dsh.client && pkg.dsh.client.platform === 'web'),
  pkg.dsh && pkg.dsh.client && pkg.dsh.client.platform);
check('dsh.client.inject 是字符串数组',
  !!(pkg.dsh && pkg.dsh.client && Array.isArray(pkg.dsh.client.inject)
    && pkg.dsh.client.inject.every((item) => typeof item === 'string')),
  JSON.stringify(pkg.dsh && pkg.dsh.client && pkg.dsh.client.inject));
check('cordis.patch.yml 是 insert 形式且 id/name 与包同名',
  /^- insert:/m.test(patchText)
    && patchText.includes('- id: dsh-plugin-image-zoom')
    && patchText.includes('name: dsh-plugin-image-zoom'));
check('lib/index.js 声明同名宿主半体',
  indexText.includes("name: 'dsh-plugin-image-zoom'") && indexText.includes('apply()'));
check('client.js 走 window.__ModuleLoader__.load({ id, factory })',
  bundle.includes('window.__ModuleLoader__.load({ id: "dsh-plugin-image-zoom", factory:'));
check('client.js 逐字内联 src/inject-core.cjs', bundle.includes(coreText));

const digest = require('node:crypto').createHash('sha256').update(coreText, 'utf8').digest('hex').slice(0, 16);
check('client.js 盖上与内核一致的 sha256 短摘要', bundle.includes('sha256:' + digest), digest);
check('client.js 零外链（不 require 任何 seed 模块）',
  !/require\(\s*['"]/.test(bundle) && !bundle.includes('__INJECT_CORE__'));
check('client.js 导出 apply 与 effect 回收标签',
  bundle.includes('async apply(ctx)') && bundle.includes("ctx.effect(function () { return dispose; }, 'dsh-plugin-image-zoom"));

// ───────────────────────────────────────────────────────────────────────────
// ② 纯逻辑内核
// ───────────────────────────────────────────────────────────────────────────
const CORE_MOD = require(CORE);
const { LEVELS, MIN_PERCENT, MAX_PERCENT } = CORE_MOD;

check('档位表恰为 100/150/200/300/400/600/800 且升序',
  LEVELS.length === 7 && LEVELS.join(',') === '100,150,200,300,400,600,800' && MIN_PERCENT === 100 && MAX_PERCENT === 800,
  LEVELS.join(','));

// 需求点名的三条
check('zoomed(100, +1) === 150', CORE_MOD.zoomed(100, +1) === 150, CORE_MOD.zoomed(100, +1));
check('zoomed(800, +1) === 800（到顶钳制）', CORE_MOD.zoomed(800, +1) === 800, CORE_MOD.zoomed(800, +1));
check('zoomed(100, -1) === 100（到底钳制）', CORE_MOD.zoomed(100, -1) === 100, CORE_MOD.zoomed(100, -1));
check('zoomed(800, -1) === 600', CORE_MOD.zoomed(800, -1) === 600, CORE_MOD.zoomed(800, -1));
check('zoomed 逐档连通：100 →150→200→300→400→600→800',
  [1, 1, 1, 1, 1, 1].reduce((acc) => CORE_MOD.zoomed(acc, 1), 100) === 800);

// 禁用判定
check('100% 时 − 禁用', CORE_MOD.isDisabled(100, 'out') === true);
check('100% 时 + 可用', CORE_MOD.isDisabled(100, 'in') === false);
check('800% 时 + 禁用', CORE_MOD.isDisabled(800, 'in') === true);
check('800% 时 − 可用', CORE_MOD.isDisabled(800, 'out') === false);

// 反向用例：非法档位必须被钳制或明确拒绝，绝不能是 undefined
const HOSTILE = [-999, 0, NaN, Infinity, -Infinity, null, undefined, 'abc', '', {}, [], true, 1e9, -1e9, 99, 101, 749];
const clamped = HOSTILE.map((value) => CORE_MOD.normalizePercent(value));
check('非法档位全部被钳制成合法档位（无 undefined/NaN）',
  clamped.every((value) => LEVELS.indexOf(value) !== -1),
  JSON.stringify(clamped));
check('normalizePercent(-999) === 100', CORE_MOD.normalizePercent(-999) === 100, CORE_MOD.normalizePercent(-999));
check('normalizePercent(NaN) === 100', CORE_MOD.normalizePercent(NaN) === 100, CORE_MOD.normalizePercent(NaN));
check('normalizePercent(Infinity) === 800 / (-Infinity) === 100（溢出钳到端点）',
  CORE_MOD.normalizePercent(Infinity) === 800 && CORE_MOD.normalizePercent(-Infinity) === 100,
  [CORE_MOD.normalizePercent(Infinity), CORE_MOD.normalizePercent(-Infinity)].join('/'));
check('normalizePercent(99) 取最近档 100 / (101) 取 100 / (749) 取 800',
  CORE_MOD.normalizePercent(99) === 100 && CORE_MOD.normalizePercent(101) === 100 && CORE_MOD.normalizePercent(749) === 800,
  [CORE_MOD.normalizePercent(99), CORE_MOD.normalizePercent(101), CORE_MOD.normalizePercent(749)].join('/'));
check('zoomed 对非法输入仍返回合法档位', HOSTILE.every((value) => LEVELS.indexOf(CORE_MOD.zoomed(value, 1)) !== -1));
check('zoomed 对非法步进仍返回合法档位',
  [NaN, 'x', null, undefined, 0].every((step) => LEVELS.indexOf(CORE_MOD.zoomed(200, step)) !== -1)
    && CORE_MOD.zoomed(200, NaN) === 200);
check('zoomed(-999, -1) === 100（钳制后再步进）', CORE_MOD.zoomed(-999, -1) === 100, CORE_MOD.zoomed(-999, -1));
check('label 对非法输入也给出合法文案',
  CORE_MOD.label(150) === '150%' && CORE_MOD.label(NaN) === '100%' && CORE_MOD.label(-999) === '100%',
  CORE_MOD.label(NaN));
check('transformFor(150)=scale(1.5) / (800)=scale(8)',
  CORE_MOD.transformFor(150) === 'scale(1.5)' && CORE_MOD.transformFor(800) === 'scale(8)',
  CORE_MOD.transformFor(150));

// 动作求值
check('applyAction(100,"in")=150 / (800,"in")=800 / (200,"reset")=100 / 未知动作不变',
  CORE_MOD.applyAction(100, 'in') === 150
    && CORE_MOD.applyAction(800, 'in') === 800
    && CORE_MOD.applyAction(200, 'reset') === 100
    && CORE_MOD.applyAction(200, 'bogus') === 200
    && CORE_MOD.applyAction(NaN, 'out') === 100);

// 焦点环
check('nextFocusIndex 循环且空环返回 -1',
  CORE_MOD.nextFocusIndex(-1, 4, false) === 0
    && CORE_MOD.nextFocusIndex(3, 4, false) === 0
    && CORE_MOD.nextFocusIndex(0, 4, true) === 3
    && CORE_MOD.nextFocusIndex(-1, 0, false) === -1
    && CORE_MOD.nextFocusIndex(NaN, NaN, false) === -1);

// ───────────────────────────────────────────────────────────────────────────
// ③ 端到端打桩：最小 DOM + MutationObserver
// ───────────────────────────────────────────────────────────────────────────
/** 极简 DOM：只实现本插件用到的 API；不认识的 CSS 选择器**直接抛错**，
 *  这样内核将来新增一个选择器时，这里会响亮地失败而不是静默通过。 */
const SELECTOR_CACHE = new Map();

function parseSelector(selector) {
  if (SELECTOR_CACHE.has(selector)) { return SELECTOR_CACHE.get(selector); }
  if (typeof selector !== 'string' || selector.length === 0) {
    throw new Error('stub-dom: 空选择器');
  }
  const nots = [];
  const main = selector.replace(/:not\(([^)]*)\)/g, (_, inner) => {
    nots.push(inner);
    return '';
  });
  if (/[\s>+~,]/.test(main)) {
    throw new Error('stub-dom: 不支持选择器（后代/组合/分组）：' + selector);
  }
  const tagMatch = /^[a-zA-Z][a-zA-Z0-9-]*/.exec(main);
  const attrs = [];
  const attrRe = /\[([^\]=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]/g;
  let match;
  while ((match = attrRe.exec(main)) !== null) {
    const value = match[2] !== undefined ? match[2] : match[3] !== undefined ? match[3] : match[4];
    attrs.push({ name: match[1], value: value === undefined ? null : value });
  }
  const leftover = main.replace(/^[a-zA-Z][a-zA-Z0-9-]*/, '').replace(/\[[^\]]*\]/g, '').trim();
  if (leftover) { throw new Error('stub-dom: 不支持的选择器语法：' + selector); }
  const parsed = { selector, tag: tagMatch ? tagMatch[0].toLowerCase() : null, attrs, nots: nots.map(parseSelector) };
  SELECTOR_CACHE.set(selector, parsed);
  return parsed;
}

function matches(el, parsed) {
  if (!el || el.nodeType !== 1) { return false; }
  if (parsed.tag && String(el.tagName).toLowerCase() !== parsed.tag) { return false; }
  for (const attr of parsed.attrs) {
    const actual = el.getAttribute(attr.name);
    if (attr.value === null) {
      if (actual === null) { return false; }
    } else if (actual !== attr.value) {
      return false;
    }
  }
  for (const not of parsed.nots) { if (matches(el, not)) { return false; } }
  return true;
}

function descendants(root) {
  const out = [];
  const stack = [...root.children];
  while (stack.length) {
    const node = stack.shift();
    out.push(node);
    if (node.children) { stack.unshift(...node.children); }
  }
  return out;
}

function createEventTarget(target) {
  target._listeners = Object.create(null);
  target.addEventListener = function (type, fn, capture) {
    (target._listeners[type] = target._listeners[type] || []).push({ fn, capture: !!capture });
  };
  target.removeEventListener = function (type, fn, capture) {
    const list = target._listeners[type] || [];
    const index = list.findIndex((item) => item.fn === fn && item.capture === !!capture);
    if (index >= 0) { list.splice(index, 1); }
  };
  return target;
}

function attachChild(parent, child) {
  if (child.parentNode) { child.parentNode.removeChild(child); }
  child.parentNode = parent;
  parent.children.push(child);
  return child;
}

function detachChild(parent, child) {
  const index = parent.children.indexOf(child);
  if (index >= 0) { parent.children.splice(index, 1); child.parentNode = null; }
  return child;
}

function createElement(doc, tag) {
  const el = {
    nodeType: 1,
    tagName: String(tag).toUpperCase(),
    children: [],
    parentNode: null,
    style: {},
    attributes: Object.create(null),
    _listeners: Object.create(null),
    textContent: '',
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    removeAttribute(name) { delete this.attributes[name]; },
    appendChild(child) { return attachChild(this, child); },
    removeChild(child) { return detachChild(this, child); },
    remove() { if (this.parentNode) { this.parentNode.removeChild(this); } },
    contains(node) {
      if (node === this) { return true; }
      if (!node) { return false; }
      let walk = node.parentNode;
      while (walk) { if (walk === this) { return true; } walk = walk.parentNode; }
      return false;
    },
    querySelector(selector) {
      const found = this.querySelectorAll(selector);
      return found.length ? found[0] : null;
    },
    querySelectorAll(selector) {
      const parsed = parseSelector(selector);
      return descendants(this).filter((node) => matches(node, parsed));
    },
    focus() { doc.activeElement = this; },
  };
  createEventTarget(el);
  Object.defineProperty(el, 'disabled', {
    enumerable: true,
    configurable: true,
    get() { return Object.prototype.hasOwnProperty.call(this.attributes, 'disabled'); },
    set(value) {
      if (value) { this.attributes.disabled = ''; } else { delete this.attributes.disabled; }
    },
  });
  return el;
}

function createDocument() {
  const doc = createEventTarget({
    nodeType: 9,
    children: [],
    activeElement: null,
    appendChild(child) { return attachChild(doc, child); },
    removeChild(child) { return detachChild(doc, child); },
    createElement(tag) { return createElement(doc, tag); },
    querySelector(selector) {
      const found = doc.querySelectorAll(selector);
      return found.length ? found[0] : null;
    },
    querySelectorAll(selector) {
      const parsed = parseSelector(selector);
      return descendants(doc).filter((node) => matches(node, parsed));
    },
    getElementById(id) {
      return descendants(doc).find((node) => node.getAttribute('id') === id) || null;
    },
  });
  doc.documentElement = doc.createElement('html');
  doc.head = doc.createElement('head');
  doc.body = doc.createElement('body');
  doc.appendChild(doc.documentElement);
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);
  return doc;
}

function dispatch(doc, win, target, type, extra) {
  const event = Object.assign({
    type,
    target,
    defaultPrevented: false,
    propagationStopped: false,
    immediateStopped: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.propagationStopped = true; },
    stopImmediatePropagation() { this.immediateStopped = true; this.propagationStopped = true; },
  }, extra || {});
  const path = [win, doc];
  const chain = [];
  let node = target;
  while (node && node !== doc) { chain.push(node); node = node.parentNode; }
  path.push(...chain.reverse());
  const fire = (host, wantCapture) => {
    const list = (host._listeners && host._listeners[type]) || [];
    for (const entry of list.slice()) {
      if (wantCapture !== null && entry.capture !== wantCapture) { continue; }
      entry.fn(event);
      if (event.immediateStopped) { return; }
    }
  };
  for (let i = 0; i < path.length - 1 && !event.propagationStopped; i++) { fire(path[i], true); }
  if (!event.propagationStopped) { fire(path[path.length - 1], null); }
  for (let i = path.length - 2; i >= 0 && !event.propagationStopped; i--) { fire(path[i], false); }
  return event;
}

class FakeMutationObserver {
  constructor(callback) {
    this.callback = callback;
    this.observing = false;
    this.target = null;
    FakeMutationObserver.instances.push(this);
  }
  observe(target, options) { this.observing = true; this.target = target; this.options = options; }
  disconnect() { this.observing = false; }
  takeRecords() { return []; }
  /** 模拟宿主改 DOM 后浏览器投递的那一次回调。 */
  trigger() { if (this.observing) { this.callback([], this); } }
}
FakeMutationObserver.instances = [];

function makeHostLightbox(doc, src, withImage) {
  const root = doc.createElement('div');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', '图片预览');
  const mask = doc.createElement('div');
  mask.setAttribute('aria-hidden', 'true');
  root.appendChild(mask);
  let image = null;
  if (withImage) {
    image = doc.createElement('img');
    image.setAttribute('src', src);
    image.setAttribute('alt', 'preview');
    root.appendChild(image);
  }
  const close = doc.createElement('button');
  close.setAttribute('type', 'button');
  close.setAttribute('aria-label', '关闭');
  close.textContent = '\u00d7';
  root.appendChild(close);
  return { root, mask, image, close };
}

function loadBundle(doc, win) {
  let captured = null;
  global.window = win;
  global.document = doc;
  win.__ModuleLoader__ = {
    load(spec) { captured = spec.factory(() => { throw new Error('未预期的 seed 模块'); }); return captured; },
  };
  delete require.cache[require.resolve(BUNDLE)];
  require(BUNDLE);
  return captured;
}

async function main() {
  const doc = createDocument();
  const win = createEventTarget({ MutationObserver: FakeMutationObserver });
  const mod = loadBundle(doc, win);
  check('bundle 可加载并导出 apply', !!(mod && typeof mod.apply === 'function'));

  const effects = [];
  const ctx = { effect(fn, label) { effects.push({ fn, label }); } };
  let dispose = null;
  let applyError = null;
  try {
    dispose = await mod.apply(ctx);
  } catch (error) { applyError = error; }
  check('apply 不抛异常', applyError === null, applyError && applyError.message);
  check('用 ctx.effect 注册可回收副作用（带标签）',
    effects.length === 1 && typeof effects[0].fn === 'function'
      && effects[0].label === 'dsh-plugin-image-zoom: lightbox zoom bar',
    effects.length ? effects[0].label : 'no effect');
  check('ctx.effect 的回调返回 dispose（宿主可回收）',
    effects.length === 1 && typeof effects[0].fn() === 'function');

  const observer = FakeMutationObserver.instances[0];
  check('在 document.body 上装了 MutationObserver（childList+subtree）',
    !!observer && observer.observing && observer.target === doc.body
      && observer.options && observer.options.childList === true && observer.options.subtree === true);
  check('样式表只注入一次', doc.querySelectorAll('style[id="dsh-image-zoom-style"]').length === 1);
  check('无灯箱时不注入控件条', doc.querySelectorAll('[data-image-zoom-bar]').length === 0);

  // 非灯箱弹窗（role=dialog + aria-modal，但没有 img）不得被注入
  const alien = doc.createElement('div');
  alien.setAttribute('role', 'dialog');
  alien.setAttribute('aria-modal', 'true');
  alien.setAttribute('data-shortcut-modal', 'settings');
  doc.body.appendChild(alien);
  observer.trigger();
  check('非灯箱弹窗（无 img）不被注入',
    alien.querySelectorAll('[data-image-zoom-bar]').length === 0);

  // 灯箱出现
  const lightbox = makeHostLightbox(doc, 'data:image/png;base64,AAAA', true);
  doc.body.appendChild(lightbox.root);
  observer.trigger();

  const bars = lightbox.root.querySelectorAll('[data-image-zoom-bar]');
  check('灯箱出现即注入控件条（恰一个）', bars.length === 1, bars.length);
  const bar = bars[0];
  check('控件条挂在灯箱根节点内（role=dialog 的 portal 容器）', bar && bar.parentNode === lightbox.root);
  check('控件条不含 img（不破坏「灯箱内唯一 img」不变式）',
    bar.querySelectorAll('img').length === 0);

  const outButton = bar.querySelector('[data-image-zoom-action="out"]');
  const inButton = bar.querySelector('[data-image-zoom-action="in"]');
  const resetButton = bar.querySelector('[data-image-zoom-action="reset"]');
  const readout = bar.querySelector('[data-image-zoom-percent]');
  check('控件条含 − / + / 1:1 / 百分比读数 四件',
    !!outButton && !!inButton && !!resetButton && !!readout);
  check('按钮都是 <button type=button> 且 aria-label 齐全',
    !!outButton && outButton.getAttribute('type') === 'button' && !!outButton.getAttribute('aria-label')
      && !!inButton && inButton.getAttribute('type') === 'button' && !!inButton.getAttribute('aria-label')
      && !!resetButton && resetButton.getAttribute('type') === 'button' && !!resetButton.getAttribute('aria-label'),
    [outButton && outButton.getAttribute('aria-label'), inButton && inButton.getAttribute('aria-label'),
      resetButton && resetButton.getAttribute('aria-label')].join(' / '));
  check('按钮文本为 − / + / 1:1',
    outButton.textContent === '\u2212' && inButton.textContent === '+' && resetButton.textContent === '1:1',
    [outButton.textContent, inButton.textContent, resetButton.textContent].join('|'));
  check('控件条有 role=group 与 aria-label（可被读屏识别）',
    bar.getAttribute('role') === 'group' && !!bar.getAttribute('aria-label'), bar.getAttribute('aria-label'));

  check('初始档位 100% 且读数为 "100%"',
    bar.getAttribute('data-image-zoom-state') === '100' && readout.textContent === '100%',
    readout.textContent);
  check('100% 时 − 置灰禁用、+ 可用',
    outButton.disabled === true && inButton.disabled === false);
  check('初始档位 100% 不写内联 transform（等价于原样）',
    lightbox.image.style.transform === undefined || lightbox.image.style.transform === '',
    JSON.stringify(lightbox.image.style));

  // 幂等：MutationObserver 抖动不得重复注入
  observer.trigger();
  observer.trigger();
  check('重复扫描幂等（控件条仍恰一个）',
    lightbox.root.querySelectorAll('[data-image-zoom-bar]').length === 1);

  // + / − / 1:1 行为
  dispatch(doc, win, inButton, 'click');
  check('点 + 升到 150% 且写入 scale(1.5)',
    readout.textContent === '150%' && lightbox.image.style.transform === 'scale(1.5)',
    readout.textContent + ' / ' + lightbox.image.style.transform);
  check('150% 时 − 恢复可用', outButton.disabled === false);
  check('transform-origin 为 center（缩放锚点不跑偏）',
    lightbox.image.style.transformOrigin === 'center center', lightbox.image.style.transformOrigin);

  dispatch(doc, win, outButton, 'click');
  check('点 − 退回 100% 且内联 transform 被清空（原样）',
    readout.textContent === '100%' && !lightbox.image.style.transform,
    readout.textContent + ' / ' + JSON.stringify(lightbox.image.style));
  dispatch(doc, win, outButton, 'click');
  check('100% 时点 − 无变化（已到下限）',
    readout.textContent === '100%' && outButton.disabled === true);

  for (let i = 0; i < 6; i += 1) { dispatch(doc, win, inButton, 'click'); }
  check('连点 + 到顶停在 800% 且 + 置灰禁用',
    readout.textContent === '800%' && inButton.disabled === true && lightbox.image.style.transform === 'scale(8)',
    readout.textContent + ' / ' + lightbox.image.style.transform);
  dispatch(doc, win, inButton, 'click');
  check('800% 时点 + 无变化（已到上限）', readout.textContent === '800%');

  dispatch(doc, win, resetButton, 'click');
  check('点 1:1 复位：读数 100% 且内联 transform 逐字还原',
    readout.textContent === '100%' && lightbox.image.style.transform === ''
      && lightbox.image.style.transformOrigin === '',
    JSON.stringify(lightbox.image.style));

  // 宿主重渲染把控件条摘掉：重新扫描必须挂回去（幂等、不新增）
  bar.parentNode.removeChild(bar);
  observer.trigger();
  check('控件条被宿主摘掉后重新挂回（仍只一个）',
    lightbox.root.querySelectorAll('[data-image-zoom-bar]').length === 1
      && lightbox.root.querySelector('[data-image-zoom-bar]') === bar);

  // 画廊原地换图：档位归位
  dispatch(doc, win, inButton, 'click');
  lightbox.image.setAttribute('src', 'data:image/png;base64,BBBB');
  observer.trigger();
  check('同一灯箱换图后档位归位 100%',
    readout.textContent === '100%' && !lightbox.image.style.transform,
    readout.textContent + ' / ' + JSON.stringify(lightbox.image.style));

  // Tab 可达性：宿主 Tab 陷阱（window 捕获）先跑，我们的桥（window 冒泡）后跑。
  // 先把档位推到 150%，此时 − 可用，焦点环 = [−, +, 1:1, 关闭]。
  dispatch(doc, win, inButton, 'click');
  const hostTrap = (event) => {
    if (event.key === 'Tab') { event.preventDefault(); lightbox.close.focus(); }
  };
  win.addEventListener('keydown', hostTrap, true);
  dispatch(doc, win, lightbox.close, 'keydown', { key: 'Tab', shiftKey: false });
  check('Tab 桥：宿主钉住关闭按钮后，焦点被送进控件条第一站（−）',
    doc.activeElement === outButton,
    doc.activeElement && (doc.activeElement.getAttribute('data-image-zoom-action') || doc.activeElement.textContent));
  dispatch(doc, win, doc.activeElement, 'keydown', { key: 'Tab', shiftKey: false });
  check('Tab 桥：环内继续前进到 +', doc.activeElement === inButton,
    doc.activeElement && doc.activeElement.getAttribute('data-image-zoom-action'));
  dispatch(doc, win, doc.activeElement, 'keydown', { key: 'Tab', shiftKey: true });
  check('Tab 桥：Shift+Tab 反向回退到 −', doc.activeElement === outButton,
    doc.activeElement && doc.activeElement.getAttribute('data-image-zoom-action'));
  dispatch(doc, win, doc.activeElement, 'keydown', { key: 'Tab', shiftKey: true });
  check('Tab 桥：环上始终留着宿主关闭按钮（反向可退出控件条）',
    doc.activeElement === lightbox.close, doc.activeElement && doc.activeElement.getAttribute('aria-label'));
  dispatch(doc, win, doc.activeElement, 'keydown', { key: 'Tab', shiftKey: false });
  check('Tab 桥：从关闭按钮正向回到 −（环闭合）', doc.activeElement === outButton,
    doc.activeElement && doc.activeElement.getAttribute('data-image-zoom-action'));
  win.removeEventListener('keydown', hostTrap, true);

  // 灯箱消失 → 清理
  dispatch(doc, win, inButton, 'click');
  doc.body.removeChild(lightbox.root);
  observer.trigger();
  check('灯箱消失即拆掉控件条并还原 img',
    bar.parentNode === null && lightbox.image.style.transform === ''
      && doc.querySelectorAll('[data-image-zoom-bar]').length === 0,
    lightbox.image.style.transform);

  // dispose 回收
  dispose();
  check('dispose 断开观察器', observer.observing === false);
  check('dispose 移除样式表', doc.querySelectorAll('style[id="dsh-image-zoom-style"]').length === 0);
  const second = makeHostLightbox(doc, 'data:image/png;base64,CCCC', true);
  doc.body.appendChild(second.root);
  observer.trigger();
  check('dispose 之后不再注入（宿主卸载即彻底停手）',
    second.root.querySelectorAll('[data-image-zoom-bar]').length === 0);
}

main().then(() => {
  const failed = results.filter((item) => !item.pass);
  for (const item of results) {
    console.log((item.pass ? '  ✅ ' : '  ❌ ') + item.name
      + (!item.pass && item.detail ? ' — ' + item.detail : ''));
  }
  console.log('-----------------------------------------');
  console.log((failed.length ? '❌ ' : '✅ ') + (results.length - failed.length) + '/' + results.length + ' 通过');
  process.exit(failed.length ? 1 : 0);
}).catch((error) => {
  console.error('❌ 桩件执行崩溃：' + (error && error.stack ? error.stack : String(error)));
  process.exit(1);
});
