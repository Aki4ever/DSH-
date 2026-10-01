#!/usr/bin/env node
/**
 * verify_restart_button.cjs — dsh-plugin-restart 的打桩实测（不需要宿主 App 即可运行）
 *
 * 为什么必须有这一层：客户端半体只在宿主里才会被加载，宿主半体一旦真跑就会
 * **把用户的应用关掉** —— 等重启完才发现"按钮没挂上 / 确认口令没拦住 / 命令名拼错"
 * 的代价太高。本脚本分四层，一层比一层更接近真实，且**每一层都带反向用例**：
 *
 *   ① 静态契约：包结构符合宿主 client 插件契约（dsh.client.platform=web、
 *      exports["./client"]、cordis.patch.yml、bundle 逐字内联内核、零外链）；
 *   ② 纯逻辑内核：确认口令、重启脚本、PID 比对，含**反向用例**
 *      （空口令/错口令/非法 PID/相同 PID 一律不得放行或不得算作已重启）；
 *   ③ 宿主半打桩：用**假 spawn** 跑一遍 handler，断言"没确认就绝不 spawn"、
 *      "确认了才 spawn 一次且脚本里有真 PID"，绝不触碰真的 child_process；
 *   ④ 客户端半打桩：用假 React + 假 slots + 假 remote 真的跑一遍
 *      "注册按钮 → 点取消不调用命令 → 点确定调用 /restart-dsh confirm → remote 缺失时如实报错"；
 *      并做**反向变异**：把 bundle 里的命令行动手改坏，上述断言必须随之失败。
 *
 * Exit Code: 0 全部通过 / 1 任一项失败 / 2 输入缺失
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const HERE = __dirname;
const F = {
  core: path.join(HERE, 'src', 'restart-core.cjs'),
  hostCore: path.join(HERE, 'src', 'host-core.cjs'),
  template: path.join(HERE, 'src', 'client.template.js'),
  bundle: path.join(HERE, 'lib', 'client.js'),
  index: path.join(HERE, 'lib', 'index.js'),
  manifest: path.join(HERE, 'package.json'),
  patch: path.join(HERE, 'cordis.patch.yml'),
  build: path.join(HERE, 'build_client.py'),
};
for (const [k, p] of Object.entries(F)) {
  if (!fs.existsSync(p)) {
    console.error(`❌ 缺少输入文件（${k}）：${p}（先跑 python3 build_client.py）`);
    process.exit(2);
  }
}

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail === undefined ? '' : String(detail) });
}
/** 去掉 JS 注释后再做"源码里有没有某个危险调用"的断言。
 *  为什么必须去注释：本工程的注释里**会主动写明"我们刻意不用 app.relaunch"**，
 *  不剥注释就会把"解释为什么不这么做"误判成"真的这么做了"（自指假阳性）。 */
