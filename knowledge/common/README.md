# 通用规范知识库总览 (Common Specifications Index)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v1.6.0`
> - **对应实施版本**：`v1.6.0`
> - **规范层级**：`【知识库总纲 · 通用公共规范】`
> - **生效状态**：`[Release 稳定生效]`

本文档是系统跨项目公共知识库的**统一导航总纲**。所有子项目无论平台与类型，默认**强制且完全继承**本目录下的所有规范法典。

---

## 📚 一、通用公共规范矩阵明细

| 规范文件 | 中文名称 | 适用领域 | 核心原子性实操约束 |
| :--- | :--- | :---: | :--- |
| [`interaction_specification.md`](interaction_specification.md) | **通用交互与体验设计规范** | 全平台通用 | • **格式塔六大心理学定律**落地（接近/相似/闭合/主体背景分离）；<br>• **Don't Make Me Think** 零思考直觉、防呆与三秒法则。 |
| [`unity_specification.md`](unity_specification.md) | **通用 Unity 客户端工程规范** | Unity 游戏与客户端 | • **页面做成 Scene**（主视景独立异步加载）；<br>• **弹窗做成 Prefab**（动态实例化与暗色蒙层）；<br>• **按钮必带 Drop Shadow 投影**与按压下沉位移；<br>• 动静分离双 Canvas 与 `.meta` 同生共死。 |
| [`web_specification.md`](web_specification.md) | **通用 Web 前端工程规范** | Web / SPA / 后台 | • **页面做成路由懒加载**，**弹窗通过 Portal** 挂载至根 DOM；<br>• `box-shadow` 立体悬浮与 `:active` 物理下沉；<br>• 骨架屏防白屏与移动端 44px 最小热区。 |
| [`miniprogram_specification.md`](miniprogram_specification.md) | **通用小程序研发规范** | 微信/多端小程序 | • **主包 ≤ 1.5MB** 极速首屏，业务模块独立分包；<br>• **弹窗组件化**且必须加 `catchtouchmove` 防滚动穿透；<br>• `hover-class` 原生按压反馈，`setData` 路径差量更新。 |
| [`engineering_specification.md`](engineering_specification.md) | **通用技术架构与工程规范** | 全工程架构 | • 模块强解耦、无回环依赖；<br>• 状态机流转原子性、零 GC 法则与异常三段式捕获。 |
| [`art_specification.md`](art_specification.md) | **通用视觉与色彩设计规范** | 全平台美术与视觉 | • 60-30-10 色彩平衡法、WCAG 4.5:1 对比度标准、立体视觉层级。 |

---

## 🔄 二、项目继承与覆盖规则 (Inheritance & Override Rule)

1. **自动继承律**：任何新项目自动享有上述 6 大通用规范的约束与指导；
2. **禁止逆向违背**：项目专属规范可以进行**精度细化**（如定义特定的色号、特定的 3D 模型面数上限），但**绝对不得违背通用法典的底线**（例如：项目规范绝不允许将弹窗硬塞进场景常驻堆叠、也绝不允许设计无阴影无反馈的裸按钮）。
