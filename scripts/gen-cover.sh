#!/usr/bin/env bash
# 出封面图：scripts/cover.html 的两个变体 → assets/cover.png + assets/cover-vertical.png
#
#   wide 1280×640   README 封面
#   tall 1080×1440  竖屏视频封面（3:4，小红书 / 抖音）
#
# 靠 headless Chrome 截图，不引任何运行时依赖。Chrome 路径可用 CHROME 覆盖：
#   CHROME=/path/to/chrome npm run cover
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
src="file://$root/scripts/cover.html"

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [ ! -x "$CHROME" ]; then
  for c in /usr/bin/google-chrome /usr/bin/chromium /usr/bin/chromium-browser \
           "/Applications/Chromium.app/Contents/MacOS/Chromium"; do
    [ -x "$c" ] && CHROME="$c" && break
  done
fi
if [ ! -x "$CHROME" ]; then
  echo "找不到 Chrome/Chromium。装一个，或用 CHROME=<路径> 指定。" >&2
  exit 1
fi

shoot() { # shoot <变体> <宽> <高> <输出>
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --allow-file-access-from-files \
    --window-size="$2,$3" --screenshot="$root/assets/$4" \
    "$src?v=$1" >/dev/null 2>&1
  echo "  assets/$4  ${2}×${3}"
}

echo "出封面图："
shoot wide 1280 640  cover.png
shoot tall 1080 1440 cover-vertical.png
