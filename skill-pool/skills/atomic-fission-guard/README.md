# atomic-fission-guard

L3 复合流程：粒度递归分裂门禁。

## 用途

在管家实施任何写入类任务之前，证明其步骤可被物理探针验证。
存在未绑定探针的步骤时阻断实施，并给出分裂清单。

## 组成

| 组成 | 级别 | 职责 |
| :--- | :--- | :--- |
| `enforce-atomic-granularity` | L1 | 四类探针判定规约 |
| `plan-fission` | L2 | 步骤扫描与分裂清单输出 |

## 使用方式

```bash
python3 skills/atomic-fission-guard/scripts/fission_guard.py --target <技能目录或文件>
python3 skills/atomic-fission-guard/scripts/fission_guard.py --target <技能目录或文件> --report
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 全部步骤已绑定合法探针，放行 |
| 1 | 存在未绑定步骤（输出含步骤序号），或目标不可读 |

`--report` 模式只输出明细，恒返回 0，供人工查看。

## 上下游

- 上游：`enforce-atomic-granularity`、`plan-fission`。
- 下游：所有写入类实施任务的前置门禁。
