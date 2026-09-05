#!/usr/bin/env bash
# 生成一张符合《素材生成规范》的立绘（见 ART.md）。
#   用法: scripts/gen-art.sh <文件名(不含扩展)> "<主体描述，英文一句话>"
#   例:   scripts/gen-art.sh mon-yingxiao "a slick salesman creature in an oversized blazer..."
#   词条专属图见 scripts/gen-term-art.sh <slug> "<主体描述>"（薄壳，等价于本脚本 term-<slug>）
# 产物: assets/img/<文件名>.png（master，不进 git）。随后跑 scripts/opt-art.sh 压缩。
#
# 本仓库不绑定任何具体的文生图服务。脚本只负责拼出完整 prompt，
# 出图交给你自己的工具，通过环境变量 JARGON_IMAGE_CMD 接入：
#
#   JARGON_IMAGE_CMD='my-image-cli --prompt "$PROMPT" --out "$OUT"' scripts/gen-art.sh ...
#
# 命令里可用两个变量：$PROMPT（完整提示词）、$OUT（目标 png 绝对路径）。
# 只要求一件事：跑完后 $OUT 是一张落盘的 png。
# 没设 JARGON_IMAGE_CMD 时脚本转手动模式：把 prompt 打到标准输出，
# 你贴进任意文生图产品生成、按提示的路径存盘，后续 opt-art / build 照常跑。
set -u
DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ── 风格底座：全站素材共用，存在 scripts/style.txt ──────────────────
# 改那个文件 = 全站素材风格漂移，非必要不要动（详见 ART.md 第一节）
STYLE="$(cat "$DIR/scripts/style.txt")"

name="${1:?需要文件名，如 mon-fangfa / term-taizhang}"
subject="${2:?需要主体描述（英文一句话）}"
out="$DIR/assets/img/$name.png"
PROMPT="$STYLE $subject"

mkdir -p "$DIR/assets/img"

if [ -s "$out" ]; then
  echo "SKIP $name（已存在 assets/img/$name.png，要重生成先删掉它）"
  exit 0
fi

if [ -z "${JARGON_IMAGE_CMD:-}" ]; then
  cat <<EOF
未设置 JARGON_IMAGE_CMD，转为手动模式。

把下面这段完整 prompt 贴进任意文生图工具（尺寸建议 2048x2048），
生成后把图片存成：
  $out
然后继续：
  scripts/opt-art.sh $name && node build.mjs

──────── PROMPT ────────
$PROMPT
────────────────────────
EOF
  exit 0
fi

export PROMPT OUT="$out"
for _ in 1 2 3; do
  [ -s "$out" ] && break
  eval "$JARGON_IMAGE_CMD" || true
done

[ -s "$out" ] && echo "OK   $name -> assets/img/$name.png" \
  || { echo "FAIL $name（JARGON_IMAGE_CMD 没有产出 $out）"; exit 1; }
