# Spiritual Hunger

[Open the reading room](https://tianabizna-ctrl.github.io/Spiritual-Hunger/)

A searchable teaching library for prayer and devotional study. Start with one of 24 original KJV-based devotionals, browse a playlist, or enter the prayer room for a guided prayer, a quiet timer and a personal prayer list. Bookmarks and intentions stay in the current browser.

The 13 Myles Munroe playlists contain 793 entries representing 474 distinct videos. The library includes 464 readable transcripts from those playlists; seven videos lacked usable English captions, two were private and one required age verification. An additional Joshua Selman collection already present in the project contributes 22 transcripts. Playlist membership is preserved when a message appears more than once.

Captions can contain recognition and spacing errors. Follow **Watch source** in the reader to check a passage against the recording. The reflections and prayer guides are original editorial material. This is an independent study library.

The [Feeling lost](https://tianabizna-ctrl.github.io/Spiritual-Hunger/#/collections/feeling-lost) and [Morning Prayer](https://tianabizna-ctrl.github.io/Spiritual-Hunger/#/collections/morning-prayer) playlists add 47 English transcripts with individual reflection prompts: all 18 from Feeling lost and 29 of 42 from Morning Prayer. YouTube marked the other 13 entries unavailable. Playlist order and original IDs are recorded in `content/selman-playlists.json`.

## Additional playlist collections

The [collections page](https://tianabizna-ctrl.github.io/Spiritual-Hunger/#/collections) includes **Apostle Joshua Selman Messages**, **Prayer**, **Mindset & Mind Transformation**, **Recomfort**, **Brokenness**, **Spiritual Hunger**, **Focus on God**, **Spiritual Realm**, **Trusting God**, **Joshua Selman: December**, and **The Holy Spirit**. The 11 playlists contain 404 entries and 380 distinct video IDs. The first playlist is the existing 22-message Selman collection.

The collections page also includes **Powerful Prayers** (194 entries) and **Grace Enclave: Morning Prayers** (141 entries), both with readers for every entry. Across all 15 playlists, 719 distinct videos are named; 714 have readable transcripts. The rest are identified in their playlist as private, removed, unavailable, members-only, or without usable English captions.

Open **Playlist contents in source order** within a collection for its complete list. Shared videos use the same reader and bookmark across collections. Channel credits identify the uploader, which can differ from the speaker.

## YouTube playlist skill for Arena AI

[Download the fetching skill and Python scripts](https://tianabizna-ctrl.github.io/Spiritual-Hunger/downloads/youtube-transcript-library.zip), or use the local copy at `public/downloads/youtube-transcript-library.zip`. Extract it and open `ARENA.md` for the paste-ready prompt. The toolkit checks YouTube access, lists playlist entries, downloads captions and verifies transcript files. If your Arena workspace cannot reach YouTube, upload the fetched JSON instead. No video downloads are needed.

## Run locally

```sh
python3 -m http.server 8000 --directory public
```

Open `http://localhost:8000`. No package installation or build is needed. The checked-in JSON powers reading and search. Fonts, thumbnails and source videos use external services. GitHub Pages serves `public/` via the workflow on `main`.

## Data pipeline

`scripts/enumerate.py` lists the original playlists; `scripts/build_manifest.py` deduplicates them. `scripts/fetch_transcripts.py` collects available English captions using yt-dlp and Python requests. Raw inputs are cached locally in `.sources/`. With those inputs present, `node scripts/build-data.mjs` regenerates the reader files and search index. Devotional and prayer texts live in `content/`.
