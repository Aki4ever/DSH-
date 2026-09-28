# normalize-skill-contract

「GitHub 技能引入管线」（REQ-BUTLER-IMPORT-012 / T18）第 3 步：外部技能契约归一（幂等）。

## 用途

在 `skills/<name>/` 下生成符合本池统一契约的 `SKILL.md` 与 `README.md`：

- Frontmatter：`name` / `level` / `composition`（仅 L3 写入）/ `description`；
- 正文：`## Overview` / `## When to Use`（正触发 + 触发禁区）/ `## Workflow`（Mermaid + 带 `[probe:...]` 标记的有序步骤）/ `## Usage & Script` / `## Success Contract` / `## Boundaries & Constraints`。

**幂等**：输出完全由参数决定，不含时间戳/随机数；同参数连续两次运行 `SKILL.md` 逐字节一致。

## 使用方式

```bash
# L2 归一
python3 skills/normalize-skill-contract/scripts/normalize_skill.py \
  --name pdf-toolkit --level L2 --description "PDF 解析与文本抽取工序技能"

# L3 复合技能（composition 写入 Frontmatter）
python3 skills/normalize-skill-contract/scripts/normalize_skill.py \
  --name pdf-pipeline --level L3 --composition pdf-scan,pdf-extract --description "PDF 处理总控"

# 自定义正文标题
python3 skills/normalize-skill-contract/scripts/normalize_skill.py \
  --name pdf-toolkit --level L2 --description "PDF 解析" --title "PDF Toolkit"
```

| 参数 | 说明 |
| :--- | :--- |
| `--name` | kebab-case 技能名（决定写入目录 `skills/<name>/`） |
| `--level` | `L1` / `L2` / `L3` / `L4` |
| `--description` | 技能描述，非空（写入 Frontmatter，自动压实为单行） |
| `--composition` | 逗号分隔组合依赖，仅 L3 写入 Frontmatter |
| `--title` | 正文一级标题，缺省复用 `--name` |

## 退出码表

| 退出码 | 语义 |
| :--- | :--- |
| `0` | 归一成功；stdout 输出 `{"success": true, "skill", "path", "created", "sha256"}` |
| `1` | 参数非法：name 非 kebab-case / level 非法 / description 为空 / composition 项非法 |

## 上下游

- **上游**：`audit-imported-skill` 裁决为 `accept` 的候选。
- **下游**：`place-skill-into-cluster`（定级挂载与集群归属），最终由 L3 `skill-import-pipeline` 串联并交 `./bin/skill-pool validate` 门禁。
