# 通用 Web 前端工程与交互规范 (General Web Engineering Specification)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.16.0`
> - **对应实施版本**：`v4.16.0`
> - **规范层级**：`【知识库总纲 · 通用公共规范】`（所有 Web 项目 100% 共享继承）
> - **生效状态**：`[Release 稳定生效]`

本文档是系统所有 Web 应用程序（SPA、管理后台、H5、门户站点）的**最高通用前端工程规范**。

---

## 🌐 一、路由视图与弹窗分层：页面为路由，弹窗用 Portal

为确保组件解耦、样式无污染与渲染层级可控，确立以下边界：

### 1. 页面级规范 (Page as Route View)
- **独立路由懒加载**：每个核心业务模块对应独立路由路径（如 `/dashboard`, `/analytics`），组件采用动态导入（`import()` / `React.lazy()` / `defineAsyncComponent`），严格实施按需加载与代码拆分；
- **页面容器标准**：每个 Page 根节点固定承载当前页面的上下文布局（Breadcrumbs、Header、Page Body），保持单向数据流。

### 2. 弹窗级规范 (Modal as Portal Component)
- **Portal 根节点挂载**：所有 Modal 弹窗、Drawer 抽屉、Popover 气泡卡片，**必须通过 Portal（React `createPortal` / Vue `<Teleport to="body">`）挂载至页面根 DOM 之下**；
- **严禁深层内嵌**：绝对禁止将弹窗作为深层子组件直接内嵌在普通 `<div>` 中，防止父级 `overflow: hidden` 导致弹窗被截断或 `z-index` 层叠上下文紊乱；
- **半透明蒙层阻断**：弹窗必须配置 `bg-black/60`（透明度 60%）暗色半透明全屏遮罩，点击遮罩或按下 `ESC` 键必须触发安全关闭。

---

## 🔘 二、Web 按钮阴影与物理反馈规范

所有 Web 界面中的可交互按钮与卡片，必须具备立体悬浮与按压反馈：

### 1. 按钮与卡片立体阴影基准 (Elevation Standard)
```css
/* 标准 Primary 按钮悬浮阴影 (Elevation 1) */
.btn-primary {
  background-color: var(--primary-color);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -1px rgba(0, 0, 0, 0.08);
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover 状态：阴影扩张并提亮 (Elevation 2) */
.btn-primary:hover {
  filter: brightness(1.08);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

/* Active 按压状态：阴影塌陷与真实物理下沉 */
.btn-primary:active {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.1);
  transform: translateY(1px);
}

/* 模态弹窗独立阴影 (Elevation 3) */
.modal-container {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);
}
```

### 2. 响应式与可点击区域铁律
- **最小触控区域**：移动端与触摸设备上，所有可点击按钮/图标的有效点击热区**不得小于 `44px × 44px`**，避免误触手滑；
- **响应式断点规约**：移动端（`< 640px`）、平板（`640px ~ 1024px`）、桌面宽屏（`≥ 1024px`），核心布局必须自适应伸缩。

---

## ⚡ 三、性能体验与零白屏等待

1. **骨架屏标配 (Skeleton Screen)**：
   - 页面初次加载与复杂图表渲染期间，必须呈现灰度动态呼吸动效的骨架屏，模拟真实排版框架，禁止向用户展示白屏；
2. **防抖与节流**：
   - 搜索输入框必须绑定 `300ms` 防抖（Debounce）；
   - 页面滚动与视窗缩放必须绑定 `100ms` 节流（Throttle）。
