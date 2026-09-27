# anti-pattern-policy

L1 原子规约：反例层判定基元（七条「绝不允许发生」的反例 + 物理判据 + 优先级）。

## 用途

回答「什么算本次执行已经失败」：给出七条反例（AP-01 死循环 ~ AP-07 播报风暴）的物理判据、默认阈值与判定优先级
（正确性 AP-04/AP-05 > 进展 AP-01/AP-03 > 可观测 AP-02/AP-07 > 成本 AP-06）。
核心立场：能力层管「能做什么」，反例层管「绝不允许发生什么」，二者互补而非并列；
每条反例都必须有物理判据，写不出判据的口号不得进这一层。本技能无脚本，只出判据与优先级。

## 使用方式

```bash
# 规约本身无命令；按判据执行下游两条命令
python3 skills/detect-forbidden-state/scripts/detect_forbidden.py --events <events.jsonl> --json
python3 skills/verify-no-forbidden-event/scripts/verify_no_forbidden.py --events <events.jsonl> --strict --json
```

事件输入格式（JSONL 或 stdin，每行一个对象，字段全部可选）：

```json
{"seq":1,"action":"read_file","state":"hash-abc","ts":1000,"silent":false,"ok":true,"claim_done":false,"probe_exit":0,"caught_error":false,"logged":true,"context_tokens":1200,"tier":"micro","text":"读取文件"}
```

## 输出字段

规约裁决以固定条目结构表达，字段与下游命中的字段一一对应：

| 字段 | 含义 |
| :--- | :--- |
| `code` | 反例编号，闭集 `AP-01` ~ `AP-07` |
| `predicate` | 物理判据：只依赖事件字段、无随机、不看系统当前时间 |
| `threshold` | 默认阈值（AP-04/AP-05 为「任一命中即违规」） |
| `priority` | 判定优先级：正确性 > 进展 > 可观测 > 成本 |
| `seq` | 命中时的事件序号列表（`seq` 缺失时以 1 起算的行号代替） |
| `evidence` | 人类可读证据，必含编号与序号 |

## 退出码表

本技能无脚本，退出码由执行代理脚本承载：

| 退出码 | 含义 |
| :--- | :--- |
| 0 | 事件流零命中反例 |
| 1 | 命中任一条 AP，或 `--strict` 下事件流为空（不允许「空过」） |
| 2 | 事件流缺失或不可解析（缺参、文件不可读、JSONL 行非法、事件非 JSON 对象） |

## 上下游

- 上游：无（原子基元），是反例层的判据真相来源。
- 下游：`detect-forbidden-state`（检测）、`verify-no-forbidden-event`（零命中断言）、`anti-pattern-guard`（反例门禁，挂载于管家「③ 冲突·冗余·质量」集群）。
