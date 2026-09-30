// inject-core.cjs — 图片灯箱多级缩放的纯逻辑内核。
//
// 本文件是**唯一真相源**：lib/client.js 由 build_client.py 把本文件内联进去，
// 探针 verify_image_zoom.cjs 也直接 require 本文件，用打桩 DOM 做真实的运行时验证。
// 一份实现，两处使用，不存在「源码改了但 bundle 没跟上」的可能。
//
// 设计约束（为什么把逻辑切得这么细）：
//   * 档位、钳制、禁用判定、动作求值全部是**纯函数**：不碰真实 DOM，
//     因此可以在 Node 里用打桩对象做真实断言，而不是只做静态断言；
//   * 非法输入（NaN / -999 / "abc" / null）一律**钳制到合法档位**，
//     绝不返回 undefined —— 一个返回 undefined 的缩放器会把 style 写成
//     "scale(undefined)"，图片直接消失，属于灾难级降级；
//   * 灯箱定位只用 `[role="dialog"][aria-modal="true"]` + 其中唯一的 `img`：
//     宿主是 CSS module 哈希类名（生产包里是 `._backdrop_1hos8_1` 这种），
//     用类名锚定必然在下次构建后失效；
//   * 同一时刻全局只允许一个控件条：重复扫描（MutationObserver 抖动）不得
//     增加控件条数量，也不能重复挂载同一根节点。
'use strict';

/** 控件条根节点属性（样式选择器与幂等判定的锚点）。 */
var BAR_ATTR = 'data-image-zoom-bar';
/** 控件条样式表 id。 */
var STYLE_ID = 'dsh-image-zoom-style';
/** 动作按钮上的属性，值域见 ACTIONS。 */
var ACTION_ATTR = 'data-image-zoom-action';
/** 百分比读数节点上的属性。 */
var PERCENT_ATTR = 'data-image-zoom-percent';

/** 灯箱根节点选择器。只依赖 ARIA 语义，不依赖任何 CSS module 哈希类名。 */
var LIGHTBOX_SELECTOR = '[role="dialog"][aria-modal="true"]';

/**
 * 多级缩放档位（百分比）。唯一真相源，UI 与验证器都读它。
 * 100% 为下界（等价于原始大小），800% 为上界。
 */
var LEVELS = [100, 150, 200, 300, 400, 600, 800];
var MIN_PERCENT = LEVELS[0];
var MAX_PERCENT = LEVELS[LEVELS.length - 1];

/** 合法动作字面量。其余输入一律视为「无动作」。 */
var ACTIONS = ['in', 'out', 'reset'];

function isFiniteNumber(value) {
  return typeof value === 'number' && isFinite(value);
}

function indexOfLevel(percent) {
  for (var i = 0; i < LEVELS.length; i++) {
    if (LEVELS[i] === percent) { return i; }
  }
  return -1;
}

/**
 * 把任意输入钳制成 LEVELS 中的一项。
 *
 * 「钳制到合法档位或明确拒绝」中的**拒绝**在这里不适用：调用方是 UI 代码，
 * 拿不到可用档位时最安全的行为是退到 100%（原始大小），而不是抛异常把
 * 整个控件条打断。因此本函数**永远**返回一个合法档位，绝无 undefined。
 *
 * @param value - 任意值（数字、数字字符串、null、NaN、对象…）。
 * @returns {number} LEVELS 中的一项。
 */
function normalizePercent(value) {
  var numeric = typeof value === 'string' ? parseFloat(value) : value;
  // 非数字 / NaN 一律退到 100%（原始大小），而不是抛出打断整个控件条。
  if (typeof numeric !== 'number' || numeric !== numeric) { return MIN_PERCENT; }
  if (numeric <= MIN_PERCENT) { return MIN_PERCENT; }
  if (numeric >= MAX_PERCENT) { return MAX_PERCENT; }
  // 取最接近的档位；同距取低档（确定性，不依赖比较顺序）。
  var best = MIN_PERCENT;
  var bestGap = Infinity;
  for (var i = 0; i < LEVELS.length; i++) {
    var gap = Math.abs(LEVELS[i] - numeric);
    if (gap < bestGap) { bestGap = gap; best = LEVELS[i]; }
  }
  return best;
}

