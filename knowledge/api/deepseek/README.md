# DeepSeek 官方 API 文档 · 本地知识库 (KB-API)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.29.7`
> - **对应实施版本**：`v4.29.7`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../../../rules/workflow/versioning_standard.md)
> - **最后更新日期**：2026-10-01
> - **版本状态**：`[Release 稳定生效]`

> **规范层级**：`【知识库 · API 文档镜像层】`（`knowledge/api/deepseek/`）
> **需求依据**：`REQ-091` / `R3`（任务代号 `KB-API`）
> **来源站**：[`https://api-docs.deepseek.com/zh-cn/`](https://api-docs.deepseek.com/zh-cn/)
> **同步器**：[`scripts/sync_api_docs.mjs`](../../../scripts/sync_api_docs.mjs)

---

## 一、本层定位与边界

本层是**官方 API 文档的本地镜像**，回答一个问题：**不联网也能查到官方原文，并且随时能证明"我看到的是哪一版"**。

| 维度 | 本层管什么 | 本层**不**管什么 |
| :--- | :--- | :--- |
| 对象 | 官方站页面的**原始正文镜像** + 页清单 + 逐页指纹 | 本工程自己写的规则与规范（那是 `knowledge/common/` 的事） |
| 权威关系 | 关于 DeepSeek API 的事实，**以本层镜像的官方原文为准** | 本层不解释、不改写、不总结官方口径（改了就失去出处资格） |
| 时效关系 | 提供"抓取时间 + 正文指纹 + 漂移判定"三件套 | 不保证永远最新：**最新性必须靠 `--diff` 复跑证明**，不靠文档自称 |

**唯一权威出处规则**：本工程其它文档（如峰谷时段口径）引用 API 事实时，**只写指针指向本层具体页**，
禁止把官方原文抄成第二份——同一事实两处各写一套，就是冲突的来源。

---

## 二、文件清单

```text
knowledge/api/deepseek/
├── README.md      # 本文档：定位 / 来源 / 页清单来历 / 更新与新鲜度判定 / 防冲突口径
├── index.json     # 机读页清单（唯一真相源：页数、路径、URL、标题、分组、逐页指纹）
└── pages/*.md     # 逐页正文镜像（Markdown，每页自带页头：原始 URL / 抓取时间 / 正文 sha256）
```

### `index.json` 字段口径

| 字段 | 含义 |
| :--- | :--- |
| `schemaVersion` | 清单结构版本；字段口径变更时递增 |
| `sourceSite` | 来源站（固定为官方中文站首页） |
| `generatedAt` | 本轮同步的抓取时刻（UTC，ISO 8601） |
| `pageCount` / `minPages` | 实际页数 / 页数下限（判定用） |
| `complete` | 本轮是否所有页都抓到（`false` 时 `fetchFailures` 必有内容） |
| `scope` | 纳入与排除的分区前缀（D3 裁决的机读留痕） |
| `fetchFailures` | 未抓到的页与原因（**绝不静默**） |
| `pages[].path` | **本地**镜像文件相对路径（如 `pages/zh-cn__quick_start__pricing.md`） |
| `pages[].sitePath` / `url` | 站点路径 / 完整原始 URL |
| `pages[].title` / `group` / `subgroup` | 页标题 / 分区 / 子分组（子分组可空） |
| `pages[].sha256` / `short` / `bytes` | **整文件**指纹 / 前 12 位短指纹 / 整文件字节数 |
| `pages[].bodySha256` / `bodyBytes` | **正文**指纹 / 正文字节数（页头元数据不参与） |
| `pages[].fetchedAt` | 该页抓取时刻 |

### 镜像文件的两段结构

每页 `.md` 由「页头元数据 + `BODY_MARK` + 正文」构成：页头只放出处信息（原始 URL / 抓取时间 / 正文 sha256 / 分组 / 标题），
**不参与正文指纹**；`BODY_MARK`（`<!-- ===== 正文开始（以下内容参与正文指纹计算） ===== -->`）之后才是正文本体。
这样切分是刻意的：`--diff` 比的是**站点正文**，页头里的抓取时间每次同步都变，混进去会让漂移判定天天误报。

---

## 三、页清单怎么来的

**不从 `/llms.txt` 来**——实测官方站没有该文件（`https://api-docs.deepseek.com/llms.txt` 返回的是英文首页 HTML，
不是机器可读索引）。因此页清单**从官方侧边导航抓**：同步器读三个入口页的
`nav[aria-label="文档侧边栏"]`（快速开始 / API 文档 / 更新日志），合并去重后按 R3 的 **D3 默认裁决**裁剪：

- **纳入**：`/zh-cn/`（首次调用 API）、`/zh-cn/quick_start/*`（非 Agent 页）、`/zh-cn/api/*` 接口页、`/zh-cn/updates`；
- **排除**：`/zh-cn/quick_start/agent_integrations/*`（Claude Code / Codex / OpenCode / OpenClaw / Hermes /
  Reasonix / WorkBuddy / Qoder，共 8 页）——与 DSH 工程无关，避免知识库噪音。

页清单因此**随官方侧边导航自动变化**：官方新增接口页，下次 `--sync` 自动纳入；官方删页，同步器会清掉陈旧镜像文件。

---

## 四、如何更新

```bash
node scripts/sync_api_docs.mjs --sync     # 真抓：重写 pages/*.md 与 index.json（写索引时套原子锁）
node scripts/sync_api_docs.mjs --check    # 只判本地：结构 / 页数 / 整文件与正文 sha256 逐页复算
node scripts/sync_api_docs.mjs --diff     # 只比站点：列出正文指纹发生变化的页
node scripts/sync_api_docs.mjs selftest   # 自检：正向 + 反向用例，全过才退 0
```

退出码统一为：`0` 通过；`1` 不通过或网络失败；`2` 用法错误。
**抓取失败一律显式报错并退 1**，绝不写"大概是这个内容"，也绝不静默跳过。

**硬规则**：`pages/*.md` 是**生成物**，人工编辑会在下一次 `--check` 被判红（正文 sha256 对不上），
并在下一次 `--sync` 被官方原文覆盖。要改口径请在 `knowledge/common/` 写规则，然后在这里放指针。

---

## 五、新鲜度怎么判定

| 判定 | 命令 | 判据 |
| :--- | :--- | :--- |
| 本地完好 | `--check` | 清单与目录存在；清单每页有文件；整文件与正文 sha256 逐页可复算；页数 ≥ 10；无孤儿文件 |
| 站点漂移 | `--diff` | 逐页重抓站点 → 抽正文 → 算 sha256，与 `bodySha256` 比对；有变化列出页名并退 1；站点取不到也退 1 |
| 判据有牙 | `selftest` | 篡改正文 / 删页 / 伪造索引指纹 / 正文漂移但整文件指纹被同步伪造 / 页数不足 / 孤儿文件，必须全部判红 |

**"新鲜"的定义是可复跑出来的**：`--diff` 退 0 = 站点正文与本地记录逐字一致；
退 1 = 要么有页变了，要么站点取不到——**取不到一律算不新鲜，不许折算成通过**。

---

## 六、防冲突口径与诚实边界

1. **不与 `common/`、`projects/` 既有层混放**：本层是"外部原文镜像"，不是工程规范，故单列 `knowledge/api/`；
2. **不镜像 Agent 接入页**：见 §三 D3 裁决，8 页全部排除；
3. **不镜像 `/zh-cn/guides/*`（API 指南，11 页）与 `/zh-cn/news/*`（新闻）**：R3 交付口径明确为
   「快速开始 + API 文档接口页 + 更新日志」，本轮严格按该口径执行，未纳入的页在此如实写明而非假装覆盖；
4. **正文是抽取结果，不是逐字节 HTML 副本**：官方站是 Docusaurus 站点，同步器把正文容器
   `.theme-doc-markdown` 转成 Markdown（表格保留行列、代码块保留换行、链接保留原址）。
   个别 OpenAPI 结构（如深层 `oneOf` 嵌套）会被摊平成顺序文本——**层级可能走样，文字与数值不走样**；
   需要逐字核对时以页头 `原始 URL` 回源为准；
5. **本轮抓取结果（2026-10-01）**：页清单 15 页，**全部抓取成功，无未抓到页面**（`complete=true`、`fetchFailures=[]`）。
   若后续某轮出现失败页，同步器会把失败页与原因写进 `index.json` 的 `fetchFailures` 并退 1，本节须同步更新。

---

## 七、关联入口

- 同步器接口声明：[`scripts/interfaces/sync_api_docs.interface.json`](../../../scripts/interfaces/sync_api_docs.interface.json)
- 知识库总索引：[`knowledge/README.md`](../../README.md)
- 原子锁原语：[`scripts/lib/atomic_lock.mjs`](../../../scripts/lib/atomic_lock.mjs)（索引重写所用锁键 `assets:api_docs_index`）
