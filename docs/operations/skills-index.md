# 项目 Skill 索引

| Skill | 项目用途 | 触发条件 | 注意事项 |
| --- | --- | --- | --- |
| `manage-requirements` | 当前需求、版本和执行包 | 所有项目任务 | 先从唯一需求入口定位 |
| `manage-problem-log` | 问题复盘与防复发 | 问题诊断或 Bug 修复 | 先检索历史，相同问题更新原记录 |
| `confirm-before-coding` | 修改前批准范围 | 文件或外部状态变更 | 范围未变化时不重复确认 |
| `track-task-progress` | 实时步骤 | 写入或多阶段任务 | 单次只读可使用轻量 1/1 |
| `github` | 提交备注和 GitHub | 提交、推送、PR、发布 | 高风险操作单独确认 |
| `dsh-butler` | DSH执行层全局管家调度中枢 | 全域调度与动态造物 | 拥有最高权限，纳管6大执行层 |
| `concise-chinese-bold-guard` | 文本输出格式规约器 | 需限制10字内、黑体、中文 | 由管家动态创建的示范规范Skill |
| `schema-guard` | 结构化输出守卫 | 输出纯JSON/YAML/Schema契约 | 杜绝套话与格式错误，零闲聊输出 |
| `qa-gatekeeper` | 交付门禁与质量守卫 | 任务交付前物理与语法检查 | 防范虚假交付与遗漏 |

## 全局资产编目 (Catalog)
- 完整机器可读 Catalog：[`skill-catalog.json`](./skill-catalog.json)
- 人机查阅路由映射表：[`skills-catalog.md`](./skills-catalog.md)
- 编目自动同步维护命令：`python3 skills/dsh-butler/scripts/sync_catalog.py`
