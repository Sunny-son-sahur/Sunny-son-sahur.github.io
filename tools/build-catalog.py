#!/usr/bin/env python3
"""
build-catalog.py - generate games-catalog.js from the upstream sources.

Every source publishes its games over a channel that returns
`content-type: text/html` with no frame-blocking headers, so the overlay
iframes them directly. Nothing is mirrored except cover art.

    python3 tools/build-catalog.py

Writes ../games-catalog.js and ../assets/covers/*.  Requires `gh` for the
GitHub sources.
"""

import concurrent.futures as cf
import json
import re
import subprocess
import sys
import tarfile
import time
import urllib.request
from pathlib import Path
from urllib.parse import quote

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = ROOT / "games-catalog.js"
CACHE = HERE / ".cache"
COVERS = ROOT / "assets" / "covers"

UGS_PKG = "ugs-singlefiles@1.0.6"
UGS_BASE = f"https://unpkg.com/{UGS_PKG}/UGS-Files/"
GITHACK = "https://rawcdn.githack.com"

DEFAULT_CATEGORY = "arcade"

# When one game exists in several sources the best channel wins, because it is
# the one most likely to still be serving next month.
SOURCE_RANK = {"wasm": 0, "port": 1, "offline": 2, "web": 3, "flash": 4}

RULES = [
    ("sports", ["soccer", "football", "basketball", "tennis", "golf", "boxing",
                "wrestling", "cricket", "baseball", "hockey", "volleyball",
                "bowling", "skate", "ping pong", "pool", "billiard", "darts",
                "sports"]),
    ("racing", ["racing", "race ", "kart", "formula", "speed", "motorcycle",
                "drag race", "asphalt"]),
    ("driving", ["drift", "parking", "traffic", "driving", "car crash",
                 "highway", "truck", "taxi", "bus sim"]),
    ("platformer", ["platform", "parkour", "mario", "sonic", "jump",
                    "geometry dash", "climbing"]),
    ("puzzle", ["puzzle", "sudoku", "chess", "block", "match 3", "jewel",
                "escape room", "wordle", "crossword", "mahjong",
                "hidden object", "brain", "logic"]),
    ("simulation", ["tycoon", "idle", "clicker", "miner", "farming", "farm",
                    "simulator", "city builder", "restaurant", "cooking",
                    "life sim", "pixel life", "sand"]),
    ("strategy", ["strategy", "tower defense", "tower defence", "roguelike",
                  "card game", "war game", "empire", "kingdom"]),
    ("multiplayer", ["multiplayer", ".io", "2 player", "2-player", "pvp",
                     "battle royale", "party game"]),
    ("action", ["shooter", "zombie", "horror", "survival", "gun", "war",
                "battle", "fight", "fighting", "terror", "scary", "creepy",
                "ninja", "destroy"]),
]

# Repos that publish a static index but are not games.
NON_GAMES = {
    "nautilus-os", "nautilusos", "code-editor", "editor", "test", "gh", "web-tools",
    "download-directory-github-io", "genizy-github-io", "soundboard",
    "asset", "ugs-files", "ugs-singlefile", "web-port", "web-ports",
    "web-port-list", "network-zipper", "google-class", "emujs", "dos", "mc",
    "mcpeweb", "is-it-verity", "google-doodles", "webcam",
    "ai", "chat", "music", "video", "downloader", "converter", "launcher",
    "installer", "hub", "site", "page", "index", "readme", "docs",
}

# The upstream repo name is a shorthand, a slug, or a credit line; these are the
# titles the player should actually see. A few deliberately match an existing
# card's exact title so the cross-source duplicate collapses instead of showing
# up twice in the grid.
OVERRIDES = {
    # genizy
    "wbwwb": "We Become What We Behold",
    "ultrapoolwebport-nothreads": "Ultrapool",
    "sonicmaniapluswebport": "Sonic Mania Plus",
    "cc3d-mobile": "Crazy Cattle 3D",
    "jride": "Jetpack Joyride",
    "fridayfunk": "Friday Night Funkin'",
    "dashmetry-reskin": "Dashmetry",
    "headsoccer": "Head Soccer",
    "sandstone-gn": "Sandstone",
    "osu": "osu!",
    # offline pack: bare filenames that are version numbers, not titles
    "1-12": "Minecraft 1.12",
    "1-5": "Minecraft 1.5",
    "1-8": "Minecraft 1.8",
    "alpha-1-2-6": "Minecraft Alpha 1.2.6",
    "beta-1-3": "Minecraft Beta 1.3",
}

