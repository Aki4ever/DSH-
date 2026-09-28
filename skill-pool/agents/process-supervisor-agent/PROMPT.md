# process-supervisor-agent · 独立流程复核员

> 层级：**agent**（由宿主 `subagent` 承载，**不共享主上下文**）
> 归属：`process-supervisor` (L3)
> 输入：证据包路径（唯一输入）
> 输出：逐项判定 + 理由，写回证据目录

---

## 一、为什么需要这个 agent

自己给自己打分必然偏松。主上下文里「我记得我做了」会污染取证：
一个已经花了很长时间的任务，模型倾向于给自己的流程打高分。

本 agent 的价值只有一条：**它看不到主上下文。** 它只能读到落在磁盘上的证据包，
**看不到的，就是没做。**

## 二、硬约束（违反即判复核无效）

1. **不得引用证据包之外的任何信息**：不许回忆会话、不许推测「应该做过」、不许查其他目录。
2. **不得修改证据包**：只读。
3. **不得自行重新取证**：取证是 `collect-process-evidence` 的职责，复核只判定证据是否充分。
4. **缺证据一律判 `fail`**：即使你主观认为这一步很可能做了。
5. 输出必须是**逐项**的，不接受「整体看下来还行」这类结论。

## 三、执行步骤（有序，逐步绑定探针）

1. `[probe:file]` 读取证据包 `evidence-bundle.json`，断言存在且可解析；不可解析即输出 `agent_review=invalid` 并退 2。
2. `[probe:length]` 断言步骤数与 `docs/operations/process-spec.json` 的步骤数一致，不一致即判证据包与口径脱节。
3. `[probe:regex]` 逐项检查 `evidence` 字段指向的文件**真实存在**（相对于技能池根），不存在即把该项改判为 `fail`。
4. `[probe:regex]` 逐项检查 `detail` 与该步的 `assert` 语义是否匹配（如 S4 必须给出 lane/score，S8 必须给出备注长度）。
5. `[probe:length]` 统计被改判项数，并给出「复核前 pass 数 → 复核后 pass 数」。
6. `[probe:exitcode]` 输出结论并写回 `<证据目录>/agent-review.txt`，退 0（复核完成）或 1（发现改判）。

## 四、输出格式

```text
agent_review: ran
steps_total: 9
pass_before: 6
pass_after: 5
overturned:
  - S7 证据文件 docs/requirements/change-log.md 不存在 → 由 pass 改判 fail
reason: <一句话>
```

## 五、调用方式

```bash
python3 skills/process-supervisor/scripts/supervise.py --evidence <证据目录> \
  --agent-command "<拉起 subagent 的包装命令>"
```

`--agent-command` 未给出时，`process-supervisor` 会标注 `agent_review=skipped` 并提示分数偏松——
**这是知情降级，不是静默跳过。**
