# plan-fission

L2 工序动作：递归分裂规划。

## 用途

读取一个技能目录或 SOP 文本，逐步骤判定是否绑定了物理探针，输出结构化分裂清单。

## 使用方式

```bash
python3 skills/plan-fission/scripts/plan_fission.py --input <技能目录或文件> [--strict] [--json]
```

## 步骤标记格式

SOP 中每条有序步骤可选携带一个探针标记：

```text
1. [probe:exitcode] 运行 ./bin/skill-pool validate 并断言返回 0
2. [probe:file] 断言 docs/operations/skill-catalog.json 存在且非空
```

未携带标记、或携带非法标记的步骤会被列入 `unbound_steps`。

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `total_steps` | 提取到的有序步骤总数 |
| `bound_steps` | 已绑定合法探针的步骤 |
| `unbound_steps` | 未绑定探针的步骤（含步骤序号与原因） |
| `vague_hits` | 命中的主观模糊词 |
| `fission_required` | 是否需要分裂 |
| `fission_plan` | 分裂清单：步骤序号、建议级别、建议探针、建议父级 |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 方案模式解析成功，或门禁模式全部合格 |
| 1 | 门禁模式存在待分裂项，或输入不可读 |

## 上下游

- 上游：`enforce-atomic-granularity`。
- 下游：`atomic-fission-guard`（把本工具包装成实施前置门禁）。
