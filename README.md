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

To refresh, run `node scripts/build-facebook.mjs --refresh`, then `node scripts/build-data.mjs`. The first command saves captures under `.sources/facebook/snapshots/` and merges complete posts into `content/gospel-warrior.json`; old entries keep their reader and bookmark IDs. Repeated imports match by post link when available or by the full source text. You can also pass paths to saved timeline or photo-embed Markdown captures. Review new titles and text for promotions before publishing. Refreshes are manual and can miss posts between captures.

For a local **Gospel Warrior Bible Study Library** snapshot, pass `--library "/path/to/gospel-warrior-library.html"` instead of `--refresh`, or use both options. The importer reads the embedded data without executing the HTML. It also accepts the decoded library JSON. It looks for studies dated July 2009 onward linked to the author's posts, filters personal announcements and product pitches, and retains source wording, paragraph breaks, links and dates. Dated archive entries live in monthly parts under `content/gospel-warrior/`, listed in `content/gospel-warrior.json`.

The October 7, 2026 snapshot supplies most of the studies. Public photo captions include two short readings from 2017; the earliest verified prayer is dated September 24, 2017. The browser offers oldest- and newest-dated ordering. The album previews and web archives checked did not yield studies back to the profile's July 2009 start, and later feed captures do not fill every intervening day.

## YouTube playlist skill for Arena AI

[Download the fetching skill and Python scripts](https://tianabizna-ctrl.github.io/Spiritual-Hunger/downloads/youtube-transcript-library.zip), or use the local copy at `public/downloads/youtube-transcript-library.zip`. Extract it and open `ARENA.md` for the paste-ready prompt. The toolkit checks YouTube access, lists playlist entries, downloads captions and verifies transcript files. If your Arena workspace cannot reach YouTube, upload the fetched JSON instead. No video downloads are needed.

## Run locally

```sh
python3 -m http.server 8000 --directory public
```

Open `http://localhost:8000`. No package installation or build is needed. The checked-in JSON powers reading and search. Fonts, thumbnails and source videos use external services. GitHub Pages serves `public/` via the workflow on `main`.

## Data pipeline

`scripts/enumerate.py` lists the original playlists; `scripts/build_manifest.py` deduplicates them. `scripts/fetch_transcripts.py` collects available English captions using yt-dlp and Python requests. `scripts/build-facebook.mjs` cleans the public Facebook feed into `content/gospel-warrior.json`. Raw inputs are cached locally in `.sources/`. With those inputs present, `node scripts/build-data.mjs` regenerates the reader files and search index. Devotional and prayer texts live in `content/`.
