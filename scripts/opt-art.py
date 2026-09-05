#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=10.3"]
# ///
"""把 assets/img/<name>.png 压成 assets/img/opt/<name>.webp，供 build.mjs 内联。

只产出 webp：Chrome 23+ / Safari 14+ / Firefox 65+ 全支持，现代浏览器没有需要兜底的场景。
曾经同时产 avif 再由构建挑体积小的那个，省下的百来 KB 不值得每张图两份文件、
仓库素材翻倍、外加一套挑选逻辑。

零外部依赖：靠 PEP 723 内联依赖声明自带 pillow，由 uv run 拉起，不污染系统环境。
    用法: scripts/opt-art.py <name> [<name> ...]
"""
import sys
from pathlib import Path

from PIL import Image

LONG_EDGE = 440  # 卡面横排头图实际显示 88–124px，留足倍率
QUALITY = 75  # 实测 q75 vs q82：13 张省 100KB（22%），440px 下目检无差
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img" / "opt"


def one(name: str) -> None:
    src = ROOT / "assets" / "img" / f"{name}.png"
    if not src.is_file():
        print(f"skip {name}（无 {src.relative_to(ROOT)}）")
        return
    OUT.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGB")
    im.thumbnail((LONG_EDGE, LONG_EDGE), Image.LANCZOS)

    dst = OUT / f"{name}.webp"
    im.save(dst, quality=QUALITY, method=6)
    print(f"opt  {name}: {dst.name}({dst.stat().st_size}B) {im.size[0]}x{im.size[1]}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("用法: scripts/opt-art.py <name> [<name> ...]")
    for n in sys.argv[1:]:
        one(n)
