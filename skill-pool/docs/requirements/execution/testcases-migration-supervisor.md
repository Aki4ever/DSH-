# PKG-009 迁移收尾与流程监督员测试用例

| 字段 | 值 |
| --- | --- |
| 执行包 | PKG-009 |
| 关联需求 | REQ-GCM-GAPFIX-041、REQ-PROCESS-SUPERVISOR-040、REQ-REPO-MERGE-039 |
| 需求基线版本 | v0.5.0 |
| 状态 | 全部实跑通过 |

---

## 一、GCM-GAPFIX-041 缺口修复

| 用例编号 | 场景 | 手段 | 期望 | 实测 |
| --- | --- | --- | --- | --- |
| TC-GAPFIX-041-01 | 无会话存储时必须非 0 | `check_task_naming.sh --exit` | 退出码 ≠ 0 | ✅ 3（无 id）/ 1（有 id 无记录） |
| TC-GAPFIX-041-02 | 第三种存储布局可读 | 多帧 zstd 逐帧解压取 `session/title` | 读出真实标题 | ✅ 「查看管家下属树状结构」 |
| TC-GAPFIX-041-03 | 不合规给出可执行整改 | 运行 `--exit` 看提示 | 含 `name_me.sh` 命令 | ✅ |
| TC-GAPFIX-041-04 | G0 闭环 | `name_me.sh` 改名后重判 | 退出码 0 | ✅ `[优规001][85] 管控机制补缺` |
| TC-GAPFIX-041-05 | GCM 区分无法判定/不合规 | 看板卡点文案 | 分别显示 | ✅ |
| TC-GAPFIX-041-06 | G4 覆盖 skill-pool | 扫描文件数 | 由 71 升至数量级 | ✅ 465 |
| TC-GAPFIX-041-07 | G4 仍能抓真冗余 | 植入 >120 字复制块 | 相似对 0 → 1、门禁失败 | ✅ |
| TC-GAPFIX-041-08 | 删除后恢复 | 移除植入 | 相似对回 0、门禁通过 | ✅ |
| TC-GAPFIX-041-09 | 骨架行不再误报 | 豁免后看板 | 重复标题/单行最高标注报告项 | ✅ |
| TC-GAPFIX-041-10 | GCM 全绿 | `control_gates.sh card` | 4/4、100% | ✅ |

---

## 二、PROCESS-SUPERVISOR-040 流程监督员

| 用例编号 | 场景 | 命令 | 期望 | 实测 |
| --- | --- | --- | --- | --- |
| TC-SUPERVISOR-040-01 | 空证据必须失败 | `supervise.py --evidence <空目录>` | 退 1 | ✅ 20/100 |
| TC-SUPERVISOR-040-02 | 得分算式公开 | 同上，看 `arithmetic` | 含分子/分母/na | ✅ `20 / 100 = 20%（总权重 100，na 扣除 0）` |
| TC-SUPERVISOR-040-03 | 必需项一票否决 | 同上，看 `required_failed` | 非空 | ✅ `['S4','S6','S7','S8']` |
| TC-SUPERVISOR-040-04 | 合规证据必须通过 | `supervise.py --evidence <合规目录>` | 退 0 | ✅ 100/100 |
| TC-SUPERVISOR-040-05 | 缺证据判 unverifiable | 看 `failed[].unverifiable` | 全为真 | ✅ |
| TC-SUPERVISOR-040-06 | na 权重从分母扣除 | 无写入变更夹具 | 分母 < 总权重 | ✅（S6 判 na） |
| TC-SUPERVISOR-040-07 | 整改项必须可执行 | `plan_rectification.py` | 每项带命令 | ✅ 0 unresolved |
| TC-SUPERVISOR-040-08 | 空话整改判不合格 | 构造含「加强」的 rectify | 退 1 | ✅（逻辑断言） |
| TC-SUPERVISOR-040-09 | agent 降级必须知情 | 不给 `--agent-command` | `agent_review=skipped` + 提示 | ✅ |
| TC-SUPERVISOR-040-10 | 步骤表权重合计 100 | 读 `process-spec.json` | = 100 | ✅ |

---

## 三、REPO-MERGE-039 迁移收尾

| 用例编号 | 场景 | 命令 | 期望 | 实测 |
| --- | --- | --- | --- | --- |
| TC-MERGE-039-01 | 源侧有独有文件时必须阻断 | 干跑（源侧有独有文件时） | 退 1 且列出丢失文件 | ✅（content_loss 分支） |
| TC-MERGE-039-02 | 目标工作树脏时必须阻断 | 干跑 | 退 1 且列出 dirty | ✅ |
| TC-MERGE-039-03 | 不丢文件语义 | 干跑（差异 50 处但源侧独有 0） | 通过第 1 步 | ✅ |
| TC-MERGE-039-04 | 退役执行 | `--apply` | 台账 + 摘注册 + 删目录 | ✅ |
| TC-MERGE-039-05 | 退役后三项断言 | `verify_retirement.py --all` | 退 0 | ✅ |
| TC-MERGE-039-06 | 幂等 | 再次 `--apply` | `already_retired` 退 0 | ✅ |
| TC-MERGE-039-07 | workspace.json 已备份 | 检查 `.bak-<时间戳>` | 存在 | ✅ |

---

## 四、全量门禁回归（十四道）

`validate` / `consistency` / `audit_compliance` / `verify_tree` / `build_layer_graph --check` /
`detect_coupling` / `verify_decoupling` / `verify_instance_safety` / `verify_naming --strict` /
`render_naming_spec --check` / `verify_html`(26/26) / `verify_plugin_button`(31/31) /
`search_skills --eval` / 粒度夹具（bound=0、unbound --strict=1）—— **全部通过**。
`__pycache__` 残留 0。

编制：skill 175 → 182，**agent 3 → 4**，plugin 1，执行层总数 **196**。
