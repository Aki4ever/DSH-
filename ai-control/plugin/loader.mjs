/**
 * ==============================================================================
 * DSH AI 执行流程管控 · 故障安全加载器 (Fail-Safe Plugin Loader)
 * ==============================================================================
 * 为什么需要这一层：
 *   profile 的 cordis.patch.yml 是**桌面端的启动配置**。若该文件里直接写
 *   `name: <插件路径>`，一旦插件缺失、路径写错或加载抛错，整个桌面端将无法
 *   启动——这是不可接受的代价。
 *
 *   本加载器把"加载失败"降级为"空插件 + 警告日志"：
 *     - 管控功能失效（可接受，用户会发现看板不出现）
 *     - 桌面端照常启动（必须保证）
 *
 * 用法：在 profile 的 cordis.patch.yml 中以 `name: <本文件 file:// 绝对路径>`
 *       插入一行。配置全部由被加载插件自身的默认值提供。
 * ==============================================================================
 */

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** 被加载的真实插件路径（与本文件同目录的 index.mjs）。 */
const PLUGIN_URL = new URL('./index.mjs', import.meta.url)

/** 空插件：加载失败时的降级目标，什么都不做。 */
const noop = {
  name: 'ai-execution-control-noop',
  apply() {},
}

/**
 * 加载真实插件；任何失败都降级为空插件，绝不让宿主启动失败。
 * @returns {Promise<object>} 插件模块或空插件
 */
async function loadSafely() {
  try {
    if (!existsSync(fileURLToPath(PLUGIN_URL))) {
      console.warn('[ai-execution-control] 插件文件不存在，管控功能停用：', fileURLToPath(PLUGIN_URL))
      return noop
    }
    const mod = await import(PLUGIN_URL.href)
    if (!mod || typeof mod.apply !== 'function') {
      console.warn('[ai-execution-control] 插件缺少 apply 导出，管控功能停用。')
      return noop
    }
    return mod
  } catch (err) {
    console.warn('[ai-execution-control] 插件加载失败，管控功能停用（宿主不受影响）：', err?.message || err)
    return noop
  }
}

const inner = await loadSafely()

/** 供 loader 解析的插件名。 */
export const name = inner.name || 'ai-execution-control'

/**
 * 依赖声明：**必须在这里声明，不能只写在 index.mjs 里**。
 *
 * 原因（真实缺陷，2026-09-23 修复）：宿主只读取「被加载模块自己导出」的 inject
 * （依据：cordis `new Fiber(..., Inject.resolve(plugin.inject), ...)` 与
 * cordis-plugin-loader `Inject.resolve(entry.options.inject, fiber.inject)`）。
 * 本文件是 patch 条目实际加载的模块，index.mjs 只是被它 import 的内部模块，
 * 因此 index.mjs 里的 `inject = ['tools']` 永远不会被宿主读到。
 *
 * 后果：宿主不等待 tools 服务就激活插件 → apply 时 `ctx.tools` 为 undefined
 * → 命中"服务未就绪"分支静默 return → **守卫永不注册、看板永不注入**，
 * 而自检仍全绿（历史事实：5160 次受控调用 0 次否决、0 次注入）。
 *
 * 降级说明：声明依赖不会让宿主启动失败——依赖缺失时 Cordis 只是不激活本插件，
 * 桌面端照常启动，与"故障安全加载器"的设计目标一致。
 */
export const inject = ['tools']

/**
 * 转交入口。真实插件自己的 `apply` 内部已对每个挂载点做了 try/catch 兜底。
 * @param {object} ctx Cordis 上下文
 * @param {object} config 插件配置
 */
export function apply(ctx, config) {
  try {
    if (typeof inner.apply === 'function') return inner.apply(ctx, config ?? {})
  } catch (err) {
    console.warn('[ai-execution-control] 插件初始化异常，管控功能停用：', err?.message || err)
  }
  return undefined
}
