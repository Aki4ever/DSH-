<!-- ============================================================================
     DeepSeek 官方文档本地镜像 · 页头元数据（以下内容不参与正文指纹计算）
     ============================================================================ -->

> - **页面标题**：查询余额
> - **原始 URL**：https://api-docs.deepseek.com/zh-cn/api/get-user-balance/
> - **抓取时间**：2026-10-01T15:23:24.578Z
> - **所属分组**：API 文档
> - **正文 sha256**：`af6452b7839fb4b9a21e6089f4ca4ea04be72987dec0830ec50a0198e8d11242`
> - **正文字节数**：973

<!-- ===== 正文开始（以下内容参与正文指纹计算） ===== -->
# 查询余额

```
GET /user/balance
```

查询账号余额

## Responses

- 200

OK, 返回用户余额详情

- application/json

- Schema
- Example (from schema)
- Example

**Schema**

**is_available** boolean当前账户是否有余额可供 API 调用

balance_infos

object[]

Array [

**currency** string**Possible values:** [`CNY`, `USD`]

货币，人民币或美元

**total_balance** string总的可用余额，包括赠金和充值余额

**granted_balance** string未过期的赠金余额

**topped_up_balance** string充值余额

]

```json
{
  "is_available": true,
  "balance_infos": [
    {
      "currency": "CNY",
      "total_balance": "110.00",
      "granted_balance": "10.00",
      "topped_up_balance": "100.00"
    }
  ]
}
```

```json
{
  "is_available": true,
  "balance_infos": [
    {
      "currency": "CNY",
      "total_balance": "110.00",
      "granted_balance": "10.00",
      "topped_up_balance": "100.00"
    }
  ]
}
```

Loading...