/**
 * 多级缩放的下一档：当前档位按 step 步进，越界即停在端点（钳制而非回绕）。
 * 非法 step（NaN / 非数字 / 0）视为不移动。
 * @returns {number} LEVELS 中的一项，永不 undefined。
 */
function zoomed(current, step) {
  var index = indexOfLevel(normalizePercent(current));
  var delta = isFiniteNumber(step) ? Math.trunc(step) : 0;
  var next = index + delta;
  if (next < 0) { next = 0; }
  if (next > LEVELS.length - 1) { next = LEVELS.length - 1; }
  return LEVELS[next];
}

/** 还能再放大（未到 800%）。 */
function canZoomIn(current) {
  return indexOfLevel(normalizePercent(current)) < LEVELS.length - 1;
}

/** 还能再缩小（未到 100%）。 */
function canZoomOut(current) {
  return indexOfLevel(normalizePercent(current)) > 0;
}

/**
 * 按钮禁用判定。
 * @param current - 当前档位（任意输入，先钳制）。
 * @param direction - 'in'（放大）| 'out'（缩小）。
 * @returns {boolean} true 表示该按钮应置灰禁用。
 */
function isDisabled(current, direction) {
  if (direction === 'in') { return !canZoomIn(current); }
  if (direction === 'out') { return !canZoomOut(current); }
  return true;
}

/**
 * 纯函数：当前档位 + 动作 -> 下一档位。未知动作不改变档位。
 * @returns {number} LEVELS 中的一项。
 */
function applyAction(current, action) {
  var percent = normalizePercent(current);
  if (action === 'in') { return zoomed(percent, 1); }
  if (action === 'out') { return zoomed(percent, -1); }
  if (action === 'reset') { return MIN_PERCENT; }
  return percent;
}

/** 读数文案：150 -> "150%"。 */
function label(percent) {
  return String(normalizePercent(percent)) + '%';
}

/** transform 值：150 -> "scale(1.5)"。 */
function transformFor(percent) {
  return 'scale(' + String(normalizePercent(percent) / 100) + ')';
}

/**
 * 纯函数：焦点环的下一站（Tab 循环）。
 * 宿主灯箱自带 Tab 陷阱（把焦点钉在关闭按钮上），控件条要能被 Tab 走到，
 * 就必须自己算环内下一站 —— 这段算术放在这里，好在 Node 里断言。
 * @param from - 当前所在环内下标（-1 表示不在环内）。
 * @param count - 环内可聚焦项总数。
 * @param shift - 是否 Shift+Tab（反向）。
 * @returns {number} 下一站下标；环为空时返回 -1。
 */
function nextFocusIndex(from, count, shift) {
  if (!isFiniteNumber(count) || count <= 0) { return -1; }
  var total = Math.trunc(count);
  var index = isFiniteNumber(from) ? Math.trunc(from) : -1;
  if (index < 0 || index >= total) { return shift ? total - 1 : 0; }
  var next = shift ? index - 1 : index + 1;
  if (next < 0) { next = total - 1; }
  if (next >= total) { next = 0; }
  return next;
}

//#region DOM 增强（缩放写入 + 灯箱定位 + 生命周期）
// 这一段不碰 React、不碰宿主内部状态：只做 img.style 写入与节点增删，
// 因此宿主任何一次重渲染都不会因为本插件而崩。

/** 原始内联样式的保存键（记在 img 节点上，重置时逐字还原）。 */
var ORIGINAL_KEY = '__dshImageZoomOriginal';

/** 第一次碰这个 img 之前，把它原有的内联 transform 记下来。 */
function captureOriginal(image) {
  if (!Object.prototype.hasOwnProperty.call(image, ORIGINAL_KEY)) {
    image[ORIGINAL_KEY] = {
      transform: image.style.transform === undefined ? '' : image.style.transform,
      transformOrigin: image.style.transformOrigin === undefined ? '' : image.style.transformOrigin,
    };
  }
  return image[ORIGINAL_KEY];
}

