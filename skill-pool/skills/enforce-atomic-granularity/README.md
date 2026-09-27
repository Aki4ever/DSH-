# enforce-atomic-granularity

L1 原子规约：粒度物理化强制。

## 用途

规定 SOP 的每一步必须声明绑定的物理探针类型（length / regex / exitcode / file 四选一），
未声明或使用「适当、尽量、根据情况」等模糊表述的步骤，一律判定为粒度过粗。

## 使用方式

作为规约文本被引用，无独立脚本：

```text
[probe:exitcode] ./bin/skill-pool validate 返回 0 视为通过
```

## 四类探针

| 标记 | 含义 | 典型承载 |
| :--- | :--- | :--- |
| `[probe:length]` | 字符串与长度 | 截断、字数上限、首尾空白剥离 |
| `[probe:regex]` | 正则排他 | 黑名单命中、格式匹配 |
| `[probe:exitcode]` | 退出码断言 | 命令/脚本通过与否 |
| `[probe:file]` | 文件与字节 | 路径存在且非空 |

## 上下游

- 上游：无（原子基元）。
- 下游：`plan-fission`（生成分裂清单）、`atomic-fission-guard`（门禁）。