# Words that describe the packaging, never the game. A title made of nothing but
# these is a filename that leaked through, not a name a player would recognise.
FILLER = {
    "wasm", "web", "html", "html5", "gl", "port", "ported", "ports", "pc",
    "steam", "unity", "unblocked", "online", "free", "lite", "game", "games",
    "the", "a", "an", "v", "version", "mod", "mods", "build", "win", "exe",
    "source", "src", "copy", "remake", "clone", "official", "full",
}

# Titles that are descriptions, credits, or the site itself rather than a game.
TITLE_JUNK = re.compile(
    r"^\s*(the\s+)?(web\s*assembly\s+|wasm\s+|web\s+|html5?\s+)*port\s+(of|to|by)\b"
    r"|^\s*credits?\s+to\b"
    r"|^\s*full\s+credit\b"
    r"|^\s*\d{2,3}\s*%\s*credit"
    r"|^by\s+\w+"
    r"|^\s*(a\s+)?web\s+app\b"
    r"|^download\b"
    r"|^code\s+editor"
    r"|^\s*(python|js|java(script)?|html)\s+(and|code|editor)"
    r"|https?://",
    re.I,
)


# ------------------------------------------------------------------ fetching
def get(url, binary=False, timeout=60, tries=4):
    """Fetch with a disk cache and backoff. Raises after `tries` failures."""
    CACHE.mkdir(parents=True, exist_ok=True)
    key = re.sub(r"[^A-Za-z0-9._-]", "_", url)[-180:]
    path = CACHE / key
    if path.exists() and path.stat().st_size:
        data = path.read_bytes()
    else:
        last = None
        for attempt in range(tries):
            try:
                req = urllib.request.Request(
                    url, headers={"User-Agent": "SimpleGamesCatalog/1.0"})
                with urllib.request.urlopen(req, timeout=timeout) as r:
                    data = r.read()
                break
            except Exception as exc:
                last = exc
                wait = 1.5 * (2 ** attempt)
                if "429" in str(exc) or "timed out" in str(exc):
                    time.sleep(wait)
                else:
                    raise
        else:
            raise last
        path.write_bytes(data)
    return data if binary else data.decode("utf-8", "replace")


def gh(path, tries=3):
    for attempt in range(tries):
        res = subprocess.run(["gh", "api", path],
                             capture_output=True, text=True, timeout=90)
        if res.returncode == 0:
            return json.loads(res.stdout)
        if "429" in res.stderr or "rate limit" in res.stderr.lower():
            time.sleep(2 * (attempt + 1))
            continue
        raise RuntimeError(f"gh api {path}: {res.stderr.strip()[:180]}")
    raise RuntimeError(f"gh api {path}: rate limited")


# -------------------------------------------------------------- name helpers
CAMEL = re.compile(r"(?<=[a-z0-9])(?=[A-Z])")
NON_ALNUM = re.compile(r"[^A-Za-z0-9]+")


def derive_name(filename):
    stem = filename[:-5] if filename.lower().endswith(".html") else filename
    if stem.lower().startswith("cl"):
        stem = stem[2:]
    stem = CAMEL.sub(" ", stem)
    out = []
    for w in NON_ALNUM.split(stem):
        if not w:
            continue
        if w.isdigit() or any(c.isdigit() for c in w):
            out.append(w)
        elif w.isupper() and len(w) > 2:
            out.append(w.title() if w not in ("IO", "PVP") else w)
        else:
            out.append(w.capitalize())
    return " ".join(out) or stem


