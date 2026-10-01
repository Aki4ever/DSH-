<!-- ============================================================================
     DeepSeek 官方文档本地镜像 · 页头元数据（以下内容不参与正文指纹计算）
     ============================================================================ -->

> - **页面标题**：查询文件
> - **原始 URL**：https://api-docs.deepseek.com/zh-cn/api/retrieve-file/
> - **抓取时间**：2026-10-01T15:23:24.578Z
> - **所属分组**：API 文档
> - **正文 sha256**：`cb1505fa9ae06a58050e725717b84d7c00d5351cf9897624435bc99ff4446b20`
> - **正文字节数**：1242

<!-- ===== 正文开始（以下内容参与正文指纹计算） ===== -->
# 查询文件

```
GET /files/:file_id
```

返回指定文件的信息。

## Request

**### Path Parameters**

**file_id** stringrequired要查询的文件 ID。

## Responses

- 200

OK, 返回 `file object`。

- application/json

- Schema
- Example (from schema)
- Example

**Schema**

**id** stringrequired文件标识符，形如 `file-api-...`，可在对话补全请求中引用。

**object** stringrequired**Possible values:** [`file`]

对象的类型，其值为 `file`。

**bytes** integerrequired文件大小（字节）。

**created_at** integerrequired文件创建时的 Unix 时间戳（以秒为单位）。

**filename** stringrequired文件名。

**purpose** stringrequired**Possible values:** [`user_data`]

文件的用途。

**expires_at** integer文件过期时的 Unix 时间戳（以秒为单位）。仅在上传时设置了过期时间才会出现。

```json
{
  "id": "string",
  "object": "file",
  "bytes": 0,
  "created_at": 0,
  "filename": "string",
  "purpose": "user_data",
  "expires_at": 0
}
```

```json
{
  "id": "file-api-0a1b2c3d4e5f60718293a4b5c6d7e8f9",
  "object": "file",
  "bytes": 102400,
  "created_at": 1700000000,
  "filename": "image.jpg",
  "purpose": "user_data"
}
```

Loading...
