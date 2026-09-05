#!/usr/bin/env bash
# 把 assets/img/<name>.png 压成 assets/img/opt/<name>.webp，供 build.mjs 内联。
#   用法: scripts/opt-art.sh mon-fangfa mon-jiagou ...
# 实现在 scripts/opt-art.py（PEP 723 内联依赖，uv run 自带 pillow，不依赖任何外部工具）。
# 本文件是兼容入口，ART.md 里的旧命令照样能跑。
set -eu
exec "$(cd "$(dirname "$0")" && pwd)/opt-art.py" "$@"
