# `skill-pool validate`

校验指定或全部 Skill 是否符合规范契约。

## 校验规则
1. 目录名必须为合法 kebab-case（全小写字母、数字及连字符，如 `pdf-parser`）。
2. 必须存在 `SKILL.md` 文件。
3. `SKILL.md` 必须包含标准 YAML Frontmatter，且必须包含 `name` 与 `description`。
4. `SKILL.md` 中的 `name` 必须与所在目录名完全一致。

## 用法
```bash
./bin/skill-pool validate [<SKILL_NAME>] [--json]
```

## 参数
- `SKILL_NAME`（可选）：指定校验单个技能。若不填则校验 `skills/` 下的所有技能。
- `--json`：输出 JSON 校验结果。

## 退出码
- `0`：校验全量通过。
- `1`：存在违背规范项。
