# on-demand-dispatcher

L3 复合流程：按需调用总控。

## 用途

管家派发下属的执行闸门：先算清楚要用谁，再只读那几个。清单之外的技能一个都不读。

## 组成

| 组成 | 级别 | 职责 |
| :--- | :--- | :--- |
| `lazy-load-policy` | L1 | 未命中不加载 / 禁止通配 / 数量上限 |
| `select-skills-for-task` | L2 | 产出选中清单（只读检索结果） |
| `load-skill-contract` | L2 | 按精确 id 加载单个契约 |
| `verify-context-payload` | L2 | 数量与字节预算断言 |

## 使用方式

```bash
python3 skills/on-demand-dispatcher/scripts/dispatch_on_demand.py --task "校验交付文件是否存在"
python3 skills/on-demand-dispatcher/scripts/dispatch_on_demand.py --task "校验交付文件是否存在" --emit
```

## 输出字段

`selected_ids` / `loaded_ids` / `unselected_reads` / `manifest` / `total_bytes` / `total_tokens` / `verify.checks` / （`--emit` 时）`package`。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 断言通过（空清单也算通过） |
| 1 | 索引缺失、越权加载、超 top-K 或超字节预算 |

## 上下游

- 上游：`dual-lane-router`。
- 下游：具体技能执行。
