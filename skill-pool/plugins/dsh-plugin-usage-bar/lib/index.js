// 宿主侧（Node）入口 —— dsh-plugin-usage-bar
//
// 职责边界（刻意做窄）：
//   本插件**不在宿主里重算任何业务逻辑**，只做一件事：
//   周期性调用本仓已审计的探针 CLI（scripts/deepseek_usage_probe.mjs --json），
//   把结果原子落盘到 $DSH_HOME/.dsh-control/usage-bar.json，供前端与人工核查。
//   这样"时段算法、余额取数、定价指纹"只有一份实现，不存在宿主与 CLI 两套口径。
//
// 故障安全：任何异常都只写诊断日志，绝不抛出 —— 底栏插件坏掉不能拖垮宿主。
'use strict';

const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PLUGIN_NAME = 'dsh-plugin-usage-bar';
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
const STATE_DIR = path.join(DSH_HOME, '.dsh-control');
const STATE_FILE = path.join(STATE_DIR, 'usage-bar.json');
const DIAG_FILE = path.join(STATE_DIR, 'usage-bar-host.json');
const PROBE = process.env.DSH_USAGE_PROBE ||
  '/Users/linqiyu/Documents/DSH/全局规则/scripts/deepseek_usage_probe.mjs';
const REFRESH_MS = Number(process.env.DSH_USAGE_REFRESH_MS || 5 * 60 * 1000);

let timer = null;
let lastDiag = { plugin: PLUGIN_NAME, runs: 0 };

function writeAtomic(file, text) {
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
}

function writeDiag(patch) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    lastDiag = Object.assign(lastDiag, patch, { updatedAt: new Date().toISOString() });
    writeAtomic(DIAG_FILE, JSON.stringify(lastDiag, null, 2));
  } catch (err) { /* 诊断失败不影响加载 */ }
}

/** 调一次探针并把结果落盘。回调风格，绝不抛。 */
function refresh(ctx) {
  execFile(process.execPath, [PROBE, '--json'], { timeout: 30000, maxBuffer: 4 * 1024 * 1024 },
    (err, stdout, stderr) => {
      lastDiag.runs = (lastDiag.runs || 0) + 1;
      if (err) {
        writeDiag({ lastRun: 'error', lastError: String(err.message || err).slice(0, 300) });
        return;
      }
      let parsed = null;
      try { parsed = JSON.parse(stdout); } catch (parseErr) {
        writeDiag({ lastRun: 'bad-json', lastError: String(parseErr.message).slice(0, 200) });
        return;
      }
      try {
        fs.mkdirSync(STATE_DIR, { recursive: true });
        writeAtomic(STATE_FILE, JSON.stringify({
          plugin: PLUGIN_NAME,
          generatedAt: new Date().toISOString(),
          from: PROBE,
          probe: parsed,
        }, null, 2));
        writeDiag({
          lastRun: 'ok',
          period: parsed.period,
          balanceErrorKind: parsed.balance && parsed.balance.errorKind,
          pricingFingerprint: parsed.pricing && String(parsed.pricing.fingerprint).slice(0, 16),
          ctxKeys: ctx && typeof ctx === 'object' ? Object.keys(ctx).sort() : [],
        });
      } catch (werr) {
        writeDiag({ lastRun: 'write-failed', lastError: String(werr.message).slice(0, 200) });
      }
      void stderr;
    });
}

module.exports = {
  name: PLUGIN_NAME,
  apply(ctx) {
    try {
      fs.mkdirSync(STATE_DIR, { recursive: true });
      writeDiag({
        appliedAt: new Date().toISOString(),
        ctxKeys: ctx && typeof ctx === 'object' ? Object.keys(ctx).sort() : [],
        probe: PROBE,
        refreshMs: REFRESH_MS,
      });
      refresh(ctx);
      timer = setInterval(() => refresh(ctx), REFRESH_MS);
      if (timer && typeof timer.unref === 'function') { timer.unref(); }
      if (ctx && typeof ctx.effect === 'function') {
        ctx.effect(() => () => { if (timer) { clearInterval(timer); timer = null; } },
          'dsh-plugin-usage-bar: host refresh loop');
      }
    } catch (err) {
      writeDiag({ applyError: String(err && err.message).slice(0, 300) });
    }
    return undefined;
  },
};
