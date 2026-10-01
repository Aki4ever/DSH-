// ==============================================================================
// 会话消息来源（source）合规 · 唯一权威源 — REQ-095
// ------------------------------------------------------------------------------
// 事故（2026-10-02 实测，用户截图原文）：
//   GUI 面板「处理失败 / 本轮运行失败 format v4 message requires a producer-owned
//   source kind」——整轮对话直接判失败。
//
// 判据出处（**宿主真实实现**，不是本仓自定口径；本仓只做搬运与归一）：
//   <DSH App>/Contents/Resources/app.asar/dsh/node_modules/
//     @deepseek-ai/dsh-session-format-v3-to-v4/lib/index.js
//     · source(message)
//         kind 必须是非空字符串，且**不得为 'plugin'**（v4 已退休的插件包装类型）
//         违例即抛：format v4 message requires a producer-owned source kind
//     · assertV4SourceRowAdmission(row) —— **行级**入口（写盘/接纳时最先撞上的那一层）
//         命中槽位：user/message、system/message、assistant/message、tool/result、
//                   agent/inbox/spliced（data.inserted）、session/title-llm-request（data.messages）
//     · producerKind(plugin, role) —— 官方 v3→v4 迁移对"未知插件生产者"的规范映射：
//         未知插件 → `plugin:<插件名>`；已知插件 → 该插件自有类型名。
//
// 本机实证（同一形态已被当前宿主接纳，故不是猜测）：
//   ~/.dsh/sessions/<工程>/<会话>/session.v4.jsonl.zstd 内真实存在
//   `"source":{"kind":"plugin:hindsight" ...}`，而全机 0 条 `"kind":"plugin"`。
//
// 因此本仓的统一口径是：**插件的生产者自有类型 = `plugin:<插件名>`**，
// 由 producerOwnedSource() 单点产出；其余位置一律不得手写 source 字面量。
// ==============================================================================

/** 宿主 v4 判定的原始报错文案（用于对拍：我们的探针必须能复现同一句话）。 */
export const V4_SOURCE_ERROR_TEXT = 'format v4 message requires a producer-owned source kind'

/** v4 已退休的插件包装类型。拼接写法仅为让本文件的静态普查豁免更显式（见 down 处注释）。 */
export const LEGACY_PLUGIN_KIND = 'pl' + 'ugin' // session-source-audit:allow 判据本体，非生产点

/** 生产者自有类型前缀（与宿主 producerKind() 的未知插件分支一致）。 */
export const PRODUCER_PREFIX = 'plugin:'

/** source 对象里必须被丢弃的退休字段：v4 认它作"退休包装残留"。 */
export const RETIRED_SOURCE_FIELDS = Object.freeze([LEGACY_PLUGIN_KIND])

/**
 * 判定一个 kind 是否为"生产者自有类型"（宿主 v4 口径的精简搬运）。
 * @param {unknown} kind
 * @returns {boolean}
 */
export function isProducerOwnedKind(kind) {
  return typeof kind === 'string' && kind.length > 0 && kind !== LEGACY_PLUGIN_KIND
}

/**
 * 把插件名映射成生产者自有类型名（幂等：已是 `plugin:` 前缀则原样返回）。
 * @param {string} pluginName
 * @returns {string}
 */
export function producerKindFor(pluginName) {
  const n = typeof pluginName === 'string' ? pluginName.trim() : ''
  if (!n) throw new Error('producerKindFor: 插件名必须是非空字符串')
  return n.startsWith(PRODUCER_PREFIX) ? n : PRODUCER_PREFIX + n
}

/**
 * 产出**合规的** source 对象 —— 全仓唯一的生产者入口。
 *
 * 为什么不各写各的：事故根因就是"某一处手写了 kind: 'plugin'"，而没有任何单点
 * 可以拦住它。把产出收拢到一个函数后，未来的回归只需改这一处，静态审计也只需认这一处。
 *
 * @param {string} pluginName 插件名（对应插件入口的 `export const name`）
 * @param {Record<string, unknown>} [extra] 需要保留的元数据（form / summary 等）
 * @returns {{kind: string} & Record<string, unknown>}
 */
export function producerOwnedSource(pluginName, extra = {}) {
  const rest = { ...(extra ?? {}) }
  delete rest.kind
  delete rest[LEGACY_PLUGIN_KIND] // 退休包装字段：带上就是把 v4 拒收条件重新装回去
  return { kind: producerKindFor(pluginName), ...rest }
}

/**
 * 判定一个 source 对象是否会被 v4 拒收（本仓口径，比宿主更严：额外拒收 `plugin` 字段残留）。
 * @param {unknown} source
 * @returns {{ok: boolean, reason: string}}
 */
export function auditSource(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return { ok: false, reason: 'source 必须是对象' }
  }
  if (!isProducerOwnedKind(source.kind)) {
    return {
      ok: false,
      reason: `source.kind 必须是非空字符串且不得为 '${LEGACY_PLUGIN_KIND}'（v4 退休包装），实为 ${JSON.stringify(source.kind)}`,
    }
  }
  if (Object.hasOwn(source, LEGACY_PLUGIN_KIND)) {
    return { ok: false, reason: `source 残留退休字段 '${LEGACY_PLUGIN_KIND}'（本仓更严口径）` }
  }
  return { ok: true, reason: '' }
}

/**
 * 静态普查用判据：匹配"手写的 source kind 字面量"。
 * 用 REGEX_SOURCE 动态拼出，避免本文件自己被自己的判据扫成生产点。
 * @param {string} [flags]
 * @returns {RegExp}
 */
export function legacyKindLiteralPattern(flags = 'g') {
  return new RegExp(`kind\\s*:\\s*['"]${LEGACY_PLUGIN_KIND}['"]`, flags)
}
