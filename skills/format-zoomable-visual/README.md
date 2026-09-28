# format-zoomable-visual

L1 原子规约：一切可视化产物必须可缩放，且为零依赖单文件 HTML。

## 用途

规定所有交付给用户查看的图片 / 图谱 / 拓扑图必须提供三件套交互：

1. 点击图形 → 打开全屏遮罩放大查看；
2. 遮罩内提供放大与缩小按钮；
3. 提供一键复位回到初始视图。

同时强制零依赖原则：单文件 HTML，内联样式与脚本，不引 CDN、不装依赖。

## 使用方式

本技能无脚本，作为判据被下游技能引用：

- 生成侧：`build-image-viewer` 按本规约产出单文件查看器；
- 校验侧：`verify-interactive-html` 按本规约的三标识与零依赖红线做静态断言；
- 编排侧：`interactive-image-viewer` 把「生成 → 自检 → 交付」串成完整流程。

人工评审时按本文件的五条工作流步骤逐条核对即可。

## 退出码

本技能无脚本，不直接产生退出码。退出码语义由下游探针承接：

| 码 | 含义 | 承接者 |
| :--- | :--- | :--- |
| 0 | 三标识齐备且无外部资源引用 | `verify-interactive-html` |
| 1 | 缺任一控制标识，或命中外部资源引用 | `verify-interactive-html` |

## 上下游

- 上游：无（L1 原子规约，不依赖任何技能）。
- 下游：`build-image-viewer`、`verify-interactive-html`、`interactive-image-viewer`。
