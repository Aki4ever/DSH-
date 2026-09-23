/**
 * 长输出实测探针：验证 max_tokens 提高后单次回复能否突破旧上限（32768）。
 *
 * 判定逻辑：
 *   - 若 completion_tokens 明显 > 32768 且 finish_reason 不是 length → 上限确实生效；
 *   - 若正好卡在 32768 → 旧上限仍在起作用（改动无效）；
 *   - 同时记录耗时，用于估算真实生成速率（每秒 token 数）。
 *
 * 密钥由脚本内部读取，不打印。
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const HARNESS = '/Volumes/DSH Desktop/DSH Desktop.app/Contents/Resources/runtime/harness'
const yaml = require(`${HARNESS}/node_modules/yaml/dist/index.js`)
const KEY = yaml.parse(readFileSync(process.env.DSH_HOME + '/.credentials.yaml', 'utf8'))?.refs?.MIDPRO_API_KEY
if (!KEY) { console.error('❌ 未取到密钥'); process.exit(1) }

const BASE = 'http://192.168.1.200:8080/v1'
const MODEL = 'DS/DeepSeek V4.1 Flash'

// 任务设计要点（第一版失败后总结）：
//   第一版要求"把同一句话重复 4000 遍"，结果模型判定该任务无意义，
//   把 token 全花在推理上（reasoning=4044 / completion=4067），正文只吐 36 字符就 stop，
//   因此**无法用于验证长度上限**。
//   本版改为"逐章节抄写一首诗并编号"：内容确定、无歧义、无需深度推理，
//   同时模型有正当理由持续输出长文本，能真正把 max_tokens 用满。
const POEM = '床前明月光，疑是地上霜。举头望明月，低头思故乡。'
const REPEAT = 4000
const PROMPT = [
  '这是一次输出长度压力测试，目的是测量接口的单次输出上限，请务必完整执行。',
  '',
  `请把下面这首诗逐字抄写 ${REPEAT} 遍，每一遍单独占一行，行首写上序号，格式严格如下：`,
  '',
  `1. ${POEM}`,
  `2. ${POEM}`,
  '……',
  '',
  '硬性要求：',
  `1. 必须从第 1 行连续输出到第 ${REPEAT} 行，不得跳过、不得省略、不得写"以此类推"；`,
  '2. 不要写任何前言、说明、总结或结尾语；',
  '3. 不要在输出中间停顿或询问，直接连续输出到最后一行。',
].join('\n')

const maxTokens = Number(process.env.PROBE_MAX_TOKENS || 131072)

console.log(`模型：${MODEL}`)
console.log(`请求 max_tokens = ${maxTokens}`)
console.log('开始时间：' + new Date().toLocaleTimeString())
console.log('（这是真实长输出请求，可能需要数分钟，请等待）\n')

const t0 = Date.now()
let r
try {
  r = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: PROMPT }],
      max_tokens: maxTokens,
      stream: false,
    }),
    signal: AbortSignal.timeout(900000),   // 15 分钟
  })
} catch (e) {
  console.log(`❌ 请求失败：${e.message}`)
  process.exit(1)
}

const secs = (Date.now() - t0) / 1000
const txt = await r.text()
console.log(`HTTP ${r.status} · 耗时 ${secs.toFixed(1)} 秒`)

let j
try { j = JSON.parse(txt) } catch { console.log('❌ 响应非 JSON：', txt.slice(0, 300)); process.exit(1) }

if (j.error) { console.log('❌ 服务端报错：', JSON.stringify(j.error)); process.exit(1) }

const u = j.usage || {}
const choice = j.choices?.[0] || {}
const content = choice.message?.content ?? ''
const reasoning = choice.message?.reasoning_content ?? ''
const completion = u.completion_tokens ?? 0
const reasoningTok = u.completion_tokens_details?.reasoning_tokens ?? 0

console.log('\n=== 实测结果 ===')
console.log(`prompt_tokens     = ${u.prompt_tokens}`)
console.log(`completion_tokens = ${completion}`)
console.log(`  其中 reasoning  = ${reasoningTok}`)
console.log(`finish_reason     = ${choice.finish_reason}`)
console.log(`正文字符数        = ${content.length}`)
console.log(`正文行数          = ${content ? content.split('\n').length : 0}`)
console.log(`推理内容字符数    = ${reasoning.length}`)
console.log(`生成速率          = ${(completion / secs).toFixed(1)} token/秒`)

console.log('\n=== 判定 ===')
if (completion > 32768) {
  console.log(`✅ 单次输出 ${completion} 已突破旧上限 32768 —— 提高 max_tokens 真实生效`)
} else if (choice.finish_reason === 'length') {
  console.log(`⚠️ 输出被截断在 ${completion}，仍受某个上限约束（需排查是客户端还是服务端）`)
} else {
  console.log(`ℹ️ 模型自然结束于 ${completion}（未触顶），本次未验证到上限边界。`
    + `\n   要触顶需更长的任务；但至少证明单次可输出 ${completion} token。`)
}
