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

The [Gospel Warrior collection](https://tianabizna-ctrl.github.io/Spiritual-Hunger/#/collections/gospel-warrior) includes studies and short declarations by [John Domino Sanchez Asis](https://www.facebook.com/iamGospelWarrior). The importer reads the public timeline embed and follows photo links visible on the mobile profile to their public post embeds. Some photo captions contain complete studies. The album's item count is a count of photos, not studies; Facebook asks for login beyond the public preview. These sources do not establish complete coverage back to 2020.

The [Refresh Gospel Warrior workflow](https://github.com/tianabizna-ctrl/Spiritual-Hunger/actions/workflows/gospel-warrior.yml) runs on GitHub at minutes **07, 22, 37 and 52** of each hour, and can be run manually. It checks the public timeline and recent photo links, merges new readings, rebuilds search and collection counts, and publishes changed data to Pages. Runs can start late, and a private post or one that leaves the public preview between successful checks can be missed. The collection opens newest first. An open tab checks the published revision every 15 minutes without navigating away from a reader.

To run the same import locally, use `node scripts/build-facebook.mjs --refresh`, then `node scripts/build-data.mjs --facebook-only`. This build uses checked-in reader files for the other collections; raw YouTube captions are unnecessary. Raw public captures are saved under `.sources/facebook/snapshots/`. Readers and bookmarks retain their IDs across overlapping captures.

For a local **Gospel Warrior Bible Study Library** snapshot, pass `--library "/path/to/gospel-warrior-library.html"` instead of `--refresh`, or use both options. The importer reads the embedded data without executing the HTML. It also accepts the decoded library JSON. It looks for studies dated July 2009 onward linked to the author's posts, filters personal announcements and product pitches, and retains source wording, paragraph breaks, links and dates. Dated archive entries live in monthly parts under `content/gospel-warrior/`, listed in `content/gospel-warrior.json`.

The same `--library` option accepts the English Study Companion's `content.json.gz` directly. Its November 27, 2026 archive lists **10,488 public-source records**. The reading collection also draws on the earlier October snapshot and public captions. Its count can differ from the app's because the importer excludes personal updates and promotions, merges duplicates, and keeps additional devotional posts from the other sources. The earliest verified prayer is dated September 24, 2017; the sources checked did not establish uninterrupted coverage back to July 2009.

## YouTube playlist skill for Arena AI

[Download the fetching skill and Python scripts](https://tianabizna-ctrl.github.io/Spiritual-Hunger/downloads/youtube-transcript-library.zip), or use the local copy at `public/downloads/youtube-transcript-library.zip`. Extract it and open `ARENA.md` for the paste-ready prompt. The toolkit checks YouTube access, lists playlist entries, downloads captions and verifies transcript files. If your Arena workspace cannot reach YouTube, upload the fetched JSON instead. No video downloads are needed.

## Run locally

```sh
python3 -m http.server 8000 --directory public
```

Open `http://localhost:8000`. No package installation or build is needed. The checked-in JSON powers reading and search. Fonts, thumbnails and source videos use external services. GitHub Pages serves `public/` via the workflow on `main`.

## Data pipeline

`scripts/enumerate.py` lists the original playlists; `scripts/build_manifest.py` deduplicates them. `scripts/fetch_transcripts.py` collects available English captions using yt-dlp and Python requests. `scripts/build-facebook.mjs` cleans the public Facebook feed into `content/gospel-warrior.json`. Raw inputs are cached locally in `.sources/`. With those inputs present, `node scripts/build-data.mjs` regenerates the reader files and search index. Devotional and prayer texts live in `content/`.
