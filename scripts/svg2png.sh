#!/usr/bin/env bash
# ==============================================================================
# 脚本名称：svg2png.sh
# 核心功能：把手写 SVG 按设计尺寸精确栅格化为 PNG（出图管道的本地渲染环节）
# ------------------------------------------------------------------------------
# 用法：
#   ./scripts/svg2png.sh <输入.svg> [输出.png] [宽] [高]
#   ./scripts/svg2png.sh --check           # 检查渲染器是否可编译可用
#
# 说明：
#   1. 宽高省略时自动从 SVG 的 width/height 读取；
#   2. 渲染器源码为 scripts/svg_rasterize.swift，首次调用自动编译并缓存；
#   3. 缓存目录 .cache/ 已在 .gitignore 中忽略，不会污染版本库。
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC="$SCRIPT_DIR/svg_rasterize.swift"
CACHE_DIR="$PROJECT_ROOT/.cache"
BIN="$CACHE_DIR/svg_rasterize"

build() {
  mkdir -p "$CACHE_DIR"
  if [ ! -x "$BIN" ] || [ "$SRC" -nt "$BIN" ]; then
    if ! command -v swiftc >/dev/null 2>&1; then
      echo "❌ 未找到 swiftc，无法编译 SVG 渲染器（需要 macOS 命令行工具）" >&2
      exit 1
    fi
    echo "🔧 首次使用，正在编译 SVG 渲染器..." >&2
    swiftc -O "$SRC" -o "$BIN"
  fi
}

if [ "${1:-}" = "--check" ]; then
  build
  echo "✅ SVG 渲染器可用：$BIN"
  exit 0
fi

IN="${1:-}"
if [ -z "$IN" ]; then
  echo "用法: $0 <输入.svg> [输出.png] [宽] [高]" >&2
  exit 2
fi
[ -f "$IN" ] || { echo "❌ 输入文件不存在：$IN" >&2; exit 1; }

# 从 SVG 读取尺寸（缺省 1120x1560）
read_dim() {
  python3 - "$IN" "$1" <<'PY'
import re, sys
text = open(sys.argv[1], encoding='utf-8').read()
m = re.search(r'<svg[^>]*\bwidth="(\d+)"[^>]*\bheight="(\d+)"', text)
if not m:
    m = re.search(r'viewBox="0 0 (\d+) (\d+)"', text)
print(m.group(1) if sys.argv[2] == 'w' and m else (m.group(2) if m else ('1120' if sys.argv[2] == 'w' else '1560')))
PY
}

OUT="${2:-${IN%.svg}.svg.png}"
W="${3:-$(read_dim w)}"
H="${4:-$(read_dim h)}"

build
"$BIN" "$IN" "$OUT" "$W" "$H"
