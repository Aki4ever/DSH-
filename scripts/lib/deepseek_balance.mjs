/**
 * ==============================================================================
 * DeepSeek 余额探针（共享模块） deepseek_balance.mjs
 * ==============================================================================
 * 官方接口事实（已核实，勿再臆测）：
 *   GET https://api.deepseek.com/user/balance
 *   请求头 Authorization: Bearer <API_KEY>（Key 形如 sk-...）
 *   实测：用非 sk- 令牌调用返回 HTTP 401，响应体纯文本
 *         `Authentication Fails (auth header format should be Bearer sk-...)`
 *   200 响应 JSON：
 *     { "is_available": boolean,
 *       "balance_infos": [ { "currency": "CNY|USD",
 *                            "total_balance": string,
 *                            "granted_balance": string,
 *                            "topped_up_balance": string } ] }
 *   注意：金额字段是**字符串**，本模块统一转成 camelCase 但保持字符串原样，绝不做数值估算。
 *
 * 硬约束：
 *   1) 取不到就如实报错，禁止占位数字 / 随机数 / 估算值；
 *   2) 绝不打印、绝不返回明文密钥给调用方以外的输出路径；对外只暴露
 *      「是否找到凭据 + 来源名 + 长度」，见 describeApiKey()。
 *
 * 依赖：仅 node: 内置模块 + 全局 fetch（Node 18+），无第三方依赖。
 * ==============================================================================
 */

import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, isAbsolute, resolve } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

/** 官方余额接口地址（唯一权威出处，禁止改成其它域名）。 */
export const BALANCE_URL = 'https://api.deepseek.com/user/balance'

/** 本文件所在目录 → 工程根（scripts/lib → 工程根）。 */
const HERE = fileURLToPath(new URL('.', import.meta.url))
const PROJECT_ROOT = resolve(HERE, '..', '..')

/** DSH_HOME 默认 ~/.dsh。 */
export function resolveDshHome() {
  const h = process.env.DSH_HOME
  return h && h.trim() ? h.trim() : join(homedir(), '.dsh')
}

/**
 * 凭据来源顺序（严格按序探测，命中即返回）：
 *   ① 环境变量 DEEPSEEK_API_KEY
 *   ② 环境变量 DSH_DEEPSEEK_API_KEY
 *   ③ 工程内忽略文件 ./.secrets/deepseek_api_key
 *   ④ $DSH_HOME/.dsh-control/deepseek_api_key
 * 明确**不解析** ~/.dsh/.credentials.yaml（实测那里只有账号令牌，不是 sk- Key）。
 */
export function credentialSourceList() {
  return [
    { source: 'env:DEEPSEEK_API_KEY', kind: 'env' },
    { source: 'env:DSH_DEEPSEEK_API_KEY', kind: 'env' },
    { source: 'file:.secrets/deepseek_api_key', kind: 'file', path: join(process.cwd(), '.secrets', 'deepseek_api_key') },
    { source: 'file:.secrets/deepseek_api_key', kind: 'file', path: join(PROJECT_ROOT, '.secrets', 'deepseek_api_key') },
    { source: 'file:$DSH_HOME/.dsh-control/deepseek_api_key', kind: 'file', path: join(resolveDshHome(), '.dsh-control', 'deepseek_api_key') },
  ]
}

/** 只暴露来源名清单（供人类可读输出展示「已尝试过哪些来源」），不含任何值。 */
export function credentialSourceNames() {
  return [...new Set(credentialSourceList().map((x) => x.source))]
}

/** Key 形状校验：必须以 sk- 开头，去空白后长度 ≥ 20，且不得含换行（单行）。 */
function isValidKey(raw) {
  if (typeof raw !== 'string') return false
  const v = raw.trim()
  if (v.length < 20) return false
  if (!v.startsWith('sk-')) return false
  if (/[\r\n]/.test(v)) return false
  return true
}

/** 读一个纯文本单行 Key 文件；不存在 / 不可读 / 形状不合法一律返回 null（不抛异常）。 */
function readKeyFile(path) {
  try {
    if (!existsSync(path)) return null
    if (!statSync(path).isFile()) return null
    const raw = readFileSync(path, 'utf8')
    const firstLine = raw.split(/\r?\n/).map((s) => s.trim()).find((s) => s.length > 0)
    if (!firstLine) return null
    return isValidKey(firstLine) ? firstLine : null
  } catch {
    // 权限不足等：按「没找到」处理，绝不影响主流程。
    return null
  }
}

/**
 * 按序探测 API Key。
 * @returns {{ key: string, source: string } | null} 找不到返回 null（不抛异常）。
 */
export function resolveApiKey() {
  // ① ② 环境变量（顺序固定，先命中者胜）。
  const envSources = [
    { source: 'env:DEEPSEEK_API_KEY', value: process.env.DEEPSEEK_API_KEY },
    { source: 'env:DSH_DEEPSEEK_API_KEY', value: process.env.DSH_DEEPSEEK_API_KEY },
  ]
  for (const e of envSources) {
    if (e.value !== undefined && e.value !== '' && isValidKey(e.value)) {
      return { key: e.value.trim(), source: e.source }
    }
  }
  // ③ ④ 工程内忽略文件约定路径 + $DSH_HOME 控制目录。
  return resolveKeyFromFiles()
}

