// harness.cjs — 用 DOM 打桩对 inject-core 做**运行时**验证（不是静态断言）。
// 退出码 0 全过 / 1 有断言失败 / 2 内核不可读。
'use strict';
const path = require('path');
const CORE_PATH = process.argv[2];
const BUNDLE_PATH = process.argv[3];
if (!CORE_PATH) { console.error('缺少内核路径'); process.exit(2); }
let core;
try { core = require(path.resolve(CORE_PATH)); }
catch (err) { console.error('内核不可读: ' + err.message); process.exit(2); }

class El {
  constructor(attrs) {
    this.attrs = Object.assign({}, attrs || {});
    this.children = [];
    this.parentNode = null;
    this.listeners = {};
    this.clicked = 0;
    this.classList = { add() {}, remove() {} };
  }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) { this.children.splice(i, 1); child.parentNode = null; }
    return child;
  }
  querySelector(selector) {
    const name = selector.replace(/^\[|\]$/g, '');
    for (const child of this.children) {
      if (Object.prototype.hasOwnProperty.call(child.attrs, name)) { return child; }
    }
    return null;
  }
  scrollIntoView() {}
  click() { this.clicked += 1; }
}

class Doc extends El {
  constructor() {
    super({});
    this._nodes = {};
    this.body = new El({});
    this.head = new El({});
  }
  setNodes(selector, nodes) { this._nodes[selector] = nodes; }
  querySelectorAll(selector) {
    if (Object.prototype.hasOwnProperty.call(this._nodes, selector)) { return this._nodes[selector]; }
    return [];
  }
}

const results = [];
function check(name, pass, detail) { results.push({ name, pass: !!pass, detail: String(detail) }); }

// ── A. 纯函数注入：同容器同插件 id 只允许一个按钮 ─────────────────────────────
const container = new El({ 'data-plugin-inventory': 'true' });
const e1 = new El({ 'data-plugin-id': 'alpha' });
const e2 = new El({ 'data-plugin-id': 'beta' });
const e3 = new El({ 'data-plugin-id': 'alpha' });   // 同容器重复 id
const e4 = new El({});                              // 无 id
let seq = 0;
const makeButton = (pluginId) => new El({ 'data-control-jump': pluginId, 'data-seq': String(++seq) });
const items = [
  { element: e1, container, containerIndex: 0 },
  { element: e2, container, containerIndex: 0 },
  { element: e3, container, containerIndex: 0 },
  { element: e4, container, containerIndex: 0 },
];
const first = core.applyButtons(items, makeButton);
check('A1 首次注入按钮数=2', first.created === 2, 'created=' + first.created);
check('A2 重复 id 被计为 duplicates=1', first.duplicates === 1, 'duplicates=' + first.duplicates);
check('A3 无 id 条目被跳过且不注入', first.skippedNoId === 1 && e4.children.length === 0,
  'skippedNoId=' + first.skippedNoId + ' children=' + e4.children.length);
check('A4 每 (容器,插件id) 恰一个按钮', e1.children.length === 1 && e2.children.length === 1 && e3.children.length === 0,
  'alpha=' + e1.children.length + ' beta=' + e2.children.length + ' dup=' + e3.children.length);
check('A5 按钮属性与 id 逐字一致', e1.children[0].getAttribute('data-control-jump') === 'alpha',
  String(e1.children[0].getAttribute('data-control-jump')));

// ── B. 幂等：重复扫描不得增加按钮 ─────────────────────────────────────────────
const second = core.applyButtons(items, makeButton);
check('B1 二次扫描新增=0（幂等）', second.created === 0, 'created=' + second.created);
check('B2 二次扫描识别已存在=2', second.skippedExisting === 2, 'skippedExisting=' + second.skippedExisting);
check('B3 按钮总数仍为 2', e1.children.length + e2.children.length + e3.children.length === 2,
  'total=' + (e1.children.length + e2.children.length + e3.children.length));

// ── C. 多容器隔离：同一插件在不同容器各有一个按钮 ─────────────────────────────
const c2 = new El({ 'data-dsh-market-root': 'true' });
const m1 = new El({ 'data-plugin-id': 'alpha' });
const third = core.applyButtons([{ element: m1, container: c2, containerIndex: 1 }], makeButton);
check('C1 另一容器可再注入一个 alpha', third.created === 1, 'created=' + third.created);
check('C2 跨容器互不干扰（alpha 共 2 个按钮）', e1.children.length === 1 && m1.children.length === 1,
  'inventory=' + e1.children.length + ' market=' + m1.children.length);

// ── D. 无 id 时绝不注入（宁可不显示，也不显示点了没用的按钮） ──────────────────
const orphan = new El({});
const d = core.applyButtons([{ element: orphan, container, containerIndex: 0 }], makeButton);
check('D1 无 id 条目 created=0', d.created === 0 && orphan.children.length === 0,
  'created=' + d.created);

// ── E. 重复 id 但 URL 不同（模拟同名不同版本）仍去重 ───────────────────────────
const same = core.applyButtons(
  [{ element: new El({ 'data-plugin-id': 'x' }), container, containerIndex: 0 },
   { element: new El({ 'data-plugin-id': 'x' }), container, containerIndex: 0 }],
  makeButton);
check('E1 同容器同名必然去重', same.created === 1 && same.duplicates === 1,
  'created=' + same.created + ' dup=' + same.duplicates);

// ── F. resolvePluginId 的三级回退 ─────────────────────────────────────────────
const carrier = new El({ 'data-plugin-id': 'from-descendant' });
const wrapper = new El({});
wrapper.children.push(carrier);
check('F1 从后代节点解析 id', core.resolvePluginId(wrapper) === 'from-descendant', core.resolvePluginId(wrapper));
check('F2 无任何载体时返回空串', core.resolvePluginId(new El({})) === '', JSON.stringify(core.resolvePluginId(new El({}))));

// ── G. bundle 与内核一致性（内联不得漂移） ───────────────────────────────────
if (BUNDLE_PATH) {
  const fs = require('fs');
  const bundle = fs.readFileSync(path.resolve(BUNDLE_PATH), 'utf8');
  check('G1 bundle 注册模块 id 正确',
    bundle.includes('__ModuleLoader__.load({ id: "dsh-plugin-control-jump"'),
    '含 load 注册');
  check('G2 bundle 内联了内核的 applyButtons',
    bundle.includes('function applyButtons(items, makeButton)'),
    '含 applyButtons 定义');
  check('G3 bundle 暴露 apply(ctx) 且声明 inject',
    bundle.includes('async apply(ctx)') && bundle.includes('inject: []'),
    'apply/inject 齐备');
  check('G4 bundle 不含外部资源引用',
    !/src\s*=\s*["']?http|href\s*=\s*["']?http|<link[\s>/]/.test(bundle),
    '零外链');
}

const failed = results.filter((r) => !r.pass);
process.stdout.write(JSON.stringify({ success: failed.length === 0, checks: results }, null, 2) + '\n');
process.exit(failed.length === 0 ? 0 : 1);
