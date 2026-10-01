#!/usr/bin/env node
/**
 * ==============================================================================
 * DeepSeek 官方 API 文档 · 本地知识库同步器 (sync_api_docs.mjs)
 * ==============================================================================
 * 需求依据：REQ-091 / R3（API 文档知识库，任务代号 KB-API）。
 * 产出物：knowledge/api/deepseek/{index.json, pages/*.md}
 *
 * 它解决什么问题：
 *   官方站 `https://api-docs.deepseek.com/zh-cn/` **没有** /llms.txt（实测该 URL
 *   返回英文首页 HTML，不是机器可读索引），所以页清单**只能从侧边导航抓**。
 *   本脚本把「页清单 + 正文镜像 + 逐页指纹」三件事一次做齐，并且做到：
 *     · 抓不到就**显式报错并非 0 退出**，绝不写"大概是这个内容"；
 *     · 本地正文一旦被人手改，`--check` 立刻判不通过（sha256 有牙）；
 *     · 站点正文一变，`--diff` 立刻列出是哪几页变了。
 *
 * 用法（全部命令都在仓库根目录执行）：
 *   node scripts/sync_api_docs.mjs --sync      # 真抓：重写 pages/*.md 与 index.json
 *   node scripts/sync_api_docs.mjs --check     # 只判本地：结构 / 页数 / 逐页 sha256
 *   node scripts/sync_api_docs.mjs --diff      # 只比站点：列出正文指纹变化的页
 *   node scripts/sync_api_docs.mjs selftest    # 自检（含反向用例：篡改/删页/伪造索引必须判红）
 *
 * 退出码：
 *   0 = 判定通过（全过）
 *   1 = 判定不通过 / 网络抓取失败 / 网络不可用（**绝不折成通过**）
 *   2 = 用法错误（命令写错、参数缺失）
 *
 * 依赖：只用 node: 内置模块（fs / path / url / crypto / os）+ 工程内
 *       `scripts/lib/atomic_lock.mjs`（写 index.json 时套原子锁，防并发脏写）。
 *
 * 页清单口径（唯一权威：官方侧边导航）：
 *   入口三页各抓一次侧边栏 → 合并去重 → 按 R3 的 D3 默认裁决裁剪：
 *   保留「快速开始（非 Agent 接入页） + API 文档接口页 + 更新日志」，
 *   **排除** /zh-cn/quick_start/agent_integrations/*（与 DSH 工程无关，避免噪音）。
 * ==============================================================================
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, mkdtempSync } from 'node:fs'
import { join, dirname, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { withLockSync } from './lib/atomic_lock.mjs'

// ── 一、常量与路径 ───────────────────────────────────────────────────────────

const HERE = dirname(fileURLToPath(import.meta.url))
/** 仓库根目录（本脚本位于 scripts/ 下）。 */
export const REPO_ROOT = join(HERE, '..')
/** 知识库根目录。 */
export const KB_DIR = join(REPO_ROOT, 'knowledge', 'api', 'deepseek')
/** 机读页清单。 */
export const INDEX_FILE = join(KB_DIR, 'index.json')
/** 逐页正文镜像目录。 */
export const PAGES_DIR = join(KB_DIR, 'pages')
/** 索引清单结构版本（字段口径变更时递增）。 */
export const SCHEMA_VERSION = '1.0.0'
/** 来源站（中文站首页）。 */
export const SOURCE_SITE = 'https://api-docs.deepseek.com/zh-cn/'
/** 页数下限（低于它视为清单抓残了，判不通过）。 */
export const MIN_PAGES = 10
/** 抓取超时（毫秒）。 */
const FETCH_TIMEOUT_MS = 30_000
/** 抓取用的 UA：不带浏览器 UA 会被站点拒。 */
const USER_AGENT = 'Mozilla/5.0 (compatible; DSH-APIDocs-Mirror/1.0; +local-knowledge-base)'
/** 正文与页头的分界标记：标记之后才是"参与正文指纹计算"的内容。 */
export const BODY_MARK = '<!-- ===== 正文开始（以下内容参与正文指纹计算） ===== -->'

/**
 * 侧边导航入口：每个入口页的侧边栏代表一个分区。
 * 只抓这三个入口，就能覆盖 R3 约定要镜像的全部分区。
 */
const NAV_ENTRIES = [
  { url: SOURCE_SITE, group: '快速开始' },
  { url: 'https://api-docs.deepseek.com/zh-cn/api/create-chat-completion/', group: 'API 文档' },
  { url: 'https://api-docs.deepseek.com/zh-cn/updates/', group: '更新日志' },
]

/** 明确排除的分区前缀（D3 默认裁决：Agent 接入页与 DSH 工程无关）。 */
const EXCLUDE_PREFIXES = ['/zh-cn/quick_start/agent_integrations/']
/** 纳入范围的分区前缀（其余一律不进知识库，避免噪音）。 */
const INCLUDE_PREFIXES = ['/zh-cn/', '/zh-cn/quick_start/', '/zh-cn/api/', '/zh-cn/updates']

