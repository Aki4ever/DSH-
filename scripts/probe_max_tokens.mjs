/**
 * 探测服务端对 max_tokens 的接受范围。
 * 密钥由脚本内部从 .credentials.yaml 读取，**不打印、不写日志**。
 * 单次请求要求极短回复，因此不会产生大量输出消耗。
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const HARNESS = '/Volumes/DSH Desktop/DSH Desktop.app/Contents/Resources/runtime/harness'
const require = createRequire(import.meta.url)
const yaml = require(`${HARNESS}/node_modules/yaml/dist/index.js`)

const HOME = process.env.DSH_HOME
const cred = yaml.parse(readFileSync(`${HOME}/.credentials.yaml`, 'utf8'))
const KEY = cred?.refs?.MIDPRO_API_KEY
if (!KEY) { console.error('❌ 未取到密钥'); process.exit(1) }

const BASE = process.env.PROBE_BASE || 'http://192.168.1.200:8080/v1'
const MODEL = process.env.PROBE_MODEL || 'DS/DeepSeek V4.1 Flash'

async function probe(v) {
  const t0 = Date.now()
  try {
    const r = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: '回复：好' }],
        max_tokens: v,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    })
    const txt = await r.text()
    let note
    try {
      const j = JSON.parse(txt)
      note = j.error ? `❌ ${JSON.stringify(j.error).slice(0, 130)}` : `✅ usage=${JSON.stringify(j.usage || {})}`
    } catch { note = txt.slice(0, 130) }
    return { v, status: r.status, ms: Date.now() - t0, note }
  } catch (e) {
    return { v, status: 'ERR', ms: Date.now() - t0, note: String(e.message).slice(0, 130) }
  }
}

const vals = [32768, 131072, 196608, 262144, 524288, 1048576, 2097152]
console.log(`服务端：${BASE}`)
console.log(`模型：${MODEL}（密钥已载入，长度 ${KEY.length}）\n`)
console.log('max_tokens      状态    耗时      结果')
console.log('─'.repeat(78))
for (const v of vals) {
  const r = await probe(v)
  console.log(`${String(v).padStart(9)}  ${String(r.status).padEnd(6)} ${String(r.ms + 'ms').padEnd(9)} ${r.note}`)
}
