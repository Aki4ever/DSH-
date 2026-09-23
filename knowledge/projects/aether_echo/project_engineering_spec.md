# 源能回响：项目专属客户端技术规范 (Project Engineering Spec)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.3.0`
> - **对应实施版本**：`v4.3.0`
> - **所属项目**：`源能回响 (Aether Echo)`
> - **规范层级**：`【项目专属知识库】`
> - **生效状态**：`[Release 稳定生效]`

本文档是游戏《源能回响》项目的专属工程基线，全面继承 [`knowledge/common/unity_specification.md`](../../common/unity_specification.md)。

---

## ⚙️ 一、引擎技术栈与运行基准

- **引擎版本**：`Unity 2022.3.21f1 LTS`（长期稳定支持版）
- **渲染管线**：`Universal Render Pipeline (URP 14.x)`
- **目标帧率**：移动端主流设备稳定 60 FPS
- **资源热更**：Addressables 1.21+，CDN 资源按需异步分包下载
- **UI 架构**：全面遵循“页面做成 Scene，弹窗做成 Prefab，按钮必配 Shadow 阴影与微动效”

---

## 📊 二、性能硬性红线

- **DrawCall 峰值**：≤ 150（超出即触发批处理优化阻断）
- **Mono 堆内存上限**：≤ 150 MB
- **平稳战斗期 GC 垃圾**：0 Bytes/frame
- **崩溃率考核**：≤ 0.05%