// ── 二、HTML → Markdown 转换（零第三方依赖，纯确定性） ───────────────────────
//
// 为什么自己写：本工程禁止引入第三方依赖；而且转换必须是**确定性**的，
// 否则同一份站点正文会算出两个指纹，`--diff` 就会天天误报。

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
/** 渲染时整棵跳过的标签（导航、脚本、图标等非正文噪音）。 */
const SKIP_TAGS = new Set(['script', 'style', 'svg', 'nav', 'noscript', 'iframe', 'head', 'template', 'button', 'select', 'textarea', 'form', 'canvas', 'video', 'audio', 'object', 'map', 'aside'])
/** 天然占据整行的标签（用于判断容器是块级还是行内）。 */
const BLOCK_TAGS = new Set(['p', 'div', 'section', 'article', 'header', 'footer', 'main', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'blockquote', 'pre', 'details', 'summary', 'figure', 'figcaption', 'dl', 'dt', 'dd', 'hr'])

/** 常见 HTML 实体表（只列工程内会用到的，未命中则原样保留）。 */
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…',
  mdash: '—', ndash: '–', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
  middot: '·', times: '×', copy: '©', reg: '®', trade: '™',
  rarr: '→', larr: '←', uarr: '↑', darr: '↓', le: '≤', ge: '≥', ne: '≠',
  minus: '−', plusmn: '±', deg: '°', sup2: '²', sup3: '³', frac12: '½',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', epsilon: 'ε',
  theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ',
  phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Omega: 'Ω', Sigma: 'Σ',
  Phi: 'Φ', Psi: 'Ψ', Lambda: 'Λ', Pi: 'Π', Mu: 'Μ',
}

/** 解码 HTML 实体（数字实体 + 常见命名实体）。 */
export function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (all, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return all
      try { return String.fromCodePoint(code) } catch { return all }
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body) ? NAMED_ENTITIES[body] : all
  })
}

/** 解析标签属性串 → 小写键的属性表。 */
function parseAttrs(raw) {
  const attrs = {}
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let m
  while ((m = re.exec(raw || ''))) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '')
  }
  return attrs
}

/**
 * 把 HTML 解析成轻量树。只做"够用"的容错：闭合标签找不到就忽略，
 * 遇到 void 标签不入栈。**不做**任何依赖运行时状态的推断，保证确定性。
 */
export function parseHtml(html) {
  const root = { type: 'element', tag: '#root', attrs: {}, children: [] }
  const stack = [root]
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![a-zA-Z][^>]*>|<\/([a-zA-Z][a-zA-Z0-9:-]*)\s*>|<([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g
  let last = 0
  let m
  while ((m = re.exec(html)) !== null) {
    if (m.index > last) {
      const text = html.slice(last, m.index)
      if (text) stack[stack.length - 1].children.push({ type: 'text', value: text })
    }
    last = re.lastIndex
    if (m[1]) {
      const tag = m[1].toLowerCase()
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) { stack.length = i; break }
      }
    } else if (m[2]) {
      const tag = m[2].toLowerCase()
      const raw = m[3] || ''
      const el = { type: 'element', tag, attrs: parseAttrs(raw), children: [] }
      stack[stack.length - 1].children.push(el)
      if (!/\/\s*$/.test(raw) && !VOID_TAGS.has(tag)) stack.push(el)
    }
  }
  if (last < html.length) {
    const text = html.slice(last)
    if (text) stack[stack.length - 1].children.push({ type: 'text', value: text })
  }
  return root
}

function isEl(n) { return n && n.type === 'element' }
function cls(el) { return String((el.attrs && el.attrs.class) || '').split(/\s+/).filter(Boolean) }
function hasClass(el, c) { return cls(el).includes(c) }
/** 元素自身的纯文本（递归，不做 Markdown 化）。 */
export function textOf(el) {
  if (!el) return ''
  if (el.type === 'text') return decodeEntities(el.value)
  let out = ''
  for (const c of el.children || []) out += textOf(c)
  return out
}
/** 只在行内语境使用的文本化：压缩空白并把裸 `<` 转义成实体。 */
function inlineText(el, ctx) {
  return renderChildren(el, ctx).replace(/\s+/g, ' ').trim()
}
/**
 * 代码块语境使用的原样文本：只解码实体，绝不压缩空白。
 * 注意：官方站的高亮代码块用 `<br>` 断行（不是文本里的换行），
 * 漏掉这一步会把整段 JSON 压成一行 —— 正文因此变样，指纹也会失真。
 */
function rawText(el) {
  if (!el) return ''
  if (el.type === 'text') return decodeEntities(el.value).replace(/\r\n?/g, '\n')
  if (el.tag === 'br') return '\n'
  let out = ''
  for (const c of el.children || []) out += rawText(c)
  return out
}

/** 元素是否含块级子元素（决定强调标签能否直接包住它）。 */
function hasBlockChild(el) {
  return (el.children || []).some((c) => isEl(c) && BLOCK_TAGS.has(c.tag))
}
/** 在子树里按标签名找第一个元素。 */
function findFirst(el, tag) {
  for (const c of el.children || []) {
    if (!isEl(c)) continue
    if (c.tag === tag) return c
    const deep = findFirst(c, tag)
    if (deep) return deep
  }
  return null
}
/** 在整棵树里按「标签名 + class 命中」找第一个元素。 */
export function findByClass(node, tag, className) {
  if (isEl(node) && (!tag || node.tag === tag) && hasClass(node, className)) return node
  for (const c of node.children || []) {
    if (!isEl(c)) continue
    const hit = findByClass(c, tag, className)
    if (hit) return hit
  }
  return null
}
/** 在整棵树里按属性精确匹配找第一个元素。 */
function findByAttr(node, tag, attr, value) {
  if (isEl(node) && (!tag || node.tag === tag) && node.attrs[attr] === value) return node
  for (const c of node.children || []) {
    if (!isEl(c)) continue
    const hit = findByAttr(c, tag, attr, value)
    if (hit) return hit
  }
  return null
}

