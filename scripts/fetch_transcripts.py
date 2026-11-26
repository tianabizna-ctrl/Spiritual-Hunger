#!/usr/bin/env python3
"""Fetch English captions for every manifest video.

Metadata comes from yt-dlp; the signed timedtext URL is fetched through a
reader proxy (r.jina.ai) so YouTube's IP block on the timedtext endpoint is
avoided. One JSON per video, resumable.
"""
import json
import os
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / ".sources"
OUT = SRC / "transcripts"
OUT.mkdir(parents=True, exist_ok=True)
FAIL = SRC / "failures.json"
EMPTY = SRC / "empty.json"

WORKERS = int(os.environ.get("WORKERS", "4"))
PROXY = "https://r.jina.ai/"


def log(msg):
    print(msg, flush=True)


def caption_url(info):
    """Prefer manual English, then original English ASR, then English ASR."""
    for key in ("subtitles", "automatic_captions"):
        tracks = info.get(key) or {}
        for lang in ("en", "en-orig", "en-US", "en-GB"):
            for track in tracks.get(lang, []):
                if track.get("ext") == "json3":
                    return track["url"], lang, key
    # any English-prefixed track
    for key in ("subtitles", "automatic_captions"):
        for lang, tracks in (info.get(key) or {}).items():
            if lang.startswith("en"):
                for track in tracks:
                    if track.get("ext") == "json3":
                        return track["url"], lang, key
    return None, None, None


def fetch_one(rec):
    vid = rec["id"]
    dest = OUT / f"{vid}.json"
    if dest.exists():
        try:
            data = json.loads(dest.read_text())
            if data.get("chars", 0) > 0:
                return ("cached", vid, data["chars"])
        except Exception:
            pass

    last_err = None
    for attempt in range(3):
        try:
            proc = subprocess.run(
                ["yt-dlp", "-J", "--skip-download", "--no-warnings",
                 "--extractor-args", "youtube:player_client=android", "--", f"https://www.youtube.com/watch?v={vid}"],
                capture_output=True, text=True, timeout=180,
            )
            if proc.returncode != 0:
                last_err = f"yt-dlp: {proc.stderr.strip()[:200]}"
                time.sleep(5 + attempt * 7)
                continue
            info = json.loads(proc.stdout)
            url, lang, source = caption_url(info)
            if not url:
                dest.write_text(json.dumps({
                    "id": vid, "lang": None, "chars": 0, "text": "",
                    "title": info.get("title", rec["title"]),
                    "duration": info.get("duration", 0),
                    "status": "no-english-captions",
                }, ensure_ascii=False))
                return ("empty", vid, 0)

            resp = requests.get(
                PROXY + url,
                timeout=120,
                headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                                       "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
                         "Accept": "text/plain,*/*"},
            )
            if resp.status_code != 200:
                last_err = f"proxy HTTP {resp.status_code}: {resp.text[:160]}"
                time.sleep(8 + attempt * 8)
                continue
            raw = resp.text
            start = raw.find("{")
            if start < 0:
                last_err = f"proxy non-json: {raw[:160]}"
                time.sleep(8 + attempt * 8)
                continue
            payload = json.loads(raw[start:])
            events = payload.get("events", [])
            text = " ".join(
                "".join(seg.get("utf8", "") for seg in event.get("segs", []))
                for event in events
            )
            text = re.sub(r"\s+", " ", text.replace("\n", " ")).strip()
            chars = len(text)
            status = "ok" if chars >= 300 else "empty"
            dest.write_text(json.dumps({
                "id": vid,
                "lang": lang,
                "chars": chars,
                "text": text,
                "title": info.get("title", rec["title"]),
                "duration": info.get("duration", 0),
                "source": source,
                "status": status,
            }, ensure_ascii=False))
            return (status, vid, chars)
        except Exception as exc:  # noqa: BLE001
            last_err = f"{type(exc).__name__}: {str(exc)[:200]}"
            time.sleep(6 + attempt * 8)

    return ("fail", vid, last_err)


def main():
    manifest = json.loads((SRC / "manifest.json").read_text())
    todo = [m for m in manifest if not (OUT / f"{m['id']}.json").exists()]
    log(f"Manifest {len(manifest)} | already fetched {len(manifest)-len(todo)} | todo {len(todo)}")

    stats = {"ok": 0, "empty": 0, "fail": 0, "cached": 0}
    failures = []
    started = time.time()
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futures = {ex.submit(fetch_one, m): m for m in todo}
        for i, fut in enumerate(as_completed(futures), 1):
            rec = futures[fut]
            try:
                status, vid, detail = fut.result()
            except Exception as exc:  # noqa: BLE001
                status, vid, detail = "fail", rec["id"], str(exc)[:200]
            stats[status] = stats.get(status, 0) + 1
            if status == "fail":
                failures.append({"id": vid, "title": rec["title"], "error": detail})
            elapsed = time.time() - started
            rate = i / elapsed * 60 if elapsed else 0
            log(f"[{i}/{len(todo)}] {status:6} {vid} {detail if status != 'ok' else str(detail)+' chars'}"
                f"  ({rate:.1f}/min)")
            if i % 15 == 0:
                FAIL.write_text(json.dumps(failures, indent=2))

    FAIL.write_text(json.dumps(failures, indent=2))
    log(f"Done in {(time.time()-started)/60:.1f} min: {stats}")
    if failures:
        log(f"{len(failures)} failures written to {FAIL}")


if __name__ == "__main__":
    main()
