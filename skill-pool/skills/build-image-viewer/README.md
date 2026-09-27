# build-image-viewer

L2 工序技能：把图片编译为零依赖单文件 HTML 交互查看器。

## 用途

将一张图片（`png` / `jpg` / `jpeg` / `svg` / `webp`）以 base64 data URI 内联进单个 HTML 文件，
产出「点击放大 + 放大/缩小按钮 + 复位」三件套交互齐备的查看器。
产物零外部依赖，双击即可打开。

## 使用方式

```bash
python3 skills/build-image-viewer/scripts/build_viewer.py \
  --image <png|jpg|jpeg|svg|webp> \
  --out <out.html> \
  [--title "标题"]
```

无素材时可现场生成一张最小 PNG 做冒烟测试：

```bash
python3 - <<'PY'
import base64, pathlib
png = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)
pathlib.Path("/tmp/sample.png").write_bytes(png)
PY

python3 skills/build-image-viewer/scripts/build_viewer.py --image /tmp/sample.png --out /tmp/sample-viewer.html
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 生成成功，stdout 输出 `{"success": true, "out", "bytes", "image"}` |
| 1 | 输入不存在、扩展名不支持、读取失败或输出不可写，stdout 输出 `{"success": false, "error"}` |

## 产物交互

| 交互 | 实现 |
| :--- | :--- |
| 点击图片 → 全屏遮罩 | 缩略图 `click` 事件打开遮罩 |
| 放大 / 缩小 | `data-zoom-in` / `data-zoom-out` 按钮，缩放区间 0.2× ~ 12× |
| 复位 | `data-zoom-reset` 按钮，回到 1× 且位移归零 |
| 滚轮缩放 | 遮罩视口 `wheel` 事件 |
| 拖拽平移 | 遮罩视口 `mousedown` / `mousemove` / `mouseup`，并支持单指触摸 |
| 关闭 | ESC 键或「关闭」按钮 |

## 上下游

- 上游：`format-zoomable-visual`（L1，规约来源）。
- 下游：`verify-interactive-html`（L2，静态断言）；编排入口 `interactive-image-viewer`（L3）。