/** 把一棵子树渲染成 Markdown。ctx 只带一个状态：当前列表缩进深度。 */
function renderChildren(el, ctx) {
  let out = ''
  for (const c of el.children || []) out += renderNode(c, ctx)
  return out
}

function renderNode(node, ctx) {
  if (node.type === 'text') {
    // 行内裸 `<` 必须转义，否则会被 Markdown 当成 HTML 标签吞掉
    return decodeEntities(node.value).replace(/</g, '&lt;')
  }
  const el = node
  if (SKIP_TAGS.has(el.tag)) return ''
  if (el.tag === 'a' && hasClass(el, 'hash-link')) return ''

  switch (el.tag) {
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
      const text = inlineText(el, ctx)
      if (!text) return ''
      return `${'#'.repeat(Number(el.tag[1]))} ${text}\n\n`
    }
    case 'p': {
      const text = inlineText(el, ctx)
      return text ? `${text}\n\n` : ''
    }
    case 'br': return '\n'
    case 'hr': return '---\n\n'
    case 'strong': case 'b': {
      // 官方站存在 `<b><table>` 这类"强调标签包住整块表格"的写法：
      // 用行内方式摊平会把整张表压成一行的加粗文本，所以含块级子元素时按块流渲染
      if (hasBlockChild(el)) return renderChildren(el, ctx)
      const t = inlineText(el, ctx)
      return t ? `**${t}**` : ''
    }
    case 'em': case 'i': {
      if (hasBlockChild(el)) return renderChildren(el, ctx)
      const t = inlineText(el, ctx)
      return t ? `*${t}*` : ''
    }
    case 'del': case 's': {
      if (hasBlockChild(el)) return renderChildren(el, ctx)
      const t = inlineText(el, ctx)
      return t ? `~~${t}~~` : ''
    }
    case 'code': {
      const t = rawText(el).replace(/\n/g, ' ')
      if (!t) return ''
      const fence = t.includes('`') ? '``' : '`'
      return `${fence}${t}${fence}`
    }
    case 'pre': {
      const code = rawText(el).replace(/\s+$/, '')
      if (!code.trim()) return ''
      const langMatch = /language-([A-Za-z0-9_+-]+)/.exec(el.attrs.class || '') || /language-([A-Za-z0-9_+-]+)/.exec(findFirst(el, 'code') ? (findFirst(el, 'code').attrs.class || '') : '')
      const lang = langMatch ? langMatch[1] : ''
      const fence = code.includes('```') ? '~~~~' : '```'
      return `${fence}${lang}\n${code}\n${fence}\n\n`
    }
    case 'a': {
      const href = el.attrs.href || ''
      const t = inlineText(el, ctx)
      if (!href) return t
      if (!t) return href
      return `[${t}](${href})`
    }
    case 'img': {
      const src = el.attrs.src || ''
      if (!src) return ''
      return `![${el.attrs.alt || ''}](${src})`
    }
    case 'ul': case 'ol': {
      const items = (el.children || []).filter((c) => isEl(c) && c.tag === 'li')
      if (!items.length) return renderChildren(el, ctx)
      const depth = ctx.listDepth || 0
      const indent = '  '.repeat(depth)
      const lines = []
      let idx = 1
      for (const li of items) {
        const raw = renderChildren(li, { ...ctx, listDepth: depth + 1 })
        const chunks = raw.split('\n').map((s) => s.replace(/\s+$/, '')).filter((s) => s.trim() !== '')
        if (!chunks.length) { idx++; continue }
        const marker = el.tag === 'ol' ? `${idx}. ` : '- '
        lines.push(indent + marker + chunks[0].trim())
        for (const c of chunks.slice(1)) lines.push(indent + '  ' + c.trim())
        idx++
      }
      return lines.length ? lines.join('\n') + '\n\n' : ''
    }
    case 'li': return renderChildren(el, ctx)
    case 'blockquote': {
      const inner = renderChildren(el, ctx).trim()
      if (!inner) return ''
      return inner.split('\n').map((l) => `> ${l}`.replace(/\s+$/, '')).join('\n') + '\n\n'
    }
    case 'table': {
      const trs = []
      const walk = (n) => {
        for (const c of n.children || []) {
          if (!isEl(c)) continue
          if (c.tag === 'tr') trs.push(c)
          else walk(c)
        }
      }
      walk(el)
      const cellText = (cell) => renderChildren(cell, ctx)
        .replace(/\n+/g, '<br>')
        .replace(/\s+/g, ' ')
        .replace(/\|/g, '\\|')
        .trim()
      // 官方站的表格大量使用 colspan / rowspan（价格表就是），
      // 不摊平成矩阵就会串行串列，把价格口径写错 —— 这比丢格式严重得多
      const matrix = []
      let r = 0
      for (const tr of trs) {
        const cells = (tr.children || []).filter((c) => isEl(c) && (c.tag === 'td' || c.tag === 'th'))
        if (!cells.length) continue
        if (!matrix[r]) matrix[r] = []
        let c = 0
        for (const cell of cells) {
          while (matrix[r][c] !== undefined) c++
          const text = cellText(cell)
          const cs = Math.max(1, parseInt(cell.attrs.colspan || '1', 10) || 1)
          const rs = Math.max(1, parseInt(cell.attrs.rowspan || '1', 10) || 1)
          for (let j = 0; j < rs; j++) {
            if (!matrix[r + j]) matrix[r + j] = []
            for (let i = 0; i < cs; i++) matrix[r + j][c + i] = i === 0 && j === 0 ? text : ''
          }
          c += cs
        }
        r++
      }
      const kept = matrix.filter((row) => Array.isArray(row) && row.length)
      if (!kept.length) return ''
      const width = Math.max(...kept.map((row) => row.length))
      const pad = (row) => {
        const a = []
        for (let i = 0; i < width; i++) a.push(row[i] === undefined ? '' : row[i])
        return a
      }
      const lines = ['| ' + pad(kept[0]).join(' | ') + ' |', '| ' + pad(kept[0]).map(() => '---').join(' | ') + ' |']
      for (const row of kept.slice(1)) lines.push('| ' + pad(row).join(' | ') + ' |')
      return lines.join('\n') + '\n\n'
    }
    case 'details': {
      const sum = (el.children || []).find((c) => isEl(c) && c.tag === 'summary')
      const rest = (el.children || []).filter((c) => !(isEl(c) && c.tag === 'summary'))
      const head = sum ? `**${inlineText(sum, ctx)}**\n\n` : ''
      return head + rest.map((c) => renderNode(c, ctx)).join('')
    }
    case 'summary': {
      const t = inlineText(el, ctx)
      return t ? `**${t}**\n\n` : ''
    }
    case 'dl': case 'dt': case 'dd': case 'thead': case 'tbody': case 'tr': case 'figure': case 'figcaption':
      return renderChildren(el, ctx)
    default: {
      // 容器：含块级子元素就按块流渲染，否则当行内透传
      const hasBlock = (el.children || []).some((c) => isEl(c) && BLOCK_TAGS.has(c.tag))
      const inner = renderChildren(el, ctx)
      if (hasBlock) return inner
      return inner
    }
  }
}

