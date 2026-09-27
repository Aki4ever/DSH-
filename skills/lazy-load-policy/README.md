# lazy-load-policy

L1 原子规约：技能按需加载。

## 用途

规定管家的下属只在**被检索命中**且**按精确 id** 时才允许加载，且单任务加载数 ≤ top-K。

## 四条硬规则

| 编号 | 规则 |
| :--- | :--- |
| 1 | 未出现在选中清单里的技能，一次读取都不允许 |
| 2 | 禁止通配读取（`skills/*/SKILL.md`、`skills/**`、目录递归） |
| 3 | `README.md` 不进上下文 |
| 4 | 累计加载数 ≤ top-K（默认 5），正文字节 ≤ 12 KB |

## 上下游

- 上游：无（原子基元）。
- 下游：`select-skills-for-task`、`load-skill-contract`、`on-demand-dispatcher`。
