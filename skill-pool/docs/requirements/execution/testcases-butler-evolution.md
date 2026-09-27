# PKG-002 管家演进包测试用例集

> 关联需求：REQ-BUTLER-FISSION-014、REQ-BUTLER-CONSISTENCY-010、REQ-BUTLER-DUALFLOW-013、REQ-BUTLER-VIEWER-011、REQ-BUTLER-IMPORT-012
> 关联执行包：[pkg-002-butler-evolution.md](./pkg-002-butler-evolution.md)
> 全部用例以 Exit Code == 0 为通过；任一非 0 即整体不予验收。
> **本表状态为实施完成后的实跑结果。**

## 1. REQ-BUTLER-FISSION-014 粒度递归分裂门禁

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-FISSION-014-01** | 探针声明缺失即拒 | `python3 skills/plan-fission/scripts/plan_fission.py --input docs/requirements/execution/fixtures/sop-unbound.md --strict` | 明确指出缺失探针的步骤编号，Exit Code == 1 | ✅ 通过（unbound = 步骤 1/2/3；vague = 适当/尽量/视情况/友好/美观） |
| **TC-FISSION-014-02** | 分裂清单非空且可绑定 | 同一夹具去掉 `--strict` | 输出非空分裂清单，每步均绑定四类探针之一，Exit Code == 0 | ✅ 通过（plan 3 条，suggested_probe 全合法） |
| **TC-FISSION-014-03** | 门禁阻断能力 | `fission_guard.py --target <unbound>/<bound>/--report` | 不可断言则阻断 1；合格放行 0；`--report` 恒 0 | ✅ 通过（1 / 0 / 0，阻断输出含步骤序号） |

## 2. REQ-BUTLER-CONSISTENCY-010 口径单一真相源

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-CONSISTENCY-010-01** | 三方一致 | `./bin/skill-pool consistency` | Exit Code == 0 | ✅ 通过（82 个技能对齐，5 个 `@system` 不参与 Frontmatter 比对） |
| **TC-CONSISTENCY-010-02** | 篡改可检出（反向验证） | 改 `docs` 受管区块一行 → 重跑 | Exit Code == 1，指出差异 | ✅ 通过（C3 managed block drift detected） |
| **TC-CONSISTENCY-010-03** | 生成器幂等 | 连续两次跑 `render_docs.py`，比对哈希 | 两次一致，无重复注入 | ✅ 通过（`changed: false`；sha256 `4fa9e2dd…`→`4fa9e2dd…`） |
| **TC-CONSISTENCY-010-04** | §7.2 手写漂移可检出 | 篡改 §7.2 组装行 → 重跑对拍 | C4 命中并打印行号 | ✅ 通过（`C4 line 125 prose assembly drift for 'intent-detector'`）；§7.2 两处原始漂移已修正 |
| **TC-CONSISTENCY-010-05** | 受管标记成对 | 行锚定正则检查 BEGIN/END | 各恰好 1 处 | ✅ 通过（BEGIN 1 / END 1） |

## 3. REQ-BUTLER-DUALFLOW-013 双流程分流

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-DUALFLOW-013-01** | 只读查询走快速流程 | `score_lane.py --task "读取并解释 docs/requirements/index.md 的内容"` | `lane == "fast"` | ✅ 通过（fast / score 4） |
| **TC-DUALFLOW-013-02** | 单文件改注释走快速流程 | `--task "修改 README 里的一行注释" --files 1 --steps 2` | `lane == "fast"` | ✅ 通过（fast / score 3） |
| **TC-DUALFLOW-013-03** | 需求变更强制完整流程 | `--task "变更需求 REQ-BUTLER-013 的验收标准"` | `lane == "full"`，红线含 R3 | ✅ 通过（full / R3） |
| **TC-DUALFLOW-013-04** | 批量删除强制完整流程 | `--task "删除旧的日志目录" --files 3` | `lane == "full"`，红线命中 | ✅ 通过（full / R1 + R5） |
| **TC-DUALFLOW-013-05** | 发布推送强制完整流程 | `--task "部署到生产环境并 push 到远端"` | `lane == "full"`，红线命中 | ✅ 通过（full / R2） |
| **TC-DUALFLOW-013-06** | 判定确定性（10 次复算） | `verify_lane.py --task <样本> --repeat 10` | 10 次 lane 100% 一致，Exit Code == 0 | ✅ 通过（fast 与 full 两个样本均 `consistent: true`） |
| **TC-DUALFLOW-013-07** | 输出字段完整 | 解析 stdout JSON | 含 `lane` / `score` / `matched_redlines` / `reason` | ✅ 通过（四字段齐全） |

## 4. REQ-BUTLER-VIEWER-011 可缩放查看器

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-VIEWER-011-01** | 查看器产物落地 | `build_viewer.py --image /tmp/t21/sample.png --out /tmp/t21/viewer.html` | 文件存在且 > 0 字节，Exit Code == 0 | ✅ 通过（6702 字节，exit 0） |
| **TC-VIEWER-011-02** | 缩放控制器齐备 | `verify_html.py --file /tmp/t21/viewer.html --json` | 三个 `data-zoom-*` 标识齐全，Exit Code == 0 | ✅ 通过（18 项检查全过；缺 `data-zoom-in` 的反向样本 exit 1） |
| **TC-VIEWER-011-03** | 零外部依赖 | 正则扫描 `src="http` / `href="http` / `<script src=` / `<link ` | 0 命中 | ✅ 通过（0 命中；SVG 的 `xmlns` 命名空间不计为外链） |
| **TC-VIEWER-011-04** | 人工交互可用 | 浏览器打开并点击、按 `+ / − / 复位` | 图形可放大、可缩小、可复位 | ⏳ 待人工（环境无浏览器自动化；静态断言与事件绑定审查已通过） |

