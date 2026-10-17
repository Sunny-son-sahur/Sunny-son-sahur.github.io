#!/usr/bin/env python3
"""
fetch-covers.py - replace the generated gradient tiles with real box art.

Cover sources, best first:

    official   the original site ships a square PNG per game; it is the same
               game, so it is the most faithful art available
    steam      library_600x900 from the Steam CDN - hotlinked, never downloaded,
               because that CDN is permanent and mirroring would add ~30 MB
    itunes     512x512 app artwork from Apple's CDN - hotlinked for the same
               reason; good for the casual/mobile half of the library
    bing       keyless image search, used only for what the above miss. Results
               are downloaded, centre-cropped to a square and re-encoded,
               because the hosts behind them rot

Every downloaded image is normalised to a square WebP so the grid never depends
on a third party's link staying alive. Hotlinked sources are recorded in
tools/covers-map.json, which build-catalog.py reads.

    python3 tools/fetch-covers.py             # resume; only fills what is missing
    python3 tools/fetch-covers.py --workers 3
    python3 tools/fetch-covers.py --only bing # rerun one stage
"""

import concurrent.futures as cf
import html
import io
import json
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CATALOG = ROOT / "games-catalog.js"
COVERS = ROOT / "assets" / "covers"
MAPFILE = HERE / "covers-map.json"
CACHE = HERE / ".cache" / "covers"

SIZE = 512
WORKERS = 4
OFFICIAL = "https://simplegames-lol.github.io"

BROWSER = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# hosts that reliably serve game key art rather than banners, screenshots or
# fan wallpapers. Anything else has to survive the squareness test instead.
PREFERRED = (
    "steamstatic", "steamstatic", "mzstatic", "ignimgs", "poki", "newgrounds",
    "images.igdb.com", "steamgriddb", "launchbox", "igdb", "twitchcdn",
    "wikia.nocookie", "fandom.com", "speedrun.com", "playstation",
    "nintendo", "gog-static", "humble", "static.wikia", "itch.img",
    "gamebanana", "behance", "rawg", "glitchwave", "seeles.ai",
)
REJECT = (
    "youtube.com/img", "ytimg.com", "avatar", "logo-transparent", "sprite-sheet",
)


def norm(s):
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())


def close(a, b):
    """Conservative by design: a confident wrong match shows the wrong game's
    art, which is worse than showing none. Requires an actual prefix relation
    and at least six characters on both sides - 'egg' must never become
    'Egg, Inc.', and a short query must never outrank a real title."""
    if not a or not b:
        return False
    if a == b:
        return True
    if min(len(a), len(b)) < 6:
        return False
    if a.startswith(b) or b.startswith(a):
        return abs(len(a) - len(b)) <= 20
    return False


def fetch(url, headers=None, timeout=30, tries=3, binary=True):
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers=headers or BROWSER)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
            return data if binary else data.decode("utf-8", "replace")
        except urllib.error.HTTPError as exc:
            last = exc
            if exc.code in (429, 500, 502, 503, 504):
                time.sleep(1.5 * (2 ** attempt) + random.random())
                continue
            raise
        except Exception as exc:
            last = exc
            if attempt + 1 < tries:
                time.sleep(0.8 * (attempt + 1))
                continue
            raise
    raise last


# ------------------------------------------------------------------ sources
def steam_cover(title):
    q = urllib.parse.urlencode({"term": title, "l": "english", "cc": "US"})
    try:
        raw = fetch("https://store.steampowered.com/api/storesearch/?" + q,
                    timeout=25, tries=2)
        data = json.loads(raw)
    except Exception:
        return None
    if not data.get("total"):
        return None
    want = norm(title)
    for item in data["items"][:5]:
        if close(norm(item.get("name", "")), want):
            app = item.get("id")
            if not app:
                continue
            return {"kind": "hot",
                    "url": f"https://cdn.akamai.steamstatic.com/steam/apps/"
                           f"{app}/library_600x900.jpg",
                    "from": "steam"}
    return None


def itunes_cover(title):
    q = urllib.parse.urlencode({"term": title, "entity": "software", "limit": 6})
    try:
        raw = fetch("https://itunes.apple.com/search?" + q, timeout=25, tries=2)
        data = json.loads(raw)
    except Exception:
        return None
    # the App Store misfiles plenty of non-games as Entertainment/Education, and
    # a logistics app named after a platformer would otherwise win the match
    GAME_GENRES = {"Games", "Family"}
    want = norm(title)
    for item in data.get("results", []):
        if not close(norm(item.get("trackName", "")), want):
            continue
        genre = item.get("primaryGenreName", "")
        if genre not in GAME_GENRES:
            continue
        art = item.get("artworkUrl512") or item.get("artworkUrl100") or ""
        if art:
            return {"kind": "hot",
                    "url": art.replace("100x100bb", "512x512bb"),
                    "from": "itunes"}
    return None