/** 文件来源探测（顺序：cwd/.secrets → 工程根/.secrets → $DSH_HOME/.dsh-control）。 */
function resolveKeyFromFiles() {
  const candidates = [
    { source: 'file:.secrets/deepseek_api_key', path: join(process.cwd(), '.secrets', 'deepseek_api_key') },
    { source: 'file:.secrets/deepseek_api_key', path: join(PROJECT_ROOT, '.secrets', 'deepseek_api_key') },
    { source: 'file:$DSH_HOME/.dsh-control/deepseek_api_key', path: join(resolveDshHome(), '.dsh-control', 'deepseek_api_key') },
  ]
  const seen = new Set()
  for (const c of candidates) {
    const abs = isAbsolute(c.path) ? c.path : resolve(c.path)
    if (seen.has(abs)) continue
    seen.add(abs)
    const key = readKeyFile(abs)
    if (key) return { key, source: c.source }
  }
  return null
}

/**
 * 只输出「是否找到凭据 + 来源名 + 长度」，**永不输出值本身**。
 * @returns {{ found: boolean, source: string | null, length: number, tried: string[] }}
 */
export function describeApiKey() {
  const cred = resolveApiKey()
  return {
    found: Boolean(cred),
    source: cred ? cred.source : null,
    length: cred ? cred.key.length : 0,
    tried: credentialSourceNames(),
  }
}

/** 兜底脱敏：任何进入日志/错误的文本里出现的 sk- 令牌一律打码。 */
export function maskSecrets(text) {
  if (typeof text !== 'string') return text
  return text.replace(/sk-[A-Za-z0-9_\-]{6,}/g, 'sk-***')
}

/** 金额字段在官方响应里是字符串；保持字符串，仅做空值归一，绝不 parseFloat 后再格式化。 */
function asMoneyString(v) {
  return typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v)
}

/**
 * 真实调用官方余额接口。
 * 错误分类 errorKind：no-credential（未配置 Key）/ unauthorized（401）/ network（超时或网络异常）/ bad-response（非 200 或结构不符）。
 *
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<{
 *   ok: boolean,
 *   httpStatus: number | null,
 *   isAvailable: boolean | null,      // 官方字段 is_available
 *   balances: Array<{ currency: string, totalBalance: string, grantedBalance: string, toppedUpBalance: string }>,
 *   errorKind: 'no-credential' | 'unauthorized' | 'network' | 'bad-response' | null,
 *   errorMessage: string | null,
 *   source: string | null
 * }>}
 */
export async function fetchBalance({ timeoutMs = 15000 } = {}) {
  const cred = resolveApiKey()
  if (!cred) {
    return {
      ok: false,
      httpStatus: null,
      isAvailable: null,
      balances: [],
      errorKind: 'no-credential',
      errorMessage: '未找到可用凭据（已尝试 DEEPSEEK_API_KEY / DSH_DEEPSEEK_API_KEY / .secrets/deepseek_api_key / $DSH_HOME/.dsh-control/deepseek_api_key）',
      source: null,
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(BALANCE_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cred.key}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
    const httpStatus = res.status
    const bodyText = await res.text()

    if (httpStatus === 401) {
      return {
        ok: false,
        httpStatus,
        isAvailable: null,
        balances: [],
        errorKind: 'unauthorized',
        errorMessage: `HTTP 401：${maskSecrets(bodyText).slice(0, 200)}`,
        source: cred.source,
      }
    }
    if (!res.ok) {
      return {
        ok: false,
        httpStatus,
        isAvailable: null,
        balances: [],
        errorKind: 'bad-response',
        errorMessage: `HTTP ${httpStatus}：${maskSecrets(bodyText).slice(0, 200)}`,
        source: cred.source,
      }
    }

    let data
    try {
      data = JSON.parse(bodyText)
    } catch {
      return {
        ok: false,
        httpStatus,
        isAvailable: null,
        balances: [],
        errorKind: 'bad-response',
        errorMessage: '响应不是合法 JSON',
        source: cred.source,
      }
    }

    if (typeof data?.is_available !== 'boolean' || !Array.isArray(data?.balance_infos)) {
      return {
        ok: false,
        httpStatus,
        isAvailable: null,
        balances: [],
        errorKind: 'bad-response',
        errorMessage: '响应结构不符：缺 is_available(boolean) 或 balance_infos(array)',
        source: cred.source,
      }
    }

    return {
      ok: true,
      httpStatus,
      isAvailable: data.is_available,
      balances: data.balance_infos.map((b) => ({
        currency: String(b?.currency ?? ''),
        totalBalance: asMoneyString(b?.total_balance),
        grantedBalance: asMoneyString(b?.granted_balance),
        toppedUpBalance: asMoneyString(b?.topped_up_balance),
      })),
      errorKind: null,
      errorMessage: null,
      source: cred.source,
    }
  } catch (err) {
    const isAbort = err && (err.name === 'AbortError' || err.name === 'TimeoutError')
    return {
      ok: false,
      httpStatus: null,
      isAvailable: null,
      balances: [],
      errorKind: 'network',
      errorMessage: `${isAbort ? `请求超时（${timeoutMs}ms）` : '网络异常'}：${maskSecrets(String(err?.message ?? err))}`,
      source: cred.source,
    }
  } finally {
    clearTimeout(timer)
  }
}