## 5. REQ-BUTLER-IMPORT-012 GitHub 技能引入

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-IMPORT-012-01** | 候选清单结构化 | `search_skill.py --query pdf --from-json <候选>` | 合法 JSON，含 name/url/license/has_scripts/stars/description，Exit Code == 0 | ✅ 通过（source=from-json；缺来源文件 exit 1） |
| **TC-IMPORT-012-02** | 非白名单许可被拒 | `audit_skill.py --candidate <MIT / UNKNOWN>` | MIT accept 0；UNKNOWN reject 1 | ✅ 通过（0 / 1，拒绝理由明确） |
| **TC-IMPORT-012-03** | 契约归一幂等 | 临时技能连跑两次 `normalize_skill.py`，比对 sha256 | 两次哈希一致 | ✅ 通过（`6c66b508…`==`6c66b508…`；临时技能已删除，零残留） |
| **TC-IMPORT-012-04** | 能定位应挂载父级 | `place_skill.py --name interactive-image-viewer --dry-run` | 输出集群/级别/父级建议，`composition_ok` 校验通过 | ✅ 通过（⑤ 需求与透视 / L3 / composition_ok true；不存在技能 exit 1） |
| **TC-IMPORT-012-05** | 引入后通过全量门禁 | `./bin/skill-pool validate && ./bin/skill-pool consistency` | 两者 Exit Code == 0 | ✅ 通过 |

## 6. 终局整体回归（T21）

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-FINAL-001** | 编目同步并达 87 项 | `sync_catalog.py` 后读取 `total_skills` | `total_skills == 87`，L1 23 / L2 39 / L3 24 / L4 1 | ✅ 通过 |
| **TC-FINAL-002** | 全量技能合规 | `audit_compliance.py` | 100% 合规，Exit Code == 0 | ✅ 通过（82/82，failed 0） |
| **TC-FINAL-003** | CLI 最小充分自检 | `--version && status && validate && consistency` | 四条命令 Exit Code 全 0 | ✅ 通过（skill-pool 0.2.0） |
| **TC-FINAL-004** | 需求追溯完整性 | 检查 5 条需求在 index.md 在列，各有 product.md 章节与执行包任务 | 无孤立需求、无孤立任务 | ✅ 通过 |

## 7. 实施过程中对需求的修正记录

实施时发现三处原始描述与物理可实现性冲突，已就地修正并记录：

| 编号 | 原描述 | 实际实现 | 原因 |
| :--- | :--- | :--- | :--- |
| AMEND-1 | 加权分「得分 < 3 → 快速流程」 | **得分 ≥ 3 → 快速**（五项均为简单性判据，越高越简单） | 原文阈值方向与判据语义相反，原样实现会让只读查询走完整流程 |
| AMEND-2 | 红线含「写入或删除文件」 | 红线收窄为「删除/清空/覆盖既有」，普通单文件编辑不属红线 | 原描述会让「改一行注释」也被强制走完整流程，双流程失去意义 |
| AMEND-3 | §14.2 要求受管区块同时注入 `skills-catalog.md` | 受管区块只落 `product.md`；`skills-catalog.md` 由 `sync_catalog.py` 全量生成，改用 C5 做数量对拍 | 该文件本身已由脚本全量生成，二次注入会在下次 sync 时被覆盖而产生假漂移 |
| AMEND-4 | TC-FISSION-014-01 未写门禁模式 | 该用例命令补 `--strict` | 方案模式（输出清单）与门禁模式（阻断）需用参数区分，否则与 TC-02 的预期退出码冲突 |

## 8. 实施后的粒度自审（额外证据）

实施完成后用 `atomic-fission-guard` 对全池 82 个本地技能逐个体检，首轮结果 **0/19**（新增技能）暴露出**门禁工具本身粒度过粗**：

| 问题 | 现象 | 修正 |
| :--- | :--- | :--- |
| 步骤抽取过宽 | `plan-fission` 把全文所有 `- ` 与 `N.` 行都当步骤，`When to Use` / `Boundaries` 的说明性列表被误判为 SOP 步骤 | 改为**只审查 `## Workflow` 章节**内的有序步骤，跳过代码围栏 |
| 模糊词扫描过宽 | 在全文扫描模糊词，导致「把禁止词写进规约」的 `enforce-atomic-granularity` 自己永远不合规 | 改为**只扫描提取出的步骤文本**，并按步骤号报告 |

修正后复测：

| 范围 | 结果 |
| :--- | :--- |
| 新增 19 个技能 | ✅ 19/19（10 个技能补打 17 处探针标记后达标） |
| 全池 82 个本地技能 | ✅ 82/82（同时为 `dsh-butler`、`concise-chinese-bold-guard` 补齐探针标记） |
| 夹具回归 | ✅ `sop-unbound` → exit 1；`sop-bound` → exit 0 |
| 门禁四连 | ✅ `validate` / `consistency` / `audit_compliance` / 三方对拍 全部 exit 0 |

> 结论：R5 的递归分裂原则在实施中真的生效了一次 —— 它先分裂了「门禁工具自身」的粒度，再来衡量其他技能。