/** 收尾归一：压掉多余空行、行尾空格，保证结尾恰好一个换行。 */
export function normalizeMarkdown(md) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, ''))
  const out = []
  let blanks = 0
  for (const l of lines) {
    if (l.trim() === '') { blanks++; if (blanks > 1) continue } else blanks = 0
    out.push(l)
  }
  while (out.length && out[out.length - 1].trim() === '') out.pop()
  return out.join('\n') + '\n'
}

/**
 * 从整页 HTML 抽出**正文** Markdown。
 * 正文定位：优先 `.theme-doc-markdown`（Docusaurus 正文容器），
 * 抓不到就退回 `<article>`，再抓不到就退回 `<body>`。
 */
export function extractBodyMarkdown(html, title) {
  const tree = parseHtml(html)
  let host = findByClass(tree, 'div', 'theme-doc-markdown')
  if (!host) host = findFirst(tree, 'article')
  if (!host) host = findFirst(tree, 'body')
  if (!host) throw new Error('页面 HTML 里找不到正文容器（theme-doc-markdown / article / body 全缺失）')
  let md = renderNode(host, { listDepth: 0 })
  md = normalizeMarkdown(md)
  if (!md.trim()) throw new Error(`页面正文抽取结果为空：${title || ''}`)
  return md
}

// ── 三、抓取与指纹 ───────────────────────────────────────────────────────────

