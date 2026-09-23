# 系统分层知识库总索引与前置核验协议 (Knowledge Base Hub)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v3.7.0`
> - **对应实施版本**：`v3.7.0`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **最后更新日期**：2026-09-16
> - **版本状态**：`[Release 稳定生效]`

本文档是系统全域核心知识库的**统一总枢纽与分层防冲突核验门禁**。本目录确立**“上层通用公共规范（跨项目共享）＋ 下层项目物理隔离（按工程独立）”**的分层治理体系，为所有业务需求设计与代码实现提供权威基准。

---

## 🖼️ 一、分层知识库与多项目隔离架构教学图

![分层知识库与多项目隔离架构教学图](../assets/generated_images/knowledge_base_layered_architecture.svg)
👉 [点击在系统中打开查看高清矢量大图](../assets/generated_images/knowledge_base_layered_architecture.svg)

---

## 🏛️ 二、分层架构与目录拓扑

```text
knowledge/
├── README.md                          # 知识库总览与项目隔离导航协议（本文档）
├── common/                            # 【第一层：通用公共规范】(所有项目 100% 共享继承)
│   ├── README.md                      # 通用规范导航总览
│   ├── interaction_specification.md   # 通用交互与体验规范 (格式塔六大定律 / Don't Make Me Think 零思考)
│   ├── unity_specification.md         # 通用 Unity 工程规范 (页面Scene / 弹窗Prefab / 按钮Drop Shadow与下沉动效)
│   ├── web_specification.md           # 通用 Web 工程规范 (页面路由懒加载 / Modal Portal挂载 / box-shadow)
│   ├── miniprogram_specification.md   # 通用小程序规范 (主包≤1.5MB / 弹窗Component防穿透 / setData差量更新)
│   ├── engineering_specification.md   # 通用技术工程规范 (模块解耦 / 单向调用 / 零GC / 状态机原子性)
│   ├── art_specification.md           # 通用视觉与色彩规范 (60-30-10配比 / WCAG 4.5:1对比度 / 阴影阶梯)
│   └── dsh_native_ui_components.md    # DSH 原生可视化组件体系法典 (九大层级 / Slot拓扑 / 原子工具卡)
└── projects/                          # 【第二层：项目专属知识库】(按工程物理隔离，严禁串扰)
    ├── README.md                      # 项目隔离规约与清单
    └── aether_echo/                   # 示例核心项目：源能回响 (Aether Echo - 游戏工程)
        ├── README.md                  # 项目总览卡片
        ├── worldview.md               # 专属世界观剧情设定集 (以太法则 / 纪元历史 / 阵营)
        ├── project_art_spec.md        # 专属美术规范 (半写实轻科幻 / 3D面数与骨骼预算)
        └── project_engineering_spec.md# 专属技术参数 (Unity 2022.3 LTS / URP / 60FPS基线)
```

---

## 🛡️ 三、前置防冲突核验与隔离红线

1. **通用规范强制继承**：
   - 任何新项目、新功能，在交互设计上必须满足格式塔原理与零思考直觉，在 Unity 开发中必须严格落实“页面为 Scene、弹窗为 Prefab、按钮必配阴影与按压下沉”；
2. **领域物理隔离红线**：
   - 非游戏任务（如开发通用 Web 管理后台、小程序工具等），**绝对禁止载入或关联游戏世界观与设定**；
3. **前置审查阻断**：
   - 在任务执行的【探境】与【定标】阶段，必须检索相关领域的知识库规范；一旦发现设计违背法典，立即强制阻断并提示调整。
