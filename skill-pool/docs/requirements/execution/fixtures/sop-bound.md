# SOP 粒度探针测试夹具 — 全部绑定探针（预期判定：合格）

## Workflow

1. [probe:file] 断言 `docs/operations/skill-catalog.json` 存在且字节数大于 0。
2. [probe:exitcode] 运行 `./bin/skill-pool validate` 并断言退出码为 0。
3. [probe:regex] 用正则断言输出末尾含 `[probe:file]` 标记。
4. [probe:length] 断言最终答复正文长度不超过 10 个字符。
