#!/usr/bin/env node
/**
 * ==============================================================================
 * 重启按钮「点击可见性」桩件实测  verify_click_paths.cjs
 * ==============================================================================
 * 为什么单独一个文件（2026-10-02 第二次事故的产物，必须留痕）：
 *   事故现象：用户点重启按钮「没有任何效果」。
 *   根因：官方命令通道（`ctx.remote.commands.execute`）失败时**不抛异常**，
 *         而是正常返回一个结果对象：
 *           · 成功          → `{ ok:true,  value:{ result:{ kind, text } } }`
 *           · 被拒/超时     → `{ ok:false, error:{ code, message } }`
 *           · 命令名不认识  → `{ ok:true,  value: undefined }`
 *         旧实现只写了 `.catch(...)`，于是后两种"其实出事了"的返回值被当成成功，
 *         **一点提示都不给** —— 在用户眼里，这和"按钮根本没接线"完全一样。
 *
 * 因此本文件的判定口径只有一句话：
 *   **六种可能的结果，每一种都必须产生一个用户看得见的回执/报错，且都不许抛出去。**
 * 只测"成功路径能跑"是没用的 —— 事故恰恰发生在失败路径上。
 *
 * 用法：node skill-pool/plugins/dsh-plugin-restart/verify_click_paths.cjs
 * 退出码：0 全部通过 / 1 有场景没给出可见结果或抛错 / 2 依赖缺失（先跑 build_client.py）
 * ==============================================================================
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const HERE = __dirname;
const BUNDLE = path.join(HERE, 'lib', 'client.js');
if (!fs.existsSync(BUNDLE)) {
  console.error('❌ 找不到 bundle：' + BUNDLE + '（先跑 python3 build_client.py）');
  process.exit(2);
}

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name + (extra ? ' · ' + extra : '')); }
  else { fail++; console.log('  ❌ ' + name + (extra ? ' · ' + extra : '')); }
}

const CONFIRM_MESSAGE_EXPECT = '确定要重启';
const src = fs.readFileSync(BUNDLE, 'utf8');
let loaded = null;
let alerts = [];
let confirms = 0;
let confirmAnswer = true;

const ReactStub = {
  createElement(type, props, ...children) { return { type, props, children }; },
  useState(init) { return [typeof init === 'function' ? init() : init, () => {}]; },
  useEffect() {},
};

// 与浏览器同构的最小环境：window.__ModuleLoader__ + window.confirm/alert + React seed
const sandbox = {};
sandbox.window = sandbox;
sandbox.document = {};
sandbox.console = console;
sandbox.setTimeout = setTimeout;
sandbox.setInterval = () => 0;
sandbox.clearInterval = () => {};
sandbox.confirm = (msg) => { confirms++; if (!String(msg).includes(CONFIRM_MESSAGE_EXPECT)) throw new Error('确认文案不对：' + msg); return confirmAnswer; };
sandbox.alert = (msg) => { alerts.push(String(msg)); };
sandbox.__ModuleLoader__ = {
  load({ id, factory }) {
    loaded = factory((name) => (name === 'react' ? ReactStub : require(name)));
    loaded.__id = id;
  },
};
sandbox.require = (name) => (name === 'react' ? ReactStub : require(name));

vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: BUNDLE });

console.log('🧪 重启按钮 · 点击可见性桩件实测');
console.log('-----------------------------------------');
check('bundle 能被装载并注册模块 id', loaded !== null && loaded.__id === 'dsh-plugin-restart', loaded && loaded.__id);

/** 用给定 exec 行为装配一个插件实例，并返回按钮的 onClick。 */
function mount(exec) {
  const regs = [];
  const ctx = {
    slots: {
      inject(name, fn) { return fn(); },
      register(reg, Component) { regs.push({ reg, Component }); return () => {}; },
    },
    remote: exec === undefined ? undefined : { commands: { execute: exec } },
    effect: () => () => {},
  };
  loaded.apply(ctx);
  const first = regs[0];
  return { regs, injected: first && first.reg && first.reg.inject ? first.reg.inject('session-abc') : null };
}

