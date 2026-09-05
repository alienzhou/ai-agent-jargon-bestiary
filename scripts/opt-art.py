#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=10.3", "pillow-avif-plugin>=1.4"]
# ///
"""把 assets/img/<name>.png 压成 assets/img/opt/<name>.{webp,avif}，供 build.mjs 内联。

零外部依赖：靠 PEP 723 内联依赖声明自带 pillow，由 uv run 拉起，不污染系统环境。
先按长边缩放，再用固定质量导出两种格式，由 build.mjs 取体积小的那个。
    用法: scripts/opt-art.py <name> [<name> ...]
"""
import sys
from pathlib import Path

from PIL import Image
import pillow_avif  # noqa: F401  注册 AVIF 编码器，导入即生效

LONG_EDGE = 440  # 卡面横排头图实际显示 88–124px，留足倍率
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

    sizes = []
    for ext, kw in (("webp", {"quality": 82, "method": 6}), ("avif", {"quality": 60})):
        dst = OUT / f"{name}.{ext}"
        im.save(dst, **kw)
        sizes.append(f"{dst.name}({dst.stat().st_size}B)")
    print(f"opt  {name}: {' '.join(sizes)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("用法: scripts/opt-art.py <name> [<name> ...]")
    for n in sys.argv[1:]:
        one(n)
