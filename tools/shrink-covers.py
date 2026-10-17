#!/usr/bin/env python3
"""
shrink-covers.py - normalise every mirrored cover to one size and encoding.

The grid renders each card at roughly 200-230px wide (5-6 columns, 1200px
container), so a 512px q62 file is more bytes than the pixels can show. One
pass over assets/covers brings the whole library to a single square WebP,
which is what keeps a 2,600-game repo pushable instead of ~60 MB of mixed
PNG/WebP at whatever size each host happened to serve.

    python3 tools/shrink-covers.py                 # 400px, q50
    python3 tools/shrink-covers.py --size 384 --quality 48
    python3 tools/shrink-covers.py --dry-run

Anything already at or below the target is left alone, so re-running is free.
"""

import io
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
COVERS = HERE.parent / "assets" / "covers"

SIZE = 400
QUALITY = 50


def shrink(path, size, quality):
    """Square-crop, resize, re-encode. Returns (old_bytes, new_bytes) or None."""
    from PIL import Image, ImageOps
    try:
        old = path.stat().st_size
        im = Image.open(path)
        im.load()
    except Exception:
        return None
    if im.width <= size and im.height <= size and path.suffix == ".webp":
        return None                       # already small, nothing to gain
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (16, 18, 24))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = im.convert("RGB")
    # card is aspect-ratio 1 with object-fit cover, so a square crop is what
    # the browser would do anyway - doing it here means shipping fewer bytes
    im = ImageOps.fit(im, (size, size), method=Image.LANCZOS,
                      centering=(0.5, 0.5))
    out = io.BytesIO()
    try:
        im.save(out, "WEBP", quality=quality, method=5)
    except Exception:
        return None
    data = out.getvalue()
    if len(data) >= old:
        return None                       # re-encoding made it bigger; keep old
    path.write_bytes(data)
    return old, len(data)


def main():
    dry = "--dry-run" in sys.argv
    size = SIZE
    quality = QUALITY
    if "--size" in sys.argv:
        size = int(sys.argv[sys.argv.index("--size") + 1])
    if "--quality" in sys.argv:
        quality = int(sys.argv[sys.argv.index("--quality") + 1])

    files = sorted(p for p in COVERS.iterdir() if p.is_file())
    before = sum(p.stat().st_size for p in files)
    done = skipped = 0
    for path in files:
        if dry:
            skipped += 1
            continue
        got = shrink(path, size, quality)
        if got is None:
            skipped += 1
        else:
            done += 1
    after = sum(p.stat().st_size for p in files)

    print(f"  {len(files)} covers  target {size}px q{quality}{'  (dry run)' if dry else ''}")
    print(f"  rewritten {done}, left alone {skipped}")
    print(f"  {before / 1048576:.1f} MB -> {after / 1048576:.1f} MB "
          f"({100 * after // max(1, before)}%)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
