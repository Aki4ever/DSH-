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
 *   2) apply 不抛异常，且注册进 conversation.input.dock、order=20；
 *   3) 渲染文本含真实时段（高峰时段/空闲时段）与倒计时；
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
const mod = loadBundle(true, true);
check('模块可加载并导出 apply', !!(mod && typeof mod.apply === 'function'));

const fakeCtx = {
  slots: {
    inject(name, fn) { fakeCtx.__slotName = name; fn(); },
    register(props, Component) { registered = { props, Component }; },
  },
};

let applyErr = null;
try {
  const r = mod.apply(fakeCtx);
  if (typeof r === 'function') { r(); }  // dispose 也必须可调用
} catch (err) { applyErr = err; }
check('apply 不抛异常', applyErr === null, applyErr && applyErr.message);
check('注册到 conversation.input.dock', fakeCtx.__slotName === 'conversation.input.dock', fakeCtx.__slotName);
check('插槽 order = 20（Todo 0 / Goal 10 之后）', registered && registered.props.order === 20,
  registered && registered.props.order);

if (registered && registered.Component) {
  const node = registered.Component({});
  const text = node && node.children ? String(node.children[0]) : '';
  check('渲染文本含真实时段', /高峰时段|空闲时段/.test(text), text);
  check('渲染文本含下次切换倒计时', /距切换/.test(text), text);
  check('额度栏目如实显示「未接入」且不含数字额度', /额度：未接入/.test(text) && !/额度：[\d¥]/.test(text), text);
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
