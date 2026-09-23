# 项目页面资产与视觉台账模板 (Page Ledger Template)

> ### 🏷️ **版本信息与实施追踪**
> - **当前模板版本**：`v4.1.0`（对齐台账总版本）
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **对齐时间**：2026-09-23（REQ-047）

> 规范遵循：[`rules/workflow/page_ledger_specification.md`](../rules/workflow/page_ledger_specification.md)  
> 使用时机：所有前端、客户端、小程序或 GUI 类项目，在 `docs/page_ledger.md` 或项目目录下维护。

```markdown
# 📱 [项目名称] 页面资产与视觉台账 (Page Ledger)

> ### 🏷️ **台账元数据**
> - **所属工程**：`[工程名称]`
> - **当前版本**：`v1.0.0`
> - **页面总数**：N 个独立页面 / M 个状态视图
> - **最后更新**：YYYY-MM-DD

---

## 🗺️ 页面全景索引表

| 页面编号 | 页面名称 | 路由/代码组件路径 | 核心业务与交互功能 | 截图索引 (点击预览) | 审核状态 |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **`P-001`** | [主页面/模块名称] | `/route-path`<br>`src/views/TargetView.vue` | [核心业务功能描述，关键用户动线] | [`[查看截图]`](../assets/snapshots/Page_Module_Name_Default.png) | `[已验收 ✅]` |
| **`P-002`** | [次级页面/详情页] | `/detail/:id`<br>`src/views/DetailView.vue` | [详情展示、操作按钮、数据绑定] | [`[查看截图]`](../assets/snapshots/Page_Module_Detail_Default.png) | `[待审核 ⏳]` |

---

## 📸 页面截图命名规范说明
截图统一保存在工程的截图资产目录下，命名严格遵循四段式：  
`Page_[模块名]_[页面中文名]_[状态或模式].png`  
示例：`Page_Auth_用户登录页_默认态.png`、`Page_Order_订单确认页_空数据态.png`。
```