def bing_candidates(title, n=14):
    """Keyless image search. DuckDuckGo silently answers HTTP 202 with an empty
    result set once it decides you are a script, which looks identical to 'no
    images exist' - Bing returns real box art instead (IGDB, SteamGridDB,
    Launchbox and Steam CDNs all surface here)."""
    query = urllib.parse.urlencode({"q": f"{title} game cover",
                                    "form": "HDRSC2", "first": "1"})
    hdr = dict(BROWSER)
    hdr["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    try:
        body = fetch("https://www.bing.com/images/search?" + query, hdr,
                     timeout=30, tries=3, binary=False)
    except Exception:
        return []
    urls = re.findall(r"murl&quot;:&quot;(.*?)&quot;", body)
    if not urls:
        urls = [html.unescape(m) for m in re.findall(r'"murl":"(.*?)"', body)]
    out, seen = [], set()
    for u in urls:
        u = u.strip()
        if not u.startswith("http") or u in seen:
            continue
        seen.add(u)
        out.append({"image": u, "width": 0, "height": 0, "source": ""})
        if len(out) >= n:
            break
    return out


def score_candidate(item):
    """Rank by how likely it is to be cover art rather than a screenshot.

    Bing does not publish dimensions in its HTML, so w/h are often 0. A missing
    measurement must not veto the candidate - normalize() rejects anything
    genuinely too small after download, which is a better test than guessing
    from a number that is not there."""
    w, h = int(item.get("width") or 0), int(item.get("height") or 0)
    url = (item.get("image") or "").lower()
    if any(bad in url for bad in REJECT):
        return -1
    score = 40
    if w and h:
        if w < 300 or h < 300:
            return -1
        aspect = w / h if h else 9
        score = 100 - abs(1.0 - aspect) * 60
        if 0.55 <= aspect <= 1.15:      # box art / square key art
            score += 40
        if min(w, h) >= 500:
            score += 25
        elif min(w, h) >= 350:
            score += 10
    # a URL that names a cover file, or sits on a game-art CDN, is the best
    # signal available when dimensions are absent
    if re.search(r"cover|boxart|box_art|keyart|library_6", url):
        score += 30
    if any(p in url for p in PREFERRED):
        score += 35
    if url.endswith((".gif", ".svg")):
        score -= 40
    return score


def bing_cover(title):
    """Search, rank, and mirror the first image that survives re-encoding."""
    items = bing_candidates(title)
    if not items:
        return None
    ranked = sorted(((score_candidate(i), i) for i in items),
                    key=lambda t: -t[0])
    for score, item in ranked:
        if score < 20:
            continue
        url = item.get("image")
        if not url:
            continue
        try:
            data = fetch(url, timeout=30, tries=2)
        except Exception:
            continue
        pic = normalize(data)
        if pic is not None:
            return {"kind": "local", "bytes": pic, "from": "bing", "score": score}
    return None


# --------------------------------------------------------------- image work
def normalize(data):
    """Centre-crop to a square, resize, and re-encode as 512px WebP."""
    from PIL import Image, ImageOps
    if not data or len(data) < 1500:
        return None
    try:
        im = Image.open(io.BytesIO(data))
        im.load()
    except Exception:
        return None
    if im.width < 250 or im.height < 250:
        return None
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (16, 18, 24))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = im.convert("RGB")
    im = ImageOps.fit(im, (SIZE, SIZE), method=Image.LANCZOS,
                      centering=(0.5, 0.5))
    out = io.BytesIO()
    try:
        im.save(out, "WEBP", quality=62, method=4)
    except Exception:
        return None
    data = out.getvalue()
    if len(data) < 1200:
        return None
    return data


_OFFICIAL = None


def official_index():
    """slug -> cover URL on the original site. One request for the whole
    library instead of one 404 per game against someone else's Pages
    deployment."""
    global _OFFICIAL
    if _OFFICIAL is not None:
        return _OFFICIAL
    cache = CACHE / "official-index.json"
    if cache.exists():
        try:
            _OFFICIAL = json.loads(cache.read_text(encoding="utf-8"))
            return _OFFICIAL
        except Exception:
            pass
    try:
        html = fetch(f"{OFFICIAL}/", timeout=30, tries=2, binary=False)
    except Exception:
        _OFFICIAL = {}
        return _OFFICIAL
    # only entries that reference a cover file are games on that site; every
    # other href is navigation and must not turn into a 404 request
    out = {}
    for rel in re.findall(r'(?:src|data-src)="([^"]*?/cover\.(?:png|webp|jpg))"',
                          html, re.I):
        slug = rel.strip("/").split("/")[0]
        out[slug] = f"{OFFICIAL}/{rel.lstrip('/')}"
    _OFFICIAL = out
    try:
        CACHE.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(out, sort_keys=True), encoding="utf-8")
    except Exception:
        pass
    return _OFFICIAL


