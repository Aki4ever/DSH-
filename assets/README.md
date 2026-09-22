# assets 目录说明

## 📌 目录定位
- **路径**: `assets/`
- **主要作用**: 存放工程产出的静态资源文件，当前主要为规则体系配套的架构图、流程图与教学信息图。

---

## 📂 子目录

| 子目录 | 定位 |
| :--- | :--- |
| `generated_images/` | 由 `scripts/generate_image.py` 自动生成并落盘的 SVG / PNG 图形资产 |

---

## 📋 收纳规范
1. 图形资产统一由生成脚本输出，不建议手工拖入；
2. 命名遵循「语义化小写下划线」或「时间戳_语义描述」两种形制；
3. 重要图形须在 `memory/asset_fingerprint_ledger.md` 登记数字指纹，防止静默丢失；
4. 新增资产后同步更新 `docs/diagram_generation_guide.md` 的引用。

---

## 🛠️ 维护原则
- 遵循 `rules/coding/atomicity_specification.md`：生成失败不得留下半个文件；
- 定期用 `scripts/fingerprint_audit.sh` 校验资产完整性；
- 保持文档全中文、通俗直白、无生僻字。
