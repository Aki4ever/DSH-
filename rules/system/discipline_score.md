# 纪律分系统规则 (Discipline Score System)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.29.11`
> - **对应实施版本**：`v4.29.11`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../workflow/versioning_standard.md)
> - **规范层级**：`【系统规则 · 纪律分系统唯一权威源】`
> - **需求依据**：`REQ-098`（任务代号 `DISCIPLINE-SCORE-1`，子项 R1~R8）
> - **生效状态**：`[Release 稳定生效]`

本文档是**纪律分系统**的唯一权威源：定义、子需求、档位、证据门槛、停用语义只在此处写一次，
其它文件（需求文案、门禁、输出契约）一律只放指针，禁止复述。需求原文与验收标准见
[`docs/constraint_mechanism_optimize_14.md`](../../docs/constraint_mechanism_optimize_14.md)，
判定内核为 [`scripts/discipline_score.mjs`](../../scripts/discipline_score.mjs)。

## 一、一句话定义

**纪律分系统 = 一本跨任务、只追加、带哈希链与证据门，并且"低于 60 分就真的动不了手"的合规账本。**

它把每轮从零重算的静态成绩单，升级成有记忆、有后果、有专职裁判的账本：
全域一本账、一条一百、扣分带证据、自评要复核、用户一票终局、低于 60 分物理停用。

## 二、八条子需求（R1~R8）与判定入口

| 子项 | 规则内容 | 判定入口 |
| :--- | :--- | :--- |
| **R1** 全域一本账 | 任何 DSH 工程内的违规都记进**同一本只追加账本**（`ai-control/reports/discipline/ledger.jsonl`）；每行可追到会话、任务条目、档位与凭据，历史不可覆盖。 | `node scripts/discipline_score.mjs status --json` |
| **R2** 一条一百 | 一个任务条 = 一个记账单位，起分 100，违规扣分累加，扣到 0 分为止（不为负）；扣分**不跨条继承**。 | `node scripts/discipline_score.mjs open --task "任务简述"` |
| **R3** 扣分带证据 | 每条扣分必须绑定可复跑证据（判定命令 + 退出码或哈希）；缺证据或证据里没有判定结果的，一律拒收（退出码 2）。 | `node scripts/discipline_score.mjs --selftest` |
| **R4** 自评要复核 | 先自评并列出自报扣分项，再由独立复核重算；两者差额**大于**阈值即判"评分失误"，自动按 L4 入账，并以复核结果为准。 | `node scripts/discipline_score.mjs verify --json` |
| **R5** 用户一票终局 | 用户可随时直接扣分，用户扣分**终局生效**：不可申诉、不可回滚，只能追加说明；且用户的话即凭据，豁免证据。 | `node scripts/discipline_score.mjs deduct --by user --reason "..."` |
| **R6** 低于 60 分停用 | 任一条目分跌破停用阈值，即触发**物理停用**；停用不随新任务自动复活，仅用户可恢复。细则见 §五。 | `bash scripts/control_gates.sh check`（G7）· `node scripts/discipline_guard_probe.mjs`（整链阻断实跑） |
| **R7** 专职纪律委员 | 委员独立算账：逐条复核证据是否成立，并对既有审计器的失分维度判"漏报"；**不采信自评**，其判定优先于 AI 自评。角色契约与接口契约见 [`skill-pool/agents/discipline-officer-agent/`](../../skill-pool/agents/discipline-officer-agent/PROMPT.md)（宿主无 agent 注册面，故运行载体是该行的 verify 子命令）。 | `node scripts/discipline_score.mjs verify --json` |
| **R8** 输出两条固定字段 | 每次回复固定多披露两个数：进度回执里的 `🎯 当前纪律分`（动手前的账面分，已登记进 `OUT_RECEIPT_FIELDS`）、【执行效果】里的 `🏁 完成时纪律分`（本轮结算后的分）；两个数都必须从账本取，手写对不上即判红。字段格式只在 [`rules/system/output_standard.md`](./output_standard.md) 定义一次，本文不复述。 | `node scripts/output_audit.mjs --check` |
| **R9** 流程流转维度 | 审计维度 `10. 流程流转` 由**流转层产事实、委员判与罚**：`scripts/flow_router.mjs --findings` 写出的跳步 / 乱序 / 缺步 / 退出码非 0 / 哈希链断，委员一律按 L2 入账（该维度不在 `OFFICER_SKIP_DIMS`，不接受"进行中"豁免）；证据包缺失时不罚也不冒充通过。反向由流转层执行：纪律停用或低于地板分时，受拦阶段的推进被硬拒。分工与阈值见 [`rules/workflow/task_execution_flow.md`](../workflow/task_execution_flow.md) §二之六。 | `node scripts/flow_router.mjs --findings --json` |

## 三、扣分档位表（L1~L5）

