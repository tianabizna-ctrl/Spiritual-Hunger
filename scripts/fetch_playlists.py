#!/usr/bin/env python3
"""Fetch captions for every video listed in content/selman-playlists.json.

The content file records playlist membership and source order. Existing
transcripts are reused; failed videos are listed in a JSON report at the end.
"""
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fetch_transcripts as fetcher

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content" / "selman-playlists.json"


def main():
    playlists = json.loads(CONTENT.read_text())
    records = {}
    for playlist in playlists:
        for video in playlist["videos"]:
            if video.get("title"):
                records.setdefault(video["id"], video)

    todo = [record for vid, record in records.items() if not (fetcher.OUT / f"{vid}.json").exists()]
    print(f"Playlist videos {len(records)} | cached {len(records) - len(todo)} | to fetch {len(todo)}", flush=True)

    failures = []
    stats = {"ok": 0, "empty": 0, "fail": 0, "cached": 0}
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(fetcher.fetch_one, record): record for record in todo}
        for index, future in enumerate(as_completed(futures), 1):
            record = futures[future]
            try:
                status, video_id, detail = future.result()
            except Exception as exc:  # noqa: BLE001
                status, video_id, detail = "fail", record["id"], str(exc)[:200]
            stats[status] = stats.get(status, 0) + 1
            if status == "fail":
                failures.append({"id": video_id, "title": record.get("title"), "error": detail})
            print(f"[{index}/{len(todo)}] {status:6} {video_id} {detail}", flush=True)

    report = ROOT / ".sources" / "added-playlists" / "fetch-report.json"
    report.write_text(json.dumps({"stats": stats, "failures": failures}, indent=2))
    print(f"Finished: {stats}; failures written to {report}", flush=True)


if __name__ == "__main__":
    main()
