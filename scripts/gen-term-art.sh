#!/usr/bin/env bash
# 给单个词条生成专属立绘。薄壳：转交 scripts/gen-art.sh，只负责补上 term- 前缀，
# 这样风格底座（scripts/style.txt）和出图方式（JARGON_IMAGE_CMD）只有一份实现。
#   用法: scripts/gen-term-art.sh <slug> "<主体描述，英文一句话>"
#   slug 就是 terms/ 下的文件名去掉 .md
# 产物: assets/img/term-<slug>.png（master，不进 git），随后跑 scripts/opt-art.sh term-<slug>
set -eu
slug="${1:?需要 slug，如 taizhang}"
subject="${2:?需要主体描述（英文一句话）}"
exec "$(cd "$(dirname "$0")" && pwd)/gen-art.sh" "term-$slug" "$subject"
