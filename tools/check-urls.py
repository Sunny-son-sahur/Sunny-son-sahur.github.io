#!/usr/bin/env python3
"""
check-urls.py - decide which catalogued games actually load.

Existence is not the same as "served": the UGS shells are all published inside
one npm tarball, so the package manifest already proves every one of them
exists. What it cannot prove is whether the CDN is currently answering. So the
two channels are checked differently:

    flash (UGS on unpkg)   every URL is really fetched - this is the only
                           channel that has ever 500'd on us
    everything else        every URL is really fetched

    --manifest-only        for the UGS channel, trust the npm manifest instead
                           of making ~2.3k requests; still really fetches the
                           ~400 other games

Writes tools/urls-report.json:  {"ok": n, "dead": [[name, url, reason], ...]}
build-catalog.py reads that file at build time and drops the dead entries.

    python3 tools/check-urls.py
    python3 tools/check-urls.py --manifest-only
"""

import concurrent.futures as cf
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
REPORT = HERE / "urls-report.json"
CATALOG = ROOT / "games-catalog.js"
UGS_PKG = "ugs-singlefiles@1.0.6"

UA = {"User-Agent": "SimpleGamesUrlCheck/1.0", "Accept": "text/html,*/*"}
WORKERS = 24
TIMEOUT = 12


def load_rows():
    text = CATALOG.read_text(encoding="utf-8")
    m = re.search(r"window\.GAMES_CATALOG = (\[.*?\]);", text, re.S)
    if not m:
        raise SystemExit("games-catalog.js does not contain a catalog array")
    return json.loads(m.group(1))


def ugs_manifest():
    """Filenames published in the npm package - no per-file request needed."""
    try:
        req = urllib.request.Request(
            f"https://data.jsdelivr.com/v1/packages/npm/{UGS_PKG}?structure=flat",
            headers=UA)
        with urllib.request.urlopen(req, timeout=60) as r:
            listing = json.load(r)
        return {f["name"].rsplit("/", 1)[-1]
                for f in listing.get("files", [])
                if "/UGS-Files/" in f.get("name", "")}
    except Exception as exc:
        print(f"  ! manifest unavailable ({exc}); falling back to real fetches")
        return None


def probe(url, tries=2):
    """Return None if the game loads, else a short reason string."""
    reason = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                ctype = (r.headers.get("content-type") or "").lower()
                r.read(4096)                 # touches the body, not just headers
                status = getattr(r, "status", 200)
            if status >= 400:
                reason = f"HTTP {status}"
            elif "text/html" not in ctype and "javascript" not in ctype \
                    and "octet-stream" not in ctype:
                # a non-HTML response cannot be rendered inside the overlay
                reason = f"content-type {ctype.split(';')[0].strip() or 'empty'}"
            else:
                return None
            return reason
        except urllib.error.HTTPError as exc:
            reason = f"HTTP {exc.code}"
            # 429/5xx are the CDN having a moment, not a dead game
            if exc.code in (429, 500, 502, 503, 504) and attempt + 1 < tries:
                time.sleep(2.0 * (attempt + 1))
                continue
            return reason
        except Exception as exc:
            text = str(exc)
            reason = ("timeout" if "timed out" in text
                      else "refused" if "refused" in text
                      else text.split(":")[0][:60] or "error")
            if attempt + 1 < tries:
                time.sleep(1.5 * (attempt + 1))
                continue
            return reason
    return reason or "error"


def main():
    manifest_only = "--manifest-only" in sys.argv
    rows = load_rows()
    print(f"  checking {len(rows)} game URLs with {WORKERS} workers...")

    manifest = ugs_manifest() if manifest_only else None
    dead, checked, skipped = [], 0, 0

    def work(row):
        name, url, src = row[0], row[2], row[4]
        if src == "flash" and manifest is not None:
            # the URL carries an encoded filename; the manifest does not
            fname = urllib.parse.unquote(url.rsplit("/", 1)[-1])
            if fname in manifest:
                res = (None, True)           # proven to exist, not fetched
            else:
                res = ("not in npm package", False)
        else:
            res = (probe(url), False)
        return res, row

    with cf.ThreadPoolExecutor(WORKERS) as ex:
        for (reason, skipped_here), row in ex.map(work, rows):
            checked += 1
            if skipped_here:
                skipped += 1
            elif reason:
                dead.append([row[0], row[2], reason])
            if checked % 400 == 0:
                print(f"    {checked}/{len(rows)}  dead so far {len(dead)}",
                      flush=True)

    by_reason = {}
    for _, _, reason in dead:
        by_reason[reason] = by_reason.get(reason, 0) + 1
    by_source = {}
    for name, url, _ in dead:
        for row in rows:
            if row[2] == url:
                by_source[row[4]] = by_source.get(row[4], 0) + 1
                break

    REPORT.write_text(
        json.dumps({"ok": len(rows) - len(dead), "dead": dead,
                    "fetched": checked - skipped, "manifest_trusted": skipped},
                   indent=1), encoding="utf-8")

    # Unpkg answers the same file in 80ms or 30s depending on its mood, and a
    # 24-way burst makes 906 of them look dead when none of them are. Only a
    # response that says the resource itself is wrong counts as dead; anything
    # about our connection or their capacity is reported as unverified.
    HARD_DEAD = re.compile(r"^HTTP (404|403|410|451)$|^content-type |"
                           r"^not in npm package$")
    throttled = [d for d in dead if not HARD_DEAD.search(d[2])]
    real_dead = [d for d in dead if HARD_DEAD.search(d[2])]
    dead[:] = real_dead
    REPORT.write_text(
        json.dumps({"ok": len(rows) - len(real_dead), "dead": real_dead,
                    "fetched": checked - skipped,
                    "manifest_trusted": skipped,
                    "unverified": len(throttled)}, indent=1), encoding="utf-8")

    print(f"\n  fetched {checked - skipped}   manifest-trusted {skipped}")
    print(f"  working {len(rows) - len(real_dead)} / {len(rows)}")
    print(f"  dead    {len(real_dead)}")
    if throttled:
        print(f"  unverified (slow / rate-limited, NOT dropped): {len(throttled)}")
    if by_reason:
        print("  by reason:")
        for k, v in sorted(by_reason.items(), key=lambda x: -x[1]):
            print(f"      {v:>4}  {k}")
    if by_source:
        print("  by source:", by_source)
    print(f"  -> {REPORT}")
    if dead:
        print("\n  dead games:")
        for name, url, reason in dead[:40]:
            print(f"      {reason:<28} {name[:44]}")
        if len(dead) > 40:
            print(f"      ... and {len(dead) - 40} more (full list in the report)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
