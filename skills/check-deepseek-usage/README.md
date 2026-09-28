# check-deepseek-usage

L2 工序动作级技能：DeepSeek 用量探针（时段 / 额度 / 定价文档指纹）。

## 用途

一次性回答三件事，且只用**官方接口事实**回答：

1. **现在什么时段**：官方无时段接口 → 本地按北京时间（`Asia/Shanghai`）算。
   周一至周五 09:00–12:00、14:00–18:00 为高峰；其余（含周末与法定节假日全天）为空闲，
   空闲价 = 高峰价 × 50%（`discountFactor`：高峰 1、空闲 0.5）。
2. **还有多少额度**：真实调用 `GET https://api.deepseek.com/user/balance`
   （请求头 `Authorization: Bearer <API_KEY>`，Key 形如 `sk-...`）。
3. **官方定价页变了吗**：对 `https://api-docs.deepseek.com/zh-cn/quick_start/pricing/`
   正文算 sha256 指纹，并记录响应头 `etag` / `last-modified`。

## 使用方式

```bash
# 人类可读中文摘要：当前时段 + 距下次切换倒计时 + 额度 + 定价指纹状态
node scripts/deepseek_usage_probe.mjs

# 单个 JSON 对象（字段固定，便于管道消费）
node scripts/deepseek_usage_probe.mjs --json

# 判定：时段可判定 + 指纹可用 + JSON 结构完整
node scripts/deepseek_usage_probe.mjs --check

# 单独触发一次定价指纹同步，打印「有更新 / 无更新」
node scripts/deepseek_usage_probe.mjs --price-sync
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| `0` | 成功（报告产出且定价指纹可用） |
| `1` | 判定失败 / 数据不可用（定价页抓不到、`--check` 任一项失败、`--price-sync` 同步失败） |
| `2` | 用法错误（未知参数，或 `--json` / `--check` / `--price-sync` 多模式混用） |

余额缺失（`errorKind=no-credential`）属**正常降级**，不影响退出码，但会在输出里显式标注。

## 凭据来源（按序探测，先命中者胜）

| 顺序 | 来源 | 说明 |
| :--- | :--- | :--- |
| ① | 环境变量 `DEEPSEEK_API_KEY` | — |
| ② | 环境变量 `DSH_DEEPSEEK_API_KEY` | — |
| ③ | 文件 `./.secrets/deepseek_api_key` | 纯文本单行、仅读、不进版本库 |
| ④ | 文件 `$DSH_HOME/.dsh-control/deepseek_api_key` | `DSH_HOME` 默认 `~/.dsh` |

只接受 `sk-` 开头且去空白后长度 ≥ 20 的单行值。
**不解析** `~/.dsh/.credentials.yaml`（实测那里只有账号令牌，不是 `sk-` Key）。
输出永远只有「是否找到凭据 + 来源名 + 长度」，**绝不打印明文密钥**。

## 状态文件

`$DSH_HOME/.dsh-control/pricing_fingerprint.json`（`DSH_HOME` 默认 `~/.dsh`）：

```json
{
  "schemaVersion": 1,
  "sourceUrl": "https://api-docs.deepseek.com/zh-cn/quick_start/pricing/",
  "fingerprint": "<sha256 hex>",
  "etag": "\"…\"",
  "lastModified": "Thu, 24 Sep 2026 09:35:28 GMT",
  "firstSeenAt": "…", "lastCheckedAt": "…", "lastChangedAt": null,
  "lastFetchedAt": "…",
  "changeCount": 0,
  "history": []
}
```

- **每日一次语义**（日期以 `Asia/Shanghai` 判定）：同一天内重复运行只刷新 `lastCheckedAt`，不重复落 `history`；
- 只有指纹变化才追加 `history`（`{at, from, to}`）、`changeCount + 1`、更新 `lastChangedAt`，`history` 只保留最近 10 次；
- 抓不到时**不写盘**：不伪造指纹，连 `lastCheckedAt` 也不更新，旧状态原样保留；
- 原子写（临时文件 + rename），重复执行不产生重复文件、不改动无关内容。

## 法定节假日数据源

内置显式表 `HOLIDAY_TABLE`（`scripts/deepseek_usage_probe.mjs`），来源：
**国务院办公厅节假日安排（人工维护）**——官方不提供机器可读日历。

当前覆盖年份：**2026**（依据国办发明电〔2025〕7 号，2025-11-04 发布）。
未覆盖年份（如 2027）按工作日规则判定，并在 `reason` 追加
「（{年份} 节假日表未覆盖，按工作日规则判定）」，**绝不静默**。

周末与法定节假日一律空闲，因此「调休上班日」（2026：1/4、2/14、2/28、5/9、9/20、10/10）
落在周末，按官方口径本身就是空闲，不需要单列，也不改变判定结果。

## 上下游

- 上游 `multi-source-search-policy`（只信官方来源、失败必须显式，禁止静默返空）；
- 复用模块：`scripts/lib/deepseek_balance.mjs`（余额）、`scripts/lib/pricing_fingerprint.mjs`（指纹）。

## 边界

- **绝不给假数据**：取不到就如实报错，禁止占位数字 / 随机数 / 估算值冒充余额或时段；
- **绝不泄漏密钥**：不打印、不落盘；错误信息经 `maskSecrets()` 把 `sk-…` 打成 `sk-***`；
- 不猜价位：官方无价格查询 API，本技能只做定价**文档指纹**巡检，价位表由人工维护；
- 不修改任何文件：唯一写入是上述状态文件；
- 倒计时每次运行都按真实当前时间重算，不缓存成常量。
