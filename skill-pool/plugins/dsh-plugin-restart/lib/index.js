/**
 * ==============================================================================
 * dsh-plugin-restart — 宿主半体（Node 侧，cordis 适配层）· ESM 形态
 * ==============================================================================
 * 职责：把"重启"注册成一个**官方扩展点上的斜杠命令** `/restart-dsh confirm`。
 *
 * 🔴 为什么必须改 ESM（2026-10-02 实测根因，必须留痕）：
 *   本文件此前是 CommonJS（`module.exports = { name, apply }`），而 DSH 插件加载器
 *   用 `import()` 加载宿主半；在 `"type"` 缺省（= commonjs）的包里 `import()` 一个 `.js`
 *   会走 CJS 分支，而官方要求的是 ESM 导出形态。应用内自带技能原文（可从 app.asar 只读解出）：
 *   `cordis-plugin-development/references/host-plugin.md` ——
 *   "index.js exports one of these forms; do not mix them: `export function apply(ctx, config) {}`
 *    with optional `export const inject = ['tools']`"。
 *   实测后果：**插件从未被加载** —— `plugin-status.txt` 的最后激活时间是 09-30，
 *   而宿主已在 10-02 重启多次；没加载 → `/restart-dsh` 从未注册 →
 *   客户端按钮点下去只是把命令发给宿主，宿主不认识 → **什么都不会发生**。
 *   修法：package.json 补 `"type": "module"`，本文件改 `export`，并**显式声明 inject**。
 *
 * 🔴 为什么必须显式声明 `inject: ['commands']`（同一根因的第二半）：
 *   cordis 是依赖注入容器：不声明 inject，`ctx.commands` 就是 undefined。旧实现遇到这种情况
 *   "如实记录一句警告然后静默返回"，外观上什么异常都没有，但命令永远不存在 ——
 *   用户看到的就是"按钮点了没反应"。官方 `/compact` 插件实测声明：
 *   `const inject = ["commands", "compaction"]`，照此对齐。
 *
 * 为什么不直接做原生 IPC：生产包里没有可被页面调用的重启入口（app.asar 只读解析已实测）——
 *   · 渲染侧 IPC 清单里没有 restart；
 *   · `app.relaunch()` 只出现在致命错误恢复对话框与开发期菜单（后者在生产包被裁掉）；
 *   · `window.dsh` 预加载桥只暴露 getLocale / onLocaleChange / getAuthToken。
 * 所以走官方插件面：宿主半注册命令，客户端半注入按钮并调用该命令。
 *
 * 判定逻辑全在 `src/host-core.cjs`（可注入依赖、可单测），本文件**只做接线与留痕**。
 * ==============================================================================
 */

import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
// 注意：ESM 导入 CJS 时 `import X from` 拿不到 default（CJS 没有 default 导出），
// 必须用具名导入 —— Node 会用 cjs-module-lexer 静态解析 module.exports 的键。
import { COMMAND_NAME, CONFIRM_TOKEN } from '../src/restart-core.cjs'
import { createCommandDefinition } from '../src/host-core.cjs'

/** 插件名（与 package.json 的 name 一致）。 */
export const name = 'dsh-plugin-restart'

/**
 * 依赖声明（**这是"命令有没有被注册"的开关**，不是可选项）。
 * 少了它：`ctx.commands` 为 undefined → 命令永不注册 → 按钮点了没反应。
 */
export const inject = ['commands']

/**
 * 启动留痕：把"宿主半到底有没有被加载、拿到哪些能力"写进独立文件。
 * 为什么必须落盘而不是只打日志：DSH 宿主日志不在本仓、也不一定留存，
 * 而"插件是否被加载"恰恰是本次事故的核心事实 —— 没有它只能靠猜。
 * 每次 apply 追加一行（带 PID 与能力探测结果），成本极低。
 */
function recordBoot(ctx, extra = {}) {
  try {
    const dir = join(process.env.DSH_HOME || join(homedir(), '.dsh'), '.dsh-control')
    mkdirSync(dir, { recursive: true })
    const rec = {
      at: new Date().toISOString(),
      plugin: name,
      pid: process.pid,
      hasCommands: !!(ctx && ctx.commands && typeof ctx.commands.register === 'function'),
      hasEffect: !!(ctx && typeof ctx.effect === 'function'),
      ...extra,
    }
    writeFileSync(join(dir, 'restart-plugin-boot.jsonl'), `${JSON.stringify(rec)}\n`, { flag: 'a' })
  } catch {
    /* 留痕失败绝不影响插件本身 */
  }
}

/**
 * cordis 插件入口。
 * @param {object} ctx 宿主插件上下文
 */
export function apply(ctx) {
  const hasCommands = !!(ctx && ctx.commands && typeof ctx.commands.register === 'function')
  recordBoot(ctx, { stage: 'apply' })

  if (!hasCommands) {
    // 不做"静默返回"：把缺失原因显式写下（本次事故就是被这种静默拖了整整一轮）
    if (ctx && ctx.logger && typeof ctx.logger.warn === 'function') {
      ctx.logger.warn(
        'dsh-plugin-restart: 宿主未注入 ctx.commands —— 检查 index.js 是否以 ESM 导出且声明 inject=["commands"]；' +
          '在此状态下重启按钮不会生效。',
      )
    }
    return undefined
  }

  const definition = createCommandDefinition({ spawn, pid: process.pid })
  const register = () => ctx.commands.register(definition)

  // 资源登记走 ctx.effect（官方形态）：注册与回收成对，宿主卸载插件时不残留命令。
  if (typeof ctx.effect === 'function') {
    ctx.effect(
      function* () {
        yield register()
      },
      'dsh-plugin-restart: /' + COMMAND_NAME,
    )
  } else {
    // 宿主没给 effect 也要能工作：直接注册，只是少了自动回收
    register()
  }

  recordBoot(ctx, { stage: 'registered', command: '/' + COMMAND_NAME + ' ' + CONFIRM_TOKEN })
  return undefined
}

/** 把内核口径原样透出，供自检脚本与人工排查复用（避免两处各写一份口径）。 */
export { COMMAND_NAME, CONFIRM_TOKEN, createCommandDefinition }
