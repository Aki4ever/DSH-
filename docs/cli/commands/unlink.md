# `skill-pool unlink`

安全解除目标运行环境中的 Skill 软链接。

## 用法
```bash
./bin/skill-pool unlink <SKILL_NAME> [--target <DIR>] [--json]
```

## 安全约束
若目标路径存在但不是软链接（例如是原本就存在的物理目录），本命令会拒绝删除并提示用户手动操作，以杜绝意外数据损坏。
