<!-- ============================================================================
     DeepSeek 官方文档本地镜像 · 页头元数据（以下内容不参与正文指纹计算）
     ============================================================================ -->

> - **页面标题**：FIM 补全 API（Beta）
> - **原始 URL**：https://api-docs.deepseek.com/zh-cn/api/create-completion/
> - **抓取时间**：2026-10-01T15:23:24.578Z
> - **所属分组**：API 文档
> - **正文 sha256**：`37a509f0ea9a2ff81faf65f6832dac38d5a840429a3ba5e6b95b488660f8d820`
> - **正文字节数**：6209

<!-- ===== 正文开始（以下内容参与正文指纹计算） ===== -->
# FIM 补全 API（Beta）

```
POST /completions
```

FIM (Fill In the Middle) 补全 API。 用户需要设置 `base_url="https://api.deepseek.com/beta"` 来使用此功能。

## Request

- application/json

**### Body required**

**model** stringrequired**Possible values:** [`deepseek-flash`, `deepseek-v4-pro`]

模型的 ID。请使用 `deepseek-flash` 或 `deepseek-v4-pro`。

**prompt** stringrequired用于生成完成内容的提示

**echo** booleannullable在输出中，把 prompt 的内容也输出出来。不能与 `suffix` 或 `logprobs` 一起使用。

**logprobs** integernullable**Possible values:** `<= 20`

制定输出中包含 logprobs 最可能输出 token 的对数概率，包含采样的 token。例如，如果 logprobs 是 20，API 将返回一个包含 20 个最可能的 token 的列表。API 将始终返回采样 token 的对数概率，因此响应中可能会有最多 logprobs+1 个元素。

logprobs 的最大值是 20。

**max_tokens** integernullable最大生成 token 数量。

**stop** string | string[]nullable

一个 string 或最多包含 16 个 string 的 list，在遇到这些词时，API 将停止生成更多的 token。

oneOf

- MOD1
- MOD2

string

Array [

string

]

**stream** booleannullable如果设置为 True，将会以 SSE（server-sent events）的形式以流式发送消息增量。消息流以 `data: [DONE]` 结尾。

stream_options

object

nullable

流式输出相关选项。必须与 `stream: true` 一起使用；如果 `stream` 未设置为 `true`，API 会返回 `400` 错误。

**include_usage** boolean如果设置为 `true`，流式返回的所有块都会包含 `usage` 字段，其中除最后一个块外，该字段的值均为 `null`。如果不设置或设置为 `false`，则除最后一个块外，其余块都不含 `usage` 字段。

无论是否设置，`data: [DONE]` 之前的最后一个块都会在其 `usage` 字段中给出整个请求的 token 使用统计信息。请注意，这里不会单独下发一个只含 usage 的块：统计信息附加在最后一个内容块上，该块的 `choices` 数组始终只包含一个元素，其中不含新增内容且 `finish_reason` 非 null。

**suffix** stringnullable制定被补全内容的后缀。

**temperature** numbernullable**Possible values:** `<= 2`

**Default value:** `1`

采样温度，介于 0 和 2 之间。更高的值，如 0.8，会使输出更随机，而更低的值，如 0.2，会使其更加集中和确定。 我们通常建议可以更改这个值或者更改 `top_p`，但不建议同时对两者进行修改。

**top_p** numbernullable**Possible values:** `<= 1`

**Default value:** `1`

作为调节采样温度的替代方案，模型会考虑前 `top_p` 概率的 token 的结果。所以 0.1 就意味着只有包括在最高 10% 概率中的 token 会被考虑。 取值必须大于 0 且不超过 1。我们通常建议修改这个值或者更改 `temperature`，但不建议同时对两者进行修改。

**frequency_penalty** deprecated该参数已不再支持。传入该参数将不会产生任何效果。

**presence_penalty** deprecated该参数已不再支持。传入该参数将不会产生任何效果。

## Responses

- 200

OK

- application/json

- Schema
- Example (from schema)

**Schema**

**id** stringrequired补全响应的 ID。

choices

object[]

required

模型生成的补全内容的选择列表。

Array [

**finish_reason** stringrequired**Possible values:** [`stop`, `length`, `content_filter`, `insufficient_system_resource`, `aborted`]

模型停止生成 token 的原因。

`stop`：模型自然停止生成，或遇到 `stop` 序列中列出的字符串。

`length` ：输出长度达到了模型上下文长度限制，或达到了 `max_tokens` 的限制。

`content_filter`：输出内容因触发过滤策略而被过滤。

`insufficient_system_resource`: 由于后端推理资源受限，请求被打断。

`aborted`：生成过程被中断。

**index** integerrequiredlogprobs

object

nullable

required

**text_offset** integer[]**token_logprobs** number[]**tokens** string[]**top_logprobs** object[]**text** stringrequired]

**created** integerrequired标志补全请求开始时间的 Unix 时间戳（以秒为单位）。

**model** stringrequired补全请求所用的模型。

**system_fingerprint** string模型运行时的后端配置的指纹。

**object** stringrequired**Possible values:** [`text_completion`]

object 的类型，一定为"text_completion"

usage

object

该对话补全请求的用量信息。

**completion_tokens** integerrequired模型 completion 产生的 token 数。

**prompt_tokens** integerrequired用户 prompt 所包含的 token 数。该值等于 `prompt_cache_hit_tokens + prompt_cache_miss_tokens`

prompt_tokens_details

object

required

prompt tokens 的详细信息。

**cached_tokens** integer用户 prompt 中，命中上下文缓存的 token 数。与 `prompt_cache_hit_tokens` 相同。

**prompt_cache_hit_tokens** integerrequired用户 prompt 中，命中上下文缓存的 token 数。

**prompt_cache_miss_tokens** integerrequired用户 prompt 中，未命中上下文缓存的 token 数。

**total_tokens** integerrequired该请求中，所有 token 的数量（prompt + completion）。

completion_tokens_details

object

completion tokens 的详细信息。

**reasoning_tokens** integer推理模型所产生的思维链 token 数量

```json
{
  "id": "string",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": {
        "text_offset": [
          0
        ],
        "token_logprobs": [
          0
        ],
        "tokens": [
          "string"
        ],
        "top_logprobs": [
          {}
        ]
      },
      "text": "string"
    }
  ],
  "created": 0,
  "model": "string",
  "system_fingerprint": "string",
  "object": "text_completion",
  "usage": {
    "completion_tokens": 0,
    "prompt_tokens": 0,
    "prompt_tokens_details": {
      "cached_tokens": 0
    },
    "prompt_cache_hit_tokens": 0,
    "prompt_cache_miss_tokens": 0,
    "total_tokens": 0,
    "completion_tokens_details": {
      "reasoning_tokens": 0
    }
  }
}
```

Loading...
