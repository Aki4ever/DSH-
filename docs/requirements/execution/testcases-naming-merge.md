# PKG-007 命名与合并包测试用例

| 字段 | 值 |
| --- | --- |
| 执行包 | PKG-007 |
| 关联需求 | REQ-BUTLER-ATOMICLOCK-030、REQ-KB-CAPABILITYNAMING-031、REQ-LAYER-NAMINGAUDIT-032、REQ-REPO-MERGE-033、REQ-REPO-GITPUBLISH-034 |
| 需求基线版本 | v0.3.0 |
| 状态 | 全部实跑通过 |

---

## 一、ATOMICLOCK-030 物理原子锁

| 用例编号 | 场景 | 命令 | 期望 | 实测 |
| --- | --- | --- | --- | --- |
| TC-ATOMICLOCK-030-01 | 首次获取锁成功 | `atomic_lock.py acquire --key skills/a/SKILL.md --timeout 5` | exit 0，`acquired=true`，返回 token | ✅ exit 0 |
| TC-ATOMICLOCK-030-02 | 锁键归一化：不同写法必得同一键 | `acquire --key ./skills/a/../a/SKILL.md` | 与 01 命中同一 `lock_path` | ✅ 归一化后键逐字相同 |
| TC-ATOMICLOCK-030-03 | lease 模式下持有者进程退出 ≠ 锁失效 | `acquire`（短命 CLI）后 `status` | `held=1 stale=0` | ✅ held 1 / stale 0 |
| TC-ATOMICLOCK-030-04 | 已持锁时再次获取必冲突 | `acquire --timeout 0.3` | exit 1，`reason=wait_timeout` | ✅ exit 1 |
| TC-ATOMICLOCK-030-05 | release 校验 token，拒绝释放他人锁 | `release --token 1:wrong` | exit 1，`reason=token_mismatch` | ✅ exit 1 |
| TC-ATOMICLOCK-030-06 | 正确 token 释放成功 | `release --token "<真实 token>"` | exit 0，`released=true` | ✅ exit 0 |
| TC-ATOMICLOCK-030-07 | PID 复用判据：pid 存活但 start_ticks 不符 | 伪造 `owner.json` 后 `status` | `stale` / `pid_reused_start_ticks_mismatch` | ✅ 命中 |
| TC-ATOMICLOCK-030-08 | 死 PID 锁可回收 | 伪造 pid 999999 后 `acquire` | 回收后 exit 0，`reclaimed` 非空 | ✅ 命中 |
| TC-ATOMICLOCK-030-09 | 持有超时判陈旧 | `--timeout 0.5` 获取后 sleep 0.8 再 `status` | `stale` / `hold_timeout_exceeded` | ✅ 命中 |
| TC-ATOMICLOCK-030-10 | `run` 模式子命令退出码透传 | `run -- /bin/sh -c 'exit 7'` | `child_exit_code=7` 且 `released=true` | ✅ 7 / released |
| TC-ATOMICLOCK-030-11 | `run` 模式 SIGTERM 仍释放 | 启动 `run -- sleep 30` 后 `kill -TERM` | 锁根无残留 | ✅ 无残留 |
| TC-ATOMICLOCK-030-12 | **互斥压测：持锁段重叠必须为 0** | `verify_mutual_exclusion.py --workers 16 --rounds 20` | `overlap_windows=0`、`max_concurrent=1`、完成 320/320 | ✅ 0 / 1 / 320 |
| TC-ATOMICLOCK-030-13 | **控制段必须看得见并发（防假阴性）** | 同上，`control` 段 | `overlap_windows>0` 且 `max_concurrent>1` | ✅ 318 / 17 |
| TC-ATOMICLOCK-030-14 | 陈旧锁回收段 | 同上，`stale` 段 | `detected_stale=true` 且 `reclaimed_and_acquired=true` | ✅ 双真 |
| TC-ATOMICLOCK-030-15 | 依赖缺失必须退 2，不得内置兜底锁 | 移除 `atomic_lock.py` 后运行压测 | exit 2，`dependency_missing` | ✅ exit 2 |

---

## 二、CAPABILITYNAMING-031 知识库能力层命名规则