/**
 * 缩放写入：transform: scale(n) + transform-origin: center。
 *
 * 为什么用 transform 而不是改 width/height：宿主 .image 的
 * `max-width: min(100%,1600px)` / `max-height: calc(100vh - 80px)`
 * 是布局约束，改尺寸会和它们直接冲突；transform 只影响绘制，不参与布局，
 * 因此与宿主样式零冲突，重置也是纯还原。
 *
 * 档位 100% 等价于「原样」：此时不写 `scale(1)`，而是把内联样式还原成
 * 插件碰它之前的样子 —— 于是「− 退到 100%」与「点 1:1」是同一种干净状态。
 *
 * 已知边界（如实记录）：transform 不改变布局盒，所以高倍缩放后可视区域
 * 只覆盖视口正中一块，且宿主 .backdrop 没有 overflow 滚动条，无法拖动查看
 * 边角。本插件不越权去改宿主元素的 overflow（那会干扰 mask 的点击关闭）。
 *
 * @param image - 目标 img（可为 null，调用方可能还没拿到灯箱）。
 * @param percent - 任意档位输入。
 * @returns {number} 实际写入的合法档位。
 */
function applyZoom(image, percent) {
  var resolved = normalizePercent(percent);
  if (!image || !image.style) { return resolved; }
  captureOriginal(image);
  if (resolved === MIN_PERCENT) { return resetZoom(image); }
  image.style.transformOrigin = 'center center';
  image.style.transform = transformFor(resolved);
  return resolved;
}

/**
 * 重置：把 img 的内联 transform 逐字还原成插件碰它之前的样子。
 * @returns {number} MIN_PERCENT（100）。
 */
function resetZoom(image) {
  if (image && image.style) {
    var original = Object.prototype.hasOwnProperty.call(image, ORIGINAL_KEY)
      ? image[ORIGINAL_KEY] : null;
    image.style.transform = original ? original.transform : '';
    image.style.transformOrigin = original ? original.transformOrigin : '';
    if (original) {
      try { delete image[ORIGINAL_KEY]; } catch (err) { image[ORIGINAL_KEY] = undefined; }
    }
  }
  return MIN_PERCENT;
}

/**
 * 定位灯箱：`[role="dialog"][aria-modal="true"]` 中**恰好一张 img** 的那个。
 *
 * 为什么要「恰好一张」这个约束：设置面板、风险确认弹窗同样带
 * role=dialog + aria-modal，用它们做锚点会给无关弹窗挂上缩放条。
 * 宿主灯箱（ui-primitives 的 ImageLightbox）内部只有 backdrop / mask / img /
 * close 四个节点，img 唯一；而控件条本身只放文本按钮、**不含 img**，
 * 因此不会破坏这条不变式。
 *
 * mask（[aria-hidden="true"]）只作为**优先**信号：同时有多个候选时优先选中
 * 带 mask 的那个（灯箱特征），但即使宿主去掉了该属性也仍然能命中。
 * @returns {{root: Element, image: Element}|null}
 */
function findLightbox(doc) {
  if (!doc || typeof doc.querySelectorAll !== 'function') { return null; }
  var dialogs = doc.querySelectorAll(LIGHTBOX_SELECTOR);
  if (!dialogs) { return null; }
  var fallback = null;
  for (var i = 0; i < dialogs.length; i++) {
    var root = dialogs[i];
    if (!root || typeof root.querySelectorAll !== 'function') { continue; }
    var images = root.querySelectorAll('img');
    if (!images || images.length !== 1) { continue; }
    var candidate = { root: root, image: images[0] };
    if (typeof root.querySelector === 'function' && root.querySelector('[aria-hidden="true"]')) {
      return candidate;
    }
    if (!fallback) { fallback = candidate; }
  }
  return fallback;
}

function srcOf(image) {
  if (!image || typeof image.getAttribute !== 'function') { return ''; }
  var value = image.getAttribute('src');
  return value === null || value === undefined ? '' : String(value);
}

function detachNode(node) {
  if (!node) { return; }
  if (node.parentNode && typeof node.parentNode.removeChild === 'function') {
    node.parentNode.removeChild(node);
    return;
  }
  if (typeof node.remove === 'function') { node.remove(); }
}

/**
 * 灯箱生命周期控制器：发现即挂控件条，消失即拆并还原。
 *
 * 纯逻辑：DOM 与造条函数都由 options 注入，因此可以在 Node 里用打桩对象
 * 真实跑一遍「出现 -> 注入 -> 缩放 -> 消失 -> 清理」。
 *
 * @param options.document - 观察的文档。
 * @param options.makeBar - () => {bar, setState(percent)}；由 client 半体提供。
 * @param options.MutationObserver - 观察器构造器（可注入，便于测试）。
 */
