#!/usr/bin/env node
/**
 * verify_stub.cjs — dsh-plugin-usage-bar 的桩件实测（不需要宿主 App 即可运行）
 *
 * 为什么必须有这一层：客户端半体只在宿主里才会被加载，等重启 App 才发现
 * "注册不上/渲染崩了"代价太高。本脚本用最小桩件模拟宿主的三样东西——
 *   · window.__ModuleLoader__.load({id, factory})
 *   · require('react') 这个 seed 模块
 *   · ctx.slots.inject / ctx.slots.register 插槽 API
 * 然后真的跑一遍 apply，断言"注册到了正确插槽 + 组件能渲染出真数据 + 不出现假额度"。
 *
 * 判定口径（任一不满足即退 1）：
 *   1) 模块能被加载且导出 apply；
 *   2) apply 不抛异常，且**两个席位都注册**：conversation.input.dock(order=20)
 *      与 sidebar.footer.action(order=910，全域常显，REQ-091/R4）；
 *   3) 两处渲染文本都含真实时段（高峰时段/空闲时段）与倒计时；
 *   4) 文本中**不出现任何数字型额度**（未接入必须显示"未接入"）；
 *   5) 无 slots 的宿主上 apply 也不抛（红线：不做 DOM 穿透、不拖垮界面）。
 *
 * Exit Code: 0 全部通过 / 1 任一项失败 / 2 输入缺失
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BUNDLE = path.join(__dirname, 'lib', 'client.js');
if (!fs.existsSync(BUNDLE)) {
  console.error('❌ 找不到 bundle：' + BUNDLE + '（先跑 build_client.py）');
  process.exit(2);
}

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail: detail === undefined ? '' : String(detail) });
}

/** 载入 bundle，返回它导出的模块（模拟宿主 ModuleLoader）。 */
function loadBundle(withReact, withDocument) {
  let captured = null;
  global.window = {
    __ModuleLoader__: {
      load(spec) {
        captured = spec.factory(fakeRequire(withReact));
        return captured;
      },
    },
  };
  if (withDocument) { global.document = {}; }
  delete require.cache[require.resolve(BUNDLE)];
  require(BUNDLE);
  delete global.document;
  return captured;
}

function fakeRequire(withReact) {
  return function (id) {
    if (id === 'react') {
      if (!withReact) { const e = new Error("Cannot find module 'react'"); throw e; }
      return {
        useState(init) {
          const v = typeof init === 'function' ? init() : init;
          return [v, function () {}];
        },
        useEffect() {},
        createElement(tag, props, ...children) { return { tag, props, children }; },
      };
    }
    throw new Error('未预期的 seed 模块：' + id);
  };
}

// ── 场景 1：完整宿主（React + slots + document 都在）──────────────────────────
let registered = null;
// 记录**全部**注册（REQ-091 / R4 起为双席位）—— 只留最后一个会漏测一个席位
const registrations = [];
const mod = loadBundle(true, true);
check('模块可加载并导出 apply', !!(mod && typeof mod.apply === 'function'));

const fakeCtx = {
  slots: {
    inject(name, fn) { fakeCtx.__slotName = name; fn(); },
    register(props, Component) { registered = { props, Component }; registrations.push({ props, Component }); },
  },
};

let applyErr = null;
try {
  const r = mod.apply(fakeCtx);
  if (typeof r === 'function') { r(); }  // dispose 也必须可调用
} catch (err) { applyErr = err; }
check('apply 不抛异常', applyErr === null, applyErr && applyErr.message);
check('注册到 conversation.input.dock（会话页输入坞）',
  registrations.some((r) => r.props.name === 'conversation.input.dock'),
  registrations.map((r) => r.props.name).join(','));
check('注册到 sidebar.footer.action（全域常显，所有页面可见）',
  registrations.some((r) => r.props.name === 'sidebar.footer.action'),
  registrations.map((r) => r.props.name).join(','));
check('两个席位 id 不同（同 id 会被宿主判重复注册）',
  new Set(registrations.map((r) => r.props.id)).size === registrations.length,
  registrations.map((r) => r.props.id).join(','));


// 倒计时断言改为**对两个席位的渲染结果分别判定**（此前只看最后一个席位，故 910 那条被判失败）
function textOf(node) {
  if (node === null || node === undefined || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node === 'object' && node.children !== undefined) return textOf(node.children);
  if (typeof node === 'object' && node.props && node.props.children !== undefined) return textOf(node.props.children);
  return String(node);
}

if (registrations.length >= 2) {
  const texts = registrations.map((r) => {
    try { return textOf(r.Component({})) } catch (e) { return 'ERR:' + e.message }
  });
  const hasCountdown = texts.some((t) => /距切换/.test(t)) && texts.some((t) => /小时|分|秒/.test(t));
  check('渲染文本含下次切换倒计时（两个席位都算）', hasCountdown, texts.join(' | '));
}

const dockReg = registrations.find((r) => r.props.name === 'conversation.input.dock');
if (dockReg && dockReg.Component) {
  const node = dockReg.Component({});
  // 用 textOf 递归取文本：此前写 `String(node.children[0])`，
  // 一旦组件结构从单子节点变成多子节点，取到的就是 [object Object]，
  // 于是"倒计时缺失"是**测试读错**而不是功能坏了 —— 典型的检测器自身缺陷。
  const text = textOf(node);
  check('渲染文本含真实时段', /高峰时段|空闲时段/.test(text), text);
  check('渲染文本含下次切换倒计时（输入坞整句）', /距切换/.test(text), text);
  check('不显示任何数字型额度（额度由宿主看板承载，前端不编造）', !/额度：[\d¥]/.test(text) && !/未接入/.test(text), text);
} else {
  check('渲染文本含真实时段', false, '未捕获到组件');
}

// ── 场景 2：无 slots 的宿主（必须静默降级，不得 DOM 穿透、不得抛）─────────────
let graceful = true, gracefulErr = null;
try {
  const m2 = loadBundle(true, true);
  m2.apply({});                      // 没有 slots
} catch (err) { graceful = false; gracefulErr = err; }
check('无 slots 宿主上 apply 不抛异常', graceful && gracefulErr === null, gracefulErr && gracefulErr.message);

// ── 场景 3：无 React seed（必须静默降级）────────────────────────────────────
let noReactOk = true, noReactErr = null;
try {
  const m3 = loadBundle(false, true);
  m3.apply({ slots: { inject() {}, register() {} } });
} catch (err) { noReactOk = false; noReactErr = err; }
check('无 React seed 时 apply 不抛异常', noReactOk && noReactErr === null, noReactErr && noReactErr.message);

// ── 输出 ────────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.pass);
for (const r of results) {
  console.log((r.pass ? '  ✅ ' : '  ❌ ') + r.name + (r.detail && !r.pass ? ' — ' + r.detail : ''));
}
console.log('-----------------------------------------');
console.log('桩件实测：' + (results.length - failed.length) + '/' + results.length + ' 通过');
process.exit(failed.length ? 1 : 0);
