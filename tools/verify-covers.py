#!/usr/bin/env python3
"""
verify-covers.py - audit every cover reference and drop what cannot render.

The build trusts tools/covers-map.json. A hotlink that 404s, or a map entry
whose file is gone, produces a card with a broken image - which is exactly
what the library is supposed to stop doing. This checks both kinds and removes
the bad entries so the next fetch-covers run resolves them again, this time
through a path that verifies the asset first.

    python3 tools/verify-covers.py           # drop broken entries
    python3 tools/verify-covers.py --keep    # report only, change nothing
    python3 tools/verify-covers.py --workers 8
"""

import concurrent.futures as cf
import json
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
MAPFILE = HERE / "covers-map.json"
COVERS = ROOT / "assets" / "covers"

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"}


def check_hot(url):
    """A cover must serve an image, not a redirect page or an error body."""
    head = dict(UA)
    head["Range"] = "bytes=0-64"
    try:
        req = urllib.request.Request(url, headers=head, method="HEAD")
        with urllib.request.urlopen(req, timeout=25) as r:
            ctype = (r.headers.get("Content-Type") or "").lower()
            if r.status in (200, 206) and ctype.startswith("image/"):
                return None
            return f"HTTP {r.status} {ctype or 'no content-type'}"
    except Exception as exc:
        # some CDNs reject HEAD but serve GET fine; try the first byte
        try:
            head["Range"] = "bytes=0-64"
            with urllib.request.urlopen(
                    urllib.request.Request(url, headers=head),
                    timeout=25) as r:
                ctype = (r.headers.get("Content-Type") or "").lower()
                if r.status in (200, 206) and ctype.startswith("image/"):
                    return None
                return f"HTTP {r.status} {ctype or 'no content-type'}"
        except Exception as exc2:
            return f"{type(exc2).__name__}: {exc2}"[:70]


def check_local(rel):
    path = ROOT / rel
    if not path.is_file():
        return "file missing"
    try:
        from PIL import Image
        with Image.open(path) as im:
            im.verify()
        with Image.open(path) as im:
            w, h = im.size
    except Exception as exc:
        return f"unreadable: {exc}"[:70]
    if w < 100 or h < 100:
        return f"too small {w}x{h}"
    return None


def main():
    keep = "--keep" in sys.argv
    workers = 6
    if "--workers" in sys.argv:
        workers = int(sys.argv[sys.argv.index("--workers") + 1])
    if not MAPFILE.exists():
        print("  no covers-map.json - run fetch-covers.py first")
        return 1

    entries = json.loads(MAPFILE.read_text(encoding="utf-8"))
    print(f"  auditing {len(entries)} cover references", flush=True)

    jobs = {}
    for slug, e in entries.items():
        if not e or e.get("kind") == "fail":
            continue
        if e.get("kind") == "hot" and e.get("url"):
            jobs[slug] = ("hot", e["url"])
        elif e.get("file"):
            jobs[slug] = ("local", e["file"])

    bad = {}

    def run(item):
        slug, (kind, ref) = item
        return slug, (check_hot(ref) if kind == "hot" else check_local(ref))

    with cf.ThreadPoolExecutor(workers) as ex:
        for slug, reason in ex.map(run, jobs.items()):
            if reason:
                bad[slug] = reason

    print(f"  checked {len(jobs)}  broken {len(bad)}")
    for slug, reason in sorted(bad.items())[:15]:
        print(f"    {slug[:40]:<40} {reason}")
    if len(bad) > 15:
        print(f"    ... {len(bad) - 15} more")

    if bad and not keep:
        for slug in bad:
            entries.pop(slug, None)
        MAPFILE.write_text(json.dumps(entries, indent=0, sort_keys=True),
                           encoding="utf-8")
        # a dead local file is no cover at all, so clear it off disk too
        removed = 0
        for slug in bad:
            for path in COVERS.glob(slug + ".*"):
                path.unlink()
                removed += 1
        print(f"  dropped {len(bad)} bad entries, {removed} dead files")
        print("  re-run fetch-covers.py to resolve them again")
    return 0


if __name__ == "__main__":
    sys.exit(main())