def official_cover(title, slug):
    """The original site publishes one square PNG per game it carries."""
    url = official_index().get(slug)
    if not url:
        return None
    try:
        data = fetch(url, timeout=25, tries=2)
    except Exception:
        return None
    pic = normalize(data)
    if pic is None:
        return None
    return {"kind": "local", "bytes": pic, "from": "official"}


# --------------------------------------------------------------------- run
def load_rows():
    text = CATALOG.read_text(encoding="utf-8")
    m = re.search(r"window\.GAMES_CATALOG = (\[.*?\]);", text, re.S)
    if not m:
        raise SystemExit("games-catalog.js has no catalog array")
    return json.loads(m.group(1))


def slug_of(row):
    return row[1].strip("/")


def existing(slug):
    """The on-disk cover for a slug, whatever extension it ended up with.
    Returns the site-relative path or None. Matching any extension but then
    reporting '.webp' would write a map entry pointing at a file that does
    not exist, which renders as a broken image."""
    for path in sorted(COVERS.glob(slug + ".*")):
        if path.is_file():
            return f"assets/covers/{path.name}"
    return None


def resolve(row, only=None):
    title, slug = row[0], slug_of(row)
    cached = existing(slug)
    if cached:
        return slug, {"kind": "local", "file": cached, "from": "cache"}
    try:
        if only in (None, "official"):
            got = official_cover(title, slug)
            if got:
                return slug, persist(slug, got)
        if only in (None, "steam"):
            got = steam_cover(title)
            if got:
                return slug, got
        if only in (None, "itunes"):
            got = itunes_cover(title)
            if got:
                return slug, got
        if only in (None, "bing"):
            got = bing_cover(title)
            if got:
                return slug, persist(slug, got)
    except Exception as exc:
        return slug, {"kind": "fail", "reason": f"{type(exc).__name__}: {exc}"[:80]}
    return slug, {"kind": "none"}


def persist(slug, got):
    data = got.pop("bytes")
    path = COVERS / f"{slug}.webp"
    path.write_bytes(data)
    got["file"] = f"assets/covers/{slug}.webp"
    return got


def main():
    WORKERS_ = WORKERS
    only = None
    args = sys.argv[1:]
    if "--workers" in args:
        WORKERS_ = int(args[args.index("--workers") + 1])
    if "--only" in args:
        only = args[args.index("--only") + 1]

    COVERS.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    off = official_index()
    print(f"  official site offers {len(off)} real covers", flush=True)
    rows = load_rows()
    print(f"  {len(rows)} games, "
          f"{sum(1 for r in rows if existing(slug_of(r)))} already covered",
          flush=True)

    result = json.loads(MAPFILE.read_text(encoding="utf-8")) if MAPFILE.exists() else {}
    stats = {"local": 0, "hot": 0, "none": 0, "fail": 0, "cache": 0}
    done = 0

    def work(row):
        return resolve(row, only)

    with cf.ThreadPoolExecutor(WORKERS_) as ex:
        for slug, got in ex.map(work, rows):
            done += 1
            result[slug] = got
            stats[got.get("kind", "none")] = stats.get(got.get("kind", "none"), 0) + 1
            if done % 100 == 0:
                print(f"    {done}/{len(rows)}  local {stats['local']}  "
                      f"hot {stats['hot']}  none {stats['none']}  "
                      f"fail {stats['fail']}", flush=True)
                MAPFILE.write_text(json.dumps(result, indent=0, sort_keys=True),
                                   encoding="utf-8")

    MAPFILE.write_text(json.dumps(result, indent=0, sort_keys=True),
                       encoding="utf-8")

    real = stats["local"] + stats["hot"] + stats.get("cache", 0)
    print(f"\n  done {done}")
    print(f"  mirrored   {stats['local']}")
    print(f"  hotlinked  {stats['hot']}")
    print(f"  from cache {stats.get('cache', 0)}")
    print(f"  no art     {stats['none']}")
    print(f"  errors     {stats['fail']}")
    print(f"  real icons {real}/{len(rows)}  ({100 * real // len(rows)}%)")
    total = sum(p.stat().st_size for p in COVERS.iterdir() if p.is_file())
    print(f"  assets/covers: {len(list(COVERS.iterdir()))} files, "
          f"{total / 1048576:.1f} MB")
    print(f"  -> {MAPFILE.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
