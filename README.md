# Spiritual Hunger

[Open the reading room](https://tianabizna-ctrl.github.io/Spiritual-Hunger/)

A searchable teaching library for prayer and devotional study. Start with one of 21 original KJV-based devotionals, browse a playlist, or enter the prayer room for a guided prayer, a quiet timer and a personal prayer list. Bookmarks and intentions stay in the current browser.

The 13 Myles Munroe playlists contain 793 entries representing 474 distinct videos. The library includes 464 readable transcripts from those playlists; seven videos lacked usable English captions, two were private and one required age verification. An additional Joshua Selman collection already present in the project contributes 22 transcripts. Playlist membership is preserved when a message appears more than once.

Captions can contain recognition and spacing errors. Follow **Watch source** in the reader to check a passage against the recording. The reflections and prayer guides are original editorial material. This is an independent study library.

## Run locally

```sh
python3 -m http.server 8000 --directory public
```

Open `http://localhost:8000`. No package installation or build is needed. The checked-in JSON powers reading and search. Fonts, thumbnails and source videos use external services. GitHub Pages serves `public/` via the workflow on `main`.

## Data pipeline

`scripts/enumerate.py` lists the original playlists; `scripts/build_manifest.py` deduplicates them. `scripts/fetch_transcripts.py` collects available English captions using yt-dlp and Python requests. Raw inputs are cached locally in `.sources/`. With those inputs present, `node scripts/build-data.mjs` regenerates the reader files and search index. Devotional and prayer texts live in `content/`.
