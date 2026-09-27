# 工程与代码规范 (Engineering & Code Standard)

## 1. 物理确定性原则
- 任何声称具备的功能，必须落地为物理磁盘上的可执行脚本或原子规约；
- Python 脚本执行成功退出码必须严格为 `0`，报错或未达标必须为 `1`。

## 2. 技能目录标准结构
```text
skills/<skill-name>/
├── SKILL.md       # Frontmatter元数据 + When to Use + Workflow/SOP
├── README.md      # 简明说明
└── scripts/       # L2 工序工具专属执行脚本目录
```

## 3. 分裂原则
- 凡是包含主观修饰词（“适当”、“尽量”）或一个步骤包含多重复杂逻辑的技能，管家必须自动向下裂变为 L1 微规约或 L2 动作脚本。
