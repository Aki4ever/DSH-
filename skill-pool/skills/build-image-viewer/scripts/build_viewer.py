#!/usr/bin/env python3
"""build_viewer.py — 把一张图片编译为零依赖的单文件 HTML 交互查看器。

用法：
    python3 build_viewer.py --image <png|jpg|jpeg|svg|webp> --out <out.html> [--title "标题"]

能力（PKG-008）：
    * **多级缩放档位**：+/- 按钮在固定档位表上跳相邻档（不再做连续乘法），
      档位表与默认档以 data-zoom-levels / data-zoom-default 暴露为机器可读属性；
    * 滚轮/触摸为连续微调，松手后 **吸附（snap）到最近档位**（data-zoom-snap）；
    * **下载按钮**（data-download）：首选 showSaveFilePicker（原生目录选择控件），
      降级 Blob + <a download>，再降级为就地提示；文件名走扩展名白名单。

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

# 多级缩放档位表（唯一口径来源：skills/zoom-level-policy/SKILL.md）
# + / - 按钮在表上跳相邻档；滚轮为连续微调，松手后吸附到最近档。
ZOOM_LEVELS = [0.25, 0.33, 0.50, 0.67, 0.75, 1.00, 1.25, 1.50, 2.00, 3.00, 4.00, 6.00, 8.00]
ZOOM_DEFAULT = 1.00
SNAP_IDLE_MS = 140
DOWNLOAD_EXT_WHITELIST = ("png", "jpg", "jpeg", "svg", "webp")

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
.toolbar .level {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px; color: #cfd6e6; align-self: center;
  padding: 8px 12px; border-radius: 9px;
  border: 1px solid #333b52; background: #121722; min-width: 108px; text-align: center;
}
.toolbar .toast {
  align-self: center; font-size: 12.5px; color: #8b93a7;
}
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
  <p class="hint">点击图片进入全屏查看；<kbd>+ / -</kbd> 逐级缩放（13 档，滚轮连续微调后自动吸附到最近档），<kbd>拖拽</kbd> 平移，<kbd>0</kbd> 复位，<kbd>Esc</kbd> 关闭，<kbd>下载</kbd> 保存到自选目录。</p>
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
    <span class="level" data-zoom-level data-zoom-levels="__LEVELS__" data-zoom-default="__DEFAULT__">__LEVEL_TEXT__</span>
    <button type="button" data-download data-download-name="__DOWNLOAD_NAME__" title="下载到本地（可选目录）">下载 ⤓</button>
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
  var levelEl = document.querySelector("[data-zoom-level]");

  // ── 多级缩放档位（口径见 skills/zoom-level-policy/SKILL.md）──────────────
  // + / - 在档位表上跳相邻档（离散、可枚举、可复算）；滚轮连续微调后吸附到最近档。
  var LEVELS = (levelEl.getAttribute("data-zoom-levels") || "")
    .split(",").map(function (x) { return parseFloat(x); })
    .filter(function (x) { return isFinite(x) && x > 0; });
  var DEFAULT_LEVEL = parseFloat(levelEl.getAttribute("data-zoom-default")) || 1;
  var defaultIndex = LEVELS.indexOf(DEFAULT_LEVEL);
  if (defaultIndex < 0) { defaultIndex = Math.floor(LEVELS.length / 2); }
  var SNAP_IDLE_MS = __SNAP_IDLE_MS__;

  var levelIndex = defaultIndex;
  var scale = LEVELS[levelIndex];
  var tx = 0, ty = 0, dragging = false, lastX = 0, lastY = 0;
  var snapTimer = null;

  function nearestIndex(value) {
    var best = 0, bestGap = Infinity;
    for (var i = 0; i < LEVELS.length; i++) {
      var gap = Math.abs(Math.log(LEVELS[i]) - Math.log(value));
      if (gap < bestGap) { bestGap = gap; best = i; }
    }
    return best;
  }

  function renderLevel() {
    var pct = Math.round(LEVELS[levelIndex] * 100);
    levelEl.textContent = (levelIndex + 1) + "/" + LEVELS.length + " · " + pct + "%";
    levelEl.setAttribute("data-zoom-current", String(levelIndex + 1));
    levelEl.setAttribute("data-zoom-snap", "idle");
  }

  function apply() {
    zoomImage.style.transform =
      "translate(" + tx + "px, " + ty + "px) scale(" + scale + ")";
    if (LEVELS[levelIndex] !== scale) {
      levelEl.textContent = "+0/" + LEVELS.length + " · " + Math.round(scale * 100) + "%";
    }
  }

  function setLevel(index) {
    if (index < 0) { index = 0; }
    if (index > LEVELS.length - 1) { index = LEVELS.length - 1; }
    levelIndex = index;
    scale = LEVELS[levelIndex];
    renderLevel();
    apply();
  }

  function reset() {
    levelIndex = defaultIndex;
    scale = LEVELS[levelIndex];
    tx = 0;
    ty = 0;
    renderLevel();
    apply();
  }

  // 连续微调：只在两次微调之间生效，空闲后吸附到最近档位（离散化收口）
  function nudge(factor) {
    var next = scale * factor;
    if (next < LEVELS[0]) { next = LEVELS[0]; }
    if (next > LEVELS[LEVELS.length - 1]) { next = LEVELS[LEVELS.length - 1]; }
    scale = next;
    levelEl.setAttribute("data-zoom-snap", "pending");
    apply();
    if (snapTimer) { clearTimeout(snapTimer); }
    snapTimer = setTimeout(function () {
      snapTimer = null;
      setLevel(nearestIndex(scale));
      levelEl.setAttribute("data-zoom-snap", "snapped");
    }, SNAP_IDLE_MS);
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

  // ── 下载三段降级（口径见 skills/zoom-level-policy/SKILL.md）──────────────
  // ① showSaveFilePicker：弹出原生保存控件，用户自选目录与文件名
  // ② Blob + <a download>：无该 API 时的降级，仍能存下正确文件名与扩展名
  // ③ 都没有：就地提示，禁止静默无反应
  function toast(message) {
    var el = overlay.querySelector(".toast");
    if (!el) {
      el = document.createElement("span");
      el.className = "toast";
      overlay.querySelector(".toolbar").appendChild(el);
    }
    el.textContent = message;
    setTimeout(function () { if (el.textContent === message) { el.textContent = ""; } }, 4000);
  }

  function dataUriToBlob(dataUri) {
    var parts = dataUri.split(",");
    var meta = parts[0];
    var body = parts.slice(1).join(",");
    var mime = (meta.match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
    var binary = meta.indexOf(";base64") >= 0 ? atob(body) : decodeURIComponent(body);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
    return new Blob([bytes], { type: mime });
  }

  function fallbackDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    toast("已通过浏览器下载：" + filename);
  }

  function saveImage() {
    var button = overlay.querySelector("[data-download]");
    var filename = button.getAttribute("data-download-name") || "image.png";
    var source = zoomImage.getAttribute("src") || preview.getAttribute("src") || "";
    if (!source) { toast("没有可下载的图片数据"); return; }
    var blob;
    try {
      blob = dataUriToBlob(source);
    } catch (err) {
      toast("图片数据无法解析，下载中止");
      return;
    }
    if (typeof window.showSaveFilePicker === "function") {
      window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "图片", accept: { "image/*": ["." + filename.split(".").pop()] } }]
      }).then(function (handle) {
        return handle.createWritable().then(function (writable) {
          return writable.write(blob).then(function () { return writable.close(); });
        }).then(function () { toast("已保存：" + filename); });
      }).catch(function (err) {
        if (err && err.name === "AbortError") { toast("已取消保存"); return; }
        fallbackDownload(blob, filename);
      });
      return;
    }
    fallbackDownload(blob, filename);
  }

  preview.addEventListener("click", openOverlay);

  overlay.querySelector("[data-zoom-in]").addEventListener("click", function (e) {
    e.stopPropagation();
    setLevel(levelIndex + 1);
  });
  overlay.querySelector("[data-zoom-out]").addEventListener("click", function (e) {
    e.stopPropagation();
    setLevel(levelIndex - 1);
  });
  overlay.querySelector("[data-zoom-reset]").addEventListener("click", function (e) {
    e.stopPropagation();
    reset();
  });
  overlay.querySelector("[data-zoom-close]").addEventListener("click", function (e) {
    e.stopPropagation();
    closeOverlay();
  });
  overlay.querySelector("[data-download]").addEventListener("click", function (e) {
    e.stopPropagation();
    saveImage();
  });

  viewport.addEventListener("wheel", function (e) {
    e.preventDefault();
    nudge(e.deltaY < 0 ? 1.15 : 1 / 1.15);
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
    if (e.key === "+" || e.key === "=") { setLevel(levelIndex + 1); return; }
    if (e.key === "-" || e.key === "_") { setLevel(levelIndex - 1); return; }
    if (e.key === "0") { reset(); return; }
    if (e.key === "s" || e.key === "S") { saveImage(); }
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

    stem = os.path.splitext(name)[0] or "image"
    download_name = "%s%s" % (stem, ext)
    levels_csv = ",".join(("%g" % value) for value in ZOOM_LEVELS)
    default_index = ZOOM_LEVELS.index(ZOOM_DEFAULT)
    level_text = "%d/%d · %d%%" % (
        default_index + 1, len(ZOOM_LEVELS), round(ZOOM_DEFAULT * 100)
    )

    document = (
        HTML_TEMPLATE.replace("__TITLE__", escape(title, quote=True))
        .replace("__NAME__", escape(name, quote=True))
        .replace("__DATA_URI__", data_uri)
        .replace("__LEVELS__", levels_csv)
        .replace("__DEFAULT__", "%g" % ZOOM_DEFAULT)
        .replace("__LEVEL_TEXT__", level_text)
        .replace("__DOWNLOAD_NAME__", escape(download_name, quote=True))
        .replace("__SNAP_IDLE_MS__", str(SNAP_IDLE_MS))
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
            "zoom_levels": len(ZOOM_LEVELS),
            "zoom_default_index": default_index + 1,
            "download_name": download_name,
        }
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
