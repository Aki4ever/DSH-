/**
 * 长输出触顶实测（流式版）：验证单次回复到底能有多长。
 *
 * 为什么必须用流式：
 *   非流式实测两次都只吐 3~4k token 就 stop（且几乎全是推理 token），
 *   强烈提示"非流式"路径存在约 4k 的实际输出上限。
 *   而 DSH 真实调用走的是流式，所以只有流式数据才能反映实际体验。
 *
 * 输出指标：
 *   - 正文增量速度：用来判断是否被截断（速度骤降/归零 = 到达边界）；
 *   - 累计输出 token：最终能到多少；
 *   - 生成速率：总 token / 总耗时；
 *   - 首个与末个数据块的间隔：粗判是否有长时间停顿。
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
const maxTokens = Number(process.env.PROBE_MAX_TOKENS || 131072)

// 任务：要求连续输出大量结构化内容（无需深度推理，但确实需要长输出）
const PROMPT = [
  '请编写一个 Python 脚本，其中定义一个包含 1200 个字典元素的列表，',
  '每个字典描述一位虚构用户，字段为 id、name、email、age、city，取值各不相同。',
  '',
  '硬性要求：',
  '1. 必须把 1200 个元素全部逐行写出，不得使用循环、不得使用省略号、不得写"以此类推"；',
  '2. 不要写任何解释性文字、不要写前言或总结；',
  '3. 直接从代码开始输出，连续输出到最后一个元素结束。',
].join('\n')

console.log(`模型：${MODEL}（流式）`)
console.log(`请求 max_tokens = ${maxTokens}`)
console.log(`开始：${new Date().toLocaleTimeString()}\n`)

const t0 = Date.now()
let r
try {
  r = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL, messages: [{ role: 'user', content: PROMPT }],
      max_tokens: maxTokens, stream: true,
      stream_options: { include_usage: true },
    }),
    signal: AbortSignal.timeout(1200000),
  })
} catch (e) { console.log(`❌ 请求失败：${e.message}`); process.exit(1) }

if (!r.ok) { console.log(`❌ HTTP ${r.status}: ${(await r.text()).slice(0, 250)}`); process.exit(1) }

const decoder = new TextDecoder()
let buf = ''
let contentChars = 0, reasoningChars = 0
let usage = null, finishReason = null
let chunks = 0, lastChunkAt = Date.now(), maxGap = 0
let firstChunkAt = null, lastProgress = 0

for await (const part of r.body) {
  buf += decoder.decode(part, { stream: true })
  const lines = buf.split('\n')
  buf = lines.pop() ?? ''
  for (const line of lines) {
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (!payload || payload === '[DONE]') continue
    let ev
    try { ev = JSON.parse(payload) } catch { continue }
    if (ev.usage) usage = ev.usage
    const d = ev.choices?.[0]?.delta
    if (d?.content) contentChars += d.content.length
    if (d?.reasoning_content) reasoningChars += d.reasoning_content.length
    if (ev.choices?.[0]?.finish_reason) finishReason = ev.choices[0].finish_reason
    const now = Date.now()
    if (firstChunkAt === null) firstChunkAt = now
    const gap = now - lastChunkAt
    if (gap > maxGap) maxGap = gap
    lastChunkAt = now
    chunks++
    // 每 5 秒报一次进度
    if (now - lastProgress > 5000) {
      lastProgress = now
      const secs = (now - t0) / 1000
      console.log(`  [${secs.toFixed(0)}s] 数据块 ${chunks} · 正文 ${contentChars} 字符 · 推理 ${reasoningChars} 字符`)
    }
  }
}

const secs = (Date.now() - t0) / 1000
const u = usage || {}
const completion = u.completion_tokens ?? 0
const reasoningTok = u.completion_tokens_details?.reasoning_tokens ?? 0

console.log(`\n=== 实测结果（流式）===`)
console.log(`HTTP ${r.status} · 总耗时 ${secs.toFixed(1)} 秒`)
console.log(`数据块数          = ${chunks}`)
console.log(`prompt_tokens     = ${u.prompt_tokens}`)
console.log(`completion_tokens = ${completion}`)
console.log(`  其中 reasoning  = ${reasoningTok}`)
console.log(`  正文部分        = ${completion - reasoningTok}`)
console.log(`finish_reason     = ${finishReason}`)
console.log(`正文字符数        = ${contentChars}`)
console.log(`推理字符数        = ${reasoningChars}`)
console.log(`生成速率          = ${(completion / secs).toFixed(1)} token/秒（总）`)
if (firstChunkAt) console.log(`首块延迟          = ${((firstChunkAt - t0) / 1000).toFixed(2)} 秒`)
console.log(`最大块间隔        = ${maxGap} ms`)

console.log('\n=== 判定 ===')
if (completion > 32768) {
  console.log(`✅ 单次输出 ${completion} 已突破旧上限 32768 —— 上限提升真实生效`)
} else if (finishReason === 'length') {
  console.log(`⚠️ 被截断于 ${completion}（finish_reason=length），仍受某个上限约束`)
} else {
  console.log(`ℹ️ 模型自然结束于 ${completion}（reasoning=${reasoningTok}），未触顶`)
}