/** 十六进制 sha256。 */
export function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/** 抓一页 HTML；HTTP 非 200 一律抛错（绝不把错误页当正文落盘）。 */
async function fetchHtml(url) {
  let res
  try {
    res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml', 'accept-language': 'zh-CN,zh;q=0.9' },
    })
  } catch (e) {
    const err = new Error(`网络请求失败：${url} · ${e && e.message ? e.message : e}`)
    err.network = true
    throw err
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}：${url}`)
  return await res.text()
}

/** 从入口页的侧边导航抽取链接清单（含分区与子分组）。 */
export function collectNavLinks(html) {
  const tree = parseHtml(html)
  const nav = findByAttr(tree, 'nav', 'aria-label', '文档侧边栏')
  if (!nav) throw new Error('入口页里找不到侧边导航（nav[aria-label="文档侧边栏"]）')
  const links = []
  const walk = (node, labels) => {
    for (const c of node.children || []) {
      if (!isEl(c)) continue
      if (c.tag === 'li') {
        let label = null
        if (hasClass(c, 'menu__list-item-collapsible')) {
          const owner = findByClass(c, null, 'menu__link--sublist')
          if (owner) label = textOf(owner).trim()
        }
        labels.push(label)
        walk(c, labels)
        labels.pop()
        continue
      }
      if (c.tag === 'a' && hasClass(c, 'menu__link')) {
        const href = c.attrs.href || ''
        const title = textOf(c).trim()
        if (href && title) {
          const outer = labels.filter(Boolean)
          links.push({ href, title, subgroup: outer.length ? outer[outer.length - 1] : null })
        }
        continue
      }
      walk(c, labels)
    }
  }
  walk(nav, [])
  return links
}

/** 按 R3 的 D3 裁决裁剪页清单：去重 + 排除 Agent 接入页 + 只留纳入范围。 */
function filterNavLinks(links) {
  const seen = new Set()
  const out = []
  for (const l of links) {
    let p = String(l.href || '').split('#')[0].split('?')[0]
    if (!p.startsWith('/zh-cn')) continue
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
    if (p === '/zh-cn') p = '/zh-cn/' // 首页保留尾斜杠，作为唯一规范形
    if (seen.has(p)) continue
    if (EXCLUDE_PREFIXES.some((x) => p.startsWith(x))) continue
    if (!INCLUDE_PREFIXES.some((x) => p.startsWith(x))) continue
    seen.add(p)
    out.push({ sitePath: p, title: l.title, subgroup: l.subgroup || null })
  }
  return out
}

/** 站点路径 → 本地镜像文件名（机械映射，保证唯一与可预测）。 */
export function pageFileName(sitePath) {
  const body = sitePath.replace(/^\/+/, '').replace(/\/+$/, '')
  const slug = (body === '' ? 'index' : body).replace(/\//g, '__')
  return `${slug}.md`
}

/** 站点路径 → 规范 URL（除首页外一律带尾斜杠，与站点自身跳转一致）。 */
export function canonicalUrl(sitePath) {
  const base = 'https://api-docs.deepseek.com'
  if (sitePath === '/zh-cn/') return base + '/zh-cn/'
  return base + sitePath + '/'
}

/** 组装一页的镜像文件全文（页头元数据 + 正文），并返回记录所需字段。 */
function buildPageFile({ title, url, group, subgroup, body, fetchedAt }) {
  const bodySha256 = sha256(body)
  const header = [
    '<!-- ============================================================================',
    '     DeepSeek 官方文档本地镜像 · 页头元数据（以下内容不参与正文指纹计算）',
    '     ============================================================================ -->',
    '',
    `> - **页面标题**：${title}`,
    `> - **原始 URL**：${url}`,
    `> - **抓取时间**：${fetchedAt}`,
    `> - **所属分组**：${group}${subgroup ? ' / ' + subgroup : ''}`,
    `> - **正文 sha256**：\`${bodySha256}\``,
    `> - **正文字节数**：${Buffer.byteLength(body, 'utf8')}`,
    '',
    BODY_MARK,
  ].join('\n')
  const content = `${header}\n${body}`
  return { content, bodySha256, bodyBytes: Buffer.byteLength(body, 'utf8') }
}

/** 从镜像文件全文里切出正文（与写入时严格对称）。 */
export function extractBodyFromFile(content) {
  const i = content.indexOf(BODY_MARK)
  if (i < 0) return null
  return content.slice(i + BODY_MARK.length).replace(/^\n/, '')
}

// ── 四、--sync：真抓并落盘 ───────────────────────────────────────────────────

