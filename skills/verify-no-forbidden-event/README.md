# verify-no-forbidden-event

L2 工序技能：反例零命中断言（`hits == 0`，`--strict` 下空事件流不得「空过」）。

## 用途

把 `detect-forbidden-state` 的检测结果收敛成一个布尔放行条件：**`hits == 0`**。
检测器经 `importlib` 在**同一进程内**加载（不起子进程），保证判据只有一套；
`--strict` 追加断言 `checked_events > 0`——「没有事件」不等于「没有违例」，空事件流不放过。

## 使用方式

```bash
python3 skills/verify-no-forbidden-event/scripts/verify_no_forbidden.py --events <events.jsonl> --json
python3 skills/verify-no-forbidden-event/scripts/verify_no_forbidden.py --events <events.jsonl> --strict --json
```

无阈值参数：阈值口径唯一来源是被加载检测器的 `DEFAULT_THRESHOLDS`。

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `success` | 全部 checks 是否通过 |
| `checked_events` | 参与判定的事件条数 |
| `hits[]` | 透传检测器的命中列表（`code` / `seq` / `evidence` / `threshold`） |
| `checks[].name` | 断言名：`input_readable` / `no_forbidden_event` / `strict_events_present` |
| `checks[].pass` | 该断言是否通过 |
| `checks[].detail` | 人类可读说明，命中时列出 `code(seq=...)` |
| `error` | 仅在退出码 2 时出现，说明输入不可读或检测模块不可加载的原因 |

## 退出码表

| 退出码 | 含义 |
| :--- | :--- |
| 0 | 通过：零命中，且（`--strict` 时）事件非空 |
| 1 | 命中反例，或 `--strict` 下事件流为空 |
| 2 | 输入不可读/不可解析：检测模块加载失败、`--events` 缺失、文件不存在或是目录、JSONL 行非法 |

## 上下游

- 上游：`detect-forbidden-state`（进程内加载其 `read_events_path` / `detect_events` / `DEFAULT_THRESHOLDS`）。
- 下游：`anti-pattern-guard`（把本断言作为反例门禁的放行条件）、`dsh-butler`「③ 冲突·冗余·质量」集群调度。
