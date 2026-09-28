# anti-pattern-guard

L3 复合流程：反例门禁（挂载于管家「③ 冲突·冗余·质量」集群）。

## 用途

把「清单 → 检测 → 断言」串成一道「绝不允许发生什么」的放行门禁：
`anti-pattern-policy`（七条判据与优先级）→ `detect-forbidden-state`（命中编号 + 事件序号 + 证据）→
`verify-no-forbidden-event`（零命中断言，`--strict` 下空事件流不得空过）。

两条立场：

- **反例层与能力层互补而非并列**：能力层管「能做什么」是加分项，反例层管「绝不允许发生什么」是生死线；能力再强也不豁免反例命中；
- **命中即阻断，禁止「记录后继续」**：只写日志然后接着跑，等同把反例层降级为观察层；唯一合法处置是停止推进、输出 `code` 与 `seq`、修复后重跑门禁。

## 使用方式

```bash
python3 skills/detect-forbidden-state/scripts/detect_forbidden.py --events <events.jsonl> --json
python3 skills/verify-no-forbidden-event/scripts/verify_no_forbidden.py --events <events.jsonl> --strict --json
```

门禁放行条件：`verify-no-forbidden-event` 的 `checks` 全部 `pass == true`。

## 输出字段

门禁最终输出为 `verify-no-forbidden-event` 的 JSON，关键字段：

| 字段 | 含义 |
| :--- | :--- |
| `success` | 门禁是否放行 |
| `checked_events` | 参与判定的事件条数 |
| `hits[].code` / `hits[].seq` / `hits[].evidence` | 命中反例编号、事件序号列表与人类可读证据 |
| `checks[]` | 逐条断言 `{name, pass, detail}`：`input_readable` / `no_forbidden_event` / `strict_events_present` |
| `error` | 仅在退出码 2 时出现 |

## 退出码表

| 退出码 | 含义 |
| :--- | :--- |
| 0 | 零命中且（`--strict` 下）事件非空，门禁放行 |
| 1 | 命中任一条 AP，或 `--strict` 下事件流为空（不允许「空过」） |
| 2 | 事件流缺失或不可解析（缺参、文件不可读、JSONL 行非法、事件非对象、检测模块不可加载） |

## 上下游

- 上游：`anti-pattern-policy`、`detect-forbidden-state`、`verify-no-forbidden-event`（本技能即三者组装）。
- 下游：`atomic-fission-guard`（粒度门禁，串联而非取代）、`qa-gatekeeper`（交付质量守卫）、`dsh-butler`「③ 冲突·冗余·质量」集群调度。