def clean_title(name):
    """Turn 'WebAssembly Port of Sonic Mania Plus' into 'Sonic Mania Plus'."""
    s = re.sub(r"\s+", " ", name or "").strip()
    # peel platform / port prefixes off the front, repeatedly
    for _ in range(4):
        before = s
        s = re.sub(r"^\s*(the\s+)?(web\s*assembly\s+|wasm\s+|html5?\s+|flash\s+|web\s+)*"
                   r"(pc\s+|steam\s+|unity\s+)?port\s+(of|to)\s+", "", s, flags=re.I)
        s = re.sub(r"^\s*(a\s+)?(unblocked\s+|online\s+|free\s+|browser\s+)+", "", s, flags=re.I)
        if s == before:
            break
    # peel trailing credits / attribution
    s = re.sub(r"\s*[-–—|,]\s*(port(ed)?\s+by|full\s+credit|credits?\s+to|by)\s.*$", "", s, flags=re.I)
    s = re.sub(r"\s*\((port(ed)?\s+by|by|credit)[^)]*\)\s*$", "", s, flags=re.I)
    s = re.sub(r"\s+https?://\S+$", "", s)
    s = re.sub(r"\s+", " ", s).strip(" -–—|,.")
    return s or name.strip()


def slugify(name):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower())
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or "game"


def norm_title(title):
    return re.sub(r"[^a-z0-9]+", "", title.lower())


def is_junk_title(title):
    t = (title or "").strip()
    if len(t) < 2 or len(t) > 60:
        return True
    if TITLE_JUNK.search(t):
        return True
    # a web-based OS and a repo homepage are not games
    if re.search(r"nautilus", t, re.I):
        return True
    # a bare JavaScript integer is not a title (2048 is 4 digits and stays)
    if t.isdigit() and len(t) > 6:
        return True
    if norm_title(t) in {"ai", "genizygithubio", "test", "gh", "codeeditor"}:
        return True
    # '1.12_WASM.html' -> "1 12 Wasm": a filename full of platform words is not a
    # title. A purely numeric title is left alone because 2048 really is one.
    words = re.findall(r"[a-z0-9]+", t.lower())
    meaningful = [w for w in words
                  if w not in FILLER and not w.isdigit()]
    if not meaningful and not t.replace(" ", "").isdigit():
        return True
    words = t.split()
    # 'port by 98corbins', 'credits to Willowy (squall.cc)'
    if len(words) <= 4 and any(w.lower() in {"credit", "credits", "port", "ports",
                                             "ported", "by", "to", "from"} for w in words):
        return True
    return False


def categorise(title, default=DEFAULT_CATEGORY):
    low = f" {title.lower()} "
    for category, needles in RULES:
        if any(n in low for n in needles):
            return category
    return default


def repo_name_to_title(name):
    """hollow-knight-silksong -> 'Hollow Knight Silksong'."""
    return " ".join(w.capitalize() for w in name.split("-") if w)


# ------------------------------------------------------------------- sources
def source_ugs():
    """Ultimate Game Stash: single-file shells on unpkg (Ruffle / Unity in-page)."""
    listing = json.loads(get(
        f"https://data.jsdelivr.com/v1/packages/npm/{UGS_PKG}?structure=flat"))
    files = [f["name"].rsplit("/", 1)[-1]
             for f in listing.get("files", [])
             if "/UGS-Files/" in f.get("name", "") and f["name"].endswith(".html")]
    files = [f for f in files if f.lower() != "clsinglefile.html"]

    names = doc_pairs()
    out = []
    for f in sorted(files):
        stem = f[:-5]
        title = names.get(stem) or derive_name(f)
        # some shells have spaces and accented letters in their filename
        out.append({"name": title, "url": UGS_BASE + quote(f), "source": "flash"})
    return out


def doc_pairs():
    text = get("https://docs.google.com/document/d/1_FmH3BlSBQI7FGgAQL59-ZPe8eCxs35wel6JUyVaG8Q/export?format=txt")
    pairs = {}
    for line in text.splitlines():
        if ":" not in line:
            continue
        name, _, tail = line.rpartition(":")
        tail = tail.strip()
        if not tail.endswith(".html") or not tail.lower().startswith("cl"):
            continue
        name = name.strip()
        if name and len(name) <= 70:
            pairs[tail[:-5]] = name
    return pairs


