# zero-restart-guard

L3 复合流程：零重启写入门禁（挂载于管家「② 契约与合规」集群）。

## 用途

把「路径 → 处置判定 → 重启证据断言」串成一道写入门禁：
`prefer-hot-reload-policy`（三级处置与判定表）→ `classify-change-scope`（逐路径处置 + 边界）→
`verify-no-unnecessary-restart`（重启事件三项断言）。

**默认目标是零重启**，重启是例外而非常态；只有命中「不可热更边界」白名单且带非空重建命令的重启才放行。
宿主侧不可热更（DSH 应用 bundle、Web 产物、宿主注入的 system prompt 结构）属本仓库不可改范围，
本门禁只覆盖「仓库可见范围内的不必要重启」。

## 使用方式

```bash
# 1) 处置判定：仓库内路径应全部 hot_reload，verdict = no_restart_needed
python3 skills/classify-change-scope/scripts/classify_scope.py --paths <变更路径...> --json

# 2) 证据断言：--restarts 为空或不存在即视为零重启通过
python3 skills/verify-no-unnecessary-restart/scripts/verify_no_restart.py \
  --paths <变更路径...> --restarts <restart 事件 jsonl> --json
```

## 组成

| 组成 | 级别 | 职责 |
| :--- | :--- | :--- |
| `prefer-hot-reload-policy` | L1 | 三级处置定义、判定表与重启三要素 |
| `classify-change-scope` | L2 | 逐路径 `disposition` / `reason` / `boundary` 与 `verdict` |
| `verify-no-unnecessary-restart` | L2 | 重启事件三项断言，输出不必要/无证据重启 |

## 两条红线

1. **默认零重启**：起始假设是「不需要重启」，仓库内可热更路径一律不得重启。
2. **重启必须双向举证**：路径命中不可热更边界白名单，且带非空重建命令，缺一即阻断。

## 输出字段

| 字段 | 来源 | 含义 |
| :--- | :--- | :--- |
| `decisions[]` / `summary` / `verdict` | `classify-change-scope` | 逐路径处置、三档计数与总判定 |
| `success` / `restart_events` | `verify-no-unnecessary-restart` | 放行判定与重启事件条数 |
| `unnecessary[]` / `unproven[]` | `verify-no-unnecessary-restart` | 不必要重启与无证据重启明细 |
| `checks[]` | `verify-no-unnecessary-restart` | 三项断言明细 `{name, pass, detail}` |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 处置齐备、restart 均带边界、三项断言全过，放行 |
| 1 | 存在不必要重启或无证据重启，禁止交付写入结果 |
| 2 | 门禁参数缺失、restart 记录不可解析，或判定器不可用 |

## 上下游

- 上游：`prefer-hot-reload-policy`、`classify-change-scope`、`verify-no-unnecessary-restart`（本技能即三者组装）。
- 下游：`atomic-fission-guard`（粒度门禁）、`catalog-consistency-guard`（口径一致性门禁）、`dsh-butler`「② 契约与合规」集群调度。