| 等级 | 名称 | 扣分 | 典型情形（可判定） |
| :---: | :--- | :---: | :--- |
| **L1** | 轻微 | −2 | 格式瑕疵：抬头跳级、缩进超 3 层、总结字数越界等结构类小错 |
| **L2** | 一般 | −5 | 漏做开工动作：未挂任务列表、未跑收尾双检、回执缺字段 |
| **L3** | 较重 | −10 | 越权或无依据改动、委派边界失守、未读回校验就宣称完成 |
| **L4** | 严重 | −20 | 自评与独立复核相差超阈（**评分失误**）、用自述代替证据、门禁未过仍继续改动 |
| **L5** | 致命 | −40 | 伪造凭据、谎报完成、改动历史账本、触碰安全红线 |

- **叠加规则**：同一轮内同一根因只扣一次；不同根因可叠加，扣完即止（下限 0 分）。
- **数值唯一来源**：上表数值与全部阈值**只登记在** [`ai-control/config/gates.conf`](../../ai-control/config/gates.conf)
  的 `DISC_*` 段，即**唯一调参入口**（`DISC_LEVELS="L1:2 L2:5 L3:10 L4:20 L5:40"`、`DISC_BASELINE=100`、
  `DISC_SUSPEND_THRESHOLD=60`、`DISC_SELF_VERIFY_GAP=10`）；本表只是可读镜像，**不是权威**，
  以配置文件为准，改档改配置、不动代码。

## 四、证据门槛与自评复核

- **证据必填**：扣分记录必须含"判定命令 + 真实退出码（`exit=N`）"或文件哈希（`sha256:...`）；
  不满足即退出码 2 拒收，不写进账本。
- **唯一豁免**：`--by user`。用户的话本身就是终局凭据。
- **反向同样成立**：取不到证据**不得记为满分**（元规则第三十六条"缺失不得等同通过"）。
- **评分失误判定是客观的**：`|自评 − 独立复核| > DISC_SELF_VERIFY_GAP` 即判失误，按 L4 自动入账。
- **权威优先级**：`用户裁定（R5，终局） > 纪律委员复核（R7） > AI 自评（R4）`。
- **哈希链**：账本每行带前一行的哈希；`verify-chain` 逐行重算，改动任一历史行必判红。

## 五、停用与恢复（R6 的物理后果）

- **触发**：任一条目分 `< DISC_SUSPEND_THRESHOLD`（默认 60）。
- **传导链**：该条目进 G7 门禁 → G7 非 pass → `scripts/control_gates.sh` 把 `EXEC_ALLOWED` 置为 `false`
  → 宿主已加载的拦截层插件消费状态文件里的该字段，**拒绝改动型工具调用**（写文件、跑构建、装插件等）。
- **只读放行**：只读工具与汇报始终放行；管控路径自身的修复调用照旧走逃生舱，避免"修门禁须先过门禁"。
- **粘性**：停用**不随新任务自动解除**。新开条目重新起 100 分也不会复活——这是本系统与"每轮重算"最大的区别。
- **恢复**：仅用户可恢复，命令 `node scripts/discipline_score.mjs resume --by user --reason "..."`；
  非 `--by user` 直接拒收（退出码 2）；恢复动作本身入账留痕。
- **诚实口径**：若宿主未加载拦截层，则只能做到"判定器可跑 + 门禁可拦"，须如实标注，不冒充已通电。

## 六、判定入口总表

| 判定内容 | 命令 | 退出码语义 |
| :--- | :--- | :--- |
| 门禁 G7（账本自洽且未停用） | `bash scripts/control_gates.sh check` | 0 全过 · 1 有门禁非 pass · 2 不可判定 |
| 同一判定（只读入口） | `node scripts/discipline_score.mjs --check` | 0 通过 · 1 停用或链断 · 2 取不到证据 |
| 反向用例自检 | `node scripts/discipline_score.mjs --selftest` | 0 反例全部判红成功 · 1 有反例未过 |
| 账面快照 | `node scripts/discipline_score.mjs status --json` | 0，输出 `current` / `suspended` / `entries` |
| 哈希链重算 | `node scripts/discipline_score.mjs verify-chain` | 0 自洽 · 1 有历史行被改动 |
| 委员独立复核 | `node scripts/discipline_score.mjs verify --json` | 0 未判评分失误 · 1 判失误并自动 L4 |
| 停用阻断实跑（R6 的"有牙"判据） | `node scripts/discipline_guard_probe.mjs` | 0 十四环全成立 · 1 停用只是措辞 |
| 输出两字段与结构 | `node scripts/output_audit.mjs --check` | 0 达标 · 1 不达标 · 2 取不到证据 |
| 用字合规 | `node scripts/language_audit.mjs --check` | 0 无生僻字 · 1 命中 · 2 取不到证据 |

## 七、边界：本系统不做的事

1. **不替代** [`scripts/audit_execution.sh`](../../scripts/audit_execution.sh)：那是每轮从零重算的 0~100 分静态审计
   （九维打分、无记忆、无后果、无否决）。纪律分是**独立第二本账**，两者不混算、不互相折算。
2. **不按工程分账**：全域 DSH 工程同一本账，无项目特权、无任何工程豁免。
3. **不做申诉通道**：用户扣分终局，只能追加说明，不能回滚。
4. **不跨条继承扣分**：新条目重新起 100 分，只有"停用状态"跨条继承。
5. **不另立第二份格式定义**：R8 两个字段的格式只在 `output_standard.md` 写一次，本文只登记"有这两个字段"。