def source_offline_pack():
    items = gh("repos/CoolDude2349/Offline-HTML-Games-Pack/contents/offline?per_page=100&page=1")
    base = f"{GITHACK}/CoolDude2349/Offline-HTML-Games-Pack/master/offline/"
    out = []
    for it in items:
        if it.get("type") != "file" or not it["name"].endswith(".html"):
            continue
        stem = it["name"][:-5]
        out.append({"name": OVERRIDES.get(slugify(stem)) or derive_name(it["name"]),
                    "url": base + quote(it["name"]), "source": "offline"})
    return out


def _repo_entries(owner, repos, title_of, default=None):
    out = []
    for r in repos:
        name = r["name"]
        key = slugify(name)
        if key in NON_GAMES:
            continue
        branch = r.get("default_branch") or "main"
        try:
            contents = gh(f"repos/{owner}/{name}/contents/")
        except Exception:
            continue
        names = {c["name"] for c in contents}
        entry = "index.html" if "index.html" in names else (
            "index.htm" if "index.htm" in names else None)
        if not entry:
            continue
        out.append({
            "name": OVERRIDES.get(key) or title_of(name),
            "url": f"{GITHACK}/{owner}/{name}/{branch}/{entry}",
            "source": "port" if owner == "web-ports" else "web",
            "repo": f"{owner}/{name}",
            **({"default": default} if default else {}),
        })
    return out


def source_web_ports():
    repos = gh("orgs/web-ports/repos?per_page=100")
    return _repo_entries("web-ports", repos, repo_name_to_title, "action")


def source_genizy():
    repos = []
    for page in (1, 2):
        try:
            repos += gh(f"users/genizy/repos?per_page=100&page={page}")
        except Exception:
            break
    return _repo_entries("genizy", repos, repo_name_to_title)


def source_wasmrip():
    games = json.loads(get("https://wasm.rip/games.json"))
    out = []
    for g in games:
        url = g.get("gameUrl")
        if not url:
            continue
        # most entries are site-relative; a few point straight at another host,
        # and prefixing those produces a nonsense double-scheme URL
        target = url if url.startswith(("http://", "https://")) \
            else "https://wasm.rip/" + url.lstrip("/")
        cover = g.get("imageUrl")
        out.append({
            "name": g.get("name") or derive_name(url),
            "url": target,
            "cover": ("https://wasm.rip/" + cover.lstrip("/")) if cover else "",
            "source": "wasm",
        })
    return out


SOURCES = [
    ("wasm.rip", source_wasmrip),
    ("web-ports", source_web_ports),
    ("genizy", source_genizy),
    ("offline", source_offline_pack),
    ("ugs", source_ugs),
]


# --------------------------------------------------------------- cover art
def fetch_cover(slug, url):
    """Mirror a remote cover into assets/covers/ so the grid never depends on
    a third party's rate limit. Returns the local filename, or None."""
    try:
        data = get(url, binary=True, timeout=45, tries=2)
    except Exception:
        return None
    if not data or len(data) < 500:
        return None
    ext = "png" if data[:4] == b"\x89PNG" else (
        "jpg" if data[:3] == b"\xff\xd8\xff" else (
            "webp" if data[8:12] == b"WEBP" else None))
    if not ext:
        return None
    (COVERS / f"{slug}.{ext}").write_bytes(data)
    return f"assets/covers/{slug}.{ext}"


def resolve_covers(rows):
    """wasm.rip ships its own art; repo-backed games get GitHub's social image.
    Everything else keeps the generated tile."""
    todo = []
    for r in rows:
        if r["cover"]:
            continue
        if r.get("repo"):
            r["cover"] = f"https://opengraph.githubassets.com/1/{r['repo']}"
            todo.append(r)
    print(f"  mirroring {len(todo)} GitHub social covers...")
    with cf.ThreadPoolExecutor(6) as ex:
        list(ex.map(lambda r: r.update(
            cover=fetch_cover(r["slug"], r["cover"]) or ""), todo))
    have = sum(1 for r in rows if r["cover"])
    print(f"  covers: {have}/{len(rows)} real")