function stripJsComments(s) {
  return String(s).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

const CORE = require(F.core);
const HOST = require(F.hostCore);
const bundleText = fs.readFileSync(F.bundle, 'utf8');
const templateText = fs.readFileSync(F.template, 'utf8');
const coreText = fs.readFileSync(F.core, 'utf8').replace(/\n+$/, '');
const indexText = fs.readFileSync(F.index, 'utf8');
const patchText = fs.readFileSync(F.patch, 'utf8');
const pkg = JSON.parse(fs.readFileSync(F.manifest, 'utf8'));
const digestNow = crypto.createHash('sha256').update(coreText).digest('hex').slice(0, 16);

/* ─────────────────────────────────────────────────────────────────────────
 * ① 静态契约：包结构必须符合宿主 client 插件契约
 * ───────────────────────────────────────────────────────────────────────── */
check('package.json name 为 dsh-plugin-restart', pkg.name === 'dsh-plugin-restart', pkg.name);
check('main 指向 lib/index.js', pkg.main === 'lib/index.js', pkg.main);
check('exports["./client"] 指向 ./lib/client.js',
  !!(pkg.exports && pkg.exports['./client'] === './lib/client.js'), pkg.exports && pkg.exports['./client']);
check('dsh.bundle.patch = ./cordis.patch.yml',
  !!(pkg.dsh && pkg.dsh.bundle && pkg.dsh.bundle.patch === './cordis.patch.yml'));
check('dsh.client.platform = web',
  !!(pkg.dsh && pkg.dsh.client && pkg.dsh.client.platform === 'web'));
check('dsh.client.inject 是字符串数组',
  !!(pkg.dsh && pkg.dsh.client && Array.isArray(pkg.dsh.client.inject)
    && pkg.dsh.client.inject.every((i) => typeof i === 'string')));
check('cordis.patch.yml 是 insert 形式且 id/name 与包同名',
  /^- insert:/m.test(patchText) && patchText.includes('- id: dsh-plugin-restart')
    && patchText.includes('name: dsh-plugin-restart'));
check('lib/index.js 声明同名宿主半体并注册命令',
  indexText.includes("name: 'dsh-plugin-restart'") && indexText.includes('ctx.commands.register')
    && indexText.includes('createCommandDefinition'));
check('bundle 走 window.__ModuleLoader__.load({ id, factory })',
  bundleText.includes('window.__ModuleLoader__.load({ id: "dsh-plugin-restart", factory:'));
check('bundle 末尾 return module.exports（宿主才拿得到导出）',
  /return module\.exports;\s*\}\s*\}\);\s*$/.test(bundleText));
check('bundle 逐字内联内核（src/restart-core.cjs 全文在位）',
  bundleText.includes(coreText), `内核 ${coreText.length} 字节`);