| 用例编号 | 场景 | 命令 | 期望 | 实测 |
| --- | --- | --- | --- | --- |
| TC-CAPABILITYNAMING-031-01 | 真相源存在且可解析 | 读 `docs/operations/capability-naming.json` | 四要素 / 四形态 / 动词表 / 禁词 / 同义组齐备 | ✅ |
| TC-CAPABILITYNAMING-031-02 | 知识库文档已生成 | 读 `全局规则/knowledge/common/capability_naming_spec.md` | 文件存在且 > 0 字节 | ✅ 12874 B |
| TC-CAPABILITYNAMING-031-03 | 本仓文档已生成 | 读 `docs/operations/capability-naming.md` | 文件存在且 > 0 字节 | ✅ 11906 B |
| TC-CAPABILITYNAMING-031-04 | 渲染幂等 | `render_naming_spec.py --write` 后再 `--check` | `verdict=in_sync`、`drift=0`、exit 0 | ✅ exit 0 |
| TC-CAPABILITYNAMING-031-05 | 漂移可检出 | 手工改动受管区块后 `--check` | exit 1、`status=drift` | ✅ exit 1 |
| TC-CAPABILITYNAMING-031-06 | 知识库路径自动探测 | 在合并前布局下运行 | `knowledge_dir` 命中 `<repo>/../全局规则/knowledge/common` | ✅ 命中候选 2 |
| TC-CAPABILITYNAMING-031-07 | 真相源缺失必须退 2 | 临时移走 JSON | exit 2，`spec_unreadable` | ✅ exit 2 |
| TC-CAPABILITYNAMING-031-08 | 知识库不可达不阻断本仓 | 设 `DSH_GLOBAL_RULES_DIR` 指向不存在路径 | exit 0、输出 `warning` | ✅ exit 0 |

---

## 三、LAYER-NAMINGAUDIT-032 命名规范管理与存量整改

| 用例编号 | 场景 | 命令 | 期望 | 实测 |
| --- | --- | --- | --- | --- |
| TC-NAMINGAUDIT-032-01 | 整改前体检出真违规 | `audit_naming.py --all` | exit 1，命中形态与同义别名违规 | ✅ 0.9811（156/159） |
| TC-NAMINGAUDIT-032-02 | 违规项带 `file:line` | 同上，看 `violations[].location` | 形如 `skill-catalog.json:1234` | ✅ |
| TC-NAMINGAUDIT-032-03 | 干跑不写任何文件 | `rename_layer.py --plan … --dry-run` | 输出影响面，`mode=dry_run` | ✅ 61 个文件 |
| TC-NAMINGAUDIT-032-04 | 非法目标名被拦 | `--rename "…=helper-util-stuff"` | exit 1，`target_invalid` + 禁词理由 | ✅ 命中 3 个禁词 |
| TC-NAMINGAUDIT-032-05 | 目标被占用被拦 | `--rename "a=已存在的 id"` | `target_taken` | ✅ |
| TC-NAMINGAUDIT-032-06 | 执行整改同步六处 | `--plan … --apply --rebuild` | 3 次改名成功，五件产物重建全 0 | ✅ 61 文件 / 5 产物 |
| TC-NAMINGAUDIT-032-07 | 整改器幂等 | 再次 `--apply` | `already_applied`，`changed_files_total=0`，exit 0 | ✅ changed 0 |
| TC-NAMINGAUDIT-032-08 | 无双重后缀 | `ls skills/ \| grep -E "guard-guard\|router-router"` | 空 | ✅ 空 |
| TC-NAMINGAUDIT-032-09 | 整改后合规率 100% | `verify_naming.py --strict` | `compliance_rate=1.0000`、exit 0 | ✅ 165/165 |
| TC-NAMINGAUDIT-032-10 | 悬空引用为 0 | 同上，看 `dangling_total` | 0 | ✅ 0 |
| TC-NAMINGAUDIT-032-11 | **悬空检测可证伪** | 注入一行含旧名的注释后重跑 | `no_dangling_ref` 转 ❌，`dangling_total` 由 0 变 1 | ✅ 命中 |
| TC-NAMINGAUDIT-032-12 | 词边界扫描消除假阳性 | 未加词边界时统计 | —— | ✅ 误报 47 → 修复后 0 |
| TC-NAMINGAUDIT-032-13 | 台账允许清单是显式的 | 读 `retired-names.json` | `allowed_contexts` 逐文件带 `reason` | ✅ 3 条 |
| TC-NAMINGAUDIT-032-14 | 清单之外仍硬失败 | 把旧名写进非允许文件 | `no_dangling_ref` 转 ❌ | ✅ 命中 |
| TC-NAMINGAUDIT-032-15 | 三处一致性 | 目录名 / catalog id / Frontmatter name | 逐字一致（165 条） | ✅ 违规 0 |

