# verify-atomic-mutual-exclusion

L2 工序动作：**原子锁互斥性物理压测断言器**——真拉起多进程去抢锁，用实验回答「到底互斥了没有」。

## 用途

静态读代码回答不了「锁有没有真的生效」。一份写得很漂亮的加锁代码，只要载体不是内核原子原语、
或释放路径漏了一条、或陈旧锁不可回收，互斥就会在某个时间窗里静默失效。

本技能产出三段证据，缺一不可：

| 段 | 做什么 | 必须满足 |
| :--- | :--- | :--- |
| `guarded` | N 个独立进程并发抢同一把 `mkdir` 原子锁 | 重叠窗口 **0**、最大同时持有者 **1**、N×rounds 次临界区全部完成 |
| `control` | 同 N 进程同驻留时长，但**不取锁** | 重叠窗口 **> 0**、最大持有者 **> 1** |
| `stale` | 伪造「持有者 PID 已不存在」的锁 | `status` 判 `stale` 且 `acquire` 回收后成功获取 |

**为什么控制段不可省**：一个永远输出 0 的检测器，在「真互斥」和「完全没锁」下结论相同——
那种 0 是假阴性。只有当场证明同一检测器在不加锁时看得见并发，持锁段的 0 才有证明力。

## 使用方式

```bash
# 标准压测：16 进程 × 20 轮，含无锁对照段
python3 skills/verify-atomic-mutual-exclusion/scripts/verify_mutual_exclusion.py \
  --workers 16 --rounds 20 --hold-ms 5 --json

# 快速回归
python3 skills/verify-atomic-mutual-exclusion/scripts/verify_mutual_exclusion.py \
  --workers 8 --rounds 5 --hold-ms 3 --json
```

## 参数

| 参数 | 口径 |
| :--- | :--- |
| `--workers` | 并发进程数，默认 16；< 2 退 2（单进程构不成并发） |
| `--rounds` | 每进程临界区轮次，默认 20 |
| `--hold-ms` | 临界区驻留毫秒，默认 5；设 0 会显著降低重叠检出灵敏度 |
| `--timeout` | 单次等待/持有上限秒数，默认 60 |
| `--lock-root` | 锁根目录，缺省用临时目录（测完即删） |
| `--skip-control` | 跳过无锁对照段（仅极速冒烟用，**不得用于交付验收**） |

## 输出字段

```json
{"success":true,"verdict":"mutual_exclusion_proven",
 "guarded":{"entries":320,"expected_entries":320,"max_concurrent_holders":1,"overlap_windows":0,"worker_failures":[]},
 "control":{"overlap_windows":318,"max_concurrent_holders":17},
 "stale":{"detected_stale":true,"reason":"pid_not_alive","reclaimed_and_acquired":true},
 "checks":[{"name":"guarded_no_overlap","pass":true,"detail":"..."}]}
```

`checks[].name` 闭集：`guarded_no_overlap` / `guarded_all_acquired` / `control_sees_concurrency` / `stale_lock_reclaimable`。

## 实测基线（16 进程 × 20 轮）

| 段 | 重叠窗口 | 最大同时持有者 | 完成临界区 |
| :--- | ---: | ---: | ---: |
| `guarded`（持锁） | **0** | **1** | 320 / 320 |
| `control`（不持锁） | **318** | **17** | 320 / 320 |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 四项断言全过，`verdict = mutual_exclusion_proven` |
| 1 | 任一断言失败，`verdict = mutual_exclusion_not_proven` |
| 2 | 输入不可读（依赖脚本缺失、`--workers < 2`、`--rounds < 1`、锁根不可写、worker 启动失败） |

## 上下游

- 上游：`atomic-lock-policy`（口径）、`acquire-atomic-lock`（被测锁实现）。
- 下游：`atomic-lock-guard`（L3 门禁把它作为放行前置）。

## 边界

- 只调用 `acquire-atomic-lock` 的公开接口，不改写被测实现、不 monkey-patch；
- 依赖缺失即退 2，**绝不内置兜底锁实现**（否则测的不是被测对象，0 毫无意义）；
- journal 与锁根都在临时目录，测完即删，不触碰业务文件；
- 不断言具体耗时（那随机器负载浮动），只断言重叠是否为 0。
