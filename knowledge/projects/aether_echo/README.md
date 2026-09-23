# 源能回响 (Aether Echo) 专属知识库导航

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.3.0`
> - **对应实施版本**：`v4.3.0`
> - **所属项目**：`源能回响 (Aether Echo)`
> - **项目属性**：`3D 沉浸式轻科幻 RPG 游戏工程`
> - **生效状态**：`[Release 稳定生效]`

本文档是游戏《源能回响》专属知识库的导航卡片。本工程遵循系统最高元规则第九条（领域隔离律）：非本项目任务，严禁加载本项目知识库。

---

## 🧭 一、项目专属法典矩阵

| 规范文档 | 文档名称 | 核心管辖范围 |
| :--- | :--- | :--- |
| [`worldview.md`](worldview.md) | **世界观故事背景与叙事法典** | 以太源能共鸣律、四纪历史年表、三大阵营架构与四大叙事禁忌红线。 |
| [`project_art_spec.md`](project_art_spec.md) | **项目专属美术视觉规范** | 半写实轻科幻风格、角色/场景 3D 模型面数与骨骼预算、PBR 贴图标准。 |
| [`project_engineering_spec.md`](project_engineering_spec.md) | **项目专属客户端技术规范** | Unity 2022.3 LTS + URP 60FPS 性能基线、MVVM 解耦与 Addressables 热更。 |

---

## 🔗 二、通用规范继承声明

本项目已全面继承系统公共规范：
- 交互与体验：严格遵循 [`knowledge/common/interaction_specification.md`](../../common/interaction_specification.md)（格式塔原理 / Don't Make Me Think）；
- Unity 工程：严格遵循 [`knowledge/common/unity_specification.md`](../../common/unity_specification.md)（页面为 Scene / 弹窗为 Prefab / 按钮阴影与下沉反馈 / `.meta` 同生共死）；
- 基础架构：严格遵循 [`knowledge/common/engineering_specification.md`](../../common/engineering_specification.md)（模块解耦 / 零 GC）。
