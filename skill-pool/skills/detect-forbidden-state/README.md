# detect-forbidden-state

L2 工序技能：事件流 → 反例命中（编号 + 事件序号 + 人类可读证据）。

## 用途

把 `anti-pattern-policy` 的七条物理判据变成可跑的证据：读入事件流，逐条判定 AP-01 ~ AP-07，
每条反例在脚本内是**独立检测分支**，因此逐条可命中、互不误伤；命中项必带 `seq` 列表与 `evidence`。
同一条流可同时命中多条反例，全部上报，不做加法豁免。

## 使用方式

```bash
python3 skills/detect-forbidden-state/scripts/detect_forbidden.py --events <events.jsonl> --json
cat <events.jsonl> | python3 skills/detect-forbidden-state/scripts/detect_forbidden.py --stdin --json
python3 skills/detect-forbidden-state/scripts/detect_forbidden.py --events <events.jsonl> --loop-threshold 8 --token-budget 8000 --json
```

阈值参数（默认值即 `anti-pattern-policy` 的口径）：`--loop-threshold 5`、`--silent-threshold 20`、
`--silence-seconds 120`、`--retry-threshold 3`、`--token-budget 30000`、`--storm-threshold 3`。

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `success` | 是否零命中（无命中才为 `true`） |
| `checked_events` | 实际解析并参与判定的事件条数 |
| `hits[].code` | 命中的反例编号，闭集 `AP-01` ~ `AP-07` |
| `hits[].seq` | 命中事件序号列表（`seq` 缺失时以 1 起算的行号代替） |
| `hits[].evidence` | 人类可读证据，含步号、阈值与现场字段取值 |
| `hits[].threshold` | 该条反例生效的阈值文本 |
| `summary` | 七条反例各自的命中条数（`{"AP-01":0,...}`），零命中亦列出 |
| `error` | 仅在退出码 2 时出现，说明输入缺失或不可解析的原因 |

命中排序：`AP-04` → `AP-05` → `AP-01` → `AP-03` → `AP-02` → `AP-07` → `AP-06`（正确性 > 进展 > 可观测 > 成本），同编号内按首个序号升序。

## 退出码表

| 退出码 | 含义 |
| :--- | :--- |
| 0 | 无命中（`hits` 为空数组） |
| 1 | 有命中（至少一条 AP） |
| 2 | 输入缺失/不可解析：未给 `--events`/`--stdin`、二者同给、文件不可读、JSONL 行非法、事件非对象、阈值非法 |

## 上下游

- 上游：`anti-pattern-policy`（判据、阈值与优先级的唯一来源）。
- 下游：`verify-no-forbidden-event`（importlib 加载本脚本的 `detect_events` 做零命中断言）、`anti-pattern-guard`（反例门禁）。

## 口径备注

`ts` 只从事件字段读取，绝不取系统当前时间；`claim_done=true` 而 `probe_exit` 缺失视为非 0；
`caught_error=true` 而 `logged` 缺失视为未记录。三条均为保守方向，保证同输入恒得同结论。
