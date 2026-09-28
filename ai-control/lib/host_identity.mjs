/**
 * ==============================================================================
 * 宿主身份判定 (Host Identity) — 唯一权威源
 * ==============================================================================
 * 为什么单独抽一个模块：判定"当前进程是不是 DSH 宿主的插件运行进程"直接决定
 * 两件事的真假——① 硬门禁到底有没有挂载；② 宿主激活凭据能不能落账。
 * 实测教训（2026-09-28）：这份判据曾在 `index.mjs` 与 `loader.mjs` **各写一份**，
 * 两份用的是同一个错误正则 `/dsh[\\/]lib[\\/]bin\.js/`，真实宿主进程
 * （Electron NodeService 形态）永不命中，于是 isHost 恒为 false、激活台账长期空白，
 * 只能靠手工回填——而回填在语义上不是运行时凭据。**一处错、两处错、没人发现**。
 *
 * 判据分层（任一强证据成立即判宿主）：
 *   1) 显式环境契约：宿主启动时可注入 `DSH_IS_HOST=1` / `DSH_HOST_PID`；
 *   2) Electron NodeService 工具进程：argv 同时含 `DSH Desktop Helper`、
 *      `node.mojom.NodeService` 与 `DSH Desktop`；
 *   3) 传统入口形态 `dsh/lib/bin.js`（兼容旧版宿主）。
 *
 * 反证据优先：命令行里出现本插件的自检/加载脚本时一律判非宿主，
 * 避免测试进程把自己的 apply 记成"宿主已激活"（这个假阳性本项目踩过）。
 * ==============================================================================
 */

/**
 * @param {string[]} [argv] 进程命令行（默认取 process.argv）
 * @param {Record<string,string|undefined>} [env] 环境变量（默认取 process.env）
 * @returns {boolean} true = 当前进程是 DSH 宿主的插件运行进程
 */
export function isHostProcess(argv = process.argv, env = process.env) {
  const joined = Array.isArray(argv) ? argv.join(' ') : String(argv ?? '')
  if (/ai-control[\\/]plugin[\\/](selftest|loader)\.mjs/.test(joined)) return false
  if (env?.DSH_IS_HOST === '1') return true
  if (env?.DSH_HOST_PID !== undefined && env?.DSH_HOST_PID !== '') return true
  if (/DSH Desktop Helper/.test(joined) && /node\.mojom\.NodeService/.test(joined) && /DSH Desktop/.test(joined)) return true
  return /dsh[\\/]lib[\\/]bin\.js/.test(joined)
}
