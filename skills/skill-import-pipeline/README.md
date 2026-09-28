# skill-import-pipeline

「GitHub 技能引入管线」（REQ-BUTLER-IMPORT-012 / T20）第 5 步：L3 引入管线总控（无独立脚本）。

## 用途

把外部优质 Skill 引入本池的五步串联总控，落点为新增集群「**⑦ 技能引入与演进**」：

| 步骤 | 技能 | 物理探针 |
| :--- | :--- | :--- |
| 1 检索 | `search-github-skill` | `[probe:file]` 候选清单真实落地 |
| 2 审计 | `audit-imported-skill` | `[probe:exitcode]` 裁决 0=accept / 1=reject |
| 3 归一 | `normalize-skill-contract` | `[probe:length]` 二次运行 sha256 一致 |
| 4 定级挂载 | `place-skill-into-cluster` | `[probe:exitcode]` composition 依赖边合法 |
| 5 门禁验证 | `./bin/skill-pool` | `[probe:exitcode]` validate 与 consistency 均为 0 |

两条硬口径：**引入即纳管**（五步缺一步不得入库）、**拒绝必留痕**（被拒候选必须给出明确许可/安全理由，不得静默丢弃）。

## 使用方式

按顺序执行五个子技能（无独立脚本，本技能是编排契约）：

```bash
# 1 检索（本地无来源时先由智能体侧工具 find_dsh_plugin / web 检索取候选）
python3 skills/search-github-skill/scripts/search_skill.py --query "pdf" --from-json /tmp/candidates.json

# 2 审计（0=accept；1=reject 必须记录理由后改选下一候选）
python3 skills/audit-imported-skill/scripts/audit_skill.py --candidate /tmp/candidate.json

# 3 归一（连续两次 sha256 必须一致）
python3 skills/normalize-skill-contract/scripts/normalize_skill.py \
  --name pdf-toolkit --level L2 --description "PDF 解析与文本抽取工序技能"

# 4 定级挂载（只判定不写盘，接线由人工/管家复核后执行）
python3 skills/place-skill-into-cluster/scripts/place_skill.py --name pdf-toolkit --dry-run

# 5 门禁验证
./bin/skill-pool validate && ./bin/skill-pool consistency
```

## 退出码表

| 退出码 | 语义 |
| :--- | :--- |
| `0` | 五步全部通过：候选已归一纳管、composition 合法、双门禁退出码均为 0 |
| `1` | 任一步阻断：候选结构化失败 / 全部候选被拒 / 幂等基线失效 / 依赖边非法 / 门禁非 0 |

各子技能退出码语义见其各自 README：0 成功、1 失败（`audit-imported-skill` 另有 2 = 输入不可解析）。

## 上下游

- **上游**：用户引入意图；候选来源为智能体侧检索工具（`find_dsh_plugin` / web 检索 / `gh` CLI）或 `docs/operations/skill-import-cache.json`。
- **下游**：归一后的技能经人工/管家接线挂入「⑦ 技能引入与演进」，最终由 `./bin/skill-pool validate` 与 `./bin/skill-pool consistency` 双门禁收敛；编目同步由 T21 的 `sync_catalog.py` 统一执行（不属本管线写入范围）。
