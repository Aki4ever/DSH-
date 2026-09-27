# `skill-pool init`

基于 `skills/_template` 模板在 `skills/<skill-name>/` 下快速初始化新技能结构。

## 用法
```bash
./bin/skill-pool init <SKILL_NAME> [--title <TITLE>] [--description <DESC>] [--json]
```

## 参数
- `SKILL_NAME`（必需）：新技能目录名，必须为 kebab-case。
- `--title`：技能人类可读标题。
- `--description`：技能意图描述。
- `--json`：输出初始化结果 JSON。
