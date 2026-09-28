# audit-imported-skill

「GitHub 技能引入管线」（REQ-BUTLER-IMPORT-012 / T17）第 2 步：引入候选审计与接受/拒绝裁决。

## 用途

对候选条目执行 5 项体检并逐项给出理由：许可白名单、来源 URL 是否 https、是否声明含脚本、描述是否非空、名称是否 kebab-case。
输出 `accept` / `reject` 裁决，**被拒绝的候选必须带明确理由，不得静默丢弃**。

许可白名单（大小写不敏感，`UNKNOWN` 视为不通过）：
`MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0, Unlicense, CC0-1.0`

## 使用方式

```bash
# 内联 JSON 候选
python3 skills/audit-imported-skill/scripts/audit_skill.py \
  --candidate '{"name":"pdf-toolkit","url":"https://github.com/acme/pdf-toolkit","license":"MIT","has_scripts":true,"description":"PDF 处理"}'

# 候选 JSON 文件
python3 skills/audit-imported-skill/scripts/audit_skill.py --candidate /tmp/candidate.json

# 只看裁决，不关心细节
python3 skills/audit-imported-skill/scripts/audit_skill.py --candidate /tmp/candidate.json --json
```

| 参数 | 说明 |
| :--- | :--- |
| `--candidate` | 候选条目 JSON 文件路径，或内联 JSON 字符串（必填） |
| `--json` | 以 JSON 输出（默认行为，保留以兼容脚本化调用） |

## 退出码表

| 退出码 | 语义 |
| :--- | :--- |
| `0` | 裁决 `accept`：全部硬性检查通过 |
| `1` | 裁决 `reject`：任一硬性检查失败，`reasons` 给出明确理由 |
| `2` | 输入不可解析（既不是可读文件，也不是合法 JSON） |

## 上下游

- **上游**：`search-github-skill` 产出的候选清单，或人工/工具整理的单条候选 JSON。
- **下游**：`normalize-skill-contract`（仅 `accept` 候选可进入归一），最终由 L3 `skill-import-pipeline` 串联。
