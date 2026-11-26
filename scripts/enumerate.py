#!/usr/bin/env python3
"""Enumerate every Munroe Global playlist into flat files."""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / ".sources" / "playlists"
OUT.mkdir(parents=True, exist_ok=True)

PLAYLISTS = [
    ("media-content", "PLiSxXTy3ZWc522QERj_EzRw1NOtg54Cz5", 85),
    ("animated", "PLiSxXTy3ZWc41afR0sgkkxpuaj_9S6O44", 101),
    ("prayer-fasting", "PLiSxXTy3ZWc7xxRIxjSYvXcCZs0frhEXP", 12),
    ("men-fatherhood", "PLiSxXTy3ZWc6xvsnqnr_EFSNuMWsCF7u1", 21),
    ("marriage", "PLiSxXTy3ZWc69WmbbnQge2GurWXfItr6m", 17),
    ("success", "PLiSxXTy3ZWc4P1CpPSybJ94JSZs_BRdS7", 15),
    ("leadership", "PLiSxXTy3ZWc6wkKX6mpz2RSY4MR-g-cEg", 61),
    ("kingdom", "PLiSxXTy3ZWc7wg_ujNXysHHkv47VOqy8D", 139),
    ("purpose", "PLiSxXTy3ZWc4NmqskS0YRp_zncsWODJki", 16),
    ("crisis", "PLiSxXTy3ZWc7H5MLW69KmZ3tmMfz9rKpt", 39),
    ("general", "PLiSxXTy3ZWc5EOL1TTfl-20tswEiT6iTw", 6),
    ("available", "PLiSxXTy3ZWc52InDNx3QUGeewlp3jNmRW", 233),
    ("short-messages", "PLiSxXTy3ZWc5bUuxbMc37Wp1R-N2q3H7t", 48),
]

results = {}
for slug, pid, expected in PLAYLISTS:
    dest = OUT / f"{slug}.txt"
    if dest.exists() and dest.stat().st_size > 0:
        count = sum(1 for _ in dest.open())
        print(f"= {slug}: cached {count} entries", flush=True)
        results[slug] = count
        continue
    url = f"https://www.youtube.com/playlist?list={pid}"
    print(f"→ {slug}: enumerating {url}", flush=True)
    proc = subprocess.run(
        ["yt-dlp", "--flat-playlist", "--no-warnings",
         "--print", "%(id)s|%(title)s|%(duration)s", url],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        print(f"!! {slug} failed: {proc.stderr.strip()[:400]}", flush=True)
        results[slug] = -1
        continue
    lines = [ln for ln in proc.stdout.splitlines() if ln.strip()]
    dest.write_text("\n".join(lines) + "\n")
    count = len(lines)
    flag = "" if count == expected else f"  (expected {expected})"
    print(f"  {slug}: {count} entries{flag}", flush=True)
    results[slug] = count
    time.sleep(1)

print("\nSummary:")
for slug, pid, expected in PLAYLISTS:
    print(f"  {slug:16} {results.get(slug, 0):>4} / {expected}")
json.dump(results, (ROOT / ".sources" / "playlist-counts.json").open("w"), indent=2)
