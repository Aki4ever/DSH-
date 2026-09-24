# 项目工作流

## 1. 规范流转
1. 从 `docs/requirements/index.md` 获取当前生效需求与基线。
2. 根据 `docs/operations/global-rules-index.md` 指纹决定增量或完整规则审计。
3. 问题诊断或 Bug 修复先用 `manage-problem-log` 检索历史记录。
4. 使用项目适用 Skill 执行并采用最小充分验证。
5. 更新受影响的问题、需求、CLI、界面和操作索引。
6. 提交或推送前使用 `github` 生成并展示非空备注。

## 2. 常用开发与维护命令
- 查看技能列表：`./bin/skill-pool list`
- 技能规范校验：`./bin/skill-pool validate`
- 状态统计：`./bin/skill-pool status`
- 新建技能脚手架：`./bin/skill-pool init <skill-name>`
- 软链到运行环境：`./bin/skill-pool link <skill-name>`
- 最小充分自检命令：
  ```bash
  ./bin/skill-pool --version && ./bin/skill-pool status && ./bin/skill-pool validate
  ```
