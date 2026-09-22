# 规则与需求变更标准工作流 (Rule Change Workflow)

本文档规范了在日常研发与运营中，针对任何规则的“提出、查重、登记、落地、同步”标准操作规程。

---

## 🔄 标准六步变更循环

```text
1. 需求接收 ──▶ 2. 查重核验 ──▶ 3. 需求登记 ──▶ 4. 规则落地 ──▶ 5. 存量排查 ──▶ 6. Git 同步
   (接收指令)      (避免重复)     (登记台账)      (编写规则)      (清理旧资源)    (推送到远程)
```

---

### 第一步：需求接收与工单转化
- 接收新指令或规则需求；
- 提炼核心意图，转化为易于执行的结构化标准需求文案。

### 第二步：查重核验 (避免重复)
- **检索**：查看 [`docs/requirements.md`](../../docs/requirements.md) 与目标规则目录；
- **判断**：
  - 是否完全重复？ ➔ **直接拦截并说明，流程终止**；
  - 是否属于现有规则优化？ ➔ **进入增量演进分支**；
  - 是否为全新规则？ ➔ **进入新建分支**。

### 第三步：需求台账登记与同步
- 在 [`docs/requirements.md`](../../docs/requirements.md) 中建立新编号（如 `REQ-xxx`）或更新已有条目状态为 `[EVOLVING]`；
- 记录变更时间、核心诉求与预期影响范围。

### 第四步：规则文件精准落地
- 依据分类分别写入或更新：
  - `rules/system/`：系统元规则与底层约束；
  - `rules/workflow/`：流程规范、命名与协作标准；
  - `rules/coding/`：工程实践、代码与提交规范；
  - `rules/security/`：凭证防护与安全红线。

### 第五步：存量排查与旧资源治理
- 依据 [`rules/workflow/audit_and_cleanup.md`](audit_and_cleanup.md) 展开联动排查，消除死链与矛盾；
- 运行 `./scripts/disk_check_and_cleanup.sh --auto` 执行磁盘水位巡检与安全自愈清理。

### 第六步：自动化测试与 Git 语义化提交
- 真实执行质量测试用例，100% 绿灯方可准入提交；
- 执行 `git add .` 并编写语义化提交：
  - 新增：`feat(rule): add REQ-xxx <规则名称>`
  - 优化：`update(rule): refine REQ-xxx <更新说明>`
  - 废除：`deprecate(rule): retire REQ-xxx <废除原因>`
- 同步推送至远程 `origin/main`。

---

## 🧭 流程入驻：四道审计 + 四项登记（REQ-045）

**适用范围**：任何**新增或优化**的流程（新脚本、新判定、新规则、新通道、新模板），在正式生效前必须走完本节。
**为什么需要**：过去新增流程靠临场判断"该放哪、要不要进通道"，结果是流程散落各处、出现"有脚本但没人知道"的孤儿流程；
且判定能力（存量校准）的关键清单是写死的，新脚本漏登记时**扫描器发现不了**。本节把"入驻"变成可审计、可自动检出的动作。

### 一、四道审计（逐条给结论，不许跳过）

| 审计 | 判定手段 | 不通过怎么办 |
| :--- | :--- | :--- |
| **A1 查重** | `node scripts/redundancy_scan.mjs --root .` 无新增高相似对 | 与既有流程**合并为迭代版本**，保留单一权威源 |
| **A2 查冲突** | `node scripts/conflict_scan.mjs --root .` 无新增冲突 | **先出裁决方案，由用户确认后再改**（禁止自行取舍） |
| **A3 定位置** | 按下方《位置判定表》确定唯一权威落点 | 找不到合适位置时先补分类，不许随手塞进现有文件 |
| **A4 定判定手段** | 要么有能跑通的判定命令，要么明确标注"建议"级 | 没有判定手段的流程**一律不得写"必须"** |

### 二、位置判定表（新流程该放哪）

| 流程性质 | 权威落点 | 典型例子 |
| :--- | :--- | :--- |
| 不可违背的红线 | `AGENTS.md`（项目级）+ `$DSH_HOME/AGENTS.md`（宿主级） | 写后读回、不做未授权操作 |
| 门禁的判定逻辑与阈值 | [`scripts/control_gates.sh`](../../scripts/control_gates.sh) + [`ai-control/config/gates.conf`](../../ai-control/config/gates.conf) | 四道门禁的量化标准 |
| 一次性检查／扫描类流程 | `scripts/*.mjs`（判定层脚本） | 冗余检测、冲突检测、存量校准、通道审计 |
| 需要人工按步骤做的流程 | `rules/workflow/*.md`（并标注 🟢 强制 / 🟡 建议） | 任务执行流水线、本变更流程 |
| 高频的一句话调用 | [`indexes/shortcuts_index.md`](../../indexes/shortcuts_index.md)（快速通道注册表） | "看看管控机制""生成信息图" |
| 长期知识／避坑认知 | `memory/*.md` | 出图变形、检测器假阳性等经验 |
| 需求与版本留痕 | [`docs/requirements.md`](../../docs/requirements.md) + [`rules/workflow/versioning_standard.md`](versioning_standard.md) | 每次迭代的条目与升版 |
| 对外可视化说明 | `assets/generated_images/*` + `docs/` 说明 | 机制信息图 |

### 三、四项登记（缺一项即视为"没固化"）

1. **写进权威源**：只写一处，其余文件放指针，**不复述内容**；
2. **配判定命令**：写入 [`rules/workflow/task_execution_flow.md`](task_execution_flow.md) 的"核心判定命令表"（前提是该流程确有判定手段）；
3. **进快速通道**：可能被一句话调用的流程，必须按 [`indexes/shortcuts_index.md`](../../indexes/shortcuts_index.md) 的《快速通道注册规范》登记（触发词 + 路由 + **带链接的动作目标**）；
4. **登记台账**：在 [`docs/requirements.md`](../../docs/requirements.md) 留痕并注明实施版本。

### 四、固化是否到位，由机器判定（不靠自觉）

```bash
node scripts/legacy_align_scan.mjs --root .   # 枚举 scripts/ 下全部脚本，未被入口引用者报 L2-入口覆盖
node scripts/channel_audit.mjs --root .       # 通道表死链、说法能否命中、触发词是否冲突
```

- 存量校准会**从磁盘枚举**所有脚本（`.sh` / `.mjs` / `.py` / `.swift`），逐个要求"被入口引用"；
  因此**新脚本漏登记会被自动揪出来**，不再依赖人记得去登记；
- 确属本地工具或已退役、不需要入口引用的脚本，必须在 `legacy_align_scan.mjs` 的 `CANONICAL.refExempt`
  登记**并写明理由**（不允许无理由豁免）；
- 判定标准：`L2-入口覆盖` 中"脚本未登记"类必须清零。

> **一次真实教训**：`scripts/test_v180_spec.sh` 是 v1.8.0 的质量门禁，因断言写死元规则条号与工序编号，
> 随版本演进 26 项中 10 项长期失败，却因无人运行而无人知晓。它已退役，能力由全库活体判定取代。
> 结论：**判定要查活体事实，不要查写死的编号**；否则判定本身会成为下一个存量债。
