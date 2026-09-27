# `skill-pool list`

列出当前仓库内已登记的所有 Skill、规范有效性、描述以及在目标运行环境（默认 `~/.codex/skills/`）中的软链接绑定状态。

## 用法
```bash
./bin/skill-pool list [--target <DIR>] [--json]
```

## 参数
- `--target`：指定运行环境技能根目录，默认为环境变量 `$SKILL_TARGET_DIR` 或 `~/.codex/skills`。
- `--json`：输出结构化 JSON 数据。

## 示例
```bash
$ ./bin/skill-pool list
📦 Skill Pool 仓库已登记技能 (2 个):
🎯 默认同步目标目录: /Users/linqiyu/.codex/skills
------------------------------------------------------------------------------
  ✅ my-tool                  🔗 [已软链] - Useful tool for automated workflows
  ✅ data-analyzer            [未链接] - Data analysis assistant
------------------------------------------------------------------------------
```