const scenarios = [
  {
    name: '① 正常成功 → 必须给出「已排定重启」回执',
    exec: () => Promise.resolve({ ok: true, value: { result: { kind: 'success', text: '已排定重启：应用将先退出，再自动重新打开。' } } }),
    expect: (a) => a.length === 1 && /已排定重启/.test(a[0]),
  },
  {
    name: '② RPC 返回 ok:false → 必须报「宿主拒绝执行」',
    exec: () => Promise.resolve({ ok: false, error: { code: 'ENOCOMMAND', message: 'unknown command' } }),
    expect: (a) => a.length === 1 && /宿主拒绝执行/.test(a[0]) && /ENOCOMMAND/.test(a[0]),
  },
  {
    name: '③ 命令名不认识（value 为空）→ 必须报「不认识命令」',
    exec: () => Promise.resolve({ ok: true, value: undefined }),
    expect: (a) => a.length === 1 && /不认识命令/.test(a[0]),
  },
  {
    name: '④ 同步抛错 → 必须接住并报「调用命令通道时抛错」',
    exec: () => { throw new TypeError('sync boom'); },
    expect: (a) => a.length === 1 && /同步|抛错/.test(a[0]),
  },
  {
    name: '⑤ 异步拒绝 → 必须报错而不是静默',
    exec: () => Promise.reject(new Error('通道断了')),
    expect: (a) => a.length === 1 && /通道断了/.test(a[0]),
  },
  {
    name: '⑥ 宿主没给 remote.commands → 必须报「宿主未提供」并给排查提示',
    exec: undefined,
    expect: (a) => a.length === 1 && /宿主未提供 remote\.commands\.execute/.test(a[0]) && /restart-plugin-boot/.test(a[0]),
  },
];

(async () => {
  let allVisible = true;
  let anyThrow = false;
  for (const sc of scenarios) {
    alerts = [];
    confirms = 0;
    confirmAnswer = true;
    const { regs, injected } = mount(sc.exec);
    check(sc.name.split('→')[0].trim() + '：两个席位都注册', regs.length === 2, String(regs.length));
    if (!injected || typeof injected.onClick !== 'function') {
      check(sc.name + '（onClick 可取到）', false, 'inject 回调没给出 onClick');
      allVisible = false;
      continue;
    }
    try {
      await injected.onClick();
    } catch (err) {
      anyThrow = true;
      check(sc.name + '（不许把异常抛给宿主）', false, err && err.message);
      continue;
    }
    const visible = sc.expect(alerts);
    if (!visible) allVisible = false;
    check(sc.name, visible, alerts.length ? alerts[0].replace(/\n+/g, ' | ') : '(没有任何回执 —— 这就是"点了没反应")');
  }

  // 反向用例：用户点"取消"时**不该**打扰（否则每次误触都弹窗）
  alerts = [];
  confirms = 0;
  confirmAnswer = false;
  const { injected: inj } = mount(() => Promise.resolve({ ok: true, value: { result: { kind: 'success' } } }));
  await inj.onClick();
  check('反向用例：用户取消 → 不弹任何提示', alerts.length === 0, alerts.join('|') || '(无)');
  // 只点了一次，所以只该确认一次；确认文案由沙箱里的 confirm 桩**当场校验**（文案不符会抛错）
  check('反向用例：只确认一次（没重复弹确认框）', confirms === 1, '确认次数 ' + confirms);

  console.log('-----------------------------------------');
  check('六种结果**全部**有用户可见回执（不许有任何一种静默）', allVisible);
  check('六种结果**全部**不把异常抛给宿主', !anyThrow);
  console.log('-----------------------------------------');
  console.log(`共 ${pass + fail} 项 · ${fail === 0 ? '🎉 全部通过' : `❌ ${fail} 项未过`}`);
  process.exit(fail === 0 ? 0 : 1);
})();
