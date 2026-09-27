#!/usr/bin/env python3
"""build_viewer.py — 把一张图片编译为零依赖的单文件 HTML 交互查看器。

用法：
    python3 build_viewer.py --image <png|jpg|jpeg|svg|webp> --out <out.html> [--title "标题"]

约束：
    * 纯 Python 3 标准库实现，不依赖任何第三方包；
    * 图片以 base64 data URI 内联，产物不引用任何外部资源；
    * 产物不含时间戳，同一输入重复运行字节级稳定（幂等）。

退出码：
    0  生成成功（stdout 打印 success JSON）
    1  输入不存在 / 扩展名不支持 / 输出不可写（stdout 打印 error JSON）
"""

import argparse
import base64
import json
import os
import sys
from html import escape

MIME_BY_EXT = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
}

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: #0f1115;
  color: #e6e8ee;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}
.wrap { max-width: 1100px; margin: 0 auto; padding: 28px 20px 56px; }
.title { font-size: 18px; font-weight: 600; margin: 0 0 8px; }
.hint { font-size: 13px; line-height: 1.8; color: #8b93a7; margin: 0 0 18px; }
.hint kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; padding: 1px 6px; border-radius: 5px;
  border: 1px solid #333b52; background: #1b2130; color: #cfd6e6;
}
.stage {
  border: 1px solid #232838; border-radius: 14px; background: #151922;
  padding: 18px; display: flex; justify-content: center; align-items: center;
}
.preview { max-width: 100%; max-height: 66vh; display: block; border-radius: 8px; cursor: zoom-in; }
.footer { text-align: center; font-size: 12px; color: #6b7285; padding: 12px 0 0; }
.overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(6, 8, 12, 0.95);
  display: flex; flex-direction: column;
}
.overlay[hidden] { display: none; }
.toolbar {
  display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
  padding: 14px 16px; border-bottom: 1px solid #1e2431;
}
.toolbar button {
  font: inherit; font-size: 14px; line-height: 1;
  padding: 10px 16px; border-radius: 9px;
  border: 1px solid #333b52; background: #1b2130; color: #e6e8ee; cursor: pointer;
}
.toolbar button:hover { background: #242d41; }
.toolbar button:active { transform: translateY(1px); }
.viewport {
  flex: 1; overflow: hidden; position: relative;
  display: flex; align-items: center; justify-content: center;
  cursor: grab; touch-action: none;
}
.viewport.dragging { cursor: grabbing; }
.viewport img {
  max-width: 92vw; max-height: 80vh;
  transform-origin: center center;
  user-select: none; -webkit-user-drag: none;
  will-change: transform;
}
</style>
</head>
<body>
<div class="wrap">
  <h1 class="title">__TITLE__</h1>
  <p class="hint">点击图片进入全屏查看；<kbd>滚轮</kbd> 缩放，<kbd>拖拽</kbd> 平移，<kbd>+ / -</kbd> 缩放，<kbd>0</kbd> 复位，<kbd>Esc</kbd> 关闭。</p>
  <div class="stage">
    <img id="preview" class="preview" src="__DATA_URI__" alt="__NAME__">
  </div>
  <p class="footer">__NAME__ · 零依赖单文件查看器</p>
</div>

<div class="overlay" id="overlay" hidden>
  <div class="toolbar" id="toolbar">
    <button type="button" data-zoom-in title="放大">放大 +</button>
    <button type="button" data-zoom-out title="缩小">缩小 −</button>
    <button type="button" data-zoom-reset title="复位">复位 ⟲</button>
    <button type="button" data-zoom-close title="关闭">关闭 ✕</button>
  </div>
  <div class="viewport" id="viewport">
    <img id="zoomImage" alt="__NAME__">
  </div>
</div>

<script>
(function () {
  "use strict";
  var preview = document.getElementById("preview");
  var overlay = document.getElementById("overlay");
  var viewport = document.getElementById("viewport");
  var zoomImage = document.getElementById("zoomImage");
  var MIN_SCALE = 0.2, MAX_SCALE = 12, STEP = 1.25;
  var scale = 1, tx = 0, ty = 0, dragging = false, lastX = 0, lastY = 0;

  function apply() {
    zoomImage.style.transform =
      "translate(" + tx + "px, " + ty + "px) scale(" + scale + ")";
  }

  function reset() {
    scale = 1;
    tx = 0;
    ty = 0;
    apply();
  }

  function zoomBy(factor) {
    var next = scale * factor;
    if (next < MIN_SCALE) { next = MIN_SCALE; }
    if (next > MAX_SCALE) { next = MAX_SCALE; }
    scale = next;
    apply();
  }

  function openOverlay() {
    if (!zoomImage.getAttribute("src")) {
      zoomImage.setAttribute("src", preview.getAttribute("src"));
    }
    reset();
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeOverlay() {
    overlay.hidden = true;
    dragging = false;
    viewport.classList.remove("dragging");
    document.body.style.overflow = "";
  }

  function isOpen() {
    return overlay.hidden === false;
  }

  preview.addEventListener("click", openOverlay);

  overlay.querySelector("[data-zoom-in]").addEventListener("click", function (e) {
    e.stopPropagation();
    zoomBy(STEP);
  });
  overlay.querySelector("[data-zoom-out]").addEventListener("click", function (e) {
    e.stopPropagation();
    zoomBy(1 / STEP);
  });
  overlay.querySelector("[data-zoom-reset]").addEventListener("click", function (e) {
    e.stopPropagation();
    reset();
  });
  overlay.querySelector("[data-zoom-close]").addEventListener("click", function (e) {
    e.stopPropagation();
    closeOverlay();
  });

  viewport.addEventListener("wheel", function (e) {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  viewport.addEventListener("mousedown", function (e) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    viewport.classList.add("dragging");
    e.preventDefault();
  });

  window.addEventListener("mousemove", function (e) {
    if (!dragging) { return; }
    tx += e.clientX - lastX;
    ty += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    apply();
  });

  window.addEventListener("mouseup", function () {
    dragging = false;
    viewport.classList.remove("dragging");
  });

  viewport.addEventListener("touchstart", function (e) {
    if (e.touches.length === 1) {
      dragging = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
  }, { passive: true });

  viewport.addEventListener("touchmove", function (e) {
    if (!dragging || e.touches.length !== 1) { return; }
    tx += e.touches[0].clientX - lastX;
    ty += e.touches[0].clientY - lastY;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
    apply();
  }, { passive: true });

  viewport.addEventListener("touchend", function () {
    dragging = false;
    viewport.classList.remove("dragging");
  });

  window.addEventListener("keydown", function (e) {
    if (!isOpen()) { return; }
    if (e.key === "Escape" || e.key === "Esc") { closeOverlay(); return; }
    if (e.key === "+" || e.key === "=") { zoomBy(STEP); return; }
    if (e.key === "-" || e.key === "_") { zoomBy(1 / STEP); return; }
    if (e.key === "0") { reset(); }
  });
})();
</script>
</body>
</html>
"""


def emit(payload):
    """以 UTF-8 单行 JSON 打印结果。"""
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def fail(message):
    emit({"success": False, "error": message})
    return 1


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="build_viewer.py",
        description="把图片内联为零依赖单文件 HTML 交互查看器",
    )
    parser.add_argument("--image", required=True, help="输入图片路径 (png|jpg|jpeg|svg|webp)")
    parser.add_argument("--out", required=True, help="输出 HTML 路径")
    parser.add_argument("--title", default="", help="查看器标题（缺省取文件名）")
    args = parser.parse_args(argv)

    image_path = os.path.abspath(os.path.expanduser(args.image))
    if not os.path.isfile(image_path):
        return fail("输入文件不存在或不是常规文件: %s" % image_path)

    ext = os.path.splitext(image_path)[1].lower()
    if ext not in MIME_BY_EXT:
        return fail(
            "不支持的扩展名 %s，仅支持: %s"
            % (ext or "(无扩展名)", ", ".join(sorted(MIME_BY_EXT)))
        )

    try:
        with open(image_path, "rb") as handle:
            raw = handle.read()
    except OSError as exc:
        return fail("读取输入文件失败: %s" % exc)

    if not raw:
        return fail("输入文件为空: %s" % image_path)

    name = os.path.basename(image_path)
    title = args.title.strip() or (name + " 查看器")
    data_uri = "data:%s;base64,%s" % (
        MIME_BY_EXT[ext],
        base64.b64encode(raw).decode("ascii"),
    )

    document = (
        HTML_TEMPLATE.replace("__TITLE__", escape(title, quote=True))
        .replace("__NAME__", escape(name, quote=True))
        .replace("__DATA_URI__", data_uri)
    )
    payload = document.encode("utf-8")

    out_path = os.path.abspath(os.path.expanduser(args.out))
    parent = os.path.dirname(out_path)
    try:
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(out_path, "wb") as handle:
            handle.write(payload)
    except OSError as exc:
        return fail("写出 HTML 失败: %s" % exc)

    emit(
        {
            "success": True,
            "out": out_path,
            "bytes": len(payload),
            "image": image_path,
        }
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
