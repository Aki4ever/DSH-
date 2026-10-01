# data 目录说明

## 📌 目录定位

- **路径**：`data/`
- **主要作用**：存放**判定器依赖的基准数据**（不是业务数据、不是缓存、不是临时文件）。
- **收录原则**：只放"有外部出处、可复现、被脚本读取"的基准集合；凡是能由代码推导出来的，一律放生成器而不是放死数据。

---

## 📂 当前收录

| 文件 | 是什么 | 出处 / 生成方式 | 谁在读 |
| :--- | :--- | :--- | :--- |
| `common_chars.txt` | 通用汉字表（6763 字） | GB2312-1980《信息交换用汉字编码字符集·基本集》基本集；由 [`scripts/gen_common_chars.mjs`](../scripts/gen_common_chars.mjs) 从国标编码空间**推导**生成，禁止手改 | [`scripts/language_audit.mjs`](../scripts/language_audit.mjs)（生僻字判定基准） |
| `common_chars_allowlist.txt` | 书面豁免清单 | 人工逐条登记并写明理由（当前 1 条：啰） | 同上（豁免字并入白名单） |

---

## 🔁 维护规则

1. **禁止手改 `common_chars.txt`**：它是生成物。要改就改生成器或升国标口径，然后重新生成；
2. **改完必须校验**：`node scripts/gen_common_chars.mjs --check`（磁盘字表与国标推导不一致即退出码 1）；
3. **新增文件须在本表登记**：写清"是什么 / 出处 / 谁在读"三件事，否则后来人无法判断它能不能删；
4. **基准数据变更属于机制变更**：必须走 [`rules/workflow/change_flow.md`](../rules/workflow/change_flow.md) 六步循环，
   并在 [`docs/requirements.md`](../docs/requirements.md) 有对应需求依据。

---

## ✅ 常用命令

```bash
node scripts/gen_common_chars.mjs --apply      # 重新生成字表
node scripts/gen_common_chars.mjs --check      # 校验字表未漂移（退出码 0/1）
node scripts/gen_common_chars.mjs --self-test  # 生成器自检（13 项，含反向用例）
node scripts/language_audit.mjs --check        # 判最近一轮助手回复
node scripts/language_audit.mjs --root .       # 全库生僻字扫描（存量对齐）
```

---

## 🧭 边界

- 生僻字判定**基准是国标字表**，不是模型语感；豁免必须逐条写明理由（见 `common_chars_allowlist.txt` 抬头）；
- 为什么取 GB2312 基本集 6763 字而不是 3500 / 3755：本仓库实测，仅用一级汉字时
  `渲染 / 耦合 / 阈值 / 浏览 / 骨骼 / 啰嗦` 等**正常用词会被误报**（35 个字种）；采用基本集后误报降到 1 个字种。
  一个天天误报的检测器只会教会人忽略它。
