'use strict';
/**
 * dsh-plugin-restart — 宿主半体（Node 侧，cordis 适配层）
 * ==============================================================================
 * 职责：把"重启"注册成一个**官方扩展点上的斜杠命令** `/restart-dsh confirm`。
 *
 * 为什么不直接做原生 IPC：生产包里没有可被页面调用的重启入口（已实测）——
 *   · 渲染侧 IPC 清单（apps/desktop/src/ipc.ts）里没有 restart；
 *   · `app.relaunch()` 只出现在致命错误恢复对话框与开发期菜单（后者在生产包被裁掉）；
 *   · `window.dsh` 预加载桥只暴露 getLocale / onLocaleChange / getAuthToken。
 * 所以走官方插件面：宿主半注册命令，客户端半注入按钮并调用该命令。
 *
 * 本文件**只做接线**，判定逻辑全在 `src/host-core.cjs`（可注入依赖、可单测）。
 * ==============================================================================
 */

const { spawn } = require('node:child_process');
const CORE = require('../src/restart-core.cjs');
const HOST = require('../src/host-core.cjs');

module.exports = {
  name: 'dsh-plugin-restart',

  /**
   * @param {object} ctx 宿主插件上下文（cordis Context）
   */
  apply(ctx) {
    const commands = ctx && ctx.commands;
    if (!commands || typeof commands.register !== 'function') {
      // 宿主未提供命令注册面时**如实记录**，绝不假装成功（本工程实测教训：
      // 拦截层插件"配置已写入"但从未被加载，外观症状与"已生效"完全一致）。
      if (ctx && ctx.logger && typeof ctx.logger.warn === 'function') {
        ctx.logger.warn('dsh-plugin-restart: 宿主未提供 ctx.commands.register，重启按钮将不可用');
      }
      return undefined;
    }

    const dispose = commands.register(HOST.createCommandDefinition({ spawn, pid: process.pid }));

    // 命令注册的回收（宿主提供 effect 时才挂；不提供也不影响注册本身）
    if (ctx && typeof ctx.effect === 'function' && typeof dispose === 'function') {
      ctx.effect(() => dispose, 'dsh-plugin-restart: /' + CORE.COMMAND_NAME);
    }
    return undefined;
  },

  /** 把内核口径原样透出，供自检脚本与人工排查复用（避免两处各写一份口径）。 */
  core: CORE,
};
