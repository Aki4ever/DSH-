# 可视化产物 (Visuals)

本目录存放**从磁盘实况生成的交互式可视化产物**，用于把管控机制讲清楚。

| 文件 | 作用 |
| :--- | :--- |
| [`build_gcm_infographic.py`](build_gcm_infographic.py) | 信息图生成器：读实况数据 → 渲染零依赖单文件 HTML |
| [`gcm-infographic.html`](gcm-infographic.html) | 管控机制运作信息图（可缩放：滚轮 / ＋ / － / ⟲） |

## 判据

产物必须满足 `format-zoomable-visual` 的三件套契约，并由 `verify-interactive-html` 静态断言：

```bash
python3 docs/visuals/build_gcm_infographic.py
python3 skills/verify-interactive-html/scripts/verify_html.py --file docs/visuals/gcm-infographic.html
```

- 三件套控制标识齐备：`data-zoom-in` / `data-zoom-out` / `data-zoom-reset`；
- 零外部依赖：无 `<link>`、无 `<script src=>`、无任何 `http` 外链，离线可开；
- 所有数字从 `docs/operations/*.json` 与 GCM `status.json` 实读，**脚本内不硬编码任何计数**。

## 边界

本目录只放**产物与生成器**，不放手工绘制的图片；任何手工图都必须是可复现的产物，
否则下一次实况变化时它就会变成过期的假图。
