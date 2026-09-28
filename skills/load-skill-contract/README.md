# load-skill-contract

L2 工序动作：单契约按需加载。

## 用途

技能正文进入上下文的**唯一合法入口**：一次只加载一个 `SKILL.md`，并报告字节数与 token 估算。

## 使用方式

```bash
python3 skills/load-skill-contract/scripts/load_contract.py --name verify-file-exists --meta-only
python3 skills/load-skill-contract/scripts/load_contract.py --name verify-file-exists
python3 skills/load-skill-contract/scripts/load_contract.py --name '*'   # 期望 exit 1
```

## token 估算公式

`tokens ≈ ceil(CJK 字符数 + ASCII 字节数 / 4)`（与 `measure-token-budget` 保持同一标准）。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 加载成功 |
| 1 | id 非法/通配/路径穿越，或目标缺失、为空 |

## 上下游

- 上游：`lazy-load-policy`。
- 下游：`verify-context-payload`、`on-demand-dispatcher`。
