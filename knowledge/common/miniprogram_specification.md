# 通用微信/多端小程序工程规范 (General MiniProgram Specification)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.1.0`
> - **对应实施版本**：`v4.1.0`
> - **规范层级**：`【知识库总纲 · 通用公共规范】`（所有小程序项目 100% 共享继承）
> - **生效状态**：`[Release 稳定生效]`

本文档是系统所有小程序（微信小程序、抖音小程序、支付宝小程序）工程的**最高通用研发与交互规范**。

---

## 📱 一、分包架构与组件化弹窗

小程序在移动端受限于包体积上限（主包 2MB）和运行内存，架构分层必须极其严密：

### 1. 页面级分包加载架构 (Subpackage Strategy)
- **主包轻量化**：主包（Root Package）仅放置首页、TabBar 核心页面与全局公共样式，主包体积必须控制在 **`1.5MB`** 以内，保障冷启动毫秒级秒开；
- **业务按模块独立分包**：用户中心、商品详情、订单管理、工具箱等深层功能全部做成独立分包（`subpackages`），并配置分包预下载（`preloadRule`）。

### 2. 弹窗组件化与防滚动穿透 (Component as Popup)
- **自定义组件封装**：所有弹窗、操作面板（ActionSheet）、底部抽屉必须封装为独立 Custom Component；
- **防滚动穿透铁律**：遮罩层必须添加 `catchtouchmove="true"`，防止用户在滑动弹窗内容时引起底层主页面的背景跟随滑动（Page Scrolling Leak）；
- **动态销毁与条件渲染**：弹窗关闭后，非必要 DOM 必须通过 `wx:if` 进行节点卸载，防止过多离屏节点导致 WebView 内存飙升。

---

## 🔘 二、小程序按钮阴影与原生触觉反馈

由于小程序运行在手机端，按钮与交互必须深度适配移动手势：

### 1. 原生样式重置与立体阴影
```css
/* 小程序统一重置与立体按钮类 */
.mini-btn-primary {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #2EC4B6 0%, #00A8FF 100%);
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
  /* 移动端优化软阴影 */
  box-shadow: 0 8rpx 20rpx -4rpx rgba(0, 168, 255, 0.4);
}

/* 移动端原生 hover-class 零延迟按压反馈 */
.mini-btn-hover {
  transform: scale(0.97) translateY(2rpx);
  box-shadow: 0 2rpx 8rpx 0 rgba(0, 168, 255, 0.2);
  opacity: 0.92;
}
```

### 2. 交互必带 hover-class
- 小程序内所有 `button` 或点击卡片，必须显式声明 `hover-class="mini-btn-hover"` 与 `hover-stay-time="100"`，利用移动端原生硬件加速实现零延迟触控反馈。

---

## ⚡ 三、setData 差量更新与性能红线

1. **精准路径差量更新 (Path Update)**：
   - 严禁直接 `this.setData({ fullLargeList })` 全量覆盖大数组；
   - 针对单个元素变更，必须使用键路径更新：
     ```javascript
     // ✅ 正确做法：只向渲染层传输被修改的单个项
     this.setData({
       [`itemList[${targetIndex}].status`]: 'completed'
     });
     ```
2. **频率与体积双重限制**：
   - 单次 `setData` 数据量严禁超过 `1MB`；
   - 避免在 `onPageScroll` 等高频回调中无节制调用 `setData`，高频事件必须配合防抖节流。