async function cmdSync() {
  console.log('🔎 DeepSeek 官方 API 文档 · 同步（真抓，不写假内容）')
  console.log('-----------------------------------------')

  // 第 1 步：抓三个入口页的侧边导航 → 合并成页清单
  const collected = []
  for (const entry of NAV_ENTRIES) {
    let html
    try {
      html = await fetchHtml(entry.url)
    } catch (e) {
      console.error(`❌ 入口页抓取失败（页清单无法从侧边导航得到）：${entry.url}`)
      console.error(`   原因：${e.message}`)
      console.error('   处理：网络恢复后重跑 `node scripts/sync_api_docs.mjs --sync`；本轮未写入任何文件。')
      process.exit(1)
    }
    let links
    try {
      links = collectNavLinks(html)
    } catch (e) {
      console.error(`❌ 侧边导航解析失败：${entry.url} · ${e.message}`)
      process.exit(1)
    }
    for (const l of filterNavLinks(links)) collected.push({ ...l, group: entry.group })
    console.log(`   · 入口 ${entry.group}：侧边导航取到 ${links.length} 条，裁剪后 ${filterNavLinks(links).length} 条`)
  }

  // 去重：同一页可能在多个入口的导航里出现，以先出现的分组为准
  const byPath = new Map()
  for (const p of collected) if (!byPath.has(p.sitePath)) byPath.set(p.sitePath, p)
  const plan = [...byPath.values()]
  if (plan.length < MIN_PAGES) {
    console.error(`❌ 页清单只有 ${plan.length} 页（下限 ${MIN_PAGES} 页）→ 视为侧边导航抓残，拒绝写入。`)
    process.exit(1)
  }

  // 第 2 步：逐页抓正文
  mkdirSync(PAGES_DIR, { recursive: true })
  const fetchedAt = new Date().toISOString()
  const pages = []
  const failures = []
  const keptFiles = new Set()

  for (const item of plan) {
    const url = canonicalUrl(item.sitePath)
    const file = pageFileName(item.sitePath)
    try {
      const html = await fetchHtml(url)
      const body = extractBodyMarkdown(html, item.title)
      const built = buildPageFile({ title: item.title, url, group: item.group, subgroup: item.subgroup, body, fetchedAt })
      const filePath = join(PAGES_DIR, file)
      writeFileSync(filePath, built.content, 'utf8')
      keptFiles.add(file)
      pages.push({
        path: `pages/${file}`,
        sitePath: item.sitePath,
        url,
        title: item.title,
        group: item.group,
        subgroup: item.subgroup,
        sha256: sha256(built.content),
        short: sha256(built.content).slice(0, 12),
        bytes: Buffer.byteLength(built.content, 'utf8'),
        bodySha256: built.bodySha256,
        bodyBytes: built.bodyBytes,
        fetchedAt,
      })
      console.log(`   ✅ ${item.sitePath} → pages/${file}（正文 ${built.bodyBytes} 字节）`)
    } catch (e) {
      failures.push({ sitePath: item.sitePath, url, reason: e.message })
      console.error(`   ❌ ${item.sitePath} 抓取失败：${e.message}`)
    }
    // 抓取节流：给官方站留出余量
    await new Promise((r) => setTimeout(r, 150))
  }

  // 第 3 步：清掉不在本轮清单里的陈旧页文件（保持磁盘与清单一致）
  const removed = []
  for (const name of readdirSync(PAGES_DIR)) {
    if (!name.endsWith('.md')) continue
    if (keptFiles.has(name)) continue
    rmSync(join(PAGES_DIR, name), { force: true })
    removed.push(name)
  }

  // 第 4 步：原子锁包住索引整文件重写（与其他写同一索引的进程互斥）
  const index = {
    schemaVersion: SCHEMA_VERSION,
    sourceSite: SOURCE_SITE,
    generatedAt: fetchedAt,
    pageCount: pages.length,
    complete: failures.length === 0,
    minPages: MIN_PAGES,
    scope: {
      include: INCLUDE_PREFIXES,
      exclude: EXCLUDE_PREFIXES,
      note: '页清单来自官方侧边导航；按 R3 的 D3 默认裁决排除 Agent 接入页',
    },
    fetchFailures: failures,
    pages,
  }
  mkdirSync(KB_DIR, { recursive: true })
  withLockSync('assets:api_docs_index', () => {
    writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + '\n', 'utf8')
  }, { why: 'API 文档索引重写', staleMs: 30000 })

  console.log('-----------------------------------------')
  console.log(`📄 页清单：${plan.length} 页 · 成功 ${pages.length} 页 · 失败 ${failures.length} 页`)
  if (removed.length) console.log(`🧹 清理陈旧镜像：${removed.join('、')}`)
  console.log(`🗂️  index.json 已重写（原子锁 assets:api_docs_index）：${relative(REPO_ROOT, INDEX_FILE)}`)

  if (failures.length) {
    console.error('❌ 有页面未抓到，已如实落盘其余页面并写入 fetchFailures；判定为不通过。')
    for (const f of failures) console.error(`   · ${f.sitePath}：${f.reason}`)
    console.error('   处理：网络恢复后重跑 --sync 补齐；README 的"未抓到页面"一节须同步记录。')
    process.exit(1)
  }
  console.log('✅ 同步完成：页清单与本地镜像一致。')
  process.exit(0)
}

// ── 五、--check：只判本地 ────────────────────────────────────────────────────

/** 对指定知识库目录做结构判定（被 --check 与 selftest 共用）。 */
export function runCheck(baseDir) {
  const problems = []
  const indexFile = join(baseDir, 'index.json')
  const pagesDir = join(baseDir, 'pages')

  if (!existsSync(indexFile)) problems.push(`缺少机读页清单：${relative(REPO_ROOT, indexFile)}`)
  if (!existsSync(pagesDir)) problems.push(`缺少正文镜像目录：${relative(REPO_ROOT, pagesDir)}`)
  if (problems.length) return { ok: false, problems, pages: 0 }

  let index
  try {
    index = JSON.parse(readFileSync(indexFile, 'utf8'))
  } catch (e) {
    return { ok: false, problems: [`index.json 无法解析：${e.message}`], pages: 0 }
  }

  if (!index || !Array.isArray(index.pages)) return { ok: false, problems: ['index.json 缺少 pages 数组'], pages: 0 }
  if (index.sourceSite !== SOURCE_SITE) problems.push(`index.json 的 sourceSite 不是官方中文站：${index.sourceSite}`)
  if (typeof index.schemaVersion !== 'string' || !index.schemaVersion) problems.push('index.json 缺少 schemaVersion')

  const pages = index.pages
  if (pages.length < MIN_PAGES) problems.push(`页数不足：清单 ${pages.length} 页 < 下限 ${MIN_PAGES} 页`)
  if (index.pageCount !== pages.length) problems.push(`index.json 的 pageCount(${index.pageCount}) 与 pages 实际条数(${pages.length}) 不一致`)

  const listed = new Set()
  for (const rec of pages) {
    for (const f of ['path', 'url', 'title', 'group', 'sha256', 'short', 'bytes', 'fetchedAt']) {
      if (rec[f] === undefined || rec[f] === null || rec[f] === '') problems.push(`第 ${pages.indexOf(rec) + 1} 条记录字段缺失：${f}`)
    }
    if (!rec.path) continue
    if (listed.has(rec.path)) problems.push(`页清单出现重复条目：${rec.path}`)
    listed.add(rec.path)

    const abs = join(baseDir, rec.path)
    if (!existsSync(abs)) { problems.push(`清单里的页缺文件：${rec.path}`); continue }
    const content = readFileSync(abs, 'utf8')
    const actual = sha256(content)
    const actualBytes = Buffer.byteLength(content, 'utf8')
    if (actual !== rec.sha256) problems.push(`整文件 sha256 不符：${rec.path}（清单 ${String(rec.sha256).slice(0, 12)} / 实际 ${actual.slice(0, 12)}）`)
    if (actualBytes !== rec.bytes) problems.push(`整文件字节数不符：${rec.path}（清单 ${rec.bytes} / 实际 ${actualBytes}）`)
    if (rec.sha256 && rec.short !== String(rec.sha256).slice(0, 12)) problems.push(`短指纹与整文件 sha256 不一致：${rec.path}`)
    const body = extractBodyFromFile(content)
    if (body === null) { problems.push(`镜像文件缺少正文分界标记：${rec.path}`); continue }
    if (sha256(body) !== rec.bodySha256) problems.push(`正文 sha256 不符（正文被人手改或抓取不完整）：${rec.path}`)
  }

  // 反向：磁盘上有、清单里没有的孤儿文件同样判红（防脏数据残留）
  const onDisk = existsSync(pagesDir) ? readdirSync(pagesDir).filter((n) => n.endsWith('.md')) : []
  for (const name of onDisk) {
    if (!listed.has(`pages/${name}`)) problems.push(`镜像目录存在清单未登记的孤儿文件：pages/${name}`)
  }

  return { ok: problems.length === 0, problems, pages: pages.length }
}

