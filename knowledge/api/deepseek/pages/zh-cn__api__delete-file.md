<!-- ============================================================================
     DeepSeek 官方文档本地镜像 · 页头元数据（以下内容不参与正文指纹计算）
     ============================================================================ -->

> - **页面标题**：删除文件
> - **原始 URL**：https://api-docs.deepseek.com/zh-cn/api/delete-file/
> - **抓取时间**：2026-10-01T15:23:24.578Z
> - **所属分组**：API 文档
> - **正文 sha256**：`a717f17c6ff7a651b7a958379955311d5b855a42a0ffc70e03177d5b2726f8c1`
> - **正文字节数**：677

<!-- ===== 正文开始（以下内容参与正文指纹计算） ===== -->
# 删除文件

```
DELETE /files/:file_id
```

删除一个文件。

## Request

**### Path Parameters**

**file_id** stringrequired要删除的文件 ID。

## Responses

- 200

OK, 返回删除状态。

- application/json

- Schema
- Example (from schema)
- Example

**Schema**

**id** stringrequired被删除文件的 ID。

**object** stringrequired**Possible values:** [`file`]

对象的类型，其值为 `file`。

**deleted** booleanrequired文件是否被成功删除。

```json
{
  "id": "string",
  "object": "file",
  "deleted": true
}
```

```json
{
  "id": "file-api-0a1b2c3d4e5f60718293a4b5c6d7e8f9",
  "object": "file",
  "deleted": true
}
```

Loading...
