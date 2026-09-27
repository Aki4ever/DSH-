# qa-gatekeeper

交付门禁与质量守卫技能，保证任务在交付前必须通过严格的物理落地与语法核验。

## 目录结构
- `SKILL.md`: 终审门禁准则与自检清单规范。
- `scripts/check_delivery.py`: 本地文件物理存在与基础语法校验脚本。

## 脚本使用
```bash
# 检查一批生成/修改的文件是否真正落地且语法合规
python3 skills/qa-gatekeeper/scripts/check_delivery.py --files file1.py file2.json
```
