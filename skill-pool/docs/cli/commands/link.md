# `skill-pool link`

将当前仓库内的指定 Skill 以符号软链接（symlink）的形式发布至目标运行环境目录。

## 用法
```bash
./bin/skill-pool link <SKILL_NAME> [--target <DIR>] [--force] [--json]
```

## 参数
- `SKILL_NAME`（必需）：待同步软链的技能目录名。
- `--target`：目标目录，默认 `~/.codex/skills/`。
- `--force`：若目标路径已存在同名实体目录/文件而非软链接，显式强制覆盖替换。
- `--json`：输出 JSON 结果。
