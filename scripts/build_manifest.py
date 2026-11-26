#!/usr/bin/env python3
"""Collapse playlist entries into one manifest record per video."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / ".sources"
PLAYLISTS = [
    ("media-content", "Munroe Global Media Content", "The flagship archive of full-length teachings, interviews and special messages."),
    ("animated", "Animated Teachings", "Dr. Munroe's core principles distilled into short animated lessons."),
    ("prayer-fasting", "Prayer & Fasting", "Teachings on prayer, fasting, spiritual discipline and intimacy with God."),
    ("men-fatherhood", "Men & Fatherhood", "Manhood, fathering, sonship and the charge to build the next generation."),
    ("marriage", "Marriage & Relationships", "Covenant, courtship, communication and building a home that lasts."),
    ("success", "Success", "Biblical success, excellence, diligence and the price of achievement."),
    ("leadership", "Leadership", "Servant leadership, influence, mentorship and the stewardship of people."),
    ("kingdom", "Kingdom", "The gospel of the Kingdom, citizenship, culture and the King's agenda."),
    ("purpose", "Purpose", "Discovering, refining and fulfilling the reason you were created."),
    ("crisis", "Crisis Management", "Faith, resilience and decision-making when life is shaken."),
    ("general", "General Teachings", "A small gathering of essential messages outside the main themes."),
    ("available", "Available Teachings", "The wide catch-all archive — a cross-section of the entire ministry."),
    ("short-messages", "Short Messages", "Brief, concentrated words for the day."),
]
COLLECTION_ORDER = {slug: i for i, (slug, _, _) in enumerate(PLAYLISTS)}

videos = {}
for slug, name, blurb in PLAYLISTS:
    path = SRC / "playlists" / f"{slug}.txt"
    if not path.exists():
        continue
    for line in path.read_text().splitlines():
        if not line.strip():
            continue
        parts = line.split("|")
        vid, title = parts[0], parts[1] if len(parts) > 1 else parts[0]
        try:
            dur = float(parts[2]) if len(parts) > 2 and parts[2] not in ("NA", "None", "") else 0.0
        except ValueError:
            dur = 0.0
        rec = videos.setdefault(vid, {
            "id": vid,
            "title": title.strip(),
            "duration": dur,
            "collections": [],
        })
        if dur and not rec["duration"]:
            rec["duration"] = dur
        if slug not in rec["collections"]:
            rec["collections"].append(slug)

manifest = []
for i, rec in enumerate(videos.values()):
    rec["collections"].sort(key=lambda s: COLLECTION_ORDER.get(s, 99))
    rec["order"] = i
    manifest.append(rec)

out = SRC / "manifest.json"
out.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))

print(f"Playlist entries : {sum(1 for _ in (SRC/'playlists').glob('*.txt') for _ in _.open())}")
print(f"Unique videos    : {len(manifest)}")
print(f"With duration    : {sum(1 for m in manifest if m['duration'])}")
print(f"Total hours      : {sum(m['duration'] for m in manifest)/3600:.1f}")
from collections import Counter
c = Counter(len(m["collections"]) for m in manifest)
print("Appearances per video:", dict(sorted(c.items())))
for slug, name, _ in PLAYLISTS:
    n = sum(1 for m in manifest if slug in m["collections"])
    print(f"  {name:30} {n}")