function cmdCheck() {
  console.log('🔎 DeepSeek API 文档知识库 · 本地结构判定')
  console.log('-----------------------------------------')
  console.log(`判定对象：${relative(REPO_ROOT, KB_DIR)}`)
  const r = runCheck(KB_DIR)
  console.log(`页数：${r.pages}（下限 ${MIN_PAGES}）`)
  if (r.ok) {
    console.log('✅ 通过：清单存在、逐页文件齐备、整文件与正文 sha256 全部可复算。')
    process.exit(0)
  }
  console.error(`❌ 不通过：命中 ${r.problems.length} 条问题`)
  for (const p of r.problems.slice(0, 40)) console.error(`   · ${p}`)
  if (r.problems.length > 40) console.error(`   · …其余 ${r.problems.length - 40} 条省略`)
  console.error('   处理：跑 `node scripts/sync_api_docs.mjs --sync` 重新抓取（人改过的正文会被覆盖）。')
  process.exit(1)
}

// ── 六、--diff：只比站点正文指纹 ─────────────────────────────────────────────

async function cmdDiff() {
  console.log('🔎 DeepSeek API 文档知识库 · 站点正文漂移比对')
  console.log('-----------------------------------------')
  if (!existsSync(INDEX_FILE)) {
    console.error(`❌ 缺少 ${relative(REPO_ROOT, INDEX_FILE)}：先跑 --sync 建立基线。`)
    process.exit(1)
  }
  let index
  try {
    index = JSON.parse(readFileSync(INDEX_FILE, 'utf8'))
  } catch (e) {
    console.error(`❌ index.json 无法解析：${e.message}`)
    process.exit(1)
  }

  const changed = []
  const missing = []
  for (const rec of index.pages || []) {
    const url = rec.url || canonicalUrl(rec.sitePath)
    try {
      const html = await fetchHtml(url)
      const body = extractBodyMarkdown(html, rec.title)
      const h = sha256(body)
      if (h !== rec.bodySha256) {
        changed.push({ sitePath: rec.sitePath || rec.url, local: String(rec.bodySha256).slice(0, 12), remote: h.slice(0, 12) })
      }
    } catch (e) {
      missing.push({ sitePath: rec.sitePath || rec.url, reason: e.message })
    }
    await new Promise((r) => setTimeout(r, 150))
  }

  if (missing.length) {
    console.error(`❌ 有 ${missing.length} 页取不到站点正文（网络不可用或站点改版），本判定不算通过：`)
    for (const m of missing) console.error(`   · ${m.sitePath}：${m.reason}`)
    process.exit(1)
  }
  if (changed.length) {
    console.log(`📊 站点正文已变化：${changed.length} 页（本地记录 / 站点现状）`)
    for (const c of changed) console.log(`   · ${c.sitePath}：${c.local} → ${c.remote}`)
    console.log('   处理：跑 `node scripts/sync_api_docs.mjs --sync` 重新抓取。')
    process.exit(1)
  }
  console.log(`✅ 通过：比对 ${(index.pages || []).length} 页，站点正文指纹与本地记录逐页一致。`)
  process.exit(0)
}

// ── 七、selftest：正向 + 反向用例 ─────────────────────────────────────────────

function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true })
  for (const name of readdirSync(src)) {
    if (name === '.selftest') continue
    const s = join(src, name)
    const d = join(dst, name)
    if (statSync(s).isDirectory()) copyDir(s, d)
    else writeFileSync(d, readFileSync(s))
  }
}

