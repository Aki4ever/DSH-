'use strict';
/**
 * restart-core.cjs — dsh-plugin-restart 的纯逻辑内核（宿主半与客户端半共用）
 * ==============================================================================
 * 为什么单独一份：客户端 bundle 不能 require 本地文件（宿主只提供 seed 模块），
 * 逻辑必须被内联进 lib/client.js。内联就会产生"两份实现"，
 * 因此由 build_client.py 把本文件整体注入模板，并用 sha256 摘要锁死。
 *
 * 为什么要有这一层（REQ-090 / R6 实测根因）：
 *   生产包里**没有任何可被页面调用的官方重启入口**（已实测）：
 *   `app.relaunch()` 只挂在"致命错误恢复对话框"与"开发期菜单"上，
 *   渲染侧 IPC 清单里没有 restart，`window.dsh` 只暴露 getLocale/onLocaleChange/getAuthToken。
 *   因此只能自建一条链路。本文件把链路上**所有可判定的部分**抽成纯函数，
 *   让它们可以在没有宿主 App 的情况下被单测（verify_restart_button.cjs）。
 *
 * 诚实边界：
 *   · 本内核**不承诺**一定能重启成功 —— 退出确认弹窗、分离进程存活、
 *     第三方插件能否调 remote.commands 都是待实测项（见 README §待实测）。
 *   · 它承诺的是：命令名、确认口令、脚本内容、PID 比对口径**唯一且可验证**。
 * ==============================================================================
 */

/** 斜杠命令名（不含前导 `/`）。 */
const COMMAND_NAME = 'restart-dsh';
/** 二次确认口令：没有它一律拒绝执行（防手滑、防误触）。 */
const CONFIRM_TOKEN = 'confirm';
/** 客户端按钮实际发出的完整命令行。 */
const CONFIRM_LINE = '/' + COMMAND_NAME + ' ' + CONFIRM_TOKEN;
/** 目标应用名（macOS `open -a` / `osascript quit app` 用它定位）。 */
const APP_NAME = 'DeepSeek Harness';
/** 客户端按钮与插槽标识。 */
const BUTTON_ID = 'dsh_restart_button';
/**
 * 会话页头部席位（原席位，保留）。
 * `kind=list` / `scope=session`，官方 `dsh-client-ui-jobs` 的 JobsPopover 就挂这里。
 */
const SLOT_NAME = 'conversation.session.header.actions';
/**
 * **全域常显席位**（REQ-091 / R1 新增）。
 *
 * 为什么必须换/加席位：用户实测"重启按钮需要在所有页面都常显"，
 * 而 `conversation.session.header.actions` 是 **scope=session** 的席位 ——
 * 只有会话页且只有会话上下文存在时才渲染，首页/设置/记忆页一律看不到。
 *
 * 席位经 `app.asar` 只读解析实测（节选 `dsh-client-ui-sidebar` 的注册表）：
 *   `sidebar.footer.action` → `kind: "list"` · `scope: "root"`，
 *   挂在侧栏底部 `footArea`，**不随路由切换卸载** —— 这是"所有页面常显"的物理落点。
 *
 * 反例（为什么不选 `shell.leading`，实测过）：
 *   它只在 **macOS 且侧栏处于折叠态**时才被 frame 挂载（`leadingMounted = darwin && sidebarCollapsed`），
 *   拿它当常显落点会得到"时有时无"的假常显。
 */
const GLOBAL_SLOT_NAME = 'sidebar.footer.action';
/** 按钮在多个席位里的挂载顺序（越小越靠前）。 */
const SLOT_ORDER = 90;
/** 全域席位的顺序：放末尾，避免挤掉侧栏原有的设置/新建等入口。 */
const GLOBAL_SLOT_ORDER = 900;
/** 全部挂载席位（客户端半按此数组逐个注册；数组是唯一真相源）。 */
const SLOT_NAMES = [SLOT_NAME, GLOBAL_SLOT_NAME];

/**
 * 解析命令入参，判断是否放行重启。
 * 口径：**必须显式确认**。空输入、拼错、多说一个字都拒绝 —— 重启是不可逆动作。
 * @param {string} rawInput 命令名之后的原文
 * @returns {{ok:boolean, reason:string}}
 */
function parseRestartInput(rawInput) {
  const s = String(rawInput == null ? '' : rawInput).trim().toLowerCase();
  if (s === '') return { ok: false, reason: '缺少确认口令：请使用 /' + COMMAND_NAME + ' ' + CONFIRM_TOKEN };
  if (s !== CONFIRM_TOKEN) return { ok: false, reason: '确认口令不正确：期望 `' + CONFIRM_TOKEN + '`，实际 `' + s + '`' };
  return { ok: true, reason: '' };
}