def prune_covers(rows):
    """Delete cover files no row points at. Dedupe runs after a cover is mirrored,
    so a dropped game would otherwise leave its image in the repo forever."""
    wanted = {r["cover"].rsplit("/", 1)[-1]
              for r in rows
              if r["cover"] and not r["cover"].startswith("http")}
    orphans = [p for p in COVERS.iterdir() if p.is_file() and p.name not in wanted]
    for p in orphans:
        p.unlink()
    if orphans:
        print(f"  pruned {len(orphans)} orphaned cover files")


# ------------------------------------------------------------------- build
def drop_dead(rows):
    """Remove anything tools/check-urls.py found not to load. A card that opens
    a blank overlay is worse than no card at all."""
    report = HERE / "urls-report.json"
    if not report.exists():
        return rows
    try:
        data = json.loads(report.read_text(encoding="utf-8"))
    except Exception:
        return rows
    dead = {u for _, u, _ in data.get("dead", [])}
    if not dead:
        return rows
    kept = [r for r in rows if r["url"] not in dead]
    print(f"  dropped {len(rows) - len(kept)} URLs that no longer load "
          f"(from {report.name})")
    return kept


def main():
    COVERS.mkdir(parents=True, exist_ok=True)

    taken = set()   # normalized titles already claimed, by an existing card
    index_html = (ROOT / "index.html").read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(r'<article class="game-card">.*?<h2><a[^>]*>([^<]+)</a>',
                         index_html, re.S):
        taken.add(norm_title(m.group(1)))

    claimed = {}     # normalized title -> winning row
    dropped = {"existing": 0, "dup": 0, "junk": 0}
    stats = {}

    for label, fn in SOURCES:
        try:
            items = fn()
        except Exception as exc:
            print(f"  ! {label}: FAILED ({exc})", file=sys.stderr)
            stats[label] = "failed"
            continue
        kept = 0
        for it in items:
            title = clean_title(it.get("name", ""))
            if is_junk_title(title):
                dropped["junk"] += 1
                continue
            key = norm_title(title)
            if key in taken:
                dropped["existing"] += 1
                continue
            row = {
                "name": title,
                "url": it["url"],
                "source": it["source"],
                "cover": it.get("cover", ""),
                "repo": it.get("repo", ""),
                "default": it.get("default", DEFAULT_CATEGORY),
            }
            prev = claimed.get(key)
            # keep the most reliable channel when the same game appears twice
            if prev is not None and SOURCE_RANK[row["source"]] >= SOURCE_RANK[prev["source"]]:
                dropped["dup"] += 1
                continue
            if prev is not None:
                dropped["dup"] += 1
            claimed[key] = row
            kept += 1
        stats[label] = kept
        print(f"  {label:<11} {kept:>5} kept", flush=True)

    # A source that 429s or times out would otherwise quietly shrink the library
    # by thousands of games, and nobody notices until the grid looks empty. Fail
    # loudly instead - the catalog file on disk is left untouched.
    failed = [k for k, v in stats.items() if v == "failed"]
    if failed and "--allow-partial" not in sys.argv:
        print(f"  !! {', '.join(failed)} did not respond; refusing to write a "
              f"smaller catalog.\n     Re-run when the upstream is healthy, or "
              f"pass --allow-partial to ship what we got.", file=sys.stderr)
        return 1

    rows = []
    for key, r in claimed.items():
        slug = slugify(r["name"])
        base, n = slug, 2
        while slug in taken:
            slug = f"{base}-{n}"
            n += 1
        taken.add(slug)
        rows.append({
            **r,
            "slug": slug,
            "path": f"/{slug}/",
            "category": categorise(r["name"], r["default"]),
        })

    # Featured order: original cards first, then by source quality, then name.
    rows.sort(key=lambda r: (SOURCE_RANK[r["source"]], r["name"].lower()))

    rows = drop_dead(rows)

    resolve_covers(rows)
    prune_covers(rows)

    data = [[r["name"], r["path"], r["url"], r["category"], r["source"],
             r["cover"] or ""] for r in rows]
    payload = json.dumps(data, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
    meta = json.dumps(stats, ensure_ascii=False)

    body = (RENDERER_HEADER.replace("{count}", str(len(rows))) + payload
            + ";\n" + RENDERER_FOOTER.replace("META_JSON", meta))

    OUT.write_text(body, encoding="utf-8")

    # A generated file that does not parse takes the whole site down, so refuse
    # to call the build successful until the JS parser agrees with us.
    try:
        res = subprocess.run(["node", "--check", str(OUT)],
                             capture_output=True, text=True, timeout=60)
        if res.returncode != 0:
            print("  !! generated file does not parse:\n" +
                  "\n".join(res.stderr.splitlines()[:6]), file=sys.stderr)
            return 1
    except FileNotFoundError:
        pass

    print(f"\n  dropped: {dropped['existing']} duplicate of an existing card, "
          f"{dropped['dup']} duplicate across sources, {dropped['junk']} not a game")
    print(f"  -> {OUT.name} ({OUT.stat().st_size / 1024:.0f} KB)")
    print(f"  total: {len(rows)} games")
    return 0


RENDERER_HEADER = """// GENERATED by tools/build-catalog.py - do not edit by hand.
// {count} games. Each URL returns content-type: text/html with no frame-blocking
// headers, so the overlay iframes it directly. Cover art is mirrored locally
// where a real one exists.
//
// row = [name, path, url, category, source, cover]
window.GAMES_CATALOG = """

RENDERER_FOOTER = """
window.GAMES_CATALOG_META = META_JSON;

/* Runs before features.js snapshots `.game-card`, so the existing search /
   sort / favorites / category filter pick these cards up unchanged, and hands
   play.js + features.js the maps they need to resolve an overlay URL and a
   category for each new path. */
(() => {
  const rows = window.GAMES_CATALOG || [];
  const grid = document.querySelector(".game-grid");
  if (!grid || !rows.length) return;

  const urls = Object.create(null);
  const cats = Object.create(null);
  const frag = document.createDocumentFragment();
  const resolve = (p) => (typeof sitePath === "function" ? sitePath(p) : p);

  // Deterministic two-tone tile for the games with no published cover art.
  function tile(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    const a = h % 360;
    const b = (a + 45 + (h >> 9) % 55) % 360;
    const initials = (name.split(/\\s+/).filter(Boolean).slice(0, 2)
      .map((w) => w[0]).join("") || "?").toUpperCase().replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="hsl(' + a + ',52%,33%)"/>' +
      '<stop offset="1" stop-color="hsl(' + b + ',58%,20%)"/>' +
      '</linearGradient></defs><rect width="400" height="300" fill="url(#g)"/>' +
      '<text x="200" y="170" font-family="system-ui,sans-serif" font-size="88" ' +
      'font-weight="700" fill="rgba(255,255,255,.88)" text-anchor="middle">' +
      initials + "</text></svg>";
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  for (const [name, path, url, category, source, cover] of rows) {
    urls[path] = url;
    cats[path] = category;

    const card = document.createElement("article");
    card.className = "game-card";
    card.dataset.source = source;

    const imgLink = document.createElement("a");
    imgLink.className = "game-card__image-link";
    imgLink.href = path;
    imgLink.setAttribute("aria-label", "Play " + name);

    const img = document.createElement("img");
    img.src = cover ? (cover.indexOf("http") === 0 ? cover : resolve(cover)) : tile(name);
    img.alt = name + " game cover";
    img.loading = "lazy";
    img.decoding = "async";
    imgLink.append(img);

    const body = document.createElement("div");
    body.className = "game-card__body";
    const h2 = document.createElement("h2");
    const titleLink = document.createElement("a");
    titleLink.href = path;
    titleLink.textContent = name;
    h2.append(titleLink);
    body.append(h2);

    card.append(imgLink, body);
    frag.append(card);
  }

  grid.append(frag);
  window.__catalogGames = urls;
  window.__catalogCategories = cats;
})();
"""

if __name__ == "__main__":
    sys.exit(main())