---

## 四、REPO-MERGE-033 目录合并与任务会话迁移

| 用例编号 | 场景 | 命令 | 期望 | 实测 |
| --- | --- | --- | --- | --- |
| TC-REPOMERGE-033-01 | 合并前快照 | 读 `docs/operations/merge-snapshot.json` | 双仓 sha 与文件数齐备 | 见交付回执 |
| TC-REPOMERGE-033-02 | 新旧目录条目逐条相等 | 对比源与 `全局规则/skill-pool/` | 差值 0 | 见交付回执 |
| TC-REPOMERGE-033-03 | 合并保留提交历史 | `git log --oneline` 在 `全局规则` 内可见 Skill池 历史 | 历史可追溯 | 见交付回执 |
| TC-REPOMERGE-033-04 | 新位置十道门禁全绿 | 在 `全局规则/skill-pool/` 内跑全部门禁 | 全 0 | 见交付回执 |
| TC-REPOMERGE-033-05 | 任务会话登记已切换 | 读 `workspace.json` | `Skill池` 的 `sessionIds` 已并入 `全局规则` | 见交付回执 |
| TC-REPOMERGE-033-06 | 可回滚 | `workspace.json.bak-*` 存在 | 覆盖即还原 | 见交付回执 |
| TC-REPOMERGE-033-07 | 源目录不中断 | 本会话 cwd 仍可读可执行 | 无断链 | ✅ 全程未中断 |

---

## 五、REPO-GITPUBLISH-034 提交与推送

| 用例编号 | 场景 | 命令 | 期望 | 实测 |
| --- | --- | --- | --- | --- |
| TC-GITPUBLISH-034-01 | 账号门禁 | `gh auth status` | 活动账号为授权账号 | ✅ `akidotdot-ai` |
| TC-GITPUBLISH-034-02 | 提交说明非空 | 查看提交信息 | 标题 + 主要修改 / 影响范围 / 验证结果 | 见交付回执 |
| TC-GITPUBLISH-034-03 | 工作树干净 | `git status --short` | 空 | 见交付回执 |
| TC-GITPUBLISH-034-04 | 无待推送提交 | `git log origin/main..HEAD` | 空 | 见交付回执 |

---

## 六、全量门禁回归

| 门禁 | 命令 | 期望 | 实测 |
| --- | --- | --- | --- |
| 技能规范 | `./bin/skill-pool validate` | exit 0 | ✅ 0 |
| 口径一致性 | `./bin/skill-pool consistency` | exit 0 | ✅ 0 |
| 契约合规 | `audit_compliance.py` | exit 0 | ✅ 0 |
| 执行层树 | `verify_tree.py` | exit 0 | ✅ 0 |
| 依赖图幂等 | `build_layer_graph.py --check` | exit 0 | ✅ 0 |
| 耦合检测 | `detect_coupling.py` | exit 0 | ✅ 0 |
| 解耦断言 | `verify_decoupling.py` | exit 0 | ✅ 0 |
| 实例安全 | `verify_instance_safety.py` | C1~C4 全过 | ✅ 全过 |
| 命名断言 | `verify_naming.py --strict` | exit 0 | ✅ 0 |
| 文档漂移 | `render_naming_spec.py --check` | exit 0 | ✅ 0 |
| 互斥压测 | `verify_mutual_exclusion.py --workers 16 --rounds 20` | exit 0 | ✅ 0 |
| 检索评测 | `search_skills.py --eval` | exit 0 | ✅ 0 |
| 粒度夹具 | `plan_fission.py --input sop-bound.md` / `sop-unbound.md --strict` | 0 / 1 | ✅ 0 / 1 |
| 粒度全池 | 逐技能 `plan_fission.py --strict` | 全过 | ✅ 161/161 |