function createController(options) {
  var doc = options.document;
  var makeBar = options.makeBar;
  var observer = null;
  var current = null;
  var stats = { attached: false, created: 0, removed: 0, reattached: 0, rescans: 0, percent: MIN_PERCENT };

  function detach() {
    if (!current) { return; }
    resetZoom(current.image);
    detachNode(current.bar);
    current = null;
    stats.attached = false;
    stats.percent = MIN_PERCENT;
  }

  function attach(root, bar) {
    if (bar.parentNode !== root) {
      detachNode(bar);
      if (typeof root.appendChild === 'function') { root.appendChild(bar); }
    }
  }

  function scan() {
    stats.rescans++;
    var found = findLightbox(doc);
    if (!found) {
      if (current) { detach(); stats.removed++; }
      return stats;
    }
    // 宿主重渲染可能换掉整个 portal 子树（root / img 换新节点）——一律重建，
    // 避免把缩放写到一个已经脱离文档的旧 img 上。
    if (current && (current.root !== found.root || current.image !== found.image)) {
      detach();
    }
    if (current && current.src !== srcOf(found.image)) {
      // 同一盏灯箱原地换了图片（画廊下一张）：先把旧图还原，档位归位，
      // 绝不把上一张的缩放套到新图上。
      resetZoom(current.image);
      current.image = found.image;
      current.src = srcOf(found.image);
      setPercent(MIN_PERCENT);
      attach(found.root, current.bar);
      return stats;
    }
    if (!current) {
      var handle = makeBar();
      if (!handle || !handle.bar) { return stats; }
      current = {
        root: found.root,
        image: found.image,
        bar: handle.bar,
        setState: handle.setState,
        percent: MIN_PERCENT,
        src: srcOf(found.image),
      };
      attach(found.root, current.bar);
      current.setState(MIN_PERCENT);
      stats.attached = true;
      stats.created++;
      stats.percent = MIN_PERCENT;
      return stats;
    }
    if (current.bar.parentNode !== current.root) {
      // 宿主把控件条从 DOM 里摘掉了（React 重渲染/换 portal），重新挂上并保留档位。
      attach(current.root, current.bar);
      current.setState(current.percent);
      stats.reattached++;
    }
    return stats;
  }

  function start() {
    scan();
    var Observer = options.MutationObserver
      || (typeof MutationObserver !== 'undefined' ? MutationObserver : null);
    if (!Observer || typeof doc === 'undefined' || !doc || !doc.body) { return stats; }
    observer = new Observer(function () { scan(); });
    observer.observe(doc.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });
    return stats;
  }

  function setPercent(percent) {
    var resolved = normalizePercent(percent);
    if (!current) { return resolved; }
    applyZoom(current.image, resolved);
    current.percent = resolved;
    if (typeof current.setState === 'function') { current.setState(resolved); }
    stats.percent = resolved;
    return resolved;
  }

  function dispose() {
    if (observer && typeof observer.disconnect === 'function') { observer.disconnect(); }
    observer = null;
    detach();
    stats.attached = false;
    stats.percent = MIN_PERCENT;
  }

  return {
    scan: scan,
    start: start,
    dispose: dispose,
    setPercent: setPercent,
    current: function () { return current; },
    stats: function () { return stats; },
  };
}
//#endregion DOM 增强

module.exports = {
  ACTIONS: ACTIONS,
  ACTION_ATTR: ACTION_ATTR,
  BAR_ATTR: BAR_ATTR,
  LEVELS: LEVELS,
  LIGHTBOX_SELECTOR: LIGHTBOX_SELECTOR,
  MAX_PERCENT: MAX_PERCENT,
  MIN_PERCENT: MIN_PERCENT,
  PERCENT_ATTR: PERCENT_ATTR,
  STYLE_ID: STYLE_ID,
  applyAction: applyAction,
  applyZoom: applyZoom,
  canZoomIn: canZoomIn,
  canZoomOut: canZoomOut,
  createController: createController,
  findLightbox: findLightbox,
  isDisabled: isDisabled,
  label: label,
  nextFocusIndex: nextFocusIndex,
  normalizePercent: normalizePercent,
  resetZoom: resetZoom,
  transformFor: transformFor,
  zoomed: zoomed,
};