function selftest() {
  console.log('🧪 DeepSeek API 文档同步器 · 自检（含反向用例，全过才退 0）')
  console.log('-----------------------------------------')
  if (!existsSync(INDEX_FILE) || !existsSync(PAGES_DIR)) {
    console.error('❌ 先跑 `node scripts/sync_api_docs.mjs --sync` 建立基线，再来自检。')
    process.exit(1)
  }
  const results = []
  const tmpRoot = mkdtempSync(join(tmpdir(), 'sync_api_docs_selftest_'))
  const fresh = (tag) => {
    const d = join(tmpRoot, tag)
    copyDir(KB_DIR, d)
    return d
  }
  const expect = (name, wantOk, dir) => {
    const r = runCheck(dir)
    const pass = r.ok === wantOk
    results.push({ name, pass, detail: r.ok ? '判通过' : `判不通过（${r.problems.length} 条问题）` })
    console.log(`${pass ? '   ✅' : '   ❌'} ${name} → 期望${wantOk ? '通过' : '不通过'}，实得${r.ok ? '通过' : '不通过'}`)
    return r
  }

  // 用例 0（正向）：干净副本必须判通过
  expect('正向：干净副本判通过', true, fresh('clean'))

  // 用例 1（反向）：篡改一页正文 → 必须判不通过
  {
    const d = fresh('tamper')
    const rec = JSON.parse(readFileSync(join(d, 'index.json'), 'utf8')).pages[0]
    const f = join(d, rec.path)
    writeFileSync(f, readFileSync(f, 'utf8') + '\n本章被人工插入了一句不存在于官方站点的内容。\n', 'utf8')
    expect('反向：篡改一页正文', false, d)
  }

  // 用例 2（反向）：删掉一页文件 → 必须判不通过
  {
    const d = fresh('deleted')
    const rec = JSON.parse(readFileSync(join(d, 'index.json'), 'utf8')).pages[1]
    rmSync(join(d, rec.path), { force: true })
    expect('反向：删除一页文件', false, d)
  }

  // 用例 3（反向）：伪造 index 记录（整文件 sha256 改成假值） → 必须判不通过
  {
    const d = fresh('forge')
    const p = join(d, 'index.json')
    const idx = JSON.parse(readFileSync(p, 'utf8'))
    idx.pages[0].sha256 = '0'.repeat(64)
    idx.pages[0].short = '000000000000'
    writeFileSync(p, JSON.stringify(idx, null, 2) + '\n', 'utf8')
    expect('反向：伪造 index 整文件指纹', false, d)
  }

  // 用例 4（反向）：只把正文改坏、同时把整文件指纹同步"修好" → 正文指纹必须仍有牙
  {
    const d = fresh('body-only')
    const p = join(d, 'index.json')
    const idx = JSON.parse(readFileSync(p, 'utf8'))
    const rec = idx.pages[2]
    const f = join(d, rec.path)
    writeFileSync(f, readFileSync(f, 'utf8') + '\n偷偷追加的一行。\n', 'utf8')
    const content = readFileSync(f, 'utf8')
    rec.sha256 = sha256(content)
    rec.short = rec.sha256.slice(0, 12)
    rec.bytes = Buffer.byteLength(content, 'utf8')
    writeFileSync(p, JSON.stringify(idx, null, 2) + '\n', 'utf8')
    expect('反向：正文漂移但整文件指纹被同步伪造', false, d)
  }

  // 用例 5（反向）：页数不足 → 必须判不通过
  {
    const d = fresh('few')
    const p = join(d, 'index.json')
    const idx = JSON.parse(readFileSync(p, 'utf8'))
    idx.pages = idx.pages.slice(0, 3)
    idx.pageCount = idx.pages.length
    writeFileSync(p, JSON.stringify(idx, null, 2) + '\n', 'utf8')
    expect('反向：页数低于下限', false, d)
  }

  // 用例 6（反向）：孤儿文件 → 必须判不通过
  {
    const d = fresh('orphan')
    writeFileSync(join(d, 'pages', 'zh-cn__orphan-page.md'), '# 孤儿页\n', 'utf8')
    expect('反向：镜像目录多出孤儿文件', false, d)
  }

  rmSync(tmpRoot, { recursive: true, force: true })
  const bad = results.filter((r) => !r.pass)
  console.log('-----------------------------------------')
  console.log(`用例总数 ${results.length} · 通过 ${results.length - bad.length} · 失败 ${bad.length}`)
  if (bad.length) {
    console.error('❌ 自检不通过：反向用例没判红，说明判定器没牙。')
    process.exit(1)
  }
  console.log('✅ 自检通过：正向判通过、反向全部判红。')
  process.exit(0)
}

// ── 八、入口 ─────────────────────────────────────────────────────────────────

function usage() {
  console.log('用法：node scripts/sync_api_docs.mjs <--sync|--check|--diff|selftest>')
  console.log('  --sync      抓取官方文档站并重写 pages/*.md 与 index.json')
  console.log('  --check     只判本地：结构 / 页数 / 逐页 sha256 与正文 sha256')
  console.log('  --diff      只比站点：列出正文指纹发生变化的页')
  console.log('  selftest    自检（含反向用例，全过才退 0）')
  console.log('退出码：0 通过；1 不通过或网络失败；2 用法错误')
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('-h') || argv.includes('--help')) { usage(); process.exit(0) }
  const cmd = argv.find((a) => ['--sync', '--check', '--diff', 'selftest'].includes(a))
  if (!cmd) {
    console.error('❌ 用法错误：必须显式给出 --sync / --check / --diff / selftest 之一。')
    usage()
    process.exit(2)
  }
  if (cmd === '--sync') return cmdSync()
  if (cmd === '--check') return cmdCheck()
  if (cmd === '--diff') return cmdDiff()
  return selftest()
}

// 只有被当作脚本直接执行时才跑 main（被 import 时不产生副作用）
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1].replace(/\\/g, sep)) {
  main().catch((e) => {
    console.error(`❌ 未预期错误：${e && e.stack ? e.stack : e}`)
    process.exit(1)
  })
}
