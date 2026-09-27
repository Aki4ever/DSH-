# REQ-BUTLER-SPEC-GOVERNANCE-009 测试用例集

| 用例编号 | 测试目标 | 执行命令 / 检验方式 | 预期物理结果 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-SPEC-001** | 7大知识库规范文件落地检测 | 物理探针检查 `docs/knowledge/standards/` 7个文件是否存在且 > 0 字节 | 7个规范文件全部存在，大小非空 | 待运行 |
| **TC-SPEC-002** | 需求文档版本一致性自检 | `python3 skills/sync-requirements-lifecycle/scripts/sync_reqs.py` | 识别最新版本，Exit Code == 0 | 待运行 |
| **TC-SPEC-003** | 7大规范冲突对拍与优先级仲裁 | `python3 skills/reconcile-knowledge-specs/scripts/reconcile_specs.py --check-all` | 规范完整且未违背，Exit Code == 0 | 待运行 |
| **TC-SPEC-004** | 测试用例门禁自动化执行 | `python3 skills/run-test-cases-gate/scripts/run_testcases.py` | 全量用例通过，Exit Code == 0 | 待运行 |
| **TC-SPEC-005** | 全量技能池合规体检 | `python3 skills/audit-all-skills-compliance/scripts/audit_compliance.py` | 100% 合规通过 (60+/60+) | 待运行 |