/**
 * 生成"等旧进程退出后重新打开应用"的分离脚本。
 * 为什么用分离进程：宿主自己执行 `quit` 会被自己杀掉，后面的 `open -a` 就没人跑了。
 *
 * 安全：只接受**正整数 PID**，其余一律抛错。脚本里不做任何字符串拼接用户输入，
 * 因此不存在注入面（这是本文件唯一需要拼 shell 的地方，必须说明白）。
 * @param {number} pid 当前宿主进程号
 * @param {{appName?:string, waitSec?:number}} [opts]
 */
function buildRelaunchScript(pid, opts) {
  const o = opts || {};
  const app = o.appName || APP_NAME;
  const waitSec = Number.isInteger(o.waitSec) && o.waitSec > 0 ? o.waitSec : 60;
  const logFile = o.logFile || '';
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error('buildRelaunchScript 只接受正整数 PID，收到：' + String(pid));
  }
  if (!/^[\w .\-]+$/.test(app)) {
    throw new Error('应用名含非法字符，拒绝拼进脚本：' + app);
  }
  // 绝对可执行路径（open -a 失败时的兜底）。应用名固定为 APP_NAME，路径由它派生，不接受外部拼接。
  const exePath = o.exePath || `/Applications/${app}.app/Contents/MacOS/${app}`;
  if (!/^\/[\w .\-/]+$/.test(exePath)) {
    throw new Error('可执行路径含非法字符，拒绝拼进脚本：' + exePath);
  }
  const ticks = waitSec * 2; // 每 0.5 秒探一次
  const lines = [
    '#!/bin/sh',
    '# 由 dsh-plugin-restart 生成 —— 等旧宿主退出后重新打开应用。',
    '# 为什么先等再开：宿主会随应用一起退出；立刻 open 只会聚焦到还没退出的旧窗口。',
    '# 为什么要有兜底：`open -a` 依赖 LaunchServices 注册，失败了应用就再也回不来（退出却打不开）。',
    '# 所以备用一条"直接执行应用二进制"的路。',
  ];
  if (logFile && /^[\w .\-\/]+$/.test(logFile)) {
    lines.push(
      `LOG='${logFile}'`,
      // 用字符串拼接而不是模板字面量：里面既有 $ 又有引号，容易被后续维护者改坏
      'log() { printf "%s %s\\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" >> "$LOG" 2>/dev/null || true; }',
      'log "启动重启脚本 old_pid=' + pid + '"',
    )
  } else {
    lines.push('log() { :; }')
  }
  lines.push(
    'sleep 1',
    'log "请求退出应用"',
    `osascript -e 'quit app "${app}"' >/dev/null 2>&1 || log "osascript quit 返回非 0（继续）"`,
    'i=0',
    `while [ "$i" -lt ${ticks} ]; do`,
    `  kill -0 ${pid} 2>/dev/null || break`,
    '  sleep 0.5',
    '  i=$((i+1))',
    'done',
    'log "旧进程已消失或等待超时，准备重开"',
    `if open -a "${app}" >/dev/null 2>&1; then log "已用 open -a 重开"; else`,
    `  log "open -a 失败，改用可执行路径兜底"`,
    `  "${exePath}" >/dev/null 2>&1 &`,
    `  log "已用可执行路径重开"`,
    'fi',
    '',
  );
  return lines.join('\n');
}

/**
 * PID 比对：这是"点击后真的重启了吗"的**唯一合格证据**。
 * @param {string|number} before 点击前的宿主 PID
 * @param {string|number} after  恢复后的宿主 PID
 */
function pidChanged(before, after) {
  const a = String(before == null ? '' : before).trim();
  const b = String(after == null ? '' : after).trim();
  if (!a || !b) return false;   // 取不到任一侧的数字 → 不算变化（fail-closed）
  if (a === b) return false;
  if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) return false;
  return true;
}

/** 由命令返回值构造给用户看的一行中文回执。 */
function describeResult(parsed, spawnOk) {
  if (!parsed || !parsed.ok) return parsed ? parsed.reason : '未解析入参';
  return spawnOk
    ? '已排定重启：应用将先退出，再自动重新打开。重启后请用 PID 比对确认（旧 PID 与新 PID 必须不同）。'
    : '重启脚本未能派出（spawn 失败），应用未重启。';
}

module.exports = {
  COMMAND_NAME,
  CONFIRM_TOKEN,
  CONFIRM_LINE,
  APP_NAME,
  BUTTON_ID,
  SLOT_NAME,
  GLOBAL_SLOT_NAME,
  SLOT_NAMES,
  SLOT_ORDER,
  GLOBAL_SLOT_ORDER,
  parseRestartInput,
  buildRelaunchScript,
  pidChanged,
  describeResult,
};