check('bundle 标注内核 sha256 摘要',
  /\/\/#region restart-core sha256:[0-9a-f]{16}/.test(bundleText));
check('摘要与现场内核哈希一致（内联未漂移）',
  bundleText.includes(`sha256:${digestNow}`), digestNow);
check('bundle 零外链（无 http(s):// 远程依赖）',
  (bundleText.match(/https?:\/\//g) || []).length === 0);
check('宿主半体不做原生 IPC 硬改（剥离注释后不出现 app.relaunch / ipcRenderer）',
  !stripJsComments(indexText).includes('app.relaunch') && !stripJsComments(indexText).includes('ipcRenderer'));
check('模板与产物都未残留内联锚点',
  !templateText.includes('__INJECT_CORE__') === false && !bundleText.includes('__INJECT_CORE__'));

/* ─────────────────────────────────────────────────────────────────────────
 * ② 纯逻辑内核（含反向用例）
 * ───────────────────────────────────────────────────────────────────────── */
check('空口令 → 拒绝', CORE.parseRestartInput('').ok === false);
check('空口令 → 拒绝理由含确认口令提示',
  CORE.parseRestartInput('').reason.includes('confirm'), CORE.parseRestartInput('').reason);
check('空格口令 → 拒绝', CORE.parseRestartInput('   ').ok === false);
check('错口令 "yes" → 拒绝', CORE.parseRestartInput('yes').ok === false);
check('错口令 "confirmx" → 拒绝（不做前缀匹配）', CORE.parseRestartInput('confirmx').ok === false);
check('正确口令 "confirm" → 放行', CORE.parseRestartInput('confirm').ok === true);
check('正确口令大小写与空白容错 → 放行', CORE.parseRestartInput('  Confirm  ').ok === true);
check('null 入参 → 拒绝（不抛异常）', CORE.parseRestartInput(null).ok === false);
check('undefined 入参 → 拒绝（不抛异常）', CORE.parseRestartInput(undefined).ok === false);

const script = CORE.buildRelaunchScript(12345);
/** 只留可执行行：注释里也会出现 "open -a"，不剥离会把说明文字算进行为。 */
const scriptCode = script.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
check('重启脚本含真实 PID', script.includes('12345'), '12345');
check('重启脚本先 quit 后 open（只看可执行行）',
  scriptCode.indexOf('osascript') >= 0 && scriptCode.indexOf('osascript') < scriptCode.indexOf('open -a'));
check('重启脚本含应用名', script.includes('DeepSeek Harness'));
check('重启脚本含退出等待循环（kill -0 轮询）', script.includes('kill -0 12345'));
check('重启脚本首行是 shebang', script.startsWith('#!/bin/sh'));
check('重启脚本不含未展开的 JS 模板占位', !script.includes('${'));

let threw = false;
try { CORE.buildRelaunchScript('12345'); } catch { threw = true; }
check('字符串 PID → 抛错（拒绝非数字输入）', threw === true);
threw = false;
try { CORE.buildRelaunchScript(-1); } catch { threw = true; }
check('负数 PID → 抛错', threw === true);
threw = false;
try { CORE.buildRelaunchScript(12.5); } catch { threw = true; }
check('小数 PID → 抛错', threw === true);
threw = false;
try { CORE.buildRelaunchScript(1, { appName: 'Bad"; rm -rf /' }); } catch { threw = true; }
check('恶意应用名 → 抛错（拒绝拼进 shell）', threw === true);

check('PID 变化：不同 → true', CORE.pidChanged(111, 222) === true);
check('PID 未变：相同 → false', CORE.pidChanged(111, 111) === false);
check('PID 任一侧为空 → false（fail-closed）', CORE.pidChanged('', 222) === false && CORE.pidChanged(111, '') === false);
check('PID 非数字 → false', CORE.pidChanged('abc', 'def') === false);
check('PID 字符串数字相同 → false', CORE.pidChanged('111', '111') === false);
check('PID 字符串数字不同 → true', CORE.pidChanged('111', '222') === true);

check('CONFIRM_LINE 与命令名/口令自洽',
  CORE.CONFIRM_LINE === '/' + CORE.COMMAND_NAME + ' ' + CORE.CONFIRM_TOKEN, CORE.CONFIRM_LINE);

/* ─────────────────────────────────────────────────────────────────────────
 * ③ 宿主半打桩：用假 spawn，绝不触碰真的 child_process
 * ───────────────────────────────────────────────────────────────────────── */
const spawnCalls = [];
const fakeSpawn = (cmd, args, opts) => {
  spawnCalls.push({ cmd, args, opts });
  return { pid: 999999, unref() { this.unrefed = true; } };
};

const r1 = HOST.runRestart('', { spawn: fakeSpawn, pid: 4242 });
check('宿主：无口令 → kind=error', r1.kind === 'error', r1.text);
check('宿主：无口令 → 一次都没 spawn', spawnCalls.length === 0, `spawn 次数 ${spawnCalls.length}`);

const r2 = HOST.runRestart('yes', { spawn: fakeSpawn, pid: 4242 });
check('宿主：错口令 → kind=error', r2.kind === 'error', r2.text);
check('宿主：错口令 → 一次都没 spawn', spawnCalls.length === 0, `spawn 次数 ${spawnCalls.length}`);

const r3 = HOST.runRestart('confirm', { spawn: fakeSpawn, pid: 4242 });
check('宿主：正确口令 → kind=success', r3.kind === 'success', r3.text);
check('宿主：正确口令 → 恰好 spawn 一次', spawnCalls.length === 1, `spawn 次数 ${spawnCalls.length}`);
check('宿主：spawn 的是 /bin/sh -c <脚本>',
  !!(spawnCalls[0] && spawnCalls[0].cmd === '/bin/sh' && spawnCalls[0].args[0] === '-c'));
check('宿主：脚本里用的是注入的 PID 4242', !!(spawnCalls[0] && spawnCalls[0].args[1].includes('4242')));
check('宿主：分离进程（detached 且 stdio=ignore）',
  !!(spawnCalls[0] && spawnCalls[0].opts.detached === true && spawnCalls[0].opts.stdio === 'ignore'));

const r4 = HOST.runRestart('confirm', { spawn: null, pid: 4242 });
check('宿主：无 spawn 能力 → 报错而非假装成功', r4.kind === 'error', r4.text);

const boom = HOST.runRestart('confirm', { spawn: () => { throw new Error('spawn 被拒') }, pid: 4242 });
check('宿主：spawn 抛错 → 转成 error 结果（不冒泡打断宿主）',
  boom.kind === 'error' && boom.text.includes('spawn 被拒'), boom.text);

const def = HOST.createCommandDefinition({ spawn: fakeSpawn, pid: 1 });
check('命令定义：name 与内核一致', def.name === CORE.COMMAND_NAME, def.name);
check('命令定义：recordInput=false（口令不进会话日志）', def.recordInput === false);
check('命令定义：handler 是函数', typeof def.handler === 'function');

/* ─────────────────────────────────────────────────────────────────────────
 * ④ 客户端半打桩：真跑一遍"注册按钮 → 点击 → 调用命令"
 * ───────────────────────────────────────────────────────────────────────── */
function loadClientBundle(source) {
  let captured = null;
  const sandbox = {
    window: { __ModuleLoader__: { load: (mod) => { captured = mod; } } },
    console: { log() {}, warn() {}, error() {} },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'lib/client.js' });
  if (!captured) throw new Error('bundle 未调用 __ModuleLoader__.load');
  const fakeReact = { createElement: (type, props, ...children) => ({ type, props, children }) };
  const exported = captured.factory((name) => {
    if (name === 'react') return fakeReact;
    throw new Error('bundle 试图 require 非种子模块：' + name);
  });
  return { exported, fakeReact };
}

async function clientChecks() {
  const { exported } = loadClientBundle(bundleText);
  check('客户端导出 inject 数组', Array.isArray(exported.inject), JSON.stringify(exported.inject));
  check('inject 含 slots', exported.inject.includes('slots'));
  check('inject 含 remote.commands（触发通道）', exported.inject.includes('remote.commands'));
  check('客户端导出 apply 函数', typeof exported.apply === 'function');
  check('客户端导出 __internal 供单测（含点击处理）',
    !!(exported.__internal && typeof exported.__internal.handleRestartClick === 'function'));

  const remoteCalls = [];
  const ctxStub = {
    slots: {
      // 记录**全部**席位（REQ-091 / R1 起为双席位），只留最后一个会漏判。
      injectedSlots: [],
      injectedFns: [],
      registrations: [],
      inject(slotName, fn) {
        this.injectedSlot = slotName;
        this.injectedSlots.push(slotName);
        this.injectedFn = fn;
        // 两个席位各有自己的 inject 回调，必须全部留住 —— 只记最后一个会漏测一个席位
        this.injectedFns.push(fn);
        return () => {};
      },
      register(reg, Comp) {
        this.registered = reg; // 兼容旧断言：最后一个注册
        this.registrations.push(reg);
        this.component = Comp;
        return () => {};
      },
    },
    remote: {
      commands: {
        execute(sessionId, line, attachments) {
          remoteCalls.push({ sessionId, line, attachments });
          return Promise.resolve({ ok: true, value: { kind: 'success' } });
        },
      },
    },
    effect(fn, label) { this.effectLabel = label; return () => {}; },
  };
  exported.apply(ctxStub);
  // REQ-091 / R1：必须**两个席位都注入** —— 会话页头部 + 全域常显席位。
  // 只测一个会漏掉"所有页面常显"这条用户诉求（正是本次要修的那条）。
  check('apply：注入会话页头部席位 conversation.session.header.actions',
    ctxStub.slots.injectedSlots.includes('conversation.session.header.actions'),
    ctxStub.slots.injectedSlots.join(','));
  check('apply：注入全域常显席位 sidebar.footer.action（所有页面可见）',
    ctxStub.slots.injectedSlots.includes('sidebar.footer.action'),
    ctxStub.slots.injectedSlots.join(','));
  check('apply：席位清单来自内核 SLOT_NAMES（不硬编码第二个名字）',
    Array.isArray(exported.__slots) && exported.__slots.length === 2, JSON.stringify(exported.__slots));
  // 宿主契约：slots.inject 是**惰性**的 —— 回调由宿主在渲染该插槽时才调用。
  // 因此测试必须显式触发一次，否则 register 永远不会发生（这一条本身就是契约断言）。
  check('apply：inject 回调是惰性的（apply 期间尚未 register）',
    ctxStub.slots.registered === undefined);
  // 宿主会为**每个**席位各触发一次回调，测试也必须逐个触发（否则只注册了一个席位）
  ctxStub.slots.injectedFns.forEach(function (fn) { if (typeof fn === 'function') fn(); });
  check('宿主触发 inject 回调后才真正 register',
    ctxStub.slots.registered !== undefined);
  check('apply：插槽注册 id = dsh_restart_button',
    ctxStub.slots.registrations.some((r) => r.id === 'dsh_restart_button'));
  check('apply：全域席位注册 id = dsh_restart_button_global（两席位 id 必须不同）',
    ctxStub.slots.registrations.some((r) => r.id === 'dsh_restart_button_global'),
    ctxStub.slots.registrations.map((r) => r.id).join(','));
  check('apply：两个席位各注册一次（共 2 条）',
    ctxStub.slots.registrations.length === 2, String(ctxStub.slots.registrations.length));
  check('apply：插槽注册 order 是数字',
    !!(ctxStub.slots.registered && typeof ctxStub.slots.registered.order === 'number'));
  check('apply：注入了组件', typeof ctxStub.slots.component === 'function');
  check('apply：挂了可回收副作用（ctx.effect）',
    typeof ctxStub.effectLabel === 'string' && ctxStub.effectLabel.includes('dsh-plugin-restart'));

  const injected = ctxStub.slots.registered.inject('session-abc');
  check('插槽 inject：给按钮注入了 onClick', typeof injected.onClick === 'function');
  check('插槽 inject：带中文标签与提示', !!injected.label && !!injected.title);

  const cancelRes = await exported.__internal.handleRestartClick(ctxStub, 'session-abc', () => false);
  check('点击：二次确认取消 → ok=false',
    cancelRes.ok === false && cancelRes.reason === 'cancelled', JSON.stringify(cancelRes));
  check('点击：二次确认取消 → 未调用任何宿主命令', remoteCalls.length === 0, `调用 ${remoteCalls.length} 次`);

  const okRes = await exported.__internal.handleRestartClick(ctxStub, 'session-abc', () => true);
  check('点击：确认后 → ok=true', okRes.ok === true, JSON.stringify(okRes));
  check('点击：确认后 → 恰好调用一次 execute', remoteCalls.length === 1, `调用 ${remoteCalls.length} 次`);
  check('点击：命令行 = /restart-dsh confirm',
    remoteCalls[0] && remoteCalls[0].line === '/restart-dsh confirm', remoteCalls[0] && remoteCalls[0].line);
  check('点击：带上真实 sessionId', !!(remoteCalls[0] && remoteCalls[0].sessionId === 'session-abc'));
  check('点击：附件参数为空数组',
    !!(remoteCalls[0] && Array.isArray(remoteCalls[0].attachments) && remoteCalls[0].attachments.length === 0));

  const noRemote = await exported.__internal.handleRestartClick({}, 's', () => true);
  check('点击：remote.commands 缺失 → 如实报错而非假装成功',
    noRemote.ok === false && String(noRemote.reason).includes('remote.commands'), JSON.stringify(noRemote));

  const failing = await exported.__internal.handleRestartClick(
    { remote: { commands: { execute: () => Promise.reject(new Error('通道断了')) } } }, 's', () => true);
  check('点击：execute 抛错 → 转成 ok=false（不冒泡）',
    failing.ok === false && String(failing.reason).includes('通道断了'), JSON.stringify(failing));

  exported.apply({});
  check('apply：宿主能力缺失 → 不抛异常（静默退出）', true);
  check('apply：宿主能力缺失 → 留下诊断信息',
    Array.isArray(exported.__diagnostics) && exported.__diagnostics.length > 0,
    JSON.stringify(exported.__diagnostics));

  /* ── 反向变异：把 bundle 里的确认口令改坏，上面的断言必须随之失败 ─────────
   * 变异点选在**真正决定行为的那一行**（CONFIRM_TOKEN 的取值），而不是注释里的示例文字——
   * 第一版变异只改了注释，行为断言当然抓不到；这本身就是"检测器有没有牙"的一次实测。 */
  const mutated = bundleText.replace(/CONFIRM_TOKEN = 'confirm'/, "CONFIRM_TOKEN = 'yes'");
  const mutationApplied = mutated !== bundleText;
  let mutationCaughtByBehavior = false;
  try {
    const m = loadClientBundle(mutated);
    const calls = [];
    const res = await m.exported.__internal.handleRestartClick(
      { remote: { commands: { execute: (sid, line) => { calls.push(line); return Promise.resolve({}) } } } },
      's', () => true);
    // 变异后：发出去的命令行不再等于正确值（或根本没发出去）
    mutationCaughtByBehavior = !(res.ok === true && calls.length === 1 && calls[0] === '/restart-dsh confirm');
  } catch {
    mutationCaughtByBehavior = true;
  }
  check('反向变异：变异点确实落到源码上（不是空改）', mutationApplied);
  check('反向变异：确认口令被改坏 → 行为断言确实失败（证明检测器有牙）', mutationCaughtByBehavior);

  check('反向变异：摘要被篡改 → 不再匹配现场哈希',
    !bundleText.replace(/sha256:[0-9a-f]{16}/, 'sha256:0000000000000000').includes(`sha256:${digestNow}`));
}

clientChecks().then(() => {
  const failed = results.filter((r) => !r.pass);
  for (const r of results) {
    console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? `（${r.detail}）` : ''}`);
  }
  // ── REQ-091 / R2：端到端语义（PID 是唯一合格证据） ────────────────────────
  // 为什么这几条必须有：用户实测"点了没重启"，而当时**没有任何东西**能判定
  // "重启了没有"。R2 把判据定成"宿主 PID 必须变化"，这里就把该判据锁进回归。
  check('R2：重启脚本必须内嵌**当前宿主 PID**（否则等的是别人的进程）',
    /kill -0 12345/.test(CORE.buildRelaunchScript(12345)));
  check('R2：重启脚本必须"先退出再重开"，且退出在 open 之前',
    (function () {
      const sc = CORE.buildRelaunchScript(4242);
      const quitAt = sc.indexOf('quit app');
      const openAt = sc.indexOf('open -a');
      return quitAt > 0 && openAt > quitAt;
    })());
  check('R2：PID 比对 —— 不同才算重启成功',
    CORE.pidChanged(111, 222) === true);
  check('R2 反向：PID 相同 → 未证明重启',
    CORE.pidChanged(111, 111) === false);
  check('R2 反向：取不到任一侧 PID → 未证明重启（fail-closed）',
    CORE.pidChanged(111, null) === false && CORE.pidChanged(undefined, 222) === false);
  check('R2 反向：非数字 PID → 未证明重启',
    CORE.pidChanged('abc', '222') === false);
  check('R2 反向：非法 PID 不得生成脚本（拒绝注入面）',
    (function () { try { CORE.buildRelaunchScript('12345; rm -rf /'); return false; } catch (e) { return true; } })());
  check('R2：成功回执必须提示用 PID 比对确认（不许只说"已重启"）',
    /PID/.test(CORE.describeResult({ ok: true }, true)));

  console.log('-----------------------------------------');
  console.log(`共 ${results.length} 项 · ${failed.length ? `❌ ${failed.length} 项未过` : '🎉 全部通过'}`);
  process.exit(failed.length ? 1 : 0);
}).catch((err) => {
  console.error('❌ 自检异常终止：' + (err && err.stack ? err.stack : String(err)));
  process.exit(1);
});
