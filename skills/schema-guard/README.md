# schema-guard

结构化输出守卫技能，保证 LLM 在结构化数据输出场景中杜绝发散与随机。

## 目录结构
- `SKILL.md`: 提示词层面的强硬约束规约与零套话法则。
- `scripts/validate_schema.py`: 用于提取、剥离非结构化噪音、校验合法性的小工具。

## 配套工具使用
```bash
# 校验并提取纯净 JSON
python3 skills/schema-guard/scripts/validate_schema.py --input raw_output.txt --format json
```
